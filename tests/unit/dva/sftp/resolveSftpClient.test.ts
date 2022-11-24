import { mockedConfig } from '../../../mocks/config.mock';
import { resolveSftpClient } from '../../../../src/dva/sftp/resolveSftpClient';
import { DevelopmentSftpClient } from '../../../../src/dva/sftp/developmentSftpClient';
import { BaseSftpClient } from '../../../../src/dva/sftp/baseSftpClient';

jest.mock('../../../../src/config');
jest.mock('../../../../src/azureBlob/azureBlobServiceClient');

describe('resolveSftpClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GIVEN config.dva.sftp.blobSourceEnabled WHEN true THEN returns developmentSftpClient', () => {
    mockedConfig.dva.sftp.blobSourceEnabled = true;

    const actualSftpClient = resolveSftpClient();

    expect(actualSftpClient).toBeInstanceOf(DevelopmentSftpClient);
  });

  test('GIVEN config.dva.sftp.blobSourceEnabled WHEN false THEN returns productionSftpClient', () => {
    mockedConfig.dva.sftp.blobSourceEnabled = false;

    const actualSftpClient = resolveSftpClient();

    expect(actualSftpClient).toBeInstanceOf(BaseSftpClient);
  });
});
