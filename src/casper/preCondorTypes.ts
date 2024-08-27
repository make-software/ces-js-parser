type TransformValue = any;

interface Transform {
  key: string;
  transform: TransformValue;
}

interface Effect {
  transforms: Transform[];
}

interface ExecutionResultBody {
  cost: number;
  error_message?: string | null;
  transfers: string[];
  effect: Effect;
}

/** Result interface for an execution result */
export interface ExecutionResultV1 {
  Success?: ExecutionResultBody;
  Failure?: ExecutionResultBody;
}
