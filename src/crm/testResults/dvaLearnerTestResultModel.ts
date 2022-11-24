import { BaseCrmTestResult, BaseTestResultModel } from './baseTestResultModel';

export interface DvaCrmTestResult extends BaseCrmTestResult {
  'product.productnumber'?: string;
}

export class DvaLearnerTestResultModel extends BaseTestResultModel {
  public productId?: string;

  constructor(fttsTestResult: DvaCrmTestResult) {
    super(fttsTestResult);
    this.productId = fttsTestResult['product.productnumber'];
  }
}
