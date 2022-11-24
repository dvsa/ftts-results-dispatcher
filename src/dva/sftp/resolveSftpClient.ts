import { productionSftpClient } from './productionSftpClient';
import { developmentSftpClient } from './developmentSftpClient';
import { SftpClient } from './sftpClient';
import config from '../../config';
import { logger } from '../../observability/logger';

export function resolveSftpClient(): SftpClient {
  if (config.dva.sftp.blobSourceEnabled) {
    logger.debug('resolveSftpClient: Using development SFTP implementation');
    return developmentSftpClient();
  }
  logger.debug('resolveSftpClient: Using production SFTP implementation');
  return productionSftpClient();
}
