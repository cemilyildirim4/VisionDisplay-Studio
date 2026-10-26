/**
 * DUVAR DİBİNDEN YERLEŞİM — kurallar ve geometri.
 *
 * Fotoğrafa yerleştirmenin yeni yolu şu: kullanıcı hiçbir şey hayal
 * etmiyor, GÖRDÜĞÜ çizgileri işaretliyor — duvarların yere değdiği çizgi
 * ve iki duvarın birleştiği köşe. Sistem bu noktalardan duvarların
 * yönünü ve zemini çıkarıp tasarımı kendisi yerleştiriyor.
 *
 * Eski yolda kullanıcı ekranın duracağı DÖRTGENİ işaretliyordu; yani
 * perspektifi kafasında kurup dört köşeyi tahmin etmesi gerekiyordu.
 * Duvar dibi çizgisi ise fotoğrafta zaten görünen bir şey.
 *
 * Bu dosya saf: React yok, tuval yok. Yalnızca "kaç tık gerekiyor",
 * "sırada hangi yönerge var" ve noktalardan çıkan geometri.
 */

/**
 * Tasarımın kaç duvara yaslandığı — tık sayısı buradan çıkıyor.
 *
 * Düz ve kavisli tek duvara yaslanır (2 tık: çizginin iki ucu).
 * L ve açılı bir köşeyi sarar (3 tık: uç, köşe, uç).
 * U iki köşeyi sarar (4 tık: uç, köşe, köşe, uç).
 * Küp hiçbir duvara yaslanmaz, zemine oturur (2 tık: zemindeki düz bir
 * çizginin iki ucu).
 *
 * @param {string|null} grupTipi birleşim tipi: 'duz' | 'l' | 'u' | 'kutu' | 'acili'
 * @param {string|null} ekranTipi tek ekranın türü: 'flat' | 'curved' | 'curvedIn' | 'lshape'
 * @returns {{tik: number, zemin: boolean}} gereken tık sayısı ve zemin kipinde mi
 */
export function duvarPlani(grupTipi, ekranTipi) {
  if (grupTipi === 'kutu') return { tik: 2, zemin: true }
  if (grupTipi === 'u') return { tik: 4, zemin: false }
  if (grupTipi === 'l' || grupTipi === 'acili') return { tik: 3, zemin: false }
  if (!grupTipi && ekranTipi === 'lshape') return { tik: 3, zemin: false }
  /* 'duz' birleşim ve tek düz/kavisli ekran: tek duvar. */
  return { tik: 2, zemin: false }
}

/**
 * Sıradaki yönergenin i18n anahtarı.
 *
 * Her tıkta bir sonraki söyleniyor; hepsi konunca bitiş metni dönüyor.
 * Metinler i18n'de (bkz. 'dyer.*'), burada yalnızca hangisinin sırada
 * olduğu kararı var.
 *
 * @param {{tik: number, zemin: boolean}} plan
 * @param {number} konan şu ana kadar konan nokta sayısı
 * @returns {string} i18n anahtarı
 */
export function duvarYonergesi(plan, konan) {
  if (konan >= plan.tik) return 'dyer.bitti'
  if (plan.zemin) return konan === 0 ? 'dyer.zemin1' : 'dyer.zemin2'
  if (plan.tik === 2) return konan === 0 ? 'dyer.duvar1' : 'dyer.duvar2'
  if (plan.tik === 3) return ['dyer.l1', 'dyer.l2', 'dyer.l3'][konan]
  return ['dyer.u1', 'dyer.u2', 'dyer.u3', 'dyer.u4'][konan]
}

/* ── Geometri ─────────────────────────────────────────────────────────── */

const fark = (a, b) => ({ x: b.x - a.x, y: b.y - a.y })
const uzunluk = (v) => Math.hypot(v.x, v.y)

/**
 * İşaretlenen noktalardan DUVAR PARÇALARI.
 *
 * Noktalar sırayla konuyor ve ardışık her ikisi bir duvarın dibini
 * veriyor: 2 nokta → 1 duvar, 3 nokta → 2 duvar, 4 nokta → 3 duvar.
 * Ortadaki noktalar iki duvarın ORTAK köşesi.
 *
 * @param {Array<{x:number,y:number}>} noktalar tuval pikselinde
 * @returns {Array<{a:{x,y}, b:{x,y}, uzunlukPx:number}>}
 */
export function duvarParcalari(noktalar) {
  if (!Array.isArray(noktalar) || noktalar.length < 2) return []
  const parcalar = []
  for (let i = 0; i < noktalar.length - 1; i++) {
    const a = noktalar[i]
    const b = noktalar[i + 1]
    if (!a || !b) continue
    const u = uzunluk(fark(a, b))
    if (!(u > 1)) continue
    parcalar.push({ a, b, uzunlukPx: u })
  }
  return parcalar
}

/**
 * ZEMİN ÇİZGİLERİNİN UFKU.
 *
 * İki zemin çizgisi gerçekte PARALEL değil, ama ikisi de zemin
 * düzleminde. Görüntüde uzayan doğruları bir noktada kesişir ve o nokta
 * ufuk çizgisinin üstündedir. İki farklı yöndeki duvar dibi, ufku veren
 * iki kaçış noktası demek — perspektif buradan çıkıyor.
 *
 * Tek duvar işaretlendiyse (2 nokta) ikinci bir yön yok; o zaman duvarın
 * karşıdan görüldüğü varsayılıyor ve ufuk yok sayılıyor (null döner).
 *
 * @returns {{x:number,y:number}|null} kesişim (tuval pikseli)
 */
export function kacisNoktasi(p1, p2, p3, p4) {
  if (!p1 || !p2 || !p3 || !p4) return null
  const d1 = fark(p1, p2)
  const d2 = fark(p3, p4)
  const payda = d1.x * d2.y - d1.y * d2.x
  /* Paralel ya da paralele çok yakın: kesişim yok sayılıyor. */
  if (Math.abs(payda) < 1e-6) return null
  const t = ((p3.x - p1.x) * d2.y - (p3.y - p1.y) * d2.x) / payda
  const k = { x: p1.x + d1.x * t, y: p1.y + d1.y * t }
  if (!Number.isFinite(k.x) || !Number.isFinite(k.y)) return null
  return k
}

/**
 * BİR DUVARIN ÜSTÜNDE DURAN DİKDÖRTGENİN DÖRT KÖŞESİ.
 *
 * Alt kenar duvar dibinde; üst kenar oradan YUKARI, ekranın gerçek
 * boyu kadar. Perspektifte yukarının piksel karşılığı duvarın her
 * ucunda farklı: uzak uç küçülür. Oran, ucun ufka uzaklığından çıkıyor —
 * ufuk bilinmiyorsa iki uç da aynı ölçekte (duvar karşıdan görülüyor).
 *
 * @param {{x,y}} a duvar dibinin bir ucu
 * @param {{x,y}} b öteki ucu
 * @param {number} boyPx ekranın yüksekliği, REFERANSIN ölçüldüğü yerdeki piksel
 * @param {number|null} ufukY ufuk çizgisinin y'si (tuval pikseli)
 * @param {number|null} refY referansın ölçüldüğü yerin y'si (tuval pikseli)
 * @param {number} sol 0..1 — ekranın duvar üstünde nereden başladığı
 * @param {number} sag 0..1 — nerede bittiği
 * @returns {Array<{x,y}>|null} [solÜst, sağÜst, sağAlt, solAlt]
 */
export function duvardaDortgen(a, b, boyPx, ufukY, refY = null, sol = 0, sag = 1) {
  if (!a || !b || !(boyPx > 0)) return null
  const at = { x: a.x + (b.x - a.x) * sol, y: a.y + (b.y - a.y) * sol }
  const bt = { x: a.x + (b.x - a.x) * sag, y: a.y + (b.y - a.y) * sag }
  /*
   * ÖLÇEK MUTLAK — DUVARDAN DUVARA DEĞİŞMİYOR.
   *
   * Zemindeki bir noktanın ufka olan dikey uzaklığı, o noktanın
   * kameraya uzaklığıyla ters orantılı: (y - ufuk) ne kadar büyükse
   * nokta o kadar yakın ve orada bir metre o kadar çok piksel tutuyor.
   *
   * Dayanak REFERANSIN ölçüldüğü yer. Bir ara her duvar kendi iki
   * ucunun ORTALAMASINA bölünüyordu; iki duvar aynı köşede buluşsa bile
   * ortalamaları farklı olduğu için aynı fiziksel nokta iki yüzde iki
   * ayrı yükseklik veriyor ve görsel tam köşede kayıyordu.
   */
  const dayanak = Number.isFinite(ufukY) && Number.isFinite(refY) ? refY - ufukY : null
  const olcek = (p) => {
    if (!(dayanak > 1)) return 1
    const d = p.y - ufukY
    if (!(d > 1)) return 1
    return d / dayanak
  }
  const oranA = olcek(at)
  const oranB = olcek(bt)
  const solUst = { x: at.x, y: at.y - boyPx * oranA }
  const sagUst = { x: bt.x, y: bt.y - boyPx * oranB }
  if (![solUst, sagUst].every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) return null
  return [solUst, sagUst, { x: bt.x, y: bt.y }, { x: at.x, y: at.y }]
}
