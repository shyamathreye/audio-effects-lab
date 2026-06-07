import type { ModMode } from '../audio/effects/modulation'
import { cssVar } from './analysis'

const clampY = (y: number, h: number) => Math.max(0, Math.min(h, y))

function clearLcd(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = cssVar('--lcd-bg')
  ctx.fillRect(0, 0, w, h)
}

function timeAxis(ctx: CanvasRenderingContext2D, w: number, h: number, spanSec: number, step = 0.5) {
  ctx.strokeStyle = cssVar('--lcd-grid')
  ctx.fillStyle = cssVar('--lcd-grid')
  ctx.lineWidth = 1
  ctx.font = `${Math.round(h * 0.12)}px ui-monospace, monospace`
  for (let t = step; t < spanSec; t += step) {
    const x = (t / spanSec) * w
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillText(`${t % 1 === 0 ? t : t.toFixed(1)}s`, x + 2, h - 2)
  }
}

// Delay — echo diagram: the dry hit at t=0, then taps at the delay time, each
// `feedback`× quieter. Shows "repeats every X, fading by feedback" at a glance.
export function drawDelayEchoes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeSec: number,
  feedback: number,
  wet: number,
  colorVar: string,
): void {
  clearLcd(ctx, w, h)
  const baseY = h - 2
  // span: show echoes until they fade below ~3%
  const fb = Math.min(0.95, Math.max(0.001, feedback))
  const nFade = wet > 0.01 ? Math.log(0.03 / wet) / Math.log(fb) : 4
  const span = Math.min(2.5, Math.max(timeSec * 1.5, (nFade + 1) * timeSec, 0.5))
  timeAxis(ctx, w, h, span)

  const drawBar = (t: number, amp: number, color: string, wdt: number) => {
    const x = (t / span) * w
    const y = clampY(baseY - amp * (h - 6), h)
    ctx.strokeStyle = color
    ctx.lineWidth = wdt
    ctx.beginPath()
    ctx.moveTo(x, baseY)
    ctx.lineTo(x, y)
    ctx.stroke()
    // arrowhead dot
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, wdt, 0, Math.PI * 2)
    ctx.fill()
  }

  // dry / direct sound at t=0
  drawBar(0, Math.max(0.15, 1 - wet), cssVar('--stage-dry-on-black'), Math.max(2, w / 120))
  // wet echoes
  let amp = wet
  let t = timeSec
  let guard = 0
  while (t <= span && amp > 0.02 && guard < 64) {
    drawBar(t, amp, cssVar(colorVar), Math.max(2, w / 120))
    amp *= fb
    t += timeSec
    guard++
  }
}

// Reverb — decay tail: predelay gap, then an exponential tail over `decay`. A
// second, faster-decaying curve shows damping eating the bright (high) tail.
export function drawReverbDecay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  decay: number,
  predelay: number,
  damping: number,
  colorVar: string,
): void {
  clearLcd(ctx, w, h)
  const baseY = h - 2
  const span = Math.min(4.5, predelay + decay + 0.2)
  timeAxis(ctx, w, h, span, span > 2 ? 1 : 0.5)

  const env = (t: number, d: number) => (t < predelay ? 0 : Math.exp(-(t - predelay) * (5 / Math.max(0.05, d))))
  const dHF = decay * (1 - Math.min(0.9, damping) * 0.8)

  const fill = (d: number, alpha: number) => {
    ctx.beginPath()
    ctx.moveTo(0, baseY)
    for (let x = 0; x <= w; x++) {
      const t = (x / w) * span
      ctx.lineTo(x, clampY(baseY - env(t, d) * (h - 6), h))
    }
    ctx.lineTo(w, baseY)
    ctx.closePath()
    ctx.fillStyle = cssVar(colorVar)
    ctx.globalAlpha = alpha
    ctx.fill()
    ctx.globalAlpha = 1
  }

  fill(decay, 0.25) // full tail
  fill(dHF, 0.55) // bright (damped) tail on top
}

// Modulation — the LFO itself over a fixed 4 s window, so a slow rate shows <1
// cycle and a fast rate shows many. Amplitude = depth; label names the target.
const MOD_TARGET: Record<ModMode, string> = {
  chorus: 'delay time',
  flanger: 'delay time',
  phaser: 'filter freq',
  tremolo: 'volume',
  autopan: 'pan',
}

export function drawLFO(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rate: number,
  depth: number,
  mode: ModMode,
  colorVar: string,
): void {
  clearLcd(ctx, w, h)
  const mid = h / 2
  const span = 4 // seconds shown
  ctx.strokeStyle = cssVar('--lcd-grid')
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, mid)
  ctx.lineTo(w, mid)
  ctx.stroke()
  timeAxis(ctx, w, h, span, 1)

  ctx.beginPath()
  for (let x = 0; x <= w; x++) {
    const t = (x / w) * span
    const v = Math.sin(2 * Math.PI * rate * t) * Math.min(1, depth)
    const y = clampY(mid - v * (h / 2) * 0.85, h)
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.lineWidth = Math.max(1.5, w / 220)
  ctx.strokeStyle = cssVar(colorVar)
  ctx.stroke()

  ctx.fillStyle = cssVar('--panel-cream')
  ctx.globalAlpha = 0.7
  ctx.font = `${Math.round(h * 0.13)}px ui-monospace, monospace`
  ctx.fillText(`→ ${MOD_TARGET[mode]}`, 3, Math.round(h * 0.15))
  ctx.globalAlpha = 1
}
