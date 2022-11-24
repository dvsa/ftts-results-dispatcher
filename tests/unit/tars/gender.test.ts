import { Gender } from '../../../src/crm/testResults/genderCode';
import { Title } from '../../../src/crm/testResults/title';
import { resolveGender } from '../../../src/tars/gender';

describe('gender', () => {
  describe('resolveGender', () => {
    test.each([
      [Gender.M, Title.Mr, 'JONES061102W97YT', Gender.M, 'genderCode is populated'],
      [undefined, Title.Mr, undefined, undefined, 'without driverNumber'],
      [undefined, Title.Mr, 'JONES051102W97YT', Gender.F, 'driverNumber is DVSA and seventh character is 5'],
      [undefined, Title.Mr, 'JONES061102W97YT', Gender.F, 'driverNumber is DVSA and seventh character is 6'],
      [undefined, Title.Mr, 'JONES001102W97YT', Gender.M, 'driverNumber is DVSA and seventh character is 0'],
      [undefined, Title.Mr, 'JONES011102W97YT', Gender.M, 'driverNumber is DVSA and seventh character is 1'],
      [undefined, Title.Mr, 'JONES031102W97YT', undefined, 'driverNumber is DVSA and seventh character is 3'],
      [undefined, Title.Mr, '78294667', Gender.M, 'driverNumber is DVA and title is Mr'],
      [undefined, Title.Mrs, '78294667', Gender.F, 'driverNumber is DVA and title is Mrs'],
      [undefined, Title.Miss, '78294667', Gender.F, 'driverNumber is DVA and title is Miss'],
      [undefined, Title.Dr, '78294667', undefined, 'driverNumber is DVA and title is Dr'],
      [undefined, Title.Mrs, '123', undefined, 'driverNumber is weird'],
      [undefined, Title.Mrs, undefined, undefined, 'driverNumber is undefined'],
      [undefined, undefined, undefined, undefined, 'everything is undefined'],
    ])('for given genderCode %s, title %s and driverNumber %s return %s (%s)', (
      genderCode: Gender | undefined,
      title: Title | undefined,
      driverNumber: string | undefined,
      expectedResult: string | undefined,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _description: string,
    ) => {
      expect(resolveGender(title, genderCode, driverNumber)).toEqual(expectedResult);
    });
  });
});
