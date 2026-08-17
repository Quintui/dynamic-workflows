import { createStep, createWorkflow } from "@mastra/core/workflows"
import { z } from "zod"

import { classifyTicketAgent } from "../agents/classify-ticket"
import { draftReplyAgent } from "../agents/draft-reply"
import { translateAgent } from "../agents/translate"
import {
  checkEntitlement,
  createTicket,
  lookupCustomer,
  notifyTeam,
} from "../tools"

/**
 * Full ticket triage, written by hand — the counterpart to the workflows the
 * chat agent authors as JSON at run time.
 *
 * It arranges the same eight blocks, but through the `createWorkflow` builder
 * instead of a graph a model emits: `.then` for sequence, `.parallel` for the
 * two lookups that don't depend on each other, `.branch` for the urgent path,
 * `.map` to reshape between steps, and plain `createStep` functions wherever
 * the work is ordinary TypeScript.
 *
 * Registered in `mastra/index.ts` under `workflows`, so its origin is `code`,
 * not `dynamic`: it never lands in the `workflowDefinitions` table, it isn't in
 * the workflow list, and deleting `mastra.db` has no effect on it. Run it with
 * `mastra.getWorkflow("reference-triage").createRun()`.
 */

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

const CATEGORIES = [
  "billing",
  "technical",
  "account",
  "feedback",
  "other",
] as const

const URGENCIES = ["low", "normal", "urgent"] as const

/** The ticket once it's been normalized — what both parallel branches see. */
const ticketContext = z.object({
  ticketId: z.string(),
  customerId: z.string(),
  subject: z.string(),
  ticketText: z.string(),
  prompt: z.string(),
  receivedAt: z.string(),
})

const classification = z.object({
  category: z.enum(CATEGORIES),
  urgency: z.enum(URGENCIES),
})

/** What `lookup-customer` returns. */
const customerRecord = z.object({
  customerId: z.string(),
  name: z.string(),
  planTier: z.string(),
  accountAgeDays: z.number(),
  preferredLanguage: z.string(),
})

/** What `notify-team` returns, so the skip branch can stand in for it. */
const alertOutcome = z.object({
  delivered: z.boolean(),
  channel: z.string(),
  notifiedAt: z.string(),
})

// ---------------------------------------------------------------------------
// The blocks, wrapped as steps
// ---------------------------------------------------------------------------

const lookupStep = createStep(lookupCustomer)
const entitlementStep = createStep(checkEntitlement)
const draftStep = createStep(draftReplyAgent)
const translateStep = createStep(translateAgent)
const alertStep = createStep(notifyTeam)
const fileStep = createStep(createTicket)

/**
 * The classifier is an agent, so it answers in prose unless it's pinned to a
 * schema. `structuredOutput` is what turns it into two enum fields.
 */
const classifyStep = createStep(classifyTicketAgent, {
  structuredOutput: { schema: classification },
})

// ---------------------------------------------------------------------------
// The steps that are just code
// ---------------------------------------------------------------------------

/**
 * Fans the raw ticket out into every field the next two steps need at once:
 * `customerId` for the lookup tool, `prompt` for the classifier agent. Parallel
 * branches all receive the same input, so one output has to carry both.
 */
const normalizeTicket = createStep({
  id: "normalize-ticket",
  inputSchema: z.object({
    ticketId: z.string(),
    customerId: z.string(),
    subject: z.string(),
    body: z.string(),
  }),
  outputSchema: ticketContext,
  execute: async ({ inputData }) => {
    const ticketText = `${inputData.subject}\n\n${inputData.body}`.trim()

    return {
      ticketId: inputData.ticketId,
      customerId: inputData.customerId,
      subject: inputData.subject,
      ticketText,
      prompt: `Classify this support ticket.\n\n${ticketText}`,
      receivedAt: new Date().toISOString(),
    }
  },
})

const composeReplyPrompt = createStep({
  id: "compose-reply-prompt",
  inputSchema: z.object({
    subject: z.string(),
    ticketText: z.string(),
    customerName: z.string(),
    planTier: z.string(),
    preferredLanguage: z.string(),
    category: z.string(),
    urgency: z.string(),
    channel: z.string(),
    responseTargetHours: z.number(),
  }),
  outputSchema: z.object({ prompt: z.string() }),
  execute: async ({ inputData }) => ({
    prompt: [
      `Write a reply to this ${inputData.category} ticket from ${inputData.customerName}.`,
      `Urgency: ${inputData.urgency}. Support channel: ${inputData.channel}, response target ${inputData.responseTargetHours}h.`,
      `Ticket:\n${inputData.ticketText}`,
    ].join("\n\n"),
  }),
})

const composeTranslatePrompt = createStep({
  id: "compose-translate-prompt",
  inputSchema: z.object({ text: z.string(), preferredLanguage: z.string() }),
  outputSchema: z.object({ prompt: z.string() }),
  execute: async ({ inputData }) => ({
    prompt: `Translate this support reply into ${inputData.preferredLanguage}.\n\n${inputData.text}`,
  }),
})

/** The other side of the branch: no alert, same shape so both sides merge. */
const skipAlert = createStep({
  id: "skip-alert",
  inputSchema: z.object({ message: z.string(), urgency: z.string() }),
  outputSchema: alertOutcome,
  execute: async () => ({
    delivered: false,
    channel: "none",
    notifiedAt: new Date().toISOString(),
  }),
})

/**
 * A branch reports under the id of whichever step ran, so exactly one of these
 * two keys is present. This is where the two paths become one shape again.
 */
const resolveAlert = createStep({
  id: "resolve-alert",
  inputSchema: z.object({
    "notify-team": alertOutcome.optional(),
    "skip-alert": alertOutcome.optional(),
  }),
  outputSchema: alertOutcome,
  execute: async ({ inputData }) =>
    inputData["notify-team"] ??
    inputData["skip-alert"] ?? {
      delivered: false,
      channel: "none",
      notifiedAt: new Date().toISOString(),
    },
})

// ---------------------------------------------------------------------------
// The two parallel branches
// ---------------------------------------------------------------------------

/**
 * `.parallel` requires every branch to accept the previous step's output
 * exactly — unlike `.then`, which lets a step declare a narrower input. So each
 * branch is a small nested workflow that takes the whole ticket context and
 * narrows it for the block inside.
 */
const lookupBranch = createWorkflow({
  id: "lookup-branch",
  inputSchema: ticketContext,
  outputSchema: customerRecord,
})
  .map(async ({ inputData }) => ({ customerId: inputData.customerId }))
  .then(lookupStep)
  .commit()

const classifyBranch = createWorkflow({
  id: "classify-branch",
  inputSchema: ticketContext,
  outputSchema: classification,
})
  .map(async ({ inputData }) => ({ prompt: inputData.prompt }))
  .then(classifyStep)
  .commit()

// ---------------------------------------------------------------------------
// The workflow
// ---------------------------------------------------------------------------

export const referenceTriage = createWorkflow({
  id: "reference-triage",
  description:
    "Hand-written reference implementation of full ticket triage: classify, look the customer up, check entitlement, draft a reply, translate it, alert on urgent, and file for the audit trail.",
  inputSchema: z.object({
    ticketId: z.string(),
    customerId: z.string(),
    subject: z.string(),
    body: z.string(),
  }),
  outputSchema: z.object({
    ticketRef: z.string(),
    ticketUrl: z.string(),
    channel: z.string(),
    category: z.string(),
    urgency: z.string(),
    alerted: z.boolean(),
    alertChannel: z.string(),
    reply: z.string(),
  }),
})
  // 1. Shape the raw ticket into what the next two steps each need.
  .then(normalizeTicket)
  // 2. The customer record and the classification don't depend on each other.
  .parallel([lookupBranch, classifyBranch])
  // 3. Entitlement only needs the plan tier.
  .map({ planTier: { step: lookupBranch, path: "planTier" } })
  .then(entitlementStep)
  // 4. Gather the reply context back out of the steps that produced it.
  .map({
    subject: { step: normalizeTicket, path: "subject" },
    ticketText: { step: normalizeTicket, path: "ticketText" },
    customerName: { step: lookupBranch, path: "name" },
    planTier: { step: lookupBranch, path: "planTier" },
    preferredLanguage: { step: lookupBranch, path: "preferredLanguage" },
    category: { step: classifyBranch, path: "category" },
    urgency: { step: classifyBranch, path: "urgency" },
    channel: { step: entitlementStep, path: "channel" },
    responseTargetHours: { step: entitlementStep, path: "responseTargetHours" },
  })
  .then(composeReplyPrompt)
  .then(draftStep)
  // 5. Translate the draft into the customer's language.
  .map({
    text: { step: draftStep, path: "text" },
    preferredLanguage: { step: lookupBranch, path: "preferredLanguage" },
  })
  .then(composeTranslatePrompt)
  .then(translateStep)
  // 6. Alert the team, but only when the classifier said urgent.
  .map({
    message: { step: normalizeTicket, path: "subject" },
    urgency: { step: classifyBranch, path: "urgency" },
  })
  .branch([
    [async ({ inputData }) => inputData.urgency === "urgent", alertStep],
    [async ({ inputData }) => inputData.urgency !== "urgent", skipAlert],
  ])
  .then(resolveAlert)
  // 7. File the ticket for the audit trail.
  .map({
    subject: { step: normalizeTicket, path: "subject" },
    description: { step: translateStep, path: "text" },
    category: { step: classifyBranch, path: "category" },
    urgency: { step: classifyBranch, path: "urgency" },
    customerId: { step: normalizeTicket, path: "customerId" },
  })
  .then(fileStep)
  // 8. Pull the answer together from wherever each piece was produced.
  .map({
    ticketRef: { step: fileStep, path: "ticketRef" },
    ticketUrl: { step: fileStep, path: "url" },
    channel: { step: entitlementStep, path: "channel" },
    category: { step: classifyBranch, path: "category" },
    urgency: { step: classifyBranch, path: "urgency" },
    alerted: { step: resolveAlert, path: "delivered" },
    alertChannel: { step: resolveAlert, path: "channel" },
    reply: { step: translateStep, path: "text" },
  })
  .commit()
