import { useEffect, useMemo, useRef, useState } from 'react'
import type { BlockType } from '../types'
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code2,
  Minus,
  MessageSquare,
  Image as ImageIcon,
  ChevronRight,
  GitBranch,
  Globe,
} from 'lucide-react'
import clsx from 'clsx'

export interface SlashItem {
  type: BlockType
  label: string
  description: string
  keywords: string
  icon: React.ReactNode
}

export const SLASH_ITEMS: SlashItem[] = [
  { type: 'paragraph', label: '텍스트', description: '일반 문단', keywords: 'text paragraph 텍스트', icon: <Type size={18} /> },
  { type: 'heading1', label: '제목 1', description: '큰 제목', keywords: 'h1 heading 제목', icon: <Heading1 size={18} /> },
  { type: 'heading2', label: '제목 2', description: '중간 제목', keywords: 'h2 heading 제목', icon: <Heading2 size={18} /> },
  { type: 'heading3', label: '제목 3', description: '작은 제목', keywords: 'h3 heading 제목', icon: <Heading3 size={18} /> },
  { type: 'bullet', label: '글머리 기호', description: '순서 없는 목록', keywords: 'bullet list 목록', icon: <List size={18} /> },
  { type: 'numbered', label: '번호 목록', description: '순서 있는 목록', keywords: 'numbered list 번호', icon: <ListOrdered size={18} /> },
  { type: 'todo', label: '할 일', description: '체크리스트', keywords: 'todo checkbox 할일', icon: <CheckSquare size={18} /> },
  { type: 'toggle', label: '토글', description: '접을 수 있는 블록', keywords: 'toggle 토글', icon: <ChevronRight size={18} /> },
  { type: 'quote', label: '인용', description: '인용문', keywords: 'quote 인용', icon: <Quote size={18} /> },
  { type: 'callout', label: '콜아웃', description: '강조 박스', keywords: 'callout 콜아웃', icon: <MessageSquare size={18} /> },
  { type: 'code', label: '코드', description: '하이라이트 · 복사 · 언어', keywords: 'code 코드 highlight', icon: <Code2 size={18} /> },
  { type: 'mermaid', label: 'Mermaid', description: '다이어그램', keywords: 'mermaid diagram 시퀀스 플로우', icon: <GitBranch size={18} /> },
  { type: 'api', label: 'API 엔드포인트', description: 'Method · Path · Request/Response', keywords: 'api endpoint rest http', icon: <Globe size={18} /> },
  { type: 'divider', label: '구분선', description: '시각적 구분', keywords: 'divider 구분선 hr', icon: <Minus size={18} /> },
  { type: 'image', label: '이미지', description: '이미지 URL', keywords: 'image 이미지', icon: <ImageIcon size={18} /> },
]

interface Props {
  query: string
  onSelect: (type: BlockType) => void
  onClose: () => void
}

export function SlashMenu({ query, onSelect, onClose }: Props) {
  const [index, setIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const items = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return SLASH_ITEMS
    return SLASH_ITEMS.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.keywords.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q),
    )
  }, [query])

  useEffect(() => setIndex(0), [query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIndex((i) => Math.min(i + 1, items.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (items[index]) onSelect(items[index].type)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, items, onSelect, onClose])

  if (items.length === 0) {
    return (
      <div className="slash-menu" ref={ref}>
        <div className="px-3 py-2 text-sm" style={{ color: 'var(--color-muted)' }}>
          결과 없음
        </div>
      </div>
    )
  }

  return (
    <div className="slash-menu" ref={ref}>
      <div className="px-2 py-1.5 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        기본 블록
      </div>
      {items.map((item, i) => (
        <button
          key={item.type + item.label}
          type="button"
          className={clsx('slash-item', i === index && 'active')}
          onMouseEnter={() => setIndex(i)}
          onClick={() => onSelect(item.type)}
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg border"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-hover)' }}
          >
            {item.icon}
          </span>
          <span>
            <span className="block text-sm font-medium">{item.label}</span>
            <span className="block text-xs" style={{ color: 'var(--color-muted)' }}>
              {item.description}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
