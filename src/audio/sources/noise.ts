import type { NoiseConfig, SourceInstance } from './types'
import { clamp } from '../util'

// Noise source (PRD §4.5). White = uniform random; pink = white through a
// one-pole-ish filter cascade (Paul Kellet's approximation) for the −3 dB/oct
// tilt. Rendered into a looping buffer.
function fillWhite(data: Float32Array) {
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
}

function fillPink(data: Float32Array) {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.969 * b2 + white * 0.153852
    b3 = 0.8665 * b3 + white * 0.3104856
    b4 = 0.55 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.016898
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
    b6 = white * 0.115926
    data[i] = pink * 0.11
  }
}

export function createNoise(ctx: BaseAudioContext, cfg: NoiseConfig): SourceInstance {
  const seconds = 2
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  if (cfg.color === 'pink') fillPink(data)
  else fillWhite(data)

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
