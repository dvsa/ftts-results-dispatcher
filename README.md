# FTTS-RESULTS-DISPATCHER

Results Dispatcher application

Result dispatcher function, that would invoke the process of getting the results from CRM and sending them to TARS/DVA in the specified interval.
This interval can be configurable in the function.json file by schedule parameter.
For testing purposes you can change it via CRON expression, e.g. every minute - `"0 */1 * * * *"`.

## Getting Started

Project is based on Node.js and Azure Functions.

### Dependencies

- Node.js installed on local machine (v12.14.1) `https://nodejs.org/en/`
- The following packages may need to be installed globally (`npm install -g`) to avoid errors:
- azure-functions-core-tools@3
- azurite `https://github.com/Azure/Azurite`

### Azure Files

#### Account connection string example: `DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=accountKey;EndpointSuffix=core.windows.net`

```typescript
AZURE_FILES_CONNECTION_STRING=
AZURE_FILES_TARS_SHARE_NAME=
```

### Azure Blob Storage

#### for local development via Azurite: `UseDevelopmentStorage=true`

#### for connection with deployed storage: `DefaultEndpointsProtocol=https;AccountName=<account_name>;AccountKey=<account_key>;EndpointSuffix=core.windows.net`

```typescript
AZURE_BLOB_CONNECTION_STRING=
AZURE_BLOB_METADATA_CONTAINER_NAME=
```

Run `npm install && npm run start`
The Results Dispatcher application will listen on port 7073. Will recompile and restart on code changes.

## Local storage

To run Results Dispatcher app on local machine you can either point to deployed storage in Azure by setting the connection strings (new on each deploy) same as the deployed configuration in the function app (including `AzureWebJobsStorage` in local.settings.json).

Or you can point to local storage using a storage emulator:

On Windows it can be Azure Storage Emulator `https://docs.microsoft.com/en-us/azure/storage/common/storage-use-emulator`

On Mac OS or Linux you need Azurite `https://github.com/Azure/Azurite`. Preferred way to launch it is Docker:

```bash
docker pull mcr.microsoft.com/azure-storage/azurite
```

and then

```bash
docker run -p 10000:10000 -p 10001:10001 mcr.microsoft.com/azure-storage/azurite
```

Or use 'Azurite' extension in VSCode. Set blob connection string in your local.settings.json to `UseDevelopmentStorage=true`. Start 'Azurite Blob Service' and check VSCode output 'Azurite Blob' to see the logs. Note Azurite does not support Azure Files so for files connection string you have to use deployed storage.

## Time triggered functions

Time triggered functions don't expose REST endpoint, but can be launched manually by HTTP request. Please follow Microsoft tutorial `https://docs.microsoft.com/en-us/azure/azure-functions/functions-manually-run-non-http. Use e.g. http://localhost:7073/admin/functions/V1_DVA_Results_Dispatcher`
Note for testing you can pass a specific exported status via the request body 'input' property. Otherwise it will use the UNPROCESSED_TEST_RESULTS_TARS_EXPORTED_STATUS in your local.settings.json.

```json
{
  "input": "MyUnprocessedStatus"
}
```

## Roles validation

Roles validation is enabled by default on all environments. It can be disabled by setting ROLES_VALIDATION environment variable (boolean).

## DVA SFTP stub

For development and testing we can't use the real SFTP server hosted by DVA. So instead we have a swap-in dev SFTP client which uses the same Azure blob storage as the metadata files.
This is enabled by default in dev and integration environments (by setting flag `DVA_SFTP_BLOB_SOURCE_ENABLED` to true). Results files will be stored in a separate container to the metadata files - by setting `AZURE_BLOB_STUB_SFTP_CONTAINER_NAME`.

## Healthcheck HTTP endpoint

Healthcheck function is a troubleshooting/support function to check connectivity with specific components used by application

`GET <base-url>/api/<version>/healthcheck - e.g. /api/v1/healthcheck`

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

## Integration tests

Integration tests are supported in local environment and the deployed environment. The generated CRM test records created use a timestamp based 'exported status' so that other environments/testing is not affected.

Assumptions:

- application is running (either locally or deployed)

- application is configured to use DVA SFTP Stub

Dependencies:

- CRM instance

- Azure Blob storage for metadata and DVA results files (as DVA SFTP Stub)

- Azure Files storage for TARS results files (Azurite does not support file share so you must use deployed storage)

How to Run:

1. Create a .env file and fill in the missing configuration (use .env.example as a base)
2. Set the connection strings the same in your local.settings.json and .env as above depending on whether you are testing against local/deployed storage
3. Run `npm run test:int` to run both DVA and TARS tests. Add the prefix '-dva'/'-tars' to run them separately

### Integration tests can be run against a deployed environment

In order to run integrations tests against a deployed environment, you would need to set the .env accordingly (including application url) and run
the command ``npm run test:int:remote -- resourceFunctionName resourceGroupName`` for e.g. if you
deploy the results dispatcher on the enviornment 007 then you would run the command like
``npm run test:int:remote -- dsuksdvrstsdprfnc007 dsuksdvpfmrsg007``. You can also update the
``invoke-integration-tests.sh`` file to run dva or tars integration tests separately for e.g.
by changing the last line of the file from npm run ``npm run test:int`` to ``npm run test:int-dva`` or
``npm run test:int-tars``. You'll need to `az login` via the command line if not already authenticated.
