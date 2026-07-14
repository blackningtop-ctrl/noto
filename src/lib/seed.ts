import type { Page, Block, Database } from '../types'
import { uid } from './id'

function block(type: Block['type'], content: string, extra: Partial<Block> = {}): Block {
  return { id: uid(), type, content, ...extra }
}

function makeDb(): Database {
  const statusId = uid()
  const priorityId = uid()
  const dueId = uid()
  const todo = { id: uid(), name: '할 일', color: '#64748b' }
  const doing = { id: uid(), name: '진행 중', color: '#3b82f6' }
  const done = { id: uid(), name: '완료', color: '#22c55e' }
  const high = { id: uid(), name: '높음', color: '#ef4444' }
  const mid = { id: uid(), name: '중간', color: '#eab308' }
  const low = { id: uid(), name: '낮음', color: '#22c55e' }

  const props = [
    { id: statusId, name: '상태', type: 'status' as const, options: [todo, doing, done] },
    { id: priorityId, name: '우선순위', type: 'select' as const, options: [high, mid, low] },
    { id: dueId, name: '마감일', type: 'date' as const },
  ]

  const rows = [
    { id: uid(), values: { title: '랜딩 페이지 카피 작성', [statusId]: todo.id, [priorityId]: high.id, [dueId]: '2026-07-20' } },
    { id: uid(), values: { title: '벤토 홈 UI 다듬기', [statusId]: doing.id, [priorityId]: mid.id, [dueId]: '2026-07-18' } },
    { id: uid(), values: { title: '로컬 백업 내보내기', [statusId]: done.id, [priorityId]: low.id, [dueId]: '2026-07-15' } },
    { id: uid(), values: { title: '단축키 가이드', [statusId]: todo.id, [priorityId]: mid.id, [dueId]: '2026-07-25' } },
  ]

  const tableView = { id: uid(), name: '테이블', type: 'table' as const }
  const boardView = { id: uid(), name: '보드', type: 'board' as const, groupBy: statusId }
  const calView = { id: uid(), name: '캘린더', type: 'calendar' as const, datePropId: dueId }

  return {
    id: uid(),
    properties: props,
    rows,
    views: [tableView, boardView, calView],
    activeViewId: tableView.id,
  }
}

export function createSeedPages(): Page[] {
  const now = Date.now()
  const welcomeId = uid()
  const guideId = uid()
  const dbId = uid()
  const ideasId = uid()

  const welcome: Page = {
    id: welcomeId,
    title: '환영합니다',
    icon: '👋',
    parentId: null,
    order: 0,
    type: 'page',
    favorite: true,
    deleted: false,
    createdAt: now,
    updatedAt: now,
    cover: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    blocks: [
      block('heading1', 'Noto에 오신 것을 환영합니다'),
      block(
        'paragraph',
        '완전 무료 · 로컬 저장 · Notion 스타일 워크스페이스입니다. 데이터가 브라우저에만 저장되므로 로그인이나 구독이 필요 없습니다.',
      ),
      block(
        'callout',
        'v2.0 로컬 완성형: 트리 DnD · 관계/수식/캘린더 · 로컬 이미지 · 랭킹 검색 · 설정 · Undo · Git export',
      ),
      block('heading2', '시작하기'),
      block('bullet', 'Ctrl+K 커맨드 팔레트 · Ctrl+Z 실행취소'),
      block('bullet', '사이드바에서 페이지를 드래그해 순서/하위로 이동'),
      block('bullet', '/표 /이미지 /api /git /mermaid'),
      block('bullet', '[[단축키 & 마크다운]] 위키링크'),
      block('divider', ''),
      block('code', 'const note = { free: true, local: true, ai: false }\nconsole.log(note)', {
        language: 'typescript',
      }),
      block('mermaid', 'flowchart LR\n  Write --> Structure\n  Structure --> Export\n  Export --> Git'),
    ],
  }

  const guide: Page = {
    id: guideId,
    title: '단축키 & 마크다운',
    icon: '⌨️',
    parentId: welcomeId,
    order: 0,
    type: 'page',
    favorite: false,
    deleted: false,
    createdAt: now - 1000,
    updatedAt: now - 1000,
    blocks: [
      block('heading1', '빠른 입력'),
      block('paragraph', '블록 시작에서 문법 입력 후 Space:'),
      block('bullet', '# ## ###  제목'),
      block('bullet', '- *  목록 · 1. 번호 · [] 할 일'),
      block('bullet', '> 인용 · ``` 코드 · --- 구분선'),
      block('paragraph', '인라인: **굵게** *기울임* `코드` [[위키링크]]'),
      block('heading2', '단축키'),
      block('bullet', 'Ctrl+K 팔레트 · Ctrl+Z/Y 실행취소/다시'),
      block('bullet', 'Ctrl+H 홈 · Ctrl+G 그래프 · Ctrl+E Export'),
    ],
  }

  const dbPage: Page = {
    id: dbId,
    title: '프로젝트 트래커',
    icon: '📊',
    parentId: null,
    order: 1000,
    type: 'database',
    favorite: true,
    deleted: false,
    createdAt: now - 2000,
    updatedAt: now - 500,
    blocks: [],
    database: makeDb(),
  }

  const ideas: Page = {
    id: ideasId,
    title: '아이디어 메모',
    icon: '💡',
    parentId: null,
    order: 2000,
    type: 'page',
    favorite: false,
    deleted: false,
    createdAt: now - 3000,
    updatedAt: now - 2000,
    cover: 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
    blocks: [
      block('heading1', '떠오른 생각'),
      block('paragraph', '자유롭게 메모하세요. 사이드바에서 드래그로 정리할 수 있습니다.'),
      block('callout', '로컬 완성형: 클라우드 없이 끝까지.'),
    ],
  }

  return [welcome, guide, dbPage, ideas]
}
