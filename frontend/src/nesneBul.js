/**
 * NESNE TANIMA (yapay sinir ağı) — fotoğraftaki eşyaları gerçekten görmek.
 *
 * Bundan önceki yerleştirme, görüntünün "düzlüğüne" bakan sezgisel ölçütlerle
 * çalışıyordu: kalabalık olmayan bir alan ara, zeminin altına koyma, mavi olan
 * yeri gökyüzü say. İşe yarıyordu ama tahmindi; masayı masa, sandalyeyi
 * sandalye olarak bilmiyordu.
 *
 * Burada gerçek bir model çalışıyor: DeepLabV3 + MobileNetV2, Pascal VOC ile
 * eğitilmiş, ONNX biçiminde, tarayıcıda (onnxruntime-web / WASM). Her piksele
 * bir sınıf veriyor. Bizim için önemli olanlar:
 *
 *   • İNSAN, SANDALYE, KOLTUK, MASA, SAKSI, ŞİŞE → ekranın konamayacağı yer.
 *     Bunlar odanın önündeki hacimdir; oraya konan bir ekran havada durur.
 *   • TELEVİZYON/EKRAN → tam tersi: odada ekranın DURDUĞU yer orasıdır.
 *     Müşteri LED ekranı zaten oraya koymak istiyor.
 *   • ARKA PLAN (0) → duvar, zemin, tavan, gökyüzü. Model bunları birbirinden
 *     ayırmıyor; o ayrımı duvarBul.js'teki ölçütler yapmaya devam ediyor.
 *
 * NEDEN BU MODEL: Apache-2.0 lisanslı (ticari kullanıma açık), 8,4 MB ve
 * tarayıcıda çalışıyor. ADE20K ile eğitilmiş modeller duvar/zemin sınıflarını
 * da veriyordu ama ağırlıkları ticari kullanıma kapalı lisanslarla geliyor.
 *
 * MALİYET: model ve çalışma zamanı ANA PAKETE GİRMİYOR; yalnızca kullanıcı
 * mekân fotoğrafı eklediğinde indiriliyor ve tarayıcı önbelleğinde kalıyor.
 * Fotoğraf cihazdan çıkmıyor — sunucuya hiçbir şey gönderilmiyor.
 */

/** Modelin beklediği kare ölçüsü. */
const GIRIS = 513

/*
 * PASCAL VOC'UN YİRMİ SINIFININ TAMAMI.
 *
 * Önceden bunlardan yalnızca yedisi okunuyordu ve hepsi tek bir "engel"
 * maskesinde eritiliyordu; yani model arabayı da koltuğu da görüyordu ama
 * yerleştirme ikisini de "burası dolu" diye biliyordu. Oysa nesnenin NE
 * olduğu, ekranın nereye geleceğini doğrudan söylüyor: koltuğun KARŞISI
 * ekranlıktır, arabanın ÜSTÜ bilbordluktur, televizyonun kendisi zaten
 * hedeftir. Tam liste bu yüzden dışarı veriliyor (bkz. nesneAkli.js).
 */
export const VOC = {
  ARKA_PLAN: 0,
  UCAK: 1,
  BISIKLET: 2,
  KUS: 3,
  TEKNE: 4,
  SISE: 5,
  OTOBUS: 6,
  ARABA: 7,
  KEDI: 8,
  SANDALYE: 9,
  INEK: 10,
  MASA: 11,
  KOPEK: 12,
  AT: 13,
  MOTOSIKLET: 14,
  INSAN: 15,
  SAKSI: 16,
  KOYUN: 17,
  KOLTUK: 18,
  TREN: 19,
  EKRAN: 20,
}

const SINIF = VOC

/*
 * ENGEL = EKRANIN ÜSTÜNE KONAMAYACAĞI HER ŞEY.
 *
 * Liste eşyayla sınırlıydı; araçlar ve canlılar dışarıda kalmıştı. Sokak
 * fotoğrafında bu, tasarımın bir otobüsün üzerine oturması demekti. Kural
 * basit: arka plan ve EKRAN dışındaki her sınıf hacimli bir cisimdir,
 * duvar değildir.
 */
const ENGELLER = new Set(
  Object.values(SINIF).filter((c) => c !== SINIF.ARKA_PLAN && c !== SINIF.EKRAN),
)

let oturumSozu = null

/** Model ve çalışma zamanı — bir kez yüklenir, sonra bellekte kalır. */
async function oturum() {
  if (oturumSozu) return oturumSozu
  oturumSozu = (async () => {
    /*
     * Yalnizca WASM dali iceri aliniyor ('onnxruntime-web/wasm'): tam paket
     * WebGPU dalini da getiriyor ve onunla birlikte 27 MB lik ikinci bir .wasm
     * dosyasi derlemeye giriyordu. Bize gerekmiyor.
     */
    const ort = await import('onnxruntime-web/wasm')
    /*
     * Çalışma zamanının .wasm dosyası public/ort altından veriliyor: Vite'ın
     * paketleme yolundan geçmiyor, böylece ana paket büyümüyor.
     *
     * TEK İŞ PARÇACIĞI: çok çekirdekli WASM, SharedArrayBuffer istiyor; o da
     * sayfanın çapraz kaynak yalıtımı (COOP/COEP) başlıklarıyla sunulmasını
     * şart koşuyor. Vercel'de bu başlıklar yok ve açmak başka şeyleri bozardı.
     * Tek parçacıkla model birkaç saniyede bitiyor, tek seferlik bir iş.
     */
    ort.env.wasm.wasmPaths = '/ort/'
    ort.env.wasm.numThreads = 1
    ort.env.wasm.proxy = false
    ort.env.logLevel = 'error'
    const s = await ort.InferenceSession.create('/modeller/nesne.onnx', {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    })
    return { ort, s }
  })().catch((e) => {
    oturumSozu = null // bir daha denenebilsin
    throw e
  })
  return oturumSozu
}

/**
 * Fotoğraftaki nesneleri bulur.
 *
 * @param {HTMLCanvasElement} kaynak
 * @param {number} cikisW  döndürülecek haritanın genişliği (çözümleme ölçüsü)
 * @returns {Promise<{w:number,h:number,engel:Float32Array,ekranKutusu:object|null,
 *          sayim:object}|null>}
 *          `engel`: 0–1, o pikselde ekranı engelleyen bir nesne var mı.
 */
export async function nesneHaritasi(kaynak, cikisW = 160) {
  const kw = kaynak.naturalWidth || kaynak.width
  const kh = kaynak.naturalHeight || kaynak.height
  if (!kw || !kh) return null

  const { ort, s } = await oturum()

  /*
   * Model kare bekliyor. Fotoğrafı ÇARPITMADAN kareye oturtuyoruz (en/boy
   * korunuyor, kalan yer siyahla dolduruluyor); çarpıtılmış bir görüntüde
   * model nesneleri daha kötü tanıyor. Doldurulan bölge sonradan atılıyor.
   */
  const olcek = Math.min(GIRIS / kw, GIRIS / kh)
  const cw = Math.round(kw * olcek)
  const ch = Math.round(kh * olcek)
  const t = document.createElement('canvas')
  t.width = GIRIS
  t.height = GIRIS
  const tctx = t.getContext('2d', { willReadFrequently: true })
  tctx.fillStyle = '#000'
  tctx.fillRect(0, 0, GIRIS, GIRIS)
  tctx.drawImage(kaynak, 0, 0, cw, ch)
  const piksel = tctx.getImageData(0, 0, GIRIS, GIRIS).data

  const giris = new Uint8Array(GIRIS * GIRIS * 3)
  for (let i = 0, p = 0; i < GIRIS * GIRIS; i++, p += 4) {
    giris[i * 3] = piksel[p]
    giris[i * 3 + 1] = piksel[p + 1]
    giris[i * 3 + 2] = piksel[p + 2]
  }

  const tensor = new ort.Tensor('uint8', giris, [1, GIRIS, GIRIS, 3])
  const sonuc = await s.run({ [s.inputNames[0]]: tensor })
  const sinif = sonuc[s.outputNames[0]].data // her piksel için sınıf numarası

  /* Çıkış haritası: fotoğrafın kendi en/boy oranında, istenen genişlikte. */
  const w = cikisW
  const h = Math.max(1, Math.round((cikisW * kh) / kw))
  const engel = new Float32Array(w * h)
  /* Sınıf haritası da saklanıyor: bölge çıkarımı ve akıl katmanı bunu okuyor. */
  const siniflar = new Uint8Array(w * h)
  const sayim = {}
  let ekranX0 = Infinity
  let ekranY0 = Infinity
  let ekranX1 = -Infinity
  let ekranY1 = -Infinity

  for (let y = 0; y < h; y++) {
    // Doldurulan siyah bölge dışarıda kalsın diye yalnızca cw×ch alanına bakılıyor
    const sy = Math.min(ch - 1, Math.floor((y / h) * ch))
    for (let x = 0; x < w; x++) {
      const sx = Math.min(cw - 1, Math.floor((x / w) * cw))
      const c = Number(sinif[sy * GIRIS + sx])
      siniflar[y * w + x] = c
      sayim[c] = (sayim[c] || 0) + 1
      if (ENGELLER.has(c)) engel[y * w + x] = 1
      if (c === SINIF.EKRAN) {
        if (x < ekranX0) ekranX0 = x
        if (y < ekranY0) ekranY0 = y
        if (x > ekranX1) ekranX1 = x
        if (y > ekranY1) ekranY1 = y
      }
    }
  }

  /*
   * Mevcut ekran kutusu: yalnızca ciddi bir alan kaplıyorsa. Birkaç piksellik
   * yanlış tanıma, ekranı odanın yanlış köşesine çekerdi.
   */
  const ekranAlani = (sayim[SINIF.EKRAN] || 0) / (w * h)
  const ekranKutusu =
    ekranAlani > 0.005 && ekranX1 > ekranX0
      ? { x: ekranX0 / w, y: ekranY0 / h, w: (ekranX1 - ekranX0 + 1) / w, h: (ekranY1 - ekranY0 + 1) / h }
      : null

  return { w, h, engel, siniflar, ekranKutusu, sayim, bolgeler: bolgeleriCikar(siniflar, w, h) }
}

/**
 * Sınıf haritasını BAĞLANTILI BÖLGELERE ayırır.
 *
 * Piksel sayısı "bu fotoğrafta koltuk var" demeye yetiyor ama "koltuk
 * NEREDE" sorusuna cevap vermiyor; yer seçmek için gereken tam da bu.
 * Aynı sınıftan komşu pikseller birleştirilip her birinin kadrajdaki
 * kutusu çıkarılıyor.
 *
 * Kadrajın binde birinden küçük lekeler atılıyor: tek tük yanlış etiketlenen
 * pikseller odanın ortasına hayali bir koltuk koyardı.
 *
 * @returns {Array<{sinif:number,x:number,y:number,w:number,h:number,alan:number}>}
 *          kutu değerleri 0–1 oranlı, alan kadraja göre pay.
 */
function bolgeleriCikar(siniflar, W, H) {
  const N = W * H
  const gorulen = new Uint8Array(N)
  const sonuc = []
  const yigin = []
  const enAz = Math.max(12, Math.round(N * 0.001))
  for (let bas = 0; bas < N; bas++) {
    if (gorulen[bas]) continue
    const c = siniflar[bas]
    if (!c) continue
    let x0 = W
    let y0 = H
    let x1 = 0
    let y1 = 0
    let alan = 0
    yigin.length = 0
    yigin.push(bas)
    gorulen[bas] = 1
    while (yigin.length) {
      const i = yigin.pop()
      const x = i % W
      const y = (i / W) | 0
      alan++
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      const komsu = [i - 1, i + 1, i - W, i + W]
      for (let k = 0; k < 4; k++) {
        const j = komsu[k]
        if (j < 0 || j >= N || gorulen[j]) continue
        if (k < 2 && Math.abs((j % W) - x) !== 1) continue
        if (siniflar[j] !== c) continue
        gorulen[j] = 1
        yigin.push(j)
      }
    }
    if (alan < enAz) continue
    sonuc.push({
      sinif: c,
      x: x0 / W,
      y: y0 / H,
      w: (x1 - x0 + 1) / W,
      h: (y1 - y0 + 1) / H,
      alan: alan / N,
    })
  }
  sonuc.sort((a, b) => b.alan - a.alan)
  /* Uzun kuyruk işe yaramıyor; en belirgin on iki cisim yeter. */
  return sonuc.slice(0, 12)
}

/** Arayüzde göstermek için: bulunan nesnelerin adları. */
export const SINIF_ADLARI = {
  1: 'uçak',
  2: 'bisiklet',
  3: 'kuş',
  4: 'tekne',
  5: 'şişe',
  6: 'otobüs',
  7: 'araba',
  8: 'kedi',
  9: 'sandalye',
  10: 'inek',
  11: 'masa',
  12: 'köpek',
  13: 'at',
  14: 'motosiklet',
  15: 'insan',
  16: 'saksı',
  17: 'koyun',
  18: 'koltuk',
  19: 'tren',
  20: 'ekran',
}
