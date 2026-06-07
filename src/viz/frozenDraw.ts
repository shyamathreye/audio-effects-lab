import type { FrozenStage } from '../audio/offline'
import { magnitudeDb, stft } from '../audio/dsp/fft'
import { cssVar, freqToX, dbToY, FREQ_MIN, FREQ_MAX } from './analysis'
import { heatRGB } from './heat'

// Static draws for Freeze mode (no rAF) — computed from offline-rendered buffers.

function clearLcd(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = cssVar('--lcd-bg')
  ctx.fillRect(0, 0, w, h)
}

export function drawFrozenWaveform(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stages: FrozenStage[],
  sr: number,
): void {
  clearLcd(ctx, w, h)
  ctx.strokeStyle = cssVar('--lcd-grid')
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, h / 2)
  ctx.lineTo(w, h / 2)
  ctx.stroke()

  if (stages.length === 0) return
  const ref = stages[0].data
  const span = Math.min(Math.floor(sr * 0.018), Math.floor(ref.length / 2))
  const mid = Math.floor(ref.length / 2)
  // align on a rising zero-crossing near the middle of the reference buffer
  let start = mid
  for (let i = mid; i < mid + Math.min(span, ref.length - mid - 1); i++) {
    if (ref[i - 1] <= 0 && ref[i] > 0) {
      start = i
      break
    }
  }

  for (const stage of stages) {
    const d = stage.data
    ctx.lineWidth = stage.id === 'dry' ? Math.max(1, w / 900) : Math.max(1.5, w / 650)
    ctx.strokeStyle = cssVar(stage.colorVar)
    ctx.globalAlpha = stage.bypassed ? 0.25 : stage.id === 'dry' ? 0.55 : 0.9
    ctx.beginPath()
    for (let i = 0; i < span; i++) {
      const v = d[start + i] ?? 0
      const x = (i / span) * w
      const y = (0.5 - v * 0.45) * h
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

// Full-buffer amplitude envelope (peak per pixel-column) over the whole rendered
// duration — the frozen counterpart to the live envelope. Delay/reverb tails and
// tremolo are legible across the full time axis.
export function drawFrozenEnvelope(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stages: FrozenStage[],
  sr: number,
): void {
  clearLcd(ctx, w, h)
  const mid = h / 2

  // time gridlines every 0.5 s
  const dur = stages[0] ? stages[0].data.length / sr : 0
  ctx.strokeStyle = cssVar('--lcd-grid')
  ctx.fillStyle = cssVar('--lcd-grid')
  ctx.lineWidth = 1
  ctx.font = `${Math.round(h * 0.07)}px ui-monospace, monospace`
  ctx.beginPath()
  ctx.moveTo(0, mid)
  ctx.lineTo(w, mid)
  ctx.stroke()
  for (let t = 0.5; t < dur; t += 0.5) {
    const x = (t / dur) * w
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillText(`${t}s`, x + 2, h - 3)
  }

  for (const stage of stages) {
    const d = stage.data
    const per = Math.max(1, Math.floor(d.length / w))
    ctx.fillStyle = cssVar(stage.colorVar)
    ctx.globalAlpha = stage.bypassed ? 0.2 : stages.length > 1 ? 0.5 : 0.85
    ctx.beginPath()
    for (let x = 0; x < w; x++) {
      let peak = 0
      const start = x * per
      for (let i = start; i < start + per && i < d.length; i++) {
        const a = Math.abs(d[i])
        if (a > peak) peak = a
      }
      const y = mid - peak * mid * 0.92
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    for (let x = w - 1; x >= 0; x--) {
      let peak = 0
      const start = x * per
      for (let i = start; i < start + per && i < d.length; i++) {
        const a = Math.abs(d[i])
        if (a > peak) peak = a
      }
      ctx.lineTo(x, mid + peak * mid * 0.92)
    }
    ctx.closePath()
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

export function drawFrozenSpectrum(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stages: FrozenStage[],
  sr: number,
  fill = false,
): void {
  clearLcd(ctx, w, h)
  const nyq = sr / 2
  const maxF = Math.min(FREQ_MAX, nyq)

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

  for (const stage of stages) {
    const mags = magnitudeDb(stage.data, 4096)
    const binHz = nyq / mags.length
    ctx.lineWidth = Math.max(1.5, w / 700)
    ctx.strokeStyle = cssVar(stage.colorVar)
    ctx.globalAlpha = stage.bypassed ? 0.25 : 1
    ctx.beginPath()
    let started = false
    for (let i = 1; i < mags.length; i++) {
      const f = i * binHz
      if (f < FREQ_MIN) continue
      if (f > maxF) break
      const x = freqToX(f, w, maxF)
      const y = dbToY(mags[i], h)
      if (!started) {
        ctx.moveTo(x, y)
        started = true
      } else ctx.lineTo(x, y)
    }
    ctx.stroke()
    if (fill && !stage.bypassed) {
      ctx.lineTo(w, h)
      ctx.lineTo(freqToX(FREQ_MIN, w, maxF), h)
      ctx.closePath()
      ctx.globalAlpha = 0.15
      ctx.fillStyle = cssVar(stage.colorVar)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

export function drawFrozenSpectrogram(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stage: FrozenStage,
  sr: number,
): void {
  clearLcd(ctx, w, h)
  const { cols, bins } = stft(stage.data, 1024, 256)
  if (cols.length === 0) return

  const nyq = sr / 2
  const maxF = Math.min(FREQ_MAX, nyq)
  const lmin = Math.log10(FREQ_MIN)
  const lmax = Math.log10(maxF)
  const binHz = nyq / bins

  // render into a low-res offscreen image (cols × Hpx), then scale to canvas
  const Hpx = 200
  const off = document.createElement('canvas')
  off.width = cols.length
  off.height = Hpx
  const octx = off.getContext('2d')
  if (!octx) return
  const img = octx.createImageData(cols.length, Hpx)
  for (let x = 0; x < cols.length; x++) {
    const col = cols[x]
    for (let y = 0; y < Hpx; y++) {
      const f = Math.pow(10, lmax - (y / Hpx) * (lmax - lmin))
      const bin = Math.min(bins - 1, Math.max(0, Math.round(f / binHz)))
      const [r, g, b] = heatRGB(col[bin])
      const idx = (y * cols.length + x) * 4
      img.data[idx] = r
      img.data[idx + 1] = g
      img.data[idx + 2] = b
      img.data[idx + 3] = 255
    }
  }
  octx.putImageData(img, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(off, 0, 0, cols.length, Hpx, 0, 0, w, h)
}
