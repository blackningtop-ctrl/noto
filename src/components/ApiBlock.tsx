import type { ApiEndpoint, HttpMethod } from '../types'
import { HTTP_METHODS } from '../types'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const METHOD_COLOR: Record<HttpMethod, string> = {
  GET: '#22c55e',
  POST: '#3b82f6',
  PUT: '#f59e0b',
  PATCH: '#a855f7',
  DELETE: '#ef4444',
  HEAD: '#64748b',
  OPTIONS: '#64748b',
}

interface Props {
  api: ApiEndpoint
  onChange: (api: ApiEndpoint) => void
}

export function ApiBlock({ api, onChange }: Props) {
  const [copied, setCopied] = useState(false)
  const patch = (partial: Partial<ApiEndpoint>) => onChange({ ...api, ...partial })

  const curl = [
    `curl -X ${api.method} '${api.path}'`,
    `-H 'Content-Type: ${api.contentType}'`,
    api.method !== 'GET' && api.method !== 'HEAD' && api.requestBody.trim()
      ? `-d '${api.requestBody.replace(/'/g, `'\\''`)}'`
      : '',
  ]
    .filter(Boolean)
    .join(' \\\n  ')

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="api-block w-full overflow-hidden rounded-xl border border-[var(--color-border)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-hover)] px-3 py-2">
        <select
          className="rounded-md px-2 py-1 text-xs font-bold text-white outline-none"
          style={{ background: METHOD_COLOR[api.method] }}
          value={api.method}
          onChange={(e) => patch({ method: e.target.value as HttpMethod })}
        >
          {HTTP_METHODS.map((m) => (
            <option key={m} value={m} style={{ color: '#000' }}>
              {m}
            </option>
          ))}
        </select>
        <input
          className="min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1 font-mono text-sm outline-none"
          value={api.path}
          placeholder="/api/path"
          onChange={(e) => patch({ path: e.target.value })}
        />
        <input
          type="number"
          className="w-16 rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1 text-center text-xs outline-none"
          value={api.statusCode}
          onChange={(e) => patch({ statusCode: Number(e.target.value) || 0 })}
          title="Status code"
        />
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-muted)] hover:bg-[var(--color-panel)]"
          onClick={copyCurl}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          cURL
        </button>
      </div>

      <div className="space-y-3 p-3">
        <input
          className="w-full border-none bg-transparent text-sm outline-none placeholder:text-[var(--color-muted)]"
          value={api.summary}
          placeholder="요약 / 설명"
          onChange={(e) => patch({ summary: e.target.value })}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="Request body"
            value={api.requestBody}
            onChange={(requestBody) => patch({ requestBody })}
            mono
          />
          <Field
            label={`Response (${api.statusCode})`}
            value={api.responseBody}
            onChange={(responseBody) => patch({ responseBody })}
            mono
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-muted)]">Content-Type</span>
          <input
            className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1 font-mono text-xs outline-none"
            value={api.contentType}
            onChange={(e) => patch({ contentType: e.target.value })}
          />
        </div>

        <pre
          className={clsx(
            'overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-hover)] p-2 font-mono text-[11px] leading-relaxed text-[var(--color-muted)]',
          )}
        >
          {curl}
        </pre>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  mono,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  mono?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </span>
      <textarea
        className={clsx(
          'min-h-[100px] w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-2 text-sm outline-none',
          mono && 'font-mono text-xs',
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </label>
  )
}
