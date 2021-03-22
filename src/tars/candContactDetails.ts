import { TestResult } from '../crm/testResults/testResult';

export class CandContactDetails {
  public AddressLine1?: string;

  public AddressLine2?: string;

  public AddressLine3?: string;

  public AddressLine4?: string;

  public AddressLine5?: string;

  public PostCode?: string;

  constructor(crmTestResult: TestResult) {
    this.AddressLine1 = crmTestResult.addressLine1;
    this.AddressLine2 = crmTestResult.addressLine2;
    this.AddressLine3 = crmTestResult.addressLine3;
    this.AddressLine4 = crmTestResult.addressLine4;
    this.AddressLine5 = crmTestResult.addressLine5;
    this.PostCode = crmTestResult.postCode;
  }
}
