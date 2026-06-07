// Lightweight signal analysis for fixtures — Goertzel (single-frequency energy),
// band energy, harmonic ratio, crest factor, autocorrelation. Enough to assert
// the expected spectral/temporal deltas without a full FFT dependency.

export function rms(d: Float32Array, from = 0, to = d.length): number {
  let s = 0
  for (let i = from; i < to; i++) s += d[i] * d[i]
  return Math.sqrt(s / Math.max(1, to - from))
}

export function peak(d: Float32Array, from = 0, to = d.length): number {
  let p = 0
  for (let i = from; i < to; i++) p = Math.max(p, Math.abs(d[i]))
  return p
}

/** Goertzel magnitude at a single frequency over a window. */
export function goertzel(d: Float32Array, freq: number, sr: number, from = 0, to = d.length): number {
  const n = to - from
  const k = (2 * Math.PI * freq) / sr
  const coeff = 2 * Math.cos(k)
  let s0 = 0
  let s1 = 0
  let s2 = 0
  for (let i = from; i < to; i++) {
    s0 = d[i] + coeff * s1 - s2
    s2 = s1
    s1 = s0
  }
  const power = s1 * s1 + s2 * s2 - coeff * s1 * s2
  return Math.sqrt(Math.max(0, power)) / n
}

/** Summed energy across a frequency band (comb of Goertzel probes). */
export function bandEnergy(
  d: Float32Array,
  sr: number,
  fLo: number,
  fHi: number,
  steps = 24,
  from = 0,
  to = d.length,
): number {
  let e = 0
  for (let i = 0; i < steps; i++) {
    const f = fLo * Math.pow(fHi / fLo, i / (steps - 1))
    const m = goertzel(d, f, sr, from, to)
    e += m * m
  }
  return e
}

/** Energy at harmonics 2f..Nf relative to the fundamental f. */
export function harmonicRatio(d: Float32Array, f0: number, sr: number, n = 8): number {
  const fund = goertzel(d, f0, sr)
  let harm = 0
  for (let h = 2; h <= n; h++) {
    const m = goertzel(d, f0 * h, sr)
    harm += m * m
  }
  return harm / Math.max(1e-12, fund * fund)
}

export function crestFactor(d: Float32Array): number {
  return peak(d) / Math.max(1e-9, rms(d))
}

/** Normalized autocorrelation at a given lag in seconds. */
export function autocorrAtLag(d: Float32Array, lagSec: number, sr: number): number {
  const lag = Math.round(lagSec * sr)
  let num = 0
  let den = 0
  for (let i = 0; i + lag < d.length; i++) {
    num += d[i] * d[i + lag]
    den += d[i] * d[i]
  }
  return num / Math.max(1e-12, den)
}
