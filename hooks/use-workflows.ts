"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"

import { type CreateWorkflowToolPart } from "@/tools"
import { type StoredWorkflow, type Workflow } from "@/lib/workflows"
import { useSharedChat } from "@/components/chat-context"

function toDraft(part: CreateWorkflowToolPart): Workflow | null {
  const definition = part.input

  if (!definition?.id) {
    // The tool call hasn't streamed far enough to have an id yet.
    return null
  }

  const base = { id: definition.id, definition, saved: false }

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return { ...base, status: "building" }
    case "output-available":
      return part.output.registered
        ? { ...base, status: "ready" }
        : { ...base, status: "invalid", issues: part.output.issues }
    case "output-error":
      return { ...base, status: "invalid", issues: part.errorText }
    default:
      return null
  }
}

/** Every `create_workflow` call in the conversation, oldest first. */
function useDrafts() {
  const { chat } = useSharedChat()
  const { messages } = useChat({ chat })

  return React.useMemo(() => {
    const drafts: Workflow[] = []

    for (const message of messages) {
      if (message.role !== "assistant") {
        continue
      }

      for (const part of message.parts) {
        if (part.type !== "tool-create_workflow") {
          continue
        }

        const draft = toDraft(part)

        if (draft) {
          drafts.push(draft)
        }
      }
    }

    return drafts
  }, [messages])
}

/** The saved workflows, refetched whenever the agent finishes saving one. */
function useSaved(savedCount: number) {
  const [saved, setSaved] = React.useState<StoredWorkflow[]>([])

  React.useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch("/api/workflows", {
          signal: controller.signal,
        })

        if (!response.ok) {
          return
        }

        const body = (await response.json()) as { workflows?: StoredWorkflow[] }

        setSaved(body.workflows ?? [])
      } catch {
        // An aborted or failed load just leaves the previous list in place.
      }
    }

    load()

    return () => controller.abort()
  }, [savedCount])

  return saved
}

/**
 * Every workflow the agent has built, oldest first — the saved ones from
 * storage plus whatever is still being written in the current conversation.
 * The canvas and the workflow list both read from here.
 *
 * Saved workflows survive a reload; a draft only wins over its saved row while
 * it's still streaming or after Mastra rejected it, because in both cases what
 * the canvas shows isn't what a run would execute.
 */
export function useWorkflows(): Workflow[] {
  const drafts = useDrafts()
  const savedCount = drafts.filter((draft) => draft.status === "ready").length
  const saved = useSaved(savedCount)

  return React.useMemo(() => {
    const workflows = new Map<string, Workflow>(
      saved.map((workflow) => [
        workflow.id,
        {
          id: workflow.id,
          definition: workflow,
          status: "ready" as const,
          saved: true,
        },
      ])
    )

    for (const draft of drafts) {
      if (draft.status === "ready" && workflows.has(draft.id)) {
        continue
      }

      workflows.set(draft.id, draft)
    }

    return [...workflows.values()]
  }, [drafts, saved])
}
