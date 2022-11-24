import { TextLanguage } from '../../../src/crm/testResults/textLanguage';
import { TestStatus } from '../../../src/crm/testResults/testStatus';
import { TarsTestResultModel, TarsCrmTestResult } from '../../../src/crm/testResults/tarsTestResultModel';
import { Result, LanguageId, TarsTestResult } from '../../../src/tars/result';

describe('Result', () => {
  test('GIVEN crmTestResult WHEN invoking constractor THEN creating proper Result instance', () => {
    const crmTestResult1 = prepareCrmTestResult(TextLanguage.ENGLISH, TestStatus.FAIL);
    const crmTestResult2 = prepareCrmTestResult(TextLanguage.WELSH, TestStatus.PASS);

    const actualResult1 = new Result(crmTestResult1);
    const actualResult2 = new Result(crmTestResult2);

    verifyResult(actualResult1, LanguageId.ENG, TarsTestResult.F);
    verifyResult(actualResult2, LanguageId.WEL, TarsTestResult.P);
  });
});

function prepareCrmTestResult(
  textLanguage: TextLanguage,
  testStatus: TestStatus,
): TarsTestResultModel {
  const fttTestResult = {
    ftts_certificatenumber: '999999999',
    ftts_teststatus: testStatus,
    ftts_textlanguage: textLanguage,
    ftts_starttime: new Date('2020-06-26'),
    'product.ftts_examseriescode': 'LGV',
    'bookingproduct.ftts_reference': 'C-000-016-055-04',
  } as TarsCrmTestResult;
  return new TarsTestResultModel(fttTestResult);
}

function verifyResult(
  actualResult: Result,
  languageId: LanguageId,
  tarsTestResult: TarsTestResult,
): void {
  expect(actualResult.SessionPaperID).toEqual('000016055');
  expect(actualResult.ExamSeriesCode).toEqual('LGV');
  expect(actualResult.LanguageID).toEqual(languageId);
  expect(actualResult.Version).toEqual(1);
  expect(actualResult.FormName).toEqual('LGV');
  expect(actualResult.CertificateNumber).toEqual('999999999');
  expect(actualResult.TestSessionDate).toEqual('26/06/2020');
  expect(actualResult.TestResult).toEqual(tarsTestResult);
}
