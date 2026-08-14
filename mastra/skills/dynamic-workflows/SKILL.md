---
name: dynamic-workflows
description: Use when the user asks to build, change, review or explain a workflow. Covers how to author a Mastra dynamic workflow definition — the JSON document with id, input/output JSON Schema and a step graph — including every graph entry type, the mapping descriptors and the predicate DSL.
---

# Authoring a dynamic workflow definition

A workflow is a JSON document, not code. It describes the workflow's schemas and
its step graph. Anything that can produce JSON can author one, which is why you
can write one directly.

Your job is to produce a valid definition object. Registering, storing and
running it is handled elsewhere — you never call an API yourself.

## Definition shape

| Field                  | Type                        | Required | Description                                                  |
| ---------------------- | --------------------------- | -------- | ------------------------------------------------------------ |
| `id`                   | `string`                    | Yes      | Unique workflow ID, also used to retrieve and run it          |
| `description`          | `string`                    | No       | Human-readable description                                    |
| `inputSchema`          | `JsonSchema`                | Yes      | JSON Schema for the workflow input                            |
| `outputSchema`         | `JsonSchema`                | Yes      | JSON Schema for the workflow output                           |
| `stateSchema`          | `JsonSchema`                | No       | JSON Schema for shared workflow state                         |
| `requestContextSchema` | `JsonSchema`                | No       | JSON Schema for values read from the request context          |
| `metadata`             | `Record<string, unknown>`   | No       | Arbitrary JSON metadata                                       |
| `graph`                | `SerializedStepFlowEntry[]` | Yes      | The ordered step entries that make up the workflow            |

Schemas are **JSON Schema**, not Zod, so the whole definition survives a JSON
round trip.

```json
{
  "id": "greeting-workflow",
  "description": "Returns a greeting for the supplied name",
  "inputSchema": {
    "type": "object",
    "properties": { "name": { "type": "string" } },
    "required": ["name"]
  },
  "outputSchema": {
    "type": "object",
    "properties": { "message": { "type": "string" } },
    "required": ["message"]
  },
  "graph": [
    {
      "type": "mapping",
      "id": "create-greeting",
      "mapConfig": "{\"message\":{\"template\":\"Hello, ${initData.name}!\"}}"
    }
  ]
}
```

## The blocks you can use

This app triages customer support tickets. The capability palette is **fixed** —
these eight blocks are the only `agentId`s and `toolId`s that exist. Every
tenant's process is built by arranging them differently: different order,
different branches, different subsets.

| Block             | Entry type | Does                                                | Takes                              | Returns                                                  |
| ----------------- | ---------- | --------------------------------------------------- | ---------------------------------- | -------------------------------------------------------- |
| `classify-ticket` | `agent`    | Reads the request, decides category and urgency      | `{ prompt }` with the request text | `{ text }`, or structured via `outputSchema`              |
| `lookup-customer` | `tool`     | Fetches the customer record                          | `{ customerId }`                   | `{ customerId, name, planTier, accountAgeDays, preferredLanguage }` |
| `check-entitlement` | `tool`   | Maps a plan tier to a support channel                | `{ planTier }`                     | `{ planTier, channel, responseTargetHours }`             |
| `draft-reply`     | `agent`    | Writes the customer-facing response                  | `{ prompt }` with ticket + context | `{ text }`                                               |
| `translate`       | `agent`    | Translates a draft into the customer's language      | `{ prompt }` with text + language  | `{ text }`                                               |
| `notify-team`     | `tool`     | Posts an alert to the internal channel               | `{ message, urgency }`             | `{ delivered, channel, notifiedAt }`                     |
| `create-ticket`   | `tool`     | Files a ticket in the tracker for follow-up or audit | `{ subject, description?, category?, urgency?, customerId? }` | `{ ticketRef, url, status }`         |
| `route-to-forum`  | `tool`     | Sends the customer to self-serve community resources | `{ subject, category? }`           | `{ text, url }`                                          |

Plan tiers are `free`, `standard`, `pro` and `enterprise`. Entitlement channels
are `self-serve`, `standard` and `priority`. Urgency is `low`, `normal` or
`urgent`.

Never invent a block outside this list. If someone asks for a step the palette
can't do — charge a card, call a phone number — say which block is missing
rather than inventing an ID, and offer the closest arrangement that does work.

Because the agent blocks take `{ prompt }` and return `{ text }`, an agent entry
almost always needs a `mapping` entry before it (to build the prompt) and often
one after it (to name its `text` output). `route-to-forum` also returns its copy
under `text`, so a branch between it and `draft-reply` can be read with a single
`{ "step": ["…", "…"], "path": "text" }` descriptor.

## The graph

Entries in `graph` run in order. Each entry receives the previous entry's
output; the first entry receives the workflow input.

| Entry type    | Purpose                                                |
| ------------- | ------------------------------------------------------ |
| `agent`       | Invoke a registered agent                              |
| `tool`        | Invoke a registered tool                               |
| `mapping`     | Reshape data between steps                             |
| `workflow`    | Invoke a registered workflow as a nested step          |
| `parallel`    | Run several steps concurrently and merge their outputs |
| `conditional` | Run every branch whose predicate is true, concurrently |
| `foreach`     | Run one step per item of an array input                |
| `loop`        | Repeat a step while or until a predicate holds         |
| `sleep`       | Pause for a fixed duration                             |
| `sleepUntil`  | Pause until a fixed date                               |

Read `references/graph-entries.md` for the exact shape of every entry type,
`references/mapping.md` for mapping descriptors and templates, and
`references/predicates.md` for the predicate DSL used by `conditional` and
`loop`. `references/examples.md` has complete worked definitions.

## Rules that decide whether a definition is valid

- Every `agentId` and `toolId` must come from the palette above. Never invent
  one, and never stop to ask which block to use — pick the closest one and say
  so. A definition the user can see beats a question.
- Each entry's input must be compatible with the previous entry's output. When
  they don't line up, put a `mapping` entry between them.
- Entry `id` is the call site, not the component. Later steps read a result as
  `stepResults.<entry-id>`, so IDs must be unique within the graph and should
  describe the step ("summarize", "poll-status"), in kebab-case.
- `mapping` entries must be top-level entries in `graph`. They cannot go inside
  `parallel`, `conditional`, `foreach` or `loop`.
- Children of `parallel`, `conditional`, `foreach` and `loop` must be `agent`,
  `tool` or `workflow` entries.
- The last entry's output must satisfy `outputSchema`. Add a final `mapping`
  entry when the last real step returns a different shape.
- `sleep` / `sleepUntil` take literal values only — a duration in milliseconds
  or an ISO date string. Nothing computed at runtime.

## How to work

1. Restate the workflow as a short ordered list of steps before writing JSON.
2. Fix the boundaries first: what goes in (`inputSchema`) and what comes out
   (`outputSchema`). Keep both objects with named properties and a `required`
   list.
3. Write the graph one entry at a time, tracking the shape flowing between
   entries. Insert `mapping` entries wherever the shape changes.
4. Walk the graph once against the rules above before you present it.
5. Present the definition as a single JSON object in a ```json code block, and
   describe what it does in a sentence or two. Don't dump the whole schema in
   prose — the JSON is the answer.

Prefer the smallest graph that does the job. Reach for `parallel`,
`conditional`, `foreach` and `loop` only when the user's description actually
calls for concurrency, branching, iteration or polling.
