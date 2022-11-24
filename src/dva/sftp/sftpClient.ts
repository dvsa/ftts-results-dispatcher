import { logger } from '../../observability/logger';
import { generateMD5Checksum } from '../../utils/generateMd5Checksum';

export interface SftpClient {
  /**
   * Returns a string containing the file content
   * @param sourcePath A path to the source file (should include the file name)
   */
  getFile(sourcePath: string): Promise<string>;
  /**
   * Uploads a file
   * @param destPath A path to a destination file (should include the file name)
   * @param fileContent A string containing the file content
   */
  putFile(destPath: string, fileContent: string): Promise<void>;
  /**
   * Lists files in a given directory
   * @param sourcePath A path to a source directory (Should include a folder, not a file name)
   * @param searchPattern (optional) A pattern to filter the result set with
   */
  listFiles(sourcePath: string, searchPattern?: string | RegExp): Promise<string[]>;
  /**
   * Deletes a file
   * @param destPath A path to a file to be deleted (should include the file name)
   */
  deleteFile(destPath: string): Promise<void>;
}

export const verifyFileContents = async (filePath: string, fileContent: string, sftpClient: SftpClient): Promise<void> => {
  const expectedFileChecksum = generateMD5Checksum(fileContent);
  const actualFileContent = await sftpClient.getFile(filePath);
  const actualFileChecksum = generateMD5Checksum(actualFileContent);
  if (actualFileChecksum !== expectedFileChecksum) {
    logger.info('sftpClient::verifyFileContents: Uploaded results file is invalid. Trying to delete a file', { filePath });
    try {
      await sftpClient.deleteFile(filePath);
    } catch (error) {
      logger.warn('sftpClient::verifyFileContents: Failed to delete invalid results file', { filePath });
      throw error;
    }
    throw new Error(`sftpClient::verifyFileContents: Invalid results file. Checksums do not match on file ${filePath}`);
  }
  logger.info('sftpClient::verifyFileContents: Successfully verified file', { filePath });
};
