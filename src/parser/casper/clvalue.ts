import {
  CLErrorCodes,
  CLType,
  CLU32BytesParser,
  CLValue,
  CLValueBytesParsers,
  ResultAndRemainder,
  resultHelper,
  ToBytesResult,
} from 'casper-js-sdk';
import { Err, Ok } from 'ts-results';

import { CLAnyType } from './cltype';

export class CLAnyBytesParser extends CLValueBytesParsers {
  toBytes(val: CLAny): ToBytesResult {
    return Ok(val.data);
  }

  fromBytesWithRemainder(
    bytes: Uint8Array,
  ): ResultAndRemainder<CLAny, CLErrorCodes> {
    const { result: CLU32res, remainder: CLU32rem } =
      new CLU32BytesParser().fromBytesWithRemainder(bytes);

    const len = CLU32res.unwrap().value().toNumber();

    if (CLU32rem) {
      return resultHelper(
        Ok(new CLAny(CLU32rem.subarray(0, len))),
        CLU32rem.subarray(len),
      );
    }

    return resultHelper(Err(CLErrorCodes.EarlyEndOfStream));
  }
}

export class CLAny extends CLValue {
  data: Uint8Array;

  constructor(v: Uint8Array) {
    super();

    this.data = v;
  }

  clType(): CLType {
    return new CLAnyType();
  }

  value(): Uint8Array {
    return this.data;
  }

  size(): number {
    return this.data.length;
  }
}
