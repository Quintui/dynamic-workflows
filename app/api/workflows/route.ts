import { listStoredWorkflows } from "@/mastra/stored-workflows"

/**
 * The workflows the agent has saved, read back out of SQLite. The workspace
 * loads this on mount and after every `create_workflow` call, so the list
 * survives a reload.
 */
export async function GET() {
  try {
    return Response.json({ workflows: await listStoredWorkflows() })
  } catch (error) {
    console.error("Failed to list workflows", error)

    return Response.json(
      { error: "Failed to list workflows." },
      { status: 500 }
    )
  }
}
