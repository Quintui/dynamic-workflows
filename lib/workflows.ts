export type WorkflowStatus = "draft" | "running" | "ready"

export interface WorkflowStep {
  id: string
  name: string
  description: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  status: WorkflowStatus
  updatedAt: string
  steps: WorkflowStep[]
}

export const WORKFLOW_STATUS_LABEL: Record<WorkflowStatus, string> = {
  draft: "Draft",
  running: "Running",
  ready: "Ready",
}

// Placeholder data so the layout has something to render. This gets replaced by
// the workflows the agent builds from the chat.
export const WORKFLOWS: Workflow[] = [
  {
    id: "onboard-customer",
    name: "Onboard a customer",
    description: "Collect details, create the account, send a welcome email.",
    status: "ready",
    updatedAt: "2 minutes ago",
    steps: [
      {
        id: "collect",
        name: "Collect details",
        description: "Ask for company name, seat count and billing contact.",
      },
      {
        id: "create",
        name: "Create the account",
        description: "Provision the workspace and invite the billing contact.",
      },
      {
        id: "welcome",
        name: "Send the welcome email",
        description: "Share the getting-started guide and support channel.",
      },
    ],
  },
  {
    id: "weekly-digest",
    name: "Weekly digest",
    description: "Summarise the week and post it to the team channel.",
    status: "running",
    updatedAt: "1 hour ago",
    steps: [
      {
        id: "gather",
        name: "Gather the week",
        description: "Pull merged work, incidents and open questions.",
      },
      {
        id: "summarise",
        name: "Summarise",
        description: "Write a short digest grouped by theme.",
      },
      {
        id: "post",
        name: "Post it",
        description: "Send the digest to the team channel every Friday.",
      },
    ],
  },
  {
    id: "triage-bug",
    name: "Triage a bug report",
    description: "Reproduce, label and route the report to an owner.",
    status: "draft",
    updatedAt: "yesterday",
    steps: [
      {
        id: "reproduce",
        name: "Reproduce",
        description: "Follow the reported steps and record the result.",
      },
      {
        id: "route",
        name: "Route to an owner",
        description: "Label by area and assign the on-call engineer.",
      },
    ],
  },
]
