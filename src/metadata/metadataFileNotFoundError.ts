// Errors are received untyped so need to use any
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
export class MetadataFileNotFoundError extends Error {
  constructor(
    message?: string,
    public cause?: any,
    public properties?: { [key: string]: any },
  ) {
    super(message);
    // restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
    // stack traces display correctly now
    this.name = MetadataFileNotFoundError.name;
  }
}
