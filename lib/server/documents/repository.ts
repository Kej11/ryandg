import {
  detectUploadedDocumentKind,
  getDocumentPreviewUrl,
  type UploadedDocument,
  type UploadedDocumentStatus,
  type UploadedDocumentTextSource
} from "@/lib/admin-memory";
import { type DocumentChunk } from "@/lib/server/documents/chunk";
import { getDocumentSql } from "@/lib/server/documents/db";

type DocumentDatabaseRow = {
  id: string;
  name: string;
  description: string | null;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  r2_key: string;
  r2_etag: string | null;
  checksum_sha256: string;
  status: UploadedDocumentStatus;
  indexing_error: string | null;
  text_source: UploadedDocumentTextSource | null;
  page_count: number | null;
  chunk_count: number | null;
  extracted_text: string | null;
  uploaded_at: string;
  indexed_at: string | null;
};

type DocumentFileRow = {
  id: string;
  r2_key: string;
  mime_type: string;
  original_name: string;
};

type ChatDocumentRow = {
  id: string;
  name: string;
  original_name: string;
  r2_key: string;
  status: UploadedDocumentStatus;
  text_source: UploadedDocumentTextSource | null;
  page_count: number | null;
  extracted_text: string | null;
  indexing_error: string | null;
};

type DocumentSearchHitRow = {
  document_id: string;
  document_name: string;
  document_original_name: string;
  document_r2_key: string;
  chunk_index: number;
  content: string;
  page_start: number | null;
  page_end: number | null;
  similarity: number;
};

function mapDocumentRow(row: DocumentDatabaseRow): UploadedDocument {
  const kind = detectUploadedDocumentKind(row.original_name, row.mime_type);
  const previewText =
    row.text_source === "markdown" || row.text_source === "plain_text"
      ? row.extracted_text
      : null;

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size_bytes,
    uploadedAt: row.uploaded_at,
    indexedAt: row.indexed_at,
    objectKey: row.r2_key,
    checksumSha256: row.checksum_sha256,
    status: row.status,
    indexingError: row.indexing_error,
    textSource: row.text_source,
    pageCount: row.page_count,
    chunkCount: row.chunk_count ?? 0,
    kind,
    previewText,
    previewUrl: getDocumentPreviewUrl(row.id)
  };
}

function toVectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

export async function listAdminDocuments() {
  const sql = getDocumentSql();
  const rows = await sql.query(`
    SELECT
      id,
      name,
      description,
      original_name,
      mime_type,
      size_bytes,
      r2_key,
      r2_etag,
      checksum_sha256,
      status,
      indexing_error,
      text_source,
      page_count,
      chunk_count,
      extracted_text,
      uploaded_at,
      indexed_at
    FROM documents
    ORDER BY uploaded_at DESC
  `);

  return (rows as DocumentDatabaseRow[]).map(mapDocumentRow);
}

export async function createProcessingDocument(input: {
  id: string;
  name: string;
  description: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  r2Key: string;
  r2Etag: string | null;
  checksumSha256: string;
}) {
  const sql = getDocumentSql();
  const rows = await sql.query(
    `
      INSERT INTO documents (
        id,
        name,
        description,
        original_name,
        mime_type,
        size_bytes,
        r2_key,
        r2_etag,
        checksum_sha256,
        status,
        chunk_count,
        uploaded_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'processing', 0, NOW())
      RETURNING
        id,
        name,
        description,
        original_name,
        mime_type,
        size_bytes,
        r2_key,
        r2_etag,
        checksum_sha256,
        status,
        indexing_error,
        text_source,
        page_count,
        chunk_count,
        extracted_text,
        uploaded_at,
        indexed_at
    `,
    [
      input.id,
      input.name,
      input.description,
      input.originalName,
      input.mimeType,
      input.sizeBytes,
      input.r2Key,
      input.r2Etag,
      input.checksumSha256
    ]
  );

  return mapDocumentRow((rows as DocumentDatabaseRow[])[0]);
}

export async function markDocumentIndexed(input: {
  documentId: string;
  documentName: string;
  documentOriginalName: string;
  documentPath: string;
  textSource: UploadedDocumentTextSource;
  pageCount: number | null;
  extractedText: string | null;
  chunks: Array<
    DocumentChunk & {
      embedding: number[];
    }
  >;
}) {
  const sql = getDocumentSql();

  const statements = [
    sql.query("DELETE FROM document_chunks WHERE document_id = $1", [input.documentId])
  ];

  for (const chunk of input.chunks) {
    statements.push(
      sql.query(
        `
          INSERT INTO document_chunks (
            id,
            document_id,
            document_name,
            document_original_name,
            document_r2_key,
            chunk_index,
            page_start,
            page_end,
            content,
            embedding,
            char_count
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector, $11)
        `,
        [
          `${input.documentId}-chunk-${chunk.chunkIndex}`,
          input.documentId,
          input.documentName,
          input.documentOriginalName,
          input.documentPath,
          chunk.chunkIndex,
          chunk.pageStart,
          chunk.pageEnd,
          chunk.content,
          toVectorLiteral(chunk.embedding),
          chunk.charCount
        ]
      )
    );
  }

  statements.push(
    sql.query(
      `
        UPDATE documents
        SET
          status = 'indexed',
          indexing_error = NULL,
          text_source = $2,
          page_count = $3,
          chunk_count = $4,
          extracted_text = $5,
          indexed_at = NOW()
        WHERE id = $1
      `,
      [
        input.documentId,
        input.textSource,
        input.pageCount,
        input.chunks.length,
        input.extractedText
      ]
    )
  );

  await sql.transaction(statements);
}

export async function markDocumentSkipped(input: {
  documentId: string;
  textSource: UploadedDocumentTextSource;
  pageCount: number | null;
  extractedText: string | null;
}) {
  const sql = getDocumentSql();

  await sql.query(
    `
      UPDATE documents
      SET
        status = 'skipped',
        indexing_error = NULL,
        text_source = $2,
        page_count = $3,
        chunk_count = 0,
        extracted_text = $4,
        indexed_at = NOW()
      WHERE id = $1
    `,
    [input.documentId, input.textSource, input.pageCount, input.extractedText]
  );
}

export async function markDocumentFailed(documentId: string, message: string) {
  const sql = getDocumentSql();

  await sql.query(
    `
      UPDATE documents
      SET
        status = 'failed',
        indexing_error = $2,
        indexed_at = NOW()
      WHERE id = $1
    `,
    [documentId, message]
  );
}

export async function getDocumentById(documentId: string) {
  const sql = getDocumentSql();
  const rows = await sql.query(
    `
      SELECT
        id,
        name,
        description,
        original_name,
        mime_type,
        size_bytes,
        r2_key,
        r2_etag,
        checksum_sha256,
        status,
        indexing_error,
        text_source,
        page_count,
        chunk_count,
        extracted_text,
        uploaded_at,
        indexed_at
      FROM documents
      WHERE id = $1
      LIMIT 1
    `,
    [documentId]
  );

  const row = (rows as DocumentDatabaseRow[])[0];

  return row ? mapDocumentRow(row) : null;
}

export async function getDocumentFileRecord(documentId: string) {
  const sql = getDocumentSql();
  const rows = await sql.query(
    `
      SELECT id, r2_key, mime_type, original_name
      FROM documents
      WHERE id = $1
      LIMIT 1
    `,
    [documentId]
  );

  return ((rows as DocumentFileRow[])[0] ?? null) as DocumentFileRow | null;
}

export async function getChatDocument(input: {
  documentId?: string;
  documentPath?: string;
}) {
  const sql = getDocumentSql();

  if (input.documentId) {
    const rows = await sql.query(
      `
        SELECT
          id,
          name,
          original_name,
          r2_key,
          status,
          text_source,
          page_count,
          extracted_text,
          indexing_error
        FROM documents
        WHERE id = $1
        LIMIT 1
      `,
      [input.documentId]
    );

    return ((rows as ChatDocumentRow[])[0] ?? null) as ChatDocumentRow | null;
  }

  if (input.documentPath) {
    const rows = await sql.query(
      `
        SELECT
          id,
          name,
          original_name,
          r2_key,
          status,
          text_source,
          page_count,
          extracted_text,
          indexing_error
        FROM documents
        WHERE r2_key = $1
        LIMIT 1
      `,
      [input.documentPath]
    );

    return ((rows as ChatDocumentRow[])[0] ?? null) as ChatDocumentRow | null;
  }

  return null;
}

export async function deleteDocumentRecord(documentId: string) {
  const sql = getDocumentSql();

  await sql.query("DELETE FROM documents WHERE id = $1", [documentId]);
}

export async function searchDocumentChunks(input: {
  embedding: number[];
  limit?: number;
}) {
  const sql = getDocumentSql();
  const rows = await sql.query(
    `
      SELECT
        document_id,
        document_name,
        document_original_name,
        document_r2_key,
        chunk_index,
        content,
        page_start,
        page_end,
        1 - (embedding <=> $1::vector) AS similarity
      FROM document_chunks
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `,
    [toVectorLiteral(input.embedding), input.limit ?? 5]
  );

  return rows as DocumentSearchHitRow[];
}
