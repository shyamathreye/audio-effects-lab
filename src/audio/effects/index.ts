import type { EffectDef } from './types'
import { utility } from './utility'
import { filter } from './filter'

// Effect registry. M1 ships Utility + Filter; M2 adds EQ3, Compressor,
// Distortion, Delay, Reverb, Modulation (PRD §4.4 / build phases P3–P4).
export const EFFECTS: EffectDef[] = [utility, filter]

export const EFFECTS_BY_ID: Record<string, EffectDef> = Object.fromEntries(
  EFFECTS.map((e) => [e.id, e]),
)

export function getEffectDef(id: string): EffectDef | undefined {
  return EFFECTS_BY_ID[id]
}
