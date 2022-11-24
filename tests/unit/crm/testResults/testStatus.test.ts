import { TestStatus, testStatusToString } from '../../../../src/crm/testResults/testStatus';

describe('TestStatus', () => {
  describe('toString', () => {
    test('GIVEN a test status WHEN called THEN the test status\'s string representation is returned', () => {
      expect(testStatusToString(TestStatus.FAIL)).toEqual('Fail');
      expect(testStatusToString(TestStatus.PASS)).toEqual('Pass');
      expect(testStatusToString(TestStatus.NOT_STARTED)).toEqual('Not started');
      expect(testStatusToString(TestStatus.INCOMPLETE)).toEqual('Incomplete');
      expect(testStatusToString(TestStatus.NEGATED)).toEqual('Negated');
    });
  });
});
