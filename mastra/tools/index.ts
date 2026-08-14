import { createTool } from "@mastra/core/tools"
import { z } from "zod"

/**
 * The tool half of the support-triage building blocks. Every tenant workflow is
 * arranged out of these plus the agents in `mastra/agents/` — the palette is
 * fixed, only the arrangement changes.
 *
 * These are demo stubs. They return plausible, well-shaped data so a workflow
 * can be reasoned about and run end to end, but nothing leaves the process:
 * no CRM, no Slack, no ticket tracker.
 */

const CUSTOMERS = [
  {
    customerId: "CUST-1001",
    name: "Nordwind Logistik",
    planTier: "enterprise",
    accountAgeDays: 1412,
    preferredLanguage: "de",
  },
  {
    customerId: "CUST-1002",
    name: "Feather Studio",
    planTier: "free",
    accountAgeDays: 42,
    preferredLanguage: "en",
  },
  {
    customerId: "CUST-1003",
    name: "Boulangerie Lumière",
    planTier: "pro",
    accountAgeDays: 613,
    preferredLanguage: "fr",
  },
  {
    customerId: "CUST-1004",
    name: "Kite & Anchor Outfitters",
    planTier: "standard",
    accountAgeDays: 208,
    preferredLanguage: "en",
  },
] as const

const ENTITLEMENTS: Record<
  string,
  { channel: string; responseTargetHours: number }
> = {
  free: { channel: "self-serve", responseTargetHours: 72 },
  standard: { channel: "standard", responseTargetHours: 24 },
  pro: { channel: "priority", responseTargetHours: 4 },
  enterprise: { channel: "priority", responseTargetHours: 1 },
}

export const lookupCustomer = createTool({
  id: "lookup-customer",
  description:
    "Fetch a customer record: name, plan tier, account age and preferred language.",
  inputSchema: z.object({
    customerId: z.string().describe("The customer identifier, e.g. CUST-1001"),
  }),
  outputSchema: z.object({
    customerId: z.string(),
    name: z.string(),
    planTier: z.string(),
    accountAgeDays: z.number(),
    preferredLanguage: z.string(),
  }),
  execute: async ({ customerId }) => {
    const found = CUSTOMERS.find(
      (customer) => customer.customerId === customerId
    )

    // Unknown IDs fall back to a free-tier record rather than failing, so a
    // demo workflow always has something to branch on.
    return (
      found ?? {
        customerId,
        name: "Unknown customer",
        planTier: "free",
        accountAgeDays: 0,
        preferredLanguage: "en",
      }
    )
  },
})

export const checkEntitlement = createTool({
  id: "check-entitlement",
  description:
    "Determine which support channel a plan tier entitles the customer to.",
  inputSchema: z.object({
    planTier: z
      .string()
      .describe("The customer's plan tier: free, standard, pro or enterprise"),
  }),
  outputSchema: z.object({
    planTier: z.string(),
    channel: z
      .string()
      .describe("The entitled channel: self-serve, standard or priority"),
    responseTargetHours: z.number(),
  }),
  execute: async ({ planTier }) => {
    const entitlement = ENTITLEMENTS[planTier] ?? ENTITLEMENTS.free

    return { planTier, ...entitlement }
  },
})

export const notifyTeam = createTool({
  id: "notify-team",
  description: "Post an alert to the internal support channel.",
  inputSchema: z.object({
    message: z.string().describe("The alert text"),
    urgency: z.string().describe("The urgency level, e.g. low, normal, urgent"),
  }),
  outputSchema: z.object({
    delivered: z.boolean(),
    channel: z.string(),
    notifiedAt: z.string(),
  }),
  execute: async ({ urgency }) => ({
    delivered: true,
    channel: urgency === "urgent" ? "#support-escalations" : "#support",
    notifiedAt: new Date().toISOString(),
  }),
})

let ticketCounter = 4100

export const createTicket = createTool({
  id: "create-ticket",
  description:
    "File a ticket in the external tracker for follow-up or an audit trail.",
  inputSchema: z.object({
    subject: z.string().describe("Short summary of the issue"),
    description: z.string().optional().describe("Full ticket body"),
    category: z.string().optional(),
    urgency: z.string().optional(),
    customerId: z.string().optional(),
  }),
  outputSchema: z.object({
    ticketRef: z.string(),
    url: z.string(),
    status: z.string(),
  }),
  execute: async () => {
    const ticketRef = `SUP-${(ticketCounter += 1)}`

    return {
      ticketRef,
      url: `https://tracker.example.com/tickets/${ticketRef}`,
      status: "open",
    }
  },
})

export const routeToForum = createTool({
  id: "route-to-forum",
  description:
    "Redirect the customer to self-serve community resources instead of a written reply.",
  inputSchema: z.object({
    subject: z.string().describe("What the customer asked about"),
    category: z.string().optional(),
  }),
  outputSchema: z.object({
    // Named `text` to match what the reply agents return, so a conditional that
    // picks one branch or the other can read both with the same path.
    text: z.string(),
    url: z.string(),
  }),
  execute: async ({ subject, category }) => {
    const topic = category ?? "general"

    return {
      text: `Thanks for reaching out about “${subject}”. Free plans are supported by the community forum, where this topic is usually answered quickly.`,
      url: `https://community.example.com/c/${topic}`,
    }
  },
})

/** The tool palette, keyed by the `toolId` a workflow definition references. */
export const supportTools = {
  "lookup-customer": lookupCustomer,
  "check-entitlement": checkEntitlement,
  "notify-team": notifyTeam,
  "create-ticket": createTicket,
  "route-to-forum": routeToForum,
}
