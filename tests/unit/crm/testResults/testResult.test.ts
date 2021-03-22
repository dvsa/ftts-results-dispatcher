import {
  FttsTestResult, TestResult,
} from '../../../../src/crm/testResults/testResult';
import { TestStatus } from '../../../../src/crm/testResults/testStatus';
import { Title } from '../../../../src/crm/testResults/title';
import { TextLanguage } from '../../../../src/crm/testResults/textLanguage';
import { GenderCode } from '../../../../src/crm/testResults/genderCode';

describe('TestResult', () => {
  describe('new TestResult', () => {
    test('GIVEN a FttsTestResult WHEN called THEN a new TestResult is created', () => {
      const fttsTestResult: FttsTestResult = {
        ftts_testhistoryid: 'aede37df-73d1-ea11-a813-000d3a7f128d',
        ftts_certificatenumber: '999999999',
        ftts_teststatus: TestStatus.FAIL,
        ftts_textlanguage: 1,
        ftts_starttime: new Date('2020-06-26'),
        'person.address1_line1': 'adress line 1',
        'person.address1_line2': 'address line 2',
        'person.address1_line3': 'address line 3',
        'person.address1_city': 'address city',
        'person.address1_county': 'address county',
        'person.address1_postalcode': 'postalcode',
        'person.ftts_adiprn': 'adiprn',
        'person.gendercode': 2,
        'person.ftts_title': Title.Miss,
        'person.firstname': 'Ellie',
        'person.lastname': 'Walker',
        'person.birthdate': '1989-03-12',
        'person.licence.ftts_licence': '20406011',
        'product.ftts_examseriescode': 'LGV',
        'bookingproduct.ftts_reference': 'C-000-016-055-04',
      };

      const testResult: TestResult = new TestResult(
        fttsTestResult,
      );

      expect(testResult.certificateNumber).toEqual(fttsTestResult.ftts_certificatenumber);
      expect(testResult.testStatus).toEqual(TestStatus.toString(fttsTestResult.ftts_teststatus));
      expect(testResult.textLanguage).toEqual(TextLanguage.toString(fttsTestResult.ftts_textlanguage));
      expect(testResult.startTime).toEqual('2020-06-26T00:00:00.000Z');
      expect(testResult.addressLine1).toEqual(fttsTestResult['person.address1_line1']);
      expect(testResult.addressLine2).toEqual(fttsTestResult['person.address1_line2']);
      expect(testResult.addressLine3).toEqual(fttsTestResult['person.address1_line3']);
      expect(testResult.addressLine4).toEqual(fttsTestResult['person.address1_city']);
      expect(testResult.addressLine5).toEqual(fttsTestResult['person.address1_county']);
      expect(testResult.postCode).toEqual(fttsTestResult['person.address1_postalcode']);
      expect(testResult.adiprn).toEqual(fttsTestResult['person.ftts_adiprn']);
      expect(testResult.genderCode).toEqual(GenderCode.toString(fttsTestResult['person.gendercode']));
      expect(testResult.title).toEqual(Title.toString(fttsTestResult['person.ftts_title']));
      expect(testResult.firstName).toEqual(fttsTestResult['person.firstname']);
      expect(testResult.lastName).toEqual(fttsTestResult['person.lastname']);
      expect(testResult.birthDate).toEqual(fttsTestResult['person.birthdate']);
      expect(testResult.driverNumber).toEqual(fttsTestResult['person.licence.ftts_licence']);
      expect(testResult.examSeriesCode).toEqual(fttsTestResult['product.ftts_examseriescode']);
      expect(testResult.bookingReference).toEqual(fttsTestResult['bookingproduct.ftts_reference']);
    });
  });
});
