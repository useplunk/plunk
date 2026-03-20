import {BlobServiceClient, ContainerClient} from '@azure/storage-blob';
import crypto from 'crypto';
import signale from 'signale';

import {
  AZURE_STORAGE_CONNECTION_STRING,
  AZURE_STORAGE_CONTAINER,
  AZURE_STORAGE_ENABLED,
  AZURE_STORAGE_PUBLIC_URL,
} from '../app/constants.js';

/**
 * Azure Blob Storage client for file uploads
 */
let containerClient: ContainerClient | null = null;

if (AZURE_STORAGE_ENABLED) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER);
}

/**
 * Initialize the Azure Blob Storage container if it doesn't exist
 */
export async function initializeContainer(): Promise<void> {
  if (!containerClient) {
    throw new Error('Azure Blob Storage is not enabled');
  }

  try {
    await containerClient.createIfNotExists({
      access: 'blob', // Public read access for blobs
    });
    signale.info(`[AZURE-BLOB] Container ready: ${AZURE_STORAGE_CONTAINER}`);
  } catch (error) {
    signale.error('[AZURE-BLOB] Failed to initialize container:', error);
    throw error;
  }
}

interface UploadFileParams {
  file: Buffer;
  filename: string;
  contentType: string;
  projectId: string;
}

interface UploadFileResult {
  url: string;
  key: string;
}

/**
 * Upload a file to Azure Blob Storage
 */
export async function uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
  if (!containerClient) {
    throw new Error('Azure Blob Storage is not enabled');
  }

  const {file, filename, contentType, projectId} = params;

  // Generate a unique key for the file
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = filename.split('.').pop();
  const key = `${projectId}/${timestamp}-${randomString}.${extension}`;

  // Upload to Azure Blob Storage
  const blockBlobClient = containerClient.getBlockBlobClient(key);
  await blockBlobClient.uploadData(file, {
    blobHTTPHeaders: {
      blobContentType: contentType,
    },
  });

  // Construct public URL
  const url = AZURE_STORAGE_PUBLIC_URL ? `${AZURE_STORAGE_PUBLIC_URL}/${key}` : blockBlobClient.url;

  return {url, key};
}

/**
 * Check if Azure Blob Storage is enabled and configured
 */
export function isStorageEnabled(): boolean {
  return AZURE_STORAGE_ENABLED;
}
