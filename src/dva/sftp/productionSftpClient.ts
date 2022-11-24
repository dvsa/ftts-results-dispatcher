import config from '../../config';
import { SftpClient } from './sftpClient';
import { BaseSftpClient } from './baseSftpClient';

export const productionSftpClient = (): SftpClient => new BaseSftpClient({
  host: config.dva.sftp.hostname,
  port: Number(config.dva.sftp.port),
  username: config.dva.sftp.username,
  password: config.dva.sftp.password,
  privateKey: Buffer.from(config.dva.sftp.privateKey, 'base64'),
});
