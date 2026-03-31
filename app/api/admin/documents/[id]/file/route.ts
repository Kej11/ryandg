import { NextResponse } from "next/server";
import {
  assertAdminRequest,
  isAdminAuthError
} from "@/lib/server/admin-auth";
import { getDocumentFileRecord } from "@/lib/server/documents/repository";
import {
  getDocumentObject,
  isR2ObjectMissingError
} from "@/lib/server/documents/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildInlineDisposition(fileName: string) {
  return `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(
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

    let object;

    try {
      object = await getDocumentObject(document.r2_key);
    } catch (error) {
      if (isR2ObjectMissingError(error)) {
        return NextResponse.json(
          { error: "Stored file is unavailable." },
          { status: 404 }
        );
      }

      throw error;
    }

    if (!object.Body) {
      return NextResponse.json({ error: "Stored file is unavailable." }, { status: 404 });
    }

    const body = await object.Body.transformToByteArray();

    return new NextResponse(Buffer.from(body), {
      status: 200,
      headers: {
        "Content-Type": document.mime_type || "application/octet-stream",
        "Content-Disposition":
          object.ContentDisposition || buildInlineDisposition(document.original_name),
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load document file."
      },
      { status: isAdminAuthError(error) ? 401 : 500 }
    );
  }
}
