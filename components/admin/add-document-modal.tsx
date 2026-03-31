"use client";

import { FileUp, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDocumentSize } from "@/lib/admin-memory";
import { cn } from "@/lib/utils";

function getSuggestedName(fileName: string) {
  const stripped = fileName.replace(/\.[^.]+$/, "").trim();

  return stripped || fileName;
}

export function AddDocumentModal({
  isOpen,
  phase,
  error,
  selectedFile,
  name,
  description,
  onClose,
  onNameChange,
  onDescriptionChange,
  onFileChange,
  onSubmit
}: {
  isOpen: boolean;
  phase: "form" | "uploading";
  error: string;
  selectedFile: File | null;
  name: string;
  description: string;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  onSubmit: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  const uploadLabel = name.trim() || selectedFile?.name || "Preparing upload";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/12 px-4 py-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-document-title"
        className={cn(
          "w-full rounded-[28px] border bg-card shadow-sm transition-[max-width,padding] duration-200",
          phase === "uploading" ? "max-w-md p-5 sm:p-6" : "max-w-xl p-6 sm:p-7"
        )}
      >
        {phase === "uploading" ? (
          <div>
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border bg-background p-3 text-primary">
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary/80">
                  Uploading document
                </div>
                <h2
                  id="add-document-title"
                  className="mt-2 text-[1.4rem] font-semibold tracking-[-0.04em] text-foreground"
                >
                  {uploadLabel}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Saving the original file, extracting text, and building the search
                  index.
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-full border bg-background">
              <div className="admin-upload-progress-track">
                <div className="admin-upload-progress-bar" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {selectedFile ? (
                <>
                  <span className="rounded-full border bg-background px-3 py-1.5">
                    {selectedFile.type || "Unknown type"}
                  </span>
                  <span className="rounded-full border bg-background px-3 py-1.5">
                    {formatDocumentSize(selectedFile.size)}
                  </span>
                </>
              ) : null}
              <span className="rounded-full border bg-background px-3 py-1.5">
                Search index in progress
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary/80">
                  Add document
                </div>
                <h2
                  id="add-document-title"
                  className="mt-2 text-[1.65rem] font-semibold tracking-[-0.04em] text-foreground"
                >
                  New upload
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close add document modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="document-name"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Name
                </label>
                <input
                  id="document-name"
                  value={name}
                  onChange={(event) => onNameChange(event.target.value)}
                  placeholder="Document title"
                  className="h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="document-description"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Description
                </label>
                <textarea
                  id="document-description"
                  value={description}
                  onChange={(event) => onDescriptionChange(event.target.value)}
                  placeholder="Short note for this document"
                  rows={4}
                  className="w-full rounded-md border bg-background px-3 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  File
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[22px] border bg-background px-4 py-4 transition-colors hover:bg-muted/60">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-2xl border bg-card p-3 text-primary">
                      <FileUp className="h-4 w-4" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {selectedFile ? selectedFile.name : "Choose a file"}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {selectedFile
                          ? `${selectedFile.type || "Unknown type"} • ${formatDocumentSize(selectedFile.size)}`
                          : "Markdown, PDF, images, and other files supported"}
                      </div>
                    </div>
                  </div>

                  <span className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    Browse
                  </span>

                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null;

                      onFileChange(nextFile);
                      event.target.value = "";

                      if (!nextFile) {
                        return;
                      }

                      if (!name.trim()) {
                        onNameChange(getSuggestedName(nextFile.name));
                      }
                    }}
                  />
                </label>
              </div>

              {error ? (
                <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" size="lg" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" size="lg" onClick={onSubmit}>
                Upload document
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
