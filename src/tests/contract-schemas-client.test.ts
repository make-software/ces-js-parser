import { IClient } from '@open-rpc/client-js/build/ClientInterface';
import { decodeBase16, ContractMetadataJson } from 'casper-js-sdk';
import { ContractSchemasClient } from '../parser/contract-schemas.client';
import { EVENTS_NAMED_KEY, EVENTS_SCHEMA_NAMED_KEY } from '../parser/schema';

const providerMock = () => ({
  sendAsync: jest.fn(),
  send: jest.fn(),
});

describe('ContractSchemasClient', () => {
  describe('getContractsSchemas', () => {
    it('should fetch contract schemas', async () => {
      const schemaHex =
        '0800000008000000417070726f76616c03000000050000006f776e65720b080000006f70657261746f720b08000000746f6b656e5f6964150e000000417070726f76616c466f72416c6c03000000050000006f776e65720b080000006f70657261746f720d0b09000000746f6b656e5f6964730e15040000004275726e02000000050000006f776e65720b08000000746f6b656e5f6964150f0000004d65746164617461557064617465640200000008000000746f6b656e5f69641504000000646174610a090000004d6967726174696f6e00000000040000004d696e740200000009000000726563697069656e740b08000000746f6b656e5f696415080000005472616e7366657204000000050000006f776e65720b080000006f70657261746f720d0b09000000726563697069656e740b08000000746f6b656e5f6964150c0000005661726961626c657353657400000000';

      const contractHashHex =
        'ea0c001d969da098fefec42b141db88c74c5682e49333ded78035540a0b4f0bc';

      const contractPackageHashHex =
        '7a5fce1d9ad45c9d71a5e59638602213295a51a6cf92518f8b262cd3e23d6d7e';

      const eventsUref =
        'uref-70d95cbeae8ce00c0ca493762cc99aed052adfcb3e279c7440f5241b1bdf27a1-007';

      const eventsSchemaUref =
        'uref-91d95cbeae8ce00c0ca678762cc99aed052adfcb3e279c7440f5241b1bdf27b2-007';

      const contract: ContractMetadataJson = {
        contractPackageHash: `contract-package-wasm${contractPackageHashHex}`,
        contractWasmHash: contractHashHex,
        entrypoints: [],
        protocolVersion: '',
        namedKeys: [
          {
            name: EVENTS_NAMED_KEY,
            key: eventsUref,
          },
          {
            name: EVENTS_SCHEMA_NAMED_KEY,
            key: eventsSchemaUref,
          },
        ],
      };

      const client: jest.MockedObjectDeep<ContractSchemasClient> =
        new ContractSchemasClient(
          providerMock(),
        ) as jest.MockedObjectDeep<ContractSchemasClient>;

      client.fetchContractSchemasBytes = jest.fn();
      client.getStateRootHash = jest.fn();
      client.getBlockState = jest.fn();
      client['client'].request = jest.fn();

      client.fetchContractSchemasBytes.mockResolvedValue(
        decodeBase16(schemaHex),
      );
      client.getStateRootHash.mockResolvedValue('some-value');
      client.getBlockState.mockResolvedValue({
        Contract: contract,
      });
      (
        client['client'] as any as jest.MockedObjectDeep<IClient>
      ).request.mockResolvedValue({
        stored_value: {
          CLValue: {
            bytes: schemaHex,
          },
        },
      });

      const contractSchemas = await client.getContractsSchemas([
        contractHashHex,
      ]);

      expect(Object.keys(contractSchemas).length).toEqual(1);

      expect(contractSchemas[eventsUref].contractHash).toEqual(
        decodeBase16(contractHashHex),
      );
      expect(contractSchemas[eventsUref].contractPackageHash).toEqual(
        decodeBase16(contractPackageHashHex),
      );
      expect(contractSchemas[eventsUref].eventsSchemaUref).toEqual(
        eventsSchemaUref,
      );
      expect(contractSchemas[eventsUref].eventsUref).toEqual(eventsUref);
      expect(Object.keys(contractSchemas[eventsUref].schemas).length).toEqual(
        8,
      );
    });
  });
});
