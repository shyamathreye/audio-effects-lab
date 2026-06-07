import { create } from 'zustand'
import { AudioEngine } from '../audio/AudioEngine'
import { getEffectDef } from '../audio/effects'
import { defaultParams } from '../audio/effects/types'
import type { ParamValue } from '../audio/effects/types'
import { DEFAULT_OSC, DEFAULT_NOISE, DEFAULT_LOOP } from '../audio/sources/types'
import type { SourceConfig, SourceKind, SourcePatch } from '../audio/sources/types'
import { renderStages } from '../audio/offline'
import type { FrozenData } from '../audio/offline'
import { RECIPES } from '../guide/recipes'

export interface ChainEffect {
  instanceId: string
  defId: string
  params: Record<string, ParamValue>
  bypassed: boolean
}

export type ViewKind = 'waveform' | 'spectrum' | 'spectrogram' | 'response'
export type VizLayout = 'combined' | 'individual'
export type VizMode = 'live' | 'freeze'
/** Waveform timebase: a short window (cycle shape) vs a long amplitude envelope. */
export type Timebase = 'wave' | 'envelope'

let instanceCounter = 0
const nextId = (defId: string) => `${defId}-${++instanceCounter}`

// The engine lives outside React state (it holds live audio nodes); the store
// holds the declarative mirror and forwards every change to the engine.
const engine = new AudioEngine()
engine.setSourceConfig(DEFAULT_OSC)

interface AppState {
  engine: AudioEngine
  playing: boolean
  source: SourceConfig
  fileName: string | null
  fileError: string | null
  masterDb: number
  chain: ChainEffect[]
  view: ViewKind
  vizLayout: VizLayout
  timebase: Timebase
  /** Waveform (Wave mode) time window in seconds. */
  waveSpan: number
  vizMode: VizMode
  frozen: FrozenData | null
  /** bumped each freeze so frozen canvases redraw */
  freezeId: number
  freezing: boolean

  infoOpen: boolean
  /** which effect def the info drawer is focused on (null = primers only) */
  infoDefId: string | null

  /** active recipe id + its learning notes (null when none) */
  recipeId: string | null
  recipeNote: { name: string; listen: string; watch: string; tweak: string } | null

  play: () => Promise<void>
  stop: () => void
  /** Merge a partial patch into the current source config (same kind). */
  setSource: (patch: SourcePatch) => void
  /** Switch to a different source kind (with sensible defaults). */
  setSourceKind: (kind: SourceKind) => void
  loadFile: (file: File) => Promise<void>
  setMasterDb: (db: number) => void

  addEffect: (defId: string) => Promise<void>
  removeEffect: (instanceId: string) => void
  reorder: (orderedIds: string[]) => void
  toggleBypass: (instanceId: string) => void
  setParam: (instanceId: string, paramId: string, value: ParamValue) => void

  setView: (view: ViewKind) => void
  setVizLayout: (layout: VizLayout) => void
  setTimebase: (t: Timebase) => void
  /** dir > 0 zooms out (longer window), dir < 0 zooms in. */
  zoomWave: (dir: number) => void
  freeze: () => Promise<void>
  goLive: () => void
  openInfo: (defId: string | null) => void
  closeInfo: () => void
  loadRecipe: (recipeId: string) => Promise<void>
  dismissRecipeNote: () => void
}

export const useStore = create<AppState>((set, get) => ({
  engine,
  playing: false,
  source: DEFAULT_OSC,
  fileName: null,
  fileError: null,
  masterDb: 0,
  chain: [],
  view: 'waveform',
  vizLayout: 'combined',
  timebase: 'wave',
  waveSpan: 0.03,
  vizMode: 'live',
  frozen: null,
  freezeId: 0,
  freezing: false,
  infoOpen: false,
  infoDefId: null,
  recipeId: null,
  recipeNote: null,

  async play() {
    await engine.play()
    set({ playing: true })
  },
  stop() {
    engine.stop()
    set({ playing: false })
  },
  setSource(patch) {
    const source = { ...(get().source as unknown as Record<string, unknown>), ...patch } as SourceConfig
    engine.setSourceConfig(source)
    set({ source })
  },
  setSourceKind(kind) {
    const current = get().source
    if (current.kind === kind) return
    let source: SourceConfig
    switch (kind) {
      case 'oscillator':
        source = DEFAULT_OSC
        break
      case 'noise':
        source = DEFAULT_NOISE
        break
      case 'loop':
        source = DEFAULT_LOOP
        break
      case 'file':
        // requires a loaded file; ignore if none yet
        if (!engine.getFileBuffer()) {
          set({ fileError: 'Upload a file first.' })
          return
        }
        source = { kind: 'file', level: 0.9, fileName: get().fileName ?? 'audio' }
        break
    }
    engine.setSourceConfig(source)
    set({ source, fileError: null })
  },
  async loadFile(file) {
    try {
      const buf = await file.arrayBuffer()
      await engine.loadFile(buf, file.name)
      set({
        source: { kind: 'file', level: 0.9, fileName: file.name },
        fileName: file.name,
        fileError: null,
      })
    } catch {
      set({ fileError: `Could not decode "${file.name}". Try a WAV/MP3/OGG file.` })
    }
  },
  setMasterDb(db) {
    engine.setMasterGainDb(db)
    set({ masterDb: db })
  },

  async addEffect(defId) {
    const def = getEffectDef(defId)
    if (!def) return
    const instanceId = nextId(defId)
    const params = defaultParams(def)
    await engine.addEffect(instanceId, def)
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
  setVizLayout(layout) {
    set({ vizLayout: layout })
  },
  setTimebase(t) {
    set({ timebase: t })
  },
  zoomWave(dir) {
    set((s) => {
      const factor = dir > 0 ? 1.6 : 1 / 1.6
      const span = Math.min(1.5, Math.max(0.002, s.waveSpan * factor))
      return { waveSpan: span }
    })
  },
  async freeze() {
    const { source, chain } = get()
    set({ freezing: true })
    try {
      const frozen = await renderStages(source, chain, engine.getFileBuffer())
      set((s) => ({ frozen, vizMode: 'freeze', freezeId: s.freezeId + 1, freezing: false }))
    } catch {
      set({ freezing: false })
    }
  },
  goLive() {
    set({ vizMode: 'live' })
  },
  openInfo(defId) {
    set({ infoOpen: true, infoDefId: defId })
  },
  closeInfo() {
    set({ infoOpen: false })
  },
  async loadRecipe(recipeId) {
    const r = RECIPES.find((x) => x.id === recipeId)
    if (!r) return
    // reset master to a clean, safe level so every recipe plays as intended
    engine.setMasterGainDb(0)
    set({ masterDb: 0 })
    // source
    engine.setSourceConfig(r.source)
    set({ source: r.source, fileName: r.source.kind === 'file' ? get().fileName : null, fileError: null })
    // clear existing chain
    for (const e of get().chain) engine.removeEffect(e.instanceId)
    // build the recipe chain
    const chain: ChainEffect[] = []
    for (const step of r.chain) {
      const def = getEffectDef(step.defId)
      if (!def) continue
      const instanceId = nextId(step.defId)
      const params = { ...defaultParams(def), ...(step.params ?? {}) }
      await engine.addEffect(instanceId, def)
      for (const [k, v] of Object.entries(params)) engine.setEffectParam(instanceId, k, v)
      chain.push({ instanceId, defId: step.defId, params, bypassed: false })
    }
    set({
      chain,
      recipeId,
      view: r.view,
      recipeNote: { name: r.name, listen: r.listen, watch: r.watch, tweak: r.tweak },
    })
    await engine.play()
    set({ playing: true })
  },
  dismissRecipeNote() {
    set({ recipeNote: null })
  },
}))

// Dev-only handle for debugging / automated verification in the browser console.
if (import.meta.env.DEV) {
  ;(window as unknown as { __vize?: unknown }).__vize = {
    useStore,
    engine,
    runEffectFixtures: () =>
      import('../fixtures/effectFixtures').then((m) => m.runEffectFixtures()),
  }
}
