"use client";
import { create } from "zustand";

export type TabId =
  | "library"
  | "schedule"
  | "upload"
  | "create-exam"
  | "my-exams"
  | "take-exam"
  | "review"
  | "results"
  | "admin";

export interface LibraryFilter {
  subject?: string;
  level?: string;
}

interface ExamHubState {
  tab: TabId;
  setTab: (t: TabId) => void;
  // refresh nonce — bump to trigger refetch across tabs
  nonce: number;
  bump: () => void;
  // filter applied to Papers Library (set from header nav links)
  libraryFilter: LibraryFilter | null;
  setLibraryFilter: (f: LibraryFilter | null) => void;
}

export const useExamHub = create<ExamHubState>((set) => ({
  tab: "library",
  setTab: (t) => set({ tab: t }),
  nonce: 0,
  bump: () => set((s) => ({ nonce: s.nonce + 1 })),
  libraryFilter: null,
  setLibraryFilter: (f) => set({ libraryFilter: f }),
}));
