import { useCallback, useEffect, useRef } from 'react'
import { drawCurvedScreen } from './renderers/curvedRenderer.js'
import { DEFAULT_CONTENT_SRC, curveDepthFor } from './content.js'
import { videoSrcFor, createVideoElement, sourceSize } from './videoContent.js'

/**
 * Kavisli ekranı 2D Canvas ile çizen bileşen.
 * - Görsel yüklemesini yönetir (önbellekli).
 * - DPR'ye göre keskin çizer.
 * - Mount'ta 0 → hedef kavis (curveAmount) 300 ms ease-in-out animasyonu yapar.
 * - Fiziksel ölçüleri değiştirmez; yalnız görsel temsili üretir.
 *
 * spanW/spanH/offsetX/offsetY verilirse içerik global boyutta düşünülüp bu ekranın
 * dilimi çizilir (çoklu ekranda tek görselin bölünmesiyle uyumlu).
 */

const imgCache = {}

function contentSrc(content, contentUrl) {
  if (content === 'photo') return DEFAULT_CONTENT_SRC
  if (content === 'upload' && contentUrl) return contentUrl
  return null
}

function contentTypeOf(content) {
  if (content === 'none') return 'none'
  if (content === 'led') return 'led'
  return 'image' // photo | upload | sample (video) | video
}

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

export default function CurvedScreen({
  wPx,
  hPx,
  cols,
  rows,
  resolution = 'FHD',
  // Çözünürlük rozeti yalnızca tasarım ekranında çizilir; kamerada/AR'de değil.
  cozunurlukRozeti = false,
  content = 'led',
  contentUrl = null,
  curveAmount = 60,
  concave = false,
  hideRegions = false,
  spanW,
  spanH,
  offsetX = 0,
  offsetY = 0,
}) {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const videoRef = useRef(null)
  const curveRef = useRef(0)
  const rafRef = useRef(0)
  const videoRafRef = useRef(0)

  const nCols = Math.max(1, cols)
  const nRows = Math.max(1, rows)
  const gw = spanW || wPx
  const gh = spanH || hPx
  const clampedAmount = Math.max(0, Math.min(100, curveAmount))
  // Kavis derinliği ekran tipine göre (bkz. content.js → curveDepthFor)
  const maxD = (clampedAmount / 100) * wPx * curveDepthFor(concave)
  const type = contentTypeOf(content)

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const totalH = hPx + maxD
    const pw = Math.max(1, Math.round(wPx * dpr))
    const ph = Math.max(1, Math.round(totalH * dpr))
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw
      canvas.height = ph
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Kaynak görsel VEYA video olabilir; ölçüsü tek yerden okunur.
    const img = videoRef.current || imgRef.current
    let imgSX = 0
    let imgSY = 0
    let imgSW = 0
    let imgSH = 0
    const size = sourceSize(img)
    if (size) {
      imgSX = (offsetX / gw) * size.w
      imgSW = (wPx / gw) * size.w
      imgSY = (offsetY / gh) * size.h
      imgSH = (hPx / gh) * size.h
    }

    drawCurvedScreen(ctx, {
      w: wPx,
      h: hPx,
      maxD,
      curve: curveRef.current,
      contentType: type,
      img,
      imgSX,
      imgSY,
      imgSW,
      imgSH,
      showGrid: nCols * nRows > 1 && nCols * nRows <= 900,
      cols: nCols,
      rows: nRows,
      hideRegions,
      resolution,
      rozet: cozunurlukRozeti,
      concave,
    })
  }, [wPx, hPx, maxD, offsetX, offsetY, gw, gh, type, nCols, nRows, hideRegions, resolution, cozunurlukRozeti, concave])

  // Tween içinden en güncel paint'e erişim
  const paintRef = useRef(paint)
  paintRef.current = paint

  /*
   * VİDEO içerik: DOM'a eklenmeyen bir <video> öğesi oynatılır ve her ekran
   * karesinde tuvale yeniden çizilir. Görselden farkı sürekli değişmesi;
   * bu yüzden kendi requestAnimationFrame döngüsü var.
   */
  useEffect(() => {
    const src = videoSrcFor(content, contentUrl)
    if (!src) {
      videoRef.current = null
      return
    }
    const v = createVideoElement(src)
    videoRef.current = v

    const tick = () => {
      paintRef.current()
      videoRafRef.current = requestAnimationFrame(tick)
    }
    videoRafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(videoRafRef.current)
      v.pause()
      v.removeAttribute('src')
      v.load() // indirmeyi durdur, belleği bırak
      videoRef.current = null
    }
  }, [content, contentUrl])

  // Görsel yükleme (önbellekli) + parametre değişince yeniden çiz
  useEffect(() => {
    const src = contentSrc(content, contentUrl)
    if (!src) {
      imgRef.current = null
      paint()
      return
    }
    const cached = imgCache[src]
    if (cached && cached.complete && cached.naturalWidth > 0) {
      imgRef.current = cached
      paint()
      return
    }
    const im = new Image()
    im.onload = () => {
      imgCache[src] = im
      imgRef.current = im
      paint()
    }
    im.src = src
    imgRef.current = cached || null
    paint()
  }, [content, contentUrl, paint])

  // Mount / curveAmount değişince: mevcut kavisten hedefe 300 ms ease-in-out
  useEffect(() => {
    const target = clampedAmount / 100
    const from = curveRef.current
    const dur = 300
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur)
      curveRef.current = from + (target - from) * easeInOut(p)
      paintRef.current()
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [clampedAmount])

  // NOT: Kutuya gölge verilmiyor — panel kavisli olduğu için dikdörtgen bir gölge
  // panelin dışına taşıp beyaz duvarda gri iz bırakıyordu.
  return (
    <div className="relative shrink-0" style={{ width: wPx, height: hPx, overflow: 'visible' }}>
      {/* Tuval kutudan maxD kadar uzun; -maxD/2 ile ortalanır → kavis üstte ve altta
          eşit taşar, ekranın görsel merkezi kutunun merkeziyle çakışır. */}
      <canvas ref={canvasRef} style={{ position: 'absolute', top: -maxD / 2, left: 0, width: wPx, height: hPx + maxD }} />
    </div>
  )
}
