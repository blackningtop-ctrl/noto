import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  changeVaultPassword,
  disableVault,
  enableVault,
  getAutoLockMinutes,
  isSealedBlob,
  isVaultEnabled,
  isVaultUnlocked,
  lockVault,
  openWorkspacePayload,
  sealWorkspacePayload,
  setAutoLockMinutes,
  unlockVault,
} from './vault'

const META_KEY = 'noto-vault-meta'

function clearVaultStorage() {
  localStorage.removeItem(META_KEY)
  lockVault()
}

describe('vault crypto', () => {
  beforeEach(() => {
    clearVaultStorage()
  })
  afterEach(() => {
    clearVaultStorage()
  })

  it('starts disabled and unlocked', () => {
    expect(isVaultEnabled()).toBe(false)
    expect(isVaultUnlocked()).toBe(true)
  })

  it('enables, seals, and opens payload', async () => {
    await enableVault('test-pass-123')
    expect(isVaultEnabled()).toBe(true)
    expect(isVaultUnlocked()).toBe(true)

    const plain = JSON.stringify({ hello: 'world', n: 1 })
    const sealed = await sealWorkspacePayload(plain)
    expect(isSealedBlob(sealed)).toBe(true)
    expect(sealed).not.toContain('hello')

    const opened = await openWorkspacePayload(sealed)
    expect(opened).toBe(plain)
  })

  it('rejects wrong password', async () => {
    await enableVault('correct-horse')
    lockVault()
    expect(isVaultUnlocked()).toBe(false)
    await expect(unlockVault('wrong')).rejects.toThrow(/비밀번호/)
  })

  it('unlocks with correct password', async () => {
    await enableVault('secret-key')
    const sealed = await sealWorkspacePayload('{"pages":[]}')
    lockVault()
    expect(await openWorkspacePayload(sealed)).toBeNull()

    await unlockVault('secret-key')
    expect(isVaultUnlocked()).toBe(true)
    expect(await openWorkspacePayload(sealed)).toBe('{"pages":[]}')
  })

  it('changes password and re-seals with new key', async () => {
    await enableVault('old-pass')
    await changeVaultPassword('old-pass', 'new-pass')
    const sealed = await sealWorkspacePayload('data-v2')
    lockVault()
    await unlockVault('new-pass')
    expect(await openWorkspacePayload(sealed)).toBe('data-v2')
  })

  it('disables vault after password check', async () => {
    await enableVault('bye-vault')
    await disableVault('bye-vault')
    expect(isVaultEnabled()).toBe(false)
    const plain = '{"a":1}'
    const out = await sealWorkspacePayload(plain)
    expect(out).toBe(plain)
    expect(isSealedBlob(out)).toBe(false)
  })

  it('clamps auto-lock minutes', async () => {
    await enableVault('auto-lock')
    await setAutoLockMinutes(999)
    expect(getAutoLockMinutes()).toBe(240)
    await setAutoLockMinutes(-5)
    expect(getAutoLockMinutes()).toBe(0)
  })

  it('requires password length >= 4', async () => {
    await expect(enableVault('ab')).rejects.toThrow(/4자/)
  })
})
