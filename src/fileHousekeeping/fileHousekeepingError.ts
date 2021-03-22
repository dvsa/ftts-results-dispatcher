/* eslint-disable @typescript-eslint/no-explicit-any */
export class FileHousekeepingError extends Error {
  constructor(
    message?: string,
    public oldProcessedFilesError?: any,
    public oldMetadataFilesError?: any,
    public properties?: {[key: string]: any},
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = FileHousekeepingError.name;
  }
}
