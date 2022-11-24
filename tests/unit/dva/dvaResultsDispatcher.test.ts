import * as JEST_DATE_MOCK from 'jest-date-mock';
import { mock } from 'jest-mock-extended';
import { when } from 'jest-when';
import { mocked } from 'ts-jest/utils';
import { CrmClient, newCrmClient } from '../../../src/crm/crmClient';
import { generateMD5Checksum } from '../../../src/utils/generateMd5Checksum';
import {
  DvaMetadataService, newDvaMetadataService,
} from '../../../src/metadata/dvaMetadataService';
import { DvaResultsDispatcher, newDvaResultsDispatcher } from '../../../src/dva/dvaResultsDispatcher';
import { DvaLearnerTestResultModel } from '../../../src/crm/testResults/dvaLearnerTestResultModel';
import { CRMProductNumber } from '../../../src/crm/testResults/productNumber';
import { TarsExportedStatus } from '../../../src/crm/testResults/tarsExportedStatus';
import { FixedWidthTextFileGenerator, newFixedWidthTextFileGenerator } from '../../../src/dva/fixedWidthTextFileGenerator';
import { resolveSftpClient } from '../../../src/dva/sftp/resolveSftpClient';
import { dvaLearnerHeaderTemplate, dvaLearnerRecordTemplate } from '../../../src/dva/templates/dvaLearnerTemplate';
import { SftpClient, verifyFileContents } from '../../../src/dva/sftp/sftpClient';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';
import { mockedConfig } from '../../mocks/config.mock';
import { mockedLogger } from '../../mocks/logger.mock';
import { BaseTestResultModel } from '../../../src/crm/testResults/baseTestResultModel';
import { DvaTestType } from '../../../src/dva/enums';
import {
  mockAdiCrmResults, mockAdiResultRecord, mockAmiCrmResults, mockAmiResultRecord, mockLearnerCrmResults, mockLearnerResultRecord,
} from '../../mocks/resultRecord.mock';
import { zeroFill } from '../../../src/utils/string';
import { dvaInstructorHeaderTemplate, dvaInstructorRecordTemplate } from '../../../src/dva/templates/dvaInstructorTemplate';
import { DvaInstructorTestResultModel } from '../../../src/crm/testResults/dvaInstructorTestResultModel';
import { validateDvaLearnerTestResult, validateDvaInstructorTestResult } from '../../../src/validation/validateSchema';
import { developmentFileListWithoutPath } from '../../mocks/fileList.mock';
import { TestStatus } from '../../../src/crm/testResults/testStatus';

jest.mock('../../../src/observability/logger');

jest.mock('../../../src/dva/sftp/sftpClient');
const mockedVerifyFileContents = mocked(verifyFileContents);

jest.mock('../../../src/utils/generateMd5Checksum');
const mockedMd5Checksum = mocked(generateMD5Checksum);

jest.mock('../../../src/crm/crmClient');
const mockedCrmClient = mock<CrmClient>();
const mockedNewCrmClient = mocked(newCrmClient);

jest.mock('../../../src/dva/sftp/resolveSftpClient');
const mockedSftpClient = mock<SftpClient>();
const mockedNewSftpClient = mocked(resolveSftpClient);

jest.mock('../../../src/dva/fixedWidthTextFileGenerator');
const mockedFixedWidthFileGenerator = mock<FixedWidthTextFileGenerator>();
const mockedNewFixedWidthFileGenerator = mocked(newFixedWidthTextFileGenerator);

jest.mock('../../../src/metadata/dvaMetadataService');
const mockedDvaMetadataService = mock<DvaMetadataService>();
const mockedNewDvaMetadataService = mocked(newDvaMetadataService);

let dvaResultsDispatcher: DvaResultsDispatcher;

const mockSequenceNumber = 101;
const TARS_EXPORTED_DATE = new Date('2020-08-01T00:00:00.000Z');

const learnerConstant = 'DVTARESUL';
const adiConstant = '3DADIRESUL';
const amiConstant = '3DAMIRESUL';
const mockFileContent = 'mock file contents';
const mockFileName = 'mockfilename.txt';
const mockChecksum = 'someChecksum';
const mockFileDate = '31072020';
const mockFileSequence = zeroFill(mockSequenceNumber, 6);
const numberOfLearnerResults = zeroFill(mockLearnerCrmResults.length, 6);
const numberOfAdiInstructorResults = zeroFill(mockAdiCrmResults.length, 6);
const numberOfAmiInstructorResults = zeroFill(mockAmiResultRecord.length, 6);
const unprocessedStatus = 'something';

const mockLearnerHeaderParams: Record<string, string> = {
  constant: learnerConstant,
  fileSequence: mockFileSequence,
  numberOfRecords: numberOfLearnerResults,
};

const sharedInstructorHeaderParams = {
  fileSequence: mockFileSequence,
  fileDate: mockFileDate,
};

const mockAdiInstructorHeaderParams: Record<string, string> = {
  constant: adiConstant,
  numberOfRecords: numberOfAdiInstructorResults,
  ...sharedInstructorHeaderParams,
};

const mockAmiInstructorHeaderParams: Record<string, string> = {
  constant: amiConstant,
  numberOfRecords: numberOfAmiInstructorResults,
  ...sharedInstructorHeaderParams,
};

describe('DvaResultsDispatcher', () => {
  const learnerMetadataFilename = mockedConfig.dva.metadataFilename.dva;
  const adiMetadataFilename = mockedConfig.dva.metadataFilename.adi;
  const amiMetadataFilename = mockedConfig.dva.metadataFilename.ami;
  const learnerFolderPath = 'DVA_DVSA_FTTS/driver_results';
  const instructorFolderPath = 'DVA_DVSA_FTTS/instructor_results';

  beforeEach(() => {
    JEST_DATE_MOCK.advanceTo(TARS_EXPORTED_DATE);
    mockedConfig.dva.metadataFilename = {
      dva: 'dva.json',
      adi: 'dva_adi.json',
      ami: 'dva_ami.json',
    };
    mockedConfig.dva.sftp.learnerPath = learnerFolderPath;
    mockedConfig.dva.sftp.instructorPath = instructorFolderPath;

    const mockCreateFilename = jest.fn().mockReturnValue(mockFileName);
    when(mockedNewCrmClient).calledWith(unprocessedStatus).mockReturnValue(mockedCrmClient);
    when(mockedNewDvaMetadataService).calledWith().mockReturnValue(mockedDvaMetadataService);
    when(mockedNewSftpClient).calledWith().mockReturnValue(mockedSftpClient);
    when(mockedNewFixedWidthFileGenerator).calledWith(dvaLearnerHeaderTemplate, dvaLearnerRecordTemplate).mockReturnValue(mockedFixedWidthFileGenerator);
    dvaResultsDispatcher = newDvaResultsDispatcher(dvaLearnerHeaderTemplate, dvaLearnerRecordTemplate, unprocessedStatus);
    mockedCrmClient.getDvaUnprocessedTestResults.mockResolvedValue(mockLearnerCrmResults);
    mockedCrmClient.getDvaAdiUnprocessedTestResults.mockResolvedValue(mockAdiCrmResults);
    mockedCrmClient.getDvaAmiUnprocessedTestResults.mockResolvedValue(mockAmiCrmResults);
    mockedSftpClient.getFile.mockResolvedValue('mock file');
    mockedSftpClient.deleteFile.mockResolvedValue();
    mockedSftpClient.listFiles.mockResolvedValue([]);
    mockedFixedWidthFileGenerator.createFile.mockReturnValue(mockFileContent);
    FixedWidthTextFileGenerator.createFileName = mockCreateFilename;
    mockedDvaMetadataService.getNextSequenceNumber.mockResolvedValue(mockSequenceNumber);
    mockedMd5Checksum.mockReturnValue(mockChecksum);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('DVA LEARNER - GIVEN we are processing results for learner tests', () => {
    test('WHEN dispatchResults THEN next sequence number is retrieved, logged and updated', async () => {
      await dvaResultsDispatcher.dispatchResults(DvaTestType.LEARNER, learnerMetadataFilename, validateDvaLearnerTestResult);

      expect(mockedCrmClient.getDvaUnprocessedTestResults).toHaveBeenCalled();
      expect(mockedDvaMetadataService.getNextSequenceNumber).toHaveBeenCalledWith(learnerMetadataFilename, DvaTestType.LEARNER);
      expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining(`${mockSequenceNumber}`), {
        sequenceNumber: mockSequenceNumber,
      });
      expect(mockedDvaMetadataService.updateSequenceNumber).toHaveBeenCalledWith(learnerMetadataFilename, mockSequenceNumber);
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(1);
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledWith(
        mockLearnerCrmResults,
        TarsExportedStatus.PROCESSED,
        TARS_EXPORTED_DATE,
      );
    });

    test('WHEN dispatchResults and no results available THEN next sequence number is retrieved, logged and updated', async () => {
      const metadataFilename = mockedConfig.dva.metadataFilename.dva;
      mockedCrmClient.getDvaUnprocessedTestResults.mockResolvedValueOnce([]);

      await dvaResultsDispatcher.dispatchResults(DvaTestType.LEARNER, metadataFilename, validateDvaLearnerTestResult);

      expect(mockedCrmClient.getDvaUnprocessedTestResults).toHaveBeenCalled();
      expect(mockedDvaMetadataService.getNextSequenceNumber).toHaveBeenCalledWith(metadataFilename, DvaTestType.LEARNER);
      expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining(`${mockSequenceNumber}`), {
        sequenceNumber: mockSequenceNumber,
      });
      expect(FixedWidthTextFileGenerator.createFileName).toHaveBeenCalledWith(101, DvaTestType.LEARNER, []);
      expect(mockedFixedWidthFileGenerator.createFile).toHaveBeenCalledWith([], { ...mockLearnerHeaderParams, numberOfRecords: zeroFill(0, 6) });
      expect(mockedDvaMetadataService.updateSequenceNumber).toHaveBeenCalledWith(metadataFilename, mockSequenceNumber);
    });

    test('GIVEN there are LGVMC/PCVMC tests, WHEN dispatchResults THEN set result.testDate to candidates previous LGVHPT/PCVHPT', async () => {
      jest.spyOn(mockedCrmClient, 'getDvaUnprocessedTestResults').mockResolvedValue([{
        ...mockLearnerCrmResults[0],
        productNumber: CRMProductNumber.LGVMC,
        personId: 'mockPersonId',
      }]);
      jest.spyOn(mockedCrmClient, 'getDvaCorrespondingTestResults').mockResolvedValue([{
        testHistoryId: 'mockTestHistoryId',
        productNumber: CRMProductNumber.LGVHPT,
        candidateId: 'mockPersonId',
        bookingProductReference: 'mockBookingProductReference',
        startTime: new Date('2021-06-20T14:15:00.000Z'),
        testStatus: TestStatus.PASS,
        testDate: new Date('2021-11-11T14:30:45.979Z'),
      }]);
      const files = developmentFileListWithoutPath();
      const expectedResultsFolderPath = mockedConfig.dva.sftp.learnerPath;

      mockedSftpClient.listFiles.mockResolvedValue(files);

      await dvaResultsDispatcher.dispatchResults(DvaTestType.LEARNER, learnerMetadataFilename, validateDvaLearnerTestResult);

      expect(mockedCrmClient.getDvaUnprocessedTestResults).toHaveBeenCalled();
      expect(mockedCrmClient.getDvaCorrespondingTestResults).toHaveBeenCalledWith('mockPersonId', CRMProductNumber.LGVHPT);
      expect(FixedWidthTextFileGenerator.createFileName).toHaveBeenCalledWith(101, DvaTestType.LEARNER, files);
      expect(mockedSftpClient.listFiles).toHaveBeenCalledWith(expectedResultsFolderPath, 'DVTA20200731');
      expect(mockedVerifyFileContents).toHaveBeenCalled();
    });

    test('GIVEN there are LGVMC/PCVMC tests AND candidate does not have previous test history, WHEN dispatchResults THEN log an event', async () => {
      jest.spyOn(mockedCrmClient, 'getDvaUnprocessedTestResults').mockResolvedValue([{
        ...mockLearnerCrmResults[0],
        productNumber: CRMProductNumber.LGVMC,
        personId: 'mockPersonId',
      }]);
      jest.spyOn(mockedCrmClient, 'getDvaCorrespondingTestResults').mockResolvedValue([]);
      const files = developmentFileListWithoutPath();
      const expectedResultsFolderPath = mockedConfig.dva.sftp.learnerPath;

      mockedSftpClient.listFiles.mockResolvedValue(files);

      await dvaResultsDispatcher.dispatchResults(DvaTestType.LEARNER, learnerMetadataFilename, validateDvaLearnerTestResult);

      expect(mockedCrmClient.getDvaUnprocessedTestResults).toHaveBeenCalled();
      expect(mockedCrmClient.getDvaCorrespondingTestResults).toHaveBeenCalledWith('mockPersonId', CRMProductNumber.LGVHPT);
      expect(FixedWidthTextFileGenerator.createFileName).toHaveBeenCalledWith(101, DvaTestType.LEARNER, files);
      expect(mockedSftpClient.listFiles).toHaveBeenCalledWith(expectedResultsFolderPath, 'DVTA20200731');
      expect(mockedVerifyFileContents).toHaveBeenCalled();
      expect(mockedLogger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvent.RES_DVA_CORRESPONDING_TEST_NOT_FOUND_ERROR,
        'DvaResultsDispatcher::dispatchResults: No previous test history found for result - corresponding test history needed for test date',
        {
          candidateId: 'mockPersonId',
          productNumber: '3001',
          testHistoryId: 'resultId1',
        },
      );
    });

    test('GIVEN there are multiple learner files already present in the SFTP server, WHEN dispatchResults THEN createFileName is called with the retrieved files', async () => {
      const files = developmentFileListWithoutPath();
      const expectedResultsFolderPath = mockedConfig.dva.sftp.learnerPath;

      mockedSftpClient.listFiles.mockResolvedValue(files);

      await dvaResultsDispatcher.dispatchResults(DvaTestType.LEARNER, learnerMetadataFilename, validateDvaLearnerTestResult);

      expect(mockedCrmClient.getDvaUnprocessedTestResults).toHaveBeenCalled();
      expect(FixedWidthTextFileGenerator.createFileName).toHaveBeenCalledWith(101, DvaTestType.LEARNER, files);
      expect(mockedSftpClient.listFiles).toHaveBeenCalledWith(expectedResultsFolderPath, 'DVTA20200731');
    });

    test('GIVEN malformed test results from CRM WHEN dispatchResults THEN malformed results are skipped', async () => {
      const mockMalformedResult: DvaLearnerTestResultModel = {
        id: 'mockid',
        birthDate: '1999-11-10',
        testStatus: 'Pass',
        textLanguage: 'English',
        startTime: '2021-06-20T14:15:00.000Z',
        title: undefined,
        otherTitle: 'Canon',
        firstName: 'Tester',
        lastName: 'Testerson',
        productId: CRMProductNumber.CAR,
        productNumber: CRMProductNumber.CAR,
        bookingReference: 'B-000-000-000',
      };
      const mockMalformedResults: DvaLearnerTestResultModel[] = [
        ...mockLearnerCrmResults,
        mockMalformedResult,
      ];
      mockedCrmClient.getDvaUnprocessedTestResults.mockResolvedValue(mockMalformedResults);

      await dvaResultsDispatcher.dispatchResults(DvaTestType.LEARNER, learnerMetadataFilename, validateDvaLearnerTestResult);

      expect(mockedCrmClient.getDvaUnprocessedTestResults).toHaveBeenCalled();
      expect(mockedLogger.event).toHaveBeenCalledWith(BusinessTelemetryEvent.RES_DVA_ROW_PROCESSING_ERROR, expect.stringContaining('Found 1 malformed test results'));
      expect(mockedFixedWidthFileGenerator.createFile).toHaveBeenCalledWith(mockLearnerResultRecord, mockLearnerHeaderParams);
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(2);
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
        1,
        [mockMalformedResult],
        TarsExportedStatus.FAILED_VALIDATION,
        undefined,
      );
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
        2,
        mockLearnerCrmResults,
        TarsExportedStatus.PROCESSED,
        TARS_EXPORTED_DATE,
      );
    });
  });

  describe('DVA ADI - GIVEN we are processing results for adi tests', () => {
    beforeEach(() => {
      when(mockedNewFixedWidthFileGenerator).calledWith(dvaInstructorHeaderTemplate, dvaInstructorRecordTemplate).mockReturnValue(mockedFixedWidthFileGenerator);
      dvaResultsDispatcher = newDvaResultsDispatcher(dvaInstructorHeaderTemplate, dvaInstructorRecordTemplate, unprocessedStatus);
    });

    test('WHEN dispatchResults THEN next sequence number is retrieved, logged and updated', async () => {
      await dvaResultsDispatcher.dispatchResults(DvaTestType.ADI, adiMetadataFilename, validateDvaInstructorTestResult);

      expect(mockedCrmClient.getDvaAdiUnprocessedTestResults).toHaveBeenCalled();
      expect(mockedDvaMetadataService.getNextSequenceNumber).toHaveBeenCalledWith(adiMetadataFilename, DvaTestType.ADI);
      expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining(`${mockSequenceNumber}`), {
        sequenceNumber: mockSequenceNumber,
      });
      expect(mockedDvaMetadataService.updateSequenceNumber).toHaveBeenCalledWith(adiMetadataFilename, mockSequenceNumber);
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(1);
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledWith(
        mockAdiCrmResults,
        TarsExportedStatus.PROCESSED,
        TARS_EXPORTED_DATE,
      );
    });

    test('WHEN dispatchResults and no results available THEN next sequence number is retrieved, logged and updated', async () => {
      mockedCrmClient.getDvaAdiUnprocessedTestResults.mockResolvedValueOnce([]);

      await dvaResultsDispatcher.dispatchResults(DvaTestType.ADI, adiMetadataFilename, validateDvaInstructorTestResult);

      expect(mockedCrmClient.getDvaAdiUnprocessedTestResults).toHaveBeenCalled();
      expect(mockedDvaMetadataService.getNextSequenceNumber).toHaveBeenCalledWith(adiMetadataFilename, DvaTestType.ADI);
      expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining(`${mockSequenceNumber}`), {
        sequenceNumber: mockSequenceNumber,
      });
      expect(mockedFixedWidthFileGenerator.createFile).toHaveBeenCalledWith([], { ...mockAdiInstructorHeaderParams, numberOfRecords: zeroFill(0, 6) });
      expect(mockedDvaMetadataService.updateSequenceNumber).toHaveBeenCalledWith(adiMetadataFilename, mockSequenceNumber);
    });

    test('GIVEN malformed test results from CRM WHEN dispatchResults THEN malformed results are skipped', async () => {
      const mockMalformedResult: DvaInstructorTestResultModel = { // Missing text language field.
        id: 'mockid',
        birthDate: '1999-11-10',
        testStatus: 'Pass',
        startTime: '2021-06-20T14:15:00.000Z',
        title: undefined,
        firstName: 'Tester',
        lastName: 'Testerson',
        paymentReferenceNumber: '123',
        hptScore: 23,
        bookingReference: 'B-000-000-000',
      };
      const mockMalformedResults: DvaInstructorTestResultModel[] = [
        ...mockAdiCrmResults,
        mockMalformedResult,
      ];
      mockedCrmClient.getDvaAdiUnprocessedTestResults.mockResolvedValue(mockMalformedResults);

      await dvaResultsDispatcher.dispatchResults(DvaTestType.ADI, adiMetadataFilename, validateDvaInstructorTestResult);

      expect(mockedCrmClient.getDvaAdiUnprocessedTestResults).toHaveBeenCalled();
      expect(mockedLogger.event).toHaveBeenCalledWith(BusinessTelemetryEvent.RES_DVA_ROW_PROCESSING_ERROR, expect.stringContaining('Found 1 malformed test results'));
      expect(mockedFixedWidthFileGenerator.createFile).toHaveBeenCalledWith(mockAdiResultRecord, mockAdiInstructorHeaderParams);
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(2);
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
        1,
        [mockMalformedResult],
        TarsExportedStatus.FAILED_VALIDATION,
        undefined,
      );
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
        2,
        mockAdiCrmResults,
        TarsExportedStatus.PROCESSED,
        TARS_EXPORTED_DATE,
      );
      expect(mockedLogger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvent.RES_DVA_SCHEMA_VALIDATION_ERROR,
        'DvaResultsDispatcher::isInvalidTestResult: Result record schema validation failed',
        {
          testHistoryId: mockMalformedResult.id,
          bookingReference: mockMalformedResult.bookingReference,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          validationErrors: expect.arrayContaining([
            expect.objectContaining({ params: { missingProperty: 'addressLine1' } }),
          ]),
        },
      );
    });
  });

  describe('DVA AMI - GIVEN we are processing results for adi tests', () => {
    beforeEach(() => {
      when(mockedNewFixedWidthFileGenerator).calledWith(dvaInstructorHeaderTemplate, dvaInstructorRecordTemplate).mockReturnValue(mockedFixedWidthFileGenerator);
      dvaResultsDispatcher = newDvaResultsDispatcher(dvaInstructorHeaderTemplate, dvaInstructorRecordTemplate, unprocessedStatus);
    });

    test('WHEN dispatchResults THEN next sequence number is retrieved, logged and updated', async () => {
      await dvaResultsDispatcher.dispatchResults(DvaTestType.AMI, amiMetadataFilename, validateDvaInstructorTestResult);

      expect(mockedCrmClient.getDvaAmiUnprocessedTestResults).toHaveBeenCalled();
      expect(mockedDvaMetadataService.getNextSequenceNumber).toHaveBeenCalledWith(amiMetadataFilename, DvaTestType.AMI);
      expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining(`${mockSequenceNumber}`), {
        sequenceNumber: mockSequenceNumber,
      });
      expect(mockedDvaMetadataService.updateSequenceNumber).toHaveBeenCalledWith(amiMetadataFilename, mockSequenceNumber);
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(1);
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledWith(
        mockAmiCrmResults,
        TarsExportedStatus.PROCESSED,
        TARS_EXPORTED_DATE,
      );
    });

    test('WHEN dispatchResults and no results available THEN next sequence number is retrieved, logged and updated', async () => {
      mockedCrmClient.getDvaAmiUnprocessedTestResults.mockResolvedValueOnce([]);

      await dvaResultsDispatcher.dispatchResults(DvaTestType.AMI, amiMetadataFilename, validateDvaInstructorTestResult);

      expect(mockedCrmClient.getDvaAmiUnprocessedTestResults).toHaveBeenCalled();
      expect(mockedDvaMetadataService.getNextSequenceNumber).toHaveBeenCalledWith(amiMetadataFilename, DvaTestType.AMI);
      expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining(`${mockSequenceNumber}`), {
        sequenceNumber: mockSequenceNumber,
      });
      expect(mockedFixedWidthFileGenerator.createFile).toHaveBeenCalledWith([], { ...mockAmiInstructorHeaderParams, numberOfRecords: zeroFill(0, 6) });
      expect(mockedDvaMetadataService.updateSequenceNumber).toHaveBeenCalledWith(amiMetadataFilename, mockSequenceNumber);
    });

    test('GIVEN malformed test results from CRM WHEN dispatchResults THEN malformed results are skipped', async () => {
      const mockMalformedResult: DvaInstructorTestResultModel = { // Missing text language field.
        id: 'mockid',
        birthDate: '1999-11-10',
        testStatus: 'Pass',
        startTime: '2021-06-20T14:15:00.000Z',
        title: undefined,
        firstName: 'Tester',
        lastName: 'Testerson',
        paymentReferenceNumber: '123',
        hptScore: 23,
        bookingReference: 'B-000-000-000',
      };
      const mockMalformedResults: DvaInstructorTestResultModel[] = [
        ...mockAmiCrmResults,
        mockMalformedResult,
      ];
      mockedCrmClient.getDvaAmiUnprocessedTestResults.mockResolvedValue(mockMalformedResults);

      await dvaResultsDispatcher.dispatchResults(DvaTestType.AMI, amiMetadataFilename, validateDvaInstructorTestResult);

      expect(mockedCrmClient.getDvaAmiUnprocessedTestResults).toHaveBeenCalled();
      expect(mockedLogger.event).toHaveBeenCalledWith(BusinessTelemetryEvent.RES_DVA_ROW_PROCESSING_ERROR, expect.stringContaining('Found 1 malformed test results'));
      expect(mockedFixedWidthFileGenerator.createFile).toHaveBeenCalledWith(mockAmiResultRecord, mockAmiInstructorHeaderParams);
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(2);
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
        1,
        [mockMalformedResult],
        TarsExportedStatus.FAILED_VALIDATION,
        undefined,
      );
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
        2,
        mockAmiCrmResults,
        TarsExportedStatus.PROCESSED,
        TARS_EXPORTED_DATE,
      );
    });
  });

  test.each([
    ['DVA Learner', DvaTestType.LEARNER, learnerMetadataFilename, validateDvaLearnerTestResult, mockLearnerCrmResults],
    ['DVA ADI', DvaTestType.ADI, adiMetadataFilename, validateDvaInstructorTestResult, mockAdiCrmResults],
    ['DVA AMI', DvaTestType.AMI, amiMetadataFilename, validateDvaInstructorTestResult, mockAmiCrmResults],
  ])('%s - GIVEN we have results to process for a test type WHEN results list is long THEN updateTarsExportedStatuses is called with chunks', async (_, testType, metadataFilename, schema, mockCrmResults) => {
    const resultsList = new Array<BaseTestResultModel>(520).fill(mockCrmResults[0]);
    if (testType === DvaTestType.LEARNER) {
      mockedCrmClient.getDvaUnprocessedTestResults.mockResolvedValue(resultsList as any);
    }
    if (testType === DvaTestType.ADI) {
      mockedCrmClient.getDvaAdiUnprocessedTestResults.mockResolvedValue(resultsList as any);
    }
    if (testType === DvaTestType.AMI) {
      mockedCrmClient.getDvaAmiUnprocessedTestResults.mockResolvedValue(resultsList as any);
    }

    await dvaResultsDispatcher.dispatchResults(testType, metadataFilename, schema);

    expect(mockedDvaMetadataService.getNextSequenceNumber).toHaveBeenCalledWith(metadataFilename, testType);
    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining(`${mockSequenceNumber}`), {
      sequenceNumber: mockSequenceNumber,
    });
    expect(mockedDvaMetadataService.updateSequenceNumber).toHaveBeenCalledWith(metadataFilename, mockSequenceNumber);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(6);
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
      1,
      resultsList.slice(0, 100),
      TarsExportedStatus.PROCESSED,
      TARS_EXPORTED_DATE,
    );
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
      2,
      resultsList.slice(100, 200),
      TarsExportedStatus.PROCESSED,
      TARS_EXPORTED_DATE,
    );
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
      3,
      resultsList.slice(200, 300),
      TarsExportedStatus.PROCESSED,
      TARS_EXPORTED_DATE,
    );
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
      4,
      resultsList.slice(300, 400),
      TarsExportedStatus.PROCESSED,
      TARS_EXPORTED_DATE,
    );
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
      5,
      resultsList.slice(400, 500),
      TarsExportedStatus.PROCESSED,
      TARS_EXPORTED_DATE,
    );
    expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenNthCalledWith(
      6,
      resultsList.slice(500, 520),
      TarsExportedStatus.PROCESSED,
      TARS_EXPORTED_DATE,
    );
  });

  test.each([
    ['DVA Learner', DvaTestType.LEARNER, learnerMetadataFilename, validateDvaLearnerTestResult, mockLearnerCrmResults, BusinessTelemetryEvent.RES_DVA_LEARNER_FILE_UPLOAD_SUCCESSFUL],
    ['DVA ADI', DvaTestType.ADI, adiMetadataFilename, validateDvaInstructorTestResult, mockAdiCrmResults, BusinessTelemetryEvent.RES_DVA_ADI_FILE_UPLOAD_SUCCESSFUL],
    ['DVA AMI', DvaTestType.AMI, amiMetadataFilename, validateDvaInstructorTestResult, mockAmiCrmResults, BusinessTelemetryEvent.RES_DVA_AMI_FILE_UPLOAD_SUCCESSFUL],
  ])('%s - GIVEN we have results to process for a test type WHEN dispatchResults THEN sftp server uploads files with the correct contents and name',
    async (_, testType, metadataFilename, schema, expectedResults, expectedEventName) => {
      const clonedExpectedResults = JSON.parse(JSON.stringify(expectedResults)) as BaseTestResultModel[];
      let filePath: string;
      if (testType === DvaTestType.LEARNER) {
        filePath = `${learnerFolderPath}/${mockFileName}`;
      } else {
        filePath = `${instructorFolderPath}/${mockFileName}`;
      }
      await dvaResultsDispatcher.dispatchResults(testType, metadataFilename, schema);

      expect(mockedSftpClient.putFile).toHaveBeenCalledWith(filePath, mockFileContent);
      expect(mockedVerifyFileContents).toHaveBeenCalledWith(filePath, mockFileContent, mockedSftpClient);
      expect(mockedLogger.event).toHaveBeenCalledWith(expectedEventName, 'DvaResultsDispatcher::dispatchResults: Successfully uploaded results file to SFTP server', {
        resultsFileName: mockFileName,
        sequenceNumber: mockSequenceNumber,
      });
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledTimes(1);
      expect(mockedCrmClient.updateTarsExportedStatuses).toHaveBeenCalledWith(
        clonedExpectedResults,
        TarsExportedStatus.PROCESSED,
        TARS_EXPORTED_DATE,
      );
    });
});
