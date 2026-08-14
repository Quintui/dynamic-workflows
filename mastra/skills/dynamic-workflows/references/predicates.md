# Predicates

`conditional` entries and `loop` entries use a JSON predicate DSL.

Operands are either a `{ "path": "..." }` reference or a `{ "literal": ... }`
value. Paths resolve against `initData`, `inputData`, `stepResults` and `state`.

| Operator                             | Shape                                        |
| ------------------------------------ | -------------------------------------------- |
| `eq`, `ne`, `lt`, `lte`, `gt`, `gte` | `{ "op": "eq", "left": ..., "right": ... }`  |
| `in`, `notIn`                        | `{ "op": "in", "value": ..., "set": [...] }` |
| `exists`, `notExists`                | `{ "op": "exists", "path": "..." }`          |
| `truthy`, `falsy`                    | `{ "op": "truthy", "value": ... }`           |
| `and`, `or`                          | `{ "op": "and", "args": [...] }`             |
| `not`                                | `{ "op": "not", "arg": ... }`                |

## Missing values

Missing paths don't throw. A path-based operator returns `false` when the path
can't be resolved, so a missing value and a falsy value look the same. Use
`exists` or `notExists` when you need to tell them apart.

## Examples

Compare a field to a literal:

```json
{
  "op": "eq",
  "left": { "path": "inputData.priority" },
  "right": { "literal": "urgent" }
}
```

Membership:

```json
{
  "op": "in",
  "value": { "path": "inputData.category" },
  "set": ["billing", "refunds"]
}
```

Combine conditions:

```json
{
  "op": "and",
  "args": [
    { "op": "exists", "path": "stepResults.lookup.customerId" },
    {
      "op": "gte",
      "left": { "path": "inputData.amount" },
      "right": { "literal": 100 }
    }
  ]
}
```

Negate one:

```json
{
  "op": "not",
  "arg": { "op": "truthy", "value": { "path": "inputData.resolved" } }
}
```

## Branch coverage

A `conditional` entry runs every branch whose predicate is true, and no branch
when none is. When the branches are meant to be exclusive, write predicates that
are genuine opposites — `eq` on one branch, `ne` on the other — so exactly one
runs.
