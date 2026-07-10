// Re-export from the canonical lib location.
// `useExamHub` is aliased to `useStore` for backward compatibility with
// legacy consumers (e.g. src/components/examhub/ExamHubApp.tsx) — new code
// should import `useStore` directly from `@/lib/store`.
export { useStore as useExamHub, useStore, type TabId } from "@/lib/store";
