import { useCallback, useEffect, useRef } from 'react'

interface FrozenCanvasProps {
  /** Draw callback invoked on mount, resize, and whenever `redrawKey` changes. */
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  /** Bump to force a redraw (e.g. a new freeze snapshot id). */
  redrawKey: unknown
  className?: string
}

// A static canvas for Freeze mode: sizes to its box and calls `draw` once per
// change instead of every animation frame.
export function FrozenCanvas({ draw, redrawKey, className }: FrozenCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const w = Math.max(1, Math.floor(rect.width * dpr))
    const h = Math.max(1, Math.floor(rect.height * dpr))
    if (canvas.width !== w) canvas.width = w
    if (canvas.height !== h) canvas.height = h
    const ctx = canvas.getContext('2d')
    if (ctx) draw(ctx, w, h)
  }, [draw])

  useEffect(() => {
    render()
    const ro = new ResizeObserver(render)
    if (canvasRef.current) ro.observe(canvasRef.current)
    return () => ro.disconnect()
  }, [render, redrawKey])

  return <canvas ref={canvasRef} className={className} />
}
