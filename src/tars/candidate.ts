import { Result, TarsResultType } from './result';
import { CandPersonalDetails } from './candPersonalDetails';
import { CandContactDetails } from './candContactDetails';
import { TestResult } from '../crm/testResults/testResult';

export class Candidate {
  public CandContactDetails: CandContactDetails;

  public CandPersonalDetails: CandPersonalDetails;

  public Result?: Result;

  public NegatedResult?: Result;

  constructor(crmTestResult: TestResult, resultType?: TarsResultType) {
    this.CandContactDetails = new CandContactDetails(crmTestResult);
    this.CandPersonalDetails = new CandPersonalDetails(crmTestResult);
    if (resultType === TarsResultType.RESULT) {
      this.Result = new Result(crmTestResult);
    } else if (resultType === TarsResultType.NEGATED_RESULT) {
      this.NegatedResult = new Result(crmTestResult);
    }
  }
}
