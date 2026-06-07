import { useCallback, useEffect, useRef } from 'react'
import { useRafLoop } from './useRafLoop'
import { readTimeDomain, cssVar } from './analysis'
import type { StageRef } from './stages'

interface EnvelopeWaveformProps {
  /** One stage (individual) or all stages (combined overlay). */
  stages: StageRef[]
  getAnalyser: (id: string) => AnalyserNode | null
  active?: boolean
  className?: string
}

const HISTORY = 360 // samples of peak history (~6 s at 60 fps)

// Long-timebase amplitude view: each frame we sample every stage's peak level and
// scroll it into a history buffer, drawing a mirrored filled envelope. Over
// seconds, this reveals what a short waveform window can't — delay shows as
// evenly spaced decaying repeats, reverb as a smooth fading tail, tremolo/auto-pan
// as a pulsing amplitude, a compressor as flattened dynamics.
export function EnvelopeWaveform({ stages, getAnalyser, active = true, className }: EnvelopeWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(2048))
  // per-stage ring buffer of peak values + shared write head
  const histRef = useRef<Map<string, Float32Array>>(new Map())
  const headRef = useRef(0)
  const stagesRef = useRef(stages)
  stagesRef.current = stages
  const drawRef = useRef<() => void>(() => {})

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

  const sample = useCallback(() => {
    const hist = histRef.current
    const head = headRef.current
    for (const stage of stagesRef.current) {
      let ring = hist.get(stage.id)
      if (!ring) {
        ring = new Float32Array(HISTORY)
        hist.set(stage.id, ring)
      }
      const analyser = getAnalyser(stage.id)
      let peak = 0
      if (analyser) {
        let buf = bufRef.current
        if (buf.length !== analyser.fftSize) {
          buf = new Float32Array(analyser.fftSize)
          bufRef.current = buf
        }
        readTimeDomain(analyser, buf)
        for (let i = 0; i < buf.length; i++) {
          const a = Math.abs(buf[i])
          if (a > peak) peak = a
        }
      }
      ring[head] = peak
    }
    headRef.current = (head + 1) % HISTORY
  }, [getAnalyser])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    const mid = h / 2

    ctx.fillStyle = cssVar('--lcd-bg')
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = cssVar('--lcd-grid')
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, mid)
    ctx.lineTo(w, mid)
    ctx.stroke()

    const head = headRef.current
    const list = stagesRef.current
    for (const stage of list) {
      const ring = histRef.current.get(stage.id)
      if (!ring) continue
      ctx.fillStyle = cssVar(stage.colorVar)
      ctx.globalAlpha = stage.bypassed ? 0.2 : list.length > 1 ? 0.5 : 0.85
      ctx.beginPath()
      // oldest sample at left, newest at right
      for (let i = 0; i < HISTORY; i++) {
        const p = ring[(head + i) % HISTORY]
        const x = (i / (HISTORY - 1)) * w
        const y = Math.max(0, mid - p * mid * 0.92)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      for (let i = HISTORY - 1; i >= 0; i--) {
        const p = ring[(head + i) % HISTORY]
        const x = (i / (HISTORY - 1)) * w
        const y = Math.min(h, mid + p * mid * 0.92)
        ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }, [])

  drawRef.current = draw
  const tick = useCallback(() => {
    sample()
    draw()
  }, [sample, draw])

  useRafLoop(tick, active)

  return <canvas ref={canvasRef} className={className} />
}
