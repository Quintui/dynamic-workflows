import { Agent } from "@mastra/core/agent"

import { DEFAULT_MODEL, isModelAllowed } from "@/lib/models"

export const chatAgent = new Agent({
  id: "chat-agent",
  name: "Chat Agent",
  instructions:
    "You are a helpful assistant. Answer clearly and concisely, and use markdown when it makes the answer easier to read.",
  // The model is picked per request from the model selector in the UI. Requests
  // go through OpenRouter (OPENROUTER_API_KEY) using Mastra's model router, so
  // the ids in lib/models.ts are OpenRouter slugs with an `openrouter/` prefix.
  model: ({ requestContext }) => {
    const requested = requestContext.get("model")
    const modelId =
      typeof requested === "string" && isModelAllowed(requested)
        ? requested
        : DEFAULT_MODEL

    return `openrouter/${modelId}`
  },
  // Tools go here once we need them again, e.g.:
  // tools: { github_repo: githubRepo },
})
