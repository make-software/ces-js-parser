import { Event } from './event';

export interface ParseResult {
  error: string | null;
  event: Event;
}
