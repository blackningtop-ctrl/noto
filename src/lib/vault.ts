/**
 * Local vault: PBKDF2 + AES-GCM (Web Crypto).
 * Password never leaves the device. Session key lives only in memory.
 */

const META_KEY = 'noto-vault-meta'
const VERIFY_PLAIN = 'noto-vault-v1-ok'

export interface VaultMeta {
  enabled: boolean
  salt: string
  verifierIv: string
  verifierCipher: string
  autoLockMinutes: number
  createdAt: number
}

let sessionKey: CryptoKey | null = null
let unlocked = false
let lastActivity = Date.now()
const vaultListeners = new Set<() => void>()

/** React components can re-render when vault on/off/lock state changes. */
export function subscribeVault(listener: () => void): () => void {
  vaultListeners.add(listener)
  return () => {
    vaultListeners.delete(listener)
  }
}

function notifyVaultListeners() {
  vaultListeners.forEach((l) => {
    try {
      l()
    } catch {
      /* ignore */
    }
  })
}

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return btoa(s)
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function getVaultMeta(): VaultMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return null
    return JSON.parse(raw) as VaultMeta
  } catch {
    return null
  }
}

function saveVaultMeta(meta: VaultMeta | null) {
  if (!meta) localStorage.removeItem(META_KEY)
  else localStorage.setItem(META_KEY, JSON.stringify(meta))
}

export function isVaultEnabled(): boolean {
  return !!getVaultMeta()?.enabled
}

export function isVaultUnlocked(): boolean {
  if (!isVaultEnabled()) return true
  return unlocked && !!sessionKey
}

export function touchVaultActivity() {
  lastActivity = Date.now()
}

export function getVaultIdleMs(): number {
  return Date.now() - lastActivity
}

export function getAutoLockMinutes(): number {
  return getVaultMeta()?.autoLockMinutes ?? 15
}

export async function setAutoLockMinutes(minutes: number) {
  const meta = getVaultMeta()
  if (!meta) return
  meta.autoLockMinutes = Math.max(0, Math.min(240, minutes))
  saveVaultMeta(meta)
  notifyVaultListeners()
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 250_000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function encryptString(key: CryptoKey, plain: string): Promise<{ iv: string; cipher: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(plain)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  return { iv: b64encode(iv), cipher: b64encode(cipher) }
}

async function decryptString(key: CryptoKey, ivB64: string, cipherB64: string): Promise<string> {
  const iv = b64decode(ivB64)
  const cipher = b64decode(cipherB64)
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    cipher as BufferSource,
  )
  return new TextDecoder().decode(plain)
}

export async function enableVault(password: string): Promise<void> {
  if (password.length < 4) {
    throw new Error('비밀번호는 4자 이상이어야 해요.')
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveKey(password, salt)
  const ver = await encryptString(key, VERIFY_PLAIN)
  const meta: VaultMeta = {
    enabled: true,
    salt: b64encode(salt),
    verifierIv: ver.iv,
    verifierCipher: ver.cipher,
    autoLockMinutes: 15,
    createdAt: Date.now(),
  }
  saveVaultMeta(meta)
  sessionKey = key
  unlocked = true
  touchVaultActivity()
  notifyVaultListeners()
}

export async function unlockVault(password: string): Promise<void> {
  const meta = getVaultMeta()
  if (!meta?.enabled) {
    unlocked = true
    notifyVaultListeners()
    return
  }
  const salt = b64decode(meta.salt)
  const key = await deriveKey(password, salt)
  try {
    const check = await decryptString(key, meta.verifierIv, meta.verifierCipher)
    if (check !== VERIFY_PLAIN) throw new Error('bad')
  } catch {
    throw new Error('비밀번호가 틀렸어요.')
  }
  sessionKey = key
  unlocked = true
  touchVaultActivity()
  notifyVaultListeners()
}

export function lockVault(): void {
  sessionKey = null
  unlocked = false
  notifyVaultListeners()
}

export async function changeVaultPassword(oldPassword: string, newPassword: string): Promise<void> {
  await unlockVault(oldPassword)
  await enableVault(newPassword)
}

export async function disableVault(password: string): Promise<void> {
  await unlockVault(password)
  saveVaultMeta(null)
  sessionKey = null
  unlocked = true
  notifyVaultListeners()
}

/** Encrypt workspace JSON string for storage when vault is on. */
export async function sealWorkspacePayload(plainJson: string): Promise<string> {
  if (!isVaultEnabled()) return plainJson
  if (!sessionKey) throw new Error('금고가 잠겨 있어 저장할 수 없어요.')
  const { iv, cipher } = await encryptString(sessionKey, plainJson)
  return JSON.stringify({
    encrypted: true,
    v: 1,
    iv,
    cipher,
  })
}

/** Decrypt storage blob if sealed; otherwise return as-is. */
export async function openWorkspacePayload(raw: string): Promise<string | null> {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as {
      encrypted?: boolean
      iv?: string
      cipher?: string
    }
    if (!parsed.encrypted) {
      // plain zustand payload
      return raw
    }
    if (!sessionKey) return null
    if (!parsed.iv || !parsed.cipher) return null
    return await decryptString(sessionKey, parsed.iv, parsed.cipher)
  } catch {
    // might be plain JSON that failed double-parse path
    if (!isVaultEnabled()) return raw
    return null
  }
}

export function isSealedBlob(raw: string): boolean {
  try {
    const p = JSON.parse(raw) as { encrypted?: boolean }
    return !!p.encrypted
  } catch {
    return false
  }
}
