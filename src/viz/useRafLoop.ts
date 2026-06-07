import { useEffect } from 'react'

// Single shared requestAnimationFrame driver (PRD §4.7: one rAF for the whole
// app). Each subscriber registers a callback; the loop runs only while there is
// at least one active subscriber and the tab is visible.
type Cb = (t: number) => void

const subscribers = new Set<Cb>()
let rafId: number | null = null

function tick(t: number) {
  for (const cb of subscribers) cb(t)
  rafId = subscribers.size > 0 ? requestAnimationFrame(tick) : null
}

function ensureRunning() {
  if (rafId === null && subscribers.size > 0 && !document.hidden) {
    rafId = requestAnimationFrame(tick)
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    } else {
      ensureRunning()
    }
  })
}

/** Subscribe a callback to the shared rAF loop while `active` is true. */
export function useRafLoop(cb: Cb, active = true): void {
  useEffect(() => {
    if (!active) return
    subscribers.add(cb)
    ensureRunning()
    return () => {
      subscribers.delete(cb)
    }
  }, [cb, active])
}
