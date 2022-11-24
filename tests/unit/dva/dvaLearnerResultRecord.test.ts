import { DvaLearnerTestResultModel } from '../../../src/crm/testResults/dvaLearnerTestResultModel';
import { CRMProductNumber } from '../../../src/crm/testResults/productNumber';
import { Title } from '../../../src/crm/testResults/title';
import { DvaLearnerResultRecord } from '../../../src/dva/dvaLearnerResultRecord';
import { DvaTestCode, DvaTestResult, DvaTitle } from '../../../src/dva/enums';

describe('DvaResultRecord', () => {
  let mockCrmTestResult: DvaLearnerTestResultModel;
  beforeEach(() => {
    mockCrmTestResult = {
      id: 'resultId',
      certificateNumber: '123456789',
      testStatus: 'Pass',
      textLanguage: 'English',
      startTime: '2021-06-19T14:15:30.000Z',
      addressLine1: 'addressLine1',
      addressLine2: 'addressLine2',
      addressLine3: 'addressLine3',
      addressLine4: 'addressLine4',
      addressLine5: 'addressLine5',
      postCode: 'T1 3ST',
      title: Title.Mr,
      otherTitle: undefined,
      firstName: 'Testy',
      lastName: 'McTesterFace🔥🔥🔥🔥🔥',
      birthDate: '1990-06-23',
      driverNumber: '17794131',
      productId: CRMProductNumber.CAR,
      bookingReference: 'B-000-000-001',
    };
  });

  test('GIVEN crmTestResult WHEN constructor invoked THEN correctly mapped DvaResultRecord is created', () => {
    const record = new DvaLearnerResultRecord(mockCrmTestResult);

    expect(record).toMatchObject({
      startChar: 'I',
      driverNumber: '17794131',
      firstInitial: 'T',
      title: DvaTitle.MR,
      surname: 'MCTESTERFACE',
      testCode: DvaTestCode.CAR,
      testDate: '19062021',
      certificateNumber: '123456789',
      testResult: DvaTestResult.PASS,
    });
  });

  test('GIVEN crmTestResult with otherTitle WHEN constructor invoked THEN correctly mapped DvaResultRecord is created', () => {
    mockCrmTestResult.title = undefined;
    mockCrmTestResult.otherTitle = 'Canon';

    const record = new DvaLearnerResultRecord(mockCrmTestResult);

    expect(record).toMatchObject(expect.objectContaining({
      title: DvaTitle.CANON,
    }));
  });

  test('GIVEN crmTestResult with undefined title and otherTitle WHEN constructor invoked THEN correctly mapped DvaResultRecord is created', () => {
    mockCrmTestResult.title = undefined;
    mockCrmTestResult.otherTitle = undefined;

    const record = new DvaLearnerResultRecord(mockCrmTestResult);

    expect(record).toMatchObject(expect.objectContaining({
      title: DvaTitle.OTHER,
    }));
  });

  test('GIVEN crmTestResult with test status FAIL WHEN constructor invoked THEN correctly mapped DvaResultRecord is created', () => {
    mockCrmTestResult.testStatus = 'Fail';

    const record = new DvaLearnerResultRecord(mockCrmTestResult);

    expect(record).toMatchObject(expect.objectContaining({
      certificateNumber: '000000000',
    }));
  });
});
