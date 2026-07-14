import { useMemo } from 'react'
import { useStore, useActivePages } from '../store'
import {
  Database,
  FileText,
  Star,
  Clock,
  Sparkles,
  ArrowRight,
  Keyboard,
  Shield,
  HardDrive,
} from 'lucide-react'

export function BentoHome() {
  const pages = useActivePages()
  const setView = useStore((s) => s.setView)
  const createPage = useStore((s) => s.createPage)

  const recent = useMemo(
    () => [...pages].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6),
    [pages],
  )
  const favorites = pages.filter((p) => p.favorite).slice(0, 4)
  const dbs = pages.filter((p) => p.type === 'database')
  const pageCount = pages.filter((p) => p.type === 'page').length

  return (
    <div className="fade-in mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <p className="mb-2 text-sm font-medium text-[var(--color-accent)]">무료 · 로컬 · 비공개</p>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">안녕하세요 👋</h1>
        <p className="mt-2 max-w-xl text-[var(--color-muted)]">
          Notion 스타일 워크스페이스를 벤토 그리드로 정리했습니다. 모든 데이터는 브라우저에만 저장됩니다.
        </p>
      </header>

      <div className="bento">
        {/* Hero quick actions */}
        <div
          className="bento-card span-8 row-2 relative overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 18%, var(--color-panel)), var(--color-panel) 55%)',
          }}
        >
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-panel)]/80 px-3 py-1 text-xs font-medium backdrop-blur">
                <Sparkles size={12} className="text-[var(--color-accent)]" />
                빠른 시작
              </div>
              <h2 className="text-2xl font-bold">무엇을 만들까요?</h2>
              <p className="mt-2 max-w-md text-sm text-[var(--color-muted)]">
                페이지, 데이터베이스, 칸반 보드까지 — 구독 없이 전부 사용하세요.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <ActionBtn
                icon={<FileText size={16} />}
                label="새 페이지"
                onClick={() => createPage({ type: 'page' })}
              />
              <ActionBtn
                icon={<Database size={16} />}
                label="새 데이터베이스"
                onClick={() => createPage({ type: 'database' })}
              />
              <ActionBtn
                icon={<Keyboard size={16} />}
                label="단축키 가이드"
                onClick={() => {
                  const g = pages.find((p) => p.title.includes('단축키'))
                  if (g) setView({ kind: 'page', pageId: g.id })
                }}
              />
            </div>
          </div>
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle, var(--color-accent), transparent 70%)' }}
          />
        </div>

        {/* Stats */}
        <div className="bento-card span-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-muted)]">워크스페이스</span>
            <HardDrive size={16} className="text-[var(--color-muted)]" />
          </div>
          <div>
            <div className="text-4xl font-bold tabular-nums">{pages.length}</div>
            <div className="mt-1 text-sm text-[var(--color-muted)]">
              페이지 {pageCount} · DB {dbs.length}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
            <Shield size={12} />
            로컬 저장 · 완전 무료
          </div>
        </div>

        {/* Favorites */}
        <div className="bento-card span-4 row-2">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Star size={16} className="text-amber-500" />
            즐겨찾기
          </div>
          {favorites.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">별표를 눌러 자주 쓰는 페이지를 고정하세요.</p>
          ) : (
            <div className="space-y-2">
              {favorites.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-[var(--color-hover)]"
                  onClick={() => setView({ kind: 'page', pageId: p.id })}
                >
                  <span className="text-lg">{p.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.title}</span>
                  <ArrowRight size={14} className="text-[var(--color-muted)]" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent */}
        <div className="bento-card span-8">
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <Clock size={16} className="text-[var(--color-muted)]" />
            최근 편집
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {recent.map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-3 py-3 text-left transition hover:border-[var(--color-accent)] hover:bg-[var(--color-hover)]"
                onClick={() => setView({ kind: 'page', pageId: p.id })}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-hover)] text-xl">
                  {p.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.title || '제목 없음'}</span>
                  <span className="block text-xs text-[var(--color-muted)]">
                    {p.type === 'database' ? '데이터베이스' : '페이지'} ·{' '}
                    {new Date(p.updatedAt).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Feature tiles */}
        <FeatureTile
          className="span-4"
          title="블록 에디터"
          desc="/ 명령, 마크다운, 드래그 정렬, 할 일·코드·콜아웃"
          emoji="✏️"
        />
        <FeatureTile
          className="span-4"
          title="데이터베이스"
          desc="테이블 · 칸반 보드 · 갤러리 뷰, 속성 커스텀"
          emoji="📊"
        />
        <FeatureTile
          className="span-4"
          title="백업"
          desc="JSON 내보내기/가져오기, 브라우저 localStorage"
          emoji="💾"
        />
      </div>
    </div>
  )
}

function ActionBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-panel)] px-3.5 py-2 text-sm font-medium shadow-sm ring-1 ring-[var(--color-border)] transition hover:ring-[var(--color-accent)]"
    >
      {icon}
      {label}
    </button>
  )
}

function FeatureTile({
  title,
  desc,
  emoji,
  className,
}: {
  title: string
  desc: string
  emoji: string
  className?: string
}) {
  return (
    <div className={`bento-card ${className ?? ''}`}>
      <div className="text-2xl">{emoji}</div>
      <h3 className="mt-2 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{desc}</p>
    </div>
  )
}
