import { useState } from 'react'
import { Lock, Loader2, Shield } from 'lucide-react'
import { unlockVault, isVaultEnabled } from '../lib/vault'
import { useStore } from '../store'

interface Props {
  onUnlocked: () => void
}

export function VaultLockScreen({ onUnlocked }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const theme = useStore((s) => s.theme)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      setError('비밀번호를 입력해 주세요.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await unlockVault(password)
      await useStore.persist.rehydrate()
      onUnlocked()
    } catch (err) {
      setError(err instanceof Error ? err.message : '잠금 해제 실패')
    } finally {
      setBusy(false)
    }
  }

  if (!isVaultEnabled()) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: theme === 'dark' ? '#0f0f0f' : '#f0eeea' }}
    >
      <form
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-sm rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 shadow-2xl"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <Lock size={22} />
        </div>
        <h1 className="text-xl font-bold">금고 잠금</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          노트가 비밀번호로 암호화되어 있어요. 잠금을 풀어야 내용을 볼 수 있어요.
        </p>

        <label className="mt-5 mb-1 block text-xs text-[var(--color-muted)]">비밀번호</label>
        <input
          type="password"
          autoFocus
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-hover)]/40 px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
          placeholder="비밀번호 입력"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error && (
          <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
          잠금 풀기
        </button>

        <p className="mt-4 text-center text-[11px] text-[var(--color-muted)]">
          비밀번호를 잊으면 암호화된 노트를 복구할 수 없어요.
        </p>
      </form>
    </div>
  )
}
