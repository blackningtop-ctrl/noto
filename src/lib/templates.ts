import type { Block, Database, Page } from '../types'
import { defaultApiEndpoint, defaultGitMeta, defaultTableData } from '../types'
import { uid } from './id'

function b(type: Block['type'], content: string, extra: Partial<Block> = {}): Block {
  return { id: uid(), type, content, ...extra }
}

export type TemplateCategory =
  | 'everyday'
  | 'study'
  | 'life'
  | 'work'
  | 'dev'
  | 'feature'

export interface TemplateDef {
  id: string
  name: string
  description: string
  icon: string
  keywords: string
  kind: 'page' | 'database'
  category: TemplateCategory
  build: () => Omit<
    Page,
    'id' | 'createdAt' | 'updatedAt' | 'deleted' | 'deletedAt' | 'favorite' | 'parentId' | 'order'
  >
}

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string; hint: string }[] = [
  { id: 'everyday', label: '자주 쓰는', hint: '일기 · 할 일 · 메모' },
  { id: 'study', label: '공부', hint: '수업 · 시험 · 독서' },
  { id: 'life', label: '생활', hint: '습관 · 여행 · 건강' },
  { id: 'work', label: '일 · 프로젝트', hint: '회의 · 주간 계획' },
  { id: 'dev', label: '개발', hint: '버그 · ADR · 스프린트' },
  { id: 'feature', label: '기능 배우기', hint: '표 · 코드 · 링크 연습' },
]

function statusDb(
  name: string,
  icon: string,
  extraProps: Database['properties'] = [],
  sampleRows: Array<Record<string, string | number | boolean | null>> = [],
  opts?: { boardFirst?: boolean; statusNames?: string[] },
): Omit<Page, 'id' | 'createdAt' | 'updatedAt' | 'deleted' | 'deletedAt' | 'favorite' | 'parentId' | 'order'> {
  const statusId = uid()
  const names = opts?.statusNames ?? ['할 일', '하는 중', '완료']
  const colors = ['#64748b', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b']
  const options = names.map((n, i) => ({
    id: uid(),
    name: n,
    color: colors[i % colors.length],
  }))
  const props: Database['properties'] = [
    { id: statusId, name: '상태', type: 'status', options },
    ...extraProps,
  ]
  const tableId = uid()
  const boardId = uid()
  const dateProp = extraProps.find((p) => p.type === 'date')
  const views: Database['views'] = [
    { id: tableId, name: '표', type: 'table' },
    { id: boardId, name: '보드', type: 'board', groupBy: statusId },
  ]
  if (dateProp) {
    views.push({
      id: uid(),
      name: '달력',
      type: 'calendar',
      datePropId: dateProp.id,
    })
  }

  const rows = sampleRows.map((values) => ({
    id: uid(),
    values: {
      ...values,
      [statusId]: values[statusId] ?? options[0].id,
    },
  }))

  for (const row of rows) {
    if (typeof row.values.__status === 'string') {
      const opt = options.find((o) => o.name === row.values.__status)
      if (opt) row.values[statusId] = opt.id
      delete row.values.__status
    }
  }

  return {
    title: name,
    icon,
    type: 'database',
    blocks: [],
    database: {
      id: uid(),
      properties: props,
      rows,
      views,
      activeViewId: opts?.boardFirst ? boardId : tableId,
    },
  }
}

export const TEMPLATES: TemplateDef[] = [
  // ─── 자주 쓰는 ───
  {
    id: 'blank-note',
    name: '빈 노트',
    description: '아무 형식 없이 바로 쓰기',
    icon: '📝',
    keywords: 'blank empty 빈 노트 새',
    kind: 'page',
    category: 'everyday',
    build: () => ({
      title: '새 노트',
      icon: '📝',
      type: 'page',
      blocks: [b('paragraph', '')],
    }),
  },
  {
    id: 'daily-journal',
    name: '오늘 일기',
    description: '하루를 짧게 정리',
    icon: '📔',
    keywords: '일기 journal daily 오늘',
    kind: 'page',
    category: 'everyday',
    build: () => {
      const d = new Date()
      const title = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} 일기`
      return {
        title,
        icon: '📔',
        type: 'page',
        cover: 'linear-gradient(120deg, #a18cd1 0%, #fbc2eb 100%)',
        blocks: [
          b('heading1', title),
          b('callout', '오늘 기분은? 😊 😐 😢 (하나만 남겨 보세요)'),
          b('heading2', '오늘 있었던 일'),
          b('paragraph', ''),
          b('heading2', '잘한 점'),
          b('bullet', ''),
          b('heading2', '아쉬운 점'),
          b('bullet', ''),
          b('heading2', '내일 할 일'),
          b('todo', '', { checked: false }),
          b('todo', '', { checked: false }),
        ],
      }
    },
  },
  {
    id: 'quick-memo',
    name: '빠른 메모',
    description: '생각 나는 대로 적기',
    icon: '⚡',
    keywords: 'memo 메모 quick 빠른',
    kind: 'page',
    category: 'everyday',
    build: () => ({
      title: '빠른 메모',
      icon: '⚡',
      type: 'page',
      blocks: [
        b('heading2', '메모'),
        b('bullet', ''),
        b('bullet', ''),
        b('bullet', ''),
        b('heading2', '나중에 하기'),
        b('todo', '', { checked: false }),
      ],
    }),
  },
  {
    id: 'todo-list',
    name: '할 일 목록',
    description: '체크하며 끝내기',
    icon: '✅',
    keywords: 'todo 할일 목록 checklist',
    kind: 'page',
    category: 'everyday',
    build: () => ({
      title: '할 일',
      icon: '✅',
      type: 'page',
      blocks: [
        b('heading1', '할 일'),
        b('heading2', '오늘'),
        b('todo', '중요한 일', { checked: false }),
        b('todo', '', { checked: false }),
        b('heading2', '이번 주'),
        b('todo', '', { checked: false }),
        b('todo', '', { checked: false }),
        b('heading2', '끝낸 일'),
        b('todo', '예시 (체크해 보세요)', { checked: true }),
      ],
    }),
  },
  {
    id: 'todo-db',
    name: '할 일 보드',
    description: '표·보드로 관리하는 할 일',
    icon: '📋',
    keywords: 'todo board 칸반 할일 보드',
    kind: 'database',
    category: 'everyday',
    build: () => {
      const dueId = uid()
      return statusDb(
        '할 일 보드',
        '📋',
        [{ id: dueId, name: '날짜', type: 'date' }],
        [
          { title: '숙제 하기', __status: '할 일', [dueId]: '' },
          { title: '방 정리', __status: '하는 중', [dueId]: '' },
          { title: '운동', __status: '완료', [dueId]: '' },
        ],
        { boardFirst: true },
      )
    },
  },

  // ─── 공부 ───
  {
    id: 'class-notes',
    name: '수업 노트',
    description: '수업 내용 정리',
    icon: '📚',
    keywords: '수업 class lecture 공부 노트',
    kind: 'page',
    category: 'study',
    build: () => ({
      title: '수업 노트: 과목명',
      icon: '📚',
      type: 'page',
      cover: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
      blocks: [
        b('heading1', '수업 노트'),
        b('bullet', '과목: '),
        b('bullet', '날짜: '),
        b('bullet', '선생님/단원: '),
        b('divider', ''),
        b('heading2', '오늘 배운 것'),
        b('numbered', ''),
        b('numbered', ''),
        b('heading2', '중요 키워드'),
        b('bullet', ''),
        b('heading2', '이해가 안 된 부분'),
        b('paragraph', ''),
        b('heading2', '숙제 / 다음 시간'),
        b('todo', '', { checked: false }),
      ],
    }),
  },
  {
    id: 'exam-prep',
    name: '시험 공부 계획',
    description: '과목별 공부 체크',
    icon: '🎯',
    keywords: '시험 exam study 공부 계획',
    kind: 'page',
    category: 'study',
    build: () => ({
      title: '시험 공부 계획',
      icon: '🎯',
      type: 'page',
      blocks: [
        b('heading1', '시험 공부 계획'),
        b('callout', '시험 날짜: ____  ·  목표 점수: ____'),
        b('heading2', '과목 목록'),
        b('todo', '국어', { checked: false }),
        b('todo', '수학', { checked: false }),
        b('todo', '영어', { checked: false }),
        b('todo', '과학/사회', { checked: false }),
        b('heading2', '오늘 공부'),
        b('todo', '', { checked: false }),
        b('todo', '', { checked: false }),
        b('heading2', '오답 / 약점'),
        b('bullet', ''),
        b('quote', '조금씩 매일 하는 게 한 번에 몰아하는 것보다 나아요.'),
      ],
    }),
  },
  {
    id: 'vocab',
    name: '단어장',
    description: '영어·암기 단어',
    icon: '🔤',
    keywords: '단어 vocab english 암기',
    kind: 'page',
    category: 'study',
    build: () => ({
      title: '단어장',
      icon: '🔤',
      type: 'page',
      blocks: [
        b('heading1', '단어장'),
        b('paragraph', '단어 | 뜻 | 예문 으로 적어 보세요.'),
        b('table', 'table', {
          table: {
            hasHeader: true,
            rows: [
              ['단어', '뜻', '예문'],
              ['', '', ''],
              ['', '', ''],
              ['', '', ''],
              ['', '', ''],
            ],
          },
        }),
        b('heading2', '오늘 외울 단어'),
        b('todo', '', { checked: false }),
        b('todo', '', { checked: false }),
      ],
    }),
  },
  {
    id: 'reading',
    name: '독서 기록',
    description: '책 읽고 느낀 점',
    icon: '📖',
    keywords: '독서 reading book 책',
    kind: 'page',
    category: 'study',
    build: () => ({
      title: '독서 기록: 책 제목',
      icon: '📖',
      type: 'page',
      blocks: [
        b('heading1', '책 제목'),
        b('bullet', '작가: '),
        b('bullet', '읽은 기간: '),
        b('bullet', '별점: ⭐⭐⭐⭐⭐'),
        b('heading2', '줄거리 (스포 주의)'),
        b('paragraph', ''),
        b('heading2', '인상 깊은 문장'),
        b('quote', ''),
        b('heading2', '느낀 점'),
        b('paragraph', ''),
        b('heading2', '다음에 읽을 책'),
        b('bullet', ''),
      ],
    }),
  },
  {
    id: 'study-tracker',
    name: '공부 시간 표',
    description: '날짜별 공부 기록',
    icon: '⏱️',
    keywords: '공부 시간 tracker 표',
    kind: 'database',
    category: 'study',
    build: () => {
      const dateId = uid()
      const minId = uid()
      const subId = uid()
      return statusDb(
        '공부 기록',
        '⏱️',
        [
          { id: dateId, name: '날짜', type: 'date' },
          { id: subId, name: '과목', type: 'text' },
          { id: minId, name: '분', type: 'number' },
        ],
        [
          { title: '수학 문제집', __status: '완료', [dateId]: '', [subId]: '수학', [minId]: 40 },
          { title: '영어 단어', __status: '하는 중', [dateId]: '', [subId]: '영어', [minId]: 20 },
        ],
      )
    },
  },

  // ─── 생활 ───
  {
    id: 'habit',
    name: '습관 트래커',
    description: '매일 습관 체크',
    icon: '🔥',
    keywords: '습관 habit tracker',
    kind: 'database',
    category: 'life',
    build: () => {
      const dateId = uid()
      return statusDb(
        '습관 트래커',
        '🔥',
        [{ id: dateId, name: '날짜', type: 'date' }],
        [
          { title: '물 마시기', __status: '하는 중', [dateId]: '' },
          { title: '운동', __status: '할 일', [dateId]: '' },
          { title: '일찍 자기', __status: '할 일', [dateId]: '' },
        ],
        { boardFirst: true, statusNames: ['할 일', '하는 중', '완료'] },
      )
    },
  },
  {
    id: 'weekly-plan',
    name: '주간 계획',
    description: '월~일 계획',
    icon: '📅',
    keywords: '주간 weekly plan 계획',
    kind: 'page',
    category: 'life',
    build: () => ({
      title: '이번 주 계획',
      icon: '📅',
      type: 'page',
      blocks: [
        b('heading1', '이번 주 계획'),
        b('heading2', '월'),
        b('todo', '', { checked: false }),
        b('heading2', '화'),
        b('todo', '', { checked: false }),
        b('heading2', '수'),
        b('todo', '', { checked: false }),
        b('heading2', '목'),
        b('todo', '', { checked: false }),
        b('heading2', '금'),
        b('todo', '', { checked: false }),
        b('heading2', '토 · 일'),
        b('todo', '', { checked: false }),
        b('heading2', '이번 주 목표'),
        b('paragraph', ''),
      ],
    }),
  },
  {
    id: 'travel',
    name: '여행 계획',
    description: '일정 · 짐 · 예산',
    icon: '✈️',
    keywords: '여행 travel trip',
    kind: 'page',
    category: 'life',
    build: () => ({
      title: '여행 계획: 어디',
      icon: '✈️',
      type: 'page',
      cover: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      blocks: [
        b('heading1', '여행 계획'),
        b('bullet', '기간: '),
        b('bullet', '함께 가는 사람: '),
        b('bullet', '예산: '),
        b('heading2', '일정'),
        b('numbered', '1일차 — '),
        b('numbered', '2일차 — '),
        b('heading2', '짐 싸기'),
        b('todo', '충전기', { checked: false }),
        b('todo', '옷', { checked: false }),
        b('todo', '세면도구', { checked: false }),
        b('heading2', '먹고 싶은 것 / 가고 싶은 곳'),
        b('bullet', ''),
      ],
    }),
  },
  {
    id: 'shopping',
    name: '장보기 · 쇼핑 목록',
    description: '사야 할 것 체크',
    icon: '🛒',
    keywords: '쇼핑 shopping 장보기 목록',
    kind: 'page',
    category: 'life',
    build: () => ({
      title: '쇼핑 목록',
      icon: '🛒',
      type: 'page',
      blocks: [
        b('heading1', '쇼핑 목록'),
        b('heading2', '식료품'),
        b('todo', '', { checked: false }),
        b('todo', '', { checked: false }),
        b('heading2', '생활용품'),
        b('todo', '', { checked: false }),
        b('heading2', '기타'),
        b('todo', '', { checked: false }),
      ],
    }),
  },
  {
    id: 'gratitude',
    name: '감사 일기',
    description: '오늘 고마운 일 3가지',
    icon: '🙏',
    keywords: '감사 gratitude 일기',
    kind: 'page',
    category: 'life',
    build: () => ({
      title: '감사 일기',
      icon: '🙏',
      type: 'page',
      blocks: [
        b('heading1', '오늘 고마운 일'),
        b('numbered', ''),
        b('numbered', ''),
        b('numbered', ''),
        b('heading2', '한 줄 기분'),
        b('paragraph', ''),
      ],
    }),
  },

  // ─── 일 · 프로젝트 ───
  {
    id: 'meeting',
    name: '회의록',
    description: '회의 내용 · 할 일',
    icon: '🗣️',
    keywords: '회의 meeting notes 미팅',
    kind: 'page',
    category: 'work',
    build: () => ({
      title: '회의록: 제목',
      icon: '🗣️',
      type: 'page',
      blocks: [
        b('heading1', '회의록'),
        b('bullet', '날짜/시간: '),
        b('bullet', '참석: '),
        b('bullet', '목적: '),
        b('heading2', '논의한 내용'),
        b('bullet', ''),
        b('heading2', '결정 사항'),
        b('numbered', ''),
        b('heading2', '할 일 (담당)'),
        b('todo', '— 담당: ', { checked: false }),
        b('todo', '— 담당: ', { checked: false }),
        b('heading2', '다음 회의'),
        b('paragraph', ''),
      ],
    }),
  },
  {
    id: 'project-brief',
    name: '프로젝트 한 장',
    description: '목표 · 일정 · 할 일',
    icon: '🚀',
    keywords: '프로젝트 project brief 계획',
    kind: 'page',
    category: 'work',
    build: () => ({
      title: '프로젝트: 이름',
      icon: '🚀',
      type: 'page',
      cover: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      blocks: [
        b('heading1', '프로젝트 이름'),
        b('heading2', '왜 하나요?'),
        b('paragraph', ''),
        b('heading2', '목표'),
        b('bullet', ''),
        b('heading2', '일정'),
        b('table', 'table', {
          table: {
            hasHeader: true,
            rows: [
              ['단계', '내용', '마감'],
              ['1', '', ''],
              ['2', '', ''],
              ['3', '', ''],
            ],
          },
        }),
        b('heading2', '할 일'),
        b('todo', '', { checked: false }),
        b('todo', '', { checked: false }),
        b('heading2', '관련 노트'),
        b('paragraph', '[[회의록]] · [[할 일 보드]]'),
      ],
    }),
  },
  {
    id: 'weekly-review',
    name: '주간 회고',
    description: '한 주 돌아보기',
    icon: '🪞',
    keywords: '회고 review weekly retro',
    kind: 'page',
    category: 'work',
    build: () => ({
      title: '주간 회고',
      icon: '🪞',
      type: 'page',
      blocks: [
        b('heading1', '주간 회고'),
        b('heading2', '잘한 것'),
        b('bullet', ''),
        b('heading2', '아쉬운 것'),
        b('bullet', ''),
        b('heading2', '배운 것'),
        b('bullet', ''),
        b('heading2', '다음 주 다짐'),
        b('todo', '', { checked: false }),
      ],
    }),
  },
  {
    id: 'contacts',
    name: '연락처 · 사람 메모',
    description: '사람 정보 표',
    icon: '👥',
    keywords: '연락처 contact people',
    kind: 'database',
    category: 'work',
    build: () => {
      const phoneId = uid()
      const noteId = uid()
      return statusDb(
        '사람 메모',
        '👥',
        [
          { id: phoneId, name: '연락처', type: 'text' },
          { id: noteId, name: '메모', type: 'text' },
        ],
        [
          { title: '친구 A', __status: '할 일', [phoneId]: '', [noteId]: '' },
        ],
        { statusNames: ['친구', '학교', '기타'], boardFirst: false },
      )
    },
  },

  // ─── 개발 ───
  {
    id: 'adr',
    name: 'ADR (설계 결정)',
    description: '왜 이렇게 했는지 기록',
    icon: '🏛️',
    keywords: 'adr architecture decision 설계',
    kind: 'page',
    category: 'dev',
    build: () => ({
      title: 'ADR-000: 제목',
      icon: '🏛️',
      type: 'page',
      cover: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)',
      blocks: [
        b('callout', '상태: 제안 | 채택 | 폐기'),
        b('heading2', '배경'),
        b('paragraph', ''),
        b('heading2', '결정'),
        b('paragraph', ''),
        b('heading2', '결과'),
        b('bullet', '좋은 점: '),
        b('bullet', '안 좋은 점: '),
        b('heading2', '대안'),
        b('numbered', ''),
      ],
    }),
  },
  {
    id: 'bug',
    name: '버그 리포트',
    description: '재현 방법 정리',
    icon: '🐛',
    keywords: 'bug 버그 issue',
    kind: 'page',
    category: 'dev',
    build: () => ({
      title: 'Bug: ',
      icon: '🐛',
      type: 'page',
      blocks: [
        b('callout', '심각도: 높음 | 중간 | 낮음'),
        b('heading2', '한 줄 요약'),
        b('paragraph', ''),
        b('heading2', '재현 방법'),
        b('numbered', ''),
        b('numbered', ''),
        b('heading2', '기대한 결과'),
        b('paragraph', ''),
        b('heading2', '실제 결과'),
        b('paragraph', ''),
        b('heading2', '로그'),
        b('code', '', { language: 'text' }),
      ],
    }),
  },
  {
    id: 'postmortem',
    name: '장애 회고',
    description: '사고 정리 (비난 없이)',
    icon: '🧯',
    keywords: 'postmortem 장애 incident',
    kind: 'page',
    category: 'dev',
    build: () => ({
      title: '장애 회고: 날짜',
      icon: '🧯',
      type: 'page',
      blocks: [
        b('heading2', '영향'),
        b('bullet', '시간: '),
        b('bullet', '영향 범위: '),
        b('heading2', '타임라인'),
        b('bullet', ''),
        b('heading2', '원인'),
        b('paragraph', ''),
        b('heading2', '조치 항목'),
        b('todo', '', { checked: false }),
        b('heading2', '도식'),
        b('mermaid', 'sequenceDiagram\n  participant User\n  participant API\n  User->>API: request\n  API-->>User: error'),
      ],
    }),
  },
  {
    id: 'rfc',
    name: 'RFC / 설계 문서',
    description: '기술 제안서',
    icon: '📐',
    keywords: 'rfc design 설계',
    kind: 'page',
    category: 'dev',
    build: () => ({
      title: 'RFC: ',
      icon: '📐',
      type: 'page',
      blocks: [
        b('heading2', '문제'),
        b('paragraph', ''),
        b('heading2', '제안'),
        b('paragraph', ''),
        b('heading2', '구조'),
        b('mermaid', 'flowchart LR\n  A --> B --> C'),
        b('heading2', 'API'),
        b('code', 'type Request = {\n  // ...\n}', { language: 'typescript' }),
      ],
    }),
  },
  {
    id: 'runbook',
    name: '온콜 런북',
    description: '장애 대응 체크리스트',
    icon: '📟',
    keywords: 'runbook oncall 온콜',
    kind: 'page',
    category: 'dev',
    build: () => ({
      title: 'Runbook: 서비스',
      icon: '📟',
      type: 'page',
      blocks: [
        b('heading2', '확인'),
        b('todo', '대시보드', { checked: false }),
        b('todo', '최근 배포', { checked: false }),
        b('heading2', '명령어'),
        b('code', '# 예시\nkubectl get pods', { language: 'bash' }),
      ],
    }),
  },
  {
    id: 'sprint',
    name: '스프린트 보드',
    description: '칸반 + 포인트',
    icon: '🏃',
    keywords: 'sprint board agile 스프린트',
    kind: 'database',
    category: 'dev',
    build: () => {
      const pointsId = uid()
      const epicId = uid()
      return statusDb(
        '스프린트 보드',
        '🏃',
        [
          { id: pointsId, name: 'Points', type: 'number' },
          { id: epicId, name: 'Epic', type: 'text' },
        ],
        [
          { title: '로그인 수정', __status: '하는 중', [pointsId]: 3, [epicId]: 'Auth' },
          { title: '문서 쓰기', __status: '할 일', [pointsId]: 2, [epicId]: 'Docs' },
        ],
        { boardFirst: true, statusNames: ['할 일', '하는 중', '리뷰', '완료'] },
      )
    },
  },
  {
    id: 'bugs-db',
    name: '버그 트래커',
    description: '심각도 포함 표',
    icon: '🐞',
    keywords: 'bug tracker 버그',
    kind: 'database',
    category: 'dev',
    build: () => {
      const sevId = uid()
      const high = { id: uid(), name: 'Critical', color: '#ef4444' }
      const med = { id: uid(), name: 'High', color: '#f97316' }
      const low = { id: uid(), name: 'Medium', color: '#eab308' }
      return statusDb(
        '버그 트래커',
        '🐞',
        [{ id: sevId, name: 'Severity', type: 'select', options: [high, med, low] }],
        [
          { title: '결제 오류', __status: '하는 중', [sevId]: high.id },
          { title: '오타', __status: '할 일', [sevId]: low.id },
        ],
        { boardFirst: true, statusNames: ['할 일', '하는 중', '완료'] },
      )
    },
  },
  {
    id: 'tech-debt',
    name: '기술 부채',
    description: '리팩터 백로그',
    icon: '🧱',
    keywords: 'tech debt 부채 refactor',
    kind: 'database',
    category: 'dev',
    build: () => {
      const costId = uid()
      return statusDb(
        'Tech Debt',
        '🧱',
        [{ id: costId, name: 'Cost', type: 'number' }],
        [
          { title: '테스트 늘리기', __status: '할 일', [costId]: 8 },
          { title: 'CI 개선', __status: '하는 중', [costId]: 3 },
        ],
        { boardFirst: true },
      )
    },
  },

  // ─── 기능 배우기 ───
  {
    id: 'feat-blocks',
    name: '블록 종류 맛보기',
    description: '제목·목록·할 일·인용 연습',
    icon: '🧱',
    keywords: '블록 block 기능 배우기',
    kind: 'page',
    category: 'feature',
    build: () => ({
      title: '블록 맛보기',
      icon: '🧱',
      type: 'page',
      blocks: [
        b('callout', '빈 줄에서 / 를 누르면 이런 것들을 넣을 수 있어요.'),
        b('heading1', '큰 제목'),
        b('heading2', '중간 제목'),
        b('heading3', '작은 제목'),
        b('paragraph', '일반 글입니다. **굵게** *기울임* `코드` 도 쓸 수 있어요.'),
        b('bullet', '점 목록 1'),
        b('bullet', '점 목록 2'),
        b('numbered', '번호 목록 1'),
        b('numbered', '번호 목록 2'),
        b('todo', '할 일 (체크해 보세요)', { checked: false }),
        b('quote', '인용문 예시'),
        b('divider', ''),
        b('paragraph', '아래에 / 를 눌러 새 블록을 추가해 보세요.'),
        b('paragraph', ''),
      ],
    }),
  },
  {
    id: 'feat-wiki',
    name: '위키 링크 연습',
    description: '[[노트이름]] 연결하기',
    icon: '🔗',
    keywords: 'wiki link 위키 링크',
    kind: 'page',
    category: 'feature',
    build: () => ({
      title: '위키 링크 연습',
      icon: '🔗',
      type: 'page',
      blocks: [
        b('heading1', '노트를 서로 연결하기'),
        b('paragraph', '다른 노트 이름을 대괄호 두 개로 감싸면 링크가 됩니다.'),
        b('paragraph', '예: [[환영합니다]] 또는 [[할 일]]'),
        b('callout', '포커스를 빼면 파란 링크로 보여요. 클릭하면 이동하거나 새 노트를 만들 수 있어요.'),
        b('heading2', '연습'),
        b('paragraph', '여기에 [[ 를 치고 노트 이름을 적어 보세요.'),
        b('paragraph', ''),
      ],
    }),
  },
  {
    id: 'feat-table',
    name: '표 연습',
    description: '표 블록 채우기',
    icon: '▦',
    keywords: 'table 표',
    kind: 'page',
    category: 'feature',
    build: () => ({
      title: '표 연습',
      icon: '▦',
      type: 'page',
      blocks: [
        b('heading1', '표 연습'),
        b('paragraph', '칸을 눌러 내용을 바꿔 보세요. 위쪽 +행 +열로 늘릴 수 있어요.'),
        b('table', 'table', { table: defaultTableData() }),
      ],
    }),
  },
  {
    id: 'feat-image',
    name: '사진 넣기 연습',
    description: '업로드 또는 URL',
    icon: '🖼️',
    keywords: 'image 사진 이미지',
    kind: 'page',
    category: 'feature',
    build: () => ({
      title: '사진 넣기',
      icon: '🖼️',
      type: 'page',
      blocks: [
        b('heading1', '사진 넣기'),
        b('paragraph', '아래에서 업로드를 누르거나 이미지 주소를 붙여 넣으세요.'),
        b('image', ''),
      ],
    }),
  },
  {
    id: 'feat-code',
    name: '코드 블록 연습',
    description: '언어 선택 · 복사',
    icon: '💻',
    keywords: 'code 코드',
    kind: 'page',
    category: 'feature',
    build: () => ({
      title: '코드 연습',
      icon: '💻',
      type: 'page',
      blocks: [
        b('heading1', '코드 블록'),
        b('paragraph', '언어를 바꾸고 복사 버튼을 눌러 보세요.'),
        b(
          'code',
          'function hello(name) {\n  console.log("안녕, " + name)\n}\n\nhello("Noto")',
          { language: 'javascript' },
        ),
      ],
    }),
  },
  {
    id: 'feat-mermaid',
    name: '도식(Mermaid) 연습',
    description: '흐름도 그리기',
    icon: '🔀',
    keywords: 'mermaid 도식 diagram',
    kind: 'page',
    category: 'feature',
    build: () => ({
      title: '도식 연습',
      icon: '🔀',
      type: 'page',
      blocks: [
        b('heading1', '도식 연습'),
        b('paragraph', '미리보기 / 소스 편집을 전환해 보세요.'),
        b(
          'mermaid',
          'flowchart TD\n  시작 --> 공부\n  공부 --> 휴식\n  휴식 --> 공부\n  공부 --> 끝',
        ),
      ],
    }),
  },
  {
    id: 'feat-api',
    name: 'API 카드 연습',
    description: 'Method · Path · cURL',
    icon: '🌐',
    keywords: 'api endpoint',
    kind: 'page',
    category: 'feature',
    build: () => ({
      title: 'API 카드 연습',
      icon: '🌐',
      type: 'page',
      blocks: [
        b('heading1', 'API 카드'),
        b('paragraph', '메서드와 경로를 바꿔 보고 cURL 복사를 눌러 보세요.'),
        b('api', 'API', { api: defaultApiEndpoint() }),
      ],
    }),
  },
  {
    id: 'feat-git',
    name: 'Git 카드 연습',
    description: 'repo · PR · issue 링크',
    icon: '📦',
    keywords: 'git github',
    kind: 'page',
    category: 'feature',
    build: () => ({
      title: 'Git 카드 연습',
      icon: '📦',
      type: 'page',
      blocks: [
        b('heading1', 'Git 카드'),
        b('paragraph', 'owner/repo 형식으로 저장소 이름을 넣어 보세요.'),
        b('git', 'Git', { git: defaultGitMeta() }),
      ],
    }),
  },
  {
    id: 'feat-db-all',
    name: '표·보드·달력 연습',
    description: '데이터베이스 뷰 전부',
    icon: '📊',
    keywords: 'database 표 보드 달력',
    kind: 'database',
    category: 'feature',
    build: () => {
      const dateId = uid()
      const pointsId = uid()
      const formulaId = uid()
      return {
        title: 'DB 기능 연습',
        icon: '📊',
        type: 'database' as const,
        blocks: [],
        database: (() => {
          const base = statusDb(
            'DB 기능 연습',
            '📊',
            [
              { id: dateId, name: '날짜', type: 'date' },
              { id: pointsId, name: '점수', type: 'number' },
              {
                id: formulaId,
                name: '점수×2',
                type: 'formula',
                formula: 'prop("점수") * 2',
              },
            ],
            [
              { title: '샘플 A', __status: '할 일', [dateId]: '', [pointsId]: 2 },
              { title: '샘플 B', __status: '하는 중', [dateId]: '', [pointsId]: 5 },
              { title: '샘플 C', __status: '완료', [dateId]: '', [pointsId]: 3 },
            ],
            { boardFirst: false },
          )
          return base.database!
        })(),
      }
    },
  },
]

export function getTemplate(id: string): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.id === id)
}

export function templatesByCategory(category: TemplateCategory): TemplateDef[] {
  return TEMPLATES.filter((t) => t.category === category)
}
