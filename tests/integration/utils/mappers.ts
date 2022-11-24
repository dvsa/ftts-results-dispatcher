import config from '../../../src/config';
import { DvaTestType } from '../../../src/dva/enums';

export const productIdToTestCode: Map<string, string> = new Map([
  ['1001', '01'],
  ['2001', '02'],
  ['3001', '03'],
  ['3002', '03'],
  ['4001', '04'],
  ['4002', '04'],
  ['4003', '05'],
  ['3003', '06'],
  ['4004', '07'],
  ['3004', '08'],
  ['8001', '09'],
]);

export const productIdToExamSeriesCode: Map<string, string> = new Map([
  ['1001', 'Car'],
  ['2001', 'Bike'],
  ['3001', 'LGV'],
  ['3002', 'LGV'],
  ['4001', 'PCV'],
  ['4002', 'PCV'],
  ['4003', 'PCV-CPC'],
  ['3003', 'LGV-CPC'],
  ['4004', 'PCV-CPC-Conversion'],
  ['3004', 'LGV-CPC-Conversion'],
  ['5001', 'PDI'],
  ['5002', 'ADI'],
  ['5003', 'ADI'],
  ['6001', 'ERS'],
  ['7001', 'AMIP1'],
  ['8001', 'TAXI'],
]);

export const titleToString: Map<number, string> = new Map([
  [675030000, 'Mr'],
  [675030001, 'Ms'],
  [675030002, 'Mx'],
  [675030003, 'Mrs'],
  [675030004, 'Miss'],
  [675030005, 'Dr'],
]);

export const zeroFill = (value: number | string, totalWidth: number): string => String(value).padStart(totalWidth, '0');

export const dvaTestTypeToHeaderConstant = new Map<DvaTestType, string>([
  [DvaTestType.ADI, '3DADIRESUL'],
  [DvaTestType.AMI, '3DAMIRESUL'],
  [DvaTestType.LEARNER, 'DVTARESUL'],
]);

export const getMetadataFilename = (fileType: DvaTestType): string => {
  if (fileType === DvaTestType.ADI) {
    return config.dva.metadataFilename.adi;
  }
  if (fileType === DvaTestType.AMI) {
    return config.dva.metadataFilename.ami;
  }
  return config.dva.metadataFilename.dva;
};
