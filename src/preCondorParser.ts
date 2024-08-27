import {
  CasperServiceByJsonRPC,
  decodeBase16,
  encodeBase16,
} from 'casper-js-sdk-pre-condor';
import {
  parseBytesWithRemainder,
  parseCLValueFromBytesWithRemainder,
} from './casper/utils';
import {
  Event,
  parseEventDataFromBytes,
  parseEventNameWithRemainder,
} from './event';
import { ExecutionResultV1 } from './casper/preCondorTypes';
import { parseSchemasFromBytes, Schemas } from './schema';
import { ParseResult } from './types';
import {
  DICTIONARY_PREFIX,
  EVENTS_NAMED_KEY,
  EVENTS_SCHEMA_NAMED_KEY,
  WithRemainder,
} from './casper/types';
import { RawCLValue } from './casper/condorTypes';

export interface ContractMetadata {
  schemas: Schemas;
  contractHash: Uint8Array;
  contractPackageHash: Uint8Array;
  eventsSchemaUref: string;
  eventsUref: string;
}

export class PreCondorParser {
  constructor(
    private readonly contractsMetadata: Record<string, ContractMetadata>,
  ) {}

  static async create(
    rpcClient: CasperServiceByJsonRPC,
    contractHashes: string[],
  ): Promise<PreCondorParser> {
    const contractsMetadata = await PreCondorParser.getContractsMetadata(
      rpcClient,
      contractHashes,
    );

    return Promise.resolve(new PreCondorParser(contractsMetadata));
  }

  public parseExecutionResult(executionResultRaw: any): ParseResult[] {
    let executionResult = executionResultRaw as ExecutionResultV1;
    if (!executionResult.Success) {
      throw new Error('failed deploy');
    }

    const results: ParseResult[] = [];

    for (const transform of executionResult.Success.effect.transforms) {
      if (!transform.transform.WriteCLValue) {
        continue;
      }

      if (!transform.key.startsWith(DICTIONARY_PREFIX)) {
        continue;
      }

      let clValueWithRemainder: WithRemainder<RawCLValue>;
      try {
        clValueWithRemainder = parseCLValueFromBytesWithRemainder(
          decodeBase16(transform.transform.WriteCLValue.bytes),
        );
      } catch (err) {
        continue;
      }

      if (clValueWithRemainder.data.bytes.length < 4) {
        continue;
      }

      let eventNameWithRemainder: WithRemainder<string>;

      try {
        eventNameWithRemainder = parseEventNameWithRemainder(
          clValueWithRemainder.data.bytes.subarray(4),
        );
      } catch (err) {
        continue;
      }

      const urefBytesWithRemainder = parseBytesWithRemainder(
        clValueWithRemainder.remainder,
      );

      const uref = `uref-${encodeBase16(urefBytesWithRemainder.data)}-007`;

      const parsedEvent: Event = {
        contractHash: null,
        contractPackageHash: null,
        name: eventNameWithRemainder.data,
        data: {},
      };

      const contractMetadata = this.contractsMetadata[uref];
      if (!contractMetadata) {
        results.push({
          event: parsedEvent,
          error: `invalid event uref`,
        });

        continue;
      }

      parsedEvent.contractHash = contractMetadata.contractHash;
      parsedEvent.contractPackageHash = contractMetadata.contractPackageHash;

      const eventSchema = contractMetadata.schemas[eventNameWithRemainder.data];
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
          eventNameWithRemainder.remainder,
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
    rpcClient: CasperServiceByJsonRPC,
    contractHashes: string[],
  ): Promise<Record<string, ContractMetadata>> {
    const contractsSchemas: Record<string, ContractMetadata> = {};

    const stateRootHash = await rpcClient.getStateRootHash();

    for (const contractHash of contractHashes) {
      const contractData = (
        await rpcClient.getBlockState(stateRootHash, `hash-${contractHash}`, [])
      ).Contract;

      if (!contractData) {
        throw new Error('contract data not found');
      }

      let eventsSchemaUref = '',
        eventsUref = '';
      for (const namedKey of contractData.namedKeys) {
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

      const schemaResponse = await rpcClient['client'].request({
        method: 'state_get_item',
        params: {
          state_root_hash: stateRootHash,
          key: eventsSchemaUref,
          path: [],
        },
      });

      const schemas = parseSchemasFromBytes(
        decodeBase16(schemaResponse.stored_value.CLValue.bytes),
      );

      const contractPackageHash = contractData.contractPackageHash.replace(
        'contract-package-wasm',
        '',
      );

      contractsSchemas[eventsUref] = {
        schemas,
        contractHash: decodeBase16(contractHash),
        contractPackageHash: decodeBase16(contractPackageHash),
        eventsSchemaUref,
        eventsUref,
      };
    }

    return contractsSchemas;
  }
}

export async function fetchContractSchemasBytes(
  rpcClient: CasperServiceByJsonRPC,
  contractHash: string,
  stateRootHash: string,
): Promise<Uint8Array> {
  const schemaResponse = await rpcClient['client'].request({
    method: 'state_get_item',
    params: {
      state_root_hash: stateRootHash,
      key: `hash-${contractHash}`,
      path: [EVENTS_SCHEMA_NAMED_KEY],
    },
  });

  return decodeBase16(schemaResponse.stored_value.CLValue.bytes);
}
