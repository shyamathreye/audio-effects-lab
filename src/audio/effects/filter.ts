import type { EffectDef, EffectInstance, ParamValue } from './types'
import { clamp } from '../util'

// Filter — a single BiquadFilterNode, all types (PRD §4.4). Verify against
// fx_filter: harmonics roll off above the cutoff; a low-pass rounds a saw.
export const filter: EffectDef = {
  id: 'filter',
  name: 'Filter',
  ableton: 'Auto Filter',
  colorToken: 'stage-filter',
  params: [
    {
      id: 'type',
      label: 'Type',
      type: 'enum',
      default: 'lowpass',
      options: [
        { value: 'lowpass', label: 'Low-pass' },
        { value: 'highpass', label: 'High-pass' },
        { value: 'bandpass', label: 'Band-pass' },
        { value: 'notch', label: 'Notch' },
        { value: 'peaking', label: 'Peaking' },
        { value: 'lowshelf', label: 'Low-shelf' },
        { value: 'highshelf', label: 'High-shelf' },
      ],
    },
    { id: 'cutoff', label: 'Cutoff', type: 'float', min: 20, max: 20000, default: 700, unit: 'Hz', scale: 'log' },
    { id: 'q', label: 'Q', type: 'float', min: 0.1, max: 18, step: 0.1, default: 5 },
    { id: 'gain', label: 'Gain', type: 'float', min: -24, max: 24, step: 0.1, default: 0, unit: 'dB', showWhen: { param: 'type', in: ['peaking', 'lowshelf', 'highshelf'] } },
  ],
  build(ctx): EffectInstance {
    const biquad = ctx.createBiquadFilter()
    biquad.type = 'lowpass'
    biquad.frequency.value = 700
    biquad.Q.value = 5
    biquad.gain.value = 0

    return {
      input: biquad,
      output: biquad,
      setParam(id: string, value: ParamValue) {
        if (id === 'type') {
          biquad.type = value as BiquadFilterType
        } else if (id === 'cutoff') {
          biquad.frequency.value = clamp(value as number, 20, 20000)
        } else if (id === 'q') {
          biquad.Q.value = value as number
        } else if (id === 'gain') {
          biquad.gain.value = value as number
        }
      },
      dispose() {
        biquad.disconnect()
      },
    }
  },
}
