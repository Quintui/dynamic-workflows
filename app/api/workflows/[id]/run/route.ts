import { isStoredWorkflow, runStoredWorkflow } from "@/mastra/stored-workflows"

// A run can invoke agents, so give it more room than a plain request.
export const maxDuration = 60

/**
 * Runs a saved workflow. Steps that fail come back in the body with
 * `status: "failed"` — a non-200 means the request itself was wrong.
 *
 * Like `/api/chat`, this is public and spends OpenRouter credits whenever the
 * workflow contains an agent block. See the README "Security" section.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const { inputData } = (body ?? {}) as { inputData?: unknown }

  if (
    inputData === undefined ||
    typeof inputData !== "object" ||
    inputData === null ||
    Array.isArray(inputData)
  ) {
    return Response.json(
      { error: "inputData must be an object." },
      { status: 400 }
    )
  }

  if (!(await isStoredWorkflow(id))) {
    return Response.json({ error: `No workflow ${id}.` }, { status: 404 })
  }

  try {
    const run = await runStoredWorkflow(
      id,
      inputData as Record<string, unknown>
    )

    return Response.json(run)
  } catch (error) {
    console.error(`Failed to run workflow ${id}`, error)

    return Response.json(
      { error: error instanceof Error ? error.message : "The run failed." },
      { status: 500 }
    )
  }
}
