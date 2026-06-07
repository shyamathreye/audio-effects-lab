import type { EffectDef, EffectInstance, ParamValue } from './types'
import { makeAbsCurve } from '../dsp/waveshaper'
import { clamp } from '../util'

const SENS_HZ = 3500 // max Hz the envelope can add to the base frequency

// Auto-Wah — a resonant band-pass filter whose cutoff is pushed up by the
// signal's own loudness (an envelope follower), so louder notes "open" brighter,
// the classic funky wah. Native envelope follower: rectify → smooth → scale →
// drive the filter frequency.
//
//   input ─ |x| ─ smooth(LP) ─ sens ─▶ bandpass.frequency
//   input ─┬─ dry ───────────────────┐
//          └─ bandpass ─ wet ──────────┴─ output
export const autowah: EffectDef = {
  id: 'autowah',
  name: 'Auto-Wah',
  ableton: 'Auto Filter (Envelope)',
  colorToken: 'stage-autowah',
  params: [
    { id: 'base', label: 'Base', type: 'float', min: 80, max: 2000, default: 350, unit: 'Hz', scale: 'log' },
    { id: 'sensitivity', label: 'Sensitivity', type: 'float', min: 0, max: 1, step: 0.01, default: 0.6 },
    { id: 'q', label: 'Q', type: 'float', min: 0.5, max: 15, step: 0.1, default: 4 },
    { id: 'wet', label: 'Mix', type: 'float', min: 0, max: 1, step: 0.01, default: 0.9 },
  ],
  build(ctx): EffectInstance {
    const input = ctx.createGain()
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 350
    bp.Q.value = 4

    // envelope follower: |x| → one-pole-ish low-pass smoothing → scale to Hz
    const rect = ctx.createWaveShaper()
    rect.curve = makeAbsCurve()
    const smooth = ctx.createBiquadFilter()
    smooth.type = 'lowpass'
    smooth.frequency.value = 12
    const sens = ctx.createGain()
    sens.gain.value = 0.6 * SENS_HZ

    input.connect(rect)
    rect.connect(smooth)
    smooth.connect(sens)
    sens.connect(bp.frequency) // adds to bp.frequency.value

    const wet = ctx.createGain()
    const dry = ctx.createGain()
    const output = ctx.createGain()
    wet.gain.value = 0.9
    dry.gain.value = 0.1

    input.connect(bp)
    bp.connect(wet)
    wet.connect(output)
    input.connect(dry)
    dry.connect(output)

    return {
      input,
      output,
      setParam(id, value: ParamValue) {
        const v = value as number
        switch (id) {
          case 'base':
            bp.frequency.value = clamp(v, 20, 20000)
            break
          case 'sensitivity':
            sens.gain.value = clamp(v, 0, 1) * SENS_HZ
            break
          case 'q':
            bp.Q.value = v
            break
          case 'wet':
            wet.gain.value = v
            dry.gain.value = 1 - v
            break
        }
      },
      dispose() {
        input.disconnect()
        bp.disconnect()
        rect.disconnect()
        smooth.disconnect()
        sens.disconnect()
        wet.disconnect()
        dry.disconnect()
        output.disconnect()
      },
    }
  },
}
