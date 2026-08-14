"use client"

import * as React from "react"

import { useWorkflows } from "@/hooks/use-workflows"
import { type ChatModel } from "@/lib/models"
import { Chat } from "@/components/chat"
import { ChatProvider } from "@/components/chat-context"
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
  const [pinnedId, setPinnedId] = React.useState<string | null>(null)

  // Follow the newest workflow unless the user has picked one from the list.
  const pinned = workflows.find((workflow) => workflow.id === pinnedId)
  const selected = pinned ?? workflows.at(-1) ?? null

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
      <WorkflowCanvas workflow={selected} className="hidden flex-1 md:flex" />
      <Panel className="w-full shrink-0 md:w-96">
        <PanelHeader>
          <PanelTitle>Chat</PanelTitle>
          <NewChatButton />
        </PanelHeader>
        <PanelContent>
          <Chat models={models} />
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
