import { CrmGenderCode, crmGenderCodeToGender, Gender } from '../../../../src/crm/testResults/genderCode';

describe('GenderCode', () => {
  describe('crmGenderCodeToGender', () => {
    test.each([
      [CrmGenderCode.FEMALE, Gender.F],
      [CrmGenderCode.MALE, Gender.M],
      [undefined, undefined],
    ])('for given %s returns %s', (crmGender: CrmGenderCode | undefined, expectedResult: Gender | undefined) => {
      expect(crmGenderCodeToGender(crmGender)).toBe(expectedResult);
    });
  });
});
