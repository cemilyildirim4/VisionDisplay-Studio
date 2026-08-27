/**
 * KULLANICININ KENDİ FOTOĞRAFI — mekân olarak.
 *
 * Hazır mekânlarda ekranın nereye oturacağını (panel) ve o alanın kaç metre
 * olduğunu biz elle kalibre ediyoruz. Müşterinin kendi fotoğrafında böyle bir
 * bilgi yok; ikisi de fotoğrafın kendisinden çıkarılmak zorunda:
 *
 *   • YER — kamera özelliğindeki yüzey bulucu (duvarBul.js) kullanılıyor.
 *     Aradığı şey aynı: kalabalık olmayan, düz ve tek düze bir alan. Bulamazsa
 *     fotoğrafın ortası öneriliyor; kullanıcı zaten sürükleyerek taşıyabilir.
 *
 *   • ÖLÇEK — fotoğraftan çıkarılamaz. Bir duvarın kaç metre olduğunu görüntü
 *     söylemez; bunun için derinlik ya da bilinen bir referans gerekir. O
 *     yüzden kullanıcıya SORULUYOR: "bu alan kaç metre?" Varsayılan 4 m,
 *     tipik bir vitrin/duvar açıklığı. Tahmin edip doğruymuş gibi göstermek
 *     yerine sormak daha dürüst.
 *
 * Dönen kayıt sahneler.js'teki hazır mekânlarla AYNI biçimde; böylece çizim
 * yolu (fotoYerlesim, PanoFoto, yakınlık, kiosk gövdesi, sürükleme) hiç
 * değişmeden çalışıyor.
 */

import { uygunYuzeyBul } from './duvarBul.js'

/** Kullanıcı başka bir şey söylemedikçe önerilen alanın gerçek genişliği. */
export const VARSAYILAN_ALAN_M = 4

/** Kabul edilen dosya türleri. */
export const MEKAN_TURLERI = ['image/jpeg', 'image/png', 'image/webp']

/** Fotoğraf için üst sınır (MB) — içerik görseliyle aynı kural. */
export const MEKAN_EN_COK_MB = 60

/**
 * Fotoğrafı çözümleyip mekân kaydı üretir.
 *
 * @param {string} url    blob adresi
 * @param {HTMLImageElement} gorsel yüklenmiş görsel
 * @param {number} oran   tasarımın en/boy oranı — öneri buna göre aranır
 * @param {number} alanM  önerilen alanın gerçek genişliği (metre)
 */
export function ozelMekanKaydi(url, gorsel, oran, alanM = VARSAYILAN_ALAN_M) {
  const W = gorsel.naturalWidth
  const H = gorsel.naturalHeight
  if (!W || !H) return null

  /*
   * Yüzey bulucu videoWidth/width okuyor; <img> öğesinin `width`i sayfadaki
   * yerleşim genişliğidir ve doğru değeri vermez. Bu yüzden bir tuvale
   * çiziliyor.
   */
  const tuval = document.createElement('canvas')
  tuval.width = W
  tuval.height = H
  tuval.getContext('2d').drawImage(gorsel, 0, 0)

  const enBoy = oran > 0 ? oran : 16 / 9
  let yer = null
  try {
    yer = uygunYuzeyBul(tuval, enBoy)
  } catch {
    yer = null // okunamayan görüntü: öneri yok, orta kullanılır
  }

  const genislik = yer ? yer.w * W : W * 0.32
  const yukseklik = Math.max(8, genislik / enBoy)
  const yariW = genislik / 2
  const yariH = yukseklik / 2

  /*
   * Panel, yüzey bulucunun önerdiği dikdörtgenin TA KENDİSİ — hazır
   * mekânlardaki gibi ortaya çekilmiyor. Orada fotoğraf tuvali kaplamak
   * zorunda olduğu için panelin kenara yakın olması sorun oluyordu; burada
   * fotoğraf sığdırılıp tamamı gösterildiği için böyle bir kısıt yok.
   */
  const merkezY = Math.max(
    yariH,
    Math.min(H - yariH, yer ? (yer.y + yer.h / 2) * H : H / 2),
  )
  const merkezX = Math.max(
    yariW,
    Math.min(W - yariW, yer ? (yer.x + yer.w / 2) * W : W / 2),
  )

  return {
    id: 'ozel',
    ad: 'scene.custom',
    dosya: url,
    kaynak: { w: W, h: H },
    panel: {
      x0: Math.round(merkezX - yariW),
      y0: Math.round(merkezY - yariH),
      x1: Math.round(merkezX + yariW),
      y1: Math.round(merkezY + yariH),
    },
    panelEnM: alanM,
    maskeli: false,
    kiosk: true,
    /* Kırpma ve yakınlaştırma yok: fotoğrafın tamamı görünür. */
    tamGorunsun: true,
    zoomlu: false,
    /*
     * Zemin çizgisi: önerilen alanın ALT kenarı — düz alanın bittiği yer,
     * çoğunlukla duvarın zeminle buluştuğu hizadır. Öneri yoksa panelin
     * 1,6 m altı; hazır mekânlarda kullanılan kuralın aynısı.
     */
    zeminY: yer
      ? Math.round(Math.min(H - 2, (yer.y + yer.h) * H))
      : Math.round(merkezY + (1.6 * genislik) / alanM),
    /** Öneri ne kadar güvenilir — arayüz zayıf öneriyi kullanıcıya söyler. */
    guven: yer ? yer.guven : 0,
  }
}
