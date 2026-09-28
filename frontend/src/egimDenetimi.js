/**
 * EĞİM DENETİMİ — çizilen karenin eğimi, fotoğrafın söylediğiyle uyuşuyor mu?
 *
 * Eğim uzun bir zincirin sonunda ortaya çıkıyor: düzlem uydurma, kaçış
 * noktası, kenarlara oturtma, ölçüye indirme. Zincirin her halkası kendi
 * içinde denetleniyor ama SONUÇ hiç denetlenmiyordu; halkalardan biri yönü
 * ters çevirdiğinde kullanıcı duvara ters yatmış bir ekran görüyordu.
 *
 * Buradaki denetim zincirin en sonunda, çizilecek karenin kendi üzerinde
 * yapılıyor ve tek bir fiziksel gerçeğe dayanıyor:
 *
 *   YAKIN OLAN YAN BÜYÜK GÖRÜNÜR.
 *
 * Yani karenin sol kenarı sağ kenarından uzunsa, sol yan kameraya daha
 * yakın olmalı. Derinlik haritası bunun tersini söylüyorsa eğim yanlıştır.
 *
 * YANLIŞ EĞİM YERİNE DÜZ KARE: ters eğim, kullanıcıya duvarda olmayan bir
 * açı vaat etmek demek — düz bir kare en azından dürüst. Ölçü ve merkez
 * değişmiyor, yalnızca yamukluk bırakılıyor.
 */

/** Dörtgenin sol ve sağ kenar uzunlukları (oranlı koordinatta, en-boy düzeltmeli). */
function yanUzunluklar(koseler, enBoy) {
  const d = (a, b) =>
    Math.hypot((koseler[b].x - koseler[a].x) * enBoy, koseler[b].y - koseler[a].y)
  return { sol: d(0, 3), sag: d(1, 2) }
}

/**
 * Karenin sol ve sağ üçte birinde ham ters derinlik ortalaması.
 *
 * Ters derinlik: BÜYÜK değer YAKIN demek. Düzlem uydurmasından bağımsız,
 * doğrudan modelin çıktısı okunuyor — zincirdeki hiçbir ara adıma
 * güvenilmiyor.
 */
function yanDerinlikler(koseler, derinlik) {
  const { w: W, h: H, veri } = derinlik
  if (!veri || !W || !H) return null
  const xs = koseler.map((k) => k.x)
  const ys = koseler.map((k) => k.y)
  const x0 = Math.max(0, Math.floor(Math.min(...xs) * W))
  const x1 = Math.min(W - 1, Math.ceil(Math.max(...xs) * W))
  const y0 = Math.max(0, Math.floor(Math.min(...ys) * H))
  const y1 = Math.min(H - 1, Math.ceil(Math.max(...ys) * H))
  if (x1 - x0 < 6 || y1 - y0 < 4) return null
  const ucte = (x1 - x0) / 3
  let solT = 0
  let solN = 0
  let sagT = 0
  let sagN = 0
  let enKucuk = Infinity
  let enBuyuk = -Infinity
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const v = veri[y * W + x]
      if (!Number.isFinite(v)) continue
      if (v < enKucuk) enKucuk = v
      if (v > enBuyuk) enBuyuk = v
      if (x <= x0 + ucte) {
        solT += v
        solN++
      } else if (x >= x1 - ucte) {
        sagT += v
        sagN++
      }
    }
  }
  if (solN < 12 || sagN < 12 || !Number.isFinite(enKucuk)) return null
  return {
    sol: solT / solN,
    sag: sagT / sagN,
    /* Karenin kendi içindeki derinlik aralığı: gürültü eşiği buna göre. */
    yayilim: Math.max(1e-6, enBuyuk - enKucuk),
  }
}

/**
 * Aynı merkez ve aynı ortalama ölçüde, yamukluğu olmayan kare.
 *
 * Dışarı da veriliyor: sistem artık kendiliğinden eğim vermiyor, bütün
 * kareler bu işlevden geçip düz çiziliyor (bkz. adayYuzeyler.js).
 */
export function duzlestir(koseler) {
  const cx = koseler.reduce((t, k) => t + k.x, 0) / 4
  const cy = koseler.reduce((t, k) => t + k.y, 0) / 4
  const enOrt =
    (Math.abs(koseler[1].x - koseler[0].x) + Math.abs(koseler[2].x - koseler[3].x)) / 2
  const boyOrt =
    (Math.abs(koseler[3].y - koseler[0].y) + Math.abs(koseler[2].y - koseler[1].y)) / 2
  const yw = enOrt / 2
  const yh = boyOrt / 2
  return [
    { x: cx - yw, y: cy - yh },
    { x: cx + yw, y: cy - yh },
    { x: cx + yw, y: cy + yh },
    { x: cx - yw, y: cy + yh },
  ]
}

/**
 * Karenin eğimini derinlikle karşılaştırır; çelişki varsa düzleştirir.
 *
 * @param {Array<{x:number,y:number}>} koseler  0–1 oranlı dört köşe
 * @param {{w:number,h:number,veri:Float32Array}|null} derinlik
 * @param {number} enBoy  fotoğrafın en/boy oranı (kenar ölçümünü düzeltmek için)
 * @returns {Array<{x:number,y:number}>} aynı kare ya da düzleştirilmiş hâli
 */
export function egimiDenetle(koseler, derinlik, enBoy = 1) {
  if (!Array.isArray(koseler) || koseler.length !== 4) return koseler
  if (!derinlik?.veri) return koseler

  const { sol, sag } = yanUzunluklar(koseler, enBoy)
  const ortalama = (sol + sag) / 2
  if (!(ortalama > 0)) return koseler
  const yamukluk = (sol - sag) / ortalama
  /* %3'ün altındaki fark zaten göze görünmüyor; denetime gerek yok. */
  if (Math.abs(yamukluk) < 0.03) return koseler

  const d = yanDerinlikler(koseler, derinlik)
  if (!d) return koseler
  const fark = d.sol - d.sag
  /*
   * Derinlik farkı kendi gürültüsünün altındaysa hangi yanın yakın olduğu
   * bilinmiyor demektir; böyle bir ölçümle eğimi bozmak da düzeltmek de
   * yanlış olur, kare olduğu gibi bırakılıyor.
   */
  if (Math.abs(fark) < d.yayilim * 0.05) return koseler

  /* Yakın yan (ters derinliği büyük olan) uzun kenara sahip olmalı. */
  const solYakin = fark > 0
  const solUzun = yamukluk > 0
  return solYakin === solUzun ? koseler : duzlestir(koseler)
}
