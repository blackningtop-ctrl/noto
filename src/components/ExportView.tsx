import { useState } from 'react'
import { useStore, useActivePages } from '../store'
import {
  exportMarkdownVault,
  importMarkdownVaultZip,
  exportStaticSite,
} from '../lib/export-vault'
import {
  canUseFolderSync,
  syncExportToFolder,
  syncImportFromFolder,
} from '../lib/folder-sync'
import {
  FolderSync,
  FileArchive,
  Globe,
  Download,
  Upload,
  FolderOpen,
  FolderInput,
  CheckCircle2,
  AlertCircle,
  GitBranch,
} from 'lucide-react'

export function ExportView() {
  const pages = useActivePages()
  const allPages = useStore((s) => s.pages)
  const snippets = useStore((s) => s.snippets)
  const importWorkspacePages = useStore((s) => s.importWorkspacePages)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const folderOk = canUseFolderSync()

  const run = async (fn: () => Promise<void> | void) => {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : '작업 실패' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fade-in mx-auto max-w-3xl px-6 py-10">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
        <GitBranch size={16} /> 백업 · 내보내기
      </div>
      <h1 className="text-2xl font-bold">내 노트 내보내기</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
        컴퓨터를 바꾸거나 백업할 때 써요. 인터넷 서버로 보내지 않고, 내 컴퓨터 파일로만 저장됩니다.
      </p>

      {msg && (
        <div
          className="mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm"
          style={{
            borderColor: msg.type === 'ok' ? '#22c55e55' : 'var(--color-danger)',
            background: msg.type === 'ok' ? '#22c55e12' : 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
          }}
        >
          {msg.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      <div className="mt-8 space-y-4">
        <Card
          icon={<FileArchive size={20} />}
          title="노트 묶음 파일 (ZIP)"
          desc="노트를 폴더처럼 정리된 압축 파일로 받아요. 백업이나 Git에 올리기 좋아요."
        >
          <Btn
            disabled={busy}
            icon={<Download size={14} />}
            label="묶음 받기"
            primary
            onClick={() =>
              run(async () => {
                await exportMarkdownVault(allPages, snippets)
                setMsg({ type: 'ok', text: 'ZIP 파일을 받았습니다.' })
              })
            }
          />
          <Btn
            disabled={busy}
            icon={<Upload size={14} />}
            label="묶음 가져오기"
            onClick={() =>
              run(async () => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.zip,application/zip'
                input.onchange = async () => {
                  const file = input.files?.[0]
                  if (!file) return
                  const result = await importMarkdownVaultZip(file)
                  if (!result) {
                    setMsg({ type: 'err', text: 'ZIP 가져오기에 실패했습니다.' })
                    return
                  }
                  const merge = confirm(
                    `${result.pages.length}개 페이지를 가져옵니다.\n\n확인 = 병합 (기존 유지 + 덮어쓰기)\n취소 = 전체 교체`,
                  )
                  importWorkspacePages(
                    result.pages,
                    result.snippets,
                    merge ? 'merge' : 'replace',
                  )
                  setMsg({
                    type: 'ok',
                    text: `${result.pages.length}개 페이지 ${merge ? '병합' : '교체'} 완료`,
                  })
                }
                input.click()
              })
            }
          />
        </Card>

        <Card
          icon={<Globe size={20} />}
          title="웹페이지로 내보내기"
          desc="인터넷 없이도 브라우저에서 볼 수 있는 홈페이지 형태로 받아요."
        >
          <Btn
            disabled={busy || pages.length === 0}
            icon={<Download size={14} />}
            label="웹페이지 ZIP 받기"
            primary
            onClick={() =>
              run(async () => {
                await exportStaticSite(allPages)
                setMsg({ type: 'ok', text: '웹페이지 ZIP을 받았습니다.' })
              })
            }
          />
        </Card>

        <Card
          icon={<FolderSync size={20} />}
          title="컴퓨터 폴더에 저장"
          desc={
            folderOk
              ? 'Chrome·Edge에서 폴더를 골라 바로 저장하거나 불러올 수 있어요.'
              : '이 브라우저에서는 폴더 저장이 안 돼요. 위 ZIP을 쓰거나 Chrome/Edge를 이용해 주세요.'
          }
        >
          <Btn
            disabled={busy || !folderOk}
            icon={<FolderOpen size={14} />}
            label="폴더에 저장"
            primary
            onClick={() =>
              run(async () => {
                const r = await syncExportToFolder(allPages, snippets)
                setMsg({ type: r.ok ? 'ok' : 'err', text: r.message })
              })
            }
          />
          <Btn
            disabled={busy || !folderOk}
            icon={<FolderInput size={14} />}
            label="폴더에서 불러오기"
            onClick={() =>
              run(async () => {
                const r = await syncImportFromFolder()
                if (r.ok && r.pages) {
                  const merge = confirm(
                    `${r.pages.length}개 페이지를 가져옵니다.\n\n확인 = 병합\n취소 = 전체 교체`,
                  )
                  importWorkspacePages(r.pages, r.snippets, merge ? 'merge' : 'replace')
                  setMsg({
                    type: 'ok',
                    text: `${r.message} (${merge ? '병합' : '교체'})`,
                  })
                } else {
                  setMsg({ type: 'err', text: r.message })
                }
              })
            }
          />
        </Card>

        <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-muted)]">
          <p className="font-medium text-[var(--color-text)]">언제 쓰면 좋을까?</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>시험 끝나고 노트를 파일로 모아 두고 싶을 때 → 묶음 받기</li>
            <li>친구에게 인터넷 없이 보여 주고 싶을 때 → 웹페이지 ZIP</li>
            <li>평소 백업 → 설정에서도 JSON 백업 가능</li>
          </ul>
          <p className="mt-3">지금 노트 {pages.length}개 · 코드 모음 {snippets.length}개</p>
        </div>
      </div>
    </div>
  )
}

function Card({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="mt-0.5 text-[var(--color-accent)]">{icon}</div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{desc}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Btn({
  icon,
  label,
  onClick,
  primary,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  primary?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        primary
          ? 'inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50'
          : 'inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-hover)] disabled:opacity-50'
      }
    >
      {icon}
      {label}
    </button>
  )
}
