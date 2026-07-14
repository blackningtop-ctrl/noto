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
        <GitBranch size={16} /> Phase 3 · Git / Export (AI 제외)
      </div>
      <h1 className="text-2xl font-bold">Git & 내보내기</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Markdown vault · 정적 사이트 · 로컬 폴더 동기화. 서버 없이 브라우저에서만 동작합니다.
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
          title="Markdown Vault ZIP"
          desc="docs/**/*.md + noto-manifest.json + .gitignore — Git에 바로 커밋 가능한 구조"
        >
          <Btn
            disabled={busy}
            icon={<Download size={14} />}
            label="Vault 내보내기"
            primary
            onClick={() =>
              run(async () => {
                await exportMarkdownVault(allPages, snippets)
                setMsg({ type: 'ok', text: 'Markdown vault ZIP을 다운로드했습니다.' })
              })
            }
          />
          <Btn
            disabled={busy}
            icon={<Upload size={14} />}
            label="Vault ZIP 가져오기"
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
                  importWorkspacePages(result.pages, result.snippets)
                  setMsg({
                    type: 'ok',
                    text: `${result.pages.length}개 페이지를 가져왔습니다. (기존 워크스페이스 교체)`,
                  })
                }
                input.click()
              })
            }
          />
        </Card>

        <Card
          icon={<Globe size={20} />}
          title="정적 Docs 사이트"
          desc="index.html + pages/*.html + styles.css — 호스팅 없이 압축 해제 후 브라우저로 열기"
        >
          <Btn
            disabled={busy || pages.length === 0}
            icon={<Download size={14} />}
            label="정적 사이트 ZIP"
            primary
            onClick={() =>
              run(async () => {
                await exportStaticSite(allPages)
                setMsg({ type: 'ok', text: '정적 사이트 ZIP을 다운로드했습니다.' })
              })
            }
          />
        </Card>

        <Card
          icon={<FolderSync size={20} />}
          title="로컬 폴더 동기화"
          desc={
            folderOk
              ? 'Chrome/Edge File System Access API로 폴더에 직접 쓰거나 읽습니다.'
              : '현재 브라우저는 폴더 API를 지원하지 않습니다. ZIP을 사용하거나 Chrome/Edge를 쓰세요.'
          }
        >
          <Btn
            disabled={busy || !folderOk}
            icon={<FolderOpen size={14} />}
            label="폴더로 내보내기"
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
            label="폴더에서 가져오기"
            onClick={() =>
              run(async () => {
                const r = await syncImportFromFolder()
                if (r.ok && r.pages) {
                  importWorkspacePages(r.pages, r.snippets)
                }
                setMsg({ type: r.ok ? 'ok' : 'err', text: r.message })
              })
            }
          />
        </Card>

        <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-muted)]">
          <p className="font-medium text-[var(--color-text)]">Git 워크플로 예시</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Vault 내보내기 또는 폴더 내보내기</li>
            <li>
              <code className="rounded bg-[var(--color-hover)] px-1">git init && git add docs noto-manifest.json</code>
            </li>
            <li>PR 리뷰용 문서는 페이지에 <code className="rounded bg-[var(--color-hover)] px-1">/git</code> 블록 추가</li>
            <li>정적 사이트 ZIP으로 내부 위키 공유</li>
          </ol>
          <p className="mt-3">활성 페이지 {pages.length}개 · 스니펫 {snippets.length}개</p>
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
