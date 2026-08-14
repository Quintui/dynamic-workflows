# Worked examples

Complete definitions, smallest first. The component IDs here are illustrative —
in a real definition every `agentId`, `toolId` and `workflowId` must name a
component registered on this app.

## Mapping only

No agents or tools: the graph is a single mapping entry that builds the output
from the input.

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

## One tool

A tool step's schemas come from the registry, so the graph entry only names the
tool.

```json
{
  "id": "customer-lookup",
  "description": "Look up a customer by ID",
  "inputSchema": {
    "type": "object",
    "properties": { "customerId": { "type": "string" } },
    "required": ["customerId"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "plan": { "type": "string" }
    },
    "required": ["name", "plan"]
  },
  "graph": [{ "type": "tool", "id": "lookup", "toolId": "lookup-customer" }]
}
```

## Mapping into an agent, then back out

The first mapping builds the agent's `{ prompt }`. The last mapping turns the
agent's `{ text }` into the declared output shape.

```json
{
  "id": "summarize-request",
  "description": "Summarize a support request",
  "inputSchema": {
    "type": "object",
    "properties": { "request": { "type": "string" } },
    "required": ["request"]
  },
  "outputSchema": {
    "type": "object",
    "properties": { "summary": { "type": "string" } },
    "required": ["summary"]
  },
  "graph": [
    {
      "type": "mapping",
      "id": "build-prompt",
      "mapConfig": "{\"prompt\":{\"template\":\"Summarize this request: ${initData.request}\"}}"
    },
    { "type": "agent", "id": "summarize", "agentId": "support-agent" },
    {
      "type": "mapping",
      "id": "shape-output",
      "mapConfig": "{\"summary\":{\"step\":\"summarize\",\"path\":\"text\"}}"
    }
  ]
}
```

## Branching on a field

Exactly one branch runs because the predicates are opposites. The final mapping
reads whichever branch produced a result.

```json
{
  "id": "triage-request",
  "description": "Escalate urgent requests, auto-reply to the rest",
  "inputSchema": {
    "type": "object",
    "properties": {
      "prompt": { "type": "string" },
      "priority": { "type": "string" }
    },
    "required": ["prompt", "priority"]
  },
  "outputSchema": {
    "type": "object",
    "properties": { "reply": { "type": "string" } },
    "required": ["reply"]
  },
  "graph": [
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
    },
    {
      "type": "mapping",
      "id": "shape-output",
      "mapConfig": "{\"reply\":{\"step\":[\"escalate\",\"auto-reply\"],\"path\":\"text\"}}"
    }
  ]
}
```

## Polling until done

A `dountil` loop repeats the step until the predicate holds.

```json
{
  "id": "wait-for-job",
  "description": "Poll a job until it finishes",
  "inputSchema": {
    "type": "object",
    "properties": { "jobId": { "type": "string" } },
    "required": ["jobId"]
  },
  "outputSchema": {
    "type": "object",
    "properties": { "status": { "type": "string" } },
    "required": ["status"]
  },
  "graph": [
    { "type": "sleep", "id": "initial-wait", "duration": 5000 },
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
  ]
}
```
