import type { Page, Snippet } from '../types'
import { pageToMarkdown, markdownToBlocks, parseMarkdownTitle } from './markdown'
import { uniqueSlug } from './slug'
import { uid } from './id'
import type { VaultManifest } from './export-vault'

type DirHandle = FileSystemDirectoryHandle

function supportsFsAccess(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export function canUseFolderSync(): boolean {
  return supportsFsAccess()
}

export async function pickDirectory(): Promise<DirHandle | null> {
  if (!supportsFsAccess()) {
    alert('이 브라우저는 폴더 동기화를 지원하지 않습니다. Chrome / Edge 를 사용하세요.')
    return null
  }
  try {
    // @ts-expect-error File System Access API
    const handle = (await window.showDirectoryPicker({
      mode: 'readwrite',
    })) as DirHandle
    return handle
  } catch {
    return null
  }
}

async function ensureDir(parent: DirHandle, name: string): Promise<DirHandle> {
  return parent.getDirectoryHandle(name, { create: true })
}

async function writeFile(dir: DirHandle, name: string, content: string) {
  const file = await dir.getFileHandle(name, { create: true })
  const writable = await file.createWritable()
  await writable.write(content)
  await writable.close()
}

async function writePath(root: DirHandle, relativePath: string, content: string) {
  const parts = relativePath.split('/').filter(Boolean)
  const fileName = parts.pop()!
  let dir = root
  for (const part of parts) {
    dir = await ensureDir(dir, part)
  }
  await writeFile(dir, fileName, content)
}

/** Export workspace into a user-selected folder (docs/ + manifest). */
export async function syncExportToFolder(
  pages: Page[],
  snippets: Snippet[],
): Promise<{ ok: boolean; count: number; message: string }> {
  const handle = await pickDirectory()
  if (!handle) return { ok: false, count: 0, message: '폴더가 선택되지 않았습니다.' }

  try {
    const active = pages.filter((p) => !p.deleted)
    const used = new Set<string>()
    const byId = new Map(active.map((p) => [p.id, p]))
    const pathOf = new Map<string, string>()

    const resolvePath = (p: Page): string => {
      if (pathOf.has(p.id)) return pathOf.get(p.id)!
      const slug = uniqueSlug(p.title || 'untitled', used, p.id)
      let path = `docs/${slug}.md`
      if (p.parentId && byId.has(p.parentId)) {
        const parentPath = resolvePath(byId.get(p.parentId)!).replace(/\.md$/, '')
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

    for (const p of active) {
      const path = resolvePath(p)
      await writePath(handle, path, pageToMarkdown(p))
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

    await writePath(handle, 'noto-manifest.json', JSON.stringify(manifest, null, 2))
    await writePath(
      handle,
      '.gitignore',
      ['node_modules/', 'dist/', '.DS_Store', '*.log', '.env', '.env.*'].join('\n') + '\n',
    )
    await writePath(
      handle,
      'docs/README.md',
      [
        '# Noto Docs',
        '',
        `Synced: ${manifest.exportedAt}`,
        '',
        ...manifest.pages.map(
          (p) => `- ${p.icon} ${p.title} (\`${p.path}\`)`,
        ),
        '',
      ].join('\n'),
    )

    return {
      ok: true,
      count: active.length,
      message: `${active.length}개 페이지를 폴더에 내보냈습니다. (docs/ + noto-manifest.json)`,
    }
  } catch (e) {
    return {
      ok: false,
      count: 0,
      message: e instanceof Error ? e.message : '폴더 내보내기 실패',
    }
  }
}

async function readFileText(dir: DirHandle, name: string): Promise<string | null> {
  try {
    const fileHandle = await dir.getFileHandle(name)
    const file = await fileHandle.getFile()
    return await file.text()
  } catch {
    return null
  }
}

async function collectMarkdown(
  dir: DirHandle,
  prefix = '',
): Promise<Array<{ path: string; content: string }>> {
  const out: Array<{ path: string; content: string }> = []
  const entries = (dir as DirHandle & {
    entries: () => AsyncIterableIterator<[string, FileSystemHandle]>
  }).entries()
  for await (const [name, handle] of entries) {
    const path = prefix ? `${prefix}/${name}` : name
    if (handle.kind === 'directory') {
      out.push(...(await collectMarkdown(handle as DirHandle, path)))
    } else if (name.endsWith('.md') && name !== 'README.md') {
      const file = await (handle as FileSystemFileHandle).getFile()
      out.push({ path, content: await file.text() })
    }
  }
  return out
}

/** Import docs from a user-selected folder. */
export async function syncImportFromFolder(): Promise<{
  ok: boolean
  pages?: Page[]
  snippets?: Snippet[]
  message: string
}> {
  const handle = await pickDirectory()
  if (!handle) return { ok: false, message: '폴더가 선택되지 않았습니다.' }

  try {
    const manifestText = await readFileText(handle, 'noto-manifest.json')
    if (manifestText) {
      const manifest = JSON.parse(manifestText) as VaultManifest
      const pages: Page[] = []
      const now = Date.now()

      for (const meta of manifest.pages) {
        // resolve nested path from root
        const parts = meta.path.split('/').filter(Boolean)
        const fileName = parts.pop()!
        let dir: DirHandle = handle
        let missing = false
        for (const part of parts) {
          try {
            dir = await dir.getDirectoryHandle(part)
          } catch {
            missing = true
            break
          }
        }
        let content = ''
        if (!missing) {
          content = (await readFileText(dir, fileName)) || ''
        }
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

      return {
        ok: true,
        pages,
        snippets: manifest.snippets,
        message: `${pages.length}개 페이지를 폴더에서 가져왔습니다.`,
      }
    }

    // no manifest — scan all md
    const files = await collectMarkdown(handle)
    const pages: Page[] = files.map((f, i) => ({
      id: uid(),
      title:
        parseMarkdownTitle(f.content) ||
        f.path.split('/').pop()?.replace(/\.md$/i, '') ||
        `Page ${i + 1}`,
      icon: '📄',
      parentId: null,
      order: i * 1000,
      type: 'page' as const,
      blocks: markdownToBlocks(f.content),
      favorite: false,
      deleted: false,
      createdAt: Date.now() + i,
      updatedAt: Date.now() + i,
    }))

    return {
      ok: true,
      pages,
      message: `manifest 없이 ${pages.length}개 Markdown 파일을 가져왔습니다.`,
    }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : '폴더 가져오기 실패',
    }
  }
}
