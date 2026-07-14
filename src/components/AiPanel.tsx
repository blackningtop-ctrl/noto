import { useEffect, useMemo, useRef, useState } from 'react'
import type { Page } from '../types'
import { useStore } from '../store'
import { pageToMarkdown } from '../lib/markdown'
import { stripHtml } from '../lib/html-text'
import { hasXaiApiKey } from '../lib/ai-key'
import { useSelectionStore } from '../lib/selection-store'
import {
  AI_ACTIONS,
  AI_MODELS,
  type AiActionId,
  type ChatMessage,
  runAiActionStream,
  runAiChatStream,
  DEFAULT_AI_MODEL,
} from '../lib/xai'
import {
  Sparkles,
  X,
  Loader2,
  ArrowDownToLine,
  Send,
  Settings,
  KeyRound,
  Square,
  MousePointer2,
  FileText,
} from 'lucide-react'
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

  const selectionText = useSelectionStore((s) => s.text)
  const pendingAiOpen = useSelectionStore((s) => s.pendingAiOpen)
  const consumeAiOpen = useSelectionStore((s) => s.consumeAiOpen)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState('')
  const [lastAction, setLastAction] = useState<AiActionId | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [scope, setScope] = useState<'page' | 'selection'>('page')
  const abortRef = useRef<AbortController | null>(null)

  const keyed = hasXaiApiKey()
  const model = settings.aiModel || DEFAULT_AI_MODEL
  const hasSelection = selectionText.trim().length >= 2

  const pageBody = useMemo(() => {
    if (page.type === 'database') return pageToMarkdown(page)
    return page.blocks
      .map((b) => stripHtml(b.content || ''))
      .filter(Boolean)
      .join('\n')
  }, [page])

  const activeBody = scope === 'selection' && hasSelection ? selectionText.trim() : pageBody

  useEffect(() => {
    if (open && pendingAiOpen) {
      consumeAiOpen()
      if (hasSelection) setScope('selection')
    }
  }, [open, pendingAiOpen, hasSelection, consumeAiOpen])

  useEffect(() => {
    if (hasSelection && open) {
      // keep selection mode sticky while selection exists
    } else if (!hasSelection && scope === 'selection') {
      setScope('page')
    }
  }, [hasSelection, open, scope])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  if (!open) return null

  const stop = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
  }

  const run = async (action: AiActionId) => {
    if (!keyed) {
      setError('먼저 설정에서 API 키를 입력해 주세요.')
      return
    }
    if (scope === 'selection' && !hasSelection) {
      setError('글을 드래그해서 선택한 뒤 다시 눌러 주세요.')
      return
    }
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setBusy(true)
    setError(null)
    setLastAction(action)
    setResult('')
    try {
      await runAiActionStream(action, page.title, activeBody, {
        model,
        scope,
        signal: ac.signal,
        onDelta: (_chunk, full) => setResult(full),
      })
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        setError(null)
      } else {
        setError(e instanceof Error ? e.message : 'AI 요청 실패')
      }
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  const sendChat = async () => {
    const msg = chatInput.trim()
    if (!msg || busy) return
    if (!keyed) {
      setError('먼저 설정에서 API 키를 입력해 주세요.')
      return
    }
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setBusy(true)
    setError(null)
    setChatInput('')
    const nextHistory = [...chat, { role: 'user' as const, content: msg }]
    setChat(nextHistory)
    setResult('')
    setLastAction(null)
    try {
      const ctx =
        scope === 'selection' && hasSelection
          ? `제목: ${page.title}\n\n[선택 영역]\n${selectionText}\n\n[전체 노트 일부]\n${pageBody.slice(0, 4000)}`
          : `제목: ${page.title}\n\n${pageBody}`
      const reply = await runAiChatStream(chat, msg, ctx, {
        model,
        signal: ac.signal,
        onDelta: (_c, full) => {
          setResult(full)
        },
      })
      setChat([...nextHistory, { role: 'assistant', content: reply }])
      setResult(reply)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError(e instanceof Error ? e.message : 'AI 요청 실패')
        setChat(chat)
      }
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  const applyBelow = () => {
    if (!result.trim() || page.type !== 'page') return
    const lines = result.split(/\n/)
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

    if (page.blocks.length === 1 && !stripHtml(page.blocks[0].content || '')) {
      setBlocks(page.id, extras.length ? extras : [{ id: crypto.randomUUID(), type: 'paragraph', content: result }])
    } else {
      setBlocks(page.id, [
        ...page.blocks,
        { id: crypto.randomUUID(), type: 'divider', content: '' },
        {
          id: crypto.randomUUID(),
          type: 'callout',
          content: scope === 'selection' ? '🤖 AI 결과 (선택 영역)' : '🤖 AI 결과',
        },
        ...extras,
      ])
    }
  }

  const applyTitle = () => {
    const line =
      result
        .split('\n')
        .map((l) => l.replace(/^\d+[\.)]\s*/, '').replace(/^[-*]\s*/, '').trim())
        .find((l) => l.length > 0) || ''
    if (line) updatePage(page.id, { title: line.slice(0, 120) })
  }

  const actions =
    scope === 'selection'
      ? AI_ACTIONS.filter((a) => a.selectionFriendly !== false && a.id !== 'title')
      : AI_ACTIONS

  return (
    <div className="fixed bottom-4 right-4 z-40 flex w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] shadow-2xl">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-hover)] px-3 py-2.5">
        <Sparkles size={16} className="text-[var(--color-accent)]" />
        <span className="flex-1 text-sm font-semibold">AI 도우미</span>
        {busy && (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-danger)]/10 px-2 py-1 text-[11px] font-medium text-[var(--color-danger)]"
            onClick={stop}
          >
            <Square size={12} /> 중지
          </button>
        )}
        <select
          className="max-w-[130px] rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-1.5 py-1 text-[11px] outline-none"
          value={model}
          onChange={(e) => updateSettings({ aiModel: e.target.value })}
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
                SpaceXAI(xAI) 키를 설정에 넣으면 요약·선택 영역 AI·스트리밍 채팅을 쓸 수 있어요.
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
          {/* scope toggle */}
          <div className="flex gap-1 border-b border-[var(--color-border)] p-2">
            <button
              type="button"
              onClick={() => setScope('page')}
              className={clsx(
                'flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium',
                scope === 'page'
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-hover)]',
              )}
            >
              <FileText size={13} /> 전체 노트
            </button>
            <button
              type="button"
              onClick={() => {
                if (!hasSelection) {
                  setError('노트에서 글을 드래그해서 선택한 뒤 눌러 주세요.')
                  return
                }
                setScope('selection')
                setError(null)
              }}
              className={clsx(
                'flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium',
                scope === 'selection'
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-hover)]',
              )}
            >
              <MousePointer2 size={13} /> 선택한 글
              {hasSelection && (
                <span className="rounded bg-[var(--color-panel)] px-1 text-[10px]">
                  {selectionText.trim().length}자
                </span>
              )}
            </button>
          </div>

          {scope === 'selection' && hasSelection && (
            <div className="mx-2 mt-2 max-h-16 overflow-y-auto rounded-lg bg-[var(--color-hover)] px-2 py-1.5 text-[11px] text-[var(--color-muted)]">
              “{selectionText.trim().slice(0, 160)}
              {selectionText.trim().length > 160 ? '…' : ''}”
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5 p-2">
            {actions.map((a) => (
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

          <div className="mx-2 mb-2 max-h-52 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-hover)]/40 p-2">
            {busy && !result ? (
              <div className="flex items-center gap-2 px-1 py-6 text-sm text-[var(--color-muted)]">
                <Loader2 size={16} className="animate-spin" /> 실시간으로 받아오는 중…
              </div>
            ) : result ? (
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                {result}
                {busy && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-[var(--color-accent)] align-middle" />}
              </pre>
            ) : (
              <p className="px-1 py-6 text-center text-xs text-[var(--color-muted)]">
                버튼을 누르거나 아래에 질문해 보세요 · 답변이 실시간으로 나타나요
              </p>
            )}
          </div>

          {result && page.type === 'page' && (
            <div className="flex gap-1.5 px-2 pb-2">
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-[var(--color-accent)] px-2 py-2 text-xs font-medium text-white"
                onClick={applyBelow}
                disabled={busy}
              >
                <ArrowDownToLine size={14} /> 노트 아래에 넣기
              </button>
              {lastAction === 'title' && (
                <button
                  type="button"
                  className="rounded-xl border border-[var(--color-border)] px-2 py-2 text-xs"
                  onClick={applyTitle}
                  disabled={busy}
                >
                  제목 적용
                </button>
              )}
              <button
                type="button"
                className="rounded-xl border border-[var(--color-border)] px-2 py-2 text-xs"
                onClick={() => void navigator.clipboard.writeText(result)}
                disabled={busy}
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
              placeholder={
                scope === 'selection' && hasSelection
                  ? '선택 영역에 대해 물어보기…'
                  : 'AI에게 물어보기…'
              }
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
