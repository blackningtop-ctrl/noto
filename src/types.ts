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
  | 'mermaid'
  | 'api'
  | 'git'
  | 'divider'
  | 'callout'
  | 'image'
  | 'toggle'
  | 'table'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export interface ApiEndpoint {
  method: HttpMethod
  path: string
  summary: string
  requestBody: string
  responseBody: string
  statusCode: number
  contentType: string
}

export type GitProvider = 'github' | 'gitlab' | 'bitbucket' | 'other'

export interface GitMeta {
  provider: GitProvider
  repo: string
  branch: string
  pr: string
  issue: string
  commit: string
  note: string
}

export interface TableData {
  hasHeader: boolean
  rows: string[][]
}

export interface Block {
  id: string
  type: BlockType
  content: string
  checked?: boolean
  language?: string
  open?: boolean
  children?: Block[]
  api?: ApiEndpoint
  git?: GitMeta
  table?: TableData
  /** Local blob id for uploaded images: blob:<id> */
  blobId?: string
}

export type PropertyType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'status'
  | 'relation'
  | 'formula'

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
  /** formula expression, e.g. prop("Points") * 2 */
  formula?: string
}

export interface DbRow {
  id: string
  pageId?: string
  values: Record<string, string | number | boolean | string[] | null>
}

export type DbViewType = 'table' | 'board' | 'list' | 'gallery' | 'calendar'

export interface DbView {
  id: string
  name: string
  type: DbViewType
  groupBy?: string
  /** calendar date property id */
  datePropId?: string
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
  /** sibling order among same parent */
  order: number
  type: PageType
  blocks: Block[]
  database?: Database
  favorite: boolean
  deleted: boolean
  deletedAt?: number
  createdAt: number
  updatedAt: number
}

export interface Snippet {
  id: string
  name: string
  description: string
  language: string
  body: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface PageVersion {
  id: string
  pageId: string
  title: string
  icon: string
  blocks: Block[]
  database?: Database
  createdAt: number
  label: string
  auto: boolean
}

export interface AppSettings {
  trashRetentionDays: number
  showStorageBanner: boolean
  lastBackupAt: number | null
  backupRemindDays: number
  schemaVersion: number
}

export const CURRENT_SCHEMA_VERSION = 3

export type View =
  | { kind: 'home' }
  | { kind: 'page'; pageId: string }
  | { kind: 'trash' }
  | { kind: 'favorites' }
  | { kind: 'search' }
  | { kind: 'graph' }
  | { kind: 'snippets' }
  | { kind: 'export' }
  | { kind: 'settings' }

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

export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

export function defaultApiEndpoint(): ApiEndpoint {
  return {
    method: 'GET',
    path: '/api/v1/resource',
    summary: '엔드포인트 설명',
    requestBody: '{\n  \n}',
    responseBody: '{\n  "ok": true\n}',
    statusCode: 200,
    contentType: 'application/json',
  }
}

export function defaultGitMeta(): GitMeta {
  return {
    provider: 'github',
    repo: 'owner/repo',
    branch: 'main',
    pr: '',
    issue: '',
    commit: '',
    note: '',
  }
}

export function defaultTableData(): TableData {
  return {
    hasHeader: true,
    rows: [
      ['열 1', '열 2', '열 3'],
      ['', '', ''],
      ['', '', ''],
    ],
  }
}

export function defaultSettings(): AppSettings {
  return {
    trashRetentionDays: 30,
    showStorageBanner: true,
    lastBackupAt: null,
    backupRemindDays: 7,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  }
}

export function gitMetaUrls(git: GitMeta): {
  repoUrl: string
  branchUrl: string
  prUrl: string | null
  issueUrl: string | null
  commitUrl: string | null
} {
  const repo = git.repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '')
  if (git.provider === 'github' || git.provider === 'other') {
    const base = `https://github.com/${repo}`
    return {
      repoUrl: base,
      branchUrl: `${base}/tree/${encodeURIComponent(git.branch || 'main')}`,
      prUrl: git.pr ? `${base}/pull/${git.pr}` : null,
      issueUrl: git.issue ? `${base}/issues/${git.issue}` : null,
      commitUrl: git.commit ? `${base}/commit/${git.commit}` : null,
    }
  }
  if (git.provider === 'gitlab') {
    const base = `https://gitlab.com/${repo}`
    return {
      repoUrl: base,
      branchUrl: `${base}/-/tree/${encodeURIComponent(git.branch || 'main')}`,
      prUrl: git.pr ? `${base}/-/merge_requests/${git.pr}` : null,
      issueUrl: git.issue ? `${base}/-/issues/${git.issue}` : null,
      commitUrl: git.commit ? `${base}/-/commit/${git.commit}` : null,
    }
  }
  const base = `https://bitbucket.org/${repo}`
  return {
    repoUrl: base,
    branchUrl: `${base}/src/${encodeURIComponent(git.branch || 'main')}`,
    prUrl: git.pr ? `${base}/pull-requests/${git.pr}` : null,
    issueUrl: git.issue ? `${base}/issues/${git.issue}` : null,
    commitUrl: git.commit ? `${base}/commits/${git.commit}` : null,
  }
}
