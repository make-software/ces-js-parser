import { ExecutionResult, Hash, IResultWithBytes, RpcClient, URef } from 'casper-js-sdk';
import {
  Event,
  parseEventDataFromBytes,
  parseEventNameWithRemainder,
} from './event';
import { parseSchemasFromBytes, Schemas } from './schema';
import { CLValueParser } from "casper-js-sdk/dist/types/clvalue/Parser";

export interface ContractMetadata {
  schemas: Schemas;
  contractHash: Hash;
  contractPackageHash: Hash;
  eventsSchemaUref: URef;
  eventsUref: URef;
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

  public parseExecutionResult(executionResult: ExecutionResult): ParseResult[] {
    if (executionResult.errorMessage) {
      throw new Error(`failed deploy ${executionResult.errorMessage}`);
    }

    const results: ParseResult[] = [];

    for (const transform of executionResult.effects) {
      if (!transform.key.dictionary) {
        continue;
      }

      if (!transform.kind.isWriteCLValue()) {
        continue;
      }

      const eventPayloadCLValueWithRemainder = CLValueParser.fromBytesWithType(transform.kind.parseAsWriteCLValue().toBytes())

      if (!eventPayloadCLValueWithRemainder.result.any) {
        continue
      }

      eventPayloadCLValueWithRemainder.bytes

      if (eventPayloadCLValueWithRemainder.bytes.length < 4) {
        continue;
      }

      let eventNameWithRemainder: IResultWithBytes<string>;

      try {
        eventNameWithRemainder = parseEventNameWithRemainder(
          eventPayloadCLValueWithRemainder.bytes.subarray(4),
        );
      } catch (err) {
        continue;
      }

      const urefBytesWithRemainder = CLValueParser.fromBytesWithType(
        eventPayloadCLValueWithRemainder.bytes,
      );

      if (!urefBytesWithRemainder.result.uref) {
        throw new Error('not a valid uref for parsing');
      }

      const parsedEvent: Event = {
        contractHash: null,
        contractPackageHash: null,
        name: eventNameWithRemainder.result,
        data: {},
      };

      const contractMetadata = this.contractsMetadata[urefBytesWithRemainder.result.uref.toString()];
      if (!contractMetadata) {
        results.push({
          event: parsedEvent,
          error: `invalid event uref`,
        });

        continue;
      }

      parsedEvent.contractHash = contractMetadata.contractHash;
      parsedEvent.contractPackageHash = contractMetadata.contractPackageHash;

      const eventSchema = contractMetadata.schemas[eventNameWithRemainder.result];
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

  private static async getContractsMetadata(
    rpcClient: RpcClient,
    contractHashes: string[],
  ): Promise<Record<string, ContractMetadata>> {
    const contractsSchemas: Record<string, ContractMetadata> = {};

    const stateRootHash = await rpcClient.getStateRootHashLatest();

    for (const contractHash of contractHashes) {
      const contractData = (
        await rpcClient.getStateItem(stateRootHash.stateRootHash.toHex(), `hash-${contractHash}`, [])
      ).storedValue.contract;

      if (!contractData) {
        throw new Error('contract data not found');
      }

      let eventsSchemaUref: URef | undefined,
        eventsUref : URef | undefined;
      for (const namedKey of contractData.namedKeys.keys) {
        if (namedKey.name === EVENTS_SCHEMA_NAMED_KEY) {
          eventsSchemaUref = namedKey.key.uRef;
        } else if (namedKey.name === EVENTS_NAMED_KEY) {
          eventsUref = namedKey.key.uRef;
        }

        if (!!eventsSchemaUref && !!eventsUref) {
          break;
        }
      }

      if (!eventsSchemaUref) {
        throw new Error(`no '${EVENTS_SCHEMA_NAMED_KEY}' uref found`);
      }

      if (!eventsUref) {
        throw new Error(`no '${EVENTS_NAMED_KEY}' uref found`);
      }

      const schemaResponse = await rpcClient.getStateItem(stateRootHash.stateRootHash.toHex(), eventsSchemaUref.toString(), []);
      if (!schemaResponse.storedValue.clValue) {
        throw new Error(`no schema uref for ${eventsSchemaUref}`);
      }

      const schemas = parseSchemasFromBytes(schemaResponse.storedValue.clValue.bytes());

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
}

export async function fetchContractSchemasBytes(
  rpcClient: RpcClient,
  contractHash: string,
  stateRootHash: string,
): Promise<Uint8Array> {
  const schemaResponse = await rpcClient.getStateItem(stateRootHash, `hash-${contractHash}`, [EVENTS_SCHEMA_NAMED_KEY]);

  if (!schemaResponse.storedValue.clValue) {
    throw new Error('no clvalue for contract schema');
  }

  return schemaResponse.storedValue.clValue.bytes();
}
