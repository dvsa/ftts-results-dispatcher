// Errors are received untyped so need to use any
/* eslint-disable @typescript-eslint/no-explicit-any */

import { CustomError } from '../error/customError';

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
export class CrmError extends CustomError {
  constructor(
    message?: string,
    public cause?: any,
    public properties?: { [key: string]: any },
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = CrmError.name;
  }
}
