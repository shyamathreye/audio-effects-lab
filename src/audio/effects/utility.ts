import type { EffectDef, EffectInstance, ParamValue } from './types'
import { dbToGain } from '../util'

// Utility — level / pan / phase, no tone change (PRD §4.4, §5.2-1).
export const utility: EffectDef = {
  id: 'utility',
  name: 'Utility',
  ableton: 'Utility',
  colorToken: 'stage-utility',
  params: [
    { id: 'gain', label: 'Gain', type: 'float', min: -60, max: 12, step: 0.1, default: 6, unit: 'dB' },
    { id: 'pan', label: 'Pan', type: 'float', min: -1, max: 1, step: 0.01, default: 0 },
    { id: 'invert', label: 'Phase Invert', type: 'bool', default: false },
  ],
  build(ctx): EffectInstance {
    const input = ctx.createGain()
    const gain = ctx.createGain()
    const panner = ctx.createStereoPanner()
    let invert = false
    let gainDb = 6

    const applyGain = () => {
      gain.gain.value = dbToGain(gainDb) * (invert ? -1 : 1)
    }
    applyGain()

    input.connect(gain)
    gain.connect(panner)

    return {
      input,
      output: panner,
      setParam(id: string, value: ParamValue) {
        if (id === 'gain') {
          gainDb = value as number
          applyGain()
        } else if (id === 'pan') {
          panner.pan.value = value as number
        } else if (id === 'invert') {
          invert = value as boolean
          applyGain()
        }
      },
      dispose() {
        input.disconnect()
        gain.disconnect()
        panner.disconnect()
      },
    }
  },
}
