// Allowing non-null assertion as there are fields we know we have validated and so know are defined at this point
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TarsTestResultModel } from '../crm/testResults/tarsTestResultModel';
import { formatDate, DateFormat } from '../utils/formatDate';

export class Result {
  public SessionPaperID: string;

  public ExamSeriesCode: string;

  public LanguageID: LanguageId;

  public Version: number;

  public FormName: string;

  public CertificateNumber?: string;

  public TestSessionDate: string;

  public TestResult: TarsTestResult;

  constructor(crmTestResult: TarsTestResultModel) {
    this.SessionPaperID = this.createSessionPaperId(crmTestResult.bookingReference);
    this.ExamSeriesCode = crmTestResult.examSeriesCode!;
    this.LanguageID = this.resolveLanguageId(crmTestResult.textLanguage);
    this.Version = 1;
    this.FormName = this.ExamSeriesCode;
    this.CertificateNumber = crmTestResult.certificateNumber;
    this.TestSessionDate = formatDate(new Date(crmTestResult.startTime!), DateFormat['dd/MM/yyyy'])!;
    this.TestResult = this.resolveTestResult(crmTestResult.testStatus);
  }

  private createSessionPaperId(bookingReference: string): string {
    return bookingReference.replace(/-/g, '').substr(1, 9);
  }

  // TestResults from CRM need to be validated against JSON schema first
  private resolveLanguageId(crmLanguage: string | undefined): LanguageId {
    if (crmLanguage === 'Cymraeg (Welsh)') return LanguageId.WEL;
    return LanguageId.ENG;
  }

  private resolveTestResult(crmTestStatus: string): TarsTestResult {
    if (crmTestStatus === 'Fail') return TarsTestResult.F;
    return TarsTestResult.P;
  }
}

export enum LanguageId {
  ENG = 'ENG',
  WEL = 'WEL',
}
export enum TarsTestResult {
  P = 'P',
  F = 'F',
}

export enum TarsResultType {
  RESULT = 1,
  NEGATED_RESULT = 2,
}
