import { useCallback, useEffect, useRef } from 'react'
import { useRafLoop } from './useRafLoop'
import { drawTransferCurve } from './responseDraw'
import { cssVar, readTimeDomain } from './analysis'
import type { EffectInstance } from '../audio/effects/types'

interface Props {
  getInstance: () => EffectInstance | null
  getInputAnalyser: () => AnalyserNode | null
  colorVar: string
  active?: boolean
  redrawKey: unknown
  className?: string
}

// Compressor: the static threshold/ratio knee curve with a live "operating dot"
// that rides up the curve as the input gets louder — you watch it cross the
// threshold into the compressed (flatter) region. A readout shows current gain
// reduction in dB.
export function CompressorView({ getInstance, getInputAnalyser, colorVar, active = true, redrawKey, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(2048))
  const drawRef = useRef<() => void>(() => {})

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    const inst = getInstance()
    if (!inst || !inst.getTransferCurve) return

    drawTransferCurve(ctx, w, h, inst, colorVar)

    // mapping must match drawTransferCurve
    const cx = w / 2
    const cy = h / 2
    const map = 0.46
    const sx = (x: number) => cx + x * cx * 0.92
    const sy = (y: number) => Math.max(0, Math.min(h, cy - y * h * map))

    // current input peak → operating point on the curve
    const analyser = getInputAnalyser()
    if (analyser) {
      let buf = bufRef.current
      if (buf.length !== analyser.fftSize) {
        buf = new Float32Array(analyser.fftSize)
        bufRef.current = buf
      }
      readTimeDomain(analyser, buf)
      let peak = 0
      for (let i = 0; i < buf.length; i++) {
        const a = Math.abs(buf[i])
        if (a > peak) peak = a
      }
      peak = Math.min(1, peak)
      const curve = inst.getTransferCurve(256)
      const idx = Math.round(((peak + 1) / 2) * (curve.length - 1))
      const out = curve[idx] ?? 0
      const px = sx(peak)
      const py = sy(out)
      ctx.strokeStyle = cssVar('--panel-cream')
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.moveTo(px, 0)
      ctx.lineTo(px, h)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.fillStyle = cssVar('--panel-cream')
      ctx.beginPath()
      ctx.arc(px, py, Math.max(2.5, w / 90), 0, Math.PI * 2)
      ctx.fill()
    }

    // gain-reduction readout
    const gr = inst.getReduction?.() ?? 0
    ctx.fillStyle = cssVar('--lcd')
    ctx.font = `${Math.round(h * 0.13)}px ui-monospace, monospace`
    ctx.fillText(`GR ${gr <= -0.1 ? gr.toFixed(1) : '0.0'} dB`, 3, Math.round(h * 0.15))
  }, [getInstance, getInputAnalyser, colorVar])

  drawRef.current = draw

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

  useEffect(() => {
    if (!active) drawRef.current()
  }, [redrawKey, active])

  useRafLoop(draw, active)

  return <canvas ref={canvasRef} className={className} />
}
