"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { type ChatModel } from "@/lib/models"
import { ChatMessage } from "@/components/chat-message"
import { useSharedChat } from "@/components/chat-context"
import { PromptForm } from "@/components/prompt-form"
import { QuestionCard } from "@/components/question-card"
import { Suggestions } from "@/components/suggestions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

export function Chat({
  models,
  openWorkflowId,
}: {
  models: ChatModel[]
  /** What the canvas is showing, so the agent can change it. May be null. */
  openWorkflowId: string | null
}) {
  const [model, setModel] = React.useState(models[0]?.id ?? "")

  // The canvas reads the same instance, so a workflow the agent builds shows up
  // there as it streams. See components/chat-context.tsx.
  const { chat } = useSharedChat()

  const { messages, sendMessage, status, stop, error, addToolOutput } = useChat(
    { chat }
  )

  const resolvedModel = models.some((m) => m.id === model)
    ? model
    : (models[0]?.id ?? "")

  const isBusy = status === "submitted" || status === "streaming"

  // Goes with every request: the model to run it on, and the workflow on the
  // canvas. See app/api/chat/route.ts.
  const body = { model: resolvedModel, workflowId: openWorkflowId }

  const lastMessage = messages.at(-1)
  const pendingQuestion =
    lastMessage?.role === "assistant"
      ? lastMessage.parts.find(
          (part): part is Extract<typeof part, { type: "tool-ask_user" }> =>
            part.type === "tool-ask_user" &&
            (part.state === "input-streaming" ||
              part.state === "input-available")
        )
      : undefined

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-2">
          <Empty className="p-6">
            <EmptyHeader>
              <EmptyTitle>How should tickets be triaged?</EmptyTitle>
              <EmptyDescription>
                Describe how a tenant handles incoming support tickets and the
                workflow gets built from the shared blocks.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Suggestions
                onSelect={(prompt) => sendMessage({ text: prompt }, { body })}
              />
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <MessageScrollerProvider>
          <MessageScroller className="flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent className="flex w-full flex-col gap-6 px-4 py-4">
                {messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={message.role === "user"}
                  >
                    <ChatMessage
                      message={message}
                      isStreaming={isBusy && message.id === lastMessage?.id}
                    />
                  </MessageScrollerItem>
                ))}
                {status === "submitted" && (
                  <MessageScrollerItem messageId="thinking">
                    <div className="flex shimmer items-center gap-2 px-3 text-sm text-muted-foreground">
                      Thinking…
                    </div>
                  </MessageScrollerItem>
                )}
              </MessageScrollerContent>
              {pendingQuestion && (
                <QuestionCard
                  part={pendingQuestion}
                  onAnswer={(toolCallId, answer) =>
                    addToolOutput({
                      tool: "ask_user",
                      toolCallId,
                      output: answer,
                      options: { body },
                    })
                  }
                />
              )}
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      )}

      <div className="flex w-full flex-col gap-2 px-4 pb-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Request failed</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        <PromptForm
          models={models}
          model={resolvedModel}
          onModelChange={setModel}
          isBusy={isBusy}
          onSubmit={(text) => sendMessage({ text }, { body })}
          onStop={() => stop()}
        />
      </div>
    </div>
  )
}
