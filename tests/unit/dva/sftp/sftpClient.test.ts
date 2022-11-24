import { mocked } from 'ts-jest/utils';
import { mock } from 'jest-mock-extended';
import { developmentSftpClient } from '../../../../src/dva/sftp/developmentSftpClient';
import { SftpClient, verifyFileContents } from '../../../../src/dva/sftp/sftpClient';
import { mockedConfig } from '../../../mocks/config.mock';
import { generateMD5Checksum } from '../../../../src/utils/generateMd5Checksum';
import { AzureBlobClient, newAzureBlobClient } from '../../../../src/azureBlob/azureBlobClient';

jest.mock('../../../../src/config');
jest.mock('../../../../src/observability/logger');

jest.mock('../../../../src/azureBlob/azureBlobClient');
const mockedNewAzureBlobClient = mocked(newAzureBlobClient, true);
const mockedAzureBlobClient = mock<AzureBlobClient>();

jest.mock('../../../../src/utils/generateMd5Checksum.ts');
const mockedMd5Checksum = mocked(generateMD5Checksum);

const containerName = 'sftp-stub';
const blobFilePath = 'folder/mockResultsFile.txt';
const fileContent = 'foo';

describe('sftpClient', () => {
  let mockSftpClient: SftpClient;

  beforeEach(() => {
    jest.resetAllMocks();
    mockedConfig.common.azureBlob.stubSftpContainerName = containerName;
    mockedNewAzureBlobClient.mockReturnValue(mockedAzureBlobClient);
    mockSftpClient = developmentSftpClient();
    mockSftpClient.getFile = jest.fn();
    mockSftpClient.deleteFile = jest.fn();
  });

  describe('verifyFileContents', () => {
    test('GIVEN that the file checksums are the same WHEN called THEN file content can be verified correctly', async () => {
      const expectedChecksum = 'mockChecksum';
      const actualChecksum = 'mockChecksum';

      mockedMd5Checksum.mockReturnValueOnce(expectedChecksum);
      mockedMd5Checksum.mockReturnValueOnce(actualChecksum);

      await expect(verifyFileContents(blobFilePath, fileContent, mockSftpClient)).resolves.not.toThrow();
    });

    test('GIVEN that the file checksums are different for the same file content WHEN called THEN error will be caught and file will be deleted from the SFTP server', async () => {
      const expectedChecksum = 'mockChecksum';
      const actualChecksum = 'failedChecksum';

      mockedMd5Checksum.mockReturnValueOnce(expectedChecksum);
      mockedMd5Checksum.mockReturnValueOnce(actualChecksum);

      await expect(verifyFileContents(blobFilePath, fileContent, mockSftpClient)).rejects.toThrowError('sftpClient::verifyFileContents: Invalid results file. Checksums do not match on file folder/mockResultsFile.txt');
      expect(mockSftpClient.deleteFile).toHaveBeenCalledWith(blobFilePath);
    });

    test('GIVEN that the file checksums are different for the same file content and the SFTP server cannot delete file WHEN called THEN error will be caught and rethrown', async () => {
      const expectedChecksum = 'mockChecksum';
      const actualChecksum = 'failedChecksum';
      const error = new Error('Cannot delete file from SFTP');

      mockedMd5Checksum.mockReturnValueOnce(expectedChecksum);
      mockedMd5Checksum.mockReturnValueOnce(actualChecksum);

      mockSftpClient.deleteFile = jest.fn().mockRejectedValue(error);

      await expect(verifyFileContents(blobFilePath, fileContent, mockSftpClient)).rejects.toThrowError(error);
      expect(mockSftpClient.deleteFile).toHaveBeenCalledWith(blobFilePath);
    });
  });
});
