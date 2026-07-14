import { useEffect, useState } from 'react'
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
import { SettingsView } from './components/SettingsView'
import { TemplatesView } from './components/TemplatesView'
import { StorageBanner } from './components/StorageBanner'
import { VaultLockScreen } from './components/VaultLockScreen'
import {
  getAutoLockMinutes,
  getVaultIdleMs,
  isVaultEnabled,
  isVaultUnlocked,
  lockVault,
  subscribeVault,
  touchVaultActivity,
} from './lib/vault'
import { createSeedPages } from './lib/seed'
import { createDefaultSnippets } from './lib/snippets'
import { defaultSettings } from './types'
import { migratePages } from './lib/migrate'

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

function wipeSensitiveMemory() {
  // Clear in-memory notes without writing plaintext (storage setItem no-ops when locked)
  useStore.setState({
    pages: [],
    snippets: [],
    versions: [],
    view: { kind: 'home' },
  })
}

export default function App() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const theme = useStore((s) => s.theme)
  const commandPaletteOpen = useStore((s) => s.commandPaletteOpen)
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen)

  const [booting, setBooting] = useState(true)
  const [locked, setLocked] = useState(false)
  const [vaultTick, setVaultTick] = useState(0)

  useEffect(() => subscribeVault(() => setVaultTick((n) => n + 1)), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (isVaultEnabled() && !isVaultUnlocked()) {
          if (!cancelled) {
            setLocked(true)
            setBooting(false)
          }
          return
        }
        await useStore.persist.rehydrate()
        if (!cancelled) {
          setLocked(false)
          setBooting(false)
        }
      } catch {
        if (!cancelled) {
          // fresh defaults if rehydrate fails
          useStore.setState({
            pages: migratePages(createSeedPages()),
            snippets: createDefaultSnippets(),
            settings: defaultSettings(),
          })
          setBooting(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // activity + auto-lock (re-bind when vault enable/lock settings change)
  useEffect(() => {
    if (!isVaultEnabled()) return

    const onAct = () => {
      if (isVaultUnlocked()) touchVaultActivity()
    }
    window.addEventListener('pointerdown', onAct)
    window.addEventListener('keydown', onAct)

    const id = window.setInterval(() => {
      if (!isVaultEnabled() || !isVaultUnlocked()) return
      const mins = getAutoLockMinutes()
      if (mins <= 0) return
      if (getVaultIdleMs() >= mins * 60 * 1000) {
        lockVault()
        wipeSensitiveMemory()
        setLocked(true)
        setCommandPaletteOpen(false)
      }
    }, 5000)

    return () => {
      window.removeEventListener('pointerdown', onAct)
      window.removeEventListener('keydown', onAct)
      clearInterval(id)
    }
  }, [setCommandPaletteOpen, locked, vaultTick])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (locked || booting) return
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      if (mod && key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!useStore.getState().commandPaletteOpen)
        return
      }

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

      // manual lock
      if (mod && key === 'l' && isVaultEnabled() && isVaultUnlocked()) {
        e.preventDefault()
        lockVault()
        wipeSensitiveMemory()
        setLocked(true)
        setCommandPaletteOpen(false)
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
  }, [setView, setCommandPaletteOpen, commandPaletteOpen, locked, booting])

  if (booting) {
    return (
      <div
        className="flex h-full min-h-screen items-center justify-center text-sm"
        style={{ background: 'var(--color-surface)', color: 'var(--color-muted)' }}
      >
        불러오는 중…
      </div>
    )
  }

  if (locked) {
    return (
      <VaultLockScreen
        onUnlocked={() => {
          setLocked(false)
          touchVaultActivity()
        }}
      />
    )
  }

  return (
    <div
      className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
      style={{ background: 'var(--color-surface)', minHeight: '100vh' }}
    >
      <StorageBanner />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          onLock={() => {
            if (!isVaultEnabled()) return
            lockVault()
            wipeSensitiveMemory()
            setLocked(true)
            setCommandPaletteOpen(false)
          }}
        />
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
          {view.kind === 'settings' && <SettingsView />}
          {view.kind === 'templates' && <TemplatesView />}
        </main>
      </div>
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  )
}
