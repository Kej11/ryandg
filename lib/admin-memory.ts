export type UploadedDocumentKind = "markdown" | "pdf" | "image" | "file";
export type UploadedDocumentStatus =
  | "processing"
  | "indexed"
  | "skipped"
  | "failed";
export type UploadedDocumentTextSource =
  | "markdown"
  | "plain_text"
  | "pdf_text"
  | "image_not_indexed"
  | "pdf_without_text"
  | "binary_not_indexed";

export type UploadedDocument = {
  id: string;
  name: string;
  description: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  indexedAt: string | null;
  objectKey: string;
  checksumSha256: string;
  status: UploadedDocumentStatus;
  indexingError: string | null;
  textSource: UploadedDocumentTextSource | null;
  pageCount: number | null;
  chunkCount: number;
  kind: UploadedDocumentKind;
  previewText: string | null;
  previewUrl: string;
};

function hasFileExtension(name: string, extensions: string[]) {
  const lowerName = name.toLowerCase();

  return extensions.some((extension) => lowerName.endsWith(extension));
}

export function detectUploadedDocumentKind(name: string, mimeType: string) {
  if (
    mimeType.startsWith("image/") ||
    hasFileExtension(name, [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"])
  ) {
    return "image" satisfies UploadedDocumentKind;
  }

  if (mimeType === "application/pdf" || hasFileExtension(name, [".pdf"])) {
    return "pdf" satisfies UploadedDocumentKind;
  }

  if (
    mimeType === "text/markdown" ||
    mimeType === "text/plain" ||
    hasFileExtension(name, [".md", ".mdx", ".markdown", ".txt"])
  ) {
    return "markdown" satisfies UploadedDocumentKind;
  }

  return "file" satisfies UploadedDocumentKind;
}

export function createMockObjectKey(name: string, id: string, date: Date) {
  const normalizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `uploads/${year}/${month}/${day}/${id}-${normalizedName || "document"}`;
}

export function formatDocumentSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export function formatUploadedAt(isoValue: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(isoValue));
}

export function getDocumentPreviewUrl(id: string) {
  return `/api/admin/documents/${id}/file`;
}
