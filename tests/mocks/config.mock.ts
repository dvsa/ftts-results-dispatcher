import { mocked } from 'ts-jest/utils';
import config from '../../src/config';

export const mockedConfig = mocked(config, true);
