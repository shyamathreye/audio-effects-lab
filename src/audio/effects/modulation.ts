import type { EffectDef, EffectInstance, ParamValue } from './types'
import { clamp } from '../util'

export type ModMode = 'chorus' | 'flanger' | 'phaser' | 'tremolo' | 'autopan'

// Modulation — one LFO backbone driving different targets (PRD §4.4, §5.2-8):
//   chorus/flanger → DelayNode.delayTime (flanger adds feedback)
//   phaser         → a stack of allpass filter frequencies
//   tremolo        → a GainNode.gain (amplitude)
//   autopan        → StereoPanner.pan
// Verify against fx_modulation (flanger): sweeping comb notches gliding across
// the spectrum. The LFO (±1) is added to each target's base value.
//
//   input ─┬─ dry ───────────────────────┐
//          └─ procIn ─[mode chain]─ wet ──┴─ output
//   lfo ─ depth ─▶ (target AudioParam(s), rebuilt per mode)
const PHASER_STAGES = 6

export const modulation: EffectDef = {
  id: 'modulation',
  name: 'Modulation',
  ableton: 'Chorus / Phaser-Flanger / Auto Pan',
  colorToken: 'stage-modulation',
  params: [
    {
      id: 'mode',
      label: 'Mode',
      type: 'enum',
      default: 'flanger',
      options: [
        { value: 'chorus', label: 'Chorus' },
        { value: 'flanger', label: 'Flanger' },
        { value: 'phaser', label: 'Phaser' },
        { value: 'tremolo', label: 'Tremolo' },
        { value: 'autopan', label: 'Auto-Pan' },
      ],
    },
    { id: 'rate', label: 'Rate', type: 'float', min: 0.05, max: 8, step: 0.01, default: 0.3, unit: 'Hz', scale: 'log' },
    { id: 'depth', label: 'Depth', type: 'float', min: 0, max: 1, step: 0.01, default: 0.6 },
    { id: 'feedback', label: 'Feedback', type: 'float', min: 0, max: 0.9, step: 0.01, default: 0.5, showWhen: { param: 'mode', in: ['flanger'] } },
    { id: 'wet', label: 'Mix', type: 'float', min: 0, max: 1, step: 0.01, default: 0.7 },
  ],
  build(ctx): EffectInstance {
    const input = ctx.createGain()
    const procIn = ctx.createGain()
    const wet = ctx.createGain()
    const dry = ctx.createGain()
    const output = ctx.createGain()

    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.3
    const depth = ctx.createGain()
    depth.gain.value = 0
    lfo.connect(depth)
    lfo.start()

    input.connect(dry)
    dry.connect(output)
    input.connect(procIn)
    wet.connect(output)

    let mode: ModMode = 'flanger'
    let rate = 0.3
    let depthAmt = 0.6
    let feedbackAmt = 0.5
    let wetAmt = 0.7

    // mode-specific nodes to tear down on rebuild
    let modeNodes: AudioNode[] = []

    const setMix = (w: number) => {
      wet.gain.value = w
      dry.gain.value = 1 - w
    }
    setMix(wetAmt)

    // (Re)build the processing chain + LFO routing for the current mode.
    const rebuild = () => {
      depth.disconnect()
      procIn.disconnect()
      for (const n of modeNodes) {
        try {
          n.disconnect()
        } catch {
          /* already detached */
        }
      }
      modeNodes = []

      if (mode === 'chorus' || mode === 'flanger') {
        const d = ctx.createDelay(0.1)
        const base = mode === 'chorus' ? 0.025 : 0.003
        const swing = (mode === 'chorus' ? 0.004 : 0.002) * depthAmt
        d.delayTime.value = base
        depth.gain.value = swing
        depth.connect(d.delayTime)
        procIn.connect(d)
        d.connect(wet)
        modeNodes = [d]
        if (mode === 'flanger') {
          const fb = ctx.createGain()
          fb.gain.value = feedbackAmt
          d.connect(fb)
          fb.connect(d)
          modeNodes.push(fb)
        }
      } else if (mode === 'phaser') {
        depth.gain.value = 700 * depthAmt
        let node: AudioNode = procIn
        for (let i = 0; i < PHASER_STAGES; i++) {
          const ap = ctx.createBiquadFilter()
          ap.type = 'allpass'
          ap.frequency.value = 800
          ap.Q.value = 0.7
          depth.connect(ap.frequency)
          node.connect(ap)
          node = ap
          modeNodes.push(ap)
        }
        node.connect(wet)
      } else if (mode === 'tremolo') {
        const g = ctx.createGain()
        g.gain.value = 1 - depthAmt * 0.5
        depth.gain.value = depthAmt * 0.5
        depth.connect(g.gain)
        procIn.connect(g)
        g.connect(wet)
        modeNodes = [g]
      } else {
        // autopan
        const pan = ctx.createStereoPanner()
        pan.pan.value = 0
        depth.gain.value = clamp(depthAmt, 0, 1)
        depth.connect(pan.pan)
        procIn.connect(pan)
        pan.connect(wet)
        modeNodes = [pan]
      }
    }
    rebuild()

    return {
      input,
      output,
      setParam(id: string, value: ParamValue) {
        switch (id) {
          case 'mode':
            mode = value as ModMode
            rebuild()
            break
          case 'rate':
            rate = value as number
            lfo.frequency.value = rate
            break
          case 'depth':
            depthAmt = value as number
            rebuild()
            break
          case 'feedback':
            feedbackAmt = value as number
            if (mode === 'flanger') rebuild()
            break
          case 'wet':
            wetAmt = value as number
            setMix(wetAmt)
            break
        }
      },
      dispose() {
        try {
          lfo.stop()
        } catch {
          /* not started */
        }
        lfo.disconnect()
        depth.disconnect()
        for (const n of modeNodes) n.disconnect()
        input.disconnect()
        procIn.disconnect()
        wet.disconnect()
        dry.disconnect()
        output.disconnect()
      },
    }
  },
}
