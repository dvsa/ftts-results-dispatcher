import { TarsExportedStatus } from '../../../src/crm/testResults/tarsExportedStatus';

describe('tarsExportedStatus', () => {
  describe('toString', () => {
    test('GIVEN a gender code WHEN called THEN the gender code\'s string representation is returned', () => {
      expect(TarsExportedStatus.toString(TarsExportedStatus.PROCESSED)).toEqual('Processed');
      expect(TarsExportedStatus.toString(TarsExportedStatus.FAILED_VALIDATION)).toEqual('Failed Validation');
    });
  });
});
