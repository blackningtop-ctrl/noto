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
  GitBranch as GitIcon,
  Table,
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
  { type: 'paragraph', label: '글', description: '그냥 쓰기', keywords: 'text paragraph 텍스트 글', icon: <Type size={18} /> },
  { type: 'heading1', label: '큰 제목', description: '제일 큰 제목', keywords: 'h1 heading 제목', icon: <Heading1 size={18} /> },
  { type: 'heading2', label: '중간 제목', description: '중간 크기 제목', keywords: 'h2 heading 제목', icon: <Heading2 size={18} /> },
  { type: 'heading3', label: '작은 제목', description: '작은 제목', keywords: 'h3 heading 제목', icon: <Heading3 size={18} /> },
  { type: 'bullet', label: '목록', description: '점 목록', keywords: 'bullet list 목록', icon: <List size={18} /> },
  { type: 'numbered', label: '번호 목록', description: '1, 2, 3…', keywords: 'numbered list 번호', icon: <ListOrdered size={18} /> },
  { type: 'todo', label: '할 일', description: '체크박스', keywords: 'todo checkbox 할일', icon: <CheckSquare size={18} /> },
  { type: 'toggle', label: '접기 상자', description: '눌러서 열고 닫기', keywords: 'toggle 토글', icon: <ChevronRight size={18} /> },
  { type: 'quote', label: '인용', description: '강조 문장', keywords: 'quote 인용', icon: <Quote size={18} /> },
  { type: 'callout', label: '알림 상자', description: '중요한 메모', keywords: 'callout 콜아웃 알림', icon: <MessageSquare size={18} /> },
  { type: 'table', label: '표', description: '칸 나누기', keywords: 'table 표 테이블', icon: <Table size={18} /> },
  { type: 'image', label: '사진', description: '올리거나 주소 붙이기', keywords: 'image 이미지 사진', icon: <ImageIcon size={18} /> },
  { type: 'divider', label: '구분선', description: '가로줄', keywords: 'divider 구분선 hr', icon: <Minus size={18} /> },
  { type: 'code', label: '코드', description: '프로그래밍 코드', keywords: 'code 코드', icon: <Code2 size={18} /> },
  { type: 'mermaid', label: '그림 도식', description: '흐름도 (고급)', keywords: 'mermaid diagram 도식', icon: <GitBranch size={18} /> },
  { type: 'api', label: 'API 카드', description: '개발용 (고급)', keywords: 'api endpoint', icon: <Globe size={18} /> },
  { type: 'git', label: 'Git 카드', description: '개발용 (고급)', keywords: 'git github', icon: <GitIcon size={18} /> },
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
        넣을 수 있는 것
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
