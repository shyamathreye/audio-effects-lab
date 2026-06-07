import { useCallback, useEffect, useRef } from 'react'
import { useRafLoop } from './useRafLoop'
import { readTimeDomain, cssVar, strokeWave, waveStart } from './analysis'

interface WaveformProps {
  /** Returns the time-domain analyser to read (re-evaluated each frame). */
  getAnalyser: () => AnalyserNode | null
  /** CSS variable name for the trace color, e.g. '--stage-filter'. */
  colorVar: string
  /** Time window to display, in seconds. */
  spanSec?: number
  active?: boolean
  grid?: boolean
  className?: string
}

// Live oscilloscope. Shows `spanSec` of the signal, aligned on a rising
// zero-crossing so a steady tone holds still; the trace is clamped to the
// viewport and decimated (min/max) so it stays in-bounds and legible at any zoom.
export function Waveform({ getAnalyser, colorVar, spanSec = 0.03, active = true, grid = true, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(2048))
  const drawRef = useRef<() => void>(() => {})
  const spanRef = useRef(spanSec)
  spanRef.current = spanSec

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
    drawRef.current()
    const ro = new ResizeObserver(() => {
      resize()
      drawRef.current()
    })
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

    const count = Math.max(64, Math.min(buf.length, Math.round(spanRef.current * analyser.context.sampleRate)))
    const start = waveStart(buf, count)
    ctx.lineWidth = Math.max(1.5, w / 600)
    ctx.strokeStyle = cssVar(colorVar)
    ctx.lineJoin = 'round'
    strokeWave(ctx, buf, start, count, w, h)
  }, [getAnalyser, colorVar, grid])

  drawRef.current = draw
  useRafLoop(draw, active)

  return <canvas ref={canvasRef} className={className} />
}
