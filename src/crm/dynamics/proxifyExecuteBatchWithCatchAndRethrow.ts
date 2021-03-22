/* eslint-disable security/detect-object-injection */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import DynamicsWebApi from 'dynamics-web-api';

export const proxifyExecuteBatchWithCatchAndRethrow = (
  dynamicsWebApi: DynamicsWebApi,
): void => {
  dynamicsWebApi.executeBatch = new Proxy(
    dynamicsWebApi.executeBatch,
    {
      apply: (target, thisArg, argArray): any => target.apply(
        thisArg,
        argArray,
      ).catch((responses) => {
        // https://github.com/AleksandrRogov/DynamicsWebApi/releases/tag/v1.6.0
        for (let i = 0; i < responses.length; i++) {
          if (responses[i] instanceof Error) {
            // usually error will be at the same index as the failed request in the batch
            if (responses[i].error) {
              responses[i].code = responses[i].error.code;
              responses[i].message = responses[i].error.message;
            }
            responses[i].failedAt = i;
            throw responses[i];
          }
        }
        throw new Error(`Caught responses contain no Error instance: ${JSON.stringify(responses)}`);
      }),
    },
  );
};
