import { CLValue } from 'casper-js-sdk';
import { WithRemainder } from '../casper/types';

import {
  matchByteParserByCLType,
  parseBytesWithRemainder,
} from '../casper/utils';
import { Schema, Schemas } from './schema';

const EVENT_PREFIX = 'event_';

export interface Event {
  name: string;
  contractHash?: Uint8Array;
  contractPackageHash?: Uint8Array;
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

export function parseEvent(rawEvent: Uint8Array, schemas: Schemas): Event {
  if (rawEvent.length < 4) {
    throw new Error('invalid event bytes');
  }

  const eventNameWithRemainder = parseEventNameWithRemainder(
    rawEvent.subarray(4),
  );

  const eventSchema = schemas[eventNameWithRemainder.data];
  if (!eventSchema) {
    throw new Error('event name not in schema');
  }

  return {
    name: eventNameWithRemainder.data,
    data: parseEventDataFromBytes(
      eventNameWithRemainder.remainder,
      eventSchema,
    ),
  };
}

export function parseEventDataFromBytes(
  rawBytes: Uint8Array,
  schema: Schema,
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
