/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable guard-for-in */
/* eslint-disable @typescript-eslint/no-for-in-array */
/* eslint-disable no-restricted-syntax */
import { CRMTestClient } from '@dvsa/ftts-crm-test-client';
import { CRMTestClientScheme } from '@dvsa/ftts-crm-test-client/dist/crm-test-client';
import {
  CRMGenderCode, CRMPeopleTitle, CRMProductNumber, CRMTestStatus,
} from '@dvsa/ftts-crm-test-client/dist/enums';
import { CRMContact } from '@dvsa/ftts-crm-test-client/dist/crm-types';
import dateformat from 'dateformat';
import xml2js from 'xml2js';
import { v4 as uuidv4 } from 'uuid';
import { runFunction, waitUntilJobIsDone } from './utils/functionUtils';
import { prepareCdsData, PreparedCdsData } from './utils/prepareCdsData';
import { cleanString } from './utils/string';
import {
  createTarsShareClient,
  downloadTarsFileBasedOnMetadataFileName,
  listTarsMetadataFileNamesNewestFirst,
  removeAllFilesFromTarsShare,
  thereAreSomeFilesInTarsShare,
} from './utils/tarsUtils';

const APP_URL = process.env.APPLICATION_URL || 'http://localhost:7073';
const FUNCTION_ENDPOINT = '/admin/functions/V1_TARS_Results_Dispatcher';

const tarsShareClient = createTarsShareClient();

const TIMEOUT_DURATION = 180000;

const crmTestClient = new CRMTestClient(CRMTestClientScheme.DVSA, true);

describe('TARS results dispatcher', () => {
  let exportedStatus: string;
  beforeEach(() => {
    exportedStatus = `IntUnprocessed-${new Date().toISOString()}`;
  });
  afterEach(async () => {
    await crmTestClient.clearUnprocessedTestHistoryRecords(exportedStatus);
  }, TIMEOUT_DURATION);

  test('GIVEN prepared results and running application WHEN run V1_TARS_Results_Dispatcher THEN results file is stored', async () => {
    await removeAllFilesFromTarsShare(tarsShareClient);

    const cdsDataRows = new Array<PreparedCdsData>();
    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '123245675', '2019-05-31T18:30:00Z', CRMProductNumber.CAR, exportedStatus));
    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '467373', '2019-05-31T18:30:00Z', CRMProductNumber.MOTORCYCLE, exportedStatus));
    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Fail, '64632', '2019-05-31T18:30:00Z', CRMProductNumber.CAR, exportedStatus));
    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '15678945', '2019-05-31T18:30:00Z', CRMProductNumber.ADIP1, exportedStatus));
    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '1567512', '2019-05-31T18:30:00Z', CRMProductNumber.ADIHPT, exportedStatus));
    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Fail, '1567513', '2019-05-31T18:30:00Z', CRMProductNumber.ADIP1, exportedStatus));
    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Fail, '1567514', '2019-05-31T18:30:00Z', CRMProductNumber.ADIHPT, exportedStatus));

    await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
    await waitUntilJobIsDone(() => thereAreSomeFilesInTarsShare(tarsShareClient));
    const metadataFiles = await listTarsMetadataFileNamesNewestFirst();
    const tarsFileContents = await downloadTarsFileBasedOnMetadataFileName(metadataFiles[0], tarsShareClient);

    const filteredDataRows = filterOutFailedTests(cdsDataRows);
    checkFileContents(tarsFileContents, filteredDataRows);
  }, TIMEOUT_DURATION);

  test('GIVEN we are unable to work out the Gender for DVA candidate WHEN run V1_TARS_Results_Dispatcher THEN results are not exported and are marked as failed validation in CRM', async () => {
    await removeAllFilesFromTarsShare(tarsShareClient);

    const cdsDataRows = new Array<PreparedCdsData>();
    const contactData: Partial<CRMContact> = {
      address1_city: 'Birmingham',
      address1_line1: '1 Ewhurst Avenue',
      address1_postalcode: 'B29 6EY',
      gendercode: undefined,
      ftts_othertitle: undefined,
    };
    const invalidCandidateDva1 = await crmTestClient.createAndReturnNewCandidate('11223366', { ...contactData, ftts_title: CRMPeopleTitle.DR });
    const invalidCandidateDva2 = await crmTestClient.createAndReturnNewCandidate('11223377', { ...contactData, ftts_title: CRMPeopleTitle.MX });

    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '123245675', '2019-05-31T18:30:00Z', CRMProductNumber.CAR, exportedStatus));
    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '467374', '2019-05-31T15:30:00Z', CRMProductNumber.MOTORCYCLE, exportedStatus, invalidCandidateDva1));
    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '467375', '2019-05-31T14:30:00Z', CRMProductNumber.ADIP1, exportedStatus, invalidCandidateDva2));

    await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
    await waitUntilJobIsDone(() => thereAreSomeFilesInTarsShare(tarsShareClient));

    const metadataFiles = await listTarsMetadataFileNamesNewestFirst();
    const tarsFileContents = await downloadTarsFileBasedOnMetadataFileName(metadataFiles[0], tarsShareClient);

    const filteredDataRows = [cdsDataRows[0]];
    checkFileContents(tarsFileContents, filteredDataRows);
    const testHistory1 = await crmTestClient.retrieveTestHistory(cdsDataRows[1].testHistoryId);
    expect(testHistory1.ftts_tarsexportedstatus).toEqual('Failed Validation');
    const testHistory2 = await crmTestClient.retrieveTestHistory(cdsDataRows[2].testHistoryId);
    expect(testHistory2.ftts_tarsexportedstatus).toEqual('Failed Validation');
  }, TIMEOUT_DURATION);

  test('LGVMC takes its test date from the latest corresponding LGVHPT', async () => {
    await removeAllFilesFromTarsShare(tarsShareClient);

    const cdsDataRows = new Array<PreparedCdsData>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const licenceNumber = uuidv4().substr(0, 8);
    const contactData: Partial<CRMContact> = {
      address1_city: 'Birmingham',
      address1_line1: '1 Ewhurst Avenue',
      address1_postalcode: 'B29 6EY',
    };
    const candidate = await crmTestClient.createAndReturnNewCandidate(licenceNumber, contactData);
    await prepareCdsData(crmTestClient, CRMTestStatus.Pass, undefined, '2019-05-24T18:30:00Z', CRMProductNumber.LGVHPT, exportedStatus, candidate);
    await prepareCdsData(crmTestClient, CRMTestStatus.Pass, undefined, '2019-05-28T18:30:00Z', CRMProductNumber.LGVHPT, exportedStatus, candidate);

    const dispatchResult = await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '123245675', '2019-05-31T18:30:00Z', CRMProductNumber.LGVMC, exportedStatus, candidate);
    cdsDataRows.push(dispatchResult);

    const expectedCdsDataRows = [{
      ...dispatchResult,
      testDate: '2019-05-28T18:30:00Z',
    }];

    await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
    await waitUntilJobIsDone(() => thereAreSomeFilesInTarsShare(tarsShareClient));

    const metadataFiles = await listTarsMetadataFileNamesNewestFirst();
    const tarsFileContents = await downloadTarsFileBasedOnMetadataFileName(metadataFiles[0], tarsShareClient);

    checkFileContents(tarsFileContents, expectedCdsDataRows);
  }, TIMEOUT_DURATION);

  test('LGVHPT takes its test date from the latest corresponding LGVMC', async () => {
    await removeAllFilesFromTarsShare(tarsShareClient);

    const cdsDataRows = new Array<PreparedCdsData>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const licenceNumber = uuidv4().substr(0, 8);
    const contactData: Partial<CRMContact> = {
      address1_city: 'Birmingham',
      address1_line1: '1 Ewhurst Avenue',
      address1_postalcode: 'B29 6EY',
    };
    const candidate = await crmTestClient.createAndReturnNewCandidate(licenceNumber, contactData);
    await prepareCdsData(crmTestClient, CRMTestStatus.Pass, undefined, '2019-05-24T18:30:00Z', CRMProductNumber.LGVMC, exportedStatus, candidate);
    await prepareCdsData(crmTestClient, CRMTestStatus.Pass, undefined, '2019-05-28T18:30:00Z', CRMProductNumber.LGVMC, exportedStatus, candidate);

    const dispatchResult = await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '123245675', '2019-05-31T18:30:00Z', CRMProductNumber.LGVHPT, exportedStatus, candidate);
    cdsDataRows.push(dispatchResult);

    const expectedCdsDataRows = [{
      ...dispatchResult,
      testDate: '2019-05-28T18:30:00Z',
    }];

    await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
    await waitUntilJobIsDone(() => thereAreSomeFilesInTarsShare(tarsShareClient));

    const metadataFiles = await listTarsMetadataFileNamesNewestFirst();
    const tarsFileContents = await downloadTarsFileBasedOnMetadataFileName(metadataFiles[0], tarsShareClient);

    checkFileContents(tarsFileContents, expectedCdsDataRows);
  }, TIMEOUT_DURATION);

  test('PCVMC takes its test date from the latest corresponding PCVHPT', async () => {
    await removeAllFilesFromTarsShare(tarsShareClient);

    const cdsDataRows = new Array<PreparedCdsData>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const licenceNumber = uuidv4().substr(0, 8);
    const contactData: Partial<CRMContact> = {
      address1_city: 'Birmingham',
      address1_line1: '1 Ewhurst Avenue',
      address1_postalcode: 'B29 6EY',
    };
    const candidate = await crmTestClient.createAndReturnNewCandidate(licenceNumber, contactData);
    await prepareCdsData(crmTestClient, CRMTestStatus.Pass, undefined, '2019-05-24T18:30:00Z', CRMProductNumber.PCVHPT, exportedStatus, candidate);
    await prepareCdsData(crmTestClient, CRMTestStatus.Pass, undefined, '2019-05-28T18:30:00Z', CRMProductNumber.PCVHPT, exportedStatus, candidate);

    const dispatchResult = await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '123245675', '2019-05-31T18:30:00Z', CRMProductNumber.PCVMC, exportedStatus, candidate);
    cdsDataRows.push(dispatchResult);

    const expectedCdsDataRows = [{
      ...dispatchResult,
      testDate: '2019-05-28T18:30:00Z',
    }];

    await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
    await waitUntilJobIsDone(() => thereAreSomeFilesInTarsShare(tarsShareClient));

    const metadataFiles = await listTarsMetadataFileNamesNewestFirst();
    const tarsFileContents = await downloadTarsFileBasedOnMetadataFileName(metadataFiles[0], tarsShareClient);

    checkFileContents(tarsFileContents, expectedCdsDataRows);
  }, TIMEOUT_DURATION);

  test('PCVHPT takes its test date from the latest corresponding PCVMC', async () => {
    await removeAllFilesFromTarsShare(tarsShareClient);

    const cdsDataRows = new Array<PreparedCdsData>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const licenceNumber = uuidv4().substr(0, 8);
    const contactData: Partial<CRMContact> = {
      address1_city: 'Birmingham',
      address1_line1: '1 Ewhurst Avenue',
      address1_postalcode: 'B29 6EY',
    };
    const candidate = await crmTestClient.createAndReturnNewCandidate(licenceNumber, contactData);
    await prepareCdsData(crmTestClient, CRMTestStatus.Pass, undefined, '2019-05-24T18:30:00Z', CRMProductNumber.PCVMC, exportedStatus, candidate);
    await prepareCdsData(crmTestClient, CRMTestStatus.Pass, undefined, '2019-05-28T18:30:00Z', CRMProductNumber.PCVMC, exportedStatus, candidate);

    const dispatchResult = await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '123245675', '2019-05-31T18:30:00Z', CRMProductNumber.PCVHPT, exportedStatus, candidate);
    cdsDataRows.push(dispatchResult);

    const expectedCdsDataRows = [{
      ...dispatchResult,
      testDate: '2019-05-28T18:30:00Z',
    }];

    await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
    await waitUntilJobIsDone(() => thereAreSomeFilesInTarsShare(tarsShareClient));

    const metadataFiles = await listTarsMetadataFileNamesNewestFirst();
    const tarsFileContents = await downloadTarsFileBasedOnMetadataFileName(metadataFiles[0], tarsShareClient);

    checkFileContents(tarsFileContents, expectedCdsDataRows);
  }, TIMEOUT_DURATION);

  test('GIVEN negated results and running application WHEN run V1_TARS_Results_Dispatcher THEN results file is stored', async () => {
    await removeAllFilesFromTarsShare(tarsShareClient);

    const cdsDataRows = new Array<PreparedCdsData>();
    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Negated, '123245675', '2019-05-31T18:30:00Z', CRMProductNumber.CAR, exportedStatus));
    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Negated, '467373', '2019-05-31T18:30:00Z', CRMProductNumber.MOTORCYCLE, exportedStatus));
    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Negated, '64632', '2019-05-31T18:30:00Z', CRMProductNumber.CAR, exportedStatus));
    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Negated, '15678945', '2019-05-31T18:30:00Z', CRMProductNumber.ADIP1, exportedStatus));
    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Negated, '1567512', '2019-05-31T18:30:00Z', CRMProductNumber.ADIHPT, exportedStatus));

    await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
    await waitUntilJobIsDone(() => thereAreSomeFilesInTarsShare(tarsShareClient));

    const metadataFiles = await listTarsMetadataFileNamesNewestFirst();
    const tarsFileContents = await downloadTarsFileBasedOnMetadataFileName(metadataFiles[0], tarsShareClient);

    const filteredDataRows = filterOutFailedTests(cdsDataRows);
    checkFileContents(tarsFileContents, filteredDataRows);
  }, TIMEOUT_DURATION);

  test('GIVEN DVLA candidates without a gender set WHEN run V1_TARS_Results_Dispatcher THEN gender is worked out from licence and results file is stored', async () => {
    await removeAllFilesFromTarsShare(tarsShareClient);

    const cdsDataRows = new Array<PreparedCdsData>();
    const contactData: Partial<CRMContact> = {
      address1_city: 'Birmingham',
      address1_line1: '1 Ewhurst Avenue',
      address1_postalcode: 'B29 6EY',
      gendercode: undefined,
      ftts_title: CRMPeopleTitle.DR,
    };
    const candidateFemale5 = await crmTestClient.createAndReturnNewCandidate('SMITHJ512119D94L', contactData);
    const candidateMale1 = await crmTestClient.createAndReturnNewCandidate('SMITHJ112119D94L', contactData);

    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '123245675', '2019-05-31T12:30:00Z', CRMProductNumber.CAR, exportedStatus, candidateFemale5));
    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '123245679', '2019-05-31T15:30:00Z', CRMProductNumber.ADIP1, exportedStatus, candidateMale1));

    await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
    await waitUntilJobIsDone(() => thereAreSomeFilesInTarsShare(tarsShareClient));

    const metadataFiles = await listTarsMetadataFileNamesNewestFirst();
    const tarsFileContents = await downloadTarsFileBasedOnMetadataFileName(metadataFiles[0], tarsShareClient);

    // set expected gender
    cdsDataRows[0].gender = 'F';
    cdsDataRows[1].gender = 'M';
    const filteredDataRows = filterOutFailedTests(cdsDataRows);
    checkFileContents(tarsFileContents, filteredDataRows);
  }, TIMEOUT_DURATION);

  test('GIVEN DVA candidates without a gender set WHEN run V1_TARS_Results_Dispatcher THEN gender is worked out from the title and results file is stored', async () => {
    await removeAllFilesFromTarsShare(tarsShareClient);

    const cdsDataRows = new Array<PreparedCdsData>();
    const contactData: Partial<CRMContact> = {
      address1_city: 'Belfast',
      address1_line1: '1 Orchard Avenue',
      address1_postalcode: 'BE1 6EY',
      gendercode: undefined,
      ftts_othertitle: undefined,
    };
    const candidateFemale = await crmTestClient.createAndReturnNewCandidate('11223311', { ...contactData, ftts_title: CRMPeopleTitle.MISS });
    const candidateMale = await crmTestClient.createAndReturnNewCandidate('11223355', { ...contactData, ftts_title: CRMPeopleTitle.MR });

    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '123245675', '2019-05-31T18:30:00Z', CRMProductNumber.CAR, exportedStatus, candidateFemale));
    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '123245678', '2019-08-31T18:30:00Z', CRMProductNumber.MOTORCYCLE, exportedStatus, candidateMale));

    await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
    await waitUntilJobIsDone(() => thereAreSomeFilesInTarsShare(tarsShareClient));

    const metadataFiles = await listTarsMetadataFileNamesNewestFirst();
    const tarsFileContents = await downloadTarsFileBasedOnMetadataFileName(metadataFiles[0], tarsShareClient);

    // set expected gender
    cdsDataRows[0].gender = 'F';
    cdsDataRows[1].gender = 'M';
    const filteredDataRows = filterOutFailedTests(cdsDataRows);
    checkFileContents(tarsFileContents, filteredDataRows);
  }, TIMEOUT_DURATION);

  test('GIVEN DVLA candidates without a title set WHEN run V1_TARS_Results_Dispatcher THEN title is worked out from gender and results file is stored', async () => {
    await removeAllFilesFromTarsShare(tarsShareClient);

    const cdsDataRows = new Array<PreparedCdsData>();
    const contactData: Partial<CRMContact> = {
      address1_city: 'Birmingham',
      address1_line1: '1 Ewhurst Avenue',
      address1_postalcode: 'B29 6EY',
      ftts_title: undefined,
    };
    const candidateFemale = await crmTestClient.createAndReturnNewCandidate('SMITHJ512119D94L', { ...contactData, gendercode: CRMGenderCode.Female, ftts_othertitle: 'Lady' });
    const candidateMale = await crmTestClient.createAndReturnNewCandidate('SMITHJ012119D94L', { ...contactData, gendercode: CRMGenderCode.Male, ftts_othertitle: 'Lord' });

    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '123245675', '2019-05-31T12:30:00Z', CRMProductNumber.CAR, exportedStatus, candidateFemale));
    cdsDataRows.push(await prepareCdsData(crmTestClient, CRMTestStatus.Pass, '123245676', '2019-05-31T13:30:00Z', CRMProductNumber.MOTORCYCLE, exportedStatus, candidateMale));

    await runFunction(APP_URL, FUNCTION_ENDPOINT, exportedStatus);
    await waitUntilJobIsDone(() => thereAreSomeFilesInTarsShare(tarsShareClient));

    const metadataFiles = await listTarsMetadataFileNamesNewestFirst();
    const tarsFileContents = await downloadTarsFileBasedOnMetadataFileName(metadataFiles[0], tarsShareClient);

    // set expected title
    cdsDataRows[0].title = 'Ms';
    cdsDataRows[1].title = 'Mr';
    const filteredDataRows = filterOutFailedTests(cdsDataRows);
    checkFileContents(tarsFileContents, filteredDataRows);
  }, TIMEOUT_DURATION);
});

const checkFileContents = (fileBuffer: Buffer, cdsDataRows: Array<PreparedCdsData>): void => {
  const parser = new xml2js.Parser({
    xmldec: {
      version: '1.0',
      encoding: 'iso-8859-1',
    },
  });
  parser.parseString(fileBuffer.toString(), (error: any, result: any) => {
    expect(error).toBeNull();
    checkMsgHeader(cdsDataRows, result.TTResults_Message_Group.MsgHeader[0].$);
    checkCandidates(cdsDataRows, result.TTResults_Message_Group.Candidate);
    checkMsgTrailer(cdsDataRows, result.TTResults_Message_Group.MsgTrailer[0].$);
  });
};

const checkMsgHeader = (cdsDataRows: Array<PreparedCdsData>, msgHeader: any): void => {
  expect(msgHeader.RecordCount).toEqual(String(cdsDataRows.length));
  expect(msgHeader.ProcessedDate).toEqual(dateformat(new Date(), 'dd/mm/yyyy'));
};

const checkMsgTrailer = (cdsDataRows: Array<PreparedCdsData>, msgTrailer: any): void => {
  expect(msgTrailer.RecordCount).toEqual(String(cdsDataRows.length));
};

const filterOutFailedTests = (cdsDataRows: Array<PreparedCdsData>): Array<PreparedCdsData> => cdsDataRows.filter((row) => {
  if (['ADI', 'PDI'].includes(row.examSeriesCode)) {
    return true;
  }
  return row.testResult !== 'F';
});

const checkCandidates = (cdsDataRows: Array<PreparedCdsData>, candidates: Array<any>): void => {
  expect(candidates.length).toEqual(cdsDataRows.length);
  for (let i = 0; i < candidates.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const candidate = candidates[i];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const licenceNumber = candidate.CandPersonalDetails[0].DriverNumber[0];
    const cdsCandidate = cdsDataRows.find((item) => item.licenceNumber === licenceNumber);
    expect(cdsCandidate).not.toBeUndefined();
    checkCandidateData(cdsCandidate as PreparedCdsData, candidate);
  }
};

const checkCandidateData = (cdsCandidate: PreparedCdsData, candidate: any): void => {
  checkCandidateContactDetails(cdsCandidate, candidate.CandContactDetails[0]);
  checkCandidatePersonalDetails(cdsCandidate, candidate.CandPersonalDetails[0]);
  if (cdsCandidate.testStatus === CRMTestStatus.Negated) {
    checkCandidateResult(cdsCandidate, candidate.NegatedResult[0]);
  } else {
    checkCandidateResult(cdsCandidate, candidate.Result[0]);
  }
};

const checkCandidateContactDetails = (cdsCandidate: PreparedCdsData, contactDetails: any): void => {
  expect(contactDetails.AddressLine1[0]).toEqual(cdsCandidate.addressLine1);
  expect(contactDetails.PostCode[0]).toEqual(cdsCandidate.postalCode);
  if (cdsCandidate.addressLine2) {
    expect(contactDetails.AddressLine2[0]).toEqual(cdsCandidate.addressLine2);
  }
  if (cdsCandidate.addressLine3) {
    expect(contactDetails.AddressLine3[0]).toEqual(cdsCandidate.addressLine3);
  }
  if (cdsCandidate.city) {
    expect(contactDetails.AddressLine4[0]).toEqual(cdsCandidate.city);
  }
  if (cdsCandidate.county) {
    expect(contactDetails.AddressLine5[0]).toEqual(cdsCandidate.county);
  }
};

const checkCandidatePersonalDetails = (cdsCandidate: PreparedCdsData, personalDetails: any): void => {
  expect(personalDetails.DriverNumber[0]).toEqual(cdsCandidate.licenceNumber);
  expect(personalDetails.Title[0]).toEqual(cdsCandidate.title);
  expect(cleanString(personalDetails.Surname[0])).toEqual(cleanString(cdsCandidate.lastname));
  expect(cleanString(personalDetails.Forenames[0])).toEqual(cleanString(cdsCandidate.firstName));
  expect(personalDetails.DOB[0]).toEqual(dateformat(new Date(cdsCandidate.birthDate), 'dd/mm/yyyy'));
  if (cdsCandidate.adiPrn) {
    expect(personalDetails.ADIPRN[0]).toEqual(cdsCandidate.adiPrn);
  }
  const gender = resolveGender(cdsCandidate.gender, cdsCandidate.title);
  if (gender) {
    expect(personalDetails.Gender[0]).toEqual(gender);
  }
};

const resolveGender = (crmGender: string | undefined, crmTitle: string | undefined): string | undefined => {
  if (crmGender) {
    if (crmGender === '1') return 'M';
    if (crmGender === '2') return 'F';
  }
  if (crmTitle) {
    if (crmTitle === 'Mr') return 'M';
    if (['Mrs', 'Miss', 'Ms'].includes(crmTitle)) return 'F';
  }
  return undefined;
};

const checkCandidateResult = (cdsCandidate: PreparedCdsData, result: any): void => {
  expect(result.Version[0]).toEqual('1');
  expect(result.SessionPaperID[0]).toEqual(cdsCandidate.bookingRef.replace(/-/g, '').substr(1, 9));
  expect(result.ExamSeriesCode[0]).toEqual(cdsCandidate.examSeriesCode);
  expect(result.LanguageID[0]).toEqual(cdsCandidate.testLanguage === 1 ? 'ENG' : 'WEL');
  expect(result.FormName[0]).toEqual(result.ExamSeriesCode[0]);
  expect(result.CertificateNumber[0]).toEqual(cdsCandidate.certificateNumber);
  expect(result.TestSessionDate[0]).toEqual(dateformat(new Date(cdsCandidate.testDate), 'dd/mm/yyyy'));
  expect(result.TestResult[0]).toEqual(cdsCandidate.testResult);
};
