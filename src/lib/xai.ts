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

function stripToPlain(body: string): string {
  return body
    .replace(/<span[^>]*data-wiki="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi, '[[$1]]')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function parseError(res: Response): Promise<XaiError> {
  let detail = ''
  try {
    const j = (await res.json()) as { error?: { message?: string } }
    detail = j.error?.message || ''
  } catch {
    detail = await res.text().catch(() => '')
  }
  if (res.status === 401) {
    return new XaiError('API 키가 올바르지 않아요. 설정에서 다시 확인해 주세요.', 401)
  }
  if (res.status === 429) {
    return new XaiError('요청이 너무 많아요. 잠시 후 다시 시도해 주세요.', 429)
  }
  return new XaiError(detail || `AI 요청 실패 (${res.status})`, res.status)
}

/**
 * Non-streaming chat completion (SpaceXAI / xAI, OpenAI-compatible).
 */
export async function xaiChat(
  messages: ChatMessage[],
  opts?: { model?: string; temperature?: number; apiKey?: string; signal?: AbortSignal },
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
      stream: false,
    }),
    signal: opts?.signal,
  })

  if (!res.ok) throw await parseError(res)

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new XaiError('AI 응답이 비어 있어요.')
  return text
}

/**
 * Streaming chat completion via SSE (OpenAI-compatible).
 * Calls onDelta for each token chunk.
 */
export async function xaiChatStream(
  messages: ChatMessage[],
  opts: {
    model?: string
    temperature?: number
    apiKey?: string
    signal?: AbortSignal
    onDelta: (chunk: string, full: string) => void
  },
): Promise<string> {
  const apiKey = opts.apiKey ?? getXaiApiKey()
  if (!apiKey) {
    throw new XaiError('API 키가 없어요. 설정에서 XAI_API_KEY를 입력해 주세요.')
  }

  const model = opts.model || DEFAULT_AI_MODEL
  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.6,
      stream: true,
    }),
    signal: opts.signal,
  })

  if (!res.ok) throw await parseError(res)
  if (!res.body) throw new XaiError('스트리밍 응답을 받을 수 없어요.')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n')
    buffer = parts.pop() ?? ''

    for (const line of parts) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>
        }
        const delta = json.choices?.[0]?.delta?.content
        if (delta) {
          full += delta
          opts.onDelta(delta, full)
        }
      } catch {
        /* ignore partial JSON */
      }
    }
  }

  if (!full.trim()) throw new XaiError('AI 응답이 비어 있어요.')
  return full.trim()
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
  /** Works well on selection */
  selectionFriendly?: boolean
}[] = [
  { id: 'summarize', label: '요약하기', description: '짧게 정리', icon: '📝', selectionFriendly: true },
  { id: 'continue', label: '이어서 쓰기', description: '글을 이어줌', icon: '✍️', selectionFriendly: true },
  { id: 'improve', label: '문장 다듬기', description: '맞춤법·표현', icon: '✨', selectionFriendly: true },
  { id: 'simplify', label: '쉽게 바꾸기', description: '쉬운 말', icon: '🌱', selectionFriendly: true },
  { id: 'todos', label: '할 일 뽑기', description: '체크리스트', icon: '✅', selectionFriendly: true },
  { id: 'title', label: '제목 추천', description: '제목 3개', icon: '🏷️' },
  { id: 'brainstorm', label: '아이디어', description: '아이디어 더', icon: '💡', selectionFriendly: true },
  { id: 'explain', label: '설명해 줘', description: '쉽게 설명', icon: '🎓', selectionFriendly: true },
  { id: 'translate_en', label: '영어 번역', description: '영어로', icon: '🇺🇸', selectionFriendly: true },
  { id: 'translate_ko', label: '한국어 번역', description: '한국어로', icon: '🇰🇷', selectionFriendly: true },
]

function actionPrompt(
  action: AiActionId,
  title: string,
  body: string,
  scope: 'page' | 'selection',
): ChatMessage[] {
  const scopeLabel = scope === 'selection' ? '선택한 글' : '노트'
  const doc =
    scope === 'selection'
      ? `노트 제목: ${title || '(없음)'}\n\n선택한 글:\n${body || '(비어 있음)'}`
      : `제목: ${title || '(없음)'}\n\n본문:\n${body || '(비어 있음)'}`

  const system =
    'You are a helpful writing assistant for a local Korean note app called Noto. Prefer clear Korean unless asked otherwise. Be concise. Do not invent facts not in the note unless brainstorming. When working on a selection, only transform that selection unless asked to expand.'

  const userByAction: Record<AiActionId, string> = {
    summarize: `다음 ${scopeLabel}을 3~6문장 또는 bullet로 요약해 주세요.\n\n${doc}`,
    continue: `다음 ${scopeLabel} 내용을 자연스럽게 이어서 써 주세요. 이어 쓸 내용만 출력하세요.\n\n${doc}`,
    improve: `다음 ${scopeLabel}의 맞춤법·띄어쓰기·표현을 다듬어 주세요. 의미 유지, 다듬은 글만 출력.\n\n${doc}`,
    simplify: `다음 ${scopeLabel}을 중학생도 이해할 쉬운 한국어로 다시 써 주세요. 결과만 출력.\n\n${doc}`,
    todos: `다음 ${scopeLabel}에서 할 일을 추출해 각 줄 "- [ ] " 체크리스트로 만들어 주세요.\n\n${doc}`,
    title: `다음 노트에 어울리는 제목을 한국어로 3개 추천해 주세요. 번호 목록만.\n\n${doc}`,
    brainstorm: `다음 ${scopeLabel}과 관련해 실행 가능한 아이디어 8개를 bullet로.\n\n${doc}`,
    explain: `다음 ${scopeLabel}을 초보자가 이해하기 쉽게 설명해 주세요.\n\n${doc}`,
    translate_en: `Translate the following ${scope === 'selection' ? 'selected text' : 'note'} into natural English. Output only the translation.\n\n${doc}`,
    translate_ko: `Translate the following into natural Korean. Output only the translation.\n\n${doc}`,
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
  scope: 'page' | 'selection' = 'page',
): Promise<string> {
  const plain = stripToPlain(body)
  return xaiChat(actionPrompt(action, title, plain || body, scope), {
    model,
    temperature: 0.5,
  })
}

export async function runAiActionStream(
  action: AiActionId,
  title: string,
  body: string,
  opts: {
    model?: string
    scope?: 'page' | 'selection'
    signal?: AbortSignal
    onDelta: (chunk: string, full: string) => void
  },
): Promise<string> {
  const plain = stripToPlain(body)
  return xaiChatStream(actionPrompt(action, title, plain || body, opts.scope ?? 'page'), {
    model: opts.model,
    temperature: 0.5,
    signal: opts.signal,
    onDelta: opts.onDelta,
  })
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

export async function runAiChatStream(
  history: ChatMessage[],
  userMessage: string,
  pageContext: string,
  opts: {
    model?: string
    signal?: AbortSignal
    onDelta: (chunk: string, full: string) => void
  },
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
  return xaiChatStream(messages, {
    model: opts.model,
    temperature: 0.7,
    signal: opts.signal,
    onDelta: opts.onDelta,
  })
}
