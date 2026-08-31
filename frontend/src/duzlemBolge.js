/**
 * DÜZLEM BÖLGESİ ARAMA — yüzeyi kenarlardan değil, DERİNLİKTEN bulmak.
 *
 * Kenar tabanlı arama (dortgenBul.js) temiz fotoğraflarda iyi çalışıyor ama
 * kalabalık bir gece sokağında yeterli değil: bina kenarları, ışık izleri,
 * pencere sıraları panonun kenarlarını en güçlü doğrular listesinden itiyor.
 *
 * Derinlik bunlardan etkilenmiyor. Bir billboard, duvar ya da cephe derinlik
 * haritasında TEK BİR DÜZLEMDİR; üstünde ne gösterildiği, ne kadar parlak
 * olduğu, kenarının seçilip seçilmediği fark etmez.
 *
 * YÖNTEM
 *   1) Tohum noktalardan bölge büyütme: küçük bir pencereye düzlem uyduruluyor,
 *      sonra komşu pikseller "bu düzleme uyuyor mu" diye tek tek sınanıyor.
 *      Bölge belli aralıklarla yeniden uyduruluyor ki düzlem kaymasın.
 *   2) Bölgeler eleniyor: gökyüzü değil, zemin/tavan gibi yatık değil, eşya
 *      örtmüyor, yeterince büyük.
 *   3) Kazanan bölgenin SINIRINA dört doğru uyduruluyor (üst, alt, sol, sağ)
 *      ve kesişimleri dört köşeyi veriyor. Böylece perspektifteki yamukluk
 *      doğrudan çıkıyor.
 *
 * Sonuç: "önerilen yer" artık bir dikdörtgen tahmini değil, gerçek bir yüzeyin
 * dört köşesi.
 */

/** Bölge büyütmede bir pikselin düzleme uyması için izin verilen sapma. */
const UYUM_PAYI = 0.02

/** En küçük kabul edilebilir bölge (kadraja oran). */
const EN_KUCUK_ALAN = 0.03

/**
 * Derinlik haritasındaki en uygun düzlem bölgesini bulur ve dört köşesini verir.
 *
 * @param {{w:number,h:number,veri:Float32Array}} derinlik
 * @param {object} [sec]
 * @param {Float32Array|null} [sec.engel]  eşya maskesi (derinlikle aynı ölçüde)
 * @param {Float32Array|null} [sec.gok]    gökyüzü maskesi (aynı ölçüde)
 * @param {object|null} [sec.ekranKutusu]  nesne tanımanın bulduğu ekran (0–1)
 * @param {number} [sec.oran] tasarımın en/boy oranı
 * @returns {{koseler:Array<{x:number,y:number}>, skor:number, alan:number}|null}
 *          Köşeler 0–1 oranlı: sol üst, sağ üst, sağ alt, sol alt.
 */
export function duzlemBolgesiBul(derinlik, sec = {}) {
  if (!derinlik?.veri) return null
  const { w: W, h: H, veri } = derinlik
  const { engel = null, gok = null, ekranKutusu = null } = sec

  const toplamPiksel = W * H
  const ziyaret = new Int32Array(toplamPiksel).fill(-1)
  const bolgeler = []

  /* Tohumlar: düzenli bir ızgara. Her tohum zaten bir bölgeye girdiyse atlanır. */
  const adim = Math.max(4, Math.round(Math.min(W, H) / 14))
  for (let sy = adim; sy < H - adim; sy += adim) {
    for (let sx = adim; sx < W - adim; sx += adim) {
      const i = sy * W + sx
      if (ziyaret[i] >= 0) continue
      if (gok && gok[i] > 0.5) continue
      if (engel && engel[i] > 0.5) continue

      const bolge = buyut(sx, sy, bolgeler.length)
      if (!bolge) continue
      if (bolge.piksel.length / toplamPiksel < EN_KUCUK_ALAN) {
        /* Küçük kaldıysa işaretleri geri al ki başka tohum deneyebilsin. */
        for (const p of bolge.piksel) ziyaret[p] = -1
        continue
      }
      bolgeler.push(bolge)
      if (bolgeler.length >= 24) break
    }
  }

  if (!bolgeler.length) return null

  /* ---- puanlama ---- */
  let enIyi = null
  for (const b of bolgeler) {
    const alanOran = b.piksel.length / toplamPiksel
    /* Yatık yüzey (zemin, tavan, masa üstü) ekran yüzeyi değildir. */
    const yatiklik = Math.abs(b.b) * H
    if (yatiklik > 0.9) continue
    const dikeyMi = 1 - Math.min(1, yatiklik / 0.9)
    /* Kameraya bakma: yatay eğim küçükse yüzey karşıdan görünüyordur. */
    const cephe = 1 - Math.min(1, (Math.abs(b.a) * W) / 0.14)

    let gokOran = 0
    let engelOran = 0
    for (const p of b.piksel) {
      if (gok && gok[p] > 0.5) gokOran++
      if (engel && engel[p] > 0.5) engelOran++
    }
    gokOran /= b.piksel.length
    engelOran /= b.piksel.length
    if (gokOran > 0.25) continue
    if (engelOran > 0.2) continue

    const mX = b.merkezX / W
    const mY = b.merkezY / H
    const orta = 1 - Math.min(1, Math.abs(mX - 0.5) / 0.5)
    const goz = 1 - Math.min(1, Math.abs(mY - 0.45) / 0.55)

    /* Nesne tanıma bir ekran gördüyse onu içeren bölge çok önde. */
    let ekranOrtusme = 0
    if (ekranKutusu) {
      const kx0 = ekranKutusu.x * W
      const ky0 = ekranKutusu.y * H
      const kx1 = (ekranKutusu.x + ekranKutusu.w) * W
      const ky1 = (ekranKutusu.y + ekranKutusu.h) * H
      let icinde = 0
      let toplam = 0
      for (let y = Math.max(0, Math.floor(ky0)); y < Math.min(H, Math.ceil(ky1)); y++) {
        for (let x = Math.max(0, Math.floor(kx0)); x < Math.min(W, Math.ceil(kx1)); x++) {
          toplam++
          if (ziyaret[y * W + x] === b.no) icinde++
        }
      }
      ekranOrtusme = toplam ? icinde / toplam : 0
    }

    const skor =
      Math.min(1, alanOran / 0.3) * 30 +
      cephe * 22 +
      dikeyMi * 14 +
      orta * 10 +
      goz * 6 +
      ekranOrtusme * 30 -
      engelOran * 25 -
      gokOran * 25

    if (!enIyi || skor > enIyi.skor) enIyi = { ...b, skor, alanOran }
  }

  if (!enIyi) return null

  const koseler = bolgeninKoseleri(enIyi, W, H)
  if (!koseler) return null

  return {
    koseler: koseler.map((k) => ({ x: k.x / W, y: k.y / H })),
    skor: Math.max(0, Math.min(100, enIyi.skor)),
    alan: enIyi.alanOran,
  }

  /* ------------------------------------------------------------------ */

  /** Tohumdan başlayarak düzleme uyan pikselleri toplar. */
  function buyut(sx, sy, no) {
    /* Başlangıç düzlemi: tohumun çevresindeki küçük pencere. */
    const pencere = Math.max(3, Math.round(adim / 2))
    let uyum = duzlemUydur(sx - pencere, sy - pencere, pencere * 2, pencere * 2)
    if (!uyum) return null

    const piksel = []
    const kuyruk = [sy * W + sx]
    ziyaret[sy * W + sx] = no
    let sonrakiUydurma = 400

    while (kuyruk.length) {
      const i = kuyruk.pop()
      piksel.push(i)
      const x = i % W
      const y = (i / W) | 0

      if (piksel.length >= sonrakiUydurma) {
        /* Bölge büyüdükçe düzlemi yeniden uydur: yüzeyin geneline otursun. */
        const yeni = duzlemUydurPiksel(piksel)
        if (yeni) uyum = yeni
        sonrakiUydurma = Math.round(piksel.length * 1.8)
      }

      const komsular = [i - 1, i + 1, i - W, i + W]
      for (let k = 0; k < 4; k++) {
        const j = komsular[k]
        if (j < 0 || j >= toplamPiksel) continue
        const jx = j % W
        if (k < 2 && Math.abs(jx - x) !== 1) continue // satır sınırını aşma
        if (ziyaret[j] >= 0) continue
        if (gok && gok[j] > 0.5) continue
        if (engel && engel[j] > 0.5) continue
        const jy = (j / W) | 0
        const bekle = uyum.a * jx + uyum.b * jy + uyum.c
        if (Math.abs(veri[j] - bekle) > UYUM_PAYI) continue
        ziyaret[j] = no
        kuyruk.push(j)
      }
      if (piksel.length > toplamPiksel * 0.7) break
    }

    if (piksel.length < 20) {
      for (const p of piksel) ziyaret[p] = -1
      return null
    }
    const son = duzlemUydurPiksel(piksel) || uyum
    let mx = 0
    let my = 0
    for (const p of piksel) {
      mx += p % W
      my += (p / W) | 0
    }
    return { no, piksel, a: son.a, b: son.b, c: son.c, merkezX: mx / piksel.length, merkezY: my / piksel.length }
  }

  function duzlemUydur(x0, y0, w, h) {
    const liste = []
    for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++) {
      for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) liste.push(y * W + x)
    }
    return duzlemUydurPiksel(liste)
  }

  /** En küçük kareler: z = a·x + b·y + c */
  function duzlemUydurPiksel(liste) {
    const n = liste.length
    if (n < 6) return null
    const atla = Math.max(1, Math.floor(n / 900))
    let sx = 0, sy = 0, sz = 0, sxx = 0, sxy = 0, syy = 0, sxz = 0, syz = 0, m = 0
    for (let i = 0; i < n; i += atla) {
      const p = liste[i]
      const x = p % W
      const y = (p / W) | 0
      const z = veri[p]
      m++
      sx += x; sy += y; sz += z
      sxx += x * x; sxy += x * y; syy += y * y
      sxz += x * z; syz += y * z
    }
    if (m < 6) return null
    const m11 = sxx - (sx * sx) / m
    const m12 = sxy - (sx * sy) / m
    const m22 = syy - (sy * sy) / m
    const v1 = sxz - (sx * sz) / m
    const v2 = syz - (sy * sz) / m
    const det = m11 * m22 - m12 * m12
    if (Math.abs(det) < 1e-9) return null
    const a = (v1 * m22 - v2 * m12) / det
    const b = (v2 * m11 - v1 * m12) / det
    return { a, b, c: (sz - a * sx - b * sy) / m }
  }
}

/**
 * Bölgenin sınırına dört doğru uydurup köşeleri çıkarır.
 *
 * Sol/sağ kenar için her satırın en soldaki ve en sağdaki pikseli, üst/alt için
 * her sütunun en üstteki ve en alttaki pikseli kullanılıyor. Böylece perspektif
 * yamukluğu doğrudan doğruların eğiminden geliyor.
 */
function bolgeninKoseleri(bolge, W, H) {
  const solX = new Map()
  const sagX = new Map()
  const ustY = new Map()
  const altY = new Map()
  let minY = Infinity
  let maxY = -Infinity
  let minX = Infinity
  let maxX = -Infinity

  for (const p of bolge.piksel) {
    const x = p % W
    const y = (p / W) | 0
    if (!solX.has(y) || x < solX.get(y)) solX.set(y, x)
    if (!sagX.has(y) || x > sagX.get(y)) sagX.set(y, x)
    if (!ustY.has(x) || y < ustY.get(x)) ustY.set(x, y)
    if (!altY.has(x) || y > altY.get(x)) altY.set(x, y)
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    if (x < minX) minX = x
    if (x > maxX) maxX = x
  }
  if (!(maxY > minY) || !(maxX > minX)) return null

  /*
   * Kenarların uçları köşelerde yuvarlanıyor ve doğruyu bozuyor; dıştaki
   * %12'lik dilimler atılıyor.
   */
  const payY = (maxY - minY) * 0.12
  const payX = (maxX - minX) * 0.12

  const solNokta = []
  const sagNokta = []
  for (const [y, x] of solX) if (y > minY + payY && y < maxY - payY) solNokta.push([y, x])
  for (const [y, x] of sagX) if (y > minY + payY && y < maxY - payY) sagNokta.push([y, x])
  const ustNokta = []
  const altNokta = []
  for (const [x, y] of ustY) if (x > minX + payX && x < maxX - payX) ustNokta.push([x, y])
  for (const [x, y] of altY) if (x > minX + payX && x < maxX - payX) altNokta.push([x, y])

  const sol = dogruUydur(solNokta)
  const sag = dogruUydur(sagNokta)
  const ust = dogruUydur(ustNokta)
  const alt = dogruUydur(altNokta)
  if (!sol || !sag || !ust || !alt) return null

  /* sol/sağ: x = m·y + n ; üst/alt: y = m·x + n */
  const kesis = (dikey, yatay) => {
    /* x = m1·y + n1 , y = m2·x + n2  →  x = m1·(m2·x + n2) + n1 */
    const payda = 1 - dikey.m * yatay.m
    if (Math.abs(payda) < 1e-9) return null
    const x = (dikey.m * yatay.n + dikey.n) / payda
    return { x, y: yatay.m * x + yatay.n }
  }

  const koseler = [kesis(sol, ust), kesis(sag, ust), kesis(sag, alt), kesis(sol, alt)]
  if (koseler.some((k) => !k || !Number.isFinite(k.x) || !Number.isFinite(k.y))) return null
  /* Kadrajın makul ölçüde dışına taşan köşe, uydurmanın bozulduğunu gösterir. */
  if (koseler.some((k) => k.x < -W * 0.15 || k.x > W * 1.15 || k.y < -H * 0.15 || k.y > H * 1.15)) return null
  return koseler
}

/** y = m·x + n (ya da x = m·y + n) — en küçük kareler. */
function dogruUydur(noktalar) {
  const n = noktalar.length
  if (n < 6) return null
  let sx = 0, sy = 0, sxx = 0, sxy = 0
  for (const [x, y] of noktalar) {
    sx += x
    sy += y
    sxx += x * x
    sxy += x * y
  }
  const payda = n * sxx - sx * sx
  if (Math.abs(payda) < 1e-9) return null
  const m = (n * sxy - sx * sy) / payda
  return { m, n: (sy - m * sx) / n }
}
