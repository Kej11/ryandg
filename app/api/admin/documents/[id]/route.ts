import { NextResponse } from "next/server";
import {
  assertAdminRequest,
  isAdminAuthError
} from "@/lib/server/admin-auth";
import {
  deleteDocumentRecord,
  getDocumentFileRecord
} from "@/lib/server/documents/repository";
import { deleteDocumentObject } from "@/lib/server/documents/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await assertAdminRequest();
    const { id } = await context.params;
    const document = await getDocumentFileRecord(id);

    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    await deleteDocumentObject(document.r2_key, {
      ignoreMissing: true
    });

    try {
      await deleteDocumentRecord(id);
    } catch {
      return NextResponse.json(
        {
          error:
            "Stored file was removed, but metadata cleanup did not finish. Retry delete to complete removal."
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to delete document."
      },
      { status: isAdminAuthError(error) ? 401 : 500 }
    );
  }
}
