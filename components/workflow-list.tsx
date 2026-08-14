"use client"

import { PlusIcon, WorkflowIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  WORKFLOW_STATUS_LABEL,
  type Workflow,
  type WorkflowStatus,
} from "@/lib/workflows"
import {
  Panel,
  PanelContent,
  PanelHeader,
  PanelTitle,
} from "@/components/panel"
import { Button } from "@/components/ui/button"
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
  draft: "bg-muted-foreground/40",
  running: "animate-pulse bg-primary",
  ready: "bg-primary",
}

export function WorkflowList({
  workflows,
  selectedId,
  onSelect,
  className,
}: {
  workflows: Workflow[]
  selectedId: string | null
  onSelect: (id: string) => void
  className?: string
}) {
  return (
    <Panel className={className}>
      <PanelHeader>
        <PanelTitle>Workflows</PanelTitle>
        <Button variant="ghost" size="icon-sm" aria-label="New workflow">
          <PlusIcon />
        </Button>
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
                Describe one in the chat and it will show up here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup className="gap-1">
            {workflows.map((workflow) => (
              <Item
                key={workflow.id}
                size="sm"
                variant={workflow.id === selectedId ? "muted" : "default"}
                className="cursor-pointer text-left hover:bg-muted/50"
                render={
                  <button
                    type="button"
                    aria-current={workflow.id === selectedId}
                    onClick={() => onSelect(workflow.id)}
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
                    <span className="truncate">{workflow.name}</span>
                  </ItemTitle>
                  <ItemDescription className="line-clamp-1 text-xs">
                    {WORKFLOW_STATUS_LABEL[workflow.status]} ·{" "}
                    {workflow.updatedAt}
                  </ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        )}
      </PanelContent>
    </Panel>
  )
}
