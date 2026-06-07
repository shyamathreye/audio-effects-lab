import type { SourceConfig, SourceInstance } from './types'
import { createOscillator } from './oscillator'
import { createNoise } from './noise'
import { createLoop } from './loops'
import { createFileSource } from './fileSource'

// Build a SourceInstance for the given config. `fileBuffer` is required for the
// 'file' kind (the decoded buffer lives in the engine, not the config). Returns
// null when a source can't be built (e.g. file kind with no buffer yet).
export function createSource(
  ctx: BaseAudioContext,
  cfg: SourceConfig,
  fileBuffer: AudioBuffer | null,
): SourceInstance | null {
  switch (cfg.kind) {
    case 'oscillator':
      return createOscillator(ctx, cfg)
    case 'noise':
      return createNoise(ctx, cfg)
    case 'loop':
      return createLoop(ctx, cfg)
    case 'file':
      return fileBuffer ? createFileSource(ctx, fileBuffer, cfg.level) : null
  }
}
