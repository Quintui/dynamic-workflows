"use client"

import * as React from "react"
import {
  PlayIcon,
  PlusIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { useWorkflowRun } from "@/hooks/use-workflow-run"
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
import { WorkflowRunPanel } from "@/components/workflow-run-panel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

/**
 * One workflow, drawn and runnable. Mounted with the workflow id as its key, so
 * switching workflows starts from a clean run rather than showing the previous
 * one's step results against the new graph.
 */
function WorkflowView({
  workflow,
  onNew,
}: {
  workflow: Workflow
  onNew: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const { run, steps, error, running, start } = useWorkflowRun(workflow.id)

  const graph = workflow.definition.graph ?? []
  const blocks = countBlocks(graph)

  return (
    <>
      <PanelHeader>
        <PanelTitle>{workflow.definition.id}</PanelTitle>
        <div className="flex shrink-0 items-center gap-2">
          <PanelHint>
            {WORKFLOW_STATUS_LABEL[workflow.status]} · {blocks}{" "}
            {blocks === 1 ? "block" : "blocks"}
          </PanelHint>
          <Button size="xs" variant="ghost" onClick={onNew}>
            <PlusIcon />
            New workflow
          </Button>
          {workflow.saved && (
            <Button
              size="xs"
              variant={open ? "secondary" : "outline"}
              aria-expanded={open}
              onClick={() => setOpen((current) => !current)}
            >
              <PlayIcon />
              Run
            </Button>
          )}
        </div>
      </PanelHeader>
      <PanelContent className="canvas-grid overflow-y-auto">
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
          <WorkflowGraph graph={graph} steps={steps} />
        </div>
      </PanelContent>
      {open && (
        <WorkflowRunPanel
          workflow={workflow}
          run={run}
          steps={steps}
          error={error}
          running={running}
          onRun={start}
        />
      )}
    </>
  )
}

export function WorkflowCanvas({
  workflow,
  onNew,
  className,
}: {
  workflow: Workflow | null
  onNew: () => void
  className?: string
}) {
  return (
    <Panel className={className}>
      {workflow ? (
        <WorkflowView key={workflow.id} workflow={workflow} onNew={onNew} />
      ) : (
        <>
          <PanelHeader>
            <PanelTitle>Workflow</PanelTitle>
            <PanelHint>Nothing selected</PanelHint>
          </PanelHeader>
          <PanelContent className="canvas-grid overflow-y-auto">
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
          </PanelContent>
        </>
      )}
    </Panel>
  )
}
