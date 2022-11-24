import { DvaTestResult } from './enums';
import { formatDate, DateFormat } from '../utils/formatDate';
import { cleanString } from '../utils/string';
import { BaseTestResultModel } from '../crm/testResults/baseTestResultModel';

export class DvaBaseResultRecord {
  public startChar: string;

  public driverNumber: string;

  public surname: string;

  public testDate: string;

  public testResult: DvaTestResult;

  constructor(crmTestResult: BaseTestResultModel) {
    this.startChar = 'I';
    this.driverNumber = crmTestResult.driverNumber as string;
    this.surname = cleanString(crmTestResult.lastName).toUpperCase();
    this.testResult = this.resolveTestResult(crmTestResult.testStatus);
    this.testDate = formatDate(new Date(crmTestResult.startTime as string), DateFormat.ddmmyyyy) as string;
  }

  private resolveTestResult(testStatus: string): DvaTestResult {
    switch (testStatus) {
      case 'Fail':
        return DvaTestResult.FAIL;
      case 'Pass':
        return DvaTestResult.PASS;
      default:
        return DvaTestResult.NO_SHOW;
    }
  }
}
