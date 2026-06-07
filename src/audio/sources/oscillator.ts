import type { OscConfig, SourceInstance } from './types'
import { clamp } from '../util'

// Oscillator source with an ADSR amp envelope (PRD §4.5). In "drone" mode the
// note is held; in "pluck" mode the envelope retriggers on a steady loop so a
// learner can hear the attack/decay shape repeatedly.
export function createOscillator(
  ctx: BaseAudioContext,
  cfg: OscConfig,
): SourceInstance {
  const osc = ctx.createOscillator()
  osc.type = cfg.wave
  osc.frequency.value = clamp(cfg.freq, 20, 20000)

  const amp = ctx.createGain()
  amp.gain.value = 0
  osc.connect(amp)

  const level = clamp(cfg.level, 0, 1)
  let retrigger: ReturnType<typeof setInterval> | null = null
  let started = false

  const envAttack = (t0: number) => {
    const g = amp.gain
    g.cancelScheduledValues(t0)
    g.setValueAtTime(Math.max(g.value, 0.0001), t0)
    g.linearRampToValueAtTime(level, t0 + cfg.attack)
    g.linearRampToValueAtTime(level * cfg.sustain, t0 + cfg.attack + cfg.decay)
  }

  const envRelease = (t0: number) => {
    const g = amp.gain
    g.cancelScheduledValues(t0)
    g.setValueAtTime(g.value, t0)
    g.linearRampToValueAtTime(0.0001, t0 + cfg.release)
  }

  return {
    output: amp,
    start(when = ctx.currentTime) {
      if (started) return
      started = true
      osc.start(when)
      if (cfg.mode === 'drone') {
        envAttack(when)
      } else {
        // Pluck: retrigger on an interval. Only meaningful for a live context.
        const period = Math.max(0.25, cfg.attack + cfg.decay + cfg.release + 0.3)
        const fire = () => {
          const t = ctx.currentTime
          envAttack(t)
          envRelease(t + cfg.attack + cfg.decay + 0.05)
        }
        fire()
        if ('createMediaElementSource' in ctx) {
          retrigger = setInterval(fire, period * 1000)
        }
      }
    },
    stop(when = ctx.currentTime) {
      if (!started) return
      if (retrigger) {
        clearInterval(retrigger)
        retrigger = null
      }
      envRelease(when)
      try {
        osc.stop(when + cfg.release + 0.05)
      } catch {
        /* already stopped */
      }
      started = false
    },
    dispose() {
      if (retrigger) clearInterval(retrigger)
      try {
        osc.stop()
      } catch {
        /* not started */
      }
      osc.disconnect()
      amp.disconnect()
    },
  }
}
