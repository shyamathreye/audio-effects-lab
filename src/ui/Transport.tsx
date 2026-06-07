import { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { useRafLoop } from '../viz/useRafLoop'
import { Knob } from './Knob'

// Transport: play/stop, master gain, and a clip LED that lights when the master
// bus peak exceeds 1.0 (PRD §2.4).
export function Transport() {
  const playing = useStore((s) => s.playing)
  const play = useStore((s) => s.play)
  const stop = useStore((s) => s.stop)
  const masterDb = useStore((s) => s.masterDb)
  const setMasterDb = useStore((s) => s.setMasterDb)
  const engine = useStore((s) => s.engine)

  const [clip, setClip] = useState(false)
  const clipUntil = useRef(0)

  useRafLoop(
    () => {
      const peak = engine.readMasterPeak()
      const now = performance.now()
      if (peak > 1) clipUntil.current = now + 600
      setClip(now < clipUntil.current)
    },
    playing,
  )

  useEffect(() => {
    if (!playing) setClip(false)
  }, [playing])

  return (
    <section className="flex items-center gap-5 rounded-panel bg-chassis px-4 py-3 ring-2 ring-outline">
      <button
        onClick={() => (playing ? stop() : play())}
        className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold text-cream ring-2 ring-outline transition-transform hover:scale-105 ${
          playing ? 'bg-red' : 'bg-mint'
        }`}
        aria-label={playing ? 'Stop' : 'Play'}
        data-tip={playing ? 'Stop playback' : 'Start playback (browsers need a click before any sound can play)'}
      >
        {playing ? '■' : '▶'}
      </button>

      <Knob
        label="Master"
        value={masterDb}
        min={-60}
        max={12}
        step={0.5}
        unit="dB"
        color="var(--red)"
        onChange={setMasterDb}
      />

      <div className="flex flex-col items-center gap-1" data-tip="Clip indicator: lights if the output peaks too hot. The master limiter prevents actual clipping/speaker damage, but it's a cue to pull levels down.">
        <span
          className="h-3 w-3 rounded-full ring-1 ring-outline"
          style={{ backgroundColor: clip ? 'var(--red)' : 'var(--grid)' }}
        />
        <span className="font-mono text-[10px] uppercase tracking-wide text-cream/60">Clip</span>
      </div>
    </section>
  )
}
