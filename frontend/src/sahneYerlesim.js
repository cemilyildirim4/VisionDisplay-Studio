/**
 * FOTOĞRAFA YERLEŞTİRME — TEK KAMERA, GERÇEK 3B.
 *
 * Tasarım fotoğrafın üstüne iki boyutlu bir şekil olarak değil, üç
 * boyutlu bir sahne olarak konuyor: ekranlar dik duran düzlemler,
 * aralarındaki açı gerçek bir dönüş ve hepsi TEK bir kameradan
 * izdüşürülüyor.
 *
 * NEDEN BÖYLE.
 *
 * Önceki yol her kanadı ayrı ayrı bir duvara oturtuyor, derinliği de
 * ufuk çizgisinden tahmin ediyordu. Ortak bir kamera olmadığı için
 * kanatların derinlikleri birbiriyle tutarsız çıkıyordu: içe dönük bir
 * L'de köşe EN UZAK nokta olmasına rağmen oradaki dikey kenar en uzun
 * çiziliyor, ekranlar oda köşesi gibi değil dışa çıkıntı gibi
 * görünüyordu. Tek kamerada bu kendiliğinden düzeliyor — uzak olan
 * küçük, yakın olan büyük çıkıyor, çünkü ikisi de aynı izdüşümden
 * geçiyor.
 *
 * KAMERA NEREDEN GELİYOR.
 *
 * Tek bir fotoğraftan odak uzaklığı ile derinliği AYRI AYRI çıkarmak
 * mümkün değil; ikisi birbirini götürür. Bu yüzden odak makul bir
 * değerde sabitleniyor ve tasarım, referans ölçeğinin geçerli olduğu
 * derinliğe konuyor (z = f / pxPerCm). Sonuç: tasarım fotoğrafta
 * referansın söylediği büyüklükte çıkıyor ve bütün kanatlar aynı
 * kameradan geçtiği için birbirleriyle tutarlı.
 *
 * Eksen düzeni: x sağa, y yukarı, z kameradan uzağa. Ekranlar zeminde
 * duruyor, yani alt kenarları y = 0.
 */

/** Makul bir odak: dar açı tasarımı yassı, geniş açı aşırı bombeli gösterir. */
const ODAK_CARPANI = 1.15

/**
 * Kamerayı kurar.
 *
 * @param {number} tuvalW tuval genişliği (px)
 * @param {number} tuvalH tuval yüksekliği (px)
 * @param {number} pxPerCm referans ölçeği — tuval pikseli / santim
 * @returns {{f:number, cx:number, cy:number, z0:number}|null}
 */
export function kameraKur(tuvalW, tuvalH, pxPerCm) {
  if (!(tuvalW > 0) || !(tuvalH > 0) || !(pxPerCm > 0)) return null
  const f = tuvalW * ODAK_CARPANI
  /* Referans ölçeğinin geçerli olduğu derinlik: orada 1 cm = pxPerCm px. */
  const z0 = f / pxPerCm
  return { f, cx: tuvalW / 2, cy: tuvalH / 2, z0 }
}

/**
 * Bir dünya noktasını tuvale düşürür.
 *
 * @param {{f:number,cx:number,cy:number}} k kamera
 * @param {{x:number,y:number,z:number}} p nokta (cm)
 * @returns {{x:number,y:number}|null} kameranın arkasında kalıyorsa null
 */
export function izdusum(k, p) {
  if (!k || !p || !(p.z > 1)) return null
  const x = k.cx + (k.f * p.x) / p.z
  const y = k.cy - (k.f * p.y) / p.z
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

/**
 * ZİNCİRİN ÜSTTEN GÖRÜNÜŞÜ.
 *
 * Ekranlar uç uca; her birinin kendi yönü var. Yön 0 ise ekran tam
 * karşıdan görünüyor (x ekseni boyunca uzanıyor); artı yön ekranın sağ
 * ucunu uzaklaştırıyor.
 *
 * @param {Array<{enCm:number}>} parcalar
 * @param {Array<number>} yonler her parçanın açısı (radyan)
 * @returns {Array<{a:{x:number,z:number}, b:{x:number,z:number}}>}
 */
export function zincirNoktalari(parcalar, yonler) {
  const noktalar = []
  let x = 0
  let z = 0
  for (let i = 0; i < parcalar.length; i++) {
    const en = parcalar[i]?.enCm || 0
    const t = yonler[i] || 0
    const a = { x, z }
    x += en * Math.cos(t)
    z += en * Math.sin(t)
    noktalar.push({ a, b: { x, z } })
  }
  return noktalar
}

/**
 * BAŞLANGIÇ YÖNLERİ — birleşimin tipinden.
 *
 * Zincir simetrik kuruluyor: köşeye tam çaprazdan bakılıyor. İçe dönük
 * köşede orta nokta uzakta kalıyor (oda köşesi), dışa dönükte yakında
 * (kolon köşesi).
 *
 * @param {number} adet parça sayısı
 * @param {number} aciDerece komşu iki parça arasındaki açı (180 = düz)
 * @param {string} yon 'ice' | 'disa'
 */
export function baslangicYonleri(adet, aciDerece, yon) {
  if (!(adet > 0)) return []
  /* Düz dizilimde bütün parçalar aynı yöne bakıyor. */
  if (!(aciDerece > 0) || aciDerece >= 179.5) return new Array(adet).fill(0)
  /* Her eklemde yön bu kadar değişiyor. */
  const kirilma = ((180 - aciDerece) * Math.PI) / 180
  /*
   * İŞARET: içe dönük köşede eklem UZAKTA olmalı (oda köşesi). Artı
   * yön ekranın sağ ucunu kameradan uzaklaştırdığı için içe dönükte
   * zincir önce uzaklaşıp sonra yaklaşıyor; işaret bu yüzden eksi.
   */
  const d = yon === 'disa' ? 1 : -1
  const yonler = []
  for (let i = 0; i < adet; i++) {
    /* Zincirin ortası sıfır: ilk yarı bir yana, ikinci yarı öbür yana. */
    yonler.push((i - (adet - 1) / 2) * kirilma * d)
  }
  return yonler
}

/**
 * HER PARÇANIN TUVALDEKİ DÖRT KÖŞESİ.
 *
 * Köşeler [solÜst, sağÜst, sağAlt, solAlt] sırasında; çizen taraf bunu
 * doğrudan homografiye veriyor. Bir parça kameranın arkasına düşerse
 * ya da yassılaşırsa o parça için null dönüyor — çizim onu atlıyor.
 *
 * @param {{f:number,cx:number,cy:number,z0:number}} kamera
 * @param {Array<{enCm:number, boyCm:number}>} parcalar
 * @param {Array<number>} yonler
 * @param {{x:number, z:number}} kaydir kullanıcının taşıması (cm)
 * @returns {Array<Array<{x:number,y:number}>|null>}
 */
export function parcaDortgenleri(kamera, parcalar, yonler, kaydir = { x: 0, z: 0 }) {
  if (!kamera || !Array.isArray(parcalar) || !parcalar.length) return []
  const ust = zincirNoktalari(parcalar, yonler)
  /*
   * ZİNCİR ORTALANIYOR: kullanıcı taşımadıysa tasarım fotoğrafın
   * ortasında duruyor. Ortalama, uçların ortası değil bütün noktaların
   * ortası — kırık zincirde göz merkezi orada görüyor.
   */
  const hepsi = [...ust.map((p) => p.a), ust[ust.length - 1].b]
  const ortX = hepsi.reduce((t, p) => t + p.x, 0) / hepsi.length
  const ortZ = hepsi.reduce((t, p) => t + p.z, 0) / hepsi.length

  /*
   * ZEMİN HİZASI.
   *
   * Ekranlar zemine basıyor ve kamera göz hizasında: tasarımın alt
   * kenarı tuvalin ortasının biraz altına düşsün diye kamera ekranın
   * yarı boyu kadar yukarıda sayılıyor. Böylece tasarım fotoğrafın
   * ortasında, dik duran bir nesne gibi görünüyor.
   */
  const enBuyukBoy = Math.max(...parcalar.map((p) => p.boyCm || 0), 1)
  const yTaban = -enBuyukBoy / 2

  return parcalar.map((p, i) => {
    const n = ust[i]
    if (!n) return null
    const boy = p.boyCm || 0
    if (!(boy > 0)) return null
    const dunya = (nokta, yukseklik) => ({
      x: nokta.x - ortX + (kaydir.x || 0),
      y: yTaban + yukseklik,
      z: kamera.z0 + (nokta.z - ortZ) + (kaydir.z || 0),
    })
    const kose = [
      izdusum(kamera, dunya(n.a, boy)),
      izdusum(kamera, dunya(n.b, boy)),
      izdusum(kamera, dunya(n.b, 0)),
      izdusum(kamera, dunya(n.a, 0)),
    ]
    if (kose.some((k) => !k)) return null
    /* Yassılaşan parça (neredeyse kenarından görünüyor) çizilmiyor. */
    const xs = kose.map((k) => k.x)
    const ys = kose.map((k) => k.y)
    const en = Math.max(...xs) - Math.min(...xs)
    const boyPx = Math.max(...ys) - Math.min(...ys)
    if (!(en > 2) || !(boyPx > 2)) return null
    return kose
  })
}

/**
 * TUTAMAKLARIN YERİ.
 *
 * Orta tutamak zincirin ortasında (taşımak için); kanat tutamakları
 * zincirin iki DIŞ ucunda (kanadı köşe etrafında döndürmek için).
 *
 * @returns {{orta:{x,y}|null, uclar:Array<{i:number, nokta:{x,y}}>}}
 */
export function tutamakYerleri(kamera, parcalar, yonler, kaydir = { x: 0, z: 0 }) {
  const dortgenler = parcaDortgenleri(kamera, parcalar, yonler, kaydir)
  const gecerli = dortgenler.filter(Boolean)
  if (!gecerli.length) return { orta: null, uclar: [] }
  /* Orta: bütün köşelerin ortalaması. */
  const tum = gecerli.flat()
  const orta = {
    x: tum.reduce((t, k) => t + k.x, 0) / tum.length,
    y: tum.reduce((t, k) => t + k.y, 0) / tum.length,
  }
  const uclar = []
  const ilk = dortgenler.findIndex(Boolean)
  const son = dortgenler.length - 1 - [...dortgenler].reverse().findIndex(Boolean)
  if (dortgenler[ilk]) {
    /* Sol kanadın dış ucu: sol üst ile sol altın ortası. */
    const d = dortgenler[ilk]
    uclar.push({ i: ilk, uc: 'sol', nokta: { x: (d[0].x + d[3].x) / 2, y: (d[0].y + d[3].y) / 2 } })
  }
  if (son !== ilk && dortgenler[son]) {
    const d = dortgenler[son]
    uclar.push({ i: son, uc: 'sag', nokta: { x: (d[1].x + d[2].x) / 2, y: (d[1].y + d[2].y) / 2 } })
  }
  return { orta, uclar }
}
