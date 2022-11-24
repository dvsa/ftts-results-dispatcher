export enum TestStatus {
  FAIL = 1,
  PASS = 2,
  NOT_STARTED = 3,
  INCOMPLETE = 4,
  NEGATED = 5,
}

export function testStatusToString(testStatus: TestStatus): string {
  if (testStatus === TestStatus.FAIL) {
    return 'Fail';
  }
  if (testStatus === TestStatus.PASS) {
    return 'Pass';
  }
  if (testStatus === TestStatus.NOT_STARTED) {
    return 'Not started';
  }
  if (testStatus === TestStatus.INCOMPLETE) {
    return 'Incomplete';
  }
  return 'Negated';
}
