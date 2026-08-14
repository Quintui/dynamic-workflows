# Graph entries

Every entry in `graph` is one of the types below. Entries run in order and each
one receives the previous entry's output.

## Agent steps

Invokes a registered agent by ID. An agent step takes `{ prompt: string }` as
input and returns `{ text: string }` by default.

```json
{
  "type": "agent",
  "id": "summarize",
  "agentId": "support-agent"
}
```

The `id` identifies this call site inside the workflow. Later steps read the
result as `stepResults.summarize`, regardless of the agent's own ID.

Use a `mapping` entry before an agent step to build its `{ prompt }` input from
workflow data.

Add an `outputSchema` to ask the agent for structured output instead of text:

```json
{
  "type": "agent",
  "id": "extract-subtopics",
  "agentId": "support-agent",
  "outputSchema": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": { "title": { "type": "string" } },
      "required": ["title"]
    }
  }
}
```

Agent entries also accept an optional `description` and an `options` object.
Only `retries` and `metadata` are kept:

```json
{
  "type": "agent",
  "id": "summarize",
  "agentId": "support-agent",
  "description": "Summarize the incoming request",
  "options": { "retries": 2, "metadata": { "team": "support" } }
}
```

## Tool steps

Invokes a tool by its registration key. The tool's input and output schemas come
from the registry, so you don't declare them here.

```json
{
  "type": "tool",
  "id": "lookup",
  "toolId": "lookup-customer"
}
```

Tool entries accept the same optional `description` and `options` fields as
agent entries, and again only `retries` and `metadata` are kept.

## Mapping steps

Reshapes data between steps. See `mapping.md` for the descriptors.

```json
{
  "type": "mapping",
  "id": "build-prompt",
  "mapConfig": "{\"prompt\":{\"template\":\"Summarize this request: ${initData.request}\"}}"
}
```

Mapping entries must be top-level entries in `graph`. They cannot be nested
inside `parallel`, `conditional`, `foreach` or `loop`.

## Nested workflow steps

Invokes another registered workflow as a single step.

```json
{
  "type": "workflow",
  "id": "lookup-first",
  "workflowId": "lookup-customer-workflow"
}
```

The `id` is the call site, so the same nested workflow can appear several times
under different IDs and each result is addressed as `stepResults.<id>`. A
`workflow` entry also accepts an optional `description`.

## Parallel entries

Runs several single steps concurrently and merges their outputs into one object
keyed by step ID.

```json
{
  "type": "parallel",
  "steps": [
    { "type": "tool", "id": "first", "toolId": "lookup-customer" },
    { "type": "tool", "id": "second", "toolId": "lookup-customer" }
  ]
}
```

Each child must be an `agent`, `tool` or `workflow` entry. Every child receives
the parallel entry's input directly.

## Conditional entries

Pairs each step with a predicate and runs every branch whose predicate is true.

```json
{
  "type": "conditional",
  "steps": [
    { "type": "agent", "id": "escalate", "agentId": "support-agent" },
    { "type": "agent", "id": "auto-reply", "agentId": "support-agent" }
  ],
  "predicates": [
    {
      "op": "eq",
      "left": { "path": "inputData.priority" },
      "right": { "literal": "urgent" }
    },
    {
      "op": "ne",
      "left": { "path": "inputData.priority" },
      "right": { "literal": "urgent" }
    }
  ]
}
```

Each child must be an `agent`, `tool` or `workflow` entry, and every child needs
its own predicate at the same index. All children receive the conditional
entry's input directly.

To read whichever branch ran, use a mapping descriptor with an array of step
IDs — see `mapping.md`.

## Foreach entries

Runs its body once per item of an array input. The preceding entry must produce
a raw array. Results keep the input order, and concurrency defaults to `1`.

```json
{
  "type": "foreach",
  "step": {
    "type": "workflow",
    "id": "write-blurb",
    "workflowId": "blurb-workflow"
  },
  "opts": { "concurrency": 3 }
}
```

The body can be an `agent`, `tool` or `workflow` entry, but not a `mapping`
entry.

## Loop entries

Repeats one step while (`dowhile`) or until (`dountil`) a predicate holds.

```json
{
  "type": "loop",
  "loopType": "dountil",
  "step": { "type": "tool", "id": "poll", "toolId": "check-status" },
  "predicate": {
    "op": "eq",
    "left": { "path": "inputData.status" },
    "right": { "literal": "done" }
  }
}
```

The body is a single step and the predicate is required.

## Sleep entries

`sleep` pauses for a fixed number of milliseconds. `sleepUntil` pauses until a
fixed ISO date string. Both take literal values only.

```json
{ "type": "sleep", "id": "wait", "duration": 5000 }
```

```json
{ "type": "sleepUntil", "id": "wait-for-launch", "date": "2027-01-01T00:00:00.000Z" }
```
