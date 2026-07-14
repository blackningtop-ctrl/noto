import { useEffect, useMemo, useState } from 'react'
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
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
  MoreHorizontal,
  Copy,
  Network,
  Code2,
  FolderOutput,
  Settings,
  HelpCircle,
  LayoutTemplate,
  Sparkles,
  Lock,
} from 'lucide-react'
import { hasXaiApiKey } from '../lib/ai-key'
import { isVaultEnabled, subscribeVault } from '../lib/vault'
import clsx from 'clsx'

export function Sidebar({ onLock }: { onLock?: () => void }) {
  const [vaultOn, setVaultOn] = useState(() => isVaultEnabled())
  useEffect(() => subscribeVault(() => setVaultOn(isVaultEnabled())), [])
  const open = useStore((s) => s.sidebarOpen)
  const setSidebarOpen = useStore((s) => s.setSidebarOpen)
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const createPage = useStore((s) => s.createPage)
  const deletePage = useStore((s) => s.deletePage)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const duplicatePage = useStore((s) => s.duplicatePage)
  const reorderPage = useStore((s) => s.reorderPage)
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen)
  const pages = useActivePages()
  const favorites = pages.filter((p) => p.favorite)
  const roots = pages
    .filter((p) => !p.parentId)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [menuId, setMenuId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)

  const childrenOf = useMemo(() => {
    const map: Record<string, Page[]> = {}
    for (const p of pages) {
      if (p.parentId) {
        if (!map[p.parentId]) map[p.parentId] = []
        map[p.parentId].push(p)
      }
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    }
    return map
  }, [pages])

  const renderTree = (list: Page[], depth = 0) =>
    list.map((page) => {
      const kids = childrenOf[page.id] ?? []
      const isOpen = expanded[page.id] ?? depth < 1
      const active = view.kind === 'page' && view.pageId === page.id
      return (
        <div key={page.id}>
          <div
            className={clsx(
              'group flex items-center gap-0.5 rounded-xl px-1 py-0.5 text-[13px]',
              active ? 'bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]' : 'hover:bg-[var(--color-hover)]',
              dragId === page.id && 'opacity-50',
            )}
            style={{ paddingLeft: 4 + depth * 12 }}
            draggable
            onDragStart={(e) => {
              setDragId(page.id)
              e.dataTransfer.setData('text/page-id', page.id)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const from = e.dataTransfer.getData('text/page-id') || dragId
              if (!from || from === page.id) return
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              const y = e.clientY - rect.top
              const third = rect.height / 3
              if (y < third) reorderPage(from, page.id, 'before')
              else if (y > third * 2) reorderPage(from, page.id, 'after')
              else {
                reorderPage(from, page.id, 'inside')
                setExpanded((ex) => ({ ...ex, [page.id]: true }))
              }
              setDragId(null)
            }}
          >
            <button
              type="button"
              className="rounded-md p-0.5 text-[var(--color-muted)]"
              onClick={() => setExpanded((e) => ({ ...e, [page.id]: !isOpen }))}
              aria-label="펼치기"
            >
              {kids.length > 0 ? (
                isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
              ) : (
                <span className="inline-block w-3.5" />
              )}
            </button>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-1.5 truncate py-1.5 text-left"
              onClick={() => setView({ kind: 'page', pageId: page.id })}
            >
              <span className="text-base leading-none">{page.icon}</span>
              <span className="truncate">{page.title || '제목 없음'}</span>
              {page.type === 'database' && (
                <span className="shrink-0 rounded bg-[var(--color-hover)] px-1 text-[10px] text-[var(--color-muted)]">
                  표
                </span>
              )}
            </button>
            <div className="relative opacity-0 group-hover:opacity-100">
              <button
                type="button"
                className="rounded-md p-1 hover:bg-[var(--color-border)]"
                onClick={() => setMenuId(menuId === page.id ? null : page.id)}
                aria-label="메뉴"
              >
                <MoreHorizontal size={14} />
              </button>
              {menuId === page.id && (
                <div
                  className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-1 shadow-xl"
                  onMouseLeave={() => setMenuId(null)}
                >
                  <MenuBtn
                    icon={<Plus size={14} />}
                    label="안에 새 노트"
                    onClick={() => {
                      createPage({ parentId: page.id })
                      setExpanded((e) => ({ ...e, [page.id]: true }))
                      setMenuId(null)
                    }}
                  />
                  <MenuBtn
                    icon={<Star size={14} />}
                    label={page.favorite ? '즐겨찾기 빼기' : '즐겨찾기'}
                    onClick={() => {
                      toggleFavorite(page.id)
                      setMenuId(null)
                    }}
                  />
                  <MenuBtn
                    icon={<Copy size={14} />}
                    label="복사하기"
                    onClick={() => {
                      duplicatePage(page.id)
                      setMenuId(null)
                    }}
                  />
                  <MenuBtn
                    icon={<Trash2 size={14} />}
                    label="삭제"
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
        className="fixed left-3 top-3 z-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-2.5 shadow-sm"
        onClick={() => setSidebarOpen(true)}
        title="메뉴 열기"
      >
        <PanelLeft size={18} />
      </button>
    )
  }

  return (
    <aside className="sidebar flex h-full w-[268px] shrink-0 flex-col">
      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl px-1.5 py-1 font-semibold tracking-tight hover:bg-[var(--color-hover)]"
          onClick={() => setView({ kind: 'home' })}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-text)] text-sm font-bold text-[var(--color-panel)]">
            N
          </span>
          <span>Noto</span>
        </button>
        <button
          type="button"
          className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-hover)]"
          onClick={() => setSidebarOpen(false)}
          title="메뉴 접기"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <div className="px-2 pt-1">
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex w-full items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-left text-[13px] text-[var(--color-muted)] shadow-sm transition hover:border-[var(--color-accent)]"
        >
          <Search size={15} />
          <span className="flex-1">찾기…</span>
          <kbd className="rounded-md bg-[var(--color-hover)] px-1.5 py-0.5 text-[10px]">Ctrl+K</kbd>
        </button>
      </div>

      <div className="mt-2 space-y-0.5 px-2">
        <NavItem
          icon={<Home size={16} />}
          label="홈"
          active={view.kind === 'home'}
          onClick={() => setView({ kind: 'home' })}
        />
        <NavItem
          icon={<LayoutTemplate size={16} />}
          label="양식"
          active={view.kind === 'templates'}
          onClick={() => setView({ kind: 'templates' })}
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
        <div className="mt-3 px-2">
          <SectionLabel>자주 쓰는 노트</SectionLabel>
          {favorites.slice(0, 5).map((p) => (
            <button
              key={p.id}
              type="button"
              className={clsx(
                'flex w-full items-center gap-2 truncate rounded-xl px-2 py-1.5 text-left text-[13px]',
                view.kind === 'page' && view.pageId === p.id
                  ? 'bg-[var(--color-accent-soft)] font-medium'
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

      <div className="mt-3 flex items-center justify-between px-3">
        <SectionLabel className="!mb-0 !px-0">내 노트</SectionLabel>
        <div className="flex gap-0.5">
          <button
            type="button"
            title="새 노트"
            className="rounded-lg p-1.5 text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
            onClick={() => createPage({ type: 'page' })}
          >
            <FileText size={15} />
          </button>
          <button
            type="button"
            title="새 표 (목록)"
            className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-hover)]"
            onClick={() => createPage({ type: 'database' })}
          >
            <Database size={15} />
          </button>
          <button
            type="button"
            title="새 노트"
            className="rounded-lg bg-[var(--color-accent)] p-1.5 text-white hover:opacity-90"
            onClick={() => createPage()}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
      <p className="mb-1 px-4 text-[11px] text-[var(--color-muted)]">끌어다 놓으면 순서·폴더를 바꿀 수 있어요</p>

      <div className="mt-0.5 flex-1 overflow-y-auto px-2 pb-2">{renderTree(roots)}</div>

      <div className="border-t border-[var(--color-border)] p-2">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[13px] text-[var(--color-muted)] hover:bg-[var(--color-hover)]"
          onClick={() => setMoreOpen((v) => !v)}
        >
          <HelpCircle size={15} />
          <span className="flex-1">더 보기</span>
          {moreOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {moreOpen && (
          <div className="mt-0.5 space-y-0.5">
            <NavItem
              icon={<Sparkles size={15} />}
              label={hasXaiApiKey() ? 'AI 설정' : 'AI 켜기 (API 키)'}
              active={view.kind === 'settings'}
              onClick={() => setView({ kind: 'settings' })}
            />
            <NavItem
              icon={<Network size={15} />}
              label="연결 보기"
              active={view.kind === 'graph'}
              onClick={() => setView({ kind: 'graph' })}
            />
            <NavItem
              icon={<Code2 size={15} />}
              label="코드 모음"
              active={view.kind === 'snippets'}
              onClick={() => setView({ kind: 'snippets' })}
            />
            <NavItem
              icon={<FolderOutput size={15} />}
              label="내보내기 / 백업"
              active={view.kind === 'export'}
              onClick={() => setView({ kind: 'export' })}
            />
            <NavItem
              icon={<Settings size={15} />}
              label="설정"
              active={view.kind === 'settings'}
              onClick={() => setView({ kind: 'settings' })}
            />
            <NavItem
              icon={theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              label={theme === 'dark' ? '밝은 화면' : '어두운 화면'}
              onClick={toggleTheme}
            />
            {vaultOn && onLock && (
              <NavItem
                icon={<Lock size={15} />}
                label="지금 잠그기"
                onClick={onLock}
              />
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={clsx(
        'mb-1 px-2 text-[11px] font-semibold tracking-wide text-[var(--color-muted)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

function NavItem({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[13px]',
        active
          ? 'bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]'
          : 'hover:bg-[var(--color-hover)]',
      )}
    >
      <span className={active ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
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
