import type { EffectDef } from './types'
import { utility } from './utility'
import { filter } from './filter'
import { eq3 } from './eq3'
import { compressor } from './compressor'
import { distortion } from './distortion'
import { delay } from './delay'
import { reverb } from './reverb'
import { modulation } from './modulation'

// Effect registry — the full v1 set (PRD §1.2 / §4.4), ordered as in the PRD.
export const EFFECTS: EffectDef[] = [
  utility,
  filter,
  eq3,
  compressor,
  distortion,
  delay,
  reverb,
  modulation,
]

export const EFFECTS_BY_ID: Record<string, EffectDef> = Object.fromEntries(
  EFFECTS.map((e) => [e.id, e]),
)

export function getEffectDef(id: string): EffectDef | undefined {
  return EFFECTS_BY_ID[id]
}
