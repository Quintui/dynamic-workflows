import { Mastra } from "@mastra/core/mastra"

import { chatAgent } from "./agents/chat-agent"
import { classifyTicketAgent } from "./agents/classify-ticket"
import { draftReplyAgent } from "./agents/draft-reply"
import { translateAgent } from "./agents/translate"
import { supportTools } from "./tools"

export const mastra = new Mastra({
  agents: {
    // The agent behind the chat panel.
    chatAgent,
    // Building blocks. Workflow definitions reference these by their agent id,
    // so the registry key is kept the same as the id.
    "classify-ticket": classifyTicketAgent,
    "draft-reply": draftReplyAgent,
    translate: translateAgent,
  },
  // Building blocks. Workflow definitions reference these by the key.
  tools: supportTools,
})
