import { useEffect, useId, useState } from 'react'

interface Props {
  content: string
  onChange: (content: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  textareaRef?: (el: HTMLTextAreaElement | null) => void
}

export function MermaidBlock({ content, onChange, onKeyDown, textareaRef }: Props) {
  const reactId = useId().replace(/:/g, '')
  const [editing, setEditing] = useState(!content)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editing) return
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const mermaid = (await import('mermaid')).default
        const dark = document.documentElement.classList.contains('dark')
        mermaid.initialize({
          startOnLoad: false,
          theme: dark ? 'dark' : 'neutral',
          securityLevel: 'loose',
          fontFamily: 'Inter, system-ui, sans-serif',
        })
        const id = `mmd-${reactId}-${Date.now()}`
        const { svg: out } = await mermaid.render(
          id,
          content || 'graph TD\n  A[Start] --> B[End]',
        )
        if (!cancelled) {
          setSvg(out)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Mermaid 렌더 오류')
          setSvg('')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [content, editing, reactId])

  return (
    <div className="w-full overflow-hidden rounded-xl border border-[var(--color-border)]">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-hover)] px-3 py-1.5">
        <span className="text-xs font-medium text-[var(--color-muted)]">Mermaid</span>
        <div className="flex-1" />
        <button
          type="button"
          className="rounded px-2 py-0.5 text-xs text-[var(--color-muted)] hover:bg-[var(--color-panel)]"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? '미리보기' : '소스 편집'}
        </button>
      </div>
      {editing ? (
        <textarea
          ref={textareaRef}
          className="block-input min-h-[120px] w-full resize-y p-3 font-mono text-sm"
          value={content}
          spellCheck={false}
          placeholder={'flowchart LR\n  A --> B'}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
      ) : (
        <div
          className="cursor-text overflow-x-auto bg-[var(--color-panel)] p-4"
          onClick={() => setEditing(true)}
        >
          {loading && (
            <div className="text-sm text-[var(--color-muted)]">다이어그램 렌더 중…</div>
          )}
          {error ? (
            <pre className="whitespace-pre-wrap text-sm text-[var(--color-danger)]">{error}</pre>
          ) : (
            <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
          )}
        </div>
      )}
    </div>
  )
}
