// Shared audio math helpers.

// Default master level. Sources are conservative and the master bus has a
// limiter + safety clip, so we can run a healthy hot default without clipping.
export const DEFAULT_MASTER_DB = 6

/** Decibels → linear gain. -Infinity dB → 0. */
export function dbToGain(db: number): number {
  if (db <= -100) return 0
  return Math.pow(10, db / 20)
}

/** Linear gain → decibels. 0 → -Infinity. */
export function gainToDb(gain: number): number {
  if (gain <= 0) return -Infinity
  return 20 * Math.log10(gain)
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/** Map a 0..1 slider position onto a logarithmic range (e.g. 20–20kHz). */
export function logFromUnit(unit: number, min: number, max: number): number {
  const lmin = Math.log(min)
  const lmax = Math.log(max)
  return Math.exp(lmin + (lmax - lmin) * clamp(unit, 0, 1))
}

/** Inverse of logFromUnit: value on a log range → 0..1 position. */
export function unitFromLog(value: number, min: number, max: number): number {
  const lmin = Math.log(min)
  const lmax = Math.log(max)
  return clamp((Math.log(value) - lmin) / (lmax - lmin), 0, 1)
}
