import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import type { Block, BlockType } from '../types'
import { useStore } from '../store'
import { SlashMenu } from './SlashMenu'
import { CodeBlock } from './CodeBlock'
import { MermaidBlock } from './MermaidBlock'
import { ApiBlock } from './ApiBlock'
import { GitBlock } from './GitBlock'
import { TableBlock } from './TableBlock'
import { LocalImage } from './LocalImage'
import { RichBlockEditor, isRichBlockType, focusRichBlock } from './RichBlockEditor'
import { stripHtml } from '../lib/html-text'
import { defaultApiEndpoint, defaultGitMeta, defaultTableData } from '../types'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  pageId: string
  blocks: Block[]
}

// pageId used for selection AI

const MARKDOWN_MAP: { re: RegExp; type: BlockType }[] = [
  { re: /^###\s/, type: 'heading3' },
  { re: /^##\s/, type: 'heading2' },
  { re: /^#\s/, type: 'heading1' },
  { re: /^>\s/, type: 'quote' },
  { re: /^[-*]\s/, type: 'bullet' },
  { re: /^\d+\.\s/, type: 'numbered' },
  { re: /^\[\]\s?/, type: 'todo' },
  { re: /^```mermaid\s?/, type: 'mermaid' },
  { re: /^```\s?/, type: 'code' },
  { re: /^---$/, type: 'divider' },
]

function classFor(type: BlockType) {
  switch (type) {
    case 'heading1':
      return 'prose-h1'
    case 'heading2':
      return 'prose-h2'
    case 'heading3':
      return 'prose-h3'
    case 'quote':
      return 'prose-quote'
    case 'callout':
      return 'prose-callout'
    default:
      return ''
  }
}

export function BlockEditor({ pageId, blocks }: Props) {
  const updateBlock = useStore((s) => s.updateBlock)
  const addBlock = useStore((s) => s.addBlock)
  const removeBlock = useStore((s) => s.removeBlock)
  const changeBlockType = useStore((s) => s.changeBlockType)
  const moveBlock = useStore((s) => s.moveBlock)
  const [slash, setSlash] = useState<{ blockId: string; query: string } | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [activeRichId, setActiveRichId] = useState<string | null>(null)
  const focusId = useRef<string | null>(null)
  const specialRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  useEffect(() => {
    if (!focusId.current) return
    const id = focusId.current
    focusId.current = null
    requestAnimationFrame(() => {
      const special = specialRefs.current[id]
      if (special) special.focus()
      else focusRichBlock(id)
    })
  }, [blocks])

  const focus = (id: string) => {
    focusId.current = id
    requestAnimationFrame(() => {
      const special = specialRefs.current[id]
      if (special) special.focus()
      else focusRichBlock(id)
    })
  }

  const tryMarkdownShortcut = (block: Block, plain: string) => {
    if (plain.includes('\n')) return false
    for (const rule of MARKDOWN_MAP) {
      if (rule.re.test(plain)) {
        let content = plain.replace(rule.re, '')
        if (rule.type === 'mermaid') content = content || 'flowchart LR\n  A --> B'
        changeBlockType(pageId, block.id, rule.type)
        updateBlock(pageId, block.id, {
          content,
          ...(rule.type === 'code' ? { language: 'typescript' } : {}),
          ...(rule.type === 'table' ? { table: defaultTableData() } : {}),
        })
        setSlash(null)
        return true
      }
    }
    return false
  }

  const onRichChange = (block: Block, html: string, plain: string) => {
    if (tryMarkdownShortcut(block, plain)) return

    if (plain.startsWith('/')) {
      setSlash({ blockId: block.id, query: plain.slice(1) })
    } else if (slash?.blockId === block.id) {
      setSlash(null)
    }

    updateBlock(pageId, block.id, { content: html })
  }

  const selectSlash = (type: BlockType) => {
    if (!slash) return
    changeBlockType(pageId, slash.blockId, type)
    if (type === 'mermaid') {
      updateBlock(pageId, slash.blockId, {
        content: 'flowchart LR\n  A[Start] --> B[Done]',
      })
    } else if (type === 'code') {
      updateBlock(pageId, slash.blockId, { content: '', language: 'typescript' })
    } else if (type === 'api') {
      updateBlock(pageId, slash.blockId, { content: 'API', api: defaultApiEndpoint() })
    } else if (type === 'git') {
      updateBlock(pageId, slash.blockId, { content: 'Git', git: defaultGitMeta() })
    } else if (type === 'table') {
      updateBlock(pageId, slash.blockId, { content: 'table', table: defaultTableData() })
    } else {
      updateBlock(pageId, slash.blockId, { content: '' })
    }
    setSlash(null)
    if (type === 'divider') {
      const id = addBlock(pageId, slash.blockId, 'paragraph')
      focus(id)
    } else {
      focus(slash.blockId)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-8 pt-2 md:px-6">
      {blocks.map((block, index) => {
        const rich = isRichBlockType(block.type)
        return (
          <div
            key={block.id}
            className="block-row group relative flex items-start gap-1 py-0.5"
            draggable={
              block.type !== 'code' &&
              block.type !== 'mermaid' &&
              block.type !== 'api' &&
              block.type !== 'git' &&
              block.type !== 'table' &&
              block.type !== 'image'
            }
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== index) {
                moveBlock(pageId, dragIndex, index)
              }
              setDragIndex(null)
            }}
          >
            <div className="block-handle mt-1.5 flex shrink-0 items-center gap-0.5 text-[var(--color-muted)]">
              <button
                type="button"
                className="rounded p-0.5 hover:bg-[var(--color-hover)]"
                title="아래에 추가"
                onClick={() => {
                  const id = addBlock(pageId, block.id)
                  focus(id)
                }}
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                className="cursor-grab rounded p-0.5 hover:bg-[var(--color-hover)] active:cursor-grabbing"
                title="드래그하여 이동"
              >
                <GripVertical size={14} />
              </button>
            </div>

            <div className="relative min-w-0 flex-1">
              {block.type === 'divider' ? (
                <div className="flex items-center gap-2 py-3">
                  <hr className="flex-1 border-[var(--color-border)]" />
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={() => removeBlock(pageId, block.id)}
                  >
                    <Trash2 size={14} className="text-[var(--color-muted)]" />
                  </button>
                </div>
              ) : block.type === 'image' ? (
                <LocalImage
                  content={block.content}
                  onChange={(content) => updateBlock(pageId, block.id, { content })}
                />
              ) : block.type === 'table' ? (
                <TableBlock
                  table={block.table ?? defaultTableData()}
                  onChange={(table) => updateBlock(pageId, block.id, { table, content: 'table' })}
                />
              ) : block.type === 'code' ? (
                <CodeBlock
                  content={block.content}
                  language={block.language || 'typescript'}
                  onChange={(content) => updateBlock(pageId, block.id, { content })}
                  onLanguageChange={(language) => updateBlock(pageId, block.id, { language })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault()
                      const id = addBlock(pageId, block.id, 'paragraph')
                      focus(id)
                    }
                  }}
                  textareaRef={(el) => {
                    specialRefs.current[block.id] = el
                  }}
                />
              ) : block.type === 'mermaid' ? (
                <MermaidBlock
                  content={block.content}
                  onChange={(content) => updateBlock(pageId, block.id, { content })}
                  textareaRef={(el) => {
                    specialRefs.current[block.id] = el
                  }}
                />
              ) : block.type === 'api' ? (
                <ApiBlock
                  api={block.api ?? defaultApiEndpoint()}
                  onChange={(api) => updateBlock(pageId, block.id, { api, content: 'API' })}
                />
              ) : block.type === 'git' ? (
                <GitBlock
                  git={block.git ?? defaultGitMeta()}
                  onChange={(git) => updateBlock(pageId, block.id, { git, content: 'Git' })}
                />
              ) : rich ? (
                <div
                  className={clsx(
                    'flex items-start gap-2',
                    block.type === 'callout' && 'prose-callout w-full',
                  )}
                >
                  {block.type === 'todo' && (
                    <input
                      type="checkbox"
                      className="mt-2.5 h-4 w-4 accent-[var(--color-accent)]"
                      checked={!!block.checked}
                      onChange={(e) =>
                        updateBlock(pageId, block.id, { checked: e.target.checked })
                      }
                    />
                  )}
                  {block.type === 'bullet' && (
                    <span className="mt-2 select-none text-lg leading-none">•</span>
                  )}
                  {block.type === 'numbered' && (
                    <span
                      className="mt-2 w-5 shrink-0 select-none text-sm"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      {blocks.slice(0, index + 1).filter((b) => b.type === 'numbered').length}.
                    </span>
                  )}
                  {block.type === 'toggle' && (
                    <button
                      type="button"
                      className="mt-2"
                      onClick={() => updateBlock(pageId, block.id, { open: !block.open })}
                    >
                      <span className={clsx('inline-block transition', block.open && 'rotate-90')}>
                        ▸
                      </span>
                    </button>
                  )}

                  <RichBlockEditor
                    blockId={block.id}
                    blockType={block.type}
                    pageId={pageId}
                    content={block.content}
                    className={clsx(
                      classFor(block.type),
                      block.type === 'todo' && block.checked && 'line-through opacity-55',
                    )}
                    showToolbar={activeRichId === block.id}
                    placeholder={
                      index === 0 && !stripHtml(block.content)
                        ? "여기에 적어 보세요. '/' 메뉴 · [[노트링크]] · 툴바로 굵게/기울임"
                        : block.type === 'heading1'
                          ? '큰 제목'
                          : block.type === 'heading2'
                            ? '중간 제목'
                            : block.type === 'heading3'
                              ? '작은 제목'
                              : block.type === 'todo'
                                ? '할 일'
                                : block.type === 'bullet'
                                  ? '목록'
                                  : '글을 입력하세요…'
                    }
                    onChange={(html, plain) => onRichChange(block, html, plain)}
                    onEnter={() => {
                      const id = addBlock(pageId, block.id, 'paragraph')
                      focus(id)
                    }}
                    onEmptyBackspace={() => {
                      if (blocks.length <= 1) return
                      const prev = blocks[index - 1]
                      removeBlock(pageId, block.id)
                      if (prev) focus(prev.id)
                    }}
                    onSlash={(query) => setSlash({ blockId: block.id, query })}
                    onCloseSlash={() => {
                      if (slash?.blockId === block.id) setSlash(null)
                    }}
                    onFocusEditor={(_ed: Editor) => setActiveRichId(block.id)}
                  />
                </div>
              ) : null}

              {slash?.blockId === block.id && (
                <div className="absolute left-0 top-full z-50 mt-1">
                  <SlashMenu
                    query={slash.query}
                    onSelect={selectSlash}
                    onClose={() => {
                      updateBlock(pageId, block.id, { content: '' })
                      setSlash(null)
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
