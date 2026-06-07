import type { EffectDef, EffectInstance, ParamValue } from './types'
import { clamp } from '../util'

// Bitcrusher (PRD §1.3 lead stretch) — the first AudioWorklet. Bit-depth and
// sample-rate reduction, with a dry/wet mix. Very visual: the waveform turns into
// stair-steps and the spectrum sprouts aliasing partials.
//
//   input ─┬─ dry ──────────────────────┐
//          └─ worklet ─ wet ─────────────┴─ output
//
// build() requires the 'bitcrusher' worklet module to already be registered on
// the context (see needsWorklet + ensureBitcrusherModule). If construction fails
// (module missing / unsupported), it degrades to a clean passthrough.
export const bitcrusher: EffectDef = {
  id: 'bitcrusher',
  name: 'Bitcrusher',
  ableton: 'Redux',
  colorToken: 'stage-bitcrusher',
  needsWorklet: true,
  params: [
    { id: 'bits', label: 'Bits', type: 'float', min: 1, max: 16, step: 1, default: 4 },
    { id: 'downsample', label: 'Downsample', type: 'float', min: 1, max: 50, step: 1, default: 10, unit: '×' },
    { id: 'wet', label: 'Mix', type: 'float', min: 0, max: 1, step: 0.01, default: 1 },
  ],
  build(ctx): EffectInstance {
    const input = ctx.createGain()
    const wet = ctx.createGain()
    const dry = ctx.createGain()
    const output = ctx.createGain()
    wet.gain.value = 1
    dry.gain.value = 0

    input.connect(dry)
    dry.connect(output)

    let node: AudioWorkletNode | null = null
    try {
      node = new AudioWorkletNode(ctx, 'bitcrusher')
      input.connect(node)
      node.connect(wet)
      wet.connect(output)
    } catch {
      // worklet unavailable → passthrough (dry at unity)
      input.connect(output)
    }

    return {
      input,
      output,
      setParam(id: string, value: ParamValue) {
        const v = value as number
        if (id === 'wet') {
          wet.gain.value = v
          dry.gain.value = 1 - v
          return
        }
        if (!node) return
        if (id === 'bits') {
          node.parameters.get('bits')!.value = clamp(v, 1, 16)
        } else if (id === 'downsample') {
          node.parameters.get('normFreq')!.value = clamp(1 / Math.max(1, v), 0.02, 1)
        }
      },
      dispose() {
        try {
          node?.disconnect()
          node?.port.close()
        } catch {
          /* noop */
        }
        input.disconnect()
        wet.disconnect()
        dry.disconnect()
        output.disconnect()
      },
    }
  },
}
