/* eslint-disable @typescript-eslint/no-explicit-any */
export class AzureFilesError extends Error {
  constructor(
    message?: string,
    public cause?: any,
    public properties?: {[key: string]: any},
  ) {
    super(message);
    // restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
    // stack traces display correctly now
    this.name = AzureFilesError.name;
  }
}
