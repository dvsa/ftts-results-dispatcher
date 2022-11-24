import { mocked } from 'ts-jest/utils';
import { when } from 'jest-when';
import { mockedContext } from '../../mocks/context.mock';
import { mockedLogger } from '../../mocks/logger.mock';
import { timerTrigger } from '../../../src/fileHousekeeping/timerTrigger';
import fileHousekepping from '../../../src/fileHousekeeping/fileHousekeeping';

jest.mock('../../../src/fileHousekeeping/fileHousekeeping');
const mockedFileHousekepping = mocked(fileHousekepping, true);

describe('fileHousekeppingTimerTrigger', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GIVEN time trigger context WHEN invoke fileHousekeppingTimerTrigger THEN fileHousekepping function is called', async () => {
    await timerTrigger(mockedContext);

    expect(mockedFileHousekepping).toHaveBeenCalledTimes(1);
  });

  test('GIVEN time trigger context WHEN invoke fileHousekeppingTimerTrigger THEN throw an error', async () => {
    const error = new Error('fileHousekeppingTimerTrigger failed');
    when(mockedFileHousekepping)
      .calledWith()
      .mockRejectedValue(error);

    try {
      await timerTrigger(mockedContext);
      fail();
    } catch (actualError) {
      expect(actualError).toEqual(error);
      expect(mockedFileHousekepping).toHaveBeenCalledTimes(1);
      expect(mockedLogger.error).toHaveBeenCalledTimes(1);
    }
  });
});
