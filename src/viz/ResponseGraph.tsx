import { useCallback, useEffect, useRef } from 'react'
import { useRafLoop } from './useRafLoop'
import { cssVar, freqToX, dbToY, readFrequency, FREQ_MIN, FREQ_MAX } from './analysis'

export interface RespStage {
  id: string
  colorVar: string
  label: string
  /** band markers (e.g. EQ Low/Mid/High) */
  markers?: { freq: number; label: string }[]
}

interface Props {
  stages: RespStage[]
  getResponse: (id: string, freqs: Float32Array<ArrayBuffer>) => Float32Array | null
  getInputAnalyser: () => AnalyserNode | null
  sampleRate: number
  active?: boolean
  className?: string
}

const clampY = (y: number, h: number) => Math.max(0, Math.min(h, y))
const MIN_DB = -48
const MAX_DB = 24
const N = 256

// Big chain-wide frequency-response graph: the incoming spectrum (faint), each
// filter/EQ stage's response in its hue, and the COMBINED response of the whole
// chain (bright) — so you see exactly how the chain reshapes the frequency
// balance, and how stages stack.
export function ResponseGraph({ stages, getResponse, getInputAnalyser, sampleRate, active = true, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const specRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(1024))
  const freqRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(N))
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

    // grid: dB lines + decade lines, with labels
    ctx.fillStyle = cssVar('--lcd-grid')
    ctx.strokeStyle = cssVar('--lcd-grid')
    ctx.lineWidth = 1
    ctx.font = `${Math.max(9, Math.round(h * 0.03))}px ui-monospace, monospace`
    for (const db of [24, 12, 0, -12, -24, -36]) {
      const y = dbToY(db, h, MIN_DB, MAX_DB)
      ctx.globalAlpha = db === 0 ? 0.6 : 0.3
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
      ctx.globalAlpha = 0.7
      ctx.fillText(`${db > 0 ? '+' : ''}${db}dB`, 3, y - 2)
    }
    for (const f of [50, 100, 500, 1000, 5000, 10000]) {
      if (f > maxF) continue
      const x = freqToX(f, w, maxF)
      ctx.globalAlpha = 0.25
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
      ctx.globalAlpha = 0.7
      ctx.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, x + 2, h - 3)
    }
    ctx.globalAlpha = 1

    const list = stagesRef.current
    const freqs = freqRef.current
    for (let i = 0; i < N; i++) freqs[i] = Math.pow(10, lmin + (lmax - lmin) * (i / (N - 1)))

    // incoming spectrum backdrop
    const analyser = getInputAnalyser()
    if (analyser) {
      let spec = specRef.current
      if (spec.length !== analyser.frequencyBinCount) {
        spec = new Float32Array(analyser.frequencyBinCount)
        specRef.current = spec
      }
      readFrequency(analyser, spec)
      const binHz = sampleRate / 2 / spec.length
      const specY = (db: number) => (1 - (Math.max(-100, Math.min(-20, db)) + 100) / 80) * h
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
      ctx.globalAlpha = 0.16
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // combined product response
    const combined = new Float32Array(N)
    combined.fill(1)
    let any = false
    for (const stage of list) {
      const mag = getResponse(stage.id, freqs)
      if (!mag) continue
      any = true
      for (let i = 0; i < N; i++) combined[i] *= mag[i]
      // per-stage curve (thin, hue)
      ctx.beginPath()
      for (let i = 0; i < N; i++) {
        const db = 20 * Math.log10(Math.max(1e-4, mag[i]))
        const x = freqToX(freqs[i], w, maxF)
        const y = clampY(dbToY(db, h, MIN_DB, MAX_DB), h)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.lineWidth = Math.max(1, w / 700)
      ctx.strokeStyle = cssVar(stage.colorVar)
      ctx.globalAlpha = 0.7
      ctx.stroke()
      ctx.globalAlpha = 1
      // markers
      if (stage.markers) {
        const r = Math.max(3, w / 240)
        ctx.font = `${Math.max(9, Math.round(h * 0.035))}px ui-monospace, monospace`
        ctx.textAlign = 'center'
        for (const m of stage.markers) {
          if (m.freq < FREQ_MIN || m.freq > maxF) continue
          let idx = 0
          let best = Infinity
          for (let i = 0; i < N; i++) {
            const dd = Math.abs(freqs[i] - m.freq)
            if (dd < best) {
              best = dd
              idx = i
            }
          }
          const db = 20 * Math.log10(Math.max(1e-4, mag[idx]))
          const mx = freqToX(m.freq, w, maxF)
          const my = clampY(dbToY(db, h, MIN_DB, MAX_DB), h)
          ctx.beginPath()
          ctx.arc(mx, my, r, 0, Math.PI * 2)
          ctx.fillStyle = cssVar('--panel-cream')
          ctx.fill()
          ctx.strokeStyle = cssVar('--outline')
          ctx.lineWidth = 1.5
          ctx.stroke()
          ctx.fillStyle = cssVar('--panel-cream')
          ctx.fillText(m.label, Math.max(10, Math.min(w - 10, mx)), my - r - 3)
        }
        ctx.textAlign = 'start'
      }
    }

    // the bright combined curve on top
    if (any) {
      ctx.beginPath()
      for (let i = 0; i < N; i++) {
        const db = 20 * Math.log10(Math.max(1e-4, combined[i]))
        const x = freqToX(freqs[i], w, maxF)
        const y = clampY(dbToY(db, h, MIN_DB, MAX_DB), h)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.lineWidth = Math.max(2, w / 360)
      ctx.strokeStyle = cssVar('--panel-cream')
      ctx.stroke()
    }
  }, [getResponse, getInputAnalyser, sampleRate])

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

  useRafLoop(draw, active)

  return <canvas ref={canvasRef} className={className} />
}
