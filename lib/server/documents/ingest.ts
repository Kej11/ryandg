import { createHash, randomUUID } from "node:crypto";
import {
  createMockObjectKey,
  type UploadedDocument
} from "@/lib/admin-memory";
import { chunkExtractedContent } from "@/lib/server/documents/chunk";
import { embedDocumentChunks } from "@/lib/server/documents/embed";
import { DOCUMENT_UPLOAD_MAX_BYTES } from "@/lib/server/documents/env";
import { extractDocumentContent } from "@/lib/server/documents/extract";
import {
  createProcessingDocument,
  getDocumentById,
  markDocumentFailed,
  markDocumentIndexed,
  markDocumentSkipped
} from "@/lib/server/documents/repository";
import {
  deleteDocumentObject,
  uploadDocumentObject
} from "@/lib/server/documents/r2";

function createChecksum(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function createContentDisposition(fileName: string) {
  return `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function ingestDocumentUpload(input: {
  file: File;
  name: string;
  description: string;
}): Promise<UploadedDocument> {
  const originalName = input.file.name;
  const documentName = input.name.trim() || originalName;
  const buffer = Buffer.from(await input.file.arrayBuffer());

  if (buffer.byteLength === 0) {
    throw new Error("Uploaded file is empty.");
  }

  if (buffer.byteLength > DOCUMENT_UPLOAD_MAX_BYTES) {
    throw new Error("Uploaded file exceeds the 20 MB v1 upload limit.");
  }

  const documentId = randomUUID();
  const uploadDate = new Date();
  const objectKey = createMockObjectKey(originalName, documentId, uploadDate);
  const mimeType = input.file.type || "application/octet-stream";
  const checksumSha256 = createChecksum(buffer);

  const uploadedObject = await uploadDocumentObject({
    key: objectKey,
    body: new Uint8Array(buffer),
    contentType: mimeType,
    contentDisposition: createContentDisposition(originalName)
  });

  try {
    await createProcessingDocument({
      id: documentId,
      name: documentName,
      description: input.description.trim(),
      originalName,
      mimeType,
      sizeBytes: buffer.byteLength,
      r2Key: objectKey,
      r2Etag: uploadedObject.etag,
      checksumSha256
    });
  } catch (error) {
    await deleteDocumentObject(objectKey);
    throw error;
  }

  try {
    const extracted = await extractDocumentContent({
      originalName,
      mimeType,
      buffer
    });

    const chunks = chunkExtractedContent(extracted.chunkSources);

    if (chunks.length === 0) {
      await markDocumentSkipped({
        documentId,
        textSource: extracted.textSource,
        pageCount: extracted.pageCount,
        extractedText: extracted.extractedText
      });
    } else {
      const embeddings = await embedDocumentChunks(
        chunks.map((chunk) => ({
          title: documentName,
          content: chunk.content
        }))
      );

      await markDocumentIndexed({
        documentId,
        documentName,
        documentOriginalName: originalName,
        documentPath: objectKey,
        textSource: extracted.textSource,
        pageCount: extracted.pageCount,
        extractedText: extracted.extractedText,
        chunks: chunks.map((chunk, index) => ({
          ...chunk,
          embedding: embeddings[index]
        }))
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to index uploaded document.";
    await markDocumentFailed(documentId, message);
  }

  const storedDocument = await getDocumentById(documentId);

  if (!storedDocument) {
    throw new Error("Uploaded document could not be loaded after ingestion.");
  }

  return storedDocument;
}
