import type { EffectDef, EffectInstance, ParamValue } from './types'
import { createImpulseResponse } from '../dsp/impulse'

// Reverb — ConvolverNode driven by a synthesized impulse response, with a
// dry/wet mix (PRD §4.4). Verify against fx_reverb: energy smears into a fading
// tail (spectrogram), highs damped faster than lows. The IR is rebuilt only when
// decay/predelay/damping change (not on every wet tweak).
//
//   input ─┬─ dry ─────────────┐
//          └─ convolver ─ wet ──┴─ output
export const reverb: EffectDef = {
  id: 'reverb',
  name: 'Reverb',
  ableton: 'Reverb/Hybrid',
  colorToken: 'stage-reverb',
  params: [
    { id: 'decay', label: 'Decay', type: 'float', min: 0.1, max: 4, step: 0.05, default: 1.3, unit: 's' },
    { id: 'predelay', label: 'Predelay', type: 'float', min: 0, max: 0.1, step: 0.001, default: 0.01, unit: 's' },
    { id: 'damping', label: 'Damping', type: 'float', min: 0, max: 1, step: 0.01, default: 0.3 },
    { id: 'wet', label: 'Mix', type: 'float', min: 0, max: 1, step: 0.01, default: 0.6 },
  ],
  build(ctx): EffectInstance {
    const input = ctx.createGain()
    const convolver = ctx.createConvolver()
    convolver.normalize = false
    const wet = ctx.createGain()
    const dry = ctx.createGain()
    const output = ctx.createGain()

    let decay = 1.3
    let predelay = 0.01
    let damping = 0.3
    const refreshIR = () => {
      convolver.buffer = createImpulseResponse(ctx, { decay, predelay, damping })
    }
    refreshIR()

    wet.gain.value = 0.6
    dry.gain.value = 0.4

    input.connect(dry)
    dry.connect(output)
    input.connect(convolver)
    convolver.connect(wet)
    wet.connect(output)

    return {
      input,
      output,
      setParam(id: string, value: ParamValue) {
        const v = value as number
        switch (id) {
          case 'decay':
            decay = v
            refreshIR()
            break
          case 'predelay':
            predelay = v
            refreshIR()
            break
          case 'damping':
            damping = v
            refreshIR()
            break
          case 'wet':
            wet.gain.value = v
            dry.gain.value = 1 - v
            break
        }
      },
      dispose() {
        input.disconnect()
        convolver.disconnect()
        wet.disconnect()
        dry.disconnect()
        output.disconnect()
      },
    }
  },
}
