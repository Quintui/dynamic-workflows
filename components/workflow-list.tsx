"use client"

import * as React from "react"
import { Trash2Icon, WorkflowIcon } from "lucide-react"

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
  building: "animate-pulse bg-primary",
  ready: "bg-primary",
  invalid: "bg-destructive",
}

/**
 * Deleting throws away a saved definition, so the first click arms the button
 * and the second one does it. Moving away from the row disarms it again.
 */
function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [armed, setArmed] = React.useState(false)

  return (
    <Button
      type="button"
      size={armed ? "xs" : "icon-xs"}
      variant={armed ? "destructive" : "ghost"}
      aria-label={armed ? "Confirm delete" : "Delete workflow"}
      className={cn(
        "text-muted-foreground",
        // Out of the way until the row is hovered, but always reachable by
        // keyboard and always visible once armed.
        !armed &&
          "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
      )}
      onClick={() => {
        if (armed) {
          onDelete()
        } else {
          setArmed(true)
        }
      }}
      onBlur={() => setArmed(false)}
    >
      {armed ? "Delete?" : <Trash2Icon />}
    </Button>
  )
}

export function WorkflowList({
  workflows,
  selectedId,
  onSelect,
  onDelete,
  className,
}: {
  workflows: Workflow[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
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
                // The delete button sits over the row rather than inside it,
                // because the row itself is the button that selects it.
                <div key={workflow.id} className="group/row relative">
                  <Item
                    size="sm"
                    variant={workflow.id === selectedId ? "muted" : "default"}
                    className="cursor-pointer pr-10 text-left hover:bg-muted/50"
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
                        <span className="truncate">
                          {workflow.definition.id}
                        </span>
                      </ItemTitle>
                      <ItemDescription className="line-clamp-1 text-xs">
                        {WORKFLOW_STATUS_LABEL[workflow.status]} · {blocks}{" "}
                        {blocks === 1 ? "block" : "blocks"}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                  {workflow.saved && (
                    <div className="absolute top-1/2 right-2 -translate-y-1/2">
                      <DeleteButton onDelete={() => onDelete(workflow.id)} />
                    </div>
                  )}
                </div>
              )
            })}
          </ItemGroup>
        )}
      </PanelContent>
    </Panel>
  )
}
