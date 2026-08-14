import {
  STEP_RUNNING,
  type GraphEntries,
  type JsonSchema,
  type RunEvent,
  type StepRun,
  type StoredWorkflow,
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

/** One event off `run.stream()`, as far as the UI cares about it. */
interface StepChunk {
  type: string
  payload?: {
    id?: string
    status?: string
    output?: unknown
  }
}

/**
 * A block starting or reporting a result. Everything else the workflow stream
 * emits — workflow-level markers, token usage, per-iteration progress — is left
 * out, because the canvas draws blocks.
 */
function toStepEvent(chunk: StepChunk): RunEvent | null {
  const stepId = chunk.payload?.id

  if (!stepId) {
    return null
  }

  switch (chunk.type) {
    case "workflow-step-start":
      return { type: "step", stepId, step: { status: STEP_RUNNING } }
    case "workflow-step-result":
    case "workflow-step-suspended":
      return {
        type: "step",
        stepId,
        step: {
          status: chunk.payload?.status ?? "success",
          output: chunk.payload?.output,
        },
      }
    default:
      return null
  }
}

/**
 * Runs a saved workflow, reporting each block as it starts and finishes.
 *
 * `run.start()` would only resolve at the end, which tells you nothing while a
 * long workflow is in flight, so this uses `run.stream()` and writes the events
 * out as newline-delimited JSON. The final `finish` event carries the whole run
 * — including the per-step errors the mid-stream events don't have — so the UI
 * can replace what it built up with the authoritative result.
 *
 * A workflow that fails mid-graph still finishes with a run. Only an unknown
 * workflow id throws.
 */
export async function streamStoredWorkflow(
  id: string,
  inputData: Record<string, unknown>
): Promise<ReadableStream<Uint8Array>> {
  await loadStoredWorkflows()

  const run = await mastra.getWorkflow(id).createRun()
  const stream = run.stream({ inputData })
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      function send(event: RunEvent) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }

      try {
        for await (const chunk of stream) {
          const event = toStepEvent(chunk as StepChunk)

          if (event) {
            send(event)
          }
        }

        const result = (await stream.result) as {
          status: string
          result?: unknown
          error?: unknown
          steps?: unknown
        }

        send({
          type: "finish",
          run: {
            runId: run.runId,
            status: result.status,
            result: result.result,
            error: result.error ? String(result.error) : undefined,
            steps: toSteps(result.steps),
          },
        })
      } catch (error) {
        console.error(`The run of workflow ${id} failed`, error)

        send({
          type: "error",
          message: error instanceof Error ? error.message : "The run failed.",
        })
      } finally {
        controller.close()
      }
    },
  })
}
