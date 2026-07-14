import { get, set, del } from 'idb-keyval'
import type { PersistStorage, StorageValue } from 'zustand/middleware'

const LS_KEY = 'noto-workspace-v1'
const IDB_KEY = 'noto-workspace-v1'

/**
 * IndexedDB-backed zustand storage with one-time migration from localStorage.
 */
export function createIdbStorage<T>(): PersistStorage<T> {
  return {
    getItem: async (name): Promise<StorageValue<T> | null> => {
      try {
        const fromIdb = await get<string>(name || IDB_KEY)
        if (fromIdb != null) {
          return JSON.parse(fromIdb) as StorageValue<T>
        }
        // migrate from localStorage
        const fromLs = localStorage.getItem(LS_KEY)
        if (fromLs) {
          await set(name || IDB_KEY, fromLs)
          // keep LS as backup until next successful write cycle
          try {
            return JSON.parse(fromLs) as StorageValue<T>
          } catch {
            return null
          }
        }
        return null
      } catch {
        const fromLs = localStorage.getItem(LS_KEY)
        if (!fromLs) return null
        try {
          return JSON.parse(fromLs) as StorageValue<T>
        } catch {
          return null
        }
      }
    },
    setItem: async (name, value): Promise<void> => {
      const raw = JSON.stringify(value)
      try {
        await set(name || IDB_KEY, raw)
        // mirror small meta to LS for diagnostics; full payload stays in IDB
        try {
          localStorage.setItem(`${LS_KEY}__meta`, JSON.stringify({
            updatedAt: Date.now(),
            bytes: raw.length,
            storage: 'idb',
          }))
        } catch {
          /* ignore quota on meta */
        }
      } catch {
        // fallback localStorage if IDB fails
        try {
          localStorage.setItem(LS_KEY, raw)
        } catch {
          console.warn('[noto] storage quota exceeded')
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
}> {
  try {
    const raw = await get<string>(IDB_KEY)
    if (raw != null) return { bytes: raw.length, source: 'idb' }
  } catch {
    /* ignore */
  }
  const ls = localStorage.getItem(LS_KEY)
  if (ls) return { bytes: ls.length, source: 'localStorage' }
  return { bytes: 0, source: 'unknown' }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}
