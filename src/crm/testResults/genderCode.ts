export enum CrmGenderCode {
  MALE = 1,
  FEMALE = 2,
  UNKNOWN = 3,
}

export enum Gender {
  M = 'M',
  F = 'F',
}

export function crmGenderCodeToGender(crmGender: CrmGenderCode | undefined): Gender | undefined {
  switch (crmGender) {
    case CrmGenderCode.FEMALE: return Gender.F;
    case CrmGenderCode.MALE: return Gender.M;
    default: return undefined;
  }
}
