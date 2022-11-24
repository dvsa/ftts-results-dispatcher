/* eslint-disable no-param-reassign */
/* eslint-disable no-template-curly-in-string */
import fs from 'fs';
import { FetchXmlResponse } from 'dynamics-web-api';
import { proxifyWithRetryPolicy } from '@dvsa/cds-retry';
import { newDynamicsWebApi } from './dynamics/dynamicsWebApi';
import { TarsTestResultModel, TarsCrmTestResult } from './testResults/tarsTestResultModel';
import { logger } from '../observability/logger';
import config from '../config';
import { OrganisationType } from './testResults/organisationType';
import { Remit } from './testResults/remit';
import { TestStatus } from './testResults/testStatus';
import { CrmError } from './crmError';
import { TarsExportedStatus, tarsExportedStatusToString } from './testResults/tarsExportedStatus';
import { TarsResultType } from '../tars/result';
import { CRMProductNumber } from './testResults/productNumber';
import { DvaLearnerTestResultModel, DvaCrmTestResult } from './testResults/dvaLearnerTestResultModel';
import { DvaAdiCrmTestResult, DvaAmiCrmTestResult, DvaInstructorTestResultModel } from './testResults/dvaInstructorTestResultModel';
import { BaseTestResultModel } from './testResults/baseTestResultModel';
import { logWarnOnRetry } from './observability/logWarnOnRetry';
import {
  DvaCrmBandScoreAggregate,
  populateBandScores,
} from './testResults/dvaInstructorBandScore';
import { CorrespondingTestHistory } from './types/types';

export class CrmClient {
  constructor(
    private dynamicsWebApi: DynamicsWebApi,
    private unprocessedStatus: string,
  ) { }

  public async updateTarsExportedStatuses(testResults: BaseTestResultModel[], tarsExportedStatus: TarsExportedStatus, tarsExportedDate?: Date): Promise<void> {
    logger.info('CrmClient::updateTarsExportedStatuses: Attempting to update the status of our results');
    try {
      this.dynamicsWebApi.startBatch();
      testResults.forEach((testResult) => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.dynamicsWebApi.update(
          testResult.id,
          BaseTestResultModel.ENTITY_COLLECTION_NAME,
          {
            ftts_tarsexportedstatus: tarsExportedStatusToString(tarsExportedStatus),
            ftts_tarsexporteddate: tarsExportedDate ? tarsExportedDate.toISOString() : undefined,
          },
        );
      });
      await this.dynamicsWebApi.executeBatch();
      logger.info(`CrmClient::updateTarsExportedStatuses: Updated ${testResults.length} results`, {
        tarsExportedStatus: `${tarsExportedStatusToString(tarsExportedStatus)}`,
      });
    } catch (error) {
      throw new CrmError('CrmClient::updateTarsExportedStatuses: failed to update', error);
    }
  }

  public async getUnprocessedTestResults(): Promise<Array<TarsTestResultModel>> {
    try {
      logger.info('CrmClient::getUnprocessedTestResults: Trying to fetch unprocessed TARS test results');
      const fetchXml = await this.readFile('unprocessedTarsTestResults.xml');
      const testResults = await this.fetchTestResults(fetchXml, TarsResultType.RESULT);
      logger.debug('CrmClient::getUnprocessedTestResults: TARS Test Results Response from CRM', {
        testResults,
      });
      logger.info(`CrmClient::getUnprocessedTestResults: Successfully fetched ${testResults.length} TARS unprocessed test ${testResults.length === 1 ? 'result' : 'results'}`);
      return testResults;
    } catch (error) {
      throw new CrmError('CrmClient::getUnprocessedTestResults: Failed to fetch unprocessed TARS test results', error);
    }
  }

  public async getUnprocessedNegatedTestResults(): Promise<Array<TarsTestResultModel>> {
    try {
      logger.info('CrmClient::getUnprocessedNegatedTestResults: Trying to fetch unprocessed negated test results');
      const fetchXml = await this.readFile('unprocessedTarsNegatedTestResults.xml');
      const testResults = await this.fetchTestResults(fetchXml, TarsResultType.NEGATED_RESULT);
      logger.debug('CrmClient::getUnprocessedNegatedTestResults: TARS Negated Test Results Response from CRM', {
        testResults,
      });
      logger.info(`CrmClient::getUnprocessedNegatedTestResults: Successfully fetched ${testResults.length} unprocessed negated test ${testResults.length === 1 ? 'result' : 'results'}`);
      return testResults;
    } catch (error) {
      throw new CrmError('CrmClient::getUnprocessedNegatedTestResults: Failed to fetch unprocessed TARS negated test results', error);
    }
  }

  public getDvaAdiUnprocessedTestResults = async (): Promise<Array<DvaInstructorTestResultModel>> => {
    try {
      logger.info('CrmClient::getDvaAdiUnprocessedTestResults: Trying to fetch unprocessed DVA ADI test results');
      const fetchXml = await this.readFile('unprocessedDvaInstructorTestResults.xml');
      const fetchXmlBandScores = await this.readFile('unprocessedDvaInstructorBandScores.xml');
      logger.debug('CrmClient::getDvaAdiUnprocessedTestResults: fetched Xml', {
        fetchXml,
      });
      logger.debug('CrmClient::getDvaAdiUnprocessedTestResults: fetched band score xml', {
        fetchXmlBandScores,
      });

      const testResults = await this.fetchDvaInstructorTestResults(fetchXml, CRMProductNumber.ADIP1DVA);
      const bandScores = await this.fetchDvaInstructorBandScores(fetchXmlBandScores, CRMProductNumber.ADIP1DVA);
      populateBandScores(CRMProductNumber.ADIP1DVA, testResults, bandScores);

      logger.debug('CrmClient::getDvaAdiUnprocessedTestResults: DVA ADI Test Results Response from CRM', {
        testResults,
      });
      logger.info(`CrmClient::getDvaAdiUnprocessedTestResults: Successfully fetched ${testResults.length} unprocessed test ${testResults.length === 1 ? 'result' : 'results'}`);
      return testResults;
    } catch (error) {
      logger.error(error as Error, 'CrmClient::getDvaAdiUnprocessedTestResults: Failed to load unprocessed DVA ADI Test Results', {
        message: (error as Error)?.message,
      });
      throw new CrmError('CrmClient::getDvaAdiUnprocessedTestResults: Failed to fetch unprocessed DVA ADI test results', error);
    }
  };

  public getDvaAmiUnprocessedTestResults = async (): Promise<Array<DvaInstructorTestResultModel>> => {
    try {
      logger.info('CrmClient::getDvaAmiUnprocessedTestResults: Trying to fetch unprocessed DVA AMI test results');
      // same xml as ADI - at this point in time queries are identical
      const fetchXml = await this.readFile('unprocessedDvaInstructorTestResults.xml');
      const fetchXmlBandScores = await this.readFile('unprocessedDvaInstructorBandScores.xml');
      logger.debug('CrmClient::getDvaAmiUnprocessedTestResults: fetched xml', {
        fetchXml,
      });
      logger.debug('CrmClient::getDvaAmiUnprocessedTestResults: fetched band score xml', {
        fetchXmlBandScores,
      });

      const testResults = await this.fetchDvaInstructorTestResults(fetchXml, CRMProductNumber.AMIP1);
      const bandScores = await this.fetchDvaInstructorBandScores(fetchXmlBandScores, CRMProductNumber.AMIP1);
      populateBandScores(CRMProductNumber.AMIP1, testResults, bandScores);

      logger.debug('CrmClient::getDvaAmiUnprocessedTestResults: DVA AMI test results response from CRM', {
        testResults,
      });
      logger.info(`CrmClient::getDvaAmiUnprocessedTestResults: Successfully fetched ${testResults.length} unprocessed test ${testResults.length === 1 ? 'result' : 'results'}`);
      return testResults;
    } catch (error) {
      logger.error(error as Error, 'CrmClient::getDvaAmiUnprocessedTestResults: Failed to load unprocessed DVA AMI test results', {
        message: (error as Error)?.message,
      });
      throw new CrmError('CrmClient::getDvaAmiUnprocessedTestResults: Failed to fetch unprocessed DVA AMI test results', error);
    }
  };

  public getDvaUnprocessedTestResults = async (): Promise<Array<DvaLearnerTestResultModel>> => {
    try {
      logger.info('CrmClient::getDvaUnprocessedTestResults: Trying to fetch unprocessed DVA Learner test results');
      const fetchXml = await this.readFile('unprocessedDvaTestResults.xml');
      logger.debug('CrmClient::getDvaUnprocessedTestResults: fetched Xml', {
        fetchXml,
      });
      const testResults = await this.fetchDvaTestResults(fetchXml, TarsResultType.RESULT);
      logger.debug('CrmClient::getDvaUnprocessedTestResults: DVA Learner Test Results Response from CRM', {
        testResults,
      });
      logger.info(`CrmClient::getDvaUnprocessedTestResults: Successfully fetched ${testResults.length} unprocessed test ${testResults.length === 1 ? 'result' : 'results'}`);
      return testResults;
    } catch (error) {
      logger.error(error as Error, 'CrmClient::getDvaUnprocessedTestResults: Failed to load unprocessed DVA Learner Test Results', {
        message: (error as Error)?.message,
      });
      throw new CrmError('CrmClient::getDvaUnprocessedTestResults: Failed to fetch unprocessed DVA Learner test results', error);
    }
  };

  public async getTarsCorrespondingTestResults(candidateId: string, correspondingProductNumber: CRMProductNumber): Promise<CorrespondingTestHistory[]> {
    try {
      logger.info('CrmClient::getTarsCorrespondingTestResults: Trying to fetch TARS corresponding results');
      const fetchXml = await this.readFile('getCorrespondingTarsTestResults.xml');
      logger.debug('CrmClient::getTarsCorrespondingTestResults: fetched Xml', {
        fetchXml,
        correspondingProductNumber,
      });

      const testResults = await this.fetchCorrespondingTarsResults(fetchXml, candidateId, correspondingProductNumber);
      logger.debug('CrmClient::getTarsCorrespondingTestResults: Corresponding TARS Test Results Response from CRM', {
        testResults,
      });
      logger.info(`CrmClient::getTarsCorrespondingTestResults: Successfully fetched ${testResults.length} TARS corresponding test ${testResults.length === 1 ? 'result' : 'results'}`);
      return testResults;
    } catch (error) {
      logger.error(error as Error, 'CrmClient::getTarsCorrespondingTestResults: Failed to load corresponding TARS Test Results', {
        message: (error as Error)?.message,
      });
      throw new CrmError('CrmClient::getTarsCorrespondingTestResults: Failed to fetch corresponding TARS test results', error);
    }
  }

  public getDvaCorrespondingTestResults = async (candidateId: string, correspondingProductNumber: CRMProductNumber): Promise<CorrespondingTestHistory[]> => {
    try {
      logger.info('CrmClient::getDvaCorrespondingTestResults: Trying to fetch DVA corresponding results');
      const fetchXml = await this.readFile('getCorrespondingDvaTestResults.xml');
      logger.debug('CrmClient::getDvaCorrespondingTestResults: fetched Xml', {
        fetchXml,
        correspondingProductNumber,
      });

      const testResults = await this.fetchCorrespondingDvaResults(fetchXml, candidateId, correspondingProductNumber);
      logger.debug('CrmClient::getDvaCorrespondingTestResults: Corresponding DVA Test Results Response from CRM', {
        testResults,
      });
      logger.info(`CrmClient::getDvaCorrespondingTestResults: Successfully fetched ${testResults.length} corresponding DVA test ${testResults.length === 1 ? 'result' : 'results'}`);
      return testResults;
    } catch (error) {
      logger.error(error as Error, 'CrmClient::getDvaCorrespondingTestResults: Failed to load corresponding DVA Learner Test Results', {
        message: (error as Error)?.message,
      });
      throw new CrmError('CrmClient::getDvaCorrespondingTestResults: Failed to fetch corresponding DVA Learner test results', error);
    }
  };

  private async readFile(fileName: string): Promise<string> {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return fs.promises.readFile(`./src/crm/testResults/${fileName}`, 'utf-8');
  }

  private async fetchTestResults(fetchXml: string, resultType: TarsResultType): Promise<Array<TarsTestResultModel>> {
    const { fetchCount } = config.tars;
    if (resultType === TarsResultType.RESULT) {
      fetchXml = fetchXml
        .replace(/\${statusPass}/g, String(TestStatus.PASS))
        .replace('${statusFail}', String(TestStatus.FAIL));
    } else if (resultType === TarsResultType.NEGATED_RESULT) {
      fetchXml = fetchXml.replace('${statusNegated}', String(TestStatus.NEGATED));
    }
    const finalFetchXml = fetchXml
      .replace('${fetchCount}', fetchCount)
      .replace('${tarsExportedStatus}', this.unprocessedStatus)
      .replace('${ihttc}', String(OrganisationType.IHTTC))
      .replace('${ihttcHeadOffice}', String(OrganisationType.IHTTC_HEAD_OFFICE))
      .replace('${dvsaEngland}', String(Remit.DVSA_ENGLAND))
      .replace('${dvsaScotland}', String(Remit.DVSA_SCOTLAND))
      .replace('${dvsaWales}', String(Remit.DVSA_WALES));
    logger.debug('CrmClient::fetchTestResults: Fetching TARS Test Results Raw Request', {
      entity: TarsTestResultModel.ENTITY_COLLECTION_NAME,
      fetchXml: finalFetchXml,
    });
    const fetchXmlResponse: FetchXmlResponse<TarsCrmTestResult> = await this.dynamicsWebApi.fetch(
      TarsTestResultModel.ENTITY_COLLECTION_NAME,
      finalFetchXml,
    );
    return this.processFetchXmlResponse(fetchXmlResponse);
  }

  private async fetchDvaInstructorTestResults(fetchXml: string, testType: CRMProductNumber.ADIP1DVA | CRMProductNumber.AMIP1): Promise<Array<DvaInstructorTestResultModel>> {
    const { fetchCount } = config.dva;

    fetchXml = fetchXml
      .replace(/\${statusPass}/g, String(TestStatus.PASS))
      .replace(/\${statusFail}/g, String(TestStatus.FAIL))
      .replace(/\${statusNotStarted}/g, String(TestStatus.NOT_STARTED))
      .replace('${fetchCount}', fetchCount)
      .replace('${tarsExportedStatus}', this.unprocessedStatus)
      .replace('${productNumberAdiOrAmi}', String(testType))
      .replace('${dva}', String(Remit.DVA));

    const instructorTestTypeLiteral = testType === CRMProductNumber.ADIP1DVA ? 'ADI' : 'AMI';
    logger.debug(`CrmClient::fetchDvaInstructorTestResults: Fetching DVA ${instructorTestTypeLiteral} Test Results Raw Request`, {
      entity: DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
      fetchXml,
    });
    const fetchXmlResponse: FetchXmlResponse<DvaCrmTestResult> = await this.dynamicsWebApi.fetch(
      DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
      fetchXml,
    );
    logger.debug(`CrmClient::fetchDvaInstructorTestResults: DVA ${instructorTestTypeLiteral} Test Results Raw Response`, {
      entity: DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
      fetchXmlResponse,
    });
    return this.processDvaInstructorFetchXmlResponse(fetchXmlResponse);
  }

  private async fetchDvaInstructorBandScores(fetchXml: string, testType: CRMProductNumber.ADIP1DVA | CRMProductNumber.AMIP1): Promise<DvaCrmBandScoreAggregate[]> {
    const { fetchCount } = config.dva;

    fetchXml = fetchXml
      .replace('${fetchCount}', fetchCount)
      .replace('${tarsExportedStatus}', this.unprocessedStatus)
      .replace(/\${statusPass}/g, String(TestStatus.PASS))
      .replace(/\${statusFail}/g, String(TestStatus.FAIL))
      .replace(/\${statusNotStarted}/g, String(TestStatus.NOT_STARTED))
      .replace('${productNumberAdiOrAmi}', String(testType))
      .replace('${dva}', String(Remit.DVA));

    const instructorTestTypeLiteral = testType === CRMProductNumber.ADIP1DVA ? 'ADI' : 'AMI';
    logger.debug(`CrmClient::fetchDvaInstructorBandScores: Fetching DVA ${instructorTestTypeLiteral} band scores request`, {
      entity: DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
      fetchXml,
    });
    const fetchXmlResponse: FetchXmlResponse<DvaCrmBandScoreAggregate> = await this.dynamicsWebApi.fetch(
      DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
      fetchXml,
    );
    logger.debug(`CrmClient::fetchDvaInstructorBandScores: DVA ${instructorTestTypeLiteral} band scores response`, {
      entity: DvaInstructorTestResultModel.ENTITY_COLLECTION_NAME,
      fetchXmlResponse,
    });

    return (fetchXmlResponse.value) ? fetchXmlResponse.value : [];
  }

  private async fetchDvaTestResults(fetchXml: string, resultType: TarsResultType): Promise<Array<DvaLearnerTestResultModel>> {
    const { fetchCount } = config.dva;
    if (resultType === TarsResultType.RESULT) {
      fetchXml = fetchXml
        .replace(/\${statusPass}/g, String(TestStatus.PASS))
        .replace(/\${statusFail}/g, String(TestStatus.FAIL));
    } else if (resultType === TarsResultType.NEGATED_RESULT) {
      fetchXml = fetchXml.replace('${statusNegated}', String(TestStatus.NEGATED));
    }
    fetchXml = fetchXml.replace('${fetchCount}', fetchCount)
      .replace('${tarsExportedStatus}', this.unprocessedStatus)
      .replace('${productNumberCar}', String(CRMProductNumber.CAR))
      .replace('${productNumberMotorcycle}', String(CRMProductNumber.MOTORCYCLE))
      .replace('${productNumberLGVMC}', String(CRMProductNumber.LGVMC))
      .replace('${productNumberLGVHPT}', String(CRMProductNumber.LGVHPT))
      .replace('${productNumberLGVCPC}', String(CRMProductNumber.LGVCPC))
      .replace('${productNumberLGVCPCConversion}', String(CRMProductNumber.LGVCPCC))
      .replace('${productNumberPCVMC}', String(CRMProductNumber.PCVMC))
      .replace('${productNumberPCVHPT}', String(CRMProductNumber.PCVHPT))
      .replace('${productNumberPCVCPC}', String(CRMProductNumber.PCVCPC))
      .replace('${productNumberPCVCPCConversion}', String(CRMProductNumber.PCVCPCC))
      .replace('${productNumberTaxi}', String(CRMProductNumber.TAXI))
      .replace('${dva}', String(Remit.DVA));

    logger.debug('CrmClient::fetchDvaTestResults: Fetching DVA Learner Test Results Raw Request', {
      entity: DvaLearnerTestResultModel.ENTITY_COLLECTION_NAME,
      fetchXml,
    });
    const fetchXmlResponse: FetchXmlResponse<DvaCrmTestResult> = await this.dynamicsWebApi.fetch(
      DvaLearnerTestResultModel.ENTITY_COLLECTION_NAME,
      fetchXml,
    );
    logger.debug('CrmClient::fetchDvaTestResults: DVA Learner Test Results Raw Response', {
      entity: DvaLearnerTestResultModel.ENTITY_COLLECTION_NAME,
      fetchXmlResponse,
    });
    return this.processDvaFetchXmlResponse(fetchXmlResponse);
  }

  private async fetchCorrespondingTarsResults(fetchXml: string, candidateId: string, productNumber: CRMProductNumber): Promise<CorrespondingTestHistory[]> {
    const { fetchCount } = config.tars;
    const finalFetchXml = fetchXml
      .replace(/\${statusPass}/g, String(TestStatus.PASS))
      .replace('${candidateId}', candidateId)
      .replace('${correspondingProductNumber}', String(productNumber))
      .replace('${fetchCount}', fetchCount)
      .replace('${ihttc}', String(OrganisationType.IHTTC))
      .replace('${ihttcHeadOffice}', String(OrganisationType.IHTTC_HEAD_OFFICE))
      .replace('${dvsaEngland}', String(Remit.DVSA_ENGLAND))
      .replace('${dvsaScotland}', String(Remit.DVSA_SCOTLAND))
      .replace('${dvsaWales}', String(Remit.DVSA_WALES));

    logger.debug('CrmClient::fetchCorrespondingTarsResults: Fetching Corresponding TARS Test Results Raw Request', {
      entity: TarsTestResultModel.ENTITY_COLLECTION_NAME,
      fetchXml: finalFetchXml,
    });
    const fetchXmlResponse: FetchXmlResponse<CorrespondingTestHistory> = await this.dynamicsWebApi.fetch(
      TarsTestResultModel.ENTITY_COLLECTION_NAME,
      finalFetchXml,
    );
    logger.debug('CrmClient::fetchCorrespondingTarsResults: Corresponding TARS Test Results Raw Response', {
      entity: DvaLearnerTestResultModel.ENTITY_COLLECTION_NAME,
      fetchXmlResponse,
    });

    if (!fetchXmlResponse.value) {
      return [];
    }
    return fetchXmlResponse.value;
  }

  private async fetchCorrespondingDvaResults(fetchXml: string, candidateId: string, productNumber: CRMProductNumber): Promise<CorrespondingTestHistory[]> {
    const { fetchCount } = config.dva;
    fetchXml = fetchXml
      .replace(/\${statusPass}/g, String(TestStatus.PASS))
      .replace('${candidateId}', candidateId)
      .replace('${correspondingProductNumber}', String(productNumber))
      .replace('${fetchCount}', String(fetchCount))
      .replace('${dva}', String(Remit.DVA));

    logger.debug('CrmClient::fetchCorrespondingDvaResults: Fetching Corresponding DVA Test Results Raw Request', {
      entity: DvaLearnerTestResultModel.ENTITY_COLLECTION_NAME,
      fetchXml,
    });
    const fetchXmlResponse: FetchXmlResponse<CorrespondingTestHistory> = await this.dynamicsWebApi.fetch(
      DvaLearnerTestResultModel.ENTITY_COLLECTION_NAME,
      fetchXml,
    );
    logger.debug('CrmClient::fetchCorrespondingDvaResults: Corresponding DVA Learner Test Results Raw Response', {
      entity: DvaLearnerTestResultModel.ENTITY_COLLECTION_NAME,
      fetchXmlResponse,
    });

    if (!fetchXmlResponse.value) {
      return [];
    }
    return fetchXmlResponse.value;
  }

  private processFetchXmlResponse(fetchXmlResponse: FetchXmlResponse<TarsCrmTestResult>): TarsTestResultModel[] {
    if (!fetchXmlResponse.value) {
      return [];
    }
    return fetchXmlResponse.value.map((fttsTestResult: TarsCrmTestResult) => new TarsTestResultModel(fttsTestResult));
  }

  private processDvaFetchXmlResponse(fetchXmlResponse: FetchXmlResponse<DvaCrmTestResult>): DvaLearnerTestResultModel[] {
    if (!fetchXmlResponse.value) {
      return [];
    }
    return fetchXmlResponse.value.map((fttsDvaTestResult: DvaCrmTestResult) => new DvaLearnerTestResultModel(fttsDvaTestResult));
  }

  private processDvaInstructorFetchXmlResponse(fetchXmlResponse: FetchXmlResponse<DvaAdiCrmTestResult> | FetchXmlResponse<DvaAmiCrmTestResult>): DvaInstructorTestResultModel[] {
    if (!fetchXmlResponse.value) {
      return [];
    }
    return fetchXmlResponse.value.map((fttsDvaTestResult: DvaAdiCrmTestResult | DvaAmiCrmTestResult) => new DvaInstructorTestResultModel(fttsDvaTestResult));
  }
}

export const newCrmClient = (unprocessedStatus: string): CrmClient => {
  const retryPolicy = {
    retries: 10,
    backoff: 300,
    exponentialFactor: 1.2,
  };
  const dynamicsWebApi = newDynamicsWebApi();
  proxifyWithRetryPolicy(dynamicsWebApi, logWarnOnRetry, retryPolicy);
  return new CrmClient(dynamicsWebApi, unprocessedStatus);
};
