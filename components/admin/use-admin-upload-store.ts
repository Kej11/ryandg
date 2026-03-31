"use client";

import { create } from "zustand";

export type AdminUploadPhase = "closed" | "form" | "uploading";

type AdminUploadStore = {
  phase: AdminUploadPhase;
  draftFile: File | null;
  draftName: string;
  draftDescription: string;
  error: string;
  openForm: () => void;
  close: () => void;
  setDraftName: (value: string) => void;
  setDraftDescription: (value: string) => void;
  setDraftFile: (file: File | null) => void;
  setError: (value: string) => void;
  beginUpload: () => void;
  failUpload: (message: string) => void;
  completeUpload: () => void;
};

const initialState = {
  phase: "closed" as const,
  draftFile: null,
  draftName: "",
  draftDescription: "",
  error: ""
};

export const useAdminUploadStore = create<AdminUploadStore>((set) => ({
  ...initialState,
  openForm: () =>
    set((state) => ({
      ...state,
      phase: "form",
      error: ""
    })),
  close: () =>
    set({
      ...initialState
    }),
  setDraftName: (value) =>
    set({
      draftName: value
    }),
  setDraftDescription: (value) =>
    set({
      draftDescription: value
    }),
  setDraftFile: (file) =>
    set({
      draftFile: file
    }),
  setError: (value) =>
    set({
      error: value
    }),
  beginUpload: () =>
    set((state) => ({
      ...state,
      phase: "uploading",
      error: ""
    })),
  failUpload: (message) =>
    set((state) => ({
      ...state,
      phase: "form",
      error: message
    })),
  completeUpload: () =>
    set({
      ...initialState
    })
}));
