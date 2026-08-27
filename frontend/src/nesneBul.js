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

/** Pascal VOC sınıf numaraları — yalnızca işimize yarayanlar. */
const SINIF = {
  ARKA_PLAN: 0,
  SISE: 5,
  SANDALYE: 9,
  MASA: 11,
  INSAN: 15,
  SAKSI: 16,
  KOLTUK: 18,
  EKRAN: 20,
}

/** Ekranın üstüne konamayacağı sınıflar. */
const ENGELLER = new Set([SINIF.SISE, SINIF.SANDALYE, SINIF.MASA, SINIF.INSAN, SINIF.SAKSI, SINIF.KOLTUK])

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

  return { w, h, engel, ekranKutusu, sayim }
}

/** Arayüzde göstermek için: bulunan nesnelerin adları. */
export const SINIF_ADLARI = {
  5: 'şişe',
  9: 'sandalye',
  11: 'masa',
  15: 'insan',
  16: 'saksı',
  18: 'koltuk',
  20: 'ekran',
}
