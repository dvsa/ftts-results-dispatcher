export default {
  appName: process.env.APP_NAME || '',
  userAssignedEntityClientId: process.env.USER_ASSIGNED_ENTITY_CLIENT_ID || '',

  crm: {
    apiUrl: process.env.CRM_API_URL || '',
    auth: {
      tenantId: process.env.CRM_TENANT_ID || '',
      clientId: process.env.CRM_CLIENT_ID || '',
      clientSecret: process.env.CRM_CLIENT_SECRET || '',
      userAssignedEntityClientId: process.env.USER_ASSIGNED_ENTITY_CLIENT_ID || '',
      scope: process.env.CRM_SCOPE || '',
    },
  },

  security: {
    rolesValidation: process.env.ROLES_VALIDATION || 'true',
  },

  common: {
    exportedStatus: process.env.UNPROCESSED_TEST_RESULTS_TARS_EXPORTED_STATUS || '',
    azureBlob: {
      storageConnectionString: process.env.AZURE_BLOB_CONNECTION_STRING || '',
      metadataContainerName: process.env.AZURE_BLOB_METADATA_CONTAINER_NAME || '',
      stubSftpContainerName: process.env.AZURE_BLOB_STUB_SFTP_CONTAINER_NAME || '',
    },
  },

  tars: {
    fetchCount: process.env.UNPROCESSED_TARS_TEST_RESULTS_FETCH_COUNT || '5000',
    processedTestResultFilePrefix: process.env.TARS_PROCESSED_TEST_RESULT_FILE_PREFIX || '',
    azureFiles: {
      storageConnectionString: process.env.AZURE_FILES_CONNECTION_STRING || '',
      tarsShareName: process.env.AZURE_FILES_TARS_SHARE_NAME || '',
      chunkSize: process.env.AZURE_FILES_TARS_CHUNK_SIZE || 2000000,
    },
  },

  dva: {
    fetchCount: process.env.UNPROCESSED_DVA_TEST_RESULTS_FETCH_COUNT || '1000',
    createMetadataFileIfNotExists: process.env.CREATE_DVA_METADATA_FILE_IF_NOT_EXISTS === 'true',
    metadataFilename: {
      dva: process.env.DVA_METADATA_FILENAME_DVA || 'dva.json',
      adi: process.env.DVA_METADATA_FILENAME_ADI || 'dva_adi.json',
      ami: process.env.DVA_METADATA_FILENAME_AMI || 'dva_ami.json',
    },
    defaultSequenceNumber: {
      learner: Number(process.env.DVA_DEFAULT_SEQUENCE_NUMBER_LEARNER) || 1,
      adi: Number(process.env.DVA_DEFAULT_SEQUENCE_NUMBER_ADI) || 3000,
      ami: Number(process.env.DVA_DEFAULT_SEQUENCE_NUMBER_AMI) || 1000,
    },
    adiBands: {
      band1: process.env.DVA_ADI_BAND_1 || 'Road Procedure',
      band2: process.env.DVA_ADI_BAND_2 || 'Traffic Signs and Signals, Car Control, Pedestrians, Mechanical Knowledge',
      band3: process.env.DVA_ADI_BAND_3 || 'Driving Test, Disabilities, Law',
      band4: process.env.DVA_ADI_BAND_4 || 'Publications, Instructional Techniques',
    },
    amiBands: {
      band1: process.env.DVA_AMI_BAND_1 || 'Road Procedure & Rider Safety',
      band2: process.env.DVA_AMI_BAND_2 || 'Traffic Signs and Signals, Bike Control, Pedestrians, Mechanical Knowledge',
      band3: process.env.DVA_AMI_BAND_3 || 'Driving Test, Disabilities, The Law & The Environment',
      band4: process.env.DVA_AMI_BAND_4 || 'Publications, Instructional Techniques',
    },
    sftp: {
      blobSourceEnabled: process.env.DVA_SFTP_BLOB_SOURCE_ENABLED === 'true',
      hostname: process.env.DVA_SFTP_HOSTNAME || '',
      password: process.env.DVA_SFTP_PASSWORD || '',
      port: process.env.DVA_SFTP_PORT || '',
      privateKey: process.env.DVA_SFTP_PRIVATE_KEY || '',
      username: process.env.DVA_SFTP_USERNAME || '',
      learnerPath: process.env.DVA_SFTP_LEARNER_PATH || 'DVA_DVSA_FTTS/driver_results',
      instructorPath: process.env.DVA_SFTP_INSTRUCTOR_PATH || 'DVA_DVSA_FTTS/instructor_results',
    },
  },
};
