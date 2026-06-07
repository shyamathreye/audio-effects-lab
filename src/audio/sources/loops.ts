import type { LoopConfig, LoopName, SourceInstance } from './types'
import { clamp } from '../util'

// Procedurally synthesized loops (PRD §4.5, R1) — no audio assets/licensing.
// Each generator writes one looping bar into a mono Float32Array.

const cache = new Map<string, Float32Array<ArrayBuffer>>()

function drumLoop(sr: number): Float32Array<ArrayBuffer> {
  const bpm = 120
  const beat = 60 / bpm
  const bars = 2
  const len = Math.floor(beat * 4 * bars * sr)
  const d = new Float32Array(len)

  const addKick = (t0: number) => {
    const start = Math.floor(t0 * sr)
    for (let i = 0; i + start < len && i < sr * 0.5; i++) {
      const t = i / sr
      const f = 110 * Math.exp(-28 * t) + 45
      const amp = Math.exp(-9 * t)
      d[start + i] += Math.sin(2 * Math.PI * f * t) * amp * 0.9
    }
  }
  const addSnare = (t0: number) => {
    const start = Math.floor(t0 * sr)
    for (let i = 0; i + start < len && i < sr * 0.3; i++) {
      const t = i / sr
      const body = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-22 * t)
      const noise = (Math.random() * 2 - 1) * Math.exp(-30 * t)
      d[start + i] += (body * 0.4 + noise * 0.5) * 0.8
    }
  }
  const addHat = (t0: number) => {
    const start = Math.floor(t0 * sr)
    for (let i = 0; i + start < len && i < sr * 0.1; i++) {
      const t = i / sr
      d[start + i] += (Math.random() * 2 - 1) * Math.exp(-120 * t) * 0.3
    }
  }

  for (let bar = 0; bar < bars; bar++) {
    const b = bar * beat * 4
    addKick(b + 0)
    addKick(b + beat * 2)
    addSnare(b + beat)
    addSnare(b + beat * 3)
    for (let e = 0; e < 8; e++) addHat(b + e * (beat / 2))
  }
  return d
}

function naiveSaw(phase: number): number {
  return 2 * (phase - Math.floor(phase + 0.5))
}

function padLoop(sr: number): Float32Array<ArrayBuffer> {
  const len = Math.floor(4 * sr)
  const d = new Float32Array(len)
  // a minor triad: A2, C3, E3, plus detuned partners
  const notes = [110, 130.81, 164.81]
  const detunes = [0, 6, -6] // cents-ish via small ratio
  let lp = 0
  for (let i = 0; i < len; i++) {
    const t = i / sr
    let s = 0
    for (const f of notes) {
      for (const dt of detunes) {
        const ff = f * Math.pow(2, dt / 1200)
        s += naiveSaw((ff * t) % 1)
      }
    }
    s /= notes.length * detunes.length
    // slow filter sweep (one-pole LP, cutoff modulated by a slow LFO)
    const cutoff = 0.04 + 0.03 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.15 * t))
    lp += cutoff * (s - lp)
    // gentle amplitude swell so the loop point is smooth
    const env = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t / 4) - Math.PI / 2)
    d[i] = lp * env * 0.7
  }
  return d
}

function melodicLoop(sr: number): Float32Array<ArrayBuffer> {
  const len = Math.floor(2 * sr)
  const d = new Float32Array(len)
  // A minor pentatonic phrase
  const seq = [220, 261.63, 293.66, 329.63, 392, 329.63, 293.66, 261.63]
  const noteDur = 2 / seq.length
  for (let n = 0; n < seq.length; n++) {
    const f = seq[n]
    const start = Math.floor(n * noteDur * sr)
    const dur = Math.floor(noteDur * sr)
    for (let i = 0; i < dur && start + i < len; i++) {
      const t = i / sr
      const env = Math.min(1, t / 0.01) * Math.exp(-4 * t) // pluck
      // triangle-ish via two harmonics
      const s = Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * 2 * f * t)
      d[start + i] += s * env * 0.5
    }
  }
  return d
}

function getLoopData(name: LoopName, sr: number): Float32Array<ArrayBuffer> {
  const key = `${name}@${sr}`
  let data = cache.get(key)
  if (!data) {
    data = name === 'drum' ? drumLoop(sr) : name === 'pad' ? padLoop(sr) : melodicLoop(sr)
    cache.set(key, data)
  }
  return data
}

export function createLoop(ctx: BaseAudioContext, cfg: LoopConfig): SourceInstance {
  const data = getLoopData(cfg.name, ctx.sampleRate)
  const buffer = ctx.createBuffer(1, data.length, ctx.sampleRate)
  buffer.copyToChannel(data, 0)

  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  const amp = ctx.createGain()
  amp.gain.value = clamp(cfg.level, 0, 1)
  src.connect(amp)

  let started = false
  return {
    output: amp,
    start(when = ctx.currentTime) {
      if (started) return
      started = true
      src.start(when)
    },
    stop(when = ctx.currentTime) {
      try {
        src.stop(when)
      } catch {
        /* not started */
      }
    },
    dispose() {
      try {
        src.stop()
      } catch {
        /* noop */
      }
      src.disconnect()
      amp.disconnect()
    },
  }
}
