import { DvaLearnerTestResultModel } from '../crm/testResults/dvaLearnerTestResultModel';
import { CRMProductNumber } from '../crm/testResults/productNumber';
import { Title } from '../crm/testResults/title';
import { cleanString } from '../utils/string';
import { DvaBaseResultRecord } from './dvaBaseResultRecord';
import { DvaTestCode, DvaTitle } from './enums';

export class DvaLearnerResultRecord extends DvaBaseResultRecord {
  private static ProductIdToTestCode: Map<CRMProductNumber, DvaTestCode> = new Map([
    [CRMProductNumber.CAR, DvaTestCode.CAR],
    [CRMProductNumber.MOTORCYCLE, DvaTestCode.MOTORCYCLE],
    [CRMProductNumber.LGVMC, DvaTestCode.LGV],
    [CRMProductNumber.LGVHPT, DvaTestCode.LGV],
    [CRMProductNumber.PCVMC, DvaTestCode.PCV],
    [CRMProductNumber.PCVHPT, DvaTestCode.PCV],
    [CRMProductNumber.PCVCPC, DvaTestCode.PCVCPC],
    [CRMProductNumber.LGVCPC, DvaTestCode.LGVCPC],
    [CRMProductNumber.PCVCPCC, DvaTestCode.PCVCPCC],
    [CRMProductNumber.LGVCPCC, DvaTestCode.LGVCPCC],
    [CRMProductNumber.TAXI, DvaTestCode.TAXI],
  ]);

  public firstInitial: string;

  public title: DvaTitle;

  public testCode: DvaTestCode;

  public certificateNumber: string;

  constructor(crmTestResult: DvaLearnerTestResultModel) {
    super(crmTestResult);
    this.startChar = 'I';
    this.firstInitial = (cleanString(crmTestResult.firstName as string)).charAt(0).toUpperCase();
    this.title = this.resolveTitle(crmTestResult.title, crmTestResult.otherTitle);
    this.testCode = this.resolveTestCode(crmTestResult.productId as CRMProductNumber);
    this.certificateNumber = this.resolveCertificateNumber(crmTestResult.testStatus, crmTestResult.certificateNumber);
  }

  private resolveTitle(crmTitle: Title | undefined, crmOtherTitle: string | undefined): DvaTitle {
    const title = crmTitle ? crmTitle.toString() : crmOtherTitle;
    switch (title?.toLowerCase()) {
      case 'mr':
        return DvaTitle.MR;
      case 'mrs':
        return DvaTitle.MRS;
      case 'ms':
        return DvaTitle.MS;
      case 'miss':
        return DvaTitle.MISS;
      case 'dr':
        return DvaTitle.DR;
      case 'rev':
        return DvaTitle.REV;
      case 'sister':
        return DvaTitle.SISTER;
      case 'prof':
        return DvaTitle.PROF;
      case 'lady':
        return DvaTitle.LADY;
      case 'sir':
        return DvaTitle.SIR;
      case 'canon':
        return DvaTitle.CANON;
      case 'mx':
      default:
        return DvaTitle.OTHER;
    }
  }

  private resolveTestCode(productId: CRMProductNumber): DvaTestCode {
    return DvaLearnerResultRecord.ProductIdToTestCode.get(productId) as DvaTestCode;
  }

  private resolveCertificateNumber(testStatus: string, certificateNumber: string | undefined): string {
    if (testStatus === 'Fail') {
      return '000000000';
    }
    // We expect certificateNumber to be set if test status is PASS
    return certificateNumber as string;
  }
}
