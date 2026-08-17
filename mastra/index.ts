import { Mastra } from "@mastra/core/mastra"
import { type AnyWorkflow } from "@mastra/core/workflows"
import { LibSQLStore } from "@mastra/libsql"

import { chatAgent } from "./agents/chat-agent"
import { classifyTicketAgent } from "./agents/classify-ticket"
import { draftReplyAgent } from "./agents/draft-reply"
import { translateAgent } from "./agents/translate"
import { supportTools } from "./tools"
import { referenceTriage } from "./workflows/reference-triage"

export const mastra = new Mastra({
  agents: {
    // The agent behind the chat panel.
    chatAgent,
    // Building blocks. Workflow definitions reference these by their agent id,
    // so the registry key is kept the same as the id.
    "classify-ticket": classifyTicketAgent,
    "draft-reply": draftReplyAgent,
    translate: translateAgent,
  },
  // Building blocks. Workflow definitions reference these by the key.
  tools: supportTools,
  // Hand-written in code, unlike everything the agent builds. Its origin is
  // `code`, so it never appears in the workflow list, which reads storage.
  //
  // Widened on purpose: a literal key type here would narrow `getWorkflow()` to
  // this one id, and every other workflow in this app is registered at run time
  // under an id only known then.
  workflows: { "reference-triage": referenceTriage } as Record<
    string,
    AnyWorkflow
  >,
  // A local SQLite file. Dynamic workflow definitions land in the
  // `workflowDefinitions` domain, so what the agent builds outlives the
  // process. See `mastra/stored-workflows.ts` for reading them back.
  storage: new LibSQLStore({ id: "mastra-storage", url: "file:./mastra.db" }),
})
