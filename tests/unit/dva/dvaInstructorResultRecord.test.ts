import { BaseTestResultModel } from '../../../src/crm/testResults/baseTestResultModel';
import { DvaInstructorResultRecord } from '../../../src/dva/dvaInstructorResultRecord';
import { DvaTestResult } from '../../../src/dva/enums';
import { mockAdiCrmResults } from '../../mocks/resultRecord.mock';

describe('DvaInstructorResultRecord', () => {
  test('GIVEN crmTestResult WHEN constructor invoked THEN correctly mapped DvaInstructorResultRecord is created', () => {
    const record = new DvaInstructorResultRecord(mockAdiCrmResults[0]);

    expect(record).toMatchObject({
      startChar: '1',
      paymentReceiptNumber: '0000000000321971',
      driverNumber: '12345678',
      surname: 'JONES',
      testDate: '05072021',
      testResult: DvaTestResult.PASS,
      addressLine1: 'MOCKADDRESSLINE1',
      addressLine2: 'MOCKADDRESSLINE2',
      addressLine3: 'MOCKADDRESSLINE3',
      addressLine4: 'MOCKADDRESSLINE4',
      addressLine5: 'MOCKADDRESSLINE5',
      postCode: 'B15 2AJ',
      hptScore: '021',
      bandScore1: '022',
      bandScore2: '023',
      bandScore3: '024',
      bandScore4: '018',
      overallScore: '087',
    });
  });

  test('GIVEN crmTestResult with exotic characters WHEN constructor invoked THEN correctly mapped DvaInstructorResultRecord is created', () => {
    const malformedRecord: BaseTestResultModel = {
      ...mockAdiCrmResults[0],
      lastName: 'J🔥onés',
      addressLine1: 'mock addréss l🔥ine1🔥',
      addressLine2: 'mock åddress li🔥ne2🔥',
      addressLine3: 'mock addréss 🔥line3🔥',
      addressLine4: 'mock addr🔥éss line4🔥',
      addressLine5: 'mock ad🔥dréss line5🔥',
      postCode: 'b15 2å🔥j',
    };

    const record = new DvaInstructorResultRecord(malformedRecord);

    expect(record).toMatchObject({
      startChar: '1',
      paymentReceiptNumber: '0000000000321971',
      driverNumber: '12345678',
      surname: 'JONES',
      testDate: '05072021',
      testResult: DvaTestResult.PASS,
      addressLine1: 'MOCK ADDRESS LINE1',
      addressLine2: 'MOCK ADDRESS LINE2',
      addressLine3: 'MOCK ADDRESS LINE3',
      addressLine4: 'MOCK ADDRESS LINE4',
      addressLine5: 'MOCK ADDRESS LINE5',
      postCode: 'B15 2AJ',
      hptScore: '021',
      bandScore1: '022',
      bandScore2: '023',
      bandScore3: '024',
      bandScore4: '018',
      overallScore: '087',
    });
  });

  test('GIVEN crmTestResult with no show WHEN constructor invoked THEN correctly mapped DvaInstructorResultRecord is created', () => {
    const noShowRecord: BaseTestResultModel = {
      ...mockAdiCrmResults[1],
      testStatus: DvaTestResult.NO_SHOW,
    };

    const record = new DvaInstructorResultRecord(noShowRecord);

    expect(record).toMatchObject({
      startChar: '1',
      paymentReceiptNumber: '0000000000321971',
      driverNumber: '65735683',
      surname: 'BRADLEY',
      testDate: '05072021',
      testResult: DvaTestResult.NO_SHOW,
      addressLine1: 'MOCKADDRESSLINE1',
      addressLine2: 'MOCKADDRESSLINE2',
      addressLine3: 'MOCKADDRESSLINE3',
      addressLine4: 'MOCKADDRESSLINE4',
      addressLine5: 'MOCKADDRESSLINE5',
      postCode: 'B15 2AJ',
      hptScore: '021',
      bandScore1: '010',
      bandScore2: '014',
      bandScore3: '008',
      bandScore4: '016',
      overallScore: '048',
    });
  });
});
