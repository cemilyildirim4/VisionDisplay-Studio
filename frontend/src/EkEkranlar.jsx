/**
 * ARKA PLANA YERLEŞTİRİLMİŞ EK EKRANLAR.
 *
 * Aynı fotoğrafa birden çok ekran konabiliyor: biri yerleştirildikten sonra
 * "Ekran ekle" deniyor, o ekran olduğu yere SABİTLENİYOR ve elde yeni bir
 * ekran kalıyor. Bu katman sabitlenmiş olanları çiziyor; düzenlenmekte olan
 * ekran eskisi gibi WallPreview tarafından çiziliyor.
 *
 * NEDEN AYRI BİR KATMAN. WallPreview tek bir şerit çizip ona tek bir dörtgen
 * dönüşümü uyguluyor — ikinci bir ekran oraya sığmıyor. L köşesinde de aynı
 * gerekçeyle ayrı bir katman var (bkz. LKoseEkran).
 *
 * KÖŞELER ORAN OLARAK SAKLANIYOR (fotoğrafın 0..1'i), piksel olarak değil:
 * pencere boyutu değişince ya da sahneye yakınlaşınca ekranlar fotoğrafın
 * üstünde durdukları yerde kalıyor.
 */

import { koseDonusumu } from './homografi.js'
import { ledDotSize, ledDotsStyle, LED_LIT_FILTER } from './content.js'
import { contentImage, VideoLayer } from './WallPreview.jsx'
import { videoSrcFor } from './videoContent.js'

/* İki nokta arası uzaklık — kaynak dikdörtgenin ölçüsü buradan. */
const uzaklik = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

export default function EkEkranlar({
  ekranlar,
  tuvalW,
  tuvalH,
  cols,
  rows,
  content,
  contentUrl,
  /* Oran (0..1) → mutlak tuval pikseli. App.jsx'teki dönüşümün aynısı. */
  oranTuvale,
  /* Verilirse ekrana tıklanınca o ekran düzenlemeye alınıyor. */
  onSec = null,
  /* Düzenlenmekte olan ekranın sırası — listede vurgulamak için değil,
     burada yalnızca o ekranın İKİ KEZ çizilmemesi için kullanılıyor. */
}) {
  if (!Array.isArray(ekranlar) || ekranlar.length === 0) return null
  if (!(tuvalW > 0) || !(tuvalH > 0)) return null

  /*
   * HER EKRAN KENDİ AYARIYLA ÇİZİLİYOR.
   *
   * Diyot sıklığı ve içerik paneldeki O ANKİ değerden geliyordu: 2. ekran
   * eklenince 1. ekranın görüntüsü de onunkine dönüyordu. Kaydı olanda
   * kendi ayarı, olmayanda (eski kayıtlar) paneldeki değer kullanılıyor.
   */
  const ayarli = (ekran) => {
    const a = ekran?.ayar || {}
    const e = a.content || content
    const u = a.content ? a.contentUrl || null : contentUrl
    return {
      cols: a.cols > 0 ? a.cols : cols,
      rows: a.rows > 0 ? a.rows : rows,
      bgImage: e !== 'none' ? contentImage(e, u) : null,
      /*
       * VİDEO AYRI BİR ÖĞE.
       *
       * contentImage video içeriklerde null dönüyor (video CSS arka planı
       * olamaz). Sabit ekranlar yalnızca arka plan çizdiği için içeriği
       * video olan bir ekran sabitlenince SİMSİYAH kalıyordu; düzenlenen
       * ekranda oynayan video, sabitlenince duruyordu.
       */
      video: e !== 'none' ? videoSrcFor(e, u) : null,
      yayinda: e !== 'none' && e !== 'led',
    }
  }

  return (
    <div
      className="absolute inset-0"
      /*
       * KATMAN SIRASI: sabit ekranlar tiklanabilir olmali.
       *
       * Katman varsayilan sirasinda duruyordu ve ustteki araclar (alan
       * siniri, tasima yuzeyi) tiklamayi yutuyordu; sabit bir ekrana
       * tiklayinca hicbir sey olmuyordu. Simdi onlarin ustunde: katmanin
       * kendisi fareyi gormuyor, yalnizca ekranlar goruyor.
       */
      style={{ width: tuvalW, height: tuvalH, pointerEvents: 'none', zIndex: 13 }}
    >
      {ekranlar.map((ekran, i) => {
        const k = ekran?.oran
        if (!Array.isArray(k) || k.length !== 4) return null
        const koseler = k.map(oranTuvale)
        if (koseler.some((p) => !Number.isFinite(p?.x) || !Number.isFinite(p?.y))) return null

        /*
         * Kaynak dikdörtgenin ölçüsü dörtgenin KENDİSİNDEN: üst/alt kenarın
         * büyüğü en, sol/sağ kenarın büyüğü boy. Ayrıca piksel saklamaya
         * gerek kalmıyor ve ölçek değişince kendiliğinden uyuyor.
         */
        const wPx = Math.max(uzaklik(koseler[0], koseler[1]), uzaklik(koseler[3], koseler[2]))
        const hPx = Math.max(uzaklik(koseler[0], koseler[3]), uzaklik(koseler[1], koseler[2]))
        if (!(wPx > 2) || !(hPx > 2)) return null

        const d = koseDonusumu(wPx, hPx, koseler)
        if (!d) return null

        const { cols: eCols, rows: eRows, bgImage, video, yayinda } = ayarli(ekran)
        const diyot = !yayinda ? ledDotSize(wPx / Math.max(1, eCols), hPx / Math.max(1, eRows)) : null

        return (
          <div
            key={ekran.id ?? i}
            onPointerDown={onSec ? (e) => { e.stopPropagation(); onSec(ekran.id) } : undefined}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: wPx,
              height: hPx,
              transform: d,
              transformOrigin: '0 0',
              overflow: 'hidden',
              backgroundColor: '#0a0a0a',
              pointerEvents: onSec ? 'auto' : 'none',
              cursor: onSec ? 'pointer' : undefined,
              backgroundImage: bgImage || undefined,
              backgroundSize: `${Math.ceil(wPx)}px ${Math.ceil(hPx)}px`,
              backgroundRepeat: 'no-repeat',
              filter: yayinda ? LED_LIT_FILTER : undefined,
            }}
          >
            {/* Video: ekranın kendi ölçüsünde, kırpılarak. */}
            {video && <VideoLayer src={video} gw={wPx} gh={hPx} left={0} top={0} lit={yayinda} />}
            {diyot && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  ...ledDotsStyle(diyot.dotW, diyot.dotH),
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
