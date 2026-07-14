import { useEffect } from 'react'
import { useStore } from './store'
import { Sidebar } from './components/Sidebar'
import { BentoHome } from './components/BentoHome'
import { PageView } from './components/PageView'
import { SearchView } from './components/SearchView'
import { TrashView } from './components/TrashView'
import { FavoritesView } from './components/FavoritesView'

export default function App() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const theme = useStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setView({ kind: 'search' })
      }
      if (mod && e.key.toLowerCase() === 'h') {
        e.preventDefault()
        setView({ kind: 'home' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setView])

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-hidden" style={{ background: 'var(--color-panel)' }}>
        {view.kind === 'home' && <BentoHome />}
        {view.kind === 'page' && <PageView pageId={view.pageId} />}
        {view.kind === 'search' && <SearchView />}
        {view.kind === 'trash' && <TrashView />}
        {view.kind === 'favorites' && <FavoritesView />}
      </main>
    </div>
  )
}
