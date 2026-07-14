import { useMemo, useState } from 'react'
import type { Page } from '../types'
import { useStore } from '../store'
import { pageToMarkdown } from '../lib/markdown'
import { hasXaiApiKey } from '../lib/ai-key'
import {
  AI_ACTIONS,
  AI_MODELS,
  type AiActionId,
  type ChatMessage,
  runAiAction,
  runAiChat,
  DEFAULT_AI_MODEL,
} from '../lib/xai'
import { Sparkles, X, Loader2, ArrowDownToLine, Send, Settings, KeyRound } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  page: Page
  open: boolean
  onClose: () => void
}

export function AiPanel({ page, open, onClose }: Props) {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const setView = useStore((s) => s.setView)
  const setBlocks = useStore((s) => s.setBlocks)
  const updatePage = useStore((s) => s.updatePage)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState('')
  const [lastAction, setLastAction] = useState<AiActionId | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [chat, setChat] = useState<ChatMessage[]>([])
  const keyed = hasXaiApiKey()
  const model = settings.aiModel || DEFAULT_AI_MODEL

  const bodyText = useMemo(() => {
    if (page.type === 'database') return pageToMarkdown(page)
    return page.blocks
      .map((b) => b.content)
      .filter(Boolean)
      .join('\n')
  }, [page])

  if (!open) return null

  const run = async (action: AiActionId) => {
    if (!keyed) {
      setError('먼저 설정에서 API 키를 입력해 주세요.')
      return
    }
    setBusy(true)
    setError(null)
    setLastAction(action)
    try {
      const text = await runAiAction(action, page.title, bodyText, model)
      setResult(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 요청 실패')
    } finally {
      setBusy(false)
    }
  }

  const sendChat = async () => {
    const msg = chatInput.trim()
    if (!msg || busy) return
    if (!keyed) {
      setError('먼저 설정에서 API 키를 입력해 주세요.')
      return
    }
    setBusy(true)
    setError(null)
    setChatInput('')
    const nextHistory = [...chat, { role: 'user' as const, content: msg }]
    setChat(nextHistory)
    try {
      const reply = await runAiChat(
        chat,
        msg,
        `제목: ${page.title}\n\n${bodyText}`,
        model,
      )
      setChat([...nextHistory, { role: 'assistant', content: reply }])
      setResult(reply)
      setLastAction(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 요청 실패')
      setChat(chat)
    } finally {
      setBusy(false)
    }
  }

  const applyBelow = () => {
    if (!result.trim() || page.type !== 'page') return
    const lines = result.split(/\n/)
    // append as paragraphs / todos
    const extras = lines
      .map((line) => line.trimEnd())
      .filter((line, i, arr) => line.length > 0 || (i > 0 && arr[i - 1].length > 0))
      .map((line) => {
        const todo = line.match(/^[-*]\s+\[\s?\]\s+(.*)$/) || line.match(/^[-*]\s+\[x\]\s+(.*)$/i)
        if (todo) {
          return {
            id: crypto.randomUUID(),
            type: 'todo' as const,
            content: todo[1],
            checked: /\[x\]/i.test(line),
          }
        }
        if (line.startsWith('# ')) {
          return { id: crypto.randomUUID(), type: 'heading1' as const, content: line.slice(2) }
        }
        if (line.startsWith('## ')) {
          return { id: crypto.randomUUID(), type: 'heading2' as const, content: line.slice(3) }
        }
        if (line.startsWith('### ')) {
          return { id: crypto.randomUUID(), type: 'heading3' as const, content: line.slice(4) }
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return { id: crypto.randomUUID(), type: 'bullet' as const, content: line.slice(2) }
        }
        return { id: crypto.randomUUID(), type: 'paragraph' as const, content: line }
      })

    if (page.blocks.length === 1 && !page.blocks[0].content) {
      setBlocks(page.id, extras.length ? extras : [{ id: crypto.randomUUID(), type: 'paragraph', content: result }])
    } else {
      setBlocks(page.id, [
        ...page.blocks,
        { id: crypto.randomUUID(), type: 'divider', content: '' },
        { id: crypto.randomUUID(), type: 'callout', content: '🤖 AI 결과' },
        ...extras,
      ])
    }
  }

  const applyTitle = () => {
    // take first non-empty line, strip number prefix
    const line =
      result
        .split('\n')
        .map((l) => l.replace(/^\d+[\.)]\s*/, '').replace(/^[-*]\s*/, '').trim())
        .find((l) => l.length > 0) || ''
    if (line) updatePage(page.id, { title: line.slice(0, 120) })
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] shadow-2xl">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-hover)] px-3 py-2.5">
        <Sparkles size={16} className="text-[var(--color-accent)]" />
        <span className="flex-1 text-sm font-semibold">AI 도우미</span>
        <select
          className="max-w-[140px] rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-1.5 py-1 text-[11px] outline-none"
          value={model}
          onChange={(e) => updateSettings({ aiModel: e.target.value })}
          title="모델"
        >
          {AI_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <button type="button" className="rounded-lg p-1 hover:bg-[var(--color-panel)]" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {!keyed ? (
        <div className="space-y-3 p-4 text-sm">
          <div className="flex items-start gap-2 rounded-xl bg-[var(--color-accent-soft)] p-3">
            <KeyRound size={16} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
            <div>
              <p className="font-medium">API 키가 필요해요</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
                SpaceXAI(xAI) 키를 설정에 넣으면 요약·이어쓰기·번역 등을 쓸 수 있어요. 키는 이
                브라우저에만 저장되고, 요청 시에만 api.x.ai 로 전송됩니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-3 py-2.5 text-sm font-medium text-white"
            onClick={() => {
              onClose()
              setView({ kind: 'settings' })
            }}
          >
            <Settings size={16} /> 설정에서 키 입력하기
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1.5 p-2">
            {AI_ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={busy}
                onClick={() => void run(a.id)}
                className={clsx(
                  'rounded-xl border border-[var(--color-border)] px-2 py-2 text-left text-xs transition hover:border-[var(--color-accent)] hover:bg-[var(--color-hover)] disabled:opacity-50',
                  lastAction === a.id && result && 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]',
                )}
              >
                <span className="mr-1">{a.icon}</span>
                <span className="font-medium">{a.label}</span>
                <span className="mt-0.5 block text-[10px] text-[var(--color-muted)]">
                  {a.description}
                </span>
              </button>
            ))}
          </div>

          {error && (
            <div className="mx-2 mb-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-[var(--color-danger)]">
              {error}
            </div>
          )}

          <div className="mx-2 mb-2 max-h-48 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-hover)]/40 p-2">
            {busy && !result ? (
              <div className="flex items-center gap-2 px-1 py-6 text-sm text-[var(--color-muted)]">
                <Loader2 size={16} className="animate-spin" /> 생각 중…
              </div>
            ) : result ? (
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{result}</pre>
            ) : (
              <p className="px-1 py-6 text-center text-xs text-[var(--color-muted)]">
                위 버튼을 누르거나 아래에 질문해 보세요
              </p>
            )}
          </div>

          {result && page.type === 'page' && (
            <div className="flex gap-1.5 px-2 pb-2">
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-[var(--color-accent)] px-2 py-2 text-xs font-medium text-white"
                onClick={applyBelow}
              >
                <ArrowDownToLine size={14} /> 노트 아래에 넣기
              </button>
              {lastAction === 'title' && (
                <button
                  type="button"
                  className="rounded-xl border border-[var(--color-border)] px-2 py-2 text-xs"
                  onClick={applyTitle}
                >
                  제목 적용
                </button>
              )}
              <button
                type="button"
                className="rounded-xl border border-[var(--color-border)] px-2 py-2 text-xs"
                onClick={() => void navigator.clipboard.writeText(result)}
              >
                복사
              </button>
            </div>
          )}

          {chat.length > 0 && (
            <div className="max-h-28 space-y-1 overflow-y-auto border-t border-[var(--color-border)] px-3 py-2 text-[11px]">
              {chat.slice(-4).map((m, i) => (
                <div
                  key={i}
                  className={clsx(
                    'rounded-lg px-2 py-1',
                    m.role === 'user' ? 'bg-[var(--color-accent-soft)]' : 'bg-[var(--color-hover)]',
                  )}
                >
                  <strong>{m.role === 'user' ? '나' : 'AI'}: </strong>
                  {m.content.slice(0, 200)}
                  {m.content.length > 200 ? '…' : ''}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-1.5 border-t border-[var(--color-border)] p-2">
            <input
              className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
              placeholder="AI에게 물어보기…"
              value={chatInput}
              disabled={busy}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendChat()
                }
              }}
            />
            <button
              type="button"
              disabled={busy || !chatInput.trim()}
              className="rounded-xl bg-[var(--color-accent)] px-3 text-white disabled:opacity-40"
              onClick={() => void sendChat()}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
