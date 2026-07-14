import { useEffect } from 'react'
import { useStore, undoWorkspace, redoWorkspace } from './store'
import { Sidebar } from './components/Sidebar'
import { BentoHome } from './components/BentoHome'
import { PageView } from './components/PageView'
import { SearchView } from './components/SearchView'
import { TrashView } from './components/TrashView'
import { FavoritesView } from './components/FavoritesView'
import { CommandPalette } from './components/CommandPalette'
import { GraphView } from './components/GraphView'
import { SnippetsView } from './components/SnippetsView'
import { ExportView } from './components/ExportView'
import { StorageBanner } from './components/StorageBanner'

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  const tag = t.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    t.isContentEditable
  )
}

export default function App() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const theme = useStore((s) => s.theme)
  const commandPaletteOpen = useStore((s) => s.commandPaletteOpen)
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      if (mod && key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!useStore.getState().commandPaletteOpen)
        return
      }

      // undo/redo even in inputs (workspace-level)
      if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undoWorkspace()
        return
      }
      if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redoWorkspace()
        return
      }

      if (commandPaletteOpen) return
      if (isTypingTarget(e.target) && !(mod && key === 'h')) return

      if (mod && key === 'h' && !e.shiftKey) {
        e.preventDefault()
        setView({ kind: 'home' })
      }
      if (mod && key === 'g') {
        e.preventDefault()
        setView({ kind: 'graph' })
      }
      if (mod && key === 'e') {
        e.preventDefault()
        setView({ kind: 'export' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setView, setCommandPaletteOpen, commandPaletteOpen])

  return (
    <div
      className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
      style={{ background: 'var(--color-surface)', minHeight: '100vh' }}
    >
      <StorageBanner />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main
          className="min-h-0 min-w-0 flex-1 overflow-y-auto"
          style={{ background: 'var(--color-panel)' }}
        >
          {view.kind === 'home' && <BentoHome />}
          {view.kind === 'page' && <PageView pageId={view.pageId} />}
          {view.kind === 'search' && <SearchView />}
          {view.kind === 'trash' && <TrashView />}
          {view.kind === 'favorites' && <FavoritesView />}
          {view.kind === 'graph' && <GraphView />}
          {view.kind === 'snippets' && <SnippetsView />}
          {view.kind === 'export' && <ExportView />}
        </main>
      </div>
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  )
}
