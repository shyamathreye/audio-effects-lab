import { clamp } from '../util'

export interface ImpulseOptions {
  /** Reverb length / RT in seconds. */
  decay: number
  /** Silence before the tail, seconds. */
  predelay: number
  /** 0 = bright, 1 = dark (low-pass on the tail). */
  damping: number
}

// Synthesized reverb impulse response (PRD §4.4 dsp/impulse): white noise shaped
// by an exponential decay envelope, low-passed for damping, with predelay zeros
// prepended, then normalized. Stereo (decorrelated channels) for natural width.
// Works in both AudioContext and OfflineAudioContext.
export function createImpulseResponse(
  ctx: BaseAudioContext,
  { decay, predelay, damping }: ImpulseOptions,
): AudioBuffer {
  const sr = ctx.sampleRate
  const d = clamp(decay, 0.05, 4)
  const pre = Math.floor(clamp(predelay, 0, 0.2) * sr)
  const tailLen = Math.floor(d * sr)
  const length = Math.max(1, pre + tailLen)

  const buffer = ctx.createBuffer(2, length, sr)
  // One-pole smoothing coefficient: damping 0 → 1 (no filtering), damping 1 →
  // ~0.02 (heavy low-pass). Applied twice per sample for a 2-pole roll-off.
  const a = clamp(1 - clamp(damping, 0, 0.99), 0.02, 1)

  let peak = 0
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    let lp1 = 0
    let lp2 = 0
    for (let i = 0; i < length; i++) {
      if (i < pre) {
        data[i] = 0
        continue
      }
      const t = (i - pre) / sr
      const env = Math.exp((-t * 5) / d) // ~ −43 dB at t = decay
      let s = (Math.random() * 2 - 1) * env
      lp1 += a * (s - lp1)
      lp2 += a * (lp1 - lp2)
      s = lp2
      data[i] = s
      const m = Math.abs(s)
      if (m > peak) peak = m
    }
  }

  if (peak > 0) {
    const g = 1 / peak
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch)
      for (let i = 0; i < length; i++) data[i] *= g
    }
  }
  return buffer
}
