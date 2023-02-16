import { CLValue, decodeBase16, encodeBase16 } from 'casper-js-sdk';
import {
  parseBytesWithRemainder,
  parseCLValueFromBytesWithRemainder,
} from '../casper/utils';
import {
  Event,
  parseEventDataFromBytes,
  parseEventNameWithRemainder,
} from './event';
import { ExecutionResult, RawCLValue, WithRemainder } from '../casper/types';
import {
  ContractSchemas,
  ContractSchemasClient,
} from './contract-schemas.client';

const DICTIONARY_PREFIX = 'dictionary-';

export interface ParseResult {
  error?: string;
  event?: Event;
}

export class Parser {
  constructor(
    private readonly contractsSchemas: Record<string, ContractSchemas>,
  ) {}

  static async initialise(
    contractSchemasClient: ContractSchemasClient,
    contractHashes: string[],
  ): Promise<Parser> {
    const contractsSchemas = await contractSchemasClient.getContractsSchemas(
      contractHashes,
    );

    return Promise.resolve(new Parser(contractsSchemas));
  }

  public async parseExecutionResult(
    executionResult: ExecutionResult,
  ): Promise<ParseResult[]> {
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

      const urefBytesWithReminder = parseBytesWithRemainder(
        clValueWithRemainder.remainder,
      );

      const uref = `uref-${encodeBase16(urefBytesWithReminder.data)}-007`;

      const contractSchemas = this.contractsSchemas[uref];
      if (!contractSchemas) {
        results.push({
          error: `invalid event uref for event name ${eventNameWithRemainder.data}`,
        });

        continue;
      }

      const eventSchema = contractSchemas.schemas[eventNameWithRemainder.data];
      if (!eventSchema) {
        results.push({
          error: `event name '${eventNameWithRemainder.data}' not in schema`,
        });

        continue;
      }

      let eventData: Record<string, CLValue> = {};

      try {
        eventData = parseEventDataFromBytes(
          eventNameWithRemainder.remainder,
          eventSchema,
        );
      } catch (err) {
        results.push({
          error: `failed to parse event data bytes for event name '${eventNameWithRemainder.data}', err: ${err.message}`,
        });

        continue;
      }

      results.push({
        event: {
          name: eventNameWithRemainder.data,
          contractHash: contractSchemas.contractHash,
          contractPackageHash: contractSchemas.contractPackageHash,
          data: eventData,
        },
      });
    }

    return results;
  }
}
