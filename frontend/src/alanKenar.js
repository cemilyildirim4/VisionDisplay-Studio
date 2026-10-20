/**
 * ALANI KENARLARINDAN KURMAK.
 *
 * Köşelere sırayla tıklamak iki sebeple zordu: sıra hatası dörtgeni
 * bozuyordu ve çoğu fotoğrafta köşenin kendisi görünmüyor — kadrajın
 * dışında kalıyor, bir eşyanın arkasında kalıyor ya da duvar orada
 * bitmiyor. Oysa KENARLAR neredeyse her zaman görünüyor.
 *
 * Yeni giriş: kullanıcı dört kenarın her biri için birer çizgi çekiyor
 * (kenarın göründüğü yerin iki ucuna tıklıyor). Çizgiler sonsuza uzatılıp
 * kesiştiriliyor; köşeler bu kesişimler. Köşe fotoğrafın dışında kalsa da
 * sonuç doğru çıkıyor.
 *
 * SIRA SERBEST. Hangi çizginin hangi kenar olduğu sorulmuyor: dört çizgiyi
 * ikişerli ayırmanın yalnızca üç yolu var ((12|34), (13|24), (14|23)).
 * Doğru ayrımı seçen ölçüt şu: kullanıcı çizgiyi KENARIN ÜSTÜNE çiziyor,
 * dolayısıyla doğru ayrımda her çizginin çizilen parçası, o çizginin iki
 * kesişimi ARASINDA kalır. Yanlış ayrımda karşılıklı sanılan iki kenar
 * neredeyse paralel olduğu için kesişim çok uzağa düşüyor ve çizilen parça
 * kenarın binde birine denk geliyor.
 *
 * İki ölçüt denenip bırakıldı:
 *   • Açıya göre sınıflandırma (en yataylar üst/alt): kuvvetli perspektifte
 *     "üst" kenar "sol" kenardan daha dik görünebiliyor.
 *   • En büyük alan: yanlış ayrım, neredeyse paralel iki çizgiden kocaman
 *     ama anlamsız bir dörtgen üretiyor ve yarışı o kazanıyordu.
 */

/** İki sonsuz doğrunun kesişimi; paralel ya da çakışıksa null. */
export function dogruKesisimi(a1, a2, b1, b2) {
  const x1 = a1.x
  const y1 = a1.y
  const x2 = a2.x
  const y2 = a2.y
  const x3 = b1.x
  const y3 = b1.y
  const x4 = b2.x
  const y4 = b2.y
  const payda = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  /*
   * Eşik mutlak değil, çizgilerin uzunluğuna göre: iki uzun çizgi arasında
   * 1e-6'lık bir payda hâlâ anlamlı bir kesişim verir, iki kısa çizgi
   * arasında ise gürültüdür.
   */
  const olcek = Math.hypot(x1 - x2, y1 - y2) * Math.hypot(x3 - x4, y3 - y4)
  if (!(Math.abs(payda) > Math.max(1e-9, olcek * 1e-6))) return null
  const a = x1 * y2 - y1 * x2
  const b = x3 * y4 - y3 * x4
  return {
    x: (a * (x3 - x4) - (x1 - x2) * b) / payda,
    y: (a * (y3 - y4) - (y1 - y2) * b) / payda,
  }
}

/** Dörtgenin işaretli alanı (sıralama yönünü de söyler). */
const isaretliAlan = (k) => {
  let t = 0
  for (let i = 0; i < 4; i++) {
    const p = k[i]
    const q = k[(i + 1) % 4]
    t += p.x * q.y - q.x * p.y
  }
  return t / 2
}

/** Dört köşeyi ağırlık merkezine göre saat yönünde sıralar. */
export function koseleriSirala(k) {
  const cx = (k[0].x + k[1].x + k[2].x + k[3].x) / 4
  const cy = (k[0].y + k[1].y + k[2].y + k[3].y) / 4
  return [...k].sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx))
}

/** Dörtgen gerçekten dörtgen mi: dışbükey ve hiçbir kenarı ezilmemiş. */
function gecerliDortgen(k) {
  if (k.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return false
  /* Bütün çapraz çarpımların işareti aynıysa dışbükey. */
  let artiVar = false
  let eksiVar = false
  for (let i = 0; i < 4; i++) {
    const a = k[i]
    const b = k[(i + 1) % 4]
    const c = k[(i + 2) % 4]
    const z = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (z > 0) artiVar = true
    if (z < 0) eksiVar = true
  }
  if (artiVar && eksiVar) return false
  /* En kısa kenar, en uzunun yüzde birinden kısaysa şekil bir şeride ezilmiş. */
  const kenarlar = []
  for (let i = 0; i < 4; i++) {
    const a = k[i]
    const b = k[(i + 1) % 4]
    kenarlar.push(Math.hypot(b.x - a.x, b.y - a.y))
  }
  return Math.min(...kenarlar) >= Math.max(...kenarlar) * 0.01
}

/* Dört çizgiyi ikişerli ayırmanın üç yolu: karşılıklı kenar çiftleri. */
const AYRIMLAR = [
  [[0, 1], [2, 3]],
  [[0, 2], [1, 3]],
  [[0, 3], [1, 2]],
]

/**
 * Dört kenar çizgisinden alanın dört köşesini kurar.
 *
 * @param {Array} cizgiler dört çizgi; her biri [{x,y}, {x,y}]
 * @returns {Array|null} saat yönünde sıralı dört köşe, ya da null
 */
export function kenarlardanKoseler(cizgiler) {
  if (!Array.isArray(cizgiler) || cizgiler.length !== 4) return null
  for (const c of cizgiler) {
    if (!Array.isArray(c) || c.length !== 2) return null
    for (const p of c) {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null
    }
    /* Sıfır uzunluktaki çizginin yönü yok. */
    if (!(Math.hypot(c[1].x - c[0].x, c[1].y - c[0].y) > 1e-6)) return null
  }

  /*
   * Çizilen parça, kendi iki kesişimi arasında ne kadarlık bir yer
   * kaplıyor (0..1). Doğru ayrımda belirgin bir pay, yanlış ayrımda
   * neredeyse sıfır.
   */
  const ortusme = (cizgi, A, B) => {
    const dx = B.x - A.x
    const dy = B.y - A.y
    const kare = dx * dx + dy * dy
    if (!(kare > 1e-12)) return 0
    const t = (p) => ((p.x - A.x) * dx + (p.y - A.y) * dy) / kare
    const t1 = t(cizgi[0])
    const t2 = t(cizgi[1])
    const bas = Math.max(0, Math.min(t1, t2))
    const son = Math.min(1, Math.max(t1, t2))
    return Math.max(0, son - bas)
  }

  let enIyi = null
  for (const [[a, b], [c, d]] of AYRIMLAR) {
    /* (a,b) bir çift karşılıklı kenar, (c,d) öteki çift. */
    const ac = dogruKesisimi(cizgiler[a][0], cizgiler[a][1], cizgiler[c][0], cizgiler[c][1])
    const ad = dogruKesisimi(cizgiler[a][0], cizgiler[a][1], cizgiler[d][0], cizgiler[d][1])
    const bd = dogruKesisimi(cizgiler[b][0], cizgiler[b][1], cizgiler[d][0], cizgiler[d][1])
    const bc = dogruKesisimi(cizgiler[b][0], cizgiler[b][1], cizgiler[c][0], cizgiler[c][1])
    if (!ac || !ad || !bd || !bc) continue
    const sirali = koseleriSirala([ac, ad, bd, bc])
    if (!gecerliDortgen(sirali)) continue
    /* Her çizginin kendi kenarına oturma payı; en kötüsü belirleyici. */
    const paylar = [
      ortusme(cizgiler[a], ac, ad),
      ortusme(cizgiler[b], bc, bd),
      ortusme(cizgiler[c], ac, bc),
      ortusme(cizgiler[d], ad, bd),
    ]
    const enKotu = Math.min(...paylar)
    const toplam = paylar.reduce((t, x) => t + x, 0)
    if (!enIyi || enKotu > enIyi.enKotu + 1e-9 || (Math.abs(enKotu - enIyi.enKotu) < 1e-9 && toplam > enIyi.toplam)) {
      enIyi = { koseler: sirali, enKotu, toplam }
    }
  }
  return enIyi ? enIyi.koseler : null
}

/**
 * Çizginin iki yöne uzatılmış hâli — kesikli uzantıyı çizmek için.
 * Uzatma, verilen dikdörtgenin (tuvalin) köşegeni kadar; her durumda
 * kadrajı aşıyor, dolayısıyla kullanıcı kesişimin nereye düşeceğini
 * çizgiyi henüz tamamlamadan görüyor.
 */
export function cizgiyiUzat(p, q, genislik, yukseklik) {
  const dx = q.x - p.x
  const dy = q.y - p.y
  const u = Math.hypot(dx, dy)
  if (!(u > 1e-6)) return null
  const k = Math.hypot(genislik || 0, yukseklik || 0) || 1000
  const bx = (dx / u) * k
  const by = (dy / u) * k
  return [
    { x: p.x - bx, y: p.y - by },
    { x: q.x + bx, y: q.y + by },
  ]
}
