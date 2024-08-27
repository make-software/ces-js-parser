import {
  CasperServiceByJsonRPC,
  decodeBase16,
  encodeBase16,
} from 'casper-js-sdk';
import {
  parseBytesWithRemainder,
  parseCLValueFromBytesWithRemainder,
} from './casper/utils';
import {
  Event,
  parseEventDataFromBytes,
  parseEventNameWithRemainder,
} from './event';
import {
  ExecutionResult,
  ExecutionResultV2,
  RawCLValue,
} from './casper/condorTypes';
import { ExecutionResultV1 } from './casper/preCondorTypes';

import { parseSchemasFromBytes } from './schema';
import { ParseResult } from './types';
import {
  DICTIONARY_PREFIX,
  EVENTS_NAMED_KEY,
  EVENTS_SCHEMA_NAMED_KEY,
  WithRemainder,
} from './casper/types';

export class CondorParser {
  constructor(
    private readonly contractsMetadata: Record<string, ContractMetadata>,
  ) {}

  static async create(
    rpcClient: CasperServiceByJsonRPC,
    contractHashes: string[],
  ): Promise<CondorParser> {
    const contractsMetadata = await CondorParser.getContractsMetadata(
      rpcClient,
      contractHashes,
    );

    return Promise.resolve(new CondorParser(contractsMetadata));
  }

  public parseExecutionResult(executionResultRaw: any): ParseResult[] {
    let executionResult = executionResultRaw as ExecutionResult;
    if (!isSuccessfull(executionResult)) {
      throw new Error('failed transaction');
    }
    if ('Version1' in executionResult) {
      return handleVersion1(executionResult.Version1, this.contractsMetadata);
    }
    if ('Version2' in executionResult) {
      return handleVersion2(executionResult.Version2, this.contractsMetadata);
    }
    throw new Error('Unknown execution result version');
  }

  private static async getContractsMetadata(
    rpcClient: CasperServiceByJsonRPC,
    contractHashes: string[],
  ): Promise<Record<string, ContractMetadata>> {
    const contractsSchemas: Record<string, ContractMetadata> = {};

    for (const contractHash of contractHashes) {
      const entity_identifier = {
        EntityAddr: `entity-contract-${contractHash}`,
      };
      const contractData = await rpcClient.getEntity(entity_identifier);

      if (!contractData || !contractData.AddressableEntity) {
        throw new Error('contract data not found');
      }
      const entity = contractData.AddressableEntity;

      let eventsSchemaUref = '',
        eventsUref = '';
      for (const namedKey of entity.named_keys) {
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
      const stateRootHash = await rpcClient.getStateRootHash();
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

      const contractPackageHash = entity.entity.package_hash.replace(
        'package-',
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
      key: `entity-contract-${contractHash}`,
      path: [EVENTS_SCHEMA_NAMED_KEY],
    },
  });

  return decodeBase16(schemaResponse.stored_value.CLValue.bytes);
}

function isSuccessfull(executionResult: ExecutionResult): boolean {
  if ('Version1' in executionResult) {
    const typedExecutionResult = executionResult.Version1;
    return !!typedExecutionResult.Success;
  } else if ('Version2' in executionResult) {
    const typedExecutionResult = executionResult.Version2;
    return !typedExecutionResult.error_message;
  }
  throw new Error('Unknown execution result version');
}

function handleVersion2(
  executionResult: ExecutionResultV2,
  contractsMetadata: Record<string, ContractMetadata>,
): ParseResult[] {
  const transforms = executionResult.effects;
  const results: ParseResult[] = [];
  for (const transform of transforms) {
    if ('Identity' == transform.kind || !('Write' in transform.kind)) {
      continue;
    }
    if (!transform.key.startsWith(DICTIONARY_PREFIX)) {
      continue;
    }
    let clValueWithRemainder: WithRemainder<RawCLValue>;
    try {
      const anyWrite = transform.kind as any;
      clValueWithRemainder = parseCLValueFromBytesWithRemainder(
        decodeBase16(anyWrite.Write.CLValue.bytes),
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

    const contractMetadata = contractsMetadata[uref];
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
function handleVersion1(
  executionResult: ExecutionResultV1,
  contractsMetadata: Record<string, ContractMetadata>,
): ParseResult[] {
  const transforms = executionResult.Success!.effect.transforms;
  const results: ParseResult[] = [];

  for (const transform of transforms) {
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

    const contractMetadata = contractsMetadata[uref];
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
