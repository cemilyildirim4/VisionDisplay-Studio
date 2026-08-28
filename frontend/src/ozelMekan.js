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

import { uygunYuzeyBul, zeminCizgisiBul } from './duvarBul.js'
import { perspektifAcisi } from './aciBul.js'
import { nesneHaritasi } from './nesneBul.js'
import { derinlikHaritasi } from './derinlikBul.js'
import { ekranYuzeyiBul } from './dortgenBul.js'
import { duzlemBolgesiBul } from './duzlemBolge.js'

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
export async function ozelMekanKaydi(url, gorsel, oran, alanM = VARSAYILAN_ALAN_M) {
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

  /*
   * Zemin çizgisi ÖNCE bulunuyor: yüzey araması onu bir sınır olarak
   * kullanıyor (ekran zeminin altına konmaz). Eskiden sonra bulunuyordu ve
   * yalnızca kioskun oturacağı yeri belirliyordu.
   */
  let zeminOran = null
  try {
    zeminOran = zeminCizgisiBul(tuval)
  } catch {
    zeminOran = null
  }

  /*
   * (eski tarayıcı, kesik bağlantı) sessizce eski sezgisel ölçütlere
   * dönülüyor — özellik kaybolur, uygulama durmaz.
   */
  let nesneler = null
  try {
    nesneler = await nesneHaritasi(tuval)
  } catch (e) {
    nesneler = null
  }

  /*
   * DERİNLİK. Nesne tanıma 'ne olduğunu', derinlik 'nerede ve ne biçimde
   * olduğunu' söylüyor. Yerleştirmenin asıl ölçütü ikincisi: düz bir yüzey
   * mi, önünde bir şey var mı. İkisi de olmazsa eski sezgisel ölçütler.
   */
  let derinlik = null
  try {
    derinlik = await derinlikHaritasi(tuval)
  } catch {
    derinlik = null
  }

  /*
   * OTOMATİK YÜZEY TARAMASI ÖNERİDEN ÇIKARILDI.
   *
   * Kullanıcı "Önerilen yere koy" düğmesinin KAMERADA OTURT ile aynı
   * davranmasını istedi. Yüzey tarayıcıları (dortgenBul.js, duzlemBolge.js)
   * duruyor; perspektifli yerleşim artık manuel dört köşe kipiyle yapılıyor
   * — orada sonuç kesin ve kullanıcının denetiminde.
   */
  const yuzey = null

  let yer = null
  try {
    /*
     * KAMERA OTURTMA İLE BİREBİR AYNI ÇAĞRI (bkz. Oturtma.jsx):
     * uygunYuzeyBul(kare, tasarım oranı) — fazladan ölçüt yok.
     *
     * Fotoğrafa özgü ek ölçütler (zemin/gökyüzü elemesi, nesne maskesi,
     * derinlik düzlemi) duvarBul.js içinde duruyor ve seçeneklerle açılıyor;
     * burada kullanılmıyorlar.
     */
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
     * Zemin çizgisi FOTOĞRAFTAN okunuyor (zeminCizgisiBul): duvarın bittiği
     * yatay kırılma. Kiosk hep buraya oturuyor — ayaklı ise ayakların dibi,
     * ayaksız ise ekranın dibi.
     *
     * Belirgin bir kırılma yoksa önerilen alanın alt kenarına düşülüyor; o da
     * düz yüzeyin bittiği yerdir, en azından tutarlı bir tahmindir.
     * Her hâlükârda panelin altında kalmak zorunda: ekranın içinden geçen bir
     * zemin çizgisi kiosku duvarın içine gömerdi.
     */
    zeminY: zeminY(zeminOran, H, merkezY + yariH, yer),
    /** Öneri ne kadar güvenilir — arayüz zayıf öneriyi kullanıcıya söyler. */
    guven: yer ? yer.guven : 0,
    /*
     * BAKIŞ AÇISI (derece) — fotoğrafın kaçış noktasından ölçülüyor.
     * Öneri uygulanınca ekran bu açıya çevriliyor; kullanıcı isterse elle
     * değiştirebiliyor. Bkz. aciBul.js.
     */
    aci: aciOlc(tuval),
    /** Modelin fotoğrafta gördüğü nesneler — arayüz bunu kullanıcıya yazıyor. */
    nesneSayimi: nesneler ? nesneler.sayim : null,
    modelCalisti: !!nesneler,
    derinlikCalisti: !!derinlik,
    /** Bulunan ekran yüzeyi: dört köşe (0–1) + skor. */
    yuzey,
  }
}

/** Bir maskeyi başka bir ölçüye taşır (en yakın komşu). */
function olcekle(veri, kw, kh, hw, hh) {
  if (!veri) return null
  const c = new Float32Array(hw * hh)
  for (let y = 0; y < hh; y++) {
    const sy = Math.min(kh - 1, Math.floor((y / hh) * kh))
    for (let x = 0; x < hw; x++) {
      const sx = Math.min(kw - 1, Math.floor((x / hw) * kw))
      c[y * hw + x] = veri[sy * kw + sx]
    }
  }
  return c
}

/**
 * Gökyüzü maskesi: mavi baskın pikseller. Düzlem araması için gerekli,
 * çünkü gökyüzü derinlikte kusursuz bir düzlemdir ve en büyük bölge olur.
 */
function gokMaskesi(tuval, w, h) {
  try {
    const c = document.createElement("canvas")
    c.width = w
    c.height = h
    const ctx = c.getContext("2d", { willReadFrequently: true })
    ctx.drawImage(tuval, 0, 0, w, h)
    const d = ctx.getImageData(0, 0, w, h).data
    const m = new Float32Array(w * h)
    for (let i = 0, p = 0; i < m.length; i++, p += 4) {
      m[i] = d[p + 2] - d[p] > 25 ? 1 : 0
    }
    return m
  } catch {
    return null
  }
}

/** Bakış açısı ölçümü — okunamayan görüntüde sessizce vazgeçilir. */
function aciOlc(tuval) {
  try {
    return perspektifAcisi(tuval)
  } catch {
    return null
  }
}

/**
 * Zemin çizgisi: önce fotoğraftan, olmazsa önerilen alanın altından.
 * Panelin altında kalması güvence altına alınıyor.
 */
function zeminY(oran, H, panelAlt, yer) {
  const bulunan = oran != null ? oran * H : yer ? (yer.y + yer.h) * H : panelAlt
  return Math.round(Math.max(panelAlt + 2, Math.min(H - 2, bulunan)))
}
