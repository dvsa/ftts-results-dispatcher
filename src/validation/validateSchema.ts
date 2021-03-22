import Ajv from 'ajv';

export default function validateSchema(schema: object, data: object): boolean {
  return !!new Ajv().validate(schema, data);
}
