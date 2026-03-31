CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  r2_key text NOT NULL,
  r2_etag text,
  checksum_sha256 text NOT NULL,
  status text NOT NULL CHECK (status IN ('processing', 'indexed', 'skipped', 'failed')),
  indexing_error text,
  text_source text,
  page_count integer,
  chunk_count integer NOT NULL DEFAULT 0,
  extracted_text text,
  uploaded_at timestamptz NOT NULL DEFAULT NOW(),
  indexed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS documents_r2_key_idx
  ON documents (r2_key);

CREATE TABLE IF NOT EXISTS document_chunks (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  page_start integer,
  page_end integer,
  content text NOT NULL,
  content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  embedding vector(1536) NOT NULL,
  char_count integer NOT NULL
);

ALTER TABLE document_chunks
  ALTER COLUMN embedding TYPE vector(1536);

CREATE UNIQUE INDEX IF NOT EXISTS document_chunks_document_chunk_idx
  ON document_chunks (document_id, chunk_index);

CREATE INDEX IF NOT EXISTS document_chunks_content_tsv_idx
  ON document_chunks
  USING GIN (content_tsv);

DROP INDEX IF EXISTS document_chunks_embedding_hnsw_idx;

CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops);
