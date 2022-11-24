import * as crypto from 'crypto-js';

export const generateMD5Checksum = (fileContent: string): string => crypto.MD5(fileContent).toString();
