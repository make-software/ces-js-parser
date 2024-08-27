import { CLType, StoredValue, TransactionHash } from 'casper-js-sdk';
import { ExecutionResultV1 } from './preCondorTypes';

export type ExecutionResult =
  | { Version1: ExecutionResultV1 }
  | { Version2: ExecutionResultV2 };

/** Result interface for an execution result */

export interface RawCLValue {
  clType: CLType;
  bytes: Uint8Array;
}

export interface ExecutionResultV2 {
  initiator: any;
  /** If error_message is null, the execution was successful */
  error_message: string | null;
  limit: string;
  consumed: string;
  cost: string;
  payment: { source: string }[];
  transfers: Transfer[];
  size_estimate: number;
  effects: TransformV2[];
}

export interface TransferV1 {
  deploy_hash: string;
  from: string;
  to?: string;
  source: string;
  target: string;
  amount: string;
  gas: string;
  id?: number;
}

export interface TransferV2 {
  transaction_hash: TransactionHash;
  from: any; //todo we should map this to a type union
  to?: string;
  source: string;
  target: string;
  amount: string;
  gas: string;
  id?: number;
}

export type Transfer =
  | {
      Version1: TransferV1;
    }
  | {
      Version2: TransferV2;
    };

export interface TransformV2 {
  key: string;
  kind: TransformV2Kind; //TODO - this should be mapped to the `TransformV2` type from rust.
}

export type TransformV2Kind =
  | 'Identity'
  | { Write: StoredValue }
  | { AddInt32: number }
  | { AddUInt64: number }
  | { AddUInt128: string }
  | { AddUInt256: string }
  | { AddUInt512: string }
  | { Failure: any }
  | { Prune: string }
  | { AddKeys: NamedKey[] };

export interface NamedKey {
  name: string;
  key: string;
}
