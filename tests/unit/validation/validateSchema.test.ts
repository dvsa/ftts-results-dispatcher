import Ajv from 'ajv';
import validateSchema, { ValidationError } from '../../../src/validation/validateSchema';
import testSchema from '../../mocks/test.schema.json';

const ajv = new Ajv({ allErrors: true });
const testValidateFunction = ajv.compile(testSchema);

describe('validateSchema', () => {
  test('GIVEN valid input data WHEN validateSchema THEN returns undefined', () => {
    expect(validateSchema(testValidateFunction, validData)).toBeUndefined();
  });

  test('GIVEN input data without required field WHEN validateSchema THEN returns validation errors', () => {
    const validationErrors = validateSchema(testValidateFunction, {});

    expect(validationErrors).toBeDefined();
    expect(validationErrors).toStrictEqual<ValidationError[]>([
      {
        dataPath: '',
        errorMessage: "should have required property 'requiredStringValue'",
        params: { missingProperty: 'requiredStringValue' },
      },
    ]);
  });

  test('GIVEN input data with additional property WHEN validateSchema THEN returns validation errors', () => {
    const validationErrors = validateSchema(testValidateFunction, {
      requiredStringValue: 'test',
      additionalProperty: 'ha!',
    });

    expect(validationErrors).toBeDefined();
    expect(validationErrors).toStrictEqual<ValidationError[]>([
      {
        dataPath: '',
        errorMessage: 'should NOT have additional properties',
        params: { additionalProperty: 'additionalProperty' },
      },
    ]);
  });

  test('GIVEN input data with wrong value WHEN validateSchema THEN returns validation errors', () => {
    expect(validateSchema(testValidateFunction, dataWithInvalidPattern)).toBeDefined();
    expect(validateSchema(testValidateFunction, dataWithInvalidPattern2)).toBeDefined();
    expect(validateSchema(testValidateFunction, dataWithInvalidPattern3)).toBeDefined();
    expect(validateSchema(testValidateFunction, dataWithInvalidEnum)).toBeDefined();
    expect(validateSchema(testValidateFunction, dataWithInvalidDate)).toBeDefined();
    expect(validateSchema(testValidateFunction, dataWithInvalidInteger)).toBeDefined();
    expect(validateSchema(testValidateFunction, dataWithInvalidConst)).toBeDefined();
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
