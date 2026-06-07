import type { ChainEffect } from '../state/store'
import { getEffectDef } from '../audio/effects'

// A visualizable tap point: the dry source plus each effect's output, in chain
// order. Used by both the combined overlay and the individual per-stage scopes.
export interface StageRef {
  /** Analyser id understood by AudioEngine.getAnalyser ('dry' | instanceId). */
  id: string
  /** CSS variable for this stage's hue (§2A.2). */
  colorVar: string
  label: string
  bypassed: boolean
}

export function stageRefs(chain: ChainEffect[]): StageRef[] {
  const stages: StageRef[] = [
    { id: 'dry', colorVar: '--stage-dry-on-black', label: 'Source', bypassed: false },
  ]
  for (const fx of chain) {
    const def = getEffectDef(fx.defId)
    if (!def) continue
    stages.push({
      id: fx.instanceId,
      colorVar: `--${def.colorToken}`,
      label: def.name,
      bypassed: fx.bypassed,
    })
  }
  return stages
}
