import { useEffect, useMemo } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { WikiLink } from '../lib/tiptap-wiki'
import { plainToHtml, stripHtml, isProbablyHtml } from '../lib/html-text'
import { useStore, useActivePages } from '../store'
import { findPageByWikiTitle } from '../lib/wiki'
import { useSelectionStore } from '../lib/selection-store'
import { EditorToolbar } from './EditorToolbar'
import type { BlockType } from '../types'
import clsx from 'clsx'

const RICH_TYPES: BlockType[] = [
  'paragraph',
  'heading1',
  'heading2',
  'heading3',
  'bullet',
  'numbered',
  'todo',
  'quote',
  'callout',
  'toggle',
]

export function isRichBlockType(type: BlockType): boolean {
  return RICH_TYPES.includes(type)
}

interface Props {
  blockId: string
  blockType: BlockType
  content: string
  checked?: boolean
  placeholder?: string
  showToolbar?: boolean
  onChange: (html: string, plain: string) => void
  onEmptyBackspace?: () => void
  onEnter?: () => void
  onSlash?: (query: string) => void
  onCloseSlash?: () => void
  onFocusEditor?: (editor: Editor) => void
  className?: string
  pageId?: string
}

export function RichBlockEditor({
  blockId,
  content,
  placeholder,
  showToolbar,
  onChange,
  onEmptyBackspace,
  onEnter,
  onSlash,
  onCloseSlash,
  onFocusEditor,
  className,
  pageId,
}: Props) {
  const pages = useActivePages()
  const setView = useStore((s) => s.setView)
  const createPage = useStore((s) => s.createPage)
  const setSelection = useSelectionStore((s) => s.setSelection)

  const initial = useMemo(() => {
    if (!content) return ''
    return isProbablyHtml(content) ? content : plainToHtml(content)
  }, [blockId]) // only on mount per block

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          codeBlock: false,
          blockquote: false,
          horizontalRule: false,
          // keep paragraph, bold, italic, strike, code, hardBreak
        }),
        Underline,
        Placeholder.configure({
          placeholder: placeholder || '글을 입력하세요…',
          emptyEditorClass: 'is-editor-empty',
        }),
        WikiLink,
      ],
      content: initial || '<p></p>',
      editorProps: {
        attributes: {
          class: clsx('rich-editor-content outline-none', className),
          'data-block-id': blockId,
        },
        handleKeyDown: (_view, event) => {
          if (!editor) return false

          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            onEnter?.()
            return true
          }

          if (event.key === 'Backspace') {
            const text = editor.state.doc.textContent
            if (!text) {
              event.preventDefault()
              onEmptyBackspace?.()
              return true
            }
          }

          return false
        },
        handleClick: (_view, _pos, event) => {
          const t = event.target as HTMLElement | null
          const wiki = t?.closest?.('[data-wiki]') as HTMLElement | null
          if (!wiki) return false
          event.preventDefault()
          const title = wiki.getAttribute('data-wiki') || wiki.textContent || ''
          if (!title.trim()) return true
          const found = findPageByWikiTitle(pages, title)
          if (found) {
            setView({ kind: 'page', pageId: found.id })
          } else if (confirm(`"${title}" 노트가 없어요. 새로 만들까요?`)) {
            const id = createPage({ title: title.trim() })
            setView({ kind: 'page', pageId: id })
          }
          return true
        },
      },
      onUpdate: ({ editor: ed }) => {
        const html = ed.getHTML()
        const plain = ed.getText()
        onChange(html === '<p></p>' ? '' : html, plain)

        // slash command: only when block is essentially "/query"
        const trimmed = plain
        if (trimmed.startsWith('/')) {
          onSlash?.(trimmed.slice(1))
        } else {
          onCloseSlash?.()
        }
      },
      onFocus: ({ editor: ed }) => {
        onFocusEditor?.(ed)
      },
      onSelectionUpdate: ({ editor: ed }) => {
        const { from, to, empty } = ed.state.selection
        if (empty || from === to) {
          // don't clear if user clicked bubble — only clear when truly empty
          return
        }
        const text = ed.state.doc.textBetween(from, to, ' ')
        if (!text.trim()) return
        const domSel = window.getSelection()
        let rect: { top: number; left: number; width: number; height: number } | null = null
        if (domSel && domSel.rangeCount > 0) {
          const r = domSel.getRangeAt(0).getBoundingClientRect()
          if (r.width || r.height) {
            rect = { top: r.top, left: r.left, width: r.width, height: r.height }
          }
        }
        setSelection({
          text: text.trim(),
          rect,
          blockId,
          pageId: pageId ?? null,
        })
      },
      onBlur: () => {
        // delay clear so bubble click works
        window.setTimeout(() => {
          const active = document.activeElement
          if (active?.closest?.('.selection-ai-bubble') || active?.closest?.('[class*="AiPanel"]')) {
            return
          }
          // keep selection text for AI panel; only clear rect so bubble hides
          setSelection({
            text: useSelectionStore.getState().text,
            rect: null,
            blockId,
            pageId: pageId ?? null,
          })
        }, 150)
      },
    },
    [blockId, pageId],
  )

  // external content sync (e.g. type change cleared content)
  useEffect(() => {
    if (!editor) return
    const html = isProbablyHtml(content) ? content : plainToHtml(content)
    const current = editor.getHTML()
    const curPlain = stripHtml(current)
    const nextPlain = stripHtml(html || '')
    // avoid cursor jump if same text
    if (curPlain === nextPlain && (html || '') === current) return
    if (!content && editor.getText() === '') return
    if (content === '' && editor.getText() !== '') {
      editor.commands.setContent('<p></p>', { emitUpdate: false })
    }
  }, [content, editor])

  useEffect(() => {
    if (!editor) return
    // missing wiki styling class for unresolved links
    const root = editor.view.dom
    root.querySelectorAll('[data-wiki]').forEach((el) => {
      const title = el.getAttribute('data-wiki') || ''
      const exists = !!findPageByWikiTitle(pages, title)
      el.classList.toggle('wiki-link-missing', !exists)
    })
  }, [editor, pages, content])

  return (
    <div className="min-w-0 flex-1">
      {showToolbar && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}

/** Allow parent to focus a block by id via custom event */
export function focusRichBlock(blockId: string) {
  const el = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement | null
  el?.focus()
}
