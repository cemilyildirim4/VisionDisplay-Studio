/**
 * MEKÂN HARİTASI — fotoğraftaki her pikselin ne olduğu.
 *
 * NEDEN KENDİMİZ: 150 sınıflı hazır mekân modelleri (SegFormer/ADE20K)
 * ticari kullanıma kapalı lisanslarla yayınlanıyor; tarayıcıda çalışacak,
 * lisansı temiz bir eşdeğeri yok. Elimizdeki iki model (Apache-2.0 nesne
 * tanıma ve derinlik) tek başına yetmiyor: biri yalnızca 20 sınıf biliyor,
 * öteki neyin ne olduğunu değil ne kadar uzak olduğunu söylüyor.
 *
 * Bu dosya ikisini geometriyle birleştirip her piksele bir etiket veriyor.
 * Kural tabanlı ama ölçülebilir: her etiketin dayandığı fiziksel gözlem
 * aşağıda yazılı.
 *
 *   GÖKYÜZÜ  mavi baskın + kadrajın üst yarısı + derinlikte en uzak grup
 *   ZEMİN    derinlik aşağı doğru hızla değişiyor (yatay düzlem) + ufkun altı
 *   TAVAN    aynı geometri, ufkun üstü
 *   DUVAR    derinlik dikeyde neredeyse sabit (düşey düzlem)
 *   CAM      duvar geometrisi + yüksek yerel karşıtlık (yansıma/vitrin)
 *   EKRAN    parlak + doygun + dolu dikdörtgen bölge (bkz. parlakEkran.js)
 *   KAPI     duvarın içinde, zemine değen, boyu eninden uzun, çevresinden koyu
 *   ENGEL    nesne tanımanın işaretlediği insan/araç/eşya/bitki
 *
 * Yerleştirme motoru bu haritayı kullanıyor: yalnızca DUVAR ve EKRAN
 * yerleştirilebilir; kalan her şey yasak bölge.
 */

export const SINIF = {
  BILINMEYEN: 0,
  GOK: 1,
  ZEMIN: 2,
  TAVAN: 3,
  DUVAR: 4,
  CAM: 5,
  EKRAN: 6,
  KAPI: 7,
  ENGEL: 8,
}

export const SINIF_ADI = {
  1: 'gökyüzü',
  2: 'zemin',
  3: 'tavan',
  4: 'duvar',
  5: 'cam/vitrin',
  6: 'ekran',
  7: 'kapı',
  8: 'nesne',
}

/** Çözümleme genişliği — nesne ve derinlik haritalarıyla aynı mertebede. */
const W_COZ = 160

/**
 * @param {HTMLCanvasElement} tuval
 * @param {object} sec
 * @param {{w:number,h:number,engel:Float32Array}|null} [sec.nesneler]
 * @param {{w:number,h:number,veri:Float32Array}|null} [sec.derinlik]
 * @param {{x:number,y:number,w:number,h:number}|null} [sec.ekranKutusu]
 * @returns {{w:number,h:number,sinif:Uint8Array,sayim:object}|null}
 */
export function mekanHaritasi(tuval, sec = {}) {
  const { nesneler = null, derinlik = null, ekranKutusu = null } = sec
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
  const sinif = new Uint8Array(N)
  const parlak = new Float32Array(N)
  const mavilik = new Float32Array(N)
  const aydinlik = new Float32Array(N)
  for (let i = 0, p = 0; i < N; i++, p += 4) {
    parlak[i] = (d[p] + d[p + 1] + d[p + 2]) / 3
    mavilik[i] = d[p + 2] - d[p]
    aydinlik[i] = d[p + 2]
  }

  const engel = nesneler?.engel ? olcek(nesneler.engel, nesneler.w, nesneler.h, W, H) : null
  const der = derinlik?.veri ? olcek(derinlik.veri, derinlik.w, derinlik.h, W, H) : null

  /* Derinlik yayılımı — eğim eşiklerini ölçekten bağımsız kılıyor. */
  let yayilim = 1
  if (der) {
    let a = Infinity
    let b = -Infinity
    for (let i = 0; i < N; i++) {
      if (der[i] < a) a = der[i]
      if (der[i] > b) b = der[i]
    }
    yayilim = Math.max(1e-6, b - a)
  }

  /*
   * UFUK ÇİZGİSİ: derinliğin satır ortalaması en hızlı değiştiği yer.
   * Zemin ile duvarın ayrıldığı hiza kabaca burasıdır.
   */
  let ufuk = Math.round(H * 0.55)
  if (der) {
    const satirOrt = []
    for (let y = 0; y < H; y++) {
      let t = 0
      for (let x = 0; x < W; x++) t += der[y * W + x]
      satirOrt.push(t / W)
    }
    let enBuyuk = 0
    for (let y = 4; y < H - 4; y++) {
      const fark = Math.abs(satirOrt[y + 3] - satirOrt[y - 3])
      if (fark > enBuyuk) {
        enBuyuk = fark
        ufuk = y
      }
    }
  }

  /* Yerel karşıtlık — cam/vitrin yansımaları yüksek çıkar. */
  const karsit = new Float32Array(N)
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x
      let enAz = 255
      let enCok = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const v = parlak[(y + dy) * W + (x + dx)]
          if (v < enAz) enAz = v
          if (v > enCok) enCok = v
        }
      }
      karsit[i] = enCok - enAz
    }
  }

  /* Pencere: 5×5 komşulukta düzlem eğimi (yatay/dikey). */
  const egim = (x, y) => {
    if (!der) return null
    const r = 3
    if (x < r || y < r || x >= W - r || y >= H - r) return null
    let sx = 0
    let sy = 0
    let n = 0
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const i = (y + dy) * W + (x + dx)
        sx += der[i] * dx
        sy += der[i] * dy
        n++
      }
    }
    return { ax: sx / n, ay: sy / n }
  }

  /*
   * GÖKYÜZÜ VAR MI? Üst kenarın beşte biri mavi ve aydınlık değilse bu
   * fotoğrafta gökyüzü yoktur (iç mekân); mavi-gri duvarlar yanlışlıkla
   * gökyüzü sayılmasın.
   */
  let ustMavi = 0
  for (let x = 0; x < W; x++) if (mavilik[x] > 25 && aydinlik[x] > 120) ustMavi++
  const gokVar = ustMavi > W * 0.2

  const sayim = {}
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      let s = SINIF.BILINMEYEN

      if (engel && engel[i] > 0.5) {
        s = SINIF.ENGEL
      } else if (gokVar && mavilik[i] > 25 && aydinlik[i] > 120 && y < H * 0.62) {
        s = SINIF.GOK
      } else {
        const e = egim(x, y)
        if (e) {
          const dikey = Math.abs(e.ay) * H
          const yatayE = Math.abs(e.ax) * W
          /* Yatay düzlem: derinlik dikeyde hızla değişiyor. */
          if (dikey > yayilim * 0.18 && dikey > yatayE * 1.2) {
            s = y > ufuk ? SINIF.ZEMIN : SINIF.TAVAN
          } else {
            s = SINIF.DUVAR
          }
        } else {
          s = y > ufuk + H * 0.1 ? SINIF.ZEMIN : SINIF.DUVAR
        }
        /* Duvar üzerinde yüksek karşıtlık: cam/vitrin. */
        if (s === SINIF.DUVAR && karsit[i] > 55) s = SINIF.CAM
      }

      sinif[i] = s
      sayim[s] = (sayim[s] || 0) + 1
    }
  }

  /* Parlak ekran bölgesi haritaya işleniyor (hedef yüzey). */
  if (ekranKutusu) {
    const x0 = Math.max(0, Math.round(ekranKutusu.x * W))
    const y0 = Math.max(0, Math.round(ekranKutusu.y * H))
    const x1 = Math.min(W, Math.round((ekranKutusu.x + ekranKutusu.w) * W))
    const y1 = Math.min(H, Math.round((ekranKutusu.y + ekranKutusu.h) * H))
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) sinif[y * W + x] = SINIF.EKRAN
    }
  }

  /*
   * KAPI: duvarın içinde, zemine değen, boyu eninden uzun ve çevresinden
   * koyu dikey şeritler. Sütun sütun taranıyor.
   */
  const zeminY = new Int32Array(W).fill(H)
  for (let x = 0; x < W; x++) {
    for (let y = H - 1; y >= 0; y--) {
      if (sinif[y * W + x] === SINIF.ZEMIN) zeminY[x] = y
      else if (zeminY[x] < H) break
    }
  }
  let duvarOrt = 0
  let duvarSay = 0
  for (let i = 0; i < N; i++) {
    if (sinif[i] === SINIF.DUVAR) {
      duvarOrt += parlak[i]
      duvarSay++
    }
  }
  duvarOrt = duvarSay ? duvarOrt / duvarSay : 128
  for (let x = 0; x < W; x++) {
    const taban = Math.min(H - 1, zeminY[x])
    let ust = taban
    while (ust > 0) {
      const i = ust * W + x
      const s = sinif[i]
      if ((s === SINIF.DUVAR || s === SINIF.CAM) && parlak[i] < duvarOrt * 0.72) ust--
      else break
    }
    const boy = taban - ust
    /* Kapı yüksekliği kadrajın en az %12'si olmalı; daha kısası gölgedir. */
    if (boy > H * 0.12) {
      for (let y = ust; y <= taban; y++) {
        const i = y * W + x
        if (sinif[i] === SINIF.DUVAR || sinif[i] === SINIF.CAM) sinif[i] = SINIF.KAPI
      }
    }
  }

  return { w: W, h: H, sinif, sayim, ufuk }
}

/** Bir maskeyi başka ölçüye taşır. */
function olcek(veri, kw, kh, hw, hh) {
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
