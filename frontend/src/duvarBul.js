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

/*
 * DÜZLÜK EŞİĞİ ARTIK GÖRELİ.
 *
 * Sabit bir eşik iki yönde de yanılıyordu: loş bir odada her yer "düz"
 * çıkıyor, aydınlık ve dokulu bir mekânda ise (sıvalı duvar, halı deseni,
 * tuğla) hiçbir yer eşiği geçemiyor ve "uygun yer bulunamadı" deniyordu.
 * Duvarın düzlüğü mutlak bir sayı değil, O KAREYE GÖRE bir şeydir: aranan,
 * karenin geri kalanından belirgin biçimde daha sakin olan bölge.
 *
 * Eşik bu yüzden karenin kendi ortalama gradyanından türetiliyor; alt ve üst
 * sınırlar yalnızca uç durumlar için (bomboş ya da tamamen kalabalık kare).
 */
const GORELI_KATSAYI = 0.62
const MUTLAK_EN_AZ = 4
const MUTLAK_EN_COK = 34

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

  // 3) Toplam tabloları: gradyan, parlaklık ve parlaklığın KARESİ
  const tg = toplamTablosu(gradyan, W, H)
  const tp = toplamTablosu(gri, W, H)
  /*
   * Karelerin toplamı, herhangi bir dikdörtgenin renk SAÇILIMINI (standart
   * sapma) da dört okumayla vermeye yarıyor. Gradyan "ayrıntı var mı" der;
   * saçılım "renk tek düze mi" der. İkisi farklı şeyleri yakalar: yumuşak
   * geçişli bir gölge gradyanı düşük tutar ama saçılımı büyütür, desenli bir
   * duvar kâğıdı ise tersini yapar. Duvar ikisinde de sakindir.
   */
  const tk = toplamTablosu(kareler(gri), W, H)

  // Karenin genel hareketliliği — eşik buna göre belirlenir.
  const geneOrtalama = dikdortgenToplami(tg, W, 0, 0, W, H) / (W * H)
  const esik = Math.max(MUTLAK_EN_AZ, Math.min(MUTLAK_EN_COK, geneOrtalama * GORELI_KATSAYI))

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
        if (duzluk > esik) continue

        const parlaklik = dikdortgenToplami(tp, W, x, y, pw, ph) / alan
        /*
         * Çok koyu ya da patlamış beyaz alanlar duvar değil: birincisi
         * gölge/karanlık köşe, ikincisi pencere ya da lamba. İkisinde de
         * "ayrıntı yok" ölçütü yanıltıcı biçimde düşük çıkar.
         */
        if (parlaklik < 45 || parlaklik > 240) continue

        // Renk saçılımı: E[x²] − E[x]²
        const kareOrt = dikdortgenToplami(tk, W, x, y, pw, ph) / alan
        const sacilim = Math.sqrt(Math.max(0, kareOrt - parlaklik * parlaklik))
        if (sacilim > 46) continue // içinde koyu/açık iki ayrı şey var demektir

        /*
         * PUAN.
         *  • düzlük        : asıl ölçüt, küçük olan iyi
         *  • büyüklük      : aynı düzlükte daha geniş alan yeğlenir
         *  • dikey konum   : göz hizası tercih edilir; en alt şerit çoğunlukla
         *                    zemin ve kalabalık olur
         *  • yatay merkez  : kadrajın ortasına yakın olan yeğlenir
         *  • açık renk     : duvarlar çoğunlukla beyaz ya da açık tonludur;
         *                    koyu alanlar genellikle gölge, mobilya ya da
         *                    ekranın kendisi olur. Kural değil, TERCİH:
         *                    yeterince düz koyu bir alan hâlâ seçilebilir,
         *                    ama açık olan eşit şartlarda öne geçer.
         */
        const merkezY = (y + ph / 2) / H
        const merkezX = (x + pw / 2) / W
        const dikeyUygunluk = 1 - Math.min(1, Math.abs(merkezY - 0.45) / 0.5)
        const yatayUygunluk = 1 - Math.min(1, Math.abs(merkezX - 0.5) / 0.5)

        const acikRenk = Math.max(0, Math.min(1, (parlaklik - 70) / 130))

        const puan =
          (1 - duzluk / esik) * 3 +
          (1 - Math.min(1, sacilim / 46)) * 1.6 +
          acikRenk * 2.2 +
          genislikOran * 1.4 +
          dikeyUygunluk * 0.9 +
          yatayUygunluk * 0.6

        if (!enIyi || puan > enIyi.puan) {
          enIyi = { x, y, w: pw, h: ph, duzluk, sacilim, parlaklik, puan }
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
    sacilim: enIyi.sacilim,
    parlaklik: enIyi.parlaklik,
    /*
     * Güven: hem pürüzsüzlük hem tek düzelik. Arayüz bunu kullanıcıya
     * "kuvvetli/zayıf öneri" olarak gösteriyor; zayıfsa kullanıcı elle
     * taşımaya devam eder.
     */
    guven: Math.max(
      0,
      Math.min(1, (1 - enIyi.duzluk / esik) * 0.6 + (1 - Math.min(1, enIyi.sacilim / 46)) * 0.4),
    ),
  }
}

/** Her elemanın karesi — renk saçılımı hesabı için. */
function kareler(kaynak) {
  const c = new Float32Array(kaynak.length)
  for (let i = 0; i < kaynak.length; i++) c[i] = kaynak[i] * kaynak[i]
  return c
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
