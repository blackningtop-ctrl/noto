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

  return {
    id: uid(),
    properties: props,
    rows,
    views: [tableView, boardView],
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
    type: 'page',
    favorite: true,
    deleted: false,
    createdAt: now,
    updatedAt: now,
    cover: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    blocks: [
      block('heading1', 'Noto에 오신 것을 환영합니다'),
      block('paragraph', '완전 무료 · 로컬 저장 · Notion 스타일 워크스페이스입니다. 데이터가 브라우저에만 저장되므로 로그인이나 구독이 필요 없습니다.'),
      block('callout', '💡 팁: 빈 줄에서 / 를 입력하면 블록 메뉴가 열립니다. # ## ### 로 제목을 빠르게 만들 수 있습니다.'),
      block('heading2', '주요 기능'),
      block('todo', '페이지 · 하위 페이지 만들기', { checked: true }),
      block('todo', '블록 에디터 (제목, 리스트, 코드, 인용 등)', { checked: true }),
      block('todo', '데이터베이스 테이블 & 칸반 보드', { checked: true }),
      block('todo', '벤토 그리드 홈 대시보드', { checked: true }),
      block('todo', '즐겨찾기 · 휴지통 · 검색 · 다크모드', { checked: true }),
      block('todo', 'JSON 가져오기 / 내보내기', { checked: true }),
      block('heading2', '시작하기'),
      block('bullet', '왼쪽 사이드바에서 + 로 새 페이지를 만드세요'),
      block('bullet', '홈의 벤토 카드에서 최근 문서를 여세요'),
      block('bullet', '프로젝트 트래커 데이터베이스로 작업을 관리하세요'),
      block('quote', '좋은 시스템은 생각을 줄이고, 좋은 노트는 생각을 늘린다.'),
      block('divider', ''),
      block('code', '// 코드 블록 예제\nconst note = { free: true, private: true }\nconsole.log(note)', { language: 'javascript' }),
    ],
  }

  const guide: Page = {
    id: guideId,
    title: '단축키 & 마크다운',
    icon: '⌨️',
    parentId: welcomeId,
    type: 'page',
    favorite: false,
    deleted: false,
    createdAt: now - 1000,
    updatedAt: now - 1000,
    blocks: [
      block('heading1', '빠른 입력'),
      block('paragraph', '블록 시작 부분에서 다음 문법을 입력 후 Space:'),
      block('bullet', '#  → 제목 1'),
      block('bullet', '## → 제목 2'),
      block('bullet', '### → 제목 3'),
      block('bullet', '- 또는 * → 글머리 기호'),
      block('bullet', '1. → 번호 목록'),
      block('bullet', '[] → 할 일'),
      block('bullet', '> → 인용'),
      block('bullet', '``` → 코드'),
      block('bullet', '--- → 구분선'),
      block('heading2', '슬래시 명령'),
      block('paragraph', '빈 블록에서 / 를 누르면 모든 블록 타입을 선택할 수 있습니다.'),
    ],
  }

  const dbPage: Page = {
    id: dbId,
    title: '프로젝트 트래커',
    icon: '📊',
    parentId: null,
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
    type: 'page',
    favorite: false,
    deleted: false,
    createdAt: now - 3000,
    updatedAt: now - 2000,
    cover: 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
    blocks: [
      block('heading1', '떠오른 생각'),
      block('paragraph', '여기에 자유롭게 메모하세요. 블록을 드래그해 순서를 바꿀 수 있습니다.'),
      block('toggle', '더 보기 (토글 블록)', {
        open: true,
        children: [
          block('paragraph', '토글 안에 하위 블록을 넣을 수 있습니다.'),
          block('bullet', '중첩 구조 지원'),
        ],
      }),
      block('callout', '🎯 목표: 모든 기능을 무료로, 비공개로.'),
    ],
  }

  return [welcome, guide, dbPage, ideas]
}
