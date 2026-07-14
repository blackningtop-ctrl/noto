import { useEffect, useRef, useState } from 'react'
import { useStore, usePage } from '../store'
import { BlockEditor } from './BlockEditor'
import { DatabaseView } from './DatabaseView'
import { Backlinks } from './Backlinks'
import { VersionHistory } from './VersionHistory'
import { AiPanel } from './AiPanel'
import { SelectionAiBubble } from './SelectionAiBubble'
import { pageToMarkdown } from '../lib/markdown'
import { PAGE_ICONS } from '../types'
import { hasXaiApiKey } from '../lib/ai-key'
import {
  Star,
  Trash2,
  MoreHorizontal,
  Copy,
  Image as ImageIcon,
  FileCode2,
  Sparkles,
} from 'lucide-react'
import clsx from 'clsx'

const COVERS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%)',
]

interface Props {
  pageId: string
}

export function PageView({ pageId }: Props) {
  const page = usePage(pageId)
  const updatePage = useStore((s) => s.updatePage)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const deletePage = useStore((s) => s.deletePage)
  const duplicatePage = useStore((s) => s.duplicatePage)
  const [iconOpen, setIconOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`
    }
  }, [page?.title])

  if (!page || page.deleted) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--color-muted)]">
        페이지를 찾을 수 없습니다.
      </div>
    )
  }

  return (
    <div className="fade-in h-full overflow-y-auto">
      {page.cover && (
        <div className="relative h-40 w-full md:h-48" style={{ background: page.cover }}>
          <button
            type="button"
            className="absolute bottom-3 right-4 rounded-lg bg-black/40 px-2 py-1 text-xs text-white backdrop-blur hover:bg-black/55"
            onClick={() =>
              updatePage(page.id, {
                cover: COVERS[Math.floor(Math.random() * COVERS.length)],
              })
            }
          >
            배경 바꾸기
          </button>
        </div>
      )}

      <div className={clsx('mx-auto max-w-2xl px-5 md:px-6', page.cover ? '-mt-8' : 'pt-10 md:pt-14')}>
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="relative">
            <button
              type="button"
              className="text-5xl leading-none transition hover:opacity-80"
              onClick={() => setIconOpen((v) => !v)}
              title="아이콘 바꾸기"
            >
              {page.icon}
            </button>
            {iconOpen && (
              <div className="absolute left-0 top-full z-30 mt-2 grid w-64 grid-cols-6 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-2 shadow-xl">
                {PAGE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className="rounded-lg p-1.5 text-xl hover:bg-[var(--color-hover)]"
                    onClick={() => {
                      updatePage(page.id, { icon })
                      setIconOpen(false)
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative flex items-center gap-1 pt-2">
            {!page.cover && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[var(--color-muted)] hover:bg-[var(--color-hover)]"
                onClick={() => updatePage(page.id, { cover: COVERS[0] })}
              >
                <ImageIcon size={14} /> 배경
              </button>
            )}
            <button
              type="button"
              className={clsx(
                'inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs hover:bg-[var(--color-hover)]',
                aiOpen
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                  : 'text-[var(--color-muted)]',
              )}
              onClick={() => setAiOpen((v) => !v)}
              title={hasXaiApiKey() ? 'AI 도우미' : 'AI (설정에서 API 키 필요)'}
            >
              <Sparkles size={14} />
              AI
            </button>
            <button
              type="button"
              className={clsx(
                'rounded-lg p-1.5 hover:bg-[var(--color-hover)]',
                page.favorite && 'text-amber-500',
              )}
              onClick={() => toggleFavorite(page.id)}
              title="즐겨찾기"
            >
              <Star size={16} fill={page.favorite ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              className="rounded-lg p-1.5 hover:bg-[var(--color-hover)]"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full z-30 mt-1 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-1 shadow-xl"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--color-hover)]"
                  onClick={() => {
                    duplicatePage(page.id)
                    setMenuOpen(false)
                  }}
                >
                  <Copy size={14} /> 복사하기
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--color-hover)]"
                  onClick={() => {
                    const md = pageToMarkdown(page)
                    const blob = new Blob([md], { type: 'text/markdown' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${(page.title || 'page').replace(/[\\/:*?"<>|]/g, '_')}.md`
                    a.click()
                    URL.revokeObjectURL(url)
                    setMenuOpen(false)
                  }}
                >
                  <FileCode2 size={14} /> 파일로 저장
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--color-danger)] hover:bg-[var(--color-hover)]"
                  onClick={() => {
                    deletePage(page.id)
                    setMenuOpen(false)
                  }}
                >
                  <Trash2 size={14} /> 삭제
                </button>
              </div>
            )}
          </div>
        </div>

        <textarea
          ref={titleRef}
          className="w-full resize-none border-none bg-transparent text-4xl font-bold outline-none placeholder:text-[var(--color-muted)]"
          rows={1}
          placeholder="제목 없음"
          value={page.title}
          onChange={(e) => updatePage(page.id, { title: e.target.value })}
        />
      </div>

      {page.type === 'database' && page.database ? (
        <div className="mt-6">
          <DatabaseView page={page} />
        </div>
      ) : (
        <div className="mt-4">
          <BlockEditor pageId={page.id} blocks={page.blocks} />
          <VersionHistory pageId={page.id} />
          <Backlinks page={page} />
        </div>
      )}
      {page.type === 'database' && (
        <div className="mt-4">
          <VersionHistory pageId={page.id} />
        </div>
      )}

      <SelectionAiBubble pageId={page.id} onOpenAi={() => setAiOpen(true)} />
      <AiPanel page={page} open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  )
}
