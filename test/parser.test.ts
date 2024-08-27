import * as fs from 'fs';
import * as path from 'path';

import { CasperServiceByJsonRPC, decodeBase16 } from 'casper-js-sdk-pre-condor';
import { PreCondorParser } from '../src/preCondorParser';
import { parseSchemasFromBytes } from '../src/schema';

describe('Parser', () => {
  describe('parseExecutionResult', () => {
    it('should parse events', async () => {
      const schemaHex =
        '08000000100000004164646564546f57686974656c6973740100000007000000616464726573730b0e00000042616c6c6f7443616e63656c65640500000005000000766f7465720b09000000766f74696e675f6964040b000000766f74696e675f74797065030600000063686f69636503050000007374616b65080a00000042616c6c6f74436173740500000005000000766f7465720b09000000766f74696e675f6964040b000000766f74696e675f74797065030600000063686f69636503050000007374616b65080c0000004f776e65724368616e67656401000000090000006e65775f6f776e65720b1400000052656d6f76656446726f6d57686974656c6973740100000007000000616464726573730b1300000053696d706c65566f74696e67437265617465640c0000000d000000646f63756d656e745f686173680a0700000063726561746f720b050000007374616b650d0809000000766f74696e675f69640416000000636f6e6669675f696e666f726d616c5f71756f72756d041b000000636f6e6669675f696e666f726d616c5f766f74696e675f74696d650514000000636f6e6669675f666f726d616c5f71756f72756d0419000000636f6e6669675f666f726d616c5f766f74696e675f74696d650516000000636f6e6669675f746f74616c5f6f6e626f61726465640822000000636f6e6669675f646f75626c655f74696d655f6265747765656e5f766f74696e6773001d000000636f6e6669675f766f74696e675f636c6561726e6573735f64656c7461082e000000636f6e6669675f74696d655f6265747765656e5f696e666f726d616c5f616e645f666f726d616c5f766f74696e67050e000000566f74696e6743616e63656c65640300000009000000766f74696e675f6964040b000000766f74696e675f747970650308000000756e7374616b6573110b080b000000566f74696e67456e6465640d00000009000000766f74696e675f6964040b000000766f74696e675f74797065030d000000766f74696e675f726573756c74030e0000007374616b655f696e5f6661766f72080d0000007374616b655f616761696e73740816000000756e626f756e645f7374616b655f696e5f6661766f720815000000756e626f756e645f7374616b655f616761696e7374080e000000766f7465735f696e5f6661766f72040d000000766f7465735f616761696e73740408000000756e7374616b657311130b0408060000007374616b657311130b0408050000006275726e7311130b0408050000006d696e747311130b0408';

      const contractHashHex =
        'ea0c001d969da098fefec42b141db88c74c5682e49333ded78035540a0b4f0bc';

      const contractHash = decodeBase16(contractHashHex);

      const contractPackageHash = decodeBase16(
        '7a5fce1d9ad45c9d71a5e59638602213295a51a6cf92518f8b262cd3e23d6d7e',
      );

      const schemas = parseSchemasFromBytes(decodeBase16(schemaHex));

      const rpcClient = new CasperServiceByJsonRPC('');

      PreCondorParser['getContractsMetadata'] = jest.fn();

      const eventsUref =
        'uref-d2263e86f497f42e405d5d1390aa3c1a8bfc35f3699fdc3be806a5cfe139dac9-007';

      const eventsSchemaUref =
        'uref-91d95cbeae8ce00c0ca678762cc99aed052adfcb3e279c7440f5241b1bdf27b2-007';

      (PreCondorParser as any)['getContractsMetadata'].mockResolvedValue({
        [eventsUref]: {
          schemas,
          contractHash,
          contractPackageHash,
          eventsUref,
          eventsSchemaUref,
        },
      });

      const parser = await PreCondorParser.create(rpcClient, [contractHashHex]);

      const rawMintDeploy = fs.readFileSync(
        path.resolve(__dirname, './fixtures/deploys/voting_created.json'),
        'utf-8',
      );

      const deploy = JSON.parse(rawMintDeploy);

      const events = parser.parseExecutionResult(
        deploy.execution_results[0].result,
      );

      expect(events.length).toEqual(2);

      // BallotCast
      expect(events[0].event!.name).toEqual('BallotCast');
      expect(events[0].event!.contractHash).toEqual(contractHash);
      expect(events[0].event!.contractPackageHash).toEqual(contractPackageHash);

      expect(Object.keys(events[0].event!.data!).length).toEqual(5);

      expect(events[0].event!.data!.voter.value()).toBeDefined();
      expect(events[0].event!.data!.voting_id.value()).toBeDefined();
      expect(events[0].event!.data!.voting_type.value()).toBeDefined();
      expect(events[0].event!.data!.choice.value()).toBeDefined();
      expect(events[0].event!.data!.stake.value()).toBeDefined();

      // SimpleVotingCreated
      expect(events[1].event!.name).toEqual('SimpleVotingCreated');
      expect(events[1].event!.contractHash).toEqual(contractHash);
      expect(events[1].event!.contractPackageHash).toEqual(contractPackageHash);

      expect(Object.keys(events[1].event!.data!).length).toEqual(12);

      expect(events[1].event!.data!.document_hash.value()).toBeDefined();
      expect(events[1].event!.data!.creator.value()).toBeDefined();
      expect(events[1].event!.data!.stake.value()).toBeDefined();
      expect(events[1].event!.data!.voting_id.value()).toBeDefined();
      expect(
        events[1].event!.data!.config_informal_quorum.value(),
      ).toBeDefined();
      expect(
        events[1].event!.data!.config_informal_voting_time.value(),
      ).toBeDefined();
      expect(events[1].event!.data!.config_formal_quorum.value()).toBeDefined();
      expect(
        events[1].event!.data!.config_formal_voting_time.value(),
      ).toBeDefined();
      expect(
        events[1].event!.data!.config_total_onboarded.value(),
      ).toBeDefined();
      expect(
        events[1].event!.data!.config_double_time_between_votings.value(),
      ).toBeDefined();
      expect(
        events[1].event!.data!.config_voting_clearness_delta.value(),
      ).toBeDefined();
      expect(
        events[1].event!.data!.config_time_between_informal_and_formal_voting.value(),
      ).toBeDefined();
    });
  });
});
