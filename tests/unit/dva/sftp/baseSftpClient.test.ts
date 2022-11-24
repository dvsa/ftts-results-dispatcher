import { mock } from 'jest-mock-extended';
import SFTP from 'ssh2-sftp-client';
import { mocked } from 'ts-jest/utils';
import { BaseSftpClient } from '../../../../src/dva/sftp/baseSftpClient';
import { SftpError } from '../../../../src/dva/sftp/sftpError';
import { productionFileList } from '../../../mocks/fileList.mock';

jest.mock('ssh2-sftp-client');
const sftpMock = mock<SFTP>();
const mockedSftpMock = mocked(sftpMock);

const mockConnectOptions = {
  host: 'mock host',
  port: 3000,
  username: 'mock username',
  password: 'mock password',
  privateKey: 'mock private key',
};

const baseSftpClient = new BaseSftpClient(mockConnectOptions);

// eslint-disable-next-line
baseSftpClient['client'] = sftpMock;

describe('baseSftpClient', () => {
  let mockSourcePath: string;
  let mockDestPath: string;
  let mockFileContents: string;

  beforeEach(() => {
    mockFileContents = 'example file contents';
    mockSourcePath = 'mock source path';
    mockDestPath = 'mock destination path';
    jest.resetAllMocks();
  });

  describe('getFile', () => {
    test('GIVEN the connection to the SFTP server is correct and we get back a valid file buffer WHEN getFile THEN returns the file in string form', async () => {
      mockedSftpMock.get.mockResolvedValue(Buffer.from(mockFileContents, 'utf-8'));
      await expect(baseSftpClient.getFile(mockSourcePath)).resolves.toEqual(mockFileContents);
    });

    test('GIVEN the connection to the SFTP server is correct but getting the file buffer fails WHEN getFile THEN error throws', async () => {
      const error = new Error('Failed to get file from SFTP server');
      mockedSftpMock.get.mockRejectedValue(error);
      await expect(baseSftpClient.getFile(mockSourcePath)).rejects.toThrow(expect.any(SftpError));
    });

    test('GIVEN the connection to the SFTP server failed WHEN getFile THEN error throws', async () => {
      const error = new Error('Failed to connect to SFTP server');
      mockedSftpMock.connect.mockRejectedValue(error);
      await expect(baseSftpClient.getFile(mockSourcePath)).rejects.toThrow(expect.any(SftpError));
    });

    test('GIVEN the connection to the SFTP server is correct and we get back a valid file buffer but the connection fails to close WHEN getFile THEN error throws', async () => {
      const error = new Error('Failed to close connection to SFTP server');
      mockedSftpMock.get.mockResolvedValue(Buffer.from(mockFileContents, 'utf-8'));
      mockedSftpMock.end.mockRejectedValue(error);
      await expect(baseSftpClient.getFile(mockSourcePath)).rejects.toThrow(expect.any(SftpError));
    });
  });

  describe('putFile', () => {
    test('GIVEN the connection to the SFTP server is correct and we can successfully upload a file through ssh WHEN putFile THEN successfully closes connection with no problems', async () => {
      await baseSftpClient.putFile(mockDestPath, mockFileContents);

      expect(mockedSftpMock.connect).toHaveBeenCalledWith(mockConnectOptions);
      expect(mockedSftpMock.put).toHaveBeenCalledWith(Buffer.from(mockFileContents, 'utf8'), mockDestPath);
      expect(mockedSftpMock.end).toHaveBeenCalled();
    });

    test('GIVEN the connection to the SFTP server is correct but uploading the file buffer fails WHEN putFile THEN error throws', async () => {
      const error = new Error('Failed to get file from SFTP server');
      mockedSftpMock.put.mockRejectedValue(error);
      await expect(baseSftpClient.putFile(mockDestPath, mockFileContents)).rejects.toThrow(expect.any(SftpError));
    });

    test('GIVEN the connection to the SFTP server failed WHEN putFile THEN error throws', async () => {
      const error = new Error('Failed to connect to SFTP server');
      mockedSftpMock.connect.mockRejectedValue(error);
      await expect(baseSftpClient.putFile(mockDestPath, mockFileContents)).rejects.toThrow(expect.any(SftpError));
    });

    test('GIVEN the connection to the SFTP server is correct and we upload a valid file buffer but the connection fails to close WHEN putFile THEN error throws', async () => {
      const error = new Error('Failed to close connection to SFTP server');
      mockedSftpMock.put.mockResolvedValue('done');
      mockedSftpMock.end.mockRejectedValue(error);
      await expect(baseSftpClient.putFile(mockDestPath, mockFileContents)).rejects.toThrow(expect.any(SftpError));
    });
  });

  describe('listFiles', () => {
    test('GIVEN the connection to the SFTP server is correct and we can successfully list files through SSH WHEN listFiles THEN successfully returns a list of file names mapped from the response', async () => {
      mockedSftpMock.list.mockResolvedValue(productionFileList());

      const expectedList = await baseSftpClient.listFiles(mockSourcePath);

      expect(mockedSftpMock.connect).toHaveBeenCalled();
      expect(expectedList).toStrictEqual(['mock-file-name-1', 'mock-file-name-2', 'mock-file-name-3']);
      expect(mockedSftpMock.end).toHaveBeenCalled();
    });

    test('GIVEN the connection to the SFTP server is correct and an empty list is returned through SSH WHEN listFiles THEN successfully returns an empty list', async () => {
      mockedSftpMock.list.mockResolvedValue([]);

      const expectedList = await baseSftpClient.listFiles(mockSourcePath);

      expect(expectedList).toStrictEqual([]);
    });

    test('GIVEN the connection to the SFTP server is correct and we pass in a search pattern to the list function WHEN listFiles THEN ssh calls list with the search pattern', async () => {
      mockedSftpMock.list.mockResolvedValue(productionFileList());
      const mockSearchPattern = 'mock-search-pattern';

      await baseSftpClient.listFiles(mockSourcePath, mockSearchPattern);

      expect(mockedSftpMock.list).toHaveBeenCalledWith(mockSourcePath, mockSearchPattern);
    });

    test('GIVEN the connection to the SFTP server fails WHEN listFiles THEN error thrown', async () => {
      const error = new Error('Failed to connect to SFTP server');
      mockedSftpMock.connect.mockRejectedValue(error);

      await expect(baseSftpClient.listFiles(mockSourcePath)).rejects.toThrow(expect.any(SftpError));
    });

    test('GIVEN the connection to the SFTP server is correct but there\'s an error listing files from SSH WHEN listFiles THEN error thrown', async () => {
      const error = new Error('Failed to list files on SFTP server');
      mockedSftpMock.list.mockRejectedValue(error);

      await expect(baseSftpClient.listFiles(mockSourcePath)).rejects.toThrow(expect.any(SftpError));
    });
  });

  describe('deleteFile', () => {
    test('GIVEN the connection to the SFTP server is correct and we can successfully delete a file through ssh WHEN deleteFile THEN successfully closes connection with no problems', async () => {
      await baseSftpClient.deleteFile(mockDestPath);

      expect(mockedSftpMock.connect).toHaveBeenCalledWith(mockConnectOptions);
      expect(mockedSftpMock.delete).toHaveBeenCalledWith(mockDestPath);
      expect(mockedSftpMock.end).toHaveBeenCalled();
    });

    test('GIVEN the connection to the SFTP server is correct but deleting the file fails WHEN deleteFile THEN error throws', async () => {
      const error = new Error('Failed to get file from SFTP server');
      mockedSftpMock.delete.mockRejectedValue(error);
      await expect(baseSftpClient.deleteFile(mockDestPath)).rejects.toThrow(expect.any(SftpError));
    });

    test('GIVEN the connection to the SFTP server failed WHEN deleteFile THEN error throws', async () => {
      const error = new Error('Failed to connect to SFTP server');
      mockedSftpMock.connect.mockRejectedValue(error);
      await expect(baseSftpClient.deleteFile(mockDestPath)).rejects.toThrow(expect.any(SftpError));
    });

    test('GIVEN the connection to the SFTP server is correct and we delete a file but the connection fails to close WHEN deleteFile THEN error throws', async () => {
      const error = new Error('Failed to close connection to SFTP server');
      mockedSftpMock.delete.mockResolvedValue('done');
      mockedSftpMock.end.mockRejectedValue(error);
      await expect(baseSftpClient.deleteFile(mockDestPath)).rejects.toThrow(expect.any(SftpError));
    });
  });
});
