import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Snippet } from '../types'
import { Plus, Trash2, Copy, Check, Pencil, Code2 } from 'lucide-react'
import { CODE_LANGUAGES } from '../lib/highlight'
import clsx from 'clsx'

export function SnippetsView() {
  const snippets = useStore((s) => s.snippets)
  const addSnippet = useStore((s) => s.addSnippet)
  const updateSnippet = useStore((s) => s.updateSnippet)
  const deleteSnippet = useStore((s) => s.deleteSnippet)
  const insertSnippetOnPage = useStore((s) => s.insertSnippetOnPage)
  const view = useStore((s) => s.view)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return snippets
    return snippets.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.body.toLowerCase().includes(query) ||
        s.tags.some((t) => t.toLowerCase().includes(query)),
    )
  }, [snippets, q])

  const active = editing ? snippets.find((s) => s.id === editing) : null

  const copy = async (s: Snippet) => {
    await navigator.clipboard.writeText(s.body)
    setCopied(s.id)
    setTimeout(() => setCopied(null), 1200)
  }

  return (
    <div className="fade-in mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">코드 모음</h1>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
            자주 쓰는 코드나 문장을 저장해 두고, 노트에 한 번에 넣을 수 있어요. (프로그래밍할 때 편리)
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white"
          onClick={() => {
            const id = addSnippet({
              name: '새 스니펫',
              description: '',
              language: 'typescript',
              body: '',
              tags: [],
            })
            setEditing(id)
          }}
        >
          <Plus size={16} /> 새 스니펫
        </button>
      </div>

      <input
        className="mb-4 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
        placeholder="스니펫 검색…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-12 text-center text-sm text-[var(--color-muted)]">
              스니펫이 없습니다.
            </div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                className={clsx(
                  'flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition',
                  editing === s.id
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                    : 'border-[var(--color-border)] bg-[var(--color-panel)] hover:border-[var(--color-accent)]',
                )}
                onClick={() => setEditing(s.id)}
              >
                <Code2 size={16} className="mt-0.5 shrink-0 text-[var(--color-muted)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className="block truncate text-xs text-[var(--color-muted)]">
                    {s.language}
                    {s.description ? ` · ${s.description}` : ''}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
          {!active ? (
            <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-[var(--color-muted)]">
              왼쪽에서 스니펫을 선택하세요.
            </div>
          ) : (
            <div className="space-y-3">
              <input
                className="w-full border-none bg-transparent text-lg font-semibold outline-none"
                value={active.name}
                onChange={(e) => updateSnippet(active.id, { name: e.target.value })}
              />
              <input
                className="w-full border-none bg-transparent text-sm text-[var(--color-muted)] outline-none"
                value={active.description}
                placeholder="설명"
                onChange={(e) => updateSnippet(active.id, { description: e.target.value })}
              />
              <div className="flex flex-wrap gap-2">
                <select
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-hover)] px-2 py-1 text-xs"
                  value={active.language}
                  onChange={(e) => updateSnippet(active.id, { language: e.target.value })}
                >
                  {[...CODE_LANGUAGES, 'dockerfile', 'markdown'].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                <input
                  className="min-w-[140px] flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-hover)] px-2 py-1 text-xs outline-none"
                  value={active.tags.join(', ')}
                  placeholder="tags (comma)"
                  onChange={(e) =>
                    updateSnippet(active.id, {
                      tags: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
              <textarea
                className="min-h-[220px] w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-hover)] p-3 font-mono text-sm outline-none"
                value={active.body}
                spellCheck={false}
                onChange={(e) => updateSnippet(active.id, { body: e.target.value })}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm text-white"
                  onClick={() => {
                    if (view.kind !== 'page') {
                      alert('먼저 페이지를 연 다음 삽입하세요. (또는 Ctrl+K → 스니펫)')
                      return
                    }
                    insertSnippetOnPage(view.pageId, active.id)
                    alert('현재 페이지에 코드 블록으로 삽입했습니다.')
                  }}
                >
                  <Pencil size={14} /> 현재 페이지에 삽입
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm hover:bg-[var(--color-hover)]"
                  onClick={() => copy(active)}
                >
                  {copied === active.id ? <Check size={14} /> : <Copy size={14} />}
                  복사
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-[var(--color-danger)] hover:bg-[var(--color-hover)]"
                  onClick={() => {
                    if (confirm('스니펫을 삭제할까요?')) {
                      deleteSnippet(active.id)
                      setEditing(null)
                    }
                  }}
                >
                  <Trash2 size={14} /> 삭제
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
