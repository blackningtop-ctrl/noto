import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { Settings, Trash2, Download, Shield, Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react'
import { getXaiApiKey, setXaiApiKey, maskKey } from '../lib/ai-key'
import { AI_MODELS, DEFAULT_AI_MODEL, testXaiConnection } from '../lib/xai'

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
          </p>
        </div>
      </section>
    </div>
  )
}
