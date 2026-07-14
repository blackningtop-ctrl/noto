import type { Block, BlockType, Page } from '../types'
import { uid } from './id'

function escapeMd(s: string) {
  return s
}

export function blocksToMarkdown(blocks: Block[]): string {
  const lines: string[] = []
  for (const b of blocks) {
    switch (b.type) {
      case 'heading1':
        lines.push(`# ${b.content}`)
        break
      case 'heading2':
        lines.push(`## ${b.content}`)
        break
      case 'heading3':
        lines.push(`### ${b.content}`)
        break
      case 'bullet':
        lines.push(`- ${b.content}`)
        break
      case 'numbered':
        lines.push(`1. ${b.content}`)
        break
      case 'todo':
        lines.push(`- [${b.checked ? 'x' : ' '}] ${b.content}`)
        break
      case 'quote':
        lines.push(
          b.content
            .split('\n')
            .map((l) => `> ${l}`)
            .join('\n'),
        )
        break
      case 'code':
        lines.push(`\`\`\`${b.language || ''}\n${b.content}\n\`\`\``)
        break
      case 'mermaid':
        lines.push(`\`\`\`mermaid\n${b.content}\n\`\`\``)
        break
      case 'divider':
        lines.push('---')
        break
      case 'callout':
        lines.push(`> 💡 ${b.content}`)
        break
      case 'image':
        lines.push(b.content ? `![image](${b.content})` : '')
        break
      case 'toggle':
        lines.push(`<details>\n<summary>${b.content}</summary>\n\n`)
        if (b.children?.length) {
          lines.push(blocksToMarkdown(b.children))
        }
        lines.push('\n</details>')
        break
      default:
        lines.push(escapeMd(b.content))
    }
    lines.push('')
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

export function pageToMarkdown(page: Page): string {
  const header = [
    '---',
    `title: ${JSON.stringify(page.title)}`,
    `icon: ${JSON.stringify(page.icon)}`,
    `type: ${page.type}`,
    '---',
    '',
    `# ${page.icon} ${page.title}`,
    '',
  ].join('\n')

  if (page.type === 'database' && page.database) {
    const cols = ['이름', ...page.database.properties.map((p) => p.name)]
    const rows = page.database.rows.map((r) => {
      const cells = [
        String(r.values.title ?? ''),
        ...page.database!.properties.map((p) => String(r.values[p.id] ?? '')),
      ]
      return `| ${cells.join(' | ')} |`
    })
    const sep = `| ${cols.map(() => '---').join(' | ')} |`
    return (
      header +
      `## Database\n\n| ${cols.join(' | ')} |\n${sep}\n${rows.join('\n')}\n`
    )
  }

  return header + blocksToMarkdown(page.blocks)
}

function makeBlock(type: BlockType, content: string, extra: Partial<Block> = {}): Block {
  return { id: uid(), type, content, ...extra }
}

export function markdownToBlocks(md: string): Block[] {
  // strip simple frontmatter
  let body = md
  if (body.startsWith('---')) {
    const end = body.indexOf('\n---', 3)
    if (end !== -1) body = body.slice(end + 4).trimStart()
  }

  const lines = body.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

    if (line.trim() === '---') {
      blocks.push(makeBlock('divider', ''))
      i++
      continue
    }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // closing ```
      const content = codeLines.join('\n')
      if (lang === 'mermaid') {
        blocks.push(makeBlock('mermaid', content || 'graph TD\n  A-->B'))
      } else {
        blocks.push(makeBlock('code', content, { language: lang || 'plaintext' }))
      }
      continue
    }

    if (line.startsWith('# ')) {
      blocks.push(makeBlock('heading1', line.slice(2)))
      i++
      continue
    }
    if (line.startsWith('## ')) {
      blocks.push(makeBlock('heading2', line.slice(3)))
      i++
      continue
    }
    if (line.startsWith('### ')) {
      blocks.push(makeBlock('heading3', line.slice(4)))
      i++
      continue
    }

    const todo = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/)
    if (todo) {
      blocks.push(makeBlock('todo', todo[2], { checked: todo[1].toLowerCase() === 'x' }))
      i++
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      blocks.push(makeBlock('bullet', line.replace(/^[-*]\s+/, '')))
      i++
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      blocks.push(makeBlock('numbered', line.replace(/^\d+\.\s+/, '')))
      i++
      continue
    }

    if (line.startsWith('> ')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2))
        i++
      }
      const text = quoteLines.join('\n')
      if (text.startsWith('💡 ')) {
        blocks.push(makeBlock('callout', text.slice(2).trim()))
      } else {
        blocks.push(makeBlock('quote', text))
      }
      continue
    }

    const img = line.match(/^!\[.*?\]\((.*?)\)$/)
    if (img) {
      blocks.push(makeBlock('image', img[1]))
      i++
      continue
    }

    // paragraph: gather consecutive non-special lines
    const para: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('>') &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      lines[i].trim() !== '---'
    ) {
      para.push(lines[i])
      i++
    }
    blocks.push(makeBlock('paragraph', para.join('\n')))
  }

  return blocks.length ? blocks : [makeBlock('paragraph', '')]
}

export function parseMarkdownTitle(md: string): string | null {
  const fm = md.match(/^---\n([\s\S]*?)\n---/)
  if (fm) {
    const t = fm[1].match(/title:\s*"(.*)"/) || fm[1].match(/title:\s*(.+)/)
    if (t) return t[1].replace(/^"|"$/g, '').trim()
  }
  const h1 = md.match(/^#\s+(.+)$/m)
  if (h1) {
    return h1[1].replace(/^[^\s]+\s+/, '').trim() // strip leading emoji if present-ish
  }
  return null
}
