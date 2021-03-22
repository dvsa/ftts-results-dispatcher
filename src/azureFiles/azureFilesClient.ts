import {
  ShareServiceClient,
  FileUploadRangeResponse,
  FileDeleteResponse,
} from '@azure/storage-file-share';
import config from '../config';
import { logger } from '../observability/logger';
import { AzureFilesError } from './azureFilesError';

const FILE_TYPE = 'file';
const DEFAULT_DIRECTORY_NAME = '';

export class AzureFilesClient {
  constructor(
    public serviceClient: ShareServiceClient,
  ) {}

  public async uploadFile(
    shareName: string,
    fileName: string,
    content: string,
  ): Promise<void> {
    const properties = {
      shareName,
      fileName,
    };
    logger.info('Trying to create an empty file', properties);
    const shareClient = this.serviceClient.getShareClient(shareName);
    const contentByteLength = Buffer.byteLength(content);
    const { fileCreateResponse, fileClient } = await shareClient.createFile(
      fileName,
      contentByteLength,
    );
    if (fileCreateResponse.errorCode) {
      throw new AzureFilesError(
        `Failed to create an empty file: ${fileCreateResponse.errorCode}`,
        undefined,
        properties,
      );
    }
    logger.info(
      'The empty file has been successfully created',
      properties,
    );
    logger.info(
      'Trying to upload the contents of a file',
      properties,
    );
    const fileUploadRangeResponse: FileUploadRangeResponse = await fileClient.uploadRange(
      content,
      0,
      contentByteLength,
    );
    if (fileUploadRangeResponse.errorCode) {
      throw new AzureFilesError(
        `Failed to upload the contents of a file: ${fileUploadRangeResponse.errorCode}`,
        undefined,
        properties,
      );
    }
    logger.info(
      'The contents of a file have been successfully uploaded',
      properties,
    );
  }

  public async downloadFile(
    shareName: string,
    fileName: string,
  ): Promise<Buffer> {
    logger.info(
      `Trying to download ${fileName} file from the Azure Storage ${shareName} file share`,
      { fileName, shareName },
    );
    return this.serviceClient
      .getShareClient(shareName)
      .getDirectoryClient(DEFAULT_DIRECTORY_NAME)
      .getFileClient(fileName)
      .downloadToBuffer();
  }

  public async fileExists(
    shareName: string,
    fileName: string,
  ): Promise<boolean> {
    logger.info(
      `Checking if ${fileName} file exists in the Azure Storage ${shareName} file share`,
      { fileName, shareName },
    );
    return this.serviceClient
      .getShareClient(shareName)
      .getDirectoryClient(DEFAULT_DIRECTORY_NAME)
      .getFileClient(fileName)
      .exists();
  }

  public async listFiles(shareName: string): Promise<string[]> {
    logger.info(
      'Trying to list files',
      { shareName },
    );
    const listFilesAndDirectories = this.serviceClient
      .getShareClient(shareName)
      .getDirectoryClient(DEFAULT_DIRECTORY_NAME)
      .listFilesAndDirectories();
    const fileNames = [];
    // eslint-disable-next-line no-restricted-syntax
    for await (const item of listFilesAndDirectories) {
      if (item.kind === FILE_TYPE) {
        fileNames.push(item.name);
      }
    }
    logger.info(
      'The files have been successfully listed',
      {
        shareName,
        fileNames: fileNames.toString(),
      },
    );
    return fileNames;
  }

  public async deleteFile(
    shareName: string,
    fileName: string,
  ): Promise<void> {
    const properties = {
      fileName,
      shareName,
    };
    logger.info(
      'Trying to delete a file',
      properties,
    );
    const fileDeleteResponse: FileDeleteResponse = await this.serviceClient
      .getShareClient(shareName)
      .getDirectoryClient(DEFAULT_DIRECTORY_NAME)
      .deleteFile(fileName);
    if (fileDeleteResponse.errorCode) {
      throw new AzureFilesError(
        `Failed to delete the file. Error code: ${fileDeleteResponse.errorCode}`,
        undefined,
        properties,
      );
    }
    logger.info(
      'The file has been successfully deleted',
      properties,
    );
  }
}

export const newAzureFilesClient = (): AzureFilesClient => {
  const serviceClient = ShareServiceClient.fromConnectionString(
    config.azureFiles.storageConnectionString,
  );
  return new AzureFilesClient(serviceClient);
};
