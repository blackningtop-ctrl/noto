import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import java from 'highlight.js/lib/languages/java'
import plaintext from 'highlight.js/lib/languages/plaintext'

const langs: Record<string, typeof javascript> = {
  javascript,
  js: javascript,
  typescript,
  ts: typescript,
  json,
  bash,
  shell: bash,
  sh: bash,
  python,
  py: python,
  sql,
  xml,
  html: xml,
  css,
  yaml,
  yml: yaml,
  markdown,
  md: markdown,
  go,
  rust,
  java,
  text: plaintext,
  plaintext,
}

for (const [name, def] of Object.entries(langs)) {
  try {
    hljs.registerLanguage(name, def)
  } catch {
    // already registered alias
  }
}

export const CODE_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'bash',
  'json',
  'sql',
  'yaml',
  'html',
  'css',
  'go',
  'rust',
  'java',
  'markdown',
  'plaintext',
] as const

export function highlightCode(code: string, language?: string): string {
  const lang = (language || 'plaintext').toLowerCase()
  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  } catch {
    return escapeHtml(code)
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
