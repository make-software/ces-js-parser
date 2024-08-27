import { CLValue, decodeBase16, matchByteParserByCLType } from 'casper-js-sdk';

import {
  parseBytesWithRemainder,
  parseCLValueFromBytesWithRemainder,
} from './casper/utils';
import { Schema, Schemas } from './schema';
import { WithRemainder } from './casper/types';

const EVENT_PREFIX = 'event_';

export interface Event {
  name: string;
  contractHash: Uint8Array | null;
  contractPackageHash: Uint8Array | null;
  data: Record<string, CLValue>;
}

export function parseEventNameWithRemainder(
  rawEvent: Uint8Array,
): WithRemainder<string> {
  const eventNameWithRemainder = parseBytesWithRemainder(rawEvent);

  const eventNameWithPrefix = new TextDecoder().decode(
    eventNameWithRemainder.data,
  );

  if (!eventNameWithPrefix.startsWith(EVENT_PREFIX)) {
    throw new Error('no event_ prefix for event');
  }

  const eventName = eventNameWithPrefix.replace('event_', '');

  return {
    data: eventName,
    remainder: eventNameWithRemainder.remainder,
  };
}

export function parseEventNameAndData(
  rawEvent: string,
  schemas: Schemas,
): {
  name: string;
  data: Record<string, CLValue>;
} {
  const event = decodeBase16(rawEvent);

  const clValueWithRemainder = parseCLValueFromBytesWithRemainder(event);

  if (clValueWithRemainder.data.bytes.length < 4) {
    throw new Error('invalid event bytes');
  }

  const eventNameWithRemainder = parseEventNameWithRemainder(
    clValueWithRemainder.data.bytes.subarray(4),
  );

  const eventSchema = schemas[eventNameWithRemainder.data];
  if (!eventSchema) {
    throw new Error('event name not in schema');
  }

  return {
    name: eventNameWithRemainder.data,
    data: parseEventDataFromBytes(
      eventSchema,
      eventNameWithRemainder.remainder,
    ),
  };
}

export function parseEventDataFromBytes(
  schema: Schema,
  rawBytes: Uint8Array,
): Record<string, CLValue> {
  const result: Record<string, CLValue> = {};

  let remainder = rawBytes;

  for (const item of schema) {
    const parser = matchByteParserByCLType(item.value).unwrap();

    const clValueWithRemainder = parser.fromBytesWithRemainder(
      remainder,
      item.value,
    );

    if (!clValueWithRemainder.remainder) {
      throw new Error('remainder is empty');
    }

    result[item.property] = clValueWithRemainder.result.unwrap();
    remainder = clValueWithRemainder.remainder;
  }

  return result;
}
