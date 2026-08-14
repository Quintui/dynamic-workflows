"use client"

import { WorkflowIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  countBlocks,
  WORKFLOW_STATUS_LABEL,
  type Workflow,
  type WorkflowStatus,
} from "@/lib/workflows"
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
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"

const statusDot: Record<WorkflowStatus, string> = {
  building: "animate-pulse bg-primary",
  ready: "bg-primary",
  invalid: "bg-destructive",
}

export function WorkflowList({
  workflows,
  selectedKey,
  onSelect,
  className,
}: {
  workflows: Workflow[]
  selectedKey: string | null
  onSelect: (key: string) => void
  className?: string
}) {
  return (
    <Panel className={className}>
      <PanelHeader>
        <PanelTitle>Workflows</PanelTitle>
        <PanelHint>{workflows.length || ""}</PanelHint>
      </PanelHeader>
      <PanelContent className="overflow-y-auto p-2">
        {workflows.length === 0 ? (
          <Empty className="p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <WorkflowIcon />
              </EmptyMedia>
              <EmptyTitle>No workflows yet</EmptyTitle>
              <EmptyDescription>
                Describe how a tenant triages tickets in the chat and the
                workflow shows up here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup className="gap-1">
            {workflows.map((workflow) => {
              const blocks = countBlocks(workflow.definition.graph)

              return (
                <Item
                  key={workflow.key}
                  size="sm"
                  variant={workflow.key === selectedKey ? "muted" : "default"}
                  className="cursor-pointer text-left hover:bg-muted/50"
                  render={
                    <button
                      type="button"
                      aria-current={workflow.key === selectedKey}
                      onClick={() => onSelect(workflow.key)}
                    />
                  }
                >
                  <ItemContent>
                    <ItemTitle className="max-w-full">
                      <span
                        aria-hidden
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          statusDot[workflow.status]
                        )}
                      />
                      <span className="truncate">{workflow.definition.id}</span>
                    </ItemTitle>
                    <ItemDescription className="line-clamp-1 text-xs">
                      {WORKFLOW_STATUS_LABEL[workflow.status]} · {blocks}{" "}
                      {blocks === 1 ? "block" : "blocks"}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              )
            })}
          </ItemGroup>
        )}
      </PanelContent>
    </Panel>
  )
}
