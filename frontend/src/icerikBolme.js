/**
 * BÖLÜNMÜŞ İÇERİK — tek bir görselin/videonun birkaç ekrana yayılması.
 *
 * Aynı içeriği "Bölünmüş" seçen ekranlar onu paylaşıyor: içerik hepsinin
 * üstüne TEK parça olarak seriliyor, her ekran kendine düşen dilimi
 * gösteriyor. Gerçek bir kurulumda da böyle olur — ekranların arasındaki
 * boşluğa denk gelen kısım kimseye düşmez, yani görünmez.
 *
 * BÖLME NEYE GÖRE YAPILIYOR. İki bilgi birleştiriliyor:
 *   1) Ekranların FOTOĞRAFTAKİ dizilişi (hangisi solda, hangisi üstte),
 *   2) Ekranların GERÇEK cm ölçüsü (200 + 150 + 200 cm'lik üç ekran
 *      görselin ~%36 / %27 / %36'sını alır).
 * Yalnız fotoğraf yetmez: uzaktaki ekran fotoğrafta küçük görünür ama
 * içerikten aldığı pay küçülmemeli. Yalnız cm de yetmez: aralarındaki
 * boşluğun ne kadar olduğunu ancak fotoğraf söyler.
 *
 * ÖLÇEK EKRAN BAŞINA. Her ekranın kendi "cm / piksel" ölçeği, kendi gerçek
 * eninin fotoğraftaki piksel enine bölümünden çıkıyor. Ekranın fotoğraftaki
 * yeri de o ekranın kendi ölçeğiyle cm'ye çevriliyor. Ekranlar aynı
 * derinlikteyse sonuç birebir doğru; farklı derinlikteyse yaklaşık —
 * kullanıcı ekranları istediği duvara koyabildiği için (ürün kararı) bundan
 * iyisi fotoğraftan çıkmıyor.
 *
 * DÖNEN DEĞER her ekran için {sx, sy, sw, sh}: içeriğin O EKRANIN KENDİ
 * ölçüsü cinsinden kaç kat büyük çizileceği (sw, sh) ve sol üst köşesinin
 * kaç ekran boyu geriden başlayacağı (sx, sy). Çizen taraf bunu doğrudan
 * piksele çeviriyor:
 *   genişlik = ekranPx × sw      sol = −ekranPx × sx
 * Bölünmemiş ekranda {0, 0, 1, 1} çıkar, yani eski davranışın aynısı.
 */

/** Dörtgenin sol/sağ kenar ortalarının x'i, üst/alt kenar ortalarının y'si. */
const kenarOrtalari = (k) => ({
  sol: (k[0].x + k[3].x) / 2,
  sag: (k[1].x + k[2].x) / 2,
  ust: (k[0].y + k[1].y) / 2,
  alt: (k[3].y + k[2].y) / 2,
})

/**
 * @param {Array} ekranlar - [{ id, koseler: [{x,y}×4], enCm, boyCm }]
 * @returns {Map<any, {sx:number, sy:number, sw:number, sh:number}>|null}
 */
export function bolmeDilimleri(ekranlar) {
  if (!Array.isArray(ekranlar) || ekranlar.length === 0) return null

  const hazir = []
  for (const e of ekranlar) {
    const k = e?.koseler
    /*
     * ELVERİŞSİZ EKRAN YALNIZCA KENDİSİ DIŞARIDA KALIYOR.
     *
     * Eskiden biri bile elverişsizse hesap tümüyle iptal oluyor ve
     * kümedeki HİÇBİR ekran dilim almıyordu; hepsi görselin tamamını
     * çiziyor, yani paylaşım hiç olmamış gibi görünüyordu.
     */
    if (!Array.isArray(k) || k.length !== 4) continue
    if (k.some((p) => !Number.isFinite(p?.x) || !Number.isFinite(p?.y))) continue
    if (!(e.enCm > 0) || !(e.boyCm > 0)) continue
    const o = kenarOrtalari(k)
    /*
     * KÖŞEDEN DÖNEN KANATTA genişlik negatif çıkıyor (sağ kenar solun
     * soluna düşüyor). Ölçü işaretsiz alınıyor; başnokta iki kenarın
     * soldakinden.
     */
    const pEn = Math.abs(o.sag - o.sol)
    const pBoy = Math.abs(o.alt - o.ust)
    /* Ekran fotoğrafta kenarına dönmüşse (neredeyse çizgi) ölçek patlar. */
    if (!(pEn > 2) || !(pBoy > 2)) continue
    hazir.push({
      id: e.id,
      enCm: e.enCm,
      boyCm: e.boyCm,
      sol: Math.min(o.sol, o.sag),
      ust: Math.min(o.ust, o.alt),
      /* cm / piksel — ekranın kendi derinliğindeki ölçek. */
      olcekX: e.enCm / pEn,
      olcekY: e.boyCm / pBoy,
    })
  }
  /* Paylaşacak en az iki ekran kalmadıysa bölünecek bir şey de yok. */
  if (hazir.length < 2) return null

  /* Ortak çerçevenin başnoktası: en soldaki ve en üstteki kenar. */
  const enSol = Math.min(...hazir.map((e) => e.sol))
  const enUst = Math.min(...hazir.map((e) => e.ust))

  const yerler = hazir.map((e) => ({
    ...e,
    x: (e.sol - enSol) * e.olcekX,
    y: (e.ust - enUst) * e.olcekY,
  }))

  const toplamEn = Math.max(...yerler.map((e) => e.x + e.enCm))
  const toplamBoy = Math.max(...yerler.map((e) => e.y + e.boyCm))
  if (!(toplamEn > 0) || !(toplamBoy > 0)) return null

  const harita = new Map()
  for (const e of yerler) {
    harita.set(e.id, {
      sx: e.x / e.enCm,
      sy: e.y / e.boyCm,
      sw: toplamEn / e.enCm,
      sh: toplamBoy / e.boyCm,
    })
  }
  return harita
}
