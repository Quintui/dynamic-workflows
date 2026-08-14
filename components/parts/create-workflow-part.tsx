import { TriangleAlertIcon, WorkflowIcon } from "lucide-react"

import { type CreateWorkflowToolPart } from "@/tools"

/**
 * The workflow itself is drawn on the canvas, so in the chat this is only a
 * marker that the agent handed one over — plus the validation errors when
 * Mastra rejected it, since those are what the user has to act on.
 */
export function CreateWorkflowPart({ part }: { part: CreateWorkflowToolPart }) {
  const id = part.input?.id

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return (
        <div className="flex items-center gap-2 px-1.5 text-sm text-muted-foreground">
          <WorkflowIcon className="size-4 shrink-0" />
          <span className="truncate">
            Building{" "}
            {id ? <code className="font-mono">{id}</code> : "a workflow"}…
          </span>
        </div>
      )
    case "output-available":
      return part.output.registered ? (
        <div className="flex items-center gap-2 px-1.5 text-sm text-muted-foreground">
          <WorkflowIcon className="size-4 shrink-0" />
          <span className="truncate">
            Built <code className="font-mono">{part.output.workflowId}</code> ·{" "}
            {part.output.stepCount} steps
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-2 px-1.5 text-sm text-destructive">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>{part.output.issues ?? "The definition didn't validate."}</span>
        </div>
      )
    case "output-error":
      return (
        <div className="px-1.5 text-sm text-destructive">
          Could not build the workflow: {part.errorText}
        </div>
      )
    default:
      return null
  }
}
