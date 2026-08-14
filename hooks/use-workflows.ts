"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"

import { type CreateWorkflowToolPart } from "@/tools"
import { type Workflow } from "@/lib/workflows"
import { useSharedChat } from "@/components/chat-context"

function toWorkflow(part: CreateWorkflowToolPart): Workflow | null {
  const definition = part.input

  if (!definition?.id) {
    // The tool call hasn't streamed far enough to have an id yet.
    return null
  }

  const base = { key: part.toolCallId, id: definition.id, definition }

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

/**
 * Every workflow the agent has built in this conversation, oldest first. The
 * canvas and the workflow list both read from here, so they always show the
 * same thing as the chat.
 */
export function useWorkflows() {
  const { chat } = useSharedChat()
  const { messages } = useChat({ chat })

  return React.useMemo(() => {
    const workflows: Workflow[] = []

    for (const message of messages) {
      if (message.role !== "assistant") {
        continue
      }

      for (const part of message.parts) {
        if (part.type !== "tool-create_workflow") {
          continue
        }

        const workflow = toWorkflow(part)

        if (workflow) {
          workflows.push(workflow)
        }
      }
    }

    return workflows
  }, [messages])
}
