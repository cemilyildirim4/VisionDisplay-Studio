/**
 * FOTOĞRAFTAN BAKIŞ AÇISI ÇIKARMA.
 *
 * Kullanıcının eklediği fotoğraf çoğu zaman karşıdan çekilmiş olmuyor: duvar
 * bir açıyla görünüyor, koridor sola kaçıyor, tavan yukarıda daralıyor. Böyle
 * bir kareye tam karşıdan bakan bir dikdörtgen konunca yapıştırılmış gibi
 * duruyor. Buradaki iş, o açıyı fotoğrafın kendisinden ölçmek.
 *
 * DAYANAK — KAÇIŞ NOKTASI.
 * Gerçekte birbirine paralel olan çizgiler (tavan-duvar birleşimi, süpürgelik,
 * raf hattı, kaldırım taşı derzleri) fotoğrafta tek bir noktada buluşur. Bu
 * noktanın kadrajın ortasından ne kadar uzakta olduğu, o yüzeyin kameraya göre
 * ne kadar döndüğünü söyler:
 *
 *     kaçışX − merkezX = odak × cot(açı)   →   açı = atan(odak / kaçışX farkı)
 *
 * Kaçış noktası çok uzaktaysa açı sıfıra yaklaşır — yani duvar karşıdan
 * görünüyordur, doğru sonuç budur.
 *
 * YÖNTEM
 *   1) Kare küçültülüp griye çevrilir.
 *   2) Sobel ile kenarlar ve her kenarın YÖNÜ bulunur.
 *   3) Hough dönüşümü: yataya yakın (dünyada yatay olması beklenen) çizgiler
 *      toplanır. Her kenar pikseli yalnızca kendi yönüne uyan açılara oy verir;
 *      bu hem hızlandırır hem de sahte çizgileri eler.
 *   4) En güçlü çizgilerin ikişerli kesişimleri alınır, ORTANCASI kaçış
 *      noktasıdır. Ortanca kullanılıyor çünkü tek bir yanlış çizgi ortalamayı
 *      kadrajın dışına fırlatabiliyor.
 *
 * NE DEĞİLDİR: Bu bir nesne tanıma değil. Fotoğraftaki eşyaları isimlendirmez;
 * yalnızca çizgilerin nereye kaçtığını ölçer. Nesnelerden kaçınma işini düz ve
 * boş alan arayan duvarBul.js yapıyor — ikisi birlikte "en uygun yere en uygun
 * açıyla" cevabını veriyor.
 */

/** Çözümleme genişliği. Daha büyüğü çizgi bulmayı iyileştirmiyor, yavaşlatıyor. */
const COZUMLEME_W = 360

/** Odak uzaklığı varsayımı (piksel) — yaklaşık 58° yatay görüş açısı. */
const ODAK_KATSAYI = 0.9

/** Kenar sayılmak için gradyan büyüklüğü, karenin ortalamasına göre. */
const KENAR_KATSAYI = 2.2

/** Hough açı aralığı: yataydan ±40°. Ötesi dikey çizgilerdir, işimize yaramaz. */
const ACI_SINIR = 40

/** Döndürme sınırları — useYon.js ile aynı olmalı. */
const YAW_SINIR = 55
const TILT_SINIR = 18

/**
 * Fotoğrafın bakış açısını ölçer.
 *
 * @param {HTMLCanvasElement} kaynak
 * @returns {{yaw:number, tilt:number, guven:number, kacisX:number|null}|null}
 *          Açılar DERECE. guven 0–1. Ölçüm yapılamazsa null.
 */
export function perspektifAcisi(kaynak) {
  const veri = griKare(kaynak)
  if (!veri) return null
  const { gri, W, H } = veri

  const kenarlar = kenarBul(gri, W, H)
  if (kenarlar.length < 40) return bos()

  const cizgiler = houghCizgileri(kenarlar, W, H)
  /*
   * Yataya çok yakın çizgiler kaçış noktası hakkında bilgi taşımaz (kesişimleri
   * sonsuza gider) ama ÖNEMLİ bir şey söylerler: yüzey karşıdan görünüyor.
   * Bu yüzden ayrı sayılıyorlar.
   */
  const duzler = cizgiler.filter((c) => Math.abs(c.aci) < 2.5)
  const egikler = cizgiler.filter((c) => Math.abs(c.aci) >= 2.5)

  if (egikler.length < 2) return bos(duzler.length ? 0.55 : 0.2)

  const kesisimler = []
  for (let i = 0; i < egikler.length; i++) {
    for (let j = i + 1; j < egikler.length; j++) {
      /*
       * Birbirine çok yakın açılı iki çizginin kesişimi kararsızdır: küçük bir
       * ölçüm hatası noktayı kilometrelerce öteye taşır.
       */
      if (Math.abs(egikler[i].aci - egikler[j].aci) < 3.5) continue
      const n = kesistir(egikler[i], egikler[j])
      if (!n) continue
      // Kadrajın on katından uzak kesişimler gürültüdür
      if (Math.abs(n.x - W / 2) > W * 10 || Math.abs(n.y - H / 2) > H * 10) continue
      kesisimler.push(n)
    }
  }
  if (!kesisimler.length) return bos(0.3)

  const kacisX = ortanca(kesisimler.map((n) => n.x))
  const kacisY = ortanca(kesisimler.map((n) => n.y))

  const odak = W * ODAK_KATSAYI
  const fark = kacisX - W / 2

  /*
   * Kaçış noktası kadrajın ortasına ÇOK yakınsa formül 90°'ye fırlar: bu,
   * duvara neredeyse kenarından bakıldığı anlamına gelir ve fotoğraf mekânı
   * için gerçekçi değildir. Böyle bir durumda ölçüm güvenilmez sayılıyor.
   */
  const enAzFark = odak * 0.28
  let yaw = 0
  if (Math.abs(fark) > enAzFark) {
    yaw = (Math.atan(odak / fark) * 180) / Math.PI
    // atan işareti farkın işaretini izler; sınırlandır
    yaw = Math.max(-YAW_SINIR, Math.min(YAW_SINIR, yaw))
  }

  /*
   * Ufuk çizgisi kadrajın ortasının altındaysa kamera aşağı bakıyordur; ekranın
   * üstü hafifçe geriye yatırılınca kare doğal duruyor. Etki küçük tutuldu:
   * dikey duran bir ekran, kamera eğik olsa da dikey kalır; buradaki eğim
   * yalnızca perspektif hissini tamamlıyor.
   */
  const egim = (Math.atan((kacisY - H / 2) / odak) * 180) / Math.PI
  const tilt = Math.max(-TILT_SINIR, Math.min(TILT_SINIR, -egim * 0.6))

  /*
   * GÜVEN: kaç çizgi destekliyor ve kesişimler ne kadar bir arada. Dağınık
   * kesişimler, çizgilerin aslında paralel olmadığını (yani farklı yüzeylere
   * ait olduğunu) gösterir.
   */
  const sacilim = ortanca(kesisimler.map((n) => Math.abs(n.x - kacisX))) / (W || 1)
  const cizgiPayi = Math.min(1, egikler.length / 4)
  /*
   * Ağırlık UYUŞMADA. Çizgi sayısı tek başına az şey söylüyor: iki çizgi aynı
   * noktada buluşuyorsa ölçüm sağlamdır, on çizgi dağılıyorsa değildir.
   * (İlk denemede sayı baskındı ve doğru ölçümler bile eşiğin altında kalıyordu;
   * sentetik duvarlarda 15°–40° arası ölçümler ±4° içindeyken eleniyorlardı.)
   */
  const uyum = 1 - Math.min(1, sacilim * 1.2)
  const guven = Math.max(0, Math.min(1, 0.35 * cizgiPayi + 0.65 * uyum))

  /*
   * KAÇIŞ NOKTASI 0–1 ORANLI DA DÖNÜYOR.
   *
   * Yerleştirme motoru ekranın dört köşesini bu noktaya göre hizalıyor:
   * üst ve alt kenarlar kaçış noktasına doğru yakınsıyor, böylece ekran
   * yüzeyle aynı düzlemde duruyor (bkz. homografi.js perspektifeOturt).
   */
  return {
    yaw: +yaw.toFixed(1),
    tilt: +tilt.toFixed(1),
    guven: +guven.toFixed(2),
    kacisX,
    kacis: { x: kacisX / W, y: kacisY / H },
  }
}

function bos(guven = 0.25) {
  return { yaw: 0, tilt: 0, guven, kacisX: null }
}

/* ------------------------------------------------------------------ */

/** Kaynağı küçültüp gri diziye çevirir. */
function griKare(kaynak) {
  const kw = kaynak.videoWidth || kaynak.naturalWidth || kaynak.width
  const kh = kaynak.videoHeight || kaynak.naturalHeight || kaynak.height
  if (!kw || !kh) return null

  const W = Math.min(COZUMLEME_W, kw)
  const H = Math.max(1, Math.round((kh * W) / kw))
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(kaynak, 0, 0, W, H)

  let veri
  try {
    veri = ctx.getImageData(0, 0, W, H).data
  } catch {
    return null // başka kaynaktan gelen görüntü: okunamaz
  }
  const gri = new Float32Array(W * H)
  for (let i = 0, p = 0; i < gri.length; i++, p += 4) {
    gri[i] = 0.299 * veri[p] + 0.587 * veri[p + 1] + 0.114 * veri[p + 2]
  }
  return { gri, W, H }
}

/** Sobel: güçlü kenarları ve yönlerini döndürür. */
function kenarBul(gri, W, H) {
  const gxs = new Float32Array(W * H)
  const gys = new Float32Array(W * H)
  let toplam = 0
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x
      const gx =
        -gri[i - W - 1] - 2 * gri[i - 1] - gri[i + W - 1] +
        gri[i - W + 1] + 2 * gri[i + 1] + gri[i + W + 1]
      const gy =
        -gri[i - W - 1] - 2 * gri[i - W] - gri[i - W + 1] +
        gri[i + W - 1] + 2 * gri[i + W] + gri[i + W + 1]
      gxs[i] = gx
      gys[i] = gy
      toplam += Math.abs(gx) + Math.abs(gy)
    }
  }
  const ortalama = toplam / (W * H) || 1
  const esik = ortalama * KENAR_KATSAYI

  const kenarlar = []
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x
      const gx = gxs[i]
      const gy = gys[i]
      const buyukluk = Math.abs(gx) + Math.abs(gy)
      if (buyukluk < esik) continue
      /*
       * Çizginin yönü gradyanın DİKİNE. Dünyada yatay olan çizgiler
       * aranıyor, yani görüntüde yataya yakın olanlar.
       */
      const cizgiAci = (Math.atan2(-gx, gy) * 180) / Math.PI
      /*
       * −90..+90 aralığına indirgeme. JavaScript'te % işareti koruyor
       * (−170 % 180 = −170), o yüzden tek bir mod yetmiyor: negatif açılar
       * aralığın dışında kalıp eleniyordu ve eğimli çizgilerin yarısı
       * görünmez oluyordu. İkinci ekleme bunu düzeltiyor.
       */
      const norm = ((((cizgiAci + 90) % 180) + 180) % 180) - 90
      if (Math.abs(norm) > ACI_SINIR) continue
      kenarlar.push({ x, y, aci: norm, agirlik: buyukluk })
    }
  }
  return kenarlar
}

/**
 * Hough: (açı, uzaklık) uzayında oy toplayıp en güçlü çizgileri çıkarır.
 * Her kenar pikseli yalnızca KENDİ yönüne yakın açılara oy veriyor.
 */
function houghCizgileri(kenarlar, W, H) {
  const ACI_ADIM = 1
  const N_ACI = (ACI_SINIR * 2) / ACI_ADIM + 1
  const RHO_ADIM = 2
  const rhoEnCok = Math.ceil(Math.hypot(W, H))
  const N_RHO = Math.ceil((2 * rhoEnCok) / RHO_ADIM) + 1
  const oy = new Float32Array(N_ACI * N_RHO)

  for (const k of kenarlar) {
    const merkez = Math.round((k.aci + ACI_SINIR) / ACI_ADIM)
    for (let d = -2; d <= 2; d++) {
      const ai = merkez + d
      if (ai < 0 || ai >= N_ACI) continue
      const aci = (-ACI_SINIR + ai * ACI_ADIM) * (Math.PI / 180)
      // Çizgi yönü (cos, sin) → normal (-sin, cos)
      const rho = -k.x * Math.sin(aci) + k.y * Math.cos(aci)
      const ri = Math.round((rho + rhoEnCok) / RHO_ADIM)
      if (ri < 0 || ri >= N_RHO) continue
      oy[ai * N_RHO + ri] += k.agirlik * (d === 0 ? 1 : 0.5)
    }
  }

  /* En güçlü tepeler — birbirine yakın olanlar aynı çizgidir, elenir. */
  const adaylar = []
  for (let ai = 0; ai < N_ACI; ai++) {
    for (let ri = 1; ri < N_RHO - 1; ri++) {
      const v = oy[ai * N_RHO + ri]
      if (v <= 0) continue
      if (v < oy[ai * N_RHO + ri - 1] || v < oy[ai * N_RHO + ri + 1]) continue
      adaylar.push({ v, aci: -ACI_SINIR + ai * ACI_ADIM, rho: -rhoEnCok + ri * RHO_ADIM })
    }
  }
  adaylar.sort((a, b) => b.v - a.v)

  const secilen = []
  for (const a of adaylar) {
    if (secilen.length >= 10) break
    const benzer = secilen.some(
      (s) => Math.abs(s.aci - a.aci) < 3 && Math.abs(s.rho - a.rho) < Math.max(8, H * 0.06),
    )
    if (!benzer) secilen.push(a)
  }
  /* Zayıf tepeler gürültüdür: en güçlünün beşte birinden azını alma. */
  const esik = secilen.length ? secilen[0].v * 0.2 : 0
  return secilen.filter((s) => s.v >= esik)
}

/** İki Hough çizgisinin kesişimi. */
function kesistir(a, b) {
  const ra = a.aci * (Math.PI / 180)
  const rb = b.aci * (Math.PI / 180)
  // Çizgi: -x·sin + y·cos = rho
  const a1 = -Math.sin(ra)
  const b1 = Math.cos(ra)
  const a2 = -Math.sin(rb)
  const b2 = Math.cos(rb)
  const det = a1 * b2 - a2 * b1
  if (Math.abs(det) < 1e-6) return null
  return {
    x: (a.rho * b2 - b.rho * b1) / det,
    y: (a1 * b.rho - a2 * a.rho) / det,
  }
}

function ortanca(dizi) {
  if (!dizi.length) return 0
  const s = [...dizi].sort((a, b) => a - b)
  const o = s.length >> 1
  return s.length % 2 ? s[o] : (s[o - 1] + s[o]) / 2
}
