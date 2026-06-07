import { useLayoutEffect, useRef, useState } from 'react'

interface CablesProps {
  /** The relative, content-sized rail that contains the [data-node] cards. */
  railRef: React.RefObject<HTMLDivElement | null>
  /** Changes whenever node order/bypass/count changes, to trigger remeasure. */
  signature: string
}

interface Segment {
  x1: number
  y1: number
  x2: number
  y2: number
  dim: boolean
}

// Mint patch cables (§2A): bezier curves from each node's output jack to the
// next node's input jack. Measured from the DOM so they follow reorders and
// resizes; a cable adjacent to a bypassed module is dimmed.
export function Cables({ railRef, signature }: CablesProps) {
  const [segs, setSegs] = useState<Segment[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const roRef = useRef<ResizeObserver | null>(null)

  useLayoutEffect(() => {
    const rail = railRef.current
    if (!rail) return

    const measure = () => {
      const nodes = Array.from(rail.querySelectorAll<HTMLElement>('[data-node]'))
      const next: Segment[] = []
      for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i]
        const b = nodes[i + 1]
        const x1 = a.offsetLeft + a.offsetWidth
        const y1 = a.offsetTop + a.offsetHeight / 2
        const x2 = b.offsetLeft
        const y2 = b.offsetTop + b.offsetHeight / 2
        const dim = a.dataset.bypassed === 'true' || b.dataset.bypassed === 'true'
        next.push({ x1, y1, x2, y2, dim })
      }
      setSegs(next)
      setSize({ w: rail.scrollWidth, h: rail.scrollHeight })
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(rail)
    for (const n of rail.querySelectorAll<HTMLElement>('[data-node]')) ro.observe(n)
    roRef.current = ro
    return () => ro.disconnect()
  }, [railRef, signature])

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={size.w}
      height={size.h}
      aria-hidden="true"
    >
      {segs.map((s, i) => {
        const dx = Math.max(20, (s.x2 - s.x1) * 0.5)
        const d = `M ${s.x1} ${s.y1} C ${s.x1 + dx} ${s.y1}, ${s.x2 - dx} ${s.y2}, ${s.x2} ${s.y2}`
        return (
          <g key={i} opacity={s.dim ? 0.25 : 1}>
            <path d={d} fill="none" stroke="var(--outline)" strokeWidth={6} strokeLinecap="round" />
            <path d={d} fill="none" stroke={s.dim ? 'var(--grid)' : 'var(--mint)'} strokeWidth={3} strokeLinecap="round" />
            <circle cx={s.x1} cy={s.y1} r={4} fill="var(--mint)" stroke="var(--outline)" strokeWidth={1.5} />
            <circle cx={s.x2} cy={s.y2} r={4} fill="var(--mint)" stroke="var(--outline)" strokeWidth={1.5} />
          </g>
        )
      })}
    </svg>
  )
}
