import { DvaAdiCrmTestResult, DvaInstructorTestResultModel } from '../../../../src/crm/testResults/dvaInstructorTestResultModel';
import { CrmGenderCode } from '../../../../src/crm/testResults/genderCode';
import { TestStatus } from '../../../../src/crm/testResults/testStatus';
import { TextLanguage } from '../../../../src/crm/testResults/textLanguage';
import { CrmTitle, Title } from '../../../../src/crm/testResults/title';

describe('dvaInstructorTestResultModel', () => {
  let mockCrmTestResult: DvaAdiCrmTestResult;
  beforeEach(() => {
    mockCrmTestResult = {
      'person.address1_line1': 'mockAddressLine1',
      'person.address1_line2': 'mockAddressLine2',
      'person.address1_line3': 'mockAddressLine3',
      'person.address1_city': 'mockAddressLine4',
      'person.address1_county': 'mockAddressLine5',
      'person.address1_postalcode': 'mockPostalCode',
      'person.ftts_adiprn': 'mockAdiPrn',
      'person.gendercode': CrmGenderCode.MALE,
      'person.ftts_title': CrmTitle.Mr,
      'person.firstname': 'mockFirstName',
      'person.lastname': 'mockLastName',
      'person.licence.ftts_licence': '123456789',
      ftts_certificatenumber: 'mock certificate number',
      ftts_testhistoryid: 'mockID',
      ftts_teststatus: TestStatus.PASS,
      'bookingproduct.ftts_paymentreferencenumber': 'mockPaymentRef',
      'person.birthdate': '2000-11-10',
      'bookingproduct.ftts_reference': 'mockBookingRef',
      ftts_hpttotalscore: 21,
      ftts_starttime: new Date('12-12-2020'),
      ftts_textlanguage: TextLanguage.ENGLISH,
    };
  });

  test('GIVEN crmTestResult WHEN constructor invoked THEN correctly mapped dvaInstructorTestResultModel is created', () => {
    const record = new DvaInstructorTestResultModel(mockCrmTestResult);

    const expectedTestResult: DvaInstructorTestResultModel = {
      addressLine1: 'mockAddressLine1',
      addressLine2: 'mockAddressLine2',
      addressLine3: 'mockAddressLine3',
      addressLine4: 'mockAddressLine4',
      addressLine5: 'mockAddressLine5',
      postCode: 'mockPostalCode',
      adiprn: 'mockAdiPrn',
      title: Title.Mr,
      firstName: 'mockFirstName',
      lastName: 'mockLastName',
      driverNumber: '123456789',
      certificateNumber: 'mock certificate number',
      id: 'mockID',
      testStatus: 'Pass',
      paymentReferenceNumber: 'mockPaymentRef',
      birthDate: '2000-11-10',
      bookingReference: 'mockBookingRef',
      hptScore: 21,
      startTime: new Date('12-12-2020').toISOString(),
      textLanguage: 'English',
    };

    expect(record).toMatchObject(expectedTestResult);
  });
});
