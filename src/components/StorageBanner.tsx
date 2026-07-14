import { useEffect, useState } from 'react'
import { estimateWorkspaceBytes, formatBytes } from '../lib/idb-storage'
import { useStore } from '../store'
import { AlertTriangle, X, Download } from 'lucide-react'

const WARN_BYTES = 4 * 1024 * 1024 // 4MB soft warning
const DANGER_BYTES = 8 * 1024 * 1024

export function StorageBanner() {
  const [info, setInfo] = useState<{ bytes: number; source: string } | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const exportData = useStore((s) => s.exportData)
  const pages = useStore((s) => s.pages)
  const versions = useStore((s) => s.versions)

  useEffect(() => {
    let cancelled = false
    const tick = () => {
      void estimateWorkspaceBytes().then((r) => {
        if (!cancelled) setInfo(r)
      })
    }
    tick()
    const id = window.setInterval(tick, 15000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [pages, versions])

  if (dismissed || !info || info.bytes < WARN_BYTES) return null

  const danger = info.bytes >= DANGER_BYTES

  return (
    <div
      className="flex items-start gap-2 border-b px-4 py-2 text-sm"
      style={{
        background: danger ? 'color-mix(in srgb, var(--color-danger) 12%, transparent)' : 'var(--color-accent-soft)',
        borderColor: 'var(--color-border)',
      }}
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <strong>저장소 {formatBytes(info.bytes)}</strong>
        <span className="text-[var(--color-muted)]">
          {' '}
          ({info.source}) · 버전 {versions.length}개
          {danger
            ? ' — 용량이 큽니다. JSON/Vault로 백업 후 휴지통·버전을 정리하세요.'
            : ' — 주기적으로 백업을 권장합니다.'}
        </span>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs hover:bg-[var(--color-panel)]"
        onClick={() => {
          const blob = new Blob([exportData()], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `noto-backup-${new Date().toISOString().slice(0, 10)}.json`
          a.click()
          URL.revokeObjectURL(url)
        }}
      >
        <Download size={12} /> 백업
      </button>
      <button type="button" className="rounded p-1 hover:bg-[var(--color-panel)]" onClick={() => setDismissed(true)}>
        <X size={14} />
      </button>
    </div>
  )
}
