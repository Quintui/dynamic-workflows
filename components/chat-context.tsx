"use client"

import * as React from "react"
import { Chat } from "@ai-sdk/react"
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai"

import { type ChatUIMessage } from "@/tools"

/**
 * One `Chat` instance shared by the whole workspace. The chat panel renders the
 * conversation and the canvas reads the same messages to draw whatever workflow
 * the agent last built, so both stay in step without prop drilling.
 *
 * See https://ai-sdk.dev/cookbook/next/use-shared-chat-context.
 */

interface ChatContextValue {
  chat: Chat<ChatUIMessage>
  clearChat: () => void
}

const ChatContext = React.createContext<ChatContextValue | undefined>(undefined)

function createChat() {
  return new Chat<ChatUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    // Resume automatically once the user has answered a questionnaire.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  })
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chat, setChat] = React.useState(createChat)

  const clearChat = React.useCallback(() => setChat(createChat()), [])

  const value = React.useMemo(() => ({ chat, clearChat }), [chat, clearChat])

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useSharedChat() {
  const context = React.useContext(ChatContext)

  if (!context) {
    throw new Error("useSharedChat must be used within a ChatProvider.")
  }

  return context
}
