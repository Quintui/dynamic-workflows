import { type UIDataTypes, type UIMessage } from "ai"

import { type WorkflowDefinition } from "@/lib/workflows"

/**
 * The chat agent (see `mastra/agents/chat-agent.ts`) has exactly one tool of its
 * own, `create_workflow`. It also gets Mastra's built-in `skill`, `skill_read`
 * and `skill_search` because it has a skill attached; those all return a plain
 * string. The triage blocks in `mastra/tools/index.ts` are deliberately absent:
 * the agent writes workflows that reference them, it never calls them.
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
  /**
   * The chat agent hands a finished workflow definition to this tool. The
   * canvas renders the call's input, so the part below is the workflow.
   */
  create_workflow: {
    input: WorkflowDefinition
    output: {
      registered: boolean
      workflowId: string
      stepCount: number
      issues?: string
    }
  }
  /**
   * Reads a saved definition back, which is how the agent changes a workflow
   * whose definition isn't in the conversation.
   */
  get_workflow: {
    input: { id: string }
    output: {
      found: boolean
      definition?: WorkflowDefinition
      available?: string[]
    }
  }
  /** Loads a skill's full instructions. Provided by Mastra. */
  skill: {
    input: { name: string }
    output: string
  }
  /** Reads one file from a skill directory. Provided by Mastra. */
  skill_read: {
    input: {
      skillName: string
      path: string
      startLine?: number
      endLine?: number
    }
    output: string
  }
  /** Searches across skill content. Provided by Mastra. */
  skill_search: {
    input: { query: string; skillNames?: string[]; topK?: number }
    output: string
  }
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

export type CreateWorkflowToolPart = Extract<
  ChatMessagePart,
  { type: "tool-create_workflow" }
>

export type GetWorkflowToolPart = Extract<
  ChatMessagePart,
  { type: "tool-get_workflow" }
>

export type SkillToolPart = Extract<ChatMessagePart, { type: "tool-skill" }>

export type SkillReadToolPart = Extract<
  ChatMessagePart,
  { type: "tool-skill_read" }
>

export type SkillSearchToolPart = Extract<
  ChatMessagePart,
  { type: "tool-skill_search" }
>
