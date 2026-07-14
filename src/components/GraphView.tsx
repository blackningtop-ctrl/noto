import { useMemo, useState, useRef, useEffect } from 'react'
import { useStore, useActivePages } from '../store'
import { buildGraph, simulateGraph } from '../lib/graph'
import { Network, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

export function GraphView() {
  const pages = useActivePages()
  const setView = useStore((s) => s.setView)
  const view = useStore((s) => s.view)
  const activeId = view.kind === 'page' ? view.pageId : null

  const graph = useMemo(() => simulateGraph(buildGraph(pages), 100), [pages])
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const bounds = useMemo(() => {
    if (graph.nodes.length === 0) return { minX: -200, maxX: 200, minY: -200, maxY: 200 }
    const xs = graph.nodes.map((n) => n.x)
    const ys = graph.nodes.map((n) => n.y)
    const pad = 80
    return {
      minX: Math.min(...xs) - pad,
      maxX: Math.max(...xs) + pad,
      minY: Math.min(...ys) - pad,
      maxY: Math.max(...ys) + pad,
    }
  }, [graph])

  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY

  useEffect(() => {
    setPan({ x: 0, y: 0 })
    setScale(1)
  }, [pages.length])

  const nodeMap = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes])

  return (
    <div className="fade-in flex h-full min-h-[70vh] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center gap-2 font-semibold">
          <Network size={18} className="text-[var(--color-accent)]" />
          노트 연결 보기
        </div>
        <span className="text-sm text-[var(--color-muted)]">
          노트 {graph.nodes.length}개 · 연결 {graph.edges.length}개
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-[var(--color-hover)]"
            onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-[var(--color-hover)]"
            onClick={() => setScale((s) => Math.max(0.4, s - 0.15))}
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-[var(--color-hover)]"
            onClick={() => {
              setScale(1)
              setPan({ x: 0, y: 0 })
            }}
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[var(--color-surface)]">
        {graph.nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
            아직 노트가 없어요. 노트를 만들고 [[다른 노트 이름]] 으로 연결해 보세요.
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="h-full w-full cursor-grab active:cursor-grabbing"
            viewBox={`${bounds.minX} ${bounds.minY} ${width} ${height}`}
            onWheel={(e) => {
              e.preventDefault()
              setScale((s) => Math.min(2.5, Math.max(0.4, s - e.deltaY * 0.001)))
            }}
            onMouseDown={(e) => {
              drag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
            }}
            onMouseMove={(e) => {
              if (!drag.current) return
              const dx = e.clientX - drag.current.x
              const dy = e.clientY - drag.current.y
              setPan({ x: drag.current.panX + dx, y: drag.current.panY + dy })
            }}
            onMouseUp={() => {
              drag.current = null
            }}
            onMouseLeave={() => {
              drag.current = null
            }}
          >
            <g transform={`translate(${pan.x / scale}, ${pan.y / scale}) scale(${scale})`}>
              {graph.edges.map((e, i) => {
                const a = nodeMap.get(e.source)
                const b = nodeMap.get(e.target)
                if (!a || !b) return null
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={e.kind === 'parent' ? 'var(--color-border)' : 'var(--color-accent)'}
                    strokeWidth={e.kind === 'parent' ? 1.5 : 2}
                    strokeOpacity={0.55}
                    strokeDasharray={e.kind === 'parent' ? '4 4' : undefined}
                  />
                )
              })}
              {graph.nodes.map((n) => {
                const active = n.id === activeId
                const r = 22 + Math.min(n.degree, 6) * 2
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x}, ${n.y})`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      setView({ kind: 'page', pageId: n.id })
                    }}
                  >
                    <circle
                      r={r}
                      fill="var(--color-panel)"
                      stroke={active ? 'var(--color-accent)' : 'var(--color-border)'}
                      strokeWidth={active ? 3 : 1.5}
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={r > 26 ? 16 : 14}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {n.icon}
                    </text>
                    <text
                      y={r + 14}
                      textAnchor="middle"
                      fontSize={11}
                      fill="var(--color-text)"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {n.title.length > 18 ? `${n.title.slice(0, 16)}…` : n.title}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>
        )}

        <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)]/90 px-3 py-2 text-[11px] text-[var(--color-muted)] backdrop-blur">
          <div className="mb-1 flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 bg-[var(--color-accent)]" /> [[링크]] 연결
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 border-t border-dashed border-[var(--color-muted)]" />{' '}
            폴더 구조
          </div>
          <div className="mt-1">끌어서 이동 · 휠로 확대 · 눌러서 열기</div>
        </div>
      </div>
    </div>
  )
}
