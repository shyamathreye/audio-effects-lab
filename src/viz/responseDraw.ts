import type { EffectInstance } from '../audio/effects/types'
import { cssVar, freqToX, dbToY, FREQ_MIN, FREQ_MAX } from './analysis'

const clampY = (y: number, h: number) => Math.max(0, Math.min(h, y))

function clearLcd(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = cssVar('--lcd-bg')
  ctx.fillRect(0, 0, w, h)
}

const RESP_MIN_DB = -36
const RESP_MAX_DB = 18

// Frequency-response curve (magnitude vs log-frequency) for filters / EQ. This is
// the intuition tool: the curve IS the filter — cutoff slides the wall, Q peaks
// it, the type flips the shape. `cutoffHz` (optional) draws a marker line.
export function drawFrequencyResponse(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  instance: EffectInstance,
  sr: number,
  colorVar: string,
  cutoffHz?: number,
): void {
  clearLcd(ctx, w, h)
  if (!instance.getFrequencyResponse) return
  const maxF = Math.min(FREQ_MAX, sr / 2)

  // grid: decades + 0 dB line
  ctx.strokeStyle = cssVar('--lcd-grid')
  ctx.fillStyle = cssVar('--lcd-grid')
  ctx.lineWidth = 1
  ctx.font = `${Math.round(h * 0.12)}px ui-monospace, monospace`
  for (const f of [100, 1000, 10000]) {
    if (f > maxF) continue
    const x = freqToX(f, w, maxF)
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, x + 2, h - 2)
  }
  const zeroY = dbToY(0, h, RESP_MIN_DB, RESP_MAX_DB)
  ctx.globalAlpha = 0.5
  ctx.beginPath()
  ctx.moveTo(0, zeroY)
  ctx.lineTo(w, zeroY)
  ctx.stroke()
  ctx.globalAlpha = 1

  const N = 192
  const freqs = new Float32Array(N)
  const lmin = Math.log10(FREQ_MIN)
  const lmax = Math.log10(maxF)
  for (let i = 0; i < N; i++) freqs[i] = Math.pow(10, lmin + (lmax - lmin) * (i / (N - 1)))
  const mag = instance.getFrequencyResponse(freqs as Float32Array<ArrayBuffer>)

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

  // the curve + soft fill
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
  ctx.lineTo(w, h)
  ctx.lineTo(0, h)
  ctx.closePath()
  ctx.globalAlpha = 0.15
  ctx.fillStyle = cssVar(colorVar)
  ctx.fill()
  ctx.globalAlpha = 1
}

// Input→output transfer curve over x ∈ [−1, 1] (waveshaper distortion, compressor
// knee). The faint diagonal is unity (no change); how the curve bends off it IS
// the effect — flattening = saturation/clipping, a knee = compression.
export function drawTransferCurve(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  instance: EffectInstance,
  colorVar: string,
): void {
  clearLcd(ctx, w, h)
  if (!instance.getTransferCurve) return

  const map = 0.46 // ±1 maps to ±0.46·min(w,h) around center
  const cx = w / 2
  const cy = h / 2
  const sx = (x: number) => cx + x * cx * 0.92
  const sy = (y: number) => clampY(cy - y * h * map, h)

  // axes + unity diagonal
  ctx.strokeStyle = cssVar('--lcd-grid')
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, cy)
  ctx.lineTo(w, cy)
  ctx.moveTo(cx, 0)
  ctx.lineTo(cx, h)
  ctx.stroke()
  ctx.globalAlpha = 0.5
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(sx(-1), sy(-1))
  ctx.lineTo(sx(1), sy(1))
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1

  const N = 256
  const curve = instance.getTransferCurve(N)
  ctx.beginPath()
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * 2 - 1
    const px = sx(x)
    const py = sy(curve[i])
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.lineWidth = Math.max(1.5, w / 220)
  ctx.strokeStyle = cssVar(colorVar)
  ctx.lineJoin = 'round'
  ctx.stroke()
}
