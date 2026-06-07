import { useCallback, useEffect, useRef } from 'react'
import { useRafLoop } from './useRafLoop'
import { cssVar, freqToX, dbToY, readFrequency, FREQ_MIN, FREQ_MAX } from './analysis'

interface Props {
  /** Effect's linear magnitude response at the given freqs (current params). */
  response: (freqs: Float32Array<ArrayBuffer>) => Float32Array | null
  /** Analyser of the signal arriving at this effect (the upstream tap). */
  getInputAnalyser: () => AnalyserNode | null
  sampleRate: number
  colorVar: string
  /** Optional cutoff marker (Hz). */
  cutoffHz?: number
  /** Live while playing; otherwise a static frame is kept. */
  active?: boolean
  /** Bump to redraw the curve when params change while paused. */
  redrawKey: unknown
  className?: string
}

const clampY = (y: number, h: number) => Math.max(0, Math.min(h, y))
const RESP_MIN_DB = -36
const RESP_MAX_DB = 18
const SPEC_MIN_DB = -100
const SPEC_MAX_DB = -20

// Filter/EQ view: the incoming sound's spectrum (faint fill) behind the effect's
// frequency-response curve, sharing one log-frequency x-axis. You can see where
// the signal's energy peaks and aim the cutoff/bands at it.
export function ResponseSpectrumView({
  response,
  getInputAnalyser,
  sampleRate,
  colorVar,
  cutoffHz,
  active = true,
  redrawKey,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const specRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(1024))
  const freqRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(192))
  const drawRef = useRef<() => void>(() => {})

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    const maxF = Math.min(FREQ_MAX, sampleRate / 2)
    const lmin = Math.log10(FREQ_MIN)
    const lmax = Math.log10(maxF)

    ctx.fillStyle = cssVar('--lcd-bg')
    ctx.fillRect(0, 0, w, h)

    // grid: decades + 0 dB (gain) reference
    ctx.strokeStyle = cssVar('--lcd-grid')
    ctx.fillStyle = cssVar('--lcd-grid')
    ctx.lineWidth = 1
    ctx.font = `${Math.round(h * 0.12)}px ui-monospace, monospace`
    for (const f of [100, 1000, 10000]) {
      if (f > maxF) continue
      const x = freqToX(f, w, maxF)
      ctx.globalAlpha = 0.45
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, x + 2, h - 2)
    }
    const zeroY = dbToY(0, h, RESP_MIN_DB, RESP_MAX_DB)
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.moveTo(0, zeroY)
    ctx.lineTo(w, zeroY)
    ctx.stroke()
    ctx.globalAlpha = 1

    // incoming spectrum (faint fill) — shows where the energy is
    const analyser = getInputAnalyser()
    if (analyser) {
      let spec = specRef.current
      if (spec.length !== analyser.frequencyBinCount) {
        spec = new Float32Array(analyser.frequencyBinCount)
        specRef.current = spec
      }
      readFrequency(analyser, spec)
      const binHz = sampleRate / 2 / spec.length
      const specY = (db: number) => (1 - (Math.max(SPEC_MIN_DB, Math.min(SPEC_MAX_DB, db)) - SPEC_MIN_DB) / (SPEC_MAX_DB - SPEC_MIN_DB)) * h
      ctx.beginPath()
      ctx.moveTo(0, h)
      for (let x = 0; x <= w; x++) {
        const f = Math.pow(10, lmin + (lmax - lmin) * (x / w))
        const bin = Math.min(spec.length - 1, Math.max(1, Math.round(f / binHz)))
        ctx.lineTo(x, clampY(specY(spec[bin]), h))
      }
      ctx.lineTo(w, h)
      ctx.closePath()
      ctx.fillStyle = cssVar('--lcd')
      ctx.globalAlpha = 0.22
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // cutoff marker
    if (cutoffHz && cutoffHz >= FREQ_MIN && cutoffHz <= maxF) {
      const cx = freqToX(cutoffHz, w, maxF)
      ctx.strokeStyle = cssVar('--panel-cream')
      ctx.globalAlpha = 0.35
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(cx, 0)
      ctx.lineTo(cx, h)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    }

    // response curve on top
    const freqs = freqRef.current
    const N = freqs.length
    for (let i = 0; i < N; i++) freqs[i] = Math.pow(10, lmin + (lmax - lmin) * (i / (N - 1)))
    const mag = response(freqs)
    if (mag) {
      ctx.beginPath()
      for (let i = 0; i < N; i++) {
        const db = 20 * Math.log10(Math.max(1e-4, mag[i]))
        const x = freqToX(freqs[i], w, maxF)
        const y = clampY(dbToY(db, h, RESP_MIN_DB, RESP_MAX_DB), h)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.lineWidth = Math.max(1.5, w / 220)
      ctx.strokeStyle = cssVar(colorVar)
      ctx.stroke()
    }
  }, [response, getInputAnalyser, sampleRate, colorVar, cutoffHz])

  drawRef.current = draw

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

  // redraw the curve when params change while paused
  useEffect(() => {
    if (!active) drawRef.current()
  }, [redrawKey, active])

  useRafLoop(draw, active)

  return <canvas ref={canvasRef} className={className} />
}
