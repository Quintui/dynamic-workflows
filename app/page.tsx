import type { Metadata } from "next"

import { MODELS } from "@/lib/models"
import { Workspace } from "@/components/workspace"

export const metadata: Metadata = {
  title: "Dynamic Workflows",
  description:
    "Describe a workflow in the chat and watch it get built, powered by a Mastra agent on OpenRouter.",
}

export default function Page() {
  return <Workspace models={MODELS} />
}
