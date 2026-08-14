import {
  type GraphEntries,
  type JsonSchema,
  type StepRun,
  type StoredWorkflow,
  type WorkflowRun,
} from "@/lib/workflows"

import { mastra } from "."

/**
 * The persisted side of the workflows the agent builds.
 *
 * `create_workflow` calls `mastra.addDynamicWorkflow()`, which validates the
 * definition, registers it live and writes it to the `workflowDefinitions`
 * storage domain (a local SQLite file — see `mastra/index.ts`). This module is
 * the way back: it lists what's stored, re-registers it after a restart, and
 * runs one.
 */

/** The stored row, as the `workflowDefinitions` domain returns it. */
interface StoredDefinition {
  id: string
  description?: string
  inputSchema?: unknown
  outputSchema?: unknown
  graph: unknown[]
  updatedAt: Date | string
}

async function definitions() {
  return mastra.getStorage()?.getStore("workflowDefinitions")
}

let loaded: Promise<void> | undefined

/**
 * Mastra only re-registers stored definitions from inside `startWorkers()`,
 * which a Next.js app never calls — so a fresh process has the rows but no
 * runnable workflows. This does that load, once per process.
 *
 * Definitions the process already knows about are skipped, so the chat route
 * registering a workflow and this running one don't fight over the registry.
 */
export function loadStoredWorkflows() {
  loaded ??= (async () => {
    const store = await definitions()

    if (!store) {
      return
    }

    const { definitions: stored } = await store.list({ status: "active" })
    const live = mastra.listWorkflows()
    const pending = stored.filter((definition) => !live[definition.id])

    if (pending.length === 0) {
      return
    }

    // Validates the bundle as a unit and works out the registration order, so
    // a workflow nesting another comes back in the right sequence.
    //
    // A stored row's graph is typed as the wider validatable shape rather than
    // the definition input, even though every row was written from a definition
    // in the first place — hence the cast on the way back in.
    await mastra.addDynamicWorkflows(
      pending as unknown as Parameters<typeof mastra.addDynamicWorkflows>[0]
    )
  })().catch((error) => {
    // Don't cache the failure — the next request gets a fresh attempt.
    loaded = undefined
    throw error
  })

  return loaded
}

/** Every saved workflow, oldest first. */
export async function listStoredWorkflows(): Promise<StoredWorkflow[]> {
  await loadStoredWorkflows()

  const store = await definitions()

  if (!store) {
    return []
  }

  const { definitions: stored } = await store.list({ status: "active" })

  return (stored as unknown as StoredDefinition[])
    .map((definition) => ({
      id: definition.id,
      description: definition.description,
      inputSchema: definition.inputSchema as JsonSchema | undefined,
      outputSchema: definition.outputSchema as JsonSchema | undefined,
      graph: (definition.graph ?? []) as GraphEntries,
      updatedAt: new Date(definition.updatedAt).toISOString(),
    }))
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
}

/**
 * Whether this id belongs to a saved workflow. Guards the run route so it can
 * only reach definitions the agent built, not anything else on the instance.
 */
export async function isStoredWorkflow(id: string): Promise<boolean> {
  await loadStoredWorkflows()

  return mastra.getWorkflowOrigin(id) === "dynamic"
}

/**
 * A run result carries the workflow input under `steps.input` alongside the
 * real steps, so anything without a status is dropped.
 */
function toSteps(steps: unknown): Record<string, StepRun> {
  if (!steps || typeof steps !== "object") {
    return {}
  }

  const entries = Object.entries(steps as Record<string, unknown>).flatMap(
    ([id, value]) => {
      if (!value || typeof value !== "object" || !("status" in value)) {
        return []
      }

      const step = value as {
        status: unknown
        output?: unknown
        error?: unknown
      }

      return [
        [
          id,
          {
            status: String(step.status),
            output: step.output,
            error: step.error ? String(step.error) : undefined,
          },
        ] as const,
      ]
    }
  )

  return Object.fromEntries(entries)
}

/**
 * Runs a saved workflow to completion. Failures inside the workflow come back
 * as a result with `status: "failed"` rather than as a thrown error — only an
 * unknown workflow id throws.
 */
export async function runStoredWorkflow(
  id: string,
  inputData: Record<string, unknown>
): Promise<WorkflowRun> {
  await loadStoredWorkflows()

  const workflow = mastra.getWorkflow(id)
  const run = await workflow.createRun()
  const result = (await run.start({ inputData })) as {
    status: string
    result?: unknown
    error?: unknown
    steps?: unknown
    runId?: string
  }

  return {
    runId: result.runId,
    status: result.status,
    result: result.result,
    error: result.error ? String(result.error) : undefined,
    steps: toSteps(result.steps),
  }
}
