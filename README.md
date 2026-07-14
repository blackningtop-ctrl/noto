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
| **블록 에디터** | H1–H3, 목록, 할 일, 인용, 콜아웃, 구분선, 이미지, 토글 |
| **데이터베이스** | 테이블 · 칸반 · 갤러리 |
| **휴지통 · 테마 · JSON 백업** | 로컬 only |

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
