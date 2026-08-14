import {
  isStoredWorkflow,
  streamStoredWorkflow,
} from "@/mastra/stored-workflows"

// A run can invoke agents, so give it more room than a plain request. The
// response streams for as long as the workflow takes, so this bounds the run.
export const maxDuration = 60

/**
 * Runs a saved workflow, streaming newline-delimited JSON as each block starts
 * and finishes — see `RunEvent` in `lib/workflows.ts`. A block that fails is
 * reported in the stream; a non-200 means the request itself was wrong.
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
    const stream = await streamStoredWorkflow(
      id,
      inputData as Record<string, unknown>
    )

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        // Keeps proxies from holding the events back until the run is over.
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error) {
    console.error(`Failed to start workflow ${id}`, error)

    return Response.json(
      { error: error instanceof Error ? error.message : "The run failed." },
      { status: 500 }
    )
  }
}
