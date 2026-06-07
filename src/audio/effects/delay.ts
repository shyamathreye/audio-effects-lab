import type { EffectDef, EffectInstance, ParamValue } from './types'
import { clamp } from '../util'

// Delay — DelayNode with a feedback loop and a dry/wet mix (PRD §4.4). Verify
// against fx_delay: evenly spaced, fading repeats (recurring spectrogram
// stripes). Feedback is clamped < 0.95 so it can't run away.
//
//   input ─┬─ dry ───────────────┐
//          └─ delay ─┬─ wet ──────┴─ output
//                ▲   └─ feedback ─┘
export const delay: EffectDef = {
  id: 'delay',
  name: 'Delay',
  ableton: 'Delay/Echo',
  colorToken: 'stage-delay',
  params: [
    { id: 'time', label: 'Time', type: 'float', min: 0.001, max: 2, step: 0.001, default: 0.18, unit: 's', scale: 'log' },
    { id: 'feedback', label: 'Feedback', type: 'float', min: 0, max: 0.95, step: 0.01, default: 0.5 },
    { id: 'wet', label: 'Mix', type: 'float', min: 0, max: 1, step: 0.01, default: 0.6 },
  ],
  build(ctx): EffectInstance {
    const input = ctx.createGain()
    const delayNode = ctx.createDelay(2)
    delayNode.delayTime.value = 0.18
    const feedback = ctx.createGain()
    feedback.gain.value = 0.5
    const wet = ctx.createGain()
    const dry = ctx.createGain()
    const output = ctx.createGain()

    wet.gain.value = 0.6
    dry.gain.value = 0.4

    input.connect(dry)
    dry.connect(output)
    input.connect(delayNode)
    delayNode.connect(feedback)
    feedback.connect(delayNode)
    delayNode.connect(wet)
    wet.connect(output)

    return {
      input,
      output,
      setParam(id: string, value: ParamValue) {
        const v = value as number
        switch (id) {
          case 'time':
            delayNode.delayTime.value = clamp(v, 0.001, 2)
            break
          case 'feedback':
            feedback.gain.value = clamp(v, 0, 0.95)
            break
          case 'wet':
            wet.gain.value = v
            dry.gain.value = 1 - v
            break
        }
      },
      dispose() {
        input.disconnect()
        delayNode.disconnect()
        feedback.disconnect()
        wet.disconnect()
        dry.disconnect()
        output.disconnect()
      },
    }
  },
}
