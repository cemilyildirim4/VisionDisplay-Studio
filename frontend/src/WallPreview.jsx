import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import CurvedScreen from './CurvedScreen.jsx'
import LedDotsCanvas from './LedDotsCanvas.jsx'
import { viewingDistanceFor } from './viewingDistance.js'
import { DEFAULT_CONTENT_SRC, LED_GRADIENT, LED_LIT_FILTER, LED_SHEEN, ledDotSize, L_KIRILMA_PCT, L_KACIS_ORANI } from './content.js'
import { videoSrcFor, senkronaKatil } from './videoContent.js'
import { useLang } from './useLang.js'
import { yonDonusumu } from './hooks/useYon.js'
import Kup2D, { kupOlculeri, kupCizimKutusu } from './Kup2D.jsx'
import Birlesim2D from './Birlesim2D.jsx'
import { sayiYeri } from './sayiBicimi.js'
import { birlesimKapladigi } from './birlesimOlcu.js'
import { koseDonusumu } from './homografi.js'
import { varlik } from './varlik.js'

/**
 * Çalışma alanı önizlemesi.
 * - Tek ekran: beyaz duvar + ölçekli ekran + ölçü etiketleri + insan + izleme mesafesi.
 * - Çoklu ekran: birden fazla ekran bitişik; içerik TÜM duvara yayılan TEK görsel olarak bölünür.
 * İçerik: 'led' = LED panel görünümü (varsayılan), 'photo' = örnek fotoğraf,
 *         'sample' = örnek video, 'none' = boş çerçeve, 'upload' = yüklenen görsel.
 */

const HUMAN_HEIGHT_M = 1.8
/*
 * public/human.png içinde figürün etrafında saydam boşluk var. Bu yüzden
 * görselin tamamını HUMAN_HEIGHT_M saymak figürü olduğundan kısa gösterir ve
 * ayakları duvarın altından yukarıda kalır.
 *
 * Aşağıdaki oranlar PNG'nin alfa kanalı çözülerek ÖLÇÜLDÜ:
 *   görsel 1024 × 1536 · figür x 232..749 · y 138..1352
 * Silüet görselini değiştirirseniz bu beş sayı yeniden ölçülmeli.
 */
const HUMAN_FIG_RATIO = 1215 / 1536 // figür yüksekliği / görsel yüksekliği
const HUMAN_BOTTOM_PAD = 183 / 1536 // ayakların altındaki saydam boşluk oranı
const HUMAN_IMG_AR = 1024 / 1536 // görselin en/boy oranı
const HUMAN_LEFT_PAD = 232 / 1024 // figürün solundaki saydam boşluk oranı
// Figürün genişlik/yükseklik oranı. Kutunun en/boyunu buradan kuruyoruz ki
// görsel hiçbir yerde ezilmesin. (Uzatılmış kol da bu genişliğe dâhil.)
const HUMAN_FIG_W_RATIO = 518 / 1215
// Duvar YÜKSEKLİĞİ bundan azsa silüet gösterilmez. Eşik figürün kendi boyu:
// duvar 1,80 m ise figür tam duvar kadardır, hâlâ doğru bir ölçek referansıdır.
// (Eşik 2 m iken duvarı 1,80'e indirince silüet ortadan kayboluyordu.)
/*
 * DUVARIN TUVALDEKİ DOLULUĞU.
 *
 * Duvar her ölçüde tuvalin bu kadarını kaplıyor; kalan pay ölçü
 * etiketlerine ve nefes payına ait.
 */
const DOLULUK = 0.75
/*
 * MEKÂN YOKKEN ÇOK EKRANLI TASARIMDA DUVAR DAHA BÜYÜK.
 *
 * Boş tuvalde iki ya da daha çok ekran yan yana dizilince tasarımın her
 * ekrana düşen payı küçülüyor ve çevredeki boşluk gereğinden geniş
 * kalıyordu. Yalnızca bu durumda duvar tuvalin %90'ına kadar çıkıyor.
 *
 * Etiketler yine kesilmiyor: availW/availH üst sınır olarak duruyor
 * (tuvalin kenarlarında ölçü yazılarına ayrılmış sabit pay), min() ikisinden
 * küçüğünü alıyor. Tek ekranda ve mekânlı sahnelerde DOLULUK aynı.
 */
const DOLULUK_COK = 0.9

const HUMAN_MIN_WALL_M = HUMAN_HEIGHT_M
// İç L Tipi: dikiş (köşe) kenarının üstten ve alttan içeri girme oranı (%).
// Kanatlar trapez olur → köşenin geriye kaçtığı hissi. 0 = düz, büyüdükçe köşe
// daha keskin (90°'ye yakın) görünür.
// Tek kaynak: mekân çizimindeki kasa da aynı oranı kullanıyor (bkz. content.js)
const L_CORNER_PINCH_PCT = L_KIRILMA_PCT

// Video içerikler ('sample' ve 'video') burada null döner —
// onlar CSS arka planıyla değil, <video> öğesiyle çizilir (VideoLayer).
export function contentImage(content, contentUrl) {
  if (content === 'led') return LED_GRADIENT
  if (content === 'photo') return `url("${DEFAULT_CONTENT_SRC}")`
  if (content === 'upload' && contentUrl) return `url("${contentUrl}")`
  return null
}

/**
 * Panelin üstünde oynayan video katmanı.
 *
 * Konumlandırma, CSS arka planındaki backgroundSize + backgroundPosition
 * mantığının birebir karşılığıdır: video GLOBAL ölçüde (gw × gh) çizilir,
 * negatif konumla bu ekranın dilimi görünür. Çoklu ekranda tek videonun
 * bölünmesi böyle çalışır.
 */
/**
 * ŞERİDİN DIŞ HATTI — yan yana dizili ekranların KAPLADIĞI alanın çokgeni.
 *
 * Tek içerik katmanı (görsel/video) tüm şeride yayılıp bu çokgene kırpılıyor:
 * ekranın olmadığı yerlerde (kısa ekranın üstü, L tipinin köşe üçgenleri)
 * arka plan görünür. Hem çalışma alanı önizlemesi hem de kamera (AR) aynı
 * hattı kullanıyor ki tasarım iki yerde birebir aynı görünsün.
 *
 * `yerlesim`: { wPx, hPx, xStart, type, cols, leftCols, rightCols } listesi.
 */
export function seritMaskePolygon(yerlesim, maxHpx) {
  const kanatBolmesi = (s) => {
    const lc = Math.max(1, s.leftCols || Math.ceil(Math.max(1, s.cols) / 2))
    const rc = Math.max(1, s.rightCols || Math.max(1, Math.max(1, s.cols) - lc))
    return s.wPx * (lc / (lc + rc))
  }
  const ust = []
  const alt = []
  yerlesim.forEach((s) => {
    const y0 = maxHpx - s.hPx
    const x0 = s.xStart
    const x1 = x0 + s.wPx
    // Komşudan yükseklik farkı varsa bu iki nokta sınırda dikey basamağı yapar
    ust.push([x0, y0])
    if ((s.type || 'flat') === 'lshape') {
      const lw = kanatBolmesi(s)
      const pY = (s.hPx * L_CORNER_PINCH_PCT) / 100
      ust.push([x0 + lw, y0 + pY])
      alt.push([x0 + lw, maxHpx - pY])
    }
    ust.push([x1, y0])
    alt.push([x0, maxHpx], [x1, maxHpx])
  })
  // Alt kenar sağdan sola dönerken sıralama ters, L kırılmaları yerinde kalsın
  const altSirali = [...alt].sort((a, b) => b[0] - a[0])
  return `polygon(${[...ust, ...altSirali].map(([x, y]) => `${x.toFixed(2)}px ${y.toFixed(2)}px`).join(', ')})`
}

export function VideoLayer({ src, gw, gh, left, top, lit, senkron = false }) {
  const videoRef = useRef(null)

  /*
   * Bölünmüş içerikte aynı video birkaç ekranda birden oynuyor; ayrı
   * öğeler zamanla birbirinden kayıyor (bkz. senkronaKatil).
   */
  useEffect(() => {
    if (!senkron || !src) return undefined
    const v = videoRef.current
    if (!v) return undefined
    return senkronaKatil(src, v)
  }, [senkron, src])

  /*
   * TELEFONDA OYNATMAYI GARANTİYE AL.
   *
   * Belirti: kamerada (AR) panel simsiyah kalıyordu, oysa aynı tasarım
   * yapılandırıcıda oynuyordu. İki sebebi var, ikisi de telefonda çıkıyor:
   *
   * 1) React "muted" değerini bazı durumlarda ETİKETE yazmıyor, yalnızca
   *    özelliğe atıyor. iOS/Android otomatik oynatma iznini etikete bakarak
   *    veriyor; sessiz sayılmayan video hiç başlamıyor, tek kare bile
   *    çizilmediği için panel siyah kalıyor. Bu yüzden doğrudan öğeye yazılır.
   * 2) Kamera (getUserMedia) açıldığında iOS oynayan videoları duraklatıyor.
   *    Duraklama olayında yeniden başlatıyoruz; ayrıca saniyede bir kontrol
   *    ediyoruz, çünkü kesinti bazen olay üretmeden geliyor.
   */
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.defaultMuted = true
    const oynat = () => { if (v.paused) v.play().catch(() => {}) }
    oynat()
    v.addEventListener('loadeddata', oynat)
    v.addEventListener('pause', oynat)
    document.addEventListener('visibilitychange', oynat)
    const sayac = setInterval(oynat, 1000)
    return () => {
      clearInterval(sayac)
      v.removeEventListener('loadeddata', oynat)
      v.removeEventListener('pause', oynat)
      document.removeEventListener('visibilitychange', oynat)
    }
  }, [src])

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      loop
      muted
      playsInline
      style={{
        position: 'absolute',
        /*
         * Yukarı yuvarlanıyor: kesirli ölçüde sağ kenarda alt-piksellik bir
         * boşluk kalıp panelin siyah zemini ince bir şerit olarak sızıyordu
         * (görsel içerikte de aynı sebep vardı — bkz. bgFor).
         */
        /* Görselde olduğu gibi bir piksel büyük: alt/sağ kenarda şerit kalmasın. */
        width: Math.ceil(gw) + 1,
        height: Math.ceil(gh) + 1,
        /*
         * maxWidth/maxHeight SIFIRLANMALI. Tailwind'in preflight'ı
         * `video { max-width: 100% }` uyguluyor ve videoyu kapsayıcısına
         * kırpıyordu: burada video KASITLI olarak kapsayıcıdan büyük çizilip
         * negatif konumla diliminden gösteriliyor.
         *
         * Belirtisi şuydu: L tipinde sol kanat videoyu tam gösteriyor, sağ
         * kanat simsiyah kalıyordu. Video sol kanadın genişliğine sıkışınca
         * sağ kanadın left:-leftW konumu onu tamamen görüş alanının dışına
         * itiyordu. Aynı kırpma çoklu ekranda tek videonun bölünmesini de
         * bozuyordu.
         */
        maxWidth: 'none',
        maxHeight: 'none',
        left: -left,
        top: -top,
        /* Yüzeyi tam dolduruyor: kırpma da siyah bant da yok. */
        objectFit: 'fill',
        filter: lit ? LED_LIT_FILTER : undefined,
        pointerEvents: 'none',
      }}
    />
  )
}

/**
 * Tek bir LED ekranı. spanW/spanH/offsetX/offsetY verilirse içerik, o global boyutta
 * çizilip bu ekranın diliminden görünür (çoklu ekranda tek görselin bölünmesi).
 */
// AR/kamera ekranı da AYNI bileşeni kullanır: tasarım orada da birebir aynı
// çizilsin, iki ayrı kod yolu birbirinden ayrı düşmesin diye dışa açıldı.
export function Screen({ wPx, hPx, cols, rows, type, resolution, model, content, contentUrl, spanW, spanH, offsetX = 0, offsetY = 0, hideRegions = false, frameOnly = false, videoKapali = false, curveAmount = 60, leftCols, rightCols, lYon = 'ice', solKirim = 0, sagKirim = 0, sade = false, kenarsiz = false }) {
  const nCols = Math.max(1, cols)
  const nRows = Math.max(1, rows)
  const isNone = content === 'none'
  // 'curved' = dışa kavisli (konveks), 'curvedIn' = içe kavisli (konkav)
  /*
   * Kavis de BİÇİMDİR, içerikten bağımsız. `&& !isNone` yüzünden "Resim Yok"
   * seçilince kavisli ekran düz bir dikdörtgene dönüyordu. (L tipinde de aynı
   * kusur vardı, o da düzeltildi — bkz. isL.)
   */
  const isCurved = type === 'curved' || type === 'curvedIn'
  /*
   * L tipi BİÇİM, içerikten bağımsızdır. Eskiden `&& !isNone` vardı ve "Resim
   * Yok" seçilince ekran düz bir dikdörtgene dönüyordu — oysa boş çerçeve de
   * L biçiminde olmalı; ekranın ŞEKLİ neyi gösterdiğine bağlı değil.
   */
  const isL = type === 'lshape'
  const bgImage = contentImage(content, contentUrl)
  // Video içerik ise kaynağı; değilse null (o zaman CSS arka planı kullanılır)
  /* Arkaya bakan küp yüzü: görüntü dursun ama video kurulmasın (bkz. Kup2D). */
  const videoSrc = frameOnly || videoKapali ? null : videoSrcFor(content, contentUrl)
  // Panel görüntü YAYINDA mı? Kapalı panel (led) ve boş çerçeve ışık saçmaz.
  const isLit = !isNone && content !== 'led'
  const gw = spanW || wPx
  const gh = spanH || hPx

  /*
   * İçeriğin global boyutta çizilip belirli bir yatay dilimini gösteren stil.
   *
   * ÖLÇÜLER YUKARI YUVARLANIYOR — sağ kenardaki ince siyah şerit bu yüzdendi.
   * Ekranın piksel ölçüsü kesirli çıkıyor (ör. 462,37 px: metre ölçüsünden
   * hesaplanıyor). Tarayıcı kutunun genişliğini ve arka plan görselinin
   * genişliğini ayrı ayrı cihaz pikseline yuvarlıyor; ikisi farklı tarafa
   * yuvarlandığında sağda görselin ulaşmadığı bir alt-piksel sütun kalıyor ve
   * oradan panelin zemin rengi (#0a0a0a) sızıyor. Mekân arka planında açık
   * renkli duvara karşı bu, ekranın kenarına çizilmiş siyah bir çizgi gibi
   * görünüyordu.
   *
   * Görseli bir piksel büyütmek bu boşluğu kapatıyor; taşan kısım zaten
   * `overflow-hidden` ile kırpılıyor. Esneme tüm genişlikte 1 px'den az,
   * yani gözle görülmüyor. Çoklu ekranda dilimler ortak `gw/gh` kullandığı
   * için hizalama da bozulmuyor.
   */
  /*
   * GÖRSEL YÜZEYİ TAM DOLDURUYOR.
   *
   * Dört köşe dört köşeye: oran tutmazsa görsel esniyor. Kırpma yok,
   * kenarda siyah bant yok. (Bir ara sığdırmaya geçilmişti; o da
   * kenarlarda bant bırakıyordu.)
   */
  /*
   * ALT KENARDAKİ KOYU ŞERİT — AYNI YUVARLAMA, DİKEYDE.
   *
   * Yukarıdaki yuvarlama sağ kenarı kapatıyordu; altta hâlâ 1-2 piksellik
   * koyu bir şerit kalıyordu (en belirgini U'nun ortasındaki alçak
   * ekranlarda). Sebebi aynı: paylaşılan yüzeyin boyu tam sayıya
   * yuvarlanınca görselin ALT kenarı kutunun alt kenarıyla birebir
   * çakışıyor, kutunun kendi boyu kesirli olduğu için de son satır
   * yumuşatılıyor ve altından panelin zemin rengi (#0a0a0a) sızıyordu.
   *
   * Görsel iki eksende de bir piksel BÜYÜK çiziliyor; taşan kısmı
   * overflow-hidden zaten kırpıyor. Esneme bütün yüzeyde 1 pikselden
   * az, yani gözle görülmüyor ve komşu ekranlar aynı yüzeyi (gw/gh)
   * kullandığı için hizalama da bozulmuyor.
   */
  const bgW = Math.ceil(gw) + 1
  const bgH = Math.ceil(gh) + 1
  const bgFor = (leftGlobal) => ({
    backgroundImage: bgImage || undefined,
    backgroundSize: `${bgW}px ${bgH}px`,
    backgroundPosition: `${-leftGlobal}px ${-offsetY}px`,
    backgroundRepeat: 'no-repeat',
  })

  // ---- KAVİSLİ: 2D Canvas ile içbükey warp (renderers/curvedRenderer.js) ----
  if (isCurved) {
    return (
      <CurvedScreen
        wPx={wPx}
        hPx={hPx}
        cols={nCols}
        rows={nRows}
        resolution={resolution}
        content={content}
        contentUrl={contentUrl}
        curveAmount={curveAmount}
        concave={type === 'curvedIn'}
        hideRegions={hideRegions}
        spanW={spanW}
        spanH={spanH}
        offsetX={offsetX}
        offsetY={offsetY}
      />
    )
  }

  // ---- İÇ L TİPİ: İki panel ortada 90°'lik köşe yapar.
  // Referans (Samsung): DIŞ kenarlar tam yükseklikte, dikişe (köşeye) doğru panel
  // kısalır — üst kenar aşağı, alt kenar yukarı eğimlenir. Yani her kanat bir trapez.
  // 3D rotateY yerine clip-path kullanılıyor: iki kanat dikişte piksel piksel
  // buluşuyor (arada boşluk oluşamıyor) ve kutu boyutu değişmediği için çoklu
  // ekranda komşularla bitişik kalıyor.
  if (isL) {
    // Kanat başına sütun sayısı: verilmişse (bağımsız kanat girişi), yoksa toplamın eşit bölünmesi
    const lCols = Math.max(1, leftCols || Math.ceil(nCols / 2))
    const rCols = Math.max(1, rightCols || Math.max(1, nCols - lCols))
    /*
     * DİKİŞ SÜTUN ORANINDA. Tam çaprazdan (45°) bakışta iki yüz de aynı
     * oranda kısalır; biri ötekinden geniş çizilirse köşe değil, sivrilen
     * tuhaf bir şekil çıkıyor.
     */
    const leftW = wPx * (lCols / (lCols + rCols))
    const rightW = wPx - leftW
    const cw = (model?.widthMm || 500) / 1000
    // Dikiş kenarının üstten/alttan içeri girme oranı (%). Köşenin derinlik hissi.
    const p = L_CORNER_PINCH_PCT
    // Her kanadın diyot dokusu kendi kabin ölçüsünden türer
    // Diyot dokusu yalnızca panel kapalıyken görünür (yayın varken görüntü izlenir)
    const leftDots = isNone || isLit ? null : ledDotSize(leftW / lCols, hPx / nRows)
    const rightDots = isNone || isLit ? null : ledDotSize(rightW / rCols, hPx / nRows)
    /*
     * KIRIM YÖNÜ KÖŞENİN TÜRÜNÜ ANLATIR.
     *
     *   İÇE (oda köşesi): ortak kenar UZAKTA → dikiş kısa, dış kenarlar
     *   tam boy. Siluet kum saati gibi.
     *
     *   DIŞA (kolon köşesi): ortak kenar EN YAKIN nokta → dikiş tam boy,
     *   dış kenarlar kısa. Siluet ortası şişkin altıgen.
     *
     * İki yüz simetrik: aynı oranda kısalıyorlar.
     */
    const disa = lYon === 'disa'
    /*
     * KANAT KESİLMİYOR, EĞİLİYOR.
     *
     * Kısa kenar yukarıdan/aşağıdan p kadar içeri giriyor. Bu şekil
     * eskiden clipPath ile KESİLEREK elde ediliyordu; görselin köşeleri
     * yok oluyordu. Artık dikdörtgenin dört köşesi trapezin dört
     * köşesine taşınıyor: görselin tamamı duruyor, perspektifle yatıyor.
     */
    const yp = (hPx * p) / 100
    const kose = (w, solUst, sagUst) => [
      { x: 0, y: solUst },
      { x: w, y: sagUst },
      { x: w, y: hPx - sagUst },
      { x: 0, y: hPx - solUst },
    ]
    const leftEgim = koseDonusumu(leftW, hPx, disa ? kose(leftW, yp, 0) : kose(leftW, 0, yp))
    const rightEgim = koseDonusumu(rightW, hPx, disa ? kose(rightW, 0, yp) : kose(rightW, yp, 0))

    // İki kanadın birleşiminin dış hattı — alttaki dolgu katmanı bu şekle kırpılır
    const lYuzde = (leftW / wPx) * 100
    const birlesikClip = disa
      ? `polygon(0% ${p}%, ${lYuzde}% 0%, 100% ${p}%, 100% ${100 - p}%, ${lYuzde}% 100%, 0% ${100 - p}%)`
      : `polygon(0% 0%, ${lYuzde}% ${p}%, 100% 0%, 100% 100%, ${lYuzde}% ${100 - p}%, 0% 100%)`

    return (
      <div className="relative shrink-0 max-w-full" style={{ width: wPx, height: hPx }}>
        {/*
          DİKİŞ DOLGUSU. İki kanat komşu kutular ve kırpma kenarları
          yumuşatıldığında tam örtüşmüyor; dikişin alt ucunda birkaç piksellik
          bir çentik kalıyordu. Beyaz zeminde fark edilmiyordu, kamera
          görünümünde arkadaki görüntü oradan sızıp "iki ekran arasında boşluk
          var" izlenimi veriyordu.

          Kanatların ALTINA, aynı içeriği taşıyan tek parça bir katman konuyor;
          L biçimine kırpıldığı için dışarı taşmıyor. Kanatlar üstünü örtüyor,
          yalnızca dikişteki saç teli kadar açıklıktan bu katman görünüyor —
          yani arka plan değil, ekranın kendi görüntüsü.
        */}
        {!frameOnly && !isNone && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              clipPath: birlesikClip,
              backgroundColor: '#0a0a0a',
              filter: isLit ? LED_LIT_FILTER : undefined,
              pointerEvents: 'none',
              ...bgFor(offsetX),
            }}
          />
        )}
        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          {/*
            İKİ YÜZ FARKLI AYDINLIKTA — köşeyi asıl anlatan şey bu.
            Referans: LED küp ekran. Orada da köşede parlak bir çizgi yok;
            bir yüz ışığı alıyor, komşu yüz gölgede kalıyor ve kenar
            kendiliğinden okunuyor.

            ESKİDEN iki yüz eşit parlaklıktaydı ve köşeyi dikişteki beyaz bir
            ışık teli anlatıyordu. Sonuç yüzeyin katlandığı hissi değil,
            görüntünün ortasına çizilmiş tuhaf bir çizgiydi.

            Sol kanat ışığı alan yüz: tam parlaklıkta bırakılıyor.
          */}
          <div
            style={{
              position: 'relative',
              width: leftW,
              height: hPx,
              /* Eğim zemini de kapsıyor: köşelerde siyah üçgen kalmıyor. */
              transform: leftEgim || undefined,
              transformOrigin: '0 0',
              /* Video katmanı bütün şerit boyunda; kanadın dışına taşmasın. */
              overflow: 'hidden',
              /*
               * frameOnly: içerik ŞERİT düzeyinde tek katman olarak çiziliyor
               * (çoklu ekran). Kanat kendi zeminini boyarsa o katmanı kapatır
               * ve ekran simsiyah kalır — L tipinde videonun ortadaki ekranda
               * kaybolmasının sebebi buydu.
               */
              backgroundColor: frameOnly ? 'transparent' : isNone ? '#ffffff' : '#0a0a0a',
              filter: !frameOnly && isLit ? LED_LIT_FILTER : undefined,
              ...(frameOnly ? null : bgFor(offsetX)),
            }}
          >
            {/* spanW verilmişse içerik paylaşılıyor demektir: senkron gerekiyor. */}
      {videoSrc && (
        <VideoLayer src={videoSrc} gw={gw} gh={gh} left={offsetX} top={offsetY} lit={isLit} senkron={!!spanW} />
      )}
            {leftDots && <LedDotsCanvas wPx={leftW} hPx={hPx} dotW={leftDots.dotW} dotH={leftDots.dotH} />}
            {/*
              KATLANMA GÖLGESİ — SOL KANAT.

              Yukarıdaki not "köşeyi asıl anlatan şey iki yüzün farklı
              aydınlıkta olması" diyor ama gölge katmanı bir ara kaldırılmış;
              geriye tek ipucu olarak trapez kırpımı kalınca ekran DÜZ
              görünüyordu. Gölge geri geliyor, fakat düz karartma olarak değil:
              dikişe doğru koyulaşan bir geçiş. Yüzeyin ortası ve dış kenarı
              tam canlılıkta kalıyor, yalnızca köşeye yaklaşırken kararıyor —
              gerçek bir katlanmada da ışık böyle davranır.
            */}
            {!isNone && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background:
                    'linear-gradient(to right, rgba(0,0,0,0) 55%, rgba(0,0,0,0.10) 85%, rgba(0,0,0,0.20) 100%)',
                }}
              />
            )}
          </div>
          {/* Sağ kanat — gölgede kalan yüz (bkz. yukarıdaki not) */}
          <div
            style={{
              position: 'relative',
              width: rightW,
              height: hPx,
              transform: rightEgim || undefined,
              transformOrigin: '0 0',
              overflow: 'hidden',
              backgroundColor: frameOnly ? 'transparent' : isNone ? '#ffffff' : '#0a0a0a',
              filter: !frameOnly && isLit ? LED_LIT_FILTER : undefined,
              ...(frameOnly ? null : bgFor(offsetX + leftW)),
            }}
          >
            {videoSrc && <VideoLayer src={videoSrc} gw={gw} gh={gh} left={offsetX + leftW} top={offsetY} lit={isLit} />}
            {rightDots && <LedDotsCanvas wPx={rightW} hPx={hPx} dotW={rightDots.dotW} dotH={rightDots.dotH} />}
            {/*
              KATLANMA GÖLGESİ — SAĞ KANAT (gölgede kalan yüz).
              Dikiş bu kanadın SOL kenarında; koyuluk oradan başlayıp dışa
              doğru açılıyor. Sol kanattan biraz daha güçlü, çünkü bu yüz
              ışıktan uzaklaşan taraf.
            */}
            {!isNone && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background:
                    'linear-gradient(to right, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.14) 18%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0) 70%)',
                }}
              />
            )}
          </div>
        </div>
        {/*
          BOŞ ÇERÇEVE ("Resim Yok") DIŞ HATTI.
          Düz ekranda bunu `border` yapıyor; burada olmaz, çünkü clipPath
          kenarlığı da kırpıyor. Hat çizilmeyince beyaz kanatlar beyaz duvarın
          üstünde tamamen kayboluyordu — "Resim Yok her şeyi kaldırıyor"
          görüntüsünün sebebi buydu. Şekil SVG ile çiziliyor: iki trapezin dış
          hattı + ortadaki köşe çizgisi.
        */}
{/*
          DIŞ HAT VE KÖŞE ÇİZGİSİ — HER ZAMAN.

          Hat yalnızca "Resim Yok" seçiliyken çiziliyordu. Açık temada
          beyaz duvarın üstünde iki yüzün nerede bittiği, hatta köşenin
          olup olmadığı anlaşılmıyordu. Hat artık her içerikte var ve
          kırımın asimetrik geometrisine oturuyor.
        */}
        <svg
          width={wPx}
          height={hPx}
          viewBox={`0 0 ${wPx} ${hPx}`}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          {(() => {
            const yp = (hPx * p) / 100
            const hat = isNone ? '#64748b' : 'rgba(0,0,0,0.55)'
            /* Dışa dönük köşede dikiş TAM BOY, dış kenarlar kısa. */
            const dHat = disa
              ? `M0,${yp} L${leftW},0 L${wPx},${yp} L${wPx},${hPx - yp} L${leftW},${hPx} L0,${hPx - yp} Z`
              : `M0,0 L${leftW},${yp} L${wPx},0 L${wPx},${hPx} L${leftW},${hPx - yp} L0,${hPx} Z`
            const y1 = disa ? 0 : yp
            const y2 = disa ? hPx : hPx - yp
            return (
              <>
                {!sade && <path d={dHat} fill="none" stroke={hat} strokeWidth="1.25" />}
                {/* Köşe çizgisi: iki yüzün buluştuğu kenar. */}
                {!sade && <line x1={leftW} y1={y1} x2={leftW} y2={y2} stroke={hat} strokeWidth="1.25" />}
              </>
            )
          })()}
        </svg>

        {/*
          KÖŞE ÇİZGİSİ — yalnızca ince bir kırım gölgesi. Beyaz ışık teli
          KALDIRILDI: görüntünün ortasına çizilmiş parlak bir şerit gibi
          duruyordu ve asıl tuhaflık oydu. Küpte de köşede parlama yok,
          yalnızca iki yüzün buluştuğu koyu bir kenar var.

          Genişlik 7 → 3: kalın şerit köşe değil, bir nesne gibi görünüyordu.
        */}
        {!isNone && (
          <div
            style={{
              position: 'absolute',
              left: leftW,
              /* Dikiş: içe dönükte kısa (uzaktaki kenar), dışa dönükte tam boy. */
              top: disa ? '0%' : `${p}%`,
              height: disa ? '100%' : `${100 - 2 * p}%`,
              width: 3,
              transform: 'translateX(-50%)',
              background:
                'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.40) 50%, rgba(0,0,0,0) 100%)',
              pointerEvents: 'none',
            }}
          />
        )}
        {/* Dış kenarlarda panel kalınlığı — en öndeki kenarlar olduğu için
            ince bir açık şerit, gövdeye hacim kazandırır.
            Sade kipte yok: yan yana iki ekranın arasında ikisi birleşip
            tek bir ayrım çizgisi oluşturuyordu. */}
        {!isNone && !sade && !kenarsiz && (
          <>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02))', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 1, background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', pointerEvents: 'none' }} />
          </>
        )}
        {/* Kanat başına metre ölçüsü */}
        {!hideRegions && (
          <div style={{ position: 'absolute', left: 0, top: hPx + 8, width: wPx, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
            <span className="bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 text-[10px] px-1.5 py-0.5 rounded-lg whitespace-nowrap max-w-[45%] overflow-hidden text-ellipsis">{(lCols * cw).toLocaleString('tr-TR', { maximumFractionDigits: 3 })} m</span>
            <span className="bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 text-[10px] px-1.5 py-0.5 rounded-lg whitespace-nowrap max-w-[45%] overflow-hidden text-ellipsis">{(rCols * cw).toLocaleString('tr-TR', { maximumFractionDigits: 3 })} m</span>
          </div>
        )}
      </div>
    )
  }

  // ---- DÜZ (ve boş çerçeve) ----
  const signal = resolution === 'UHD' ? { w: 3840, h: 2160 } : { w: 1920, h: 1080 }
  // model yoksa da çizim sürmeli: burada patlarsa tasarım katmanının TAMAMI
  // çizilmiyor ve kamerada hiçbir şey görünmüyordu.
  const cpw = model?.pixelWidth || 1
  const cph = model?.pixelHeight || 1
  const dispCols = Math.max(1, Math.floor(signal.w / cpw))
  const dispRows = Math.max(1, Math.floor(signal.h / cph))
  const groups = []
  for (let gy = 0; gy * dispRows < nRows; gy++) {
    for (let gx = 0; gx * dispCols < nCols; gx++) {
      const wCells = Math.min(dispCols, nCols - gx * dispCols)
      const hCells = Math.min(dispRows, nRows - gy * dispRows)
      groups.push({ left: (gx * dispCols) / nCols, top: (gy * dispRows) / nRows, width: wCells / nCols, height: hCells / nRows })
    }
  }
  // Diyot dokusu kabin ölçüsünden türer → desen kabin sınırlarıyla hizalı olur
  const cabinetDots = ledDotSize(wPx / nCols, hPx / nRows)

  /*
   * BİRLEŞİMDEKİ EKRANIN KENARLARI DERİNLİĞİNE GÖRE KISALIYOR.
   * Kırım ekran başına geliyor (bkz. birlesimGeometrisi); L, U, küp ve
   * açılı aynı çizimle çalışıyor. Kırım yoksa kutu dikdörtgen kalıyor.
   */
  const kirimVar = solKirim > 0.01 || sagKirim > 0.01
  /*
   * KIRIM KESMİYOR, EĞİYOR.
   *
   * Birleşimdeki ekranın derinliğe giden kenarı kısalıyor. Şekil eskiden
   * clipPath ile kesiliyordu: görselin üst ve alt köşeleri yok oluyordu.
   * Artık dikdörtgenin dört köşesi trapezin dört köşesine taşınıyor —
   * görsel kesilmiyor, perspektifle yatıyor.
   */
  const ySol = (hPx * solKirim) / 100
  const ySag = (hPx * sagKirim) / 100
  const kirimEgimi = kirimVar
    ? koseDonusumu(wPx, hPx, [
        { x: 0, y: ySol },
        { x: wPx, y: ySag },
        { x: wPx, y: hPx - ySag },
        { x: 0, y: hPx - ySol },
      ])
    : null
  return (
    <div style={{ width: wPx, height: hPx, position: 'relative' }} className="shrink-0">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          /* Eğim zemini de kapsıyor: köşelerde siyah üçgen kalmıyor. */
          transform: kirimEgimi || undefined,
          transformOrigin: '0 0',
          backgroundColor: frameOnly ? 'transparent' : isNone ? '#ffffff' : '#0a0a0a',
          /* Sade kipte kenarlık yok; boş ekran da tasarımın parçası gibi duruyor. */
          border: isNone && !kirimVar && !sade ? '1px solid #64748b' : undefined,
          // Panel çevresinde gölge/ışıma YOK: kenarlarda gölgelik olarak görünüyordu
          // ve kavisli ekranla tutarsızdı (orada da hiç yok).
        }}
        className="overflow-hidden"
      >
      {!frameOnly && bgImage && (
        <div style={{ position: 'absolute', inset: 0, filter: isLit ? LED_LIT_FILTER : undefined, ...bgFor(offsetX) }} />
      )}

      {/* spanW verilmişse içerik paylaşılıyor demektir: senkron gerekiyor. */}
      {videoSrc && (
        <VideoLayer src={videoSrc} gw={gw} gh={gh} left={offsetX} top={offsetY} lit={isLit} senkron={!!spanW} />
      )}

      {/* LED diyot dokusu — YALNIZCA panel kapalıyken (yayın yokken).
          Ekranda görüntü varken diyotlar görünmez; izleyici görüntüyü görür.
          Desen kabin sınırlarıyla hizalıdır, modül modül tekrarlanır. */}
      {!frameOnly && !isNone && !isLit && cabinetDots && (
        <LedDotsCanvas wPx={wPx} hPx={hPx} dotW={cabinetDots.dotW} dotH={cabinetDots.dotH} />
      )}

      {/* Cam parlaması — yayın yaparken ekranın camlı yüzeyinde ışık yansıması */}
      {!frameOnly && isLit && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: LED_SHEEN }} />
      )}

      {/*
        EKRANIN KENARI — "Ölçüleri gizle" ile birlikte kalkıyor.

        Yan yana iki ekranın arasındaki ince dikey çizgi, görselin
        kapatamadığı zemin şeridinden geliyordu: yani kusurdu, ama aynı
        zamanda ekranların nerede bittiğini gösteren tek işaretti. Zemin
        sızıntısı kapandı (bkz. bgW/bgH); kenar çizgisi artık BİLEREK
        çiziliyor ve sade kipte (ölçüler gizliyken) hiç çizilmiyor —
        tasarım orada tek bir görsel gibi duruyor. Aynı çizgi iç L tipinde
        de var (bkz. yukarıdaki aynı blok).
      */}
      {/*
        YAYDA KENAR ÇİZGİSİ YOK (kenarsiz).

        Yuvarlak eklemle birleşen ekranlar tek bir yay çiziyor; yayın
        geometrisi pürüzsüz ama her ekranın KENDİ kenar çizgisi eklem
        yerinde duruyor ve göz onu köşe olarak okuyordu: "bütün eklemler
        yuvarlak" seçili bir grupta bile tasarım dört ayrı panel gibi
        görünüyordu. Yayın dilimlerinde bu çizgi hiç çizilmiyor, yay tek
        bir kavisli ekran gibi duruyor (bkz. Birlesim2D).
      */}
      {!frameOnly && !isNone && !sade && !kenarsiz && (
        <>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02))', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 1, background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', pointerEvents: 'none' }} />
        </>
      )}
      </div>

      {/*
        EĞİK EKRANIN DIŞ HATTI.

        Hat eğilen katmanın DIŞINDA duruyor: kendisi de eğilseydi çizgi
        kalınlığı köşelerde bozulurdu. Açık temada beyaz duvarın üstünde
        şeklin nerede bittiği bu çizgiden anlaşılıyor.
      */}
      {kirimVar && !sade && (
        <svg
          width={wPx}
          height={hPx}
          viewBox={`0 0 ${wPx} ${hPx}`}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          <path
            d={`M0,${ySol} L${wPx},${ySag} L${wPx},${hPx - ySag} L0,${hPx - ySol} Z`}
            fill="none"
            stroke={isNone ? '#64748b' : 'rgba(0,0,0,0.55)'}
            strokeWidth="1.25"
          />
        </svg>
      )}
    </div>
  )
}

/*
 * ÖLÇÜ ETİKETİ.
 *
 * Görünme eşiği etiketin GERÇEK genişliğine göre: "0,34 m" 10 px yazıyla
 * yaklaşık 46 piksel tutuyor. Eşik 30 iken dar şeritlerde etiketler
 * komşularının üstüne biniyor ve üç ölçü iç içe geçmiş gibi duruyordu.
 *
 * Pay etiketleri (muted) sığmadığında gizleniyor; EKRANIN kendi ölçüsü ise
 * her zaman yazılıyor — okunması gereken asıl sayı o.
 */
const ETIKET_EN_AZ = 50

/*
 * ÖLÇÜ ETİKETİ İLE ÇİZİM ARASINDAKİ EN AZ BOŞLUK (px).
 *
 * Etiketler duvara ve tasarıma yapışıyor, dar ölçülerde üstlerine biniyordu.
 * Aralık her etikete aynı miktarda ekleniyor; tuvalde etiketlere ayrılan pay
 * da aynı kadar büyüyor, yani etiketler çizimden uzaklaşırken tuvalin dışına
 * taşmıyor.
 */
const ETIKET_ARALIK = 12

/**
 * Yatay ölçü etiketi.
 *
 * `yazi`: punto tasarımın ekrandaki büyüklüğüne göre değişiyor. Sabit punto,
 * küçük bir tasarımda etiketi ekranın kendisinden büyük gösteriyordu.
 *
 * KIRPMA YOK: etiket ait olduğu bölmeden geniş olabilir, taşan kısım görünür
 * kalır. Eskiden `overflow-hidden` + `text-ellipsis` vardı ve dar bölmelerde
 * yazı yarım görünüyordu — "0,16 m" yerine yalnızca "0".
 */
function SegH({ w, label, muted, yazi = 11 }) {
  const dolgu = `${Math.round(yazi * 0.35)}px ${Math.round(yazi * 0.5)}px`
  return (
    <div style={{ width: w }} className="flex items-center justify-center shrink-0 overflow-visible">
      {(!muted || w >= ETIKET_EN_AZ) && (
        <span
          style={{ fontSize: yazi, padding: dolgu }}
          className={`leading-none rounded-lg whitespace-nowrap ${muted ? 'bg-neutral-400 text-white dark:bg-neutral-200 dark:text-neutral-900' : 'bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900'}`}
        >
          {label}
        </span>
      )}
    </div>
  )
}

/**
 * Dikey ölçü etiketi.
 *
 * DAR PAY DA YAZILIYOR. Üst/alt duvar payı 50 pikselden inceyse etiket hiç
 * çıkmıyordu; duvar 1,00 m, tasarım 0,96 m olunca kalan 2 cm'lik şeridin
 * ölçüsü hiçbir yerde yazmıyordu. Oysa montajda merak edilen tam o sayı.
 * İnce payda etiket şeridin İÇİNE sığmadığı için yatay yazılıp bandın
 * sağına çıkıyor; geniş payda eskisi gibi dikey ve ortalanmış duruyor.
 */
function SegV({ h, label, muted, yazi = 11, kacis = null }) {
  const dolgu = `${Math.round(yazi * 0.5)}px ${Math.round(yazi * 0.35)}px`
  const dar = muted && h < ETIKET_EN_AZ
  /*
   * DAR PAYIN ETİKETİ TASARIMIN ÜSTÜNE BİNMİYOR.
   *
   * Dar payda etiket bandın SAĞINA çıkıyor (şeridin içine sığmıyor).
   * Tasarım tuvalin sağ kenarına dayandığında orada yer kalmıyor; etiket
   * önce tuvalin dışına taşıp kırpılıyordu, sonra bandın SOLUNA alındı ve
   * bu kez doğrudan tasarımın üstüne biniyordu (ölçüldü: 0,02 m etiketleri
   * görselin sağ üst ve sağ alt köşesinin üzerinde).
   *
   * Sağda yer yoksa etiket artık duvarın DIŞINA kaçıyor: üst pay duvarın
   * üst çizgisinin üstüne, alt pay alt çizgisinin altına. Orası her zaman
   * boş (çizimin çevresindeki pay), yani etiket ne kırpılıyor ne de
   * tasarımı örtüyor. 'kacis' verilmemiş çağrılarda eski davranış (sola
   * geçme) sürüyor.
   */
  const etiketRef = useRef(null)
  const [yer, setYer] = useState('sag')
  /* Ölçü değişince yeniden karar veriliyor; yoksa bir kez kaçan hep kaçık kalır. */
  useLayoutEffect(() => {
    setYer('sag')
  }, [h, label, yazi, dar])
  useLayoutEffect(() => {
    if (!dar) {
      if (yer !== 'sag') setYer('sag')
      return undefined
    }
    const bak = () => {
      const el = etiketRef.current
      if (!el) return
      const kap = el.closest('#pdf-onizleme')
      if (!kap) return
      const e = el.getBoundingClientRect()
      const k = kap.getBoundingClientRect()
      if (yer !== 'sag' || e.right <= k.right - 1) return
      if (kacis === 'ust' || kacis === 'alt') setYer(kacis)
      else if (e.width + 6 <= e.left - k.left) setYer('sol')
    }
    bak()
    window.addEventListener('resize', bak)
    return () => window.removeEventListener('resize', bak)
  }, [dar, yer, h, label, yazi, kacis])
  /* Dar etiketin konumu: sağ (olağan), duvarın üstü/altı ya da sol. */
  const darKonum =
    yer === 'ust'
      ? { bottom: '100%', right: 0, marginBottom: 3 }
      : yer === 'alt'
        ? { top: '100%', right: 0, marginTop: 3 }
        : yer === 'sol'
          ? { right: '100%', marginRight: 4 }
          : { left: '100%', marginLeft: 4 }
  /* Pay yoksa (tasarım duvarı tam dolduruyor) yazılacak bir şey de yok. */
  if (muted && h <= 0.5) return <div style={{ height: h }} className="shrink-0" />
  return (
    <div style={{ height: h }} className="relative flex items-center justify-center shrink-0 overflow-visible">
      <span
        ref={etiketRef}
        style={
          dar
            ? {
                position: 'absolute',
                ...darKonum,
                fontSize: Math.max(9, yazi - 1),
                padding: `${Math.round(yazi * 0.35)}px ${Math.round(yazi * 0.5)}px`,
              }
            : { writingMode: 'vertical-rl', fontSize: yazi, padding: dolgu }
        }
        className={`leading-none rounded-lg whitespace-nowrap ${muted ? 'bg-neutral-400 text-white dark:bg-neutral-200 dark:text-neutral-900' : 'bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900'}`}
      >
        {label}
      </span>
    </div>
  )
}

// Duvar boyutu +/- butonu
/**
 * Ölçü +/- düğmesi.
 *
 * `boy`: tasarımın ekrandaki büyüklüğüne göre değişiyor. Sabit boy iki yönde
 * de yanlıştı — küçük bir tasarımda düğmeler ekranı bastırıyor, büyük bir
 * tasarımda kaybolup gidiyordu.
 */
/*
 * Pasif düğmenin SEBEBİ.
 *
 * Düğme kendi kendine pasifleşiyor ve neden olduğu hiçbir yerde yazmıyordu.
 * İpucu düğmenin KABINA konuyor: pasif bir <button> fare olaylarını almaz,
 * title'ı da görünmez — kap alıyor.
 */
function StepBtn({ dir, onClick, disabled, boy = 28, ipucu = null }) {
  const govde = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'plus' ? 'Artır' : 'Azalt'}
      style={{ width: boy, height: boy }}
      className={`flex items-center justify-center ${disabled ? 'text-neutral-300' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-[#1b2029]'}`}
    >
      <svg viewBox="0 0 24 24" width={Math.round(boy * 0.4)} height={Math.round(boy * 0.4)} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        {dir === 'plus' && <line x1="12" y1="6" x2="12" y2="18" />}
        <line x1="6" y1="12" x2="18" y2="12" />
      </svg>
    </button>
  )
  if (!disabled || !ipucu) return govde
  return (
    <span title={ipucu} style={{ display: 'flex' }}>
      {govde}
    </span>
  )
}

// Noktalı ölçü kılavuz çizgileri
/*
 * Ölçü çizgileri iki temada farklı tonda olmalı: açık zeminde soluk gri,
 * koyu zeminde daha açık gri. CSS sınıfı yerine doğrudan renk kullanıldığı
 * için tema burada elle okunuyor.
 */
const koyuTema = () =>
  typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'

function VLine({ left, top, height }) {
  return <div style={{ position: 'absolute', left, top, height, borderLeft: `1px dashed ${koyuTema() ? '#525a67' : '#cbd5e1'}` }} />
}
function HLine({ top, left, width }) {
  return <div style={{ position: 'absolute', top, left, width, borderTop: `1px dashed ${koyuTema() ? '#525a67' : '#cbd5e1'}` }} />
}

function HumanSilhouette({ height, showMeasure = true }) {
  // height = figürün olması gereken yükseklik (HUMAN_HEIGHT_M). Görseli, FİGÜR o boyda
  // olacak şekilde büyüt; saydam payları negatif margin ile dışarı taşır →
  // ayak hizası duvarın alt kenarına oturur ve kutu yatayda gereksiz yer kaplamaz.
  const imgH = height / HUMAN_FIG_RATIO
  const imgW = imgH * HUMAN_IMG_AR
  return (
    /*
     * Kutu tam FİGÜR kadar (ölçü çizgisi baş ve ayak hizasına otursun).
     * Görsel MUTLAK konumlu: flex çocuğu olsaydı esneyip yatayda ezilirdi.
     * flexShrink:0 da bu kutunun dış flex akışında daralmasını engeller.
     */
    <div
      style={{
        position: 'relative',
        height,
        width: height * HUMAN_FIG_W_RATIO,
        flexShrink: 0,
      }}
    >
      <img
        src={varlik('human.png')}
        alt=""
        style={{
          position: 'absolute',
          height: imgH,
          width: imgW,
          maxWidth: 'none',
          left: -(imgW * HUMAN_LEFT_PAD),
          bottom: -(imgH * HUMAN_BOTTOM_PAD),
          display: 'block',
        }}
      />

      {/* Boy ölçüsü — ölçeğin doğruluğu gözle doğrulanabilsin diye */}
      {showMeasure && (
        <div style={{ position: 'absolute', left: -16, top: 0, height, width: 12 }}>
          {/* Dikey ölçü çizgisi + baş ve ayak hizasında uç çizgileri */}
          <div style={{ position: 'absolute', left: 6, top: 0, bottom: 0, borderLeft: '1px dashed #94a3b8' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, width: 12, borderTop: '1px solid #94a3b8' }} />
          <div style={{ position: 'absolute', left: 0, bottom: 0, width: 12, borderTop: '1px solid #94a3b8' }} />
          <span
            style={{
              position: 'absolute',
              left: 3,
              top: '50%',
              transform: 'translate(-100%, -50%)',
              writingMode: 'vertical-rl',
              background: '#64748b',
              color: '#ffffff',
              fontSize: 10,
              lineHeight: 1,
              padding: '5px 3px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
            }}
          >
            {HUMAN_HEIGHT_M.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} m
          </span>
        </div>
      )}
    </div>
  )
}

export default function WallPreview({
  model,
  width,
  height,
  screens = [],
  cols = 1,
  rows = 1,
  content = 'led',
  contentUrl = null,
  screenType = 'flat',
  resolution = 'FHD',
  showMeasurements = true,
  /* Küp birleşimi: şerit yerine gerçek kutu çiziliyor. */
  kupKipi = false,
  /* L / U / açılı: kollar gerçek açısıyla, önden sabit. */
  birlesimKipi = false,
  /*
   * SADE KİP — "Ölçüleri gizle" açıkken kenarlıklar ve ayrım çizgileri de
   * kalkıyor; tasarım tek bir görsel gibi duruyor.
   */
  sade = false,
  onColsChange,
  onRowsChange,
  /* Çizimdeki bir ekrana tıklayınca onu düzenlemeye alan geri çağırma. */
  onEkranSec = null,
  /* Hangi ekran düzenleniyor — çizimde çerçeveyle işaretleniyor. */
  seciliEkranId = null,
  colsMax = Infinity,
  rowsMax = Infinity,
  /* Sınıra gelince pasif düğmenin üstünde çıkan açıklama (duvar dolu gibi). */
  colsIpucu = null,
  rowsIpucu = null,
  /*
   * TASARIMIN KENDİ DÖNÜŞÜ (derece) ve onu değiştiren geri çağırma.
   *
   * Birden çok ekran birleşince kolların gerçekten nereye baktığı karşıdan
   * anlaşılmıyor. Tasarımın üstünde sürüklemek onu kendi ekseninde
   * çeviriyor; duvar ve mekân yerinde kalıyor. Çift tıklama karşıya
   * döndürüyor.
   */
  donus = null,
  onDonus = null,
  /* Tasarım duvardan büyük mü (bkz. App → tasarimDuvardanBuyuk). */
  tasma = false,
  /* Varsayılan bakış açısı (bkz. App → varsayilanYaw). */
  donusVarsayilan = null,
  hideRegions = false,
  curveAmount = 60,
  // Arkada bir mekân sahnesi çizildiyse duvar kutusu SAYDAM olur; odanın kendi
  // duvarı görünsün diye. Beyaz dikdörtgen gri odanın içinde yama gibi durur.
  sahneVar = false,
  /*
   * Mekânın duvar/zemin/tavan renkleri; varsa duvar tasarımla birlikte
   * kırılıyor (bkz. Birlesim2D → duvarYuzu).
   */
  duvarDolgu = null,
  /*
   * Ekranın GÖRÜNEN yüzü gizlensin mi. Fotoğraflı mekânda tasarım gerçek
   * 3B olarak çiziliyor (Mekan3D.jsx); düz çizim de altında durunca aynı
   * ekran iki kez görünüyor ve ikisi birbirini kirletiyordu. Ölçü
   * etiketleri, tutamaklar ve yerleşim hesapları olduğu gibi kalıyor —
   * gizlenen yalnızca yüz.
   */
  ekranGizle = false,
  /*
   * Yerinde 3B katmanı. Bir işlev olarak alınıyor çünkü yerleştirilecek yeri
   * yalnızca BURASI biliyor: duvar kutusunun ölçüsü ve ekranın o kutunun
   * içindeki gerçek dörtgeni. Daha önce katman App tarafında çiziliyor ve
   * konumu tuvalin merkezine göre hesaplıyordu; duvar kutusu tuvalde ortalı
   * olmadığı için ekran yanlış yere düşüyordu.
   */
  /*
   * BÖLÜNMÜŞ İÇERİK DİLİMİ — {sx, sy, sw, sh} ya da null.
   *
   * Bu ekran içeriği başka ekranlarla paylaşıyorsa içerik hepsinin üstüne
   * tek parça seriliyor ve buraya yalnızca kendi dilimi düşüyor. Ölçüler
   * EKRANIN KENDİ boyu cinsinden geliyor (bkz. icerikBolme.js), böylece
   * burada piksele çevirmek tek çarpma.
   */
  dilim = null,
  uc3dKatman = null,
  /*
   * Ekran kutusunun (kose koordinatlarının başnoktası) KAPSAYICIYA göre
   * yeri bildiriliyor. App, fotoğraf sınırını uygularken bu noktayı
   * kullanıyor: kose (0,0) ekranda tam olarak nereye düşüyor.
   *
   * Ölçmeden hesaplamak mümkün değil — duvar kutusu kapsayıcının içinde
   * insan silueti, boşluklar ve ölçü payları yüzünden ortalanmıyor.
   * Sınırı tuvale göre uygulamak bu yüzden tutmuyordu: tasarım
   * fotoğrafın dışına çıkabiliyordu.
   */
  onEkranKutusu = null,
  /*
   * Mekân çizimi ekranın DIŞINA taşıyor (pano kasası, direği). Ölçü
   * etiketleri ve +/- düğmeleri ekranın hemen kenarında durduğu için onun
   * üstüne biniyordu. Bu pay kadar dışarı itiliyorlar.
   */
  sahnePayPx = 0,
  /*
   * FOTOGRAFLI MEKANDA SURUKLEME.
   *
   * Kayma ekranin kendisine degil, ekrani ve olcu etiketlerini bir arada
   * tutan sarmalayiciya uygulanir: etiketler ve +/- dugmeleri ekranla
   * birlikte gider, aralarindaki hiza bozulmaz.
   */
  kayma = null,
  tutamak = null,
  /*
   * EKRANA VERILEN ACI (bkz. hooks/useYon.js).
   *
   * Yalnizca EKRAN KUTUSUNA uygulaniyor; olcu etiketleri ve +/- dugmeleri
   * disarida kaliyor. Onlar mekanin degil arayuzun parcasi, dondurulunce
   * okunmaz oluyorlardi.
   */
  yon = null,
  /*
   * DÖRT KÖŞE HEDEFİ (px, tasarım kutusunun sol üstüne göre).
   *
   * Verilirse ekran, açı yerine gerçek bir homografiyle bu dörtgene
   * oturtuluyor: yamuk bir billboard yüzeyine birebir eşleme. İçerik DOM
   * ağacında kaldığı için video oynamaya devam ediyor.
   */
  kose = null,
  /*
   * Sahnenin duvarının gerçek ölçüsü, { w, h } metre. Verilirse ÇİZİM ÖLÇEĞİ
   * buna sabitlenir: mekânın duvarı 6 m ise 3 m'lik ekran yarısını kaplar.
   * Ölçek hissini veren şey bu — yoksa her ekran aynı büyüklükte görünüyordu.
   *
   * Yalnızca çizimi etkiler. Ölçü etiketleri ve teknik değerler kullanıcının
   * girdiği ölçülerden hesaplanmaya devam eder.
   */
  /*
   * Sahne seciliyken kullanilacak VARSAYILAN olcek (px/m): mekan tuvali tam
   * dolduracak kadar yakin. Ekran buna sigmiyorsa asagida kucultulur ve mekan
   * da ayni oranda kucultulur (bkz. onPxPerM).
   */
  sahneOlcekVarsayilan = null,
  // Kullanilan nihai olceği disari bildirir; sahne ayni olcekle cizilsin diye.
  onPxPerM,
  /*
   * ÇİZİM GİZLİ AMA YERİNDE.
   *
   * Kendi fotoğrafı kipinde ekran, YERLEŞTİRİLENE kadar görünmemeli:
   * fotoğrafın ortasında düz ve yanlış ölçekte duran bir önizleme
   * kullanıcıyı "ekran oraya mı gidecek?" diye yanıltıyordu. Bileşen
   * sökülmüyor, yalnızca görünmez oluyor: ölçek (olcekRef/onPxPerM) ve
   * tuval boyutu ölçümleri yerleştirme hesaplarının girdisi.
   */
  gizle = false,
}) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ w: 900, h: 560 })
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setSize({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /*
   * Kullanılan nihai ölçek dışarı bildirilir — mekân sahnesi ekranla AYNI
   * ölçekte çizilsin diye. İki çizim dalı (tek / çoklu ekran) da kendi
   * pxPerM'ini buraya yazar; bildirim tek yerden yapılır ki hook koşullu
   * çağrılmasın.
   */
  /*
   * Ölçü kılavuz çizgileri (duvar ve ekran sınırlarını etiketlere bağlayan
   * kesik çizgiler) sahne varken ÇİZİLMEZ. Teknik çizim öğeleri gerçek bir
   * mekân fotoğrafının üzerinde yabancı duruyor; müşteri oraya ürünü
   * yerleştirilmiş görmek istiyor, kesitini değil. Sahne yokken hepsi eskisi
   * gibi görünür.
   */
  const { t } = useLang()

  const VL = sahneVar ? () => null : VLine
  const HL = sahneVar ? () => null : HLine

  /*
   * DAR TUVAL (telefon).
   *
   * Duvarın çevresinde ölçü etiketlerine yer ayrılır. Masaüstünde 180×190 px
   * makul bir pay; ama telefonda tuval zaten ~400×330 px olduğu için bu pay
   * çizime neredeyse yer bırakmıyor ve duvar iğne ucu kadar kalıyordu.
   *
   * Telefonda pay yarıya iner. Etiketler yine sığar (yan etiketler döndürülmüş
   * hâlde ~26 px), çizim ise iki katından fazla büyür.
   */
  const dar = size.w > 0 && size.w < 560

  /*
   * DÖNMÜŞ TASARIMDA ÖLÇÜ ETİKETİ YOK.
   *
   * Etiketler ve kılavuz çizgileri duvara göre, yani KARŞIDAN bakışa göre
   * konumlanıyor; tasarım çevrilince yazılar şeklin üstüne biniyor ve
   * gösterdikleri kenarla ilgisi kalmıyor. Çift tıklayıp karşıya dönünce
   * hepsi geri geliyor.
   */
  const donuk = !!(donus && (donus.yaw || donus.egim))

  /*
   * "YÖNÜ SIFIRLA" VARSAYILAN BAKIŞA DÖNDÜRÜYOR.
   *
   * Varsayılan bakış artık her zaman karşıdan değil: çoklu tasarım, bir
   * ekranı karşıya alacak kadar çevrilmiş geliyor (bkz. App →
   * varsayilanYaw). Bu yüzden düğmenin görünme ölçütü "açı sıfır değil"
   * olamaz; ölçüt varsayılandan SAPMA.
   */
  const varsayilanFark =
    Math.abs((donus?.yaw || 0) - (Number(donusVarsayilan?.yaw) || 0)) > 0.01 ||
    Math.abs((donus?.egim || 0) - (Number(donusVarsayilan?.egim) || 0)) > 0.01

  /* Fareyle döndürme: basıldığı yer ve o andaki açı. */
  const donusBas = useRef(null)
  const donusBaslat = (ev) => {
    if (!onDonus || ev.button !== 0) return
    donusBas.current = {
      x: ev.clientX,
      y: ev.clientY,
      yaw: donus?.yaw || 0,
      egim: donus?.egim || 0,
      tasidi: false,
    }
    ev.currentTarget.setPointerCapture?.(ev.pointerId)
  }
  const donusSurdur = (ev) => {
    const b = donusBas.current
    if (!b || !onDonus) return
    const dx = ev.clientX - b.x
    const dy = ev.clientY - b.y
    /* Birkaç piksellik titreme tıklamayı döndürmeye çevirmesin. */
    if (!b.tasidi && Math.abs(dx) + Math.abs(dy) < 4) return
    b.tasidi = true
    /* Eğim sınırlı: tasarım tepetaklak olup okunmaz hâle gelmesin. */
    onDonus({ yaw: b.yaw + dx * 0.45, egim: Math.max(-30, Math.min(30, b.egim - dy * 0.3)) })
  }
  const donusBitir = () => {
    donusBas.current = null
  }

  /*
   * Düğme iki dalda da (tek ekran / çoklu ekran) aynı: burada bir kez
   * yazılıyor, aşağıda iki tuvale de konuyor.
   */
  const sifirlaDugmesi =
    onDonus && varsayilanFark ? (
      <button
        type="button"
        data-pdf-gizle
        onClick={() => onDonus({ yaw: 0, egim: 0 })}
        title={t('donus.sifirla')}
        className="absolute right-2 top-2 z-20 inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-[#39414f] dark:bg-[#161a21] dark:text-neutral-200 dark:hover:bg-[#1d222b]"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
        {t('donus.sifirla')}
      </button>
    ) : null

  /* Taşan tasarımın kırmızı çizgisi yalnızca TASARIM ekranında. */
  const tasmaCizgi = !!tasma && !sahneVar

  /*
   * Her ekranın ÇİZİMDE kapladığı dörtgen (bkz. Birlesim2D →
   * onParcaKutulari). Ölçü etiketleri buna göre konuyor.
   *
   * DUVARIN YERİ DE ÖLÇÜLÜYOR. Gelen sayılar sayfa koordinatı; duvarın
   * kendi yeri çizim sırasında okunuyordu, yani BİR ÖNCEKİ yerleşimden.
   * "Duvarı büyüt" duvarı büyütüp sola kaydırıyor ama çizimi yerinde
   * bırakıyor: ölçüm değişmediği için etiketler eski duvara göre
   * hesaplanmaya devam ediyor ve ekranların ortasından sol kenarına
   * kayıyordu. Duvarın yeri artık her çizimden sonra ayrıca ölçülüyor.
   */
  const [parcaKutulari, setParcaKutulari] = useState(null)
  const duvarRef = useRef(null)
  const [duvarKonum, setDuvarKonum] = useState(null)
  useLayoutEffect(() => {
    const r = duvarRef.current?.getBoundingClientRect()
    if (!r) return
    setDuvarKonum((o) =>
      o && Math.abs(o.sol - r.left) < 0.5 && Math.abs(o.ust - r.top) < 0.5
        ? o
        : { sol: r.left, ust: r.top },
    )
  })

  const olcekRef = useRef(null)
  useEffect(() => {
    if (olcekRef.current != null) onPxPerM?.(olcekRef.current)
  })

  /*
   * Ekran TÜRÜ etiketi. Çizimde L tipi ile düz ekranı ayıran tek şey köşedeki
   * %10'luk kırılmaydı; geniş ve alçak bir şeritte bu eğim gözden kaçıyor,
   * PDF'e giden görselde de ekran düz sanılıyordu. Tür artık adının altında
   * yazıyla duruyor — çizim ne kadar ince olursa olsun okunuyor.
   */

  const cw = (model.widthMm || 500) / 1000
  const ch = (model.heightMm || 500) / 1000
  // Ölçü etiketi (tüm ölçüler metre)
  /* İki ondalık: "0,964 m" gibi üçüncü hane montajda bir şey anlatmıyor. */
  const fmtU = (m) => `${Number(m).toLocaleString(sayiYeri(), { maximumFractionDigits: 2 })} m`
  // İzleme mesafesi: kısa etiket (1 ondalık) — diyagonal çizgide taşmasın
  /* İki ondalık: P1.25 modelinde mesafe 1,25 m; tek ondalık 1,3 m yazıyordu. */
  const fmtDist = (m) => `${Number(m).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} m`

  /*
   * ÖLÇÜM KANCASI ERKEN DÖNÜŞÜN ÜSTÜNDE OLMAK ZORUNDA.
   *
   * Bu kanca bir ara çoklu ekran dalının ALTINDA duruyordu. Çoklu ekranda
   * bileşen daha yukarıda return ediyor, dolayısıyla kanca hiç çalışmıyor ve
   * React iki çizim arasında farklı sayıda kanca görüyordu — hata #300
   * ("beklenenden az kanca"). L tipi Çoklu Ekran penceresinden seçildiği
   * için çökme tam orada oluyordu.
   *
   * Ölçüm duvar kutusundan alınıyor (üstünde dönüşüm yok); ekran kutusunun
   * ondan içeri payı tek ekran dalında bir ref'e yazılıyor, burada okunuyor.
   */
  /*
   * EKRAN NEREYE DÜŞTÜ?
   *
   * Başnoktayı hesapla bulmaya çalışmak (duvar kutusu + pay) tutmadı: tasarım
   * ısrarla fotoğrafın dışında kalıyordu ve varsayımın nerede bozulduğunu
   * bulamadım. Artık varsayım yok — ekranın DÖNÜŞÜM UYGULANMIŞ hâlinin
   * ekrandaki gerçek yeri ölçülüp yukarı bildiriliyor. Çağıran taraf bunu
   * olması gereken yerle karşılaştırıp aradaki farkı kapatıyor; hesap
   * yanlışsa bile sonuç bir çizimde yerine oturuyor.
   */
  const ekranKutuRef = useRef(null)
  useLayoutEffect(() => {
    const el = ekranKutuRef.current
    if (!el || !onEkranKutusu) return
    const a = el.getBoundingClientRect()
    onEkranKutusu({ sol: a.left, ust: a.top })
  })

  /*
   * ŞERİT, LİSTENİN KENDİSİNDEN.
   *
   * Eskiden ayrı bir "çoklu ekran kipi" vardı ve kip kapalıyken liste
   * dolu olsa bile tek ekran çiziliyordu. Birden çok ekran varsa şerit
   * çizilir; başka bir anahtar yok.
   */
  /*
   * Liste VERİLDİYSE şerit çizilir, tek parça olsa bile: L grubu tek
   * katlanmış ekrana iniyor ve o da listenin kendisinden geliyor.
   */
  const isMulti = Array.isArray(screens) && screens.length >= 1

  // ---- ÇOKLU EKRAN ----
  if (isMulti) {
    const list = screens.map((s) => {
      const sut = Math.max(1, s.cols)
      /*
       * L parçası kutusuna KISALMIŞ genişlikle giriyor: köşe çaprazdan
       * göründüğü için açık hâlinden dar yer kaplar, komşuları da o
       * kadar sola yaslanır.
       */
      /*
       * KISALMA: birleşimdeki ekranın kendi açısından (bkz.
       * birlesimGeometrisi). Tek ekranın köşede katlanması (iç L) hâlâ
       * kendi oranını kullanıyor.
       */
      const lKisalma = Number(s.olcek) > 0 ? s.olcek : s.type === 'lshape' ? L_KACIS_ORANI : 1
      const solCols = Math.max(1, s.leftCols || Math.ceil(sut / 2))
      return {
        ...s,
        /* ÇİZİM genişliği: çaprazdan görünen (kısalmış) hâli. */
        wm: sut * cw * lKisalma,
        /* ETİKET için GERÇEK genişlik; kanatlı tasarımda kanat kanat. */
        gercekWm: sut * cw,
        kanatWm: s.type === 'lshape' ? [solCols * cw, (sut - solCols) * cw] : null,
        hm: Math.max(1, s.rows) * ch,
      }
    })
    /*
     * KÜME İLE TEK DURAN EKRAN ARASINDA BOŞLUK YOK.
     *
     * Birleşimde olmayan ekranın yanına 8 cm pay konuyordu; hangisinin
     * birleşik olduğu böyle anlaşılsın diye. Ama pay duvarda bir boşluk
     * olarak görünüyor ve toplam eni 8 cm büyüttüğü için duvar da
     * kullanıcının yazdığı ölçünün üstüne çıkıyordu (2,88 yazıp 2,96
     * görmek gibi). Hangi ekranın birleşik olduğu sol paneldeki çiplerde
     * zaten yazıyor; çizimde ekranlar yapışık duruyor.
     */
    const totalWm = list.reduce((a, s) => a + s.wm, 0)
    /*
     * GRUBUN GERÇEK ENİ — çizimdeki kısalmış en değil.
     *
     * Birleşimde kol perspektifle duruyor ve 'wm' o kısalmış eni taşıyor.
     * Duvarın büyüklüğü, kenar payları ve toplam etiketi kısalmış enden
     * okununca duvarda hiçbir yerde olmayan bir sayı yazıyor, grup da
     * duvardan taşıyordu.
     */
    /*
     * BİRLEŞİMDE ENLER TOPLANMIYOR.
     *
     * Küpün dört yüzü ve U'nun kanatları duvarda yan yana yer kaplamıyor,
     * bir kısmı derinliğe gidiyor. Toplanınca 6 ekranlı bir küp duvarda
     * 4,69 m yer kaplıyor sanılıyor, duvar da kendiliğinden o ölçüye
     * büyüyordu (bkz. birlesimKapladigi).
     */
    const kaplanan = birlesimKipi || kupKipi ? birlesimKapladigi(list, kupKipi) : null
    /* İÇERİK ŞERİDİ ayrı: tek görsel bütün yüzlere yayılıyor, yan yana. */
    const toplamGercekWm = list.reduce((a, s) => a + (s.gercekWm || s.wm), 0)
    const grupGercekWm = kaplanan ? kaplanan.enM : toplamGercekWm
    const maxHm = kaplanan ? kaplanan.boyM : Math.max(...list.map((s) => s.hm))
    // Sınırlayıcı duvar: en az ekranları içerecek kadar (Genişlik/Yükseklik'ten)
    /* Duvar grubun TAMAMINI içeriyor: taşan bir parça kalmıyor. */
    /* Birleşimde şerit çizilmiyor; toplam en duvarı büyütmüyor. */
    /*
     * DUVAR KÜPÜ İÇİNE ALIYOR.
     *
     * Duvar kutunun ÖNDEN kapladığı kadar büyüyordu; oysa küpün çizimi
     * (köşeden bakış + perspektif) o enden geniş ve uzun. Küp duvarın
     * tepesinden taşıp kırpılıyordu. Duvar artık çizim kutusunu da içine
     * alıyor. Kutu metre cinsinden isteniyor: bakış uzaklığı kutunun kendi
     * boyundan türediği için (bkz. bakisUzakligi) oran ölçekten bağımsız,
     * yani 1000 px/m ile hesaplayıp bine bölmek yeterli.
     */
    const kupDuvarOlcu = kupKipi ? kupOlculeri(list) : null
    const kupKutuM = kupDuvarOlcu
      ? (() => {
          const k = kupCizimKutusu({ ...kupDuvarOlcu, pxPerM: 1000 })
          return { enM: k.cizimEn / 1000, boyM: k.cizimBoy / 1000 }
        })()
      : null
    /*
     * DUVAR NE YAZILDIYSA O.
     *
     * Duvar "en az tasarım kadar" çiziliyordu: 0,90 m yazılan duvar 1,28
     * m'lik tasarımla birlikte 1,28 m'ye esniyor, kullanıcının yazdığı sayı
     * çizimde hiçbir şeye karşılık gelmiyordu. Tasarım duvardan büyükse
     * artık duvarın DIŞINA taşıyor — gerçekte de öyle olurdu — ve sol
     * panelde "Tasarım duvardan büyük" yazıyor.
     *
     * Kadraj ayrı bir hesap: ölçek ikisinin BÜYÜĞÜNE göre seçiliyor ki
     * taşan kısım tuvalin dışında kalmasın.
     */
    const wallWm = Math.max(0.1, Number(width) || 0)
    const wallHm = Math.max(0.1, Number(height) || 0)
    const kadrajWm = Math.max(wallWm, kaplanan ? 0 : totalWm, grupGercekWm, kupKutuM?.enM || 0)
    const kadrajHm = Math.max(wallHm, maxHm, kupKutuM?.boyM || 0)
    // Duvarın çevresindeki mutlak konumlu öğeler için sabit pay (tek ekran
    // dalındaki hesapla aynı mantık): kırpılmasınlar diye yer ayrılır.
    // Silüet duvarla aynı satırda olduğu için genişliği de hesaba katılır.
    const showHumanM = !sahneVar && size.w >= 560 && wallHm >= HUMAN_MIN_WALL_M - 0.005
    const humanWmM = showHumanM ? HUMAN_HEIGHT_M * HUMAN_FIG_W_RATIO : 0
    /*
     * PAY ÖLÇÜLERE GÖRE DEĞİŞMİYOR (bkz. tek ekran dalındaki aynı sabit).
     * Değişince "Ölçüleri gizle" tasarımı büyütüyordu; oysa gizlemek bir
     * görünüm anahtarı, ölçek değil.
     */
    const sahnePayM = 150
    // Dar ekranda yan pay en az 152 (76 + 76): satır artır/azalt düğmesi ve ölçü
    // etiketleri telefonun dışına düşmesin — bkz. tek ekran dalındaki aynı hesap.
    /*
     * KÜPTE PAYLAR DAHA DAR.
     *
     * Paylar ŞERİDİN etiketlerine göre ayrılmış: üstte genişlik, altta
     * parça parça ölçüler, yanlarda satır düğmeleri. Küpte bunların çoğu
     * yok (bkz. kupKipi dalları) ama pay yine ayrılıyordu: kısa bir
     * pencerede 190 pikselden geriye neredeyse hiç yer kalmıyor ve kutu
     * tuvalin ortasında pul gibi duruyordu. Küpte yalnızca duvar payı ve
     * yükseklik etiketi var; pay onlara yetecek kadar.
     */
    const yanPay = kupKipi
      ? dar
        ? 110
        : 120
      : sahneVar
        ? dar
          ? Math.max(sahnePayM, 152)
          : sahnePayM
        : dar
          ? 152
          : 180
    const dikeyPay = kupKipi ? (dar ? 70 : 84) : sahneVar ? sahnePayM : dar ? 92 : 190
    /*
     * MEKÂN YOKKEN ÇOK EKRANDA PAY DARALIYOR.
     *
     * 180 / 190 piksellik pay, duvarın tuvalde kaplayabileceği en büyük
     * ölçüyü doluluk oranından ÖNCE kesiyordu: %90 istendiğinde bile
     * duvar %80'de kalıyordu. Pay yalnızca bu durumda (mekân yok, iki ya
     * da daha çok ekran, geniş pencere, küp değil) etiketlerin gerçekten
     * ihtiyacı kadarına iniyor: yanda sağdaki ölçü sütunu ve köşe
     * yazıları, altta genişlik yazısı. Telefonda (dar) ve mekânlı
     * sahnelerde pay aynı kalıyor.
     */
    const cokDuvarKip = !sahneVar && !kupKipi && !dar && list.length > 1
    /* Açılan aralık kadar daha pay: etiket çizime değmesin ama tuvalden de
       taşmasın (bkz. ETIKET_ARALIK). */
    const yanPaySon = (cokDuvarKip ? 120 : yanPay) + (sahneVar ? 0 : 2 * ETIKET_ARALIK)
    const dikeyPaySon = (cokDuvarKip ? 150 : dikeyPay) + (sahneVar ? 0 : 2 * ETIKET_ARALIK)
    const availW = Math.max(dar ? 120 : 180, size.w - yanPaySon - (showHumanM ? 24 : 0))
    const availH = Math.max(dar ? 110 : 140, size.h - dikeyPaySon)
    /*
     * Sahne varsa ölçek mekânın duvarına sabitlenir (sahneOlcek). Ekran mekândan
     * büyükse sığdırma devreye girer — min() ikisinden küçüğünü seçtiği için
     * taşma olmaz.
     */
    const sahneOlcek = sahneOlcekVarsayilan || Infinity
    // Ust sinir yalnizca sahne YOKKEN: sahne varsa olcegi sahne belirler,
    // sabit bir tavan mekani tuvalin ortasinda kucucuk birakiyordu.
    /*
     * KAVİS PAYI (çoklu ekran).
     *
     * Kavisli ekranın tuvali kendi kutusundan `maxD` kadar uzun: kavis üstte
     * ve altta eşit taşıyor (bkz. CurvedScreen). Tek ekran dalında bu taşma
     * ölçek hesabına katılıyordu, çoklu dalda katılmıyordu — tasarım kabın
     * kenarına dayandığında kavis kırpılıyor ve ekran DÜZ görünüyordu.
     *
     * Pay, düzendeki EN DERİN kavisten hesaplanıyor: her ekranın derinliği
     * kendi genişliğine oranlı, yani en geniş kavisli ekran belirleyici.
     */
    /*
     * KAVİS ARTIK KUTUSUNUN DIŞINA TAŞMIYOR (bkz. curvedRenderer →
     * gorunenOlcek): yay, ekranın kendi boyunun içinde kalıyor. Taşma için
     * ayrılan pay çizimi küçültüyordu — kavisli tasarım düzden küçük
     * görünüyordu. Pay sıfır; değişken, okuyan yerler bozulmasın diye duruyor.
     */
    const kavisPayiM = 0

    /*
     * SAHNE ÖLÇEĞİ VERİLDİYSE BİREBİR UYULUR (bkz. tek ekran dalı).
     * Tuvale sığdırma işini sahne kendisi yapıyor: sığmayan tasarımda kamera
     * geri çekiliyor, ölçek kırpılmıyor.
     */
    /*
     * DUVAR TUVALİN YAKLAŞIK 3/4'ÜNÜ KAPLIYOR.
     *
     * Ölçeğin sabit bir tavanı vardı (280 px/m): küçük bir duvar — 0,64 ×
     * 0,16 m gibi — tuvalin ortasında minicik kalıyor, kullanıcı tasarımı
     * göremiyordu. Tavan kalktı; ölçek duvarın KENDİSİNDEN geliyor: duvar
     * hangi eksende önce doluyorsa orada tuvalin DOLULUK kadarını kaplıyor.
     * Duvarın ekrandaki boyu böylece sabit; metre ölçüsü değişse de duvar
     * büyüyüp küçülmüyor, yalnızca içindeki tasarımın ona oranı değişiyor.
     *
     * Etiketlere ayrılan pay (availW/availH) yine üst sınır: dar bir
     * pencerede 3/4 oraya sığmıyorsa ölçü yazıları kırpılmasın diye
     * küçüğü alınıyor. Ölçü etiketlerinin yazı boyutu sabit.
     */
    /* Mekân yokken 2+ ekranda duvar tuvalin %90'ına çıkıyor (bkz. DOLULUK_COK). */
    const doluluk = !sahneVar && list.length > 1 ? DOLULUK_COK : DOLULUK
    const kullanW = Math.min(size.w * doluluk, availW)
    const kullanH = Math.min(size.h * doluluk, availH)
    const duvarOlcegi = Number.isFinite(sahneOlcek)
      ? sahneOlcek
      : Math.min(kullanW / (kadrajWm + humanWmM), kullanH / (kadrajHm + kavisPayiM))
    /*
     * KÜPTE ÖLÇEĞİ KÜPÜN ÇİZİM KUTUSU BELİRLİYOR.
     *
     * Ölçek duvara göre seçilip küp sonra duvarın içine KÜÇÜLTÜLÜYORDU:
     * 0,32 m'lik bir küp, 0,44 m'lik duvarın dörtte birine iniyordu. Oysa
     * küpün izdüşümü (dönüş + eğim + perspektif + kaide) kendi eninden
     * geniş; sığdırılması gereken o kutu. Ölçek artık o kutudan geliyor,
     * küp ölçeklenmiyor (olcek = 1) ve duvarla AYNI metre-piksel oranında
     * duruyor: 0,32 m küp, 0,44 m duvarın gerçekten %73'ü kadar.
     *
     * Perspektif ölçekle doğrusal değil; ölçek birkaç adımda yaklaşılıyor.
     */
    let pxPerM = duvarOlcegi
    if (kupKipi && !Number.isFinite(sahneOlcek)) {
      const kupOlcu = kupOlculeri(list)
      if (kupOlcu) {
        for (let adim = 0; adim < 4; adim++) {
          const kutu = kupCizimKutusu({ ...kupOlcu, pxPerM })
          if (!(kutu.cizimEn > 0) || !(kutu.cizimBoy > 0)) break
          const d = Math.min(kullanW / kutu.cizimEn, kullanH / kutu.cizimBoy)
          if (!(d > 0) || !Number.isFinite(d)) break
          pxPerM *= d
          if (Math.abs(d - 1) < 0.002) break
        }
      }
    }
    olcekRef.current = pxPerM
    const wallW = wallWm * pxPerM
    const wallH = wallHm * pxPerM
    const totalWpx = totalWm * pxPerM
    const maxHpx = maxHm * pxPerM
    const marginXpx = (wallW - totalWpx) / 2
    const stripTop = (wallH - maxHpx) / 2
    /*
     * Kavis payının piksel karşılığı. Kavisli ekran şeridin üstüne ve altına
     * eşit taşıyor (yarısı üstte, yarısı altta). Ölçü etiketleri duvara göre
     * konumlanıyordu; bombe duvarın üstüne çıkınca genişlik etiketinin ÜSTÜNE
     * biniyor ve etiket görünmez oluyordu. Etiketler ve kılavuz çizgileri
     * bombenin dışına itiliyor — tek ekran dalında da ölçüler bombenin
     * dışında duruyor.
     */
    const kavisPayiPx = kavisPayiM * pxPerM
    const bombePx = kavisPayiPx / 2

    const marginXm = (wallWm - totalWm) / 2
    const marginYm = (wallHm - maxHm) / 2
    const humanH = HUMAN_HEIGHT_M * pxPerM

    /*
     * SAĞ KENARDAKİ ÖLÇÜ SÜTUNU TUVALİN İÇİNDE KALIYOR.
     *
     * Sütunun en sağ sınırı (tuval − duvar) / 2 ile hesaplanıyordu, yani
     * duvarın tuvalde ORTALANDIĞI varsayılıyordu. Oysa duvarın solunda insan
     * silüeti duruyor: duvar o kadar sağa kayıyor ve sağda kalan boşluk
     * hesaplanandan dar oluyor — "0,02 m" etiketleri tuvalin kenarında
     * kesiliyordu. Boşluk artık silüetin eni ve aradaki boşluk düşülerek
     * hesaplanıyor.
     */
    const insanPx = humanWmM * pxPerM
    const sagBosluk = Math.max(0, (size.w - wallW - insanPx - (showHumanM ? 24 : 0)) / 2)

    let xAcc = 0
    /* Gerçek enlerin dizilimi: ölçü etiketleri ve içerik dilimi buradan. */
    let gAcc = 0
    const placed = list.map((s) => {
      /* Paylaşım değişse de araya pay girmiyor: ekranlar yapışık (bkz. totalWm). */
      const wPx = s.wm * pxPerM
      const gercekWPx = (s.gercekWm || s.wm) * pxPerM
      const o = {
        ...s,
        wPx,
        gercekWPx,
        hPx: s.hm * pxPerM,
        xStart: xAcc,
        gercekXStart: gAcc,
        center: xAcc + wPx / 2,
      }
      xAcc += wPx
      gAcc += gercekWPx
      return o
    })
    const grupGercekWpx = grupGercekWm * pxPerM
    /* İçerik dilimi yüzlerin toplam eninden; kaplanan alandan değil. */
    const seritGercekWpx = toplamGercekWm * pxPerM

    /*
     * PAYLAŞIMDA DİLİM GERÇEK GENİŞLİKLERE GÖRE.
     *
     * Yüzey, kümedeki ekranların GERÇEK genişliklerinin toplamı; her
     * ekran kendi payına düşen dilimi gösteriyor. Çizimdeki kısalma
     * (perspektif) yalnızca kutuyu daraltıyor, dilimin içeriğini değil.
     */
    const paylasimAlanlari = new Map()
    for (const x of placed) {
      if (!x.paylasim) continue
      const a = paylasimAlanlari.get(x.paylasim) || { toplam: 0, enBuyukBoy: 0, onceki: new Map() }
      a.onceki.set(x, a.toplam)
      a.toplam += x.gercekWm || x.wm
      /* Yüzeyin boyu en uzun ekranınki: kısalar alttan hizalı duruyor. */
      a.enBuyukBoy = Math.max(a.enBuyukBoy, x.hm || 0)
      paylasimAlanlari.set(x.paylasim, a)
    }

    /*
     * DİLİM HESABI TEK YERDE.
     *
     * Şerit ile birleşim çizimi aynı bölmeyi kullanmak zorunda: "Tek
     * görsel" açıkken görsel sol koldan arkaya, arkadan sağ kola
     * kesintisiz akıyor. İki ayrı hesap olsaydı ikisi ayrışırdı.
     */
    /*
     * gercekCizim: ekran GERÇEK eninde çiziliyorsa (birleşim, küp) dilim
     * de gerçek enle ölçeklenir. Şeridin kısalttığı en kullanılınca
     * görsel her yüzde büyüyor ve birleşim çizgisinde ikiye katlanıyordu:
     * ortadaki nesne iki ekranda birden görünüyor, ayna gibi duruyordu.
     */
    const icerikProplari = (s, gercekCizim = false) => {
      const cizimW = gercekCizim ? s.gercekWPx ?? s.wPx : s.wPx
      const cizimX = gercekCizim ? s.gercekXStart ?? s.xStart : s.xStart
      const seritW = gercekCizim ? seritGercekWpx : totalWpx
      if (dilim) {
        return {
          spanW: seritW * dilim.sw,
          spanH: maxHpx * dilim.sh,
          offsetX: cizimX + seritW * dilim.sx,
          offsetY: maxHpx - s.hPx + maxHpx * dilim.sy,
        }
      }
      /*
        Paylaşan ekran, görselin kendi gerçek genişliğine düşen dilimini
        gösteriyor; ötekiler görselin tamamını kendi kutusunda.
      */
      const alan = s.paylasim ? paylasimAlanlari.get(s.paylasim) : null
      const kendi = s.gercekWm || s.wm
      if (!alan || !(kendi > 0)) return { spanW: cizimW, spanH: s.hPx, offsetX: 0, offsetY: 0 }
      const oran = cizimW / kendi
      /*
       * DİKEYDE DE DİLİM — ekranlar farklı boyda olabiliyor.
       *
       * Eskiden her ekran görselin TAM yüksekliğini kendi kutusunda
       * gösteriyordu: kısa ekran, uzun komşusuyla aynı görüntüyü ezilmiş
       * olarak çiziyordu. Ekranlar alttan hizalı olduğuna göre kısa
       * ekrana düşen, görselin ALT kısmıdır; üstte kalan pay yukarı
       * kaydırılarak dışarıda bırakılıyor.
       */
      const boyOran = s.hm > 0 ? s.hPx / s.hm : 0
      const yuzeyBoy = alan.enBuyukBoy > 0 && boyOran > 0 ? alan.enBuyukBoy * boyOran : s.hPx
      return {
        spanW: alan.toplam * oran,
        spanH: yuzeyBoy,
        offsetX: (alan.onceki.get(s) || 0) * oran,
        offsetY: yuzeyBoy - s.hPx,
      }
    }

    // Tüm ekranlar düz VE hepsi genel/ortak içeriği kullanıyorsa (kendine özel içeriği yoksa):
    // TEK görsel katmanı tüm şeride yayılır, ekranlar sadece çerçeve olarak üstüne çizilir.
    // Bir ekranın kendine özel içeriği varsa (ör. "Resim Yok") o zaman her ekran kendi
    // içeriğini bağımsız çizer — tek görsel bölünmesi mantığı bozulmasın diye.
    /*
     * TEK KATMAN, VİDEODA DA GEÇERLİ.
     *
     * Eskiden yalnızca GÖRSEL içerikte tek katman kullanılıyordu; video her
     * ekranın (L tipinde her KANADIN) içine ayrı bir <video> öğesi olarak
     * konuyordu. Üç L tipi ekran altı ayrı video demek: tarayıcı hepsini aynı
     * anda oynatamayınca aradaki ekran simsiyah kalıyor ve tasarımın ortasında
     * kopma görünüyordu. Şimdi tek video tüm şeride yayılıyor, ekranlar onun
     * üstüne yalnızca çerçeve olarak çiziliyor — kopma imkânsız.
     *
     * L tipi de artık kapsam içinde; şeklin dışında kalan köşe üçgenleri
     * aşağıdaki kırpma yoluyla temizleniyor. Kavisli ekran hariç: onun içeriği
     * canvas'ta ayrıca warp ediliyor.
     */
    const sekilUygun = placed.every((s) => {
      const t = s.type || 'flat'
      return t === 'flat' || t === 'lshape'
    })
    const allSharedContent = placed.every((s) => !s.content)
    const spanImg = content !== 'none' ? contentImage(content, contentUrl) : null
    const spanVideo = content !== 'none' ? videoSrcFor(content, contentUrl) : null
    const useSingle = sekilUygun && allSharedContent && !!(spanImg || spanVideo)
    // Yayın var mı (kapalı panel ve boş çerçeve ışık saçmaz)
    const spanLit = content !== 'none' && content !== 'led'

    /*
     * ŞERİDİN KIRPMA MASKESİ — ekranların KAPLADIĞI alan.
     * Tek içerik katmanı şeridin tamamını kaplar; ekranın olmadığı yerlerde
     * (kısa ekranın üstü, L tipinin köşe üçgenleri) duvar görünmeli. Eskiden
     * oralara beyaz kutu çiziliyordu; mekân seçiliyken duvarın üstüne beyaz
     * leke basıyordu. Kırpma hem doğru hem de mekânla uyumlu.
     *
     * MASKE NEDEN SVG DEĞİL DE polygon(): kırpma eskiden bir <clipPath> öğesine
     * `clip-path: url(#...)` ile bağlanıyordu. Ekranda doğru görünüyordu ama
     * PDF'e giden ekran görüntüsünü alan html2canvas url() biçimini tanımıyor;
     * kırpmayı sessizce atlıyor ve L tipi ekranlar PDF'te DÜZ dikdörtgen
     * çıkıyordu. html2canvas polygon() biçimini çiziyor — maske artık tek bir
     * kapalı çokgen olarak, şeridin dış hattı boyunca üretiliyor.
     *
     * Dış hat: üst kenar boyunca soldan sağa (L tipinde köşe dikişinde aşağı
     * kırılarak, komşu ekranlar farklı yükseklikteyse dikey basamak yaparak),
     * sağ kenardan aşağı, alt kenar boyunca sağdan sola geri. Ekranlar bitişik
     * ve alta hizalı olduğu için bu hat kesintisiz kapanır.
     */
    /*
     * ÖLÇÜ KUTUSU — çizim perspektifli, etiketler gerçek.
     *
     * Birleşimde kılavuz çizgileri ve kenar payları şeridin kısalmış
     * kutusunu gösteriyordu: çizimle hiç örtüşmeyen, gerçekte de
     * karşılığı olmayan sayılar çıkıyordu.
     */
    /* Ölçü etiketleri ve kenar payları kaplanan alandan. */
    const olcuW = kaplanan || birlesimKipi ? grupGercekWpx : totalWpx
    const olcuSol = Math.max(0, (wallW - olcuW) / 2)
    /*
     * SAĞ ÖLÇÜ SÜTUNU: TASARIMIN DIŞINDA, TUVALİN İÇİNDE.
     *
     * Taban duvardı. Tasarım duvardan büyükse (taşma) duvarın sağ kenarı
     * tasarımın İÇİNE düşüyor, yükseklik etiketi de tasarımın üstüne
     * biniyordu. Taban artık ikisinden dışta olanı.
     *
     * Sağ sınır da etiketin kendi genişliğini sayıyor: sütunun kutusu 26
     * piksel ama içindeki sayı ("0,02 m") ondan geniş, bu yüzden tuvalin
     * kenarında kesiliyordu.
     */
    /* olcuSol sıfırda kırpılıyor; tasarımın gerçek sağ kenarı kırpılmamış hâli. */
    const olcuSagTaban = Math.max(wallW, (wallW + olcuW) / 2)
    const olcuSagX = Math.max(
      olcuSagTaban + 6,
      Math.min(olcuSagTaban + 10 + ETIKET_ARALIK + sahnePayPx, Math.max(0, wallW + sagBosluk - 64)),
    )
    const olcuToplamM = kaplanan || birlesimKipi ? grupGercekWm : totalWm
    const olcuMarginM = Math.max(0, (wallWm - olcuToplamM) / 2)
    /*
     * PARÇA ETİKETLERİ KAPLANAN BANDIN İÇİNDE.
     *
     * Etiketler şeritteki yerlerinden okunuyordu; birleşimde şerit
     * çizilmediği için kaplanan alanın dışına taşıyor, küpte de duvara
     * dağılıyorlardı. Yerler artık izdüşümden (bkz. birlesimKapladigi →
     * yerler); küpte parça etiketi yok.
     */
    const yerler = kaplanan?.yerler || null
    const parcaCizgisi = !kaplanan || !!yerler
    const olcuCenter = (s) => {
      if (yerler) {
        const y = yerler[placed.indexOf(s)]
        return y ? ((y.x0 + y.x1) / 2) * pxPerM : 0
      }
      return birlesimKipi ? (s.gercekXStart ?? s.xStart) + (s.gercekWPx ?? s.wPx) / 2 : s.center
    }

    const maskePolygon = seritMaskePolygon(placed, maxHpx)

    return (
      <div
      ref={containerRef}
      /* Aday kareler açıkken bu katman soluyor; kareler fotoğrafın üstünde okunur kalıyor. */
      data-tasarim-katman
      className="relative w-full h-[50vh] sm:h-[60vh] md:h-full flex items-center justify-center overflow-hidden min-h-0"
      style={gizle ? { visibility: 'hidden' } : undefined}
    >
      {/*
        YÖNÜ SIFIRLA — ÇİFT TIKLAMANIN GÖRÜNEN HÂLİ.

        Tasarımı karşıya çevirmenin tek yolu çift tıklamaktı; ekranda bunu
        anlatan hiçbir işaret yoktu, döndüren kullanıcı eski görünüme
        dönemiyordu. Düğme yalnızca tasarım DÖNÜKKEN çıkıyor (karşıdayken
        yapacağı bir iş yok) ve PDF'e girmiyor.
      */}
      {sifirlaDugmesi}
        <div dir="ltr" className="flex items-end gap-3 sm:gap-6 max-w-full">
         {showHumanM && (
  <HumanSilhouette height={humanH} showMeasure={showMeasurements} />
)}
          {/*
            ÇOKLU EKRANDA DA SÜRÜKLEME.
            Kayma yalnızca tek ekran dalına uygulanıyordu; çoklu ekranda kiosk
            gövdesi (PanoFoto) zemine iniyor, ekran ise tuvalin ortasında asılı
            kalıyordu — ikisi birbirinden kopuyordu.
          */}
          <div
            className="relative"
            {...(tutamak || {})}
            style={{
              transform: kayma ? `translate(${kayma.x}px, ${kayma.y}px)` : undefined,
              ...(tutamak ? tutamak.style : null),
            }}
          >
            {/* Sınırlayıcı duvar */}
            {/*
              Kavis VARSA kutu kırpmaz. Kavisli ekranın tuvali kendi şeridinden
              taşıyor; duvar kutusu `overflow-hidden` olduğu için taşan kısım
              kesiliyor ve panel düz bir dikdörtgen olarak çıkıyordu. Tek ekran
              dalında ekran bu kutunun içinde olmadığı için sorun görülmüyordu.
            */}
            <div
              ref={duvarRef}
              style={{ width: wallW, height: wallH, transform: yonDonusumu(yon, wallW) || undefined }}
              /* Taşan tasarım kesilmiyor: duvardan büyükse dışarıda görünüyor. */
              className={`${sahneVar ? '' : 'bg-white dark:bg-[#dfe3e9] border border-neutral-300 dark:border-[#9aa2ae]'} relative overflow-visible`}
            >
              {/*
                KÜP — ŞERİT DEĞİL KUTU.

                Küp tipi seçiliyken ekranlar yan yana düz dikdörtgenler
                olarak çiziliyordu; kullanıcı neyi kurduğunu göremiyordu.
                Şerit JSX'i yerinde duruyor, yalnızca gizleniyor.
              */}
              {kupKipi && (
                <div
                  /*
                   * KÜP ZEMİNE OTURUYOR.
                   *
                   * Kutu stripTop'tan aşağı kuruluyordu: kaidesiyle
                   * birlikte tasarım alanının altına taşıyor, mekânda da
                   * havada duruyor gibi görünüyordu. Alt kenarı artık
                   * duvarın tasarım alt çizgisinde.
                   */
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    /*
                     * KÜP DUVARIN ORTASINDA.
                     *
                     * Çizim tasarım şeridinin ALT çizgisine yaslanıyordu; küpün
                     * izdüşümü (eğim + perspektif) kendi boyundan uzun olduğu için
                     * üst yüz duvarın tepesinden taşıp kırpılıyor, altta ise koca
                     * bir boşluk kalıyordu. Şerit zaten duvarın ortasında, yani
                     * duvara ortalamak küpü tasarım şeridinin ortasına oturtuyor.
                     */
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Kup2D
                    ekranlar={placed.map((s) => ({ ...s, icerikProp: icerikProplari(s, true) }))}
                    sade={sade}
                    pxPerM={pxPerM}
                    model={model}
                    resolution={resolution}
                    /*
                      SINIR DUVAR DEĞİL TUVAL.
                      Küpün izdüşümü kendi eninden geniş; duvarın içine
                      sıkıştırılınca küp duvarın dörtte birine iniyordu.
                      Ölçek zaten küpe göre seçildiği için burada küçülme
                      olmuyor — bu yalnızca tuvalden taşmayı önlüyor.
                    */
                    enCokW={availW}
                    enCokH={availH}
                  />
                </div>
              )}

              {/*
                L / U / AÇILI — ŞERİT DEĞİL GERÇEK ŞEKİL.

                Şeritte 90°'lik kol yassılıyor ve U, L'den ayırt
                edilemiyordu. Kollar artık kendi açısıyla duruyor.
              */}
              {birlesimKipi && !kupKipi && (
                <div
                  data-birlesim-yuz
                  /*
                   * ALT KENAR DUVARIN TASARIM ÇİZGİSİNDE.
                   *
                   * Kutu stripTop'tan AŞAĞI doğru kuruluyordu; perspektifle
                   * öne gelen kol kutunun altına taşıyor, kısa ekran da
                   * duvarın alt çizgisinin altına düşüyordu.
                   */
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    height: stripTop + maxHpx,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    opacity: ekranGizle ? 0 : undefined,
                    cursor: onDonus ? 'grab' : undefined,
                    /* Dokunmatikte kaydırma yerine döndürme. */
                    touchAction: onDonus ? 'none' : undefined,
                  }}
                  onPointerDown={donusBaslat}
                  onPointerMove={donusSurdur}
                  onPointerUp={donusBitir}
                  onPointerCancel={donusBitir}
                  /* Çift tıklama: tasarım yeniden karşıya döner. */
                  onDoubleClick={() => onDonus?.({ yaw: 0, egim: 0 })}
                >
                  <Birlesim2D
                    yaw={donus?.yaw || 0}
                    egim={donus?.egim || 0}
                    /* Çizim kaplanan alana sığıyor: etiketle aynı genişlik. */
                    enCokW={olcuW}
                    enCokH={stripTop + maxHpx}
                    ekranlar={placed.map((s) => ({ ...s, icerikProp: icerikProplari(s, true) }))}
                    sade={sade}
                    pxPerM={pxPerM}
                    model={model}
                    resolution={resolution}
                    content={content}
                    contentUrl={contentUrl}
                    hideRegions={hideRegions}
                    curveAmount={curveAmount}
                    onEkranSec={onEkranSec}
                    seciliEkranId={seciliEkranId}
                    /* Çerçeve yalnızca mekânda (bkz. Birlesim2D → cerceve). */
                    cerceve={sahneVar}
                    /* Tasarım ekranında perspektif yok: olduğu yerde dönüyor. */
                    perspektifli={sahneVar}
                    tasmaCerceve={tasmaCizgi}
                    onParcaKutulari={setParcaKutulari}
                    /*
                     * Mekânda duvar tasarımla birlikte kırılıyor (bkz.
                     * Birlesim2D → duvarYuzu). Paylar duvarın tasarım
                     * dışında kalan kısmı: üstte/altta şeridin boşluğu,
                     * yanlarda duvarın tasarımdan artan eni.
                     */
                    /*
                     * YANLARDA PAY YOK.
                     *
                     * Duvar bir ara uçlardan yana uzatılıyordu; kırılan
                     * parçanın yakın ucu kameraya yaklaşıyor ve perspektif
                     * onu devasa büyütüyordu. Tasarımın bittiği yerde duvar
                     * artık mekânın düz duvarına DÖNEREK kapanıyor (bkz.
                     * Birlesim2D → nis, uç dönüşleri); ötesi mekânın kendi
                     * duvarı.
                     */
                    duvarYuzu={
                      sahneVar && duvarDolgu
                        ? {
                            ...duvarDolgu,
                            ust: stripTop,
                            alt: Math.max(0, wallH - stripTop - maxHpx),
                          }
                        : null
                    }
                  />
                </div>
              )}

              {/*
                KABİNİN KALINLIĞI — MEKÂNDA DUVARA DÜŞEN GÖLGE.

                Mekân sahnelerinde tasarım duvara yapıştırılmış bir kâğıt gibi
                duruyordu: kabinin derinliği (modelin depthMm'i, tipik olarak
                7–10 cm) hiçbir yerde görünmüyordu.

                Duvara TAM KARŞIDAN bakılan bir sahnede kabinin hiçbir yanı
                görünmez — yan yüzü çizmek yalan olurdu. Derinliği okutan tek
                şey, duvardan çıkan cismin duvara düşürdüğü gölgedir; kaymanın
                büyüklüğü de doğrudan o derinlikten geliyor, yani 10 cm'lik
                kabin 7 cm'likten daha belirgin bir gölge bırakıyor.

                Işık sol üstten: gölge sağ alta düşüyor (bkz. KalinlikKatmani,
                aynı ışık yönü). Katman tasarımın ARKASINDA; ölçü etiketleriyle
                ve seçim çerçeveleriyle hiç karışmıyor, PDF'te de tasarımla
                birlikte çıkıyor.
              */}
              {sahneVar &&
                !ekranGizle &&
                (() => {
                  const derinlikM = Math.max(0, (model?.depthMm || 0) / 1000)
                  const derinlikPx = derinlikM * pxPerM
                  if (!(derinlikPx > 0.5)) return null
                  /* Köşeli ve küp birleşimde tasarım dikdörtgen değil: oradaki
                     derinliği kolların kendi açısı zaten gösteriyor. */
                  if (kupKipi || birlesimKipi) return null
                  return (
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: marginXpx + derinlikPx * 0.55,
                        top: stripTop + derinlikPx * 0.8,
                        width: totalWpx,
                        height: maxHpx,
                        background: 'rgba(14,18,25,0.34)',
                        filter: `blur(${Math.max(1.5, derinlikPx * 0.45)}px)`,
                        pointerEvents: 'none',
                        zIndex: 0,
                      }}
                    />
                  )
                })()}

              {/* Ekranlar şeridi (ortalanmış, alta hizalı) */}
              <div
                /* Testin görünürlüğü ölçebilmesi için sabit işaret. */
                data-tasarim-yuz
                style={{
                  display: kupKipi || birlesimKipi ? 'none' : undefined,
                  position: 'absolute',
                  left: marginXpx,
                  top: stripTop,
                  width: totalWpx,
                  height: maxHpx,
                  transform: koseDonusumu(totalWpx, maxHpx, kose) || undefined,
                  transformOrigin: '0 0',
                  opacity: ekranGizle ? 0 : undefined,
                }}
              >
                {/* z0: Tek içerik katmanı — tüm şeride yayılır, ekran şekline kırpılır */}
                {useSingle && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 0,
                      overflow: 'hidden',
                      clipPath: maskePolygon,
                      backgroundColor: '#0a0a0a',
                      backgroundImage: spanImg || undefined,
                      // Yukarı yuvarlama: sağ kenarda siyah alt-piksel şeridi kalmasın (bkz. bgFor)
                      backgroundSize: `${Math.ceil(totalWpx * (dilim?.sw || 1))}px ${Math.ceil(maxHpx * (dilim?.sh || 1))}px`,
                      backgroundPosition: dilim
                        ? `${-totalWpx * dilim.sx}px ${-maxHpx * dilim.sy}px`
                        : undefined,
                      backgroundRepeat: 'no-repeat',
                      /*
                       * Yayındaki panel filtresi — tek ekranda görsele zaten
                       * uygulanıyor (bkz. Screen). Çoklu ekranda içerik bu tek
                       * şeritte çizildiği için filtre buraya da gerekiyordu;
                       * yoksa aynı görsel çoklu ekranda soluk kalıyordu.
                       * Videoya VideoLayer kendi içinde uyguluyor, o yüzden
                       * filtre yalnızca görsel katmanında.
                       */
                      filter: spanImg && spanLit ? LED_LIT_FILTER : undefined,
                    }}
                  >
                    {/*
                      Şerit gizliyken (küp, L/U/açılı) video kurulmuyor: çizimi
                      Kup2D/Birlesim2D yapıyor, buradaki kopya yalnızca
                      tarayıcının kod çözücülerini tüketiyordu.
                    */}
                    {spanVideo && !(kupKipi || birlesimKipi) && (
                      <VideoLayer
                        src={spanVideo}
                        gw={totalWpx * (dilim?.sw || 1)}
                        gh={maxHpx * (dilim?.sh || 1)}
                        left={dilim ? totalWpx * dilim.sx : 0}
                        top={dilim ? maxHpx * dilim.sy : 0}
                        lit={spanLit}
                        senkron={!!dilim}
                      />
                    )}
                  </div>
                )}
                {/*
                  z3: EKRAN NUMARALARI.
                  Listedeki satırla şeritteki ekranı eşlemek için; tıklamayı
                  yutmuyor, ekranın kendi çizimine de karışmıyor.
                */}
                {/*
                  NUMARA ROZETİ TASARIM GÖRÜNÜMÜNDE DE YOK.

                  Rozet ekranın tam ortasında duruyordu: tek görselde
                  resmin üstüne iki koyu yuvarlak biniyor, PDF'e giden
                  çizimde de ürünün parçasıymış gibi görünüyordu. Hangi
                  ekranın hangisi olduğu soldaki kart listesinde yazıyor.
                  Mekân sahnelerinde rozet zaten çizilmiyordu (gerçek
                  ölçekte ekrandan büyük kalıyordu); fotoğraf yerleşiminin
                  kendi numaraları duruyor.
                */}

                {/*
                  z4: EKRAN SEÇİMİ.

                  Çoklu tasarımda çizimdeki bir ekrana tıklamak hiçbir şey
                  yapmıyordu: hangi ekranın düzenlendiğini yalnızca soldaki
                  kart listesi söylüyor, ± düğmeleri de hep o ekrana
                  işliyordu (ölçüldü: 1. ekrana tıklandıktan sonra bile
                  "Sütun +" 3. ekranı büyütüyor). Artık tıklanan ekran
                  düzenlemeye geçiyor ve seçili olan çerçeveyle belli
                  oluyor — ± kontrolleri zaten yalnızca seçili ekranı
                  değiştiriyor.
                */}
                {onEkranSec && placed.length > 1 && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 4 }} data-pdf-gizle>
                    {placed.map((s, i) => (
                      <button
                        key={'sec' + i}
                        type="button"
                        aria-label={`${s.sira || i + 1}. ekran`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEkranSec(s.id)
                        }}
                        style={{
                          position: 'absolute',
                          left: s.xStart,
                          top: maxHpx - s.hPx,
                          width: s.wPx,
                          height: s.hPx,
                          padding: 0,
                          background: 'transparent',
                          borderRadius: 2,
                          cursor: 'pointer',
                          /*
                           * ÇERÇEVE YALNIZCA MEKÂNDA.
                           *
                           * Tasarım görünümünde seçili ekranın çevresindeki
                           * mavi çerçeve ürünün parçasıymış gibi duruyordu;
                           * hangi ekranın düzenlendiği zaten soldaki kartta
                           * belli. Tıklayıp seçmek sürüyor, yalnızca çizgi
                           * görünmüyor.
                           */
                          border:
                            s.id === seciliEkranId && sahneVar
                              ? '2px solid #2962ad'
                              : '2px solid transparent',
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* z2: Ekranlar (tek görselde yalnız çerçeve; diğerinde kendi içerikleri) */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'flex-end' }}>
                  {placed.map((s, i) => (
                    <Screen
                      key={i}
                      wPx={s.wPx}
                      hPx={s.hPx}
                      cols={s.cols}
                      rows={s.rows}
                      type={s.type}
                      resolution={resolution}
                      model={model}
                      content={s.content || content}
                      /* Parçanın kendi adresi varsa o: yüklenen görsel/video
                         yalnızca "content" anahtarıyla taşınamıyor. */
                      contentUrl={s.content ? s.contentUrl || null : contentUrl}
                      hideRegions={hideRegions}
                      sade={sade}
                      frameOnly={useSingle}
                      /* Gizli şeritte video yok (bkz. yukarıdaki katman). */
                      videoKapali={kupKipi || birlesimKipi}
                      /* Kavis miktarı ekranın kendi bilgisi (bkz. App → ekranParcalari). */
                      curveAmount={s.curveAmount ?? curveAmount}
                      leftCols={s.leftCols}
                      rightCols={s.rightCols}
                      lYon={s.lYon}
                      solKirim={s.solKirim || 0}
                      sagKirim={s.sagKirim || 0}
                      {...icerikProplari(s)}
                    />
                  ))}
                </div>
              </div>
              {/*
                YERİNDE 3B — ÇOKLU EKRANDA DA.

                Katman yalnızca tek ekran dalına konmuştu; L tipi ve çoklu
                dizilim arka plan üstünde düz kalıyordu. Şerit duvar
                kutusunun içinde stripTop yüksekliğinde durduğu için
                köşeler o paya göre kaydırılıyor.
              */}
              {uc3dKatman?.({
                koseler: (kose || [
                  { x: 0, y: 0 },
                  { x: totalWpx, y: 0 },
                  { x: totalWpx, y: maxHpx },
                  { x: 0, y: maxHpx },
                ]).map((k) => ({ x: marginXpx + k.x, y: stripTop + k.y })),
                genislik: wallW,
                yukseklik: wallH,
              })}
            </div>

            {showMeasurements && !donuk && (
              <>
                {/*
                  DÖRT ÇİZGİ YETİYOR: duvarın iki kenarı, tasarımın iki kenarı.

                  Her ekranın sınırına da birer çizgi iniyordu; altı ekranlı
                  bir düzende tasarımın üstü baştan sona kesikli çizgiyle
                  taranıyor, görsel bu çizgilerin altında kayboluyordu.
                  Okunması gereken iki şey var: duvarda kalan boşluk ve
                  tasarımın ölçüsü — ikisi de bu dört çizginin arasında.
                  Ekranların kendi enleri etiket olarak yazılmaya devam
                  ediyor (bkz. aşağıdaki parcaCizgisi haritası).
                */}
                {/* Etiketler çizimden uzaklaştı (bkz. ETIKET_ARALIK); kılavuz
                    çizgileri de onlara kadar uzuyor. */}
                <VL left={0} top={-56 - ETIKET_ARALIK - bombePx} height={wallH + 140 + 2 * ETIKET_ARALIK + kavisPayiPx} />
                <VL left={wallW} top={-56 - ETIKET_ARALIK - bombePx} height={wallH + 140 + 2 * ETIKET_ARALIK + kavisPayiPx} />
                <VL left={olcuSol} top={-56 - ETIKET_ARALIK - bombePx} height={wallH + 140 + 2 * ETIKET_ARALIK + kavisPayiPx} />
                <VL left={olcuSol + olcuW} top={-56 - ETIKET_ARALIK - bombePx} height={wallH + 140 + 2 * ETIKET_ARALIK + kavisPayiPx} />

                {/*
                  SOL/SAĞ KENAR PAYI — DAR BOŞLUKTA DA YAZILIYOR.

                  Etiket yalnızca boşluk 34 pikselden genişse gösteriliyordu;
                  ince bir pay (birkaç santim) hiç yazılmıyor, kullanıcı da
                  duvarda kalan o şeridin ölçüsünü öğrenemiyordu. Oysa montajda
                  asıl merak edilen tam olarak o.

                  Dar boşlukta etiket boşluğun İÇİNE sığmaz; bu yüzden bir üst
                  satıra alınıp duvarın kenarına yaslanıyor. Geniş boşlukta
                  eskisi gibi ortalanıyor.
                */}
                {/* Köşeli tasarımda kenar payının karşılığı yok (bkz. gercekWm). */}
                {/* Eşik 5 mm: 1 cm'lik pay yazılıyor, yuvarlama artığı (0,001 m) yazılmıyor. */}
                {!list.some((x) => x.type === 'lshape') && olcuMarginM > 0.0045 && (
                  <>
                    <div
                      className="absolute"
                      /*
                        PAY ETİKETİ KENDİ SATIRINDA.

                        Geniş payda etiket -40'a, ekranların eni ise -34'e
                        yazılıyordu: iki satır 6 piksel arayla üst üste
                        biniyor, gri pay yazısı koyu en yazısının altında
                        kalıyordu (ölçüldü: "0,05 m" ile "0,32 m" çakışık).
                        Pay etiketi artık her iki durumda da bir satır
                        yukarıda duruyor.
                      */
                      style={{
                        left: olcuSol > 34 ? olcuSol / 2 : 0,
                        top: -62 - ETIKET_ARALIK - bombePx,
                        transform: olcuSol > 34 ? 'translateX(-50%)' : 'translateX(-8%)',
                      }}
                    >
                      <span className="bg-neutral-400 text-white dark:bg-neutral-200 dark:text-neutral-900 text-[10px] sm:text-[11px] px-1.5 py-1 rounded-lg whitespace-nowrap max-w-[40vw] overflow-hidden text-ellipsis">{fmtU(olcuMarginM)}</span>
                    </div>
                    <div
                      className="absolute"
                      style={{
                        left: olcuSol > 34 ? wallW - olcuSol / 2 : wallW,
                        top: -62 - ETIKET_ARALIK - bombePx,
                        transform: olcuSol > 34 ? 'translateX(-50%)' : 'translateX(-92%)',
                      }}
                    >
                      <span className="bg-neutral-400 text-white dark:bg-neutral-200 dark:text-neutral-900 text-[10px] sm:text-[11px] px-1.5 py-1 rounded-lg whitespace-nowrap max-w-[40vw] overflow-hidden text-ellipsis">{fmtU(olcuMarginM)}</span>
                    </div>
                  </>
                )}

                {/* Ekran genişlikleri (dönüşümlü üst/alt).
                    "Ekran 01 · İç L Tipi" adı rozeti kaldırıldı: hangi ekranın
                    hangisi olduğu sol paneldeki listede zaten yazıyor, çizimin
                    üstünde ürünün parçasıymış gibi duruyordu. */}
                {/*
                  HER EKRANIN ÖLÇÜSÜ KENDİ ÜST KENARININ ORTASINDA.

                  Etiketler dönüşümlü olarak duvarın en üstüne ve en altına
                  yazılıyordu: ekranla etiketi arasında bazen yarım duvar
                  kalıyor, hangi sayının hangi ekrana ait olduğu
                  okunmuyordu. Artık hepsi üstte ve her biri kendi ekranının
                  üst kenarının ortasında duruyor (ekranlar farklı boydaysa
                  etiketler de o kadar aşağıda).
                */}
                {parcaCizgisi && !parcaKutulari?.length && placed.map((s, i) => {
                  const ustKenar = stripTop + (maxHpx - s.hPx)
                  return (
                    <div
                      key={`lbl${i}`}
                      className="absolute flex flex-col items-center gap-1 max-w-[70vw] pointer-events-none"
                      style={{
                        left: olcuSol + olcuCenter(s),
                        transform: 'translateX(-50%)',
                        top: ustKenar - 30 - ETIKET_ARALIK - bombePx,
                      }}
                    >
                      {/*
                        GERÇEK ÖLÇÜ. Kutu genişliği çaprazdan görünen
                        genişlik; onu yazmak hiçbir yerde olmayan bir
                        sayı üretiyordu. Kanatlı tasarımda her yüzeyin
                        kendi ölçüsü yazılıyor.
                      */}
                      <span className="bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 text-[10px] sm:text-[11px] px-2 py-1 rounded-lg whitespace-nowrap max-w-[40vw] overflow-hidden text-ellipsis">
                        {fmtU(s.gercekWm ?? s.wm)}
                      </span>
                    </div>
                  )
                })}

                {/* Sağ kenar: üst boşluk | ekran yüksekliği | alt boşluk */}
                <div style={{ position: 'absolute', left: olcuSagX, top: 0, height: wallH, width: 26, display: 'flex', flexDirection: 'column' }}>
                  {/* Pay negatifse (tasarım duvardan büyük) yazılacak bir boşluk yok. */}
                  {marginYm > 0.0045 && <SegV h={stripTop} label={fmtU(marginYm)} muted kacis="ust" />}
                  <SegV h={maxHpx} label={fmtU(maxHm)} />
                  {marginYm > 0.0045 && (
                    <SegV h={wallH - stripTop - maxHpx} label={fmtU(marginYm)} muted kacis="alt" />
                  )}
                </div>
                <HL top={stripTop} left={olcuSol + olcuW} width={wallW - (olcuSol + olcuW) + 40} />
                <HL top={stripTop + maxHpx} left={olcuSol + olcuW} width={wallW - (olcuSol + olcuW) + 40} />

                {/*
                  GRUP TOPLAMI ETİKETİ KALDIRILDI.

                  Tasarımın altında "Grup toplamı: … m × … m" yazıyordu; aynı
                  bilgi sol panelde zaten duruyor ve çizimin altında fazladan
                  bir satır olarak kalabalık yapıyordu. Hiçbir tipte (düz, L,
                  U, küp, açılı) yazılmıyor.
                */}
              </>
            )}

            {/*
              ÖLÇÜ ETİKETİ EKRANIN GERÇEKTEN GÖRÜNDÜĞÜ YERDE.

              Etiketler şeridin, yani KARŞIDAN bakışın hesabına göre
              konuyordu: L'de ve U'da ekranlar çizimde bambaşka yerde
              durduğu için sayılar düz bir sıra hâlinde yan yana kalıyor,
              hangi sayının hangi ekrana ait olduğu anlaşılmıyordu; tasarım
              dönükken de hepsi birden gizleniyordu. Konum artık ÇİZİMDEN
              ölçülüyor, bu yüzden dönük tasarımda da doğru yerde duruyor.
              Yandan bakılan (bir çizgiye inen) ekranın etiketi yazılmıyor:
              gösterecek bir kenarı yok.
            */}
            {showMeasurements && parcaCizgisi && !!parcaKutulari?.length && !!duvarKonum &&
              (() => {
                /*
                 * YAN YANA DÜŞEN ETİKETLER ÜST ÜSTE BİNMİYOR.
                 *
                 * Köşe ortada duran bir L'de iki kol ekranın ortasında
                 * buluşuyor: iki etiketin yeri birkaç piksel ayrı kalıyor ve
                 * sayılar iç içe geçiyordu. Birbirine yakın düşen etiketler
                 * sırayla bir satır yukarı alınıyor; ikisi de okunuyor ve
                 * hangisinin hangi ekran olduğu yerinden belli oluyor.
                 */
                const EN_AZ_ARA = 54
                const SATIR = 26
                let oncekiOrta = null
                let kat = 0
                return [...parcaKutulari]
                  .filter((k) => k.sag - k.sol >= 6)
                  .sort((a, b) => a.sol + a.sag - (b.sol + b.sag))
                  .map((k) => {
                    const orta = (k.sol + k.sag) / 2
                    kat = oncekiOrta != null && orta - oncekiOrta < EN_AZ_ARA ? kat + 1 : 0
                    oncekiOrta = orta
                    return { k, orta, kat }
                  })
                  .map(({ k, orta, kat: katNo }) => (
                  <div
                    key={`pk${k.id}`}
                    className="absolute flex flex-col items-center gap-1 max-w-[70vw] pointer-events-none"
                    style={{
                      left: orta - duvarKonum.sol,
                      transform: 'translateX(-50%)',
                      top: k.ust - duvarKonum.ust - 30 - ETIKET_ARALIK - katNo * SATIR,
                      zIndex: 5,
                    }}
                  >
                    <span className="bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 text-[10px] sm:text-[11px] px-2 py-1 rounded-lg whitespace-nowrap max-w-[40vw] overflow-hidden text-ellipsis">
                      {fmtU(k.en)}
                    </span>
                  </div>
                ))
              })()}
          </div>
        </div>
      </div>
    )
  }

  // ---- TEK EKRAN ----
  /*
   * Duvar, kullanıcının yazdığı ölçüden küçük olamaz ama TASARIMDAN da küçük
   * olamaz. Çoklu ekran dalı (yukarıda) bunu zaten böyle yapıyordu; tek ekran
   * dalı yapmıyordu ve ikisi ayrışıyordu.
   *
   * Duvarı tasarımı içerecek kadar büyütmek, aşağıdaki iki kırpmayı da
   * kendiliğinden gereksiz kılıyor: fitScale 1'de kalıyor (nativeW ≤ wallW),
   * paylar negatife düşmüyor. Yani tasarım artık kırpılmıyor, duvar esniyor.
   */
  /* Duvar ne yazıldıysa o (bkz. çoklu daldaki aynı not). */
  const wallWm = Math.max(0.1, Number(width) || 0)
  const wallHm = Math.max(0.1, Number(height) || 0)

  /*
   * ÖLÇEK HESABI — duvar kaç piksele sığacak?
   *
   * Duvarın ÇEVRESİNDEKİ öğeler de yer kaplar ve bunlar mutlak konumlu
   * olduğu için taşarlarsa kırpılırlar (kapta overflow-hidden var):
   *   sağda  → ölçü etiketi + Satır (+/−) düğmesi   ~90 px
   *   solda  → ölçü payı                            ~90 px
   *   üstte  → Sütun (+/−) düğmesi + ölçü etiketi   ~110 px
   *   altta  → izleme mesafesi çizgisi              ~ 80 px
   *
   * Ayrıca insan silüeti duvarla AYNI satırda duruyor: grup ortalandığı için
   * duvarı sağa itiyor ve sağdaki düğmenin yerini yiyor. Bu yüzden silüetin
   * genişliği de hesaba katılır — METRE cinsinden, çünkü boyu sabit (1,80 m)
   * ve genişliği ondan türüyor. Böylece döngüsel bağımlılık oluşmuyor.
   */
  /*
   * Duvarın çevresindeki öğeler (ölçü etiketleri, +/- düğmeleri) için ayrılan
   * pay. Sahne varken KÜÇÜK tutulur: duvar kutusu tuvalin ortasında dar bir
   * alan ve büyük pay ekranı gereksiz yere küçültüyor. Taşan düğmeler kutunun
   * dışında, mekânın üzerinde görünür — sorun değil.
   */
  /*
   * Sahne varken pay KÜÇÜK tutulur (mekân tuvali doldursun) — ama ölçüler
   * açıksa etiketler duvarın dışında duruyor ve tuvalin dışına taşıp
   * kırpılıyordu. Ölçüler açıkken onlara da yer ayrılıyor.
   */
  /*
   * PAY SABİT — ÖLÇÜLERE BAĞLI DEĞİL.
   *
   * Ölçüler açıkken 150, kapalıyken 48 px pay ayrılıyordu; sığdırma hesabı bu
   * paya baktığı için "Ölçüleri gizle" düğmesi tasarımı büyütüyordu. Ölçek
   * mekânın kalibrasyonundan gelmeli, etiketlerin görünür olup olmamasından
   * değil. Doğru olan büyük pay: etiketler açıldığında kırpılmıyor ve ekran
   * iki durumda da aynı boyda kalıyor.
   */
  const sahnePay = 150
  /*
   * Dar ekran payı 88 iken (44 sol + 44 sağ) SAĞ taraf yetmiyordu: ölçü
   * etiketi + boşluk + satır artır/azalt düğmesi yaklaşık 76 px istiyor.
   * Telefonda düğmeler ekranın dışında kalıp tıklanamıyordu. 152 = 76 + 76.
   */
  /*
   * Sahne varken pay küçük tutuluyor (mekân tuvali doldursun) ve taşan düğmeler
   * mekânın üzerine binebiliyor — geniş ekranda sorun değil. TELEFONDA ise
   * düğme kutunun değil EKRANIN dışına düşüyor ve tıklanamıyordu; o yüzden dar
   * ekranda sahneyle birlikte de en az 152 px (76 + 76) ayrılıyor.
   */
  /* Aralık kadar fazladan pay (bkz. ETIKET_ARALIK). */
  const SIDE_UI_PX =
    (sahneVar ? (dar ? Math.max(sahnePay, 152) : sahnePay) : dar ? 152 : 180) +
    (sahneVar ? 0 : 4 * ETIKET_ARALIK) // sol + sağ
  const VERT_UI_PX = (sahneVar ? sahnePay : dar ? 92 : 190) + (sahneVar ? 0 : 4 * ETIKET_ARALIK) // üst + alt
  const showHuman = !sahneVar && size.w >= 560 && wallHm >= HUMAN_MIN_WALL_M - 0.005
  const HUMAN_GAP_PX = 24 // flex gap-6
  const humanWm = showHuman ? HUMAN_HEIGHT_M * HUMAN_FIG_W_RATIO : 0

  const availW = Math.max(dar ? 120 : 180, size.w - SIDE_UI_PX - (showHuman ? HUMAN_GAP_PX : 0))
  const availH = Math.max(dar ? 110 : 140, size.h - VERT_UI_PX)

  /*
   * ÖNCE kavis yokmuş gibi ölçeklenir. Böylece düz ↔ kavisli geçişinde duvar
   * OLDUĞU YERDE KALIR — aksi halde kavise basınca tüm çizim küçülüyor ve
   * duvar da küçülmüş gibi görünüyordu.
   */
  const sahneOlcek = sahneOlcekVarsayilan || Infinity
  /*
   * Sahne VARKEN sığdırma DUVARA değil EKRANA göre yapılır.
   *
   * Duvar sahnede zaten çizilmiyor (pano bir duvara asılmıyor, direği
   * üstünde duruyor). Duvara göre sığdırınca duvar 1 m, ekran 0,32 m olduğunda
   * tuvali duvar dolduruyor ve ekran ortada küçücük kalıyordu; mekân da
   * ekranın çevresinde aşırı esniyordu.
   */
  // nCols/nRows bu noktada henüz bildirilmedi; doğrudan cols/rows kullanılıyor
  /* Kadraj duvarı da tasarımı da alıyor: taşan kısım tuvalin dışında kalmasın. */
  const sigdirWm = sahneVar
    ? Math.min(wallWm, Math.max(1, cols) * cw)
    : Math.max(wallWm, Math.max(1, cols) * cw) + humanWm
  const sigdirHm = sahneVar
    ? Math.min(wallHm, Math.max(1, rows) * ch)
    : Math.max(wallHm, Math.max(1, rows) * ch)
  // Ust sinir yalnizca sahne YOKKEN — bkz. cok ekranli daldaki ayni hesap
  /*
   * SAHNE ÖLÇEĞİ VERİLDİYSE BİREBİR UYULUR.
   *
   * Eskiden burada tuvale sığdırma da hesaba katılıyordu (min). Sonuç: arka
   * plan mesafeyle küçülürken tasarım sığdırma sınırında takılı kalıyor,
   * 18 m'lik ekran 18 m'lik duvarı aşıyordu. Sığdırmayı artık sahne yapıyor:
   * tasarım kadraja sığmıyorsa kamera geri çekiliyor (bkz. App sahneYakinlik),
   * yani arka plan ve tasarım BİRLİKTE küçülüyor; oran hiç bozulmuyor.
   */
  /* Duvar tuvalin yaklaşık 3/4'ünü kaplıyor (bkz. çoklu daldaki aynı kural). */
  const tekKullanW = Math.min(size.w * DOLULUK, availW)
  const tekKullanH = Math.min(size.h * DOLULUK, availH)
  const basePxPerM = Number.isFinite(sahneOlcek)
    ? sahneOlcek
    : Math.min(tekKullanW / sigdirWm, tekKullanH / sigdirHm)

  /* Kavis kutusunun dışına taşmıyor (bkz. çoklu daldaki aynı not): pay yok. */
  const bulgeM = 0

  /*
   * Kavis duvarın dışına taşar. Taşan kısım için ayrıca yer açmaya GEREK YOK:
   * duvar zaten kabın ortasında ve çevresinde VERT_UI_PX kadar boşluk var.
   * Önce o boşluk kullanılır; yalnızca taşma oraya da sığmazsa çizim küçültülür.
   *
   * Küçültme gerektiğinde bile kabin ölçeği bozulmaz — pxPerM duvarı, ekranı ve
   * silüeti EŞİT ölçekler, yani sadece uzaklaşmış oluruz.
   */
  const MIN_EDGE_PX = 56 // taşan kavisle kabın kenarı arasında kalması gereken pay
  const drawableH = Math.max(140, size.h - MIN_EDGE_PX)
  // Sahne varken bu denetim de DUVARA değil ekrana bakar (bkz. sigdirHm)
  const dikeyM = (sahneVar ? sigdirHm : wallHm) + bulgeM
  const neededH = dikeyM * basePxPerM
  const pxPerM = neededH <= drawableH ? basePxPerM : drawableH / dikeyM
  olcekRef.current = pxPerM

  const wallW = wallWm * pxPerM
  const wallH = wallHm * pxPerM
  const humanH = HUMAN_HEIGHT_M * pxPerM

  const nCols = Math.max(1, cols)
  const nRows = Math.max(1, rows)
  // Ekran gerçek boyutu; duvardan büyükse en/boy oranını KORUYARAK küçült (deforme olmasın)
  const nativeW = nCols * cw * pxPerM
  const nativeH = nRows * ch * pxPerM
  /*
   * KABİN ÖLÇEĞİ BOZULMAZ.
   *
   * Kavisin şişkinliği bilerek ölçeklemeye KATILMIYOR: katılsaydı ekran
   * küçültülür ve kabinler gerçek boyutundan küçük çizilirdi (bazı duvarlarda
   * beşte bir oranında). Kabin ölçüsü sabittir — sadece sayısı değişir.
   *
   * Sonuç: kavis duvar çizgisinin üstünden ve altından taşar. Gerçekte de ekran
   * izleyiciye doğru büküldüğü için bu doğru görünür.
   *
   * Buradaki min(1, ...) yalnızca güvenlik ağı: ekranın FİZİKSEL ölçüsü duvarı
   * aşarsa (paylaşılan bozuk bağlantı gibi) çizim taşmasın diye.
   */
  /*
   * TASARIM KÜÇÜLTÜLMÜYOR.
   *
   * Ekran duvarı aşınca duvara sığacak kadar küçültülüyordu: kullanıcı 0,90
   * m'lik duvar yazdığında 1,28 m'lik tasarım sessizce 0,90 m gibi
   * çiziliyor, yani yanlış bir ölçü gösteriliyordu. Kabin ölçüsü gerçek
   * kalıyor; duvardan büyükse taşan kısım duvarın dışında görünüyor.
   */
  const fitScale = 1
  const screenW = nativeW * fitScale
  const screenH = nativeH * fitScale

  /*
   * MESAFE TASARIMA GÖRE HESAPLANIYOR.
   *
   * Modelin kendi değeri yazılıyordu: duvar da tasarım da büyüse sayı
   * değişmiyordu. Oysa modelin yanında yazan mesafe TEK BİR PANELİN
   * değeri — "bundan yakına gelirsen pikselleri ayırt edersin". Ekran
   * büyüdükçe asıl belirleyici olan, ekranın tamamını görebilmek için
   * gereken uzaklık oluyor. İkisinin büyüğü alınıyor (viewingDistanceFor)
   * ve sütun/satır değişir değişmez yeniden hesaplanıyor.
   */
  const viewDist = viewingDistanceFor(model, nCols, nRows)

  /*
   * Ekranın fiziksel ölçüsü doğrudan kabin sayısından geliyor; duvara
   * kırpılmıyor (bkz. yukarıdaki wallWm notu ve App.jsx'teki ekranWm).
   */
  const screenWm = nCols * cw
  const screenHm = nRows * ch
  /*
   * Ölçü düğmelerinin boyu tasarımla birlikte: ekranın kısa kenarının beşte
   * biri, 18–32 piksel arasında. Küçük tasarımda ekranı bastırmıyor, büyük
   * tasarımda kaybolmuyor.
   */
  /* Negatif olabiliyor: tasarım duvardan büyükse ikisi de ortalı kalsın. */
  const marginXpx = (wallW - screenW) / 2
  const marginYpx = (wallH - screenH) / 2
  /* Ölçüm kancası bu payı okuyor (bkz. yukarıdaki useLayoutEffect). */


  /*
   * EKRAN KUTUSUNUN GERÇEK YERİ.
   *
   * Dönüşüm uygulanmamış hâlinin kapsayıcıya göre sol üst köşesi ölçülüyor.
   * koseDonusumu transformOrigin '0 0' kullandığı için kose (0,0) tam olarak
   * buraya denk geliyor.
   */
  /*
   * ÖLÇÜNÜN DAYANDIĞI KUTU.
   *
   * Dört köşe kipinde ekran, tasarım kutusundan farklı büyüklükte bir
   * dörtgene oturuyor. Etiketleri tasarım kutusuna göre yerleştirmek
   * onları dörtgenin üstüne düşürüyordu; ölçünün dayanağı artık ekranın
   * GÖRÜNEN kutusu.
   */
  const gorunenKutu = kose
    ? {
        x: marginXpx + Math.min(...kose.map((k) => k.x)),
        y: marginYpx + Math.min(...kose.map((k) => k.y)),
        w: Math.max(...kose.map((k) => k.x)) - Math.min(...kose.map((k) => k.x)),
        h: Math.max(...kose.map((k) => k.y)) - Math.min(...kose.map((k) => k.y)),
      }
    : { x: marginXpx, y: marginYpx, w: screenW, h: screenH }

  const olcuBoy = Math.max(16, Math.min(30, Math.round(Math.min(gorunenKutu.w, gorunenKutu.h) / 5)))
  /*
   * +/- DÜĞMELERİ TASARIMIN ÖLÇÜSÜNE BAĞLI DEĞİL.
   * Dokunma hedefi her tasarımda aynı olmalı; ölçü etiketlerinin boyu
   * (olcuBoy) tasarımla büyüyüp küçülmeye devam ediyor.
   */
  const dugmeBoy = 28
  /* Etiket puntosu da tasarımla birlikte: düğme boyunun ~%38'i. */
  const olcuYazi = Math.max(7, Math.min(10, Math.round(olcuBoy * 0.34)))
  /*
   * KAVİSİN TASARIM KUTUSUNUN ÜSTÜNE TAŞAN YARISI (piksel).
   * Üstteki ölçü etiketleri bu kadar daha yukarı çıkıyor ki yayın
   * tepesine binmesinler (bkz. aşağıdaki üst ölçü etiketleri).
   */
  const bombeUstPx = (bulgeM * pxPerM) / 2
  /*
   * ÜST ÖLÇÜ ETİKETİNİN SATIRI.
   *
   * Etiket tasarımın üstünde, ikisinin arasında ETIKET_ARALIK kadar boşlukla
   * duruyor. Duvar payı etiketi almıyorsa (tasarım duvarın üst çizgisine
   * yakınsa) etiket duvarın dışına, üst çizginin üstüne çıkıyor: orası boş.
   */
  const ustEtiketBoy = olcuYazi * 1.9
  /*
   * ÖLÇÜT DUVAR DEĞİL TASARIM.
   *
   * Etiket, duvarın payı dar olduğunda duvarın ÜST ÇİZGİSİNİN üstüne
   * çıkıyordu. Tasarım duvardan büyükse (taşma) o nokta tasarımın İÇİNE
   * düşüyor: etiket ve hemen üstündeki +/− hapı tasarımın üst kenarına
   * biniyordu. Etiket her zaman tasarımın üst kenarından ETIKET_ARALIK
   * kadar yukarıda; duvarın dışına çıkması sorun değil, orası boş.
   */
  const ustEtiketY = gorunenKutu.y - ETIKET_ARALIK - ustEtiketBoy - bombeUstPx - sahnePayPx
  /* Duvarın üstünde kalan tuval payı: etiket ve hap oraya çıkabiliyor. */
  const duvarUstBosluk = Math.max(0, (size.h - wallH) / 2)
  const marginXm = (wallWm - screenWm) / 2
  const marginYm = (wallHm - screenHm) / 2

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[50vh] sm:h-[60vh] md:h-full flex items-center justify-center overflow-hidden min-h-0"
      style={gizle ? { visibility: 'hidden' } : undefined}
    >
      {sifirlaDugmesi}
      <div dir="ltr" className="flex items-end gap-3 sm:gap-6 max-w-full">
        {!sahneVar && size.w >= 560 && wallHm >= HUMAN_MIN_WALL_M - 0.005 && (
            <HumanSilhouette height={humanH} showMeasure={showMeasurements} />
          )}

        <div
          className="relative"
          {...(tutamak || {})}
          style={{
            transform: kayma ? `translate(${kayma.x}px, ${kayma.y}px)` : undefined,
            ...(tutamak ? tutamak.style : null),
          }}
        >
          <div
            style={{
              width: wallW,
              height: wallH,
              transform: yonDonusumu(yon, wallW) || undefined,
              /*
               * TEK EKRANDA DA 3B.
               *
               * Dönüş ekranın kendi kutusuna uygulanıyor, perspektif ise
               * duvar kutusunda duruyor — duvarın kendisi dönmüyor.
               * Tasarım ekranında perspektif ZAYIF (çoklu ekrandaki kuralın
               * aynısı): ekran olduğu yerde dönüyor, uzaklaşmıyor.
               */
              perspective: donuk
                ? Math.max(600, (sahneVar ? 2.2 : 8) * Math.max(screenW, screenH))
                : undefined,
              perspectiveOrigin: '50% 50%',
            }}
            className={`${sahneVar ? '' : 'bg-white dark:bg-[#dfe3e9] border border-neutral-300 dark:border-[#9aa2ae]'} relative flex items-center justify-center`}
          >
            {/*
              Dört köşe hedefi varken dönüşüm EKRAN KUTUSUNA uygulanıyor:
              duvar kutusu tasarımdan büyük olabiliyor, homografi ise tam
              tasarımın dört köşesini hedefe eşlemek zorunda.
            */}
            <div
              ref={ekranKutuRef}
              /* Testin görünürlüğü ölçebilmesi için sabit işaret. */
              data-tasarim-yuz
              /*
               * Sürükleme yalnızca TASARIMIN üstünde: sahnelerde tasarımı
               * taşıyan tutamak (bkz. kayma) duvarın boş yerinde çalışmayı
               * sürdürüyor. Dörtgen hedefi varken (kendi fotoğrafı) dönüş
               * kapalı: orada yerleştirmenin kendi döndürmesi var.
               */
              onPointerDown={kose ? undefined : donusBaslat}
              onPointerMove={kose ? undefined : donusSurdur}
              onPointerUp={kose ? undefined : donusBitir}
              onPointerCancel={kose ? undefined : donusBitir}
              onDoubleClick={kose ? undefined : () => onDonus?.({ yaw: 0, egim: 0 })}
              style={{
                width: screenW,
                height: screenH,
                transform: kose
                  ? koseDonusumu(screenW, screenH, kose) || undefined
                  : donuk
                    ? `rotateX(${donus?.egim || 0}deg) rotateY(${donus?.yaw || 0}deg)`
                    : undefined,
                /* Homografi köşeden ölçüyor; kendi ekseninde dönüş merkezden. */
                transformOrigin: kose ? '0 0' : '50% 50%',
                cursor: !kose && onDonus ? 'grab' : undefined,
                /* Dokunmatikte kaydırma yerine döndürme. */
                touchAction: !kose && onDonus ? 'none' : undefined,
                /* Duvarı aşan tasarım: ince kırmızı çizgi (bkz. tasmaCizgi). */
                outline: tasmaCizgi ? '1px solid #dc2626' : undefined,
                outlineOffset: tasmaCizgi ? '1px' : undefined,
                /* Yerinde 3B çizildiyse düz çizim gizleniyor: ekran iki kez görünmesin. */
                opacity: ekranGizle ? 0 : undefined,
              }}
            >
            <Screen
              wPx={screenW}
              hPx={screenH}
              cols={nCols}
              rows={nRows}
              type={screenType}
              resolution={resolution}
              model={model}
              content={content}
              contentUrl={contentUrl}
              hideRegions={hideRegions}
              sade={sade}
              curveAmount={curveAmount}
              {...(dilim
                ? {
                    spanW: screenW * dilim.sw,
                    spanH: screenH * dilim.sh,
                    offsetX: screenW * dilim.sx,
                    offsetY: screenH * dilim.sy,
                  }
                : null)}
            />
            </div>
            {/*
              YERİNDE 3B — DUVAR KUTUSUNUN İÇİNDE.

              Dörtgen duvar kutusuna göre veriliyor: ekran kutusu duvarın
              ortasında duruyor, köşeler de ona göre kaydırılıyor. Böylece
              3B ekran düz çizimle tam olarak aynı yere ve aynı ölçüde
              oturuyor.
            */}
            {uc3dKatman?.({
              koseler: (kose || [
                { x: 0, y: 0 },
                { x: screenW, y: 0 },
                { x: screenW, y: screenH },
                { x: 0, y: screenH },
              ]).map((k) => ({ x: marginXpx + k.x, y: marginYpx + k.y })),
              genislik: wallW,
              yukseklik: wallH,
            })}
          </div>

          {/*
            Ölçü düğmelerinin boyu tasarımla birlikte değişiyor: ekranın kısa
            kenarının beşte biri, 18–34 piksel arasında. Küçük tasarımda
            küçülüp ekranı kapatmıyor, büyük tasarımda kaybolmuyor.
          */}
          {/* eslint-disable-next-line no-unused-vars */}
          {showMeasurements && !donuk && (
            /*
             * ÖLÇÜLER TASARIMLA BİRLİKTE GİDİYOR.
             *
             * Dört köşe yerleşiminde ekran fotoğraftaki yüzeye taşınıyor ama
             * etiketler ve +/- düğmeleri tuvalin ortasında kalıyordu — ölçü
             * bir yerde, ekran başka yerde. Ölçü katmanı, dörtgenin merkezi
             * ile tasarım kutusunun merkezi arasındaki fark kadar kaydırılıyor.
             * Etiketler DÖNDÜRÜLMÜYOR: onlar arayüz, mekânın parçası değil.
             */
            <div>
              {/* Noktalı ölçü kılavuz çizgileri */}
              <VL left={0} top={-32} height={32} />
              <VL left={marginXpx} top={-32} height={marginYpx + screenH + 32} />
              <VL left={marginXpx + screenW} top={-32} height={marginYpx + screenH + 32} />
              <VL left={wallW} top={-32} height={32} />
              <HL top={0} left={wallW} width={40} />
              <HL top={marginYpx} left={marginXpx + screenW} width={wallW - (marginXpx + screenW) + 40} />
              <HL top={marginYpx + screenH} left={marginXpx + screenW} width={wallW - (marginXpx + screenW) + 40} />
              <HL top={wallH} left={wallW} width={40} />

              {/*
                ÜST ÖLÇÜ ETİKETLERİ — KAVİSİN ÜSTÜNDE.

                Kavisli ekranda yay, tasarım kutusunun üstüne bulgeM/2 kadar
                taşıyor (bkz. CurvedScreen: tuval kutudan maxD uzun ve
                -maxD/2 ile ortalanıyor). Etiketin konumu bu taşmayı
                hesaba katmıyordu, yani genişlik yazısı doğrudan kavisin
                tepesine biniyordu (ölçüldü). Pay artık çıkarılıyor; düz
                ekranda bulgeM 0 olduğu için hiçbir şey değişmiyor.
              */}
              <div
                style={{
                  position: 'absolute',
                  /*
                   * ÜST ETİKET NE TASARIMA NE DUVARA DEĞİYOR.
                   *
                   * Etiket tasarımın üstüne sabit bir payla konuyordu; duvar
                   * payı dar olunca duvarın üst çizgisine yapışıyor, hatta
                   * üstüne biniyordu. Duvar payı etikete yetmiyorsa etiket
                   * duvarın DIŞINA çıkıyor — orası her zaman boş.
                   */
                  top: ustEtiketY,
                  left: gorunenKutu.x,
                  width: gorunenKutu.w,
                  display: 'flex',
                }}
              >
                <SegH w={gorunenKutu.w} label={fmtU(screenWm)} yazi={olcuYazi} />
              </div>

              {/*
                DUVARDA KALAN BOŞLUK.

                Tasarım duvardan küçükse kenarlarda beyaz pay kalıyor ama
                ölçüsü hiçbir yerde yazmıyordu; montajda asıl sorulan sayı o
                ("sağa soluma ne kadar boşluk kalıyor?"). Pay, etiketin
                sığacağı kadar genişse yazılıyor.
              */}
              {/*
                Boşluk ölçüleri yalnızca SADE DUVAR görünümünde.

                Mekân fotoğrafında duvar kutusu tuvalin tamamı kadar; bu
                etiketler tasarımdan metrelerce uzağa, fotoğrafın kenarına
                düşüyordu. Orada anlamı da yok: ölçülen şey müşterinin
                duvarı değil, sahnenin kadrajı.
              */}
              {/*
                DAR PAYIN ÖLÇÜSÜ DE YAZILIYOR.

                Etiket yalnızca boşluk 34 pikselden genişse çıkıyordu. 1 m'lik
                duvara 0,96 m'lik ekran kurulduğunda yanlarda 2'şer santim
                kalıyor ve o pay hiç yazılmıyordu; kullanıcı duvarda ne kadar
                yer kaldığını öğrenemiyordu. Oysa montajda asıl merak edilen
                tam olarak bu.

                Dar boşlukta etiket araya sığmaz: bir üst satıra alınıp
                duvarın kenarına yaslanıyor. Geniş boşlukta eskisi gibi
                boşluğun ortasında duruyor.
              */}
              {/* Eşik 5 mm: 1 cm'lik pay yazılıyor, yuvarlama artığı (0,001 m) yazılmıyor. */}
              {!sahneVar && !kose && marginXpx / pxPerM > 0.0045 && (
                <>
                  <div
                    className="absolute"
                    style={{
                      left: marginXpx > 34 ? marginXpx / 2 : 0,
                      /* Pay etiketi her zaman bir üst satırda: en etiketiyle çakışmıyor. */
                      top: -olcuYazi * 4.2 - 2 * ETIKET_ARALIK - sahnePayPx - bombeUstPx,
                      transform: marginXpx > 34 ? 'translateX(-50%)' : 'translateX(-8%)',
                    }}
                  >
                    <span style={{ fontSize: olcuYazi }} className="bg-neutral-400 text-white dark:bg-neutral-200 dark:text-neutral-900 px-1.5 py-1 rounded-lg whitespace-nowrap leading-none">{fmtU(marginXpx / pxPerM)}</span>
                  </div>
                  <div
                    className="absolute"
                    style={{
                      left: marginXpx > 34 ? wallW - marginXpx / 2 : wallW,
                      top: -olcuYazi * 4.2 - 2 * ETIKET_ARALIK - sahnePayPx - bombeUstPx,
                      transform: marginXpx > 34 ? 'translateX(-50%)' : 'translateX(-92%)',
                    }}
                  >
                    <span style={{ fontSize: olcuYazi }} className="bg-neutral-400 text-white dark:bg-neutral-200 dark:text-neutral-900 px-1.5 py-1 rounded-lg whitespace-nowrap leading-none">{fmtU(marginXpx / pxPerM)}</span>
                  </div>
                </>
              )}

              {/* Dikey boşluklar: üst ve alt pay (sağ şeritte, gri) */}
              {/* Dar üst/alt pay da yazılıyor — yatayla aynı kural. */}
              {!sahneVar && !kose && marginYpx / pxPerM > 0.0045 && (
                <>
                  <div
                    className="absolute"
                    style={{
                      left: wallW + olcuYazi * 0.8 + 2 * ETIKET_ARALIK + sahnePayPx,
                      top: marginYpx > 34 ? marginYpx / 2 : 0,
                      transform: marginYpx > 34 ? 'translateY(-50%)' : 'translateY(-8%)',
                    }}
                  >
                    <span style={{ fontSize: olcuYazi }} className="bg-neutral-400 text-white dark:bg-neutral-200 dark:text-neutral-900 px-1.5 py-1 rounded-lg whitespace-nowrap leading-none">{fmtU(marginYpx / pxPerM)}</span>
                  </div>
                  <div
                    className="absolute"
                    style={{
                      left: wallW + olcuYazi * 0.8 + 2 * ETIKET_ARALIK + sahnePayPx,
                      top: marginYpx > 34 ? wallH - marginYpx / 2 : wallH,
                      transform: marginYpx > 34 ? 'translateY(-50%)' : 'translateY(-92%)',
                    }}
                  >
                    <span style={{ fontSize: olcuYazi }} className="bg-neutral-400 text-white dark:bg-neutral-200 dark:text-neutral-900 px-1.5 py-1 rounded-lg whitespace-nowrap leading-none">{fmtU(marginYpx / pxPerM)}</span>
                  </div>
                </>
              )}

              {/* Sağ ölçü etiketleri */}
              <div
                style={{
                  position: 'absolute',
                  left: gorunenKutu.x + gorunenKutu.w + olcuYazi * 0.8 + ETIKET_ARALIK + sahnePayPx,
                  top: gorunenKutu.y,
                  height: gorunenKutu.h,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <SegV h={gorunenKutu.h} label={fmtU(screenHm)} yazi={olcuYazi} />
              </div>

              {/* Üstteki +/- : Sütun (ekran genişliği) */}
              <div
                data-pdf-gizle className="absolute flex items-stretch rounded-full overflow-hidden border border-neutral-300 dark:border-[#39414f] bg-white dark:bg-[#161a21] shadow-sm z-10"
                /* Kabın dışına taşıp yarım görünmesinler. */
                style={{
                  left: Math.min(Math.max(dugmeBoy, gorunenKutu.x + gorunenKutu.w / 2), Math.max(dugmeBoy, size.w - dugmeBoy)),
                  /*
                   * DÜĞME ÖLÇÜ ETİKETİNİN ÜSTÜNDE, TASARIMA DEĞMİYOR.
                   *
                   * Konumu doğrudan tasarımın üst kenarından hesaplanıyordu
                   * ve etiketle aynı şeride düşüyordu: hap, tasarımın üst
                   * kenarına biniyordu. Sıra artık yukarıdan aşağı
                   * kesinleşmiş: düğme, boşluk, etiket, boşluk, tasarım.
                   */
                  /*
                   * TAŞMADA DA TASARIMIN ÜSTÜNDE.
                   *
                   * Alt sınır tuvalin değil DUVARIN üstüydü (en az 2 px):
                   * tasarım duvardan büyük olunca etiket duvarın üstüne
                   * çıkıyor, hap ise 2 pikselde kalıp tasarımın üst kenarına
                   * biniyordu. Sınır artık tuvalin üst kenarı; duvarın
                   * dışına çıkması sorun değil, orası boş.
                   */
                  top: Math.max(2 - duvarUstBosluk, ustEtiketY - ETIKET_ARALIK - dugmeBoy),
                  transform: 'translateX(-50%)',
                }}
              >
                <StepBtn boy={dugmeBoy} dir="minus" onClick={() => onColsChange?.(Math.max(1, nCols - 1))} disabled={nCols <= 1} />
                <div className="w-px bg-neutral-200 dark:bg-[#2c333f]" />
                <StepBtn boy={dugmeBoy} dir="plus" onClick={() => onColsChange?.(Math.min(colsMax, nCols + 1))} disabled={nCols >= colsMax} ipucu={colsIpucu} />
              </div>

              {/* Sağdaki +/- : Satır (ekran yüksekliği) */}
              <div
                data-pdf-gizle className="absolute flex flex-col rounded-full overflow-hidden border border-neutral-300 dark:border-[#39414f] bg-white dark:bg-[#161a21] shadow-sm z-10"
                /* Telefonda kabın dışına düşüp tıklanamaz hale geliyordu: sağ
                   kenarın içinde kalacak şekilde sınırlanıyor. */
                style={{
                  /* Etiketin genişliği kadar daha dışarıda: hap etiketin üstüne
                     binmesin; ama kabın dışına da düşmesin. */
                  left: Math.min(
                    gorunenKutu.x + gorunenKutu.w + olcuYazi * 4.6 + sahnePayPx,
                    Math.max(dugmeBoy, size.w - dugmeBoy / 2 - 2),
                  ),
                  top: gorunenKutu.y + gorunenKutu.h / 2,
                  transform: 'translateY(-50%)',
                }}
              >
                <StepBtn boy={dugmeBoy} dir="minus" onClick={() => onRowsChange?.(Math.max(1, nRows - 1))} disabled={nRows <= 1} />
                <div className="h-px bg-neutral-200 dark:bg-[#2c333f]" />
                <StepBtn boy={dugmeBoy} dir="plus" onClick={() => onRowsChange?.(Math.min(rowsMax, nRows + 1))} disabled={nRows >= rowsMax} ipucu={rowsIpucu} />
              </div>

              {/*
                İZLEME MESAFESİ — DÜZ, OKUNUR BİR ETİKET.

                Eskiden duvarın sol alt köşesinden çapraz inen kesik bir
                çizgi vardı ve sayı 31° döndürülmüş hâlde onun ortasına
                yazılıyordu: hem eğik olduğu için zor okunuyor hem de
                tuvalin kenarına denk gelince yarım kalıyordu. Çizginin
                kendisi hiçbir ölçüyü göstermiyordu — boyu sabitti.

                Yerine duvarın altında yatay bir etiket var: iki uçlu kısa
                bir ok "mesafe" olduğunu söylüyor, sayı düz yazılıyor.
                Mekân sahnesi açıkken gizleniyor: orada ölçek hissini
                sahnenin kendisi veriyor.
              */}
              {!sahneVar && (
                <div
                  className="absolute flex items-center gap-1.5 whitespace-nowrap"
                  style={{ left: 0, top: wallH + 10 }}
                >
                  <svg width="30" height="9" style={{ overflow: 'visible' }} aria-hidden="true">
                    <line x1="1" y1="4.5" x2="29" y2="4.5" stroke="#9aa0a8" strokeWidth="1" strokeDasharray="4 3" />
                    <polyline points="5,1 1,4.5 5,8" fill="none" stroke="#9aa0a8" strokeWidth="1" strokeLinecap="round" />
                    <polyline points="25,1 29,4.5 25,8" fill="none" stroke="#9aa0a8" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                  <span className="text-[11px] leading-none text-neutral-500 dark:text-neutral-400">
                    {t('fit.distance')}:{' '}
                    <strong className="font-semibold tabular-nums">{fmtDist(viewDist)}</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
