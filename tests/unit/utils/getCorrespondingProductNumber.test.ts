import { CRMProductNumber } from '../../../src/crm/testResults/productNumber';
import { getCorrespondingProductNumber } from '../../../src/utils/getCorrespondingProductNumber';

describe('getCorrespondingProductNumber', () => {
  test('LGVMC returns LGVHPT', () => {
    expect(getCorrespondingProductNumber(CRMProductNumber.LGVMC)).toStrictEqual(CRMProductNumber.LGVHPT);
  });

  test('LGVHPT returns LGVMC', () => {
    expect(getCorrespondingProductNumber(CRMProductNumber.LGVHPT)).toStrictEqual(CRMProductNumber.LGVMC);
  });

  test('PCVMC returns PCVHPT', () => {
    expect(getCorrespondingProductNumber(CRMProductNumber.PCVMC)).toStrictEqual(CRMProductNumber.PCVHPT);
  });

  test('PCVHPT returns PCVMC', () => {
    expect(getCorrespondingProductNumber(CRMProductNumber.PCVHPT)).toStrictEqual(CRMProductNumber.PCVMC);
  });

  test('other test types returns undefined', () => {
    expect(getCorrespondingProductNumber(CRMProductNumber.CAR)).toStrictEqual(undefined);
  });

  test('undefined crm product number returns undefined', () => {
    expect(getCorrespondingProductNumber(undefined)).toStrictEqual(undefined);
  });
});
