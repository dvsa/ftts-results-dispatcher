import sftp from 'ssh2-sftp-client';

export const productionFileList = (): sftp.FileInfo[] => ([
  {
    type: 'l',
    name: 'mock-file-name-1',
    size: 30,
    modifyTime: 2,
    accessTime: 2,
    rights: {
      user: 'mock-user',
      group: 'mock-group',
      other: 'mock-other',
    },
    owner: 1,
    group: 1,
  },
  {
    type: 'l',
    name: 'mock-file-name-2',
    size: 30,
    modifyTime: 2,
    accessTime: 2,
    rights: {
      user: 'mock-user',
      group: 'mock-group',
      other: 'mock-other',
    },
    owner: 1,
    group: 1,
  },
  {
    type: 'l',
    name: 'mock-file-name-3',
    size: 30,
    modifyTime: 2,
    accessTime: 2,
    rights: {
      user: 'mock-user',
      group: 'mock-group',
      other: 'mock-other',
    },
    owner: 1,
    group: 1,
  },
]);

export const developmentFileListWithPath = (): string[] => [
  'stub-sftp/mock-folder/DVTA2020080104.txt',
  'stub-sftp/mock-folder/DVTA2020080101.txt',
  'stub-sftp/mock-folder/DVTA2020080105.txt',
  'stub-sftp/mock-folder/DVTA2020080102.txt',
  'stub-sftp/mock-folder/DVTA2020080103.txt',
];

export const developmentFileListWithoutPath = (): string[] => [
  'DVTA2020080104.txt',
  'DVTA2020080101.txt',
  'DVTA2020080105.txt',
  'DVTA2020080102.txt',
  'DVTA2020080103.txt',
];
