import { create } from 'zustand'
export type TabId =
  | 'library' | 'schedule' | 'upload' | 'create-exam' | 'my-exams'
  | 'take-exam' | 'review' | 'results' | 'admin' | 'book-library'
  | 'verifications' | 'forum' | 'sessions' | 'my-sessions'
interface State {
  tab: TabId; setTab: (t: TabId) => void
  nonce: number; bump: () => void
}
export const useStore = create<State>(set => ({
  tab: 'library', setTab: t => set({ tab: t }),
  nonce: 0, bump: () => set(s => ({ nonce: s.nonce + 1 })),
}))
