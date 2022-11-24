import { DvaInstructorTestResultModel } from '../crm/testResults/dvaInstructorTestResultModel';
import { zeroFill, cleanString } from '../utils/string';
import { DvaBaseResultRecord } from './dvaBaseResultRecord';

export class DvaInstructorResultRecord extends DvaBaseResultRecord {
  public paymentReceiptNumber: string;

  public addressLine1: string;

  public addressLine2?: string;

  public addressLine3?: string;

  public addressLine4?: string;

  public addressLine5?: string;

  public postCode: string;

  public bandScore1: string;

  public bandScore2: string;

  public bandScore3: string;

  public bandScore4: string;

  public overallScore: string;

  public hptScore: string;

  constructor(crmTestResult: DvaInstructorTestResultModel) {
    super(crmTestResult);
    this.startChar = '1';
    this.paymentReceiptNumber = zeroFill(crmTestResult.paymentReferenceNumber as string, 16);
    this.addressLine1 = cleanString(crmTestResult.addressLine1 as string).toUpperCase();
    this.addressLine2 = cleanString(crmTestResult.addressLine2 ?? '').toUpperCase();
    this.addressLine3 = cleanString(crmTestResult.addressLine3 ?? '').toUpperCase();
    this.addressLine4 = cleanString(crmTestResult.addressLine4 ?? '').toUpperCase();
    this.addressLine5 = cleanString(crmTestResult.addressLine5 ?? '').toUpperCase();
    this.postCode = cleanString(crmTestResult.postCode as string).toUpperCase();
    // default all MCQ band scores to 0 in the exceptional case they have not been populated - file should still be sent
    this.bandScore1 = zeroFill(crmTestResult.bandScore1 || 0, 3);
    this.bandScore2 = zeroFill(crmTestResult.bandScore2 || 0, 3);
    this.bandScore3 = zeroFill(crmTestResult.bandScore3 || 0, 3);
    this.bandScore4 = zeroFill(crmTestResult.bandScore4 || 0, 3);
    this.overallScore = zeroFill(crmTestResult.overallScore || 0, 3);
    this.hptScore = zeroFill(crmTestResult.hptScore as number, 3);
  }
}
