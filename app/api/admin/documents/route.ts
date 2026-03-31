import { NextResponse } from "next/server";
import {
  assertAdminRequest,
  isAdminAuthError
} from "@/lib/server/admin-auth";
import { ingestDocumentUpload } from "@/lib/server/documents/ingest";
import { listAdminDocuments } from "@/lib/server/documents/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createErrorResponse(error: unknown, status = 500) {
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : "Unexpected document backend error."
    },
    { status }
  );
}

export async function GET() {
  try {
    await assertAdminRequest();

    return NextResponse.json({
      documents: await listAdminDocuments()
    });
  } catch (error) {
    return createErrorResponse(error, isAdminAuthError(error) ? 401 : 500);
  }
}

export async function POST(request: Request) {
  try {
    await assertAdminRequest();

    const formData = await request.formData();
    const file = formData.get("file");
    const name = formData.get("name");
    const description = formData.get("description");

    if (!(file instanceof File)) {
      return createErrorResponse(new Error("A file is required for upload."), 400);
    }

    if (typeof name !== "string") {
      return createErrorResponse(new Error("A document name is required."), 400);
    }

    if (typeof description !== "string") {
      return createErrorResponse(new Error("A document description is required."), 400);
    }

    const document = await ingestDocumentUpload({
      file,
      name,
      description
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error, isAdminAuthError(error) ? 401 : 500);
  }
}
