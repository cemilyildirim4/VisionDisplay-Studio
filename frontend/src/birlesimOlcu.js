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
/*
 * KUTU TAM ÇAPRAZDAN GÖRÜNÜYOR (45°).
 *
 * Duruş 28°'ydi: iki yan yüz eşit görünmüyor, kutunun çizimdeki eni de
 * köşegeninden (kenar × √2) kısa çıkıyordu. 45°'de iki yüz eşit, en de
 * tam köşegen — duvar payı da bu yüzden kenardan kenara 5 cm tutuyor.
 */
export const KUP_DURUS_ACISI = -45

const enOf = (p) => Number(p?.gercekWm ?? p?.wm) || 0
const boyOf = (p) => Number(p?.hm) || 0

/*
 * YUVARLAK BİRLEŞİM = TEK BİR YAY.
 *
 * Yuvarlak eklemde yalnızca soldaki ekranın SON KABİNİ bükülüyordu: iki
 * yanı düz, ortasında kısa bir dönüş kalan bu biçim tasarımda hâlâ köşe
 * gibi — hatta araya sıkışmış ayrı bir parça gibi — duruyordu.
 *
 * Yuvarlak eklemle bağlanan ekranlar artık TEK ZİNCİR sayılıyor ve dönüş
 * zincirin tamamına eşit dağılıyor (sabit eğrilik). İki ekran kavisli tek
 * bir ekran gibi birleşiyor; bütün eklemler yuvarlaksa grup baştan sona
 * pürüzsüz bir yay oluyor. Köşeli eklem zinciri BÖLÜYOR, yani köşe olduğu
 * gibi kalıyor.
 *
 * ÖLÇÜ DEĞİŞMİYOR: dilimler uç uca eklendiği için yay boyunca uzunluk
 * ekranların gerçek enlerinin toplamı, eklem açılarının toplamı da yayın
 * toplam bükülmesi. Yay, kırık çizginin ağırlıklı ortalama yönünü
 * koruyor: grup olduğu yerde duruyor, yalnızca köşesi açılıyor.
 *
 * Çizim (Birlesim2D) ile ölçü (burası) AYNI dilimleri kullanıyor; ayrı
 * hesaplansaydı duvarda yazan genişlik çizilenle tutmazdı.
 */
/* Bir dilim en çok bu kadar derece dönüyor; parça başına dilim sınırı. */
const DILIM_ACI = 3
const EN_COK_DILIM = 12

/**
 * Zincirin dilimleri: [{ i (parça sırası), w (en), t (açı), u0 (parçanın
 * içindeki başlangıcı), yay (bükülen dilim mi) }]
 *
 * Girdi: [{ w, t, yuvarlak }] — 'yuvarlak', parçanın SAĞINDAKİ eklemin
 * yuvarlak olduğunu söylüyor.
 */
export function birlesimDilimleri(parcalar) {
  const p = Array.isArray(parcalar) ? parcalar : []
  const aci = (k) => Number(p[k]?.t) || 0
  const dilimler = []
  let a = 0
  while (a < p.length) {
    /* Zincir köşeli eklemde bitiyor: yay yalnızca yuvarlak eklemleri kapsıyor. */
    let b = a
    while (b < p.length - 1 && p[b].yuvarlak) b++
    const enler = []
    for (let m = a; m <= b; m++) enler.push(Math.max(0, Number(p[m].w) || 0))
    const boy = enler.reduce((t, w) => t + w, 0)
    const donus = aci(b) - aci(a)
    if (b === a || !(boy > 0) || Math.abs(donus) < 1e-6) {
      /* Tek parça ya da dönüşü olmayan zincir: düz, eskisi gibi. */
      for (let m = a; m <= b; m++) {
        dilimler.push({ i: m, w: enler[m - a], t: aci(m), u0: 0, yay: false })
      }
    } else {
      const egrilik = donus / boy
      const ortalama = enler.reduce((t, w, k) => t + w * aci(a + k), 0) / boy
      const bas = ortalama - donus / 2
      let s = 0
      for (let m = a; m <= b; m++) {
        const w = enler[m - a]
        /* Dilim sayısı parçanın KENDİ dönüşünden: az dönen az bölünüyor. */
        const payDerece = (Math.abs(donus) * (w / boy) * 180) / Math.PI
        const adet = Math.max(3, Math.min(EN_COK_DILIM, Math.ceil(payDerece / DILIM_ACI)))
        const dw = w / adet
        for (let q = 0; q < adet; q++) {
          dilimler.push({
            i: m,
            w: dw,
            t: bas + egrilik * (s + dw * (q + 0.5)),
            u0: dw * q,
            yay: true,
          })
        }
        s += w
      }
    }
    a = b + 1
  }
  return dilimler
}

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
   * Zincir üstten bakışta kırık bir çizgi, yuvarlak eklemde o kırık yay
   * oluyor (bkz. birlesimDilimleri). X'teki yayılım ölçülüyor; yayın
   * duvarda kapladığı yer kırık çizgininkinden farklı olduğu için genişlik
   * de dilimlerden okunuyor. 'yerler' her parçanın bu yayılım içindeki
   * yeri (metre) — ölçü etiketleri ve kılavuz çizgileri oraya konuyor.
   */
  const dilimler = birlesimDilimleri(
    p.map((s) => ({
      w: enOf(s),
      t: Number.isFinite(s.yon) ? s.yon : 0,
      yuvarlak: !!s.yuvarlakSag,
    })),
  )
  let x = 0
  let enAz = 0
  let enCok = 0
  const ham = p.map(() => [Infinity, -Infinity])
  for (const d of dilimler) {
    const dx = Math.cos(d.t) * d.w
    const k = ham[d.i]
    if (k) {
      if (Math.min(x, x + dx) < k[0]) k[0] = Math.min(x, x + dx)
      if (Math.max(x, x + dx) > k[1]) k[1] = Math.max(x, x + dx)
    }
    x += dx
    if (x < enAz) enAz = x
    if (x > enCok) enCok = x
  }
  return {
    enM: Math.max(0.01, enCok - enAz),
    boyM: Math.max(...p.map(boyOf)),
    yerler: ham.map(([a, b]) => ({
      x0: (Number.isFinite(a) ? a : 0) - enAz,
      x1: (Number.isFinite(b) ? b : 0) - enAz,
    })),
  }
}
