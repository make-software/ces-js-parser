import {
  CLType,
  CLTypeDynamic,
  CLTypeList,
  CLTypeMap,
  CLTypeString,
  CLTypeTuple2,
  CLValueParser,
  IResultWithBytes,
  RpcClient,
  TypeID,
} from 'casper-js-sdk';
import { EVENTS_SCHEMA_NAMED_KEY } from './parser';

export type Schemas = Record<string, Schema>;

export type Schema = PropertyDefinition[];

interface PropertyDefinition {
  property: string;
  value: CLType;
}

export function parseSchemasFromBytes(rawSchemas: Uint8Array): Schemas {
  const clTypeParsingSchema = new CLTypeMap(
    CLTypeString,
    new CLTypeList(
      new CLTypeTuple2(
        CLTypeString,
        new CLTypeDynamic(TypeID.String, CLTypeString),
      ),
    ),
  );

  const clValue = CLValueParser.fromBytesByType(
    rawSchemas,
    clTypeParsingSchema,
  );

  const schemas: Schemas = {};

  const map = clValue.result.map!.getMap();

  for (const [key, value] of Object.entries(map)) {
    schemas[key] = value.list!.elements.map(el => ({
      property: el.tuple2!.inner1.stringVal!.toString(),
      value: (el.tuple2!.inner2.type as CLTypeDynamic).inner,
    }));
  }

  return schemas;
}

export function parseSchemaFromBytesWithRemainder(
  rawBytes: Uint8Array,
): IResultWithBytes<Schema> {
  const clTypeParsingSchema = new CLTypeList(
    new CLTypeTuple2(
      CLTypeString,
      new CLTypeDynamic(TypeID.String, CLTypeString),
    ),
  );

  const clValue = CLValueParser.fromBytesByType(rawBytes, clTypeParsingSchema);

  const schema: Schema = clValue.result.list!.elements.map(el => ({
    property: el.tuple2!.inner1.stringVal!.toString(),
    value: (el.tuple2!.inner2.type as CLTypeDynamic).inner,
  }));

  return { result: schema, bytes: clValue.bytes };
}

export async function fetchContractSchemasBytes(
  rpcClient: RpcClient,
  contractHash: string,
  stateRootHash: string,
): Promise<Uint8Array> {
  const contractData = await rpcClient.getStateItem(
    stateRootHash,
    `hash-${contractHash}`,
    [],
  );

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

  const schemaResponse = await rpcClient.getStateItem(
    stateRootHash,
    eventsSchema.key.toString(),
    [],
  );

  if (!schemaResponse.storedValue.clValue) {
    throw new Error('no CLValue for schema');
  }

  return schemaResponse.storedValue.clValue.bytes();
}
