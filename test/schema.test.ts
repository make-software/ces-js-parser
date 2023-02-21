import {
  decodeBase16,
  CLTypeTag,
  CLOptionType,
  CLKeyType,
  CLListType,
} from 'casper-js-sdk';
import { parseSchemaFromBytesWithRemainder } from '../src/parser/schema';

describe('Schema', () => {
  describe('parseSchemaFromBytesWithRemainder', () => {
    it('should parse schema from raw bytes with basic types', () => {
      const hexStr = '0200000006000000616d6f756e74030400000066726f6d0b';
      const schema = parseSchemaFromBytesWithRemainder(decodeBase16(hexStr));

      expect(schema.data.length).toEqual(2);

      expect(schema.data[0].property).toEqual('amount');
      expect(schema.data[0].value.tag).toEqual(CLTypeTag.U8);

      expect(schema.data[1].property).toEqual('from');
      expect(schema.data[1].value.tag).toEqual(CLTypeTag.Key);
    });

    it('should parse schema from raw bytes with option conmplex type', () => {
      const hexStr = '01000000060000006f7074696f6e0d0b';
      const schema = parseSchemaFromBytesWithRemainder(decodeBase16(hexStr));

      expect(schema.data.length).toEqual(1);

      expect(schema.data[0].property).toEqual('option');
      expect(schema.data[0].value.tag).toEqual(CLTypeTag.Option);
      expect(
        (schema.data[0].value as CLOptionType<CLKeyType>).inner.tag,
      ).toEqual(CLTypeTag.Key);
    });

    it('should parse schema from raw bytes with list complex type', () => {
      const hexStr = '01000000040000006c6973740e0b03000000616e79';
      const schema = parseSchemaFromBytesWithRemainder(decodeBase16(hexStr));

      expect(schema.data.length).toEqual(1);

      expect(schema.data[0].property).toEqual('list');
      expect(schema.data[0].value.tag).toEqual(CLTypeTag.List);
      expect((schema.data[0].value as CLListType<CLKeyType>).inner.tag).toEqual(
        CLTypeTag.Key,
      );
    });
  });

  // describe('parseSchemasFromBytes', () => {
  //   it('should parse schemas from bytes', () => {
  //     const schemaHex =
  //       '0800000008000000417070726f76616c03000000050000006f776e65720b080000006f70657261746f720b08000000746f6b656e5f6964150e000000417070726f76616c466f72416c6c03000000050000006f776e65720b080000006f70657261746f720d0b09000000746f6b656e5f6964730e15040000004275726e02000000050000006f776e65720b08000000746f6b656e5f6964150f0000004d65746164617461557064617465640200000008000000746f6b656e5f69641504000000646174610a090000004d6967726174696f6e00000000040000004d696e740200000009000000726563697069656e740b08000000746f6b656e5f696415080000005472616e7366657204000000050000006f776e65720b080000006f70657261746f720d0b09000000726563697069656e740b08000000746f6b656e5f6964150c0000005661726961626c657353657400000000';

  //     const schemas = parseSchemasFromBytes(decodeBase16(schemaHex));

  //     expect(Object.keys(schemas).length).toEqual(8);

  //     // Approval
  //     expect(schemas.Approval.length).toEqual(3);

  //     expect(schemas.Approval[0].property).toEqual('owner');
  //     expect(schemas.Approval[0].value.tag).toEqual(CLTypeTag.Key);

  //     expect(schemas.Approval[1].property).toEqual('operator');
  //     expect(schemas.Approval[1].value.tag).toEqual(CLTypeTag.Key);

  //     expect(schemas.Approval[2].property).toEqual('token_id');
  //     expect(schemas.Approval[2].value.tag).toEqual(CLTypeTag.Any);

  //     // ApprovalForAll
  //     expect(schemas.ApprovalForAll.length).toEqual(3);

  //     expect(schemas.ApprovalForAll[0].property).toEqual('owner');
  //     expect(schemas.ApprovalForAll[0].value.tag).toEqual(CLTypeTag.Key);

  //     expect(schemas.ApprovalForAll[1].property).toEqual('operator');
  //     expect(schemas.ApprovalForAll[1].value.tag).toEqual(CLTypeTag.Option);
  //     expect(
  //       (schemas.ApprovalForAll[1].value as CLOptionType<CLKeyType>).inner.tag,
  //     ).toEqual(CLTypeTag.Key);

  //     expect(schemas.ApprovalForAll[2].property).toEqual('token_ids');
  //     expect(schemas.ApprovalForAll[2].value.tag).toEqual(CLTypeTag.List);
  //     expect(
  //       (schemas.ApprovalForAll[2].value as CLListType<CLAnyType>).inner.tag,
  //     ).toEqual(CLTypeTag.Any);

  //     // Burn
  //     expect(schemas.Burn.length).toEqual(2);

  //     expect(schemas.Burn[0].property).toEqual('owner');
  //     expect(schemas.Burn[0].value.tag).toEqual(CLTypeTag.Key);

  //     expect(schemas.Burn[1].property).toEqual('token_id');
  //     expect(schemas.Burn[1].value.tag).toEqual(CLTypeTag.Any);

  //     // MetadataUpdated
  //     expect(schemas.MetadataUpdated.length).toEqual(2);

  //     expect(schemas.MetadataUpdated[0].property).toEqual('token_id');
  //     expect(schemas.MetadataUpdated[0].value.tag).toEqual(CLTypeTag.Any);

  //     expect(schemas.MetadataUpdated[1].property).toEqual('data');
  //     expect(schemas.MetadataUpdated[1].value.tag).toEqual(CLTypeTag.String);

  //     // Migration
  //     expect(schemas.Migration.length).toEqual(0);

  //     // Mint
  //     expect(schemas.Mint.length).toEqual(2);

  //     expect(schemas.Mint[0].property).toEqual('recipient');
  //     expect(schemas.Mint[0].value.tag).toEqual(CLTypeTag.Key);

  //     expect(schemas.Mint[1].property).toEqual('token_id');
  //     expect(schemas.Mint[1].value.tag).toEqual(CLTypeTag.Any);

  //     // Transfer
  //     expect(schemas.Transfer.length).toEqual(4);

  //     expect(schemas.Transfer[0].property).toEqual('owner');
  //     expect(schemas.Transfer[0].value.tag).toEqual(CLTypeTag.Key);

  //     expect(schemas.Transfer[1].property).toEqual('operator');
  //     expect(
  //       (schemas.Transfer[1].value as CLOptionType<CLKeyType>).inner.tag,
  //     ).toEqual(CLTypeTag.Key);

  //     expect(schemas.Transfer[2].property).toEqual('recipient');
  //     expect(schemas.Transfer[2].value.tag).toEqual(CLTypeTag.Key);

  //     expect(schemas.Transfer[3].property).toEqual('token_id');
  //     expect(schemas.Transfer[3].value.tag).toEqual(CLTypeTag.Any);

  //     // VariablesSet
  //     expect(schemas.VariablesSet.length).toEqual(0);
  //   });
  // });
});
