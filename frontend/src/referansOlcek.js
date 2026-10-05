import { duvarDunyasi, dunyaDortgeni } from './homografi.js'

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
 * REFERANS ÇİZGİSİNİN GÖRSELDEKİ EĞİMİ.
 *
 * İki noktadan çıkarılabilen tek açı budur: çizginin DÜZLEM İÇİ dönmesi.
 *   açı = atan2(dy, dx)   (orijinal görsel pikselinde)
 *
 * PERSPEKTİF BURADAN ÇIKMAZ. İki nokta bir yön ve bir uzunluk verir,
 * derinlik hakkında hiçbir şey vermez; kaçış noktası için ya iki ayrı
 * paralel çizgi çifti ya da dört köşe gerekir. Dörtgenin 8 serbestlik
 * derecesi varken iki nokta 4 sayı veriyor. Bu yüzden kutu referansın
 * EĞİMİNDE doğuyor, perspektifini kullanıcı köşelerden veriyor.
 *
 * Açı normalize koordinatta DEĞİL, görsel pikselinde hesaplanıyor: normalize
 * uzayda x ve y farklı ölçeklerle bölündüğü için oradaki açı gerçek açı
 * değil.
 *
 * kutuAci, kutuya uygulanacak dönme: çizgi yataya yakınsa kutunun ENİ,
 * dikeye yakınsa BOYU çizgiye paralel oluyor. Böylece kapı yüksekliğini
 * referans alan kullanıcıda kutu 90 derece yan dönmüyor.
 */
export function referansAcisi(n1, n2, gorselW, gorselH) {
  if (!gecerliNokta(n1) || !gecerliNokta(n2)) return null
  if (!(gorselW > 0) || !(gorselH > 0)) return null
  const dx = (n2.x - n1.x) * gorselW
  const dy = (n2.y - n1.y) * gorselH
  if (!dx && !dy) return null
  /* Çizginin yönü yok: açı 180°'de tekrar ediyor, (-90°, 90°] aralığına indiriliyor. */
  let rad = Math.atan2(dy, dx)
  if (rad > Math.PI / 2) rad -= Math.PI
  if (rad <= -Math.PI / 2) rad += Math.PI
  const dikeyeYakin = Math.abs(rad) > Math.PI / 4
  const kutuAci = dikeyeYakin ? rad - Math.sign(rad) * (Math.PI / 2) : rad
  return { rad, derece: (rad * 180) / Math.PI, kutuAci, dikeyeYakin }
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
export function kutuDortgeni(enCm, boyCm, pxCm, gorselW, gorselH, merkez = { x: 0.5, y: 0.5 }, aciRad = 0) {
  if (!pxCm || !(pxCm.x > 0) || !(pxCm.y > 0)) return null
  if (!(enCm > 0) || !(boyCm > 0) || !(gorselW > 0) || !(gorselH > 0)) return null
  const pxW = enCm * pxCm.x
  const pxH = boyCm * pxCm.y
  const a = Number.isFinite(aciRad) ? aciRad : 0
  const cos = Math.cos(a)
  const sin = Math.sin(a)

  /*
   * DÖRTGEN ÖNCE GÖRSEL PİKSELİNDE KURULUYOR, SONRA NORMALİZE EDİLİYOR.
   *
   * Normalize uzayda x ve y farklı sayılara bölünüyor; orada uygulanan bir
   * dönme dikdörtgeni EĞREK yapar — dik açılar bozulur, kenar uzunlukları
   * değişir. Köşeler bu yüzden piksel uzayında döndürülüp öyle normalize
   * ediliyor.
   */
  const yariW = pxW / 2
  const yariH = pxH / 2
  const yerel = [
    { x: -yariW, y: -yariH },
    { x: yariW, y: -yariH },
    { x: yariW, y: yariH },
    { x: -yariW, y: yariH },
  ].map((p) => ({ x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos }))

  /* Dönmüş dörtgenin kapsayıcı kutusu — merkezi kadrajın içinde tutmak için. */
  const nKapW = (2 * Math.max(...yerel.map((p) => Math.abs(p.x)))) / gorselW
  const nKapH = (2 * Math.max(...yerel.map((p) => Math.abs(p.y)))) / gorselH
  const mx = Math.min(1 - nKapW / 2, Math.max(nKapW / 2, merkez?.x ?? 0.5))
  const my = Math.min(1 - nKapH / 2, Math.max(nKapH / 2, merkez?.y ?? 0.5))

  return {
    pxW,
    pxH,
    aciRad: a,
    koseler: yerel.map((p) => ({ x: mx + p.x / gorselW, y: my + p.y / gorselH })),
    tasiyor: nKapW > 1 || nKapH > 1,
  }
}

/*
 * DÖRT KÖŞE REFERANSI — PERSPEKTİF.
 *
 * İki nokta ölçek ve eğim veriyor ama PERSPEKTİF vermiyor: bir yön ve bir
 * uzunluk derinlik hakkında hiçbir şey söylemez. Perspektif için ölçüsü
 * bilinen bir DİKDÖRTGENİN dört köşesi gerekiyor — o zaman düzlemin
 * homografisi tam olarak çıkıyor (8 bilinmeyen, 4 nokta çifti = 8 denklem).
 *
 * Alternatif, iki paralel çizgiden kaçış noktası çıkarmaktı; o yol
 * "dikeyler görüntüde paralel" varsayımı gerektiriyor ve çizgiler görüntüde
 * paralele yaklaştığında kaçış noktası sonsuza kaçıp sayısal olarak
 * patlıyor. Dört köşe varsayımsız ve kararlı.
 *
 * DÜNYA BİRİMİ SANTİM. Projede metre de kullanılıyor ama referans ve kutu
 * santim üzerinden konuşuyor; çevrimi tek yerde tutmak yerine burada hiç
 * çevirmiyoruz.
 *
 * Köşeler normalize fotoğraf koordinatında geliyor, düzlem GÖRSEL
 * PİKSELİNDE kuruluyor: normalize uzayda x ve y farklı ölçeklerle
 * bölündüğü için oradaki açılar ve oranlar gerçek değil.
 */
export function referansDuzlemi(koseler, enCm, boyCm, gorselW, gorselH) {
  if (!Array.isArray(koseler) || koseler.length !== 4) return null
  if (!(gorselW > 0) || !(gorselH > 0)) return null
  const en = santimOku(enCm)
  const boy = santimOku(boyCm)
  if (en === null || boy === null) return null
  if (koseler.some((k) => !gecerliNokta(k))) return null
  const px = koseler.map((k) => ({ x: k.x * gorselW, y: k.y * gorselH }))
  /*
   * ÇOK İNCE DÖRTGEN REDDEDİLİYOR.
   *
   * duvarDunyasi yalnızca alan/kapsayıcı oranına bakıyor; 100 × 1 piksellik
   * bir şerit o denetimi geçiyor çünkü alanı kapsayıcısının tamamı. Oysa
   * böyle bir referansta 1 piksellik işaretleme hatası homografiyi uçuruyor.
   * Kısa kenar için iki nokta referansındakiyle aynı eşik kullanılıyor.
   */
  const kenar = [0, 1, 2, 3].map((i) => {
    const a = px[i]
    const b = px[(i + 1) % 4]
    return Math.hypot(b.x - a.x, b.y - a.y)
  })
  if (Math.min(...kenar) < EN_AZ_PIKSEL) return null
  const dunya = duvarDunyasi(px, en, boy)
  if (!dunya) return null
  return { dunya, enCm: en, boyCm: boy, gorselW, gorselH, enKisaKenarPx: Math.min(...kenar) }
}

/**
 * Düzlemin ORTASI (dünya santimi) — kutunun varsayılan yeri.
 */
export function duzlemMerkezi(duzlem) {
  if (!duzlem) return null
  return { x: duzlem.enCm / 2, y: duzlem.boyCm / 2 }
}

/**
 * Normalize fotoğraf noktası → düzlem üstünde santim.
 */
export function duzlemeDusur(duzlem, nokta) {
  if (!duzlem || !gecerliNokta(nokta)) return null
  return duzlem.dunya.geri(nokta.x * duzlem.gorselW, nokta.y * duzlem.gorselH)
}

/**
 * Düzlem üstüne oturan kutunun dörtgeni — normalize fotoğraf koordinatında.
 *
 * Kutu dünyada bir DİKDÖRTGEN; fotoğrafta perspektif yüzünden yamuk
 * görünüyor ve bu doğru olan. Dört köşe ayrı ayrı dönüştürülüyor: tek bir
 * ölçekle çarpmak perspektifi yok sayardı.
 *
 * merkezDunya düzlemin dışına taşabilir — kutu referans dikdörtgeninden
 * büyükse bu kaçınılmaz ve ölçüyü bozmamak için engellenmiyor.
 */
export function duzlemdeKutu(duzlem, enCm, boyCm, merkezDunya) {
  if (!duzlem || !(enCm > 0) || !(boyCm > 0)) return null
  const m = merkezDunya || duzlemMerkezi(duzlem)
  if (!m || !Number.isFinite(m.x) || !Number.isFinite(m.y)) return null
  const k = dunyaDortgeni(duzlem.dunya, m.x - enCm / 2, m.y - boyCm / 2, enCm, boyCm)
  if (!k) return null
  const n = k.map((q) => ({ x: q.x / duzlem.gorselW, y: q.y / duzlem.gorselH }))
  if (n.some((q) => !Number.isFinite(q.x) || !Number.isFinite(q.y))) return null
  return {
    koseler: n,
    dunyaMerkez: m,
    /* Kadrajın tamamen dışına düşen kutu kullanıcıya bildirilsin. */
    tasiyor: n.some((q) => q.x < 0 || q.x > 1 || q.y < 0 || q.y > 1),
  }
}
