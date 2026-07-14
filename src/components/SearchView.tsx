import { useMemo, useEffect, useRef } from 'react'
import { useStore, useActivePages } from '../store'
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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return pages.slice(0, 20)
    return pages.filter((p) => {
      const inTitle = p.title.toLowerCase().includes(q)
      const inBlocks = p.blocks.some((b) => b.content.toLowerCase().includes(q))
      const inDb = p.database?.rows.some((r) =>
        Object.values(r.values).some((v) => String(v ?? '').toLowerCase().includes(q)),
      )
      return inTitle || inBlocks || inDb
    })
  }, [pages, query])

  return (
    <div className="fade-in mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 shadow-sm">
        <Search size={18} className="text-[var(--color-muted)]" />
        <input
          ref={inputRef}
          className="w-full border-none bg-transparent outline-none"
          placeholder="페이지, 블록, 데이터베이스 검색…"
          value={query}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        {results.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-[var(--color-muted)]">검색 결과가 없습니다.</p>
        ) : (
          results.map((p) => (
            <button
              key={p.id}
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-[var(--color-hover)]"
              onClick={() => setView({ kind: 'page', pageId: p.id })}
            >
              <span className="text-xl">{p.icon}</span>
              <span>
                <span className="block font-medium">{p.title || '제목 없음'}</span>
                <span className="block text-xs text-[var(--color-muted)]">
                  {p.type === 'database' ? '데이터베이스' : '페이지'}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
