import validateSchema from '../../../src/validation/validateSchema';
import * as testSchema from '../../mocks/test.schema.json';

describe('validateSchema', () => {
  test('GIVEN valid input data WHEN validateSchema THEN returns true', () => {
    expect(validateSchema(testSchema, validData)).toBeTruthy();
  });

  test('GIVEN input data withot required field WHEN validateSchema THEN returns false', () => {
    expect(validateSchema(testSchema, {})).toBeFalsy();
  });

  test('GIVEN input data with additional property WHEN validateSchema THEN returns false', () => {
    expect(validateSchema(testSchema, { test: 'test' })).toBeFalsy();
  });

  test('GIVEN input data with wrong value WHEN validateSchema THEN returns false', () => {
    expect(validateSchema(testSchema, dataWithInvalidPattern)).toBeFalsy();
    expect(validateSchema(testSchema, dataWithInvalidPattern2)).toBeFalsy();
    expect(validateSchema(testSchema, dataWithInvalidPattern3)).toBeFalsy();
    expect(validateSchema(testSchema, dataWithInvalidEnum)).toBeFalsy();
    expect(validateSchema(testSchema, dataWithInvalidDate)).toBeFalsy();
    expect(validateSchema(testSchema, dataWithInvalidInteger)).toBeFalsy();
    expect(validateSchema(testSchema, dataWithInvalidConst)).toBeFalsy();
  });
});

const validData = {
  requiredStringValue: 'test',
  patternValue: '10',
  enumValue: 'A',
  dateValue: '2019-03-06T10:28:55.000Z',
  integerValue: 1,
  constValue: 'CONST',
};

const dataWithInvalidPattern = {
  requiredStringValue: 'test',
  patternValue: 'a',
};

const dataWithInvalidPattern2 = {
  requiredStringValue: 'test',
  patternValue: '0',
};

const dataWithInvalidPattern3 = {
  requiredStringValue: 'test',
  patternValue: '-1',
};

const dataWithInvalidEnum = {
  requiredStringValue: 'test',
  enumValue: 'a',
};

const dataWithInvalidDate = {
  requiredStringValue: 'test',
  dateValue: 'a',
};

const dataWithInvalidInteger = {
  requiredStringValue: 'test',
  integerValue: 'a',
};

const dataWithInvalidConst = {
  requiredStringValue: 'test',
  constValue: 'a',
};
