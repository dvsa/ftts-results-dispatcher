import { CRMTestClient } from '@dvsa/ftts-crm-test-client';
import {
  CRMBookingStatus,
  CRMOrigin,
  CRMProductNumber,
  CRMTestStatus,
} from '@dvsa/ftts-crm-test-client/dist/enums';
import { CRMContact, CRMLicence } from '@dvsa/ftts-crm-test-client/dist/crm-types';
import { v4 as uuidv4 } from 'uuid';
import config from '../../../src/config';
import {
  productIdToExamSeriesCode, productIdToTestCode, titleToString, zeroFill,
} from './mappers';
import { cleanString } from '../../../src/utils/string';

export interface PreparedBaseCdsData {
  licenceNumber: string;
  lastname: string;
  testDate: string;
  testResult: string;
  testHistoryId: string;
}

export interface PreparedInstructorCdsData extends PreparedBaseCdsData {
  paymentReceiptNumber: string;
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  addressLine4?: string;
  addressLine5: string;
  postCode: string;
  testDate: string;
  testResult: string;
  bandScore1: string;
  bandScore2: string;
  bandScore3: string;
  bandScore4: string;
  overallScore: string;
  hptScore: string;
}

export interface PreparedCdsData extends PreparedBaseCdsData {
  firstInitial: string;
  firstName: string;
  title?: string;
  testCode: string;
  certificateNumber: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  postalCode?: string;
  city?: string;
  county?: string;
  gender?: string;
  birthDate: string;
  adiPrn?: string;
  bookingRef: string;
  testLanguage: number;
  examSeriesCode: string;
  testStatus: CRMTestStatus;
}

export const prepareCdsData = async (
  crmTestClient: CRMTestClient,
  testStatus: CRMTestStatus,
  certificateNumber: string | undefined,
  testDate: string,
  productNumber: CRMProductNumber = CRMProductNumber.CAR,
  exportedStatus: string,
  existingCandidate?: { contact: CRMContact, licence: CRMLicence, },
  additionalContactData?: Partial<CRMContact>,
): Promise<PreparedCdsData> => {
  let candidate = existingCandidate;
  let licenceNumber = candidate?.licence?.ftts_licence || '';
  if (candidate === undefined) {
    licenceNumber = uuidv4().substr(0, 8);
    const contactData: Partial<CRMContact> = {
      ...additionalContactData,
      address1_city: 'Birmingham',
      address1_line1: '1 Ewhurst Avenue',
      address1_postalcode: 'B29 6EY',
    };
    candidate = await crmTestClient.createAndReturnNewCandidate(licenceNumber, contactData);
  }
  const booking = await crmTestClient.createAndReturnNewBooking(
    {
      candidateId: candidate.contact.contactid,
      licenceId: candidate.licence.ftts_licenceid,
    },
    CRMBookingStatus.Confirmed,
    CRMOrigin.CitizenPortal,
    productNumber,
  );
  const testHistory = await crmTestClient.createNewTestHistory(
    booking.bookingProduct.ftts_bookingproductid, candidate.contact.contactid, testStatus,
    {
      ftts_tarsexportedstatus: exportedStatus,
      ftts_certificatenumber: certificateNumber,
      ftts_starttime: testDate,
    },
  );
  return {
    licenceNumber,
    firstInitial: cleanString(candidate.contact.ftts_firstandmiddlenames).substr(0, 1).toUpperCase(),
    firstName: cleanString(candidate.contact.ftts_firstandmiddlenames),
    lastname: cleanString(candidate.contact.lastname),
    title: titleToString.get(candidate.contact.ftts_title),
    testCode: productIdToTestCode.get(productNumber) as string,
    testDate: testHistory.ftts_starttime,
    certificateNumber: testHistory.ftts_certificatenumber,
    testResult: testHistory.ftts_teststatus === 1 ? 'F' : 'P',
    testHistoryId: testHistory.ftts_testhistoryid,
    addressLine1: candidate.contact.address1_line1,
    addressLine2: candidate.contact.address1_line2,
    addressLine3: candidate.contact.address1_line3,
    city: candidate.contact.address1_city,
    county: candidate.contact.address1_county,
    postalCode: candidate.contact.address1_postalcode,
    gender: candidate.contact.gendercode?.toString(),
    birthDate: candidate.contact.birthdate,
    adiPrn: candidate.contact.ftts_adiprn,
    bookingRef: booking.bookingProduct.ftts_reference,
    testLanguage: testHistory.ftts_textlanguage,
    examSeriesCode: productIdToExamSeriesCode.get(productNumber) || '',
    testStatus,
  };
};

export type InstructorTestProperties = {
  testStatus: CRMTestStatus;
  testDate: string;
  instructorTestType: CRMProductNumber;
  paymentReferenceNumber?: string;
  customAddressLines?: {
    address1_line1: string;
    address1_postalcode: string;
  };
};

export const prepareInstructorCdsData = async (crmTestClient: CRMTestClient, instructorTestProperties: InstructorTestProperties, exportedStatus: string): Promise<PreparedInstructorCdsData> => {
  const licenceNumber = uuidv4().substr(0, 8);
  const mandatoryAddressLines = {
    address1_line1: '8 Centenary Square, ICC',
    address1_postalcode: 'B1 2EA',
  };

  const { testStatus, testDate, instructorTestType } = instructorTestProperties;
  const candidateAddress = (instructorTestProperties.customAddressLines) ? instructorTestProperties.customAddressLines : mandatoryAddressLines;
  // if no payment reference number provided, generate a random 8 digit one
  const paymentReferenceNumber = (instructorTestProperties.paymentReferenceNumber !== undefined) ? instructorTestProperties.paymentReferenceNumber : Math.random().toString().slice(2, 10);

  const candidate = await crmTestClient.createAndReturnNewCandidate(licenceNumber, candidateAddress);
  const booking = await crmTestClient.createAndReturnNewBookingForInstructor({
    candidateId: candidate.contact.contactid,
    licenceId: candidate.licence.ftts_licenceid,
  }, undefined, undefined, instructorTestType, paymentReferenceNumber);
  const testHistory = await crmTestClient.createNewTestHistory(
    booking.bookingProduct.ftts_bookingproductid, candidate.contact.contactid, testStatus,
    {
      ftts_tarsexportedstatus: exportedStatus,
      ftts_starttime: testDate,
    },
  );
  const section = await crmTestClient.createMultipleChoiceTestSection(testHistory.ftts_testhistoryid);
  const bands = (instructorTestType === CRMProductNumber.ADIP1DVA) ? config.dva.adiBands : config.dva.amiBands;

  crmTestClient.startBatch();
  crmTestClient.batchCreateTestItemsPerSection(section, bands.band1);
  crmTestClient.batchCreateTestItemsPerSection(section, bands.band2);
  crmTestClient.batchCreateTestItemsPerSection(section, bands.band3);
  crmTestClient.batchCreateTestItemsPerSection(section, bands.band4);
  await crmTestClient.executeBatch();

  const scorePerBand = section.ftts_totalscore / 4;

  let testResult;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { ftts_teststatus } = testHistory;

  switch (ftts_teststatus) {
    case 1:
      testResult = 'F';
      break;
    case 2:
      testResult = 'P';
      break;
    default:
      testResult = 'N';
  }

  return {
    addressLine1: candidate.contact.address1_line1?.toUpperCase() || '',
    addressLine2: candidate.contact.address1_line2?.toUpperCase() || '',
    addressLine3: candidate.contact.address1_line3?.toUpperCase() || '',
    addressLine4: candidate.contact.address1_city?.toUpperCase() || '',
    addressLine5: candidate.contact.address1_county?.toUpperCase() || '',
    postCode: candidate.contact.address1_postalcode?.toUpperCase() || '',
    licenceNumber,
    testDate: testHistory.ftts_starttime,
    testResult,
    paymentReceiptNumber: zeroFill(booking.bookingProduct.ftts_paymentreferencenumber || '', 16),
    hptScore: zeroFill(Number(testHistory.ftts_hpttotalscore), 3),
    lastname: cleanString(candidate.contact.lastname).toUpperCase(),
    bandScore1: zeroFill(Number(scorePerBand), 3),
    bandScore2: zeroFill(Number(scorePerBand), 3),
    bandScore3: zeroFill(Number(scorePerBand), 3),
    bandScore4: zeroFill(Number(scorePerBand), 3),
    overallScore: zeroFill(Number(testHistory.ftts_mcqtotalscore), 3),
    testHistoryId: testHistory.ftts_testhistoryid,
  };
};
