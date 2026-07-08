"use client";
import { create } from "zustand";

export type TabId =
  | "library"
  | "upload"
  | "create-exam"
  | "my-exams"
  | "take-exam"
  | "review"
  | "results"
  | "admin";

interface ExamHubState {
  tab: TabId;
  setTab: (t: TabId) => void;
  // refresh nonce — bump to trigger refetch across tabs
  nonce: number;
  bump: () => void;
}

export const useExamHub = create<ExamHubState>((set) => ({
  tab: "library",
  setTab: (t) => set({ tab: t }),
  nonce: 0,
  bump: () => set((s) => ({ nonce: s.nonce + 1 })),
}));
