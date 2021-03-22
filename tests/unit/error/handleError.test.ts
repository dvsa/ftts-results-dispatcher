import { mockedLogger } from '../../mocks/logger.mock';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';
import { AzureBlobError } from '../../../src/azureBlob/azureBlobError';
import { CrmError } from '../../../src/crm/crmError';
import handleError from '../../../src/error/handleError';

jest.mock('../../../src/observability/logger');

describe('handleError', () => {
  afterEach(() => {
    mockedLogger.logEvent.mockClear();
  });
  describe('errors', () => {
    test('GIVEN error without event WHEN handleError THEN error is logged', () => {
      const error = new Error();

      try {
        handleError(error);
        fail();
      } catch (actualError) {
        expect(actualError).toEqual(error);
        expect(mockedLogger.error).toHaveBeenCalledWith(error);
        expect(mockedLogger.logEvent).toHaveBeenCalledTimes(0);
      }
    });

    test('GIVEN error with event WHEN handleError THEN error and proper event are logged', () => {
      const errorEvent = BusinessTelemetryEvent.RES_TARS_METADATA_FETCH_ERROR;
      const error = new AzureBlobError(
        'error msg',
        undefined,
        {
          event: errorEvent,
        },
      );

      try {
        handleError(error);
        fail();
      } catch (actualError) {
        expect(actualError).toEqual(error);
        expect(mockedLogger.error).toHaveBeenCalledWith(error);
        expect(mockedLogger.logEvent).toHaveBeenCalledWith(errorEvent);
      }
    });

    test('GIVEN error with nested event WHEN handleError THEN error and proper event are logged', () => {
      const errorEvent = BusinessTelemetryEvent.RES_TARS_METADATA_FETCH_ERROR;
      const error = getErrorWithNestedEvent(errorEvent);

      try {
        handleError(error);
        fail();
      } catch (actualError) {
        expect(actualError).toEqual(error);
        expect(mockedLogger.error).toHaveBeenCalledWith(error);
        expect(mockedLogger.logEvent).toHaveBeenCalledWith(errorEvent);
      }
    });

    test('GIVEN error with event WHEN handleError and error event max deep was exceeded THEN only error is logged', () => {
      const errorEvent = BusinessTelemetryEvent.RES_TARS_METADATA_FETCH_ERROR;
      const error = getErrorWithNestedEvent(errorEvent);
      const errorEventMaxDeep = 1;

      try {
        handleError(error, errorEventMaxDeep);
        fail();
      } catch (actualError) {
        expect(actualError).toEqual(error);
        expect(mockedLogger.error).toHaveBeenCalledWith(error);
        expect(mockedLogger.logEvent).toHaveBeenCalledTimes(0);
      }
    });

    function getErrorWithNestedEvent(errorEvent: BusinessTelemetryEvent): Error {
      const errorCause2 = new AzureBlobError(
        undefined,
        undefined,
        {
          event: errorEvent,
        },
      );
      const errorCause1 = new AzureBlobError(
        undefined,
        errorCause2,
      );
      return new AzureBlobError(
        'error msg',
        errorCause1,
      );
    }
  });

  describe('Crm errors', () => {
    test('GIVEN CrmError with bad request status WHEN handleError THEN error and proper event is logged', () => {
      const crmError = new CrmError('msg', { status: 400 });

      try {
        handleError(crmError);
        fail();
      } catch (actualError) {
        expect(actualError).toEqual(crmError);
        expect(mockedLogger.error).toHaveBeenCalledWith(crmError);
        expect(mockedLogger.logEvent).toHaveBeenCalledWith(
          BusinessTelemetryEvent.RES_TARS_CDS_BAD_REQUEST,
        );
      }
    });

    test('GIVEN CrmError with not found status WHEN handleError THEN error and proper event is logged', () => {
      const crmError = new CrmError('msg', { status: 404 });

      try {
        handleError(crmError);
        fail();
      } catch (actualError) {
        expect(actualError).toEqual(crmError);
        expect(mockedLogger.error).toHaveBeenCalledWith(crmError);
        expect(mockedLogger.logEvent).toHaveBeenCalledWith(
          BusinessTelemetryEvent.RES_TARS_CDS_NOT_FOUND,
        );
      }
    });

    test('GIVEN CrmError with internal server error status WHEN handleError THEN error and proper event is logged', () => {
      const crmError = new CrmError('msg', { status: 500 });

      try {
        handleError(crmError);
        fail();
      } catch (actualError) {
        expect(actualError).toEqual(crmError);
        expect(mockedLogger.error).toHaveBeenCalledWith(crmError);
        expect(mockedLogger.logEvent).toHaveBeenCalledWith(
          BusinessTelemetryEvent.RES_TARS_CDS_INTERNAL_ERROR,
        );
      }
    });

    test('GIVEN CrmError with unauthorized status WHEN handleError THEN error and proper event is logged', () => {
      const crmError = new CrmError('msg', { status: 401 });

      try {
        handleError(crmError);
        fail();
      } catch (actualError) {
        expect(actualError).toEqual(crmError);
        expect(mockedLogger.error).toHaveBeenCalledWith(crmError);
        expect(mockedLogger.logEvent).toHaveBeenCalledWith(
          BusinessTelemetryEvent.RES_TARS_CDS_CONNECTIVITY_ISSUE,
        );
      }
    });

    test('GIVEN CrmError with forbidden status WHEN handleError THEN error and proper event is logged', () => {
      const crmError = new CrmError('msg', { status: 403 });

      try {
        handleError(crmError);
        fail();
      } catch (actualError) {
        expect(actualError).toEqual(crmError);
        expect(mockedLogger.error).toHaveBeenCalledWith(crmError);
        expect(mockedLogger.logEvent).toHaveBeenCalledWith(
          BusinessTelemetryEvent.RES_TARS_CDS_CONNECTIVITY_ISSUE,
        );
      }
    });
  });
});
