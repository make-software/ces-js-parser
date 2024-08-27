export interface WithRemainder<T> {
  data: T;
  remainder: Uint8Array;
}

export const EVENTS_SCHEMA_NAMED_KEY = '__events_schema';

export const EVENTS_NAMED_KEY = '__events';

export const DICTIONARY_PREFIX = 'dictionary-';
