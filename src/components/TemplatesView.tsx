import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { TEMPLATES, TEMPLATE_CATEGORIES, type TemplateCategory } from '../lib/templates'
import { LayoutTemplate, Search, FileText, Table2 } from 'lucide-react'
import clsx from 'clsx'

export function TemplatesView() {
  const createFromTemplate = useStore((s) => s.createFromTemplate)
  const [cat, setCat] = useState<TemplateCategory | 'all'>('everyday')
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const base = cat === 'all' ? TEMPLATES : TEMPLATES.filter((t) => t.category === cat)
    const query = q.trim().toLowerCase()
    if (!query) return base
    return base.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.keywords.toLowerCase().includes(query),
    )
  }, [cat, q])

  return (
    <div className="fade-in mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-10">
      <div className="mb-1 flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
        <LayoutTemplate size={16} /> 템플릿
      </div>
      <h1 className="text-2xl font-bold md:text-[1.75rem]">양식 고르기</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-muted)]">
        자주 쓰는 양식과 기능 연습 양식이 있어요. 고르면 새 노트가 바로 만들어져요.
      </p>

      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2.5 shadow-sm">
        <Search size={16} className="text-[var(--color-muted)]" />
        <input
          className="w-full border-none bg-transparent text-sm outline-none"
          placeholder="일기, 수업, 할 일, 버그…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <CatChip active={cat === 'all'} onClick={() => setCat('all')} label="전체" />
        {TEMPLATE_CATEGORIES.map((c) => (
          <CatChip
            key={c.id}
            active={cat === c.id}
            onClick={() => setCat(c.id)}
            label={c.label}
          />
        ))}
      </div>

      {cat !== 'all' && (
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          {TEMPLATE_CATEGORIES.find((c) => c.id === cat)?.hint}
        </p>
      )}

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {list.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-[var(--color-border)] py-12 text-center text-sm text-[var(--color-muted)]">
            검색 결과가 없어요. 다른 단어를 쳐 보세요.
          </div>
        ) : (
          list.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => createFromTemplate(t.id)}
              className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 text-left shadow-sm transition hover:border-[var(--color-accent)] hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-hover)] text-xl">
                {t.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold">{t.name}</span>
                  <span className="rounded bg-[var(--color-hover)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)]">
                    {t.kind === 'database' ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Table2 size={10} /> 표
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5">
                        <FileText size={10} /> 노트
                      </span>
                    )}
                  </span>
                </span>
                <span className="mt-0.5 block text-sm text-[var(--color-muted)]">
                  {t.description}
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
        총 {TEMPLATES.length}개 · Ctrl+K 에서도 「템플릿」으로 검색할 수 있어요
      </p>
    </div>
  )
}

function CatChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'rounded-full px-3 py-1.5 text-xs font-medium transition',
        active
          ? 'bg-[var(--color-accent)] text-white'
          : 'border border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-muted)] hover:border-[var(--color-accent)]',
      )}
    >
      {label}
    </button>
  )
}
