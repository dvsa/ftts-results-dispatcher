/* eslint-disable no-template-curly-in-string */
/* eslint-disable @typescript-eslint/unbound-method */
import { when } from 'jest-when';
import mockFs from 'mock-fs';
import { FetchXmlResponse } from 'dynamics-web-api';
import { mockedConfig } from '../../mocks/config.mock';
import { mockedDynamicsWebApi } from '../../mocks/dynamicsWebApi.mock';
import { mockedLogger } from '../../mocks/logger.mock';
import * as CRM from '../../../src/crm/crmClient';
import {
  FttsTestResult,
  TestResult,
} from '../../../src/crm/testResults/testResult';
import { Title } from '../../../src/crm/testResults/title';
import { TestStatus } from '../../../src/crm/testResults/testStatus';
import { TextLanguage } from '../../../src/crm/testResults/textLanguage';
import { GenderCode } from '../../../src/crm/testResults/genderCode';
import { TarsExportedStatus } from '../../../src/crm/testResults/tarsExportedStatus';
import { CrmError } from '../../../src/crm/crmError';

describe('CrmClient', () => {
  let FETCH_XML: string;
  const FETCH_XML_EMPTY_RESPONSE: FetchXmlResponse<FttsTestResult> = {};
  const ERROR_MESSAGE = 'some error message';
  const ERROR = new Error(ERROR_MESSAGE);
  const BAD_REQUEST_ERROR = { message: ERROR_MESSAGE, status: 400 };

  beforeEach(() => {
    mockedConfig.unprocessedTestResults.fetchCount = '1000';
    mockedConfig.unprocessedTestResults.tarsExportedStatus = 'UNPROCESSED';
    FETCH_XML = `<fetch version="1.0" count="${mockedConfig.unprocessedTestResults.fetchCount}">...${mockedConfig.unprocessedTestResults.tarsExportedStatus}...</fetch>`;
  });

  afterEach(() => {
    mockFs.restore();
    jest.clearAllMocks();
  });
  describe('getUnprocessedTestResults', () => {
    beforeEach(() => {
      mockFs({
        './src/crm/testResults': {
          'unprocessedTestResults.xml':
            '<fetch version="1.0" count="${fetchCount}">...${tarsExportedStatus}...</fetch>',
        },
      });
    });

    const FETCH_XML_PASS_RESPONSE: FetchXmlResponse<FttsTestResult> = {
      value: [
        {
          ftts_testhistoryid: 'aede37df-73d1-ea11-a813-000d3a7f128d',
          ftts_certificatenumber: '999999999',
          ftts_teststatus: TestStatus.PASS,
          ftts_textlanguage: TextLanguage.ENGLISH,
          ftts_starttime: new Date('2020-06-26'),
          'person.address1_line1': 'adress line 1',
          'person.address1_line2': 'address line 2',
          'person.address1_line3': 'address line 3',
          'person.address1_city': 'address city',
          'person.address1_county': 'address county',
          'person.address1_postalcode': 'example code',
          'person.ftts_adiprn': 'adiprn',
          'person.gendercode': GenderCode.MALE,
          'person.ftts_title': Title.Mrs,
          'person.firstname': 'Ellie',
          'person.lastname': 'Walker',
          'person.birthdate': '1989-03-12',
          'person.licence.ftts_licence': '20406011',
          'product.ftts_examseriescode': 'LGV',
          'bookingproduct.ftts_reference': 'C-000-016-055-04',
        } as FttsTestResult,
      ],
    };

    test('GIVEN FetchXmlResponse WHEN called THEN returns an array of unprocessed test results', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TestResult.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockResolvedValue(FETCH_XML_PASS_RESPONSE);

      const testResults = await CRM.newCrmClient().getUnprocessedTestResults();

      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'Trying to fetch unprocessed test results',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'Successfully fetched 1 unprocessed test result',
      );
      expect(testResults.length).toEqual(1);
      expect(testResults).toEqual([
        {
          certificateNumber: '999999999',
          testStatus: 'Pass',
          textLanguage: 'English',
          startTime: '2020-06-26T00:00:00.000Z',
          addressLine1: 'adress line 1',
          addressLine2: 'address line 2',
          addressLine3: 'address line 3',
          addressLine4: 'address city',
          addressLine5: 'address county',
          postCode: 'example code',
          adiprn: 'adiprn',
          genderCode: 'Male',
          id: 'aede37df-73d1-ea11-a813-000d3a7f128d',
          title: 'Mrs',
          firstName: 'Ellie',
          lastName: 'Walker',
          birthDate: '1989-03-12',
          driverNumber: '20406011',
          examSeriesCode: 'LGV',
          bookingReference: 'C-000-016-055-04',
        } as TestResult,
      ]);
    });

    test('GIVEN an empty FetchXmlResponse WHEN called THEN returns an empty array of unprocessed test results', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TestResult.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockResolvedValue(FETCH_XML_EMPTY_RESPONSE);

      const testResults = await CRM.newCrmClient().getUnprocessedTestResults();

      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'Trying to fetch unprocessed test results',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'Successfully fetched 0 unprocessed test results',
      );
      expect(testResults.length).toEqual(0);
    });

    test('GIVEN an error without status while fetch  WHEN called THEN the fetch call is retried', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TestResult.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockRejectedValueOnce(ERROR);
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TestResult.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockResolvedValueOnce(FETCH_XML_EMPTY_RESPONSE);

      const testResults = await CRM.newCrmClient().getUnprocessedTestResults();

      expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'Trying to fetch unprocessed test results',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'Successfully fetched 0 unprocessed test results',
      );
      expect(mockedLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockedLogger.warn).toHaveBeenNthCalledWith(
        1,
        'dynamicsWebApi.fetch is being retried',
        {
          errorMessage: ERROR_MESSAGE,
          argArray: [
            TestResult.ENTITY_COLLECTION_NAME,
            FETCH_XML,
          ],
        },
      );
      expect(testResults.length).toEqual(0);
    });

    test('GIVEN an error with status 400 while fetch WHEN called THEN error is thrown', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TestResult.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockRejectedValue(BAD_REQUEST_ERROR);

      try {
        await CRM.newCrmClient().getUnprocessedTestResults();
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(CrmError);
        expect(error.message).toEqual('Failed to fetch unprocessed test results');
        expect(error.cause).toEqual(BAD_REQUEST_ERROR);
        expect(mockedLogger.info).toHaveBeenCalledWith(
          'Trying to fetch unprocessed test results',
        );
        expect(mockedLogger.info).not.toBeCalledWith(
          'Successfully fetched 0 unprocessed test results',
        );
      }
    });

    test('GIVEN query string with status placeholder WHEN called THEN fetch function called with proper parameters', async () => {
      mockFs({
        './src/crm/testResults': {
          'unprocessedTestResults.xml':
            '<fetch>...${statusPass}...${statusFail}...${statusNegated}...</fetch>',
        },
      });
      mockedDynamicsWebApi.fetch.mockResolvedValue(FETCH_XML_PASS_RESPONSE);

      await CRM.newCrmClient(
      ).getUnprocessedTestResults();

      expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledWith('ftts_testhistories',
        '<fetch>...2...1...${statusNegated}...</fetch>');
    });
  });

  describe('getUnprocessedNegatedTestResults', () => {
    beforeEach(() => {
      mockFs({
        './src/crm/testResults': {
          'unprocessedNegatedTestResults.xml':
            '<fetch version="1.0" count="${fetchCount}">...${tarsExportedStatus}...</fetch>',
        },
      });
    });

    const FETCH_XML_NEGATED_RESPONSE: FetchXmlResponse<FttsTestResult> = {
      value: [
        {
          ftts_testhistoryid: 'aede37df-73d1-ea11-a813-000d3a7f128d',
          ftts_certificatenumber: '999999999',
          ftts_teststatus: TestStatus.NEGATED,
          ftts_textlanguage: TextLanguage.ENGLISH,
          ftts_starttime: new Date('2020-06-26'),
          'person.address1_line1': 'adress line 1',
          'person.address1_line2': 'address line 2',
          'person.address1_line3': 'address line 3',
          'person.address1_city': 'address city',
          'person.address1_county': 'address county',
          'person.address1_postalcode': 'example code',
          'person.ftts_adiprn': 'adiprn',
          'person.gendercode': GenderCode.MALE,
          'person.ftts_title': Title.Mrs,
          'person.firstname': 'Ellie',
          'person.lastname': 'Walker',
          'person.birthdate': '1989-03-12',
          'person.licence.ftts_licence': '20406011',
          'product.ftts_examseriescode': 'LGV',
          'bookingproduct.ftts_reference': 'C-000-016-055-04',
        } as FttsTestResult,
      ],
    };

    test('GIVEN FetchXmlResponse WHEN called THEN returns an array of unprocessed negated test results', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TestResult.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockResolvedValue(FETCH_XML_NEGATED_RESPONSE);

      const testResults = await CRM.newCrmClient().getUnprocessedNegatedTestResults();

      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'Trying to fetch unprocessed negated test results',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'Successfully fetched 1 unprocessed negated test result',
      );
      expect(testResults.length).toEqual(1);
      expect(testResults).toEqual([
        {
          id: 'aede37df-73d1-ea11-a813-000d3a7f128d',
          certificateNumber: '999999999',
          testStatus: 'Negated',
          textLanguage: 'English',
          startTime: '2020-06-26T00:00:00.000Z',
          addressLine1: 'adress line 1',
          addressLine2: 'address line 2',
          addressLine3: 'address line 3',
          addressLine4: 'address city',
          addressLine5: 'address county',
          postCode: 'example code',
          adiprn: 'adiprn',
          genderCode: 'Male',
          title: 'Mrs',
          firstName: 'Ellie',
          lastName: 'Walker',
          birthDate: '1989-03-12',
          driverNumber: '20406011',
          examSeriesCode: 'LGV',
          bookingReference: 'C-000-016-055-04',
        } as TestResult,
      ]);
    });

    test('GIVEN an empty FetchXmlResponse WHEN called THEN returns an empty array of unprocessed test results', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TestResult.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockResolvedValue(FETCH_XML_EMPTY_RESPONSE);

      const testResults = await CRM.newCrmClient().getUnprocessedNegatedTestResults();

      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'Trying to fetch unprocessed negated test results',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'Successfully fetched 0 unprocessed negated test results',
      );
      expect(testResults.length).toEqual(0);
    });

    test('GIVEN an error without status while fetch  WHEN called THEN the fetch call is retried', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TestResult.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockRejectedValueOnce(ERROR);
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TestResult.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockResolvedValueOnce(FETCH_XML_EMPTY_RESPONSE);

      const testResults = await CRM.newCrmClient().getUnprocessedNegatedTestResults();

      expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'Trying to fetch unprocessed negated test results',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'Successfully fetched 0 unprocessed negated test results',
      );
      expect(mockedLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockedLogger.warn).toHaveBeenNthCalledWith(
        1,
        'dynamicsWebApi.fetch is being retried',
        {
          errorMessage: ERROR_MESSAGE,
          argArray: [
            TestResult.ENTITY_COLLECTION_NAME,
            FETCH_XML,
          ],
        },
      );
      expect(testResults.length).toEqual(0);
    });

    test('GIVEN an error with status 400 while fetch WHEN called THEN error is thrown', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TestResult.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockRejectedValue(BAD_REQUEST_ERROR);

      try {
        await CRM.newCrmClient().getUnprocessedNegatedTestResults();
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(CrmError);
        expect(error.message).toEqual('Failed to fetch unprocessed negated test results');
        expect(error.cause).toEqual(BAD_REQUEST_ERROR);
        expect(mockedLogger.info).toHaveBeenCalledWith(
          'Trying to fetch unprocessed negated test results',
        );
        expect(mockedLogger.info).not.toBeCalledWith(
          'Successfully fetched 0 unprocessed test results',
        );
      }
    });

    test('GIVEN query string with status placeholder WHEN called THEN fetch function called with proper parameters', async () => {
      mockFs({
        './src/crm/testResults': {
          'unprocessedNegatedTestResults.xml':
            '<fetch>...${statusPass}...${statusFail}...${statusNegated}...</fetch>',
        },
      });
      mockedDynamicsWebApi.fetch.mockResolvedValue(FETCH_XML_NEGATED_RESPONSE);

      await CRM.newCrmClient().getUnprocessedNegatedTestResults();

      expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledWith('ftts_testhistories',
        '<fetch>...${statusPass}...${statusFail}...5...</fetch>');
    });
  });

  describe('updateTarsExportedStatus', () => {
    test('GIVEN list of test results WHEN called THEN no error thrown', async () => {
      const tarsExportedStatus = TarsExportedStatus.PROCESSED;
      const testResults = new Array(20).fill(testResult);
      mockedDynamicsWebApi.update.mockResolvedValue({});
      mockedDynamicsWebApi.executeBatch.mockResolvedValue([]);

      await CRM.newCrmClient().updateTarsExportedStatuses(testResults, tarsExportedStatus);

      expect(mockedDynamicsWebApi.startBatch).toHaveBeenCalledTimes(1);
      expect(mockedDynamicsWebApi.executeBatch).toHaveBeenCalledTimes(1);
      expect(mockedDynamicsWebApi.update).toHaveBeenCalledTimes(20);
      expect(mockedDynamicsWebApi.update)
        .lastCalledWith(
          testResult.id,
          TestResult.ENTITY_COLLECTION_NAME,
          {
            ftts_tarsexportedstatus: TarsExportedStatus.toString(tarsExportedStatus),
          },
        );
      expect(mockedLogger.info).toHaveBeenCalledTimes(1);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        `Updated ${testResults.length} results`,
        { tarsExportedStatus: `${TarsExportedStatus.toString(tarsExportedStatus)}` },
      );
    });
    test('GIVEN id and status WHEN called and executeBatch fails THEN the call is retried', async () => {
      const testResults = new Array(20).fill(testResult);
      const tarsExportedStatus = TarsExportedStatus.FAILED_VALIDATION;
      mockedDynamicsWebApi.update.mockResolvedValue({});
      mockedDynamicsWebApi.executeBatch.mockRejectedValueOnce([ERROR]);
      mockedDynamicsWebApi.executeBatch.mockResolvedValueOnce([]);

      await CRM.newCrmClient().updateTarsExportedStatuses(testResults, tarsExportedStatus);

      expect(mockedDynamicsWebApi.update).toHaveBeenCalledTimes(40);
      expect(mockedLogger.warn).toHaveBeenCalledTimes(22);
      expect(mockedLogger.warn).toHaveBeenNthCalledWith(
        1,
        'dynamicsWebApi.executeBatch is being retried',
        {
          errorMessage: ERROR_MESSAGE,
        },
      );
      expect(mockedLogger.warn).toHaveBeenNthCalledWith(
        2,
        'dynamicsWebApi.startBatch is being retried',
      );
      expect(mockedLogger.warn).toHaveBeenNthCalledWith(
        3,
        'dynamicsWebApi.update is being retried',
        {
          argArray: [
            testResult.id,
            TestResult.ENTITY_COLLECTION_NAME,
            {
              ftts_tarsexportedstatus: TarsExportedStatus.toString(tarsExportedStatus),
            },
          ],
        },
      );
      expect(mockedLogger.info).toHaveBeenCalledTimes(1);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        `Updated ${testResults.length} results`,
        { tarsExportedStatus: `${TarsExportedStatus.toString(tarsExportedStatus)}` },
      );
    });

    test('GIVEN id and status WHEN called and update fails with status 400 THEN error is thrown', async () => {
      const testResults = [testResult];
      const tarsExportedStatus = TarsExportedStatus.FAILED_VALIDATION;
      when(mockedDynamicsWebApi.update)
        .calledWith(
          testResult.id,
          TestResult.ENTITY_COLLECTION_NAME,
          {
            ftts_tarsexportedstatus: TarsExportedStatus.toString(tarsExportedStatus),
          },
        )
        .mockImplementationOnce(() => { throw BAD_REQUEST_ERROR; });

      try {
        await CRM.newCrmClient().updateTarsExportedStatuses(testResults, tarsExportedStatus);
      } catch (error) {
        expect(error).toBeInstanceOf(CrmError);
        expect(error.message).toEqual(ERROR_MESSAGE);
        expect(error.cause).toEqual(BAD_REQUEST_ERROR);
        expect(mockedLogger.info).toHaveBeenCalledTimes(0);
      }
    });
  });
});

const testResult: TestResult = {
  id: 'A300A729-31F2-4E05-B6E3-BC9B28B81CDB',
  testStatus: 'passed',
  title: 'test title',
  lastName: 'Smith',
  birthDate: '2000-01-23',
  bookingReference: 'booking_ref',
};
