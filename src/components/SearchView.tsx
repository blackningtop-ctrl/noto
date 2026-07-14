import { useMemo, useEffect, useRef } from 'react'
import { useStore, useActivePages } from '../store'
import { searchPages } from '../lib/search'
import { Search } from 'lucide-react'

export function SearchView() {
  const query = useStore((s) => s.searchQuery)
  const setSearchQuery = useStore((s) => s.setSearchQuery)
  const setView = useStore((s) => s.setView)
  const pages = useActivePages()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo(() => searchPages(pages, query, 50), [pages, query])

  return (
    <div className="fade-in mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 shadow-sm">
        <Search size={18} className="text-[var(--color-muted)]" />
        <input
          ref={inputRef}
          className="w-full border-none bg-transparent outline-none"
          placeholder="제목 · 본문 · DB 행 검색 (랭킹)…"
          value={query}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        {results.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-[var(--color-muted)]">
            검색 결과가 없습니다.
          </p>
        ) : (
          results.map((hit) => (
            <button
              key={hit.page.id}
              type="button"
              className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-[var(--color-hover)]"
              onClick={() => setView({ kind: 'page', pageId: hit.page.id })}
            >
              <span className="text-xl">{hit.page.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{hit.page.title || '제목 없음'}</span>
                <span className="mt-0.5 block truncate text-xs text-[var(--color-muted)]">
                  {hit.page.type === 'database' ? 'DB' : 'Page'} · {hit.match}
                  {hit.score > 0 ? ` · score ${hit.score}` : ''} · {hit.snippet}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
