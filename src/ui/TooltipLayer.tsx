import { useEffect, useRef, useState } from 'react'

interface Tip {
  text: string
  cx: number // anchor center x (viewport)
  top: number // anchor top y (viewport)
  bottom: number // anchor bottom y
}

// A single global tooltip. Any element with a `data-tip="..."` attribute shows
// it instantly on hover — used by every knob, toggle and menu so a learner can
// read what a control does without the slow native title delay.
export function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const el = target?.closest?.('[data-tip]') as HTMLElement | null
      if (el && el.dataset.tip) {
        const r = el.getBoundingClientRect()
        setTip({ text: el.dataset.tip, cx: r.left + r.width / 2, top: r.top, bottom: r.bottom })
      } else {
        setTip(null)
      }
    }
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseleave', () => setTip(null))
    return () => document.removeEventListener('mouseover', onOver)
  }, [])

  if (!tip) return null

  const W = 260
  const left = Math.max(8, Math.min(window.innerWidth - W - 8, tip.cx - W / 2))
  // prefer above the control; flip below if too close to the top
  const above = tip.top > 90
  const style: React.CSSProperties = {
    position: 'fixed',
    left,
    width: W,
    zIndex: 60,
    pointerEvents: 'none',
    ...(above ? { bottom: window.innerHeight - tip.top + 8 } : { top: tip.bottom + 8 }),
  }

  return (
    <div
      ref={boxRef}
      role="tooltip"
      style={style}
      className="tip-in rounded-control bg-outline px-3 py-2 text-xs leading-snug text-cream shadow-lift ring-1 ring-grid"
    >
      {tip.text}
    </div>
  )
}
