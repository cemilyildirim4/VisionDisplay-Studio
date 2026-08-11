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
  // Panel ortalanınca kapatılması gereken paylar: karşılıklı payların büyüğü
  const yatay = Math.max(panel.x0, kaynak.w - panel.x1)
  const dikey = Math.max(panel.y0, kaynak.h - panel.y1)
  const s = Math.max(tuvalW / (2 * yatay + panelW), tuvalH / (2 * dikey + panelH))
  return {
    s,
    genislik: kaynak.w * s,
    yukseklik: kaynak.h * s,
    sol: tuvalW / 2 - (panel.x0 + panelW / 2) * s,
    ust: tuvalH / 2 - (panel.y0 + panelH / 2) * s,
    // Panelin tuvaldeki ölçüsü — ekran tam buraya oturur
    panelWpx: panelW * s,
    panelHpx: panelH * s,
    // Sahnenin gerçek ölçeği (bilgi amaçlı; ölçü etiketleri buna dayanmaz)
    pxPerM: (panelW * s) / panelEnM,
  }
}
