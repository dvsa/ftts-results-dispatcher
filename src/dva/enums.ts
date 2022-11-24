import { BusinessTelemetryEvent } from '../observability/logger';

export enum DvaTitle {
  MR = 'MR',
  MRS = 'MRS',
  MISS = 'MISS',
  MS = 'MS',
  DR = 'DR',
  REV = 'REV',
  SISTER = 'SISTER',
  PROF = 'PROF',
  LADY = 'LADY',
  SIR = 'SIR',
  CANON = 'CANON',
  OTHER = 'OTHER',
}

export enum DvaTestCode {
  CAR = '01',
  MOTORCYCLE = '02',
  LGV = '03',
  PCV = '04',
  PCVCPC = '05',
  LGVCPC = '06',
  PCVCPCC = '07',
  LGVCPCC = '08',
  TAXI = '09',
}

export enum DvaTestResult {
  PASS = 'P',
  FAIL = 'F',
  NO_SHOW = 'N',
}

export enum DvaTestType {
  LEARNER = 'LEARNER',
  ADI = 'ADI',
  AMI = 'AMI',
}

export const dvaTestTypeToFileNameConstant = new Map<DvaTestType, string>([
  [DvaTestType.ADI, 'DADIR'],
  [DvaTestType.AMI, 'DAMIR'],
  [DvaTestType.LEARNER, 'DVTA'],
]);

export const dvaTestTypeToSuccessEventName = new Map<DvaTestType, BusinessTelemetryEvent>([
  [DvaTestType.ADI, BusinessTelemetryEvent.RES_DVA_ADI_FILE_UPLOAD_SUCCESSFUL],
  [DvaTestType.AMI, BusinessTelemetryEvent.RES_DVA_AMI_FILE_UPLOAD_SUCCESSFUL],
  [DvaTestType.LEARNER, BusinessTelemetryEvent.RES_DVA_LEARNER_FILE_UPLOAD_SUCCESSFUL],
]);
