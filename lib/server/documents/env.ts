export const DEFAULT_GEMINI_EMBED_MODEL = "gemini-embedding-2-preview";
export const DEFAULT_GEMINI_EMBED_DIMENSIONS = 1536;
export const DOCUMENT_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be set to use the document backend.`);
  }

  return value;
}

export function getDocumentDatabaseConfig() {
  return {
    databaseUrl: getRequiredEnv("DATABASE_URL")
  };
}

export function getDocumentR2Config() {
  return {
    r2AccountId: getRequiredEnv("R2_ACCOUNT_ID"),
    r2BucketName: getRequiredEnv("R2_BUCKET_NAME"),
    r2AccessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
    r2SecretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY")
  };
}

export function getDocumentEmbeddingConfig() {
  return {
    geminiApiKey: getRequiredEnv("GEMINI_API_KEY"),
    geminiEmbedModel:
      process.env.GEMINI_EMBED_MODEL || DEFAULT_GEMINI_EMBED_MODEL,
    geminiEmbedDimensions: Number(
      process.env.GEMINI_EMBED_DIMENSIONS || DEFAULT_GEMINI_EMBED_DIMENSIONS
    )
  };
}
