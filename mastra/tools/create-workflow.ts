import { createTool } from "@mastra/core/tools"
import { z } from "zod"

/**
 * The chat agent's only tool. It doesn't run any triage work itself — it hands
 * over a finished dynamic workflow definition, which Mastra validates and
 * registers with `addDynamicWorkflow()`. The blocks in `mastra/tools/index.ts`
 * and `mastra/agents/` are what the definition references; the agent never
 * calls them directly.
 *
 * The tool call is also what the canvas renders, so the definition reaches the
 * UI as structured data rather than as JSON pasted into the reply.
 */

/** A JSON Schema document. Kept loose — Mastra validates the real shape. */
const jsonSchema = z.record(z.string(), z.any())

export const createWorkflow = createTool({
  id: "create_workflow",
  description:
    "Register a dynamic workflow definition and show it on the canvas. Call this once the definition is complete. Do not also paste the JSON into your reply — the canvas renders it. If it comes back with validation issues, fix them and call again with the same id.",
  inputSchema: z.object({
    id: z
      .string()
      .describe("Unique workflow id in kebab-case, e.g. tenant-b-triage"),
    description: z.string().optional().describe("One line on what it does"),
    inputSchema: jsonSchema.describe("JSON Schema for the workflow input"),
    outputSchema: jsonSchema.describe("JSON Schema for the workflow output"),
    graph: z
      .array(z.record(z.string(), z.any()))
      .describe("The ordered graph entries"),
  }),
  outputSchema: z.object({
    registered: z.boolean(),
    workflowId: z.string(),
    stepCount: z.number(),
    issues: z.string().optional(),
  }),
  execute: async (definition, context) => {
    const result = {
      workflowId: definition.id,
      stepCount: definition.graph.length,
    }

    const mastra = context?.mastra

    if (!mastra) {
      // Rendering still works; only the registry round trip is skipped.
      return { ...result, registered: false, issues: "No Mastra instance." }
    }

    try {
      // The input schema is deliberately loose so the model can send any valid
      // definition; `addDynamicWorkflow` is what actually validates the shape.
      await mastra.addDynamicWorkflow(
        definition as Parameters<typeof mastra.addDynamicWorkflow>[0]
      )

      return { ...result, registered: true }
    } catch (error) {
      return {
        ...result,
        registered: false,
        issues: error instanceof Error ? error.message : String(error),
      }
    }
  },
})
