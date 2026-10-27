/**
 * EĞİM — tasarımın dikey ekseni etrafında dönmesi.
 *
 * Bilgisayarda sağ tıkla sürüklenince tasarım duvara yandan bakılıyormuş
 * gibi dönüyor. Telefonda bu jest yok (sağ tık yok); orada iki parmakla
 * çevirme aynı değeri veriyor.
 *
 * İKİ ÇİZİM, TEK FORMÜL. Canlı önizleme tarayıcının kendi perspektifini
 * kullanıyor; çekilen kare ise tuvale çiziliyor ve orada CSS yok. İkisi
 * ayrı formülle yazılsaydı çekilen kare ekranda görünenden farklı çıkardı —
 * oysa kullanıcı tam olarak gördüğü kareyi bekliyor.
 */

/** Perspektif uzaklığı: CSS'teki değerle tuvaldeki hesap aynı olmak zorunda. */
export const EGIM_UZAKLIK = 1400

/** Eğim sınırı: 60°'den sonra yüzey çizgiye iniyor ve tasarım okunmuyor. */
export const EN_COK_EGIM = 60

export const egimKis = (d) => Math.max(-EN_COK_EGIM, Math.min(EN_COK_EGIM, d))

/** Canlı önizlemenin CSS dönüşümü. */
export const egimDonusumu = (derece, P = EGIM_UZAKLIK) =>
  `perspective(${P}px) rotateY(${derece}deg)`

/**
 * Aynı eğimi tuvale uygular.
 *
 * html2canvas 3B dönüşümü düzleştiriyor: rotateY yalnızca yatay bir
 * daralmaya iniyor, yakın kenarın büyümesi kayboluyordu. Burada kaynak
 * dikey dilimlere ayrılıp her dilim kendi perspektif katsayısıyla
 * çiziliyor; sağa çekilince sağ kenar uzaklaşıyor, sola çekilince sol.
 *
 * @param {CanvasRenderingContext2D} g  hedef bağlam
 * @param {CanvasImageSource} kaynak    çizilecek görüntü (tuval/resim)
 * @param {number} sol, ust, w, h       eğimsiz hâlinin hedefteki kutusu
 * @param {number} derece               eğim
 */
export function egimliCiz(g, kaynak, sol, ust, w, h, derece, P = EGIM_UZAKLIK) {
  const d = egimKis(derece || 0)
  if (!(w > 0) || !(h > 0)) return
  if (Math.abs(d) < 0.2) {
    g.drawImage(kaynak, sol, ust, w, h)
    return
  }
  const kw = kaynak.width || kaynak.naturalWidth || w
  const kh = kaynak.height || kaynak.naturalHeight || h
  if (!(kw > 0) || !(kh > 0)) return

  const r = (d * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  const mx = sol + w / 2
  const my = ust + h / 2
  /* Yerel x (merkeze göre) → perspektif katsayısı ve ekrandaki yeri. */
  const kat = (x) => {
    const payda = P + x * sin
    return payda > 1 ? P / payda : 0
  }
  const ekranX = (x) => mx + x * cos * kat(x)

  /* Uzaktaki dilimler önce: yakın olanlar onların üstüne biniyor. */
  const DILIM = 2
  const sayi = Math.max(2, Math.ceil(kw / DILIM))
  const sira = []
  for (let i = 0; i < sayi; i++) sira.push(i)
  if (sin > 0) sira.reverse()

  for (const i of sira) {
    const u0 = i / sayi
    const u1 = (i + 1) / sayi
    const x0 = (u0 - 0.5) * w
    const x1 = (u1 - 0.5) * w
    const k0 = kat(x0)
    const k1 = kat(x1)
    if (!(k0 > 0) || !(k1 > 0)) continue
    const e0 = ekranX(x0)
    const e1 = ekranX(x1)
    const genislik = e1 - e0
    if (!(Math.abs(genislik) > 0.01)) continue
    const k = (k0 + k1) / 2
    const yukseklik = h * k
    /* Dilimler arasında saç teli boşluk kalmasın: yarım piksel bindirme. */
    const pay = genislik > 0 ? 0.5 : -0.5
    g.drawImage(
      kaynak,
      u0 * kw,
      0,
      Math.max(0.5, (u1 - u0) * kw),
      kh,
      e0,
      my - yukseklik / 2,
      genislik + pay,
      yukseklik,
    )
  }
}

/**
 * Fareli cihaz mı?
 *
 * Eğim ve ipucu yalnızca burada var: dokunmatikte sağ tık yok, ipucu da
 * yapılamayacak bir şeyi anlatmış olurdu.
 */
export const FARE_VAR =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: fine)').matches
