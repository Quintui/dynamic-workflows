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

  const { messages, model, workflowId } = (body ?? {}) as {
    messages?: ChatUIMessage[]
    model?: unknown
    workflowId?: unknown
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

  // Which workflow the canvas is showing, so "change this one" has a referent
  // even in a conversation that didn't build it. It goes into the system prompt
  // verbatim, so anything that isn't shaped like an id is dropped rather than
  // trusted; a stale or unknown id just means `get_workflow` finds nothing.
  if (typeof workflowId === "string" && /^[\w.-]{1,100}$/.test(workflowId)) {
    requestContext.set("openWorkflowId", workflowId)
  }

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
