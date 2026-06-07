// AnalyserNode read helpers + scope triggering (PRD §4.7, R2).

/** A Float32Array backed by a plain ArrayBuffer (what the Web Audio analyser
    read methods require under TS 5.7+ DOM types). */
export type AudioFloatArray = Float32Array<ArrayBuffer>

/** Read time-domain samples (−1..1) into the provided buffer. */
export function readTimeDomain(analyser: AnalyserNode, buf: AudioFloatArray): void {
  analyser.getFloatTimeDomainData(buf)
}

/** Read frequency magnitudes in dB (typically −Infinity..0). */
export function readFrequency(analyser: AnalyserNode, buf: AudioFloatArray): void {
  analyser.getFloatFrequencyData(buf)
}

// Find a rising zero-crossing so a periodic waveform appears stable instead of
// scrolling (PRD R2). Returns an offset into `buf`, or 0 if none found.
export function zeroCrossingOffset(buf: Float32Array, searchLen: number): number {
  const limit = Math.min(searchLen, buf.length - 1)
  for (let i = 1; i < limit; i++) {
    if (buf[i - 1] <= 0 && buf[i] > 0) return i
  }
  return 0
}

const clampY = (y: number, h: number) => Math.max(0, Math.min(h, y))

// Stroke `count` samples of `buf` starting at `start` across the full width,
// always staying inside the viewport (peaks beyond ±1 clamp to the rail rather
// than drawing off-canvas). When zoomed out (more samples than pixels) it draws
// a min/max band per column so nothing aliases away; when zoomed in it draws a
// smooth interpolated line. `ctx` styling (stroke/alpha/width) is set by caller.
export function strokeWave(
  ctx: CanvasRenderingContext2D,
  buf: Float32Array,
  start: number,
  count: number,
  w: number,
  h: number,
  amp = 0.45,
): void {
  const n = Math.min(count, buf.length - start)
  if (n <= 1) return
  const mid = h / 2
  ctx.beginPath()
  if (n <= w) {
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * w
      const y = clampY(mid - buf[start + i] * amp * h, h)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
  } else {
    const per = n / w
    for (let cx = 0; cx < w; cx++) {
      let mn = Infinity
      let mx = -Infinity
      const a = start + Math.floor(cx * per)
      const b = start + Math.floor((cx + 1) * per)
      for (let i = a; i < b && i < buf.length; i++) {
        const v = buf[i]
        if (v < mn) mn = v
        if (v > mx) mx = v
      }
      if (mn === Infinity) continue
      ctx.moveTo(cx, clampY(mid - mx * amp * h, h))
      ctx.lineTo(cx, clampY(mid - mn * amp * h, h))
    }
  }
  ctx.stroke()
}

// Pick a stable start offset that shows `count` samples: align to a rising
// zero-crossing near the front so a steady tone holds still.
export function waveStart(buf: Float32Array, count: number): number {
  const maxStart = Math.max(0, buf.length - count)
  if (maxStart === 0) return 0
  return Math.min(zeroCrossingOffset(buf, Math.min(maxStart, 1024)), maxStart)
}

/** Resolve a CSS variable to its concrete color string (for canvas strokes). */
export function cssVar(name: string): string {
  if (typeof window === 'undefined') return '#fff'
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export const FREQ_MIN = 20
export const FREQ_MAX = 20000

/** Map a frequency (Hz) to an x position (0..width) on a log axis. */
export function freqToX(freq: number, width: number, max = FREQ_MAX): number {
  const f = Math.max(FREQ_MIN, Math.min(max, freq))
  const lmin = Math.log10(FREQ_MIN)
  const lmax = Math.log10(max)
  return ((Math.log10(f) - lmin) / (lmax - lmin)) * width
}

/** Map a dB magnitude to a y position (0=top..height=bottom). */
export function dbToY(db: number, height: number, minDb = -100, maxDb = -10): number {
  const c = Math.max(minDb, Math.min(maxDb, db))
  return (1 - (c - minDb) / (maxDb - minDb)) * height
}
