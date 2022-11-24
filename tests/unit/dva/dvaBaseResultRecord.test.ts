import { BaseTestResultModel } from '../../../src/crm/testResults/baseTestResultModel';
import { DvaBaseResultRecord } from '../../../src/dva/dvaBaseResultRecord';
import { DvaTestResult } from '../../../src/dva/enums';
import { mockAdiCrmResults } from '../../mocks/resultRecord.mock';

describe('DvaBaseResultRecord', () => {
  test('GIVEN crmTestResult WHEN constructor invoked THEN correctly mapped dvaBaseResultRecord is created', () => {
    const record = new DvaBaseResultRecord(mockAdiCrmResults[0]);

    expect(record).toMatchObject({
      startChar: 'I',
      driverNumber: '12345678',
      surname: 'JONES',
      testDate: '05072021',
      testResult: DvaTestResult.PASS,
    });
  });

  test('GIVEN crmTestResult with exotic character WHEN constructor invoked THEN correctly mapped dvaBaseResultRecord is created', () => {
    const malformedRecord: BaseTestResultModel = {
      ...mockAdiCrmResults[0],
      lastName: 'J🔥onés',
    };
    const record = new DvaBaseResultRecord(malformedRecord);

    expect(record).toMatchObject({
      startChar: 'I',
      driverNumber: '12345678',
      surname: 'JONES',
      testDate: '05072021',
      testResult: DvaTestResult.PASS,
    });
  });

  test('GIVEN crmTestResult with no show WHEN constructor invoked THEN correctly mapped dvaBaseResultRecord is created', () => {
    const malformedRecord: BaseTestResultModel = {
      ...mockAdiCrmResults[0],
      testStatus: 'Not started',
    };
    const record = new DvaBaseResultRecord(malformedRecord);

    expect(record).toMatchObject({
      startChar: 'I',
      driverNumber: '12345678',
      surname: 'JONES',
      testDate: '05072021',
      testResult: DvaTestResult.NO_SHOW,
    });
  });
});
