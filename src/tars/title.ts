import { Gender } from '../crm/testResults/genderCode';
import { Title } from '../crm/testResults/title';

export const resolveTitle = (title: Title | undefined, genderCode: Gender | undefined): Title | undefined => {
  if (title) {
    return title;
  }
  if (genderCode === Gender.M) {
    return Title.Mr;
  }
  if (genderCode === Gender.F) {
    return Title.Ms;
  }
  return undefined;
};
