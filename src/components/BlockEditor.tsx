import { useEffect, useRef, useState } from 'react'
import type { Block, BlockType } from '../types'
import { useStore } from '../store'
import { SlashMenu } from './SlashMenu'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  pageId: string
  blocks: Block[]
}

const MARKDOWN_MAP: { re: RegExp; type: BlockType; strip: number }[] = [
  { re: /^###\s/, type: 'heading3', strip: 4 },
  { re: /^##\s/, type: 'heading2', strip: 3 },
  { re: /^#\s/, type: 'heading1', strip: 2 },
  { re: /^>\s/, type: 'quote', strip: 2 },
  { re: /^[-*]\s/, type: 'bullet', strip: 2 },
  { re: /^\d+\.\s/, type: 'numbered', strip: 3 },
  { re: /^\[\]\s?/, type: 'todo', strip: 3 },
  { re: /^```\s?/, type: 'code', strip: 3 },
  { re: /^---$/, type: 'divider', strip: 3 },
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
    case 'code':
      return 'prose-code'
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
        const content = value.replace(rule.re, '')
        changeBlockType(pageId, block.id, rule.type)
        updateBlock(pageId, block.id, { content })
        return
      }
    }

    updateBlock(pageId, block.id, { content: value })
  }

  const onKeyDown = (e: React.KeyboardEvent, block: Block, index: number) => {
    if (slash) return

    if (e.key === 'Enter' && !e.shiftKey && block.type !== 'code') {
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

    if (e.key === 'ArrowUp' && index > 0) {
      const el = e.currentTarget as HTMLTextAreaElement
      if (el.selectionStart === 0) {
        e.preventDefault()
        focus(blocks[index - 1].id)
      }
    }

    if (e.key === 'ArrowDown' && index < blocks.length - 1) {
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
    updateBlock(pageId, slash.blockId, { content: type === 'divider' ? '' : '' })
    setSlash(null)
    if (type === 'divider') {
      const id = addBlock(pageId, slash.blockId, 'paragraph')
      focus(id)
    } else {
      focus(slash.blockId)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-2">
      {blocks.map((block, index) => (
        <div
          key={block.id}
          className="block-row group relative flex items-start gap-1 py-0.5"
          draggable
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
            ) : (
              <div
                className={clsx(
                  'flex items-start gap-2',
                  block.type === 'callout' && 'prose-callout',
                  block.type === 'code' && 'prose-code !p-0',
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
                  <span className="mt-1.5 w-5 shrink-0 select-none text-sm" style={{ color: 'var(--color-muted)' }}>
                    {blocks.slice(0, index + 1).filter((b) => b.type === 'numbered').length}.
                  </span>
                )}
                {block.type === 'toggle' && (
                  <button
                    type="button"
                    className="mt-1.5"
                    onClick={() => updateBlock(pageId, block.id, { open: !block.open })}
                  >
                    <span className={clsx('inline-block transition', block.open && 'rotate-90')}>▸</span>
                  </button>
                )}

                <textarea
                  ref={(el) => {
                    refs.current[block.id] = el
                    if (el) autoResize(el)
                  }}
                  className={clsx(
                    'block-input',
                    classFor(block.type),
                    block.type === 'todo' && block.checked && 'line-through opacity-55',
                    block.type === 'code' && 'font-mono text-sm',
                  )}
                  rows={1}
                  placeholder={
                    index === 0 && !block.content
                      ? "입력하거나 '/' 로 명령…"
                      : block.type === 'heading1'
                        ? '제목 1'
                        : block.type === 'heading2'
                          ? '제목 2'
                          : block.type === 'heading3'
                            ? '제목 3'
                            : ''
                  }
                  value={block.content}
                  onChange={(e) => {
                    onChange(block, e.target.value)
                    autoResize(e.target)
                  }}
                  onKeyDown={(e) => onKeyDown(e, block, index)}
                  spellCheck={block.type !== 'code'}
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
