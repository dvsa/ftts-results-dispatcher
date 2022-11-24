import { AzureFunction, Context } from '@azure/functions';
import { mocked } from 'ts-jest/utils';
import http from 'http';
import { nonHttpTriggerContextWrapper } from '@dvsa/azure-logger';
import { MaybeMocked } from 'ts-jest/dist/utils/testing';
import { mockedContext } from './context.mock';
import { mockedLogger } from './logger.mock';
import { BusinessTelemetryEvent } from '../../src/observability/logger';

mocked(nonHttpTriggerContextWrapper).mockImplementation(
  async (fn: AzureFunction, context: Context) => fn(context),
);

export const describeEgressFiltering = (fn: AzureFunction, mockedTimerTrigger: MaybeMocked<AzureFunction>): jest.EmptyFunction => (): void => {
  mockedTimerTrigger.mockImplementation(async () => {
    await new Promise((resolve) => {
      http.get('http://www.google.com', (res) => {
        resolve(res.statusCode);
      });
    });
  });

  test('GIVEN a non-whitelisted url call WHEN made THEN the proper event is logged', async () => {
    await fn(mockedContext);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvent.NOT_WHITELISTED_URL_CALL,
      'Unrecognised address - host www.google.com port 80',
      {
        host: 'www.google.com',
        port: 80,
      },
    );
  });
};
