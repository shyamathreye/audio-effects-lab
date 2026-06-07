import { useStore } from '../state/store'
import type { ViewKind, VizLayout } from '../state/store'
import { Waveform } from '../viz/Waveform'
import { OverlayWaveform } from '../viz/OverlayWaveform'
import { EnvelopeWaveform } from '../viz/EnvelopeWaveform'
import { Spectrum } from '../viz/Spectrum'
import { Spectrogram } from '../viz/Spectrogram'
import { FrozenCanvas } from '../viz/FrozenCanvas'
import { drawFrozenWaveform, drawFrozenEnvelope, drawFrozenSpectrum, drawFrozenSpectrogram } from '../viz/frozenDraw'
import { ResponseGraph } from '../viz/ResponseGraph'
import type { RespStage } from '../viz/ResponseGraph'
import { stageRefs } from '../viz/stages'
import type { StageRef } from '../viz/stages'
import { getEffectDef } from '../audio/effects'
import type { FrozenStage } from '../audio/offline'

const VIEWS: { id: ViewKind; label: string }[] = [
  { id: 'waveform', label: 'Waveform' },
  { id: 'spectrum', label: 'Spectrum' },
  { id: 'spectrogram', label: 'Spectrogram' },
  { id: 'response', label: 'Response' },
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
  const timebase = useStore((s) => s.timebase)
  const setTimebase = useStore((s) => s.setTimebase)
  const waveSpan = useStore((s) => s.waveSpan)
  const zoomWave = useStore((s) => s.zoomWave)
  const mode = useStore((s) => s.vizMode)
  const frozen = useStore((s) => s.frozen)
  const freezeId = useStore((s) => s.freezeId)
  const freezing = useStore((s) => s.freezing)
  const freeze = useStore((s) => s.freeze)
  const goLive = useStore((s) => s.goLive)
  const engine = useStore((s) => s.engine)
  const chain = useStore((s) => s.chain)
  const playing = useStore((s) => s.playing)
  const source = useStore((s) => s.source)

  const live = mode === 'live' || !frozen
  const liveStages = stageRefs(chain)
  const frozenStages = frozen?.stages ?? []
  const sr = live ? engine.ctx.sampleRate : (frozen?.sr ?? engine.ctx.sampleRate)
  const stages: (StageRef | FrozenStage)[] = live ? liveStages : frozenStages
  const getAnalyser = (id: string) => engine.getAnalyser(id)
  const getWave = (id: string) => engine.getWaveAnalyser(id)

  // filter/EQ stages for the Response view (others don't have a static curve)
  const responseStages: RespStage[] = chain
    .map((c): RespStage | null => {
      const d = getEffectDef(c.defId)
      if (!d || (d.id !== 'filter' && d.id !== 'eq3')) return null
      return {
        id: c.instanceId,
        colorVar: `--${d.colorToken}`,
        label: d.name,
        markers:
          d.id === 'eq3'
            ? [
                { freq: 150, label: 'Low' },
                { freq: c.params.midFreq as number, label: 'Mid' },
                { freq: 4000, label: 'High' },
              ]
            : undefined,
      }
    })
    .filter((x): x is RespStage => !!x)

  // ---- combined ------------------------------------------------------------
  const envelope = timebase === 'envelope'
  const renderCombined = () => {
    if (live) {
      if (view === 'waveform')
        return envelope ? (
          <EnvelopeWaveform stages={liveStages} getAnalyser={getAnalyser} active={playing} className="h-full w-full" />
        ) : (
          <OverlayWaveform stages={liveStages} getAnalyser={getWave} spanSec={waveSpan} active={playing} className="h-full w-full" />
        )
      if (view === 'spectrum') return <Spectrum stages={liveStages} getAnalyser={getAnalyser} sampleRate={sr} active={playing} className="h-full w-full" />
      return <Spectrogram getAnalyser={() => engine.getAnalyser('master')} sampleRate={sr} active={playing} className="h-full w-full" />
    }
    if (view === 'waveform')
      return (
        <FrozenCanvas
          redrawKey={`${freezeId}:${timebase}:${waveSpan}`}
          draw={(c, w, h) => (envelope ? drawFrozenEnvelope(c, w, h, frozenStages, sr) : drawFrozenWaveform(c, w, h, frozenStages, sr, waveSpan))}
          className="h-full w-full"
        />
      )
    if (view === 'spectrum') return <FrozenCanvas redrawKey={freezeId} draw={(c, w, h) => drawFrozenSpectrum(c, w, h, frozenStages, sr)} className="h-full w-full" />
    const out = frozenStages[frozenStages.length - 1]
    return <FrozenCanvas redrawKey={freezeId} draw={(c, w, h) => out && drawFrozenSpectrogram(c, w, h, out, sr)} className="h-full w-full" />
  }

  // ---- individual (one scope per stage) ------------------------------------
  const renderStageScope = (s: StageRef | FrozenStage) => {
    if (live) {
      if (view === 'waveform')
        return envelope ? (
          <EnvelopeWaveform stages={[s as StageRef]} getAnalyser={getAnalyser} active={playing} className="h-full w-full" />
        ) : (
          <Waveform getAnalyser={() => getWave(s.id)} colorVar={s.colorVar} spanSec={waveSpan} active={playing} className="h-full w-full" />
        )
      if (view === 'spectrum') return <Spectrum stages={[s as StageRef]} getAnalyser={getAnalyser} sampleRate={sr} fill active={playing} className="h-full w-full" />
      return <Spectrogram getAnalyser={() => getAnalyser(s.id)} sampleRate={sr} active={playing} className="h-full w-full" />
    }
    const fs = s as FrozenStage
    if (view === 'waveform')
      return (
        <FrozenCanvas
          redrawKey={`${freezeId}:${timebase}`}
          draw={(c, w, h) => (envelope ? drawFrozenEnvelope(c, w, h, [fs], sr) : drawFrozenWaveform(c, w, h, [fs], sr))}
          className="h-full w-full"
        />
      )
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

        {view !== 'response' && (
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
        )}

        {/* Wave / Envelope timebase — only meaningful for the waveform view */}
        {view === 'waveform' && (
          <div className="flex overflow-hidden rounded-control ring-1 ring-outline">
            {([{ id: 'wave', label: 'Wave' }, { id: 'envelope', label: 'Envelope' }] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTimebase(t.id)}
                title={t.id === 'envelope' ? 'Long timebase — see delay repeats & reverb tails' : 'Short window — see the wave shape'}
                className={`px-3 py-1 font-mono text-xs uppercase tracking-wide transition-colors ${
                  timebase === t.id ? 'bg-coral text-cream' : 'bg-outline/60 text-cream/60 hover:text-cream'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Zoom (Wave timebase only) */}
        {view === 'waveform' && timebase === 'wave' && (
          <div className="flex items-center overflow-hidden rounded-control ring-1 ring-outline">
            <button onClick={() => zoomWave(-1)} title="Zoom in (shorter window)" className="px-2 py-1 font-mono text-xs text-cream/70 hover:bg-outline/60 hover:text-cream">
              −
            </button>
            <span className="px-1 font-mono text-[10px] tabular-nums text-lcd/80">
              {waveSpan < 0.1 ? `${Math.round(waveSpan * 1000)}ms` : `${waveSpan.toFixed(2)}s`}
            </span>
            <button onClick={() => zoomWave(1)} title="Zoom out (longer window)" className="px-2 py-1 font-mono text-xs text-cream/70 hover:bg-outline/60 hover:text-cream">
              +
            </button>
          </div>
        )}

        {/* Live / Freeze */}
        {view !== 'response' && (
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
        )}

        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-lcd/70">
          {view === 'response'
            ? `${responseStages.length} filter/eq · live`
            : `${view === 'spectrogram' && layout === 'combined' ? 'output' : `${stages.length} ${stages.length === 1 ? 'stage' : 'stages'}`} · ${live ? 'live' : 'frozen'}`}
        </span>
      </div>

      {view === 'response' ? (
        <>
          <div className="h-64 overflow-hidden rounded-control ring-2 ring-outline">
            {responseStages.length > 0 ? (
              <ResponseGraph
                stages={responseStages}
                getResponse={(id, freqs) => engine.getEffectInstance(id)?.getFrequencyResponse?.(freqs) ?? null}
                getInputAnalyser={() => engine.getAnalyser('dry')}
                sampleRate={engine.ctx.sampleRate}
                active={playing}
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-8 text-center font-mono text-sm text-cream/40">
                Add a Filter or EQ to see the chain's combined frequency response.
              </div>
            )}
          </div>
          {responseStages.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pt-1">
              {responseStages.map((s) => (
                <span key={s.id} className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: `var(${s.colorVar})` }} />
                  <span className="text-cream/80">{s.label}</span>
                </span>
              ))}
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-cream" />
                <span className="text-cream/80">Combined</span>
              </span>
            </div>
          )}
        </>
      ) : layout === 'combined' ? (
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

      {view === 'waveform' && envelope && source.kind === 'oscillator' && source.mode === 'drone' && (
        <p className="px-1 font-mono text-[10px] text-cream/45">
          tip: a steady drone has a flat envelope — switch the source to Pluck, a Loop, or a file to see delay repeats &amp; reverb tails over time.
        </p>
      )}
    </section>
  )
}
