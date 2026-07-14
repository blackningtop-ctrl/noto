import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { History, RotateCcw, Camera, Trash2 } from 'lucide-react'

interface Props {
  pageId: string
}

export function VersionHistory({ pageId }: Props) {
  const versions = useStore((s) => s.versions)
  const saveVersion = useStore((s) => s.saveVersion)
  const restoreVersion = useStore((s) => s.restoreVersion)
  const deleteVersion = useStore((s) => s.deleteVersion)
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')

  const list = useMemo(
    () =>
      versions
        .filter((v) => v.pageId === pageId)
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt),
    [versions, pageId],
  )

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-hover)] px-3 py-2.5 text-left text-sm hover:border-[var(--color-accent)]"
        onClick={() => setOpen((v) => !v)}
      >
        <History size={16} className="text-[var(--color-muted)]" />
        <span className="font-medium">이전 저장본</span>
        <span className="text-[var(--color-muted)]">· {list.length}개</span>
        <span className="ml-auto text-xs text-[var(--color-muted)]">{open ? '접기' : '열기'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 rounded-xl border border-[var(--color-border)] p-3">
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-[160px] flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5 text-sm outline-none"
              placeholder="이름 (선택) 예: 제출 전"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm text-white"
              onClick={() => {
                saveVersion(pageId, label || undefined, false)
                setLabel('')
              }}
            >
              <Camera size={14} /> 지금 저장
            </button>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            잘못 지웠을 때 되돌릴 수 있어요. 자동으로도 가끔 저장됩니다.
          </p>

          {list.length === 0 ? (
            <div className="py-6 text-center text-sm text-[var(--color-muted)]">
              아직 버전이 없습니다.
            </div>
          ) : (
            <ul className="space-y-2">
              {list.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {v.icon} {v.title || '제목 없음'}
                      {v.auto && (
                        <span className="ml-2 text-[10px] font-normal text-[var(--color-muted)]">
                          auto
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {v.label} · {new Date(v.createdAt).toLocaleString('ko-KR')} · 블록{' '}
                      {v.blocks.length}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs hover:bg-[var(--color-hover)]"
                    onClick={() => {
                      if (confirm('이 버전으로 복원할까요? 현재 상태는 자동 스냅샷으로 남습니다.')) {
                        restoreVersion(v.id)
                      }
                    }}
                  >
                    <RotateCcw size={12} /> 복원
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-1 text-[var(--color-danger)] hover:bg-[var(--color-hover)]"
                    onClick={() => deleteVersion(v.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
