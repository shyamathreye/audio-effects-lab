import { useStore } from '../state/store'
import type { ViewKind, VizLayout } from '../state/store'
import { Waveform } from '../viz/Waveform'
import { OverlayWaveform } from '../viz/OverlayWaveform'
import { Spectrum } from '../viz/Spectrum'
import { Spectrogram } from '../viz/Spectrogram'
import { FrozenCanvas } from '../viz/FrozenCanvas'
import { drawFrozenWaveform, drawFrozenSpectrum, drawFrozenSpectrogram } from '../viz/frozenDraw'
import { stageRefs } from '../viz/stages'
import type { StageRef } from '../viz/stages'
import type { FrozenStage } from '../audio/offline'

const VIEWS: { id: ViewKind; label: string }[] = [
  { id: 'waveform', label: 'Waveform' },
  { id: 'spectrum', label: 'Spectrum' },
  { id: 'spectrogram', label: 'Spectrogram' },
]
const LAYOUTS: { id: VizLayout; label: string }[] = [
  { id: 'combined', label: 'Combined' },
  { id: 'individual', label: 'Individual' },
]

// The big LCD screen (§2A): three views × two layouts × Live/Freeze. Live reads
// AnalyserNodes each frame; Freeze draws stable curves from an offline render.
export function Visualizer() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const layout = useStore((s) => s.vizLayout)
  const setVizLayout = useStore((s) => s.setVizLayout)
  const mode = useStore((s) => s.vizMode)
  const frozen = useStore((s) => s.frozen)
  const freezeId = useStore((s) => s.freezeId)
  const freezing = useStore((s) => s.freezing)
  const freeze = useStore((s) => s.freeze)
  const goLive = useStore((s) => s.goLive)
  const engine = useStore((s) => s.engine)
  const chain = useStore((s) => s.chain)

  const live = mode === 'live' || !frozen
  const liveStages = stageRefs(chain)
  const frozenStages = frozen?.stages ?? []
  const sr = live ? engine.ctx.sampleRate : (frozen?.sr ?? engine.ctx.sampleRate)
  const stages: (StageRef | FrozenStage)[] = live ? liveStages : frozenStages
  const getAnalyser = (id: string) => engine.getAnalyser(id)

  // ---- combined ------------------------------------------------------------
  const renderCombined = () => {
    if (live) {
      if (view === 'waveform') return <OverlayWaveform stages={liveStages} getAnalyser={getAnalyser} className="h-full w-full" />
      if (view === 'spectrum') return <Spectrum stages={liveStages} getAnalyser={getAnalyser} sampleRate={sr} className="h-full w-full" />
      return <Spectrogram getAnalyser={() => engine.getAnalyser('master')} sampleRate={sr} className="h-full w-full" />
    }
    if (view === 'waveform') return <FrozenCanvas redrawKey={freezeId} draw={(c, w, h) => drawFrozenWaveform(c, w, h, frozenStages, sr)} className="h-full w-full" />
    if (view === 'spectrum') return <FrozenCanvas redrawKey={freezeId} draw={(c, w, h) => drawFrozenSpectrum(c, w, h, frozenStages, sr)} className="h-full w-full" />
    const out = frozenStages[frozenStages.length - 1]
    return <FrozenCanvas redrawKey={freezeId} draw={(c, w, h) => out && drawFrozenSpectrogram(c, w, h, out, sr)} className="h-full w-full" />
  }

  // ---- individual (one scope per stage) ------------------------------------
  const renderStageScope = (s: StageRef | FrozenStage) => {
    if (live) {
      if (view === 'waveform') return <Waveform getAnalyser={() => getAnalyser(s.id)} colorVar={s.colorVar} className="h-full w-full" />
      if (view === 'spectrum') return <Spectrum stages={[s as StageRef]} getAnalyser={getAnalyser} sampleRate={sr} fill className="h-full w-full" />
      return <Spectrogram getAnalyser={() => getAnalyser(s.id)} sampleRate={sr} className="h-full w-full" />
    }
    const fs = s as FrozenStage
    if (view === 'waveform') return <FrozenCanvas redrawKey={freezeId} draw={(c, w, h) => drawFrozenWaveform(c, w, h, [fs], sr)} className="h-full w-full" />
    if (view === 'spectrum') return <FrozenCanvas redrawKey={freezeId} draw={(c, w, h) => drawFrozenSpectrum(c, w, h, [fs], sr, true)} className="h-full w-full" />
    return <FrozenCanvas redrawKey={freezeId} draw={(c, w, h) => drawFrozenSpectrogram(c, w, h, fs, sr)} className="h-full w-full" />
  }

  const tabClass = (on: boolean) =>
    `rounded-control px-3 py-1 font-mono text-xs uppercase tracking-wide transition-colors ${
      on ? 'bg-teal text-cream' : 'bg-outline/60 text-cream/60 hover:text-cream'
    }`

  return (
    <section className="flex flex-col gap-2 rounded-panel bg-chassis p-3 ring-2 ring-outline">
      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <button key={v.id} onClick={() => setView(v.id)} className={tabClass(view === v.id)}>
            {v.label}
          </button>
        ))}

        <div className="ml-2 flex overflow-hidden rounded-control ring-1 ring-outline">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              onClick={() => setVizLayout(l.id)}
              className={`px-3 py-1 font-mono text-xs uppercase tracking-wide transition-colors ${
                layout === l.id ? 'bg-coral text-cream' : 'bg-outline/60 text-cream/60 hover:text-cream'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Live / Freeze */}
        <div className="flex overflow-hidden rounded-control ring-1 ring-outline">
          <button
            onClick={goLive}
            className={`px-3 py-1 font-mono text-xs uppercase tracking-wide transition-colors ${
              live ? 'bg-mint text-chassis' : 'bg-outline/60 text-cream/60 hover:text-cream'
            }`}
          >
            Live
          </button>
          <button
            onClick={() => freeze()}
            disabled={freezing}
            title="Render the chain offline for a stable snapshot"
            className={`px-3 py-1 font-mono text-xs uppercase tracking-wide transition-colors ${
              !live ? 'bg-red text-cream' : 'bg-outline/60 text-cream/60 hover:text-cream'
            } ${freezing ? 'opacity-60' : ''}`}
          >
            {freezing ? '…' : 'Freeze'}
          </button>
        </div>

        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-lcd/70">
          {view === 'spectrogram' && layout === 'combined' ? 'output' : `${stages.length} ${stages.length === 1 ? 'stage' : 'stages'}`} · {live ? 'live' : 'frozen'}
        </span>
      </div>

      {layout === 'combined' ? (
        <>
          <div className="h-64 overflow-hidden rounded-control ring-2 ring-outline">{renderCombined()}</div>
          {view !== 'spectrogram' && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pt-1">
              {stages.map((s) => (
                <span key={s.id} className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: `var(${s.colorVar})`, opacity: s.bypassed ? 0.3 : 1 }} />
                  <span className={s.bypassed ? 'text-cream/40 line-through' : 'text-cream/80'}>{s.label}</span>
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex items-stretch gap-3 overflow-x-auto rounded-control bg-outline/30 p-2 ring-1 ring-outline">
          {stages.map((s) => (
            <div key={s.id} className={`flex w-56 shrink-0 flex-col rounded-control ring-1 ring-outline ${s.bypassed ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between rounded-t-control px-2 py-1" style={{ backgroundColor: `var(${s.colorVar})` }}>
                <span className="truncate text-xs font-semibold text-cream">{s.label}</span>
                {s.bypassed && <span className="font-mono text-[9px] text-cream/80">off</span>}
              </div>
              <div className="h-44 overflow-hidden rounded-b-control">{renderStageScope(s)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
