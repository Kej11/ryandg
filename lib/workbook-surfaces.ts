export type WorkbookSurfaceBase = {
  surfaceId: string;
  title: string;
  documentId: string;
  documentName: string;
  documentOriginalName: string;
  documentPath: string;
  pageCount: number | null;
  textSource: string | null;
};

export type WorkbookDocumentTextSurface = WorkbookSurfaceBase & {
  surfaceType: "document_text";
  extractedText: string | null;
};

export type WorkbookSummarySurface = WorkbookSurfaceBase & {
  surfaceType: "summary";
  summary: string;
  bullets: string[];
};

export type WorkbookKeyFactsSurface = WorkbookSurfaceBase & {
  surfaceType: "key_facts";
  facts: Array<{
    label: string;
    value: string;
    citation?: string;
  }>;
};

export type WorkbookSourceExcerptsSurface = WorkbookSurfaceBase & {
  surfaceType: "source_excerpts";
  excerpts: Array<{
    quote: string;
    citation: string;
  }>;
};

export type WorkbookTimelineSurface = WorkbookSurfaceBase & {
  surfaceType: "timeline";
  events: Array<{
    label: string;
    date?: string;
    description: string;
    citation?: string;
  }>;
};

export type WorkbookSurface =
  | WorkbookDocumentTextSurface
  | WorkbookSummarySurface
  | WorkbookKeyFactsSurface
  | WorkbookSourceExcerptsSurface
  | WorkbookTimelineSurface;

function isBaseSurface(value: Record<string, unknown>) {
  return (
    typeof value.surfaceId === "string" &&
    typeof value.title === "string" &&
    typeof value.documentId === "string" &&
    typeof value.documentName === "string" &&
    typeof value.documentOriginalName === "string" &&
    typeof value.documentPath === "string"
  );
}

export function isWorkbookSurface(value: unknown): value is WorkbookSurface {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (!isBaseSurface(candidate)) {
    return false;
  }

  if (candidate.surfaceType === "document_text") {
    return candidate.extractedText === null || typeof candidate.extractedText === "string";
  }

  if (candidate.surfaceType === "summary") {
    return (
      typeof candidate.summary === "string" &&
      Array.isArray(candidate.bullets) &&
      candidate.bullets.every((bullet) => typeof bullet === "string")
    );
  }

  if (candidate.surfaceType === "key_facts") {
    return (
      Array.isArray(candidate.facts) &&
      candidate.facts.every(
        (fact) =>
          fact &&
          typeof fact === "object" &&
          typeof fact.label === "string" &&
          typeof fact.value === "string" &&
          (fact.citation === undefined || typeof fact.citation === "string")
      )
    );
  }

  if (candidate.surfaceType === "source_excerpts") {
    return (
      Array.isArray(candidate.excerpts) &&
      candidate.excerpts.every(
        (excerpt) =>
          excerpt &&
          typeof excerpt === "object" &&
          typeof excerpt.quote === "string" &&
          typeof excerpt.citation === "string"
      )
    );
  }

  if (candidate.surfaceType === "timeline") {
    return (
      Array.isArray(candidate.events) &&
      candidate.events.every(
        (event) =>
          event &&
          typeof event === "object" &&
          typeof event.label === "string" &&
          typeof event.description === "string" &&
          (event.date === undefined || typeof event.date === "string") &&
          (event.citation === undefined || typeof event.citation === "string")
      )
    );
  }

  return false;
}
