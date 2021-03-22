import { BlobServiceClient } from '@azure/storage-blob';
import { mockedConfig } from '../../mocks/config.mock';
import { newAzureBlobServiceClient } from '../../../src/azureBlob/azureBlobServiceClient';
import { AzureBlobError } from '../../../src/azureBlob/azureBlobError';

describe('AzureBlobServiceClient', () => {
  test('GIVEN valid connectionString WHEN initate BlobServiceClient THEN proper instance is created', () => {
    mockedConfig.azureBlob.storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=cloud;AccountKey=x+y==;EndpointSuffix=core.windows.net';

    const actualInstance = newAzureBlobServiceClient();

    expect(actualInstance).toBeInstanceOf(BlobServiceClient);
    expect(actualInstance.url).toEqual('https://cloud.blob.core.windows.net/');
  });

  test('GIVEN invalid connectionString WHEN initate BlobServiceClient THEN AzureBlobError is thrown', () => {
    mockedConfig.azureBlob.storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=cloud;AccountKey=x+y==';

    try {
      newAzureBlobServiceClient();
    } catch (error) {
      expect(error).toEqual(new AzureBlobError('Invalid EndpointSuffix in the provided Connection String'));
    }
  });
});
