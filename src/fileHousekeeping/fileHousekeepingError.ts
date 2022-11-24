// Errors are received untyped so need to use any
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
export class FileHousekeepingError extends Error {
  constructor(
    message?: string,
    public oldProcessedFilesError?: any,
    public oldMetadataFilesError?: any,
    public properties?: { [key: string]: any },
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = FileHousekeepingError.name;
  }
}
