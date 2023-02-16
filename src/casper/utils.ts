import {
  CLBoolBytesParser,
  CLBoolType,
  CLByteArrayBytesParser,
  CLI32BytesParser,
  CLI32Type,
  CLI64BytesParser,
  CLI64Type,
  CLKeyBytesParser,
  CLKeyType,
  CLListBytesParser,
  CLListType,
  CLMapBytesParser,
  CLMapType,
  CLOptionBytesParser,
  CLOptionType,
  CLPublicKeyBytesParser,
  CLPublicKeyType,
  CLResultBytesParser,
  CLResultType,
  CLStringBytesParser,
  CLStringType,
  CLTuple1Type,
  CLTupleBytesParser,
  CLType,
  CLTypeTag,
  CLU128BytesParser,
  CLU128Type,
  CLU256BytesParser,
  CLU256Type,
  CLU32BytesParser,
  CLU32Type,
  CLU512BytesParser,
  CLU512Type,
  CLU64BytesParser,
  CLU64Type,
  CLU8BytesParser,
  CLU8Type,
  CLUnitBytesParser,
  CLUnitType,
  CLURefBytesParser,
  CLURefType,
  CLValueBytesParsers,
  Result,
  ResultAndRemainder,
  resultHelper,
} from 'casper-js-sdk';
import { Err, Ok } from 'ts-results';

import { CLAnyType } from './cltype';
import { CLAnyBytesParser } from './clvalue';
import { RawCLValue, WithRemainder } from './types';

export const matchByteParserByCLType = (
  val: CLType,
): Result<CLValueBytesParsers, string> => {
  if (val.tag === CLTypeTag.Bool) {
    return Ok(new CLBoolBytesParser());
  }
  if (val.tag === CLTypeTag.I32) {
    return Ok(new CLI32BytesParser());
  }
  if (val.tag === CLTypeTag.I64) {
    return Ok(new CLI64BytesParser());
  }
  if (val.tag === CLTypeTag.U8) {
    return Ok(new CLU8BytesParser());
  }
  if (val.tag === CLTypeTag.U32) {
    return Ok(new CLU32BytesParser());
  }
  if (val.tag === CLTypeTag.U64) {
    return Ok(new CLU64BytesParser());
  }
  if (val.tag === CLTypeTag.U128) {
    return Ok(new CLU128BytesParser());
  }
  if (val.tag === CLTypeTag.U256) {
    return Ok(new CLU256BytesParser());
  }
  if (val.tag === CLTypeTag.U512) {
    return Ok(new CLU512BytesParser());
  }
  if (val.tag === CLTypeTag.ByteArray) {
    return Ok(new CLByteArrayBytesParser());
  }
  if (val.tag === CLTypeTag.URef) {
    return Ok(new CLURefBytesParser());
  }
  if (val.tag === CLTypeTag.Key) {
    return Ok(new CLKeyBytesParser());
  }
  if (val.tag === CLTypeTag.PublicKey) {
    return Ok(new CLPublicKeyBytesParser());
  }
  if (val.tag === CLTypeTag.List) {
    return Ok(new CLListBytesParser());
  }
  if (val.tag === CLTypeTag.Map) {
    return Ok(new CLMapBytesParser());
  }
  if (
    val.tag === CLTypeTag.Tuple1 ||
    val.tag === CLTypeTag.Tuple2 ||
    val.tag === CLTypeTag.Tuple3
  ) {
    return Ok(new CLTupleBytesParser());
  }
  if (val.tag === CLTypeTag.Option) {
    return Ok(new CLOptionBytesParser());
  }
  if (val.tag === CLTypeTag.Result) {
    return Ok(new CLResultBytesParser());
  }
  if (val.tag === CLTypeTag.String) {
    return Ok(new CLStringBytesParser());
  }
  if (val.tag === CLTypeTag.Unit) {
    return Ok(new CLUnitBytesParser());
  }
  if (val.tag === CLTypeTag.Any) {
    return Ok(new CLAnyBytesParser());
  }
  return Err('Unknown type');
};

export const matchBytesToCLType = (
  bytes: Uint8Array,
): ResultAndRemainder<CLType, string> => {
  const tag = bytes[0];
  const remainder = bytes.subarray(1);

  switch (tag) {
    case CLTypeTag.Bool:
      return resultHelper(Ok(new CLBoolType()), remainder);
    case CLTypeTag.I32:
      return resultHelper(Ok(new CLI32Type()), remainder);
    case CLTypeTag.I64:
      return resultHelper(Ok(new CLI64Type()), remainder);
    case CLTypeTag.U8:
      return resultHelper(Ok(new CLU8Type()), remainder);
    case CLTypeTag.U32:
      return resultHelper(Ok(new CLU32Type()), remainder);
    case CLTypeTag.U64:
      return resultHelper(Ok(new CLU64Type()), remainder);
    case CLTypeTag.U64:
      return resultHelper(Ok(new CLU64Type()), remainder);
    case CLTypeTag.U128:
      return resultHelper(Ok(new CLU128Type()), remainder);
    case CLTypeTag.U256:
      return resultHelper(Ok(new CLU256Type()), remainder);
    case CLTypeTag.U512:
      return resultHelper(Ok(new CLU512Type()), remainder);
    case CLTypeTag.Unit:
      return resultHelper(Ok(new CLUnitType()), remainder);
    case CLTypeTag.String:
      return resultHelper(Ok(new CLStringType()), remainder);
    case CLTypeTag.Key:
      return resultHelper(Ok(new CLKeyType()), remainder);
    case CLTypeTag.URef:
      return resultHelper(Ok(new CLURefType()), remainder);
    case CLTypeTag.Option: {
      const { result, remainder: typeRem } = matchBytesToCLType(remainder);

      const innerType = result.unwrap();

      return resultHelper(Ok(new CLOptionType(innerType)), typeRem);
    }
    case CLTypeTag.List: {
      const { result, remainder: typeRem } = matchBytesToCLType(remainder);

      const innerType = result.unwrap();

      return resultHelper(Ok(new CLListType(innerType)), typeRem);
    }
    case CLTypeTag.ByteArray: {
      const { result, remainder: typeRem } = matchBytesToCLType(remainder);
      const innerType = result.unwrap();
      return resultHelper(Ok(new CLListType(innerType)), typeRem);
    }
    case CLTypeTag.Result: {
      const { result: okTypeRes, remainder: okTypeRem } =
        matchBytesToCLType(remainder);
      const okType = okTypeRes.unwrap();

      if (!okTypeRem)
        return resultHelper(Err('Missing Error type bytes in Result'));

      const { result: errTypeRes, remainder: rem } =
        matchBytesToCLType(okTypeRem);
      const errType = errTypeRes.unwrap();

      return resultHelper(
        Ok(new CLResultType({ ok: okType, err: errType })),
        rem,
      );
    }
    case CLTypeTag.Map: {
      const { result: keyTypeRes, remainder: keyTypeRem } =
        matchBytesToCLType(remainder);
      const keyType = keyTypeRes.unwrap();

      if (!keyTypeRem)
        return resultHelper<CLType, string>(
          Err('Missing Key type bytes in Map'),
        );

      const { result: valTypeRes, remainder: rem } =
        matchBytesToCLType(keyTypeRem);
      const valType = valTypeRes.unwrap();

      return resultHelper(Ok(new CLMapType([keyType, valType])), rem);
    }
    case CLTypeTag.Tuple1: {
      const { result: innerTypeRes, remainder: rem } =
        matchBytesToCLType(remainder);
      const innerType = innerTypeRes.unwrap();

      return resultHelper(Ok(new CLTuple1Type([innerType])), rem);
    }
    case CLTypeTag.Tuple2: {
      const { result: innerType1Res, remainder: innerType1Rem } =
        matchBytesToCLType(remainder);
      const innerType1 = innerType1Res.unwrap();

      if (!innerType1Rem) {
        return resultHelper<CLType, string>(
          Err('Missing second tuple type bytes in CLTuple2Type'),
        );
      }

      const { result: innerType2Res, remainder: innerType2Rem } =
        matchBytesToCLType(innerType1Rem);
      const innerType2 = innerType2Res.unwrap();

      return resultHelper(
        Ok(new CLTuple1Type([innerType1, innerType2])),
        innerType2Rem,
      );
    }
    case CLTypeTag.Tuple3: {
      const { result: innerType1Res, remainder: innerType1Rem } =
        matchBytesToCLType(remainder);
      const innerType1 = innerType1Res.unwrap();

      if (!innerType1Rem) {
        return resultHelper<CLType, string>(
          Err('Missing second tuple type bytes in CLTuple2Type'),
        );
      }

      const { result: innerType2Res, remainder: innerType2Rem } =
        matchBytesToCLType(innerType1Rem);
      const innerType2 = innerType2Res.unwrap();

      if (!innerType2Rem) {
        return resultHelper<CLType, string>(
          Err('Missing third tuple type bytes in CLTuple2Type'),
        );
      }

      const { result: innerType3Res, remainder: innerType3Rem } =
        matchBytesToCLType(innerType2Rem);
      const innerType3 = innerType3Res.unwrap();

      return resultHelper(
        Ok(new CLTuple1Type([innerType1, innerType2, innerType3])),
        innerType3Rem,
      );
    }
    case CLTypeTag.Any: {
      return resultHelper(Ok(new CLAnyType()), remainder);
    }
    case CLTypeTag.PublicKey:
      return resultHelper(Ok(new CLPublicKeyType()));
  }

  return resultHelper<CLType, string>(Err('Unsuported type'));
};

export function parseBytesWithRemainder(
  rawBytes: Uint8Array,
): WithRemainder<Uint8Array> {
  const length = Buffer.from(rawBytes).readUInt32LE(0);
  if (length === 0 || length > rawBytes.length) {
    throw new Error('invalid length value');
  }

  const remainder = rawBytes.subarray(4);
  if (length > remainder.length) {
    throw new Error('invalid length value after offset');
  }

  return {
    data: remainder.subarray(0, length),
    remainder: remainder.subarray(length),
  };
}

export function parseCLValueFromBytesWithRemainder(
  rawBytes: Uint8Array,
): WithRemainder<RawCLValue> {
  const rawBytesWithRemainder = parseBytesWithRemainder(rawBytes);

  const clTypeWithRemainder = matchBytesToCLType(
    rawBytesWithRemainder.remainder,
  );

  const clType = clTypeWithRemainder.result.unwrap();

  if (!clTypeWithRemainder.remainder) {
    throw new Error('remainder is empty');
  }

  return {
    data: {
      clType,
      bytes: rawBytesWithRemainder.data,
    },
    remainder: clTypeWithRemainder.remainder,
  };
}
