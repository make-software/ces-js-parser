import {
  decodeBase16,
  CLTypeTag,
  CLOptionType,
  CLKeyType,
  CLListType,
} from 'casper-js-sdk';
import { parseSchemaFromBytesWithRemainder } from '../src/schema';

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

    it('should parse schema from raw bytes with option complex type', () => {
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

    it('should parse schema from raw bytes with byte array type', () => {
      const hexStr =
        '030000000a000000636f6c6c656374696f6e0f2000000008000000746f6b656e5f696407070000006f6666657265720b';
      const schema = parseSchemaFromBytesWithRemainder(decodeBase16(hexStr));

      expect(schema.data.length).toEqual(3);

      expect(schema.data[0].property).toEqual('collection');
      expect(schema.data[0].value.tag).toEqual(CLTypeTag.ByteArray);

      expect(schema.data[1].property).toEqual('token_id');
      expect(schema.data[1].value.tag).toEqual(CLTypeTag.U256);

      expect(schema.data[2].property).toEqual('offerer');
      expect(schema.data[2].value.tag).toEqual(CLTypeTag.Key);
    });
  });
});
