import JSZip from 'jszip'
import type { Page, Snippet } from '../types'
import { pageToMarkdown, markdownToBlocks, parseMarkdownTitle } from './markdown'
import { uniqueSlug } from './slug'
import { uid } from './id'

export interface VaultManifest {
  version: 1
  exportedAt: string
  pages: Array<{
    id: string
    title: string
    icon: string
    parentId: string | null
    type: Page['type']
    path: string
    favorite: boolean
  }>
  snippets?: Snippet[]
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportMarkdownVault(
  pages: Page[],
  snippets: Snippet[] = [],
): Promise<void> {
  const zip = new JSZip()
  const active = pages.filter((p) => !p.deleted)
  const used = new Set<string>()
  const byId = new Map(active.map((p) => [p.id, p]))

  const pathOf = new Map<string, string>()
  const order = [...active].sort((a, b) => a.createdAt - b.createdAt)

  // assign paths with parent folders
  const resolvePath = (p: Page): string => {
    if (pathOf.has(p.id)) return pathOf.get(p.id)!
    const slug = uniqueSlug(p.title || 'untitled', used, p.id)
    let path = `docs/${slug}.md`
    if (p.parentId && byId.has(p.parentId)) {
      const parent = byId.get(p.parentId)!
      const parentPath = resolvePath(parent).replace(/\.md$/, '')
      path = `${parentPath}/${slug}.md`
    }
    pathOf.set(p.id, path)
    return path
  }

  const manifest: VaultManifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    pages: [],
    snippets,
  }

  for (const p of order) {
    const path = resolvePath(p)
    const md = pageToMarkdown(p)
    zip.file(path, md)
    manifest.pages.push({
      id: p.id,
      title: p.title,
      icon: p.icon,
      parentId: p.parentId,
      type: p.type,
      path,
      favorite: p.favorite,
    })
  }

  zip.file('docs/README.md', buildVaultReadme(manifest))
  zip.file(
    '.gitignore',
    ['node_modules/', 'dist/', '.DS_Store', '*.log', '.env', '.env.*'].join('\n') + '\n',
  )
  zip.file(
    'noto-manifest.json',
    JSON.stringify(manifest, null, 2),
  )

  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `noto-docs-${new Date().toISOString().slice(0, 10)}.zip`)
}

function buildVaultReadme(manifest: VaultManifest): string {
  const lines = [
    '# Noto Docs Vault',
    '',
    `Exported: ${manifest.exportedAt}`,
    '',
    'This folder is Git-friendly. Commit `docs/` and `noto-manifest.json`.',
    '',
    '## Pages',
    '',
  ]
  for (const p of manifest.pages) {
    lines.push(`- ${p.icon} [${p.title || 'Untitled'}](${p.path.replace(/^docs\//, '')})`)
  }
  lines.push('')
  return lines.join('\n')
}

export async function importMarkdownVaultZip(
  file: File,
): Promise<{ pages: Page[]; snippets?: Snippet[] } | null> {
  try {
    const zip = await JSZip.loadAsync(file)
    let manifest: VaultManifest | null = null
    const manifestFile = zip.file('noto-manifest.json')
    if (manifestFile) {
      manifest = JSON.parse(await manifestFile.async('string')) as VaultManifest
    }

    const mdFiles: Array<{ path: string; content: string }> = []
    const jobs: Promise<void>[] = []
    zip.forEach((relativePath, entry) => {
      if (entry.dir) return
      if (!relativePath.endsWith('.md')) return
      if (relativePath.endsWith('docs/README.md') || relativePath === 'README.md') return
      jobs.push(
        entry.async('string').then((content) => {
          mdFiles.push({ path: relativePath, content })
        }),
      )
    })
    await Promise.all(jobs)

    if (manifest?.pages?.length) {
      const pages: Page[] = []
      const now = Date.now()
      for (const meta of manifest.pages) {
        const file = zip.file(meta.path)
        const content = file ? await file.async('string') : ''
        pages.push({
          id: meta.id || uid(),
          title: meta.title || parseMarkdownTitle(content) || 'Imported',
          icon: meta.icon || '📄',
          parentId: meta.parentId,
          order: pages.length * 1000,
          type: meta.type === 'database' ? 'database' : 'page',
          blocks: markdownToBlocks(content),
          favorite: !!meta.favorite,
          deleted: false,
          createdAt: now,
          updatedAt: now,
        })
      }
      return { pages, snippets: manifest.snippets }
    }

    // no manifest: create flat pages from all md
    const pages: Page[] = mdFiles.map((f, i) => {
      const title =
        parseMarkdownTitle(f.content) ||
        f.path.split('/').pop()?.replace(/\.md$/i, '') ||
        `Page ${i + 1}`
      return {
        id: uid(),
        title,
        icon: '📄',
        parentId: null,
        order: i * 1000,
        type: 'page' as const,
        blocks: markdownToBlocks(f.content),
        favorite: false,
        deleted: false,
        createdAt: Date.now() + i,
        updatedAt: Date.now() + i,
      }
    })
    return { pages }
  } catch {
    return null
  }
}

export async function exportStaticSite(pages: Page[]): Promise<void> {
  const zip = new JSZip()
  const active = pages.filter((p) => !p.deleted)
  const used = new Set<string>()
  const slugById = new Map<string, string>()

  for (const p of active) {
    slugById.set(p.id, uniqueSlug(p.title || 'page', used, p.id))
  }

  const css = STATIC_CSS
  zip.file('styles.css', css)

  const nav = active
    .map((p) => {
      const slug = slugById.get(p.id)!
      return `<li><a href="pages/${slug}.html">${escapeHtml(p.icon)} ${escapeHtml(p.title || 'Untitled')}</a></li>`
    })
    .join('\n')

  const indexHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Noto Docs</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="layout">
    <aside>
      <div class="brand">Noto Docs</div>
      <ul class="nav">${nav}</ul>
      <p class="muted">Exported ${new Date().toISOString().slice(0, 10)} · offline static</p>
    </aside>
    <main>
      <h1>Documentation</h1>
      <p class="muted">왼쪽에서 페이지를 선택하세요. 서버 없이 로컬에서 열 수 있습니다.</p>
      <ul class="cards">
        ${active
          .map((p) => {
            const slug = slugById.get(p.id)!
            return `<li><a class="card" href="pages/${slug}.html"><span class="icon">${escapeHtml(p.icon)}</span><span>${escapeHtml(p.title || 'Untitled')}</span></a></li>`
          })
          .join('\n')}
      </ul>
    </main>
  </div>
</body>
</html>`

  zip.file('index.html', indexHtml)

  const titleToSlug = new Map<string, string>()
  for (const p of active) {
    titleToSlug.set(p.title.trim().toLowerCase(), slugById.get(p.id)!)
  }

  const mermaidBoot = `
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: true, theme: 'neutral', securityLevel: 'loose' });
</script>`

  for (const p of active) {
    const slug = slugById.get(p.id)!
    const body = pageToStaticHtml(p, titleToSlug, 'relative')
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(p.title || 'Page')} · Noto Docs</title>
  <link rel="stylesheet" href="../styles.css" />
</head>
<body>
  <div class="layout">
    <aside>
      <div class="brand"><a href="../index.html">Noto Docs</a></div>
      <ul class="nav">${nav.replaceAll('href="pages/', 'href="')}</ul>
    </aside>
    <main class="prose">
      <div class="page-icon">${escapeHtml(p.icon)}</div>
      <h1>${escapeHtml(p.title || 'Untitled')}</h1>
      ${body}
    </main>
  </div>
  ${mermaidBoot}
</body>
</html>`
    zip.file(`pages/${slug}.html`, html)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `noto-static-site-${new Date().toISOString().slice(0, 10)}.zip`)
}

function pageToStaticHtml(
  page: Page,
  titleToSlug: Map<string, string>,
  linkMode: 'relative' | 'from-root',
): string {
  if (page.type === 'database' && page.database) {
    const cols = ['이름', ...page.database.properties.map((p) => p.name)]
    const head = cols.map((c) => `<th>${escapeHtml(c)}</th>`).join('')
    const rows = page.database.rows
      .map((r) => {
        const cells = [
          String(r.values.title ?? ''),
          ...page.database!.properties.map((p) => String(r.values[p.id] ?? '')),
        ]
        return `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`
      })
      .join('')
    return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`
  }

  const inline = (text: string) => inlineWithLinks(text, titleToSlug, linkMode)

  return page.blocks
    .map((b) => {
      switch (b.type) {
        case 'heading1':
          return `<h1>${inline(b.content)}</h1>`
        case 'heading2':
          return `<h2>${inline(b.content)}</h2>`
        case 'heading3':
          return `<h3>${inline(b.content)}</h3>`
        case 'bullet':
          return `<ul><li>${inline(b.content)}</li></ul>`
        case 'numbered':
          return `<ol><li>${inline(b.content)}</li></ol>`
        case 'todo':
          return `<div class="todo"><input type="checkbox" disabled ${b.checked ? 'checked' : ''}/> ${inline(b.content)}</div>`
        case 'quote':
          return `<blockquote>${inline(b.content)}</blockquote>`
        case 'callout':
          return `<div class="callout">${inline(b.content)}</div>`
        case 'code':
          return `<pre><code>${escapeHtml(b.content)}</code></pre>`
        case 'mermaid':
          return `<pre class="mermaid">${escapeHtml(b.content)}</pre>`
        case 'api':
          if (!b.api) return ''
          return `<div class="api"><div class="api-head"><span class="method">${escapeHtml(b.api.method)}</span> <code>${escapeHtml(b.api.path)}</code></div><p>${escapeHtml(b.api.summary)}</p><pre><code>${escapeHtml(b.api.responseBody)}</code></pre></div>`
        case 'git':
          if (!b.git) return ''
          return `<div class="git-card"><strong>📦 ${escapeHtml(b.git.repo)}</strong> · ${escapeHtml(b.git.branch)}${b.git.pr ? ` · PR #${escapeHtml(b.git.pr)}` : ''}${b.git.issue ? ` · Issue #${escapeHtml(b.git.issue)}` : ''}<p class="muted">${escapeHtml(b.git.note)}</p></div>`
        case 'divider':
          return '<hr />'
        case 'image':
          return b.content ? `<img src="${escapeHtml(b.content)}" alt="" />` : ''
        default:
          return `<p>${inline(b.content)}</p>`
      }
    })
    .join('\n')
}

function inlineWithLinks(
  text: string,
  titleToSlug: Map<string, string>,
  linkMode: 'relative' | 'from-root',
): string {
  let html = escapeHtml(text)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\[\[([^\]]+)\]\]/g, (_m, title: string) => {
    const slug = titleToSlug.get(String(title).trim().toLowerCase())
    if (slug) {
      const href = linkMode === 'relative' ? `${slug}.html` : `pages/${slug}.html`
      return `<a class="wiki" href="${href}">${escapeHtml(title)}</a>`
    }
    return `<span class="wiki missing">${escapeHtml(title)}</span>`
  })
  return html
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const STATIC_CSS = `
:root {
  --bg: #f7f6f3;
  --panel: #fff;
  --text: #1a1a18;
  --muted: #787774;
  --border: #e8e6e1;
  --accent: #2383e2;
  --sidebar: #f0efe9;
  font-family: Inter, system-ui, sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); }
.layout { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh; }
aside { background: var(--sidebar); border-right: 1px solid var(--border); padding: 1.25rem; }
.brand { font-weight: 700; margin-bottom: 1rem; }
.brand a { color: inherit; text-decoration: none; }
.nav { list-style: none; padding: 0; margin: 0; }
.nav a { display: block; padding: 0.4rem 0.5rem; border-radius: 8px; color: inherit; text-decoration: none; font-size: 0.9rem; }
.nav a:hover { background: #e6e4dc; }
main { padding: 2rem 2.5rem; max-width: 800px; }
.muted { color: var(--muted); font-size: 0.85rem; }
.cards { list-style: none; padding: 0; display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
.card { display: flex; gap: 0.6rem; align-items: center; padding: 0.9rem; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; text-decoration: none; color: inherit; }
.card:hover { border-color: var(--accent); }
.page-icon { font-size: 2.5rem; }
.prose h1, .prose h2, .prose h3 { line-height: 1.25; }
.prose p, .prose li { line-height: 1.65; }
.prose pre { background: #efeee9; padding: 0.9rem 1rem; border-radius: 10px; overflow: auto; }
.prose code { font-family: ui-monospace, monospace; font-size: 0.88em; }
.prose blockquote { border-left: 3px solid var(--border); margin: 0; padding-left: 0.9rem; color: var(--muted); }
.callout { background: #e8f2fc; border-radius: 10px; padding: 0.75rem 1rem; }
.todo { margin: 0.35rem 0; }
.api, .git-card { border: 1px solid var(--border); border-radius: 12px; padding: 0.85rem; background: var(--panel); margin: 0.75rem 0; }
.method { background: #22c55e; color: #fff; font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 4px; }
.wiki { color: var(--accent); background: #e8f2fc; border-radius: 4px; padding: 0 0.2rem; text-decoration: none; }
.wiki.missing { opacity: 0.65; border-bottom: 1px dashed var(--muted); }
.mermaid { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 1rem; }
table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
th, td { border: 1px solid var(--border); padding: 0.4rem 0.55rem; text-align: left; }
th { background: #efeee9; }
img { max-width: 100%; border-radius: 10px; }
@media (max-width: 800px) {
  .layout { grid-template-columns: 1fr; }
  aside { border-right: none; border-bottom: 1px solid var(--border); }
}
`
