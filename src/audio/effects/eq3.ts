import type { EffectDef, EffectInstance, ParamValue } from './types'

// EQ3 — three biquads in series: lowshelf@150 → peaking(mid) → highshelf@4k
// (PRD §4.4). Verify against fx_eq: the spectrum tilts/bends without slicing.
export const eq3: EffectDef = {
  id: 'eq3',
  name: 'EQ (3-band)',
  ableton: 'EQ Three/Eight',
  colorToken: 'stage-eq',
  params: [
    { id: 'low', label: 'Low', type: 'float', min: -18, max: 18, step: 0.1, default: -14, unit: 'dB' },
    { id: 'midFreq', label: 'Mid Freq', type: 'float', min: 200, max: 6000, default: 1000, unit: 'Hz', scale: 'log' },
    { id: 'midQ', label: 'Mid Q', type: 'float', min: 0.3, max: 3, step: 0.05, default: 1 },
    { id: 'mid', label: 'Mid', type: 'float', min: -18, max: 18, step: 0.1, default: 0, unit: 'dB' },
    { id: 'high', label: 'High', type: 'float', min: -18, max: 18, step: 0.1, default: 8, unit: 'dB' },
  ],
  build(ctx): EffectInstance {
    const low = ctx.createBiquadFilter()
    low.type = 'lowshelf'
    low.frequency.value = 150
    low.gain.value = -14

    const mid = ctx.createBiquadFilter()
    mid.type = 'peaking'
    mid.frequency.value = 1000
    mid.Q.value = 1
    mid.gain.value = 0

    const high = ctx.createBiquadFilter()
    high.type = 'highshelf'
    high.frequency.value = 4000
    high.gain.value = 8

    low.connect(mid)
    mid.connect(high)

    return {
      input: low,
      output: high,
      setParam(id: string, value: ParamValue) {
        const v = value as number
        switch (id) {
          case 'low':
            low.gain.value = v
            break
          case 'midFreq':
            mid.frequency.value = v
            break
          case 'midQ':
            mid.Q.value = v
            break
          case 'mid':
            mid.gain.value = v
            break
          case 'high':
            high.gain.value = v
            break
        }
      },
      dispose() {
        low.disconnect()
        mid.disconnect()
        high.disconnect()
      },
    }
  },
}
