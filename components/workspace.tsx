"use client"

import * as React from "react"

import { type ChatModel } from "@/lib/models"
import { WORKFLOWS } from "@/lib/workflows"
import { Chat } from "@/components/chat"
import {
  Panel,
  PanelContent,
  PanelHeader,
  PanelTitle,
} from "@/components/panel"
import { NewChatButton } from "@/components/new-chat-button"
import { WorkflowCanvas } from "@/components/workflow-canvas"
import { WorkflowList } from "@/components/workflow-list"

export function Workspace({ models }: { models: ChatModel[] }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const selected = WORKFLOWS.find((w) => w.id === selectedId) ?? null

  return (
    <div className="flex min-h-0 flex-1 gap-3 p-3">
      <WorkflowList
        workflows={WORKFLOWS}
        selectedId={selectedId}
        onSelect={setSelectedId}
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
