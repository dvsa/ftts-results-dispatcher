import { generateMD5Checksum } from '../../../src/utils/generateMd5Checksum';

describe('generateMd5Checksum', () => {
  let fileOneContent: string;
  let fileTwoContent: string;

  beforeEach(() => {
    fileOneContent = 'mock 123 test';
    fileTwoContent = 'mock 123 test';
  });

  test('GIVEN two files of the same content WHEN generateMd5Checksum THEN generates the same checksum for both files', () => {
    expect(generateMD5Checksum(fileOneContent)).toStrictEqual(generateMD5Checksum(fileTwoContent));
  });

  test('GIVEN two files of different content WHEN generateMd5Checksum THEN generates a different checksum for both files', () => {
    fileTwoContent = 'mock 321 test';
    expect(generateMD5Checksum(fileOneContent) === generateMD5Checksum(fileTwoContent)).toBeFalsy();
  });
});
