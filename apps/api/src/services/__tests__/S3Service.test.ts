import {afterEach, describe, expect, it, vi} from 'vitest';

interface SentCommand {
  name: string;
  input: Record<string, string>;
}

const sent = vi.hoisted(() => [] as SentCommand[]);

vi.mock('@aws-sdk/client-s3', () => {
  const command = (name: string) =>
    class {
      readonly name = name;
      constructor(readonly input: Record<string, string>) {}
    };

  return {
    S3Client: class {
      async send(sentCommand: SentCommand) {
        sent.push(sentCommand);
        return {};
      }
    },
    CreateBucketCommand: command('CreateBucket'),
    HeadBucketCommand: command('HeadBucket'),
    PutBucketPolicyCommand: command('PutBucketPolicy'),
    PutObjectCommand: command('PutObject'),
  };
});

// constants.ts reads the environment at import time, so each case stubs the
// S3 variables and imports a fresh copy of the service.
async function loadS3Service(prefix: string) {
  vi.resetModules();
  vi.stubEnv('S3_ACCESS_KEY_ID', 'test-access-key');
  vi.stubEnv('S3_ACCESS_KEY_SECRET', 'test-secret');
  vi.stubEnv('S3_BUCKET', 'shared-bucket');
  vi.stubEnv('S3_PUBLIC_URL', 'https://cdn.example.com');
  vi.stubEnv('S3_PREFIX', prefix);

  return import('../S3Service.js');
}

function uploadImage(S3Service: Awaited<ReturnType<typeof loadS3Service>>) {
  return S3Service.uploadFile({
    file: Buffer.from('image'),
    filename: 'logo.png',
    contentType: 'image/png',
    projectId: 'project-1',
  });
}

function sentInput(name: string) {
  return sent.find(command => command.name === name)?.input;
}

function publicReadResources() {
  const policy = JSON.parse(sentInput('PutBucketPolicy')?.Policy ?? '{}') as {
    Statement: {Resource: string[]}[];
  };
  return policy.Statement.flatMap(statement => statement.Resource);
}

describe('S3Service', () => {
  afterEach(() => {
    sent.length = 0;
    vi.unstubAllEnvs();
  });

  describe('uploadFile', () => {
    it('stores objects under the project folder when no prefix is configured', async () => {
      const S3Service = await loadS3Service('');

      const {key, url} = await uploadImage(S3Service);

      expect(key).toMatch(/^project-1\/\d+-[0-9a-f]{16}\.png$/);
      expect(url).toBe(`https://cdn.example.com/${key}`);
      expect(sentInput('PutObject')).toMatchObject({
        Bucket: 'shared-bucket',
        Key: key,
      });
    });

    it('stores objects under S3_PREFIX when configured', async () => {
      const S3Service = await loadS3Service('plunk');

      const {key, url} = await uploadImage(S3Service);

      expect(key).toMatch(/^plunk\/project-1\/\d+-[0-9a-f]{16}\.png$/);
      expect(url).toBe(`https://cdn.example.com/${key}`);
      expect(sentInput('PutObject')).toMatchObject({
        Bucket: 'shared-bucket',
        Key: key,
      });
    });

    it('ignores leading and trailing slashes in S3_PREFIX', async () => {
      const S3Service = await loadS3Service('/tenants/plunk/');

      const {key} = await uploadImage(S3Service);

      expect(key).toMatch(/^tenants\/plunk\/project-1\/\d+-[0-9a-f]{16}\.png$/);
    });
  });

  describe('initializeBucket', () => {
    it('grants public read on the whole bucket when no prefix is configured', async () => {
      const S3Service = await loadS3Service('');

      await S3Service.initializeBucket();

      expect(publicReadResources()).toEqual(['arn:aws:s3:::shared-bucket/*']);
    });

    it('limits public read to S3_PREFIX when configured', async () => {
      const S3Service = await loadS3Service('plunk');

      await S3Service.initializeBucket();

      expect(publicReadResources()).toEqual(['arn:aws:s3:::shared-bucket/plunk/*']);
    });
  });
});
