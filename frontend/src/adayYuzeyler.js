/**
 * ADAY YERLEŞİM KARELERİ — "en iyi yeri ben bulayım" yerine "uygun yerleri
 * göstereyim, sen seç".
 *
 * NEDEN: tek bir "en uygun yer" seçmek her fotoğrafta tutmuyor. Model bazen
 * bilbordun yalnızca bir parçasını, bazen yansımayı, bazen de kullanıcının
 * hiç düşünmediği bir duvarı işaretliyor. Oysa fotoğrafa bakan insan doğru
 * yeri BİR BAKIŞTA görüyor — eksik olan şey ona seçenek sunmak.
 *
 * Bu dosya fotoğraftaki yerleştirilebilir yüzeyleri TOPLU olarak çıkarıyor:
 * her biri kendi perspektifiyle bir dörtgen. Arayüz bunları tıklanabilir
 * kareler olarak çiziyor; kullanıcı birine dokununca tasarım oraya oturuyor.
 *
 * ELEME KURALLARI (sırayla):
 *   • gökyüzü — derinlikte kusursuz bir düzlemdir, ekran konulamaz;
 *   • eşya/insan/araç maskesi — önü kapalı yüzeye ekran asılmaz;
 *   • zemin çizgisinin altı — yere yatan bir ekran istenmiyor;
 *   • düzlemsellik — derinlik haritasına uydurulan düzlemin artık payı.
 *
 * PERSPEKTİF: düzlem uydurmadan gelen ters-derinlik eğimi kullanılıyor.
 * Görünen boy ≈ 1/Z olduğu için, karenin sol ve sağ kenarı kendi
 * derinliklerine göre uzayıp kısalıyor; sonuç yüzeyin yamukluğunu izleyen
 * bir dörtgen oluyor. Düzlem çıkmazsa kare dik dörtgen kalıyor.
 */

/** Çözümleme genişliği — hızlı ve yeterli. */
const COZUMLEME_W = 160

/** Bir karede kabul edilen en yüksek gökyüzü ve eşya payı. */
const GOK_SINIRI = 0.3
const ENGEL_SINIRI = 0.22

/** Aynı yerin iki kez önerilmemesi için en az merkez ayrımı (kadraj payı). */
const AYRIM = 0.13

/**
 * Fotoğraftaki aday yerleşim yüzeylerini çıkarır.
 *
 * @param {HTMLCanvasElement} tuval
 * @param {object} sec
 * @param {object|null} [sec.nesneler]  nesneHaritasi çıktısı
 * @param {object|null} [sec.derinlik]  derinlikHaritasi çıktısı
 * @param {object|null} [sec.yuzey]     mevcutEkranYuzeyi çıktısı (varsa ilk sıra)
 * @param {number} [sec.oran]           tasarımın en/boy oranı
 * @param {number|null} [sec.zeminOran] zemin çizgisi (0–1)
 * @param {number} [sec.enCok]          döndürülecek aday sayısı
 * @returns {Array<{koseler:Array<{x:number,y:number}>, skor:number, tur:string}>}
 */
export function adaylariBul(tuval, sec = {}) {
  const {
    nesneler = null,
    derinlik = null,
    yuzey = null,
    oran = 16 / 9,
    zeminOran = null,
    enCok = 6,
  } = sec

  const sonuc = []
  /* Fotoğrafta gerçek bir ekran varsa hep birinci sıra: en doğru hedef odur. */
  if (yuzey?.koseler?.length === 4) {
    sonuc.push({ koseler: yuzey.koseler, skor: 100, tur: 'screen' })
  }

  const kw = tuval.width || tuval.naturalWidth
  const kh = tuval.height || tuval.naturalHeight
  if (!kw || !kh) return sonuc

  const W = Math.min(COZUMLEME_W, kw)
  const H = Math.max(1, Math.round((kh * W) / kw))
  const gok = gokMaskesi(tuval, W, H)
  const engel = nesneler?.engel ? olcekle(nesneler.engel, nesneler.w, nesneler.h, W, H) : null
  const der = derinlik?.veri ? olcekle(derinlik.veri, derinlik.w, derinlik.h, W, H) : null

  /* Derinliğin yayılımı — artık payını ölçekten bağımsız kılıyor. */
  let derYayilim = 1
  if (der) {
    let enAz = Infinity
    let enCokD = -Infinity
    for (let i = 0; i < der.length; i++) {
      if (der[i] < enAz) enAz = der[i]
      if (der[i] > enCokD) enCokD = der[i]
    }
    derYayilim = Math.max(1e-6, enCokD - enAz)
  }

  const enBoy = oran > 0 ? oran : 16 / 9
  const ham = []

  for (const pay of [0.52, 0.38, 0.27, 0.19]) {
    const kwPx = pay * W
    const khPx = kwPx / enBoy
    if (khPx > H * 0.92 || khPx < 6 || kwPx < 8) continue
    const adim = Math.max(4, Math.round(kwPx * 0.3))

    for (let y0 = 0; y0 + khPx <= H; y0 += adim) {
      for (let x0 = 0; x0 + kwPx <= W; x0 += adim) {
        const x1 = Math.round(x0 + kwPx)
        const y1 = Math.round(y0 + khPx)

        /* Zemin çizgisinin altına sarkan kare elenir. */
        if (zeminOran != null && y1 / H > zeminOran + 0.05) continue

        let gokSay = 0
        let engelSay = 0
        let n = 0
        for (let y = Math.round(y0); y < y1; y++) {
          for (let x = Math.round(x0); x < x1; x++) {
            const i = y * W + x
            if (gok && gok[i] > 0.5) gokSay++
            if (engel && engel[i] > 0.5) engelSay++
            n++
          }
        }
        if (!n) continue
        const gokPay = gokSay / n
        const engelPay = engelSay / n
        if (gokPay > GOK_SINIRI || engelPay > ENGEL_SINIRI) continue

        let duzluk = 0.5
        let duzlem = null
        if (der) {
          duzlem = duzlemUydur(der, W, Math.round(x0), Math.round(y0), x1, y1)
          if (!duzlem) continue
          duzluk = Math.max(0, 1 - (duzlem.artik / derYayilim) * 26)
          /* Yatay yüzey (zemin/tavan): dikey eğim baskınsa ekran asılmaz. */
          const dikeyEgim = Math.abs(duzlem.b) * H
          const yatayEgim = Math.abs(duzlem.a) * W
          if (dikeyEgim > derYayilim * 0.55 && dikeyEgim > yatayEgim * 2.2) continue
        }

        const skor =
          duzluk * 52 +
          (1 - engelPay) * 22 +
          (1 - gokPay) * 12 +
          pay * 26

        ham.push({
          skor,
          merkez: { x: (x0 + x1) / 2 / W, y: (y0 + y1) / 2 / H },
          koseler: koseleriKur(x0, y0, x1, y1, duzlem, W, H),
          tur: 'surface',
        })
      }
    }
  }

  ham.sort((a, b) => b.skor - a.skor)

  const merkezler = sonuc.map((a) => dortgenMerkez(a.koseler))
  for (const a of ham) {
    if (sonuc.length >= enCok) break
    if (merkezler.some((m) => Math.hypot(m.x - a.merkez.x, m.y - a.merkez.y) < AYRIM)) continue
    merkezler.push(a.merkez)
    sonuc.push({ koseler: a.koseler, skor: Math.round(a.skor), tur: a.tur })
  }
  return sonuc
}

/* ------------------------------------------------------------------ */

/**
 * Karenin köşeleri, düzlemin eğimine göre yamuklaştırılmış hâli.
 * Görünen boy ≈ 1/Z; sol ve sağ kenar kendi ters-derinliğiyle ölçekleniyor.
 */
function koseleriKur(x0, y0, x1, y1, duzlem, W, H) {
  const dik = [
    { x: x0 / W, y: y0 / H },
    { x: x1 / W, y: y0 / H },
    { x: x1 / W, y: y1 / H },
    { x: x0 / W, y: y1 / H },
  ]
  if (!duzlem) return dik
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const yariH = (y1 - y0) / 2
  const zc = duzlem.a * cx + duzlem.b * cy + duzlem.c
  const zl = duzlem.a * x0 + duzlem.b * cy + duzlem.c
  const zr = duzlem.a * x1 + duzlem.b * cy + duzlem.c
  if (!(zc > 1e-6) || !(zl > 1e-6) || !(zr > 1e-6)) return dik
  const sl = Math.max(0.55, Math.min(1.8, zl / zc))
  const sr = Math.max(0.55, Math.min(1.8, zr / zc))
  /* Aşırı yamukluk çizimde bozuk görünür; hafif eğimler zaten yeterli. */
  if (Math.abs(sl - sr) < 0.02) return dik
  return [
    { x: x0 / W, y: (cy - yariH * sl) / H },
    { x: x1 / W, y: (cy - yariH * sr) / H },
    { x: x1 / W, y: (cy + yariH * sr) / H },
    { x: x0 / W, y: (cy + yariH * sl) / H },
  ]
}

/** En küçük kareler: z = a·x + b·y + c, artık payıyla birlikte. */
function duzlemUydur(veri, W, x0, y0, x1, y1) {
  const atlaX = Math.max(1, Math.floor((x1 - x0) / 24))
  const atlaY = Math.max(1, Math.floor((y1 - y0) / 24))
  let sx = 0, sy = 0, sz = 0, sxx = 0, sxy = 0, syy = 0, sxz = 0, syz = 0, m = 0
  for (let y = y0; y < y1; y += atlaY) {
    for (let x = x0; x < x1; x += atlaX) {
      const z = veri[y * W + x]
      m++
      sx += x; sy += y; sz += z
      sxx += x * x; sxy += x * y; syy += y * y
      sxz += x * z; syz += y * z
    }
  }
  if (m < 8) return null
  const m11 = sxx - (sx * sx) / m
  const m12 = sxy - (sx * sy) / m
  const m22 = syy - (sy * sy) / m
  const v1 = sxz - (sx * sz) / m
  const v2 = syz - (sy * sz) / m
  const det = m11 * m22 - m12 * m12
  if (Math.abs(det) < 1e-9) return null
  const a = (v1 * m22 - v2 * m12) / det
  const b = (v2 * m11 - v1 * m12) / det
  const c = (sz - a * sx - b * sy) / m

  let hata = 0
  let k = 0
  for (let y = y0; y < y1; y += atlaY) {
    for (let x = x0; x < x1; x += atlaX) {
      const f = veri[y * W + x] - (a * x + b * y + c)
      hata += f * f
      k++
    }
  }
  return { a, b, c, artik: Math.sqrt(hata / Math.max(1, k)) }
}

/** Gökyüzü: mavi baskın pikseller (ölçülmüş eşik, bkz. ozelMekan.js). */
function gokMaskesi(tuval, w, h) {
  try {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(tuval, 0, 0, w, h)
    const d = ctx.getImageData(0, 0, w, h).data
    const m = new Float32Array(w * h)
    for (let i = 0, p = 0; i < m.length; i++, p += 4) {
      m[i] = d[p + 2] - d[p] > 25 ? 1 : 0
    }
    return m
  } catch {
    return null
  }
}

/** Bir maskeyi başka ölçüye taşır (en yakın komşu). */
function olcekle(veri, kw, kh, hw, hh) {
  if (!veri || !kw || !kh) return null
  if (kw === hw && kh === hh) return veri
  const c = new Float32Array(hw * hh)
  for (let y = 0; y < hh; y++) {
    const sy = Math.min(kh - 1, Math.floor((y / hh) * kh))
    for (let x = 0; x < hw; x++) {
      const sx = Math.min(kw - 1, Math.floor((x / hw) * kw))
      c[y * hw + x] = veri[sy * kw + sx]
    }
  }
  return c
}

function dortgenMerkez(k) {
  return {
    x: k.reduce((t, p) => t + p.x, 0) / k.length,
    y: k.reduce((t, p) => t + p.y, 0) / k.length,
  }
}
