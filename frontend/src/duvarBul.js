/**
 * UYGUN YÜZEY ARAMA (kamera karesinden).
 *
 * Gerçek AR (WebXR) çoğu telefonda açılmıyor; derinlik ya da düzlem bilgisi
 * yok. Elimizde yalnızca kameranın o anki karesi var. Buna rağmen "ekran
 * nereye yakışır" sorusuna işe yarar bir cevap verilebiliyor, çünkü aranan
 * şey aslında görüntüde bellidir: DÜZ ve BOŞ bir alan.
 *
 * Duvar, cephe ya da boş bir pano kamerada nasıl görünür? İçinde ayrıntı
 * yoktur — komşu pikseller birbirine benzer. Kitaplık, pencere, mobilya,
 * kalabalık zemin ise ayrıntı doludur. Yani "düzlük" ölçüsü olarak komşu
 * piksel farkının (gradyan) ortalaması kullanılıyor: küçükse düz alan.
 *
 * Yöntem:
 *   1) Kare küçültülüp griye çevrilir (hız için; 160 piksel genişlik yeter).
 *   2) Her piksel için komşu farkı (gradyan) hesaplanır.
 *   3) Gradyanın TOPLAM TABLOSU (integral image) çıkarılır — böylece
 *      herhangi bir dikdörtgenin ortalama gradyanı dört okumayla bulunur.
 *      Yüzlerce aday pencere bu sayede taranabiliyor.
 *   4) Tasarımın en/boy oranındaki pencereler farklı ölçek ve konumlarda
 *      denenir, en düz olanı seçilir.
 *
 * Bu bir derinlik ölçümü DEĞİLDİR; ekranın gerçekten oraya sığacağını
 * söylemez. Yaptığı şey, kalabalık olmayan bir yer önermek.
 */

/** Çözümleme genişliği — daha büyüğü belirgin fayda vermeden yavaşlatıyor. */
const COZUMLEME_W = 160

/** Bu eşiğin üstünde ortalama gradyan varsa alan "düz" sayılmaz. */
const DUZLUK_ESIGI = 22

/**
 * Aday pencerenin kadraja göre en küçük ve en büyük genişliği.
 * Çok küçük pencere her yerde "düz" çıkar (bilgi taşımaz), çok büyüğü
 * kadraja sığmaz.
 */
const EN_KUCUK_ORAN = 0.22
const EN_BUYUK_ORAN = 0.8

/**
 * Kareyi çözümleyip tasarım için en uygun dikdörtgeni bulur.
 *
 * @param {HTMLCanvasElement|HTMLVideoElement} kaynak  kamera karesi
 * @param {number} oran  tasarımın en/boy oranı (genişlik / yükseklik)
 * @returns {{x:number, y:number, w:number, h:number, duzluk:number, guven:number}|null}
 *          Değerler 0–1 arası ORANLIDIR (kaynağın ölçüsünden bağımsız).
 */
export function uygunYuzeyBul(kaynak, oran) {
  if (!kaynak || !(oran > 0)) return null

  const kaynakW = kaynak.videoWidth || kaynak.width
  const kaynakH = kaynak.videoHeight || kaynak.height
  if (!kaynakW || !kaynakH) return null

  const W = COZUMLEME_W
  const H = Math.max(1, Math.round((W * kaynakH) / kaynakW))

  const tuval = document.createElement('canvas')
  tuval.width = W
  tuval.height = H
  const ctx = tuval.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(kaynak, 0, 0, W, H)

  let veri
  try {
    veri = ctx.getImageData(0, 0, W, H).data
  } catch {
    return null // farklı kaynaktan gelen görüntü (CORS) okunamaz
  }

  // 1) Gri tonlama
  const gri = new Float32Array(W * H)
  for (let i = 0, p = 0; i < gri.length; i++, p += 4) {
    gri[i] = 0.299 * veri[p] + 0.587 * veri[p + 1] + 0.114 * veri[p + 2]
  }

  // 2) Komşu farkı: sağdaki ve alttaki pikselle
  const gradyan = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const dx = x + 1 < W ? Math.abs(gri[i + 1] - gri[i]) : 0
      const dy = y + 1 < H ? Math.abs(gri[i + W] - gri[i]) : 0
      gradyan[i] = dx + dy
    }
  }

  // 3) Toplam tabloları: gradyan ve parlaklık
  const tg = toplamTablosu(gradyan, W, H)
  const tp = toplamTablosu(gri, W, H)

  // 4) Aday pencereler
  let enIyi = null
  const adimSayisi = 5 // ölçek basamağı
  for (let s = 0; s < adimSayisi; s++) {
    const genislikOran = EN_KUCUK_ORAN + ((EN_BUYUK_ORAN - EN_KUCUK_ORAN) * s) / (adimSayisi - 1)
    const pw = Math.round(W * genislikOran)
    const ph = Math.round(pw / oran)
    if (pw < 8 || ph < 8 || ph > H) continue

    const adim = Math.max(2, Math.round(pw / 8))
    for (let y = 0; y + ph <= H; y += adim) {
      for (let x = 0; x + pw <= W; x += adim) {
        const alan = pw * ph
        const duzluk = dikdortgenToplami(tg, W, x, y, pw, ph) / alan
        if (duzluk > DUZLUK_ESIGI) continue

        const parlaklik = dikdortgenToplami(tp, W, x, y, pw, ph) / alan
        // Kapkara ya da patlamış beyaz alanlar duvar değil, bilgi yok demektir.
        if (parlaklik < 25 || parlaklik > 240) continue

        /*
         * PUAN.
         *  • düzlük        : asıl ölçüt, küçük olan iyi
         *  • büyüklük      : aynı düzlükte daha geniş alan yeğlenir
         *  • dikey konum   : göz hizası tercih edilir; en alt şerit çoğunlukla
         *                    zemin ve kalabalık olur
         *  • yatay merkez  : kadrajın ortasına yakın olan yeğlenir
         */
        const merkezY = (y + ph / 2) / H
        const merkezX = (x + pw / 2) / W
        const dikeyUygunluk = 1 - Math.min(1, Math.abs(merkezY - 0.45) / 0.5)
        const yatayUygunluk = 1 - Math.min(1, Math.abs(merkezX - 0.5) / 0.5)

        const puan =
          (1 - duzluk / DUZLUK_ESIGI) * 3 + genislikOran * 1.4 + dikeyUygunluk * 0.9 + yatayUygunluk * 0.6

        if (!enIyi || puan > enIyi.puan) {
          enIyi = { x, y, w: pw, h: ph, duzluk, puan }
        }
      }
    }
  }

  if (!enIyi) return null

  return {
    x: enIyi.x / W,
    y: enIyi.y / H,
    w: enIyi.w / W,
    h: enIyi.h / H,
    duzluk: enIyi.duzluk,
    // 0–1 arası kabaca güven: alan ne kadar düzse o kadar yüksek
    guven: Math.max(0, Math.min(1, 1 - enIyi.duzluk / DUZLUK_ESIGI)),
  }
}

/** Toplam tablosu (integral image): T[y][x] = sol üst dikdörtgenin toplamı. */
function toplamTablosu(kaynak, W, H) {
  const t = new Float64Array((W + 1) * (H + 1))
  for (let y = 0; y < H; y++) {
    let satir = 0
    for (let x = 0; x < W; x++) {
      satir += kaynak[y * W + x]
      t[(y + 1) * (W + 1) + (x + 1)] = t[y * (W + 1) + (x + 1)] + satir
    }
  }
  return t
}

/** Toplam tablosundan bir dikdörtgenin toplamı — dört okuma. */
function dikdortgenToplami(t, W, x, y, w, h) {
  const g = W + 1
  const a = t[y * g + x]
  const b = t[y * g + (x + w)]
  const c = t[(y + h) * g + x]
  const d = t[(y + h) * g + (x + w)]
  return d - b - c + a
}
