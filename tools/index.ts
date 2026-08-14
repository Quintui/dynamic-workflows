import { type UIDataTypes, type UIMessage } from "ai"

/**
 * The agent (see `mastra/agents/chat-agent.ts`) defines no tools of its own. It
 * does get Mastra's built-in `skill`, `skill_read` and `skill_search` tools
 * because it has a skill attached; those calls have no part type here, so
 * `components/chat-message.tsx` skips them.
 *
 * The tool implementations that shipped with the template were removed, but the
 * UI part types below are kept on purpose: `components/parts/*` and
 * `components/chat-message.tsx` still render them, so they act as a working
 * reference for how tool calls should look once we add Mastra tools back.
 *
 * To bring one back: create the tool with `createTool` from `@mastra/core/tools`,
 * register it on the agent's `tools`, and keep the matching entry here so the
 * part component stays type-safe.
 */
export type ChatTools = {
  github_repo: {
    input: { repo: string }
    output:
      | { error: string }
      | {
          repo: string
          description: string
          stars: number
          forks: number
          openIssues: number
          language: string
          url: string
        }
  }
  ask_user: {
    input: { questions: { question: string; choices: string[] }[] }
    output: { question: string; answer: string }[]
  }
  web_search: {
    input: { query?: string }
    output: unknown
  }
}

export type ChatUIMessage = UIMessage<unknown, UIDataTypes, ChatTools>

export type ChatMessagePart = ChatUIMessage["parts"][number]

export type TextMessagePart = Extract<ChatMessagePart, { type: "text" }>

export type SourceUrlPart = Extract<ChatMessagePart, { type: "source-url" }>

export type GithubRepoToolPart = Extract<
  ChatMessagePart,
  { type: "tool-github_repo" }
>

export type AskUserToolPart = Extract<
  ChatMessagePart,
  { type: "tool-ask_user" }
>

export type WebSearchToolPart = Extract<
  ChatMessagePart,
  { type: "tool-web_search" }
>
