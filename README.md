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

## v2.0 로컬 완성형

| 항목 | 내용 |
|------|------|
| **저장소** | IndexedDB + 스키마 마이그레이션 + 용량/백업 배너 |
| **Undo/Redo** | `Ctrl+Z` / `Ctrl+Y` (최대 40단계) |
| **페이지 트리** | 드래그 앤 드롭 (위/아래/안으로) · order |
| **DB** | 필터·정렬 · 관계(페이지) · 수식 · 캘린더 뷰 |
| **블록** | 표 · 로컬 이미지 업로드 · 코드/Mermaid/API/Git |
| **검색** | 랭킹 풀텍스트 (제목/본문/DB) |
| **설정** | 휴지통 보관일 · 백업 리마인드 · 만료 정리 |
| **Export** | Vault/정적 사이트 · 위키링크·Mermaid · 병합 import |
| **PWA** | 설치 · 오프라인 |
| **금고** | 비밀번호 잠금 · AES-GCM · 자동 잠금 (`Ctrl+L`) |
| **모바일** | 드로어 메뉴 · 상단 바 · 세이프 에어리어 · PWA 설치 |
| **테스트** | `npm test` (단위) · `npm run test:e2e` (Playwright) |

> 선택 AI(SpaceXAI)는 API 키가 있을 때만 동작. 노트 본문은 로컬 금고로 암호화 가능.

데이터는 **IndexedDB**(+ 금고 시 AES-GCM)에 저장됩니다.

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 을 엽니다.

```bash
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 미리보기
npm test         # 단위 테스트 (vitest)
npm run test:e2e:install  # Playwright 브라우저 (최초 1회)
npm run test:e2e          # E2E 스모크 (데스크톱+모바일)
```

## 기술 스택

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Zustand (persist)
- Lucide icons

## 라이선스

MIT — 자유롭게 포크·수정·비공개 사용하세요.
