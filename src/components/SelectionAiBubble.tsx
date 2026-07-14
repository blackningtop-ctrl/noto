import { useEffect, useState } from 'react'
import { useSelectionStore } from '../lib/selection-store'
import { hasXaiApiKey } from '../lib/ai-key'
import { Sparkles } from 'lucide-react'

/**
 * Floating button near text selection to open AI on that selection.
 */
export function SelectionAiBubble({
  pageId,
  onOpenAi,
}: {
  pageId: string
  onOpenAi: () => void
}) {
  const text = useSelectionStore((s) => s.text)
  const rect = useSelectionStore((s) => s.rect)
  const selPageId = useSelectionStore((s) => s.pageId)
  const requestAiOpen = useSelectionStore((s) => s.requestAiOpen)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const ok =
      !!text.trim() &&
      text.trim().length >= 2 &&
      selPageId === pageId &&
      !!rect &&
      hasXaiApiKey()
    setVisible(ok)
  }, [text, rect, selPageId, pageId])

  if (!visible || !rect) return null

  const top = Math.max(8, rect.top - 44)
  const left = Math.min(
    window.innerWidth - 120,
    Math.max(8, rect.left + rect.width / 2 - 52),
  )

  return (
    <button
      type="button"
      className="selection-ai-bubble fixed z-50 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)] shadow-lg transition hover:bg-[var(--color-accent-soft)]"
      style={{ top, left }}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        requestAiOpen()
        onOpenAi()
      }}
    >
      <Sparkles size={14} />
      선택 AI
    </button>
  )
}
