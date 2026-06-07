import { useCallback, useEffect, useRef } from 'react'
import { useRafLoop } from './useRafLoop'
import { readFrequency, cssVar, freqToX, dbToY, FREQ_MAX } from './analysis'
import type { StageRef } from './stages'

interface SpectrumProps {
  /** One stage for the individual view, or all stages for the combined overlay. */
  stages: StageRef[]
  getAnalyser: (id: string) => AnalyserNode | null
  sampleRate: number
  active?: boolean
  /** Draw a soft fill under each curve (nice for a single stage). */
  fill?: boolean
  className?: string
}

// Frequency-domain view: log-frequency x-axis, dB magnitude y-axis. Draws one or
// many stages, each in its hue. Verify against fx_filter/fx_eq/fx_distortion:
// a wall above the cutoff, a spectral tilt, a growing harmonic series.
export function Spectrum({ stages, getAnalyser, sampleRate, active = true, fill = false, className }: SpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(1024))
  const drawRef = useRef<() => void>(() => {})
  const stagesRef = useRef(stages)
  stagesRef.current = stages

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
    const nyq = sampleRate / 2
    const maxF = Math.min(FREQ_MAX, nyq)

    ctx.fillStyle = cssVar('--lcd-bg')
    ctx.fillRect(0, 0, w, h)

    // decade gridlines + labels
    ctx.strokeStyle = cssVar('--lcd-grid')
    ctx.fillStyle = cssVar('--lcd-grid')
    ctx.lineWidth = 1
    ctx.font = `${Math.round(h * 0.07)}px ui-monospace, monospace`
    for (const f of [100, 1000, 10000]) {
      if (f > maxF) continue
      const x = freqToX(f, w, maxF)
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
      ctx.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, x + 2, h - 3)
    }

    const list = stagesRef.current
    for (const stage of list) {
      const analyser = getAnalyser(stage.id)
      if (!analyser) continue
      let buf = bufRef.current
      if (buf.length !== analyser.frequencyBinCount) {
        buf = new Float32Array(analyser.frequencyBinCount)
        bufRef.current = buf
      }
      readFrequency(analyser, buf)

      const binHz = nyq / buf.length
      ctx.lineWidth = Math.max(1.5, w / 700)
      ctx.strokeStyle = cssVar(stage.colorVar)
      ctx.globalAlpha = stage.bypassed ? 0.25 : 1
      ctx.beginPath()
      let started = false
      for (let i = 1; i < buf.length; i++) {
        const f = i * binHz
        if (f < 20) continue
        if (f > maxF) break
        const x = freqToX(f, w, maxF)
        const y = dbToY(buf[i], h)
        if (!started) {
          ctx.moveTo(x, y)
          started = true
        } else ctx.lineTo(x, y)
      }
      ctx.stroke()

      if (fill && !stage.bypassed) {
        ctx.lineTo(w, h)
        ctx.lineTo(freqToX(20, w, maxF), h)
        ctx.closePath()
        ctx.globalAlpha = 0.15
        ctx.fillStyle = cssVar(stage.colorVar)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }, [getAnalyser, sampleRate, fill])

  drawRef.current = draw
  useRafLoop(draw, active)

  return <canvas ref={canvasRef} className={className} />
}
