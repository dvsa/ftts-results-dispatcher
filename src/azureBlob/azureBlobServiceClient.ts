import { BlobServiceClient } from '@azure/storage-blob';
import config from '../config';
import { AzureBlobError } from './azureBlobError';

export function newAzureBlobServiceClient(): BlobServiceClient {
  try {
    return BlobServiceClient.fromConnectionString(config.common.azureBlob.storageConnectionString);
  } catch (error) {
    throw new AzureBlobError((error as Error).message, error);
  }
}
