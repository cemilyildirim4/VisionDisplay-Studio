/**
 * DÜZLEM TABANLI ADAY ÜRETİMİ — her fotoğrafta çalışan yöntem.
 *
 * NEDEN YENİDEN YAZILDI: önceki üretici, kadrajı sabit oranlı pencerelerle
 * tarayıp her pencereyi ayrı ayrı puanlıyordu. Bu yaklaşım fotoğraf başına
 * elle eşik ayarı istiyor: bir karede iyi çalışan eşik, ötekinde kareyi
 * kolonun üstüne ya da zemine düşürüyordu. Sorun eşiklerde değil yöntemdeydi:
 * pencere, sahnenin YAPISINI hiç bilmiyordu.
 *
 * YENİ YÖNTEM — üç adım, hepsi ölçüme dayalı:
 *
 *   1) DÜZLEMLER. Derinlik haritasında bölge büyütmeyle düzlemler çıkarılıyor
 *      (ters derinlik bir düzlem üzerinde 1/Z ≈ a·x + b·y + c'dir). Her bölge
 *      tek bir fiziksel yüzeydir: bir duvar, bir cephe, bir vitrin. Kolonun
 *      iki yanı AYRI bölgelerdir — çünkü aralarında derinlik kırılması var.
 *      Böylece "kolonun üstüne oturma" sorunu kuralla değil, yapıyla çözülüyor.
 *
 *   2) YERLEŞTİRİLEBİLİR MASKE. Bölgeden zemin/tavan (yatay düzlemler),
 *      gökyüzü, insan/araç/eşya ve kapı çıkarılıyor.
 *
 *   3) EN BÜYÜK DİKDÖRTGEN. Maskenin içine sığan en büyük dikdörtgen
 *      klasik histogram yöntemiyle bulunuyor (satır satır yükseklik yığını,
 *      her satırda yığın taraması). Sonuç: yüzeyin gerçekten boş olan en
 *      geniş parçası — fotoğraf ne olursa olsun.
 *
 * PERSPEKTİF bölgenin kendi düzlem uydurmasından geliyor: görünen boy ≈ 1/Z
 * olduğu için dikdörtgenin sol ve sağ kenarı kendi derinliğine göre
 * ölçekleniyor. Ayrı bir kaçış noktası tahminine gerek kalmıyor.
 */

/** Çözümleme genişliği. */
const W_COZ = 128

/** Düzlem uydurmada kabul edilen artık payı (ters derinlik yayılımının oranı). */
const UYUM_PAYI = 0.035

/** Bir bölgenin aday sayılması için gereken en küçük alan (kadraj payı). */
const EN_KUCUK_BOLGE = 0.02

/**
 * @param {object} sec
 * @param {{w:number,h:number,veri:Float32Array}} sec.derinlik
 * @param {Float32Array|null} [sec.engel] engel maskesi (aynı ölçüde değilse ölçeklenir)
 * @param {number} [sec.engelW]
 * @param {number} [sec.engelH]
 * @param {Uint8Array|null} [sec.yasak] yerleştirilemez piksel maskesi (0/1)
 * @param {number} [sec.yasakW]
 * @param {number} [sec.yasakH]
 * @param {number} [sec.oran] tasarımın en/boy oranı
 * @param {number} [sec.enCok]
 * @returns {Array<{koseler:Array<{x:number,y:number}>, skor:number, tur:string, etiket:string}>}
 */
export function duzlemAdaylari(sec = {}) {
  const { derinlik, engel = null, engelW = 0, engelH = 0, yasak = null, yasakW = 0, yasakH = 0, oran = 16 / 9, enCok = 5 } = sec
  if (!derinlik?.veri) return []

  const W = Math.min(W_COZ, derinlik.w)
  const H = Math.max(1, Math.round((derinlik.h * W) / derinlik.w))
  const der = olcekle(derinlik.veri, derinlik.w, derinlik.h, W, H)
  const eng = engel ? olcekle(engel, engelW || derinlik.w, engelH || derinlik.h, W, H) : null
  const yas = yasak ? olcekle(yasak, yasakW || W, yasakH || H, W, H) : null
  if (!der) return []

  let enAz = Infinity
  let enCokD = -Infinity
  for (let i = 0; i < der.length; i++) {
    if (der[i] < enAz) enAz = der[i]
    if (der[i] > enCokD) enCokD = der[i]
  }
  const yayilim = Math.max(1e-6, enCokD - enAz)
  const pay = yayilim * UYUM_PAYI

  const etiketli = new Int32Array(W * H).fill(-1)
  const bolgeler = []

  /* Tohumlar düzenli ızgarada; her tohum kendi düzlemini büyütüyor. */
  const adim = Math.max(3, Math.round(Math.min(W, H) / 18))
  for (let sy = adim; sy < H - adim; sy += adim) {
    for (let sx = adim; sx < W - adim; sx += adim) {
      const bas = sy * W + sx
      if (etiketli[bas] >= 0) continue
      if (eng && eng[bas] > 0.5) continue
      if (yas && yas[bas] > 0.5) continue

      const uyum = duzlemUydurPencere(der, W, H, sx, sy, adim)
      if (!uyum) continue

      const no = bolgeler.length
      const piksel = []
      const yigin = [bas]
      etiketli[bas] = no
      while (yigin.length) {
        const i = yigin.pop()
        piksel.push(i)
        const x = i % W
        const y = (i / W) | 0
        const komsu = [i - 1, i + 1, i - W, i + W]
        for (let k = 0; k < 4; k++) {
          const j = komsu[k]
          if (j < 0 || j >= W * H || etiketli[j] >= 0) continue
          if (k < 2 && Math.abs((j % W) - x) !== 1) continue
          if (eng && eng[j] > 0.5) continue
          if (yas && yas[j] > 0.5) continue
          const jx = j % W
          const jy = (j / W) | 0
          const bekle = uyum.a * jx + uyum.b * jy + uyum.c
          if (Math.abs(der[j] - bekle) > pay) continue
          etiketli[j] = no
          yigin.push(j)
        }
      }

      if (piksel.length < W * H * EN_KUCUK_BOLGE) {
        for (const q of piksel) etiketli[q] = -1
        continue
      }
      const son = duzlemUydurPiksel(der, W, piksel) || uyum
      /*
       * UYUM KALİTESİ: düzlemin bölgeye ne kadar oturduğu. Perspektif
       * ancak bu kalite yüksekken uygulanıyor — ölçüm güvenilir değilse
       * ekranı eğmek, onu havada yatırmak demek.
       */
      let hata = 0
      let sayac = 0
      for (let q = 0; q < piksel.length; q += Math.max(1, Math.floor(piksel.length / 500))) {
        const i = piksel[q]
        const x = i % W
        const y = (i / W) | 0
        const f = der[i] - (son.a * x + son.b * y + son.c)
        hata += f * f
        sayac++
      }
      const artik = Math.sqrt(hata / Math.max(1, sayac))
      bolgeler.push({ no, piksel, ...son, artik })
    }
  }

  /* Her bölge için: maske → en büyük dikdörtgen → dörtgen. */
  const adaylar = []
  for (const b of bolgeler) {
    /*
     * YATAY DÜZLEM ELEMESİ. Zeminde ve tavanda ters derinlik dikeyde hızla
     * değişir; duvarda neredeyse sabittir. Ekran duvara asılır.
     */
    const dikeyEgim = Math.abs(b.b) * H
    const yatayEgim = Math.abs(b.a) * W
    if (dikeyEgim > yayilim * 0.14 && dikeyEgim > yatayEgim) continue

    const maske = new Uint8Array(W * H)
    for (const i of b.piksel) maske[i] = 1

    const dik = enBuyukDikdortgen(maske, W, H, oran)
    if (!dik) continue
    const { x0, y0, x1, y1 } = dik
    /*
     * UFUK ALTI YERLEŞTİRİLMEZ.
     *
     * Zemin ve masa üstü düzlemleri bazen dik yüzey gibi görünüyor (parlak
     * mermer, cilalı masa). Ama hepsi ufkun ALTINDA kalıyor: ekranın merkezi
     * kadrajın alt üçte birindeyse orası duvar değil, yerdir.
     */
    if ((y0 + y1) / 2 > H * 0.66) continue

    const alanPay = ((x1 - x0) * (y1 - y0)) / (W * H)
    if (alanPay < 0.012) continue

    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2

    /*
     * PERSPEKTİF YALNIZCA ÖLÇÜM GÜVENİLİRSE.
     *
     * İki şart birlikte aranıyor:
     *   • düzlem bölgeye İYİ oturmuş olmalı (artık pay küçük) — kötü
     *     uydurmada eğim gürültüden gelir ve ekranı havada yatırır;
     *   • yüzey gerçekten EĞİK olmalı (yatay derinlik eğimi belirgin) —
     *     karşıdan görünen bir duvarda eğim vermek yanlış olur.
     * İkisi sağlanmıyorsa dikdörtgen kadrajla hizalı kalıyor; kullanıcı
     * dilerse açıyı elle veriyor (bkz. AciSecici.jsx).
     */
    const uyumIyi = b.artik != null && b.artik < yayilim * 0.02
    const egikYuzey = Math.abs(b.a) * W > yayilim * 0.06
    const yariH = (y1 - y0) / 2
    const zc = b.a * cx + b.b * cy + b.c
    const zl = b.a * x0 + b.b * cy + b.c
    const zr = b.a * x1 + b.b * cy + b.c
    let koseler
    if (uyumIyi && egikYuzey && zc > 1e-6 && zl > 1e-6 && zr > 1e-6) {
      const sl = Math.max(0.7, Math.min(1.42, zl / zc))
      const sr = Math.max(0.7, Math.min(1.42, zr / zc))
      koseler = [
        { x: x0 / W, y: (cy - yariH * sl) / H },
        { x: x1 / W, y: (cy - yariH * sr) / H },
        { x: x1 / W, y: (cy + yariH * sr) / H },
        { x: x0 / W, y: (cy + yariH * sl) / H },
      ]
    } else {
      koseler = [
        { x: x0 / W, y: y0 / H },
        { x: x1 / W, y: y0 / H },
        { x: x1 / W, y: y1 / H },
        { x: x0 / W, y: y1 / H },
      ]
    }
    if (koseler.some((k) => k.x < 0.004 || k.x > 0.996 || k.y < 0.004 || k.y > 0.996)) continue

    const merkezX = cx / W
    const merkezY = cy / H
    const merkezlik = 1 - Math.min(1, Math.abs(merkezX - 0.5) * 2)
    const gozHizasi = 1 - Math.min(1, Math.abs(merkezY - 0.45) * 2.4)
    const buyukluk = Math.min(1, alanPay / 0.18)
    const skor = Math.round(buyukluk * 46 + merkezlik * 20 + gozHizasi * 16 + 18)

    adaylar.push({
      koseler,
      skor,
      tur: 'surface',
      etiket: yuzeyAdi(merkezX, merkezY),
      merkez: { x: merkezX, y: merkezY },
    })
  }

  adaylar.sort((a, b) => b.skor - a.skor)

  /* Aynı yeri iki kez önerme. */
  const secilen = []
  for (const a of adaylar) {
    if (secilen.length >= enCok) break
    if (secilen.some((s) => Math.hypot(s.merkez.x - a.merkez.x, s.merkez.y - a.merkez.y) < 0.16)) continue
    secilen.push(a)
  }
  return secilen
}

/* ------------------------------------------------------------------ */

/**
 * Maskenin içine sığan EN BÜYÜK dikdörtgen (histogram yöntemi).
 *
 * Her satır için "bu sütunda kaç satırdır kesintisiz doluyuz" yüksekliği
 * tutuluyor; sonra o satırda yığınla en büyük dikdörtgen aranıyor. Klasik
 * "largest rectangle in histogram" algoritmasının iki boyutlu hâli, O(W·H).
 *
 * `oran` verildiyse en/boy oranı ona yakın olan dikdörtgen tercih ediliyor:
 * tasarım oranına yakın alan, sonradan kırpma gerektirmiyor.
 */
function enBuyukDikdortgen(maske, W, H, oran) {
  const yuk = new Int32Array(W)
  let enIyi = null
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      yuk[x] = maske[y * W + x] ? yuk[x] + 1 : 0
    }
    /* Yığınla: her sütun için sola ve sağa genişleyebildiği kadar. */
    const yigin = []
    for (let x = 0; x <= W; x++) {
      const h = x === W ? 0 : yuk[x]
      let baslangic = x
      while (yigin.length && yigin[yigin.length - 1].h >= h) {
        const t = yigin.pop()
        const gen = x - t.x
        const alan = gen * t.h
        /* Oran cezası: tasarımdan çok farklı biçimler daha az değerli. */
        const bicim = oran > 0 && t.h > 0 ? Math.min(gen / t.h, t.h / gen ? oran / (gen / t.h) : 1) : 1
        const puan = alan * (0.6 + 0.4 * Math.max(0, Math.min(1, bicim)))
        if (gen >= 6 && t.h >= 4 && (!enIyi || puan > enIyi.puan)) {
          enIyi = { puan, x0: t.x, x1: x, y0: y - t.h + 1, y1: y + 1 }
        }
        baslangic = t.x
      }
      yigin.push({ x: baslangic, h })
    }
  }
  return enIyi
}

/** 7×7 pencerede düzlem uydurma. */
function duzlemUydurPencere(der, W, H, sx, sy, r) {
  const liste = []
  for (let y = Math.max(0, sy - r); y < Math.min(H, sy + r); y++) {
    for (let x = Math.max(0, sx - r); x < Math.min(W, sx + r); x++) liste.push(y * W + x)
  }
  return duzlemUydurPiksel(der, W, liste)
}

/** En küçük kareler: z = a·x + b·y + c */
function duzlemUydurPiksel(der, W, liste) {
  const n = liste.length
  if (n < 8) return null
  const atla = Math.max(1, Math.floor(n / 900))
  let sx = 0, sy = 0, sz = 0, sxx = 0, sxy = 0, syy = 0, sxz = 0, syz = 0, m = 0
  for (let i = 0; i < n; i += atla) {
    const p = liste[i]
    const x = p % W
    const y = (p / W) | 0
    const z = der[p]
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

function yuzeyAdi(x, y) {
  const yatay = x < 0.36 ? 'Sol' : x > 0.64 ? 'Sağ' : 'Orta'
  const dikey = y < 0.38 ? ' üst' : y > 0.62 ? ' alt' : ''
  return `${yatay}${dikey} duvar`
}

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
