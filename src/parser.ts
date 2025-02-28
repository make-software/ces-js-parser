import {
  CLTypeByteArray,
  CLTypeList,
  CLTypeString,
  CLValueParser,
  CLValueUInt32,
  Conversions,
  ExecutionResult,
  Hash,
  IResultWithBytes,
  RpcClient,
  TypeID,
} from 'casper-js-sdk';
import {
  Event,
  parseEventDataFromBytes,
  parseEventNameWithRemainder,
} from './event';
import { parseSchemasFromBytes, Schemas } from './schema';

export interface ContractMetadata {
  schemas: Schemas;
  contractHash: Hash;
  contractPackageHash: Hash;
  eventsSchemaUref: string;
  eventsUref: string;
}

interface Dictionary {
  uref: string;
  key: string;
  value: Uint8Array;
}

export const EVENTS_SCHEMA_NAMED_KEY = '__events_schema';

export const EVENTS_NAMED_KEY = '__events';

export interface ParseResult {
  error: string | null;
  event: Event;
}

export class Parser {
  constructor(
    private readonly contractsMetadata: Record<string, ContractMetadata>,
  ) {}

  static async create(
    rpcClient: RpcClient,
    contractHashes: string[],
  ): Promise<Parser> {
    const contractsMetadata = await Parser.getContractsMetadata(
      rpcClient,
      contractHashes,
    );

    return Promise.resolve(new Parser(contractsMetadata));
  }

  private static async getContractsMetadata(
    rpcClient: RpcClient,
    contractHashes: string[],
  ): Promise<Record<string, ContractMetadata>> {
    const contractsSchemas: Record<string, ContractMetadata> = {};

    const stateRootHash = await rpcClient.getStateRootHashLatest();

    for (const contractHash of contractHashes) {
      const contractData = (
        await rpcClient.getStateItem(
          stateRootHash.stateRootHash.toHex(),
          `hash-${contractHash}`,
          [],
        )
      ).storedValue.contract;

      const namedKeys = Object.values(contractData!.namedKeys);

      if (!contractData) {
        throw new Error('contract data not found');
      }

      let eventsSchemaUref = '';
      let eventsUref = '';

      for (const namedKey of namedKeys) {
        if (namedKey.name === EVENTS_SCHEMA_NAMED_KEY) {
          eventsSchemaUref = namedKey.key;
        } else if (namedKey.name === EVENTS_NAMED_KEY) {
          eventsUref = namedKey.key;
        }

        if (eventsSchemaUref !== '' && eventsUref !== '') {
          break;
        }
      }

      if (!eventsSchemaUref) {
        throw new Error(`no '${EVENTS_SCHEMA_NAMED_KEY}' uref found`);
      }

      if (!eventsUref) {
        throw new Error(`no '${EVENTS_NAMED_KEY}' uref found`);
      }

      const schemaResponse = await rpcClient.getStateItem(
        stateRootHash.stateRootHash.toHex(),
        eventsSchemaUref.toString(),
        [],
      );
      if (!schemaResponse.storedValue.clValue) {
        throw new Error(`no schema uref for ${eventsSchemaUref}`);
      }

      const schemas = parseSchemasFromBytes(
        Conversions.decodeBase16(
          schemaResponse.rawJSON.stored_value.CLValue.bytes,
        ),
      );

      contractsSchemas[eventsUref.toString()] = {
        schemas,
        contractHash: Hash.fromHex(contractHash),
        contractPackageHash: contractData.contractPackageHash.hash,
        eventsSchemaUref,
        eventsUref,
      };
    }

    return contractsSchemas;
  }

  public parseExecutionResult(executionResult: ExecutionResult): ParseResult[] {
    if (!executionResult.effects || executionResult.effects.length === 0) {
      throw new Error(`failed transaction ${executionResult.errorMessage}`);
    }

    const results: ParseResult[] = [];

    for (const transform of executionResult.effects) {
      if (!transform.key.dictionary) {
        continue;
      }

      if (!transform.kind.isWriteCLValue()) {
        continue;
      }

      const clValue = transform.kind.parseAsWriteCLValue();

      if (!clValue.any) {
        continue;
      }

      let dictionary: Dictionary;
      let eventNameWithRemainder: IResultWithBytes<string>;
      try {
        dictionary = this.newDictionaryFromBytes(clValue.any.bytes());

        eventNameWithRemainder = parseEventNameWithRemainder(dictionary.value);
      } catch (err) {
        continue;
      }

      const parsedEvent: Event = {
        contractHash: null,
        contractPackageHash: null,
        name: eventNameWithRemainder.result,
        eventId: parseInt(dictionary.key),
        data: {},
      };

      const contractMetadata = this.contractsMetadata[dictionary.uref];
      if (!contractMetadata) {
        results.push({
          event: parsedEvent,
          error: `invalid event uref`,
        });

        continue;
      }

      parsedEvent.contractHash = contractMetadata.contractHash;
      parsedEvent.contractPackageHash = contractMetadata.contractPackageHash;

      const eventSchema =
        contractMetadata.schemas[eventNameWithRemainder.result];
      if (!eventSchema) {
        results.push({
          event: parsedEvent,
          error: `event name not in schema`,
        });

        continue;
      }

      try {
        parsedEvent.data = parseEventDataFromBytes(
          eventSchema,
          eventNameWithRemainder.bytes,
        );
      } catch (err) {
        results.push({
          event: parsedEvent,
          error: `failed to parse event data bytes, err: ${err.message}`,
        });

        continue;
      }

      results.push({
        event: parsedEvent,
        error: null,
      });
    }

    return results;
  }

  newDictionaryFromBytes(data: Uint8Array): Dictionary {
    const u32 = CLValueUInt32.fromBytes(data);
    const length = u32.result.toNumber();

    if (!length) {
      throw new Error(`Invalid length for bytes: ${length}`);
    }

    const clValue = CLValueParser.fromBytesWithType(u32.bytes);

    if (
      !(clValue.result.type instanceof CLTypeList) ||
      clValue.result.type.elementsType.getTypeID() !== TypeID.U8
    ) {
      throw new Error('failed to parse CLList(CLU8) from bytes');
    }

    const clValueByteSize = CLValueUInt32.fromBytes(clValue.bytes);

    const clByteArrayAsUref = CLValueParser.fromBytesByType(
      clValueByteSize.bytes,
      new CLTypeByteArray(clValueByteSize.result.toNumber()),
    );
    if (!clByteArrayAsUref.result.byteArray) {
      throw new Error('failed to parse CLByteArray from bytes');
    }

    const uref = `uref-${Conversions.encodeBase16(
      clByteArrayAsUref.result.byteArray.bytes(),
    )}-007`;

    const clStringAsDictKey = CLValueParser.fromBytesByType(
      clByteArrayAsUref.bytes,
      CLTypeString,
    );
    if (!clStringAsDictKey.result.stringVal) {
      throw new Error('failed to parse CLString from bytes');
    }

    return {
      uref: uref,
      key: clStringAsDictKey.result.stringVal.toString(),
      value: new Uint8Array(
        clValue.result.list!.elements.map(el => el.ui8!.toNumber()),
      ),
    };
  }
}

export async function fetchContractSchemasBytes(
  rpcClient: RpcClient,
  contractHash: string,
  stateRootHash: string,
): Promise<Uint8Array> {
  const schemaResponse = await rpcClient.getStateItem(
    stateRootHash,
    `hash-${contractHash}`,
    [EVENTS_SCHEMA_NAMED_KEY],
  );

  if (!schemaResponse.storedValue.clValue) {
    throw new Error('no clvalue for contract schema');
  }

  return schemaResponse.storedValue.clValue.bytes();
}
