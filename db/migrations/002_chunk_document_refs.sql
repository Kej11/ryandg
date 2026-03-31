ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS document_name text;

ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS document_original_name text;

ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS document_r2_key text;

UPDATE document_chunks AS chunks
SET
  document_name = documents.name,
  document_original_name = documents.original_name,
  document_r2_key = documents.r2_key
FROM documents
WHERE chunks.document_id = documents.id
  AND (
    chunks.document_name IS NULL
    OR chunks.document_original_name IS NULL
    OR chunks.document_r2_key IS NULL
  );

ALTER TABLE document_chunks
  ALTER COLUMN document_name SET NOT NULL;

ALTER TABLE document_chunks
  ALTER COLUMN document_original_name SET NOT NULL;

ALTER TABLE document_chunks
  ALTER COLUMN document_r2_key SET NOT NULL;

CREATE INDEX IF NOT EXISTS document_chunks_document_r2_key_idx
  ON document_chunks (document_r2_key);
