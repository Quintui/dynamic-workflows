# Mapping steps

A `mapping` entry reshapes data. Its `mapConfig` is a **JSON string** encoding an
object. Each key of that object becomes a key of the step's output, and each
value is a descriptor saying where the value comes from.

```json
{
  "type": "mapping",
  "id": "build-prompt",
  "mapConfig": "{\"prompt\":{\"template\":\"Summarize this request: ${initData.request}\"}}"
}
```

Written out, the `mapConfig` above encodes:

```json
{ "prompt": { "template": "Summarize this request: ${initData.request}" } }
```

Always emit `mapConfig` as an escaped JSON string, the way a stored definition
carries it.

## Descriptors

| Descriptor                             | Value                                     |
| -------------------------------------- | ----------------------------------------- |
| `{ "value": ... }`                     | A constant JSON value                     |
| `{ "template": "..." }`                | A string built from `${...}` placeholders |
| `{ "initData": true, "path": "a.b" }`  | A value from the workflow input           |
| `{ "step": "step-id", "path": "a.b" }` | A value from a preceding step's output    |
| `{ "requestContextPath": "a.b" }`      | A value from the request context          |

A `step` source also accepts an array of step IDs:

```json
{ "step": ["escalate", "auto-reply"], "path": "text" }
```

The first listed step with a non-empty result supplies the value, which is how
you read whichever branch of a `conditional` entry actually ran.

## Templates

Template placeholders resolve against `initData`, `inputData`, `state`,
`requestContext` and `stepResults.<step-id>`.

- Objects and arrays pulled into a template are stringified as JSON.
- A `null` inside a present result renders as an empty string.
- A template that references a step with no successful output fails the run.

## Placement

Mapping entries must be top-level entries in `graph`. They cannot be placed
inside `parallel`, `conditional`, `foreach` or `loop`.

Reach for a mapping entry whenever one step's output doesn't match the next
step's input — most commonly to build an agent's `{ prompt }`, or as a final
entry that assembles the workflow's declared `outputSchema` from earlier step
results.
