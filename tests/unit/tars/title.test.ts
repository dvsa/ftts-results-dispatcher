import { Gender } from '../../../src/crm/testResults/genderCode';
import { Title } from '../../../src/crm/testResults/title';
import { resolveTitle } from '../../../src/tars/title';

describe('title', () => {
  describe('resolveTitle', () => {
    test.each([
      [Title.Mr, Gender.F, Title.Mr],
      [undefined, Gender.M, Title.Mr],
      [undefined, Gender.F, Title.Ms],
      [undefined, undefined, undefined],
    ])('for given title %s and genderCode %s return %s', (
      title: Title | undefined,
      genderCode: Gender | undefined,
      expectedResult: Title | undefined,
    ) => {
      expect(resolveTitle(title, genderCode)).toEqual(expectedResult);
    });
  });
});
