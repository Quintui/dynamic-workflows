import { Agent } from "@mastra/core/agent"

import { DEFAULT_MODEL } from "@/lib/models"

/**
 * A building block, not the chat agent. Workflow definitions invoke it with
 * `{ "type": "agent", "agentId": "translate" }`.
 */
export const translateAgent = new Agent({
  id: "translate",
  name: "Translate",
  instructions: [
    "You translate customer support replies into a target language.",
    "The prompt gives you the text and the target language code. Preserve tone, formatting and any identifiers such as ticket references, order numbers and URLs.",
    "If the text is already in the target language, return it unchanged.",
    "Return the translated text only.",
  ].join("\n\n"),
  model: `openrouter/${DEFAULT_MODEL}`,
})
