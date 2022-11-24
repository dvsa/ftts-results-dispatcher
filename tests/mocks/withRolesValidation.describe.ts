/*

IMPORTANT!

To be able to use this in your test file, remember to add:

jest.mock('@dvsa/ftts-role-validation');

*/
/* eslint-disable @typescript-eslint/no-explicit-any */
import { mocked } from 'ts-jest/utils';
import { AzureFunction, HttpRequest, Context } from '@azure/functions';
import { withRolesValidation, Role, resolveBooleanConfig } from '@dvsa/ftts-role-validation';
import { mockedContext } from './context.mock';

mocked(withRolesValidation).mockImplementation(
  (fn: AzureFunction) => (context: Context): Promise<any> | void => fn(context),
);
const mockedResolveBooleanConfig = mocked(resolveBooleanConfig);

export const describeWithRolesValidation = (fn: AzureFunction, expectedAllowedRoles: Role[]): jest.EmptyFunction => (): void => {
  test('WHEN called THEN the call is then wrapped into withRolesValidation', async () => {
    await fn(mockedContext, {} as HttpRequest);

    expect(withRolesValidation).toHaveBeenCalledTimes(1);
    expect(withRolesValidation).toHaveBeenCalledWith(
      expect.any(Function),
      mockedResolveBooleanConfig('any'),
      expectedAllowedRoles,
      expect.any(Function),
    );
  });
};
