import { TestStatus } from '../../../../src/crm/testResults/testStatus';

describe('TestStatus', () => {
  describe('toString', () => {
    test('GIVEN a test status WHEN called THEN the test status\'s string representation is returned', () => {
      expect(TestStatus.toString(TestStatus.FAIL)).toEqual('Fail');
      expect(TestStatus.toString(TestStatus.PASS)).toEqual('Pass');
      expect(TestStatus.toString(TestStatus.NOT_STARTED)).toEqual('Not started');
      expect(TestStatus.toString(TestStatus.INCOMPLETE)).toEqual('Incomplete');
      expect(TestStatus.toString(TestStatus.NEGATED)).toEqual('Negated');
    });
  });
});
