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

/** Dokunmatik (telefon/tablet) cihaz mı? Kare bütçesi orada çok daha dar. */
const KABA_CIHAZ =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches

export default function CurvedScreen({
  wPx,
  hPx,
  cols,
  rows,
  resolution = 'FHD',
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

    /*
     * DPR TAVANI 2.
     *
     * Telefonlarda devicePixelRatio 3 (hatta 3.5) olabiliyor; tuvalin piksel
     * sayısı 3× yerine 2× tutulunca doldurulacak alan yarıya iniyor ve panel
     * gözle ayırt edilemeyecek kadar az yumuşuyor. Kavis animasyonunun ve
     * video karelerinin mobilde takılmasının bir sebebi buydu.
     */
    const dpr = Math.min(2, window.devicePixelRatio || 1)
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
      cols: nCols,
      rows: nRows,
      hideRegions,
      resolution,
      // Ara tuval ekranla aynı piksel yoğunluğunda hazırlanır (bkz. dpr tavanı)
      bufferScale: dpr,
      concave,
    })
  }, [wPx, hPx, maxD, offsetX, offsetY, gw, gh, type, nCols, nRows, hideRegions, resolution, concave])

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

    /*
     * KARE SINIRI
     *
     * Kavisli ekranda her video karesi tuvale yeniden warp ediliyor. 60 Hz'de
     * bu, mobilde bütün kare bütçesini yiyor ve arayüz (kaydırma, düğmeler)
     * takılıyordu — "örnek video aşırı kasıyor" şikâyeti buydu. Dokunmatik
     * cihazda saniyede 24, masaüstünde 30 kare fazlasıyla yeterli: kaynak
     * videolar zaten 24–30 fps ve panel küçük görünüyor.
     *
     * Sekme/uygulama arka plandayken hiç çizilmiyor: görünmeyen bir tuval için
     * pil harcamanın anlamı yok.
     */
    const araKare = 1000 / (KABA_CIHAZ ? 24 : 30)
    let sonKare = 0

    const tick = (now) => {
      videoRafRef.current = requestAnimationFrame(tick)
      if (document.hidden) return
      if (now - sonKare < araKare) return
      sonKare = now
      paintRef.current()
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

  /*
   * DUVARA OTURAN GÖLGE.
   *
   * Eskiden hiç gölge yoktu: kutuya verilen dikdörtgen gölge kavisin
   * dışına taşıp beyaz duvarda gri bir iz bırakıyordu. Oysa gölgesiz
   * ekran duvarın içine gömülmüş gibi duruyor.
   *
   * Gölge artık ekranın KENDİ hattını izliyor ve kalınlığı duvara olan
   * uzaklıkla değişiyor:
   *   dışa kavisli — iki uç duvara değer, orta öne çıkar: gölge uçlarda
   *     yok denecek kadar ince, ortada kalın.
   *   içe kavisli — orta duvara değer, uçlar öne çıkar: tam tersi.
   * Duvarın kendisi düz kalıyor; değişen yalnızca aradaki boşluk.
   */
  const golge = (() => {
    if (!(maxD > 0.5) || !(wPx > 0)) return null
    const ADIM = 24
    const alt = []
    const golgeAlti = []
    for (let i = 0; i <= ADIM; i++) {
      const u = i / ADIM
      const t = 2 * u - 1
      const d = (maxD * Math.max(0, 1 - t * t)) / 2
      /* Duvara uzaklık: dışbükeyde ortada en çok, içbükeyde uçlarda. */
      const uzaklik = concave ? maxD / 2 - d : d
      const x = wPx * u
      const y = maxD / 2 + hPx + (concave ? -d : d)
      alt.push([x, y])
      golgeAlti.push([x, y + 1.5 + uzaklik * 1.35])
    }
    const nok = [...alt, ...golgeAlti.reverse()]
    return {
      yol: nok.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ') + ' Z',
      bulanik: Math.max(1.5, maxD * 0.12),
      yukseklik: hPx + maxD + maxD,
    }
  })()

  return (
    <div className="relative shrink-0 max-w-full" style={{ width: wPx, height: hPx, overflow: 'visible' }}>
      {golge && (
        <svg
          /* Tuvalle aynı çerçeve; gölge kutunun altına taştığı için daha uzun. */
          style={{ position: 'absolute', top: -maxD / 2, left: 0, width: wPx, height: golge.yukseklik, overflow: 'visible', pointerEvents: 'none' }}
          viewBox={'0 0 ' + wPx + ' ' + golge.yukseklik}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <filter id={'kg' + Math.round(wPx) + Math.round(hPx)} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={golge.bulanik} />
            </filter>
          </defs>
          <path d={golge.yol} fill="rgba(0,0,0,0.3)" filter={'url(#kg' + Math.round(wPx) + Math.round(hPx) + ')'} />
        </svg>
      )}
      {/* Tuval kutudan maxD kadar uzun; -maxD/2 ile ortalanır → kavis üstte ve altta
          eşit taşar, ekranın görsel merkezi kutunun merkeziyle çakışır. */}
      <canvas ref={canvasRef} style={{ position: 'absolute', top: -maxD / 2, left: 0, width: wPx, height: hPx + maxD }} />
    </div>
  )
}
