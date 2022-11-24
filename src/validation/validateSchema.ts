import Ajv from 'ajv';
import { logger } from '../observability/logger';
import tarsTestResultSchema from '../crm/testResults/tarsTestResultModel.schema.json';
import dvaInstructorTestResultSchema from '../crm/testResults/dvaInstructorTestResultModel.schema.json';
import dvaLearnerTestResultSchema from '../crm/testResults/dvaLearnerTestResultModel.schema.json';
import tarsXmlFileSchema from '../tars/tarsFile.schema.json';

const ajv = new Ajv({ allErrors: true });
export const validateTarsTestResult = ajv.compile(tarsTestResultSchema);
export const validateDvaInstructorTestResult = ajv.compile(dvaInstructorTestResultSchema);
export const validateDvaLearnerTestResult = ajv.compile(dvaLearnerTestResultSchema);
export const validateTarsXmlFile = ajv.compile(tarsXmlFileSchema);

export type ValidationError = {
  dataPath: string;
  errorMessage: string;
  params: Record<string, string>;
};

export default function validateSchema(validateFunction: Ajv.ValidateFunction, data: Record<string, unknown>): ValidationError[] | undefined {
  const validated = validateFunction(data);
  const validationErrors = validateFunction.errors?.length ? toErrorsArray(validateFunction.errors) : undefined;

  if (!validated) {
    logger.debug('validateSchema: Schema validation failed - data', {
      data,
      validationErrors,
    });
  }

  return validationErrors;
}

const toErrorsArray = (ajvErrors: Ajv.ErrorObject[]): ValidationError[] => ajvErrors.map((error) => ({
  dataPath: error.dataPath,
  errorMessage: error.message ?? 'unknown',
  params: error.params as Record<string, string>,
}));
