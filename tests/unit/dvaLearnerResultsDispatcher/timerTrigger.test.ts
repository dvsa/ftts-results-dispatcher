import { mocked } from 'ts-jest/utils';
import { mock } from 'jest-mock-extended';
import { when } from 'jest-when';
import { newDvaResultsDispatcher, DvaResultsDispatcher } from '../../../src/dva/dvaResultsDispatcher';
import { dvaLearnerHeaderTemplate, dvaLearnerRecordTemplate } from '../../../src/dva/templates/dvaLearnerTemplate';
import { timerTrigger } from '../../../src/dvaLearnerResultsDispatcher/timerTrigger';
import { mockedContext } from '../../mocks/context.mock';
import { handleDvaError } from '../../../src/error/handleError';
import { DvaTestType } from '../../../src/dva/enums';
import { validateDvaLearnerTestResult } from '../../../src/validation/validateSchema';
import config from '../../../src/config';

jest.mock('../../../src/dva/dvaResultsDispatcher');
const mockedNewResultsDispatcher = mocked(newDvaResultsDispatcher);
const mockedResultsDispatcher = mock<DvaResultsDispatcher>();

jest.mock('../../../src/error/handleError');
const mockedDvaHandleError = mocked(handleDvaError);

describe('DvaLearnerResultsDispatcherTimerTrigger', () => {
  beforeEach(() => {
    const exportedStatus = 'something';
    mockedContext.bindingData.dvaLearnerResultsDispatcher = exportedStatus;
    when(mockedNewResultsDispatcher).calledWith(
      dvaLearnerHeaderTemplate,
      dvaLearnerRecordTemplate,
      exportedStatus,
    ).mockReturnValue(mockedResultsDispatcher);
  });
  test('GIVEN request context WHEN invoking function THEN processing test results', async () => {
    await timerTrigger(mockedContext);

    expect(mockedResultsDispatcher.dispatchResults).toHaveBeenCalledTimes(1);
    expect(mockedResultsDispatcher.dispatchResults).toHaveBeenCalledWith(
      DvaTestType.LEARNER,
      config.dva.metadataFilename.dva,
      validateDvaLearnerTestResult,
    );
  });

  test('GIVEN request context WHEN processing test results failed THEN handle error', async () => {
    const error = new Error('error msg');
    mockedResultsDispatcher.dispatchResults.mockRejectedValue(error);

    await timerTrigger(mockedContext);

    expect(mockedDvaHandleError).toBeCalledWith(error);
  });
});
