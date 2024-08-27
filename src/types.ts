import { Event } from './event';
import { Schemas } from './schema';

export interface ParseResult {
  error: string | null;
  event: Event;
}

export interface ContractMetadata {
  schemas: Schemas;
  contractHash: Uint8Array;
  contractPackageHash: Uint8Array;
  eventsSchemaUref: string;
  eventsUref: string;
}
