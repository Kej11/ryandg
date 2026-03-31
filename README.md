# RyanDG

UI-first Next.js app with a Leyware-inspired chat surface and an authenticated admin document console.

## AI setup

Pinned packages:

- `ai@6.0.141`
- `@ai-sdk/react@3.0.143`
- `@ai-sdk/gateway@3.0.83`
- `ai-elements@1.9.0`

Preferred local gateway auth:

1. `vercel link`
2. `vercel env pull .env.local`

This provisions `VERCEL_OIDC_TOKEN` for AI Gateway. If you are not using Vercel OIDC locally, set `AI_GATEWAY_API_KEY` instead.

Default chat model:

- `google/gemini-3-flash`

You can override it locally with `AI_GATEWAY_MODEL` in `.env.local`.

Use `pnpm ai:elements:add <component>` to install AI Elements components on demand.

## Document backend

The admin console now supports persistent document ingestion with:

- `Neon` for metadata and pgvector chunk embeddings
- private `R2` storage for original files
- 1536-dimensional normalized Gemini embeddings via `GEMINI_API_KEY`

Required env vars:

- `DATABASE_URL`
- `R2_ACCOUNT_ID`
- `R2_BUCKET_NAME`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `GEMINI_API_KEY`
- optional `GEMINI_EMBED_MODEL` defaulting to `gemini-embedding-2-preview`
- optional `GEMINI_EMBED_DIMENSIONS` defaulting to `1536`

Run migrations with:

1. `cp .env.example .env.local`
2. populate the database, R2, and Gemini env vars
3. `pnpm db:migrate`

Current indexing scope:

- markdown and plain text are indexed
- digitally searchable PDFs are indexed per page
- images and non-extractable PDFs are stored and previewable but skipped for search in v1
