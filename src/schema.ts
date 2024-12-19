import {CLType, CLTypeParser, IResultWithBytes, RpcClient} from 'casper-js-sdk';
import { EVENTS_SCHEMA_NAMED_KEY } from './parser';
import { CLValueParser } from "casper-js-sdk/dist/types/clvalue/Parser";

export type Schemas = Record<string, Schema>;

export type Schema = PropertyDefinition[];

interface PropertyDefinition {
  property: string;
  value: CLType;
}

export function parseSchemasFromBytes(rawSchemas: Uint8Array): Schemas {
  const schemasNumber = Buffer.from(rawSchemas).readUInt32LE(0);
  if (schemasNumber === 0 || schemasNumber > rawSchemas.length) {
    throw new Error('invalid schemasNumber value');
  }

  let remainder = rawSchemas.subarray(4);

  const schemas: Schemas = {};

  for (let i = 0; i < schemasNumber; i++) {
    const schemaName = CLValueParser.fromBytesWithType(remainder);

    const schemaWithRemainder = parseSchemaFromBytesWithRemainder(
      schemaName.bytes,
    );

    schemas[schemaName.result.toString()] = schemaWithRemainder.result;

    remainder = schemaWithRemainder.bytes;
  }

  return schemas;
}

export function parseSchemaFromBytesWithRemainder(
  rawBytes: Uint8Array,
): IResultWithBytes<Schema> {
  const fieldsNumber = Buffer.from(rawBytes).readUInt32LE(0);
  if (fieldsNumber > rawBytes.length) {
    throw new Error('invalid fieldsNumber value');
  }

  let remainder = rawBytes.subarray(4);

  const schema: Schema = [];

  for (let i = 0; i < fieldsNumber; i++) {
    const fieldName = CLValueParser.fromBytesWithType(remainder);

    const clTypeWithRemainder = CLTypeParser.matchBytesToCLType(fieldName.bytes);

    remainder = fieldName.bytes;

    if (!clTypeWithRemainder.bytes) {
      throw new Error('remainder is empty');
    }

    schema.push({
      property: fieldName.result.toString(),
      value: clTypeWithRemainder.result,
    });

    remainder = clTypeWithRemainder.bytes;
  }

  return {
    result: schema,
    bytes: remainder,
  };
}

export async function fetchContractSchemasBytes(
  rpcClient: RpcClient,
  contractHash: string,
  stateRootHash: string,
): Promise<Uint8Array> {
  const contractData = await rpcClient.getStateItem(stateRootHash, `hash-${contractHash}`, []);

  if (!contractData || !contractData.storedValue.contract) {
    throw new Error('contract data not found');
  }

  const eventsSchema = contractData.storedValue.contract.namedKeys.keys.find(
    el => el.name === EVENTS_SCHEMA_NAMED_KEY,
  );
  if (!eventsSchema) {
    throw new Error(
      `'${EVENTS_SCHEMA_NAMED_KEY}' uref not found for contract '${contractHash}'`,
    );
  }

  const schemaResponse = await rpcClient.getStateItem(stateRootHash, eventsSchema.key.toString(), []);

  if (!schemaResponse.storedValue.clValue) {
    throw new Error('no CLValue for schema');
  }

  return schemaResponse.storedValue.clValue.bytes();
}
