import dotenv from 'dotenv';

if (!process.env.AZURE_TENANT_ID) {
  dotenv.config();
}

export default {
  appName: process.env.APP_NAME || '',
  azureTenantId: process.env.AZURE_TENANT_ID || '',
  userAssignedEntityClientId: process.env.USER_ASSIGNED_ENTITY_CLIENT_ID || '',

  crm: {
    azureAdUri: process.env.CRM_AZURE_AD_URI || '',
    azureClientId: process.env.CRM_AZURE_CLIENT_ID || '',
    azureClientSecret: process.env.CRM_AZURE_CLIENT_SECRET || '',
  },

  azureBlob: {
    storageConnectionString: process.env.AZURE_BLOB_CONNECTION_STRING || '',
    metadataContainerName: process.env.AZURE_BLOB_METADATA_CONTAINER_NAME || '',
  },

  azureFiles: {
    storageConnectionString: process.env.AZURE_FILES_CONNECTION_STRING || '',
    tarsShareName: process.env.AZURE_FILES_TARS_SHARE_NAME || '',
  },

  unprocessedTestResults: {
    fetchCount: process.env.UNPROCESSED_TEST_RESULTS_FETCH_COUNT || '',
    tarsExportedStatus: process.env.UNPROCESSED_TEST_RESULTS_TARS_EXPORTED_STATUS || '',
  },

  tars: {
    processedTestResultFilePrefix: process.env.TARS_PROCESSED_TEST_RESULT_FILE_PREFIX || '',
  },

  security: {
    rolesValidation: process.env.ROLES_VALIDATION || 'true',
  },
};
