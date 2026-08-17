import { createTool } from "@mastra/core/tools"
import { z } from "zod"

/**
 * Reads a saved workflow definition back out of storage.
 *
 * `create_workflow` replaces a definition wholesale, so changing a workflow
 * means reading the current graph, editing it, and registering the whole thing
 * again under the same id. That only works if the agent can see the definition
 * — and in a fresh conversation it can't, because the tool call that built it
 * belongs to a chat that's gone.
 *
 * This reads the stored row rather than the live registry, so it also answers
 * on a cold process, where the definitions exist but nothing is registered yet
 * (see `mastra/stored-workflows.ts`).
 */
export const getWorkflow = createTool({
  id: "get_workflow",
  description:
    "Read a saved workflow's definition — its description, input and output schemas, and its full graph. Call this before changing a workflow whose definition isn't already in this conversation, then pass the edited definition to `create_workflow` under the same id.",
  inputSchema: z.object({
    id: z.string().describe("The workflow id, e.g. tenant-b-triage"),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    definition: z
      .object({
        id: z.string(),
        description: z.string().optional(),
        inputSchema: z.any(),
        outputSchema: z.any(),
        graph: z.array(z.any()),
      })
      .optional(),
    /** The ids that do exist, so a wrong guess is recoverable in one turn. */
    available: z.array(z.string()).optional(),
  }),
  execute: async ({ id }, context) => {
    const store = await context?.mastra
      ?.getStorage()
      ?.getStore("workflowDefinitions")

    if (!store) {
      return { found: false }
    }

    const definition = await store.get(id)

    if (!definition) {
      const { definitions } = await store.list({ status: "active" })

      return { found: false, available: definitions.map((one) => one.id) }
    }

    return {
      found: true,
      definition: {
        id: definition.id,
        description: definition.description,
        inputSchema: definition.inputSchema,
        outputSchema: definition.outputSchema,
        graph: definition.graph,
      },
    }
  },
})
