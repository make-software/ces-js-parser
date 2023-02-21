import { matchBytesToCLType } from 'casper-js-sdk';
import { RawCLValue, WithRemainder } from './types';

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
