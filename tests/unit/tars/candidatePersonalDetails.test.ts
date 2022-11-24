import { CrmGenderCode, Gender } from '../../../src/crm/testResults/genderCode';
import { TarsCrmTestResult, TarsTestResultModel } from '../../../src/crm/testResults/tarsTestResultModel';
import { CrmTitle } from '../../../src/crm/testResults/title';
import { CandPersonalDetails } from '../../../src/tars/candPersonalDetails';

describe('CandPersonalDetails', () => {
  test('GIVEN crmTestResult with known gender WHEN invoking constractor THEN creating proper CandPersonalDetails instance', () => {
    const crmTestResult1 = prepareCrmTestResult(CrmTitle.Dr, CrmGenderCode.FEMALE);
    const crmTestResult2 = prepareCrmTestResult(CrmTitle.Dr, CrmGenderCode.MALE);

    const actualCandPersonalDetails1 = new CandPersonalDetails(crmTestResult1);
    const actualCandPersonalDetails2 = new CandPersonalDetails(crmTestResult2);

    verifyCandPersonalDetails(actualCandPersonalDetails1, Gender.F, 'Dr');
    verifyCandPersonalDetails(actualCandPersonalDetails2, Gender.M, 'Dr');
  });
});

function prepareCrmTestResult(
  title: CrmTitle,
  genderCode?: CrmGenderCode,
): TarsTestResultModel {
  const fttTestResult = {
    'person.ftts_adiprn': 'adiprn',
    'person.gendercode': genderCode,
    'person.ftts_title': title,
    'person.firstname': 'Ellie',
    'person.lastname': 'Walker',
    'person.birthdate': '1989-03-12',
    'person.licence.ftts_licence': '20406011',
  } as TarsCrmTestResult;
  return new TarsTestResultModel(fttTestResult);
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
