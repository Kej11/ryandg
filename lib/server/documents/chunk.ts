export type ChunkSource = {
  pageStart: number | null;
  pageEnd: number | null;
  text: string;
};

export type DocumentChunk = {
  chunkIndex: number;
  pageStart: number | null;
  pageEnd: number | null;
  content: string;
  charCount: number;
};

const TARGET_CHARS = 1800;
const OVERLAP_CHARS = 250;

function normalizeWhitespace(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitOversizedSegment(segment: string) {
  const pieces: string[] = [];
  let remaining = segment.trim();

  while (remaining.length > TARGET_CHARS) {
    let splitAt = remaining.lastIndexOf(" ", TARGET_CHARS);

    if (splitAt < TARGET_CHARS * 0.6) {
      splitAt = TARGET_CHARS;
    }

    pieces.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) {
    pieces.push(remaining);
  }

  return pieces;
}

function splitIntoSegments(text: string) {
  return normalizeWhitespace(text)
    .split(/\n{2,}/)
    .flatMap((segment) => splitOversizedSegment(segment))
    .filter(Boolean);
}

function buildChunksForSource(
  source: ChunkSource,
  startingIndex: number
) {
  const segments = splitIntoSegments(source.text);
  const chunks: DocumentChunk[] = [];
  let current = "";
  let chunkIndex = startingIndex;

  for (const segment of segments) {
    const candidate = current ? `${current}\n\n${segment}` : segment;

    if (candidate.length <= TARGET_CHARS || !current) {
      current = candidate;
      continue;
    }

    const finalized = current.trim();

    if (finalized) {
      chunks.push({
        chunkIndex,
        pageStart: source.pageStart,
        pageEnd: source.pageEnd,
        content: finalized,
        charCount: finalized.length
      });
      chunkIndex += 1;
    }

    const overlap = finalized.slice(-OVERLAP_CHARS).trim();
    current = overlap ? `${overlap}\n\n${segment}` : segment;
  }

  const finalized = current.trim();

  if (finalized) {
    chunks.push({
      chunkIndex,
      pageStart: source.pageStart,
      pageEnd: source.pageEnd,
      content: finalized,
      charCount: finalized.length
    });
  }

  return chunks;
}

export function chunkExtractedContent(sources: ChunkSource[]) {
  const chunks: DocumentChunk[] = [];
  let nextIndex = 0;

  for (const source of sources) {
    const built = buildChunksForSource(source, nextIndex);
    chunks.push(...built);
    nextIndex += built.length;
  }

  return chunks;
}
