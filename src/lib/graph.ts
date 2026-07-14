import type { Page } from '../types'
import { extractWikiLinks, findPageByWikiTitle } from './wiki'

export interface GraphNode {
  id: string
  title: string
  icon: string
  type: Page['type']
  x: number
  y: number
  vx: number
  vy: number
  degree: number
}

export interface GraphEdge {
  source: string
  target: string
  kind: 'wiki' | 'parent'
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export function buildGraph(pages: Page[]): GraphData {
  const active = pages.filter((p) => !p.deleted)
  const byId = new Map(active.map((p) => [p.id, p]))
  const edges: GraphEdge[] = []
  const edgeKey = new Set<string>()

  const addEdge = (source: string, target: string, kind: GraphEdge['kind']) => {
    if (source === target) return
    if (!byId.has(source) || !byId.has(target)) return
    const k = `${kind}:${source}->${target}`
    if (edgeKey.has(k)) return
    edgeKey.add(k)
    edges.push({ source, target, kind })
  }

  for (const p of active) {
    if (p.parentId && byId.has(p.parentId)) {
      addEdge(p.parentId, p.id, 'parent')
    }
    const corpus = p.blocks.map((b) => b.content).join('\n')
    for (const link of extractWikiLinks(corpus)) {
      const target = findPageByWikiTitle(active, link)
      if (target) addEdge(p.id, target.id, 'wiki')
    }
  }

  const degree = new Map<string, number>()
  for (const p of active) degree.set(p.id, 0)
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1)
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1)
  }

  const n = active.length || 1
  const nodes: GraphNode[] = active.map((p, i) => {
    const angle = (i / n) * Math.PI * 2
    const radius = 180 + (degree.get(p.id) ?? 0) * 12
    return {
      id: p.id,
      title: p.title || '제목 없음',
      icon: p.icon,
      type: p.type,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      degree: degree.get(p.id) ?? 0,
    }
  })

  return { nodes, edges }
}

/** Simple force simulation step (no external deps). */
export function simulateGraph(data: GraphData, iterations = 80): GraphData {
  const nodes = data.nodes.map((n) => ({ ...n }))
  const index = new Map(nodes.map((n, i) => [n.id, i]))
  const edges = data.edges

  for (let iter = 0; iter < iterations; iter++) {
    // repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[i].x - nodes[j].x
        let dy = nodes[i].y - nodes[j].y
        let dist = Math.hypot(dx, dy) || 0.01
        const force = 8000 / (dist * dist)
        dx = (dx / dist) * force
        dy = (dy / dist) * force
        nodes[i].vx += dx
        nodes[i].vy += dy
        nodes[j].vx -= dx
        nodes[j].vy -= dy
      }
    }
    // attraction along edges
    for (const e of edges) {
      const si = index.get(e.source)
      const ti = index.get(e.target)
      if (si === undefined || ti === undefined) continue
      const a = nodes[si]
      const b = nodes[ti]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.hypot(dx, dy) || 0.01
      const ideal = e.kind === 'parent' ? 100 : 140
      const force = (dist - ideal) * 0.02
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.vx += fx
      a.vy += fy
      b.vx -= fx
      b.vy -= fy
    }
    // center gravity + integrate
    for (const n of nodes) {
      n.vx += -n.x * 0.005
      n.vy += -n.y * 0.005
      n.vx *= 0.85
      n.vy *= 0.85
      n.x += n.vx
      n.y += n.vy
    }
  }

  return { nodes, edges }
}
