import { embedSearchQuery } from "@/lib/server/documents/embed";
import {
  getChatDocument,
  searchDocumentChunks
} from "@/lib/server/documents/repository";

export type ChatDocumentSearchHit = {
  documentId: string;
  documentName: string;
  documentOriginalName: string;
  documentPath: string;
  chunkIndex: number;
  pageStart: number | null;
  pageEnd: number | null;
  similarity: number;
  snippet: string;
};

function createSnippet(content: string) {
  const compact = content.replace(/\s+/g, " ").trim();

  if (compact.length <= 320) {
    return compact;
  }

  return `${compact.slice(0, 317).trimEnd()}...`;
}

export async function searchDocumentsForChat(input: {
  query: string;
  limit?: number;
}) {
  const embedding = await embedSearchQuery(input.query);
  const hits = await searchDocumentChunks({
    embedding,
    limit: input.limit ?? 5
  });

  return hits.map((hit) => ({
    documentId: hit.document_id,
    documentName: hit.document_name,
    documentOriginalName: hit.document_original_name,
    documentPath: hit.document_r2_key,
    chunkIndex: hit.chunk_index,
    pageStart: hit.page_start,
    pageEnd: hit.page_end,
    similarity: hit.similarity,
    snippet: createSnippet(hit.content)
  })) satisfies ChatDocumentSearchHit[];
}

export async function readDocumentForChat(input: {
  documentId?: string;
  documentPath?: string;
}) {
  const document = await getChatDocument(input);

  if (!document) {
    return null;
  }

  return {
    documentId: document.id,
    documentName: document.name,
    documentOriginalName: document.original_name,
    documentPath: document.r2_key,
    status: document.status,
    textSource: document.text_source,
    pageCount: document.page_count,
    indexingError: document.indexing_error,
    extractedText: document.extracted_text
  };
}
