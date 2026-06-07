// Source contracts. A SourceInstance produces signal into `output`; start/stop
// control playback. Sources are rebuilt when the source kind/config changes.

export type OscWave = 'sine' | 'square' | 'sawtooth' | 'triangle'

export interface OscConfig {
  kind: 'oscillator'
  wave: OscWave
  freq: number // Hz
  level: number // 0..1
  // ADSR (seconds / 0..1), used on note re-trigger.
  attack: number
  decay: number
  sustain: number
  release: number
  /** drone = hold the note; pluck = retrigger ADSR on a loop. */
  mode: 'drone' | 'pluck'
}

export interface NoiseConfig {
  kind: 'noise'
  color: 'white' | 'pink'
  level: number
}

export type LoopName = 'drum' | 'pad' | 'melodic'

export interface LoopConfig {
  kind: 'loop'
  name: LoopName
  level: number
}

export interface FileConfig {
  kind: 'file'
  level: number
  /** display name of the uploaded file (the buffer itself lives in the engine) */
  fileName: string
}

export type SourceConfig = OscConfig | NoiseConfig | LoopConfig | FileConfig
export type SourceKind = SourceConfig['kind']

// A loose patch over any source field (the union's Partial only exposes the
// shared keys; this explicit shape allows kind-specific fields like `wave`).
export interface SourcePatch {
  wave?: OscWave
  freq?: number
  level?: number
  attack?: number
  decay?: number
  sustain?: number
  release?: number
  mode?: 'drone' | 'pluck'
  color?: 'white' | 'pink'
  name?: LoopName
  fileName?: string
}

export interface SourceInstance {
  output: AudioNode
  start(when?: number): void
  stop(when?: number): void
  dispose(): void
}

// Levels kept conservative so the master can sit at 0 dB without clipping; the
// master bus also has a limiter + safety clip as a backstop.
export const DEFAULT_OSC: OscConfig = {
  kind: 'oscillator',
  wave: 'sawtooth',
  freq: 220,
  level: 0.6,
  attack: 0.005,
  decay: 0.1,
  sustain: 0.7,
  release: 0.2,
  mode: 'drone',
}

export const DEFAULT_NOISE: NoiseConfig = { kind: 'noise', color: 'white', level: 0.45 }
export const DEFAULT_LOOP: LoopConfig = { kind: 'loop', name: 'drum', level: 0.7 }
