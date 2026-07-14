/** Utilities for TipTap HTML stored in block.content */

export function isProbablyHtml(s: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(s)
}

export function stripHtml(html: string): string {
  if (!html) return ''
  if (!isProbablyHtml(html)) return html
  // preserve wiki titles from data-wiki
  let s = html.replace(
    /<span[^>]*data-wiki="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,
    '[[$1]]',
  )
  s = s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  return s.replace(/\n{3,}/g, '\n\n').trim()
}

export function plainToHtml(text: string): string {
  if (!text) return ''
  if (isProbablyHtml(text)) return text
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  // convert [[wiki]] to wiki spans
  const withWiki = escaped.replace(/\[\[([^\]]+)\]\]/g, (_m, title: string) => {
    const t = title.trim()
    return `<span data-wiki="${t}" class="wiki-link">${t}</span>`
  })
  // simple markdown inline
  let s = withWiki
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
  const lines = s.split('\n')
  if (lines.length === 1) return `<p>${lines[0] || '<br>'}</p>`
  return lines.map((l) => `<p>${l || '<br>'}</p>`).join('')
}

export function htmlToMarkdownLite(html: string): string {
  if (!html) return ''
  if (!isProbablyHtml(html)) return html
  let s = html
  s = s.replace(/<span[^>]*data-wiki="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi, '[[$1]]')
  s = s.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
  s = s.replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
  s = s.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
  s = s.replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*')
  s = s.replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<\/p>/gi, '\n')
  s = s.replace(/<\/h1>/gi, '\n')
  s = s.replace(/<\/h2>/gi, '\n')
  s = s.replace(/<\/h3>/gi, '\n')
  s = s.replace(/<\/li>/gi, '\n')
  s = s.replace(/<[^>]+>/g, '')
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
  return s.replace(/\n{3,}/g, '\n\n').trim()
}
