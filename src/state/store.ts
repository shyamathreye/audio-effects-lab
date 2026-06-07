import { create } from 'zustand'
import { AudioEngine } from '../audio/AudioEngine'
import { getEffectDef } from '../audio/effects'
import { defaultParams } from '../audio/effects/types'
import type { ParamValue } from '../audio/effects/types'
import { DEFAULT_OSC } from '../audio/sources/types'
import type { OscConfig } from '../audio/sources/types'

export interface ChainEffect {
  instanceId: string
  defId: string
  params: Record<string, ParamValue>
  bypassed: boolean
}

export type ViewKind = 'waveform' | 'spectrum' | 'spectrogram'

let instanceCounter = 0
const nextId = (defId: string) => `${defId}-${++instanceCounter}`

// The engine lives outside React state (it holds live audio nodes); the store
// holds the declarative mirror and forwards every change to the engine.
const engine = new AudioEngine()
engine.setSourceConfig(DEFAULT_OSC)

interface AppState {
  engine: AudioEngine
  playing: boolean
  source: OscConfig
  masterDb: number
  chain: ChainEffect[]
  view: ViewKind

  play: () => Promise<void>
  stop: () => void
  setSource: (patch: Partial<OscConfig>) => void
  setMasterDb: (db: number) => void

  addEffect: (defId: string) => void
  removeEffect: (instanceId: string) => void
  reorder: (orderedIds: string[]) => void
  toggleBypass: (instanceId: string) => void
  setParam: (instanceId: string, paramId: string, value: ParamValue) => void

  setView: (view: ViewKind) => void
}

export const useStore = create<AppState>((set, get) => ({
  engine,
  playing: false,
  source: DEFAULT_OSC,
  masterDb: 0,
  chain: [],
  view: 'waveform',

  async play() {
    await engine.play()
    set({ playing: true })
  },
  stop() {
    engine.stop()
    set({ playing: false })
  },
  setSource(patch) {
    const source = { ...get().source, ...patch }
    engine.setSourceConfig(source)
    set({ source })
  },
  setMasterDb(db) {
    engine.setMasterGainDb(db)
    set({ masterDb: db })
  },

  addEffect(defId) {
    const def = getEffectDef(defId)
    if (!def) return
    const instanceId = nextId(defId)
    const params = defaultParams(def)
    engine.addEffect(instanceId, def)
    // Push defaults into the freshly built instance.
    for (const [k, v] of Object.entries(params)) {
      engine.setEffectParam(instanceId, k, v)
    }
    set((s) => ({
      chain: [...s.chain, { instanceId, defId, params, bypassed: false }],
    }))
  },
  removeEffect(instanceId) {
    engine.removeEffect(instanceId)
    set((s) => ({ chain: s.chain.filter((e) => e.instanceId !== instanceId) }))
  },
  reorder(orderedIds) {
    engine.reorderEffects(orderedIds)
    set((s) => {
      const byId = new Map(s.chain.map((e) => [e.instanceId, e]))
      const chain = orderedIds
        .map((id) => byId.get(id))
        .filter((e): e is ChainEffect => !!e)
      return { chain }
    })
  },
  toggleBypass(instanceId) {
    set((s) => {
      const chain = s.chain.map((e) => {
        if (e.instanceId !== instanceId) return e
        const bypassed = !e.bypassed
        engine.setBypass(instanceId, bypassed)
        return { ...e, bypassed }
      })
      return { chain }
    })
  },
  setParam(instanceId, paramId, value) {
    engine.setEffectParam(instanceId, paramId, value)
    set((s) => ({
      chain: s.chain.map((e) =>
        e.instanceId === instanceId
          ? { ...e, params: { ...e.params, [paramId]: value } }
          : e,
      ),
    }))
  },

  setView(view) {
    set({ view })
  },
}))

// Dev-only handle for debugging / automated verification in the browser console.
if (import.meta.env.DEV) {
  ;(window as unknown as { __vize?: unknown }).__vize = { useStore, engine }
}
