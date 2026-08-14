"use client"

import { SparklesIcon, TriangleAlertIcon } from "lucide-react"

import {
  countBlocks,
  WORKFLOW_STATUS_LABEL,
  type Workflow,
} from "@/lib/workflows"
import {
  Panel,
  PanelContent,
  PanelHeader,
  PanelHint,
  PanelTitle,
} from "@/components/panel"
import { WorkflowGraph } from "@/components/workflow-graph"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  const graph = workflow?.definition.graph ?? []
  const blocks = countBlocks(graph)

  return (
    <Panel className={className}>
      <PanelHeader>
        <PanelTitle>
          {workflow ? workflow.definition.id : "Workflow"}
        </PanelTitle>
        <PanelHint>
          {workflow
            ? `${WORKFLOW_STATUS_LABEL[workflow.status]} · ${blocks} ${blocks === 1 ? "block" : "blocks"}`
            : "Nothing selected"}
        </PanelHint>
      </PanelHeader>
      <PanelContent className="canvas-grid overflow-y-auto">
        {workflow ? (
          <div className="flex flex-col items-center gap-4 px-6 py-10">
            {workflow.definition.description && (
              <p className="max-w-md text-center text-sm text-muted-foreground">
                {workflow.definition.description}
              </p>
            )}
            {workflow.issues && (
              <Alert variant="destructive" className="max-w-md">
                <TriangleAlertIcon />
                <AlertTitle>This definition didn&apos;t validate</AlertTitle>
                <AlertDescription>{workflow.issues}</AlertDescription>
              </Alert>
            )}
            <WorkflowGraph graph={graph} />
          </div>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SparklesIcon />
              </EmptyMedia>
              <EmptyTitle>No workflow open</EmptyTitle>
              <EmptyDescription>
                Describe how a tenant handles incoming tickets in the chat and
                the workflow gets built here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </PanelContent>
    </Panel>
  )
}
