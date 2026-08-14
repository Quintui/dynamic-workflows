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
  // A registered definition is a persisted one — `addDynamicWorkflow()` writes
  // it to the `workflowDefinitions` storage domain.
  ready: "Saved",
  invalid: "Needs fixing",
}

export interface Workflow {
  /** The workflow id. A draft and its saved row are the same entry. */
  id: string
  definition: WorkflowDraft
  status: WorkflowStatus
  /** Whether it came back from storage, which also means it can be run. */
  saved: boolean
  /** Validation errors from Mastra, when the definition was rejected. */
  issues?: string
}

/** A definition read back from storage, as `/api/workflows` returns it. */
export interface StoredWorkflow {
  id: string
  description?: string
  inputSchema?: JsonSchema
  outputSchema?: JsonSchema
  graph: GraphEntries
  /** ISO timestamp of the last save. The list is ordered by it. */
  updatedAt: string
}

/** One step's outcome inside a run, keyed in `WorkflowRun.steps` by step id. */
export interface StepRun {
  status: string
  output?: unknown
  error?: string
}

/** The result of running a workflow, as `/api/workflows/[id]/run` returns it. */
export interface WorkflowRun {
  runId?: string
  status: string
  result?: unknown
  error?: string
  steps: Record<string, StepRun>
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

/** One field of a workflow's input, as the run form renders it. */
export interface InputField {
  name: string
  /** `json` covers objects and arrays, which get a textarea. */
  type: "string" | "number" | "boolean" | "json"
  required: boolean
  description?: string
  /** Present when the schema pins the field to a fixed set of values. */
  options?: string[]
}

function fieldType(property: Record<string, unknown>): InputField["type"] {
  switch (property.type) {
    case "number":
    case "integer":
      return "number"
    case "boolean":
      return "boolean"
    case "string":
      return "string"
    default:
      return "json"
  }
}

/**
 * Flattens a workflow's input JSON Schema into a flat list of fields. Only the
 * top level is read — anything that isn't a primitive is handed to the form as
 * raw JSON rather than being expanded into nested inputs.
 */
export function inputFields(schema: JsonSchema | undefined): InputField[] {
  const properties = schema?.properties

  if (!properties || typeof properties !== "object") {
    return []
  }

  const required = new Set(
    Array.isArray(schema?.required) ? (schema.required as string[]) : []
  )

  return Object.entries(properties as Record<string, unknown>).map(
    ([name, value]) => {
      const property = (
        typeof value === "object" && value !== null ? value : {}
      ) as Record<string, unknown>

      return {
        name,
        type: fieldType(property),
        required: required.has(name),
        description:
          typeof property.description === "string"
            ? property.description
            : undefined,
        options: Array.isArray(property.enum)
          ? property.enum.map(String)
          : undefined,
      }
    }
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
