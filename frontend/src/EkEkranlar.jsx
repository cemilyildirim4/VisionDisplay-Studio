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
import { Screen } from './WallPreview.jsx'

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
  /* Ekranın kendi kaydında yoksa panelden gelen değerler kullanılıyor. */
  model = null,
  resolution = null,
  curveAmount = 60,
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
    const c = a.cols > 0 ? a.cols : cols
    const sol = a.lSolCols ? Math.max(1, Math.min(c - 1, a.lSolCols)) : null
    return {
      cols: c,
      rows: a.rows > 0 ? a.rows : rows,
      /*
       * EKRAN TİPİ DE KAYDIN İÇİNDE.
       *
       * Burası eskiden yalnızca içerik ve kabin sayısı okuyordu; ekranın
       * BİÇİMİ (kavis, L, kanat bölmesi, köşe yönü) hiç taşınmıyordu ve
       * fotoğrafa konan her ekran düz dikdörtgene dönüyordu.
       */
      type: a.screenType || 'flat',
      leftCols: sol || undefined,
      rightCols: sol ? c - sol : undefined,
      lYon: a.lYon || 'ice',
      curveAmount: a.curveAmount > 0 ? a.curveAmount : curveAmount,
      content: a.content || content,
      contentUrl: a.content ? a.contentUrl || null : contentUrl,
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

        const ayar = ayarli(ekran)
        const icEn = wPx * (dlm?.sw || 1)
        const icBoy = hPx * (dlm?.sh || 1)
        const icSol = dlm ? wPx * dlm.sx : 0
        const icUst = dlm ? hPx * dlm.sy : 0
        /* Kavisli ekranın tuvali kendi kutusundan taşıyor; orada kırpma yok. */
        const kavisli = ayar.type === 'curved' || ayar.type === 'curvedIn'

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
              overflow: kavisli ? 'visible' : 'hidden',
              pointerEvents: onSec ? 'auto' : 'none',
              cursor: onSec ? 'pointer' : undefined,
            }}
          >
            {/*
              EKRAN KENDİ TİPİYLE ÇİZİLİYOR — tasarım alanındaki çizimin
              aynısı. Dörtgen dönüşümü bunun üstüne perspektifi veriyor,
              yani biçim fotoğrafa geçerken kaybolmuyor.
            */}
            <Screen
              wPx={wPx}
              hPx={hPx}
              cols={ayar.cols}
              rows={ayar.rows}
              type={ayar.type}
              model={model}
              resolution={resolution}
              curveAmount={ayar.curveAmount}
              leftCols={ayar.leftCols}
              rightCols={ayar.rightCols}
              lYon={ayar.lYon}
              /* Bölmeye katılamayan ekran kapalı panel olarak duruyor. */
              content={bolmeDisi ? 'led' : ayar.content}
              contentUrl={bolmeDisi ? null : ayar.contentUrl}
              spanW={dlm ? icEn : undefined}
              spanH={dlm ? icBoy : undefined}
              offsetX={icSol}
              offsetY={icUst}
            />
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
          </div>
        )
      })}
    </div>
  )
}
