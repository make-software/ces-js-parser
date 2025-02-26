import {
  CLType,
  CLTypeParser,
  CLTypeString,
  CLTypeUInt32,
  CLValueParser,
  CLValueUInt32,
  IResultWithBytes,
  RpcClient
} from 'casper-js-sdk';
import {EVENTS_SCHEMA_NAMED_KEY} from './parser';

export type Schemas = Record<string, Schema>;

export type Schema = PropertyDefinition[];

interface PropertyDefinition {
  property: string;
  value: CLType;
}

export function parseSchemasFromBytes(rawSchemas: Uint8Array): Schemas {
  const schemasNumCLValue = CLValueUInt32.fromBytes(rawSchemas);
  const schemasNumber = schemasNumCLValue.result.toNumber();
  if (schemasNumber === 0 || schemasNumber > rawSchemas.length) {
    throw new Error('invalid schemasNumber value');
  }

  // TODO: Add native parsing of schema by js sdk when fix for parsing is released

  let remainder = schemasNumCLValue.bytes;

  const schemas: Schemas = {};

  for (let i = 0; i < schemasNumber; i++) {
    const schemaName = CLValueParser.fromBytesByType(remainder, CLTypeString);

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
  const fieldsNumResult = CLValueParser.fromBytesByType(rawBytes, CLTypeUInt32);
  const ui32Value = fieldsNumResult.result.ui32;
  if (!ui32Value) {
    throw new Error('invalid ui32 clvalue for fields number');
  }
  const fieldsNumber = ui32Value.toNumber();
  if (fieldsNumber > rawBytes.length) {
    throw new Error('invalid fieldsNumber value');
  }

  let remainder = fieldsNumResult.bytes;

  const schema: Schema = [];

  for (let i = 0; i < fieldsNumber; i++) {
    const fieldName = CLValueParser.fromBytesByType(remainder, CLTypeString);

    const clTypeWithRemainder = CLTypeParser.matchBytesToCLType(fieldName.bytes);

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
