import { SourceBar } from './ui/SourceBar'
import { Transport } from './ui/Transport'
import { Visualizer } from './ui/Visualizer'
import { Chain } from './ui/Chain'
import { InfoDrawer } from './ui/InfoDrawer'
import { RecipeBar } from './ui/RecipeBar'
import { TooltipLayer } from './ui/TooltipLayer'
import { useStore } from './state/store'

export default function App() {
  const openInfo = useStore((s) => s.openInfo)
  return (
    <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-5 p-5">
      <header className="flex items-baseline gap-3">
        <h1 className="font-mono text-2xl font-bold tracking-tight text-mint">VizE</h1>
        <p className="text-sm text-cream/60">hear &amp; see what audio effects do</p>
        <button
          onClick={() => openInfo(null)}
          className="ml-auto rounded-control bg-outline/60 px-3 py-1 font-mono text-xs uppercase tracking-wide text-cream/70 ring-1 ring-grid hover:text-cream"
        >
          ⓘ Guide
        </button>
      </header>

      <div className="flex flex-wrap items-stretch gap-4">
        <Transport />
        <div className="min-w-[20rem] flex-1">
          <SourceBar />
        </div>
      </div>

      <RecipeBar />
      <Visualizer />
      <Chain />
      <InfoDrawer />
      <TooltipLayer />
    </div>
  )
}
