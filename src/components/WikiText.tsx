import { useMemo, useState } from 'react'
import { useStore, useActivePages } from '../store'
import { findPageByWikiTitle } from '../lib/wiki'
import { hasInlineMarkup, parseInline } from '../lib/inline-format'
import clsx from 'clsx'

interface Props {
  value: string
  className?: string
  placeholder?: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  textareaRef?: (el: HTMLTextAreaElement | null) => void
  multiline?: boolean
}

export function WikiText({
  value,
  className,
  placeholder,
  onChange,
  onKeyDown,
  textareaRef,
}: Props) {
  const [focused, setFocused] = useState(false)
  const pages = useActivePages()
  const setView = useStore((s) => s.setView)
  const createPage = useStore((s) => s.createPage)
  const segments = useMemo(() => parseInline(value), [value])
  const showRich = !focused && !!value && hasInlineMarkup(value)

  const openOrCreate = (title: string) => {
    const found = findPageByWikiTitle(pages, title)
    if (found) {
      setView({ kind: 'page', pageId: found.id })
      return
    }
    if (confirm(`"${title}" 페이지가 없습니다. 새로 만들까요?`)) {
      const id = createPage({ title })
      setView({ kind: 'page', pageId: id })
    }
  }

  if (showRich) {
    return (
      <div
        className={clsx('block-input whitespace-pre-wrap', className)}
        onClick={() => setFocused(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setFocused(true)
          }
        }}
      >
        {segments.map((seg, i) => {
          if (seg.kind === 'text') return <span key={i}>{seg.value}</span>
          if (seg.kind === 'bold')
            return (
              <strong key={i} className="font-semibold">
                {seg.value}
              </strong>
            )
          if (seg.kind === 'italic')
            return (
              <em key={i} className="italic">
                {seg.value}
              </em>
            )
          if (seg.kind === 'code')
            return (
              <code
                key={i}
                className="rounded bg-[var(--color-hover)] px-1 py-0.5 font-mono text-[0.9em]"
              >
                {seg.value}
              </code>
            )
          const exists = !!findPageByWikiTitle(pages, seg.value)
          return (
            <button
              key={i}
              type="button"
              className={clsx('wiki-link', !exists && 'wiki-link-missing')}
              onClick={(e) => {
                e.stopPropagation()
                openOrCreate(seg.value)
              }}
              title={exists ? `열기: ${seg.value}` : `없는 페이지 (생성): ${seg.value}`}
            >
              {seg.value}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <textarea
      ref={(el) => {
        textareaRef?.(el)
        if (el && focused) {
          el.focus()
          // keep caret at end only on first focus from rich mode
        }
        if (el) {
          el.style.height = 'auto'
          el.style.height = `${el.scrollHeight}px`
        }
      }}
      className={clsx('block-input', className)}
      rows={1}
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        onChange(e.target.value)
        e.target.style.height = 'auto'
        e.target.style.height = `${e.target.scrollHeight}px`
      }}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}
