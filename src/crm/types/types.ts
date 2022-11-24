import { CRMProductNumber } from '../testResults/productNumber';
import { TestStatus } from '../testResults/testStatus';

export interface CorrespondingTestHistory {
  testHistoryId: string;
  bookingProductReference: string;
  testStatus: TestStatus,
  candidateId: string;
  startTime: Date;
  productNumber: CRMProductNumber;
  testDate: Date;
}
