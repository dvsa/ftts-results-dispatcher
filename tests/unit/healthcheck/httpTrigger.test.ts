import { mock } from 'jest-mock-extended';
import { mocked } from 'ts-jest/utils';
import { HttpRequest } from '@azure/functions';
import * as Healthcheck from '@dvsa/healthcheck';
import { httpTrigger } from '../../../src/healthcheck/httpTrigger';
import { mockedContext } from '../../mocks/context.mock';
import { mockedConfig } from '../../mocks/config.mock';
import { mockedLogger } from '../../mocks/logger.mock';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';

jest.mock('../../../src/observability/logger');
jest.mock('../../../src/config');

jest.mock('../../../src/crm/dynamics/dynamicsWebApi');

jest.mock('@dvsa/healthcheck');
const mockedAzureBlobHealthcheck = mocked(Healthcheck.azureBlobHealthcheck, true);
const mockedAzureFilesHealthcheck = mocked(Healthcheck.azureFilesHealthcheck, true);
const mockedCdsHealthcheck = mocked(Healthcheck.cdsHealthcheck, true);

describe('healthcheck', () => {
  const httpRequest = mock<HttpRequest>();
  const azureBlobConnectionString = 'blob-connection';
  const azureBlobContainerName = 'container';
  const azureBlobError = new Error('azure blob failed');
  const azureFilesConnectionString = 'files-connection';
  const azureFilesShareName = 'share';
  const azureFilesError = new Error('azure files failed');
  const crmUri = 'https://crm.com';
  const cdsError = new Error('cds failed');
  const azureBlobServiceUnavailableError: Healthcheck.ServiceUnavailableError = {
    component: Healthcheck.Component.AZURE_BLOB_STORAGE,
    message: 'azure blob failed',
  };
  const azureFilesServiceUnavailableError: Healthcheck.ServiceUnavailableError = {
    component: Healthcheck.Component.AZURE_FILES,
    message: 'azure files failed',
  };
  const cdsServiceUnavailableError: Healthcheck.ServiceUnavailableError = {
    component: Healthcheck.Component.CDS,
    message: 'cds failed',
  };

  beforeEach(() => {
    mockedConfig.common.azureBlob.storageConnectionString = azureBlobConnectionString;
    mockedConfig.common.azureBlob.metadataContainerName = azureBlobContainerName;
    mockedConfig.tars.azureFiles.storageConnectionString = azureFilesConnectionString;
    mockedConfig.tars.azureFiles.tarsShareName = azureFilesShareName;
    mockedConfig.crm.apiUrl = crmUri;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('GIVEN request WHEN no errors THEN return http status 200', async () => {
    mockedAzureBlobHealthcheck.mockResolvedValue(undefined);
    mockedAzureFilesHealthcheck.mockResolvedValue(undefined);
    mockedCdsHealthcheck.mockResolvedValue(undefined);

    await httpTrigger(mockedContext, httpRequest);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect((mockedContext.res)!.status).toBe(200);
    expect(mockedAzureBlobHealthcheck).toHaveBeenCalledWith(
      azureBlobConnectionString,
      azureBlobContainerName,
    );
    expect(mockedAzureFilesHealthcheck).toHaveBeenCalledWith(
      azureFilesConnectionString,
      azureFilesShareName,
    );
    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvent.HEALTH_CHECK_SUCCESS,
      'healthcheck::httpTrigger: Components are healthy',
      {
        components: [
          Healthcheck.Component.AZURE_BLOB_STORAGE,
          Healthcheck.Component.AZURE_FILES,
          Healthcheck.Component.CDS,
        ],
      },
    );
  });

  test('GIVEN request WHEN azure blob error THEN return http status 503 with proper body', async () => {
    mockedAzureBlobHealthcheck.mockResolvedValue(azureBlobError);
    mockedAzureFilesHealthcheck.mockResolvedValue(undefined);
    mockedCdsHealthcheck.mockResolvedValue(undefined);

    await httpTrigger(mockedContext, httpRequest);

    expectWhenComponentHasError([azureBlobServiceUnavailableError]);
  });

  test('GIVEN request WHEN azure files error THEN return http status 503 with proper body', async () => {
    mockedAzureBlobHealthcheck.mockResolvedValue(undefined);
    mockedAzureFilesHealthcheck.mockResolvedValue(azureFilesError);
    mockedCdsHealthcheck.mockResolvedValue(undefined);

    await httpTrigger(mockedContext, httpRequest);

    expectWhenComponentHasError([azureFilesServiceUnavailableError]);
  });

  test('GIVEN request WHEN cds error THEN return http status 503 with proper body', async () => {
    mockedAzureBlobHealthcheck.mockResolvedValue(undefined);
    mockedAzureFilesHealthcheck.mockResolvedValue(undefined);
    mockedCdsHealthcheck.mockResolvedValue(cdsError);

    await httpTrigger(mockedContext, httpRequest);

    expectWhenComponentHasError([cdsServiceUnavailableError]);
  });

  test('GIVEN request WHEN all errors THEN return http status 503 with proper body', async () => {
    mockedAzureBlobHealthcheck.mockResolvedValue(azureBlobError);
    mockedAzureFilesHealthcheck.mockResolvedValue(azureFilesError);
    mockedCdsHealthcheck.mockResolvedValue(cdsError);

    await httpTrigger(mockedContext, httpRequest);

    expectWhenComponentHasError([
      azureBlobServiceUnavailableError,
      azureFilesServiceUnavailableError,
      cdsServiceUnavailableError,
    ]);
  });

  function expectWhenComponentHasError(componentErrors: Healthcheck.ServiceUnavailableError[]): void {
    expect(mockedContext.res).toEqual({
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
      body: new Healthcheck.ServiceUnavailableResponse(componentErrors),
    });
    expect(mockedAzureBlobHealthcheck).toHaveBeenCalledWith(
      azureBlobConnectionString,
      azureBlobContainerName,
    );
    expect(mockedAzureFilesHealthcheck).toHaveBeenCalledWith(
      azureFilesConnectionString,
      azureFilesShareName,
    );
    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvent.HEALTH_CHECK_FAILED,
      'healthcheck::httpTrigger: At least one component is unhealthy',
      {
        errors: componentErrors,
      },
    );
  }

  test('GIVEN request WHEN error not from tested components THEN returns http status 500 and log proper event', async () => {
    const otherError = new Error();
    mockedAzureBlobHealthcheck.mockRejectedValue(otherError);

    await httpTrigger(mockedContext, httpRequest);

    expect(mockedContext.res).toEqual({
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        code: 500,
        message: 'No additional error details',
      },
    });
    expect(mockedLogger.error).toHaveBeenCalledTimes(1);
    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvent.HEALTH_CHECK_FAILED,
      'No additional error details',
    );
  });
});
