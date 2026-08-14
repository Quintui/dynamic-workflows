import { handleChatStream } from "@mastra/ai-sdk"
import { RequestContext } from "@mastra/core/request-context"
import { createUIMessageStreamResponse, type UIMessageChunk } from "ai"

import { DEFAULT_MODEL, isModelAllowed } from "@/lib/models"
import { mastra } from "@/mastra"
import { type ChatUIMessage } from "@/tools"

export const maxDuration = 30

// This endpoint is public and spends your OpenRouter credits on every request.
// Before exposing it to real traffic, add a rate limit (e.g. Vercel Firewall /
// WAF or @upstash/ratelimit), authentication, and an OpenRouter spend limit.
// See the README "Security" section.
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const { messages, model } = (body ?? {}) as {
    messages?: ChatUIMessage[]
    model?: unknown
  }

  const modelId = typeof model === "string" ? model : DEFAULT_MODEL

  if (!isModelAllowed(modelId)) {
    return Response.json(
      { error: `Model ${modelId} is not available.` },
      { status: 400 }
    )
  }

  if (!Array.isArray(messages)) {
    return Response.json({ error: "Invalid messages." }, { status: 400 })
  }

  // The agent reads this back to resolve the model for this request.
  const requestContext = new RequestContext()
  requestContext.set("model", modelId)

  // @mastra/ai-sdk still ships AI SDK v5/v6 types while this app is on `ai` v7.
  // The wire format matches; only the TypeScript types differ, so the messages
  // going in and the stream coming out are cast at this boundary. Drop the casts
  // once Mastra publishes v7 types.
  const stream = await handleChatStream({
    mastra,
    agentId: "chatAgent",
    params: {
      messages: messages as never,
      requestContext,
    },
    version: "v6",
    sendSources: true,
    onError: () => "Something went wrong. Please try again.",
  })

  return createUIMessageStreamResponse({
    stream: stream as unknown as ReadableStream<UIMessageChunk>,
  })
}
