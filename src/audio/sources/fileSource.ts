import type { SourceInstance } from './types'
import { clamp } from '../util'

// File source (PRD §4.5): play a decoded AudioBuffer on a loop. Web Audio upmixes
// mono buffers automatically; any sample rate is resampled to the context rate.
export function createFileSource(
  ctx: BaseAudioContext,
  buffer: AudioBuffer,
  level: number,
): SourceInstance {
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  const amp = ctx.createGain()
  amp.gain.value = clamp(level, 0, 1)
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
