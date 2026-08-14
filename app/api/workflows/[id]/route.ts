import {
  deleteStoredWorkflow,
  isStoredWorkflow,
} from "@/mastra/stored-workflows"

/**
 * Deletes a saved workflow — the stored definition and the live registration
 * both go. Deleting one that isn't there is a 404 rather than a silent success,
 * so the list can tell the difference.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!(await isStoredWorkflow(id))) {
    return Response.json({ error: `No workflow ${id}.` }, { status: 404 })
  }

  try {
    await deleteStoredWorkflow(id)

    return Response.json({ deleted: true, workflowId: id })
  } catch (error) {
    console.error(`Failed to delete workflow ${id}`, error)

    return Response.json(
      { error: "Failed to delete the workflow." },
      { status: 500 }
    )
  }
}
