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

export interface SourceInstance {
  output: AudioNode
  start(when?: number): void
  stop(when?: number): void
  dispose(): void
}

export const DEFAULT_OSC: OscConfig = {
  kind: 'oscillator',
  wave: 'sawtooth',
  freq: 220,
  level: 0.5,
  attack: 0.005,
  decay: 0.1,
  sustain: 0.7,
  release: 0.2,
  mode: 'drone',
}
