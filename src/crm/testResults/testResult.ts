import { TestStatus } from './testStatus';
import { Title } from './title';
import { GenderCode } from './genderCode';
import { TextLanguage } from './textLanguage';

export interface FttsTestResult {
  ftts_testhistoryid: string;
  ftts_certificatenumber?: string;
  ftts_teststatus: number;
  ftts_textlanguage?: number;
  ftts_starttime?: Date;
  'person.address1_line1'?: string;
  'person.address1_line2'?: string;
  'person.address1_line3'?: string;
  'person.address1_city'?: string;
  'person.address1_county'?: string;
  'person.address1_postalcode'?: string;
  'person.ftts_adiprn'?: string;
  'person.gendercode'?: number;
  'person.ftts_title': number;
  'person.firstname'?: string;
  'person.lastname': string;
  'person.birthdate': string;
  'person.licence.ftts_licence'?: string;
  'product.ftts_examseriescode'?: string;
  'bookingproduct.ftts_reference': string;
}

export class TestResult {
  public static readonly ENTITY_COLLECTION_NAME = 'ftts_testhistories';

  public id: string;

  public certificateNumber?: string;

  public testStatus: string;

  public textLanguage?: string;

  public startTime?: string;

  public addressLine1?: string;

  public addressLine2?: string;

  public addressLine3?: string;

  public addressLine4?: string;

  public addressLine5?: string;

  public postCode?: string;

  public adiprn?: string;

  public genderCode?: string;

  public title: string;

  public firstName?: string;

  public lastName: string;

  public birthDate: string;

  public driverNumber?: string;

  public examSeriesCode?: string;

  public bookingReference: string;

  constructor(fttsTestResult: FttsTestResult) {
    this.id = fttsTestResult.ftts_testhistoryid;
    this.certificateNumber = fttsTestResult.ftts_certificatenumber;
    this.testStatus = TestStatus.toString(fttsTestResult.ftts_teststatus);
    this.textLanguage = TextLanguage.toString(fttsTestResult.ftts_textlanguage);
    this.startTime = fttsTestResult.ftts_starttime
      ? fttsTestResult.ftts_starttime.toISOString()
      : undefined;
    this.addressLine1 = fttsTestResult['person.address1_line1'];
    this.addressLine2 = fttsTestResult['person.address1_line2'];
    this.addressLine3 = fttsTestResult['person.address1_line3'];
    this.addressLine4 = fttsTestResult['person.address1_city'];
    this.addressLine5 = fttsTestResult['person.address1_county'];
    this.postCode = fttsTestResult['person.address1_postalcode'];
    this.adiprn = fttsTestResult['person.ftts_adiprn'];
    this.genderCode = GenderCode.toString(fttsTestResult['person.gendercode']);
    this.title = Title.toString(fttsTestResult['person.ftts_title']);
    this.firstName = fttsTestResult['person.firstname'];
    this.lastName = fttsTestResult['person.lastname'];
    this.birthDate = fttsTestResult['person.birthdate'];
    this.driverNumber = fttsTestResult['person.licence.ftts_licence'];
    this.examSeriesCode = fttsTestResult['product.ftts_examseriescode'];
    this.bookingReference = fttsTestResult['bookingproduct.ftts_reference'];
  }
}
