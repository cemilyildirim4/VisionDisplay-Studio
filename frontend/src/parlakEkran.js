/**
 * PARLAK EKRAN / VİTRİN YÜZEYİ BULMA.
 *
 * NEDEN AYRI BİR ARAMA: kenar araması (ekranYuzeyi.js) bir dikdörtgenin
 * KENARLARINI arıyor. Oysa fotoğraftaki çalışan bir LED ekran ya da ışıklı
 * vitrin, çevresinden en çok İÇİYLE ayrılıyor: parlak, doygun renkli ve
 * geniş bir alan. AVM fotoğraflarında dev kavisli ekran, mağaza vitrini,
 * yol kenarındaki bilbord hep böyle. Kenarları zayıf olsa bile içi
 * kesindir; o yüzden önce iç, sonra kenar.
 *
 * YÖNTEM:
 *   1) Fotoğraf küçültülüp her piksel için "ekran olma" puanı çıkarılıyor:
 *      parlaklık + renk doygunluğu, çevresine göre.
 *   2) Bu puanın üstünde kalan pikseller bağlantılı bölgelere ayrılıyor.
 *   3) Kadrajın %1,5–%45'i arasında, en/boy oranı makul, gökyüzü olmayan
 *      en büyük bölge kazanıyor.
 *
 * Dönen kutu, kenar aramasına (mevcutEkranYuzeyi) başlangıç olarak
 * veriliyor; oradan dört köşe ve perspektif çıkıyor.
 */

/** Çözümleme genişliği. */
const W_COZ = 200

/**
 * @param {HTMLCanvasElement} tuval
 * @returns {{x:number,y:number,w:number,h:number,skor:number}|null} 0–1 kutu
 */
export function parlakEkranKutusu(tuval) {
  const kw = tuval.width || tuval.naturalWidth
  const kh = tuval.height || tuval.naturalHeight
  if (!kw || !kh) return null
  const W = Math.min(W_COZ, kw)
  const H = Math.max(1, Math.round((kh * W) / kw))

  let d
  try {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(tuval, 0, 0, W, H)
    d = ctx.getImageData(0, 0, W, H).data
  } catch {
    return null
  }

  const N = W * H
  const parlak = new Float32Array(N)
  const doygun = new Float32Array(N)
  const mavi = new Uint8Array(N)
  let ortalama = 0
  for (let i = 0, p = 0; i < N; i++, p += 4) {
    const r = d[p]
    const g = d[p + 1]
    const b = d[p + 2]
    const enB = Math.max(r, g, b)
    const enK = Math.min(r, g, b)
    parlak[i] = (r + g + b) / 3
    doygun[i] = enB > 0 ? (enB - enK) / enB : 0
    /* Gökyüzü: mavi baskın ve üst yarıda — ekran sayılmaz. */
    mavi[i] = b - r > 25 ? 1 : 0
    ortalama += parlak[i]
  }
  ortalama /= N

  /*
   * EŞİK ÇEVREYE GÖRE. Gece fotoğrafında 150 parlaklık ekrandır, aydınlık
   * bir AVM'de değildir. Bu yüzden eşik kadrajın ortalamasından türüyor.
   */
  const esik = Math.max(60, ortalama * 1.25)
  const uygun = new Uint8Array(N)
  for (let i = 0; i < N; i++) {
    if (mavi[i]) continue
    /* Ya belirgin parlak ya da parlak+renkli (yayın yapan ekran). */
    if (parlak[i] > esik || (parlak[i] > ortalama && doygun[i] > 0.35)) uygun[i] = 1
  }

  /* Bağlantılı bölgeler (4 komşu, yığınla). */
  const etiket = new Int32Array(N).fill(-1)
  let enIyi = null
  const yigin = []
  for (let s = 0; s < N; s++) {
    if (!uygun[s] || etiket[s] >= 0) continue
    let x0 = W
    let y0 = H
    let x1 = 0
    let y1 = 0
    let alan = 0
    let toplamParlak = 0
    yigin.length = 0
    yigin.push(s)
    etiket[s] = s
    while (yigin.length) {
      const i = yigin.pop()
      const x = i % W
      const y = (i / W) | 0
      alan++
      toplamParlak += parlak[i]
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      const komsu = [i - 1, i + 1, i - W, i + W]
      for (let k = 0; k < 4; k++) {
        const j = komsu[k]
        if (j < 0 || j >= N || etiket[j] >= 0 || !uygun[j]) continue
        if (k < 2 && Math.abs((j % W) - x) !== 1) continue
        etiket[j] = s
        yigin.push(j)
      }
    }

    const kutuW = x1 - x0 + 1
    const kutuH = y1 - y0 + 1
    const kutuAlan = kutuW * kutuH
    const kadrajPay = kutuAlan / N
    if (kadrajPay < 0.015 || kadrajPay > 0.45) continue
    const enBoy = kutuW / kutuH
    if (enBoy < 0.25 || enBoy > 5) continue
    /* Bölge kutusunu ne kadar dolduruyor: ekran doludur, ışık huzmesi değil. */
    const doluluk = alan / kutuAlan
    if (doluluk < 0.55) continue
    /* Kadrajın en altındaki parlaklık zemin yansımasıdır. */
    if (y0 / H > 0.8) continue

    const skor = doluluk * 45 + Math.min(1, kadrajPay / 0.2) * 30 + (toplamParlak / alan / 255) * 25
    if (!enIyi || skor > enIyi.skor) {
      enIyi = {
        x: x0 / W,
        y: y0 / H,
        w: kutuW / W,
        h: kutuH / H,
        skor,
      }
    }
  }

  return enIyi
}
