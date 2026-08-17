import { FileSearchIcon, TriangleAlertIcon } from "lucide-react"

import { type GetWorkflowToolPart } from "@/tools"

/**
 * A quiet status line. The definition that comes back is long and the canvas
 * already draws it, so what matters here is only that the agent looked the
 * workflow up before changing it — and, when the id was wrong, that it didn't.
 */
export function GetWorkflowPart({ part }: { part: GetWorkflowToolPart }) {
  const id = part.input?.id
  const name = id ? <code className="font-mono">{id}</code> : "a workflow"

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return (
        <div className="flex items-center gap-2 px-1.5 text-sm text-muted-foreground">
          <FileSearchIcon className="size-4 shrink-0" />
          <span className="truncate">Reading {name}…</span>
        </div>
      )
    case "output-available":
      return part.output.found ? (
        <div className="flex items-center gap-2 px-1.5 text-sm text-muted-foreground">
          <FileSearchIcon className="size-4 shrink-0" />
          <span className="truncate">Read {name}</span>
        </div>
      ) : (
        <div className="flex items-start gap-2 px-1.5 text-sm text-muted-foreground">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>No saved workflow called {name}</span>
        </div>
      )
    case "output-error":
      return (
        <div className="px-1.5 text-sm text-destructive">
          Could not read the workflow: {part.errorText}
        </div>
      )
    default:
      return null
  }
}
