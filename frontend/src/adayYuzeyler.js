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

import { mevcutEkranYuzeyi } from './ekranYuzeyi.js'

/** Çözümleme genişliği — hızlı ve yeterli. */
const COZUMLEME_W = 160

/** Bir karede kabul edilen en yüksek gökyüzü ve eşya payı. */
const GOK_SINIRI = 0.12
const ENGEL_SINIRI = 0.08

/** Aday sayılabilmesi için gereken en düşük puan. */
const PUAN_ESIGI = 62

/** Aynı yerin iki kez önerilmemesi için en az merkez ayrımı (kadraj payı). */
/* 0,13 iken aynı pano üzerine dört ayrı kare düşüyordu; 0,20 ile seçenekler ayrışıyor. */
const AYRIM = 0.2

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
    enCok = 5,
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

        /*
         * ZEMİN VE ALT ŞERİT ELEMESİ.
         *
         * Kullanıcının bilbord fotoğrafında yol, araçlar ve korkuluk üzerine
         * kareler öneriliyordu: derinlikte yol da düz bir yüzeydir. Kural
         * netleşti: zemin çizgisinin altı ve kadrajın alt beşte biri
         * yerleştirilebilir yüzey sayılmıyor — oralar yürüme/araç alanı.
         */
        if (zeminOran != null && y1 / H > zeminOran) continue
        if (y0 / H > 0.72) continue

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
          /*
           * YATAY YÜZEY (zemin, yol, tavan) ELENİYOR.
           *
           * Dik bir duvarda derinlik yukarıdan aşağıya neredeyse sabittir;
           * zeminde ise sürekli değişir. Eşik 0,55'ten 0,22'ye çekildi:
           * yol yüzeyleri o aralıkta kalıp aday olabiliyordu.
           */
          const dikeyEgim = Math.abs(duzlem.b) * H
          const yatayEgim = Math.abs(duzlem.a) * W
          if (dikeyEgim > derYayilim * 0.22 && dikeyEgim > yatayEgim) continue
          /* Çok dalgalı bölge (ağaç, kalabalık cephe) yüzey değildir. */
          if (duzluk < 0.35) continue
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

  /*
   * PANO/EKRAN ARAMASI — NESNE MODELİ YETMEDİĞİNDE.
   *
   * Nesne tanıma modeli Pascal-VOC sınıflarını biliyor; orada "televizyon"
   * var ama BİLBORD yok. Açık hava panolarında bu yüzden hiç ekran
   * bulunamıyor, oysa kullanıcının beklediği tam olarak o: fotoğraftaki
   * mevcut panonun içine yerleşmek.
   *
   * Çare geometri: en güçlü birkaç adayın çevresinde kenar araması yapılıyor
   * (ekranYuzeyi.js). Dört kenarı da güçlü, çerçevesi belirgin bir dikdörtgen
   * çıkarsa orası bir gösterim yüzeyidir — türü 'screen' oluyor ve tasarım
   * oraya oturuyor.
   */
  if (!sonuc.length) {
    /*
     * ARAMA KUTULARI: en güçlü adayların BİRLEŞİMİ ve kadrajın ortası.
     *
     * Tek tek adaylarla arandığında panonun yalnızca bir şeridi bulunuyordu
     * (aday kutusu panonun bir parçasıydı, Hough da o parçanın kenarlarını
     * gördü). Birleşim kutusu bütün panoyu kapsıyor; kazanan, dört kenarı
     * güçlü olanlar arasında EN BÜYÜK alanlı dörtgen oluyor.
     */
    const kutular = []
    const iyiler = ham.slice(0, 4)
    if (iyiler.length) {
      const xs = iyiler.flatMap((a) => a.koseler.map((k) => k.x))
      const ys = iyiler.flatMap((a) => a.koseler.map((k) => k.y))
      kutular.push({
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys),
      })
    }
    /*
     * KADRAJIN TAMAMINI ARAMA KUTUSU YAPMIYORUZ.
     *
     * Denendi: Hough o zaman bina cephelerinin hatlarını birleştirip
     * kadrajın yarısını kaplayan yamuk bir dörtgen üretti. Arama, adayların
     * bulunduğu bölgeyle sınırlı kalmalı.
     */
    for (const a of iyiler) {
      const xs = a.koseler.map((k) => k.x)
      const ys = a.koseler.map((k) => k.y)
      kutular.push({
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys),
      })
    }

    let enIyi = null
    for (const kutu of kutular) {
      if (!(kutu.w > 0.08) || !(kutu.h > 0.05)) continue
      let bulunan = null
      try {
        bulunan = mevcutEkranYuzeyi(tuval, { ekranKutusu: kutu })
      } catch {
        bulunan = null
      }
      if (!bulunan || bulunan.kaba || bulunan.skor < 70) continue
      const alan = dortgenAlanOran(bulunan.koseler)
      /*
       * PANO OLMA ŞARTLARI.
       *  • kadrajın %3'ünden büyük, %45'inden küçük olmalı — daha büyüğü
       *    artık "sahnenin kendisi"dir, pano değil;
       *  • kenarlara yapışmamalı: gerçek bir pano fotoğrafın içinde durur.
       */
      if (!(alan > 0.03) || alan > 0.45) continue
      const kx = bulunan.koseler.map((k) => k.x)
      const ky = bulunan.koseler.map((k) => k.y)
      if (Math.min(...kx) < 0.02 || Math.max(...kx) > 0.98) continue
      if (Math.min(...ky) < 0.02 || Math.max(...ky) > 0.98) continue
      /* Şerit gibi ince dörtgen pano değildir; en/boy 0,3–5 arasında olmalı. */
      const oranDeg = dortgenEnBoy(bulunan.koseler)
      if (!(oranDeg > 0.3) || !(oranDeg < 5)) continue
      if (!enIyi || alan > enIyi.alan) enIyi = { koseler: bulunan.koseler, alan }
    }
    if (enIyi) sonuc.push({ koseler: enIyi.koseler, skor: 100, tur: 'screen' })
  }

  /*
   * PUANI DÜŞÜK ADAY GÖSTERİLMİYOR.
   *
   * Listeyi altıya tamamlamak için zayıf adayları da göstermek zarar
   * veriyordu: kullanıcı yolun üzerindeki kareyi görüp "saçma" diyor.
   * Az ama doğru seçenek, çok ama şüpheli seçenekten iyi.
   */
  const elenmis = ham.filter((a) => a.skor >= PUAN_ESIGI)

  const merkezler = sonuc.map((a) => dortgenMerkez(a.koseler))
  for (const a of elenmis) {
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

/** Dörtgenin alanı (0–1 birim karede). */
function dortgenAlanOran(k) {
  return Math.abs(
    k.reduce((t, p, i) => {
      const n = k[(i + 1) % 4]
      return t + (p.x * n.y - n.x * p.y)
    }, 0) / 2,
  )
}

/** Dörtgenin en/boy oranı (yaklaşık, kenar uzunluklarından). */
function dortgenEnBoy(k) {
  const en = (Math.hypot(k[1].x - k[0].x, k[1].y - k[0].y) + Math.hypot(k[2].x - k[3].x, k[2].y - k[3].y)) / 2
  const boy = (Math.hypot(k[3].x - k[0].x, k[3].y - k[0].y) + Math.hypot(k[2].x - k[1].x, k[2].y - k[1].y)) / 2
  return boy > 0 ? en / boy : 0
}

function dortgenMerkez(k) {
  return {
    x: k.reduce((t, p) => t + p.x, 0) / k.length,
    y: k.reduce((t, p) => t + p.y, 0) / k.length,
  }
}
