/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { BlobServiceClient } from '@azure/storage-blob';
import { CRMTestClient } from '@dvsa/ftts-crm-test-client';
import { CRMTestClientScheme } from '@dvsa/ftts-crm-test-client/dist/crm-test-client';
import { CRMContact } from '@dvsa/ftts-crm-test-client/dist/crm-types';
import { v4 as uuidv4 } from 'uuid';
import { CRMProductNumber, CRMTestStatus } from '@dvsa/ftts-crm-test-client/dist/enums';
import dateformat from 'dateformat';
import dayjs from 'dayjs';
import * as readline from 'readline';
import { Readable } from 'stream';
import config from '../../src/config';
import { TarsExportedStatus, tarsExportedStatusToString } from '../../src/crm/testResults/tarsExportedStatus';
import { DvaTestType } from '../../src/dva/enums';
import { FixedWidthTextFileGenerator } from '../../src/dva/fixedWidthTextFileGenerator';
import { cleanString } from '../../src/utils/string';
import { runFunction, waitUntilJobIsDone } from './utils/functionUtils';
import {
  dvaTestTypeToHeaderConstant,
  getMetadataFilename,
  zeroFill,
} from './utils/mappers';
import {
  PreparedInstructorCdsData,
  PreparedBaseCdsData,
  prepareInstructorCdsData,
  InstructorTestProperties,
  prepareCdsData,
  PreparedCdsData,
} from './utils/prepareCdsData';

const APP_URL = process.env.APPLICATION_URL || 'http://localhost:7073';
const FUNCTION_ENDPOINT = '/admin/functions/V1_DVA_Learner_Results_Dispatcher';
const FUNCTION_ADI_ENDPOINT = '/admin/functions/V1_DVA_ADI_Results_Dispatcher';
const FUNCTION_AMI_ENDPOINT = '/admin/functions/V1_DVA_AMI_Results_Dispatcher';

const crmTestClient = new CRMTestClient(CRMTestClientScheme.DVA, true);

const TIMEOUT_DURATION = 5 * 60 * 1000;

const azureBlobServiceClient = BlobServiceClient.fromConnectionString(config.common.azureBlob.storageConnectionString);
const resultsContainerClient = azureBlobServiceClient.getContainerClient(config.common.azureBlob.stubSftpContainerName);
const metadataContainerClient = azureBlobServiceClient.getContainerClient(config.common.azureBlob.metadataContainerName);

describe('DVA results dispatcher', () => {
  let exportedStatus: string;
  beforeEach(() => {
    exportedStatus = `IntUnprocessed-${new Date().toISOString()}`;
  });
  afterEach(async () => {
    await crmTestClient.clearUnprocessedTestHistoryRecords(exportedStatus);
  }, TIMEOUT_DURATION);

  describe('V1_DVA_Learner_Results_Dispatcher', () => {
    test('GIVEN prepared results and running application WHEN running function THEN results file is stored', async () => {
      await deleteAllBlobsFromContainer();

      const cdsDataRows = new Array<PreparedCdsData>();
      cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '123245675', '2019-05-31T18:30:00Z', CRMProductNumber.CAR, exportedStatus));
      cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '467373', '2019-05-31T18:30:00Z', CRMProductNumber.MOTORCYCLE, exportedStatus));
      cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '64632', '2019-05-31T18:30:00Z', CRMProductNumber.MOTORCYCLE, exportedStatus));

      let currentSequenceNumber = await getCurrentSequenceNumber(DvaTestType.LEARNER);
      currentSequenceNumber = currentSequenceNumber === 0 ? config.dva.defaultSequenceNumber.learner - 1 : currentSequenceNumber;
      const currentIncrementNumber = await getCurrentIncrementNumber();
      const expectedSequenceNumber = currentSequenceNumber + 1;

      const status = await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
      expect(status).toBe(202);
      await waitUntilJobIsDone(async () => expectedSequenceNumber === await getCurrentSequenceNumber(DvaTestType.LEARNER));

      await checkFileContents(cdsDataRows, expectedSequenceNumber, DvaTestType.LEARNER, currentIncrementNumber);

      const actualSequenceNumber = await getCurrentSequenceNumber(DvaTestType.LEARNER);
      expect(actualSequenceNumber).toEqual(expectedSequenceNumber);

      await checkTarsExportedStatus(cdsDataRows, TarsExportedStatus.PROCESSED);

      await deleteAllBlobsFromContainer();
    }, TIMEOUT_DURATION);

    test('LGVHPT takes its test date from the latest corresponding LGVMC', async () => {
      await deleteAllBlobsFromContainer();

      const cdsDataRows = new Array<PreparedCdsData>();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const licenceNumber = uuidv4().substr(0, 8);
      const contactData: Partial<CRMContact> = {
        address1_city: 'Birmingham',
        address1_line1: '1 Ewhurst Avenue',
        address1_postalcode: 'B29 6EY',
      };
      const candidate = await crmTestClient.createAndReturnNewCandidate(licenceNumber, contactData);

      await prepareCdsData(crmTestClient, CRMTestStatus.Pass, undefined, '2019-05-24T18:30:00Z', CRMProductNumber.LGVMC, exportedStatus, candidate);
      await prepareCdsData(crmTestClient, CRMTestStatus.Pass, undefined, '2019-05-28T18:30:00Z', CRMProductNumber.LGVMC, exportedStatus, candidate);

      const dispatchResults = await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '64632', '2019-05-31T18:30:00Z', CRMProductNumber.LGVHPT, exportedStatus, candidate);
      cdsDataRows.push(dispatchResults);

      const expectedCdsDataRows = [{
        ...dispatchResults,
        testDate: '2019-05-28T18:30:00Z',
      }];

      let currentSequenceNumber = await getCurrentSequenceNumber(DvaTestType.LEARNER);
      currentSequenceNumber = currentSequenceNumber === 0 ? config.dva.defaultSequenceNumber.learner - 1 : currentSequenceNumber;
      const currentIncrementNumber = await getCurrentIncrementNumber();
      const expectedSequenceNumber = currentSequenceNumber + 1;

      await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
      await waitUntilJobIsDone(async () => expectedSequenceNumber === await getCurrentSequenceNumber(DvaTestType.LEARNER));

      await checkFileContents(expectedCdsDataRows, expectedSequenceNumber, DvaTestType.LEARNER, currentIncrementNumber);

      const actualSequenceNumber = await getCurrentSequenceNumber(DvaTestType.LEARNER);
      expect(actualSequenceNumber).toEqual(expectedSequenceNumber);

      await checkTarsExportedStatus(cdsDataRows, TarsExportedStatus.PROCESSED);

      await deleteAllBlobsFromContainer();
    }, TIMEOUT_DURATION);

    test('LGVMC takes its test date from the latest corresponding LGVHPT', async () => {
      await deleteAllBlobsFromContainer();

      const cdsDataRows = new Array<PreparedCdsData>();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const licenceNumber = uuidv4().substr(0, 8);
      const contactData: Partial<CRMContact> = {
        address1_city: 'Birmingham',
        address1_line1: '1 Ewhurst Avenue',
        address1_postalcode: 'B29 6EY',
      };
      const candidate = await crmTestClient.createAndReturnNewCandidate(licenceNumber, contactData);

      await prepareCdsData(crmTestClient, CRMTestStatus.Pass, undefined, '2019-05-24T18:30:00Z', CRMProductNumber.LGVHPT, exportedStatus, candidate);
      await prepareCdsData(crmTestClient, CRMTestStatus.Pass, undefined, '2019-05-28T18:30:00Z', CRMProductNumber.LGVHPT, exportedStatus, candidate);

      const dispatchResults = await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '64632', '2019-05-31T18:30:00Z', CRMProductNumber.LGVMC, exportedStatus, candidate);
      cdsDataRows.push(dispatchResults);

      const expectedCdsDataRows = [{
        ...dispatchResults,
        testDate: '2019-05-28T18:30:00Z',
      }];

      let currentSequenceNumber = await getCurrentSequenceNumber(DvaTestType.LEARNER);
      currentSequenceNumber = currentSequenceNumber === 0 ? config.dva.defaultSequenceNumber.learner - 1 : currentSequenceNumber;
      const currentIncrementNumber = await getCurrentIncrementNumber();
      const expectedSequenceNumber = currentSequenceNumber + 1;

      await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
      await waitUntilJobIsDone(async () => expectedSequenceNumber === await getCurrentSequenceNumber(DvaTestType.LEARNER));

      await checkFileContents(expectedCdsDataRows, expectedSequenceNumber, DvaTestType.LEARNER, currentIncrementNumber);

      const actualSequenceNumber = await getCurrentSequenceNumber(DvaTestType.LEARNER);
      expect(actualSequenceNumber).toEqual(expectedSequenceNumber);

      await checkTarsExportedStatus(cdsDataRows, TarsExportedStatus.PROCESSED);

      await deleteAllBlobsFromContainer();
    }, TIMEOUT_DURATION);

    test('PCVMC takes its test date from the latest corresponding PCVHPT', async () => {
      await deleteAllBlobsFromContainer();

      const cdsDataRows = new Array<PreparedCdsData>();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const licenceNumber = uuidv4().substr(0, 8);
      const contactData: Partial<CRMContact> = {
        address1_city: 'Birmingham',
        address1_line1: '1 Ewhurst Avenue',
        address1_postalcode: 'B29 6EY',
      };
      const candidate = await crmTestClient.createAndReturnNewCandidate(licenceNumber, contactData);

      await prepareCdsData(crmTestClient, CRMTestStatus.Pass, undefined, '2019-05-24T18:30:00Z', CRMProductNumber.PCVHPT, exportedStatus, candidate);
      await prepareCdsData(crmTestClient, CRMTestStatus.Pass, undefined, '2019-05-28T18:30:00Z', CRMProductNumber.PCVHPT, exportedStatus, candidate);

      const dispatchResults = await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '64632', '2019-05-31T18:30:00Z', CRMProductNumber.PCVMC, exportedStatus, candidate);
      cdsDataRows.push(dispatchResults);

      const expectedCdsDataRows = [{
        ...dispatchResults,
        testDate: '2019-05-28T18:30:00Z',
      }];

      let currentSequenceNumber = await getCurrentSequenceNumber(DvaTestType.LEARNER);
      currentSequenceNumber = currentSequenceNumber === 0 ? config.dva.defaultSequenceNumber.learner - 1 : currentSequenceNumber;
      const currentIncrementNumber = await getCurrentIncrementNumber();
      const expectedSequenceNumber = currentSequenceNumber + 1;

      await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
      await waitUntilJobIsDone(async () => expectedSequenceNumber === await getCurrentSequenceNumber(DvaTestType.LEARNER));

      await checkFileContents(expectedCdsDataRows, expectedSequenceNumber, DvaTestType.LEARNER, currentIncrementNumber);

      const actualSequenceNumber = await getCurrentSequenceNumber(DvaTestType.LEARNER);
      expect(actualSequenceNumber).toEqual(expectedSequenceNumber);

      await checkTarsExportedStatus(cdsDataRows, TarsExportedStatus.PROCESSED);

      await deleteAllBlobsFromContainer();
    }, TIMEOUT_DURATION);

    test('PCVHPT takes its test date from the latest corresponding PCVMC', async () => {
      await deleteAllBlobsFromContainer();

      const cdsDataRows = new Array<PreparedCdsData>();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const licenceNumber = uuidv4().substr(0, 8);
      const contactData: Partial<CRMContact> = {
        address1_city: 'Birmingham',
        address1_line1: '1 Ewhurst Avenue',
        address1_postalcode: 'B29 6EY',
      };
      const candidate = await crmTestClient.createAndReturnNewCandidate(licenceNumber, contactData);

      await prepareCdsData(crmTestClient, CRMTestStatus.Pass, undefined, '2019-05-24T18:30:00Z', CRMProductNumber.PCVMC, exportedStatus, candidate);
      await prepareCdsData(crmTestClient, CRMTestStatus.Pass, undefined, '2019-05-28T18:30:00Z', CRMProductNumber.PCVMC, exportedStatus, candidate);

      const dispatchResults = await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '64632', '2019-05-31T18:30:00Z', CRMProductNumber.PCVHPT, exportedStatus, candidate);
      cdsDataRows.push(dispatchResults);

      const expectedCdsDataRows = [{
        ...dispatchResults,
        testDate: '2019-05-28T18:30:00Z',
      }];

      let currentSequenceNumber = await getCurrentSequenceNumber(DvaTestType.LEARNER);
      currentSequenceNumber = currentSequenceNumber === 0 ? config.dva.defaultSequenceNumber.learner - 1 : currentSequenceNumber;
      const currentIncrementNumber = await getCurrentIncrementNumber();
      const expectedSequenceNumber = currentSequenceNumber + 1;

      await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
      await waitUntilJobIsDone(async () => expectedSequenceNumber === await getCurrentSequenceNumber(DvaTestType.LEARNER));

      await checkFileContents(expectedCdsDataRows, expectedSequenceNumber, DvaTestType.LEARNER, currentIncrementNumber);

      const actualSequenceNumber = await getCurrentSequenceNumber(DvaTestType.LEARNER);
      expect(actualSequenceNumber).toEqual(expectedSequenceNumber);

      await checkTarsExportedStatus(cdsDataRows, TarsExportedStatus.PROCESSED);

      await deleteAllBlobsFromContainer();
    }, TIMEOUT_DURATION);

    test('GIVEN prepared results and running application multiple times WHEN running function THEN multiple result files are stored with correct sequence numbers in file name', async () => {
      await deleteAllBlobsFromContainer();

      let cdsDataRows = new Array<PreparedCdsData>();
      cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '123245675', '2019-05-31T18:30:00Z', CRMProductNumber.CAR, exportedStatus));
      cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '467373', '2019-05-31T18:30:00Z', CRMProductNumber.MOTORCYCLE, exportedStatus));
      cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '64632', '2019-05-31T18:30:00Z', CRMProductNumber.MOTORCYCLE, exportedStatus));

      let currentSequenceNumber = await getCurrentSequenceNumber(DvaTestType.LEARNER);
      currentSequenceNumber = currentSequenceNumber === 0 ? config.dva.defaultSequenceNumber.learner - 1 : currentSequenceNumber;
      let expectedSequenceNumber = currentSequenceNumber + 1;

      await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
      await waitUntilJobIsDone(async () => expectedSequenceNumber === await getCurrentSequenceNumber(DvaTestType.LEARNER));

      const currentIncrementNumber = await getCurrentIncrementNumber();
      const expectedIncrementNumber = currentIncrementNumber + 1;

      cdsDataRows = new Array<PreparedCdsData>();
      cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '123245675', '2019-05-31T18:30:00Z', CRMProductNumber.CAR, exportedStatus));
      cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '467373', '2019-05-31T18:30:00Z', CRMProductNumber.MOTORCYCLE, exportedStatus));
      cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '64632', '2019-05-31T18:30:00Z', CRMProductNumber.MOTORCYCLE, exportedStatus));

      currentSequenceNumber = await getCurrentSequenceNumber(DvaTestType.LEARNER);
      expectedSequenceNumber = currentSequenceNumber + 1;

      await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
      await waitUntilJobIsDone(async () => expectedSequenceNumber === await getCurrentSequenceNumber(DvaTestType.LEARNER));

      const actualIncrementNumber = await getCurrentIncrementNumber();

      expect(actualIncrementNumber).toEqual(expectedIncrementNumber);

      await deleteAllBlobsFromContainer();
    }, TIMEOUT_DURATION);

    test('GIVEN malformed data WHEN running function THEN there is data in results file', async () => {
      await deleteAllBlobsFromContainer();

      const cdsDataRows = new Array<PreparedCdsData>();
      cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, 'I am malformed', '2019-05-31T18:30:00Z', CRMProductNumber.CAR, exportedStatus));
      cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, 'because certificate number', '2019-05-31T18:30:00Z', CRMProductNumber.MOTORCYCLE, exportedStatus));
      cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, 'must be positive integer', '2019-05-31T18:30:00Z', CRMProductNumber.MOTORCYCLE, exportedStatus));

      let currentSequenceNumber = await getCurrentSequenceNumber(DvaTestType.LEARNER);
      currentSequenceNumber = currentSequenceNumber === 0 ? config.dva.defaultSequenceNumber.learner - 1 : currentSequenceNumber;
      const currentIncrementNumber = await getCurrentIncrementNumber();
      const expectedSequenceNumber = currentSequenceNumber + 1;

      await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
      await waitUntilJobIsDone(async () => expectedSequenceNumber === await getCurrentSequenceNumber(DvaTestType.LEARNER));

      await checkFileContents([], expectedSequenceNumber, DvaTestType.LEARNER, currentIncrementNumber);
      const actualSequenceNumber = await getCurrentSequenceNumber(DvaTestType.LEARNER);
      expect(actualSequenceNumber).toEqual(expectedSequenceNumber);

      await checkTarsExportedStatus(cdsDataRows, TarsExportedStatus.FAILED_VALIDATION);

      await deleteAllBlobsFromContainer();
    }, TIMEOUT_DURATION);
  });

  describe('V1_DVA_ADI_Results_Dispatcher', () => {
    const dvaAdiTestType = CRMProductNumber.ADIP1DVA;

    test('GIVEN prepared instructor results and running application WHEN running function THEN results file is stored', async () => {
      await deleteAllBlobsFromContainer();

      const defaultTestDate = '2019-05-31T18:30:00Z';

      const testProperties: InstructorTestProperties = {
        testStatus: CRMTestStatus.Pass,
        testDate: defaultTestDate,
        instructorTestType: dvaAdiTestType,
      };

      const cdsDataRows = new Array<PreparedInstructorCdsData>();
      cdsDataRows.push(await prepareInstructorCdsData(crmTestClient, testProperties, exportedStatus));
      cdsDataRows.push(await prepareInstructorCdsData(crmTestClient, { ...testProperties, testDate: '2019-05-31T18:30:00Z' }, exportedStatus));
      cdsDataRows.push(await prepareInstructorCdsData(crmTestClient, { ...testProperties, testDate: '2019-05-31T18:30:00Z' }, exportedStatus));

      let currentSequenceNumber = await getCurrentSequenceNumber(DvaTestType.ADI);
      currentSequenceNumber = currentSequenceNumber === 0 ? config.dva.defaultSequenceNumber.adi - 1 : currentSequenceNumber;
      const expectedSequenceNumber = currentSequenceNumber + 1;

      await runFunction(APP_URL, FUNCTION_ADI_ENDPOINT, exportedStatus);
      await waitUntilJobIsDone(async () => expectedSequenceNumber === await getCurrentSequenceNumber(DvaTestType.ADI));

      await checkFileContents(cdsDataRows, expectedSequenceNumber, DvaTestType.ADI);

      const actualSequenceNumber = await getCurrentSequenceNumber(DvaTestType.ADI);
      expect(actualSequenceNumber).toEqual(expectedSequenceNumber);

      await checkTarsExportedStatus(cdsDataRows, TarsExportedStatus.PROCESSED);

      await deleteAllBlobsFromContainer();
    }, TIMEOUT_DURATION);

    test('GIVEN malformed instructor data and running application WHEN running function THEN only the correct data is stored in the results file', async () => {
      await deleteAllBlobsFromContainer();

      const defaultTestDate = '2019-05-31T18:30:00Z';

      const testProperties: InstructorTestProperties = {
        testStatus: CRMTestStatus.Pass,
        testDate: defaultTestDate,
        instructorTestType: dvaAdiTestType,
      };

      const validRow = await prepareInstructorCdsData(crmTestClient, testProperties, exportedStatus);
      const invalidRowMissingPaymentReferenceNumber = await prepareInstructorCdsData(crmTestClient, { ...testProperties, paymentReferenceNumber: '' }, exportedStatus);
      const invalidRowMissingMandatoryAddressLine = await prepareInstructorCdsData(crmTestClient, { ...testProperties, customAddressLines: { address1_line1: '', address1_postalcode: 'B15 1TT' } }, exportedStatus);
      // This row will not be processed as its status is not one of Fail, Pass, Not started
      const invalidRowIncompatibleTestStatusNotProcessed = await prepareInstructorCdsData(crmTestClient, { ...testProperties, testStatus: CRMTestStatus.Incomplete }, exportedStatus);

      const invalidCdsDataRows: PreparedInstructorCdsData[] = [
        invalidRowMissingPaymentReferenceNumber,
        invalidRowMissingMandatoryAddressLine,
      ];

      let currentSequenceNumber = await getCurrentSequenceNumber(DvaTestType.ADI);
      currentSequenceNumber = currentSequenceNumber === 0 ? config.dva.defaultSequenceNumber.adi - 1 : currentSequenceNumber;
      const expectedSequenceNumber = currentSequenceNumber + 1;

      await runFunction(APP_URL, FUNCTION_ADI_ENDPOINT, exportedStatus);
      await waitUntilJobIsDone(async () => expectedSequenceNumber === await getCurrentSequenceNumber(DvaTestType.ADI));

      await checkFileContents([validRow], expectedSequenceNumber, DvaTestType.ADI);

      const actualSequenceNumber = await getCurrentSequenceNumber(DvaTestType.ADI);
      expect(actualSequenceNumber).toEqual(expectedSequenceNumber);

      await checkTarsExportedStatus(invalidCdsDataRows, TarsExportedStatus.FAILED_VALIDATION);
      await checkTarsExportedStatus([invalidRowIncompatibleTestStatusNotProcessed], exportedStatus);
      await checkTarsExportedStatus([validRow], TarsExportedStatus.PROCESSED);

      await deleteAllBlobsFromContainer();
    }, TIMEOUT_DURATION);
  });

  describe('V1_DVA_AMI_Results_Dispatcher', () => {
    const dvaAmiTestType = CRMProductNumber.AMIP1;

    test('GIVEN prepared instructor results and running application WHEN running function THEN results file is stored', async () => {
      await deleteAllBlobsFromContainer();

      const defaultTestDate = '2019-05-31T18:30:00Z';

      const testProperties: InstructorTestProperties = {
        testStatus: CRMTestStatus.Pass,
        testDate: defaultTestDate,
        instructorTestType: dvaAmiTestType,
      };

      const cdsDataRows = new Array<PreparedInstructorCdsData>();
      cdsDataRows.push(await prepareInstructorCdsData(crmTestClient, testProperties, exportedStatus));
      cdsDataRows.push(await prepareInstructorCdsData(crmTestClient, { ...testProperties, testDate: '2019-05-31T18:30:00Z' }, exportedStatus));
      cdsDataRows.push(await prepareInstructorCdsData(crmTestClient, { ...testProperties, testDate: '2019-05-31T18:30:00Z' }, exportedStatus));

      let currentSequenceNumber = await getCurrentSequenceNumber(DvaTestType.AMI);
      currentSequenceNumber = currentSequenceNumber === 0 ? config.dva.defaultSequenceNumber.ami - 1 : currentSequenceNumber;
      const expectedSequenceNumber = currentSequenceNumber + 1;

      await runFunction(APP_URL, FUNCTION_AMI_ENDPOINT, exportedStatus);
      await waitUntilJobIsDone(async () => expectedSequenceNumber === await getCurrentSequenceNumber(DvaTestType.AMI));

      await checkFileContents(cdsDataRows, expectedSequenceNumber, DvaTestType.AMI);

      const actualSequenceNumber = await getCurrentSequenceNumber(DvaTestType.AMI);
      expect(actualSequenceNumber).toEqual(expectedSequenceNumber);

      await checkTarsExportedStatus(cdsDataRows, TarsExportedStatus.PROCESSED);

      await deleteAllBlobsFromContainer();
    }, TIMEOUT_DURATION);

    test('GIVEN malformed instructor data and running application WHEN running function THEN only the correct data is stored in the results file', async () => {
      await deleteAllBlobsFromContainer();

      const defaultTestDate = '2019-05-31T18:30:00Z';

      const testProperties: InstructorTestProperties = {
        testStatus: CRMTestStatus.Pass,
        testDate: defaultTestDate,
        instructorTestType: dvaAmiTestType,
      };

      const validRow = await prepareInstructorCdsData(crmTestClient, testProperties, exportedStatus);
      const invalidRowMissingPaymentReferenceNumber = await prepareInstructorCdsData(crmTestClient, { ...testProperties, paymentReferenceNumber: '' }, exportedStatus);
      const invalidRowMissingMandatoryAddressLine = await prepareInstructorCdsData(crmTestClient, { ...testProperties, customAddressLines: { address1_line1: '', address1_postalcode: 'B15 1TT' } }, exportedStatus);
      // This row will not be processed as its status is not one of Fail, Pass, Not started
      const invalidRowIncompatibleTestStatusNotProcessed = await prepareInstructorCdsData(crmTestClient, { ...testProperties, testStatus: CRMTestStatus.Incomplete }, exportedStatus);

      const invalidCdsDataRows: PreparedInstructorCdsData[] = [
        invalidRowMissingPaymentReferenceNumber,
        invalidRowMissingMandatoryAddressLine,
      ];

      let currentSequenceNumber = await getCurrentSequenceNumber(DvaTestType.AMI);
      currentSequenceNumber = currentSequenceNumber === 0 ? config.dva.defaultSequenceNumber.ami - 1 : currentSequenceNumber;
      const expectedSequenceNumber = currentSequenceNumber + 1;

      await runFunction(APP_URL, FUNCTION_AMI_ENDPOINT, exportedStatus);
      await waitUntilJobIsDone(async () => expectedSequenceNumber === await getCurrentSequenceNumber(DvaTestType.AMI));

      await checkFileContents([validRow], expectedSequenceNumber, DvaTestType.AMI);

      const actualSequenceNumber = await getCurrentSequenceNumber(DvaTestType.AMI);
      expect(actualSequenceNumber).toEqual(expectedSequenceNumber);

      await checkTarsExportedStatus(invalidCdsDataRows, TarsExportedStatus.FAILED_VALIDATION);
      await checkTarsExportedStatus([invalidRowIncompatibleTestStatusNotProcessed], exportedStatus);
      await checkTarsExportedStatus([validRow], TarsExportedStatus.PROCESSED);

      await deleteAllBlobsFromContainer();
    }, TIMEOUT_DURATION);
  });
});

const deleteAllBlobsFromContainer = async () => {
  await resultsContainerClient.createIfNotExists();
  for await (const blob of resultsContainerClient.listBlobsFlat()) {
    await resultsContainerClient.deleteBlob(blob.name);
  }
};

const getCurrentSequenceNumber = async (fileType: DvaTestType): Promise<number> => {
  const blobName = getMetadataFilename(fileType);
  const blobClient = metadataContainerClient.getBlobClient(blobName);
  const blobExists = await blobClient.exists();
  if (blobExists) {
    const buffer = await metadataContainerClient.getBlobClient(blobName).downloadToBuffer();
    const metadata = JSON.parse(buffer.toString()) as { sequenceNumber: number };
    return metadata.sequenceNumber;
  }
  return 0;
};

const getCurrentIncrementNumber = async (): Promise<number> => {
  const SEQUENCE_OFFSET = 12;
  const BASE_10 = 10;
  // Get the latest file in the list and extract the sequence number.
  const blobs = resultsContainerClient.listBlobsFlat();

  const fileNames: string[] = [];
  for await (const blob of blobs) {
    fileNames.push(blob.name.split('/').pop() as string);
  }

  if (fileNames.length === 0) {
    return 1;
  }
  fileNames.sort((file1, file2) => {
    const sequence1 = file1.substr(SEQUENCE_OFFSET);
    const sequence2 = file2.substr(SEQUENCE_OFFSET);

    return sequence1 > sequence2 ? 1 : -1;
  });
  const highestIncrementNumber = fileNames.pop()?.substr(SEQUENCE_OFFSET);

  return Number.parseInt(highestIncrementNumber as string, BASE_10);
};

const downloadResultsFile = async (fileName: string): Promise<Buffer> => resultsContainerClient.getBlobClient(fileName).downloadToBuffer();

const checkFileContents = async (cdsDataRows: Array<PreparedCdsData> | Array<PreparedInstructorCdsData>, expectedSequenceNumber: number, fileType: DvaTestType, expectedIncrementNumber?: number): Promise<void> => {
  const resultsFolderPath = (fileType === DvaTestType.LEARNER) ? config.dva.sftp.learnerPath : config.dva.sftp.instructorPath;
  const resultsFileName = FixedWidthTextFileGenerator.createFileName(fileType === DvaTestType.LEARNER ? (expectedIncrementNumber ?? 1) : expectedSequenceNumber, fileType);
  const resultsFileBuffer = await downloadResultsFile(`${resultsFolderPath}/${resultsFileName}`);

  const fileReadable = Readable.from(resultsFileBuffer.toString('utf8'));
  const rows = readline.createInterface(
    {
      input: fileReadable,
      crlfDelay: Infinity,
    },
  );
  let rowCount = 0;
  for await (const row of rows) {
    if (rowCount === 0) {
      const checkHeader = checkHeaders.get(fileType);
      if (checkHeader) {
        const headerConstant = dvaTestTypeToHeaderConstant.get(fileType) || '';
        checkHeader(row, cdsDataRows.length, expectedSequenceNumber, headerConstant);
      }
    } else if (checkDataRow.has(fileType)) {
      const checkData = checkDataRow.get(fileType);
      if (checkData) {
        checkData(row, cdsDataRows);
      }
    } else {
      throw new Error('Called with a non-mapped file type');
    }
    rowCount++;
  }
  expect(rowCount).toEqual(cdsDataRows.length + 1);
};

const checkLearnerHeader = (row: string, numberOfRows: number, expectedSequenceNumber: number, headerConstant: string): void => {
  expect(row.substr(0, 9)).toEqual(headerConstant);
  expect(row.substr(9, 6)).toEqual(zeroFill(expectedSequenceNumber, 6));
  expect(row.substr(15, 6)).toEqual(zeroFill(numberOfRows, 6));
};

const checkLearnerDataRow = (row: string, cdsDataRows: Array<PreparedCdsData>): void => {
  const licenceNumber = row.substr(1, 16).trim();
  const cdsData = cdsDataRows.find((value) => value.licenceNumber === licenceNumber);
  if (!cdsData) {
    throw new Error(`CDS data row for licence number ${licenceNumber} not found!`);
  }
  expect(row.substr(0, 1)).toEqual('I');
  expect(licenceNumber).toEqual(cdsData.licenceNumber);
  expect(row.substr(17, 1).trim()).toEqual(cleanString(cdsData.firstInitial));
  expect(row.substr(18, 12).trim()).toEqual(cdsData.title?.toUpperCase());
  expect(row.substr(30, 43).trim()).toEqual(cleanString(cdsData.lastname.toUpperCase()));
  expect(row.substr(73, 2).trim()).toEqual(cdsData.testCode);
  expect(row.substr(75, 8).trim()).toEqual(dateformat(cdsData.testDate, 'ddmmyyyy'));
  expect(row.substr(83, 9).trim()).toEqual(cdsData.certificateNumber);
  expect(row.substr(92, 1).trim()).toEqual(cdsData.testResult);
};

/**
 * Check the value of the ftts_tarsexportedstatus on test history.
 * Pass a string for the exported status when the row is **not** expected to be processed
 * @param cdsDataRows List of CRM rows containing a testHistoryId
 * @param tarsExportedStatus Either a member of the TarsExportedStatus enum when row has been processed (but it may have failed validation).
 * Or a string if asserting that the row has not been processed
 */
const checkTarsExportedStatus = async (cdsDataRows: Array<PreparedBaseCdsData>, tarsExportedStatus: TarsExportedStatus | string) => {
  for await (const cdsData of cdsDataRows) {
    const testHistory = await crmTestClient.retrieveTestHistory(cdsData.testHistoryId);
    if (tarsExportedStatus in TarsExportedStatus) {
      expect(testHistory.ftts_tarsexportedstatus).toEqual(tarsExportedStatusToString(tarsExportedStatus as TarsExportedStatus));
    } else {
      expect(testHistory.ftts_tarsexportedstatus).toEqual(tarsExportedStatus);
    }
  }
};

const checkInstructorHeader = (row: string, numberOfRows: number, expectedSequenceNumber: number, headerConstant: string): void => {
  expect(row.substr(0, 10)).toEqual(headerConstant);
  expect(row.substr(10, 6)).toEqual(zeroFill(expectedSequenceNumber, 6));
  expect(row.substr(16, 8)).toEqual(dateformat(dayjs().subtract(1, 'day').toDate(), 'ddmmyyyy'));
  expect(row.substr(24, 6)).toEqual(zeroFill(numberOfRows, 6));
};

const checkInstructorDataRow = (row: string, cdsDataRows: Array<PreparedInstructorCdsData>): void => {
  const licenceNumber = row.substr(1, 16).trim();
  const cdsData = cdsDataRows.find((value) => value.licenceNumber === licenceNumber);
  if (!cdsData) {
    throw new Error(`CDS data row for licence number ${licenceNumber} not found!`);
  }
  expect(row.substr(0, 1)).toEqual('1');
  expect(licenceNumber).toEqual(cdsData?.licenceNumber);
  expect(row.substr(17, 16).trim()).toEqual(cdsData.paymentReceiptNumber);
  expect(row.substr(33, 43).trim()).toEqual(cdsData.lastname);
  expect(row.substr(76, 30).trim()).toEqual(cdsData.addressLine1);
  expect(row.substr(106, 30).trim()).toEqual(cdsData.addressLine2);
  expect(row.substr(136, 30).trim()).toEqual(cdsData.addressLine3);
  expect(row.substr(166, 30).trim()).toEqual(cdsData.addressLine4);
  expect(row.substr(196, 30).trim()).toEqual(cdsData.addressLine5);
  expect(row.substr(226, 10).trim()).toEqual(cdsData.postCode);
  expect(row.substr(236, 8)).toEqual(dateformat(cdsData.testDate, 'ddmmyyyy'));
  expect(row.substr(244, 1)).toEqual(cdsData.testResult);
  expect(row.substr(245, 3)).toEqual(cdsData.bandScore1);
  expect(row.substr(248, 3)).toEqual(cdsData.bandScore2);
  expect(row.substr(251, 3)).toEqual(cdsData.bandScore3);
  expect(row.substr(254, 3)).toEqual(cdsData.bandScore4);
  expect(row.substr(257, 3)).toEqual(cdsData.overallScore);
  expect(row.substr(260, 3)).toEqual(cdsData.hptScore);
};

// eslint-disable-next-line no-spaced-func
const checkHeaders = new Map<DvaTestType, (row: string, numberOfRows: number, expectedSequenceNumber: number, headerConstant: string) => void>([
  [DvaTestType.LEARNER, checkLearnerHeader],
  [DvaTestType.ADI, checkInstructorHeader],
  [DvaTestType.AMI, checkInstructorHeader],
]);

// eslint-disable-next-line no-spaced-func
const checkDataRow = new Map<DvaTestType, (row: string, cdsDataRows: Array<any>) => void>([
  [DvaTestType.LEARNER, checkLearnerDataRow],
  [DvaTestType.ADI, checkInstructorDataRow],
  [DvaTestType.AMI, checkInstructorDataRow],
]);
