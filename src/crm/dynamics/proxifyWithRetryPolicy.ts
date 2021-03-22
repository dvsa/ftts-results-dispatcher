/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/unbound-method */
import DynamicsWebApi from 'dynamics-web-api';
import { cdsRetry } from '@dvsa/cds-retry';
import { logger } from '../../observability/logger';

export const proxifyWithRetryPolicy = (
  dynamicsWebApi: DynamicsWebApi,
  retryPolicy?: object,
): void => {
  let batchArray: Array<any>;
  let onRetryArray: Array<any>;
  let executingBatch: boolean;
  const handler = (warnMessage: string): ProxyHandler<any> => ({
    apply: (target, thisArg, argArray): any => {
      if (executingBatch) {
        return target.apply(thisArg, argArray);
      }
      if (batchArray !== undefined) {
        batchArray.push(
          () => target.apply(thisArg, argArray),
        );
        onRetryArray.push(
          () => logger.warn(
            warnMessage,
            {
              argArray,
            },
          ),
        );
      } else {
        return cdsRetry(() => target.apply(thisArg, argArray), retryPolicy, (error) => {
          logger.warn(
            warnMessage,
            {
              errorMessage: error.message,
              argArray,
            },
          );
        });
      }
    },
  });
  dynamicsWebApi.startBatch = new Proxy(
    dynamicsWebApi.startBatch,
    {
      apply: (target, thisArg, argArray): any => {
        executingBatch = false;
        batchArray = [];
        batchArray.push(
          () => target.apply(thisArg, argArray),
        );
        onRetryArray = [];
        onRetryArray.push(
          () => logger.warn('dynamicsWebApi.startBatch is being retried'),
        );
      },
    },
  );
  dynamicsWebApi.update = new Proxy(
    dynamicsWebApi.update,
    handler('dynamicsWebApi.update is being retried'),
  );
  dynamicsWebApi.fetch = new Proxy(
    dynamicsWebApi.fetch,
    handler('dynamicsWebApi.fetch is being retried'),
  );
  dynamicsWebApi.executeBatch = new Proxy(
    dynamicsWebApi.executeBatch,
    {
      apply: (target, thisArg, argArray): any => cdsRetry(() => {
        executingBatch = true;
        if (batchArray !== undefined) {
          batchArray.forEach((f) => f());
        }
        return target.apply(thisArg, argArray);
      }, retryPolicy, (error) => {
        logger.warn(
          'dynamicsWebApi.executeBatch is being retried',
          {
            errorMessage: error.message,
          },
        );
        if (onRetryArray !== undefined) {
          onRetryArray.forEach((f) => f());
        }
      }),
    },
  );
};
