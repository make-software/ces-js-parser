# JS CES Parser

`ces-js-parser` parses contract-level events that follow
the [Casper Event Standard](https://github.com/make-software/casper-event-standard).

The library is built on top of the 'casper-js-sdk' and operates on types defined by the SDK.

## Install

``
npm install --save ces-js-parser
``

## Usage

Here is an example of parsing CES events using `ces-js-parser` from a real Testnet deploy loaded
with `casper-js-sdk`:

```typescript
(async () => {
  const contractSchemasClient = new ContractSchemasClient(
    `http://${process.env.NODE_ADDRESS}:7777/rpc`,
  );

  const parser = await Parser.initialise(contractSchemasClient, [
    '214a0e730e14501d1e3e03504d3a2f940ef32830b13fa47f9d85a40f73b78161',
  ]);

  const deploy = await contractSchemasClient.getDeployInfo('19ee17d9e3b4c1527b433598e647b69aa9a153864eb12433489f99224bfc9442');

  const events = await parser.parseExecutionResult(
    deploy.execution_results[0].result as ExecutionResult,
  );

  events.forEach(console.log);
})();
```

## API

Go CES Parser provides several public types and functions:

- [JS CES Parser](#js-ces-parser)
  - [Install](#install)
  - [Usage](#usage)
  - [API](#api)
    - [`Parser`](#parser)
      - [`initialise`](#initialise)
      - [`parseExecutionResults`](#parseexecutionresults)
    - [`ContractSchemasClient`](#contractschemasclient)
      - [`fetchContractSchemasBytes`](#fetchcontractschemasbytes)
      - [`getContractSchemas`](#getcontractschemas)
    - [`parseSchemasFromBytes`](#parseschemasfrombytes)
    - [`parseEvent`](#parseevent)
    - [`Event`](#event)
    - [`ParseResult`](#parseresult)
    - [`Schema`](#schema)
    - [`Schemas`](#schemas)
  - [Tests](#tests)

### `Parser`

Parser that accepts a list of observed contracts and provides possibility to parse CES events out of deploy execution
results

#### `initialise`

`initialise` is a async factory function that accepts `ContractSchemasClient` and `contractHashes` array and initialised a `Parser` instance:

| Argument                | Type                           | Description                                    |
| ----------------------- | ------------------------------ | ---------------------------------------------- |
| `contractSchemasClient` | `casper.ContractSchemasClient` | Instance of the `ContractSchemasClient` client |
| `contractHashes`        | `string[]`                     | List of the observed contract hashes           |

**Example**

```typescript
const contractSchemasClient = new ContractSchemasClient(
  `http://${process.env.NODE_ADDRESS}:7777/rpc`,
);

const parser = await Parser.initialise(contractSchemasClient, [
  '214a0e730e14501d1e3e03504d3a2f940ef32830b13fa47f9d85a40f73b78161',
]);
```

#### `parseExecutionResults`

`parseExecutionResults` method that accepts deploy execution results and returns `ParseResult[]`:

| Argument           | Type               | Description              |
| ------------------ | ------------------ | ------------------------ |
| `executionResults` | `ExecutionResults` | Deploy execution results |

### `ContractSchemasClient`

Client that is implemented on top of a `CasperServiceByJsonRPC` client from `casper-js-sdk` and provides an interface to retrieve contract schemas

#### `fetchContractSchemasBytes`

`fetchContractSchemasBytes` method that accepts contract hash and return bytes representation of stored schema:

| Argument         | Type     | Description                                                |
| ---------------- | -------- | ---------------------------------------------------------- |
| `contractHash`   | `string` | Contract hash schema want to be fetched                    |
| `stateRootHash?` | `string` | State root hash of the data (takes latest if not provided) |

#### `getContractSchemas`

`getContractSchemas` method that accepts contract hashes to search event schemas for and returns a hash map `Record<string, ContractSchemas>` where `string` is a uref defined as a named key `__events` on a contract level and `ContractSchemas` is a structure that represents the information of a contract along with a events schemas of that contract defined according to the `CES` standard:

| Argument       | Type       | Description                               |
| -------------- | ---------- | ----------------------------------------- |
| `contractHash` | `string[]` | Contract hashes to search for schemas for |

### `parseSchemasFromBytes`

`parseSchemasFromBytes` function that accepts raw CES schema bytes stored under the contract `__events_schema` URef and
returns `Schemas`:

| Argument   | Type         | Description                |
| ---------- | ------------ | -------------------------- |
| `rawBytes` | `Uint8Array` | Raw contract schemas bytes |

### `parseEvent`

Function that accepts raw event bytes and contract event schemas and returns `Event`, that contains `name` and `data`:

| Argument  | Type         | Description                  |
| --------- | ------------ | ---------------------------- |
| `event`   | `Uint8Array` | Raw event bytes in hex       |
| `schemas` | `Schemas`    | The list of contract schemas |

**Example**

```
schemas := parseSchemasFromBytes(rawBytes)
rawEvent  := decodeBase16("some real example here")

event := parseEvent(rawEvent, schemas)
```

### `Event`

Type that represents an event:

| Property              | Type                     | Description        |
| --------------------- | ------------------------ | ------------------ |
| `contractHash`        | `Uint8Array`             | Event ContractHash |
| `contractPackageHash` | `Uint8Array`             | Event ContractHash |
| `name`                | `string`                 | Event name         |
| `data`                | `Record<string,CLValue>` | Event Data         |

### `ParseResult`

Value-object that represents a parse result. Contains error representing weather parsing was successful or not.

| Property | Type              | Description        |
| -------- | ----------------- | ------------------ |
| `Error`  | `string`          | Parse result error |
| `Event`  | [`Event`](#Event) | ces Event          |

### `Schema`

Schema is slice of `PropertyDefinition` - value-object that represents an schema item.

| Property   | Type            | Description                 |
| ---------- | --------------- | --------------------------- |
| `Property` | `string`        | Name of the schema property |
| `Value`    | `casper.CLType` | casper CLType               |

### `Schemas`

Schemas represent a map of event name and its Schema.

## Tests

To run unit tests for the library, make sure you are in the root of the library:

``
npm run test
``
