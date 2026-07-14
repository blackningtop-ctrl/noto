import { useEffect, useState } from 'react'
import { useStore, flushWorkspacePersist } from '../store'
import {
  Settings,
  Trash2,
  Download,
  Shield,
  Sparkles,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  KeyRound,
} from 'lucide-react'
import { getXaiApiKey, setXaiApiKey, maskKey } from '../lib/ai-key'
import { AI_MODELS, DEFAULT_AI_MODEL, testXaiConnection } from '../lib/xai'
import {
  changeVaultPassword,
  disableVault,
  enableVault,
  getAutoLockMinutes,
  isVaultEnabled,
  setAutoLockMinutes,
} from '../lib/vault'

export function SettingsView() {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const markBackupNow = useStore((s) => s.markBackupNow)
  const purgeExpiredTrash = useStore((s) => s.purgeExpiredTrash)
  const emptyTrash = useStore((s) => s.emptyTrash)
  const exportData = useStore((s) => s.exportData)
  const versions = useStore((s) => s.versions)
  const pages = useStore((s) => s.pages)
  const trashCount = pages.filter((p) => p.deleted).length
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testMsg, setTestMsg] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)

  // vault UI
  const [vaultOn, setVaultOn] = useState(() => isVaultEnabled())
  const [vaultPw, setVaultPw] = useState('')
  const [vaultPw2, setVaultPw2] = useState('')
  const [vaultOldPw, setVaultOldPw] = useState('')
  const [vaultNewPw, setVaultNewPw] = useState('')
  const [vaultBusy, setVaultBusy] = useState(false)
  const [vaultMsg, setVaultMsg] = useState<string | null>(null)
  const [autoLock, setAutoLock] = useState(() => getAutoLockMinutes())
  const [showVaultPw, setShowVaultPw] = useState(false)

  useEffect(() => {
    setApiKey(getXaiApiKey())
  }, [])

  const backup = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `noto-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    markBackupNow()
  }

  const onEnableVault = async () => {
    setVaultMsg(null)
    if (vaultPw.length < 4) {
      setVaultMsg('비밀번호는 4자 이상이어야 해요.')
      return
    }
    if (vaultPw !== vaultPw2) {
      setVaultMsg('비밀번호 확인이 달라요.')
      return
    }
    setVaultBusy(true)
    try {
      await enableVault(vaultPw)
      await flushWorkspacePersist()
      setVaultOn(true)
      setAutoLock(getAutoLockMinutes())
      setVaultPw('')
      setVaultPw2('')
      setVaultMsg('금고가 켜졌어요. 노트가 암호화되어 저장됩니다.')
    } catch (e) {
      setVaultMsg(e instanceof Error ? e.message : '금고를 켤 수 없어요.')
    } finally {
      setVaultBusy(false)
    }
  }

  const onChangeVaultPw = async () => {
    setVaultMsg(null)
    if (vaultNewPw.length < 4) {
      setVaultMsg('새 비밀번호는 4자 이상이어야 해요.')
      return
    }
    setVaultBusy(true)
    try {
      await changeVaultPassword(vaultOldPw, vaultNewPw)
      await flushWorkspacePersist()
      setVaultOldPw('')
      setVaultNewPw('')
      setVaultMsg('비밀번호를 바꿨어요. 노트가 새 키로 다시 암호화됐어요.')
    } catch (e) {
      setVaultMsg(e instanceof Error ? e.message : '비밀번호 변경 실패')
    } finally {
      setVaultBusy(false)
    }
  }

  const onDisableVault = async () => {
    setVaultMsg(null)
    if (!vaultOldPw) {
      setVaultMsg('해제를 위해 현재 비밀번호를 입력해 주세요.')
      return
    }
    if (!confirm('금고를 끄면 노트가 다시 암호화 없이 저장돼요. 계속할까요?')) return
    setVaultBusy(true)
    try {
      await disableVault(vaultOldPw)
      await flushWorkspacePersist()
      setVaultOn(false)
      setVaultOldPw('')
      setVaultNewPw('')
      setVaultMsg('금고를 껐어요. 노트는 이 브라우저에 일반 저장됩니다.')
    } catch (e) {
      setVaultMsg(e instanceof Error ? e.message : '금고 해제 실패')
    } finally {
      setVaultBusy(false)
    }
  }

  const onAutoLockChange = async (mins: number) => {
    setAutoLock(mins)
    await setAutoLockMinutes(mins)
    setVaultMsg(
      mins <= 0
        ? '자동 잠금을 껐어요. (Ctrl+L 또는 사이드바에서 수동 잠금 가능)'
        : `${mins}분 동안 안 쓰면 자동으로 잠겨요.`,
    )
  }

  return (
    <div className="fade-in mx-auto max-w-2xl px-6 py-10">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
        <Settings size={16} /> 설정
      </div>
      <h1 className="text-2xl font-bold">설정</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
        노트는 이 컴퓨터 브라우저 안에만 저장돼요. 다른 사람에게 자동으로 보내지 않아요.
      </p>

      <section className="mt-8 space-y-4">
        {/* Vault */}
        <div className="rounded-2xl border border-[var(--color-border)] p-4">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <Lock size={16} className="text-[var(--color-accent)]" /> 금고 (비밀번호 잠금)
          </h2>
          <p className="mb-3 text-xs leading-relaxed text-[var(--color-muted)]">
            비밀번호로 노트를 암호화해요 (AES-256-GCM). 비밀번호는 서버로 보내지 않고 이 기기에만
            있어요. 잊으면 노트를 복구할 수 없어요.
          </p>

          {vaultOn ? (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-accent)]">
                <KeyRound size={12} /> 금고 켜짐 · 저장 시 암호화
              </div>

              <label className="flex items-center justify-between gap-4 text-sm">
                <span>자동 잠금 (분)</span>
                <select
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5 text-sm outline-none"
                  value={autoLock}
                  onChange={(e) => void onAutoLockChange(Number(e.target.value))}
                >
                  <option value={0}>끔</option>
                  <option value={5}>5분</option>
                  <option value={15}>15분</option>
                  <option value={30}>30분</option>
                  <option value={60}>60분</option>
                </select>
              </label>
              <p className="text-[11px] text-[var(--color-muted)]">
                수동 잠금: <kbd className="rounded border border-[var(--color-border)] px-1">Ctrl</kbd>
                +
                <kbd className="rounded border border-[var(--color-border)] px-1">L</kbd> 또는
                사이드바 「지금 잠그기」
              </p>

              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-hover)]/30 p-3">
                <p className="mb-2 text-xs font-medium">비밀번호 변경</p>
                <input
                  type={showVaultPw ? 'text' : 'password'}
                  className="mb-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                  placeholder="현재 비밀번호"
                  value={vaultOldPw}
                  onChange={(e) => setVaultOldPw(e.target.value)}
                  autoComplete="current-password"
                />
                <input
                  type={showVaultPw ? 'text' : 'password'}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                  placeholder="새 비밀번호 (4자 이상)"
                  value={vaultNewPw}
                  onChange={(e) => setVaultNewPw(e.target.value)}
                  autoComplete="new-password"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={vaultBusy}
                    className="rounded-xl bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    onClick={() => void onChangeVaultPw()}
                  >
                    {vaultBusy ? <Loader2 size={14} className="inline animate-spin" /> : null} 변경
                  </button>
                  <button
                    type="button"
                    disabled={vaultBusy}
                    className="rounded-xl px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-hover)] disabled:opacity-50"
                    onClick={() => void onDisableVault()}
                  >
                    금고 끄기
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-[var(--color-border)] px-2.5 py-2 text-sm hover:bg-[var(--color-hover)]"
                    onClick={() => setShowVaultPw((v) => !v)}
                    title={showVaultPw ? '숨기기' : '보기'}
                  >
                    {showVaultPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type={showVaultPw ? 'text' : 'password'}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                placeholder="새 비밀번호 (4자 이상)"
                value={vaultPw}
                onChange={(e) => setVaultPw(e.target.value)}
                autoComplete="new-password"
              />
              <div className="flex gap-2">
                <input
                  type={showVaultPw ? 'text' : 'password'}
                  className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                  placeholder="비밀번호 확인"
                  value={vaultPw2}
                  onChange={(e) => setVaultPw2(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="rounded-xl border border-[var(--color-border)] px-2.5 hover:bg-[var(--color-hover)]"
                  onClick={() => setShowVaultPw((v) => !v)}
                >
                  {showVaultPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                type="button"
                disabled={vaultBusy}
                className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={() => void onEnableVault()}
              >
                {vaultBusy ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                금고 켜기
              </button>
            </div>
          )}

          {vaultMsg && (
            <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">{vaultMsg}</p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] p-4">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <Sparkles size={16} className="text-[var(--color-accent)]" /> AI (SpaceXAI / xAI)
          </h2>
          <p className="mb-3 text-xs leading-relaxed text-[var(--color-muted)]">
            API 키를 넣으면 요약·이어쓰기·번역·채팅을 쓸 수 있어요. 키는 이 브라우저에만 저장되고,
            요청할 때만 <code className="rounded bg-[var(--color-hover)] px-1">api.x.ai</code> 로
            전송됩니다. 워크스페이스 백업 JSON에는 키가 들어가지 않아요.
          </p>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">XAI_API_KEY</label>
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 font-mono text-sm outline-none focus:border-[var(--color-accent)]"
              placeholder="xai-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
            <button
              type="button"
              className="rounded-xl border border-[var(--color-border)] px-2.5 hover:bg-[var(--color-hover)]"
              onClick={() => setShowKey((v) => !v)}
              title={showKey ? '숨기기' : '보기'}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {apiKey && (
            <p className="mt-1 text-[11px] text-[var(--color-muted)]">저장됨: {maskKey(apiKey)}</p>
          )}
          <label className="mb-1 mt-3 block text-xs text-[var(--color-muted)]">모델</label>
          <select
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none"
            value={settings.aiModel || DEFAULT_AI_MODEL}
            onChange={(e) => updateSettings({ aiModel: e.target.value })}
          >
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white"
              onClick={() => {
                setXaiApiKey(apiKey)
                setTestMsg(apiKey.trim() ? '키가 저장되었어요.' : '키가 삭제되었어요.')
              }}
            >
              키 저장
            </button>
            <button
              type="button"
              disabled={testing || !apiKey.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-hover)] disabled:opacity-40"
              onClick={async () => {
                setTesting(true)
                setTestMsg(null)
                try {
                  setXaiApiKey(apiKey)
                  const reply = await testXaiConnection(
                    apiKey,
                    settings.aiModel || DEFAULT_AI_MODEL,
                  )
                  setTestMsg(`연결 성공: ${reply}`)
                } catch (e) {
                  setTestMsg(e instanceof Error ? e.message : '연결 실패')
                } finally {
                  setTesting(false)
                }
              }}
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : null}
              연결 테스트
            </button>
            <button
              type="button"
              className="rounded-xl px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-hover)]"
              onClick={() => {
                setApiKey('')
                setXaiApiKey('')
                setTestMsg('키가 삭제되었어요.')
              }}
            >
              키 삭제
            </button>
          </div>
          {testMsg && (
            <p className="mt-2 text-xs text-[var(--color-muted)] whitespace-pre-wrap">{testMsg}</p>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-muted)]">
            키 발급:{' '}
            <a
              className="text-[var(--color-accent)] underline"
              href="https://console.x.ai"
              target="_blank"
              rel="noreferrer"
            >
              console.x.ai
            </a>
            {' · '}
            <a
              className="text-[var(--color-accent)] underline"
              href="https://docs.x.ai"
              target="_blank"
              rel="noreferrer"
            >
              문서
            </a>
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Trash2 size={16} /> 휴지통
          </h2>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>자동 영구 삭제 (일)</span>
            <input
              type="number"
              min={0}
              max={365}
              className="w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1 text-right outline-none"
              value={settings.trashRetentionDays}
              onChange={(e) =>
                updateSettings({ trashRetentionDays: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </label>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            0 = 자동 삭제 안 함. 현재 휴지통 {trashCount}개 · 버전 스냅샷 {versions.length}개
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-hover)]"
              onClick={() => purgeExpiredTrash()}
            >
              만료 항목 정리
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-danger)] hover:bg-[var(--color-hover)]"
              onClick={() => {
                if (confirm('휴지통을 모두 비울까요?')) emptyTrash()
              }}
            >
              휴지통 비우기
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Download size={16} /> 백업
          </h2>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>백업 리마인드 (일)</span>
            <input
              type="number"
              min={1}
              max={90}
              className="w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1 text-right outline-none"
              value={settings.backupRemindDays}
              onChange={(e) =>
                updateSettings({ backupRemindDays: Math.max(1, Number(e.target.value) || 7) })
              }
            />
          </label>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            마지막 백업:{' '}
            {settings.lastBackupAt
              ? new Date(settings.lastBackupAt).toLocaleString('ko-KR')
              : '없음'}
          </p>
          <button
            type="button"
            className="mt-3 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white"
            onClick={backup}
          >
            JSON 백업 다운로드
          </button>
          {vaultOn && (
            <p className="mt-2 text-[11px] text-[var(--color-muted)]">
              참고: 백업 JSON은 열리면 평문이에요. 안전한 곳에 두세요.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Shield size={16} /> 표시
          </h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.showStorageBanner}
              onChange={(e) => updateSettings({ showStorageBanner: e.target.checked })}
            />
            저장소 용량 경고 배너 표시
          </label>
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            스키마 버전 {settings.schemaVersion} · 페이지 {pages.filter((p) => !p.deleted).length}개
            {vaultOn ? ' · 금고 활성' : ''}
          </p>
        </div>
      </section>
    </div>
  )
}
