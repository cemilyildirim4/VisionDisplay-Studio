/**
 * FOTOĞRAFLI MEKÂNLAR
 *
 * Her kayıt bir fotoğraf, o fotoğraftaki EKRAN ALANININ koordinatları ve o
 * alanın GERÇEKTE kaç metre olduğudur.
 *
 * Fotoğraf sabittir — hiç ölçeklenmez, kırpılıp tuvali kaplar. Değişen tek şey
 * ortadaki LED ekrandır: müşterinin yapılandırdığı ekran, panelin gerçek
 * ölçüsünden türeyen sabit bir px/m ile çizilir. Yani kabin ekledikçe ekran
 * büyür, mekân olduğu yerde durur (bkz. PanoFoto.jsx).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * YENİ MEKÂN EKLEMEK
 *
 * 1. Fotoğrafı public/ içine koy.
 * 2. Ekran alanının piksel koordinatlarını ölç (sol/üst/sağ/alt).
 * 3. O alanın gerçekte kaç metre geniş olduğunu yaz (`panelEnM`).
 * 4. Buraya bir satır ekle. Başka hiçbir yerde değişiklik gerekmez.
 *
 * FOTOĞRAFIN TAŞIMASI GEREKEN ŞARTLAR — bunlar olmazsa sonuç bozulur:
 *
 *   • TAM KARŞIDAN çekilmiş/üretilmiş olmalı. Ekran alanı eksene hizalı,
 *     düzgün bir DİKDÖRTGEN olmalı; açılı bir yüzeye düz bir ekran oturmaz.
 *
 *   • Ekran alanının içi BOŞ olmalı (düz koyu gri en iyisi). İçinde bir
 *     görsel varsa bizim ekranımızın çevresinden sızar. Gelen görselde içerik
 *     varsa silinip yerine sönük LED yüzeyi konur.
 *
 *   • Ekran alanı fotoğrafın ORTASINA yakın olmalı. Tuval, panelin merkezi
 *     ortaya gelecek şekilde hizalanır; panel çok kenardaysa fotoğrafın
 *     karşı tarafı boşta kalmasın diye fazla büyütmek gerekir.
 *
 *   • En az 1200 px genişlik. Tuvalde 1400 px'e kadar çıkıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const SAHNELER = [
  {
    /*
     * AVM KORIDORU.
     *
     * Panel, fotografta var olan bir yuzey degil - ekranin oturacagi yeri
     * biz sectik: koridor zemininin ortasi. Alt kenari zemin cizgisine
     * (fotograf yuksekliginin 0,62 orani) oturuyor.
     *
     * Metre karsiligi: bu derinlikte iki vitrin arasi koridor ~7 m ve
     * fotograf genisliginin ~%55ini kapliyor, yani tam genislik ~12,75 m,
     * 1 m ~ 88 piksel. Panel 3,00 x 1,80 m secildi.
     */
    id: 'avm',
    kiosk: true, // kasa + direk + kaide cizilsin
    zoomlu: true, // sahne yakinlasip uzaklasabiliyor (bkz. App.jsx sahneYakinlik)
    ad: 'avm.title',
    dosya: '/zoom-destekli-ic-mekan-led-ana-arka-plan.png',
    kaynak: { w: 1672, h: 941 },
    /*
     * Panel, fotografta var olan bir yuzey degil: ekranin oturacagi yeri
     * biz sectik. Alt kenari zemin cizgisine (0,78) oturuyor, merkezi
     * kadrajin ortasinda.
     *
     * Metre karsiligi: arka duvar ~960 piksel ve yaklasik 12 m; duvar
     * hizasinda 1 m ~ 80 piksel. Panelin durdugu yer daha yakin oldugu
     * icin oradaki olcek ~110 piksel/m. Panel 4,00 x 2,40 m secildi.
     */
    panel: { x0: 616, y0: 338, x1: 1056, y1: 602 },
    /*
     * ZEMIN CIZGISI (kaynak piksel) — kiosk kaidesi hep buraya oturur.
     *
     * Panelin merkezinden 1,6 m asagida secildi (110 px/m ile 176 piksel).
     * Sebep: ekran her zaman tuvalin merkezine ciziliyor, yani ekranin
     * ORTASI sabit. Zemin buradan 1,6 m asagidayken 2 m lik bir ekranin
     * altinda ~0,6 m luk makul bir direk kaliyor; kucuk bir totemde direk
     * uzuyor, 4 m lik bir ekranda ise sifira inip kaide ekranin dibine
     * geliyor. Fotografin kendi zemin dokusu da tam bu hizada basliyor.
     */
    zeminY: 646,
    panelEnM: 4,
    maskeli: false, // fotografta kendi LED yuzeyi yok
  },
  {
    /*
     * SEHIR MEYDANI (gece dis mekan).
     *
     * Zemin cizgisi kaldirim taslarinin ortasi (0,735). Metre karsiligi:
     * alttaki alti seritlik yol ~20 m ve kadrajin tamamini kapliyor; yol
     * daha yakin oldugu icin kaldirim hizasinda kadraj ~22 m eder,
     * 1 m ~ 70 piksel. Panel 4,00 x 2,40 m.
     */
    id: 'meydan-gece',
    kiosk: true, // kasa + direk + kaide cizilsin
    zoomlu: true, // sahne yakinlasip uzaklasabiliyor (bkz. App.jsx sahneYakinlik)
    ad: 'dis.title',
    dosya: '/zoom-destekli-dis-mekan-led-ana-arka-plan.png',
    kaynak: { w: 1672, h: 941 },
    /*
     * Zemin cizgisi: dosemenin ortasi (0,80). Metre karsiligi: tas duvar
     * ~900 piksel ve on iki panelden olusuyor (~18 m), yani duvar
     * hizasinda 1 m ~ 50 piksel; panelin durdugu daha yakin hizada
     * ~75 piksel/m. Panel 4,00 x 2,40 m.
     */
    panel: { x0: 686, y0: 380, x1: 986, y1: 560 },
    /*
     * Zemin cizgisi: DOSEMENIN basladigi hiza, cali seridinin ALTI.
     *
     * Once 590 idi ve cali seridinin ustune denk geliyordu; kucuk bir kiosk
     * calilarin uzerinde duruyormus gibi gorunuyordu. Kaldirim taslarinin
     * basladigi yer 640 - kiosk artik dosemeye basiyor.
     */
    zeminY: 640,
    panelEnM: 4,
    maskeli: false,
  },
  {
    id: 'foto',
    ad: 'scene.foto', // i18n anahtarı
    dosya: '/pano-foto.jpg',
    kaynak: { w: 1881, h: 1463 },
    /*
     * Ölçülen LED yüzeyi. Kaynak 1254x1254'tü, panel 321,297-930,642 olarak
     * ÖLÇÜLDÜ (tahmin değil: parlak/doygunluğu düşük piksellerin sınırı
     * taranarak). 1,5 kat büyütülüp hafif netleştirildi, alttan kırpıldı ve
     * panelin içindeki beyaz sönük LED yüzeyiyle değiştirildi.
     */
    panel: { x0: 482, y0: 446, x1: 1395, y1: 963 },
    /*
     * Panelin GERÇEK genişliği. Ölçeğin tamamı buna dayanıyor: ekranın tuvalde
     * kaç piksel çizileceği buradan çıkıyor. Fotoğraftaki pano, yanındaki
     * arabalara ve bina katlarına göre yaklaşık 7 m.
     *
     * Tasarım bundan büyükse ekran panonun dışına taşar. Bu bir hata değil,
     * bilgi: müşterinin yapılandırdığı ekran gerçekten de bu panodan büyüktür.
     */
    panelEnM: 7,
    maskeli: true, // fotoğrafın kendi LED yüzeyi var, kapatılması gerekiyor
  },
  {
    /*
     * MEYDAN — arka plan fotoğrafı YOK, kasıtlı.
     *
     * Fotoğraflı mekânlarda fotoğrafın kendi LED panosu da görünüyor ve bizim
     * ekranımızla iç içe iki dikdörtgen oluşuyordu. Burada fotoğraf hiç
     * çizilmiyor: geriye sade bir zemin ve tek bir ekran kalıyor — o da
     * müşterinin yapılandırdığı ekran.
     *
     * `dosya` yok; PanoFoto bunu görünce fotoğrafı atlıyor. `panel` yine de
     * gerekli: ekranın tuvalde ne kadar yer kaplayacağını o belirliyor.
     */
    id: 'meydan',
    ad: 'scene.meydan',
    dosya: '/duvar.jpg',
    kaynak: { w: 1672, h: 941 },
    /*
     * Panel, arka duvarın ortasında seçilmiş bir alan; fotoğrafta öyle bir
     * bölge yok, ekranın oturacağı yeri biz belirledik. Duvar x 190..1480,
     * y 40..785 arasında; kutu onun ortasına, üstte ve altta nefes payı
     * kalacak şekilde yerleştirildi.
     */
    panel: { x0: 485, y0: 213, x1: 1185, y1: 607 },
    panelEnM: 4, // duvarın ekran alanı, oda oranlarına göre yaklaşık 4 m
    /*
     * Maske YOK. Maske, fotoğrafın kendi LED yüzeyini kapatmak içindi; bu
     * duvarda öyle bir şey olmadığı için maske konsaydı bembeyaz duvarın
     * ortasına koyu bir dikdörtgen basılırdı.
     */
    maskeli: false,
  },
]

/*
 * PANELIN DIKEY YERI NEDEN FOTOGRAFIN ORTASINDA?
 *
 * Fotograf, panelin merkezi tuvalin merkezine gelecek sekilde konuyor ve
 * tuvali kaplamak zorunda. Panel fotografin altina yakin oldugunda altta
 * kalan pay kucuk kaliyor; o payin tuvalin alt yarisini kapatabilmesi icin
 * fotografin cok buyutulmesi gerekiyor ve mekan taninmaz halde yakinlasiyor.
 * Panel dikeyde ortaya alininca iki pay esitleniyor, gereken buyutme en aza
 * iniyor ve fotografin tamami is goruyor.
 *
 * Ekranin ZEMINE oturmus gorunmesini panelin yeri degil, kiosk govdesi
 * sagliyor (bkz. PanoFoto.jsx): direk ekranin altindan zemine kadar iniyor.
 */

/** Sahne yakinliginin alt siniri — App.jsx ile ayni deger olmali. */
export const EN_AZ_YAKINLIK = 0.82

export const sahneBul = (id) => SAHNELER.find((s) => s.id === id) || null

/**
 * Fotoğrafın tuvaldeki yeri ve ölçeği. TASARIMDAN BAĞIMSIZ — yalnızca tuvalin
 * ölçüsüne bakar, o yüzden kabin eklendikçe mekân kıpırdamaz.
 *
 * Fotoğraf, PANELİN MERKEZİ tuvalin merkezine gelecek şekilde yerleştirilir;
 * gerçek ekran da tuvalin merkezine çizildiği için ikisi üst üste oturur.
 * Ölçek, bu hizalamayla tuvalin dört kenarını da kapatacak en küçük değerdir.
 */
export function fotoYerlesim(sahne, tuvalW, tuvalH) {
  if (!sahne || !tuvalW || !tuvalH) return null
  const { kaynak, panel, panelEnM } = sahne
  const panelW = panel.x1 - panel.x0
  const panelH = panel.y1 - panel.y0
  /*
   * KAPLAMA HESABI — panelin merkezine gore.
   *
   * Fotograf, panelin merkezi tuvalin merkezine gelecek sekilde konuyor.
   * O halde tuvalin alt yarisini kapatan sey, panelin merkezinin ALTINDA
   * kalan fotograf payidir; ust yarisini kapatan da ustunde kalan pay.
   * Ikisi farkli oldugunda belirleyici olan KUCUK olandir - buyugune gore
   * hesaplanirsa kucuk taraf tuvale yetismez ve o kenarda bos serit kalir.
   * (Panelleri fotografin ortasina yakin olan eski mekanlarda iki pay birbirine
   * yakindi ve fark gorunmuyordu; zemine oturan panellerde alt pay cok kucuk
   * oldugu icin altta beyaz bir serit olusuyordu.)
   */
  const merkezX = panel.x0 + panelW / 2
  const merkezY = panel.y0 + panelH / 2
  const yatay = Math.min(merkezX, kaynak.w - merkezX)
  const dikey = Math.min(merkezY, kaynak.h - merkezY)
  /*
   * KAPSAMA PAYI.
   *
   * Zoomlu mekanlarda fotograf en genis acida (yakinlik 0,82) kuculuyor;
   * tam kaplayacak olcekte cizilseydi o anda kenarlardan bos zemin gorunurdu.
   * Fotograf bu yuzden bastan 1/0,82 kadar buyuk cizilir. Olcek bozulmuyor:
   * px/m de ayni oranda buyudugu icin ekranin mekana orani sabit kaliyor.
   */
  const kapsama = sahne.zoomlu ? EN_AZ_YAKINLIK : 1

  /*
   * IKI YERLESTIRME BICIMI.
   *
   * Hazir mekanlarda fotograf tuvali KAPLAR (cover): kenarlardan kirpilir,
   * bos serit kalmaz. Olculeri bize ait oldugu icin neyin kirpildigini
   * biliyoruz.
   *
   * Kullanicinin kendi fotografinda ise kirpmak yanlis: hangi kismin
   * onemli oldugunu bilmiyoruz ve ekleyen kisi fotografin TAMAMINI gormeyi
   * bekliyor. Orada fotograf tuvale SIGDIRILIR (contain), ortalanir ve
   * hicbir yakinlastirma uygulanmaz; ekran da onerilen yere konur.
   */
  const sigdir = !!sahne.tamGorunsun
  const s = sigdir
    ? Math.min(tuvalW / kaynak.w, tuvalH / kaynak.h)
    : Math.max(tuvalW / 2 / yatay, tuvalH / 2 / dikey) / kapsama
  const sol = sigdir ? (tuvalW - kaynak.w * s) / 2 : tuvalW / 2 - merkezX * s
  const ust = sigdir ? (tuvalH - kaynak.h * s) / 2 : tuvalH / 2 - merkezY * s
  return {
    s,
    sigdir,
    genislik: kaynak.w * s,
    yukseklik: kaynak.h * s,
    sol,
    ust,
    /* Panelin merkezinin TUVALDEKI yeri — ekranin gitmesi gereken nokta. */
    merkezXpx: sol + merkezX * s,
    merkezYpx: ust + merkezY * s,
    /* Zemin cizgisinin tuvaldeki yeri (varsa). */
    zeminYpx: sahne.zeminY != null ? ust + sahne.zeminY * s : null,
    // Panelin tuvaldeki ölçüsü — ekran tam buraya oturur
    panelWpx: panelW * s,
    panelHpx: panelH * s,
    // Sahnenin gerçek ölçeği (bilgi amaçlı; ölçü etiketleri buna dayanmaz)
    pxPerM: (panelW * s) / panelEnM,
  }
}

/**
 * KIOSK GOVDESININ OLCULERI — ekranin boyuna ORANTILI (metre).
 *
 * Once sabitti (0,40 m direk). Iki uctan da yanlisti: 12 cm lik bir masa
 * ekraninda direk ekranin uc kati oluyor, 6 m lik bir billboardda ise
 * gorunmez kaliyordu. Simdi ekran yuksekliginin ucte biri kadar, ama alt ve
 * ust sinirlarla: cok kucukte kaybolmasin, cok buyukte bayrak diregine
 * donmesin.
 */
export function govdeOlculeri(ekranHm) {
  const h = ekranHm > 0 ? ekranHm : 1
  return {
    direkM: Math.max(0.08, Math.min(0.6, h * 0.33)),
    kaideM: Math.max(0.03, Math.min(0.16, h * 0.07)),
  }
}

/**
 * Kiosku zemine oturtmak icin gereken DIKEY KAYMA (piksel).
 *
 * Ekran tuvalin merkezine ciziliyor; kaidenin fotografin zemin cizgisine
 * denk gelmesi icin ekran + govde bu kadar asagi kaydirilir. Kayma ekrana da
 * govdeye de ayni uygulanir, ikisi tek parca gibi hareket eder.
 */
export function zeminOturmaKaymasi(
  sahne,
  yer,
  tuvalH,
  yakinlik,
  ekranHpx,
  ayakVar = true,
  ekranWpx = 0,
) {
  if (!sahne || sahne.zeminY == null || !yer) return 0
  /*
   * Fotograf, panelin merkezi etrafinda olcekleniyor; zemin cizgisinin
   * yakinlik sonrasi yeri de o merkeze gore bulunuyor. Sigdirilmis
   * (contain) fotografta yakinlik 1 oldugu icin ayni bagintiya donuyor.
   */
  const zeminPx = yer.merkezYpx + (yer.zeminYpx - yer.merkezYpx) * yakinlik
  const pxPerM = yer.pxPerM * yakinlik
  const ekranAlt = tuvalH / 2 + ekranHpx / 2
  /*
   * Ayaklar gizliyse ekranin DIBI zemine oturur. "Dibi" ekran alani degil,
   * KASANIN alt kenari: gorunen sey o. Kasa kalinligi PanoFoto ile ayni
   * kuraldan hesaplaniyor, yoksa ekran zeminin birkac piksel altina batiyor.
   */
  const { direkM, kaideM } = govdeOlculeri(ekranHpx / pxPerM)
  const kasa = Math.max(3, Math.min(14, ekranWpx * 0.014))
  const govde = ayakVar ? (direkM + kaideM) * pxPerM : kasa
  return zeminPx - (ekranAlt + govde)
}

/**
 * Ekranin ONERILEN yere gitmesi icin gereken YATAY kayma.
 *
 * Kaplayan mekanlarda panel zaten tuvalin merkezine hizalandigi icin sifir.
 * Sigdirilmis fotografta ise fotograf ortalaniyor, panel nerede bulunduysa
 * orada kaliyor; ekran ona dogru kaydiriliyor.
 */
export function oneriYatayKaymasi(yer, tuvalW) {
  if (!yer?.sigdir) return 0
  return yer.merkezXpx - tuvalW / 2
}
