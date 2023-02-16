import { CLType } from 'casper-js-sdk';
import { WithRemainder } from '../casper/types';
import { matchBytesToCLType, parseBytesWithRemainder } from '../casper/utils';

export type Schemas = Record<string, Schema>;

export type Schema = PropertyDefenition[];

interface PropertyDefenition {
  property: string;
  value: CLType;
}

export const EVENTS_SCHEMA_NAMED_KEY = '__events_schema';
export const EVENTS_NAMED_KEY = '__events';

export function parseSchemasFromBytes(rawSchemas: Uint8Array): Schemas {
  const schemasNumber = Buffer.from(rawSchemas).readUInt32LE(0);
  if (schemasNumber === 0 || schemasNumber > rawSchemas.length) {
    throw new Error('invalid schemasNumber value');
  }

  let remainder = rawSchemas.subarray(4);

  const schemas: Schemas = {};

  for (let i = 0; i < schemasNumber; i++) {
    const rawBytesWithRemainder = parseBytesWithRemainder(remainder);

    const schemaName = new TextDecoder().decode(rawBytesWithRemainder.data);

    const schemaWithRemainder = parseSchemaFromBytesWithRemainder(
      rawBytesWithRemainder.remainder,
    );

    schemas[schemaName] = schemaWithRemainder.data;

    remainder = schemaWithRemainder.remainder;
  }

  return schemas;
}

function parseSchemaFromBytesWithRemainder(
  rawBytes: Uint8Array,
): WithRemainder<Schema> {
  const fieldsNumber = Buffer.from(rawBytes).readUInt32LE(0);
  if (fieldsNumber > rawBytes.length) {
    throw new Error('invalid fieldsNumber value');
  }

  let remainder = rawBytes.subarray(4);

  const schema: Schema = [];

  for (let i = 0; i < fieldsNumber; i++) {
    const rawBytesWithRemainder = parseBytesWithRemainder(remainder);

    const fieldName = new TextDecoder().decode(rawBytesWithRemainder.data);
    remainder = rawBytesWithRemainder.remainder;

    const clTypeWithRemainder = matchBytesToCLType(remainder);

    if (!clTypeWithRemainder.remainder) {
      throw new Error('remainder is empty');
    }

    const clType = clTypeWithRemainder.result.unwrap();

    schema.push({
      property: fieldName,
      value: clType,
    });
    remainder = clTypeWithRemainder.remainder;
  }

  return {
    data: schema,
    remainder,
  };
}
