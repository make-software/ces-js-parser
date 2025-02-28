import {
  CLTypeString,
  CLValue,
  CLValueParser,
  Conversions,
  Hash,
  IResultWithBytes,
} from 'casper-js-sdk';

import { Schema, Schemas } from './schema';

const EVENT_PREFIX = 'event_';

export interface Event {
  name: string;
  contractHash: Hash | null;
  contractPackageHash: Hash | null;
  eventId: number;
  data: Record<string, CLValue>;
}

export function parseEventNameWithRemainder(
  rawEvent: Uint8Array,
): IResultWithBytes<string> {
  const eventNameWithRemainder = CLValueParser.fromBytesByType(
    rawEvent,
    CLTypeString,
  );

  const eventNameWithPrefix = eventNameWithRemainder.result.toString();

  if (!eventNameWithPrefix.startsWith(EVENT_PREFIX)) {
    throw new Error('no event_ prefix for event');
  }

  const eventName = eventNameWithPrefix.replace('event_', '');

  return {
    result: eventName,
    bytes: eventNameWithRemainder.bytes,
  };
}

export function parseEventNameAndData(
  rawEvent: string,
  schemas: Schemas,
): {
  name: string;
  data: Record<string, CLValue>;
} {
  const event = Conversions.decodeBase16(rawEvent);

  const clValueWithRemainder = CLValueParser.fromBytesWithType(event);

  if (clValueWithRemainder.result.bytes().length < 4) {
    throw new Error('invalid event bytes');
  }

  const eventNameWithRemainder = parseEventNameWithRemainder(
    clValueWithRemainder.result.bytes().subarray(4),
  );

  const eventSchema = schemas[eventNameWithRemainder.result];
  if (!eventSchema) {
    throw new Error('event name not in schema');
  }

  return {
    name: eventNameWithRemainder.result,
    data: parseEventDataFromBytes(eventSchema, eventNameWithRemainder.bytes),
  };
}

export function parseEventDataFromBytes(
  schema: Schema,
  rawBytes: Uint8Array,
): Record<string, CLValue> {
  const result: Record<string, CLValue> = {};

  let remainder = rawBytes;

  for (const item of schema) {
    const clValueWithRemainder = CLValueParser.fromBytesByType(
      remainder,
      item.value,
    );

    if (!clValueWithRemainder.bytes) {
      throw new Error('remainder is empty');
    }

    result[item.property] = clValueWithRemainder.result;
    remainder = clValueWithRemainder.bytes;
  }

  return result;
}
