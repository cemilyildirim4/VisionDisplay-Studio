/**
 * FOTOĞRAFTAKİ KENARLAR VE KÖŞELER — işaretlemeyi oraya oturtmak için.
 *
 * Ölçüm hatasının büyük kısmı tıklama hatası: kullanıcı duvarın köşesini
 * göz kararıyla birkaç piksel şaşıyor, o birkaç piksel ölçeğe girip
 * santimetrelere dönüşüyor. Burası fotoğrafın kendisine bakıp "senin
 * tıkladığın yerin 10 piksel yanında gerçek bir köşe var" diyor.
 *
 * NESNE TANIMA DEĞİL. Burada hiçbir şeyin ne olduğu anlaşılmıyor; yalnızca
 * parlaklığın hızlı değiştiği yerler aranıyor:
 *   • Sobel → her pikselde parlaklığın eğimi (kenar).
 *   • Harris → eğimin İKİ YÖNDE birden güçlü olduğu yerler (köşe).
 * Duvar/tavan birleşimi, kapı pervazı, pano kenarı bunların hepsi birer
 * kenar; iki kenarın kesiştiği yer de köşe.
 *
 * ÖNCE KÖŞE, SONRA KENAR. Kullanıcı köşe işaretliyor; yakında gerçek bir
 * köşe varsa oraya oturmalı. Köşe yoksa en azından kenarın üstüne oturmak
 * serbest bırakmaktan iyi — kenar boyunca kayma ölçüyü çok az bozar, kenarın
 * dışına düşmek çok bozar.
 *
 * FOTOĞRAF KÜÇÜLTÜLEREK İŞLENİYOR (en çok 720 px). Tam çözünürlükte işlem
 * saniyeler sürüyor ve hiçbir şey kazandırmıyor: aranan şey keskin geçişler
 * ve onlar küçültülmüş kopyada da keskin. Dönen koordinatlar bu küçültülmüş
 * kopyanın pikseli; çağıran taraf kendi ölçeğine çeviriyor.
 */

/** Diziden yaklaşık yüzdelik — tamamını sıralamamak için örnekleyerek. */
function yuzdelik(dizi, oran) {
  const ornek = []
  /* Her 7. değer: desenli görüntülerde art arda örneklemekten daha dengeli. */
  for (let i = 0; i < dizi.length; i += 7) {
    const v = dizi[i]
    if (v > 0) ornek.push(v)
  }
  if (ornek.length === 0) return Infinity
  ornek.sort((a, b) => a - b)
  return ornek[Math.min(ornek.length - 1, Math.floor(ornek.length * oran))]
}

/**
 * Fotoğraf için kenar/köşe haritası çıkarır.
 * @returns {Promise<{w,h,mag:Float32Array,kose:Float32Array,koseEsigi:number,magEsigi:number}|null>}
 */
export async function kenarHaritasiCikar(url, enCok = 720) {
  if (!url || typeof document === 'undefined') return null
  let g
  try {
    g = await new Promise((coz, red) => {
      const im = new Image()
      im.crossOrigin = 'anonymous'
      im.onload = () => coz(im)
      im.onerror = red
      im.src = url
    })
  } catch {
    return null
  }
  const W0 = g.naturalWidth
  const H0 = g.naturalHeight
  if (!(W0 > 0) || !(H0 > 0)) return null

  const k = Math.min(1, enCok / Math.max(W0, H0))
  const w = Math.max(16, Math.round(W0 * k))
  const h = Math.max(16, Math.round(H0 * k))
  const tuval = document.createElement('canvas')
  tuval.width = w
  tuval.height = h
  const ctx = tuval.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(g, 0, 0, w, h)
  let d
  try {
    d = ctx.getImageData(0, 0, w, h).data
  } catch {
    /* Başka kaynaktan gelen görselde tuval kirlenir ve okunamaz. */
    return null
  }

  const gri = new Float32Array(w * h)
  for (let i = 0, n = w * h; i < n; i++) {
    const j = i * 4
    gri[i] = (d[j] * 0.299 + d[j + 1] * 0.587 + d[j + 2] * 0.114) / 255
  }

  const gx = new Float32Array(w * h)
  const gy = new Float32Array(w * h)
  const mag = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const ul = gri[i - w - 1]
      const u = gri[i - w]
      const ur = gri[i - w + 1]
      const sl = gri[i - 1]
      const sr = gri[i + 1]
      const al = gri[i + w - 1]
      const a = gri[i + w]
      const ar = gri[i + w + 1]
      const sx = ur + 2 * sr + ar - (ul + 2 * sl + al)
      const sy = al + 2 * a + ar - (ul + 2 * u + ur)
      gx[i] = sx
      gy[i] = sy
      mag[i] = Math.hypot(sx, sy)
    }
  }

  /* Harris: 3×3 pencerede yapı matrisi, R = det − 0,04·iz². */
  const kose = new Float32Array(w * h)
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      let sxx = 0
      let syy = 0
      let sxy = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const j = (y + dy) * w + (x + dx)
          sxx += gx[j] * gx[j]
          syy += gy[j] * gy[j]
          sxy += gx[j] * gy[j]
        }
      }
      const iz = sxx + syy
      const r = sxx * syy - sxy * sxy - 0.04 * iz * iz
      if (r > 0) kose[y * w + x] = r
    }
  }

  return {
    w,
    h,
    mag,
    kose,
    /* Eşikler görüntüye GÖRE: karanlık bir fotoğrafta sabit eşik hiçbir şey bulamaz. */
    koseEsigi: yuzdelik(kose, 0.995),
    magEsigi: yuzdelik(mag, 0.9),
  }
}

/**
 * Verilen noktanın yakınındaki gerçek köşe/kenar.
 * Koordinatlar haritanın kendi pikselinde.
 *
 * @param {object} harita kenarHaritasiCikar çıktısı
 * @param {number} ix, @param {number} iy aranan nokta
 * @param {number} yaricap kaç piksele kadar bakılacağı
 * @returns {{x:number,y:number,tip:'kose'|'kenar'}|null}
 */
export function yapisacakNokta(harita, ix, iy, yaricap) {
  if (!harita || !Number.isFinite(ix) || !Number.isFinite(iy)) return null
  const { w, h, mag, kose, koseEsigi, magEsigi } = harita
  const ara = (dizi, esik, r, tip) => {
    const x0 = Math.max(1, Math.round(ix) - r)
    const x1 = Math.min(w - 2, Math.round(ix) + r)
    const y0 = Math.max(1, Math.round(iy) - r)
    const y1 = Math.min(h - 2, Math.round(iy) + r)
    let enIyi = null
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const v = dizi[y * w + x]
        if (!(v >= esik)) continue
        const u = Math.hypot(x - ix, y - iy)
        if (u > r) continue
        /* Güçlü ama uzak bir aday, zayıf ama yakın olana yenilebilmeli. */
        const puan = v / (1 + u)
        if (!enIyi || puan > enIyi.puan) enIyi = { x, y, puan }
      }
    }
    return enIyi ? { x: enIyi.x, y: enIyi.y, tip } : null
  }
  const r = Math.max(2, Math.round(yaricap))
  /* Köşe önce: köşe varsa kenara oturmak yanlış olur. */
  const k = ara(kose, koseEsigi, r, 'kose')
  if (k) return k
  /*
   * Kenar yarıçapı daha dar. Kenar fotoğrafın her yerinde var; geniş
   * yarıçapta nokta kullanıcının hiç bakmadığı bir kenara kaçabilir.
   */
  return ara(mag, magEsigi, Math.max(2, Math.round(r * 0.55)), 'kenar')
}
