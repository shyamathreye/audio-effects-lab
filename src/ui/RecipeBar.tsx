import { useStore } from '../state/store'
import { RECIPES } from '../guide/recipes'

// Learn-by-example: one click loads a curated source + chain, then shows a
// "what to observe" note pointing at the view that reveals the effect.
export function RecipeBar() {
  const loadRecipe = useStore((s) => s.loadRecipe)
  const recipeId = useStore((s) => s.recipeId)
  const note = useStore((s) => s.recipeNote)
  const dismiss = useStore((s) => s.dismissRecipeNote)

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-widest text-cream/60">Try a sound</span>
        {RECIPES.map((r) => (
          <button
            key={r.id}
            onClick={() => loadRecipe(r.id)}
            title={r.blurb}
            className={`flex items-center gap-1.5 rounded-control px-3 py-1 text-sm font-medium ring-1 transition-colors ${
              recipeId === r.id
                ? 'bg-teal text-cream ring-outline'
                : 'bg-chassis text-cream/80 ring-grid hover:bg-outline/60 hover:text-cream'
            }`}
          >
            <span aria-hidden>{r.icon}</span>
            {r.name}
          </button>
        ))}
      </div>

      {note && (
        <div className="flex items-start gap-3 rounded-control bg-lcd/10 px-3 py-2 ring-1 ring-lcd/30">
          <div className="flex-1 space-y-1 text-sm text-cream/85">
            <div className="font-semibold text-lcd">{note.name}</div>
            <p>
              <span className="font-mono text-[11px] uppercase tracking-wide text-teal">🔊 listen · </span>
              {note.listen}
            </p>
            <p>
              <span className="font-mono text-[11px] uppercase tracking-wide text-teal">👁 watch · </span>
              {note.watch}
            </p>
            <p>
              <span className="font-mono text-[11px] uppercase tracking-wide text-teal">🎛 tweak · </span>
              {note.tweak}
            </p>
          </div>
          <button onClick={dismiss} aria-label="Dismiss tip" className="font-mono text-sm text-cream/50 hover:text-cream">
            ✕
          </button>
        </div>
      )}
    </section>
  )
}
