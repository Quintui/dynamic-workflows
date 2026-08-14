// OpenRouter model slugs. See https://openrouter.ai/models.
// The `openrouter/` prefix Mastra's model router needs is added in
// mastra/agents/chat-agent.ts.
export const MODELS = [
  { id: "anthropic/claude-sonnet-5", name: "Claude Sonnet 5" },
  { id: "openai/gpt-5.6-terra", name: "GPT 5.6 Terra" },
]

export const DEFAULT_MODEL = MODELS[0].id

export interface ChatModel {
  id: string
  name: string
}

export function isModelAllowed(id: string) {
  return MODELS.some((model) => model.id === id)
}
