import { getDocumentEmbeddingConfig } from "@/lib/server/documents/env";

function prepareDocumentEmbeddingText(input: {
  title: string;
  content: string;
}) {
  const normalizedTitle = input.title.trim() || "none";
  const normalizedContent = input.content.trim();

  return `title: ${normalizedTitle} | text: ${normalizedContent}`;
}

function normalizeEmbedding(values: number[]) {
  const magnitude = Math.hypot(...values);

  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new Error("Gemini embedding normalization failed because the vector norm was zero.");
  }

  return values.map((value) => value / magnitude);
}

async function requestGeminiEmbeddings(values: string[]) {
  const config = getDocumentEmbeddingConfig();
  const modelPath = `models/${config.geminiEmbedModel}`;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${modelPath}:batchEmbedContents`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.geminiApiKey
      },
      body: JSON.stringify({
        requests: values.map((value) => ({
          model: modelPath,
          outputDimensionality: config.geminiEmbedDimensions,
          content: {
            parts: [
              {
                text: value
              }
            ]
          }
        }))
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `Gemini embedding request failed with ${response.status} ${response.statusText}.`
    );
  }

  const payload = (await response.json()) as {
    embeddings?: Array<{
      values?: number[];
    }>;
  };

  if (!Array.isArray(payload.embeddings) || payload.embeddings.length !== values.length) {
    throw new Error("Gemini embedding response did not match the requested item count.");
  }

  return payload.embeddings.map((embedding, index) => {
    if (!Array.isArray(embedding.values) || embedding.values.length === 0) {
      throw new Error(`Missing embedding values for item ${index}.`);
    }

    if (embedding.values.length !== config.geminiEmbedDimensions) {
      throw new Error(
        `Unexpected embedding length for item ${index}: expected ${config.geminiEmbedDimensions}, received ${embedding.values.length}.`
      );
    }

    return normalizeEmbedding(embedding.values);
  });
}

export async function embedDocumentChunks(
  chunks: Array<{
    title: string;
    content: string;
  }>
) {
  if (chunks.length === 0) {
    return [];
  }

  return requestGeminiEmbeddings(
    chunks.map((chunk) => prepareDocumentEmbeddingText(chunk))
  );
}

export async function embedSearchQuery(query: string) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    throw new Error("Search query cannot be empty.");
  }

  const [embedding] = await requestGeminiEmbeddings([`query: ${normalizedQuery}`]);
  return embedding;
}
