"use client"

import * as React from "react"

import { useWorkflows } from "@/hooks/use-workflows"
import { type ChatModel } from "@/lib/models"
import { Chat } from "@/components/chat"
import { ChatProvider, useSharedChat } from "@/components/chat-context"
import { NewChatButton } from "@/components/new-chat-button"
import {
  Panel,
  PanelContent,
  PanelHeader,
  PanelTitle,
} from "@/components/panel"
import { WorkflowCanvas } from "@/components/workflow-canvas"
import { WorkflowList } from "@/components/workflow-list"

/**
 * The three panes read from one shared chat, so the canvas and the list show
 * whatever the agent has built without any state of their own.
 */
function WorkspacePanes({ models }: { models: ChatModel[] }) {
  const { workflows, remove } = useWorkflows()
  const { clearChat } = useSharedChat()
  const [pinnedId, setPinnedId] = React.useState<string | null>(null)
  // Ids the canvas is looking past. "New workflow" parks everything that
  // already exists here, so the canvas clears and then follows whatever the
  // agent builds next instead of snapping straight back to the old one.
  const [skipped, setSkipped] = React.useState<string[]>([])

  // Follow the newest workflow unless the user has picked one from the list.
  const pinned = workflows.find((workflow) => workflow.id === pinnedId)
  const newest = workflows.findLast(
    (workflow) => !skipped.includes(workflow.id)
  )
  const selected = pinned ?? newest ?? null

  return (
    <div className="flex min-h-0 flex-1 gap-3 p-3">
      <WorkflowList
        workflows={workflows}
        selectedId={selected?.id ?? null}
        onSelect={setPinnedId}
        onDelete={(id) => {
          // Deleting the pinned workflow drops back to following the newest.
          setPinnedId((current) => (current === id ? null : current))
          remove(id)
        }}
        className="hidden w-64 shrink-0 lg:flex"
      />
      <WorkflowCanvas
        workflow={selected}
        onNew={() => {
          // Start over on both sides: an empty canvas and a fresh conversation,
          // so the agent isn't carrying the last workflow into the next one.
          setPinnedId(null)
          setSkipped(workflows.map((workflow) => workflow.id))
          clearChat()
        }}
        className="hidden flex-1 md:flex"
      />
      <Panel className="w-full shrink-0 md:w-96">
        <PanelHeader>
          <PanelTitle>Chat</PanelTitle>
          <NewChatButton />
        </PanelHeader>
        <PanelContent>
          <Chat models={models} openWorkflowId={selected?.id ?? null} />
        </PanelContent>
      </Panel>
    </div>
  )
}

export function Workspace({ models }: { models: ChatModel[] }) {
  return (
    <ChatProvider>
      <WorkspacePanes models={models} />
    </ChatProvider>
  )
}
