/* eslint-disable no-await-in-loop */
import axios, { AxiosInstance } from 'axios';
import delay from 'delay';

export const runFunction = async (baseURL: string, functionEndpoint: string, exportedStatus: string): Promise<number> => {
  let postConfiguration;
  if (process.env.FUNCTION_MASTER_KEY) {
    postConfiguration = {
      headers: {
        'x-functions-key': process.env.FUNCTION_MASTER_KEY,
      },
    };
  }

  const httpClient: AxiosInstance = axios.create({
    baseURL,
  });
  const response = await httpClient.post(
    functionEndpoint,
    {
      input: exportedStatus,
    },
    postConfiguration,
  );

  return response.status;
};

export const waitUntilJobIsDone = async (condition: () => Promise<boolean>): Promise<void> => {
  const MAX_TRIES = 15;
  const TIMEOUT = 12000;
  for (let i = 0; i < MAX_TRIES; i++) {
    if (await condition()) {
      return;
    }
    await delay(TIMEOUT);
  }
  throw new Error('waitUntilJobIsDone:: condition not fulfilled on time');
};
