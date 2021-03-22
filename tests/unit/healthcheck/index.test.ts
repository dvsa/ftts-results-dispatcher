import { HttpRequest, AzureFunction, Context } from '@azure/functions';
import { httpTriggerContextWrapper } from '@dvsa/azure-logger';
import { Role } from '@dvsa/ftts-role-validation';
import { mocked } from 'ts-jest/utils';
import { index } from '../../../src/healthcheck';
import { httpTrigger } from '../../../src/healthcheck/httpTrigger';
import { mockedContext } from '../../mocks/context.mock';
import { describeWithRolesValidation } from '../../mocks/withRolesValidation.describe';
import { describeEgressFiltering } from '../../mocks/egressFiltering.describe';

jest.mock('@dvsa/ftts-role-validation');
jest.mock('../../../src/healthcheck/httpTrigger');
jest.mock('../../../src/observability/logger');

mocked(httpTriggerContextWrapper).mockImplementation(
  async (fn: AzureFunction, context: Context) => fn(context),
);

const mockedHttpTrigger = mocked(httpTrigger);

describe('index', () => {
  const mockedRequest = {} as HttpRequest;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('withRolesValidation', describeWithRolesValidation(index, [Role.OPERATIONS_HEALTHCHECK_READ]));

  describe('egressFiltering', describeEgressFiltering(index, mockedHttpTrigger));

  describe('GIVEN httpTrigger', () => {
    test('WHEN called THEN the call is first wrapped into httpTriggerContextWrapper', async () => {
      await index(mockedContext, mockedRequest);

      expect(httpTriggerContextWrapper).toHaveBeenCalledTimes(1);
      expect(httpTriggerContextWrapper).toHaveBeenCalledWith(
        expect.any(Function),
        mockedContext,
        mockedRequest,
      );
    });
  });
});
