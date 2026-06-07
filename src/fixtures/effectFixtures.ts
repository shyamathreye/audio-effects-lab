import { EFFECTS_BY_ID } from '../audio/effects'
import { defaultParams } from '../audio/effects/types'
import { renderDry, renderThrough } from './offlineRender'
import type { RenderOpts } from './offlineRender'
import {
  bandEnergy,
  harmonicRatio,
  crestFactor,
  autocorrAtLag,
  rms,
} from './signal'

export interface FixtureResult {
  id: string
  name: string
  pass: boolean
  detail: string
}

// Coefficient of variation of short-time RMS — ~0 for a steady tone, large when
// amplitude is modulated over time (tremolo/flanger sweep/auto-pan).
function shortTimeRmsCV(d: Float32Array, sr: number, win = 0.03): number {
  const n = Math.floor(win * sr)
  const vals: number[] = []
  for (let i = 0; i + n < d.length; i += n) vals.push(rms(d, i, i + n))
  const mean = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length)
  const varc = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, vals.length)
  return Math.sqrt(varc) / Math.max(1e-9, mean)
}

const num = (n: number, p = 3) => Number(n.toFixed(p))

// Each fixture renders a known signal dry and wet, then asserts the expected
// delta described in PRD Part 3 / §4.4.
export async function runEffectFixtures(): Promise<FixtureResult[]> {
  const out: FixtureResult[] = []
  const def = (id: string) => EFFECTS_BY_ID[id]
  const params = (id: string) => defaultParams(def(id))

  // 1 · Utility — +6 dB ≈ ×2 RMS. Compare 0 dB vs +6 dB through the same
  // (center) panner so the StereoPanner equal-power pan law cancels out.
  {
    const o: RenderOpts = { source: 'sine', freq: 220, dur: 0.4 }
    const at0 = await renderThrough(def('utility'), { ...params('utility'), gain: 0 }, o)
    const at6 = await renderThrough(def('utility'), { ...params('utility'), gain: 6 }, o)
    const ratio = rms(at6.data) / rms(at0.data)
    out.push({ id: 'utility', name: 'Utility', pass: ratio > 1.8 && ratio < 2.2, detail: `0dB→+6dB ⇒ ×${num(ratio, 2)} RMS (expect ≈×2)` })
  }

  // 2 · Filter — low-pass@700 drops energy above 2 kHz.
  {
    const o: RenderOpts = { source: 'saw', freq: 220, dur: 0.4 }
    const dry = await renderDry(o)
    const wet = await renderThrough(def('filter'), params('filter'), o)
    const dHi = bandEnergy(dry.data, dry.sr, 2000, 12000)
    const wHi = bandEnergy(wet.data, wet.sr, 2000, 12000)
    const drop = wHi / Math.max(1e-12, dHi)
    out.push({ id: 'filter', name: 'Filter', pass: drop < 0.2, detail: `>2kHz energy ×${num(drop, 4)} of dry (expect ≪1)` })
  }

  // 3 · EQ3 — low cut + high boost tilts the spectrum brighter.
  {
    const o: RenderOpts = { source: 'saw', freq: 110, dur: 0.4 }
    const dry = await renderDry(o)
    const wet = await renderThrough(def('eq3'), params('eq3'), o)
    const tilt = (r: { data: Float32Array; sr: number }) =>
      bandEnergy(r.data, r.sr, 3000, 10000) / Math.max(1e-12, bandEnergy(r.data, r.sr, 80, 300))
    const ratio = tilt(wet) / tilt(dry)
    out.push({ id: 'eq3', name: 'EQ (3-band)', pass: ratio > 1.5, detail: `high/low tilt ×${num(ratio, 2)} brighter than dry` })
  }

  // 4 · Compressor — reduces crest factor (peaks squashed vs body).
  {
    const o: RenderOpts = { source: 'envBurst', freq: 220, dur: 0.5 }
    const dry = await renderDry(o)
    const wet = await renderThrough(def('compressor'), params('compressor'), o)
    const cd = crestFactor(dry.data)
    const cw = crestFactor(wet.data)
    out.push({ id: 'compressor', name: 'Compressor', pass: cw < cd * 0.95, detail: `crest ${num(cd, 2)}→${num(cw, 2)} (more even)` })
  }

  // 5 · Distortion — tanh drive grows a harmonic series from a pure sine.
  {
    const o: RenderOpts = { source: 'sine', freq: 220, dur: 0.4 }
    const dry = await renderDry(o)
    const wet = await renderThrough(def('distortion'), params('distortion'), o)
    const hd = harmonicRatio(dry.data, 220, dry.sr)
    const hw = harmonicRatio(wet.data, 220, wet.sr)
    out.push({ id: 'distortion', name: 'Distortion', pass: hw > 0.02 && hw > hd * 10, detail: `harmonics/fundamental ${num(hd, 4)}→${num(hw, 3)}` })
  }

  // 6 · Delay — autocorrelation peak at the 180 ms delay time.
  {
    const o: RenderOpts = { source: 'burst', dur: 1.4 }
    const wet = await renderThrough(def('delay'), params('delay'), o)
    const acAt = autocorrAtLag(wet.data, 0.18, wet.sr)
    const acOff = autocorrAtLag(wet.data, 0.13, wet.sr)
    out.push({ id: 'delay', name: 'Delay', pass: acAt > 0.15 && acAt > acOff * 1.5, detail: `autocorr@180ms ${num(acAt, 3)} vs @130ms ${num(acOff, 3)}` })
  }

  // 7 · Reverb — a fading tail persists long after the burst.
  {
    const o: RenderOpts = { source: 'burst', dur: 2.0 }
    const dry = await renderDry(o)
    const wet = await renderThrough(def('reverb'), params('reverb'), o)
    const tail = (r: { data: Float32Array; sr: number }, a: number, b: number) =>
      rms(r.data, Math.floor(a * r.sr), Math.floor(b * r.sr))
    const dryTail = tail(dry, 0.5, 1.5)
    const wetEarly = tail(wet, 0.3, 0.6)
    const wetLate = tail(wet, 1.0, 1.3)
    const pass = wetEarly > dryTail * 5 && wetEarly > wetLate && wetLate > 1e-5
    out.push({ id: 'reverb', name: 'Reverb', pass, detail: `tail rms early ${num(wetEarly, 5)} > late ${num(wetLate, 5)} > dry ${num(dryTail, 6)}` })
  }

  // 8 · Modulation (flanger default) — the comb sweep modulates a steady tone's
  // amplitude over time (short-time RMS varies far more than dry).
  {
    const o: RenderOpts = { source: 'sine', freq: 1000, dur: 2.0 }
    const dry = await renderDry(o)
    const wet = await renderThrough(def('modulation'), params('modulation'), o)
    const cvD = shortTimeRmsCV(dry.data, dry.sr)
    const cvW = shortTimeRmsCV(wet.data, wet.sr)
    out.push({ id: 'modulation', name: 'Modulation', pass: cvW > cvD * 5 && cvW > 0.02, detail: `amplitude variation ${num(cvD, 4)}→${num(cvW, 3)}` })
  }

  // 9 · Bitcrusher — quantization + downsampling sprout broadband content (both
  // harmonics and non-harmonic aliasing) where a clean sine has almost none.
  {
    const o: RenderOpts = { source: 'sine', freq: 220, dur: 0.4 }
    const dry = await renderDry(o)
    const wet = await renderThrough(def('bitcrusher'), { bits: 3, downsample: 8, wet: 1 }, o)
    const dHi = bandEnergy(dry.data, dry.sr, 1500, 18000)
    const wHi = bandEnergy(wet.data, wet.sr, 1500, 18000)
    const ratio = wHi / Math.max(1e-12, dHi)
    out.push({ id: 'bitcrusher', name: 'Bitcrusher', pass: ratio > 20, detail: `>1.5kHz energy ×${num(ratio, 1)} of clean sine` })
  }

  return out
}
