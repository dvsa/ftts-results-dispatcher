import { TestStatus } from '../../../src/crm/testResults/testStatus';
import { TextLanguage } from '../../../src/crm/testResults/textLanguage';
import { GenderCode } from '../../../src/crm/testResults/genderCode';
import { Title } from '../../../src/crm/testResults/title';
import { Result, TarsResultType } from '../../../src/tars/result';
import { CandPersonalDetails } from '../../../src/tars/candPersonalDetails';
import { CandContactDetails } from '../../../src/tars/candContactDetails';
import { Candidate } from '../../../src/tars/candidate';
import { TestResult, FttsTestResult } from '../../../src/crm/testResults/testResult';

describe('Candidate', () => {
  test('GIVEN crmTestResult and result type RESULT WHEN invoking constractor THEN creating proper Candidate instance with Result', () => {
    const crmTestResult = prepareCrmTestResult();

    const actualCandidate = new Candidate(crmTestResult, TarsResultType.RESULT);

    expect(actualCandidate.CandContactDetails).toBeInstanceOf(CandContactDetails);
    expect(actualCandidate.CandPersonalDetails).toBeInstanceOf(CandPersonalDetails);
    expect(actualCandidate.Result).toBeInstanceOf(Result);
    expect(actualCandidate.NegatedResult).toBeUndefined();
  });

  test('GIVEN crmTestResult and result type NEGATED_RESULT WHEN invoking constractor THEN creating proper Candidate instance with NegatedResult', () => {
    const crmTestResult = prepareCrmTestResult();
    crmTestResult.testStatus = JSON.stringify(TestStatus.NEGATED);

    const actualCandidate = new Candidate(crmTestResult, TarsResultType.NEGATED_RESULT);

    expect(actualCandidate.CandContactDetails).toBeInstanceOf(CandContactDetails);
    expect(actualCandidate.CandPersonalDetails).toBeInstanceOf(CandPersonalDetails);
    expect(actualCandidate.NegatedResult).toBeInstanceOf(Result);
    expect(actualCandidate.Result).toBeUndefined();
  });
});

function prepareCrmTestResult(): TestResult {
  const fttTestResult = {
    'person.ftts_adiprn': 'adiprn',
    'person.gendercode': GenderCode.FEMALE,
    'person.ftts_title': Title.Dr,
    'person.firstname': 'Ellie',
    'person.lastname': 'Walker',
    'person.birthdate': '1989-03-12',
    'person.licence.ftts_licence': '20406011',
    ftts_certificatenumber: '999999999',
    ftts_teststatus: TestStatus.PASS,
    ftts_textlanguage: TextLanguage.ENGLISH,
    ftts_starttime: new Date('2020-06-26'),
    'product.ftts_examseriescode': 'LGV',
    'bookingproduct.ftts_reference': 'C-000-016-055-04',
  } as FttsTestResult;
  return new TestResult(fttTestResult);
}
