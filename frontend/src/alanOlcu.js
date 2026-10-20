/**
 * İŞARETLENEN DÖRTGENİN GERÇEK ÖLÇÜSÜ — EĞİMİ HESABA KATARAK.
 *
 * Alanın eni ve boyu önce tek bir ölçekle (px/cm) hesaplanıyordu: kenarların
 * piksel uzunluğu o ölçeğe bölünüyordu. Fotoğraf tam karşıdan çekilmemişse
 * bu yanlış. Referans yatayda alınmışsa yatay doğru çıkıyor ama DİKEY kenar
 * uzaklaşan bir yüzeyde durduğu için santim başına daha az piksel ediyor ve
 * yükseklik olduğundan KISA ölçülüyor. Ölçüldü: 196 cm'lik bir kapı 168-184
 * cm sanılıyor, 12 satır yerine 11 kuruluyordu.
 *
 * Oysa kullanıcının işaretlediği dörtgen bu bilgiyi zaten taşıyor: bir
 * dikdörtgenin eğik görüntüsü, o düzlemin perspektifinin kendisi.
 *
 * YÖNTEM.
 * 1) Karşılıklı kenar çiftleri uzatılıp iki KAÇIŞ NOKTASI bulunuyor: Vy
 *    (yatay doğrultu) ve Vd (dikey doğrultu).
 * 2) Dikdörtgenin iki doğrultusu birbirine dik olduğu için odak uzunluğu
 *    buradan çıkıyor:  f² = −(Vy−P)·(Vd−P),  P = asal nokta (kadrajın ortası).
 *    Bu, iğnedelik kamerada kesin bir bağıntı; yaklaşım değil.
 * 3) f elde edilince her köşe, kameradan çıkan bir ışına çevriliyor ve
 *    dörtgenin kendi DÜZLEMİNE geri iz düşürülüyor. Orada şekil artık
 *    gerçek dikdörtgen: kenar uzunlukları doğru oranda.
 * 4) Mutlak ölçek referanstan: referansın iki ucu da aynı düzleme iz
 *    düşürülüp aradaki uzunluğun yazılan santime eşitlenmesi yetiyor.
 *
 * TEK KAÇIŞ NOKTASI VARSA DA ÇALIŞIYOR. Kamera düz tutulmuşsa (yalnızca
 * sağa-sola dönük) dikey kenarlar paralel kalır ve o yönün kaçış noktası
 * sonsuza gider; f artık ikisinden türetilemez. Bu AZ RASTLANAN değil, en
 * sık durum — ölçüldü: öyle bir karede eski hesap yüksekliği %15 şaşırıyor.
 * Böyle durumda odak dışarıdan TAHMİN olarak alınıyor (kadrajın genişliğine
 * göre ~65 derece görüş açısı) ve paralel kenarların yönü, görüntü düzlemine
 * paralel bir doğrultu olarak kullanılıyor. Sonuç tahmini odağa bağlı ama
 * perspektifi hiç saymamaktan çok daha yakın.
 *
 * NE ZAMAN ÇALIŞMAZ. Yüzey tam karşıdan görünüyorsa iki kenar çifti de
 * paraleldir; orada perspektif de yoktur, yani tek ölçekli eski hesap zaten
 * DOĞRUdur. O durumda null dönüyor ve çağıran taraf ona düşüyor. f² negatif
 * çıkarsa (işaretleme bozuk, köşeler bir dikdörtgenin görüntüsü değil) yine
 * null: kötü bir ölçüm, ölçüm olmamasından kötüdür.
 */

/*
 * İki doğrunun kesişimi; paralelse null.
 *
 * Dışarı açık: görünmeyen bir köşeyi KENARLARINDAN bulmak da aynı hesap
 * (bkz. App.jsx kenarKesisim). İki kez yazılmasın.
 */
export function kesisim(p1, p2, p3, p4) {
  const a1 = p2.x - p1.x
  const b1 = p2.y - p1.y
  const a2 = p4.x - p3.x
  const b2 = p4.y - p3.y
  const det = a1 * b2 - b1 * a2
  /* Neredeyse paralel: kaçış noktası sonsuzda sayılıyor. */
  const olcek = Math.hypot(a1, b1) * Math.hypot(a2, b2)
  if (!(Math.abs(det) > 1e-6 * Math.max(1, olcek))) return null
  const t = ((p3.x - p1.x) * b2 - (p3.y - p1.y) * a2) / det
  if (!Number.isFinite(t)) return null
  return { x: p1.x + a1 * t, y: p1.y + b1 * t }
}

const cikar = (a, b) => ({ x: a.x - b.x, y: a.y - b.y })
const nokta = (a, b) => a.x * b.x + a.y * b.y
const capraz = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})
const nokta3 = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z

/**
 * Verilen ODAK için dörtgenin düzlemini kurar ve o düzlemde ölçen bir
 * fonksiyon döndürür.
 *
 * Ayrı duruyor çünkü iki yerden kullanılıyor: ölçümün kendisi ve odak
 * çözücüsü (bkz. odakIkiReferanstan). İkisinin aynı geometriyi iki kez
 * yazması, birinde yapılan düzeltmenin ötekine geçmemesi demekti.
 */
function duzlemOlcer(koseler, asal, f) {
  if (!(f > 1)) return null
  const [p0, p1, p2, p3] = koseler
  const Vy = kesisim(p0, p1, p3, p2)
  const Vd = kesisim(p0, p3, p1, p2)
  const isin = (p) => ({ x: (p.x - asal.x) / f, y: (p.y - asal.y) / f, z: 1 })
  const yon2B = (a, b) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const uz = Math.hypot(dx, dy)
    return uz > 1e-9 ? { x: dx / uz, y: dy / uz, z: 0 } : null
  }
  const dYatay = Vy ? isin(Vy) : yon2B(p0, p1)
  const dDikey = Vd ? isin(Vd) : yon2B(p0, p3)
  if (!dYatay || !dDikey) return null
  const n = capraz(dYatay, dDikey)
  if (!(Math.abs(n.x) + Math.abs(n.y) + Math.abs(n.z) > 1e-12)) return null
  const r0 = isin(p0)
  const d0 = nokta3(n, r0)
  if (!(Math.abs(d0) > 1e-12)) return null
  const duzleme = (p) => {
    const r = isin(p)
    const pay = nokta3(n, r)
    if (!(Math.abs(pay) > 1e-12)) return null
    const s = d0 / pay
    return { x: r.x * s, y: r.y * s, z: r.z * s }
  }
  const uzunluk = (a, b) => {
    const A = duzleme(a)
    const B = duzleme(b)
    return A && B ? Math.hypot(A.x - B.x, A.y - B.y, A.z - B.z) : null
  }
  return { uzunluk, kose: [p0, p1, p2, p3] }
}

/**
 * KÖŞE ÇEKİLİNCE DÖRTGEN GERÇEK BİR DİKDÖRTGEN KALIYOR.
 *
 * Düzenlemede tek bir köşe serbestçe oynatılabiliyordu. O anda dörtgen
 * artık bir dikdörtgenin perspektif görüntüsü olmaktan çıkıyor: kaçış
 * noktaları saçmalıyor, perspektif hesabı çöküyor ve ölçü anlamsız bir
 * yere atlıyor (ölçüldü: 314 × 152 cm olan alan tek köşe 60 px çekilince
 * 131 × 107 cm'e düşüyor, ekran duvarın dışına taşıyordu).
 *
 * Oysa duvarın DÜZLEMİ alan ilk işaretlendiğinde belli oluyor ve sonradan
 * değişmiyor. Köşe çekilince yapılması gereken, o düzlem üzerinde yeni bir
 * DİKDÖRTGEN kurmak:
 *   1) Dört köşe düzleme geri iz düşürülüyor.
 *   2) Çekilen köşenin KARŞISINDAKİ köşe çıpa olarak sabit kalıyor.
 *   3) Çekilen köşenin yeni yeri de düzleme düşürülüp, çıpadan olan farkı
 *      dikdörtgenin iki kenar yönüne ayrıştırılıyor (en ve boy).
 *   4) Dört köşe bu en/boy ile yeniden kurulup görüntüye iz düşürülüyor.
 *
 * Sonuç: kullanıcı dikdörtgeni bükemiyor; alan her zaman gerçek bir
 * dikdörtgenin o açıdan görünüşü oluyor ve ölçü mantıklı yönde değişiyor.
 *
 * Dikdörtgen ters çevrilemiyor: çıpayı geçen çekişlerde kenar en az
 * başlangıcının %8'i kadar kalıyor.
 *
 * @param koseler  mevcut dört köşe (SÜ, SağÜ, SağA, SolA — tuval pikseli)
 * @param asal     asal nokta (fotoğrafın ortası)
 * @param f        odak uzaklığı (piksel)
 * @param i        çekilen köşenin sırası (0..3)
 * @param yeni     çekilen köşenin yeni yeri
 * @returns {{x,y}[]|null} yeni dört köşe, aynı sırada
 */
export function dikdortgeneOtur(koseler, asal, f, i, yeni) {
  if (!Array.isArray(koseler) || koseler.length !== 4) return null
  if (!(f > 1) || !asal || !yeni) return null
  if (!(i >= 0 && i < 4)) return null

  const [p0, p1, p2, p3] = koseler
  const isin = (p) => ({ x: (p.x - asal.x) / f, y: (p.y - asal.y) / f, z: 1 })
  const yon2B = (a, b) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const u = Math.hypot(dx, dy)
    return u > 1e-9 ? { x: dx / u, y: dy / u, z: 0 } : null
  }
  const Vy = kesisim(p0, p1, p3, p2)
  const Vd = kesisim(p0, p3, p1, p2)
  const dYatay = Vy ? isin(Vy) : yon2B(p0, p1)
  const dDikey = Vd ? isin(Vd) : yon2B(p0, p3)
  if (!dYatay || !dDikey) return null
  const n = capraz(dYatay, dDikey)
  const r0 = isin(p0)
  const d0 = nokta3(n, r0)
  if (!(Math.abs(d0) > 1e-12)) return null
  const duzleme = (p) => {
    const r = isin(p)
    const pay = nokta3(n, r)
    if (!(Math.abs(pay) > 1e-12)) return null
    const s = d0 / pay
    return { x: r.x * s, y: r.y * s, z: r.z * s }
  }
  const cikarV = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
  const birim = (v) => {
    const u = Math.hypot(v.x, v.y, v.z)
    return u > 1e-12 ? { x: v.x / u, y: v.y / u, z: v.z / u } : null
  }

  const X = koseler.map(duzleme)
  if (X.some((x) => !x)) return null
  const e1 = birim(cikarV(X[1], X[0]))
  const e2 = birim(cikarV(X[3], X[0]))
  if (!e1 || !e2) return null

  const karsi = (i + 2) % 4
  const A = X[karsi]
  const P = duzleme(yeni)
  if (!P) return null

  /* Köşelerin çıpaya göre kenar yönlerindeki bileşenleri. */
  const u = X.map((q) => nokta3(cikarV(q, A), e1))
  const v = X.map((q) => nokta3(cikarV(q, A), e2))
  const u0 = u[i]
  const v0 = v[i]
  if (!(Math.abs(u0) > 1e-9) || !(Math.abs(v0) > 1e-9)) return null

  const fark = cikarV(P, A)
  let a = nokta3(fark, e1)
  let b = nokta3(fark, e2)
  /* Dikdörtgen ters dönmesin: işaret korunuyor, kenar en az %8 kalıyor. */
  const enAz = 0.08
  if (a * u0 <= 0 || Math.abs(a) < Math.abs(u0) * enAz) a = u0 * enAz
  if (b * v0 <= 0 || Math.abs(b) < Math.abs(v0) * enAz) b = v0 * enAz

  /* Her köşe ya çıpa tarafında (0) ya da karşı uçta (a / b). */
  const yeniKose = []
  for (let k = 0; k < 4; k++) {
    const uk = Math.abs(u[k]) < Math.abs(u0) * 0.5 ? 0 : a
    const vk = Math.abs(v[k]) < Math.abs(v0) * 0.5 ? 0 : b
    const P3 = {
      x: A.x + e1.x * uk + e2.x * vk,
      y: A.y + e1.y * uk + e2.y * vk,
      z: A.z + e1.z * uk + e2.z * vk,
    }
    if (!(Math.abs(P3.z) > 1e-9)) return null
    yeniKose.push({ x: asal.x + (f * P3.x) / P3.z, y: asal.y + (f * P3.y) / P3.z })
  }
  if (yeniKose.some((q) => !Number.isFinite(q.x) || !Number.isFinite(q.y))) return null
  return yeniKose
}

/**
 * İKİ REFERANSTAN ODAK UZAKLIĞI — TAHMİN YERİNE HESAP.
 *
 * Kamera düz tutulup yalnızca sağa-sola döndüyse dikey kenarlar paralel
 * kalır, o yönün kaçış noktası sonsuza gider ve odak iki kaçış noktasından
 * türetilemez. O durumda odak TAHMİN ediliyordu (~65° görüş açısı) ve hata
 * doğrudan referansa DİK eksene biniyordu. Ölçüldü: geniş açılı bir karede
 * 300 cm'lik bir en 380 cm (%+26,7) sanılıyordu.
 *
 * Aynı düzlemde, FARKLI YÖNLERDE iki bilinen uzunluk verilirse odak artık
 * tahmin değil: düzleme iz düşen iki uzunluğun ORANI yalnızca odağa bağlı.
 * Oranı gerçek santim oranına eşitleyen odak aranıyor (kaba tarama + ikiye
 * bölme). Sentetik sahnede 600–2400 arası odakların hepsi %0,00 hatayla
 * geri bulundu ve ölçüm %26,7 hatadan %0,0'a indi.
 *
 * İki referans aynı yöndeyse oran odağa duyarsızdır ve çözüm yoktur; o
 * durumda null dönüyor (çağıran taraf tahmine devam ediyor).
 */
export function odakIkiReferanstan(koseler, r1a, r1b, cm1, r2a, r2b, cm2, asal, enGenis) {
  if (!Array.isArray(koseler) || koseler.length !== 4) return null
  if (!r1a || !r1b || !r2a || !r2b || !asal) return null
  if (!(cm1 > 0) || !(cm2 > 0) || !(enGenis > 0)) return null
  const hedef = cm1 / cm2
  const fark = (f) => {
    const o = duzlemOlcer(koseler, asal, f)
    if (!o) return null
    const L1 = o.uzunluk(r1a, r1b)
    const L2 = o.uzunluk(r2a, r2b)
    if (!(L1 > 0) || !(L2 > 0)) return null
    return L1 / L2 - hedef
  }
  const alt = enGenis * 0.15
  const ust = enGenis * 12
  const adim = 160
  let onceF = alt
  let onceD = fark(alt)
  /*
   * TAM ÇÖZÜM YOKSA EN YAKINI.
   *
   * İşaretlenen dörtgen gerçek bir dikdörtgenin görüntüsüyse oran hedefi
   * birebir yakalar. Gerçekte köşeler birkaç piksel şaşıyor ya da yüzey tam
   * dikdörtgen değil; o zaman hiçbir odak hedefi tam tutturmuyor ve eskiden
   * null dönülüyordu — yani kullanıcının yazdığı gerçek ölçü hiç işe
   * yaramıyordu. Artık hedefe en yakın odak kullanılıyor; yalnızca sapma
   * çok büyükse (oranın dörtte birinden fazla) vazgeçiliyor, çünkü orada
   * veri gerçekten tutarsızdır.
   */
  let enIyi = null
  for (let i = 1; i <= adim; i++) {
    const f = alt * Math.pow(ust / alt, i / adim)
    const d = fark(f)
    if (d != null && (!enIyi || Math.abs(d) < enIyi.d)) enIyi = { f, d: Math.abs(d) }
    if (onceD != null && d != null && onceD * d < 0) {
      let a = onceF
      let b = f
      let ga = onceD
      for (let k = 0; k < 60; k++) {
        const m = Math.sqrt(a * b)
        const gm = fark(m)
        if (gm == null) break
        if (ga * gm <= 0) b = m
        else {
          a = m
          ga = gm
        }
      }
      return Math.sqrt(a * b)
    }
    onceF = f
    onceD = d
  }
  /* İşaret değişimi yok: hedefe en yakın odak, makul sapma içindeyse. */
  if (enIyi && enIyi.d <= hedef * 0.25) return enIyi.f
  return null
}

/**
 * Dörtgenin gerçek en/boyunu santim olarak verir.
 *
 * @param {{x,y}[]} koseler   Sol üst, sağ üst, sağ alt, sol alt (tuval pikseli).
 * @param {{x,y}}   refA      Referansın bir ucu (aynı düzlemde, tuval pikseli).
 * @param {{x,y}}   refB      Referansın öteki ucu.
 * @param {number}  refCm     İki uç arasındaki gerçek uzunluk, santim.
 * @param {{x,y}}   asal      Kadrajın asal noktası (ortası), tuval pikseli.
 * @returns {{enCm:number, boyCm:number, odak:number}|null}
 */
export function dortgenGercekOlcu(koseler, refA, refB, refCm, asal, odakTahmin = 0) {
  if (!Array.isArray(koseler) || koseler.length !== 4) return null
  if (!refA || !refB || !(refCm > 0) || !asal) return null
  if (koseler.some((k) => !k || !Number.isFinite(k.x) || !Number.isFinite(k.y))) return null

  const [p0, p1, p2, p3] = koseler
  /* Yatay doğrultunun kaçış noktası: üst ve alt kenar. */
  const Vy = kesisim(p0, p1, p3, p2)
  /* Dikey doğrultunun kaçış noktası: sol ve sağ kenar. */
  const Vd = kesisim(p0, p3, p1, p2)
  /* İkisi de sonsuzdaysa yüzey karşıdan görünüyor: eski hesap zaten doğru. */
  if (!Vy && !Vd) return null

  let f = null
  if (Vy && Vd) {
    const u = cikar(Vy, asal)
    const v = cikar(Vd, asal)
    /*
     * f² = −(Vy−P)·(Vd−P). Negatif çıkması, işaretlenen dörtgenin bir
     * dikdörtgenin görüntüsü OLAMAYACAĞI anlamına gelir: köşeler birkaç
     * piksel şaşmıştır ya da seçilen yüzey gerçekten dikdörtgen değildir.
     *
     * Eskiden burada null dönülüyordu ve çağıran taraf tek ölçekli hesaba
     * düşüyordu — hiçbir uyarı olmadan, üstelik eğimli bir yüzeyde o hesap
     * çok şaşıyor. Dışarıdan bir odak biliniyorsa (öğrenilmiş ya da tahmin)
     * onunla devam etmek daha dürüst: sonuç hiç olmazsa perspektifi sayıyor
     * ve "kesin değil" diye işaretleniyor.
     */
    const fKare = -nokta(u, v)
    if (fKare > 1) f = Math.sqrt(fKare)
    else if (odakTahmin > 1) f = odakTahmin
    else return null
  } else if (odakTahmin > 1) {
    /* Tek kaçış noktası: odak türetilemiyor, tahmin kullanılıyor. */
    f = odakTahmin
  }
  if (!(f > 1)) return null

  /*
   * Odak iki kaçış noktasından HESAPLANDIYSA kesindir. Dışarıdan geldiyse
   * (tek kaçış noktası ya da f² negatif) kesin değildir.
   */
  const odakTahminMi = !(Vy && Vd) || f === odakTahmin

  /* Görüntü noktası → kameradan çıkan ışın. */
  const isin = (p) => ({ x: (p.x - asal.x) / f, y: (p.y - asal.y) / f, z: 1 })

  /*
   * Düzlemin normali: iki doğrultunun ışınlarının çapraz çarpımı. Kaçış
   * noktasının ışını o doğrultunun KENDİSİNİ verir (sonsuzdaki nokta).
   */
  /*
   * Kaçış noktası olmayan yön, görüntü düzlemine PARALEL demektir: kamera
   * koordinatında z bileşeni sıfır olan bir doğrultu, yani kenarın
   * görüntüdeki yönü.
   */
  const yon2B = (a, b) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const uz = Math.hypot(dx, dy)
    return uz > 1e-9 ? { x: dx / uz, y: dy / uz, z: 0 } : null
  }
  const dYatay = Vy ? isin(Vy) : yon2B(p0, p1)
  const dDikey = Vd ? isin(Vd) : yon2B(p0, p3)
  if (!dYatay || !dDikey) return null
  const n = capraz(dYatay, dDikey)
  if (!(Math.abs(n.x) + Math.abs(n.y) + Math.abs(n.z) > 1e-12)) return null

  /* Düzlem, ilk köşeden derinlik 1'de geçsin; gerisi oranla çıkıyor. */
  const r0 = isin(p0)
  const d0 = nokta3(n, r0)
  if (!(Math.abs(d0) > 1e-12)) return null
  const duzleme = (p) => {
    const r = isin(p)
    const pay = nokta3(n, r)
    if (!(Math.abs(pay) > 1e-12)) return null
    const s = d0 / pay
    return { x: r.x * s, y: r.y * s, z: r.z * s }
  }
  const uzunluk = (a, b) =>
    a && b ? Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) : null

  const X0 = duzleme(p0)
  const X1 = duzleme(p1)
  const X2 = duzleme(p2)
  const X3 = duzleme(p3)
  if (!X0 || !X1 || !X2 || !X3) return null

  /* Karşılıklı kenarların ortalaması: işaretleme gürültüsüne karşı. */
  const enBirim = (uzunluk(X0, X1) + uzunluk(X3, X2)) / 2
  const boyBirim = (uzunluk(X0, X3) + uzunluk(X1, X2)) / 2
  if (!(enBirim > 0) || !(boyBirim > 0)) return null

  /* Mutlak ölçek referanstan: aynı düzleme iz düşür, santime eşitle. */
  const A = duzleme(refA)
  const B = duzleme(refB)
  const refBirim = uzunluk(A, B)
  if (!(refBirim > 0)) return null
  const cmBirim = refCm / refBirim

  const enCm = enBirim * cmBirim
  const boyCm = boyBirim * cmBirim
  if (!(enCm > 0) || !(boyCm > 0)) return null
  /* Saçma sonuç (ölçüm bozuk) kullanılmıyor: 1 cm ile 100 m arası makul. */
  if (enCm < 1 || boyCm < 1 || enCm > 10000 || boyCm > 10000) return null

  return { enCm, boyCm, odak: f, odakTahmin: odakTahminMi }
}
