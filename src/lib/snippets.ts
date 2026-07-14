import type { Snippet } from '../types'
import { uid } from './id'

export function createDefaultSnippets(): Snippet[] {
  const now = Date.now()
  return [
    {
      id: uid(),
      name: 'React component',
      description: '함수형 컴포넌트 스켈레톤',
      language: 'typescript',
      tags: ['react', 'ts'],
      body: `export function Component() {\n  return (\n    <div>\n      \n    </div>\n  )\n}\n`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      name: 'fetch JSON',
      description: 'async fetch 헬퍼',
      language: 'typescript',
      tags: ['http', 'fetch'],
      body: `async function getJson<T>(url: string): Promise<T> {\n  const res = await fetch(url)\n  if (!res.ok) throw new Error(await res.text())\n  return res.json() as Promise<T>\n}\n`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      name: 'SQL select',
      description: '기본 SELECT',
      language: 'sql',
      tags: ['sql'],
      body: `SELECT id, created_at\nFROM table_name\nWHERE deleted_at IS NULL\nORDER BY created_at DESC\nLIMIT 50;\n`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      name: 'Dockerfile node',
      description: 'Node 프로덕션 이미지',
      language: 'dockerfile',
      tags: ['docker'],
      body: `FROM node:22-alpine AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:22-alpine\nWORKDIR /app\nENV NODE_ENV=production\nCOPY --from=build /app/dist ./dist\nCOPY package*.json ./\nRUN npm ci --omit=dev\nEXPOSE 3000\nCMD ["node", "dist/index.js"]\n`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      name: 'PR checklist',
      description: 'PR 본문 체크리스트',
      language: 'markdown',
      tags: ['git', 'pr'],
      body: `## Summary\n-\n\n## Test plan\n- [ ] unit\n- [ ] e2e / manual\n\n## Risk\n- Low / Med / High\n`,
      createdAt: now,
      updatedAt: now,
    },
  ]
}
