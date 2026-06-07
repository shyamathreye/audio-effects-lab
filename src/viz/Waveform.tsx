import { useCallback, useEffect, useRef } from 'react'
import { useRafLoop } from './useRafLoop'
import { readTimeDomain, zeroCrossingOffset, cssVar } from './analysis'

interface WaveformProps {
  /** Function returning the analyser to read (re-evaluated each frame so it
      survives chain rebuilds). */
  getAnalyser: () => AnalyserNode | null
  /** CSS variable name for the trace color, e.g. '--stage-filter'. */
  colorVar: string
  active?: boolean
  /** Draw faint center line + grid. */
  grid?: boolean
  className?: string
}

// Live oscilloscope. Reads time-domain data each frame, aligns on a rising
// zero-crossing so a steady tone holds still (PRD R2), and strokes the trace in
// the stage's hue.
export function Waveform({
  getAnalyser,
  colorVar,
  active = true,
  grid = true,
  className,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(2048))

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))
  }, [])

  useEffect(() => {
    resize()
    const ro = new ResizeObserver(resize)
    if (canvasRef.current) ro.observe(canvasRef.current)
    return () => ro.disconnect()
  }, [resize])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    // background well
    ctx.fillStyle = cssVar('--lcd-bg')
    ctx.fillRect(0, 0, w, h)

    if (grid) {
      ctx.strokeStyle = cssVar('--lcd-grid')
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, h / 2)
      ctx.lineTo(w, h / 2)
      ctx.stroke()
    }

    const analyser = getAnalyser()
    if (!analyser) return

    let buf = bufRef.current
    if (buf.length !== analyser.fftSize) {
      buf = new Float32Array(analyser.fftSize)
      bufRef.current = buf
    }
    readTimeDomain(analyser, buf)

    // Show ~2 cycles worth of samples, aligned on a zero crossing.
    const span = Math.floor(buf.length * 0.5)
    const start = zeroCrossingOffset(buf, buf.length - span)

    ctx.lineWidth = Math.max(1.5, w / 600)
    ctx.strokeStyle = cssVar(colorVar)
    ctx.lineJoin = 'round'
    ctx.beginPath()
    for (let i = 0; i < span; i++) {
      const v = buf[start + i]
      const x = (i / span) * w
      const y = (0.5 - v * 0.45) * h
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }, [getAnalyser, colorVar, grid])

  useRafLoop(draw, active)

  return <canvas ref={canvasRef} className={className} />
}
