import {CLTypeList, CLTypeOption, Conversions, TypeID} from 'casper-js-sdk';
import {parseSchemaFromBytesWithRemainder} from '../src/schema';

describe('Schema', () => {
  describe('parseSchemaFromBytesWithRemainder', () => {
    it('should parse schema from raw bytes with basic types', () => {
      const hexStr = '0200000006000000616d6f756e74030400000066726f6d0b';
      const schema = parseSchemaFromBytesWithRemainder(Conversions.decodeBase16(hexStr));

      expect(schema.result.length).toEqual(2);

      expect(schema.result[0].property).toEqual('amount');
      expect(schema.result[0].value.getTypeID()).toEqual(TypeID.U8);

      expect(schema.result[1].property).toEqual('from');
      expect(schema.result[1].value.getTypeID()).toEqual(TypeID.Key);
    });

    it('should parse schema from raw bytes with option complex type', () => {
      const hexStr = '01000000060000006f7074696f6e0d0b';
      const schema = parseSchemaFromBytesWithRemainder(Conversions.decodeBase16((hexStr)));

      expect(schema.result.length).toEqual(1);

      expect(schema.result[0].property).toEqual('option');
      expect(schema.result[0].value.getTypeID()).toEqual(TypeID.Option);
      expect(
        (schema.result[0].value as unknown as CLTypeOption).inner!.getTypeID(),
      ).toEqual(TypeID.Key);
    });

    it('should parse schema from raw bytes with list complex type', () => {
      const hexStr = '01000000040000006c6973740e0b03000000616e79';
      const schema = parseSchemaFromBytesWithRemainder(Conversions.decodeBase16((hexStr)));

      expect(schema.result.length).toEqual(1);

      expect(schema.result[0].property).toEqual('list');
      expect(schema.result[0].value.getTypeID()).toEqual(TypeID.List);
      expect((schema.result[0].value as unknown as CLTypeList).elementsType.getTypeID()).toEqual(
        TypeID.Key,
      );
    });

    it('should parse schema from raw bytes with byte array type', () => {
      const hexStr =
        '030000000a000000636f6c6c656374696f6e0f2000000008000000746f6b656e5f696407070000006f6666657265720b';
      const schema = parseSchemaFromBytesWithRemainder(Conversions.decodeBase16((hexStr)));

      expect(schema.result.length).toEqual(3);

      expect(schema.result[0].property).toEqual('collection');
      expect(schema.result[0].value.getTypeID()).toEqual(TypeID.ByteArray);

      expect(schema.result[1].property).toEqual('token_id');
      expect(schema.result[1].value.getTypeID()).toEqual(TypeID.ByteArray);

      expect(schema.result[2].property).toEqual('offerer');
      expect(schema.result[2].value.getTypeID()).toEqual(TypeID.ByteArray);
    });
  });
});
