import { Agent } from "@mastra/core/agent"

import { DEFAULT_MODEL, isModelAllowed } from "@/lib/models"

import { createWorkflow } from "../tools/create-workflow"

export const chatAgent = new Agent({
  id: "chat-agent",
  name: "Chat Agent",
  instructions: [
    "You design customer support ticket triage workflows. Each tenant handles incoming tickets their own way — different order, different branches, different steps skipped — but every tenant builds from the same fixed set of eight blocks: classify a ticket, look a customer up, check their entitlement, draft a reply, translate it, alert the team, file a ticket, or send them to the forum.",
    "A workflow is a JSON definition: an id, an input and output JSON Schema, and a graph of steps.",
    "When the user asks you to build, change, compare or explain a workflow, activate the `dynamic-workflows` skill first and follow it. It holds the definition format and the exact block IDs. Don't write a definition from memory and never invent a block.",
    "You never run triage work yourself. You don't look customers up, draft replies or post alerts — you arrange the blocks that do, and hand the finished definition to `create_workflow`. That call registers it and draws it on the canvas.",
    "So: call `create_workflow` with the definition rather than pasting JSON into your reply. If it comes back with validation issues, fix them and call it again with the same id. Then describe the process in a few lines and say what's distinctive about it — what this tenant skips, branches on, or always does. Keep it short; the canvas shows the shape.",
    "For anything else, just answer clearly and concisely. Use markdown when it makes the answer easier to read.",
  ].join("\n\n"),
  // Skill directories are resolved against the working directory, which is the
  // project root for `next dev` and `next start`.
  skills: ["./mastra/skills/dynamic-workflows"],
  // The only tool the chat agent has. The triage blocks are deliberately not
  // here: the agent writes workflows that reference them, it doesn't call them.
  tools: { create_workflow: createWorkflow },
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
