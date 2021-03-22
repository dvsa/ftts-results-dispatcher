/* eslint-disable no-param-reassign */
/* eslint-disable no-template-curly-in-string */
import fs from 'fs';
import { FetchXmlResponse } from 'dynamics-web-api';
import { newDynamicsWebApi } from './dynamics/dynamicsWebApi';
import { TestResult, FttsTestResult } from './testResults/testResult';
import { logger } from '../observability/logger';
import config from '../config';
import { OrganisationType } from './testResults/organisationType';
import { Remit } from './testResults/remit';
import { TestStatus } from './testResults/testStatus';
import { CrmError } from './crmError';
import { TarsExportedStatus } from './testResults/tarsExportedStatus';
import { TarsResultType } from '../tars/result';
import { proxifyExecuteBatchWithCatchAndRethrow } from './dynamics/proxifyExecuteBatchWithCatchAndRethrow';
import { proxifyWithRetryPolicy } from './dynamics/proxifyWithRetryPolicy';

export class CrmClient {
  constructor(
    private dynamicsWebApi: DynamicsWebApi,
  ) { }

  public async updateTarsExportedStatuses(testResults: TestResult[], tarsExportedStatus: TarsExportedStatus): Promise<void> {
    try {
      this.dynamicsWebApi.startBatch();
      testResults.forEach((testResult) => {
        this.dynamicsWebApi.update(
          testResult.id,
          TestResult.ENTITY_COLLECTION_NAME,
          {
            ftts_tarsexportedstatus: TarsExportedStatus.toString(tarsExportedStatus),
          },
        );
      });
      await this.dynamicsWebApi.executeBatch();
      logger.info(
        `Updated ${testResults.length} results`,
        { tarsExportedStatus: `${TarsExportedStatus.toString(tarsExportedStatus)}` },
      );
    } catch (error) {
      throw new CrmError(error.message, error);
    }
  }

  public async getUnprocessedTestResults(): Promise<Array<TestResult>> {
    try {
      logger.info('Trying to fetch unprocessed test results');
      const fetchXml = await this.readFile('unprocessedTestResults.xml');
      const testResults = await this.fetchTestResults(fetchXml, TarsResultType.RESULT);
      logger.info(
        `Successfully fetched ${testResults.length} unprocessed test ${testResults.length === 1 ? 'result' : 'results'}`,
      );
      return testResults;
    } catch (error) {
      throw new CrmError('Failed to fetch unprocessed test results', error);
    }
  }

  public async getUnprocessedNegatedTestResults(): Promise<Array<TestResult>> {
    try {
      logger.info('Trying to fetch unprocessed negated test results');
      const fetchXml = await this.readFile('unprocessedNegatedTestResults.xml');
      const testResults = await this.fetchTestResults(fetchXml, TarsResultType.NEGATED_RESULT);
      logger.info(
        `Successfully fetched ${testResults.length} unprocessed negated test ${testResults.length === 1 ? 'result' : 'results'}`,
      );
      return testResults;
    } catch (error) {
      throw new CrmError('Failed to fetch unprocessed negated test results', error);
    }
  }

  private async readFile(fileName: string): Promise<string> {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return fs.promises.readFile(`./src/crm/testResults/${fileName}`, 'utf-8');
  }

  private async fetchTestResults(fetchXml: string, resultType: TarsResultType): Promise<Array<TestResult>> {
    const { fetchCount, tarsExportedStatus } = config.unprocessedTestResults;
    if (resultType === TarsResultType.RESULT) {
      fetchXml = fetchXml
        .replace(/\${statusPass}/g, String(TestStatus.PASS))
        .replace('${statusFail}', String(TestStatus.FAIL));
    } else if (resultType === TarsResultType.NEGATED_RESULT) {
      fetchXml = fetchXml.replace('${statusNegated}', String(TestStatus.NEGATED));
    }
    const fetchXmlResponse: FetchXmlResponse<FttsTestResult> = await this.dynamicsWebApi.fetch(
      TestResult.ENTITY_COLLECTION_NAME,
      fetchXml
        .replace('${fetchCount}', fetchCount)
        .replace('${tarsExportedStatus}', tarsExportedStatus)
        .replace('${ihttc}', String(OrganisationType.IHTTC))
        .replace('${ihttcHeadOffice}', String(OrganisationType.IHTTC_HEAD_OFFICE))
        .replace('${dvsaEngland}', String(Remit.DVSA_ENGLAND))
        .replace('${dvsaScotland}', String(Remit.DVSA_SCOTLAND))
        .replace('${dvsaWales}', String(Remit.DVSA_WALES)),
    );
    return this.processFetchXmlResponse(fetchXmlResponse);
  }

  private processFetchXmlResponse(fetchXmlResponse: FetchXmlResponse<FttsTestResult>): TestResult[] {
    if (!fetchXmlResponse.value) {
      return [];
    }
    return fetchXmlResponse.value.map(
      (fttsTestResult: FttsTestResult) => new TestResult(fttsTestResult),
    );
  }
}

export const newCrmClient = (retryPolicy?: object): CrmClient => {
  const dynamicsWebApi = newDynamicsWebApi();
  proxifyExecuteBatchWithCatchAndRethrow(dynamicsWebApi);
  proxifyWithRetryPolicy(dynamicsWebApi, retryPolicy);
  return new CrmClient(dynamicsWebApi);
};
