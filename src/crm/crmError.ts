/* eslint-disable @typescript-eslint/no-explicit-any */
export class CrmError extends Error {
  constructor(
    message?: string,
    public cause?: any,
    public properties?: {[key: string]: any},
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = CrmError.name;
  }
}
