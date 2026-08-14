import { Agent } from "@mastra/core/agent"

import { DEFAULT_MODEL } from "@/lib/models"

/**
 * A building block, not the chat agent. Workflow definitions invoke it with
 * `{ "type": "agent", "agentId": "draft-reply" }`.
 */
export const draftReplyAgent = new Agent({
  id: "draft-reply",
  name: "Draft Reply",
  instructions: [
    "You write customer-facing replies to support tickets.",
    "Match the tone to the situation: warm and direct for routine questions, calm and specific when something is broken. Never blame the customer.",
    "Acknowledge the issue, say what happens next, and give a timeframe when the context provides one. Keep it under 150 words.",
    "Write the reply body only — no subject line, no placeholders like [name] unless the context gives you the real value.",
  ].join("\n\n"),
  model: `openrouter/${DEFAULT_MODEL}`,
})
