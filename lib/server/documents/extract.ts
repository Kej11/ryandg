import { detectUploadedDocumentKind } from "@/lib/admin-memory";
import { type ChunkSource } from "@/lib/server/documents/chunk";

type ExtractedDocumentContent = {
  kind: ReturnType<typeof detectUploadedDocumentKind>;
  previewText: string | null;
  extractedText: string | null;
  textSource:
    | "markdown"
    | "plain_text"
    | "pdf_text"
    | "image_not_indexed"
    | "pdf_without_text"
    | "binary_not_indexed";
  pageCount: number | null;
  chunkSources: ChunkSource[];
};

function decodeUtf8(buffer: Buffer) {
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerModule = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const globalWorker = globalThis as typeof globalThis & {
    pdfjsWorker?: {
      WorkerMessageHandler: unknown;
    };
  };

  if (!globalWorker.pdfjsWorker) {
    globalWorker.pdfjsWorker = {
      WorkerMessageHandler: workerModule.WorkerMessageHandler
    };
  }

  return pdfjs;
}

async function extractPdfPages(buffer: Buffer) {
  const pdfjs = await loadPdfJs();
  const document = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false
  }).promise;

  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/[ \t]+/g, " ")
      .trim();

    pages.push(text);
  }

  return pages;
}

export async function extractDocumentContent(input: {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<ExtractedDocumentContent> {
  const kind = detectUploadedDocumentKind(input.originalName, input.mimeType);

  if (kind === "image") {
    return {
      kind,
      previewText: null,
      extractedText: null,
      textSource: "image_not_indexed",
      pageCount: null,
      chunkSources: []
    };
  }

  if (kind === "pdf") {
    const pages = await extractPdfPages(input.buffer);
    const nonEmptyPages = pages
      .map((text, index) => ({
        pageNumber: index + 1,
        text: text.trim()
      }))
      .filter((page) => page.text.length > 0);

    if (nonEmptyPages.length === 0) {
      return {
        kind,
        previewText: null,
        extractedText: null,
        textSource: "pdf_without_text",
        pageCount: pages.length,
        chunkSources: []
      };
    }

    return {
      kind,
      previewText: null,
      extractedText: nonEmptyPages.map((page) => page.text).join("\n\n"),
      textSource: "pdf_text",
      pageCount: pages.length,
      chunkSources: nonEmptyPages.map((page) => ({
        pageStart: page.pageNumber,
        pageEnd: page.pageNumber,
        text: page.text
      }))
    };
  }

  if (
    input.mimeType === "text/markdown" ||
    input.originalName.toLowerCase().match(/\.(md|mdx|markdown)$/)
  ) {
    const text = decodeUtf8(input.buffer).trim();

    return {
      kind,
      previewText: text,
      extractedText: text,
      textSource: "markdown",
      pageCount: null,
      chunkSources: text
        ? [
            {
              pageStart: null,
              pageEnd: null,
              text
            }
          ]
        : []
    };
  }

  if (
    input.mimeType.startsWith("text/") ||
    input.originalName.toLowerCase().endsWith(".txt")
  ) {
    const text = decodeUtf8(input.buffer).trim();

    return {
      kind,
      previewText: text,
      extractedText: text,
      textSource: "plain_text",
      pageCount: null,
      chunkSources: text
        ? [
            {
              pageStart: null,
              pageEnd: null,
              text
            }
          ]
        : []
    };
  }

  return {
    kind,
    previewText: null,
    extractedText: null,
    textSource: "binary_not_indexed",
    pageCount: null,
    chunkSources: []
  };
}
