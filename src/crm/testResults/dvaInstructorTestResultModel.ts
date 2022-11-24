import { BaseCrmTestResult, BaseTestResultModel } from './baseTestResultModel';

export interface DvaAdiCrmTestResult extends BaseCrmTestResult {
  'bookingproduct.ftts_paymentreferencenumber'?: string;
  ftts_hpttotalscore?: number;
}

export interface DvaAmiCrmTestResult extends BaseCrmTestResult {
  'bookingproduct.ftts_paymentreferencenumber'?: string;
  ftts_hpttotalscore?: number;
}

export class DvaInstructorTestResultModel extends BaseTestResultModel {
  public paymentReferenceNumber?: string;

  public hptScore?: number;

  public bandScore1?: number;

  public bandScore2?: number;

  public bandScore3?: number;

  public bandScore4?: number;

  public overallScore?: number;

  constructor(fttsTestResult: DvaAdiCrmTestResult | DvaAmiCrmTestResult) {
    super(fttsTestResult);
    this.paymentReferenceNumber = fttsTestResult['bookingproduct.ftts_paymentreferencenumber'];
    this.hptScore = fttsTestResult.ftts_hpttotalscore;
  }
}
