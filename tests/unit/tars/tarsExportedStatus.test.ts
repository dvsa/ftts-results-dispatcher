import { TarsExportedStatus, tarsExportedStatusToString } from '../../../src/crm/testResults/tarsExportedStatus';

describe('tarsExportedStatus', () => {
  describe('toString', () => {
    test('GIVEN a gender code WHEN called THEN the gender code\'s string representation is returned', () => {
      expect(tarsExportedStatusToString(TarsExportedStatus.PROCESSED)).toEqual('Processed');
      expect(tarsExportedStatusToString(TarsExportedStatus.FAILED_VALIDATION)).toEqual('Failed Validation');
    });
  });
});
