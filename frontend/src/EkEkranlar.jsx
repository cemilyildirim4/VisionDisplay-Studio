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
  /*
   * Verilirse ekrana tıklanınca o ekran düzenlemeye alınıyor. Shift
   * basılıysa düzenlemeye almak yerine SEÇİME ekleniyor (bkz. secililer).
   */
  onSec = null,
  /* Shift ile seçilmiş ekranların kimlikleri — mavi çerçeveyle belli. */
  secililer = [],
  /*
   * BÖLÜNMÜŞ İÇERİK DİLİMLERİ — Map(ekran kimliği → {sx, sy, sw, sh}).
   * İçeriği paylaşan ekranlar için hesaplanıyor (bkz. icerikBolme.js);
   * paylaşmayanlar haritada yok ve eskisi gibi içeriğin tamamını gösteriyor.
   */
  dilimler = null,
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

        /*
         * Dilim yoksa {0,0,1,1}: içerik ekranın tamamını kaplıyor.
         * "bos" ise bu ekran bölmeye katılamıyor (yeri belli değil) ve
         * içerik hiç çizilmiyor — tamamını çizmek tekrar izlenimi verir.
         */
        const ham = dilimler?.get(ekran.id) || null
        const bolmeDisi = !!ham?.bos
        const dlm = bolmeDisi ? null : ham

        const { cols: eCols, rows: eRows, bgImage: hamGorsel, video: hamVideo, yayinda: hamYayin } = ayarli(ekran)
        const bgImage = bolmeDisi ? null : hamGorsel
        const video = bolmeDisi ? null : hamVideo
        const yayinda = bolmeDisi ? false : hamYayin
        const icEn = wPx * (dlm?.sw || 1)
        const icBoy = hPx * (dlm?.sh || 1)
        const icSol = dlm ? wPx * dlm.sx : 0
        const icUst = dlm ? hPx * dlm.sy : 0
        const diyot = !yayinda ? ledDotSize(wPx / Math.max(1, eCols), hPx / Math.max(1, eRows)) : null

        return (
          <div
            key={ekran.id ?? i}
            onPointerDown={
              onSec
                ? (e) => {
                    /* preventDefault: Shift basılıyken tarayıcı metin seçimine
                       başlıyor ve ekran hiç seçilmiyordu. */
                    e.preventDefault()
                    e.stopPropagation()
                    onSec(ekran.id, e.shiftKey)
                  }
                : undefined
            }
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
              backgroundSize: `${Math.ceil(icEn)}px ${Math.ceil(icBoy)}px`,
              backgroundPosition: dlm ? `${-icSol}px ${-icUst}px` : undefined,
              backgroundRepeat: 'no-repeat',
              filter: yayinda ? LED_LIT_FILTER : undefined,
            }}
          >
            {/* Seçili ekran: çerçeve ekranın KENDİ dönüşümünün içinde,
                 yani perspektifle birlikte eğiliyor. */}
            {secililer.includes(ekran.id) && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  boxShadow: 'inset 0 0 0 3px #2962ad',
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              />
            )}
            {/* Video: ekranın kendi ölçüsünde, kırpılarak. */}
            {video && (
              <VideoLayer
                src={video}
                gw={icEn}
                gh={icBoy}
                left={icSol}
                top={icUst}
                lit={yayinda}
                senkron={!!dlm}
              />
            )}
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
