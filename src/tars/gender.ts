import { Gender } from '../crm/testResults/genderCode';
import { Title } from '../crm/testResults/title';

export const resolveGender = (
  title: Title | undefined,
  genderCode: Gender | undefined,
  driverNumber: string | undefined,
): Gender | undefined => {
  if (genderCode) {
    return genderCode;
  }
  if (!driverNumber) {
    return undefined;
  }
  if (driverNumber.length === 16) {
    const seventhCharacter = driverNumber.charAt(6);
    if (['5', '6'].includes(seventhCharacter)) {
      return Gender.F;
    }
    if (['0', '1'].includes(seventhCharacter)) {
      return Gender.M;
    }
    return undefined;
  }
  if (driverNumber.length === 8 && title) {
    if (title === Title.Mr) {
      return Gender.M;
    }
    if ([Title.Mrs, Title.Miss].includes(title)) {
      return Gender.F;
    }
  }
  return undefined;
};
