import type { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link2,
  RemoveFormatting,
} from 'lucide-react'
import clsx from 'clsx'

interface Props {
  editor: Editor | null
}

export function EditorToolbar({ editor }: Props) {
  if (!editor) return null

  const btn = (
    active: boolean,
    onClick: () => void,
    title: string,
    children: React.ReactNode,
  ) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={clsx(
        'rounded-md p-1.5 transition',
        active
          ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
          : 'text-[var(--color-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]',
      )}
    >
      {children}
    </button>
  )

  return (
    <div className="editor-toolbar mb-1 flex flex-wrap items-center gap-0.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-hover)]/60 px-1.5 py-1">
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), '굵게 (Ctrl+B)', <Bold size={15} />)}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), '기울임 (Ctrl+I)', <Italic size={15} />)}
      {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), '밑줄 (Ctrl+U)', <UnderlineIcon size={15} />)}
      {btn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), '취소선', <Strikethrough size={15} />)}
      {btn(editor.isActive('code'), () => editor.chain().focus().toggleCode().run(), '인라인 코드', <Code size={15} />)}
      {btn(false, () => {
        const title = window.prompt('연결할 노트 제목 (예: 환영합니다)')
        if (!title?.trim()) return
        const t = title.trim()
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'text',
            text: t,
            marks: [{ type: 'wikiLink', attrs: { title: t } }],
          })
          .insertContent(' ')
          .run()
      }, '노트 링크 [[ ]]', <Link2 size={15} />)}
      {btn(false, () => editor.chain().focus().unsetAllMarks().run(), '서식 지우기', <RemoveFormatting size={15} />)}
      <span className="ml-1 hidden text-[10px] text-[var(--color-muted)] sm:inline">
        [[제목]] · Ctrl+B/I
      </span>
    </div>
  )
}
