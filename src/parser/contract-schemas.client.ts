import { CasperServiceByJsonRPC, decodeBase16 } from 'casper-js-sdk';

import {
  EVENTS_NAMED_KEY,
  EVENTS_SCHEMA_NAMED_KEY,
  parseSchemasFromBytes,
  Schemas,
} from './schema';

export interface ContractSchemas {
  schemas: Schemas;
  contractHash: Uint8Array;
  contractPackageHash: Uint8Array;
  eventsSchemaUref: string;
  eventsUref: string;
}

export class ContractSchemasClient extends CasperServiceByJsonRPC {
  constructor(nodeUrl: string) {
    super(nodeUrl);
  }

  public async fetchContractSchemasBytes(
    contractHash: string,
    stateRootHash?: string,
  ): Promise<Uint8Array> {
    if (!stateRootHash) {
      stateRootHash = await this.getStateRootHash();
    }

    const contractData = (
      await this.getBlockState(stateRootHash, `hash-${contractHash}`, [])
    ).Contract;

    if (!contractData) {
      throw new Error('contract data not found');
    }

    const eventsSchema = contractData.namedKeys.find(
      el => el.name === EVENTS_SCHEMA_NAMED_KEY,
    );
    if (!eventsSchema) {
      throw new Error(
        `'${EVENTS_SCHEMA_NAMED_KEY}' uref not found for contract '${contractHash}'`,
      );
    }

    const schemaResponse = await this.client.request({
      method: 'state_get_item',
      params: {
        state_root_hash: stateRootHash,
        key: eventsSchema.key,
        path: [],
      },
    });

    return decodeBase16(schemaResponse.stored_value.CLValue.bytes);
  }

  public async getContractsSchemas(
    contractHashes: string[],
  ): Promise<Record<string, ContractSchemas>> {
    const contractsSchemas: Record<string, ContractSchemas> = {};

    for (const contractHash of contractHashes) {
      const stateRootHash = await this.getStateRootHash();

      const contractData = (
        await this.getBlockState(stateRootHash, `hash-${contractHash}`, [])
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

      const schemaResponse = await this.client.request({
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
