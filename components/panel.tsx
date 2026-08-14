import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The three surfaces of the workspace — workflow list, canvas and chat — are
 * all built from these, so they share one radius, border and header height.
 */
function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="panel"
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border bg-card",
        className
      )}
      {...props}
    />
  )
}

function PanelHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-header"
      className={cn(
        "flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4",
        className
      )}
      {...props}
    />
  )
}

function PanelTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="panel-title"
      className={cn("truncate text-sm font-medium", className)}
      {...props}
    />
  )
}

function PanelHint({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="panel-hint"
      className={cn("shrink-0 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function PanelContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-content"
      className={cn("flex min-h-0 flex-1 flex-col", className)}
      {...props}
    />
  )
}

export { Panel, PanelHeader, PanelTitle, PanelHint, PanelContent }
