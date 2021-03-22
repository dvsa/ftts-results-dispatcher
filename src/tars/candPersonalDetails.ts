import { TestResult } from '../crm/testResults/testResult';
import { formatDate, DateFormat } from '../utils/formatDate';

export class CandPersonalDetails {
  public DriverNumber?: string;

  public ADIPRN?: string;

  public Gender?: Gender;

  public Title: string;

  public Surname: string;

  public Forenames?: string;

  public DOB?: string;

  constructor(crmTestResult: TestResult) {
    this.DriverNumber = crmTestResult.driverNumber;
    this.ADIPRN = crmTestResult.adiprn;
    this.Gender = this.resolveGender(crmTestResult.genderCode, crmTestResult.title);
    this.Title = crmTestResult.title;
    this.Surname = crmTestResult.lastName;
    this.Forenames = crmTestResult.firstName;
    this.DOB = formatDate(new Date(crmTestResult.birthDate), DateFormat['dd/MM/yyyy']);
  }

  private resolveGender(crmGender: string | undefined, crmTitle: string): Gender | undefined {
    if (crmGender) {
      if (crmGender === 'Male') return Gender.M;
      if (crmGender === 'Female') return Gender.F;
    }
    if (crmTitle === 'Mr') return Gender.M;
    if (['Mrs', 'Miss', 'Ms'].includes(crmTitle)) return Gender.F;
    return undefined;
  }
}

export enum Gender {
  M = 'M',
  F = 'F',
}
