import {randomUUID} from 'node:crypto';
import type {Readable} from 'node:stream';

import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateBucketCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetBucketPolicyCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketLifecycleConfigurationCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';

import {
  S3_ACCESS_KEY_ID,
  S3_ACCESS_KEY_SECRET,
  S3_BUCKET,
  S3_ENABLED,
  S3_ENDPOINT,
  S3_FORCE_PATH_STYLE,
} from '../app/constants.js';

// Never use S3Service's public upload bucket for contact data.
const bucket = `${S3_BUCKET}-contact-exports`;
const client = new S3Client({
  region: 'us-east-1',
  endpoint: S3_ENDPOINT,
  forcePathStyle: S3_FORCE_PATH_STYLE,
  credentials: {accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_ACCESS_KEY_SECRET},
});
const PART_SIZE = 5 * 1024 * 1024;

export class ContactExportStorage {
  static async initialize() {
    if (!S3_ENABLED) throw new Error('Contact exports require S3-compatible storage');
    try {
      await client.send(new HeadBucketCommand({Bucket: bucket}));
    } catch (error) {
      if ((error as {$metadata?: {httpStatusCode?: number}}).$metadata?.httpStatusCode !== 404) throw error;
      try {
        await client.send(new CreateBucketCommand({Bucket: bucket}));
      } catch (createError) {
        if ((createError as {name?: string}).name !== 'BucketAlreadyOwnedByYou') throw createError;
      }
    }
    // Fail closed if somebody configured a policy on the private bucket.
    try {
      const policy = await client.send(new GetBucketPolicyCommand({Bucket: bucket}));
      if (policy.Policy) throw new Error('The contact export bucket must have no bucket policy');
    } catch (error) {
      if ((error as {name?: string}).name !== 'NoSuchBucketPolicy') throw error;
    }
    await client.send(
      new PutBucketLifecycleConfigurationCommand({
        Bucket: bucket,
        LifecycleConfiguration: {
          Rules: [
            {
              ID: 'expire-contact-exports',
              Status: 'Enabled',
              Filter: {Prefix: ''},
              Expiration: {Days: 1},
              AbortIncompleteMultipartUpload: {DaysAfterInitiation: 1},
            },
          ],
        },
      }),
    );
  }

  static async upload(source: AsyncIterable<string>, checkCancelled: () => Promise<void>): Promise<string> {
    await this.initialize();
    const key = randomUUID();
    const created = await client.send(
      new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        ContentType: 'text/csv; charset=utf-8',
      }),
    );
    const uploadId = created.UploadId!;
    const parts: {ETag: string; PartNumber: number}[] = [];
    const buffer = Buffer.alloc(PART_SIZE);
    let used = 0;
    const uploadPart = async () => {
      await checkCancelled();
      if (parts.length >= 10000) throw new Error('Contact export exceeds the storage size limit');
      const result = await client.send(
        new UploadPartCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: parts.length + 1,
          Body: buffer.subarray(0, used),
        }),
      );
      parts.push({ETag: result.ETag!, PartNumber: parts.length + 1});
      used = 0;
    };
    try {
      for await (const text of source) {
        const chunk = Buffer.from(text, 'utf8');
        let offset = 0;
        while (offset < chunk.length) {
          const copied = chunk.copy(buffer, used, offset, offset + PART_SIZE - used);
          used += copied;
          offset += copied;
          if (used === PART_SIZE) await uploadPart();
        }
      }
      if (used > 0) await uploadPart();
      await checkCancelled();
      await client.send(
        new CompleteMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: {Parts: parts},
        }),
      );
      return key;
    } catch (error) {
      await client.send(new AbortMultipartUploadCommand({Bucket: bucket, Key: key, UploadId: uploadId}));
      throw error;
    }
  }

  static async download(key: string): Promise<Readable> {
    const result = await client.send(new GetObjectCommand({Bucket: bucket, Key: key}));
    return result.Body as Readable;
  }

  static async remove(key: string) {
    await client.send(new DeleteObjectCommand({Bucket: bucket, Key: key}));
  }
}
