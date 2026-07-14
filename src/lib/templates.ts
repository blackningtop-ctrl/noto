import type { Block, Database, Page } from '../types'
import { uid } from './id'

function b(type: Block['type'], content: string, extra: Partial<Block> = {}): Block {
  return { id: uid(), type, content, ...extra }
}

export interface TemplateDef {
  id: string
  name: string
  description: string
  icon: string
  keywords: string
  kind: 'page' | 'database'
  build: () => Omit<Page, 'id' | 'createdAt' | 'updatedAt' | 'deleted' | 'deletedAt' | 'favorite' | 'parentId' | 'order'>
}

function statusDb(
  name: string,
  icon: string,
  extraProps: Database['properties'] = [],
  sampleRows: Array<Record<string, string | number | boolean | null>> = [],
): Omit<Page, 'id' | 'createdAt' | 'updatedAt' | 'deleted' | 'deletedAt' | 'favorite' | 'parentId' | 'order'> {
  const statusId = uid()
  const options = [
    { id: uid(), name: 'Backlog', color: '#64748b' },
    { id: uid(), name: 'In Progress', color: '#3b82f6' },
    { id: uid(), name: 'Review', color: '#a855f7' },
    { id: uid(), name: 'Done', color: '#22c55e' },
  ]
  const props: Database['properties'] = [
    { id: statusId, name: '상태', type: 'status', options },
    ...extraProps,
  ]
  const tableId = uid()
  const boardId = uid()
  const rows = sampleRows.map((values) => ({
    id: uid(),
    values: {
      ...values,
      [statusId]: values[statusId] ?? options[0].id,
    },
  }))

  // map first sample status by name if provided as __status
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
      views: [
        { id: tableId, name: '테이블', type: 'table' },
        { id: boardId, name: '보드', type: 'board', groupBy: statusId },
      ],
      activeViewId: boardId,
    },
  }
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'adr',
    name: 'ADR (Architecture Decision Record)',
    description: '아키텍처 결정 기록 템플릿',
    icon: '🏛️',
    keywords: 'adr architecture decision 설계',
    kind: 'page',
    build: () => ({
      title: 'ADR-000: 제목',
      icon: '🏛️',
      type: 'page',
      cover: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)',
      blocks: [
        b('callout', 'STATUS: Proposed | Accepted | Deprecated | Superseded'),
        b('heading2', 'Context'),
        b('paragraph', '이 결정이 필요해진 배경과 제약을 적습니다. [[시스템 개요]] 와 연결하세요.'),
        b('heading2', 'Decision'),
        b('paragraph', '선택한 방안을 한 문단으로 명확히 적습니다.'),
        b('heading2', 'Consequences'),
        b('bullet', 'Positive: '),
        b('bullet', 'Negative: '),
        b('bullet', 'Neutral: '),
        b('heading2', 'Alternatives considered'),
        b('numbered', '대안 A — 왜 기각했는지'),
        b('numbered', '대안 B — 왜 기각했는지'),
        b('heading2', 'References'),
        b('bullet', '관련 PR / Issue / 문서 링크'),
        b('divider', ''),
        b('code', '{\n  "adr": "000",\n  "status": "proposed"\n}', { language: 'json' }),
      ],
    }),
  },
  {
    id: 'bug',
    name: 'Bug Report',
    description: '재현 가능한 버그 리포트',
    icon: '🐛',
    keywords: 'bug issue 버그 이슈',
    kind: 'page',
    build: () => ({
      title: 'Bug: ',
      icon: '🐛',
      type: 'page',
      blocks: [
        b('callout', 'Severity: Critical | High | Medium | Low'),
        b('heading2', 'Summary'),
        b('paragraph', '한 줄 요약'),
        b('heading2', 'Environment'),
        b('bullet', 'OS / Browser / App version: '),
        b('bullet', 'Env: local | staging | prod'),
        b('heading2', 'Steps to reproduce'),
        b('numbered', '1단계'),
        b('numbered', '2단계'),
        b('numbered', '3단계'),
        b('heading2', 'Expected'),
        b('paragraph', ''),
        b('heading2', 'Actual'),
        b('paragraph', ''),
        b('heading2', 'Logs / Stack trace'),
        b('code', 'Error: ...\n  at ...', { language: 'text' }),
        b('heading2', 'Related'),
        b('paragraph', '관련 페이지: [[스프린트 보드]]'),
      ],
    }),
  },
  {
    id: 'postmortem',
    name: 'Incident Postmortem',
    description: '장애 포스트모템 (blameless)',
    icon: '🧯',
    keywords: 'incident postmortem 장애 포스트모템',
    kind: 'page',
    build: () => ({
      title: 'Postmortem: YYYY-MM-DD 제목',
      icon: '🧯',
      type: 'page',
      cover: 'linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)',
      blocks: [
        b('callout', 'Blameless postmortem — 사람을 탓하지 않고 시스템을 개선합니다.'),
        b('heading2', 'Impact'),
        b('bullet', 'Duration: '),
        b('bullet', 'Users affected: '),
        b('bullet', 'Severity: SEV-'),
        b('heading2', 'Timeline'),
        b('bullet', 'HH:MM — 탐지'),
        b('bullet', 'HH:MM — 완화'),
        b('bullet', 'HH:MM — 해결'),
        b('heading2', 'Root cause'),
        b('paragraph', ''),
        b('heading2', 'What went well'),
        b('bullet', ''),
        b('heading2', 'What went wrong'),
        b('bullet', ''),
        b('heading2', 'Action items'),
        b('todo', '단기 수정', { checked: false }),
        b('todo', '모니터링 추가', { checked: false }),
        b('todo', '런북 업데이트 → [[온콜 런북]]', { checked: false }),
        b('heading2', 'Diagram'),
        b(
          'mermaid',
          'sequenceDiagram\n  participant User\n  participant API\n  participant DB\n  User->>API: request\n  API->>DB: query\n  DB-->>API: timeout\n  API-->>User: 500',
        ),
      ],
    }),
  },
  {
    id: 'rfc',
    name: 'RFC / Design Doc',
    description: '기술 제안서 / 디자인 독',
    icon: '📐',
    keywords: 'rfc design doc 설계 제안',
    kind: 'page',
    build: () => ({
      title: 'RFC: ',
      icon: '📐',
      type: 'page',
      blocks: [
        b('heading2', 'Problem'),
        b('paragraph', ''),
        b('heading2', 'Goals / Non-goals'),
        b('bullet', 'Goal: '),
        b('bullet', 'Non-goal: '),
        b('heading2', 'Proposal'),
        b('paragraph', ''),
        b('heading2', 'API / Interface'),
        b('code', 'type Request = {\n  // ...\n}', { language: 'typescript' }),
        b('heading2', 'Architecture'),
        b(
          'mermaid',
          'flowchart LR\n  Client --> Gateway\n  Gateway --> Service\n  Service --> DB',
        ),
        b('heading2', 'Rollout plan'),
        b('numbered', 'Feature flag'),
        b('numbered', 'Canary'),
        b('numbered', 'Full rollout'),
        b('heading2', 'Open questions'),
        b('bullet', ''),
      ],
    }),
  },
  {
    id: 'runbook',
    name: 'On-call Runbook',
    description: '온콜 대응 체크리스트',
    icon: '📟',
    keywords: 'runbook oncall 온콜 런북',
    kind: 'page',
    build: () => ({
      title: 'Runbook: 서비스명',
      icon: '📟',
      type: 'page',
      blocks: [
        b('callout', '알람이 울리면 이 순서대로 진행하세요.'),
        b('heading2', 'Triage'),
        b('todo', '대시보드 확인', { checked: false }),
        b('todo', '최근 배포 확인', { checked: false }),
        b('todo', '에러율 / latency 확인', { checked: false }),
        b('heading2', 'Mitigation'),
        b('todo', '롤백 또는 트래픽 차단', { checked: false }),
        b('todo', '상태 페이지 업데이트', { checked: false }),
        b('heading2', 'Useful commands'),
        b('code', 'kubectl get pods -n prod\nkubectl logs -f deploy/api --tail=200', {
          language: 'bash',
        }),
        b('heading2', 'Escalation'),
        b('paragraph', 'Secondary on-call / team lead 연락처'),
        b('heading2', 'Related docs'),
        b('paragraph', '[[Incident Postmortem]] · [[ADR-000: 제목]]'),
      ],
    }),
  },
  {
    id: 'sprint',
    name: 'Sprint Board',
    description: '스토리 포인트 칸반 보드',
    icon: '🏃',
    keywords: 'sprint board agile 스프린트 칸반',
    kind: 'database',
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
          { title: '로그인 rate limit', __status: 'In Progress', [pointsId]: 3, [epicId]: 'Auth' },
          { title: 'API 문서 갱신', __status: 'Backlog', [pointsId]: 2, [epicId]: 'Docs' },
          { title: 'E2E 플레이크 수정', __status: 'Review', [pointsId]: 5, [epicId]: 'QA' },
          { title: '메트릭 대시보드', __status: 'Done', [pointsId]: 8, [epicId]: 'Observability' },
        ],
      )
    },
  },
  {
    id: 'bugs-db',
    name: 'Bug Tracker DB',
    description: '심각도 포함 버그 트래커',
    icon: '🐞',
    keywords: 'bug tracker database 버그 트래커',
    kind: 'database',
    build: () => {
      const sevId = uid()
      const high = { id: uid(), name: 'Critical', color: '#ef4444' }
      const med = { id: uid(), name: 'High', color: '#f97316' }
      const low = { id: uid(), name: 'Medium', color: '#eab308' }
      const trivial = { id: uid(), name: 'Low', color: '#22c55e' }
      return statusDb(
        '버그 트래커',
        '🐞',
        [{ id: sevId, name: 'Severity', type: 'select', options: [high, med, low, trivial] }],
        [
          { title: '결제 웹훅 중복 처리', __status: 'In Progress', [sevId]: high.id },
          { title: '다크모드 대비 부족', __status: 'Backlog', [sevId]: trivial.id },
          { title: '검색 인덱싱 지연', __status: 'Review', [sevId]: med.id },
        ],
      )
    },
  },
  {
    id: 'tech-debt',
    name: 'Tech Debt Backlog',
    description: '기술 부채 백로그',
    icon: '🧱',
    keywords: 'tech debt 기술부채 refactor',
    kind: 'database',
    build: () => {
      const costId = uid()
      const interestId = uid()
      return statusDb(
        'Tech Debt',
        '🧱',
        [
          { id: costId, name: 'Cost', type: 'number' },
          { id: interestId, name: 'Interest', type: 'number' },
        ],
        [
          { title: '레거시 auth 모듈 분리', __status: 'Backlog', [costId]: 8, [interestId]: 5 },
          { title: '테스트 커버리지 40%→70%', __status: 'In Progress', [costId]: 13, [interestId]: 8 },
          { title: 'CI 캐시 개선', __status: 'Done', [costId]: 3, [interestId]: 2 },
        ],
      )
    },
  },
]

export function getTemplate(id: string): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.id === id)
}
