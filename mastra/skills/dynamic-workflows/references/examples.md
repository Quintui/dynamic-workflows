# Worked examples

Three tenants triaging support tickets out of the same eight blocks. The blocks
are fixed; the order, the branches and the subset used are what differ.

Read these for the shape of a correct definition, not as templates to copy
verbatim — the user's process will differ.

## Tenant A — fast-moving startup

Speed over process. No customer lookup at all, no entitlement check. Alert the
team when it's urgent, and always draft a reply.

```json
{
  "id": "tenant-a-triage",
  "description": "Classify, alert the team if urgent, always draft a reply",
  "inputSchema": {
    "type": "object",
    "properties": { "request": { "type": "string" } },
    "required": ["request"]
  },
  "outputSchema": {
    "type": "object",
    "properties": { "reply": { "type": "string" } },
    "required": ["reply"]
  },
  "graph": [
    {
      "type": "mapping",
      "id": "build-classify-prompt",
      "mapConfig": "{\"prompt\":{\"template\":\"Classify this support ticket. Reply with a category and an urgency level.\\n\\n${initData.request}\"}}"
    },
    { "type": "agent", "id": "classify", "agentId": "classify-ticket" },
    {
      "type": "mapping",
      "id": "build-alert",
      "mapConfig": "{\"message\":{\"template\":\"Urgent ticket: ${initData.request}\"},\"urgency\":{\"value\":\"urgent\"}}"
    },
    {
      "type": "conditional",
      "steps": [{ "type": "tool", "id": "alert", "toolId": "notify-team" }],
      "predicates": [
        {
          "op": "eq",
          "left": { "path": "stepResults.classify.text" },
          "right": { "literal": "urgent" }
        }
      ]
    },
    {
      "type": "mapping",
      "id": "build-reply-prompt",
      "mapConfig": "{\"prompt\":{\"template\":\"Write a reply to this support ticket.\\n\\nTicket: ${initData.request}\\nClassification: ${stepResults.classify.text}\"}}"
    },
    { "type": "agent", "id": "reply", "agentId": "draft-reply" },
    {
      "type": "mapping",
      "id": "shape-output",
      "mapConfig": "{\"reply\":{\"step\":\"reply\",\"path\":\"text\"}}"
    }
  ]
}
```

Note the `conditional` with a single branch: that is how you express "do this
step only when the predicate holds". When no predicate matches, nothing runs and
the flow continues.

## Tenant B — enterprise SaaS with paid tiers

The only tenant that branches on what the customer pays for. Paid customers get
a written reply; free customers get pointed at the forum.

```json
{
  "id": "tenant-b-triage",
  "description": "Entitlement-gated triage: paid tiers get a reply, free tier goes to the forum",
  "inputSchema": {
    "type": "object",
    "properties": {
      "request": { "type": "string" },
      "customerId": { "type": "string" }
    },
    "required": ["request", "customerId"]
  },
  "outputSchema": {
    "type": "object",
    "properties": { "response": { "type": "string" } },
    "required": ["response"]
  },
  "graph": [
    {
      "type": "mapping",
      "id": "build-lookup",
      "mapConfig": "{\"customerId\":{\"initData\":true,\"path\":\"customerId\"}}"
    },
    { "type": "tool", "id": "customer", "toolId": "lookup-customer" },
    {
      "type": "mapping",
      "id": "build-entitlement",
      "mapConfig": "{\"planTier\":{\"step\":\"customer\",\"path\":\"planTier\"}}"
    },
    { "type": "tool", "id": "entitlement", "toolId": "check-entitlement" },
    {
      "type": "mapping",
      "id": "build-branch-input",
      "mapConfig": "{\"prompt\":{\"template\":\"Write a reply to this support ticket from ${stepResults.customer.name}.\\n\\n${initData.request}\"},\"subject\":{\"initData\":true,\"path\":\"request\"},\"channel\":{\"step\":\"entitlement\",\"path\":\"channel\"}}"
    },
    {
      "type": "conditional",
      "steps": [
        { "type": "agent", "id": "paid-reply", "agentId": "draft-reply" },
        { "type": "tool", "id": "forum", "toolId": "route-to-forum" }
      ],
      "predicates": [
        {
          "op": "ne",
          "left": { "path": "inputData.channel" },
          "right": { "literal": "self-serve" }
        },
        {
          "op": "eq",
          "left": { "path": "inputData.channel" },
          "right": { "literal": "self-serve" }
        }
      ]
    },
    {
      "type": "mapping",
      "id": "shape-output",
      "mapConfig": "{\"response\":{\"step\":[\"paid-reply\",\"forum\"],\"path\":\"text\"}}"
    }
  ]
}
```

Two things to copy from this one. The mapping before the `conditional` builds a
single object carrying everything *both* branches need, because every branch
receives the same input. And the final mapping uses an array of step IDs to read
whichever branch actually ran.

## Tenant C — EU company with compliance obligations

Nothing is skipped. The only tenant that translates, and the only one that
always files an audit ticket.

```json
{
  "id": "tenant-c-triage",
  "description": "Full auditable triage: classify, look up, draft, translate, file a ticket",
  "inputSchema": {
    "type": "object",
    "properties": {
      "request": { "type": "string" },
      "customerId": { "type": "string" }
    },
    "required": ["request", "customerId"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "reply": { "type": "string" },
      "ticketRef": { "type": "string" }
    },
    "required": ["reply", "ticketRef"]
  },
  "graph": [
    {
      "type": "mapping",
      "id": "build-classify-prompt",
      "mapConfig": "{\"prompt\":{\"template\":\"Classify this support ticket. Reply with a category and an urgency level.\\n\\n${initData.request}\"}}"
    },
    { "type": "agent", "id": "classify", "agentId": "classify-ticket" },
    {
      "type": "mapping",
      "id": "build-lookup",
      "mapConfig": "{\"customerId\":{\"initData\":true,\"path\":\"customerId\"}}"
    },
    { "type": "tool", "id": "customer", "toolId": "lookup-customer" },
    {
      "type": "mapping",
      "id": "build-reply-prompt",
      "mapConfig": "{\"prompt\":{\"template\":\"Write a reply to this support ticket from ${stepResults.customer.name}.\\n\\nTicket: ${initData.request}\\nClassification: ${stepResults.classify.text}\"}}"
    },
    { "type": "agent", "id": "reply", "agentId": "draft-reply" },
    {
      "type": "mapping",
      "id": "build-translate-prompt",
      "mapConfig": "{\"prompt\":{\"template\":\"Translate the following reply into ${stepResults.customer.preferredLanguage}.\\n\\n${stepResults.reply.text}\"}}"
    },
    { "type": "agent", "id": "translated", "agentId": "translate" },
    {
      "type": "mapping",
      "id": "build-ticket",
      "mapConfig": "{\"subject\":{\"initData\":true,\"path\":\"request\"},\"description\":{\"step\":\"translated\",\"path\":\"text\"},\"category\":{\"step\":\"classify\",\"path\":\"text\"},\"customerId\":{\"initData\":true,\"path\":\"customerId\"}}"
    },
    { "type": "tool", "id": "audit", "toolId": "create-ticket" },
    {
      "type": "mapping",
      "id": "shape-output",
      "mapConfig": "{\"reply\":{\"step\":\"translated\",\"path\":\"text\"},\"ticketRef\":{\"step\":\"audit\",\"path\":\"ticketRef\"}}"
    }
  ]
}
```

The scenario lists translate before draft-reply, but a draft has to exist before
it can be translated — so the graph runs `draft-reply` then `translate`. When a
described order can't actually work, fix it and say why in one line.

## What the three show together

Tenant A never looks the customer up. Tenant B is the only one that branches on
entitlement. Tenant C is the only one that translates and the only one that
always files an audit ticket. Same eight blocks, three different processes.
