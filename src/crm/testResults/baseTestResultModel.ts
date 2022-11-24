import { CrmGenderCode } from './genderCode';
import { CRMProductNumber } from './productNumber';
import { testStatusToString } from './testStatus';
import { textLanguageToString } from './textLanguage';
import { CrmTitle, crmTitleToTitle, Title } from './title';

export interface BaseCrmTestResult {
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
  'person.contactid'?: string;
  'person.ftts_adiprn'?: string;
  'person.gendercode'?: CrmGenderCode;
  'person.ftts_title'?: CrmTitle;
  'person.ftts_othertitle'?: string;
  'person.firstname'?: string;
  'person.lastname': string;
  'person.birthdate': string;
  'person.licence.ftts_licence'?: string;
  'product.ftts_examseriescode'?: string;
  'product.productnumber'?: string;
  'bookingproduct.ftts_reference': string;
}

export class BaseTestResultModel {
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

  public title?: Title;

  public otherTitle?: string;

  public firstName?: string;

  public lastName: string;

  public birthDate: string;

  public driverNumber?: string;

  public bookingReference: string;

  public productNumber?: CRMProductNumber;

  public personId?: string;

  constructor(fttsTestResult: BaseCrmTestResult) {
    this.id = fttsTestResult.ftts_testhistoryid;
    this.certificateNumber = fttsTestResult.ftts_certificatenumber;
    this.testStatus = testStatusToString(fttsTestResult.ftts_teststatus);
    this.textLanguage = textLanguageToString(fttsTestResult.ftts_textlanguage);
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
    this.title = crmTitleToTitle(fttsTestResult['person.ftts_title']);
    this.otherTitle = fttsTestResult['person.ftts_othertitle'];
    this.firstName = fttsTestResult['person.firstname'];
    this.lastName = fttsTestResult['person.lastname'];
    this.birthDate = fttsTestResult['person.birthdate'];
    this.driverNumber = fttsTestResult['person.licence.ftts_licence'];
    this.bookingReference = fttsTestResult['bookingproduct.ftts_reference'];
    this.personId = fttsTestResult['person.contactid'];
    this.productNumber = fttsTestResult['product.productnumber'] as CRMProductNumber;
  }
}
