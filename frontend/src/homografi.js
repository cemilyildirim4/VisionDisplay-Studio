/**
 * DÖRT KÖŞE PERSPEKTİF EŞLEME (homografi).
 *
 * Ekranı bir yüzeye "oturtmak" için tek bir dönme açısı yetmiyor. Fotoğraftaki
 * bir billboard yamuktur: dört kenarı da farklı uzunlukta, karşılıklı kenarlar
 * paralel değil. Bunu ancak dört köşeyi dört köşeye eşleyen bir dönüşüm
 * verebilir — homografi.
 *
 * NEDEN CSS `matrix3d`: ekranın içeriği bir DOM ağacı (görsel, video, LED
 * dokusu, çoklu ekran şeritleri). Canvas'a çizip warp etmek, videoyu her karede
 * elle kopyalamayı ve bütün çizim yolunu ikiye ayırmayı gerektirirdi.
 * `matrix3d` aynı dönüşümü ağacın tamamına, tarayıcının kendi katmanında
 * uyguluyor: video oynamaya devam ediyor, metin seçilebilir kalıyor, ölçü
 * etiketleri dışarıda tutulabiliyor.
 *
 * MATEMATİK: kaynak dikdörtgenden (0,0)-(w,0)-(w,h)-(0,h) hedef dörtgene giden
 * 3×3 homografi H, sekiz bilinmeyenli doğrusal bir denklem takımıdır. Kaynak
 * bir dikdörtgen olduğu için takım kapalı biçimde çözülüyor (Heckbert'in klasik
 * türetimi): önce birim kareden hedefe olan dönüşüm, sonra ölçekleme.
 *
 * CSS'in `matrix3d`'si 4×4 sütun-öncelikli bir dizi ister; 3×3 homografi
 * z eksenine dokunulmadan bu kalıba yerleştiriliyor.
 */

/** Sayısal kararlılık için: paydası sıfıra yakın dönüşüm çizilemez. */
const EPS = 1e-9

/**
 * Birim kareden (0,0)-(1,0)-(1,1)-(0,1) verilen dörtgene homografi.
 * @param {Array<{x:number,y:number}>} k dört köşe: SÜ, SağÜ, SağA, SolA
 * @returns {number[]|null} [a,b,c, d,e,f, g,h] (i = 1)
 */
function birimKaredenHomografi(k) {
  const [p0, p1, p2, p3] = k
  const dx1 = p1.x - p2.x
  const dx2 = p3.x - p2.x
  const dy1 = p1.y - p2.y
  const dy2 = p3.y - p2.y
  const sx = p0.x - p1.x + p2.x - p3.x
  const sy = p0.y - p1.y + p2.y - p3.y

  const det = dx1 * dy2 - dx2 * dy1
  if (Math.abs(det) < EPS) return null

  /* Paralel kenarlı (afin) durum ile genel durum aynı formülle çıkıyor. */
  const g = (sx * dy2 - dx2 * sy) / det
  const h = (dx1 * sy - sx * dy1) / det

  return [
    p1.x - p0.x + g * p1.x,
    p3.x - p0.x + h * p3.x,
    p0.x,
    p1.y - p0.y + g * p1.y,
    p3.y - p0.y + h * p3.y,
    p0.y,
    g,
    h,
  ]
}

/**
 * w×h boyutundaki bir kutuyu verilen dört köşeye oturtan CSS dönüşümü.
 *
 * @param {number} w kaynak kutunun genişliği (px)
 * @param {number} h kaynak kutunun yüksekliği (px)
 * @param {Array<{x:number,y:number}>} koseler hedef köşeler, kutunun SOL ÜST
 *        noktasına göre px: [solUst, sagUst, sagAlt, solAlt]
 * @returns {string|null} `matrix3d(...)` ya da çizilemiyorsa null
 */
export function koseDonusumu(w, h, koseler) {
  if (!(w > 0) || !(h > 0) || !Array.isArray(koseler) || koseler.length !== 4) return null
  if (koseler.some((k) => !k || !Number.isFinite(k.x) || !Number.isFinite(k.y))) return null

  const H = birimKaredenHomografi(koseler)
  if (!H) return null

  /*
   * Birim kare yerine w×h kutusu: önce 1/w, 1/h ile ölçekleniyor. Yani
   * H' = H · diag(1/w, 1/h, 1).
   */
  const [a, b, c, d, e, f, g, hh] = H
  const m = [a / w, b / h, c, d / w, e / h, f, g / w, hh / h]

  /* 3×3 → 4×4, sütun öncelikli. */
  const M = [
    m[0], m[3], 0, m[6],
    m[1], m[4], 0, m[7],
    0, 0, 1, 0,
    m[2], m[5], 0, 1,
  ]
  if (M.some((v) => !Number.isFinite(v))) return null
  return `matrix3d(${M.map((v) => (Math.abs(v) < 1e-12 ? 0 : Number(v.toFixed(8)))).join(', ')})`
}

/**
 * Dörtgen geçerli mi — kenarları kesişmiyor ve alanı anlamlı mı?
 *
 * Manuel kipte kullanıcı bir köşeyi karşı köşenin ötesine sürükleyebiliyor;
 * o durumda dörtgen kelebek biçimine giriyor ve dönüşüm ekranı ters çeviriyor.
 * Bunu çizmektense o hareketi kabul etmemek doğru.
 */
export function dortgenGecerli(koseler, enAzAlan = 400) {
  if (!Array.isArray(koseler) || koseler.length !== 4) return false
  const alan = Math.abs(
    koseler.reduce((t, k, i) => {
      const n = koseler[(i + 1) % 4]
      return t + (k.x * n.y - n.x * k.y)
    }, 0) / 2,
  )
  if (!(alan > enAzAlan)) return false
  /* Dışbükeylik: çapraz çarpımların işareti değişmemeli. */
  let isaret = 0
  for (let i = 0; i < 4; i++) {
    const a = koseler[i]
    const b = koseler[(i + 1) % 4]
    const c = koseler[(i + 2) % 4]
    const z = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (Math.abs(z) < EPS) continue
    const s = z > 0 ? 1 : -1
    if (isaret === 0) isaret = s
    else if (s !== isaret) return false
  }
  return true
}

/**
 * Dörtgenin İÇİNDEKİ bir nokta.
 *
 * (u,v) birim karedeki konum: (0,0) sol üst, (1,1) sağ alt. Yüzeyin kendi
 * düzleminde ölçü yapabilmek için gerekli.
 */
export function dortgenNoktasi(koseler, u, v) {
  const H = birimKaredenHomografi(koseler)
  if (!H) return null
  const [a, b, c, d, e, f, g, h] = H
  const payda = g * u + h * v + 1
  if (Math.abs(payda) < EPS) return null
  return {
    x: (a * u + b * v + c) / payda,
    y: (d * u + e * v + f) / payda,
  }
}

/**
 * Yüzeyin İÇİNE, gerçek ölçüsüne göre yerleşen alt dörtgen.
 *
 * Tasarımı yüzeyin tamamına yaymak yanlıştı: 4 metrelik bir ekran da, 12
 * metrelik bir ekran da panoyu tamamen dolduruyor ve fotoğraftan fotoğrafa
 * ölçü hissi tutmuyordu — kullanıcının "aşırı fark var" dediği şey buydu.
 *
 * Artık yüzeyin gerçek genişliği biliniyor (kullanıcı "bu alan kaç metre?"
 * ile veriyor; fotoğrafın ölçeği bu) ve tasarım o ölçeğe göre yüzeyin içine
 * oturuyor. Yüzeyin gerçek YÜKSEKLİĞİ dörtgenin piksel en/boy oranından
 * türetiliyor: karşıdan görünen yüzeylerde doğru, çok eğik olanlarda yaklaşık.
 */
export function icDortgen(koseler, tasarimWm, tasarimHm, yuzeyWm) {
  if (!Array.isArray(koseler) || koseler.length !== 4) return koseler
  if (!(tasarimWm > 0) || !(tasarimHm > 0) || !(yuzeyWm > 0)) return koseler
  const enUst = Math.hypot(koseler[1].x - koseler[0].x, koseler[1].y - koseler[0].y)
  const enAlt = Math.hypot(koseler[2].x - koseler[3].x, koseler[2].y - koseler[3].y)
  const boySol = Math.hypot(koseler[3].x - koseler[0].x, koseler[3].y - koseler[0].y)
  const boySag = Math.hypot(koseler[2].x - koseler[1].x, koseler[2].y - koseler[1].y)
  const enPx = (enUst + enAlt) / 2
  const boyPx = (boySol + boySag) / 2
  if (!(enPx > 0) || !(boyPx > 0)) return koseler
  const yuzeyHm = yuzeyWm * (boyPx / enPx)

  /*
   * TASARIM YÜZEYDEN BÜYÜK OLABİLİR.
   *
   * Önce yüzeye zorla sığdırıyordum (en fazla %100). Sonuç yanlıştı: 20
   * metrelik bir ekran, algılanan 5 metrelik panele hapsolup küçücük
   * görünüyordu — üstelik o panel çoğu zaman bilbordun yalnızca bir parçası.
   * Gerçekte 20 m lik ekran 5 m lik panoya sığmaz; büyük görünmesi doğru
   * bilgidir. Yüzeyin MERKEZİ ve PERSPEKTİFİ korunuyor, ölçü serbest.
   *
   * Üst sınır yalnızca uç durumlar için: yüzeyin altı katından fazlası
   * kadraja da sığmıyor, çizim anlamını yitiriyor.
   */
  const fw = Math.min(6, tasarimWm / yuzeyWm)
  const fh = Math.min(6, tasarimHm / yuzeyHm)
  const u0 = (1 - fw) / 2
  const v0 = (1 - fh) / 2
  const n = [
    dortgenNoktasi(koseler, u0, v0),
    dortgenNoktasi(koseler, u0 + fw, v0),
    dortgenNoktasi(koseler, u0 + fw, v0 + fh),
    dortgenNoktasi(koseler, u0, v0 + fh),
  ]
  return n.some((k) => !k) ? koseler : n
}

/** Köşe listesinin merkezi. */
export function dortgenMerkezi(koseler) {
  const n = koseler.length || 1
  return {
    x: koseler.reduce((t, k) => t + k.x, 0) / n,
    y: koseler.reduce((t, k) => t + k.y, 0) / n,
  }
}
