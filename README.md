# FTTS-RESULTS-DISPATCHER

Results Dispatcher application

Result dispatcher function, that would invoke the process of getting the results from CRM and sending them to TARS in the specified interval (by default 1h).
This interval can be configurable in the function.json file by schedule parameter. 
For testing purposes you can change it via CRON expression, e.g. every minute - `"0 */1 * * * *"`.

## Getting Started

Project is based on Node.js and Azure Functions.

### Dependencies

- Node.js installed on local machine (v12.14.1) https://nodejs.org/en/
- The following packages may need to be installed globally (`npm install -g`) to avoid errors:
- azure-functions-core-tools@3
- azurite https://github.com/Azure/Azurite

### Environment
Create .env file in the project root. The file should have the following variables set:

```typescript
APP_NAME=
AZURE_TENANT_ID=
CRM_AZURE_CLIENT_ID=
CRM_AZURE_CLIENT_SECRET=
CRM_AZURE_AD_URI=
USER_ASSIGNED_IDENTITIES=
APPINSIGHTS_INSTRUMENTATIONKEY=
LOG_LEVEL=
NODE_ENV=
SONAR_HOST_URL=
UNPROCESSED_TEST_RESULTS_FETCH_COUNT=
UNPROCESSED_TEST_RESULTS_TARS_EXPORTED_STATUS=
TARS_PROCESSED_TEST_RESULT_FILE_PREFIX=
ROLES_VALIDATION=
```

### Azure Files

##### Account connection string example - `DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=accountKey;EndpointSuffix=core.windows.net`
```typescript
AZURE_FILES_CONNECTION_STRING=
AZURE_FILES_TARS_SHARE=
```

### Azure Blob Storage

#### for local development with the Azurite:
#### DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1
#### for connection with the cloud storage:
#### DefaultEndpointsProtocol=https;AccountName=<account_name>;AccountKey=<account_key>;EndpointSuffix=core.windows.net
```typescript
AZURE_BLOB_CONNECTION_STRING=
AZURE_BLOB_METADATA_CONTAINER_NAME=
```

Run `npm install && npm run start`
The Results Dispatcher application will listen on port 7073.

## Local storage
To run Results Dispatcher app on local machine you need storage emulator.

On Windows it can be Azure Storage Emulator https://docs.microsoft.com/en-us/azure/storage/common/storage-use-emulator

On Mac OS or Linux you need Azurite https://github.com/Azure/Azurite. Preferred way to launch it is Docker:
```bash
docker pull mcr.microsoft.com/azure-storage/azurite
```
and then
```bash
docker run -p 10000:10000 -p 10001:10001 mcr.microsoft.com/azure-storage/azurite
```
## Time triggered functions
Time triggered functions don't expose REST endpoint, but can be launched manually by HTTP request. Please follow Microsoft tutorial https://docs.microsoft.com/en-us/azure/azure-functions/functions-manually-run-non-http

## Roles validation

Roles validation is enabled by default on all environmemnts. It can be disabled by setting ROLES_VALIDATION environment variable (boolean).

## Healthcheck HTTP endpoint

Payments SAP SFTP Push healthcheck function is a troubleshooting/support function to check connectivity with specific components used by application

GET <payments-sap-sftp-push-url>/api/<version>/healthcheck - e.g. /api/v1/healthcheck

Responses:

- HTTP 200 (connections OK)

- HTTP 503 with response body containing specific errors details:

```json
{
  "status": "Service unavailable",
  "errors": [
    {
      "component": "<COMPONENT_NAME>",
      "message": "<ERROR_MESSAGE>",
    }
  ]
}
```
