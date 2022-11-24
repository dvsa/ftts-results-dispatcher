import { CRMProductNumber } from '../crm/testResults/productNumber';

export const getCorrespondingProductNumber = (productNumber?: CRMProductNumber): CRMProductNumber | undefined => {
  if (productNumber === CRMProductNumber.LGVMC) {
    return CRMProductNumber.LGVHPT;
  }

  if (productNumber === CRMProductNumber.LGVHPT) {
    return CRMProductNumber.LGVMC;
  }

  if (productNumber === CRMProductNumber.PCVMC) {
    return CRMProductNumber.PCVHPT;
  }

  if (productNumber === CRMProductNumber.PCVHPT) {
    return CRMProductNumber.PCVMC;
  }

  return undefined;
};
