import { BaseCrmTestResult, BaseTestResultModel } from './baseTestResultModel';
import { crmGenderCodeToGender, Gender } from './genderCode';

export interface TarsCrmTestResult extends BaseCrmTestResult {
  'product.ftts_examseriescode'?: string;
}

export class TarsTestResultModel extends BaseTestResultModel {
  public examSeriesCode?: string;

  public genderCode?: Gender;

  constructor(fttsTestResult: TarsCrmTestResult) {
    super(fttsTestResult);
    this.examSeriesCode = fttsTestResult['product.ftts_examseriescode'];
    this.genderCode = crmGenderCodeToGender(fttsTestResult['person.gendercode']);
  }
}
