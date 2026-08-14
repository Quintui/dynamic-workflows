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

// Placeholder data so the layout has something to render: the three tenants
// from the triage scenario, each arranging the same blocks differently. This
// gets replaced by the workflows the agent builds from the chat.
export const WORKFLOWS: Workflow[] = [
  {
    id: "tenant-a-triage",
    name: "Tenant A — startup",
    description: "Speed over process. No lookup, no entitlement check.",
    status: "ready",
    updatedAt: "2 minutes ago",
    steps: [
      {
        id: "classify",
        name: "Classify ticket",
        description: "Work out the category and how urgent it is.",
      },
      {
        id: "alert",
        name: "Notify team",
        description: "Only when the ticket comes back urgent.",
      },
      {
        id: "reply",
        name: "Draft reply",
        description: "Always, whatever the urgency.",
      },
    ],
  },
  {
    id: "tenant-b-triage",
    name: "Tenant B — enterprise SaaS",
    description: "Support level follows the plan the customer pays for.",
    status: "ready",
    updatedAt: "1 hour ago",
    steps: [
      {
        id: "customer",
        name: "Look up customer",
        description: "Fetch the plan tier and preferred language.",
      },
      {
        id: "entitlement",
        name: "Check entitlement",
        description: "Map the plan tier to a support channel.",
      },
      {
        id: "branch",
        name: "Branch on tier",
        description: "Paid tiers get a drafted reply, free tier the forum.",
      },
    ],
  },
  {
    id: "tenant-c-triage",
    name: "Tenant C — EU compliance",
    description: "Nothing is skipped and every ticket stays traceable.",
    status: "draft",
    updatedAt: "yesterday",
    steps: [
      {
        id: "classify",
        name: "Classify ticket",
        description: "Work out the category and how urgent it is.",
      },
      {
        id: "customer",
        name: "Look up customer",
        description: "Fetch the plan tier and preferred language.",
      },
      {
        id: "reply",
        name: "Draft reply",
        description: "Write the customer-facing response.",
      },
      {
        id: "translated",
        name: "Translate",
        description: "Into the customer's preferred language.",
      },
      {
        id: "audit",
        name: "Create ticket",
        description: "Always, for the audit trail.",
      },
    ],
  },
]
