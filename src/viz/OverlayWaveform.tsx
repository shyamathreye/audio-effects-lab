import { useCallback, useEffect, useRef } from 'react'
import { useRafLoop } from './useRafLoop'
import { readTimeDomain, cssVar, strokeWave, waveStart } from './analysis'
import type { StageRef } from './stages'

interface OverlayWaveformProps {
  stages: StageRef[]
  getAnalyser: (id: string) => AnalyserNode | null
  spanSec?: number
  active?: boolean
  className?: string
}

// Combined view: every stage's waveform overlaid on one screen, each in its hue.
// All traces share one time offset (from the dry signal's zero-crossing) so
// shape/phase differences line up; clamped + decimated so they stay in-bounds.
export function OverlayWaveform({ stages, getAnalyser, spanSec = 0.03, active = true, className }: OverlayWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(2048))
  const refRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(2048))
  const drawRef = useRef<() => void>(() => {})
  const stagesRef = useRef(stages)
  stagesRef.current = stages
  const spanRef = useRef(spanSec)
  spanRef.current = spanSec

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))
  }, [])

  useEffect(() => {
    resize()
    drawRef.current()
    const ro = new ResizeObserver(() => {
      resize()
      drawRef.current()
    })
    if (canvasRef.current) ro.observe(canvasRef.current)
    return () => ro.disconnect()
  }, [resize])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height

    ctx.fillStyle = cssVar('--lcd-bg')
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = cssVar('--lcd-grid')
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()

    const list = stagesRef.current
    if (list.length === 0) return

    // shared offset + count from the dry (first) stage
    const refAnalyser = getAnalyser(list[0].id)
    let count = 1024
    let offset = 0
    if (refAnalyser) {
      let ref = refRef.current
      if (ref.length !== refAnalyser.fftSize) {
        ref = new Float32Array(refAnalyser.fftSize)
        refRef.current = ref
      }
      readTimeDomain(refAnalyser, ref)
      count = Math.max(64, Math.min(ref.length, Math.round(spanRef.current * refAnalyser.context.sampleRate)))
      offset = waveStart(ref, count)
    }

    for (const stage of list) {
      const analyser = getAnalyser(stage.id)
      if (!analyser) continue
      let buf = bufRef.current
      if (buf.length !== analyser.fftSize) {
        buf = new Float32Array(analyser.fftSize)
        bufRef.current = buf
      }
      readTimeDomain(analyser, buf)
      ctx.lineWidth = stage.id === 'dry' ? Math.max(1, w / 900) : Math.max(1.5, w / 650)
      ctx.strokeStyle = cssVar(stage.colorVar)
      ctx.globalAlpha = stage.bypassed ? 0.25 : stage.id === 'dry' ? 0.5 : 0.9
      strokeWave(ctx, buf, offset, count, w, h)
    }
    ctx.globalAlpha = 1
  }, [getAnalyser])

  drawRef.current = draw
  useRafLoop(draw, active)

  return <canvas ref={canvasRef} className={className} />
}
