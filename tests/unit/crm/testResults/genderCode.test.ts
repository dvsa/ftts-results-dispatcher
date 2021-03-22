import { GenderCode } from '../../../../src/crm/testResults/genderCode';

describe('GenderCode', () => {
  describe('toString', () => {
    test('GIVEN a gender code WHEN called THEN the gender code\'s string representation is returned', () => {
      expect(GenderCode.toString(GenderCode.MALE)).toEqual('Male');
      expect(GenderCode.toString(GenderCode.FEMALE)).toEqual('Female');
      expect(GenderCode.toString(GenderCode.UNKNOWN)).toEqual('Unknown');
      expect(GenderCode.toString()).toBeUndefined();
    });
  });
});
