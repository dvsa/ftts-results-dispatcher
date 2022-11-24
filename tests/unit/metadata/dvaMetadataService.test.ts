import { mocked } from 'ts-jest/utils';
import { when } from 'jest-when';
import { mock } from 'jest-mock-extended';
import { mockedConfig } from '../../mocks/config.mock';
import { newDvaMetadataService, DvaMetadataService } from '../../../src/metadata/dvaMetadataService';
import { newDvaMetadataClient, DvaMetadataClient } from '../../../src/metadata/dvaMetadataClient';
import { newAzureFilesClient, AzureFilesClient } from '../../../src/azureFiles/azureFilesClient';
import { MetadataFileNotFoundError } from '../../../src/metadata/metadataFileNotFoundError';
import { DvaMetadata } from '../../../src/metadata/metadata';
import { DvaTestType } from '../../../src/dva/enums';
import config from '../../../src/config';

jest.mock('../../../src/metadata/dvaMetadataClient');
const mockedNewDvaMetadataClient = mocked(newDvaMetadataClient);
const mockedDvaMetadataClient = mock<DvaMetadataClient>();

jest.mock('../../../src/azureFiles/azureFilesClient');
const mockedNewAzureFilesClient = mocked(newAzureFilesClient);
const mockedAzureFilesClient = mock<AzureFilesClient>();

let dvaMetadataService: DvaMetadataService;

describe('DvaMetadataService', () => {
  beforeEach(() => {
    when(mockedNewAzureFilesClient).calledWith().mockReturnValue(mockedAzureFilesClient);
    when(mockedNewDvaMetadataClient).calledWith().mockReturnValue(mockedDvaMetadataClient);
    mockedDvaMetadataClient.containerName = 'results';
    dvaMetadataService = newDvaMetadataService();
    config.dva.defaultSequenceNumber.learner = 1;
    config.dva.defaultSequenceNumber.adi = 3000;
    config.dva.defaultSequenceNumber.ami = 1000;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getNextSequenceNumber', () => {
    test('GIVEN metadata file already exists WHEN function is called THEN sequence number is retrieved from file and incremented', async () => {
      const mockMetadataFilename = 'mockMetadataFile.json';
      const mockMetadata: DvaMetadata = {
        sequenceNumber: 1000001,
      };
      mockedDvaMetadataClient.downloadMetadataFile.mockResolvedValue(mockMetadata);

      const actualSequenceNumber = await dvaMetadataService.getNextSequenceNumber(mockMetadataFilename, DvaTestType.LEARNER);

      expect(actualSequenceNumber).toStrictEqual(1000002);
    });

    test('GIVEN metadata file already exists WHEN function is called THEN sequence number is retrieved from the first file and incremented', async () => {
      const mockMetadataFilename = 'mockMetadataFile.json';
      const mockMetadata: DvaMetadata = {
        sequenceNumber: 1,
      };
      mockedDvaMetadataClient.downloadMetadataFile.mockResolvedValue(mockMetadata);

      const actualSequenceNumber = await dvaMetadataService.getNextSequenceNumber(mockMetadataFilename, DvaTestType.LEARNER);

      expect(actualSequenceNumber).toStrictEqual(2);
    });

    test('GIVEN metadata file does not exist and should create new one WHEN function is called THEN default sequence number is returned', async () => {
      const mockMetadataFilename = 'mockMetadataFileNotFound.json';
      const mockNotFoundError = new MetadataFileNotFoundError('Metadata file not found');
      mockedDvaMetadataClient.downloadMetadataFile.mockRejectedValue(mockNotFoundError);
      mockedConfig.dva.createMetadataFileIfNotExists = true;

      const actualSequenceNumber = await dvaMetadataService.getNextSequenceNumber(mockMetadataFilename, DvaTestType.LEARNER);

      expect(actualSequenceNumber).toStrictEqual(1);
    });

    test('GIVEN metadata file does not exist and should not create new one WHEN function is called THEN error is rethrown', async () => {
      const mockMetadataFilename = 'mockMetadataFileNotFound.json';
      const mockNotFoundError = new MetadataFileNotFoundError('Metadata file not found');
      mockedDvaMetadataClient.downloadMetadataFile.mockRejectedValue(mockNotFoundError);
      mockedConfig.dva.createMetadataFileIfNotExists = false;

      await expect(dvaMetadataService.getNextSequenceNumber(mockMetadataFilename, DvaTestType.LEARNER)).rejects.toThrow(mockNotFoundError);
    });

    test('GIVEN metadata client returns some other error WHEN function is called THEN error is rethrown', async () => {
      const mockMetadataFilename = 'mockMetadataFileCausesError.json';
      const mockError = new Error('Some other error');
      mockedDvaMetadataClient.downloadMetadataFile.mockRejectedValue(mockError);

      await expect(dvaMetadataService.getNextSequenceNumber(mockMetadataFilename, DvaTestType.LEARNER)).rejects.toThrow(mockError);
    });
  });

  describe('updateSequenceNumber', () => {
    test('GIVEN metadata filename and sequence number WHEN function is called THEN calls metadata client to create or update the file', async () => {
      const mockMetadataFilename = 'mockMetadataFile.json';
      const mockSequenceNumber = 1000002;

      await dvaMetadataService.updateSequenceNumber(mockMetadataFilename, mockSequenceNumber);

      expect(mockedDvaMetadataClient.updateOrCreateMetadataFile).toHaveBeenCalledWith(mockMetadataFilename, {
        sequenceNumber: mockSequenceNumber,
      });
    });
  });
});
