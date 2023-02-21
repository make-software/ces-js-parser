import { CLType, CLTypeTag } from 'casper-js-sdk';

export class CLAnyType extends CLType {
  linksTo = 'Any';
  tag = CLTypeTag.Any;
}
