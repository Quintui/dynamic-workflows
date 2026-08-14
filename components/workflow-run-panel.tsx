"use client"

import * as React from "react"
import { PlayIcon, TriangleAlertIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  inputFields,
  type InputField,
  type Workflow,
  type WorkflowRun,
} from "@/lib/workflows"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

/**
 * The run drawer at the bottom of the canvas: a form built from the workflow's
 * input schema, then whatever the run returned. Per-step statuses go on the
 * graph itself rather than being repeated here.
 */

const RUN_STATUS_LABEL: Record<string, string> = {
  success: "Succeeded",
  failed: "Failed",
  suspended: "Suspended",
}

/** Empty strings mean "not filled in", so every field starts as one. */
function initialValues(fields: InputField[]) {
  return Object.fromEntries(
    fields.map((field) => [field.name, field.type === "boolean" ? "false" : ""])
  )
}

function Json({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-muted p-3 font-mono text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function Field({
  field,
  value,
  onChange,
}: {
  field: InputField
  value: string
  onChange: (value: string) => void
}) {
  const options = field.type === "boolean" ? ["true", "false"] : field.options

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium">
        {field.name}
        {!field.required && (
          <span className="ml-1.5 font-normal text-muted-foreground">
            optional
          </span>
        )}
      </span>
      {options ? (
        <Select
          items={options.map((option) => ({ label: option, value: option }))}
          value={value}
          onValueChange={(next) => {
            if (typeof next === "string") onChange(next)
          }}
        >
          <SelectTrigger className="w-full bg-input/50">
            <SelectValue placeholder="Choose" />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectGroup>
              {!field.required && field.type !== "boolean" && (
                <SelectItem value="">Leave unset</SelectItem>
              )}
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : field.type === "json" ? (
        <Textarea
          value={value}
          rows={3}
          placeholder="JSON"
          className="font-mono text-xs"
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          value={value}
          type={field.type === "number" ? "number" : "text"}
          placeholder={field.description}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  )
}

export function WorkflowRunPanel({
  workflow,
  run,
  error,
  running,
  onRun,
}: {
  workflow: Workflow
  run: WorkflowRun | null
  error: string | null
  running: boolean
  onRun: (inputData: Record<string, unknown>) => void
}) {
  const fields = React.useMemo(
    () => inputFields(workflow.definition.inputSchema),
    [workflow.definition.inputSchema]
  )
  const [values, setValues] = React.useState(() => initialValues(fields))
  const [formError, setFormError] = React.useState<string | null>(null)

  function submit(event: React.FormEvent) {
    event.preventDefault()

    const inputData: Record<string, unknown> = {}

    for (const field of fields) {
      const raw = (values[field.name] ?? "").trim()

      if (raw === "") {
        if (field.required) {
          setFormError(`${field.name} is required.`)

          return
        }

        continue
      }

      if (field.type === "number") {
        if (Number.isNaN(Number(raw))) {
          setFormError(`${field.name} must be a number.`)

          return
        }

        inputData[field.name] = Number(raw)
      } else if (field.type === "boolean") {
        inputData[field.name] = raw === "true"
      } else if (field.type === "json") {
        try {
          inputData[field.name] = JSON.parse(raw)
        } catch {
          setFormError(`${field.name} isn't valid JSON.`)

          return
        }
      } else {
        inputData[field.name] = raw
      }
    }

    setFormError(null)
    onRun(inputData)
  }

  return (
    <div className="flex max-h-72 shrink-0 flex-col gap-3 overflow-y-auto border-t bg-card p-4">
      <form onSubmit={submit} className="flex flex-col gap-3">
        {fields.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            This workflow takes no input.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <Field
                key={field.name}
                field={field}
                value={values[field.name] ?? ""}
                onChange={(next) =>
                  setValues((current) => ({ ...current, [field.name]: next }))
                }
              />
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={running}>
            {running ? <Spinner /> : <PlayIcon />}
            {running ? "Running" : "Run workflow"}
          </Button>
          {formError && (
            <span className="text-xs text-destructive">{formError}</span>
          )}
        </div>
      </form>

      {error && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>The run couldn&apos;t start</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {run && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                run.status === "success" ? "bg-primary" : "bg-destructive"
              )}
            />
            <span className="font-medium">
              {RUN_STATUS_LABEL[run.status] ?? run.status}
            </span>
            {run.runId && (
              <span className="truncate font-mono text-muted-foreground">
                {run.runId}
              </span>
            )}
          </div>
          {run.error && <p className="text-xs text-destructive">{run.error}</p>}
          {run.result !== undefined && <Json value={run.result} />}
        </div>
      )}
    </div>
  )
}
