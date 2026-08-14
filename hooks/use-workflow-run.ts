"use client"

import * as React from "react"

import { type RunEvent, type StepRun, type WorkflowRun } from "@/lib/workflows"

/** Yields the response body one newline-delimited JSON line at a time. */
async function* readLines(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split("\n")
    // The last piece is whatever arrived before the next newline.
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      if (line.trim()) {
        yield line
      }
    }
  }

  buffer += decoder.decode()

  if (buffer.trim()) {
    yield buffer
  }
}

/**
 * Runs one saved workflow through `/api/workflows/[id]/run`, applying each
 * event as it arrives so the canvas shows blocks completing rather than
 * nothing until the run is over.
 *
 * `steps` is the live picture and is what the graph draws; `run` only appears
 * at the end. A workflow that fails mid-graph still produces a run — `error` is
 * for the request itself going wrong.
 */
export function useWorkflowRun(workflowId: string) {
  const [steps, setSteps] = React.useState<Record<string, StepRun>>({})
  const [run, setRun] = React.useState<WorkflowRun | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [running, setRunning] = React.useState(false)

  const start = React.useCallback(
    async (inputData: Record<string, unknown>) => {
      setRunning(true)
      setError(null)
      setRun(null)
      setSteps({})

      try {
        const response = await fetch(
          `/api/workflows/${encodeURIComponent(workflowId)}/run`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inputData }),
          }
        )

        if (!response.ok || !response.body) {
          const body = (await response.json().catch(() => null)) as {
            error?: string
          } | null

          setError(body?.error ?? "The run failed.")

          return
        }

        for await (const line of readLines(response.body)) {
          const event = JSON.parse(line) as RunEvent

          switch (event.type) {
            case "step":
              setSteps((current) => ({
                ...current,
                [event.stepId]: event.step,
              }))
              break
            case "finish":
              setRun(event.run)
              // The run carries per-step errors the mid-stream events don't.
              setSteps(event.run.steps)
              break
            case "error":
              setError(event.message)
              break
          }
        }
      } catch {
        setError("The run failed.")
      } finally {
        setRunning(false)
      }
    },
    [workflowId]
  )

  return { run, steps, error, running, start }
}
