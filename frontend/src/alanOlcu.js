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
 * BİRLEŞİK EKRANLARIN DÖRTGENLERİ — tek bir yüzeyden türetiliyor.
 *
 * İki ekranı köşede uç uca getirmek, kenarlarını AYNI yapmak demek. Elle
 * yapılınca birkaç piksel şaşıyor ve çizimde açık bir dikiş ya da bindirme
 * oluyor; ekranlardan biri taşınınca da dikiş hemen açılıyor.
 *
 * Bu yüzden grup SAKLANMIYOR, TÜRETİLİYOR: lider ekranın dörtgeni ve her
 * ekranın gerçek santim ölçüsü verildiğinde ötekiler hesaplanıyor. Lider
 * nereye giderse grup onunla gidiyor ve dikiş hiç açılmıyor.
 *
 * YÖNTEM. Lider dörtgen, odak uzaklığı bilindiği için kameranın gördüğü
 * düzleme geri iz düşürülüyor; orada bir "yürüyüş" yapılıyor:
 *   imleç = sol üst köşe, yön = yatay kenar yönü
 *   her ekran: imleçten başlayıp yön boyunca kendi eni, aşağı doğru kendi
 *              boyu kadar bir dikdörtgen
 *   dikişte: yön, DİKEY eksen etrafında istenen açı kadar çevriliyor
 * Üst kenarlar hizada kalıyor çünkü dönme hep dikey eksende.
 *
 * Dönme yönü sahnenin İÇİNE doğru: sonraki ekranın merkezi kameradan daha
 * uzağa düşecek şekilde seçiliyor. Köşe ürünlerinde beklenen duruş bu.
 *
 * @param liderKose  lider ekranın dört köşesi (SÜ, SağÜ, SağA, SolA — tuval px)
 * @param asal       asal nokta
 * @param f          odak uzaklığı (px)
 * @param olculer    her ekranın {enCm, boyCm} ölçüsü, lider ilk sırada
 * @param aciliar    her dikişteki açı (derece) — uzunluğu olculer.length-1
 * @returns {{x,y}[][]|null} her ekran için dört köşe, aynı sırada
 */
export function grupDortgenleri(liderKose, asal, f, olculer, acilar) {
  if (!Array.isArray(liderKose) || liderKose.length !== 4) return null
  if (!(f > 1) || !asal || !Array.isArray(olculer) || olculer.length < 1) return null
  if (!(olculer[0]?.enCm > 0) || !(olculer[0]?.boyCm > 0)) return null

  const isin = (q) => ({ x: (q.x - asal.x) / f, y: (q.y - asal.y) / f, z: 1 })
  const yon2B = (a, b) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const u = Math.hypot(dx, dy)
    return u > 1e-9 ? { x: dx / u, y: dy / u, z: 0 } : null
  }
  const [p0, p1, p2, p3] = liderKose
  const Vy = kesisim(p0, p1, p3, p2)
  const Vd = kesisim(p0, p3, p1, p2)
  const dYatay = Vy ? isin(Vy) : yon2B(p0, p1)
  const dDikey = Vd ? isin(Vd) : yon2B(p0, p3)
  if (!dYatay || !dDikey) return null
  const n = capraz(dYatay, dDikey)
  const r0 = isin(p0)
  const d0 = nokta3(n, r0)
  if (!(Math.abs(d0) > 1e-12)) return null
  const duzleme = (q) => {
    const r = isin(q)
    const pay = nokta3(n, r)
    if (!(Math.abs(pay) > 1e-12)) return null
    const sc = d0 / pay
    return { x: r.x * sc, y: r.y * sc, z: r.z * sc }
  }
  const cikarV = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
  const birim = (v) => {
    const u = Math.hypot(v.x, v.y, v.z)
    return u > 1e-12 ? { x: v.x / u, y: v.y / u, z: v.z / u } : null
  }
  const ekle = (a, v, k) => ({ x: a.x + v.x * k, y: a.y + v.y * k, z: a.z + v.z * k })

  const X = liderKose.map(duzleme)
  if (X.some((q) => !q)) return null
  const e1 = birim(cikarV(X[1], X[0]))
  const e2 = birim(cikarV(X[3], X[0]))
  if (!e1 || !e2) return null

  /* Düzlemdeki birim: liderin eni kaç santim ise o kadar. */
  const enBirim = Math.hypot(X[1].x - X[0].x, X[1].y - X[0].y, X[1].z - X[0].z)
  const k = enBirim / olculer[0].enCm
  if (!(k > 0)) return null

  /* Dikey eksen (e2) etrafında döndürme — Rodrigues. */
  const dondur = (v, eksen, derece) => {
    const a = (derece * Math.PI) / 180
    const c = Math.cos(a)
    const si = Math.sin(a)
    const cap = capraz(eksen, v)
    const iz = nokta3(eksen, v)
    return {
      x: v.x * c + cap.x * si + eksen.x * iz * (1 - c),
      y: v.y * c + cap.y * si + eksen.y * iz * (1 - c),
      z: v.z * c + cap.z * si + eksen.z * iz * (1 - c),
    }
  }

  const goruntuye = (P) =>
    Math.abs(P.z) > 1e-9 ? { x: asal.x + (f * P.x) / P.z, y: asal.y + (f * P.y) / P.z } : null

  /*
   * YÜRÜYÜŞ — LİDER SABİT, ZİNCİR BİR TARAFTAN UZUYOR.
   *
   * Lider, kullanıcının işaretlediği dörtgenin ta kendisi; ona hiç
   * dokunulmuyor. Sonraki paneller liderin sağ kenarından (taraf = +1) ya
   * da sol kenarından (taraf = −1) devam ediyor ve her dikişte yön dikey
   * eksende kıvrılıyor.
   *
   * Önce bütün grup bir açı taramasıyla döndürülüyordu; o tarama liderin
   * kendisini de duvarından koparıyordu (ölçüldü). Seçilecek tek şey
   * kaldı: hangi taraf.
   */
  const yuru = (taraf) => {
    const panel = [{ kose: [X[0], X[1], X[2], X[3]], yon: e1 }]
    const ters = (v) => ({ x: -v.x, y: -v.y, z: -v.z })
    let yon = taraf > 0 ? e1 : ters(e1)
    let imlec = taraf > 0 ? X[1] : X[0]
    for (let i = 1; i < olculer.length; i++) {
      const en = olculer[i]?.enCm
      const boy = olculer[i]?.boyCm
      if (!(en > 0) || !(boy > 0)) return null
      const aci = acilar?.[i - 1] ?? 0
      if (aci) {
        const a = dondur(yon, e2, aci)
        const b = dondur(yon, e2, -aci)
        /* Dikişte sahnenin İÇİNE dönülüyor: köşe ürünü böyle durur. */
        const merkez = (yn) => ekle(ekle(imlec, yn, en * k * 0.5), e2, boy * k * 0.5)
        yon = merkez(a).z >= merkez(b).z ? a : b
      }
      const uc = ekle(imlec, yon, en * k)
      /* Köşe sırası her zaman sol üst → sağ üst → sağ alt → sol alt. */
      const ustSol = taraf > 0 ? imlec : uc
      const ustSag = taraf > 0 ? uc : imlec
      panel.push({
        kose: [ustSol, ustSag, ekle(ustSag, e2, boy * k), ekle(ustSol, e2, boy * k)],
        yon: taraf > 0 ? yon : ters(yon),
      })
      imlec = uc
    }
    return panel
  }

  /*
   * GRUP KAMERAYA BAKIYOR — ÖLÇÜLEBİLİR ÖLÇÜTLE.
   *
   * Yürüyüş liderin kendi düzleminde başlayınca L tipinde ikinci yüz
   * sahnenin içine dönüp neredeyse kenarından görünüyordu. Açıyı ikiye
   * bölmek de, normallerin ortalamasını kameraya çevirmek de yetmedi:
   * duvarın kendi açısına göre bu kez başka bir yüz kenarından kalıyordu
   * (ölçüldü: 307 piksellik yüz 6 piksele düştü).
   *
   * Ölçüt: EN KÖTÜ YÜZÜN kameraya dönüklüğü. Her panelin normali ile o
   * panelden kameraya giden yön arasındaki kosinüs hesaplanıyor; bir
   * duruşun değeri, panellerin EN KÜÇÜĞÜ. Bu değeri en büyük yapan duruş
   * seçiliyor — yani hiçbir yüz kenarında kalmıyor.
   *
   * "Toplam görüntü alanı" ölçüt olarak denendi ve yanlış çıktı: kameraya
   * yaklaşan panel büyük göründüğü için arama grubu izleyicinin üstüne
   * sürüyordu (ölçüldü: paneller x = −1516'ya kadar taşıyordu).
   *
   * Önce 10 derecelik adımlarla kabaca, sonra çevresinde 2 derecelik
   * adımlarla ince ayar.
   *
   * "Düz"de dikiş açısı yok; orada arama hiç yapılmıyor ve ekranlar
   * işaretlenen duvarda kalıyor.
   */
  const enKotuYuz = (panel) => {
    let enAz = Infinity
    for (const pn of panel) {
      const q = pn.kose.map(goruntuye)
      if (q.some((v) => !v)) return -Infinity
      const nv = birim(capraz(pn.yon, e2))
      if (!nv) return -Infinity
      /* Panelin merkezinden kameraya (orijine) doğru. */
      let m = { x: 0, y: 0, z: 0 }
      for (const v of pn.kose) m = { x: m.x + v.x / 4, y: m.y + v.y / 4, z: m.z + v.z / 4 }
      const bakis = birim({ x: -m.x, y: -m.y, z: -m.z })
      if (!bakis) return -Infinity
      enAz = Math.min(enAz, Math.abs(nokta3(nv, bakis)))
    }
    return enAz
  }

  /*
   * ZİNCİR HANGİ TARAFA UZASIN.
   *
   * İki seçenek de kuruluyor ve EN KÖTÜ YÜZÜ kameraya daha dönük olan
   * alınıyor; yani hiçbir panel kenarından görünmüyor. Tek panelli grupta
   * seçilecek bir şey yok.
   */
  const panel = (() => {
    const sag = yuru(1)
    if (olculer.length < 2) return sag
    /*
     * DÜZ DİZİLİMDE HER ZAMAN SAĞA.
     *
     * Dikiş açısı yoksa paneller zaten aynı düzlemde; hangi tarafa
     * uzadıkları görünürlüğü değiştirmiyor ama beklentiyi değiştiriyor:
     * ekranlar sebepsiz yere solda birikiyordu.
     */
    if (!(acilar || []).some((x) => x)) return sag
    const sol = yuru(-1)
    if (!sag) return sol
    if (!sol) return sag
    /*
     * BERABERLİKTE SAĞ: düz dizilimde iki taraf da aynı derecede görünür
     * ve ekranlar sebepsiz yere sola atlıyordu. Sol ancak BELİRGİN biçimde
     * daha iyiyse seçiliyor.
     */
    return enKotuYuz(sol) > enKotuYuz(sag) + 0.02 ? sol : sag
  })()
  if (!panel) return null
  const sonuc = []
  for (const pn of panel) {
    const dort = pn.kose.map(goruntuye)
    if (dort.some((q) => !q)) return null
    sonuc.push(dort)
  }
  return sonuc
}

/**
 * İŞARETLENEN DÖRTGEN GERÇEKTE OLABİLİR Mİ.
 *
 * Dört köşe duvardaki gerçek çizgileri takip etmeli. İçe çökmüş (bir köşesi
 * ötekilerin arasına düşmüş) ya da kendi kendini kesen bir dörtgen, hiçbir
 * dikdörtgenin hiçbir açıdan görüntüsü değildir: perspektif hesabı orada
 * anlamsız bir sonuç üretir. Böyle bir işaretleme kabul edilmiyor.
 *
 * Denetim: köşeler sıralandıktan sonra ardışık kenarların çapraz çarpımları
 * AYNI işaretli olmalı (dışbükey). İşaret değişiyorsa köşelerden biri içeri
 * düşmüş demektir. Ayrıca çok ince/çökmüş dörtgenler de eleniyor: en küçük
 * kenar, en büyüğünün yüzde biri kadar bile değilse ölçüm güvenilmez.
 *
 * @returns {boolean} işaretleme kullanılabilir mi
 */
export function dortgenGecerli(koseler) {
  if (!Array.isArray(koseler) || koseler.length !== 4) return false
  if (koseler.some((k) => !k || !Number.isFinite(k.x) || !Number.isFinite(k.y))) return false
  let artiVar = false
  let eksiVar = false
  let enKisa = Infinity
  let enUzun = 0
  for (let i = 0; i < 4; i++) {
    const a = koseler[i]
    const b = koseler[(i + 1) % 4]
    const c = koseler[(i + 2) % 4]
    const u = { x: b.x - a.x, y: b.y - a.y }
    const v = { x: c.x - b.x, y: c.y - b.y }
    const capraz2 = u.x * v.y - u.y * v.x
    if (capraz2 > 0) artiVar = true
    if (capraz2 < 0) eksiVar = true
    const uz = Math.hypot(u.x, u.y)
    enKisa = Math.min(enKisa, uz)
    enUzun = Math.max(enUzun, uz)
  }
  if (artiVar && eksiVar) return false
  if (!(enUzun > 0) || enKisa < enUzun * 0.01) return false
  return true
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
