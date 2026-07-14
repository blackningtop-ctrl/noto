import { useMemo, useState } from 'react'
import { useStore, useActivePages } from '../store'
import type { Page } from '../types'
import {
  ChevronDown,
  ChevronRight,
  Home,
  Plus,
  Search,
  Star,
  Trash2,
  Database,
  FileText,
  Download,
  Upload,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
  MoreHorizontal,
  Copy,
  RotateCcw,
} from 'lucide-react'
import clsx from 'clsx'

export function Sidebar() {
  const open = useStore((s) => s.sidebarOpen)
  const setSidebarOpen = useStore((s) => s.setSidebarOpen)
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const createPage = useStore((s) => s.createPage)
  const deletePage = useStore((s) => s.deletePage)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const duplicatePage = useStore((s) => s.duplicatePage)
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const exportData = useStore((s) => s.exportData)
  const importData = useStore((s) => s.importData)
  const resetWorkspace = useStore((s) => s.resetWorkspace)
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen)
  const pages = useActivePages()
  const favorites = pages.filter((p) => p.favorite)
  const roots = pages.filter((p) => !p.parentId)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [menuId, setMenuId] = useState<string | null>(null)

  const childrenOf = useMemo(() => {
    const map: Record<string, Page[]> = {}
    for (const p of pages) {
      if (p.parentId) {
        if (!map[p.parentId]) map[p.parentId] = []
        map[p.parentId].push(p)
      }
    }
    return map
  }, [pages])

  const downloadExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `noto-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      if (!importData(text)) alert('가져오기에 실패했습니다. JSON 형식을 확인하세요.')
    }
    input.click()
  }

  const renderTree = (list: Page[], depth = 0) =>
    list.map((page) => {
      const kids = childrenOf[page.id] ?? []
      const isOpen = expanded[page.id] ?? depth < 1
      const active = view.kind === 'page' && view.pageId === page.id
      return (
        <div key={page.id}>
          <div
            className={clsx(
              'group flex items-center gap-0.5 rounded-lg px-1 py-0.5 text-sm',
              active ? 'bg-[var(--color-hover)] font-medium' : 'hover:bg-[var(--color-hover)]',
            )}
            style={{ paddingLeft: 4 + depth * 12 }}
          >
            <button
              type="button"
              className="rounded p-0.5 text-[var(--color-muted)]"
              onClick={() => setExpanded((e) => ({ ...e, [page.id]: !isOpen }))}
            >
              {kids.length > 0 ? (
                isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
              ) : (
                <span className="inline-block w-3.5" />
              )}
            </button>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-1.5 truncate py-1 text-left"
              onClick={() => setView({ kind: 'page', pageId: page.id })}
            >
              <span>{page.icon}</span>
              <span className="truncate">{page.title || '제목 없음'}</span>
              {page.type === 'database' && (
                <Database size={12} className="shrink-0 text-[var(--color-muted)]" />
              )}
            </button>
            <div className="relative opacity-0 group-hover:opacity-100">
              <button
                type="button"
                className="rounded p-1 hover:bg-[var(--color-border)]"
                onClick={() => setMenuId(menuId === page.id ? null : page.id)}
              >
                <MoreHorizontal size={14} />
              </button>
              {menuId === page.id && (
                <div
                  className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-1 shadow-xl"
                  onMouseLeave={() => setMenuId(null)}
                >
                  <MenuBtn
                    icon={<Plus size={14} />}
                    label="하위 페이지"
                    onClick={() => {
                      createPage({ parentId: page.id })
                      setExpanded((e) => ({ ...e, [page.id]: true }))
                      setMenuId(null)
                    }}
                  />
                  <MenuBtn
                    icon={<Star size={14} />}
                    label={page.favorite ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={() => {
                      toggleFavorite(page.id)
                      setMenuId(null)
                    }}
                  />
                  <MenuBtn
                    icon={<Copy size={14} />}
                    label="복제"
                    onClick={() => {
                      duplicatePage(page.id)
                      setMenuId(null)
                    }}
                  />
                  <MenuBtn
                    icon={<Trash2 size={14} />}
                    label="휴지통으로"
                    danger
                    onClick={() => {
                      deletePage(page.id)
                      setMenuId(null)
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          {isOpen && kids.length > 0 && renderTree(kids, depth + 1)}
        </div>
      )
    })

  if (!open) {
    return (
      <button
        type="button"
        className="fixed left-3 top-3 z-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-2 shadow-sm"
        onClick={() => setSidebarOpen(true)}
        title="사이드바 열기"
      >
        <PanelLeft size={18} />
      </button>
    )
  }

  return (
    <aside
      className="flex h-full w-[260px] shrink-0 flex-col border-r border-[var(--color-border)]"
      style={{ background: 'var(--color-sidebar)' }}
    >
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-text)] text-sm text-[var(--color-panel)]">
            N
          </span>
          Noto
        </div>
        <button
          type="button"
          className="rounded-lg p-1.5 hover:bg-[var(--color-hover)]"
          onClick={() => setSidebarOpen(false)}
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <div className="space-y-0.5 px-2">
        <NavItem
          icon={<Search size={16} />}
          label="커맨드 팔레트"
          onClick={() => setCommandPaletteOpen(true)}
          hint="Ctrl+K"
        />
        <NavItem
          icon={<Search size={16} />}
          label="검색"
          active={view.kind === 'search'}
          onClick={() => setView({ kind: 'search' })}
        />
        <NavItem
          icon={<Home size={16} />}
          label="홈"
          active={view.kind === 'home'}
          onClick={() => setView({ kind: 'home' })}
        />
        <NavItem
          icon={<Star size={16} />}
          label="즐겨찾기"
          active={view.kind === 'favorites'}
          onClick={() => setView({ kind: 'favorites' })}
        />
        <NavItem
          icon={<Trash2 size={16} />}
          label="휴지통"
          active={view.kind === 'trash'}
          onClick={() => setView({ kind: 'trash' })}
        />
      </div>

      {favorites.length > 0 && (
        <div className="mt-4 px-2">
          <div className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            즐겨찾기
          </div>
          {favorites.map((p) => (
            <button
              key={p.id}
              type="button"
              className={clsx(
                'flex w-full items-center gap-2 truncate rounded-lg px-2 py-1.5 text-left text-sm',
                view.kind === 'page' && view.pageId === p.id
                  ? 'bg-[var(--color-hover)] font-medium'
                  : 'hover:bg-[var(--color-hover)]',
              )}
              onClick={() => setView({ kind: 'page', pageId: p.id })}
            >
              <span>{p.icon}</span>
              <span className="truncate">{p.title || '제목 없음'}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between px-4">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
          비공개 페이지
        </span>
        <div className="flex gap-0.5">
          <button
            type="button"
            title="새 페이지"
            className="rounded p-1 hover:bg-[var(--color-hover)]"
            onClick={() => createPage({ type: 'page' })}
          >
            <FileText size={14} />
          </button>
          <button
            type="button"
            title="새 데이터베이스"
            className="rounded p-1 hover:bg-[var(--color-hover)]"
            onClick={() => createPage({ type: 'database' })}
          >
            <Database size={14} />
          </button>
          <button
            type="button"
            title="추가"
            className="rounded p-1 hover:bg-[var(--color-hover)]"
            onClick={() => createPage()}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="mt-1 flex-1 overflow-y-auto px-2 pb-3">{renderTree(roots)}</div>

      <div className="space-y-0.5 border-t border-[var(--color-border)] p-2">
        <NavItem icon={<Download size={16} />} label="내보내기" onClick={downloadExport} />
        <NavItem icon={<Upload size={16} />} label="가져오기" onClick={onImport} />
        <NavItem
          icon={theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          label={theme === 'dark' ? '라이트 모드' : '다크 모드'}
          onClick={toggleTheme}
        />
        <NavItem
          icon={<RotateCcw size={16} />}
          label="샘플로 초기화"
          onClick={() => {
            if (confirm('워크스페이스를 샘플 데이터로 초기화할까요?')) resetWorkspace()
          }}
        />
      </div>
    </aside>
  )
}

function NavItem({
  icon,
  label,
  onClick,
  active,
  hint,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm',
        active ? 'bg-[var(--color-hover)] font-medium' : 'hover:bg-[var(--color-hover)]',
      )}
    >
      <span className="text-[var(--color-muted)]">{icon}</span>
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[10px] text-[var(--color-muted)]">{hint}</span>}
    </button>
  )
}

function MenuBtn({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-[var(--color-hover)]',
        danger && 'text-[var(--color-danger)]',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
