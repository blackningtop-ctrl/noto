export function slugify(title: string, fallback = 'page'): string {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return s || fallback
}

export function uniqueSlug(title: string, used: Set<string>, id: string): string {
  let base = slugify(title) || `page-${id.slice(0, 8)}`
  let slug = base
  let i = 2
  while (used.has(slug)) {
    slug = `${base}-${i}`
    i++
  }
  used.add(slug)
  return slug
}
