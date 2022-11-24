import { mocked } from 'ts-jest/utils';
import { when } from 'jest-when';
import { mock } from 'jest-mock-extended';
import { mockedConfig } from '../../mocks/config.mock';
import { mockedLogger } from '../../mocks/logger.mock';
import { newAzureFilesClient, AzureFilesClient } from '../../../src/azureFiles/azureFilesClient';
import { AzureBlobClient, newAzureBlobClient } from '../../../src/azureBlob/azureBlobClient';
import fileHousekeeping from '../../../src/fileHousekeeping/fileHousekeeping';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';
import { FileHousekeepingError } from '../../../src/fileHousekeeping/fileHousekeepingError';

jest.mock('../../../src/observability/logger');

jest.mock('../../../src/azureFiles/azureFilesClient');
const mockedNewAzureFilesClient = mocked(newAzureFilesClient);
const mockedAzureFilesClient = mock<AzureFilesClient>();

jest.mock('../../../src/azureBlob/azureBlobClient');
const mockedNewAzureBlobClient = mocked(newAzureBlobClient);
const mockedAzureBlobClient = mock<AzureBlobClient>();

const SHARE_NAME = 'tars';
const CONTAINER_NAME = 'results';
const PROCESSED_PREFIX = 'processed-';

const PROCESSED_FILE_NAME_1 = 'processed-TARS202008140011.xml';
const PROCESSED_FILE_NAME_2 = 'Processed-TARS202008140021.xml';
const UNPROCESSED_FILE_NAME = 'TARS202008150021.xml';
const RANDOM_FILE_NAME = 'random.xml';
const PROCESSED_FILE_NAME_LAST = 'processed-TARS202008150021.xml';

const METADATA_FILE_NAME_1 = '0000001-TARS.json';
const METADATA_FILE_NAME_2 = '0000002-TARS.json';
const METADATA_FILE_NAME_3 = mockedConfig.dva.metadataFilename.adi;
const METADATA_FILE_NAME_4 = mockedConfig.dva.metadataFilename.ami;
const METADATA_FILE_NAME_5 = mockedConfig.dva.metadataFilename.dva;
const METADATA_FILE_NAME_LAST = '0000003-TARS.json';

const ERROR = new Error('error msg');

describe('fileHousekepping', () => {
  beforeEach(() => {
    mockedConfig.tars.azureFiles.tarsShareName = SHARE_NAME;
    mockedConfig.tars.processedTestResultFilePrefix = PROCESSED_PREFIX;
    mockedConfig.common.azureBlob.metadataContainerName = CONTAINER_NAME;
    when(mockedNewAzureFilesClient).calledWith().mockReturnValue(mockedAzureFilesClient);
    when(mockedNewAzureBlobClient).calledWith().mockReturnValue(mockedAzureBlobClient);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });
  test('GIVEN 2 processed file names and 2 metadata file names WHEN call fileHousekeeping function THEN old files succesfully deleted', async () => {
    when(mockedAzureFilesClient.listFiles)
      .calledWith(SHARE_NAME)
      .mockResolvedValue([PROCESSED_FILE_NAME_1, PROCESSED_FILE_NAME_LAST]);
    when(mockedAzureBlobClient.listFiles)
      .calledWith(CONTAINER_NAME)
      .mockResolvedValue([METADATA_FILE_NAME_1, METADATA_FILE_NAME_3, METADATA_FILE_NAME_4, METADATA_FILE_NAME_5, METADATA_FILE_NAME_LAST]);

    await fileHousekeeping();

    expect(mockedAzureFilesClient.deleteFile).toHaveBeenCalledTimes(1);
    expect(mockedAzureFilesClient.deleteFile).toHaveBeenCalledWith(
      SHARE_NAME, PROCESSED_FILE_NAME_1,
    );
    expect(mockedAzureBlobClient.deleteFile).toHaveBeenCalledTimes(1);
    expect(mockedAzureBlobClient.deleteFile).toHaveBeenCalledWith(
      CONTAINER_NAME, METADATA_FILE_NAME_1,
    );
    expect(mockedLogger.info).toHaveBeenCalledTimes(3);
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      1,
      'fileHousekeeping::deleteOldProcessedFiles: Trying to delete old processed files',
      { shareName: SHARE_NAME },
    );
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      2,
      `fileHousekeeping::deleteOldMetadataFiles: ${METADATA_FILE_NAME_1} deleted by housekeeping cron job`,
      { containerName: CONTAINER_NAME },
    );
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      3,
      `fileHousekeeping::deleteOldMetadataFiles: The old metadata files ${JSON.stringify([METADATA_FILE_NAME_1])} deleted from the Azure Blob Container`,
      { containerName: CONTAINER_NAME },
    );
    expect(mockedLogger.event).toHaveBeenCalledTimes(1);
    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvent.RES_TARS_RESULTS_FILES_DELETED,
      'fileHousekeeping::deleteOldProcessedFiles: The old processed files have been deleted successfully',
      {
        shareName: SHARE_NAME,
        deletedFiles: `${PROCESSED_FILE_NAME_1}`,
      },
    );
  });

  test('GIVEN 2 processed file names, 1 is capitalized WHEN call fileHousekeeping function THEN old files succesfully deleted', async () => {
    when(mockedAzureFilesClient.listFiles)
      .calledWith(SHARE_NAME)
      .mockResolvedValue([PROCESSED_FILE_NAME_2, PROCESSED_FILE_NAME_LAST]);

    await fileHousekeeping();

    expect(mockedAzureFilesClient.deleteFile).toHaveBeenCalledTimes(1);
    expect(mockedAzureFilesClient.deleteFile).toHaveBeenCalledWith(
      SHARE_NAME, PROCESSED_FILE_NAME_2,
    );
    expect(mockedAzureBlobClient.deleteFile).toHaveBeenCalledTimes(0);
    expect(mockedLogger.info).toHaveBeenCalledTimes(2);
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      1,
      'fileHousekeeping::deleteOldProcessedFiles: Trying to delete old processed files',
      { shareName: SHARE_NAME },
    );
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      2,
      'fileHousekeeping::deleteOldMetadataFiles: Azure Blob Storage Container is empty',
      { containerName: CONTAINER_NAME },
    );
    expect(mockedLogger.event).toHaveBeenCalledTimes(1);
    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvent.RES_TARS_RESULTS_FILES_DELETED,
      'fileHousekeeping::deleteOldProcessedFiles: The old processed files have been deleted successfully',
      {
        shareName: SHARE_NAME,
        deletedFiles: `${PROCESSED_FILE_NAME_2}`,
      },
    );
  });

  test('GIVEN 2 file names, 1 processed, 1 unprocessed WHEN call fileHousekeeping function THEN any file is deleted', async () => {
    when(mockedAzureFilesClient.listFiles)
      .calledWith(SHARE_NAME)
      .mockResolvedValue([PROCESSED_FILE_NAME_2, UNPROCESSED_FILE_NAME]);

    await fileHousekeeping();

    expect(mockedAzureFilesClient.deleteFile).toHaveBeenCalledTimes(0);
    expect(mockedAzureBlobClient.deleteFile).toHaveBeenCalledTimes(0);
    expect(mockedLogger.info).toHaveBeenCalledTimes(2);
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      1,
      'fileHousekeeping::deleteOldProcessedFiles: Trying to delete old processed files',
      { shareName: SHARE_NAME },
    );
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      2,
      'fileHousekeeping::deleteOldMetadataFiles: Azure Blob Storage Container is empty',
      { containerName: CONTAINER_NAME },
    );
    expect(mockedLogger.event).toHaveBeenCalledTimes(1);
    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvent.RES_TARS_RESULTS_FILES_DELETED,
      'fileHousekeeping::deleteOldProcessedFiles: There have been no old processed files to delete',
      {
        shareName: SHARE_NAME,
        deletedFiles: '',
      },
    );
  });

  test('GIVEN 2 file names, 1 processed, 1 random WHEN call fileHousekeeping function THEN any file is deleted', async () => {
    when(mockedAzureFilesClient.listFiles)
      .calledWith(SHARE_NAME)
      .mockResolvedValue([PROCESSED_FILE_NAME_2, RANDOM_FILE_NAME]);

    await fileHousekeeping();

    expect(mockedAzureFilesClient.deleteFile).toHaveBeenCalledTimes(0);
    expect(mockedAzureBlobClient.deleteFile).toHaveBeenCalledTimes(0);
    expect(mockedLogger.info).toHaveBeenCalledTimes(2);
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      1,
      'fileHousekeeping::deleteOldProcessedFiles: Trying to delete old processed files',
      { shareName: SHARE_NAME },
    );
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      2,
      'fileHousekeeping::deleteOldMetadataFiles: Azure Blob Storage Container is empty',
      { containerName: CONTAINER_NAME },
    );
    expect(mockedLogger.event).toHaveBeenCalledTimes(1);
    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvent.RES_TARS_RESULTS_FILES_DELETED,
      'fileHousekeeping::deleteOldProcessedFiles: There have been no old processed files to delete',
      {
        shareName: SHARE_NAME,
        deletedFiles: '',
      },
    );
  });

  test('GIVEN 3 unsorted processed file names and unprocessed and random WHEN call fileHousekeeping function THEN old files succesfully deleted', async () => {
    when(mockedAzureFilesClient.listFiles)
      .calledWith(SHARE_NAME)
      .mockResolvedValue([PROCESSED_FILE_NAME_LAST,
        UNPROCESSED_FILE_NAME,
        PROCESSED_FILE_NAME_1,
        RANDOM_FILE_NAME,
        PROCESSED_FILE_NAME_2]);

    await fileHousekeeping();

    expect(mockedAzureFilesClient.deleteFile).toHaveBeenCalledTimes(2);
    expect(mockedAzureFilesClient.deleteFile).toHaveBeenNthCalledWith(
      1,
      SHARE_NAME, PROCESSED_FILE_NAME_1,
    );
    expect(mockedAzureFilesClient.deleteFile).toHaveBeenNthCalledWith(
      2,
      SHARE_NAME, PROCESSED_FILE_NAME_2,
    );
    expect(mockedAzureBlobClient.deleteFile).toHaveBeenCalledTimes(0);
    expect(mockedLogger.info).toHaveBeenCalledTimes(2);
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      1,
      'fileHousekeeping::deleteOldProcessedFiles: Trying to delete old processed files',
      { shareName: SHARE_NAME },
    );
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      2,
      'fileHousekeeping::deleteOldMetadataFiles: Azure Blob Storage Container is empty',
      { containerName: CONTAINER_NAME },
    );
    expect(mockedLogger.event).toHaveBeenCalledTimes(1);
    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvent.RES_TARS_RESULTS_FILES_DELETED,
      'fileHousekeeping::deleteOldProcessedFiles: The old processed files have been deleted successfully',
      {
        shareName: SHARE_NAME,
        deletedFiles: `${PROCESSED_FILE_NAME_1},${PROCESSED_FILE_NAME_2}`,
      },
    );
  });

  test('GIVEN 3 unsorted metadata file names WHEN call fileHousekeeping function THEN old files succesfully deleted', async () => {
    when(mockedAzureBlobClient.listFiles)
      .calledWith(CONTAINER_NAME)
      .mockResolvedValue([METADATA_FILE_NAME_2, METADATA_FILE_NAME_3, METADATA_FILE_NAME_4, METADATA_FILE_NAME_5, METADATA_FILE_NAME_LAST, METADATA_FILE_NAME_1]);

    await fileHousekeeping();

    expect(mockedAzureBlobClient.deleteFile).toHaveBeenCalledTimes(2);
    expect(mockedAzureBlobClient.deleteFile).toHaveBeenNthCalledWith(
      1,
      CONTAINER_NAME, METADATA_FILE_NAME_2,
    );
    expect(mockedAzureBlobClient.deleteFile).toHaveBeenNthCalledWith(
      2,
      CONTAINER_NAME, METADATA_FILE_NAME_1,
    );
    expect(mockedAzureFilesClient.deleteFile).toHaveBeenCalledTimes(0);
    expect(mockedLogger.info).toHaveBeenCalledTimes(4);
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      1,
      'fileHousekeeping::deleteOldProcessedFiles: Trying to delete old processed files',
      { shareName: SHARE_NAME },
    );
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      2,
      `fileHousekeeping::deleteOldMetadataFiles: ${METADATA_FILE_NAME_2} deleted by housekeeping cron job`,
      { containerName: CONTAINER_NAME },
    );
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      3,
      `fileHousekeeping::deleteOldMetadataFiles: ${METADATA_FILE_NAME_1} deleted by housekeeping cron job`,
      { containerName: CONTAINER_NAME },
    );
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      4,
      `fileHousekeeping::deleteOldMetadataFiles: The old metadata files ${JSON.stringify([METADATA_FILE_NAME_2, METADATA_FILE_NAME_1])} deleted from the Azure Blob Container`,
      { containerName: CONTAINER_NAME },
    );
    expect(mockedLogger.event).toHaveBeenCalledTimes(1);
    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvent.RES_TARS_RESULTS_FILES_DELETED,
      'fileHousekeeping::deleteOldProcessedFiles: Azure File Storage Share is empty',
      {
        shareName: SHARE_NAME,
        deletedFiles: '',
      },
    );
  });

  test('GIVEN AzureFilesClient error and 2 metadata file names WHEN call fileHousekeeping function THEN deleteOldProcessedFiles fails and old metadata files are deleted', async () => {
    when(mockedAzureFilesClient.listFiles)
      .calledWith(SHARE_NAME)
      .mockRejectedValue(ERROR);
    when(mockedAzureBlobClient.listFiles)
      .calledWith(CONTAINER_NAME)
      .mockResolvedValue([METADATA_FILE_NAME_1, METADATA_FILE_NAME_3, METADATA_FILE_NAME_4, METADATA_FILE_NAME_5, METADATA_FILE_NAME_LAST]);

    try {
      await fileHousekeeping();
      fail();
    } catch (actualError) {
      expect(actualError).toBeInstanceOf(FileHousekeepingError);
      expect(mockedAzureFilesClient.deleteFile).toHaveBeenCalledTimes(0);
      expect(mockedLogger.error).toHaveBeenCalledTimes(1);
      expect(mockedLogger.error).toHaveBeenCalledWith(
        ERROR,
        'fileHousekeeping::deleteOldProcessedFiles: An error occurred while deleting old processed files from azure file share',
        { shareName: SHARE_NAME },
      );
      expect(mockedAzureBlobClient.deleteFile).toHaveBeenCalledTimes(1);
      expect(mockedAzureBlobClient.deleteFile).toHaveBeenCalledWith(
        CONTAINER_NAME, METADATA_FILE_NAME_1,
      );
      expect(mockedLogger.info).toHaveBeenCalledTimes(3);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'fileHousekeeping::deleteOldProcessedFiles: Trying to delete old processed files',
        { shareName: SHARE_NAME },
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        `fileHousekeeping::deleteOldMetadataFiles: ${METADATA_FILE_NAME_1} deleted by housekeeping cron job`,
        { containerName: CONTAINER_NAME },
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        3,
        `fileHousekeeping::deleteOldMetadataFiles: The old metadata files ${JSON.stringify([METADATA_FILE_NAME_1])} deleted from the Azure Blob Container`,
        { containerName: CONTAINER_NAME },
      );
      expect(mockedLogger.event).toHaveBeenCalledTimes(0);
    }
  });

  test('GIVEN 2 processed file names and AzureBlobClient error WHEN call fileHousekeeping function THEN deleteOldProcessedFiles fails and old metadata files are deleted', async () => {
    when(mockedAzureFilesClient.listFiles)
      .calledWith(SHARE_NAME)
      .mockResolvedValue([PROCESSED_FILE_NAME_1, PROCESSED_FILE_NAME_LAST]);
    when(mockedAzureBlobClient.listFiles)
      .calledWith(CONTAINER_NAME)
      .mockRejectedValue(ERROR);

    try {
      await fileHousekeeping();
      fail();
    } catch (actualError) {
      expect(actualError).toBeInstanceOf(FileHousekeepingError);

      expect(mockedAzureFilesClient.deleteFile).toHaveBeenCalledTimes(1);
      expect(mockedAzureFilesClient.deleteFile).toHaveBeenCalledWith(
        SHARE_NAME, PROCESSED_FILE_NAME_1,
      );
      expect(mockedAzureBlobClient.deleteFile).toHaveBeenCalledTimes(0);
      expect(mockedLogger.error).toHaveBeenCalledTimes(1);
      expect(mockedLogger.error).toHaveBeenCalledWith(
        ERROR,
        'fileHousekeeping::deleteOldMetadataFiles: An error occurred while deleting old metadata files from Azure Blob Container',
        { containerName: CONTAINER_NAME },
      );
      expect(mockedLogger.info).toHaveBeenCalledTimes(1);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'fileHousekeeping::deleteOldProcessedFiles: Trying to delete old processed files',
        { shareName: SHARE_NAME },
      );
    }
  });

  test('GIVEN an empty share and directory WHEN call fileHousekeeping function THEN no error only info and proper event are logged', async () => {
    when(mockedAzureFilesClient.listFiles)
      .calledWith(SHARE_NAME)
      .mockResolvedValue([]);
    when(mockedAzureBlobClient.listFiles)
      .calledWith(CONTAINER_NAME)
      .mockResolvedValue([]);

    await fileHousekeeping();

    expect(mockedAzureBlobClient.deleteFile).toHaveBeenCalledTimes(0);
    expect(mockedAzureFilesClient.deleteFile).toHaveBeenCalledTimes(0);
    expect(mockedLogger.info).toHaveBeenCalledTimes(2);
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      1,
      'fileHousekeeping::deleteOldProcessedFiles: Trying to delete old processed files',
      { shareName: SHARE_NAME },
    );
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      2,
      'fileHousekeeping::deleteOldMetadataFiles: Azure Blob Storage Container is empty',
      { containerName: CONTAINER_NAME },
    );
    expect(mockedLogger.event).toHaveBeenCalledTimes(1);
    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvent.RES_TARS_RESULTS_FILES_DELETED,
      'fileHousekeeping::deleteOldProcessedFiles: Azure File Storage Share is empty',
      {
        shareName: SHARE_NAME,
        deletedFiles: '',
      },
    );
  });

  test('GIVEN listFiles undefined WHEN call fileHousekeeping function THEN no error only info and proper event are logged', async () => {
    await fileHousekeeping();

    expect(mockedAzureBlobClient.deleteFile).toHaveBeenCalledTimes(0);
    expect(mockedAzureFilesClient.deleteFile).toHaveBeenCalledTimes(0);
    expect(mockedLogger.info).toHaveBeenCalledTimes(2);
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      1,
      'fileHousekeeping::deleteOldProcessedFiles: Trying to delete old processed files',
      { shareName: SHARE_NAME },
    );
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      2,
      'fileHousekeeping::deleteOldMetadataFiles: Azure Blob Storage Container is empty',
      { containerName: CONTAINER_NAME },
    );
    expect(mockedLogger.event).toHaveBeenCalledTimes(1);
    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvent.RES_TARS_RESULTS_FILES_DELETED,
      'fileHousekeeping::deleteOldProcessedFiles: Azure File Storage Share is empty',
      {
        shareName: SHARE_NAME,
        deletedFiles: '',
      },
    );
  });
});
