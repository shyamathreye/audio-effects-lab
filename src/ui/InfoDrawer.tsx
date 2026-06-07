import { useStore } from '../state/store'
import { getEffectDef } from '../audio/effects'
import { EFFECT_GUIDE, PRIMERS } from '../guide/content'

// Slide-over learning guide (PRD Part 5). Shows the focused effect's explainer
// plus the general primers.
export function InfoDrawer() {
  const open = useStore((s) => s.infoOpen)
  const defId = useStore((s) => s.infoDefId)
  const close = useStore((s) => s.closeInfo)

  const def = defId ? getEffectDef(defId) : undefined
  const guide = defId ? EFFECT_GUIDE[defId] : undefined

  return (
    <>
      {/* backdrop */}
      <div
        onClick={close}
        aria-hidden={!open}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-label="Learning guide"
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-50 flex h-full w-[min(26rem,90vw)] flex-col gap-4 overflow-y-auto bg-chassis p-5 shadow-lift ring-1 ring-outline transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-lg font-bold text-mint">Learning guide</h2>
          <button
            onClick={close}
            aria-label="Close guide"
            className="rounded-control px-2 py-1 font-mono text-cream/70 ring-1 ring-grid hover:text-cream"
          >
            ✕
          </button>
        </div>

        {def && guide && (
          <section className="flex flex-col gap-3 rounded-panel bg-outline/40 p-4 ring-1 ring-outline">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: `var(--${def.colorToken})` }} />
              <h3 className="text-base font-semibold text-cream">{def.name}</h3>
              <span className="ml-auto font-mono text-[10px] text-cream/50">≈ {guide.ableton}</span>
            </div>
            <Field label="What it does" body={guide.what} />
            <Field label="What to watch" body={guide.watch} />
            <Field label="Try this" body={guide.try} />
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h3 className="font-mono text-xs uppercase tracking-widest text-lcd/70">Primers</h3>
          {PRIMERS.map((p) => (
            <Field key={p.title} label={p.title} body={p.body} />
          ))}
        </section>
      </aside>
    </>
  )
}

function Field({ label, body }: { label: string; body: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[10px] uppercase tracking-wide text-teal">{label}</span>
      <p className="text-sm leading-relaxed text-cream/85">{body}</p>
    </div>
  )
}
