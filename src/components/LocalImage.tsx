import { useEffect, useState } from 'react'
import { createObjectUrlFromBlobId, isBlobRef, parseBlobId, fileToBlobRef } from '../lib/blob-store'
import { ImagePlus } from 'lucide-react'

interface Props {
  content: string
  onChange: (content: string) => void
}

export function LocalImage({ content, onChange }: Props) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false
    const run = async () => {
      if (!content) {
        setSrc(null)
        return
      }
      if (isBlobRef(content)) {
        const id = parseBlobId(content)
        if (!id) return
        const url = await createObjectUrlFromBlobId(id)
        if (!cancelled && url) {
          revoked = url
          setSrc(url)
        }
      } else {
        setSrc(content)
      }
    }
    void run()
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [content])

  const onFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 8 * 1024 * 1024) {
      alert('이미지는 8MB 이하만 지원합니다.')
      return
    }
    const ref = await fileToBlobRef(file)
    onChange(ref)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          className="block-input min-w-0 flex-1 text-sm"
          style={{ color: 'var(--color-muted)' }}
          placeholder="이미지 URL 또는 아래 업로드…"
          value={isBlobRef(content) ? '(로컬 업로드 이미지)' : content}
          onChange={(e) => {
            if (!isBlobRef(content)) onChange(e.target.value)
          }}
          disabled={isBlobRef(content)}
        />
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-hover)]">
          <ImagePlus size={14} />
          업로드
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </label>
        {isBlobRef(content) && (
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-xs text-[var(--color-danger)] hover:bg-[var(--color-hover)]"
            onClick={() => onChange('')}
          >
            제거
          </button>
        )}
      </div>
      {src && (
        <img
          src={src}
          alt=""
          className="max-h-96 rounded-xl border border-[var(--color-border)] object-contain"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      )}
    </div>
  )
}
