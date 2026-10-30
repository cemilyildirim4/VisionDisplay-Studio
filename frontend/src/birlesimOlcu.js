/**
 * BİRLEŞİK GRUBUN DUVARDA KAPLADIĞI ALAN.
 *
 * Ekran enleri yan yana diziliyormuş gibi toplanıyordu: 6 ekranlı bir küp
 * duvarda 4,69 m yer kaplıyor sanılıyor, duvar kendiliğinden o ölçüye
 * büyüyor ve yanlarda ekran olmadığı hâlde boşluk kalıyordu.
 *
 * Birleşimde ekranların bir kısmı DERİNLİĞE gidiyor. Duvarda kapladıkları
 * yer, önden bakıldığındaki izdüşümleri:
 *   Küp   — kutunun duruş açısındaki önden genişliği,
 *   U     — arka ekranın eni (kanatlar derinliğe gider),
 *   L/açılı — zincirin X eksenindeki yayılımı (açının kosinüsü).
 *
 * Yükseklik her zaman en uzun parçanın boyu.
 */

/* Kup2D kutuyu bu açıyla duruyor; önden genişlik buradan çıkıyor. */
export const KUP_DURUS_ACISI = -28

const enOf = (p) => Number(p?.gercekWm ?? p?.wm) || 0
const boyOf = (p) => Number(p?.hm) || 0

export function birlesimKapladigi(parcalar, kup = false) {
  const p = (Array.isArray(parcalar) ? parcalar : []).filter((x) => enOf(x) > 0 && boyOf(x) > 0)
  if (p.length < 2) return null

  if (kup) {
    /*
     * Küpün dört yan yüzü kutuyu kuruyor; beşinci ekran üst yüz, öne
     * genişlik katmıyor. Kutunun eni ve derinliği karşılıklı yüzlerden
     * (bkz. Kup2D) — aynı kural iki yerde ayrışmasın diye birebir aynı.
     */
    const yan = p.slice(0, 4)
    const en = Math.max(enOf(yan[0]), enOf(yan[2]) || 0)
    const derinlik = Math.max(enOf(yan[1]) || 0, enOf(yan[3]) || 0) || en
    const a = (Math.abs(KUP_DURUS_ACISI) * Math.PI) / 180
    return {
      enM: en * Math.cos(a) + derinlik * Math.sin(a),
      boyM: Math.max(...yan.map(boyOf)),
      /* Küpte yüzler yan yana değil: parça parça ölçü çizgisi yok. */
      yerler: null,
    }
  }

  /*
   * Zincir üstten bakışta kırık bir çizgi: X'teki yayılımı ölçülüyor.
   * 'yerler' her parçanın bu yayılım içindeki yeri (metre) — ölçü
   * etiketleri ve kılavuz çizgileri oraya konuyor.
   */
  let x = 0
  let enAz = 0
  let enCok = 0
  const ham = []
  for (const s of p) {
    const dx = Math.cos(Number.isFinite(s.yon) ? s.yon : 0) * enOf(s)
    ham.push([Math.min(x, x + dx), Math.max(x, x + dx)])
    x += dx
    if (x < enAz) enAz = x
    if (x > enCok) enCok = x
  }
  return {
    enM: Math.max(0.01, enCok - enAz),
    boyM: Math.max(...p.map(boyOf)),
    yerler: ham.map(([a, b]) => ({ x0: a - enAz, x1: b - enAz })),
  }
}
