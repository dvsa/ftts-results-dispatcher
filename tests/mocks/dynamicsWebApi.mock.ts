import DynamicsWebApi from 'dynamics-web-api';
import { mock } from 'jest-mock-extended';
import { mocked } from 'ts-jest/utils';
import { newDynamicsWebApi } from '../../src/crm/dynamics/dynamicsWebApi';

jest.mock('../../src/crm/dynamics/dynamicsWebApi');

const mockedNewDynamicsWebApi = mocked(newDynamicsWebApi);

mockedNewDynamicsWebApi.mockImplementation(
  (): DynamicsWebApi => mockedDynamicsWebApi,
);

export const mockedDynamicsWebApi = mock<DynamicsWebApi>();
