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
