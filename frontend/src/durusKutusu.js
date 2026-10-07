/**
 * KUTUNUN DURUŞU — FAREYLE PERSPEKTİF.
 *
 * Perspektifin ÖLÇÜLEBİLDİĞİ tek yol dört köşe referansı: ölçüsü bilinen bir
 * dikdörtgenin köşeleri işaretlenince düzlemin homografisi tam çıkıyor. Ama
 * her fotoğrafta işaretlenecek düzgün bir dikdörtgen yok ve kullanıcı dört
 * nokta koymak istemiyor.
 *
 * Burada yapılan şey ölçüm DEĞİL, AYAR: kullanıcı kutuyu fareyle çeviriyor,
 * gözüne oturana kadar. Köşeleri tek tek çekmekten farkı, dörtgenin gerçek
 * bir dikdörtgenin izdüşümü olarak kalması: dört köşe birbirinden bağımsız
 * oynamıyor, hepsi aynı düzlemin dönmesinden geliyor. Bu yüzden şekil hiçbir
 * zaman bozulmuyor — kelebek dörtgen, yalama perspektif olamıyor.
 *
 * ÜÇ AÇI, ÜÇ AYRI İŞ:
 *   roll  (dönme)   — düzlem içi eğim; referans çizgisinden ÖLÇÜLÜYOR
 *   yaw   (çevirme)  — dikey eksen etrafında; sağ kenar yakın/uzak
 *   pitch (yatırma)  — yatay eksen etrafında; üst kenar yakın/uzak
 *
 * Fiziksel ölçüye DOKUNULMUYOR: dikdörtgen her zaman enCm × boyCm, piksel
 * karşılığı da referans ölçeğinden (px/cm). Çevirince kenarın kısalması
 * küçülme değil, kısalma — açılı bakılan bir ekran gerçekten daha dar görünür.
 *
 * KAMERA NEREDE — ÇEKİM MESAFESİNİN İŞİ BU.
 *
 * Aynı açıda çevrilen bir dikdörtgen, kameraya yakınken çok, uzaktan bakınca
 * az yamuk görünür. Yani perspektifin SERTLİĞİNİ kameranın uzaklığı
 * belirliyor ve bu, kullanıcının panele yazdığı çekim mesafesinin tam
 * karşılığı.
 *
 * Çevrim doğrudan referans ölçeğinden çıkıyor. İğnedelik kamerada
 *   px/cm = odak / uzaklık
 * olduğu için, uzaklığın PİKSEL cinsinden karşılığı
 *   d = mesafeCm × px/cm
 * Yani 3 metreden çekilmiş bir fotoğrafta kamera, kutunun bulunduğu düzlemden
 * tam 300 cm uzakta duruyor — uydurma bir katsayı değil, ölçülen ölçek.
 *
 * Mesafe bilinmiyorsa (ya da saçma küçükse) kutunun kendi boyuna göre bir
 * oran kullanılıyor: kamera, büyük yarı kenarın KAMERA_ORANI katı uzakta.
 *
 * Odak uzaklığı her durumda uzaklığa eşitleniyor; böylece açı sıfırken
 * izdüşüm ölçeği tam 1 oluyor — duruşu sıfırlamak kutuDortgeni'nin verdiği
 * dörtgenin aynısını veriyor ve mesafeyi değiştirmek DÜZ kutuyu hiç
 * oynatmıyor.
 */

/* Fareyle ulaşılabilecek en büyük açılar. Ötesinde şekil inandırıcılığını
 * kaybediyor ve yakın kenar kadrajı yiyor. */
export const EN_COK_YAW = (60 * Math.PI) / 180
export const EN_COK_PITCH = (45 * Math.PI) / 180

/* 1 piksel fare hareketi kaç derece. Tüm sınırı ~170 pikselde taratıyor:
 * elini kaldırmadan tek sürüklemede uçtan uca gidebiliyor. */
export const DERECE_PX = 0.35

/*
 * Kamera uzaklığı / kutunun büyük yarı kenarı. Küçük sayı = sert perspektif
 * (geniş açılı lens, kutuya çok yakın), büyük sayı = yumuşak. 3,2 bir odanın
 * içinden çekilmiş tipik bir fotoğrafa yakın duruyor.
 */
const KAMERA_ORANI = 3.2

/*
 * Kamera kutunun içine giremez. Çok küçük bir mesafe girildiğinde (ya da kutu
 * çok büyükken) izdüşüm patlıyor; uzaklık büyük yarı kenarın bu katından
 * aşağı inmiyor.
 */
const EN_YAKIN_ORAN = 1.5

/* Düzlem kameranın hizasına gelirse izdüşüm patlar; o kadarına izin yok. */
const EN_AZ_Z = 0.15

function kirp(v, sinir) {
  const s = Number.isFinite(v) ? v : 0
  return Math.max(-sinir, Math.min(sinir, s))
}

/**
 * Verilen duruştaki kutunun dörtgeni.
 *
 * @param enCm,boyCm   kutunun fiziksel ölçüsü
 * @param pxCm         referans ölçeği {x,y} (px/cm)
 * @param gorselW/H    fotoğrafın gerçek çözünürlüğü
 * @param merkez       normalize fotoğraf koordinatında kutunun merkezi
 * @param rollRad      düzlem içi eğim (referanstan)
 * @param yawRad       dikey eksen etrafında çevirme
 * @param pitchRad     yatay eksen etrafında yatırma
 * @param mesafeCm     çekim mesafesi (santim); yoksa kutunun boyundan oran
 * @returns {{koseler:Array, yawRad:number, pitchRad:number, tasiyor:boolean}}
 *          ya da geçersiz girdide null
 *
 * Dönen yawRad/pitchRad KIRPILMIŞ değerler: sınırda sürüklemeye devam edince
 * açı büyümüyor, çağıran taraf da sakladığı açıyı buradan geri alıyor.
 */
export function durusDortgeni(
  enCm,
  boyCm,
  pxCm,
  gorselW,
  gorselH,
  merkez = { x: 0.5, y: 0.5 },
  rollRad = 0,
  yawRad = 0,
  pitchRad = 0,
  mesafeCm = 0,
) {
  if (!pxCm || !(pxCm.x > 0) || !(pxCm.y > 0)) return null
  if (!(enCm > 0) || !(boyCm > 0) || !(gorselW > 0) || !(gorselH > 0)) return null

  const pxW = enCm * pxCm.x
  const pxH = boyCm * pxCm.y
  const yariW = pxW / 2
  const yariH = pxH / 2

  const roll = Number.isFinite(rollRad) ? rollRad : 0
  const yaw = kirp(yawRad, EN_COK_YAW)
  const pitch = kirp(pitchRad, EN_COK_PITCH)

  /*
   * Kamera uzaklığı = odak uzaklığı: açı sıfırken ölçek birebir.
   * Mesafe verildiyse piksel karşılığı ölçekten çıkıyor, yoksa kutunun
   * kendi boyuna göre bir oran kullanılıyor.
   */
  const olcekPx = (pxCm.x + pxCm.y) / 2
  const mesafePx = mesafeCm > 0 ? mesafeCm * olcekPx : 0
  const d = Math.max(EN_YAKIN_ORAN * Math.max(yariW, yariH), mesafePx || KAMERA_ORANI * Math.max(yariW, yariH))
  const f = d

  const cr = Math.cos(roll)
  const sr = Math.sin(roll)
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)

  /*
   * HESAP GÖRSEL PİKSELİNDE. Normalize uzayda x ve y farklı sayılara
   * bölünüyor; orada döndürülen dikdörtgenin dik açıları bozulur. Köşeler
   * piksel uzayında kurulup döndürülüyor, normalize etme en sonda.
   */
  const yerel = []
  for (const [x0, y0] of [
    [-yariW, -yariH],
    [yariW, -yariH],
    [yariW, yariH],
    [-yariW, yariH],
  ]) {
    /* Düzlem içi dönme — kutu referans çizgisine paralel kalıyor. */
    const x1 = x0 * cr - y0 * sr
    const y1 = x0 * sr + y0 * cr

    /* Dikey eksen etrafında: yaw > 0 iken sağ kenar kameraya yaklaşıyor. */
    const X = x1 * cy
    const Z1 = -x1 * sy

    /* Yatay eksen etrafında: pitch > 0 iken üst kenar kameraya yaklaşıyor. */
    const Y = y1 * cp - Z1 * sp
    const Z = y1 * sp + Z1 * cp + d

    if (!(Z > f * EN_AZ_Z)) return null
    yerel.push({ x: (f * X) / Z, y: (f * Y) / Z })
  }

  /*
   * MERKEZ SABİT. İzdüşüm kutuyu kendi ağırlık merkezinden kaydırabiliyor;
   * bir ara perspektif kaydırıcısı tam bu yüzden "görsele oturmuyor"
   * olmuştu — kutu her ayarda yerinden kayıyordu. Dörtgen burada kendi
   * merkezine göre sıfırlanıp istenen merkeze taşınıyor: açı değişirken
   * kutunun yeri hiç oynamıyor.
   */
  const ox = yerel.reduce((t, p) => t + p.x, 0) / 4
  const oy = yerel.reduce((t, p) => t + p.y, 0) / 4
  const yer = yerel.map((p) => ({ x: p.x - ox, y: p.y - oy }))

  const nKapW = (2 * Math.max(...yer.map((p) => Math.abs(p.x)))) / gorselW
  const nKapH = (2 * Math.max(...yer.map((p) => Math.abs(p.y)))) / gorselH
  const mx = Math.min(1 - nKapW / 2, Math.max(nKapW / 2, merkez?.x ?? 0.5))
  const my = Math.min(1 - nKapH / 2, Math.max(nKapH / 2, merkez?.y ?? 0.5))

  return {
    koseler: yer.map((p) => ({ x: mx + p.x / gorselW, y: my + p.y / gorselH })),
    yawRad: yaw,
    pitchRad: pitch,
    tasiyor: nKapW > 1 || nKapH > 1,
  }
}

/** Fare hareketini açı değişimine çeviriyor; sürüklenen mesafe radyan oluyor. */
export function faredenDurus(durus, dx, dy) {
  const hiz = (DERECE_PX * Math.PI) / 180
  const d = durus || { yaw: 0, pitch: 0 }
  return {
    /*
     * SAĞA SÜRÜKLE = SAĞ KENAR UZAKLAŞSIN. Eli bir cismin üstüne koyup sağa
     * itmek onu sağ tarafından çevirir; o taraf arkaya gider. İşaretin eksi
     * olması bundan: yaw > 0 sağ kenarı yaklaştırıyor.
     */
    yaw: d.yaw - (Number.isFinite(dx) ? dx : 0) * hiz,
    /* AŞAĞI SÜRÜKLE = ÜST KENAR YAKLAŞSIN (tepesinden öne devrilme). */
    pitch: d.pitch + (Number.isFinite(dy) ? dy : 0) * hiz,
  }
}

/*
 * KUTUYU ÇEKİLEN KÖŞELERE OTURTMA.
 *
 * Kullanıcı kutunun bir köşesini tutup duvarın köşesine çekiyor. Köşeyi
 * olduğu gibi oraya koymak kolay ama yanlış: dört köşe birbirinden bağımsız
 * oynayınca dörtgen artık 30 × 21 cm'lik bir dikdörtgenin görüntüsü olmaktan
 * çıkıyor, yani ekranda duran şekil fiziksel bir iddia taşımıyor.
 *
 * Burada yapılan şey ters yönden: dikdörtgen hep GERÇEK ölçüsünde kalıyor ve
 * ona en çok benzeyen DURUŞ aranıyor. Aranan beş sayı —
 *
 *   merkez (x, y), düzlem içi dönme (roll), çevirme (yaw), yatırma (pitch)
 *
 * — kullanıcının çektiği dört köşeye en yakın görüntüyü veren değerler.
 * Dört köşe sekiz sayı ediyor, aranan beş: fazladan bilgi var, bu yüzden
 * tam çözüm yerine EN YAKIN çözüm aranıyor (en küçük kareler).
 *
 * Yöntem örüntü araması: her sayıyı sırayla bir adım ileri geri deneyip
 * hatayı düşüren değişiklikleri kabul ediyor, hiçbiri düşürmezse adımı
 * yarıya indiriyor. Türev istemiyor, patlamıyor ve birkaç yüz denemede
 * bitiyor — sürükleme sırasında her karede çalışacak kadar ucuz.
 *
 * Sonuç: çekilen köşe farenin tam altına gelmeyebilir. Gelmemesi doğru —
 * o nokta, o ölçüdeki bir dikdörtgenin ulaşabileceği bir yer değilse kutu
 * oraya ancak yalan söyleyerek giderdi.
 */

/* Örüntü aramasının başlangıç adımları ve kaç tur döneceği. */
const ADIM_MERKEZ = 0.03
const ADIM_ACI = 0.2
const EN_KUCUK_ADIM = 1e-4
const EN_COK_TUR = 60

function tekArama(
  hedef,
  enCm,
  boyCm,
  pxCm,
  gorselW,
  gorselH,
  baslangic,
  mesafeCm = 0,
) {
  if (!Array.isArray(hedef) || hedef.length !== 4) return null
  if (!baslangic) return null

  /* Bir duruşun hatası: dört köşenin GÖRSEL PİKSELİNDEKİ kare uzaklıkları. */
  const olc = (p) => {
    const k = durusDortgeni(
      enCm,
      boyCm,
      pxCm,
      gorselW,
      gorselH,
      { x: p.cx, y: p.cy },
      p.roll,
      p.yaw,
      p.pitch,
      mesafeCm,
    )
    if (!k) return { hata: Infinity, k: null }
    let toplam = 0
    for (let i = 0; i < 4; i++) {
      const dx = (k.koseler[i].x - hedef[i].x) * gorselW
      const dy = (k.koseler[i].y - hedef[i].y) * gorselH
      toplam += dx * dx + dy * dy
    }
    return { hata: toplam, k }
  }

  let p = {
    cx: baslangic.cx,
    cy: baslangic.cy,
    roll: baslangic.roll || 0,
    yaw: baslangic.yaw || 0,
    pitch: baslangic.pitch || 0,
  }
  let en = olc(p)
  if (!Number.isFinite(en.hata)) return null

  let adimMerkez = ADIM_MERKEZ
  let adimAci = ADIM_ACI
  for (let tur = 0; tur < EN_COK_TUR; tur++) {
    let gelisti = false
    const denemeler = [
      ['cx', adimMerkez],
      ['cx', -adimMerkez],
      ['cy', adimMerkez],
      ['cy', -adimMerkez],
      ['roll', adimAci],
      ['roll', -adimAci],
      ['yaw', adimAci],
      ['yaw', -adimAci],
      ['pitch', adimAci],
      ['pitch', -adimAci],
    ]
    for (const [ad, d] of denemeler) {
      const q = { ...p, [ad]: p[ad] + d }
      const r = olc(q)
      if (r.hata < en.hata) {
        p = q
        en = r
        gelisti = true
      }
    }
    if (!gelisti) {
      adimMerkez /= 2
      adimAci /= 2
      if (adimAci < EN_KUCUK_ADIM) break
    }
  }
  if (!en.k) return null
  return {
    koseler: en.k.koseler,
    roll: p.roll,
    yawRad: en.k.yawRad,
    pitchRad: en.k.pitchRad,
    merkez: { x: p.cx, y: p.cy },
    /* Ortalama köşe sapması (görsel pikseli) — ne kadar oturduğunun ölçüsü. */
    sapmaPx: Math.sqrt(en.hata / 4),
    tasiyor: en.k.tasiyor,
  }
}

/*
 * AYNA ÇÖZÜM TUZAĞI — neden birden çok başlangıç.
 *
 * Zayıf perspektifte bir dikdörtgenin görüntüsü, açıların İŞARETİ ters
 * çevrildiğinde neredeyse aynı kalıyor: sağa dönmüş kutu ile sola dönmüş
 * kutu kâğıt üstünde birbirine çok benziyor (Necker kübü belirsizliği).
 * Tek başlangıçla arama bu yanlış tepeye düşebiliyor; ölçüldü, gerçek
 * duruş 0 piksel hata verirken ayna çözüm 3,54 pikselde takılıp kalıyordu.
 *
 * Çözüm basit: aynı arama birkaç farklı başlangıçtan yapılıp en iyisi
 * alınıyor. İlk tohum mevcut duruş (sürükleme sırasında sürekliliği o
 * sağlıyor), ikincisi onun aynası, üçüncüsü düz başlangıç.
 */
export function durusaOturt(hedef, enCm, boyCm, pxCm, gorselW, gorselH, baslangic, mesafeCm = 0) {
  if (!baslangic) return null
  const b = {
    cx: baslangic.cx,
    cy: baslangic.cy,
    roll: baslangic.roll || 0,
    yaw: baslangic.yaw || 0,
    pitch: baslangic.pitch || 0,
  }
  const ara = (tohum) => tekArama(hedef, enCm, boyCm, pxCm, gorselW, gorselH, tohum, mesafeCm)

  /*
   * Önce mevcut duruştan ara. Çıkan sonucun AYNASINDAN bir kez daha ara:
   * tohumun kendi aynasını denemek yetmiyor, çünkü düz başlangıçta (açılar
   * sıfır) ayna da aynı yer oluyor ve iki arama aynı tepeye çıkıyor.
   * Belirsizlik sonucun etrafında, başlangıcın değil.
   */
  const ilk = ara(b)
  if (!ilk) return null
  const ayna = ara({
    cx: ilk.merkez.x,
    cy: ilk.merkez.y,
    roll: ilk.roll,
    yaw: -ilk.yawRad,
    pitch: -ilk.pitchRad,
  })
  return ayna && ayna.sapmaPx < ilk.sapmaPx ? ayna : ilk
}

/*
 * KABİNİN GERÇEK GÖVDESİ — SEKİZ KÖŞE, AYNI KAMERA.
 *
 * Kalınlık bir süre elle çizilen tek bir şeritti: yakın kenarın yanına
 * derinlik kadar bir dörtgen konuyordu. Geometrisi kabaca doğru olsa bile
 * sonradan yapıştırılmış bir çizim gibi duruyordu, çünkü gerçekte bir kutu
 * tek bir yüz değil: açıya göre yanını, üstünü ya da altını birlikte
 * gösteriyor ve her yüz ışığa göre farklı parlıyor.
 *
 * Burada kabinin SEKİZ köşesi de var: ön yüz (ekranın kendisi) ve ondan
 * derinlik kadar geride duran arka yüz. Sekizi de tasarımı ekrana koyan
 * kamerayla AYNI izdüşümden geçiyor — ayrı bir 3B motor, ayrı bir kamera ya
 * da yaklaşık bir duruş yok. Bu yüzden gövde tasarımdan kopamıyor.
 *
 * HANGİ YÜZ GÖRÜNÜR. Dışa dönük sırayla yazılan bir yüzün izdüşümü,
 * kameraya bakıyorsa ön yüzle AYNI yönde dönüyor; sırtını dönmüşse ters.
 * Tek bir işaret karşılaştırması bütün gizli yüzleri eliyor — dışbükey bir
 * kutuda bu yeterli, ayrıca derinlik sıralaması gerekmiyor.
 *
 * IŞIK. Her yüzün normali de aynı dönmeden geçiyor ve ışığa ne kadar dönük
 * olduğu parlaklığı belirliyor. Yüzlerin birbirinden ayrışması derinlik
 * hissini veren asıl şey; tek renk bir kutu düz bir leke gibi görünüyor.
 */

/* Işık yönü (kamera uzayında, ışığa doğru): sol üstten ve biraz önden. */
const ISIK = (() => {
  const v = { x: -0.45, y: -0.6, z: -1 }
  const n = Math.hypot(v.x, v.y, v.z)
  return { x: v.x / n, y: v.y / n, z: v.z / n }
})()
/* Hiç ışık almayan yüz de tamamen siyah olmuyor: ortam ışığı. */
const ORTAM = 0.42

/** Yerel (x, y, z) noktayı duruşa göre döndürüp kamera uzayına taşıyor. */
function dondur(x0, y0, z0, cr, sr, cy, sy, cp, sp) {
  /* Düzlem içi dönme (kendi ekseni). */
  const x1 = x0 * cr - y0 * sr
  const y1 = x0 * sr + y0 * cr
  /* Dikey eksen (çevirme). */
  const X = x1 * cy + z0 * sy
  const Z1 = -x1 * sy + z0 * cy
  /* Yatay eksen (yatırma). */
  const Y = y1 * cp - Z1 * sp
  const Z = y1 * sp + Z1 * cp
  return { X, Y, Z }
}

/**
 * Kabinin gövdesi: ön yüz + görünen yan/üst/alt yüzler.
 *
 * Ön yüz, aynı değerlerle çağrılan durusDortgeni'nin verdiği dörtgenin
 * AYNISI oluyor; ölçüldü, fark 0,00 piksel. Yani gövde tasarımın üstüne
 * birebir oturuyor.
 *
 * @param derinlikCm kabinin derinliği (santim)
 * @returns {{on:Array, yuzler:Array<{ad:string,koseler:Array,parlaklik:number}>}}
 */
export function kutuGovdesi(
  enCm,
  boyCm,
  derinlikCm,
  pxCm,
  gorselW,
  gorselH,
  merkez = { x: 0.5, y: 0.5 },
  rollRad = 0,
  yawRad = 0,
  pitchRad = 0,
  mesafeCm = 0,
) {
  if (!pxCm || !(pxCm.x > 0) || !(pxCm.y > 0)) return null
  if (!(enCm > 0) || !(boyCm > 0) || !(gorselW > 0) || !(gorselH > 0)) return null
  if (!(derinlikCm > 0)) return null

  const yariW = (enCm * pxCm.x) / 2
  const yariH = (boyCm * pxCm.y) / 2
  const derinlik = derinlikCm * ((pxCm.x + pxCm.y) / 2)

  const roll = Number.isFinite(rollRad) ? rollRad : 0
  const yaw = kirp(yawRad, EN_COK_YAW)
  const pitch = kirp(pitchRad, EN_COK_PITCH)

  const d = Math.max(
    EN_YAKIN_ORAN * Math.max(yariW, yariH),
    (mesafeCm > 0 ? mesafeCm * ((pxCm.x + pxCm.y) / 2) : 0) || KAMERA_ORANI * Math.max(yariW, yariH),
  )
  const f = d

  const cr = Math.cos(roll)
  const sr = Math.sin(roll)
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)

  /* Ön yüz z = 0, arka yüz z = +derinlik (kameradan uzağa doğru). */
  const yerel = [
    [-yariW, -yariH],
    [yariW, -yariH],
    [yariW, yariH],
    [-yariW, yariH],
  ]
  const nokta = []
  for (const z of [0, derinlik]) {
    for (const [x, y] of yerel) {
      const p = dondur(x, y, z, cr, sr, cy, sy, cp, sp)
      const Z = p.Z + d
      if (!(Z > f * EN_AZ_Z)) return null
      nokta.push({ x: (f * p.X) / Z, y: (f * p.Y) / Z })
    }
  }

  /*
   * Ortalama ve kadraja sığdırma YALNIZCA ön yüze bakarak yapılıyor —
   * durusDortgeni'nin yaptığının aynısı. Aynı kaydırma sekiz noktaya birden
   * uygulanınca ön yüz tasarımın üstüne tam oturuyor.
   */
  const on = nokta.slice(0, 4)
  const ox = on.reduce((t, p) => t + p.x, 0) / 4
  const oy = on.reduce((t, p) => t + p.y, 0) / 4
  const kaydirilmis = nokta.map((p) => ({ x: p.x - ox, y: p.y - oy }))
  const onK = kaydirilmis.slice(0, 4)
  const nKapW = (2 * Math.max(...onK.map((p) => Math.abs(p.x)))) / gorselW
  const nKapH = (2 * Math.max(...onK.map((p) => Math.abs(p.y)))) / gorselH
  const mx = Math.min(1 - nKapW / 2, Math.max(nKapW / 2, merkez?.x ?? 0.5))
  const my = Math.min(1 - nKapH / 2, Math.max(nKapH / 2, merkez?.y ?? 0.5))
  const N = kaydirilmis.map((p) => ({ x: mx + p.x / gorselW, y: my + p.y / gorselH }))

  /* İşaretli alan — yüzün kameraya mı sırtını mı döndüğünü söylüyor. */
  const isaretliAlan = (k) =>
    k.reduce((t, p, i) => {
      const q = k[(i + 1) % 4]
      return t + (p.x * q.y - q.x * p.y)
    }, 0) / 2

  const onYon = Math.sign(isaretliAlan([N[0], N[1], N[2], N[3]]))
  if (!onYon) return null

  /* Yüzler dışa dönük sırayla; normalleri yerel eksende. */
  const tanim = [
    { ad: 'sol', i: [0, 3, 7, 4], n: [-1, 0, 0] },
    { ad: 'sag', i: [1, 5, 6, 2], n: [1, 0, 0] },
    { ad: 'ust', i: [0, 4, 5, 1], n: [0, -1, 0] },
    { ad: 'alt', i: [3, 2, 6, 7], n: [0, 1, 0] },
  ]
  const yuzler = []
  for (const y of tanim) {
    const k = y.i.map((i) => N[i])
    if (Math.sign(isaretliAlan(k)) !== onYon) continue /* sırtını dönmüş */
    const nk = dondur(y.n[0], y.n[1], y.n[2], cr, sr, cy, sy, cp, sp)
    const boy = Math.hypot(nk.X, nk.Y, nk.Z) || 1
    const dot = (nk.X / boy) * ISIK.x + (nk.Y / boy) * ISIK.y + (nk.Z / boy) * ISIK.z
    yuzler.push({ ad: y.ad, koseler: k, parlaklik: ORTAM + (1 - ORTAM) * Math.max(0, dot) })
  }

  return { on: N.slice(0, 4), arka: N.slice(4), yuzler }
}
