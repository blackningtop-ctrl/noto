import { useMemo } from 'react'
import { useStore, useActivePages } from '../store'
import { getBacklinks } from '../lib/wiki'
import type { Page } from '../types'
import { Link2 } from 'lucide-react'

export function Backlinks({ page }: { page: Page }) {
  const pages = useActivePages()
  const setView = useStore((s) => s.setView)
  const backlinks = useMemo(() => getBacklinks(pages, page), [pages, page])

  if (backlinks.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
          <Link2 size={12} /> 백링크
        </div>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          다른 페이지에서 <code className="rounded bg-[var(--color-hover)] px-1">[[{page.title || '제목'}]]</code> 로
          링크하면 여기에 표시됩니다.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
        <Link2 size={12} /> 백링크 · {backlinks.length}
      </div>
      <div className="space-y-1">
        {backlinks.map((p) => (
          <button
            key={p.id}
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-[var(--color-hover)]"
            onClick={() => setView({ kind: 'page', pageId: p.id })}
          >
            <span>{p.icon}</span>
            <span className="truncate font-medium">{p.title || '제목 없음'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
