"use client"

import * as React from "react"
import { SparklesIcon } from "lucide-react"

import { WORKFLOW_STATUS_LABEL, type Workflow } from "@/lib/workflows"
import {
  Panel,
  PanelContent,
  PanelHeader,
  PanelHint,
  PanelTitle,
} from "@/components/panel"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function WorkflowCanvas({
  workflow,
  className,
}: {
  workflow: Workflow | null
  className?: string
}) {
  return (
    <Panel className={className}>
      <PanelHeader>
        <PanelTitle>{workflow ? workflow.name : "Workflow"}</PanelTitle>
        <PanelHint>
          {workflow
            ? `${WORKFLOW_STATUS_LABEL[workflow.status]} · ${workflow.steps.length} steps`
            : "Nothing selected"}
        </PanelHint>
      </PanelHeader>
      <PanelContent className="canvas-grid overflow-y-auto">
        {workflow ? (
          <div className="flex justify-center px-6 py-10">
            <div className="flex w-full max-w-sm flex-col items-center">
              {workflow.steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  {index > 0 && <div className="h-6 w-px bg-border" />}
                  <div className="w-full rounded-2xl border bg-card px-4 py-3.5 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="truncate text-sm font-medium">
                        {step.name}
                      </span>
                    </div>
                    <p className="mt-1.5 pl-7.5 text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SparklesIcon />
              </EmptyMedia>
              <EmptyTitle>No workflow open</EmptyTitle>
              <EmptyDescription>
                Pick a workflow on the left, or describe one in the chat and it
                will be built here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </PanelContent>
    </Panel>
  )
}
