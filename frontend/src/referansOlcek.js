/*
 * İKİ NOKTA REFERANSI → GERÇEK PİKSEL/SANTİM.
 *
 * Tek bir fotoğraf kendi başına UZUNLUK taşımaz, açı taşır: 2 m uzaktaki 1
 * m'lik nesne, 4 m uzaktaki 2 m'lik nesneyle piksel piksel aynıdır. Bu
 * belirsizliği kırmanın tek dürüst yolu, fotoğrafın İÇİNDE uzunluğu bilinen
 * bir şey göstermektir.
 *
 * Kullanıcı ölçüm düzleminde iki nokta işaretliyor ve aralarındaki gerçek
 * uzunluğu yazıyor. Ölçek buradan çıkıyor:
 *
 *   pxPerCm = ikiNoktaPikselMesafesi / gerçekUzunlukCm
 *
 * Tahmin yok: odak uzaklığı, EXIF, kamera modeli, görüş açısı, sabit px/cm
 * ya da CSS birimi KULLANILMIYOR. Veri yoksa ölçek de yok, null dönüyor.
 *
 * ÖLÇEK YERELDİR. Perspektifli bir fotoğrafta px/cm her yerde aynı değil:
 * uzaktaki bir metre daha az piksel eder. İki nokta yalnızca kendi
 * civarındaki ölçeği verir. Bu yüzden referans, yerleşim alanıyla AYNI
 * DÜZLEMDE ve ona mümkün olduğunca YAKIN seçilmeli; kutu da varsayılan
 * olarak referans çizgisinin ortasına kuruluyor (bkz. refOrtaNokta).
 *
 * KOORDİNAT UZAYI. Noktalar normalize FOTOĞRAF koordinatında (0..1)
 * tutuluyor, tuval pikselinde değil. Tuval pikseli yakınlaştırmaya ve pencere
 * boyutuna bağlı; onunla hesaplanan ölçek pencere büyüyünce değişirdi.
 * Mesafe her zaman ORİJİNAL GÖRSEL PİKSELİNDE hesaplanıyor.
 */

/*
 * İki nokta birbirine çok yakınsa ölçek güvenilmez: 10 piksellik bir
 * referansta 1 piksellik işaretleme hatası %10 ölçek hatası demek. Alt sınır
 * 40 piksel; tipik bir fotoğrafta bu zaten çok kısa bir çizgi.
 */
export const EN_AZ_PIKSEL = 40

/** Virgüllü ya da noktalı yazımı okur; geçersizse null. */
export function santimOku(metin) {
  const v = Number(String(metin).replace(',', '.'))
  return v > 0 && Number.isFinite(v) ? v : null
}

/**
 * İki normalize noktanın ORİJİNAL GÖRSEL PİKSELİNDEKİ uzaklığı.
 *
 * Normalize koordinat en/boy oranını taşımaz: (0,0)-(1,1) arası fotoğrafın
 * köşegenidir ve yatay/dikey farklı sayıda piksel eder. Bu yüzden her eksen
 * KENDİ boyutuyla çarpılıyor.
 */
export function ikiNoktaPikselMesafesi(n1, n2, gorselW, gorselH) {
  if (!gecerliNokta(n1) || !gecerliNokta(n2)) return null
  if (!(gorselW > 0) || !(gorselH > 0)) return null
  const dx = (n2.x - n1.x) * gorselW
  const dy = (n2.y - n1.y) * gorselH
  return Math.hypot(dx, dy)
}

function gecerliNokta(n) {
  return !!n && Number.isFinite(n.x) && Number.isFinite(n.y)
}

/**
 * Referans ölçeği.
 *
 * @param n1,n2      normalize fotoğraf koordinatı (0..1)
 * @param gercekCm   iki nokta arasındaki gerçek uzunluk, santim
 * @param gorselW/H  fotoğrafın gerçek çözünürlüğü (naturalWidth/Height)
 * @returns {{pxPerCm:{x:number,y:number}, pxMesafe:number, gercekCm:number}}
 *          ya da {pxPerCm:null, sebep:string}
 *
 * pxPerCm.x ve .y EŞİT dönüyor. Kare piksel varsayımı değil, tanım gereği:
 * elimizde tek bir uzunluk var, iki eksen için ayrı ölçek çıkaracak veri yok.
 * İki eksen ayrı ayrı ölçülmek isteniyorsa iki ayrı referans gerekir.
 */
export function referansOlcek(n1, n2, gercekCm, gorselW, gorselH) {
  if (!gecerliNokta(n1) || !gecerliNokta(n2)) return { pxPerCm: null, sebep: 'noktaYok' }
  if (!(gorselW > 0) || !(gorselH > 0)) return { pxPerCm: null, sebep: 'gorselYok' }
  const cm = santimOku(gercekCm)
  if (cm === null) return { pxPerCm: null, sebep: 'uzunlukYok' }
  const pxMesafe = ikiNoktaPikselMesafesi(n1, n2, gorselW, gorselH)
  if (!(pxMesafe > 0)) return { pxPerCm: null, sebep: 'noktaYok' }
  if (pxMesafe < EN_AZ_PIKSEL) return { pxPerCm: null, sebep: 'cokKisa', pxMesafe }
  const oran = pxMesafe / cm
  return { pxPerCm: { x: oran, y: oran }, pxMesafe, gercekCm: cm }
}

/**
 * Referans çizgisinin orta noktası — kutunun varsayılan yeri.
 *
 * Ölçek yerel olduğu için kutu, ölçeğin ölçüldüğü yere en yakın noktada
 * kurulmalı. Ortaya koymak iki uçtan da eşit uzaklıkta demek.
 */
export function refOrtaNokta(n1, n2) {
  if (!gecerliNokta(n1) || !gecerliNokta(n2)) return { x: 0.5, y: 0.5 }
  return { x: (n1.x + n2.x) / 2, y: (n1.y + n2.y) / 2 }
}

/**
 * Kutunun başlangıç dörtgeni — normalize fotoğraf koordinatında.
 *
 * Mutlak büyüklük doğrudan fiziksel hesaptan geliyor:
 *   kutuPx = cm × pxPerCm
 * "Fotoğrafın yüzde şu kadarı" gibi bir varsayılan boyut YOK.
 *
 * Kadraja sığmıyorsa KÜÇÜLTÜLMÜYOR: küçültmek ölçüyü yalanlamak olurdu.
 * Olduğu gibi dönüyor ve `tasiyor` ile bildiriliyor.
 */
export function kutuDortgeni(enCm, boyCm, pxCm, gorselW, gorselH, merkez = { x: 0.5, y: 0.5 }) {
  if (!pxCm || !(pxCm.x > 0) || !(pxCm.y > 0)) return null
  if (!(enCm > 0) || !(boyCm > 0) || !(gorselW > 0) || !(gorselH > 0)) return null
  const pxW = enCm * pxCm.x
  const pxH = boyCm * pxCm.y
  const nW = pxW / gorselW
  const nH = pxH / gorselH
  /* Merkez, dörtgen fotoğrafın dışına taşmayacak biçimde kısıtlanıyor. */
  const mx = Math.min(1 - nW / 2, Math.max(nW / 2, merkez?.x ?? 0.5))
  const my = Math.min(1 - nH / 2, Math.max(nH / 2, merkez?.y ?? 0.5))
  return {
    pxW,
    pxH,
    koseler: [
      { x: mx - nW / 2, y: my - nH / 2 },
      { x: mx + nW / 2, y: my - nH / 2 },
      { x: mx + nW / 2, y: my + nH / 2 },
      { x: mx - nW / 2, y: my + nH / 2 },
    ],
    tasiyor: nW > 1 || nH > 1,
  }
}
