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
