/**
 * Kavisli (içbükey) LED ekranını 2D Canvas üzerine çizen saf fonksiyon.
 *
 * Kavis mantığı:
 *  - Yalnız yatay eksende. Üst kenar bir yay; alt kenar aynı yayı takip eder (sabit yükseklik).
 *  - Sol/sağ kenarlar diktir. Kolon çizgileri dik ama yaya göre kaydırılmış;
 *    satır çizgileri yayı izleyen eğrilerdir.
 *  - İçerik (görsel/gradient) dikey dilimler halinde yaya oturtulur (clipping/warp).
 *
 * Fiziksel ölçüler burada kullanılmaz; yalnızca görsel temsil üretilir.
 */

import { LEDS_PER_CABINET_X, LEDS_PER_CABINET_Y, LED_LIT_FILTER } from '../content.js'
import { paintLedDots } from './ledDots.js'
import { isDrawable } from '../videoContent.js'

const SAMPLE_STOPS = ['#14532d', '#3f8f3f', '#7bb661', '#2d5a27']
// LED panel görünümü (kapalı panel) — content.js'teki LED_GRADIENT ile aynı renkler
const LED_STOPS = ['#1a1a1e', '#101013', '#17171b', '#0d0d10']

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

// Degrade rengini yatay konuma (0..1) göre örnekler
function sampleColor(t, stops = SAMPLE_STOPS) {
  const segs = stops.length - 1
  const p = Math.max(0, Math.min(1, t)) * segs
  const i = Math.min(segs - 1, Math.floor(p))
  const f = p - i
  const c0 = hexToRgb(stops[i])
  const c1 = hexToRgb(stops[i + 1])
  return `rgb(${Math.round(lerp(c0[0], c1[0], f))},${Math.round(lerp(c0[1], c1[1], f))},${Math.round(lerp(c0[2], c1[2], f))})`
}

/**
 * LED diyot dokusu — ortak boyacıyı (ledDots.js) panel alanıyla sınırlı çizer.
 * source-atop: yalnızca panelin ÇİZİLİ olduğu yere basar. Kavis yüzünden panelin
 * bulunmadığı üst/alt bölgeler boş kalır — aksi halde beyaz duvara gri şerit basıyordu.
 */
function drawLedDots(ctx, w, totalH, dotW, dotH) {
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  paintLedDots(ctx, w, totalH, dotW, dotH)
  ctx.restore()
}

/**
 * x konumundaki dikey dilimin üst kenarı ve yüksekliği.
 *
 * Kavis, dilimin görünen yüksekliğiyle temsil edilir (perspektif kısalması):
 *  - DIŞA kavisli (konveks): merkez izleyiciye YAKIN → ortada daha UZUN görünür.
 *    Üst kenar ortada yukarı, alt kenar ortada aşağı kavislenir.
 *  - İÇE kavisli (konkav): merkez izleyiciden UZAK → ortada daha KISA görünür.
 *    Üst kenar ortada aşağı, alt kenar ortada yukarı kavislenir.
 *
 * yOff = maxD/2 taban kaydırması sayesinde iki yön de aynı tuvale sığar.
 */
function edgeAt(x, w, h, amp, concave, yOff) {
  if (w <= 0) return { top: yOff, height: h }
  const t = (2 * x) / w - 1 // -1 (sol) .. 0 (merkez) .. +1 (sağ)
  const bulge = Math.max(0, 1 - t * t)
  const d = (amp * bulge) / 2
  return concave ? { top: yOff + d, height: Math.max(1, h - 2 * d) } : { top: yOff - d, height: h + 2 * d }
}

/**
 * Panelin dış hattını yol olarak kurar (üst kenar → sağ → alt kenar → sol).
 *
 * NEDEN GEREKLİ: İçerik 2 px'lik dikey dilimlerle çiziliyor ve her dilimin üstü
 * düz. Bu, kavisin kenarında merdiven basamağı gibi tırtıklanmaya yol açıyordu.
 * Bu yolu kırpma (clip) olarak kullanınca kenarı tarayıcı kendisi yumuşatıyor
 * (kenar yumuşatma), dilimler ne kadar kaba olursa olsun dış hat pürüzsüz çıkıyor.
 */
function panelPath(ctx, w, E) {
  const s = 1 // yol çözünürlüğü (px) — 1 px'te eğri düz görünür
  ctx.beginPath()
  ctx.moveTo(0, E(0).top)
  for (let x = s; x < w; x += s) ctx.lineTo(x, E(x).top)
  const right = E(w)
  ctx.lineTo(w, right.top)
  ctx.lineTo(w, right.top + right.height)
  for (let x = w - s; x > 0; x -= s) {
    const e = E(x)
    ctx.lineTo(x, e.top + e.height)
  }
  const left = E(0)
  ctx.lineTo(0, left.top + left.height)
  ctx.closePath()
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * @param {CanvasRenderingContext2D} ctx  (zaten dpr ölçekli, CSS piksel koordinatları)
 * @param {object} o
 *   w, h        : ekranın CSS piksel ölçüsü
 *   maxD        : tam kavistaki en fazla sarkma (px)
 *   curve       : 0..1 (o anki animasyonlu kavis oranı)
 *   contentType : 'image' | 'gradient' | 'none'
 *   img         : HTMLImageElement | null
 *   imgSX,imgSY,imgSW,imgSH : kaynak görselden kullanılacak dikdörtgen (çoklu ekran dilimi)
 *   showGrid    : boolean
 *   cols, rows  : kabin sayıları
 *   hideRegions : FHD/UHD rozetlerini gizle
 *   resolution  : 'FHD' | 'UHD'
 *   concave     : true = içe kavisli (konkav), false = dışa kavisli (konveks)
 */
export function drawCurvedScreen(ctx, o) {
  const {
    w, h, maxD, curve, contentType, img, imgSX, imgSY, imgSW, imgSH,
    showGrid, cols, rows, hideRegions, resolution,
    concave = false,
  } = o

  const amp = curve * maxD
  const yOff = maxD / 2
  const totalH = h + maxD
  const step = 2 // dilim genişliği (px)
  const E = (x) => edgeAt(x, w, h, amp, concave, yOff)

  /**
   * Bir dilimin çizileceği dikey aralık.
   * Dilimin İKİ ucundaki kavis değerinin dışını alır (min üst / maks alt) ve
   * yarım piksel pay ekler. Böylece dilim, kırpma yolunun dışına TAŞAR; fazlası
   * kırpılır. Eksik kalsaydı kenarda saydam çentikler oluşurdu.
   */
  const sliceBox = (x, sw) => {
    const a = E(x)
    const b = E(x + sw)
    const top = Math.min(a.top, b.top) - 0.5
    const bottom = Math.max(a.top + a.height, b.top + b.height) + 0.5
    return { top, height: bottom - top }
  }

  ctx.clearRect(0, 0, w, totalH)

  // Panel görüntü YAYINDA mı? Kapalı panel (led) ve boş çerçeve ışık saçmaz.
  const isLit = contentType === 'image' || contentType === 'gradient'

  // Kenarların pürüzsüz çıkması için tüm panel çizimi dış hatla kırpılır.
  ctx.save()
  panelPath(ctx, w, E)
  ctx.clip()

  // 1) İçerik — her dikey dilim kendi kavis yüksekliğine göre çizilir.
  // Yayındayken renkler doygunlaşır ve parlar (ledDots'un söndürmesini de telafi eder).
  if (isLit) ctx.filter = LED_LIT_FILTER
  if (contentType === 'image' && isDrawable(img)) {
    for (let x = 0; x < w; x += step) {
      const sw = Math.min(step, w - x)
      const sx = imgSX + (x / w) * imgSW
      const ssw = Math.max(0.5, (sw / w) * imgSW)
      const e = sliceBox(x, sw)
      ctx.drawImage(img, sx, imgSY, ssw, imgSH, x, e.top, sw + 0.6, e.height)
    }
  } else if (contentType === 'gradient' || contentType === 'led') {
    const stops = contentType === 'led' ? LED_STOPS : SAMPLE_STOPS
    for (let x = 0; x < w; x += step) {
      const sw = Math.min(step, w - x)
      const e = sliceBox(x, sw)
      ctx.fillStyle = sampleColor(x / w, stops)
      ctx.fillRect(x, e.top, sw + 0.6, e.height)
    }
  } else if (contentType === 'none') {
    ctx.fillStyle = '#ffffff'
    for (let x = 0; x < w; x += step) {
      const sw = Math.min(step, w - x)
      const e = sliceBox(x, sw)
      ctx.fillRect(x, e.top, sw + 0.6, e.height)
    }
  }

  if (isLit) ctx.filter = 'none' // filtre yalnızca içerik katmanına uygulanır

  // 1b) LED diyot dokusu — YALNIZCA panel kapalıyken. Yayın varken diyotlar
  // görünmez; hücre ölçüsü kabinden türer (kabin başına sabit diyot sayısı).
  if (contentType === 'led') {
    drawLedDots(ctx, w, totalH, w / cols / LEDS_PER_CABINET_X, h / rows / LEDS_PER_CABINET_Y)
  }

  // 2) Kabin grid — kolonlar dik, satırlar kavisi takip eder
  if (showGrid) {
    ctx.save()
    // Diyot dokusuyla aynı koruma: çizgiler panel dışına taşmasın
    ctx.globalCompositeOperation = 'source-atop'
    // Kabin birleşimi: panelde çok soluk ışık teli (siyah çizgi "kesik" gibi duruyordu)
    ctx.strokeStyle = contentType === 'none' ? 'rgba(100,116,139,0.28)' : 'rgba(255,255,255,0.13)'
    ctx.lineWidth = 1
    for (let c = 0; c <= cols; c++) {
      const x = (c / cols) * w
      const e = E(x)
      ctx.beginPath()
      ctx.moveTo(x, e.top)
      ctx.lineTo(x, e.top + e.height)
      ctx.stroke()
    }
    for (let r = 0; r <= rows; r++) {
      const f = r / rows
      ctx.beginPath()
      for (let x = 0; x <= w; x += step) {
        const e = E(x)
        const y = e.top + f * e.height
        if (x === 0) ctx.moveTo(0, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  ctx.restore() // panel kırpması biter — rozet tam görünsün

  /*
   * BOŞ ÇERÇEVE ("Resim Yok") DIŞ HATTI.
   * Beyaz dolgu, açık renkli duvarın üstünde görünmüyordu: ekran tamamen
   * kaybolup yerinde hiçbir şey yokmuş gibi duruyordu. Düz ekranda bu işi CSS
   * `border` görüyor; tuvalde karşılığı yok, o yüzden dış hat burada
   * çiziliyor. Kavis de böylece okunuyor — kenarlar eğrinin kendisini izliyor.
   */
  if (contentType === 'none') {
    ctx.save()
    panelPath(ctx, w, E)
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
  }

  // 3) Çözünürlük rozeti — sol üstte tek.
  // Sinyal bölgelerini çerçeveyle bölmüyoruz: gerçek bir panelde öyle çizgiler
  // yok ve ekranın bütünlüğünü bozuyordu.
  if (!hideRegions) {
    const bx = 3
    const by = E(0).top + 3
    ctx.font = '600 9px Poppins, system-ui, sans-serif'
    ctx.textBaseline = 'middle'
    const tw = ctx.measureText(resolution).width
    ctx.fillStyle = '#2962ad' // marka mavisi (brand.js / index.css --color-brand)
    roundRectPath(ctx, bx, by, tw + 8, 13, 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.fillText(resolution, bx + 4, by + 7)
  }
}
