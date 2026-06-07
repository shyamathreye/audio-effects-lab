import { useCallback, useRef } from 'react'
import { logFromUnit, unitFromLog, clamp } from '../audio/util'

interface KnobProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  scale?: 'linear' | 'log'
  /** Knob fill color (CSS value). Defaults to teal. */
  color?: string
  /** Hover help shown in the tooltip alongside the value. */
  help?: string
  onChange: (v: number) => void
}

const ANGLE = 135 // sweep ±135° from vertical

// Chunky rotary knob (§2A). Drag vertically to change; the cream indicator tick
// rotates to reflect the value. Log-scaled params (e.g. cutoff) map linearly in
// drag space so the whole range feels even.
export function Knob({
  label,
  value,
  min,
  max,
  step,
  unit,
  scale = 'linear',
  color = 'var(--teal)',
  help,
  onChange,
}: KnobProps) {
  const dragRef = useRef<{ y: number; unit: number } | null>(null)

  const toUnit = useCallback(
    (v: number) => (scale === 'log' ? unitFromLog(v, min, max) : (v - min) / (max - min)),
    [scale, min, max],
  )
  const fromUnit = useCallback(
    (u: number) => {
      const raw = scale === 'log' ? logFromUnit(u, min, max) : min + u * (max - min)
      if (step) return Math.round(raw / step) * step
      return raw
    },
    [scale, min, max, step],
  )

  const u = clamp(toUnit(value), 0, 1)
  const angle = -ANGLE + u * 2 * ANGLE

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragRef.current = { y: e.clientY, unit: u }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const dy = drag.y - e.clientY
    const sensitivity = e.shiftKey ? 600 : 180 // shift = fine
    const nextUnit = clamp(drag.unit + dy / sensitivity, 0, 1)
    onChange(fromUnit(nextUnit))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null
    try {
      ;(e.target as Element).releasePointerCapture(e.pointerId)
    } catch {
      /* not captured */
    }
  }
  const onDoubleClick = () => {
    // reset toward center of range as a gentle default
    onChange(fromUnit(0.5))
  }

  const display =
    Math.abs(value) >= 100 ? value.toFixed(0) : Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(2)

  return (
    <div
      className="flex flex-col items-center gap-1 select-none"
      title={`${label}: ${display}${unit ?? ''}${help ? `\n${help}` : ''}\n(drag vertically; Shift = fine; double-click = reset)`}
    >
      <svg
        width="44"
        height="44"
        viewBox="0 0 44 44"
        className="cursor-ns-resize touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <circle cx="22" cy="22" r="18" fill={color} stroke="var(--outline)" strokeWidth="2" />
        <g transform={`rotate(${angle} 22 22)`}>
          <line x1="22" y1="22" x2="22" y2="8" stroke="var(--panel-cream)" strokeWidth="3" strokeLinecap="round" />
        </g>
      </svg>
      <span className="text-[10px] uppercase tracking-wide text-cream/70">{label}</span>
      <span className="font-mono text-[10px] text-lcd">
        {display}
        {unit ? <span className="text-cream/40"> {unit}</span> : null}
      </span>
    </div>
  )
}
