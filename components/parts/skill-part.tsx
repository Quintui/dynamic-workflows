import { BookOpenIcon, FileTextIcon, SearchIcon } from "lucide-react"

import {
  type SkillReadToolPart,
  type SkillSearchToolPart,
  type SkillToolPart,
} from "@/tools"

/**
 * The `skill`, `skill_read` and `skill_search` tools come from Mastra, not from
 * `tools/`. They are how the agent pulls in its skill instructions on demand,
 * so they render as quiet status lines rather than results — what matters is
 * that the agent consulted the skill, not what came back.
 */
function SkillStatus({
  icon: Icon,
  children,
}: {
  icon: typeof BookOpenIcon
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 px-1.5 text-sm text-muted-foreground">
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  )
}

function SkillError({ children }: { children: React.ReactNode }) {
  return <div className="px-1.5 text-sm text-destructive">{children}</div>
}

export function SkillPart({ part }: { part: SkillToolPart }) {
  const name = part.input?.name

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return (
        <SkillStatus icon={BookOpenIcon}>
          Reading the {name ?? "relevant"} skill…
        </SkillStatus>
      )
    case "output-available":
      return (
        <SkillStatus icon={BookOpenIcon}>
          {name ? `Used the ${name} skill` : "Used a skill"}
        </SkillStatus>
      )
    case "output-error":
      return <SkillError>Could not load the skill: {part.errorText}</SkillError>
    default:
      return null
  }
}

export function SkillReadPart({ part }: { part: SkillReadToolPart }) {
  const path = part.input?.path

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return (
        <SkillStatus icon={FileTextIcon}>
          Reading {path ? <code className="font-mono">{path}</code> : "a page"}…
        </SkillStatus>
      )
    case "output-available":
      return (
        <SkillStatus icon={FileTextIcon}>
          Read {path ? <code className="font-mono">{path}</code> : "a page"}
        </SkillStatus>
      )
    case "output-error":
      return (
        <SkillError>
          Could not read {path}: {part.errorText}
        </SkillError>
      )
    default:
      return null
  }
}

export function SkillSearchPart({ part }: { part: SkillSearchToolPart }) {
  const query = part.input?.query ? ` for “${part.input.query}”` : ""

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return (
        <SkillStatus icon={SearchIcon}>Searching skills{query}…</SkillStatus>
      )
    case "output-available":
      return <SkillStatus icon={SearchIcon}>Searched skills{query}</SkillStatus>
    case "output-error":
      return <SkillError>Skill search failed: {part.errorText}</SkillError>
    default:
      return null
  }
}
