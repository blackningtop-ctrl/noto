import type { Page } from '../types'

const WIKI_RE = /\[\[([^\]]+)\]\]/g
const DATA_WIKI_RE = /data-wiki="([^"]+)"/g

export function extractWikiLinks(text: string): string[] {
  const links: string[] = []
  let m: RegExpExecArray | null
  const re = new RegExp(WIKI_RE.source, 'g')
  while ((m = re.exec(text)) !== null) {
    const t = m[1].trim()
    if (t) links.push(t)
  }
  const re2 = new RegExp(DATA_WIKI_RE.source, 'g')
  while ((m = re2.exec(text)) !== null) {
    const t = m[1].trim()
    if (t) links.push(t)
  }
  return links
}

export function findPageByWikiTitle(pages: Page[], title: string): Page | undefined {
  const q = title.trim().toLowerCase()
  return pages.find((p) => !p.deleted && p.title.trim().toLowerCase() === q)
}

/** Pages that reference `targetTitle` via [[...]] (excluding the page itself). */
export function getBacklinks(pages: Page[], targetPage: Page): Page[] {
  const titles = new Set([targetPage.title.trim().toLowerCase()])
  return pages.filter((p) => {
    if (p.deleted || p.id === targetPage.id) return false
    const corpus = [
      ...p.blocks.map((b) => b.content),
      ...(p.database?.rows.map((r) => String(r.values.title ?? '')) ?? []),
    ].join('\n')
    return extractWikiLinks(corpus).some((link) => titles.has(link.trim().toLowerCase()))
  })
}

export type WikiSegment =
  | { kind: 'text'; value: string }
  | { kind: 'wiki'; value: string; raw: string }

export function parseWikiSegments(text: string): WikiSegment[] {
  const segments: WikiSegment[] = []
  let last = 0
  const re = new RegExp(WIKI_RE.source, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ kind: 'text', value: text.slice(last, m.index) })
    }
    segments.push({ kind: 'wiki', value: m[1].trim(), raw: m[0] })
    last = m.index + m[0].length
  }
  if (last < text.length) {
    segments.push({ kind: 'text', value: text.slice(last) })
  }
  if (segments.length === 0) {
    segments.push({ kind: 'text', value: text })
  }
  return segments
}
