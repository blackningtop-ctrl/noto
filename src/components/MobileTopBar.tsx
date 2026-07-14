import { Menu, Plus, Search } from 'lucide-react'
import { useStore } from '../store'

interface Props {
  onOpenMenu: () => void
}

function viewTitle(view: { kind: string }): string {
  switch (view.kind) {
    case 'home':
      return '홈'
    case 'page':
      return '노트'
    case 'search':
      return '찾기'
    case 'favorites':
      return '즐겨찾기'
    case 'trash':
      return '휴지통'
    case 'graph':
      return '연결'
    case 'snippets':
      return '코드 모음'
    case 'export':
      return '내보내기'
    case 'settings':
      return '설정'
    case 'templates':
      return '양식'
    default:
      return 'Noto'
  }
}

export function MobileTopBar({ onOpenMenu }: Props) {
  const view = useStore((s) => s.view)
  const createPage = useStore((s) => s.createPage)
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen)
  const pages = useStore((s) => s.pages)

  let title = viewTitle(view)
  if (view.kind === 'page') {
    const p = pages.find((x) => x.id === view.pageId)
    title = p ? `${p.icon} ${p.title || '제목 없음'}` : '노트'
  }

  return (
    <header
      className="mobile-topbar flex shrink-0 items-center gap-1 border-b border-[var(--color-border)] px-2 py-1.5"
      style={{ background: 'var(--color-panel)' }}
    >
      <button
        type="button"
        className="touch-target rounded-xl p-2 hover:bg-[var(--color-hover)]"
        onClick={onOpenMenu}
        aria-label="메뉴 열기"
        data-testid="mobile-menu-btn"
      >
        <Menu size={20} />
      </button>
      <div className="min-w-0 flex-1 truncate px-1 text-sm font-semibold" data-testid="mobile-title">
        {title}
      </div>
      <button
        type="button"
        className="touch-target rounded-xl p-2 hover:bg-[var(--color-hover)]"
        onClick={() => setCommandPaletteOpen(true)}
        aria-label="찾기"
        data-testid="mobile-search-btn"
      >
        <Search size={18} />
      </button>
      <button
        type="button"
        className="touch-target rounded-xl bg-[var(--color-accent)] p-2 text-white"
        onClick={() => createPage()}
        aria-label="새 노트"
        data-testid="mobile-new-btn"
      >
        <Plus size={18} />
      </button>
    </header>
  )
}
