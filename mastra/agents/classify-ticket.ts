import { Agent } from "@mastra/core/agent"

import { DEFAULT_MODEL } from "@/lib/models"

/**
 * A building block, not the chat agent. Workflow definitions invoke it with
 * `{ "type": "agent", "agentId": "classify-ticket" }`.
 */
export const classifyTicketAgent = new Agent({
  id: "classify-ticket",
  name: "Classify Ticket",
  instructions: [
    "You classify incoming customer support tickets.",
    "Return a category — one of billing, technical, account, feedback or other — and an urgency level of low, normal or urgent.",
    "Treat outages, data loss, security concerns and blocked payments as urgent. Treat questions and feature requests as low.",
    "Answer with the category and urgency only. No explanation.",
  ].join("\n\n"),
  model: `openrouter/${DEFAULT_MODEL}`,
})
