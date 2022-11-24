import SFTP from 'ssh2-sftp-client';
import { SftpClient } from './sftpClient';
import { logger, BusinessTelemetryEvent } from '../../observability/logger';
import { SftpError } from './sftpError';

export class BaseSftpClient implements SftpClient {
  private client: SFTP = new SFTP();

  constructor(public connectOptions: SFTP.ConnectOptions) { }

  public async getFile(sourcePath: string): Promise<string> {
    await this.openConnection();
    try {
      logger.info('BaseSftpClient::getFile: Trying to download a file from SFTP', { sourcePath });
      const file = await this.client.get(sourcePath) as Buffer;
      logger.info('BaseSftpClient::getFile: Successfully downloaded a file from SFTP', { sourcePath });
      return file.toString();
    } catch (error) {
      throw new SftpError(`BaseSftpClient::getFile: ${(error as Error).message}`, error, {
        event: BusinessTelemetryEvent.RES_DVA_TRANSFER_ERROR,
        sourcePath,
      });
    } finally {
      await this.closeConnection();
    }
  }

  public async putFile(destPath: string, fileContent: string): Promise<void> {
    await this.openConnection();
    try {
      logger.info('BaseSftpClient::putFile: Trying to upload a file to SFTP', { destPath });
      logger.debug('BaseSftpClient::putFile: Raw file content payload', { fileContent });

      const fileContentBuffer = Buffer.from(fileContent, 'utf8');

      await this.client.put(fileContentBuffer, destPath);
      logger.info('BaseSftpClient::putFile: Successfully uploaded a file to SFTP', { destPath });
    } catch (error) {
      throw new SftpError(`BaseSftpClient::putFile: ${(error as Error).message}`, error, {
        event: BusinessTelemetryEvent.RES_DVA_TRANSFER_ERROR,
        destPath,
      });
    } finally {
      await this.closeConnection();
    }
  }

  public async listFiles(sourcePath: string, searchPattern?: string | RegExp): Promise<string[]> {
    await this.openConnection();
    try {
      logger.info('BaseSftpClient::listFiles: Trying to fetch files from SFTP', {
        sourcePath,
        searchPattern,
      });
      const filesInfo = await this.client.list(sourcePath, searchPattern);
      logger.info(`BaseSftpClient::listFiles: Successfully fetched ${filesInfo.length} file${filesInfo.length === 1 ? '' : 's'} from SFTP`, {
        sourcePath,
        searchPattern,
      });
      if (filesInfo.length > 0) {
        const files = filesInfo.map((fileObject) => fileObject.name);
        return files;
      }
      return [];
    } catch (error) {
      throw new SftpError(`BaseSftpClient::listFiles: ${(error as Error).message}`, error, {
        event: BusinessTelemetryEvent.RES_DVA_FILE_FETCH_ERROR,
        sourcePath,
      });
    } finally {
      await this.closeConnection();
    }
  }

  public async deleteFile(destPath: string): Promise<void> {
    await this.openConnection();
    try {
      logger.info('BaseSftpClient::deleteFile: Trying to delete a file from SFTP', { destPath });
      await this.client.delete(destPath);
      logger.info('BaseSftpClient::deleteFile: Successfully deleted a file from SFTP', { destPath });
    } catch (error) {
      throw new SftpError(`BaseSftpClient::deleteFile: ${(error as Error).message}`, error, {
        event: BusinessTelemetryEvent.RES_DVA_TRANSFER_ERROR,
        destPath,
      });
    } finally {
      await this.closeConnection();
    }
  }

  private async openConnection(): Promise<void> {
    try {
      logger.debug('BaseSftpClient::openConnection: Attempting to connect to SFTP client');
      await this.client.connect(this.connectOptions);
      logger.debug('BaseSftpClient::openConnection: Successfully connected to SFTP client');
    } catch (error) {
      throw new SftpError(`BaseSftpClient::openConnection: ${(error as Error).message}`, error, {
        event: BusinessTelemetryEvent.RES_DVA_AUTH_ERROR,
      });
    }
  }

  private async closeConnection(): Promise<void> {
    try {
      logger.debug('BaseSftpClient::closeConnection: Attempting to close connection to SFTP client');
      await this.client.end();
      logger.debug('BaseSftpClient::closeConnection: Successfully closed connection to SFTP client');
    } catch (error) {
      throw new SftpError(`BaseSftpClient::closeConnection: ${(error as Error).message}`, error);
    }
  }
}
