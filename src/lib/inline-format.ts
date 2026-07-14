/** Lightweight display formatting: **bold**, *italic*, `code`, [[wiki]] already handled elsewhere. */

export type InlineSeg =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'italic'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'wiki'; value: string }

const TOKEN =
  /(\[\[([^\]]+)\]\])|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g

export function parseInline(text: string): InlineSeg[] {
  const segs: InlineSeg[] = []
  let last = 0
  let m: RegExpExecArray | null
  const re = new RegExp(TOKEN.source, 'g')
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ kind: 'text', value: text.slice(last, m.index) })
    if (m[1]) segs.push({ kind: 'wiki', value: m[2] })
    else if (m[3]) segs.push({ kind: 'bold', value: m[4] })
    else if (m[5]) segs.push({ kind: 'italic', value: m[6] })
    else if (m[7]) segs.push({ kind: 'code', value: m[8] })
    last = m.index + m[0].length
  }
  if (last < text.length) segs.push({ kind: 'text', value: text.slice(last) })
  if (segs.length === 0) segs.push({ kind: 'text', value: text })
  return segs
}

export function hasInlineMarkup(text: string): boolean {
  return /(\[\[|\*\*|\*[^*]|`)/.test(text)
}
