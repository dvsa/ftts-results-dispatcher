/* eslint-disable no-template-curly-in-string */
/* eslint-disable @typescript-eslint/unbound-method */
import { resetAllWhenMocks, when } from 'jest-when';
import mockFs from 'mock-fs';
import fs from 'fs';
import { FetchXmlResponse } from 'dynamics-web-api';
import { mockedConfig } from '../../mocks/config.mock';
import { mockedDynamicsWebApi } from '../../mocks/dynamicsWebApi.mock';
import { mockedLogger } from '../../mocks/logger.mock';
import { CrmClient, newCrmClient } from '../../../src/crm/crmClient';
import {
  TarsCrmTestResult,
  TarsTestResultModel,
} from '../../../src/crm/testResults/tarsTestResultModel';
import { CrmTitle, Title } from '../../../src/crm/testResults/title';
import { TestStatus } from '../../../src/crm/testResults/testStatus';
import { TextLanguage } from '../../../src/crm/testResults/textLanguage';
import { CrmGenderCode, Gender } from '../../../src/crm/testResults/genderCode';
import { TarsExportedStatus, tarsExportedStatusToString } from '../../../src/crm/testResults/tarsExportedStatus';
import { CrmError } from '../../../src/crm/crmError';
import { CRMProductNumber } from '../../../src/crm/testResults/productNumber';
import { DvaLearnerTestResultModel, DvaCrmTestResult } from '../../../src/crm/testResults/dvaLearnerTestResultModel';
import { DvaInstructorTestResultModel } from '../../../src/crm/testResults/dvaInstructorTestResultModel';
import { DvaCrmBandScoreAggregate } from '../../../src/crm/testResults/dvaInstructorBandScore';

describe('CrmClient', () => {
  let FETCH_XML: string;
  let FETCH_XML_ADI: string;
  let FETCH_XML_ADI_AMI_BAND_SCORES: string;
  let FETCH_XML_AMI: string;
  const FETCH_XML_EMPTY_RESPONSE: FetchXmlResponse<TarsCrmTestResult> = {};
  const FETCH_XML_BAND_SCORE_EMPTY_RESPONSE: FetchXmlResponse<DvaCrmBandScoreAggregate> = {};
  const ERROR_MESSAGE = 'some error message';
  const ERROR = new Error(ERROR_MESSAGE);
  const BAD_REQUEST_ERROR = { message: ERROR_MESSAGE, status: 400 };
  const TARS_EXPORTED_DATE = '2020-08-01T00:00:00.000Z';
  const UNPROCESSED_STATUS = 'Unprocessed';
  const mockInstructorBands = {
    band1: 'Band 1',
    band2: 'Band 2',
    band3: 'Band 3',
    band4: 'Band 4',
  };
  let crm: CrmClient;

  beforeEach(() => {
    mockedConfig.dva.fetchCount = '1000';
    mockedConfig.tars.fetchCount = '1000';
    mockedConfig.dva.adiBands = mockInstructorBands;
    mockedConfig.dva.amiBands = mockInstructorBands;
    FETCH_XML = `<fetch version="1.0" count="${mockedConfig.tars.fetchCount}">...${UNPROCESSED_STATUS}...</fetch>`;
    FETCH_XML_ADI = `<fetch version="1.0" count="${mockedConfig.tars.fetchCount}">...${UNPROCESSED_STATUS}...5003...675030001...</fetch>`;
    FETCH_XML_AMI = `<fetch version="1.0" count="${mockedConfig.tars.fetchCount}">...${UNPROCESSED_STATUS}...7001...675030001...</fetch>`;
    FETCH_XML_ADI_AMI_BAND_SCORES = `<fetch version="1.0" count="${mockedConfig.tars.fetchCount}">...${UNPROCESSED_STATUS}</fetch>`;
    crm = new CrmClient(mockedDynamicsWebApi as any, UNPROCESSED_STATUS);
  });

  afterEach(() => {
    mockFs.restore();
    resetAllWhenMocks();
    jest.clearAllMocks();
  });

  describe('TARS - getUnprocessedTestResults', () => {
    beforeEach(() => {
      mockFs({
        './src/crm/testResults': {
          'unprocessedTarsTestResults.xml':
            '<fetch version="1.0" count="${fetchCount}">...${tarsExportedStatus}...</fetch>',
        },
      });
    });

    const FETCH_XML_PASS_RESPONSE: FetchXmlResponse<TarsCrmTestResult> = {
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
          'person.gendercode': CrmGenderCode.MALE,
          'person.ftts_title': CrmTitle.Mrs,
          'person.firstname': 'Ellie',
          'person.lastname': 'Walker',
          'person.birthdate': '1989-03-12',
          'person.licence.ftts_licence': '20406011',
          'product.ftts_examseriescode': 'LGV',
          'bookingproduct.ftts_reference': 'C-000-016-055-04',
        } as TarsCrmTestResult,
      ],
    };

    test('GIVEN FetchXmlResponse WHEN called THEN returns an array of unprocessed test results', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TarsTestResultModel.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockResolvedValue(FETCH_XML_PASS_RESPONSE);

      const testResults = await crm.getUnprocessedTestResults();

      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'CrmClient::getUnprocessedTestResults: Trying to fetch unprocessed TARS test results',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'CrmClient::getUnprocessedTestResults: Successfully fetched 1 TARS unprocessed test result',
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
          genderCode: Gender.M,
          id: 'aede37df-73d1-ea11-a813-000d3a7f128d',
          title: Title.Mrs,
          firstName: 'Ellie',
          lastName: 'Walker',
          birthDate: '1989-03-12',
          driverNumber: '20406011',
          examSeriesCode: 'LGV',
          bookingReference: 'C-000-016-055-04',
        } as TarsTestResultModel,
      ]);
    });

    test('GIVEN an empty FetchXmlResponse WHEN called THEN returns an empty array of unprocessed test results', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TarsTestResultModel.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockResolvedValue(FETCH_XML_EMPTY_RESPONSE);

      const testResults = await crm.getUnprocessedTestResults();

      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'CrmClient::getUnprocessedTestResults: Trying to fetch unprocessed TARS test results',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'CrmClient::getUnprocessedTestResults: Successfully fetched 0 TARS unprocessed test results',
      );
      expect(testResults.length).toEqual(0);
    });

    test('GIVEN an error without status while fetch  WHEN called THEN the fetch call is retried', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TarsTestResultModel.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockRejectedValueOnce(ERROR);
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TarsTestResultModel.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockResolvedValueOnce(FETCH_XML_EMPTY_RESPONSE);

      const testResults = await newCrmClient(UNPROCESSED_STATUS).getUnprocessedTestResults();

      expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'CrmClient::getUnprocessedTestResults: Trying to fetch unprocessed TARS test results',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'CrmClient::getUnprocessedTestResults: Successfully fetched 0 TARS unprocessed test results',
      );
      expect(mockedLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockedLogger.warn).toHaveBeenNthCalledWith(
        1,
        'dynamicsWebApi.fetch is being retried',
        {
          errorMessage: ERROR_MESSAGE,
          argArray: [
            TarsTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML,
          ],
        },
      );
      expect(testResults.length).toEqual(0);
    });

    test('GIVEN an error with status 400 while fetch WHEN called THEN error is thrown', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TarsTestResultModel.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockRejectedValue(BAD_REQUEST_ERROR);

      try {
        await crm.getUnprocessedTestResults();
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(CrmError);
        expect((error as CrmError).message).toEqual('CrmClient::getUnprocessedTestResults: Failed to fetch unprocessed TARS test results');
        expect((error as CrmError).cause).toEqual(BAD_REQUEST_ERROR);
        expect(mockedLogger.info).toHaveBeenCalledWith(
          'CrmClient::getUnprocessedTestResults: Trying to fetch unprocessed TARS test results',
        );
        expect(mockedLogger.info).not.toBeCalledWith(
          'CrmClient::getUnprocessedTestResults: Successfully fetched 0 unprocessed test results',
        );
      }
    });

    test('GIVEN query string with status placeholder WHEN called THEN fetch function called with proper parameters', async () => {
      mockFs({
        './src/crm/testResults': {
          'unprocessedTarsTestResults.xml':
            '<fetch>...${statusPass}...${statusFail}...${statusNegated}...</fetch>',
        },
      });
      mockedDynamicsWebApi.fetch.mockResolvedValue(FETCH_XML_PASS_RESPONSE);

      await crm.getUnprocessedTestResults();

      expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledWith('ftts_testhistories',
        '<fetch>...2...1...${statusNegated}...</fetch>');
    });
  });

  describe('TARS - getUnprocessedNegatedTestResults', () => {
    beforeEach(() => {
      mockFs({
        './src/crm/testResults': {
          'unprocessedTarsNegatedTestResults.xml':
            '<fetch version="1.0" count="${fetchCount}">...${tarsExportedStatus}...</fetch>',
        },
      });
    });

    const FETCH_XML_NEGATED_RESPONSE: FetchXmlResponse<TarsCrmTestResult> = {
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
          'person.gendercode': CrmGenderCode.MALE,
          'person.ftts_title': CrmTitle.Mrs,
          'person.firstname': 'Ellie',
          'person.lastname': 'Walker',
          'person.birthdate': '1989-03-12',
          'person.licence.ftts_licence': '20406011',
          'product.ftts_examseriescode': 'LGV',
          'bookingproduct.ftts_reference': 'C-000-016-055-04',
        } as TarsCrmTestResult,
      ],
    };

    test('GIVEN FetchXmlResponse WHEN called THEN returns an array of unprocessed negated test results', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TarsTestResultModel.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockResolvedValue(FETCH_XML_NEGATED_RESPONSE);

      const testResults = await crm.getUnprocessedNegatedTestResults();

      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'CrmClient::getUnprocessedNegatedTestResults: Trying to fetch unprocessed negated test results',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'CrmClient::getUnprocessedNegatedTestResults: Successfully fetched 1 unprocessed negated test result',
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
          genderCode: Gender.M,
          title: Title.Mrs,
          firstName: 'Ellie',
          lastName: 'Walker',
          birthDate: '1989-03-12',
          driverNumber: '20406011',
          examSeriesCode: 'LGV',
          bookingReference: 'C-000-016-055-04',
        } as TarsTestResultModel,
      ]);
    });

    test('GIVEN an empty FetchXmlResponse WHEN called THEN returns an empty array of unprocessed test results', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TarsTestResultModel.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockResolvedValue(FETCH_XML_EMPTY_RESPONSE);

      const testResults = await crm.getUnprocessedNegatedTestResults();

      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'CrmClient::getUnprocessedNegatedTestResults: Trying to fetch unprocessed negated test results',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'CrmClient::getUnprocessedNegatedTestResults: Successfully fetched 0 unprocessed negated test results',
      );
      expect(testResults.length).toEqual(0);
    });

    test('GIVEN an error without status while fetch  WHEN called THEN the fetch call is retried', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TarsTestResultModel.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockRejectedValueOnce(ERROR);
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TarsTestResultModel.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockResolvedValueOnce(FETCH_XML_EMPTY_RESPONSE);

      const testResults = await crm.getUnprocessedNegatedTestResults();

      expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'CrmClient::getUnprocessedNegatedTestResults: Trying to fetch unprocessed negated test results',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'CrmClient::getUnprocessedNegatedTestResults: Successfully fetched 0 unprocessed negated test results',
      );
      expect(mockedLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockedLogger.warn).toHaveBeenNthCalledWith(
        1,
        'dynamicsWebApi.fetch is being retried',
        {
          errorMessage: ERROR_MESSAGE,
          argArray: [
            TarsTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML,
          ],
        },
      );
      expect(testResults.length).toEqual(0);
    });

    test('GIVEN an error with status 400 while fetch WHEN called THEN error is thrown', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TarsTestResultModel.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockRejectedValue(BAD_REQUEST_ERROR);

      try {
        await crm.getUnprocessedNegatedTestResults();
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(CrmError);
        expect((error as CrmError).message).toEqual('CrmClient::getUnprocessedNegatedTestResults: Failed to fetch unprocessed TARS negated test results');
        expect((error as CrmError).cause).toEqual(BAD_REQUEST_ERROR);
        expect(mockedLogger.info).toHaveBeenCalledTimes(1);
        expect(mockedLogger.info).toHaveBeenCalledWith(
          'CrmClient::getUnprocessedNegatedTestResults: Trying to fetch unprocessed negated test results',
        );
        expect(mockedLogger.info).not.toBeCalledWith(
          'CrmClient::getUnprocessedNegatedTestResults: Successfully fetched 0 unprocessed test results',
        );
      }
    });

    test('GIVEN query string with status placeholder WHEN called THEN fetch function called with proper parameters', async () => {
      mockFs({
        './src/crm/testResults': {
          'unprocessedTarsNegatedTestResults.xml':
            '<fetch>...${statusPass}...${statusFail}...${statusNegated}...</fetch>',
        },
      });
      mockedDynamicsWebApi.fetch.mockResolvedValue(FETCH_XML_NEGATED_RESPONSE);

      await crm.getUnprocessedNegatedTestResults();

      expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledWith('ftts_testhistories',
        '<fetch>...${statusPass}...${statusFail}...5...</fetch>');
    });
  });

  describe('DVA Learner - getDvaUnprocessedTestResults', () => {
    beforeEach(() => {
      mockFs({
        './src/crm/testResults': {
          'unprocessedDvaTestResults.xml':
            '<fetch version="1.0" count="${fetchCount}">...${tarsExportedStatus}...</fetch>',
        },
      });
    });

    const FETCH_XML_PASS_RESPONSE_DVA: FetchXmlResponse<DvaCrmTestResult> = {
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
          'person.gendercode': CrmGenderCode.MALE,
          'person.ftts_title': CrmTitle.Mr,
          'person.firstname': 'Ellie',
          'person.lastname': 'Walker',
          'person.birthdate': '1989-03-12',
          'person.licence.ftts_licence': '20406011',
          'product.ftts_examseriescode': 'LGV',
          'product.productnumber': CRMProductNumber.LGVMC,
          'bookingproduct.ftts_reference': 'C-000-016-055-04',
        } as DvaCrmTestResult,
      ],
    };

    test('GIVEN FetchXmlResponse WHEN called THEN returns an array of unprocessed dva test results', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          DvaLearnerTestResultModel.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockResolvedValue(FETCH_XML_PASS_RESPONSE_DVA);

      const testResults = await crm.getDvaUnprocessedTestResults();

      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'CrmClient::getDvaUnprocessedTestResults: Trying to fetch unprocessed DVA Learner test results',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'CrmClient::getDvaUnprocessedTestResults: Successfully fetched 1 unprocessed test result',
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
          hptScore: undefined,
          paymentReferenceNumber: undefined,
          id: 'aede37df-73d1-ea11-a813-000d3a7f128d',
          title: Title.Mr,
          firstName: 'Ellie',
          lastName: 'Walker',
          birthDate: '1989-03-12',
          driverNumber: '20406011',
          otherTitle: undefined,
          bookingReference: 'C-000-016-055-04',
          productId: '3001',
          productNumber: '3001',
        } as DvaLearnerTestResultModel,
      ]);
    });

    test('GIVEN an empty FetchXmlResponse WHEN called THEN returns an empty array of unprocessed test results', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          DvaLearnerTestResultModel.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockResolvedValue(FETCH_XML_EMPTY_RESPONSE);

      const testResults = await crm.getDvaUnprocessedTestResults();

      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'CrmClient::getDvaUnprocessedTestResults: Trying to fetch unprocessed DVA Learner test results',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'CrmClient::getDvaUnprocessedTestResults: Successfully fetched 0 unprocessed test results',
      );
      expect(testResults.length).toEqual(0);
    });

    test('GIVEN an error without status while fetch  WHEN called THEN the fetch call is retried', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          DvaLearnerTestResultModel.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockRejectedValueOnce(ERROR);
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          DvaLearnerTestResultModel.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockResolvedValueOnce(FETCH_XML_EMPTY_RESPONSE);

      const testResults = await newCrmClient(UNPROCESSED_STATUS).getDvaUnprocessedTestResults();

      expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'CrmClient::getDvaUnprocessedTestResults: Trying to fetch unprocessed DVA Learner test results',
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'CrmClient::getDvaUnprocessedTestResults: Successfully fetched 0 unprocessed test results',
      );
      expect(mockedLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockedLogger.warn).toHaveBeenNthCalledWith(
        1,
        'dynamicsWebApi.fetch is being retried',
        {
          errorMessage: ERROR_MESSAGE,
          argArray: [
            DvaLearnerTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML,
          ],
        },
      );
      expect(testResults.length).toEqual(0);
    });

    test('GIVEN an error with status 400 while fetch WHEN called THEN error is thrown', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          DvaLearnerTestResultModel.ENTITY_COLLECTION_NAME,
          FETCH_XML,
        )
        .mockRejectedValue(BAD_REQUEST_ERROR);

      try {
        await crm.getDvaUnprocessedTestResults();
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(CrmError);
        expect((error as CrmError).message).toEqual('CrmClient::getDvaUnprocessedTestResults: Failed to fetch unprocessed DVA Learner test results');
        expect((error as CrmError).cause).toEqual(BAD_REQUEST_ERROR);
        expect(mockedLogger.info).toHaveBeenCalledWith(
          'CrmClient::getDvaUnprocessedTestResults: Trying to fetch unprocessed DVA Learner test results',
        );
        expect(mockedLogger.info).not.toBeCalledWith(
          'CrmClient::getDvaUnprocessedTestResults: Successfully fetched 0 unprocessed test results',
        );
      }
    });

    test('GIVEN query string with status placeholder WHEN called THEN fetch function called with proper parameters', async () => {
      mockFs({
        './src/crm/testResults': {
          'unprocessedDvaTestResults.xml':
            '<fetch>...${statusPass}...${statusFail}...${statusNegated}...</fetch>',
        },
      });
      mockedDynamicsWebApi.fetch.mockResolvedValue(FETCH_XML_PASS_RESPONSE_DVA);

      await crm.getDvaUnprocessedTestResults();

      expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledWith('ftts_testhistories',
        '<fetch>...2...1...${statusNegated}...</fetch>');
    });
  });

  const fetchXmlSuccessResultInstructor = (productNumber: CRMProductNumber.ADIP1DVA | CRMProductNumber.AMIP1): FetchXmlResponse<DvaCrmTestResult> => ({
    value: [
      {
        ftts_testhistoryid: 'aede37df-73d1-ea11-a813-000d3a7f128d',
        ftts_teststatus: TestStatus.PASS,
        ftts_starttime: new Date('2020-06-26'),
        'person.address1_line1': 'adress line 1',
        'person.address1_line2': 'address line 2',
        'person.address1_line3': 'address line 3',
        'person.address1_city': 'address city',
        'person.address1_county': 'address county',
        'person.address1_postalcode': 'example code',
        'person.ftts_adiprn': 'adiprn',
        'person.lastname': 'Walker',
        'person.birthdate': '1989-03-12',
        'person.licence.ftts_licence': '20406011',
        'product.productnumber': productNumber,
        'bookingproduct.ftts_reference': 'C-000-016-055-04',
        'bookingproduct.ftts_paymentreferencenumber': '72814694',
        ftts_hpttotalscore: 103,
      } as DvaCrmTestResult,
    ],
  });

  const generateMockBandScore = (topic: string, productNumber: CRMProductNumber.ADIP1DVA | CRMProductNumber.AMIP1): DvaCrmBandScoreAggregate => ({
    ftts_testhistoryid: 'aede37df-73d1-ea11-a813-000d3a7f128d',
    ftts_mcqtotalscore: 84.0,
    productnumber: productNumber,
    ftts_paymentreferencenumber: '72814694',
    candidateTotalPerBand: 21.0,
    ftts_topic: topic,
  });

  const fetchXmlSuccessResultInstructorBandScores = (productNumber: CRMProductNumber.ADIP1DVA | CRMProductNumber.AMIP1): FetchXmlResponse<DvaCrmBandScoreAggregate> => {
    const bandTopics = [mockInstructorBands.band1, mockInstructorBands.band2, mockInstructorBands.band3, mockInstructorBands.band4];
    return {
      value: bandTopics.map((topic) => generateMockBandScore(topic, productNumber)),
    };
  };

  const instructorExpectedResult: DvaInstructorTestResultModel = {
    testStatus: 'Pass',
    startTime: '2020-06-26T00:00:00.000Z',
    addressLine1: 'adress line 1',
    addressLine2: 'address line 2',
    addressLine3: 'address line 3',
    addressLine4: 'address city',
    addressLine5: 'address county',
    postCode: 'example code',
    adiprn: 'adiprn',
    paymentReferenceNumber: '72814694',
    id: 'aede37df-73d1-ea11-a813-000d3a7f128d',
    lastName: 'Walker',
    birthDate: '1989-03-12',
    driverNumber: '20406011',
    bookingReference: 'C-000-016-055-04',
    hptScore: 103,
    certificateNumber: undefined,
    firstName: undefined,
    textLanguage: undefined,
    title: undefined,
    bandScore1: 21,
    bandScore2: 21,
    bandScore3: 21,
    bandScore4: 21,
    overallScore: 84,
    productNumber: CRMProductNumber.ADIP1DVA,
  };

  describe('DVA Instructor (ADI/AMI) Results', () => {
    beforeEach(() => {
      mockFs({
        './src/crm/testResults': {
          'unprocessedDvaInstructorTestResults.xml':
            '<fetch version="1.0" count="${fetchCount}">...${tarsExportedStatus}...${productNumberAdiOrAmi}...${dva}...</fetch>',
          'unprocessedDvaInstructorBandScores.xml':
            '<fetch version="1.0" count="${fetchCount}">...${tarsExportedStatus}</fetch>',
        },
      });
    });

    describe('getDvaAdiUnprocessedTestResults', () => {
      test('GIVEN FetchXmlResponse WHEN called THEN returns an array of unprocessed DVA ADI test results', async () => {
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI,
          )
          .mockResolvedValueOnce(fetchXmlSuccessResultInstructor(CRMProductNumber.ADIP1DVA));

        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI_AMI_BAND_SCORES,
          )
          .mockResolvedValueOnce(fetchXmlSuccessResultInstructorBandScores(CRMProductNumber.ADIP1DVA));

        const testResults = await crm.getDvaAdiUnprocessedTestResults();

        expect(mockedLogger.info).toHaveBeenCalledTimes(2);
        expect(mockedLogger.info).toHaveBeenNthCalledWith(
          1,
          'CrmClient::getDvaAdiUnprocessedTestResults: Trying to fetch unprocessed DVA ADI test results',
        );
        expect(mockedLogger.info).toHaveBeenNthCalledWith(
          2,
          'CrmClient::getDvaAdiUnprocessedTestResults: Successfully fetched 1 unprocessed test result',
        );
        expect(testResults.length).toEqual(1);
        expect(testResults[0]).toEqual(instructorExpectedResult);
      });

      test('GIVEN two empty FetchXmlResponses fetching both instructor entries and band scores WHEN called THEN returns an empty array of unprocessed DVA ADI test results', async () => {
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI,
          )
          .mockResolvedValueOnce(FETCH_XML_EMPTY_RESPONSE);

        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI_AMI_BAND_SCORES,
          )
          .mockResolvedValueOnce(FETCH_XML_BAND_SCORE_EMPTY_RESPONSE);

        const testResults = await crm.getDvaAdiUnprocessedTestResults();

        expect(mockedLogger.info).toHaveBeenCalledTimes(2);
        expect(mockedLogger.info).toHaveBeenNthCalledWith(
          1,
          'CrmClient::getDvaAdiUnprocessedTestResults: Trying to fetch unprocessed DVA ADI test results',
        );
        expect(mockedLogger.info).toHaveBeenNthCalledWith(
          2,
          'CrmClient::getDvaAdiUnprocessedTestResults: Successfully fetched 0 unprocessed test results',
        );
        expect(testResults.length).toEqual(0);
      });

      test('GIVEN a successful non-empty response fetching instructor entries AND an empty band score xml response WHEN called THEN returns an array of unprocessed DVA ADI test results with band score fields set to 0', async () => {
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI,
          )
          .mockResolvedValueOnce(fetchXmlSuccessResultInstructor(CRMProductNumber.ADIP1DVA));

        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI_AMI_BAND_SCORES,
          )
          .mockResolvedValueOnce(FETCH_XML_BAND_SCORE_EMPTY_RESPONSE);

        const testResults = await crm.getDvaAdiUnprocessedTestResults();

        expect(mockedLogger.info).toHaveBeenCalledTimes(2);
        expect(mockedLogger.info).toHaveBeenNthCalledWith(
          1,
          'CrmClient::getDvaAdiUnprocessedTestResults: Trying to fetch unprocessed DVA ADI test results',
        );
        expect(mockedLogger.info).toHaveBeenNthCalledWith(
          2,
          'CrmClient::getDvaAdiUnprocessedTestResults: Successfully fetched 1 unprocessed test result',
        );
        expect(testResults.length).toEqual(1);
        expect(testResults[0]).toEqual({
          ...instructorExpectedResult,
          bandScore1: 0,
          bandScore2: 0,
          bandScore3: 0,
          bandScore4: 0,
          overallScore: 0,
        });
      });

      test('GIVEN an error without status during fetching from CRM WHEN retrieving unprocessed results THEN the fetch call is retried', async () => {
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI,
          )
          .mockRejectedValueOnce(ERROR);
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI,
          )
          .mockResolvedValueOnce(FETCH_XML_EMPTY_RESPONSE);
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI_AMI_BAND_SCORES,
          )
          .mockRejectedValueOnce(ERROR);
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI_AMI_BAND_SCORES,
          )
          .mockResolvedValueOnce(FETCH_XML_BAND_SCORE_EMPTY_RESPONSE);

        const testResults = await crm.getDvaAdiUnprocessedTestResults();

        expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledTimes(4);
        expect(mockedLogger.info).toHaveBeenCalledTimes(2);
        expect(mockedLogger.info).toHaveBeenNthCalledWith(
          1,
          'CrmClient::getDvaAdiUnprocessedTestResults: Trying to fetch unprocessed DVA ADI test results',
        );
        expect(mockedLogger.info).toHaveBeenNthCalledWith(
          2,
          'CrmClient::getDvaAdiUnprocessedTestResults: Successfully fetched 0 unprocessed test results',
        );
        expect(mockedLogger.warn).toHaveBeenCalledTimes(2);
        expect(mockedLogger.warn).toHaveBeenNthCalledWith(
          1,
          'dynamicsWebApi.fetch is being retried',
          {
            errorMessage: ERROR_MESSAGE,
            argArray: [
              DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
              FETCH_XML_ADI,
            ],
          },
        );
        expect(mockedLogger.warn).toHaveBeenNthCalledWith(
          2,
          'dynamicsWebApi.fetch is being retried',
          {
            errorMessage: ERROR_MESSAGE,
            argArray: [
              DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
              FETCH_XML_ADI_AMI_BAND_SCORES,
            ],
          },
        );
        expect(testResults.length).toEqual(0);
      });

      test('GIVEN an error with status 400 while fetching ADI records WHEN called THEN error is thrown', async () => {
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI,
          )
          .mockRejectedValue(BAD_REQUEST_ERROR);

        try {
          await crm.getDvaAdiUnprocessedTestResults();
          fail();
        } catch (error) {
          expect(error).toBeInstanceOf(CrmError);
          expect((error as CrmError).message).toEqual('CrmClient::getDvaAdiUnprocessedTestResults: Failed to fetch unprocessed DVA ADI test results');
          expect((error as CrmError).cause).toEqual(BAD_REQUEST_ERROR);
          expect(mockedLogger.info).toHaveBeenCalledWith(
            'CrmClient::getDvaAdiUnprocessedTestResults: Trying to fetch unprocessed DVA ADI test results',
          );
          expect(mockedLogger.info).not.toBeCalledWith(
            'CrmClient::getDvaAdiUnprocessedTestResults: Successfully fetched 0 unprocessed test results',
          );
        }
      });

      test('GIVEN an error with status 400 while fetching band scores WHEN called THEN error is thrown', async () => {
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI,
          )
          .mockResolvedValueOnce(FETCH_XML_EMPTY_RESPONSE);
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI_AMI_BAND_SCORES,
          )
          .mockRejectedValue(BAD_REQUEST_ERROR);

        try {
          await crm.getDvaAdiUnprocessedTestResults();
          fail();
        } catch (error) {
          expect(error).toBeInstanceOf(CrmError);
          expect((error as CrmError).message).toEqual('CrmClient::getDvaAdiUnprocessedTestResults: Failed to fetch unprocessed DVA ADI test results');
          expect((error as CrmError).cause).toEqual(BAD_REQUEST_ERROR);
          expect(mockedLogger.info).toHaveBeenCalledWith(
            'CrmClient::getDvaAdiUnprocessedTestResults: Trying to fetch unprocessed DVA ADI test results',
          );
          expect(mockedLogger.info).not.toBeCalledWith(
            'CrmClient::getDvaAdiUnprocessedTestResults: Successfully fetched 0 unprocessed test results',
          );
        }
      });
    });

    describe('getDvaAmiUnprocessedTestResults', () => {
      test('GIVEN FetchXmlResponse WHEN called THEN returns an array of unprocessed DVA AMI test results', async () => {
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_AMI,
          )
          .mockResolvedValueOnce(fetchXmlSuccessResultInstructor(CRMProductNumber.AMIP1));

        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI_AMI_BAND_SCORES,
          )
          .mockResolvedValueOnce(fetchXmlSuccessResultInstructorBandScores(CRMProductNumber.AMIP1));

        const testResults = await crm.getDvaAmiUnprocessedTestResults();

        expect(mockedLogger.info).toHaveBeenCalledTimes(2);
        expect(mockedLogger.info).toHaveBeenNthCalledWith(
          1,
          'CrmClient::getDvaAmiUnprocessedTestResults: Trying to fetch unprocessed DVA AMI test results',
        );
        expect(mockedLogger.info).toHaveBeenNthCalledWith(
          2,
          'CrmClient::getDvaAmiUnprocessedTestResults: Successfully fetched 1 unprocessed test result',
        );
        expect(testResults.length).toEqual(1);
        expect(testResults[0]).toEqual({
          ...instructorExpectedResult,
          productNumber: CRMProductNumber.AMIP1,
        });
      });

      test('GIVEN two empty FetchXmlResponses fetching both instructor entries and band scores WHEN called THEN returns an empty array of unprocessed DVA AMI test results', async () => {
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_AMI,
          )
          .mockResolvedValueOnce(FETCH_XML_EMPTY_RESPONSE);

        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI_AMI_BAND_SCORES,
          )
          .mockResolvedValueOnce(FETCH_XML_BAND_SCORE_EMPTY_RESPONSE);

        const testResults = await crm.getDvaAmiUnprocessedTestResults();

        expect(mockedLogger.info).toHaveBeenCalledTimes(2);
        expect(mockedLogger.info).toHaveBeenNthCalledWith(
          1,
          'CrmClient::getDvaAmiUnprocessedTestResults: Trying to fetch unprocessed DVA AMI test results',
        );
        expect(mockedLogger.info).toHaveBeenNthCalledWith(
          2,
          'CrmClient::getDvaAmiUnprocessedTestResults: Successfully fetched 0 unprocessed test results',
        );
        expect(testResults.length).toEqual(0);
      });

      test('GIVEN a successful non-empty response fetching instructor entries AND an empty band score xml response WHEN called THEN returns an array of unprocessed DVA AMI test results with band score fields set to 0', async () => {
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_AMI,
          )
          .mockResolvedValueOnce(fetchXmlSuccessResultInstructor(CRMProductNumber.AMIP1));

        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI_AMI_BAND_SCORES,
          )
          .mockResolvedValueOnce(FETCH_XML_BAND_SCORE_EMPTY_RESPONSE);

        const testResults = await crm.getDvaAmiUnprocessedTestResults();

        expect(mockedLogger.info).toHaveBeenCalledTimes(2);
        expect(mockedLogger.info).toHaveBeenNthCalledWith(
          1,
          'CrmClient::getDvaAmiUnprocessedTestResults: Trying to fetch unprocessed DVA AMI test results',
        );
        expect(mockedLogger.info).toHaveBeenNthCalledWith(
          2,
          'CrmClient::getDvaAmiUnprocessedTestResults: Successfully fetched 1 unprocessed test result',
        );
        expect(testResults.length).toEqual(1);
        expect(testResults[0]).toEqual({
          ...instructorExpectedResult,
          bandScore1: 0,
          bandScore2: 0,
          bandScore3: 0,
          bandScore4: 0,
          overallScore: 0,
          productNumber: CRMProductNumber.AMIP1,
        });
      });

      test('GIVEN an error without status while fetching from CRM THEN the fetch call is retried', async () => {
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_AMI,
          )
          .mockRejectedValueOnce(ERROR);
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_AMI,
          )
          .mockResolvedValueOnce(FETCH_XML_EMPTY_RESPONSE);
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI_AMI_BAND_SCORES,
          )
          .mockRejectedValueOnce(ERROR);
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI_AMI_BAND_SCORES,
          )
          .mockResolvedValueOnce(FETCH_XML_BAND_SCORE_EMPTY_RESPONSE);

        const testResults = await crm.getDvaAmiUnprocessedTestResults();

        expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledTimes(4);
        expect(mockedLogger.info).toHaveBeenCalledTimes(2);
        expect(mockedLogger.info).toHaveBeenNthCalledWith(
          1,
          'CrmClient::getDvaAmiUnprocessedTestResults: Trying to fetch unprocessed DVA AMI test results',
        );
        expect(mockedLogger.info).toHaveBeenNthCalledWith(
          2,
          'CrmClient::getDvaAmiUnprocessedTestResults: Successfully fetched 0 unprocessed test results',
        );
        expect(mockedLogger.warn).toHaveBeenCalledTimes(2);
        expect(mockedLogger.warn).toHaveBeenNthCalledWith(
          1,
          'dynamicsWebApi.fetch is being retried',
          {
            errorMessage: ERROR_MESSAGE,
            argArray: [
              DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
              FETCH_XML_AMI,
            ],
          },
        );
        expect(mockedLogger.warn).toHaveBeenNthCalledWith(
          2,
          'dynamicsWebApi.fetch is being retried',
          {
            errorMessage: ERROR_MESSAGE,
            argArray: [
              DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
              FETCH_XML_ADI_AMI_BAND_SCORES,
            ],
          },
        );
        expect(testResults.length).toEqual(0);
      });

      test('GIVEN an error with status 400 while fetching AMI records WHEN called THEN error is thrown', async () => {
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_AMI,
          )
          .mockRejectedValue(BAD_REQUEST_ERROR);

        try {
          await crm.getDvaAmiUnprocessedTestResults();
          fail();
        } catch (error) {
          expect(error).toBeInstanceOf(CrmError);
          expect((error as CrmError).message).toEqual('CrmClient::getDvaAmiUnprocessedTestResults: Failed to fetch unprocessed DVA AMI test results');
          expect((error as CrmError).cause).toEqual(BAD_REQUEST_ERROR);
          expect(mockedLogger.info).toHaveBeenCalledWith(
            'CrmClient::getDvaAmiUnprocessedTestResults: Trying to fetch unprocessed DVA AMI test results',
          );
          expect(mockedLogger.info).not.toBeCalledWith(
            'CrmClient::getDvaAmiUnprocessedTestResults: Successfully fetched 0 unprocessed test results',
          );
        }
      });

      test('GIVEN an error with status 400 while fetching band scores WHEN called THEN error is thrown', async () => {
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_AMI,
          )
          .mockResolvedValueOnce(FETCH_XML_EMPTY_RESPONSE);
        when(mockedDynamicsWebApi.fetch)
          .calledWith(
            DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
            FETCH_XML_ADI_AMI_BAND_SCORES,
          )
          .mockRejectedValue(BAD_REQUEST_ERROR);

        try {
          await crm.getDvaAmiUnprocessedTestResults();
          fail();
        } catch (error) {
          expect(error).toBeInstanceOf(CrmError);
          expect((error as CrmError).message).toEqual('CrmClient::getDvaAmiUnprocessedTestResults: Failed to fetch unprocessed DVA AMI test results');
          expect((error as CrmError).cause).toEqual(BAD_REQUEST_ERROR);
          expect(mockedLogger.info).toHaveBeenCalledWith(
            'CrmClient::getDvaAmiUnprocessedTestResults: Trying to fetch unprocessed DVA AMI test results',
          );
          expect(mockedLogger.info).not.toBeCalledWith(
            'CrmClient::getDvaAmiUnprocessedTestResults: Successfully fetched 0 unprocessed test results',
          );
        }
      });
    });
  });

  describe('updateTarsExportedStatus', () => {
    test('GIVEN list of test results WHEN called THEN no error thrown', async () => {
      const tarsExportedStatus = TarsExportedStatus.PROCESSED;
      const testResults = new Array(20).fill(testResult);
      mockedDynamicsWebApi.update.mockResolvedValue({});
      mockedDynamicsWebApi.executeBatch.mockResolvedValue([]);

      await crm.updateTarsExportedStatuses(testResults, tarsExportedStatus, new Date(TARS_EXPORTED_DATE));

      expect(mockedDynamicsWebApi.startBatch).toHaveBeenCalledTimes(1);
      expect(mockedDynamicsWebApi.executeBatch).toHaveBeenCalledTimes(1);
      expect(mockedDynamicsWebApi.update).toHaveBeenCalledTimes(20);
      expect(mockedDynamicsWebApi.update)
        .lastCalledWith(
          testResult.id,
          TarsTestResultModel.ENTITY_COLLECTION_NAME,
          {
            ftts_tarsexportedstatus: tarsExportedStatusToString(tarsExportedStatus),
            ftts_tarsexporteddate: TARS_EXPORTED_DATE,
          },
        );
    });

    test('GIVEN list of test results WHEN tarsExportedDate is undefined THEN ftts_tarsexporteddate is not set', async () => {
      const tarsExportedStatus = TarsExportedStatus.FAILED_VALIDATION;
      const testResults = new Array(20).fill(testResult);
      mockedDynamicsWebApi.update.mockResolvedValue({});
      mockedDynamicsWebApi.executeBatch.mockResolvedValue([]);

      await crm.updateTarsExportedStatuses(testResults, tarsExportedStatus);

      expect(mockedDynamicsWebApi.startBatch).toHaveBeenCalledTimes(1);
      expect(mockedDynamicsWebApi.executeBatch).toHaveBeenCalledTimes(1);
      expect(mockedDynamicsWebApi.update).toHaveBeenCalledTimes(20);
      expect(mockedDynamicsWebApi.update)
        .lastCalledWith(
          testResult.id,
          TarsTestResultModel.ENTITY_COLLECTION_NAME,
          {
            ftts_tarsexportedstatus: tarsExportedStatusToString(tarsExportedStatus),
            ftts_tarsexporteddate: undefined,
          },
        );
    });

    test('GIVEN id and status WHEN called and executeBatch fails THEN the call is retried', async () => {
      const testResults = new Array(20).fill(testResult);
      const tarsExportedStatus = TarsExportedStatus.FAILED_VALIDATION;
      mockedDynamicsWebApi.update.mockResolvedValue({});
      mockedDynamicsWebApi.executeBatch.mockRejectedValueOnce([ERROR]);
      mockedDynamicsWebApi.executeBatch.mockResolvedValueOnce([]);

      await crm.updateTarsExportedStatuses(testResults, tarsExportedStatus, new Date(TARS_EXPORTED_DATE));

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
        undefined,
      );
      expect(mockedLogger.warn).toHaveBeenNthCalledWith(
        3,
        'dynamicsWebApi.update is being retried',
        {
          argArray: [
            testResult.id,
            TarsTestResultModel.ENTITY_COLLECTION_NAME,
            {
              ftts_tarsexportedstatus: tarsExportedStatusToString(tarsExportedStatus),
              ftts_tarsexporteddate: TARS_EXPORTED_DATE,
            },
          ],
        },
      );
    });

    test('GIVEN id and status WHEN called and update fails with status 400 THEN error is thrown', async () => {
      const testResults = [testResult];
      const tarsExportedStatus = TarsExportedStatus.FAILED_VALIDATION;
      when(mockedDynamicsWebApi.update)
        .calledWith(
          testResult.id,
          TarsTestResultModel.ENTITY_COLLECTION_NAME,
          {
            ftts_tarsexportedstatus: tarsExportedStatusToString(tarsExportedStatus),
          },
        )
        .mockImplementationOnce(() => { throw new Error(BAD_REQUEST_ERROR.message); });

      try {
        await crm.updateTarsExportedStatuses(testResults, tarsExportedStatus, new Date(TARS_EXPORTED_DATE));
      } catch (error) {
        expect(error).toBeInstanceOf(CrmError);
        expect((error as CrmError).message).toEqual(ERROR_MESSAGE);
        expect((error as CrmError).cause).toEqual(new Error(BAD_REQUEST_ERROR.message));
        expect(mockedLogger.info).toHaveBeenCalledTimes(0);
      }
    });
  });

  describe('TARS - getTarsCorrespondingTestResults', () => {
    test('returns corresponding test results', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TarsTestResultModel.ENTITY_COLLECTION_NAME,
          expect.stringContaining(''),
        )
        .mockResolvedValue(FETCH_XML_EMPTY_RESPONSE);

      const result = await crm.getTarsCorrespondingTestResults('candidateId', CRMProductNumber.LGVHPT);

      expect(result).toStrictEqual([]);
      expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledWith(
        'ftts_testhistories',
        expect.stringContaining(''),
      );
      expect(mockedLogger.info).toHaveBeenCalledWith('CrmClient::getTarsCorrespondingTestResults: Successfully fetched 0 TARS corresponding test results');
    });

    test('in the event of an error, throw CRM error', async () => {
      const error = new Error('err');
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue('<fetch>...${statusPass}...${statusFail}...5...</fetch>');
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          TarsTestResultModel.ENTITY_COLLECTION_NAME,
          expect.stringContaining(''),
        )
        .mockRejectedValue(error);

      await expect(crm.getTarsCorrespondingTestResults('candidateId', CRMProductNumber.LGVHPT))
        .rejects.toThrow();

      expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledWith(
        'ftts_testhistories',
        expect.stringContaining(''),
      );
    });
  });

  describe('DVA - getDvaCorrespondingTestResults', () => {
    test('returns corresponding test results', async () => {
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          DvaLearnerTestResultModel.ENTITY_COLLECTION_NAME,
          expect.stringContaining(''),
        )
        .mockResolvedValue(FETCH_XML_EMPTY_RESPONSE);

      const result = await crm.getDvaCorrespondingTestResults('candidateId', CRMProductNumber.LGVHPT);

      expect(result).toStrictEqual([]);
      expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledWith(
        'ftts_testhistories',
        expect.stringContaining(''),
      );
    });

    test('in the event of an error, throw CRM error', async () => {
      const error = new Error('err');
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue('<fetch>...${statusPass}...${statusFail}...5...</fetch>');
      when(mockedDynamicsWebApi.fetch)
        .calledWith(
          DvaLearnerTestResultModel.ENTITY_COLLECTION_NAME,
          expect.stringContaining(''),
        )
        .mockRejectedValue(error);

      await expect(crm.getDvaCorrespondingTestResults('candidateId', CRMProductNumber.LGVHPT))
        .rejects.toThrow();

      expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledWith(
        'ftts_testhistories',
        expect.stringContaining(''),
      );
    });
  });
});

const testResult: TarsTestResultModel = {
  id: 'A300A729-31F2-4E05-B6E3-BC9B28B81CDB',
  testStatus: 'passed',
  title: Title.Mr,
  lastName: 'Smith',
  birthDate: '2000-01-23',
  bookingReference: 'booking_ref',
};
