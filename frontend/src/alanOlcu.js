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

/* İki doğrunun kesişimi; paralelse null. */
function kesisim(p1, p2, p3, p4) {
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
    /* f² = −(Vy−P)·(Vd−P); negatifse köşeler bir dikdörtgenin görüntüsü değil. */
    const fKare = -nokta(u, v)
    if (!(fKare > 1)) return null
    f = Math.sqrt(fKare)
  } else if (odakTahmin > 1) {
    /* Tek kaçış noktası: odak türetilemiyor, tahmin kullanılıyor. */
    f = odakTahmin
  }
  if (!(f > 1)) return null

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

  return { enCm, boyCm, odak: f }
}
