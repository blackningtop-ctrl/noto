# Noto Dev — 개발자용 Notion 스타일 워크스페이스

벤토 그리드 UI + **개발자 Phase 1** 기능을 갖춘 **완전 무료 · 로컬 저장** 노트 앱입니다.

## 기능

| 영역 | 내용 |
|------|------|
| **홈** | 벤토 그리드 대시보드 |
| **커맨드 팔레트** | `Ctrl/⌘ + K` — 페이지 · 액션 · 템플릿 · MD/JSON |
| **코드 블록** | highlight.js 문법 강조, 줄 번호, 언어 선택, 복사 |
| **Mermaid** | 플로우 · 시퀀스 등 다이어그램 (`/mermaid`) |
| **위키링크** | `[[페이지 제목]]` 클릭 이동/생성 + 백링크 패널 |
| **템플릿** | ADR, Bug, RFC, Postmortem, Runbook, Sprint, Bug DB, Tech Debt |
| **Markdown** | 페이지 `.md` 내보내기 / 파일 가져와 페이지 생성 |
| **그래프 뷰** | 위키링크 · 부모/자식 연결 force graph |
| **스니펫** | 보일러플레이트 라이브러리 · 페이지 삽입 · Ctrl+K |
| **API 블록** | Method · Path · Request/Response · cURL 복사 (`/api`) |
| **버전 히스토리** | 자동(30s) · 수동 스냅샷 · 복원 (페이지당 20개) |
| **Markdown Vault** | `docs/**/*.md` + `noto-manifest.json` ZIP (Git 친화) |
| **정적 Docs 사이트** | `index.html` + `pages/*.html` ZIP (오프라인 위키) |
| **폴더 동기화** | Chrome/Edge File System Access API 읽기/쓰기 |
| **Git 메타 블록** | `/git` — repo · branch · PR · issue · commit 링크 |
| **블록 에디터** | H1–H3, 목록, 할 일, 인용, 콜아웃, 구분선, 이미지, 토글 |
| **데이터베이스** | 테이블 · 칸반 · 갤러리 |
| **휴지통 · 테마 · JSON 백업** | 로컬 only |

> AI 기능은 포함하지 않습니다.

## v1.4 폴리시

| 항목 | 내용 |
|------|------|
| **저장소** | IndexedDB (localStorage 자동 마이그레이션) + 용량 경고 배너 |
| **Undo/Redo** | `Ctrl+Z` / `Ctrl+Y` (워크스페이스 단위, 최대 40단계) |
| **DB** | 검색 · 정렬 · 상태 필터 |
| **인라인 서식** | `**굵게**` `*기울임*` `` `코드` `` · 위키링크 미존재 표시 |
| **정적 export** | 위키링크 → HTML 링크 · Mermaid CDN 렌더 |
| **Import** | 병합 / 전체 교체 선택 |
| **PWA** | 설치 가능 · 오프라인 캐시 |
| **단축키** | `Ctrl+K` 팔레트 · `Ctrl+G` 그래프 · `Ctrl+E` Export · `Ctrl+H` 홈 |

데이터가 **localStorage**에만 저장됩니다.

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 을 엽니다.

```bash
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 미리보기
```

## 기술 스택

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Zustand (persist)
- Lucide icons

## 라이선스

MIT — 자유롭게 포크·수정·비공개 사용하세요.
