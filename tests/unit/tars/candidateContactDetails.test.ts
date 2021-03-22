import { CandContactDetails } from '../../../src/tars/candContactDetails';
import { TestResult, FttsTestResult } from '../../../src/crm/testResults/testResult';

describe('CandContactDetails', () => {
  test('GIVEN crmTestResult WHEN invoking constractor THEN creating proper CandContactDetails instance', () => {
    const crmTestResult = prepareCrmTestResult();

    const actualCandContactDetails = new CandContactDetails(crmTestResult);

    expect(actualCandContactDetails.AddressLine1).toEqual('adress line 1');
    expect(actualCandContactDetails.AddressLine2).toEqual('address line 2');
    expect(actualCandContactDetails.AddressLine3).toEqual('address line 3');
    expect(actualCandContactDetails.AddressLine4).toEqual('address city');
    expect(actualCandContactDetails.AddressLine5).toEqual('address county');
    expect(actualCandContactDetails.PostCode).toEqual('postalcode');
  });
});

function prepareCrmTestResult(): TestResult {
  const fttTestResult = {
    'person.address1_line1': 'adress line 1',
    'person.address1_line2': 'address line 2',
    'person.address1_line3': 'address line 3',
    'person.address1_city': 'address city',
    'person.address1_county': 'address county',
    'person.address1_postalcode': 'postalcode',
  } as FttsTestResult;
  return new TestResult(fttTestResult);
}
