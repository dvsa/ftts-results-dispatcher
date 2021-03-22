import { GenderCode } from '../../../src/crm/testResults/genderCode';
import { Title } from '../../../src/crm/testResults/title';
import { TestResult, FttsTestResult } from '../../../src/crm/testResults/testResult';
import { CandPersonalDetails, Gender } from '../../../src/tars/candPersonalDetails';

describe('CandPersonalDetails', () => {
  test('GIVEN crmTestResult with known gender WHEN invoking constractor THEN creating proper CandPersonalDetails instance', () => {
    const crmTestResult1 = prepareCrmTestResult(Title.Dr, GenderCode.FEMALE);
    const crmTestResult2 = prepareCrmTestResult(Title.Dr, GenderCode.MALE);

    const actualCandPersonalDetails1 = new CandPersonalDetails(crmTestResult1);
    const actualCandPersonalDetails2 = new CandPersonalDetails(crmTestResult2);

    verifyCandPersonalDetails(actualCandPersonalDetails1, Gender.F, 'Dr');
    verifyCandPersonalDetails(actualCandPersonalDetails2, Gender.M, 'Dr');
  });

  test('GIVEN crmTestResult with unknown gender WHEN invoking constractor THEN creating proper CandPersonalDetails instance', () => {
    const crmTestResult1 = prepareCrmTestResult(Title.Dr, GenderCode.UNKNOWN);
    const crmTestResult2 = prepareCrmTestResult(Title.Miss, GenderCode.UNKNOWN);
    const crmTestResult3 = prepareCrmTestResult(Title.Mr, GenderCode.UNKNOWN);
    const crmTestResult4 = prepareCrmTestResult(Title.Mrs, GenderCode.UNKNOWN);
    const crmTestResult5 = prepareCrmTestResult(Title.Ms, GenderCode.UNKNOWN);
    const crmTestResult6 = prepareCrmTestResult(Title.Mx, GenderCode.UNKNOWN);

    const actualCandPersonalDetails1 = new CandPersonalDetails(crmTestResult1);
    const actualCandPersonalDetails2 = new CandPersonalDetails(crmTestResult2);
    const actualCandPersonalDetails3 = new CandPersonalDetails(crmTestResult3);
    const actualCandPersonalDetails4 = new CandPersonalDetails(crmTestResult4);
    const actualCandPersonalDetails5 = new CandPersonalDetails(crmTestResult5);
    const actualCandPersonalDetails6 = new CandPersonalDetails(crmTestResult6);

    verifyCandPersonalDetails(actualCandPersonalDetails1, undefined, 'Dr');
    verifyCandPersonalDetails(actualCandPersonalDetails2, Gender.F, 'Miss');
    verifyCandPersonalDetails(actualCandPersonalDetails3, Gender.M, 'Mr');
    verifyCandPersonalDetails(actualCandPersonalDetails4, Gender.F, 'Mrs');
    verifyCandPersonalDetails(actualCandPersonalDetails5, Gender.F, 'Ms');
    verifyCandPersonalDetails(actualCandPersonalDetails6, undefined, 'Mx');
  });
});

function prepareCrmTestResult(
  title: Title,
  genderCode?: GenderCode,
): TestResult {
  const fttTestResult = {
    'person.ftts_adiprn': 'adiprn',
    'person.gendercode': genderCode,
    'person.ftts_title': title,
    'person.firstname': 'Ellie',
    'person.lastname': 'Walker',
    'person.birthdate': '1989-03-12',
    'person.licence.ftts_licence': '20406011',
  } as FttsTestResult;
  return new TestResult(fttTestResult);
}

function verifyCandPersonalDetails(
  actualCandPersonalDetails: CandPersonalDetails,
  gender: Gender | undefined,
  title: string,
): void {
  expect(actualCandPersonalDetails.DriverNumber).toEqual('20406011');
  expect(actualCandPersonalDetails.ADIPRN).toEqual('adiprn');
  expect(actualCandPersonalDetails.Gender).toEqual(gender);
  expect(actualCandPersonalDetails.Title).toEqual(title);
  expect(actualCandPersonalDetails.Surname).toEqual('Walker');
  expect(actualCandPersonalDetails.Forenames).toEqual('Ellie');
  expect(actualCandPersonalDetails.DOB).toEqual('12/03/1989');
}
