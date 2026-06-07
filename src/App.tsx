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
    <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-4 p-3 sm:gap-5 sm:p-5">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-mono text-2xl font-bold tracking-tight text-mint">VizE</h1>
        <p className="hidden text-sm text-cream/60 sm:block">hear &amp; see what audio effects do</p>
        <button
          onClick={() => openInfo(null)}
          className="ml-auto rounded-control bg-outline/60 px-3 py-1 font-mono text-xs uppercase tracking-wide text-cream/70 ring-1 ring-grid hover:text-cream"
        >
          ⓘ Guide
        </button>
      </header>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
        <Transport />
        <div className="min-w-0 sm:min-w-[20rem] sm:flex-1">
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
