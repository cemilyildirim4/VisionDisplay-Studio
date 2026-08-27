/**
 * DERİNLİK KESTİRİMİ — fotoğrafın üç boyutlu okunması.
 *
 * Nesne tanıma (nesneBul.js) "bu bir sandalye" diyor, ama duvarı duvar olarak
 * bilmiyor: eğittiği veri kümesinde duvar, zemin, tavan diye sınıflar yok.
 * Yerleştirmenin asıl sorusu ise geometrik: BURASI DÜZ BİR YÜZEY Mİ, ÖNÜNDE
 * BİR ŞEY VAR MI?
 *
 * Buna cevap veren şey derinlik. Depth Anything V2 (Small) her piksel için
 * göreli derinlik üretiyor. Apache-2.0 lisanslı, 27 MB, tarayıcıda çalışıyor.
 *
 * DÜZLEM SINAMASI — neden doğrudan derinliğe değil de EĞİMİNE bakıyoruz:
 * Perspektifte bir düzlemin TERS derinliği (disparite), görüntü düzleminde
 * birinci dereceden bir fonksiyondur:
 *
 *      1/Z ≈ a·x + b·y + c
 *
 * Model de zaten ters derinliğe orantılı bir değer veriyor. Yani bir pencereye
 * en küçük kareler yöntemiyle düzlem uydurup ARTIĞA bakmak, "burası düz bir
 * yüzey mi" sorusunun doğrudan cevabı oluyor. Duvar, pano, vitrin camı: artık
 * küçük. Sandalyeler, saksı, kalabalık bir raf: artık büyük.
 *
 * ÖNÜNDE BİR ŞEY VAR MI: düzleme göre KAMERAYA DOĞRU çıkan pikseller. Duvarın
 * önündeki masa, insan, direk — hepsi burada yakalanıyor; model onları
 * isimleriyle tanımasa bile.
 *
 * Bu, parlaklık ve gradyan tahminlerinin yerini alan gerçek bir ölçüm.
 */

/*
 * Model 14'ün katı ölçü istiyor (DINOv2 yama boyu). 322 = 14×23; küçük
 * tutuldu, çünkü tek iş parçacığında çalışıyor ve bize piksel piksel keskinlik
 * değil, yüzeylerin geometrisi gerekiyor.
 */
const GIRIS = 322

/* ImageNet ortalama/sapma — DPTImageProcessor ile aynı. */
const ORT = [0.485, 0.456, 0.406]
const SAPMA = [0.229, 0.224, 0.225]

let oturumSozu = null

async function oturum() {
  if (oturumSozu) return oturumSozu
  oturumSozu = (async () => {
    const ort = await import('onnxruntime-web/wasm')
    ort.env.wasm.wasmPaths = '/ort/'
    ort.env.wasm.numThreads = 1
    ort.env.wasm.proxy = false
    ort.env.logLevel = 'error'
    const s = await ort.InferenceSession.create('/modeller/derinlik.onnx', {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    })
    return { ort, s }
  })().catch((e) => {
    oturumSozu = null
    throw e
  })
  return oturumSozu
}

/**
 * Fotoğrafın derinlik haritası.
 *
 * @param {HTMLCanvasElement} kaynak
 * @param {number} cikisW çözümleme genişliği
 * @returns {Promise<{w:number,h:number,veri:Float32Array}|null>}
 *          `veri`: 0–1 arasına ölçeklenmiş göreli TERS derinlik
 *          (büyük = yakın).
 */
export async function derinlikHaritasi(kaynak, cikisW = 160) {
  const kw = kaynak.naturalWidth || kaynak.width
  const kh = kaynak.naturalHeight || kaynak.height
  if (!kw || !kh) return null

  const { ort, s } = await oturum()

  const t = document.createElement('canvas')
  t.width = GIRIS
  t.height = GIRIS
  const ctx = t.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(kaynak, 0, 0, GIRIS, GIRIS) // en/boy burada bilerek esnetiliyor
  const piksel = ctx.getImageData(0, 0, GIRIS, GIRIS).data

  const giris = new Float32Array(3 * GIRIS * GIRIS)
  const kanal = GIRIS * GIRIS
  for (let i = 0, p = 0; i < kanal; i++, p += 4) {
    giris[i] = (piksel[p] / 255 - ORT[0]) / SAPMA[0]
    giris[kanal + i] = (piksel[p + 1] / 255 - ORT[1]) / SAPMA[1]
    giris[2 * kanal + i] = (piksel[p + 2] / 255 - ORT[2]) / SAPMA[2]
  }

  const sonuc = await s.run({
    [s.inputNames[0]]: new ort.Tensor('float32', giris, [1, 3, GIRIS, GIRIS]),
  })
  const cikti = sonuc[s.outputNames[0]]
  const [, oh, ow] = cikti.dims.length === 3 ? cikti.dims : [1, cikti.dims[2], cikti.dims[3]]
  const ham = cikti.data

  /* 0–1 aralığına çek: mutlak değer bize gerekmiyor, biçim gerekiyor. */
  let enAz = Infinity
  let enCok = -Infinity
  for (let i = 0; i < ham.length; i++) {
    if (ham[i] < enAz) enAz = ham[i]
    if (ham[i] > enCok) enCok = ham[i]
  }
  const genlik = enCok - enAz || 1

  const w = cikisW
  const h = Math.max(1, Math.round((cikisW * kh) / kw))
  const veri = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const sy = Math.min(oh - 1, Math.floor((y / h) * oh))
    for (let x = 0; x < w; x++) {
      const sx = Math.min(ow - 1, Math.floor((x / w) * ow))
      veri[y * w + x] = (ham[sy * ow + sx] - enAz) / genlik
    }
  }
  return { w, h, veri }
}

/**
 * Bir dikdörtgene düzlem uydurur.
 *
 * @returns {{artik:number, onundeki:number, egimX:number, egimY:number}}
 *   artik     — düzleme uyum hatası (0'a yakın = düz yüzey)
 *   onundeki  — düzlemin ÖNÜNE çıkan piksellerin oranı (0 = önü açık)
 *   egimX/Y   — düzlemin eğimi; duvarın hangi yöne kaçtığını söyler
 */
export function duzlemUyumu(harita, x0, y0, w, h) {
  const { w: W, veri } = harita
  let n = 0
  let sx = 0
  let sy = 0
  let sz = 0
  let sxx = 0
  let sxy = 0
  let syy = 0
  let sxz = 0
  let syz = 0

  /* Örnekleme adımı: her pikseli okumak gerekmiyor, biçim yeterli. */
  const adim = Math.max(1, Math.round(Math.min(w, h) / 12))
  for (let y = y0; y < y0 + h; y += adim) {
    for (let x = x0; x < x0 + w; x += adim) {
      const z = veri[y * W + x]
      n++
      sx += x
      sy += y
      sz += z
      sxx += x * x
      sxy += x * y
      syy += y * y
      sxz += x * z
      syz += y * z
    }
  }
  if (n < 6) return { artik: 1, onundeki: 1, egimX: 0, egimY: 0 }

  /* En küçük kareler: z = a·x + b·y + c */
  const m11 = sxx - (sx * sx) / n
  const m12 = sxy - (sx * sy) / n
  const m22 = syy - (sy * sy) / n
  const v1 = sxz - (sx * sz) / n
  const v2 = syz - (sy * sz) / n
  const det = m11 * m22 - m12 * m12
  let a = 0
  let b = 0
  if (Math.abs(det) > 1e-9) {
    a = (v1 * m22 - v2 * m12) / det
    b = (v2 * m11 - v1 * m12) / det
  }
  const c = (sz - a * sx - b * sy) / n

  /* Önce artıklar, sonra eşik: eşik ölçümün kendi gürültüsünden türüyor. */
  const farklar = []
  let kareToplam = 0
  for (let y = y0; y < y0 + h; y += adim) {
    for (let x = x0; x < x0 + w; x += adim) {
      const fark = veri[y * W + x] - (a * x + b * y + c)
      farklar.push(fark)
      kareToplam += fark * fark
    }
  }
  const sayac = farklar.length || 1
  const rms = Math.sqrt(kareToplam / sayac)

  /*
   * "ÖNÜNDE BİR ŞEY VAR" EŞİĞİ GÖRELİ.
   *
   * Sabit bir eşik (0,035) işe yaramadı: model gerçek fotoğrafta pürüzsüz bir
   * duvarda bile küçük dalgalanmalar üretiyor ve düzgün duvarların onda biri
   * "önünde bir şey var" sayılıp eleniyordu — hiçbir aday kalmıyordu.
   *
   * Ölçüt şu olmalı: bu piksel, yüzeyin KENDİ gürültüsünün belirgin biçimde
   * dışında mı? Yani eşik, uyumun artığına göre belirleniyor.
   */
  const ondeEsik = Math.max(0.05, rms * 3)
  let onde = 0
  for (const f of farklar) {
    /*
     * Ters derinlikte BÜYÜK değer YAKIN demek; düzlemden belirgin biçimde
     * büyük olan piksel, yüzeyin önünde duran bir nesnedir.
     */
    if (f > ondeEsik) onde++
  }

  return {
    artik: rms,
    onundeki: onde / Math.max(1, sayac),
    egimX: a,
    egimY: b,
  }
}
