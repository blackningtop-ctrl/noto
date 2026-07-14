export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bullet'
  | 'numbered'
  | 'todo'
  | 'quote'
  | 'code'
  | 'divider'
  | 'callout'
  | 'image'
  | 'toggle'

export interface Block {
  id: string
  type: BlockType
  content: string
  checked?: boolean
  language?: string
  open?: boolean
  children?: Block[]
}

export type PropertyType = 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'status'

export interface SelectOption {
  id: string
  name: string
  color: string
}

export interface Property {
  id: string
  name: string
  type: PropertyType
  options?: SelectOption[]
}

export interface DbRow {
  id: string
  pageId?: string
  values: Record<string, string | number | boolean | string[] | null>
}

export type DbViewType = 'table' | 'board' | 'list' | 'gallery'

export interface DbView {
  id: string
  name: string
  type: DbViewType
  groupBy?: string
}

export interface Database {
  id: string
  properties: Property[]
  rows: DbRow[]
  views: DbView[]
  activeViewId: string
}

export type PageType = 'page' | 'database'

export interface Page {
  id: string
  title: string
  icon: string
  cover?: string
  parentId: string | null
  type: PageType
  blocks: Block[]
  database?: Database
  favorite: boolean
  deleted: boolean
  deletedAt?: number
  createdAt: number
  updatedAt: number
}

export type View =
  | { kind: 'home' }
  | { kind: 'page'; pageId: string }
  | { kind: 'trash' }
  | { kind: 'favorites' }
  | { kind: 'search' }

export const SELECT_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
] as const

export const PAGE_ICONS = [
  '📄', '📝', '📘', '💡', '🎯', '🚀', '⭐', '🏠', '📁', '🗂️',
  '✅', '🔥', '💎', '🎨', '📊', '🧠', '⚡', '🌟', '📌', '🗓️',
  '💼', '🛒', '🎮', '📚', '🧪', '🛠️', '🎵', '📷', '🌍', '❤️',
]
