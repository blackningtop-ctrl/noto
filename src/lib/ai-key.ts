/** API key is stored separately from workspace JSON (never in export by default). */
const KEY = 'noto-xai-api-key'

export function getXaiApiKey(): string {
  try {
    return localStorage.getItem(KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function setXaiApiKey(key: string): void {
  try {
    const v = key.trim()
    if (!v) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, v)
  } catch {
    /* ignore */
  }
}

export function hasXaiApiKey(): boolean {
  return getXaiApiKey().length > 0
}

export function maskKey(key: string): string {
  if (key.length < 8) return '••••'
  return `${key.slice(0, 4)}…${key.slice(-4)}`
}
