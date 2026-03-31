"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
  File,
  FileSearch,
  FileText,
  ImageIcon,
  Link2,
  LoaderCircle,
  LogOut,
  Search,
  Trash2,
  Upload
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { logoutAdmin } from "@/app/admin-auth-actions";
import { AddDocumentModal } from "@/components/admin/add-document-modal";
import { useAdminUploadStore } from "@/components/admin/use-admin-upload-store";
import { MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import {
  formatDocumentSize,
  formatUploadedAt,
  type UploadedDocument
} from "@/lib/admin-memory";
import { cn } from "@/lib/utils";

function getDocumentIcon(document: UploadedDocument) {
  if (document.kind === "markdown") {
    return FileText;
  }

  if (document.kind === "image") {
    return ImageIcon;
  }

  return File;
}

function getDocumentLabel(document: UploadedDocument) {
  if (document.kind === "markdown") {
    return "Markdown";
  }

  if (document.kind === "image") {
    return "Image";
  }

  if (document.kind === "pdf") {
    return "PDF";
  }

  return "File";
}

function getTextSourceLabel(document: UploadedDocument) {
  switch (document.textSource) {
    case "markdown":
      return "Markdown text";
    case "plain_text":
      return "Plain text";
    case "pdf_text":
      return "PDF text";
    case "image_not_indexed":
      return "Image stored only";
    case "pdf_without_text":
      return "PDF without extractable text";
    case "binary_not_indexed":
      return "Binary stored only";
    default:
      return "Not available";
  }
}

function DocumentPreview({ document }: { document: UploadedDocument }) {
  if (document.previewText) {
    return (
      <div className="rounded-[24px] border bg-background p-5 text-sm leading-7 text-foreground">
        <MessageResponse>{document.previewText}</MessageResponse>
      </div>
    );
  }

  if (document.kind === "image" && document.previewUrl) {
    return (
      <div className="overflow-hidden rounded-[24px] border bg-background">
        <img
          src={document.previewUrl}
          alt={document.name}
          className="h-auto max-h-[620px] w-full object-contain"
        />
      </div>
    );
  }

  if (document.kind === "pdf" && document.previewUrl) {
    return (
      <div className="overflow-hidden rounded-[24px] border bg-background">
        <iframe
          title={document.name}
          src={document.previewUrl}
          className="h-[700px] w-full"
        />
      </div>
    );
  }

  if (document.status === "processing") {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border border-dashed bg-background px-6 py-10 text-center">
        <div className="rounded-2xl border bg-card p-3 text-primary">
          <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.8} />
        </div>
        <div className="mt-5 text-sm font-medium text-foreground">Indexing in progress</div>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          The original file is stored. Text extraction and embedding are still running.
        </p>
      </div>
    );
  }

  if (document.status === "failed") {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border border-dashed bg-background px-6 py-10 text-center">
        <div className="rounded-2xl border bg-card p-3 text-red-600">
          <AlertTriangle className="h-4 w-4" strokeWidth={1.8} />
        </div>
        <div className="mt-5 text-sm font-medium text-foreground">Indexing failed</div>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {document.indexingError || "The file was stored, but the indexing step failed."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border border-dashed bg-background px-6 py-10 text-center">
      <div className="rounded-2xl border bg-card p-3 text-muted-foreground">
        <FileSearch className="h-4 w-4" strokeWidth={1.8} />
      </div>
      <div className="mt-5 text-sm font-medium text-foreground">Stored without inline preview</div>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        This document is available in storage, but it does not have a searchable text preview in v1.
      </p>
      {document.previewUrl ? (
        <a
          href={document.previewUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open file
        </a>
      ) : null}
    </div>
  );
}

async function createJsonError(response: Response) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;

  return payload?.error || "Unexpected document backend error.";
}

export function AdminConsole({
  initialDocuments,
  username,
  initialLoadError = ""
}: {
  initialDocuments: UploadedDocument[];
  username: string;
  initialLoadError?: string;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    initialDocuments[0]?.id ?? null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState(initialLoadError);
  const [searchQuery, setSearchQuery] = useState("");
  const uploadPhase = useAdminUploadStore((state) => state.phase);
  const draftFile = useAdminUploadStore((state) => state.draftFile);
  const draftName = useAdminUploadStore((state) => state.draftName);
  const draftDescription = useAdminUploadStore((state) => state.draftDescription);
  const uploadError = useAdminUploadStore((state) => state.error);
  const openUploadForm = useAdminUploadStore((state) => state.openForm);
  const closeUploadModal = useAdminUploadStore((state) => state.close);
  const setDraftName = useAdminUploadStore((state) => state.setDraftName);
  const setDraftDescription = useAdminUploadStore(
    (state) => state.setDraftDescription
  );
  const setDraftFile = useAdminUploadStore((state) => state.setDraftFile);
  const setUploadError = useAdminUploadStore((state) => state.setError);
  const beginUpload = useAdminUploadStore((state) => state.beginUpload);
  const failUpload = useAdminUploadStore((state) => state.failUpload);
  const completeUpload = useAdminUploadStore((state) => state.completeUpload);
  const isUploading = uploadPhase === "uploading";
  const isAddModalOpen = uploadPhase !== "closed";

  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) ?? null;
  const totalSize = documents.reduce((sum, document) => sum + document.size, 0);
  const filteredDocuments = documents.filter((document) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return true;
    }

    return [
      document.name,
      document.originalName,
      document.description,
      document.objectKey,
      document.mimeType,
      getDocumentLabel(document),
      document.status
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  });

  const handleUpload = async () => {
    if (!draftFile) {
      setUploadError("Choose a file to upload.");
      return;
    }

    try {
      beginUpload();
      setActionError("");

      const formData = new FormData();
      formData.set("name", draftName);
      formData.set("description", draftDescription);
      formData.set("file", draftFile);

      const response = await fetch("/api/admin/documents", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(await createJsonError(response));
      }

      const payload = (await response.json()) as { document: UploadedDocument };

      setDocuments((currentDocuments) => [payload.document, ...currentDocuments]);
      setSelectedDocumentId(payload.document.id);
      completeUpload();
    } catch (error) {
      failUpload(
        error instanceof Error ? error.message : "Unable to upload document."
      );
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      setIsDeleting(true);
      setActionError("");

      const response = await fetch(`/api/admin/documents/${documentId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error(await createJsonError(response));
      }

      setDocuments((currentDocuments) => {
        const nextDocuments = currentDocuments.filter(
          (document) => document.id !== documentId
        );

        setSelectedDocumentId((currentSelectedId) => {
          if (currentSelectedId !== documentId) {
            return currentSelectedId;
          }

          return nextDocuments[0]?.id ?? null;
        });

        return nextDocuments;
      });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to delete document."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAll = async () => {
    try {
      setIsDeleting(true);
      setActionError("");

      for (const document of documents) {
        const response = await fetch(`/api/admin/documents/${document.id}`, {
          method: "DELETE"
        });

        if (!response.ok) {
          throw new Error(await createJsonError(response));
        }
      }

      setDocuments([]);
      setSelectedDocumentId(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to clear documents."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="min-h-svh bg-background px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-4">
        <div className="rounded-[26px] border bg-card px-4 py-4 shadow-sm sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary/80">
                Document manager
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="rounded-full border bg-background px-3 py-1.5 font-medium text-foreground">
                  {username}
                </span>
                <span className="rounded-full border bg-background px-3 py-1.5">
                  {documents.length} document{documents.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full border bg-background px-3 py-1.5">
                  {formatDocumentSize(totalSize)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="lg"
                onClick={() => {
                  setUploadError("");
                  setActionError("");
                  openUploadForm();
                }}
                disabled={isUploading || Boolean(initialLoadError)}
              >
                <Upload className="h-4 w-4" />
                {isUploading ? "Uploading..." : "Add documents"}
              </Button>
              <Link
                href="/"
                className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Back to site
              </Link>
              <form action={logoutAdmin}>
                <Button variant="outline" size="lg" type="submit">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </form>
            </div>
          </div>

          {actionError ? (
            <div className="mt-4 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-[30px] border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary/80">
                  List
                </div>
                <h2 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.04em] text-foreground">
                  Documents
                </h2>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={documents.length === 0 || isDeleting}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear all
              </Button>
            </div>

            <div className="mt-5 rounded-[22px] border bg-background px-4 py-3">
              <div className="flex items-center gap-3">
                <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by filename, key, or type"
                  className="w-full border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <span>
                Showing {filteredDocuments.length} of {documents.length}
              </span>
              <span>{selectedDocument ? "Preview active" : "Nothing selected"}</span>
            </div>

            {documents.length === 0 ? (
              <div className="mt-5 flex min-h-[300px] flex-col items-center justify-center rounded-[26px] border border-dashed bg-background px-6 text-center">
                <div className="rounded-2xl border bg-card p-3 text-muted-foreground">
                  <Upload className="h-4 w-4" strokeWidth={1.8} />
                </div>
                <div className="mt-4 text-base font-medium text-foreground">
                  No documents yet
                </div>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  Add a document from the header to populate this list.
                </p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="mt-5 flex min-h-[300px] flex-col items-center justify-center rounded-[26px] border border-dashed bg-background px-6 text-center">
                <div className="rounded-2xl border bg-card p-3 text-muted-foreground">
                  <Search className="h-4 w-4" strokeWidth={1.8} />
                </div>
                <div className="mt-4 text-base font-medium text-foreground">
                  No matches found
                </div>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  Try a filename or key fragment.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3 xl:max-h-[calc(100svh-11.5rem)] xl:overflow-auto xl:pr-1">
                {filteredDocuments.map((document) => {
                  const DocumentIcon = getDocumentIcon(document);
                  const isActive = selectedDocument?.id === document.id;

                  return (
                    <div
                      key={document.id}
                      onClick={() => setSelectedDocumentId(document.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedDocumentId(document.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "group cursor-pointer rounded-[24px] border px-4 py-4 text-left outline-none transition-colors",
                        "focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/30",
                        isActive
                          ? "border-primary/45 bg-primary/5"
                          : "bg-background hover:bg-muted/60"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "rounded-2xl border p-2.5 text-muted-foreground transition-colors",
                            isActive ? "bg-card text-primary" : "bg-card"
                          )}
                        >
                          <DocumentIcon className="h-4 w-4" strokeWidth={1.8} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-foreground">
                                {document.name}
                              </div>
                              {document.description ? (
                                <div className="mt-1 truncate text-sm text-muted-foreground">
                                  {document.description}
                                </div>
                              ) : null}
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                  {getDocumentLabel(document)}
                                </span>
                                <span className="rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-primary/80">
                                  {document.status}
                                </span>
                              </div>
                            </div>

                            <div className="text-right text-xs text-muted-foreground">
                              <div>{formatDocumentSize(document.size)}</div>
                              <div className="mt-1">{formatUploadedAt(document.uploadedAt)}</div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Link2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                            <span className="truncate font-mono">{document.objectKey}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteDocument(document.id);
                          }}
                          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={`Remove ${document.name}`}
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-[30px] border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary/80">
                  View
                </div>
                <h2 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.04em] text-foreground">
                  {selectedDocument ? selectedDocument.name : "Preview"}
                </h2>
                {selectedDocument?.description ? (
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    {selectedDocument.description}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedDocument ? (
                  <>
                    <span className="rounded-full border bg-background px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {getDocumentLabel(selectedDocument)}
                    </span>
                    <span className="rounded-full border bg-background px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary/80">
                      {selectedDocument.status}
                    </span>
                  </>
                ) : null}

                {selectedDocument?.previewUrl ? (
                  <a
                    href={selectedDocument.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Open file
                  </a>
                ) : null}
              </div>
            </div>

            {selectedDocument ? (
              <div className="mt-5 space-y-5">
                <DocumentPreview document={selectedDocument} />

                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-5">
                  <div className="rounded-[22px] border bg-background px-4 py-4">
                    <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Type
                    </div>
                    <div className="mt-2 text-sm font-medium text-foreground">
                      {getDocumentLabel(selectedDocument)}
                    </div>
                  </div>
                  <div className="rounded-[22px] border bg-background px-4 py-4">
                    <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Size
                    </div>
                    <div className="mt-2 text-sm font-medium text-foreground">
                      {formatDocumentSize(selectedDocument.size)}
                    </div>
                  </div>
                  <div className="rounded-[22px] border bg-background px-4 py-4">
                    <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Uploaded
                    </div>
                    <div className="mt-2 text-sm font-medium text-foreground">
                      {formatUploadedAt(selectedDocument.uploadedAt)}
                    </div>
                  </div>
                  <div className="rounded-[22px] border bg-background px-4 py-4">
                    <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Text source
                    </div>
                    <div className="mt-2 text-sm font-medium text-foreground">
                      {getTextSourceLabel(selectedDocument)}
                    </div>
                  </div>
                  <div className="rounded-[22px] border bg-background px-4 py-4">
                    <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Chunks
                    </div>
                    <div className="mt-2 text-sm font-medium text-foreground">
                      {selectedDocument.chunkCount}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="rounded-[22px] border bg-background px-4 py-4">
                    <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Storage object key
                    </div>
                    <div className="mt-3 break-all font-mono text-sm text-foreground">
                      {selectedDocument.objectKey}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-muted-foreground">
                      Checksum {selectedDocument.checksumSha256}
                    </div>
                    {selectedDocument.indexingError ? (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {selectedDocument.indexingError}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-[22px] border bg-background p-4">
                    <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Actions
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      {selectedDocument.previewUrl ? (
                        <a
                          href={selectedDocument.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open object
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleDeleteDocument(selectedDocument.id)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove file
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex min-h-[520px] flex-col items-center justify-center rounded-[28px] border border-dashed bg-background px-8 text-center">
                <div className="rounded-2xl border bg-card p-4 text-primary/80">
                  <FileSearch className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div className="mt-5 text-xl font-medium text-foreground">
                  Nothing selected
                </div>
                <p className="mt-3 max-w-md text-sm text-muted-foreground">
                  Pick a document from the list to inspect it here.
                </p>
              </div>
            )}
          </section>
        </div>

        <AddDocumentModal
          isOpen={isAddModalOpen}
          phase={uploadPhase === "uploading" ? "uploading" : "form"}
          error={uploadError}
          selectedFile={draftFile}
          name={draftName}
          description={draftDescription}
          onClose={closeUploadModal}
          onNameChange={setDraftName}
          onDescriptionChange={setDraftDescription}
          onFileChange={(file) => {
            setDraftFile(file);
            if (file) {
              setUploadError("");
            }
          }}
          onSubmit={handleUpload}
        />
      </div>
    </main>
  );
}
