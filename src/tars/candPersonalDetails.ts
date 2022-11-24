// Allowing non-null assertion as there are fields we know we have validated and so know are defined at this point
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Gender } from '../crm/testResults/genderCode';
import { TarsTestResultModel } from '../crm/testResults/tarsTestResultModel';
import { Title } from '../crm/testResults/title';
import { DateFormat, formatDate } from '../utils/formatDate';

export class CandPersonalDetails {
  public DriverNumber: string;

  public ADIPRN?: string;

  public Gender?: Gender;

  public Title: Title;

  public Surname: string;

  public Forenames: string;

  public DOB: string;

  constructor(crmTestResult: TarsTestResultModel) {
    this.DriverNumber = crmTestResult.driverNumber!;
    this.ADIPRN = crmTestResult.adiprn;
    this.Gender = crmTestResult.genderCode;
    this.Title = crmTestResult.title!;
    this.Surname = crmTestResult.lastName;
    this.Forenames = crmTestResult.firstName!;
    this.DOB = formatDate(new Date(crmTestResult.birthDate), DateFormat['dd/MM/yyyy'])!;
  }
}
