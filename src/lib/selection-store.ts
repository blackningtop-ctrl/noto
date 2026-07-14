import { create } from 'zustand'

export interface TextSelection {
  text: string
  /** viewport coordinates for floating UI */
  rect: { top: number; left: number; width: number; height: number } | null
  blockId: string | null
  pageId: string | null
}

interface SelectionState extends TextSelection {
  setSelection: (sel: Partial<TextSelection> & { text: string }) => void
  clearSelection: () => void
  /** one-shot: open AI panel with this selection */
  pendingAiOpen: boolean
  requestAiOpen: () => void
  consumeAiOpen: () => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  text: '',
  rect: null,
  blockId: null,
  pageId: null,
  pendingAiOpen: false,
  setSelection: (sel) =>
    set((s) => ({
      text: sel.text,
      rect: sel.rect !== undefined ? sel.rect : s.rect,
      blockId: sel.blockId !== undefined ? sel.blockId : s.blockId,
      pageId: sel.pageId !== undefined ? sel.pageId : s.pageId,
    })),
  clearSelection: () =>
    set({ text: '', rect: null, blockId: null, pageId: null }),
  requestAiOpen: () => set({ pendingAiOpen: true }),
  consumeAiOpen: () => set({ pendingAiOpen: false }),
}))
