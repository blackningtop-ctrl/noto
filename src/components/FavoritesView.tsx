import { useStore, useActivePages } from '../store'
import { Star } from 'lucide-react'

export function FavoritesView() {
  const pages = useActivePages().filter((p) => p.favorite)
  const setView = useStore((s) => s.setView)
  const toggleFavorite = useStore((s) => s.toggleFavorite)

  return (
    <div className="fade-in mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold">즐겨찾기</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">자주 여는 페이지를 모아 둡니다.</p>

      {pages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-16 text-center text-sm text-[var(--color-muted)]">
          아직 즐겨찾기가 없습니다. 페이지에서 ⭐ 를 눌러 추가하세요.
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-3"
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => setView({ kind: 'page', pageId: p.id })}
              >
                <span className="text-xl">{p.icon}</span>
                <span className="truncate font-medium">{p.title || '제목 없음'}</span>
              </button>
              <button
                type="button"
                className="rounded-lg p-1.5 text-amber-500 hover:bg-[var(--color-hover)]"
                onClick={() => toggleFavorite(p.id)}
              >
                <Star size={16} fill="currentColor" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
