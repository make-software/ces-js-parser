import { CasperServiceByJsonRPC, CLType, decodeBase16 } from 'casper-js-sdk';
import { matchBytesToCLType, parseBytesWithRemainder } from './casper/utils';
import { EVENTS_SCHEMA_NAMED_KEY, WithRemainder } from './casper/types';

export type Schemas = Record<string, Schema>;

export type Schema = PropertyDefenition[];

interface PropertyDefenition {
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

export function parseSchemaFromBytesWithRemainder(
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

    const clType = clTypeWithRemainder.result.unwrap();

    if (!clTypeWithRemainder.remainder) {
      throw new Error('remainder is empty');
    }

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

export async function fetchContractSchemasBytes(
  rpcClient: CasperServiceByJsonRPC,
  contractHash: string,
  stateRootHash: string,
): Promise<Uint8Array> {
  const entity_identifier = {
    EntityAddr: `entity-contract-${contractHash}`,
  };
  const contractData = await rpcClient.getEntity(entity_identifier);

  if (!contractData || !contractData.AddressableEntity) {
    throw new Error('contract data not found');
  }
  const entity = contractData.AddressableEntity;
  const eventsSchema = entity.named_keys.find(
    el => el.name === EVENTS_SCHEMA_NAMED_KEY,
  );
  if (!eventsSchema) {
    throw new Error(
      `'${EVENTS_SCHEMA_NAMED_KEY}' uref not found for contract '${contractHash}'`,
    );
  }

  const schemaResponse = await rpcClient['client'].request({
    method: 'state_get_item',
    params: {
      state_root_hash: stateRootHash,
      key: eventsSchema.key,
      path: [],
    },
  });

  return decodeBase16(schemaResponse.stored_value.CLValue.bytes);
}
