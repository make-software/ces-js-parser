# CES JS Parser

`@make-software/ces-js-parser` parses contract-level events that follow the [Casper Event Standard](https://github.com/make-software/casper-event-standard).

The library is built on top of the [casper-js-sdk](https://github.com/casper-ecosystem/casper-js-sdk) and operates on types defined by the SDK.

## Prerequisites

- **Node.js Version**: >12.22.10
- **OS**: Linux, MacOS

## Install

`npm install --save @make-software/ces-js-parser`

## Usage

Here is an example of parsing CES events using `ces-js-parser` from a real Integration net transaction loaded with `casper-js-sdk`:

```typescript
import { HttpHandler, RpcClient } from 'casper-js-sdk';
import { Parser } from '@make-software/ces-js-parser';

(async() => {
  const rpcHandler = new HttpHandler('http://${process.env.NODE_ADDRESS}:7777/rpc');

  const rpcClient = new RpcClient(rpcHandler);

  const parser = await Parser.create(rpcClient, [
    '333f0e776995a27ad8502e29b141b875951f92fe6b61329a59f1f875ef48e16a'
  ]);

  const transaction = await rpcClient.getTransactionByTransactionHash(
    '1592814db95151bb9366112dea6e10fe5d8043ba2b1efd28545a0b6e53839a70'
  );

  const events = parser.parseExecutionResult(
    transaction.executionInfo!.executionResult,
  );

  events.forEach(console.log);
})()
```

## API

CES JS Parser provides several public types and functions:

- [CES JS Parser](#ces-js-parser)
  - [Prerequisites](#prerequisites)
  - [Install](#install)
  - [Usage](#usage)
  - [API](#api)
    - [`Parser`](#parser)
      - [`create`](#create)
      - [`parseExecutionResults`](#parseexecutionresults)
      - [`fetchContractSchemasBytes`](#fetchcontractschemasbytes)
    - [`parseSchemasFromBytes`](#parseschemasfrombytes)
    - [`parseEventNameAndData`](#parseeventnameanddata)
    - [`Event`](#event)
    - [`ParseResult`](#parseresult)
    - [`Schema`](#schema)
    - [`Schemas`](#schemas)
  - [Tests](#tests)
  - [License](#license)
  - [Contributing](#contributing)

### `Parser`

Parser that accepts a list of observed contracts and provides possibility to parse CES events out of deploy execution results

#### `create`

`create` is a async factory function that accepts `CasperServiceByJsonRPC` and `contractHashes` array and created a `Parser` instance:

| Argument | Type | Description |
| --- | --- | --- |
| `rpcClient` | `CasperServiceByJsonRPC` | Instance of the `CasperServiceByJsonRPC` client |
| `contractHashes` | `string[]` | List of the observed contract hashes |

**Example**

```typescript
import { HttpHandler, RpcClient } from 'casper-js-sdk';
import { Parser } from '@make-software/ces-js-parser';

const rpcHandler = new HttpHandler('http://${process.env.NODE_ADDRESS}:7777/rpc');

const rpcClient = new RpcClient(rpcHandler);

const parser = await Parser.create(rpcClient, [
  '214a0e730e14501d1e3e03504d3a2f940ef32830b13fa47f9d85a40f73b78161'
]);
```

#### `parseExecutionResults`

`parseExecutionResults` method that accepts deploy execution results and returns `ParseResult[]`:

| Argument           | Type               | Description              |
| ------------------ | ------------------ | ------------------------ |
| `executionResults` | `ExecutionResults` | Deploy execution results |

#### `fetchContractSchemasBytes`

`fetchContractSchemasBytes` method that accepts contract hash and return bytes representation of stored schema:

| Argument | Type | Description |
| --- | --- | --- |
| `contractHash` | `string` | Contract hash schema want to be fetched |
| `stateRootHash` | `string` | State root hash of the data (takes latest if not provided) |

### `parseSchemasFromBytes`

`parseSchemasFromBytes` function that accepts raw CES schema bytes stored under the contract `__events_schema` URef and returns `Schemas`:

| Argument   | Type         | Description                |
| ---------- | ------------ | -------------------------- |
| `rawBytes` | `Uint8Array` | Raw contract schemas bytes |

### `parseEventNameAndData`

Function that accepts raw event bytes and contract event schemas and returns `Event`, that contains `name` and `data`:

| Argument   | Type      | Description                  |
| ---------- | --------- | ---------------------------- |
| `rawEvent` | `string`  | Raw event bytes in hex       |
| `schemas`  | `Schemas` | The list of contract schemas |

**Example**

```typescript
import { decodeBase16 } from 'casper-js-sdk';
import {
  parseSchemasFromBytes,
  parseEventNameAndData
} from '@make-software/ces-js-parser';

const schemas = parseSchemasFromBytes(rawBytes);
const rawEvent = decodeBase16('some real example here');

const event = parseEventNameAndData(rawEvent, schemas);
```

### `Event`

Type that represents an event:

| Property | Type | Description |
| --- | --- | --- |
| `contractHash` | `Uint8Array` | Event ContractHash |
| `contractPackageHash` | `Uint8Array` | Event ContractHash |
| `name` | `string` | Event name |
| `data` | `Record<string,CLValue>` | Event Data |

### `ParseResult`

Value-object that represents a parse result. Contains error representing weather parsing was successful or not.

| Property | Type              | Description        |
| -------- | ----------------- | ------------------ |
| `error`  | `string`          | Parse result error |
| `event`  | [`Event`](#Event) | ces Event          |

### `Schema`

Schema is slice of `PropertyDefinition` - value-object that represents an schema item.

| Property   | Type     | Description                 |
| ---------- | -------- | --------------------------- |
| `Property` | `string` | Name of the schema property |
| `Value`    | `CLType` | casper CLType               |

### `Schemas`

Schemas represent a map of event name and its Schema.

## Tests

To run unit tests for the library, make sure you are in the root of the library:

`npm run test`

## License

This project is licensed under the terms of the [Apache-2.0 license](https://github.com/make-software/ces-js-parser/blob/master/LICENSE).

## Contributing

We welcome contributions from anyone interested in improving this project. Before getting started, please take a moment to read our [contributing guidelines](https://github.com/make-software/ces-js-parser/blob/master/CONTRIBUTING.md) to learn more about how to contribute to this project, including how to report bugs, suggest enhancements, and submit pull requests.

We look forward to collaborating with you!
