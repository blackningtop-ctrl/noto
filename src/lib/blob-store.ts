import { get, set, del, keys } from 'idb-keyval'

const PREFIX = 'noto-blob:'

export async function saveBlob(id: string, blob: Blob): Promise<void> {
  await set(PREFIX + id, blob)
}

export async function loadBlob(id: string): Promise<Blob | undefined> {
  return get<Blob>(PREFIX + id)
}

export async function deleteBlob(id: string): Promise<void> {
  await del(PREFIX + id)
}

export async function createObjectUrlFromBlobId(blobId: string): Promise<string | null> {
  const blob = await loadBlob(blobId)
  if (!blob) return null
  return URL.createObjectURL(blob)
}

export function isBlobRef(content: string): boolean {
  return content.startsWith('blob:')
}

export function parseBlobId(content: string): string | null {
  if (!content.startsWith('blob:')) return null
  return content.slice(5)
}

export async function listBlobKeys(): Promise<string[]> {
  const all = await keys()
  return all
    .map(String)
    .filter((k) => k.startsWith(PREFIX))
    .map((k) => k.slice(PREFIX.length))
}

export async function fileToBlobRef(file: File): Promise<string> {
  const id = crypto.randomUUID()
  await saveBlob(id, file)
  return `blob:${id}`
}
