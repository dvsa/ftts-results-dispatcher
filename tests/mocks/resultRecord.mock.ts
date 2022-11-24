import { BaseTestResultModel } from '../../src/crm/testResults/baseTestResultModel';
import { DvaInstructorTestResultModel } from '../../src/crm/testResults/dvaInstructorTestResultModel';
import { DvaLearnerTestResultModel } from '../../src/crm/testResults/dvaLearnerTestResultModel';
import { CRMProductNumber } from '../../src/crm/testResults/productNumber';
import { Title } from '../../src/crm/testResults/title';
import { DvaInstructorResultRecord } from '../../src/dva/dvaInstructorResultRecord';
import { DvaLearnerResultRecord } from '../../src/dva/dvaLearnerResultRecord';

export const mockLearnerCrmResults: DvaLearnerTestResultModel[] = [
  {
    id: 'resultId1',
    certificateNumber: '999999999',
    testStatus: 'Pass',
    textLanguage: 'English',
    startTime: '2021-06-20T14:15:00.000Z',
    addressLine1: 'addressLine1',
    addressLine2: 'addressLine2',
    addressLine3: 'addressLine3',
    addressLine4: 'addressLine4',
    addressLine5: 'addressLine5',
    postCode: 'T1 3ST',
    title: Title.Mr,
    firstName: 'Tester',
    lastName: 'Téster-so✂️n',
    birthDate: '1990-06-23',
    driverNumber: '17874131',
    productId: CRMProductNumber.CAR,
    productNumber: CRMProductNumber.CAR,
    bookingReference: 'B-000-000-000',
  },
  {
    id: 'resultId2',
    certificateNumber: undefined,
    testStatus: 'Fail',
    textLanguage: 'English',
    startTime: '2020-12-03T14:15:00.000Z',
    addressLine1: 'addressLine1',
    addressLine2: 'addressLine2',
    addressLine3: 'addressLine3',
    addressLine4: 'addressLine4',
    addressLine5: 'addressLine5',
    postCode: 'T1 3ST',
    title: Title.Miss,
    firstName: 'Pauline',
    lastName: 'McTestFace',
    birthDate: '1984-12-01',
    driverNumber: 'PAULF152143RS8IV',
    productId: CRMProductNumber.MOTORCYCLE,
    productNumber: CRMProductNumber.MOTORCYCLE,
    bookingReference: 'B-000-000-001',
  },
];

export const mockAdiCrmResults: BaseTestResultModel[] = [
  {
    id: 'mockId',
    birthDate: '1999-11-10',
    bookingReference: '000-000-001-01',
    testStatus: 'Pass',
    startTime: '2021-07-05T11:49:41Z',
    addressLine1: 'mockAddressLine1',
    addressLine2: 'mockAddressLine2',
    addressLine3: 'mockAddressLine3',
    addressLine4: 'mockAddressLine4',
    addressLine5: 'mockAddressLine5',
    postCode: 'B15 2AJ',
    lastName: 'Jones',
    driverNumber: '12345678',
    paymentReferenceNumber: '321971',
    hptScore: 21,
    bandScore1: 22,
    bandScore2: 23,
    bandScore3: 24,
    bandScore4: 18,
    overallScore: 87,
  },
  {
    id: 'mockId2',
    birthDate: '1999-11-10',
    bookingReference: '000-000-001-02',
    testStatus: 'Fail',
    startTime: '2021-07-05T11:49:41Z',
    addressLine1: 'mockAddressLine1',
    addressLine2: 'mockAddressLine2',
    addressLine3: 'mockAddressLine3',
    addressLine4: 'mockAddressLine4',
    addressLine5: 'mockAddressLine5',
    postCode: 'B15 2AJ',
    lastName: 'Bradley',
    driverNumber: '65735683',
    paymentReferenceNumber: '321971',
    hptScore: 21,
    bandScore1: 10,
    bandScore2: 14,
    bandScore3: 8,
    bandScore4: 16,
    overallScore: 48,
  },
  {
    id: 'mockId3',
    birthDate: '1999-11-10',
    bookingReference: '000-000-001-02',
    testStatus: 'Not started',
    startTime: '2021-07-05T11:49:41Z',
    addressLine1: 'mockAddressLine1',
    addressLine2: 'mockAddressLine2',
    addressLine3: 'mockAddressLine3',
    addressLine4: 'mockAddressLine4',
    addressLine5: 'mockAddressLine5',
    postCode: 'B15 2AJ',
    lastName: 'Cooper',
    driverNumber: '66735683',
    paymentReferenceNumber: '321971',
    hptScore: 0,
    bandScore1: 0,
    bandScore2: 0,
    bandScore3: 0,
    bandScore4: 0,
    overallScore: 0,
  },
] as DvaInstructorTestResultModel[];

export const mockAmiCrmResults: BaseTestResultModel[] = [...mockAdiCrmResults];

export const mockLearnerResultRecord: DvaLearnerResultRecord[] = mockLearnerCrmResults.map((result) => new DvaLearnerResultRecord(result));

export const mockAdiResultRecord: DvaInstructorResultRecord[] = mockAdiCrmResults.map((result) => new DvaInstructorResultRecord(result));

export const mockAmiResultRecord: DvaInstructorResultRecord[] = mockAmiCrmResults.map((result) => new DvaInstructorResultRecord(result));
