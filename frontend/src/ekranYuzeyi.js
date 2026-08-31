/**
 * MEVCUT EKRAN YÜZEYİNİ BULMA — "Önerilen yere koy"un tek hedefi.
 *
 * SORUN: boş alan araması gökyüzünü en temiz, en büyük, en engelsiz bölge
 * olarak görüyor. Algoritma için gökyüzü mükemmel bir "boş alan"; oysa LED
 * ekran yerleştirilebilecek fiziksel bir yüzey değil. Kural net olmalı:
 *
 *    ÖNCE GERÇEK BİR EKRAN/PANO YÜZEYİ ARA.
 *    GÜVENLE BULAMAZSAN HİÇBİR YERE KOYMA.
 *
 * Bu dosya yalnızca birinci işi yapıyor. Bulamazsa null dönüyor ve arayüz
 * manuel dört köşe kipini açıyor — yanlış yere koymaktansa kullanıcıya
 * sormak doğru.
 *
 * HEDEF, ÇERÇEVE DEĞİL İÇ YÜZEYDİR. Billboardun siyah kasası, direği ve
 * gölgesi fotoğrafta kalmalı; tasarım yalnızca çerçevenin içindeki aktif
 * gösterim alanına, onun perspektifiyle oturmalı. Bu yüzden iki adım var:
 *
 *   1) NEREDE — nesne tanıma modeli (ekran/monitör sınıfı) kaba yeri veriyor.
 *   2) TAM OLARAK NEREYE — o kutunun içinde kenarlar taranıp aktif yüzeyin
 *      dört köşesi çıkarılıyor. Kasa kalınlığı bu adımda eleniyor: en güçlü
 *      dikdörtgen hat, kasanın İÇ kenarıdır.
 */

/** Çözümleme genişliği — kenarları taşımaya yetiyor, hızlı. */
const COZUMLEME_W = 520

/** Kenar sayılma eşiği (karenin ortalamasına göre). */
const KENAR_KATSAYI = 1.6

/** Otomatik yerleştirme için gereken en düşük puan. */
export const OTOMATIK_ESIK = 62

/**
 * Fotoğraftaki mevcut ekran/pano yüzeyini arar.
 *
 * @param {HTMLCanvasElement} kaynak
 * @param {object} sec
 * @param {object|null} sec.ekranKutusu  nesne tanımanın bulduğu ekran (0–1)
 * @param {Float32Array|null} [sec.gok]  gökyüzü maskesi (kaynak ölçüsünde değil,
 *        aşağıda kendi ölçüsünde üretiliyor — parametre yalnızca sınama için)
 * @returns {{koseler:Array<{x:number,y:number}>, skor:number, tur:string}|null}
 */
export function mevcutEkranYuzeyi(kaynak, sec = {}) {
  const { ekranKutusu = null } = sec
  if (!ekranKutusu) return null

  const veri = griKare(kaynak)
  if (!veri) return null
  const { gri, W, H } = veri

  /*
   * Arama alanı: modelin kutusu biraz genişletilmiş hâli. Model çoğu zaman
   * panelin bir parçasını işaretliyor; gerçek kenarlar biraz dışarıda olabilir.
   */
  const pay = 0.22
  const ax0 = Math.max(0, Math.round((ekranKutusu.x - ekranKutusu.w * pay) * W))
  const ay0 = Math.max(0, Math.round((ekranKutusu.y - ekranKutusu.h * pay) * H))
  const ax1 = Math.min(W, Math.round((ekranKutusu.x + ekranKutusu.w * (1 + pay)) * W))
  const ay1 = Math.min(H, Math.round((ekranKutusu.y + ekranKutusu.h * (1 + pay)) * H))
  const aw = ax1 - ax0
  const ah = ay1 - ay0
  if (aw < 20 || ah < 20) return null

  const { mag, aci } = sobel(gri, W, H)
  let toplam = 0
  let sayac = 0
  for (let y = ay0; y < ay1; y++) {
    for (let x = ax0; x < ax1; x++) {
      toplam += mag[y * W + x]
      sayac++
    }
  }
  const esik = (toplam / Math.max(1, sayac)) * KENAR_KATSAYI || 1

  const yatay = hough(mag, aci, W, H, esik, true, { ax0, ay0, ax1, ay1 })
  const dikey = hough(mag, aci, W, H, esik, false, { ax0, ay0, ax1, ay1 })
  if (yatay.length < 2 || dikey.length < 2) return null

  const destek = (a, b) => {
    const n = 28
    let s = 0
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const x = Math.round(a.x + (b.x - a.x) * t)
      const y = Math.round(a.y + (b.y - a.y) * t)
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue
      let en = 0
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const v = mag[(y + dy) * W + (x + dx)]
          if (v > en) en = v
        }
      }
      if (en > esik) s++
    }
    return s / (n + 1)
  }

  const kutuAlani = ekranKutusu.w * W * (ekranKutusu.h * H)
  let enIyi = null

  for (let a = 0; a < yatay.length; a++) {
    for (let b = a + 1; b < yatay.length; b++) {
      for (let c = 0; c < dikey.length; c++) {
        for (let d = c + 1; d < dikey.length; d++) {
          const p = [
            kesistir(yatay[a], dikey[c]),
            kesistir(yatay[a], dikey[d]),
            kesistir(yatay[b], dikey[d]),
            kesistir(yatay[b], dikey[c]),
          ]
          if (p.some((k) => !k)) continue
          const koseler = sirala(p)
          if (!koseler) continue

          /* Aday, arama alanının içinde ve makul büyüklükte olmalı. */
          if (koseler.some((k) => k.x < ax0 - 4 || k.x > ax1 + 4 || k.y < ay0 - 4 || k.y > ay1 + 4)) continue
          const enW = Math.max(mesafe(koseler[0], koseler[1]), mesafe(koseler[3], koseler[2]))
          const boyH = Math.max(mesafe(koseler[0], koseler[3]), mesafe(koseler[1], koseler[2]))
          if (enW < aw * 0.35 || boyH < ah * 0.3) continue

          const kd = [
            destek(koseler[0], koseler[1]),
            destek(koseler[1], koseler[2]),
            destek(koseler[2], koseler[3]),
            destek(koseler[3], koseler[0]),
          ]
          const enZayif = Math.min(...kd)
          const ort = kd.reduce((t, v) => t + v, 0) / 4
          if (enZayif < 0.5) continue

          const alan = dortgenAlani(koseler)
          /*
           * İÇ YÜZEY TERCİHİ. Kasanın dış hattı da dört güçlü kenar verir;
           * ikisi arasında iç olan seçilmeli. İç hat daha küçüktür ama modelin
           * kutusunu da büyük ölçüde kapsar — bu ikisini birlikte arıyoruz.
           */
          const kapsama = Math.min(1, alan / Math.max(1, kutuAlani))
          const skor =
            ort * 45 +
            enZayif * 20 +
            Math.min(1, alan / (aw * ah)) * 20 +
            (kapsama > 0.45 && kapsama < 1.35 ? 15 : 0)

          if (!enIyi || skor > enIyi.skor) enIyi = { koseler, skor, alan }
        }
      }
    }
  }

  /*
   * KENAR ARAMASI TUTMAZSA MODELİN KUTUSU.
   *
   * Kenarlar her fotoğrafta temiz çıkmıyor (gece, yansıma, düşük karşıtlık).
   * Ama model orada bir EKRAN gördü; kutusunun kendisi hâlâ doğru hedeftir ve
   * gökyüzünden sonsuz kere iyidir. Kasa payı için içeri doğru %4 çekiliyor.
   */
  if (!enIyi || enIyi.skor < OTOMATIK_ESIK) {
    const ic = 0.04
    const x0 = ekranKutusu.x + ekranKutusu.w * ic
    const y0 = ekranKutusu.y + ekranKutusu.h * ic
    const x1 = ekranKutusu.x + ekranKutusu.w * (1 - ic)
    const y1 = ekranKutusu.y + ekranKutusu.h * (1 - ic)
    if (!(x1 > x0) || !(y1 > y0)) return null
    return {
      koseler: [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ],
      skor: 60,
      tur: 'existing-led-screen',
      kaba: true,
    }
  }

  /*
   * KENARA OTURTMA.
   *
   * Hough en güçlü hattı veriyor ama bu hat panonun gerçek kenarından birkaç
   * piksel içeride ya da dışarıda kalabiliyor; sonuçta tasarım panonun
   * içinde hafifçe sola/sağa kaymış görünüyordu. Burada her kenar kendi
   * normali boyunca kaydırılıp kenar enerjisinin en yüksek olduğu yere
   * oturtuluyor — dört kenar birbirinden bağımsız.
   */
  const oturtulmus = kenaraOturt(enIyi.koseler, mag, W, H)

  return {
    koseler: oturtulmus.map((k) => ({ x: k.x / W, y: k.y / H })),
    skor: Math.max(0, Math.min(100, enIyi.skor)),
    tur: 'existing-led-screen',
  }
}

/**
 * Dörtgenin dört kenarını, kenar enerjisinin en yüksek olduğu yere kaydırır.
 *
 * Her kenar kendi normali boyunca ±%4 aralıkta taranıyor; kenar boyunca
 * toplanan gradyan en yüksek olan konum kazanıyor. Köşeler kaydırılan iki
 * kenarın kesişiminden yeniden kuruluyor, böylece dörtgen bozulmuyor.
 */
function kenaraOturt(k, mag, W, H) {
  const merkez = {
    x: (k[0].x + k[1].x + k[2].x + k[3].x) / 4,
    y: (k[0].y + k[1].y + k[2].y + k[3].y) / 4,
  }
  const kenarlar = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
  ]
  const enerji = (a, b) => {
    let t = 0
    const n = 40
    for (let i = 0; i <= n; i++) {
      const x = Math.round(a.x + (b.x - a.x) * (i / n))
      const y = Math.round(a.y + (b.y - a.y) * (i / n))
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue
      let en = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const v = mag[(y + dy) * W + (x + dx)]
          if (v > en) en = v
        }
      }
      t += en
    }
    return t
  }

  const yeni = kenarlar.map(([i, j]) => {
    const a = k[i]
    const b = k[j]
    /* Kenarın dış normali: merkezden uzaklaşan yön. */
    const ox = (a.x + b.x) / 2 - merkez.x
    const oy = (a.y + b.y) / 2 - merkez.y
    const n = Math.hypot(ox, oy) || 1
    const nx = ox / n
    const ny = oy / n
    const uzunluk = Math.hypot(b.x - a.x, b.y - a.y)
    const menzil = Math.max(3, uzunluk * 0.04)
    let enIyiKay = 0
    let enIyiDeger = -1
    for (let d = -menzil; d <= menzil; d += 1) {
      const e = enerji({ x: a.x + nx * d, y: a.y + ny * d }, { x: b.x + nx * d, y: b.y + ny * d })
      if (e > enIyiDeger) {
        enIyiDeger = e
        enIyiKay = d
      }
    }
    return {
      a: { x: a.x + nx * enIyiKay, y: a.y + ny * enIyiKay },
      b: { x: b.x + nx * enIyiKay, y: b.y + ny * enIyiKay },
    }
  })

  /* Komşu kenarların kesişimi yeni köşeyi veriyor. */
  const kesisim = (p1, p2, p3, p4) => {
    const a1 = p2.y - p1.y
    const b1 = p1.x - p2.x
    const c1 = a1 * p1.x + b1 * p1.y
    const a2 = p4.y - p3.y
    const b2 = p3.x - p4.x
    const c2 = a2 * p3.x + b2 * p3.y
    const det = a1 * b2 - a2 * b1
    if (Math.abs(det) < 1e-6) return null
    return { x: (b2 * c1 - b1 * c2) / det, y: (a1 * c2 - a2 * c1) / det }
  }

  const sonuc = []
  for (let i = 0; i < 4; i++) {
    const onceki = yeni[(i + 3) % 4]
    const simdiki = yeni[i]
    const nokta = kesisim(onceki.a, onceki.b, simdiki.a, simdiki.b)
    if (!nokta || !Number.isFinite(nokta.x) || !Number.isFinite(nokta.y)) return k
    sonuc.push(nokta)
  }
  /* Oturtma dörtgeni bozduysa (aşırı kayma) eski hâli korunuyor. */
  const alanEski = Math.abs(
    k.reduce((t, p, i) => t + (p.x * k[(i + 1) % 4].y - k[(i + 1) % 4].x * p.y), 0) / 2,
  )
  const alanYeni = Math.abs(
    sonuc.reduce((t, p, i) => t + (p.x * sonuc[(i + 1) % 4].y - sonuc[(i + 1) % 4].x * p.y), 0) / 2,
  )
  if (!(alanYeni > alanEski * 0.7) || alanYeni > alanEski * 1.4) return k
  return sonuc
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
      const a = (Math.atan2(-gx, gy) * 180) / Math.PI
      aci[i] = ((((a + 90) % 180) + 180) % 180) - 90
    }
  }
  return { mag, aci }
}

/** Hough — yalnızca verilen alanın içinde, yataya (ya da dikeye) yakın hatlar. */
function hough(mag, aci, W, H, esik, yatayMi, alan) {
  const SINIR = 42
  const merkez = yatayMi ? 0 : 90
  const N_ACI = SINIR * 2 + 1
  const RHO_ADIM = 1
  const rhoEnCok = Math.ceil(Math.hypot(W, H))
  const N_RHO = Math.ceil((2 * rhoEnCok) / RHO_ADIM) + 1
  const oy = new Float32Array(N_ACI * N_RHO)

  for (let y = Math.max(1, alan.ay0); y < Math.min(H - 1, alan.ay1); y++) {
    for (let x = Math.max(1, alan.ax0); x < Math.min(W - 1, alan.ax1); x++) {
      const i = y * W + x
      if (mag[i] < esik) continue
      let a = aci[i]
      if (!yatayMi) a = a > 0 ? a - 90 : a + 90
      if (Math.abs(a) > SINIR) continue
      const ai = Math.round(a + SINIR)
      const t = ((-SINIR + ai + merkez) * Math.PI) / 180
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
      adaylar.push({ v, t: ((-SINIR + ai + merkez) * Math.PI) / 180, r: -rhoEnCok + ri * RHO_ADIM })
    }
  }
  adaylar.sort((a, b) => b.v - a.v)

  const secilen = []
  const enAzAyrim = Math.max(4, (yatayMi ? alan.ay1 - alan.ay0 : alan.ax1 - alan.ax0) * 0.08)
  for (const a of adaylar) {
    if (secilen.length >= 7) break
    if (secilen.some((s) => Math.abs(s.t - a.t) < 0.12 && Math.abs(s.r - a.r) < enAzAyrim)) continue
    secilen.push(a)
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

function sirala(p) {
  if (p.some((k) => !Number.isFinite(k.x) || !Number.isFinite(k.y))) return null
  const my = p.reduce((t, k) => t + k.y, 0) / 4
  const ust = p.filter((k) => k.y < my).sort((a, b) => a.x - b.x)
  const alt = p.filter((k) => k.y >= my).sort((a, b) => a.x - b.x)
  if (ust.length !== 2 || alt.length !== 2) return null
  return [ust[0], ust[1], alt[1], alt[0]]
}

function mesafe(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function dortgenAlani(k) {
  return Math.abs(
    k.reduce((t, p, i) => {
      const n = k[(i + 1) % 4]
      return t + (p.x * n.y - n.x * p.y)
    }, 0) / 2,
  )
}
