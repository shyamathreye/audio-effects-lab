import type { LoopConfig, LoopName, SourceInstance } from './types'
import { clamp } from '../util'

// Procedurally synthesized loops (PRD §4.5, R1) — no audio assets/licensing.
// Each generator writes one looping bar into a mono Float32Array.

const cache = new Map<string, Float32Array<ArrayBuffer>>()

// --- shared drum voices ---------------------------------------------------
function kick(d: Float32Array, sr: number, t0: number, amp = 0.9) {
  const start = Math.floor(t0 * sr)
  for (let i = 0; i + start < d.length && i < sr * 0.5; i++) {
    const t = i / sr
    const f = 110 * Math.exp(-28 * t) + 45
    d[start + i] += Math.sin(2 * Math.PI * f * t) * Math.exp(-9 * t) * amp
  }
}
function snare(d: Float32Array, sr: number, t0: number, amp = 0.8) {
  const start = Math.floor(t0 * sr)
  for (let i = 0; i + start < d.length && i < sr * 0.3; i++) {
    const t = i / sr
    const body = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-22 * t)
    const noise = (Math.random() * 2 - 1) * Math.exp(-30 * t)
    d[start + i] += (body * 0.4 + noise * 0.5) * amp
  }
}
function hat(d: Float32Array, sr: number, t0: number, amp = 0.3, decay = 120) {
  const start = Math.floor(t0 * sr)
  for (let i = 0; i + start < d.length && i < sr * 0.12; i++) {
    const t = i / sr
    d[start + i] += (Math.random() * 2 - 1) * Math.exp(-decay * t) * amp
  }
}

function drumLoop(sr: number): Float32Array<ArrayBuffer> {
  const beat = 0.5 // 120 BPM
  const bars = 2
  const len = Math.floor(beat * 4 * bars * sr)
  const d = new Float32Array(len)
  for (let bar = 0; bar < bars; bar++) {
    const b = bar * beat * 4
    kick(d, sr, b)
    kick(d, sr, b + beat * 2)
    snare(d, sr, b + beat)
    snare(d, sr, b + beat * 3)
    for (let e = 0; e < 8; e++) hat(d, sr, b + e * (beat / 2))
  }
  return d
}

// Busier, syncopated break: ghost snares, off-beat kicks, open hat.
function breakbeatLoop(sr: number): Float32Array<ArrayBuffer> {
  const beat = 0.46 // ~130 BPM
  const len = Math.floor(beat * 4 * 2 * sr)
  const d = new Float32Array(len)
  const s = beat / 4 // sixteenth
  for (let bar = 0; bar < 2; bar++) {
    const b = bar * beat * 4
    kick(d, sr, b)
    kick(d, sr, b + s * 3)
    kick(d, sr, b + beat * 2 + s * 2)
    snare(d, sr, b + beat)
    snare(d, sr, b + beat * 3)
    snare(d, sr, b + beat * 3 + s * 2, 0.3) // ghost
    for (let e = 0; e < 16; e++) hat(d, sr, b + e * s, e % 4 === 2 ? 0.34 : 0.2, e % 8 === 6 ? 40 : 120)
  }
  return d
}

function naiveSaw(phase: number): number {
  return 2 * (phase - Math.floor(phase + 0.5))
}

// --- bass: a syncopated A-minor riff (sub sine + a little saw bite) -------
function bassLoop(sr: number): Float32Array<ArrayBuffer> {
  const len = Math.floor(2 * sr)
  const d = new Float32Array(len)
  const beat = 0.5
  const s = beat / 2
  // A1 A1 A2 E2 . G1 A1 . (times in eighths) — roots & fifths of Am
  const hits: [number, number][] = [
    [0, 55],
    [s, 55],
    [s * 2, 110],
    [s * 3, 82.41],
    [s * 5, 49],
    [s * 6, 55],
    [beat * 4 - s, 65.41],
  ].map(([t, f]) => [t + 0, f]) as [number, number][]
  // repeat for 2 bars
  for (let bar = 0; bar < 1; bar++) {
    for (const [t0, f] of hits) {
      const start = Math.floor((t0 + bar * beat * 4) * sr)
      for (let i = 0; i + start < len && i < sr * 0.45; i++) {
        const t = i / sr
        const env = Math.min(1, t / 0.005) * Math.exp(-5 * t)
        const sig = Math.sin(2 * Math.PI * f * t) + 0.25 * naiveSaw((f * t) % 1)
        d[start + i] += sig * env * 0.7
      }
    }
  }
  return d
}

// --- chords: Am – F – C – G progression, detuned saws through a soft LP ---
function chordsLoop(sr: number): Float32Array<ArrayBuffer> {
  const len = Math.floor(4 * sr)
  const d = new Float32Array(len)
  const prog = [
    [220, 261.63, 329.63], // Am
    [174.61, 220, 261.63], // F
    [261.63, 329.63, 392], // C
    [196, 246.94, 293.66], // G
  ]
  const detunes = [-5, 5]
  let lp = 0
  for (let i = 0; i < len; i++) {
    const t = i / sr
    const chord = prog[Math.min(3, Math.floor(t / 1))]
    let v = 0
    for (const f of chord) for (const dt of detunes) v += naiveSaw((f * Math.pow(2, dt / 1200) * t) % 1)
    v /= chord.length * detunes.length
    lp += 0.06 * (v - lp)
    // gentle per-chord swell
    const local = t % 1
    const env = Math.min(1, local / 0.05) * (1 - 0.3 * local)
    d[i] = lp * env * 0.7
  }
  return d
}

// --- arp: Am arpeggio in plucky sixteenths --------------------------------
function arpLoop(sr: number): Float32Array<ArrayBuffer> {
  const len = Math.floor(2 * sr)
  const d = new Float32Array(len)
  const seq = [220, 261.63, 329.63, 440, 329.63, 261.63] // A C E A E C
  const step = 2 / 16
  for (let n = 0; n < 16; n++) {
    const f = seq[n % seq.length]
    const start = Math.floor(n * step * sr)
    for (let i = 0; i < Math.floor(step * 1.4 * sr) && start + i < len; i++) {
      const t = i / sr
      const env = Math.min(1, t / 0.004) * Math.exp(-9 * t)
      const sig = Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * 2 * f * t)
      d[start + i] += sig * env * 0.5
    }
  }
  return d
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
  // A flowing A-minor line; notes overlap (legato) and ring into a soft tail.
  const seq = [220, 261.63, 329.63, 440, 392, 329.63, 293.66, 261.63] // A3 C4 E4 A4 G4 E4 D4 C4
  const step = 2 / seq.length // 0.25 s between note starts
  const ring = step * 1.6 // each note rings a bit past the next
  for (let n = 0; n < seq.length; n++) {
    const f = seq[n]
    const start = Math.floor(n * step * sr)
    const dur = Math.floor(ring * sr)
    for (let i = 0; i < dur && start + i < len; i++) {
      const t = i / sr
      const env = Math.min(1, t / 0.006) * Math.exp(-3.2 * t) // pluck → decay
      // warm tone: fundamental + softer 2nd/3rd harmonics
      const s =
        Math.sin(2 * Math.PI * f * t) +
        0.4 * Math.sin(2 * Math.PI * 2 * f * t) +
        0.18 * Math.sin(2 * Math.PI * 3 * f * t)
      d[start + i] += s * env * 0.5
    }
  }
  return d
}

// Normalize a loop to a consistent, safe peak so every source sits at a similar
// level under the master (no surprises / clipping).
function normalize(d: Float32Array<ArrayBuffer>, target = 0.8): Float32Array<ArrayBuffer> {
  let peak = 0
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]))
  if (peak > 1e-6) {
    const g = target / peak
    for (let i = 0; i < d.length; i++) d[i] *= g
  }
  return d
}

const GENERATORS: Record<LoopName, (sr: number) => Float32Array<ArrayBuffer>> = {
  drum: drumLoop,
  breakbeat: breakbeatLoop,
  bass: bassLoop,
  pad: padLoop,
  chords: chordsLoop,
  melodic: melodicLoop,
  arp: arpLoop,
}

function getLoopData(name: LoopName, sr: number): Float32Array<ArrayBuffer> {
  const key = `${name}@${sr}`
  let data = cache.get(key)
  if (!data) {
    data = normalize((GENERATORS[name] ?? drumLoop)(sr))
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
