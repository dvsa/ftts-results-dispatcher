import {
  FileDeleteResponse, ShareFileClient, ShareServiceClient,
} from '@azure/storage-file-share';
import config from '../config';
import { logger } from '../observability/logger';
import { AzureFilesError } from './azureFilesError';

const FILE_TYPE = 'file';
const DEFAULT_DIRECTORY_NAME = '';

export class AzureFilesClient {
  constructor(
    public serviceClient: ShareServiceClient,
    private chunkSize: number,
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
    logger.info('AzureFilesClient::uploadFile: Trying to create an empty file', properties);
    const shareClient = this.serviceClient.getShareClient(shareName);

    const contentByteLength = Buffer.byteLength(content);
    const { fileCreateResponse, fileClient } = await shareClient.createFile(
      fileName,
      contentByteLength,
    );
    if (fileCreateResponse.errorCode) {
      throw new AzureFilesError(`AzureFilesClient::uploadFile: Failed to create an empty file: ${fileCreateResponse.errorCode}`, undefined, properties);
    }
    logger.info('AzureFilesClient::uploadFile: The empty file has been successfully created', properties);

    logger.info('AzureFilesClient::uploadFile: Trying to upload the contents of a file', properties);
    try {
      await this.uploadFileInChunks(fileClient, content);
      logger.info('AzureFilesClient::uploadFile: The contents of a file have been successfully uploaded', properties);
    } catch (error) {
      logger.error(error as Error, 'AzureFilesClient::uploadFile: Failed to upload the contents of a file', properties);
      await fileClient.deleteIfExists();
      logger.info('AzureFilesClient::uploadFile: uploaded file successfully deleted', properties);
      throw new AzureFilesError('AzureFilesClient::uploadFile: Failed to upload the contents of a file', error, properties);
    }
  }

  private async uploadFileInChunks(fileClient: ShareFileClient, content: string): Promise<void> {
    const chunkedContent = this.chunkContent(content);
    if (!chunkedContent) {
      throw new Error('AzureFilesClient::uploadFileInChunks: cannot split file content into chunks');
    }
    logger.info('AzureFilesClient::uploadFileInChunks: file chunked', { numberOfChunks: chunkedContent.length });
    let offset = 0;
    // eslint-disable-next-line no-restricted-syntax
    for (const chunk of chunkedContent) {
      const chunkLength = Buffer.byteLength(chunk);
      // eslint-disable-next-line no-await-in-loop
      const response = await fileClient.uploadRange(
        chunk,
        offset,
        chunkLength,
      );
      if (response.errorCode) {
        throw new Error(`AzureFilesClient::uploadFileInChunks: failed to uplad: ${response.errorCode}`);
      }
      offset += chunkLength;
    }
  }

  private chunkContent(str: string): string[] | null {
    // last chunk can have less chars than this.chunkSize
    const chunkSize = Number(this.chunkSize);
    const numChunks = Math.ceil(str.length / chunkSize);
    const chunks = new Array<string>(numChunks);
    for (let i = 0, o = 0; i < numChunks; ++i, o += chunkSize) {
      // chunks are added to array in original order
      // eslint-disable-next-line security/detect-object-injection
      chunks[i] = str.substr(o, chunkSize);
    }
    return chunks;
  }

  public async downloadFile(
    shareName: string,
    fileName: string,
  ): Promise<Buffer> {
    logger.info(`AzureFilesClient::downloadFile: Trying to download ${fileName} file from the Azure Storage ${shareName} file share`, {
      fileName,
      shareName,
    });
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
    logger.info(`AzureFilesClient::fileExists: Checking if ${fileName} file exists in the Azure Storage ${shareName} file share`, {
      fileName,
      shareName,
    });
    return this.serviceClient
      .getShareClient(shareName)
      .getDirectoryClient(DEFAULT_DIRECTORY_NAME)
      .getFileClient(fileName)
      .exists();
  }

  public async listFiles(shareName: string): Promise<string[]> {
    logger.info('AzureFilesClient::listFiles: Trying to list files', {
      shareName,
    });
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
    logger.info('AzureFilesClient::listFiles: The files have been successfully listed', {
      shareName,
      fileNames: fileNames.toString(),
    });
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
    logger.info('AzureFilesClient::deleteFile: Trying to delete a file', properties);
    const fileDeleteResponse: FileDeleteResponse = await this.serviceClient
      .getShareClient(shareName)
      .getDirectoryClient(DEFAULT_DIRECTORY_NAME)
      .deleteFile(fileName);
    if (fileDeleteResponse.errorCode) {
      throw new AzureFilesError(`AzureFilesClient::deleteFile: Failed to delete the file. Error code: ${fileDeleteResponse.errorCode}`, undefined, properties);
    }
    logger.info('AzureFilesClient::deleteFile: The file has been successfully deleted', properties);
  }
}

export const newAzureFilesClient = (): AzureFilesClient => {
  const serviceClient = ShareServiceClient.fromConnectionString(
    config.tars.azureFiles.storageConnectionString,
  );
  return new AzureFilesClient(serviceClient, config.tars.azureFiles.chunkSize as number);
};
