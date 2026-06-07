// The processor lives in public/ (copied verbatim to the build output) and is
// loaded by URL. AudioWorklet code must stay an un-bundled classic script, so
// public/ is the reliable home for it across dev and production builds.
const bitcrusherUrl = `${import.meta.env.BASE_URL}bitcrusher-processor.js`

// AudioWorklet modules must be added to a context (async) before any node using
// them is constructed. Track per-context so we add it exactly once, on both live
// and offline contexts.
const loaded = new WeakSet<BaseAudioContext>()
const pending = new WeakMap<BaseAudioContext, Promise<void>>()

export function ensureBitcrusherModule(ctx: BaseAudioContext): Promise<void> {
  if (loaded.has(ctx)) return Promise.resolve()
  let p = pending.get(ctx)
  if (!p) {
    p = ctx.audioWorklet
      .addModule(bitcrusherUrl)
      .then(() => {
        loaded.add(ctx)
      })
    pending.set(ctx, p)
  }
  return p
}
