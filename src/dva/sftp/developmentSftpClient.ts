import { SftpClient } from './sftpClient';
import { AzureBlobClient, newAzureBlobClient } from '../../azureBlob/azureBlobClient';
import config from '../../config';
import { logger } from '../../observability/logger';

/**
 * Alternative SFTP client implementation based on Azure Blob Storage for development and testing purposes
 */
export class DevelopmentSftpClient implements SftpClient {
  private readonly containerName = config.common.azureBlob.stubSftpContainerName;

  constructor(private blobClient: AzureBlobClient) { }

  public async getFile(sourcePath: string): Promise<string> {
    logger.info('DevelopmentSftpClient::getFile: Trying to download a file from development SFTP (Azure Blob)', { sourcePath });
    const buffer = await this.blobClient.downloadFile(this.containerName, sourcePath);
    logger.info('DevelopmentSftpClient::getFile: Successfully downloaded a file from development SFTP (Azure Blob)', { sourcePath });
    return buffer.toString();
  }

  public async putFile(destPath: string, fileContent: string): Promise<void> {
    logger.info('DevelopmentSftpClient::putFile: Trying to upload a file to development SFTP (Azure Blob)', { destPath });
    logger.debug('DevelopmentSftpClient::putFile: Raw file content', { fileContent });
    await this.blobClient.uploadFile(this.containerName, destPath, fileContent);
    logger.info('DevelopmentSftpClient::putFile: Successfully uploaded a file to development SFTP (Azure Blob)', { destPath });
  }

  public async listFiles(sourcePath: string, searchPattern?: string | RegExp): Promise<string[]> {
    logger.info('DevelopmentSftpClient::listFiles: Trying to list files from the development SFTP (Azure Blob)', {
      sourcePath,
      searchPattern,
    });
    let files = await this.blobClient.listFiles(this.containerName);
    if (searchPattern) {
      files = files.map((filePath) => this.extractFileNameFromFilePath(filePath))
        .filter((fileName) => fileName.match(searchPattern));
    }
    logger.debug('DevelopmentSftpClient::listFiles: full list of files after filtering on search term', {
      files,
      sourcePath,
      searchPattern,
    });
    logger.info(`DevelopmentSftpClient::listFiles: Successfully fetched ${files.length} file${files.length === 1 ? '' : 's'} from development SFTP (Azure Blob)`, {
      sourcePath,
      searchPattern,
    });
    return files;
  }

  public async deleteFile(destPath: string): Promise<void> {
    logger.info('DevelopmentSftpClient::deleteFile: Trying to delete a file from development SFTP (Azure Blob)', { destPath });
    await this.blobClient.deleteFile(this.containerName, destPath);
    logger.info('DevelopmentSftpClient::deleteFile: Successfully deleted a file from development SFTP (Azure Blob)', { destPath });
  }

  private extractFileNameFromFilePath(filePath: string): string {
    const splitFilePath = filePath.split('/');
    return splitFilePath.pop() as string;
  }
}

export const developmentSftpClient = (): DevelopmentSftpClient => new DevelopmentSftpClient(newAzureBlobClient());
