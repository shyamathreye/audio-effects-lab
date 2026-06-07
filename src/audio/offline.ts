import type { ChainEffect } from '../state/store'
import type { OscConfig } from './sources/types'
import { getEffectDef } from './effects'
import { clamp } from './util'

// Freeze rendering (PRD §4.3/§4.7): re-render the current source + chain through
// an OfflineAudioContext and capture each stage's signal as a static buffer, so
// the views can draw stable, comparable curves instead of jittery live frames.

export interface FrozenStage {
  id: string
  label: string
  colorVar: string
  bypassed: boolean
  data: Float32Array
}

export interface FrozenData {
  sr: number
  stages: FrozenStage[]
}

function makeOscSource(ctx: OfflineAudioContext, cfg: OscConfig): AudioNode {
  const osc = ctx.createOscillator()
  osc.type = cfg.wave
  osc.frequency.value = clamp(cfg.freq, 20, 20000)
  const g = ctx.createGain()
  const lvl = clamp(cfg.level, 0, 1)
  // tiny fade-in avoids a t=0 click; otherwise a steady drone for stable spectra
  g.gain.setValueAtTime(0, 0)
  g.gain.linearRampToValueAtTime(lvl, 0.01)
  osc.connect(g)
  osc.start(0)
  return g
}

async function renderPrefix(
  config: OscConfig,
  active: ChainEffect[],
  durSec: number,
  sr: number,
): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(1, Math.ceil(durSec * sr), sr)
  let node = makeOscSource(ctx, config)
  for (const e of active) {
    const def = getEffectDef(e.defId)
    if (!def) continue
    const fx = def.build(ctx)
    for (const [k, v] of Object.entries(e.params)) fx.setParam(k, v)
    node.connect(fx.input)
    node = fx.output
  }
  node.connect(ctx.destination)
  const rendered = await ctx.startRendering()
  return rendered.getChannelData(0).slice()
}

// Render dry + each effect's output. A stage's tap = the source through all
// non-bypassed effects up to and including that position (bypassed effects pass
// through, exactly as in the live graph).
export async function renderStages(
  config: OscConfig,
  chain: ChainEffect[],
  durSec = 1.6,
  sr = 44100,
): Promise<FrozenData> {
  const stages: FrozenStage[] = []

  const dry = await renderPrefix(config, [], durSec, sr)
  stages.push({ id: 'dry', label: 'Source', colorVar: '--stage-dry-on-black', bypassed: false, data: dry })

  for (let i = 0; i < chain.length; i++) {
    const def = getEffectDef(chain[i].defId)
    if (!def) continue
    const active = chain.slice(0, i + 1).filter((e) => !e.bypassed)
    const data = await renderPrefix(config, active, durSec, sr)
    stages.push({
      id: chain[i].instanceId,
      label: def.name,
      colorVar: `--${def.colorToken}`,
      bypassed: chain[i].bypassed,
      data,
    })
  }

  return { sr, stages }
}
