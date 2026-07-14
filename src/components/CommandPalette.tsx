import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore, useActivePages } from '../store'
import { TEMPLATES } from '../lib/templates'
import { pageToMarkdown, markdownToBlocks, parseMarkdownTitle } from '../lib/markdown'
import {
  FileText,
  Database,
  Home,
  Moon,
  Sun,
  Star,
  Trash2,
  Download,
  Upload,
  LayoutTemplate,
  FileCode2,
  Search,
  Network,
  Code2,
  Camera,
} from 'lucide-react'
import clsx from 'clsx'

interface Item {
  id: string
  group: string
  label: string
  hint?: string
  icon: React.ReactNode
  run: () => void
}

interface Props {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const pages = useActivePages()
  const setView = useStore((s) => s.setView)
  const createPage = useStore((s) => s.createPage)
  const createFromTemplate = useStore((s) => s.createFromTemplate)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const theme = useStore((s) => s.theme)
  const exportData = useStore((s) => s.exportData)
  const importData = useStore((s) => s.importData)
  const view = useStore((s) => s.view)
  const allPages = useStore((s) => s.pages)
  const snippets = useStore((s) => s.snippets)
  const insertSnippetOnPage = useStore((s) => s.insertSnippetOnPage)
  const saveVersion = useStore((s) => s.saveVersion)

  useEffect(() => {
    if (open) {
      setQuery('')
      setIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const items = useMemo(() => {
    const list: Item[] = []

    list.push(
      {
        id: 'home',
        group: '이동',
        label: '홈으로',
        hint: '⌘H',
        icon: <Home size={16} />,
        run: () => setView({ kind: 'home' }),
      },
      {
        id: 'fav',
        group: '이동',
        label: '즐겨찾기',
        icon: <Star size={16} />,
        run: () => setView({ kind: 'favorites' }),
      },
      {
        id: 'trash',
        group: '이동',
        label: '휴지통',
        icon: <Trash2 size={16} />,
        run: () => setView({ kind: 'trash' }),
      },
      {
        id: 'graph',
        group: '이동',
        label: '그래프 뷰',
        icon: <Network size={16} />,
        run: () => setView({ kind: 'graph' }),
      },
      {
        id: 'snippets',
        group: '이동',
        label: '스니펫 라이브러리',
        icon: <Code2 size={16} />,
        run: () => setView({ kind: 'snippets' }),
      },
      {
        id: 'snapshot',
        group: '만들기',
        label: '현재 페이지 버전 스냅샷',
        icon: <Camera size={16} />,
        run: () => {
          if (view.kind !== 'page') {
            alert('페이지를 연 다음 스냅샷하세요.')
            return
          }
          saveVersion(view.pageId, '수동 스냅샷', false)
        },
      },
      {
        id: 'new-page',
        group: '만들기',
        label: '새 페이지',
        icon: <FileText size={16} />,
        run: () => createPage({ type: 'page' }),
      },
      {
        id: 'new-db',
        group: '만들기',
        label: '새 데이터베이스',
        icon: <Database size={16} />,
        run: () => createPage({ type: 'database' }),
      },
      {
        id: 'theme',
        group: '설정',
        label: theme === 'dark' ? '라이트 모드' : '다크 모드',
        icon: theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />,
        run: () => toggleTheme(),
      },
      {
        id: 'export-json',
        group: '내보내기',
        label: '워크스페이스 JSON 내보내기',
        icon: <Download size={16} />,
        run: () => {
          const blob = new Blob([exportData()], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `noto-backup-${new Date().toISOString().slice(0, 10)}.json`
          a.click()
          URL.revokeObjectURL(url)
        },
      },
      {
        id: 'import-json',
        group: '내보내기',
        label: 'JSON 가져오기',
        icon: <Upload size={16} />,
        run: () => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'application/json,.json'
          input.onchange = async () => {
            const file = input.files?.[0]
            if (!file) return
            const text = await file.text()
            if (!importData(text)) alert('JSON 가져오기 실패')
          }
          input.click()
        },
      },
      {
        id: 'export-md',
        group: '내보내기',
        label: '현재 페이지 Markdown 내보내기',
        icon: <FileCode2 size={16} />,
        run: () => {
          if (view.kind !== 'page') {
            alert('페이지를 연 다음 내보내세요.')
            return
          }
          const page = allPages.find((p) => p.id === view.pageId)
          if (!page) return
          const md = pageToMarkdown(page)
          const blob = new Blob([md], { type: 'text/markdown' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${(page.title || 'page').replace(/[\\/:*?"<>|]/g, '_')}.md`
          a.click()
          URL.revokeObjectURL(url)
        },
      },
      {
        id: 'import-md',
        group: '내보내기',
        label: 'Markdown 파일 가져와 페이지 생성',
        icon: <Upload size={16} />,
        run: () => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = '.md,text/markdown'
          input.onchange = async () => {
            const file = input.files?.[0]
            if (!file) return
            const text = await file.text()
            const title =
              parseMarkdownTitle(text) || file.name.replace(/\.md$/i, '') || 'Imported'
            const id = createPage({ title, type: 'page' })
            useStore.getState().setBlocks(id, markdownToBlocks(text))
          }
          input.click()
        },
      },
    )

    for (const t of TEMPLATES) {
      list.push({
        id: `tpl-${t.id}`,
        group: '템플릿',
        label: t.name,
        hint: t.description,
        icon: <LayoutTemplate size={16} />,
        run: () => createFromTemplate(t.id),
      })
    }

    for (const sn of snippets) {
      list.push({
        id: `snip-${sn.id}`,
        group: '스니펫 삽입',
        label: sn.name,
        hint: sn.language,
        icon: <Code2 size={16} />,
        run: () => {
          if (view.kind !== 'page') {
            alert('페이지를 연 다음 스니펫을 삽입하세요.')
            setView({ kind: 'snippets' })
            return
          }
          insertSnippetOnPage(view.pageId, sn.id)
        },
      })
    }

    for (const p of pages) {
      list.push({
        id: `page-${p.id}`,
        group: '페이지',
        label: `${p.icon} ${p.title || '제목 없음'}`,
        hint: p.type === 'database' ? 'DB' : 'Page',
        icon: <Search size={16} />,
        run: () => setView({ kind: 'page', pageId: p.id }),
      })
    }

    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.group.toLowerCase().includes(q) ||
        (i.hint && i.hint.toLowerCase().includes(q)) ||
        i.id.toLowerCase().includes(q),
    )
  }, [
    pages,
    query,
    theme,
    view,
    allPages,
    snippets,
    setView,
    createPage,
    createFromTemplate,
    toggleTheme,
    exportData,
    importData,
    insertSnippetOnPage,
    saveVersion,
  ])

  useEffect(() => setIndex(0), [query])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = items[index]
        if (item) {
          item.run()
          onClose()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, items, index, onClose])

  if (!open) return null

  let lastGroup = ''

  return (
    <div className="cmd-overlay" onMouseDown={onClose}>
      <div
        className="cmd-panel"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="커맨드 팔레트"
      >
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
          <Search size={16} className="text-[var(--color-muted)]" />
          <input
            ref={inputRef}
            className="w-full border-none bg-transparent text-base outline-none"
            placeholder="페이지, 템플릿, 액션 검색…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)]">
            ESC
          </kbd>
        </div>
        <div className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-[var(--color-muted)]">결과 없음</div>
          ) : (
            items.map((item, i) => {
              const showGroup = item.group !== lastGroup
              lastGroup = item.group
              return (
                <div key={item.id}>
                  {showGroup && (
                    <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                      {item.group}
                    </div>
                  )}
                  <button
                    type="button"
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm',
                      i === index ? 'bg-[var(--color-accent-soft)]' : 'hover:bg-[var(--color-hover)]',
                    )}
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => {
                      item.run()
                      onClose()
                    }}
                  >
                    <span className="text-[var(--color-muted)]">{item.icon}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                    {item.hint && (
                      <span className="truncate text-xs text-[var(--color-muted)]">{item.hint}</span>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>
        <div className="border-t border-[var(--color-border)] px-4 py-2 text-[11px] text-[var(--color-muted)]">
          ↑↓ 이동 · Enter 실행 · 템플릿 · Markdown · 페이지 검색
        </div>
      </div>
    </div>
  )
}
