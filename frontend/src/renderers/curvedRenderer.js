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
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NEDEN ARA TUVAL (BUFFER) VAR — mobil donmasının asıl sebebi buydu
 *
 * Panel eskiden doğrudan hedef tuvale, 2 px'lik dilimler hâlinde çiziliyordu:
 * genişliği 600 px olan bir ekran için kare başına ~300 `drawImage`, üstelik
 * `ctx.filter` AÇIKKEN. Canvas filtresi her çağrıda ayrı bir ara yüzey
 * kurar; mobil Safari'de bu yüzlerce yüzey saniyede 60 kez oluşturulunca
 * arayüz kilitleniyor, GPU belleği dolduğunda da tuval SİYAH kalıyordu —
 * AR ekran görüntüsündeki simsiyah panelin sebebi buydu.
 *
 * Artık içerik önce DÜZ bir ara tuvale bir kez çiziliyor (filtre, diyot dokusu
 * ve satır çizgileri orada, tek seferde uygulanıyor); hedefe yalnızca o hazır
 * tuvalin dilimleri kopyalanıyor. Kare başına filtre sayısı 300'den 1'e indi.
 * Satır çizgileri de düz çizilip dilimlerle birlikte büküldüğü için kavisi
 * kendiliğinden takip ediyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { LEDS_PER_CABINET_X, LEDS_PER_CABINET_Y, LED_LIT_FILTER } from '../content.js'
import { paintLedDots } from './ledDots.js'
import { isDrawable } from '../videoContent.js'

const SAMPLE_STOPS = ['#14532d', '#3f8f3f', '#7bb661', '#2d5a27']
// LED panel görünümü (kapalı panel) — content.js'teki LED_GRADIENT ile aynı renkler
const LED_STOPS = ['#1a1a1e', '#101013', '#17171b', '#0d0d10']

/*
 * Dilim genişliği. Dokunmatik cihazda daha kaba: dilim sayısı yarıya iner,
 * kavisin dış hattı zaten kırpma yoluyla yumuşatıldığı için görsel fark yok.
 */
const KABA_CIHAZ =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches
const STEP = KABA_CIHAZ ? 4 : 2

/*
 * Ara tuval tüm kavisli ekranlarca PAYLAŞILIR: her çizimde baştan boyanıyor,
 * bu yüzden tek bir örnek yeter ve kavis animasyonu boyunca yeniden tuval
 * ayırma maliyeti oluşmaz.
 */
const ara = { canvas: null, ctx: null }

function araTuval(w, h) {
  if (!ara.canvas) {
    ara.canvas = document.createElement('canvas')
    ara.ctx = ara.canvas.getContext('2d')
  }
  const pw = Math.max(1, Math.ceil(w))
  const ph = Math.max(1, Math.ceil(h))
  if (ara.canvas.width !== pw || ara.canvas.height !== ph) {
    ara.canvas.width = pw // boyut değişimi tuvali zaten temizler
    ara.canvas.height = ph
  } else {
    ara.ctx.clearRect(0, 0, pw, ph)
  }
  ara.ctx.setTransform(1, 0, 0, 1, 0, 0)
  ara.ctx.filter = 'none'
  return ara
}

/** Degrade — dilim dilim renk örneklemek yerine tek gradient nesnesi. */
function gradient(ctx, w, stops) {
  const g = ctx.createLinearGradient(0, 0, w, 0)
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s))
  return g
}

/**
 * Yüzeyin x noktasının GÖRÜNEN ölçeği (0..1).
 *
 * İKİ YÖN AYNI BÜYÜKLÜKTE.
 *
 * Eskiden dışa kavisli ekran ortada UZUYOR (h + 2d), içe kavisli ise
 * KISALIYORDU (h − 2d): aynı kavis yüzdesinde iki tasarım arasında 4d'lik
 * bir fark oluşuyor, biri ötekinden gözle görülür biçimde büyük duruyordu.
 * Oysa ikisinin yay açısı da aynı; karşıdan bakışta ikisi de aynı yeri
 * kaplar, yalnızca ekranın hangi yerinin izleyiciye DÖNÜK olduğu değişir.
 *
 * Artık ikisi de aynı kutuya sığıyor ve birbirinin aynası:
 *  - DIŞA kavisli: merkez karşımıza dönük (tam boy), kenarlar yana döndüğü
 *    için kısalmış görünüyor.
 *  - İÇE kavisli: kenarlar karşımıza dönük (tam boy), merkez kısalıyor.
 */
function gorunenOlcek(x, w, kucultme, concave) {
  if (!(w > 0)) return 1
  const t = (2 * x) / w - 1 // -1 (sol) .. 0 (merkez) .. +1 (sağ)
  const bombe = Math.max(0, 1 - t * t) // 0 kenarda, 1 merkezde
  /* Bizden en çok "kaçan" yer: dışa kavislide kenarlar, içe kavislide merkez. */
  const kacis = concave ? bombe : 1 - bombe
  return 1 - kucultme * kacis
}

/**
 * oran = derinlik / genişlik → toplam yay açısı (radyan).
 *
 * d(θ) kapalı biçimde ters çevrilemiyor ama θ arttıkça d sürekli artıyor;
 * ikiye bölme yeterli. (content.js'teki yayAcisiRad ile aynı hesap; burada
 * yüzdeden değil, doğrudan derinlik oranından gidiliyor.)
 */
function yayAcisi(oran) {
  if (!(oran > 0)) return 0
  let alt = 0
  let ust = Math.PI
  for (let i = 0; i < 30; i++) {
    const orta = (alt + ust) / 2
    if ((1 - Math.cos(orta / 2)) / orta < oran) alt = orta
    else ust = orta
  }
  return (alt + ust) / 2
}

/** x konumundaki dikey dilimin üst kenarı ve yüksekliği. */
function edgeAt(x, w, h, kucultme, concave, yOff) {
  if (w <= 0) return { top: yOff, height: h }
  const boy = Math.max(1, h * gorunenOlcek(x, w, kucultme, concave))
  /* Kısalma yatay orta çizgiye göre: karşıdan bakan göz ekranın ortasında. */
  return { top: yOff + (h - boy) / 2, height: boy }
}

/**
 * Panelin dış hattını yol olarak kurar (üst kenar → sağ → alt kenar → sol).
 *
 * NEDEN GEREKLİ: içerik dilimler hâlinde çiziliyor ve her dilimin üstü düz.
 * Bu, kavisin kenarında merdiven basamağı gibi tırtıklanmaya yol açıyordu.
 * Bu yolu kırpma (clip) olarak kullanınca kenarı tarayıcı kendisi yumuşatıyor.
 *
 * Yol çözünürlüğü dilim genişliğinin yarısı: eğri 1 px'lik adımlarla
 * kurulduğunda kare başına binlerce `lineTo` birikiyor ve bu yol karede iki
 * kez kuruluyordu (kırpma + boş çerçeve dış hattı). Yarım dilim, kenarın
 * pürüzsüzlüğü için fazlasıyla yeterli.
 */
function panelPath(ctx, w, E, s = Math.max(1, STEP / 2)) {
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

/**
 * DÜZ panel yüzeyini ara tuvale çizer: içerik + (kapalıysa) diyot dokusu +
 * satır çizgileri. Buradan çıkan tuval, hedefe dilimlenerek bükülür.
 */
function yuzeyiCiz(w, h, o) {
  // cols/rows: diyot dokusunun kabin olcusune gore siklastigi yer.
  const { contentType, img, imgSX, imgSY, imgSW, imgSH, cols, rows } = o
  const { canvas, ctx } = araTuval(w, h)
  const isLit = contentType === 'image' || contentType === 'gradient'
  const gorselHazir = contentType === 'image' && isDrawable(img) && imgSW > 0 && imgSH > 0

  /*
   * Filtre TEK seferde, tüm yüzeye. (Eskiden dilim başına kuruluyordu; mobil
   * donmasının ve siyah kalan panelin sebebi buydu — bkz. dosya başı.)
   */
  if (isLit) ctx.filter = LED_LIT_FILTER

  if (gorselHazir) {
    ctx.drawImage(img, imgSX, imgSY, imgSW, imgSH, 0, 0, w, h)
  } else if (contentType === 'gradient' || contentType === 'led') {
    ctx.fillStyle = gradient(ctx, w, contentType === 'led' ? LED_STOPS : SAMPLE_STOPS)
    ctx.fillRect(0, 0, w, h)
  } else if (contentType === 'none') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
  } else {
    /*
     * İçerik GÖRSEL ama henüz inmedi (ya da videonun ilk karesi hazır değil).
     * Yüzey boş bırakılırsa panel kamerada tamamen kaybolur; kapalı panel
     * görünümü konuyor — görsel gelince üstüne çizilecek.
     */
    ctx.filter = 'none'
    ctx.fillStyle = gradient(ctx, w, LED_STOPS)
    ctx.fillRect(0, 0, w, h)
  }

  ctx.filter = 'none'

  // Diyot dokusu — yalnız panel kapalıyken; yayın varken görüntü izlenir.
  if (contentType === 'led') {
    paintLedDots(ctx, w, h, w / cols / LEDS_PER_CABINET_X, h / rows / LEDS_PER_CABINET_Y)
  }

  return canvas
}

/**
 * @param {CanvasRenderingContext2D} ctx  (zaten dpr ölçekli, CSS piksel koordinatları)
 * @param {object} o
 *   w, h        : ekranın CSS piksel ölçüsü
 *   maxD        : tam kavistaki en fazla sarkma (px)
 *   curve       : 0..1 (o anki animasyonlu kavis oranı)
 *   contentType : 'image' | 'gradient' | 'led' | 'none'
 *   img         : HTMLImageElement | HTMLVideoElement | null
 *   imgSX,imgSY,imgSW,imgSH : kaynak görselden kullanılacak dikdörtgen (çoklu ekran dilimi)
 *   cols, rows  : kabin sayıları
 *   hideRegions : sinyal bölgesi göstergelerini gizle
 *   resolution  : 'FHD' | 'UHD' — sinyalin standardı; bölge sayısını belirler
 *   concave     : true = içe kavisli (konkav), false = dışa kavisli (konveks)
 *   bufferScale : ara tuvalin piksel yoğunluğu (varsayılan 1)
 */
export function drawCurvedScreen(ctx, o) {
  const { w, h, maxD, curve, contentType, cols, rows, hideRegions, resolution, concave = false, bufferScale = 1 } = o

  if (!(w > 0) || !(h > 0)) return

  /*
   * KISALMA ORANI EKRANIN BOYUNDAN DEĞİL, AÇISINDAN GELİYOR.
   *
   * Eskiden sarkma doğrudan derinlik pikseliydi (amp): geniş ve alçak bir
   * ekranda ekranın boyunu aşıyor, dar ve yüksek olanda hiç görünmüyordu —
   * aynı yüzde, bambaşka bir kavis. Yana dönen bir yüzeyin ne kadar
   * kısaldığı yalnızca DÖNME AÇISINA bağlıdır: 1 − cos(θ/2).
   *
   * ABARTI: karşıdan bakışta gerçek kısalma birkaç yüzde kalır, yani kavis
   * çizimde hiç belli olmazdı. Teknik çizimlerde olağan olduğu gibi etki
   * abartılıyor; yön ve oranlar doğru kalıyor.
   *
   * TAVAN: 64 derecede abartılmış kısalma yarıya yaklaşıyor ve ekran
   * mercek gibi duruyordu (ölçüldü). Üçte bir, kavisi belli eden ama
   * kenarları hâlâ ekran gibi tutan sınır.
   */
  const KISALMA_ABARTI = 3
  const oran = w > 0 ? (curve * maxD) / w : 0
  const kucultme = Math.min(0.3, KISALMA_ABARTI * (1 - Math.cos(yayAcisi(oran) / 2)))
  const yOff = maxD / 2
  const totalH = h + maxD
  const step = STEP
  const E = (x) => edgeAt(x, w, h, kucultme, concave, yOff)

  ctx.clearRect(0, 0, w, totalH)

  // Düz yüzey bir kez hazırlanır; hedefe yalnızca dilimleri kopyalanır.
  const bs = Math.max(1, bufferScale)
  /*
   * ARA TUVAL DİKEYDE EN ÇOK GERİLEN DİLİME GÖRE HAZIRLANIYOR.
   *
   * Dışa kavisli ekranda ortadaki dilim izleyiciye yakın, yani daha UZUN
   * görünüyor: h yüksekliğindeki yüzeyden kesilen parça hedefte h + amp
   * kadar yer kaplıyor. Ara tuval h yüksekliğinde hazırlandığı için o
   * dilim BÜYÜTÜLEREK kopyalanıyor ve görüntü bulanıklaşıyordu —
   * kavis arttıkça daha çok.
   *
   * Tuval artık en çok gerilen dilim kadar yüksek hazırlanıyor: kopyalama
   * her dilimde küçültme oluyor, büyütme hiç olmuyor. Kenarlardaki
   * dilimler zaten küçülüyordu, onlar değişmiyor.
   */
  /* Dilim hiçbir yerde h'den uzun değil (bkz. gorunenOlcek): kopyalama hep
     küçültme, yani büyütmeden gelen bulanıklık yok. */
  const yuzey = yuzeyiCiz(Math.ceil(w * bs), Math.ceil(h * bs), o)
  const yuzeyH = yuzey.height

  // Kenarların pürüzsüz çıkması için tüm panel çizimi dış hatla kırpılır.
  ctx.save()
  panelPath(ctx, w, E)
  ctx.clip()

  /*
   * Dilimin çizileceği dikey aralık: iki ucundaki kavis değerinin DIŞINI alır
   * ve yarım piksel pay ekler. Böylece dilim kırpma yolunun dışına taşar,
   * fazlası kırpılır; eksik kalsaydı kenarda saydam çentikler oluşurdu.
   */
  /*
   * GÖRÜNTÜ DE KAVİSLE BİRLİKTE KISALIYOR.
   *
   * Görsel yatayda birebir kopyalanıyordu: yüzey büküldüğü hâlde üstündeki
   * görüntü düz bir ekrandaki gibi eşit aralıklı duruyor, kavis yalnızca
   * ekranın dış hattından anlaşılıyordu. Gerçekte bizden kaçan bölge DAR
   * görünür: dışa kavislide kenarlar, içe kavislide orta sıkışır.
   *
   * Hedefte dilimler eşit; KAYNAKTAN alınan parça 1/ölçek kadar geniş.
   * Toplam w'ye normalleniyor, yani yüzeyin tamamı kullanılıyor ve ekranın
   * dış ölçüsü değişmiyor (komşu ekranlarla arası açılmasın).
   */
  const dilim = Math.max(1, Math.ceil(w / step))
  const kaynakKenar = new Float64Array(dilim + 1)
  let toplam = 0
  for (let i = 0; i < dilim; i++) {
    const xo = Math.min(w, (i + 0.5) * step)
    toplam += 1 / Math.max(0.2, gorunenOlcek(xo, w, kucultme, concave))
    kaynakKenar[i + 1] = toplam
  }
  const kNorm = toplam > 0 ? w / toplam : 1
  for (let i = 0; i <= dilim; i++) kaynakKenar[i] *= kNorm

  for (let i = 0; i < dilim; i++) {
    const x = i * step
    const sw = Math.min(step, w - x)
    if (!(sw > 0)) break
    const a = E(x)
    const b = E(x + sw)
    const top = Math.min(a.top, b.top) - 0.5
    const bottom = Math.max(a.top + a.height, b.top + b.height) + 0.5
    const kx = kaynakKenar[i]
    const kw = Math.max(0.5, kaynakKenar[i + 1] - kx)
    ctx.drawImage(yuzey, kx * bs, 0, Math.max(1, kw * bs), yuzeyH, x, top, sw + 0.6, bottom - top)
  }

  ctx.restore() // panel kırpması biter

  /*
   * BOŞ ÇERÇEVE ("Resim Yok") DIŞ HATTI.
   * Beyaz dolgu açık renkli duvarın üstünde görünmüyordu; düz ekranda bu işi
   * CSS `border` görüyor, tuvalde karşılığı yok.
   */
  if (contentType === 'none') {
    ctx.save()
    panelPath(ctx, w, E)
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
  }
}
