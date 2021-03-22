import {
  BlobServiceClient,
  ContainerClient,
  BlockBlobUploadResponse,
  BlobDeleteResponse,
} from '@azure/storage-blob';
import { newAzureBlobServiceClient } from './azureBlobServiceClient';
import { AzureBlobError } from './azureBlobError';

export class AzureBlobClient {
  constructor(
    private blobServiceClient: BlobServiceClient,
  ) { }

  // If the file with given name already exists in the container - file will be updated with given content
  public async uploadFile(
    containerName: string,
    fileName: string,
    fileContent: string,
  ): Promise<void> {
    const containerClient: ContainerClient = this.blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();
    const uploadResponse: BlockBlobUploadResponse = await containerClient
      .getBlockBlobClient(fileName)
      .upload(fileContent, Buffer.byteLength(fileContent));
    if (uploadResponse.errorCode) {
      throw new AzureBlobError(
        `Failed to upload a file with error code: ${uploadResponse.errorCode}`,
        undefined,
        { fileName, containerName },
      );
    }
  }

  public async listFiles(containerName: string): Promise<string[]> {
    const containerClient: ContainerClient = this.blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();
    const blobNames = [];
    // eslint-disable-next-line no-restricted-syntax
    for await (const blob of containerClient.listBlobsFlat()) {
      blobNames.push(blob.name);
    }
    return blobNames;
  }

  public async downloadFile(containerName: string, fileName: string): Promise<Buffer> {
    const containerClient: ContainerClient = this.blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();
    return containerClient
      .getBlockBlobClient(fileName)
      .downloadToBuffer();
  }

  public async deleteFile(containerName: string, fileName: string): Promise<void> {
    const containerClient: ContainerClient = this.blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();
    const deleteResponse: BlobDeleteResponse = await containerClient.deleteBlob(fileName);
    if (deleteResponse.errorCode) {
      throw new AzureBlobError(`Failed to delete a ${fileName} file with error code: ${deleteResponse.errorCode}`);
    }
  }
}

export const newAzureBlobClient = (): AzureBlobClient => new AzureBlobClient(
  newAzureBlobServiceClient(),
);
