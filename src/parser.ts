import { CondorParser } from './condorParser';
import { PreCondorParser } from './preCondorParser';
import { ParseResult } from './types';
import { CasperServiceByJsonRPC } from 'casper-js-sdk-pre-condor';
import { CasperServiceByJsonRPC as CondorCasperServiceByJsonRPC } from 'casper-js-sdk';

interface IParser {
  parseExecutionResult(executionResult: any): ParseResult[];
}

export class Parser implements IParser {
  private constructor(
    public readonly isPreCondor: boolean,
    private readonly parserActual: IParser,
  ) {}
  static async create(
    rpcClient: CasperServiceByJsonRPC | CondorCasperServiceByJsonRPC,
    contractHashes: string[],
  ): Promise<Parser> {
    const isPreCondor = rpcClient instanceof CasperServiceByJsonRPC;
    const parserActual: IParser = isPreCondor
      ? await PreCondorParser.create(
          rpcClient as CasperServiceByJsonRPC,
          contractHashes,
        )
      : await CondorParser.create(
          rpcClient as CondorCasperServiceByJsonRPC,
          contractHashes,
        );

    return Promise.resolve(new Parser(isPreCondor, parserActual));
  }

  parseExecutionResult(executionResult: any): ParseResult[] {
    return this.parserActual.parseExecutionResult(executionResult);
  }
}
