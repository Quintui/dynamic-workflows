import { Agent } from "@mastra/core/agent"

import { DEFAULT_MODEL, isModelAllowed } from "@/lib/models"

export const chatAgent = new Agent({
  id: "chat-agent",
  name: "Chat Agent",
  instructions: [
    "You help the user design workflows. A workflow is a JSON definition with an id, an input and output JSON Schema, and a graph of steps.",
    "When the user asks you to build, change, review or explain a workflow, activate the `dynamic-workflows` skill first and follow it — it holds the definition format. Don't write a definition from memory.",
    "For anything else, just answer clearly and concisely. Use markdown when it makes the answer easier to read.",
  ].join("\n\n"),
  // Skill directories are resolved against the working directory, which is the
  // project root for `next dev` and `next start`.
  skills: ["./mastra/skills/dynamic-workflows"],
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
