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
  const [reloads, setReloads] = React.useState(0)

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
  }, [savedCount, reloads])

  const reload = React.useCallback(() => setReloads((n) => n + 1), [])

  return { saved, reload }
}

/**
 * Every workflow the agent has built, oldest first — the saved ones from
 * storage plus whatever is still being written in the current conversation —
 * and a way to delete one. The canvas and the workflow list both read from
 * here.
 *
 * Saved workflows survive a reload; a draft only wins over its saved row while
 * it's still streaming or after Mastra rejected it, because in both cases what
 * the canvas shows isn't what a run would execute.
 */
export function useWorkflows() {
  const drafts = useDrafts()
  const savedCount = drafts.filter((draft) => draft.status === "ready").length
  const { saved, reload } = useSaved(savedCount)
  // The conversation still holds the `create_workflow` call for a workflow that
  // has since been deleted, so deleted ids are held here to keep that draft
  // from putting the row back. An id the agent builds again comes back through
  // storage, which is what clears it.
  const [deleted, setDeleted] = React.useState<string[]>([])

  const remove = React.useCallback(
    async (id: string) => {
      setDeleted((current) => [...current, id])

      try {
        const response = await fetch(
          `/api/workflows/${encodeURIComponent(id)}`,
          { method: "DELETE" }
        )

        if (!response.ok) {
          // Put it back — it's still there.
          setDeleted((current) => current.filter((one) => one !== id))
        }
      } catch {
        setDeleted((current) => current.filter((one) => one !== id))
      } finally {
        reload()
      }
    },
    [reload]
  )

  const workflows = React.useMemo(() => {
    const savedIds = new Set(saved.map((workflow) => workflow.id))
    const gone = new Set(deleted.filter((id) => !savedIds.has(id)))

    const merged = new Map<string, Workflow>(
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
      if (gone.has(draft.id)) {
        continue
      }

      if (draft.status === "ready" && merged.has(draft.id)) {
        continue
      }

      merged.set(draft.id, draft)
    }

    return [...merged.values()]
  }, [drafts, saved, deleted])

  return { workflows, remove }
}
