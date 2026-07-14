import { useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { CODE_LANGUAGES, highlightCode } from '../lib/highlight'
import clsx from 'clsx'

interface Props {
  content: string
  language?: string
  onChange: (content: string) => void
  onLanguageChange: (language: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  textareaRef?: (el: HTMLTextAreaElement | null) => void
}

export function CodeBlock({
  content,
  language = 'typescript',
  onChange,
  onLanguageChange,
  onKeyDown,
  textareaRef,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(!content)
  const lines = content.split('\n')
  const html = useMemo(() => highlightCode(content || ' ', language), [content, language])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="code-block w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-hover)]">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-1.5">
        <select
          className="rounded-md border-none bg-transparent text-xs font-medium text-[var(--color-muted)] outline-none"
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
        >
          {CODE_LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          type="button"
          className="rounded px-2 py-0.5 text-xs text-[var(--color-muted)] hover:bg-[var(--color-panel)]"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? '미리보기' : '편집'}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-[var(--color-muted)] hover:bg-[var(--color-panel)]"
          onClick={copy}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>

      {editing ? (
        <div className="flex min-h-[88px]">
          <div
            className="select-none border-r border-[var(--color-border)] px-2 py-3 text-right font-mono text-xs leading-6 text-[var(--color-muted)]"
            aria-hidden
          >
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            className="block-input flex-1 resize-y font-mono text-sm leading-6"
            style={{ minHeight: 88 }}
            value={content}
            spellCheck={false}
            placeholder="// 코드 입력…"
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
      ) : (
        <div
          className="code-pre relative cursor-text overflow-x-auto p-3 font-mono text-sm leading-6"
          onClick={() => setEditing(true)}
        >
          <div className="flex">
            <div className="mr-3 select-none text-right text-xs leading-6 text-[var(--color-muted)]">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <pre className="m-0 flex-1 overflow-x-auto">
              <code
                className={clsx('hljs', `language-${language}`)}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
