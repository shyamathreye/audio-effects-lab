# VizE — Audio Effects Lab

An interactive, browser-based tool for hearing and **seeing** what audio effects
do to a sound wave — styled as a friendly modular-synth patch bay. Generate a
sound, build a reorderable chain of effects, toggle each on/off, and watch the
change in synchronized Waveform / Spectrum / Spectrogram views.

Built with React + TypeScript + Vite, the Web Audio API (native nodes only),
Zustand, dnd-kit, and Tailwind.

## Prerequisites

This project needs Node.js (LTS). If `node` isn't on your PATH, a local copy was
installed under `~/.local/node`; add it for your shell with:

```sh
export PATH="$HOME/.local/node/bin:$PATH"
```

## Scripts

```sh
npm install        # install dependencies
npm run dev        # start the dev server (http://localhost:5173)
npm run build      # type-check + production build
npm run lint       # type-check only (tsc --noEmit)
npm test           # run fixture / unit tests (vitest)
```

## Status — milestone delivery

- **M1 — Engine + Chain ✅** — audio engine (context, master + clip indicator,
  transport), oscillator source, live waveform scope, effect-chain with taps,
  add/remove/drag-reorder/true-bypass with click-free crossfades. Ships Utility
  and Filter effects.
- **M2 — All 8 effects + inline scopes** (next): EQ3, Compressor, Distortion,
  Delay, Reverb, Modulation, with per-effect fixture checks.
- **M3 — Spectrum + Spectrogram, Live/Freeze, compare overlay.**
- **M4 — Noise / synth loops / file upload, learning-guide drawer, full
  patch-bay skin, perf + a11y polish.**

See the PRD and the build plan for full detail. Effect behavior is verified
against the descriptions in PRD Part 3 (the reference render images are not
bundled in this repo).

## Architecture

```
src/audio/   AudioEngine, graph (taps + crossfade rewire), sources, effects, dsp
src/viz/     shared rAF loop, analyser helpers, canvas views
src/ui/      SourceBar, Transport, Chain, EffectModule, Knob, Visualizer
src/state/   Zustand store (declarative mirror that drives the engine)
src/theme/   §2A color tokens (CSS variables, mirrored into Tailwind)
```
