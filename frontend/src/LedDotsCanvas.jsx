import { useEffect, useRef } from 'react'
import { paintLedDots } from './renderers/ledDots.js'

/**
 * Düz ve L tipi ekranların üzerine binen LED diyot dokusu.
 * Kavisli ekranla aynı çizim fonksiyonunu kullanır → üç ekran türünde de
 * doku birebir aynı ve net görünür.
 *
 * Ekran çözünürlüğüne (devicePixelRatio) göre çizilir; yüksek çözünürlüklü
 * ekranlarda diyotlar bulanıklaşmaz.
 */
export default function LedDotsCanvas({ wPx, hPx, dotW, dotH }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const pw = Math.max(1, Math.round(wPx * dpr))
    const ph = Math.max(1, Math.round(hPx * dpr))
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw
      canvas.height = ph
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, wPx, hPx)
    paintLedDots(ctx, wPx, hPx, dotW, dotH)
  }, [wPx, hPx, dotW, dotH])

  return (
    <canvas
      ref={ref}
      style={{ position: 'absolute', inset: 0, width: wPx, height: hPx, pointerEvents: 'none' }}
    />
  )
}
