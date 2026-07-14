import { useMemo, useState, useEffect } from 'react'
import { useStore, useActivePages } from '../store'
import {
  Database,
  FileText,
  Star,
  Clock,
  ArrowRight,
  Plus,
  Sparkles,
  X,
  Lightbulb,
  LayoutTemplate,
} from 'lucide-react'
import { TEMPLATES, templatesByCategory } from '../lib/templates'

const TIP_KEY = 'noto-welcome-tips-v1'

export function BentoHome() {
  const pages = useActivePages()
  const setView = useStore((s) => s.setView)
  const createPage = useStore((s) => s.createPage)
  const createFromTemplate = useStore((s) => s.createFromTemplate)
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen)
  const [showTips, setShowTips] = useState(false)
  const popular = templatesByCategory('everyday').slice(0, 6)

  useEffect(() => {
    try {
      if (!localStorage.getItem(TIP_KEY)) setShowTips(true)
    } catch {
      setShowTips(true)
    }
  }, [])

  const dismissTips = () => {
    setShowTips(false)
    try {
      localStorage.setItem(TIP_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const recent = useMemo(
    () => [...pages].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8),
    [pages],
  )
  const favorites = pages.filter((p) => p.favorite).slice(0, 4)

  return (
    <div className="fade-in mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="mb-1 text-sm font-medium text-[var(--color-accent)]">무료 노트 앱 · 내 컴퓨터에만 저장</p>
        <h1 className="text-3xl font-bold tracking-tight md:text-[2rem]">안녕! 무엇을 적을까? ✏️</h1>
        <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-[var(--color-muted)]">
          수업 정리, 일기, 할 일 목록을 만들 수 있어요. 복잡하게 쓰지 않아도 괜찮아요.
        </p>
      </header>

      {showTips && (
        <div className="mb-6 rounded-2xl border border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)] p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold">
              <Lightbulb size={18} className="text-[var(--color-accent)]" />
              처음이라면 이것만 알면 돼요
            </div>
            <button
              type="button"
              className="rounded-lg p-1 hover:bg-[var(--color-panel)]"
              onClick={dismissTips}
              aria-label="닫기"
            >
              <X size={16} />
            </button>
          </div>
          <ol className="space-y-1.5 pl-1 text-sm leading-relaxed text-[var(--color-text)]">
            <li>
              <strong>1.</strong> 왼쪽 <strong>+ 버튼</strong>으로 새 노트를 만들어요
            </li>
            <li>
              <strong>2.</strong> 빈 줄에 <strong>/</strong> 를 누르면 제목·목록·할 일을 고를 수 있어요
            </li>
            <li>
              <strong>3.</strong> 위쪽 찾기(<kbd className="rounded bg-[var(--color-panel)] px-1">Ctrl</kbd>
              +<kbd className="rounded bg-[var(--color-panel)] px-1">K</kbd>)로 노트를 빠르게 찾아요
            </li>
          </ol>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-[var(--color-accent)] hover:underline"
            onClick={dismissTips}
          >
            알겠어요, 시작하기 →
          </button>
        </div>
      )}

      {/* Big actions */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => createPage({ type: 'page' })}
          className="home-action group flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5 text-left shadow-sm transition hover:border-[var(--color-accent)] hover:shadow-md"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-white shadow-sm">
            <FileText size={22} />
          </span>
          <span>
            <span className="block text-base font-semibold">새 노트 쓰기</span>
            <span className="mt-0.5 block text-sm text-[var(--color-muted)]">
              일기, 공부 정리, 아이디어
            </span>
          </span>
          <Plus size={18} className="ml-auto text-[var(--color-muted)] group-hover:text-[var(--color-accent)]" />
        </button>
        <button
          type="button"
          onClick={() => createPage({ type: 'database' })}
          className="home-action group flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5 text-left shadow-sm transition hover:border-[var(--color-accent)] hover:shadow-md"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
            <Database size={22} />
          </span>
          <span>
            <span className="block text-base font-semibold">새 표 만들기</span>
            <span className="mt-0.5 block text-sm text-[var(--color-muted)]">
              할 일, 계획표, 체크리스트
            </span>
          </span>
          <Plus size={18} className="ml-auto text-[var(--color-muted)] group-hover:text-[var(--color-accent)]" />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Chip onClick={() => setCommandPaletteOpen(true)}>
          <Sparkles size={14} /> 빠른 찾기
        </Chip>
        <Chip onClick={() => setView({ kind: 'templates' })}>
          <LayoutTemplate size={14} /> 모든 양식 ({TEMPLATES.length})
        </Chip>
        {!showTips && (
          <Chip
            onClick={() => {
              try {
                localStorage.removeItem(TIP_KEY)
              } catch {
                /* ignore */
              }
              setShowTips(true)
            }}
          >
            <Lightbulb size={14} /> 사용 팁 다시 보기
          </Chip>
        )}
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-muted)]">
            <LayoutTemplate size={15} /> 인기 양식
          </h2>
          <button
            type="button"
            className="text-xs font-medium text-[var(--color-accent)] hover:underline"
            onClick={() => setView({ kind: 'templates' })}
          >
            더 보기 →
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {popular.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => createFromTemplate(t.id)}
              className="flex items-center gap-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-3 text-left shadow-sm transition hover:border-[var(--color-accent)]"
            >
              <span className="text-xl">{t.icon}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{t.name}</span>
                <span className="block truncate text-[11px] text-[var(--color-muted)]">
                  {t.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-muted)]">
            <Clock size={15} /> 최근 노트
          </h2>
          {recent.length === 0 ? (
            <EmptyCard text="아직 노트가 없어요. 위에서 새 노트를 만들어 보세요!" />
          ) : (
            <div className="space-y-1.5">
              {recent.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-left transition hover:border-[var(--color-border)] hover:bg-[var(--color-hover)]"
                  onClick={() => setView({ kind: 'page', pageId: p.id })}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-hover)] text-lg">
                    {p.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.title || '제목 없음'}</span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      {p.type === 'database' ? '표' : '노트'} ·{' '}
                      {new Date(p.updatedAt).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                  <ArrowRight size={14} className="text-[var(--color-muted)]" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-muted)]">
            <Star size={15} className="text-amber-500" /> 즐겨찾기
          </h2>
          {favorites.length === 0 ? (
            <EmptyCard text="노트를 열고 ⭐ 를 누르면 여기에 모아요." />
          ) : (
            <div className="space-y-1.5">
              {favorites.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2.5 text-left hover:border-[var(--color-accent)]"
                  onClick={() => setView({ kind: 'page', pageId: p.id })}
                >
                  <span className="text-lg">{p.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.title}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-hover)]/50 p-4 text-sm text-[var(--color-muted)]">
            <p className="font-medium text-[var(--color-text)]">작은 팁</p>
            <ul className="mt-2 space-y-1.5">
              <li>· 빈 줄에 <code className="rounded bg-[var(--color-panel)] px-1">/</code> 입력</li>
              <li>· 왼쪽 노트를 끌어다 놓아 정리</li>
              <li>· 중요한 노트는 ⭐ 즐겨찾기</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}

function Chip({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
    >
      {children}
    </button>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
      {text}
    </div>
  )
}
