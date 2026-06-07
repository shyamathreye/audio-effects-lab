import type { EffectInstance } from './effects/types'

// Tap = a unity GainNode that fans to (a) the next stage and (b) an AnalyserNode
// for that stage's color (PRD §4.3). Taps persist across reorders.
export interface Tap {
  node: GainNode
  /** Spectrum / spectrogram analyser (moderate fftSize → good time resolution). */
  analyser: AnalyserNode
  /** Time-domain analyser with a long buffer so the waveform can zoom out far. */
  waveAnalyser: AnalyserNode
}

export function createTap(ctx: BaseAudioContext, fftSize = 2048): Tap {
  const node = ctx.createGain()
  node.gain.value = 1
  const analyser = ctx.createAnalyser()
  analyser.fftSize = fftSize
  analyser.smoothingTimeConstant = 0.6
  // Separate analyser for the oscilloscope: 32768 samples ≈ 0.74 s at 44.1 kHz,
  // enough to see a 180 ms delay's echoes live. Kept distinct so the spectrogram
  // keeps its short-FFT time resolution.
  const waveAnalyser = ctx.createAnalyser()
  waveAnalyser.fftSize = 32768
  return { node, analyser, waveAnalyser }
}

// A runtime effect couples an EffectInstance with its output tap. The tap moves
// with the effect on reorder so its analyser always shows that effect's output.
export interface RuntimeEffect {
  id: string
  instance: EffectInstance
  tap: Tap
  bypassed: boolean
}

export interface ChainEndpoints {
  /** Output of the source (or null when no source is playing). */
  sourceOut: AudioNode | null
  dryTap: Tap
  effects: RuntimeEffect[]
  /** Final node feeding master; ramped to mute during structural rewires. */
  outputGain: GainNode
}

const CROSSFADE = 0.006 // 6 ms (PRD R5)

// Rebuild the forward signal path. We fully disconnect every node that carries a
// forward edge, then reconnect in order — re-adding analyser edges each time
// (cheap, and avoids tracking individual edges). A short mute on `outputGain`
// makes structural changes click-free.
export function rewireChain(ep: ChainEndpoints): void {
  const { dryTap, effects, outputGain, sourceOut } = ep

  // Clear all forward edges (analyser edges get cleared too, re-added below).
  sourceOut?.disconnect()
  dryTap.node.disconnect()
  for (const fx of effects) {
    fx.tap.node.disconnect()
    try {
      fx.instance.output.disconnect()
    } catch {
      /* no outgoing edges */
    }
  }

  // Rebuild: source → dryTap → [fx | bypass] → … → outputGain.
  if (sourceOut) sourceOut.connect(dryTap.node)
  dryTap.node.connect(dryTap.analyser)
  dryTap.node.connect(dryTap.waveAnalyser)

  let cursor: AudioNode = dryTap.node
  for (const fx of effects) {
    if (fx.bypassed) {
      cursor.connect(fx.tap.node)
    } else {
      cursor.connect(fx.instance.input)
      fx.instance.output.connect(fx.tap.node)
    }
    fx.tap.node.connect(fx.tap.analyser)
    fx.tap.node.connect(fx.tap.waveAnalyser)
    cursor = fx.tap.node
  }
  cursor.connect(outputGain)
}

// Mute → rewire → unmute, so add/remove/reorder/bypass never click (PRD R5).
// Returns a promise that resolves once the graph is settled.
export function rewireWithCrossfade(
  ctx: BaseAudioContext,
  ep: ChainEndpoints,
): void {
  const g = ep.outputGain.gain
  const now = ctx.currentTime
  const settled = Math.max(g.value, 0.0001)
  g.cancelScheduledValues(now)
  g.setValueAtTime(settled, now)
  g.linearRampToValueAtTime(0.0001, now + CROSSFADE)

  // Offline contexts render synchronously — rewire immediately, no timers.
  const isOffline =
    typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext
  if (isOffline) {
    rewireChain(ep)
    return
  }

  window.setTimeout(() => {
    rewireChain(ep)
    const t = ctx.currentTime
    g.cancelScheduledValues(t)
    g.setValueAtTime(Math.max(g.value, 0.0001), t)
    g.linearRampToValueAtTime(1, t + CROSSFADE)
  }, 12)
}
