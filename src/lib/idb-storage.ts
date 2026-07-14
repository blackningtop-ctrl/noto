import { get, set, del } from 'idb-keyval'
import type { PersistStorage, StorageValue } from 'zustand/middleware'
import {
  isVaultEnabled,
  isVaultUnlocked,
  openWorkspacePayload,
  sealWorkspacePayload,
  isSealedBlob,
} from './vault'

const LS_KEY = 'noto-workspace-v1'
const IDB_KEY = 'noto-workspace-v1'

/**
 * IndexedDB-backed zustand storage with optional AES-GCM vault wrapping.
 */
export function createIdbStorage<T>(): PersistStorage<T> {
  return {
    getItem: async (name): Promise<StorageValue<T> | null> => {
      const key = name || IDB_KEY
      try {
        let raw = await get<string>(key)
        if (raw == null) {
          const fromLs = localStorage.getItem(LS_KEY)
          if (fromLs) {
            raw = fromLs
            await set(key, fromLs)
          }
        }
        if (raw == null) return null

        if (isSealedBlob(raw) && isVaultEnabled() && !isVaultUnlocked()) {
          // locked — do not hydrate secrets
          return null
        }

        const plain = await openWorkspacePayload(raw)
        if (plain == null) return null
        return JSON.parse(plain) as StorageValue<T>
      } catch {
        if (isVaultEnabled() && !isVaultUnlocked()) return null
        const fromLs = localStorage.getItem(LS_KEY)
        if (!fromLs) return null
        try {
          const plain = await openWorkspacePayload(fromLs)
          if (!plain) return null
          return JSON.parse(plain) as StorageValue<T>
        } catch {
          return null
        }
      }
    },

    setItem: async (name, value): Promise<void> => {
      const key = name || IDB_KEY
      const plain = JSON.stringify(value)
      try {
        let toStore = plain
        if (isVaultEnabled()) {
          if (!isVaultUnlocked()) {
            // never write plaintext while vault on but locked
            return
          }
          toStore = await sealWorkspacePayload(plain)
        }
        await set(key, toStore)
        try {
          localStorage.setItem(
            `${LS_KEY}__meta`,
            JSON.stringify({
              updatedAt: Date.now(),
              bytes: toStore.length,
              storage: 'idb',
              vault: isVaultEnabled(),
            }),
          )
        } catch {
          /* ignore */
        }
      } catch (e) {
        console.warn('[noto] persist failed', e)
        if (!isVaultEnabled()) {
          try {
            localStorage.setItem(LS_KEY, plain)
          } catch {
            console.warn('[noto] storage quota exceeded')
          }
        }
      }
    },

    removeItem: async (name): Promise<void> => {
      await del(name || IDB_KEY)
      localStorage.removeItem(LS_KEY)
      localStorage.removeItem(`${LS_KEY}__meta`)
    },
  }
}

export async function estimateWorkspaceBytes(): Promise<{
  bytes: number
  source: 'idb' | 'localStorage' | 'unknown'
  vault: boolean
}> {
  try {
    const raw = await get<string>(IDB_KEY)
    if (raw != null) return { bytes: raw.length, source: 'idb', vault: isSealedBlob(raw) }
  } catch {
    /* ignore */
  }
  const ls = localStorage.getItem(LS_KEY)
  if (ls) return { bytes: ls.length, source: 'localStorage', vault: isSealedBlob(ls) }
  return { bytes: 0, source: 'unknown', vault: isVaultEnabled() }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Force-write current partialized workspace (e.g. after enabling vault
 * so plaintext on disk is immediately re-sealed with the new key).
 */
export async function flushWorkspaceToStorage(partialState: unknown): Promise<void> {
  const storage = createIdbStorage()
  await storage.setItem(IDB_KEY, {
    state: partialState,
    version: 0,
  } as StorageValue<unknown>)
}

export { IDB_KEY, LS_KEY }
