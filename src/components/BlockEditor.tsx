import { useEffect, useRef, useState } from 'react'
import type { Block, BlockType } from '../types'
import { useStore } from '../store'
import { SlashMenu } from './SlashMenu'
import { CodeBlock } from './CodeBlock'
import { MermaidBlock } from './MermaidBlock'
import { ApiBlock } from './ApiBlock'
import { GitBlock } from './GitBlock'
import { WikiText } from './WikiText'
import { defaultApiEndpoint, defaultGitMeta } from '../types'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  pageId: string
  blocks: Block[]
}

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
  const focusId = useRef<string | null>(null)
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  useEffect(() => {
    if (focusId.current) {
      const el = refs.current[focusId.current]
      el?.focus()
      focusId.current = null
    }
  }, [blocks])

  const focus = (id: string) => {
    focusId.current = id
    requestAnimationFrame(() => refs.current[id]?.focus())
  }

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  const onChange = (block: Block, value: string) => {
    if (value.startsWith('/')) {
      setSlash({ blockId: block.id, query: value.slice(1) })
    } else if (slash?.blockId === block.id) {
      setSlash(null)
    }

    for (const rule of MARKDOWN_MAP) {
      if (rule.re.test(value)) {
        let content = value.replace(rule.re, '')
        if (rule.type === 'mermaid') content = content || 'flowchart LR\n  A --> B'
        changeBlockType(pageId, block.id, rule.type)
        updateBlock(pageId, block.id, {
          content,
          ...(rule.type === 'code' ? { language: 'typescript' } : {}),
        })
        return
      }
    }

    updateBlock(pageId, block.id, { content: value })
  }

  const onKeyDown = (e: React.KeyboardEvent, block: Block, index: number) => {
    if (slash) return

    const isCodeLike =
      block.type === 'code' ||
      block.type === 'mermaid' ||
      block.type === 'api' ||
      block.type === 'git'
    if (e.key === 'Enter' && !e.shiftKey && !isCodeLike) {
      e.preventDefault()
      const id = addBlock(pageId, block.id, 'paragraph')
      focus(id)
    }

    if (e.key === 'Backspace' && block.content === '' && blocks.length > 1) {
      e.preventDefault()
      const prev = blocks[index - 1]
      removeBlock(pageId, block.id)
      if (prev) focus(prev.id)
    }

    if (e.key === 'ArrowUp' && index > 0 && !isCodeLike) {
      const el = e.currentTarget as HTMLTextAreaElement
      if (el.selectionStart === 0) {
        e.preventDefault()
        focus(blocks[index - 1].id)
      }
    }

    if (e.key === 'ArrowDown' && index < blocks.length - 1 && !isCodeLike) {
      const el = e.currentTarget as HTMLTextAreaElement
      if (el.selectionStart === el.value.length) {
        e.preventDefault()
        focus(blocks[index + 1].id)
      }
    }
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
    <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-2">
      {blocks.map((block, index) => (
        <div
          key={block.id}
          className="block-row group relative flex items-start gap-1 py-0.5"
          draggable={
            block.type !== 'code' &&
            block.type !== 'mermaid' &&
            block.type !== 'api' &&
            block.type !== 'git'
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
          <div className="block-handle mt-1 flex shrink-0 items-center gap-0.5 text-[var(--color-muted)]">
            <button
              type="button"
              className="rounded p-0.5 hover:bg-[var(--color-hover)]"
              title="아래에 블록 추가"
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
              <div className="space-y-2">
                <input
                  className="block-input text-sm"
                  style={{ color: 'var(--color-muted)' }}
                  placeholder="이미지 URL을 입력하세요…"
                  value={block.content}
                  onChange={(e) => updateBlock(pageId, block.id, { content: e.target.value })}
                />
                {block.content && (
                  <img
                    src={block.content}
                    alt=""
                    className="max-h-96 rounded-xl border border-[var(--color-border)] object-contain"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                )}
              </div>
            ) : block.type === 'code' ? (
              <CodeBlock
                content={block.content}
                language={block.language || 'typescript'}
                onChange={(content) => updateBlock(pageId, block.id, { content })}
                onLanguageChange={(language) => updateBlock(pageId, block.id, { language })}
                onKeyDown={(e) => onKeyDown(e, block, index)}
                textareaRef={(el) => {
                  refs.current[block.id] = el
                }}
              />
            ) : block.type === 'mermaid' ? (
              <MermaidBlock
                content={block.content}
                onChange={(content) => updateBlock(pageId, block.id, { content })}
                onKeyDown={(e) => onKeyDown(e, block, index)}
                textareaRef={(el) => {
                  refs.current[block.id] = el
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
            ) : (
              <div
                className={clsx(
                  'flex items-start gap-2',
                  block.type === 'callout' && 'prose-callout',
                )}
              >
                {block.type === 'todo' && (
                  <input
                    type="checkbox"
                    className="mt-2 h-4 w-4 accent-[var(--color-accent)]"
                    checked={!!block.checked}
                    onChange={(e) => updateBlock(pageId, block.id, { checked: e.target.checked })}
                  />
                )}
                {block.type === 'bullet' && (
                  <span className="mt-2 select-none text-lg leading-none">•</span>
                )}
                {block.type === 'numbered' && (
                  <span
                    className="mt-1.5 w-5 shrink-0 select-none text-sm"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    {blocks.slice(0, index + 1).filter((b) => b.type === 'numbered').length}.
                  </span>
                )}
                {block.type === 'toggle' && (
                  <button
                    type="button"
                    className="mt-1.5"
                    onClick={() => updateBlock(pageId, block.id, { open: !block.open })}
                  >
                    <span className={clsx('inline-block transition', block.open && 'rotate-90')}>
                      ▸
                    </span>
                  </button>
                )}

                <WikiText
                  className={clsx(
                    classFor(block.type),
                    block.type === 'todo' && block.checked && 'line-through opacity-55',
                  )}
                  value={block.content}
                  placeholder={
                    index === 0 && !block.content
                      ? "입력 · '/' 명령 · [[위키링크]] …"
                      : block.type === 'heading1'
                        ? '제목 1'
                        : block.type === 'heading2'
                          ? '제목 2'
                          : block.type === 'heading3'
                            ? '제목 3'
                            : ''
                  }
                  onChange={(value) => {
                    onChange(block, value)
                  }}
                  onKeyDown={(e) => onKeyDown(e, block, index)}
                  textareaRef={(el) => {
                    refs.current[block.id] = el
                    if (el) autoResize(el)
                  }}
                />
              </div>
            )}

            {slash?.blockId === block.id && (
              <div className="absolute left-0 top-full z-50 mt-1">
                <SlashMenu
                  query={slash.query}
                  onSelect={selectSlash}
                  onClose={() => {
                    updateBlock(pageId, block.id, {
                      content: block.content.startsWith('/') ? '' : block.content,
                    })
                    setSlash(null)
                  }}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
