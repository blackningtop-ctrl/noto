import { useMemo, useState } from 'react'
import { useStore, useActivePages } from '../store'
import { findPageByWikiTitle, parseWikiSegments } from '../lib/wiki'
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
  multiline = true,
}: Props) {
  const [focused, setFocused] = useState(false)
  const pages = useActivePages()
  const setView = useStore((s) => s.setView)
  const createPage = useStore((s) => s.createPage)
  const segments = useMemo(() => parseWikiSegments(value), [value])
  const hasWiki = segments.some((s) => s.kind === 'wiki')

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

  if (!focused && hasWiki && value) {
    return (
      <div
        className={clsx('block-input whitespace-pre-wrap', className)}
        onClick={() => setFocused(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setFocused(true)
        }}
      >
        {segments.map((seg, i) =>
          seg.kind === 'text' ? (
            <span key={i}>{seg.value}</span>
          ) : (
            <button
              key={i}
              type="button"
              className="wiki-link"
              onClick={(e) => {
                e.stopPropagation()
                openOrCreate(seg.value)
              }}
              title={
                findPageByWikiTitle(pages, seg.value)
                  ? `열기: ${seg.value}`
                  : `없는 페이지 (클릭하여 생성): ${seg.value}`
              }
            >
              {seg.value}
            </button>
          ),
        )}
      </div>
    )
  }

  return (
    <textarea
      ref={(el) => {
        textareaRef?.(el)
        if (el && focused) {
          el.focus()
          const len = el.value.length
          el.setSelectionRange(len, len)
        }
      }}
      className={clsx('block-input', className)}
      rows={multiline ? 1 : 1}
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
