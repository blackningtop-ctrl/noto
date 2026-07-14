import { getXaiApiKey } from './ai-key'

export const XAI_BASE = 'https://api.x.ai/v1'
export const DEFAULT_AI_MODEL = 'grok-4.5'

export const AI_MODELS = [
  { id: 'grok-4.5', label: 'Grok 4.5 (추천)' },
  { id: 'grok-4.3', label: 'Grok 4.3' },
  { id: 'grok-4.20-0309-non-reasoning', label: 'Grok 4.20 (빠름)' },
] as const

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export class XaiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'XaiError'
    this.status = status
  }
}

/**
 * Call SpaceXAI (xAI) chat completions — OpenAI-compatible.
 * Key is provided by the user and only sent to api.x.ai.
 */
export async function xaiChat(
  messages: ChatMessage[],
  opts?: { model?: string; temperature?: number; apiKey?: string },
): Promise<string> {
  const apiKey = opts?.apiKey ?? getXaiApiKey()
  if (!apiKey) {
    throw new XaiError('API 키가 없어요. 설정에서 XAI_API_KEY를 입력해 주세요.')
  }

  const model = opts?.model || DEFAULT_AI_MODEL
  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts?.temperature ?? 0.6,
    }),
  })

  if (!res.ok) {
    let detail = ''
    try {
      const j = (await res.json()) as { error?: { message?: string } }
      detail = j.error?.message || ''
    } catch {
      detail = await res.text().catch(() => '')
    }
    if (res.status === 401) {
      throw new XaiError('API 키가 올바르지 않아요. 설정에서 다시 확인해 주세요.', 401)
    }
    if (res.status === 429) {
      throw new XaiError('요청이 너무 많아요. 잠시 후 다시 시도해 주세요.', 429)
    }
    throw new XaiError(detail || `AI 요청 실패 (${res.status})`, res.status)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new XaiError('AI 응답이 비어 있어요.')
  return text
}

export async function testXaiConnection(apiKey?: string, model?: string): Promise<string> {
  return xaiChat(
    [
      { role: 'system', content: 'Reply in one short Korean sentence.' },
      { role: 'user', content: '연결 테스트야. "연결 성공"이라고만 답해.' },
    ],
    { apiKey, model, temperature: 0 },
  )
}

export type AiActionId =
  | 'summarize'
  | 'continue'
  | 'improve'
  | 'simplify'
  | 'todos'
  | 'title'
  | 'translate_en'
  | 'translate_ko'
  | 'brainstorm'
  | 'explain'

export const AI_ACTIONS: {
  id: AiActionId
  label: string
  description: string
  icon: string
}[] = [
  { id: 'summarize', label: '요약하기', description: '노트를 짧게 정리', icon: '📝' },
  { id: 'continue', label: '이어서 쓰기', description: '글을 자연스럽게 이어줌', icon: '✍️' },
  { id: 'improve', label: '문장 다듬기', description: '맞춤법·표현 개선', icon: '✨' },
  { id: 'simplify', label: '쉽게 바꾸기', description: '중학생도 읽기 쉽게', icon: '🌱' },
  { id: 'todos', label: '할 일 뽑기', description: '체크리스트로 만들기', icon: '✅' },
  { id: 'title', label: '제목 추천', description: '좋은 제목 3개', icon: '🏷️' },
  { id: 'brainstorm', label: '아이디어', description: '관련 아이디어 더 내기', icon: '💡' },
  { id: 'explain', label: '설명해 줘', description: '내용을 쉽게 설명', icon: '🎓' },
  { id: 'translate_en', label: '영어 번역', description: '영어로 번역', icon: '🇺🇸' },
  { id: 'translate_ko', label: '한국어 번역', description: '한국어로 번역', icon: '🇰🇷' },
]

function actionPrompt(action: AiActionId, title: string, body: string): ChatMessage[] {
  const doc = `제목: ${title || '(없음)'}\n\n본문:\n${body || '(비어 있음)'}`
  const system =
    'You are a helpful writing assistant for a local Korean note app called Noto. Prefer clear Korean unless asked otherwise. Be concise. Do not invent facts not in the note unless brainstorming.'

  const userByAction: Record<AiActionId, string> = {
    summarize: `다음 노트를 3~6문장으로 요약해 주세요. 핵심만 bullet로 정리해도 됩니다.\n\n${doc}`,
    continue: `다음 노트 내용을 자연스럽게 2~4문단 이어서 써 주세요. 기존 문체를 맞추세요. 이어서 쓸 내용만 출력하세요.\n\n${doc}`,
    improve: `다음 글의 맞춤법·띄어쓰기·표현을 다듬어 주세요. 의미는 유지하고, 다듬은 전체 글만 출력하세요.\n\n${doc}`,
    simplify: `다음 글을 중학생도 이해할 수 있는 쉬운 한국어로 다시 써 주세요. 다듬은 글만 출력하세요.\n\n${doc}`,
    todos: `다음 노트에서 할 일을 추출해 체크리스트 형식으로 만들어 주세요. 각 줄은 "- [ ] " 로 시작하세요.\n\n${doc}`,
    title: `다음 노트에 어울리는 제목을 한국어로 3개 추천해 주세요. 번호 목록으로만 출력하세요.\n\n${doc}`,
    brainstorm: `다음 노트 주제와 관련해 실행 가능한 아이디어 8개를 bullet로 제안해 주세요.\n\n${doc}`,
    explain: `다음 노트 내용을 초보자가 이해하기 쉽게 설명해 주세요. 비유를 조금 써도 됩니다.\n\n${doc}`,
    translate_en: `Translate the following note into natural English. Keep structure. Output only the translation.\n\n${doc}`,
    translate_ko: `Translate the following note into natural Korean. Keep structure. Output only the translation.\n\n${doc}`,
  }

  return [
    { role: 'system', content: system },
    { role: 'user', content: userByAction[action] },
  ]
}

export async function runAiAction(
  action: AiActionId,
  title: string,
  body: string,
  model?: string,
): Promise<string> {
  return xaiChat(actionPrompt(action, title, body), { model, temperature: 0.5 })
}

export async function runAiChat(
  history: ChatMessage[],
  userMessage: string,
  pageContext: string,
  model?: string,
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are Noto AI, a friendly Korean note assistant. Help with writing, organizing, and studying. Keep answers clear and not too long. Current page context follows.\n\n' +
        pageContext.slice(0, 12000),
    },
    ...history.slice(-12),
    { role: 'user', content: userMessage },
  ]
  return xaiChat(messages, { model, temperature: 0.7 })
}
