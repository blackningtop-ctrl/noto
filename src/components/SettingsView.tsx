import { useStore } from '../store'
import { Settings, Trash2, Download, Shield } from 'lucide-react'

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
        <Settings size={16} /> 로컬 설정
      </div>
      <h1 className="text-2xl font-bold">설정</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        모든 데이터는 이 브라우저 IndexedDB에만 저장됩니다. 서버 전송 없음.
      </p>

      <section className="mt-8 space-y-4">
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
