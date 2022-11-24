import { getUnprocessedStatus } from '../../../src/utils/getUnprocessedStatus';
import { mockedConfig } from '../../mocks/config.mock';

jest.mock('../../../src/config');

describe('getUnprocessedStatus', () => {
  const mockedStatus = 'mocked-status';
  mockedConfig.common.exportedStatus = mockedStatus;

  test.each([
    ['some', 'some'],
    [undefined, mockedStatus],
  ])('GIVEN statusFromContext WHEN getUnprocessedStatus THEN return correct value', (givenStatus: string | undefined, expectedStatus: string) => {
    expect(getUnprocessedStatus(givenStatus)).toStrictEqual(expectedStatus);
  });
});
