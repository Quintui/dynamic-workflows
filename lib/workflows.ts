/**
 * The workflow shapes the UI works with. These mirror Mastra's dynamic workflow
 * definition — see `mastra/skills/dynamic-workflows/SKILL.md` — but only as far
 * as the canvas needs to draw them. Mastra does the real validation when
 * `create_workflow` registers the definition.
 */

/** A JSON Schema document, kept opaque. */
export type JsonSchema = Record<string, unknown>

/**
 * A definition as it arrives from the tool call. Everything is optional because
 * the canvas draws it while the call is still streaming.
 */
export interface WorkflowDraft {
  id?: string
  description?: string
  inputSchema?: JsonSchema
  outputSchema?: JsonSchema
  graph?: GraphEntries
}

/** A complete definition, which is what the tool's input type promises. */
export interface WorkflowDefinition extends WorkflowDraft {
  id: string
}

/**
 * One entry in the graph. The fields are all optional because the canvas draws
 * these while the tool call is still streaming in, so entries arrive partial.
 */
/** Entries arrive one at a time, so a slot can still be empty mid-stream. */
export type GraphEntries = (GraphEntry | undefined)[]

export interface GraphEntry {
  type?: string
  id?: string
  description?: string
  agentId?: string
  toolId?: string
  workflowId?: string
  mapConfig?: string | Record<string, unknown>
  duration?: number
  date?: string
  loopType?: string
  steps?: GraphEntries
  step?: GraphEntry
  predicates?: unknown[]
  predicate?: unknown
  opts?: { concurrency?: number }
}

export type WorkflowStatus = "building" | "ready" | "invalid"

export const WORKFLOW_STATUS_LABEL: Record<WorkflowStatus, string> = {
  building: "Building",
  ready: "Ready",
  invalid: "Needs fixing",
}

export interface Workflow {
  /** The tool call this came from — unique even when two share a workflow id. */
  key: string
  id: string
  definition: WorkflowDraft
  status: WorkflowStatus
  /** Validation errors from Mastra, when the definition was rejected. */
  issues?: string
}

/** The entry types that stand for one unit of work rather than plumbing. */
const BLOCK_TYPES = new Set(["agent", "tool", "workflow"])

/** Counts the real blocks in a graph, looking inside containers. */
export function countBlocks(entries: GraphEntries | undefined): number {
  if (!entries) {
    return 0
  }

  return entries.reduce<number>((total, entry) => {
    if (!entry) {
      return total
    }

    if (entry.type && BLOCK_TYPES.has(entry.type)) {
      return total + 1
    }

    return (
      total +
      countBlocks(entry.steps) +
      countBlocks(entry.step ? [entry.step] : undefined)
    )
  }, 0)
}

/** The label a graph entry shows on the canvas. */
export function entryLabel(entry: GraphEntry): string {
  return (
    entry.agentId ??
    entry.toolId ??
    entry.workflowId ??
    entry.id ??
    entry.type ??
    "step"
  )
}

/** The keys a mapping entry produces, for the connector chips on the canvas. */
export function mappingKeys(entry: GraphEntry): string[] {
  const { mapConfig } = entry

  if (!mapConfig) {
    return []
  }

  try {
    const parsed =
      typeof mapConfig === "string" ? JSON.parse(mapConfig) : mapConfig

    return typeof parsed === "object" && parsed !== null
      ? Object.keys(parsed)
      : []
  } catch {
    // Half-streamed mapConfig isn't valid JSON yet.
    return []
  }
}
