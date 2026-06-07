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
