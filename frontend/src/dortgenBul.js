/**
 * EKRAN YÜZEYİ ARAMA — fotoğraftaki dört köşeli düz yüzeyler.
 *
 * Bir billboard, dijital totem, vitrin ekranı ya da boş bir pano fotoğrafta
 * DÖRTGEN görünür: dört güçlü düz kenar, içi kendi içinde tutarlı bir düzlem.
 * Perspektif yüzünden dikdörtgen değil yamuktur; aradığımız şey tam olarak o
 * yamuğun dört köşesi.
 *
 * YÖNTEM
 *   1) Sobel ile kenarlar ve yönleri.
 *   2) Hough dönüşümü ile güçlü doğrular — yataya yakın olanlar ve dikeye
 *      yakın olanlar ayrı ayrı toplanıyor.
 *   3) İki yatay + iki dikey doğrunun kesişimleri bir aday dörtgen veriyor.
 *   4) Her aday puanlanıyor:
 *        • KENAR DESTEĞİ — kenarların üstünde gerçekten kenar var mı? Sahte
 *          dörtgenleri eleyen asıl ölçüt bu.
 *        • DÜZLEM — içi derinlikte tek bir düzlem mi (bkz. derinlikBul.js).
 *        • ÖNÜ AÇIK MI — önünde insan/araç/ağaç var mı.
 *        • BÜYÜKLÜK, en/boy makullüğü, kadrajdaki yeri.
 *        • Nesne tanıma bir ekran gördüyse onunla örtüşme.
 *
 * Bu, "düz ve boş alan" aramasından farklı bir soru soruyor: orası bir YÜZEY
 * mi? Boş duvar aramasıyla birlikte çalışıyor — dörtgen bulunursa o öncelikli,
 * bulunamazsa duvar araması devrede.
 */

import { duzlemUyumu } from './derinlikBul.js'

const COZUMLEME_W = 400

/** Yataya/dikeye yakınlık sınırı (derece). */
const YATAY_SINIR = 35
const DIKEY_SINIR = 35

/** Kenar sayılma eşiği — karenin kendi ortalamasına göre. */
const KENAR_KATSAYI = 2.0

/**
 * Fotoğraftaki en iyi ekran/pano yüzeyini arar.
 *
 * @param {HTMLCanvasElement} kaynak
 * @param {object} [sec]
 * @param {object|null} [sec.derinlik] derinlik haritası
 * @param {object|null} [sec.nesneler] nesne haritası
 * @param {number} [sec.oran] tasarımın en/boy oranı
 * @returns {{koseler:Array<{x:number,y:number}>, skor:number, tur:string,
 *           kenarDestegi:number, artik:number}|null}
 *          Köşeler 0–1 ORANLI (sol üst, sağ üst, sağ alt, sol alt).
 */
export function ekranYuzeyiBul(kaynak, sec = {}) {
  const veri = griKare(kaynak)
  if (!veri) return null
  const { gri, W, H } = veri
  const { derinlik = null, nesneler = null, oran = 16 / 9 } = sec

  const { mag, aci } = sobel(gri, W, H)
  let toplam = 0
  for (let i = 0; i < mag.length; i++) toplam += mag[i]
  const esik = (toplam / mag.length) * KENAR_KATSAYI || 1

  const yatay = hough(mag, aci, W, H, esik, true)
  const dikey = hough(mag, aci, W, H, esik, false)
  if (yatay.length < 2 || dikey.length < 2) return null

  /* Kenar desteği için magnitüdün toplam tablosu gerekmiyor: doğrudan örnekleme. */
  const destek = (a, b) => {
    const n = 24
    let sayac = 0
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const x = Math.round(a.x + (b.x - a.x) * t)
      const y = Math.round(a.y + (b.y - a.y) * t)
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue
      /* Kenar tam pikselde olmayabilir; 1 piksel komşulukta en güçlüsüne bak. */
      let enIyi = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const v = mag[(y + dy) * W + (x + dx)]
          if (v > enIyi) enIyi = v
        }
      }
      if (enIyi > esik) sayac++
    }
    return sayac / (n + 1)
  }

  /*
   *
   * Hough en güçlü doğruları veriyor; kalabalık bir sokak fotoğrafında bina
   * kenarları ve ışık izleri panonun kenarlarını listeden itebiliyor. Model
   * "burada bir ekran var" diyorsa o kutunun kenarları da denenmeli — kaba
   * ama doğru yerde bir başlangıç; kenar desteği sınaması zaten yanlışsa
   * eliyor.
   */
  const ekEgriler = { yatay: [], dikey: [] }
  if (nesneler?.ekranKutusu) {
    const k = nesneler.ekranKutusu
    const D90 = Math.PI / 2
    ekEgriler.yatay.push({ v: 0, t: 0, r: k.y * H }, { v: 0, t: 0, r: (k.y + k.h) * H })
    ekEgriler.dikey.push({ v: 0, t: D90, r: -k.x * W }, { v: 0, t: D90, r: -(k.x + k.w) * W })
  }

  let enIyi = null
  const ustler = [...yatay.slice(0, 8), ...ekEgriler.yatay]
  const yanlar = [...dikey.slice(0, 8), ...ekEgriler.dikey]

  for (let a = 0; a < ustler.length; a++) {
    for (let b = a + 1; b < ustler.length; b++) {
      for (let c = 0; c < yanlar.length; c++) {
        for (let d = c + 1; d < yanlar.length; d++) {
          const ust = ustler[a]
          const alt = ustler[b]
          const sol = yanlar[c]
          const sag = yanlar[d]

          const p = [
            kesistir(ust, sol),
            kesistir(ust, sag),
            kesistir(alt, sag),
            kesistir(alt, sol),
          ]
          if (p.some((k) => !k)) continue
          /* Sıralamayı garanti et: üst/alt ve sol/sağ ters gelmiş olabilir. */
          const koseler = sirala(p)
          if (!koseler) continue

          const enW = Math.max(mesafe(koseler[0], koseler[1]), mesafe(koseler[3], koseler[2]))
          const boyH = Math.max(mesafe(koseler[0], koseler[3]), mesafe(koseler[1], koseler[2]))
          if (enW < W * 0.12 || boyH < H * 0.1) continue
          if (koseler.some((k) => k.x < -W * 0.05 || k.x > W * 1.05 || k.y < -H * 0.05 || k.y > H * 1.05)) continue

          /* Kenar desteği — dört kenarın hepsi gerçekten kenar olmalı. */
          const kd = [
            destek(koseler[0], koseler[1]),
            destek(koseler[1], koseler[2]),
            destek(koseler[2], koseler[3]),
            destek(koseler[3], koseler[0]),
          ]
          const enZayif = Math.min(...kd)
          const ortDestek = kd.reduce((t, v) => t + v, 0) / 4
          if (enZayif < 0.45) continue

          const kutu = sinirKutusu(koseler)
          const alanOran = (kutu.w * kutu.h) / (W * H)
          if (alanOran < 0.02) continue

          /* Derinlik: içi tek düzlem mi, önü açık mı? */
          let artik = 0
          let onundeki = 0
          let dikeyMi = 1
          if (derinlik) {
            const dx = Math.round((kutu.x / W) * derinlik.w)
            const dy = Math.round((kutu.y / H) * derinlik.h)
            const dw = Math.max(4, Math.round((kutu.w / W) * derinlik.w))
            const dh = Math.max(4, Math.round((kutu.h / H) * derinlik.h))
            const d = duzlemUyumu(
              derinlik,
              Math.max(0, Math.min(derinlik.w - dw, dx)),
              Math.max(0, Math.min(derinlik.h - dh, dy)),
              dw,
              dh,
            )
            artik = d.artik
            onundeki = d.onundeki
            if (artik > 0.1) continue
            if (onundeki > 0.25) continue
            /* Yere yatık yüzey (masa üstü, zemin) ekran yüzeyi değildir. */
            if (Math.abs(d.egimY) * derinlik.h > 0.9) continue
            dikeyMi = 1 - Math.min(1, (Math.abs(d.egimY) * derinlik.h) / 0.9)
          }

          /* Eşya örtüyor mu? */
          let ortulme = 0
          if (nesneler?.engel) {
            let dolu = 0
            let n = 0
            for (let y = kutu.y; y < kutu.y + kutu.h; y += 3) {
              for (let x = kutu.x; x < kutu.x + kutu.w; x += 3) {
                const nx = Math.min(nesneler.w - 1, Math.floor((x / W) * nesneler.w))
                const ny = Math.min(nesneler.h - 1, Math.floor((y / H) * nesneler.h))
                dolu += nesneler.engel[ny * nesneler.w + nx]
                n++
              }
            }
            ortulme = dolu / Math.max(1, n)
            if (ortulme > 0.25) continue
          }

          /* Nesne tanıma bir ekran gördüyse örtüşme büyük artı. */
          let ekranOrtusme = 0
          if (nesneler?.ekranKutusu) {
            const k = nesneler.ekranKutusu
            const kx0 = k.x * W
            const ky0 = k.y * H
            const kx1 = (k.x + k.w) * W
            const ky1 = (k.y + k.h) * H
            const ow = Math.max(0, Math.min(kutu.x + kutu.w, kx1) - Math.max(kutu.x, kx0))
            const oh = Math.max(0, Math.min(kutu.y + kutu.h, ky1) - Math.max(kutu.y, ky0))
            /*
             * Ölçüt: modelin gördüğü ekranın NE KADARI bu dörtgenin içinde?
             * Dörtgenin alanına bölmek yanlıştı — model çoğu zaman panelin
             * yalnızca bir parçasını işaretliyor (ölçtüm: bilbordun sol
             * yarısı), o yüzden panelin tamamını kapsayan doğru dörtgen
             * düşük oran alıp eleniyordu.
             */
            const kutuAlani = Math.max(1, (kx1 - kx0) * (ky1 - ky0))
            ekranOrtusme = (ow * oh) / kutuAlani
            /*
             * MODEL BİR EKRAN GÖRDÜYSE YÜZEY ORADADIR — puan değil, koşul.
             * Bina cepheleri, pencere sıraları ve kaldırım desenleri de dört
             * kenarlı çıkıyor; nesne tanımanın söylediği yer varken onlara
             * bakmak yanlış. (Ölçtüm: bilbordlu sokak fotoğrafında bu koşul
             * olmadan sağdaki bina cephesi seçiliyordu.)
             */
            if (ekranOrtusme < 0.5) continue
          }

          const mX = (kutu.x + kutu.w / 2) / W
          const mY = (kutu.y + kutu.h / 2) / H
          const orta = 1 - Math.min(1, Math.abs(mX - 0.5) / 0.5)
          const goz = 1 - Math.min(1, Math.abs(mY - 0.45) / 0.55)
          const yuzeyOran = kutu.w / Math.max(1, kutu.h)
          const oranUyumu = 1 - Math.min(1, Math.abs(Math.log(yuzeyOran / oran)) / 1.2)

          const skor =
            ortDestek * 34 +
            enZayif * 16 +
            Math.min(1, alanOran / 0.25) * 16 +
            (derinlik ? (1 - Math.min(1, artik / 0.1)) * 12 + dikeyMi * 6 : 8) +
            (1 - Math.min(1, onundeki / 0.25)) * 6 +
            ekranOrtusme * 14 +
            orta * 5 +
            goz * 3 +
            oranUyumu * 4 -
            ortulme * 30

          if (!enIyi || skor > enIyi.skor) {
            enIyi = { koseler, skor, kenarDestegi: ortDestek, artik, ekranOrtusme, ortulme }
          }
        }
      }
    }
  }

  if (!enIyi) return null
  return {
    koseler: enIyi.koseler.map((k) => ({ x: k.x / W, y: k.y / H })),
    skor: Math.max(0, Math.min(100, enIyi.skor)),
    /* Nesne tanıma da orayı ekran gördüyse adını böyle veriyoruz. */
    tur: enIyi.ekranOrtusme > 0.3 ? 'existing-led-screen' : 'signboard',
    kenarDestegi: enIyi.kenarDestegi,
    artik: enIyi.artik,
  }
}

/* ------------------------------------------------------------------ */

function griKare(kaynak) {
  const kw = kaynak.naturalWidth || kaynak.width
  const kh = kaynak.naturalHeight || kaynak.height
  if (!kw || !kh) return null
  const W = Math.min(COZUMLEME_W, kw)
  const H = Math.max(1, Math.round((kh * W) / kw))
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(kaynak, 0, 0, W, H)
  let d
  try {
    d = ctx.getImageData(0, 0, W, H).data
  } catch {
    return null
  }
  const gri = new Float32Array(W * H)
  for (let i = 0, p = 0; i < gri.length; i++, p += 4) {
    gri[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]
  }
  return { gri, W, H }
}

function sobel(gri, W, H) {
  const mag = new Float32Array(W * H)
  const aci = new Float32Array(W * H)
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x
      const gx =
        -gri[i - W - 1] - 2 * gri[i - 1] - gri[i + W - 1] +
        gri[i - W + 1] + 2 * gri[i + 1] + gri[i + W + 1]
      const gy =
        -gri[i - W - 1] - 2 * gri[i - W] - gri[i - W + 1] +
        gri[i + W - 1] + 2 * gri[i + W] + gri[i + W + 1]
      mag[i] = Math.abs(gx) + Math.abs(gy)
      /* Çizginin yönü (gradyanın dikine), −90..+90 aralığına indirgenmiş. */
      const a = (Math.atan2(-gx, gy) * 180) / Math.PI
      aci[i] = ((((a + 90) % 180) + 180) % 180) - 90
    }
  }
  return { mag, aci }
}

/**
 * Hough: yataya (ya da dikeye) yakın güçlü doğrular.
 * Doğru gösterimi: -x·sin(t) + y·cos(t) = r
 */
function hough(mag, aci, W, H, esik, yatayMi) {
  const ACI_ADIM = 1
  const merkez = yatayMi ? 0 : 90
  const sinir = yatayMi ? YATAY_SINIR : DIKEY_SINIR
  const N_ACI = (sinir * 2) / ACI_ADIM + 1
  const RHO_ADIM = 2
  const rhoEnCok = Math.ceil(Math.hypot(W, H))
  const N_RHO = Math.ceil((2 * rhoEnCok) / RHO_ADIM) + 1
  const oy = new Float32Array(N_ACI * N_RHO)

  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x
      if (mag[i] < esik) continue
      let a = aci[i]
      if (!yatayMi) {
        /* Dikeye yakınlık: ±90 civarı; merkeze taşıyoruz. */
        a = a > 0 ? a - 90 : a + 90
      }
      if (Math.abs(a) > sinir) continue
      const ai = Math.round((a + sinir) / ACI_ADIM)
      if (ai < 0 || ai >= N_ACI) continue
      const t = ((-sinir + ai * ACI_ADIM + merkez) * Math.PI) / 180
      const rho = -x * Math.sin(t) + y * Math.cos(t)
      const ri = Math.round((rho + rhoEnCok) / RHO_ADIM)
      if (ri < 0 || ri >= N_RHO) continue
      oy[ai * N_RHO + ri] += mag[i]
    }
  }

  const adaylar = []
  for (let ai = 0; ai < N_ACI; ai++) {
    for (let ri = 1; ri < N_RHO - 1; ri++) {
      const v = oy[ai * N_RHO + ri]
      if (v <= 0) continue
      if (v < oy[ai * N_RHO + ri - 1] || v < oy[ai * N_RHO + ri + 1]) continue
      adaylar.push({ v, t: ((-sinir + ai * ACI_ADIM + merkez) * Math.PI) / 180, r: -rhoEnCok + ri * RHO_ADIM })
    }
  }
  adaylar.sort((a, b) => b.v - a.v)

  const secilen = []
  for (const a of adaylar) {
    if (secilen.length >= 8) break
    const yakin = secilen.some(
      (s) => Math.abs(s.t - a.t) < 0.09 && Math.abs(s.r - a.r) < Math.max(10, (yatayMi ? H : W) * 0.07),
    )
    if (!yakin) secilen.push(a)
  }
  return secilen
}

function kesistir(a, b) {
  const a1 = -Math.sin(a.t)
  const b1 = Math.cos(a.t)
  const a2 = -Math.sin(b.t)
  const b2 = Math.cos(b.t)
  const det = a1 * b2 - a2 * b1
  if (Math.abs(det) < 1e-6) return null
  return { x: (a.r * b2 - b.r * b1) / det, y: (a1 * b.r - a2 * a.r) / det }
}

/** Dört noktayı sol üst / sağ üst / sağ alt / sol alt sırasına koyar. */
function sirala(p) {
  if (p.some((k) => !Number.isFinite(k.x) || !Number.isFinite(k.y))) return null
  const merkezX = p.reduce((t, k) => t + k.x, 0) / 4
  const merkezY = p.reduce((t, k) => t + k.y, 0) / 4
  const ust = p.filter((k) => k.y < merkezY).sort((a, b) => a.x - b.x)
  const alt = p.filter((k) => k.y >= merkezY).sort((a, b) => a.x - b.x)
  if (ust.length !== 2 || alt.length !== 2) return null
  const koseler = [ust[0], ust[1], alt[1], alt[0]]
  if (koseler.some((k) => Math.abs(k.x - merkezX) > 1e6)) return null
  return koseler
}

function mesafe(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function sinirKutusu(k) {
  const xs = k.map((p) => p.x)
  const ys = k.map((p) => p.y)
  const x = Math.max(0, Math.min(...xs))
  const y = Math.max(0, Math.min(...ys))
  return { x: Math.round(x), y: Math.round(y), w: Math.round(Math.max(...xs) - x), h: Math.round(Math.max(...ys) - y) }
}
