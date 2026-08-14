"use client"

import { useChat } from "@ai-sdk/react"
import { PlusIcon } from "lucide-react"

import { useSharedChat } from "@/components/chat-context"
import { Button } from "@/components/ui/button"

export function NewChatButton() {
  const { chat, clearChat } = useSharedChat()
  const { messages } = useChat({ chat })

  return (
    <Button
      variant="secondary"
      onClick={clearChat}
      disabled={messages.length === 0}
    >
      <PlusIcon data-icon="inline-start" />
      New Chat
    </Button>
  )
}
