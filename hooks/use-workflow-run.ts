"use client"

import * as React from "react"

import { type WorkflowRun } from "@/lib/workflows"

/**
 * Runs one saved workflow through `/api/workflows/[id]/run`. A workflow that
 * fails mid-graph still comes back as a run — `error` is for the request
 * itself going wrong.
 */
export function useWorkflowRun(workflowId: string) {
  const [run, setRun] = React.useState<WorkflowRun | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [running, setRunning] = React.useState(false)

  const start = React.useCallback(
    async (inputData: Record<string, unknown>) => {
      setRunning(true)
      setError(null)
      setRun(null)

      try {
        const response = await fetch(
          `/api/workflows/${encodeURIComponent(workflowId)}/run`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inputData }),
          }
        )

        const body = (await response.json()) as WorkflowRun & { error?: string }

        if (!response.ok) {
          setError(body.error ?? "The run failed.")

          return
        }

        setRun(body)
      } catch {
        setError("The run failed.")
      } finally {
        setRunning(false)
      }
    },
    [workflowId]
  )

  return { run, error, running, start }
}
