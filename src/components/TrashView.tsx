import { useStore } from '../store'
import { RotateCcw, Trash2 } from 'lucide-react'

export function TrashView() {
  const pages = useStore((s) => s.pages.filter((p) => p.deleted))
  const restorePage = useStore((s) => s.restorePage)
  const permanentlyDelete = useStore((s) => s.permanentlyDelete)
  const emptyTrash = useStore((s) => s.emptyTrash)

  return (
    <div className="fade-in mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">휴지통</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">삭제된 페이지를 복원하거나 영구 삭제합니다.</p>
        </div>
        {pages.length > 0 && (
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-danger)] hover:bg-[var(--color-hover)]"
            onClick={() => {
              if (confirm('휴지통을 비울까요? 이 작업은 되돌릴 수 없습니다.')) emptyTrash()
            }}
          >
            모두 비우기
          </button>
        )}
      </div>

      {pages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-16 text-center text-sm text-[var(--color-muted)]">
          휴지통이 비어 있습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-3"
            >
              <span className="text-xl">{p.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{p.title || '제목 없음'}</div>
                <div className="text-xs text-[var(--color-muted)]">
                  {p.deletedAt
                    ? new Date(p.deletedAt).toLocaleString('ko-KR')
                    : '삭제됨'}
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--color-hover)]"
                onClick={() => restorePage(p.id)}
              >
                <RotateCcw size={14} /> 복원
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-[var(--color-danger)] hover:bg-[var(--color-hover)]"
                onClick={() => {
                  if (confirm('영구 삭제할까요?')) permanentlyDelete(p.id)
                }}
              >
                <Trash2 size={14} /> 삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
