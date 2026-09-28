/**
 * NESNE AKLI — "burası boş mu" değil, "burası neyin yanı" diye sormak.
 *
 * Yerleştirme motoru şimdiye kadar nesneleri tek bir maskede eritiyordu:
 * bir piksel ya doluydu ya boş. Bu, fotoğrafı gören ama ANLAMAYAN bir
 * yaklaşımdı — koltukla arabayı, televizyonla saksıyı aynı sayıyordu.
 *
 * Oysa bir LED ekranın nereye konacağını belirleyen şey tam olarak
 * çevresindeki cisimlerin ne olduğu. Ekran insanların BAKTIĞI yere konur:
 *
 *   • TELEVİZYON/EKRAN  → odada ekranın durduğu yer zaten orası. En güçlü
 *     işaret; müşteri çoğu zaman var olanın yerine koymak istiyor.
 *   • KOLTUK / SANDALYE / MASA → oturma grubu. İnsanlar burada oturup bir
 *     yöne bakıyor; ekran oturma grubunun ÜSTÜNDEKİ ya da KARŞISINDAKİ
 *     duvara gelir, grubun kendi üzerine değil.
 *   • ARAÇLAR (araba, otobüs, motosiklet, bisiklet, tren) → sokak sahnesi.
 *     Ekran araç yüksekliğinin ÜSTÜNE gelir; yola ya da aracın üstüne
 *     değil. Bilbord mantığı budur.
 *   • İNSAN → asla üstüne gelmez. Ayrıca insanların bulunduğu şerit,
 *     ekranın görülmesi istenen yönü söylüyor.
 *   • SAKSI / ŞİŞE → küçük eşya; üstüne denk gelmesi hata ama ağır değil,
 *     çünkü taşınabilir.
 *   • CANLILAR (kedi, köpek, at…) → geçici; hafif ceza yeter.
 *
 * KURAL DEĞİL PUAN: hiçbir nesne bir yeri yasaklamıyor, yalnızca sırasını
 * değiştiriyor. Fotoğrafta hiçbir tanıdık cisim yoksa bu katman sıfır puan
 * veriyor ve karar geometriye (düzlük, merkez, göz hizası, duvar payı)
 * kalıyor — yani "mantıklı bir yer yoksa" sistem yine de bir yer buluyor.
 */

import { VOC } from './nesneBul.js'

/** Oturma grubu: insanların oturduğu ve bir yöne baktığı mobilya. */
const OTURMA = new Set([VOC.KOLTUK, VOC.SANDALYE, VOC.MASA])

/** Tekerlekli her şey — sokak sahnesinin işareti. */
const ARAC = new Set([VOC.ARABA, VOC.OTOBUS, VOC.MOTOSIKLET, VOC.BISIKLET, VOC.TREN])

/** Geçici canlılar. */
const CANLI = new Set([VOC.KEDI, VOC.KOPEK, VOC.AT, VOC.INEK, VOC.KOYUN, VOC.KUS])

/** Taşınabilir küçük eşya. */
const UFAK = new Set([VOC.SAKSI, VOC.SISE])

/** İki kutunun birleşimi. */
function birlestir(a, b) {
  if (!a) return b
  if (!b) return a
  const x0 = Math.min(a.x, b.x)
  const y0 = Math.min(a.y, b.y)
  const x1 = Math.max(a.x + a.w, b.x + b.w)
  const y1 = Math.max(a.y + a.h, b.y + b.h)
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, alan: (a.alan || 0) + (b.alan || 0) }
}

/** Dörtgenin kadrajdaki kutusu. */
function kutu(koseler) {
  const xs = koseler.map((k) => k.x)
  const ys = koseler.map((k) => k.y)
  const x0 = Math.min(...xs)
  const y0 = Math.min(...ys)
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 }
}

/** İki kutunun kesişimi, BİRİNCİSİNİN alanına oran olarak. */
function ortusme(a, b) {
  const gen = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const yuk = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  if (!(gen > 0) || !(yuk > 0)) return 0
  const alan = a.w * a.h
  return alan > 0 ? (gen * yuk) / alan : 0
}

/** Yatayda örtüşme payı — "aynı hizada mı" sorusu. */
function yatayOrtusme(a, b) {
  const gen = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  return a.w > 0 ? Math.max(0, gen) / a.w : 0
}

/**
 * Bölge listesini sahne okumasına çevirir.
 *
 * Tek tek cisimler yerine ANLAMLI ÖBEKLER üretiliyor: bütün koltuk ve
 * sandalyeler tek bir "oturma grubu", bütün araçlar tek bir "araç bandı".
 * Karar bunlara bakarak veriliyor; tek tek mobilyayla uğraşmak gereksiz.
 *
 * @param {Array<{sinif:number,x:number,y:number,w:number,h:number,alan:number}>|null} bolgeler
 */
export function sahneOkumasi(bolgeler) {
  if (!Array.isArray(bolgeler) || !bolgeler.length) return null
  let oturma = null
  let arac = null
  let ekran = null
  const insanlar = []
  const ufaklar = []
  const canlilar = []
  for (const b of bolgeler) {
    if (OTURMA.has(b.sinif)) oturma = birlestir(oturma, b)
    else if (ARAC.has(b.sinif)) arac = birlestir(arac, b)
    else if (b.sinif === VOC.EKRAN) {
      if (!ekran || b.alan > ekran.alan) ekran = b
    } else if (b.sinif === VOC.INSAN) insanlar.push(b)
    else if (UFAK.has(b.sinif)) ufaklar.push(b)
    else if (CANLI.has(b.sinif)) canlilar.push(b)
  }
  const varMi = oturma || arac || ekran || insanlar.length || ufaklar.length || canlilar.length
  if (!varMi) return null
  return { oturma, arac, ekran, insanlar, ufaklar, canlilar }
}

/**
 * Bir aday karenin nesnelere göre puan farkı ve gerekçesi.
 *
 * @param {Array<{x:number,y:number}>} koseler  0–1 oranlı dört köşe
 * @param {object|null} okuma  sahneOkumasi çıktısı
 * @returns {{delta:number, sebep:string|null}}
 */
export function nesnePuani(koseler, okuma) {
  if (!okuma || !Array.isArray(koseler) || koseler.length !== 4) return { delta: 0, sebep: null }
  const k = kutu(koseler)
  let delta = 0
  let sebep = null
  /* En güçlü gerekçe yazılıyor; zayıf olan sonra gelirse ezmiyor. */
  let agirlik = 0
  const gerekce = (puan, metin) => {
    if (Math.abs(puan) > agirlik) {
      agirlik = Math.abs(puan)
      sebep = metin
    }
  }

  /* ---- 1) FOTOĞRAFTAKİ EKRAN: aranan yer büyük olasılıkla burası. */
  if (okuma.ekran) {
    const o = ortusme(k, okuma.ekran)
    if (o > 0.4) {
      delta += 30
      gerekce(30, 'Fotoğraftaki ekranın yeri')
    }
  }

  /* ---- 2) OTURMA GRUBU: üstü/karşısı iyi, üzeri kötü. */
  if (okuma.oturma) {
    const o = ortusme(k, okuma.oturma)
    if (o > 0.25) {
      /* Ekran koltuğun içine gömülmez. */
      delta -= Math.round(Math.min(1, o) * 26)
      gerekce(-26, 'Oturma grubunun üzerine denk geliyor')
    } else {
      const ustunde = k.y + k.h <= okuma.oturma.y + okuma.oturma.h * 0.35
      const hizada = yatayOrtusme(k, okuma.oturma) > 0.3
      if (ustunde && hizada) {
        delta += 22
        gerekce(22, 'Oturma grubunun karşısında, göz hizasında')
      }
    }
  }

  /* ---- 3) ARAÇ BANDI: sokak sahnesi, ekran araçların üstünde. */
  if (okuma.arac) {
    const o = ortusme(k, okuma.arac)
    if (o > 0.15) {
      delta -= Math.round(Math.min(1, o) * 30)
      gerekce(-30, 'Aracın üzerine denk geliyor')
    } else if (k.y + k.h <= okuma.arac.y + okuma.arac.h * 0.2) {
      delta += 16
      gerekce(16, 'Araç yüksekliğinin üstünde')
    }
  }

  /* ---- 4) İNSAN: asla üstüne, ama yakını iyi (bakılan yer orası). */
  let insanOrt = 0
  for (const i of okuma.insanlar) insanOrt = Math.max(insanOrt, ortusme(k, i))
  if (insanOrt > 0.1) {
    delta -= Math.round(Math.min(1, insanOrt) * 34)
    gerekce(-34, 'İnsanın üzerine denk geliyor')
  } else if (okuma.insanlar.length) {
    /*
     * İnsanların baş hizasının üstü: hem kimseyi kapatmıyor hem de
     * bakışın doğal olarak gittiği yükseklik orası.
     */
    const enUst = Math.min(...okuma.insanlar.map((i) => i.y))
    const yakin = okuma.insanlar.some((i) => yatayOrtusme(k, i) > 0.2)
    if (yakin && k.y + k.h <= enUst + 0.08) {
      delta += 12
      gerekce(12, 'İnsan trafiğinin üstünde, görüş alanında')
    }
  }

  /* ---- 5) KÜÇÜK EŞYA VE CANLILAR: hafif ceza, taşınabilirler. */
  for (const u of okuma.ufaklar) {
    const o = ortusme(k, u)
    if (o > 0.08) delta -= Math.round(Math.min(1, o) * 12)
  }
  for (const c of okuma.canlilar) {
    const o = ortusme(k, c)
    if (o > 0.15) delta -= 10
  }

  return { delta, sebep }
}
