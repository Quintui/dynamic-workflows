"use client"

import * as React from "react"
import {
  ArrowDownIcon,
  BotIcon,
  ClockIcon,
  GitBranchIcon,
  LayersIcon,
  RepeatIcon,
  ShuffleIcon,
  WorkflowIcon,
  WrenchIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  entryLabel,
  findStep,
  mappingKeys,
  STEP_RUNNING,
  type GraphEntries,
  type GraphEntry,
  type StepRun,
} from "@/lib/workflows"

/**
 * Draws a dynamic workflow graph. Entries run top to bottom; containers
 * (parallel, conditional, foreach, loop) nest their children inside a dashed
 * frame. Mapping and sleep entries are plumbing rather than work, so they render
 * as slim chips instead of full cards.
 *
 * Entries stream in partially, so everything here tolerates missing fields.
 *
 * During and after a run, `steps` carries what each block is doing — the blocks
 * that took part get an outline and their output as the events arrive, and the
 * ones a branch skipped stay plain.
 */

/** Run results keyed by step id, or nothing before the workflow has been run. */
type Steps = Record<string, StepRun> | undefined

const STEP_BORDER: Record<string, string> = {
  [STEP_RUNNING]: "border-primary/50",
  success: "border-primary/50",
  failed: "border-destructive/50",
  suspended: "border-primary/50",
}

const BLOCK_ICON = {
  agent: BotIcon,
  tool: WrenchIcon,
  workflow: WorkflowIcon,
} as const

const CONTAINER = {
  parallel: { icon: ShuffleIcon, label: "In parallel" },
  conditional: { icon: GitBranchIcon, label: "Branch" },
  foreach: { icon: LayersIcon, label: "For each item" },
  loop: { icon: RepeatIcon, label: "Repeat" },
} as const

type Operand = { path?: string; literal?: unknown }

interface Predicate {
  op?: string
  left?: Operand
  right?: Operand
  value?: Operand
  set?: unknown[]
  path?: string
  args?: Predicate[]
  arg?: Predicate
}

const COMPARISON: Record<string, string> = {
  eq: "=",
  ne: "≠",
  lt: "<",
  lte: "≤",
  gt: ">",
  gte: "≥",
}

function operandText(operand: Operand | undefined): string {
  if (!operand) {
    return "?"
  }

  if (operand.path) {
    // Only the last segment matters for a caption: inputData.channel → channel.
    return operand.path.split(".").at(-1) ?? operand.path
  }

  return JSON.stringify(operand.literal) ?? "?"
}

/** A short human caption for a predicate, for the branch labels. */
function predicateText(predicate: unknown): string {
  if (!predicate || typeof predicate !== "object") {
    return "always"
  }

  const { op, left, right, value, set, path, args, arg } =
    predicate as Predicate

  if (op && op in COMPARISON) {
    return `${operandText(left)} ${COMPARISON[op]} ${operandText(right)}`
  }

  switch (op) {
    case "in":
    case "notIn":
      return `${operandText(value)} ${op === "in" ? "in" : "not in"} ${JSON.stringify(set ?? [])}`
    case "exists":
    case "notExists":
      return `${path?.split(".").at(-1) ?? "value"} ${op === "exists" ? "is set" : "is missing"}`
    case "truthy":
    case "falsy":
      return `${operandText(value)} is ${op}`
    case "and":
    case "or":
      return (args ?? [])
        .map(predicateText)
        .join(op === "and" ? " and " : " or ")
    case "not":
      return `not ${predicateText(arg)}`
    default:
      return "always"
  }
}

function Connector() {
  return <div className="h-5 w-px shrink-0 bg-border" />
}

function Chip({
  icon: Icon,
  children,
}: {
  icon: typeof ClockIcon
  children: React.ReactNode
}) {
  return (
    <div className="flex w-full items-center gap-2 rounded-xl border border-dashed px-3 py-1.5 text-xs text-muted-foreground">
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  )
}

function BlockCard({ entry, steps }: { entry: GraphEntry; steps: Steps }) {
  const Icon = BLOCK_ICON[entry.type as keyof typeof BLOCK_ICON] ?? WrenchIcon
  const run = findStep(entry, steps)

  return (
    <div
      className={cn(
        "w-full rounded-2xl border bg-card px-4 py-3 shadow-xs",
        run && STEP_BORDER[run.status]
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
          <Icon className="size-3.5 text-muted-foreground" />
        </span>
        <span className="truncate text-sm font-medium">
          {entryLabel(entry)}
        </span>
        {run ? (
          <span
            className={cn(
              "ml-auto shrink-0 text-xs",
              run.status === STEP_RUNNING
                ? "animate-pulse text-muted-foreground"
                : run.status === "failed"
                  ? "text-destructive"
                  : "text-primary"
            )}
          >
            {run.status}
          </span>
        ) : (
          entry.id &&
          entry.id !== entryLabel(entry) && (
            <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
              {entry.id}
            </span>
          )
        )}
      </div>
      {entry.description && (
        <p className="mt-1.5 pl-8.5 text-sm text-muted-foreground">
          {entry.description}
        </p>
      )}
      {run?.error && (
        <p className="mt-1.5 pl-8.5 text-xs text-destructive">{run.error}</p>
      )}
      {run?.output !== undefined && (
        <details className="mt-1.5 pl-8.5">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Output
          </summary>
          <pre className="mt-1.5 overflow-x-auto rounded-xl bg-muted p-2.5 font-mono text-xs">
            {JSON.stringify(run.output, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

function Container({
  entry,
  kind,
  steps,
}: {
  entry: GraphEntry
  kind: keyof typeof CONTAINER
  steps: Steps
}) {
  const { icon: Icon, label } = CONTAINER[kind]
  const children = entry.steps ?? (entry.step ? [entry.step] : [])

  const heading =
    kind === "loop"
      ? `Repeat ${entry.loopType === "dowhile" ? "while" : "until"} ${predicateText(entry.predicate)}`
      : kind === "foreach" && entry.opts?.concurrency
        ? `${label} · ${entry.opts.concurrency} at a time`
        : label

  return (
    <div className="w-full rounded-2xl border border-dashed p-3">
      <div className="mb-2.5 flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{heading}</span>
      </div>
      <div className="flex flex-col gap-2">
        {children.map((child, index) =>
          child ? (
            <div key={child.id ?? index} className="flex flex-col gap-1.5">
              {kind === "conditional" && (
                <span className="px-1 font-mono text-xs text-muted-foreground">
                  if {predicateText(entry.predicates?.[index])}
                </span>
              )}
              <BlockCard entry={child} steps={steps} />
            </div>
          ) : null
        )}
      </div>
    </div>
  )
}

function Entry({ entry, steps }: { entry: GraphEntry; steps: Steps }) {
  switch (entry.type) {
    case "agent":
    case "tool":
    case "workflow":
      return <BlockCard entry={entry} steps={steps} />
    case "mapping": {
      const keys = mappingKeys(entry)

      return (
        <Chip icon={ArrowDownIcon}>
          {keys.length > 0 ? `map → ${keys.join(", ")}` : "map"}
        </Chip>
      )
    }
    case "sleep":
      return <Chip icon={ClockIcon}>wait {entry.duration ?? "?"}ms</Chip>
    case "sleepUntil":
      return <Chip icon={ClockIcon}>wait until {entry.date ?? "?"}</Chip>
    case "parallel":
    case "conditional":
    case "foreach":
    case "loop":
      return <Container entry={entry} kind={entry.type} steps={steps} />
    default:
      return null
  }
}

export function WorkflowGraph({
  graph,
  steps,
}: {
  graph: GraphEntries
  steps?: Record<string, StepRun>
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center">
      {graph.map((entry, index) =>
        entry ? (
          <React.Fragment key={entry.id ?? index}>
            {index > 0 && <Connector />}
            <Entry entry={entry} steps={steps} />
          </React.Fragment>
        ) : null
      )}
    </div>
  )
}
