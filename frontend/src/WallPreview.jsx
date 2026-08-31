import { useEffect, useRef, useState } from 'react'
import CurvedScreen from './CurvedScreen.jsx'
import LedDotsCanvas from './LedDotsCanvas.jsx'
import { viewingDistanceFor } from './viewingDistance.js'
import { DEFAULT_CONTENT_SRC, curveDepthFor, LED_GRADIENT, LED_LIT_FILTER, LED_SHEEN, ledDotSize, L_KIRILMA_PCT } from './content.js'
import { videoSrcFor } from './videoContent.js'
import { useLang } from './useLang.js'
import { yonDonusumu } from './hooks/useYon.js'
import { koseDonusumu } from './homografi.js'

/**
 * Çalışma alanı önizlemesi.
 * - Tek ekran: beyaz duvar + ölçekli ekran + ölçü etiketleri + insan + izleme mesafesi.
 * - Çoklu ekran: birden fazla ekran bitişik; içerik TÜM duvara yayılan TEK görsel olarak bölünür.
 * İçerik: 'led' = LED panel görünümü (varsayılan), 'photo' = örnek fotoğraf,
 *         'sample' = örnek video, 'none' = boş çerçeve, 'upload' = yüklenen görsel.
 */

const HUMAN_HEIGHT_M = 1.8
// Duvar YÜKSEKLİĞİ bundan azsa silüet gösterilmez. Eşik figürün kendi boyu:
// duvar 1,80 m ise figür tam duvar kadardır, hâlâ doğru bir ölçek referansıdır.
// (Eşik 2 m iken duvarı 1,80'e indirince silüet ortadan kayboluyordu.)
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

export function VideoLayer({ src, gw, gh, left, top, lit }) {
  const videoRef = useRef(null)

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
        width: Math.ceil(gw),
        height: Math.ceil(gh),
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
export function Screen({ wPx, hPx, cols, rows, type, resolution, model, content, contentUrl, spanW, spanH, offsetX = 0, offsetY = 0, hideRegions = false, frameOnly = false, curveAmount = 60, leftCols, rightCols }) {
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
  const videoSrc = frameOnly ? null : videoSrcFor(content, contentUrl)
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
  const bgW = Math.ceil(gw)
  const bgH = Math.ceil(gh)
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
    const totalCols = lCols + rCols
    // Kanat genişlikleri kendi sütun oranına göre (eşit değil, dinamik)
    const leftW = wPx * (lCols / totalCols)
    const rightW = wPx - leftW
    const cw = (model?.widthMm || 500) / 1000
    // Dikiş kenarının üstten/alttan içeri girme oranı (%). Köşenin derinlik hissi.
    const p = L_CORNER_PINCH_PCT
    // Her kanadın diyot dokusu kendi kabin ölçüsünden türer
    // Diyot dokusu yalnızca panel kapalıyken görünür (yayın varken görüntü izlenir)
    const leftDots = isNone || isLit ? null : ledDotSize(leftW / lCols, hPx / nRows)
    const rightDots = isNone || isLit ? null : ledDotSize(rightW / rCols, hPx / nRows)
    const leftClip = `polygon(0% 0%, 100% ${p}%, 100% ${100 - p}%, 0% 100%)`
    const rightClip = `polygon(0% ${p}%, 100% 0%, 100% 100%, 0% ${100 - p}%)`

    // İki kanadın birleşiminin dış hattı — alttaki dolgu katmanı bu şekle kırpılır
    const lYuzde = (leftW / wPx) * 100
    const birlesikClip = `polygon(0% 0%, ${lYuzde}% ${p}%, 100% 0%, 100% 100%, ${lYuzde}% ${100 - p}%, 0% 100%)`

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
              clipPath: leftClip,
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
            {videoSrc && <VideoLayer src={videoSrc} gw={gw} gh={gh} left={offsetX} top={offsetY} lit={isLit} />}
            {leftDots && <LedDotsCanvas wPx={leftW} hPx={hPx} dotW={leftDots.dotW} dotH={leftDots.dotH} />}
            {/* Gölge katmanı kaldırıldı: görüntü düz ekrandakiyle aynı canlılıkta
                kalmalı. Köşeyi zaten iki kanadın trapez kırpımı ve dikiş çizgisi
                anlatıyor. */}
          </div>
          {/* Sağ kanat — gölgede kalan yüz (bkz. yukarıdaki not) */}
          <div
            style={{
              position: 'relative',
              width: rightW,
              height: hPx,
              clipPath: rightClip,
              backgroundColor: frameOnly ? 'transparent' : isNone ? '#ffffff' : '#0a0a0a',
              filter: !frameOnly && isLit ? LED_LIT_FILTER : undefined,
              ...(frameOnly ? null : bgFor(offsetX + leftW)),
            }}
          >
            {videoSrc && <VideoLayer src={videoSrc} gw={gw} gh={gh} left={offsetX + leftW} top={offsetY} lit={isLit} />}
            {rightDots && <LedDotsCanvas wPx={rightW} hPx={hPx} dotW={rightDots.dotW} dotH={rightDots.dotH} />}
            {/* Gölge katmanı kaldırıldı — bkz. sol kanattaki not. */}
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
        {isNone && (
          <svg
            width={wPx}
            height={hPx}
            viewBox={`0 0 ${wPx} ${hPx}`}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {(() => {
              const pY = (hPx * p) / 100
              return (
                <>
                  <path
                    d={`M0,0 L${leftW},${pY} L${wPx},0 L${wPx},${hPx} L${leftW},${hPx - pY} L0,${hPx} Z`}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="1"
                  />
                  <line x1={leftW} y1={pY} x2={leftW} y2={hPx - pY} stroke="#64748b" strokeWidth="1" />
                </>
              )
            })()}
          </svg>
        )}

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
              top: `${p}%`,
              height: `${100 - 2 * p}%`,
              width: 3,
              transform: 'translateX(-50%)',
              background:
                'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.40) 50%, rgba(0,0,0,0) 100%)',
              pointerEvents: 'none',
            }}
          />
        )}
        {/* Dış kenarlarda panel kalınlığı — en öndeki kenarlar olduğu için
            ince bir açık şerit, gövdeye hacim kazandırır. */}
        {!isNone && (
          <>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02))', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 1, background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', pointerEvents: 'none' }} />
          </>
        )}
        {/* Kanat başına metre ölçüsü */}
        {!hideRegions && (
          <div style={{ position: 'absolute', left: 0, top: hPx + 8, width: wPx, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
            <span className="bg-neutral-800 text-white text-[10px] px-1.5 py-0.5 rounded-lg whitespace-nowrap max-w-[45%] overflow-hidden text-ellipsis">{(lCols * cw).toLocaleString('tr-TR', { maximumFractionDigits: 3 })} m</span>
            <span className="bg-neutral-800 text-white text-[10px] px-1.5 py-0.5 rounded-lg whitespace-nowrap max-w-[45%] overflow-hidden text-ellipsis">{(rCols * cw).toLocaleString('tr-TR', { maximumFractionDigits: 3 })} m</span>
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

  return (
    <div
      style={{
        width: wPx,
        height: hPx,
        position: 'relative',
        backgroundColor: frameOnly ? 'transparent' : isNone ? '#ffffff' : '#0a0a0a',
        border: isNone ? '1px solid #64748b' : undefined,
        // Panel çevresinde gölge/ışıma YOK: kenarlarda gölgelik olarak görünüyordu
        // ve kavisli ekranla tutarsızdı (orada da hiç yok).
      }}
      className="overflow-hidden shrink-0"
    >
      {!frameOnly && bgImage && (
        <div style={{ position: 'absolute', inset: 0, filter: isLit ? LED_LIT_FILTER : undefined, ...bgFor(offsetX) }} />
      )}

      {videoSrc && <VideoLayer src={videoSrc} gw={gw} gh={gh} left={offsetX} top={offsetY} lit={isLit} />}

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
          className={`leading-none rounded-lg whitespace-nowrap ${muted ? 'bg-neutral-400 text-white' : 'bg-neutral-800 text-white'}`}
        >
          {label}
        </span>
      )}
    </div>
  )
}

/** Dikey ölçü etiketi — kurallar SegH ile aynı. */
function SegV({ h, label, muted, yazi = 11 }) {
  const dolgu = `${Math.round(yazi * 0.5)}px ${Math.round(yazi * 0.35)}px`
  return (
    <div style={{ height: h }} className="flex items-center justify-center shrink-0 overflow-visible">
      {(!muted || h >= ETIKET_EN_AZ) && (
        <span
          style={{ writingMode: 'vertical-rl', fontSize: yazi, padding: dolgu }}
          className={`leading-none rounded-lg whitespace-nowrap ${muted ? 'bg-neutral-400 text-white' : 'bg-neutral-800 text-white'}`}
        >
          {label}
        </span>
      )}
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
function StepBtn({ dir, onClick, disabled, boy = 28 }) {
  return (
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
        src="/human.png"
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
  screenMode = 'single',
  screens = [],
  cols = 1,
  rows = 1,
  content = 'led',
  contentUrl = null,
  screenType = 'flat',
  resolution = 'FHD',
  showMeasurements = true,
  onColsChange,
  onRowsChange,
  colsMax = Infinity,
  rowsMax = Infinity,
  hideRegions = false,
  curveAmount = 60,
  // Arkada bir mekân sahnesi çizildiyse duvar kutusu SAYDAM olur; odanın kendi
  // duvarı görünsün diye. Beyaz dikdörtgen gri odanın içinde yama gibi durur.
  sahneVar = false,
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
  const fmtU = (m) => `${Number(m).toLocaleString('tr-TR', { maximumFractionDigits: 3 })} m`
  // İzleme mesafesi: kısa etiket (1 ondalık) — diyagonal çizgide taşmasın
  const fmtDist = (m) => `${Number(m).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m`

  const isMulti = screenMode === 'multi' && screens.length > 0

  // ---- ÇOKLU EKRAN ----
  if (isMulti) {
    const list = screens.map((s) => ({ ...s, wm: Math.max(1, s.cols) * cw, hm: Math.max(1, s.rows) * ch }))
    const totalWm = list.reduce((a, s) => a + s.wm, 0)
    const maxHm = Math.max(...list.map((s) => s.hm))
    // Sınırlayıcı duvar: en az ekranları içerecek kadar (Genişlik/Yükseklik'ten)
    const wallWm = Math.max(0.1, Number(width) || 0, totalWm)
    const wallHm = Math.max(0.1, Number(height) || 0, maxHm)
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
    const yanPay = sahneVar ? (dar ? Math.max(sahnePayM, 152) : sahnePayM) : dar ? 152 : 180
    const availW = Math.max(dar ? 120 : 180, size.w - yanPay - (showHumanM ? 24 : 0))
    const availH = Math.max(dar ? 110 : 140, size.h - (sahneVar ? sahnePayM : dar ? 92 : 190))
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
    const kavisPayiM = list.reduce((enBuyuk, s) => {
      if (s.type !== 'curved' && s.type !== 'curvedIn') return enBuyuk
      const derinlik =
        (Math.max(0, Math.min(100, curveAmount)) / 100) *
        curveDepthFor(s.type === 'curvedIn') *
        s.wm
      return Math.max(enBuyuk, derinlik)
    }, 0)

    /*
     * SAHNE ÖLÇEĞİ VERİLDİYSE BİREBİR UYULUR (bkz. tek ekran dalı).
     * Tuvale sığdırma işini sahne kendisi yapıyor: sığmayan tasarımda kamera
     * geri çekiliyor, ölçek kırpılmıyor.
     */
    const pxPerM = Number.isFinite(sahneOlcek)
      ? sahneOlcek
      : Math.min(
          availW / (wallWm + humanWmM),
          availH / (wallHm + kavisPayiM),
          sahneVar ? Infinity : 280,
        )
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

    let xAcc = 0
    const placed = list.map((s) => {
      const wPx = s.wm * pxPerM
      const o = { ...s, wPx, hPx: s.hm * pxPerM, xStart: xAcc, center: xAcc + wPx / 2 }
      xAcc += wPx
      return o
    })

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
    const maskePolygon = seritMaskePolygon(placed, maxHpx)

    return (
      <div
      ref={containerRef}
      /* Aday kareler açıkken bu katman soluyor; kareler fotoğrafın üstünde okunur kalıyor. */
      data-tasarim-katman
      className="relative w-full h-[50vh] sm:h-[60vh] md:h-full flex items-center justify-center overflow-hidden min-h-0"
    >
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
              style={{ width: wallW, height: wallH, transform: yonDonusumu(yon, wallW) || undefined }}
              className={`${sahneVar ? '' : 'bg-white dark:bg-[#dfe3e9] border border-neutral-300 dark:border-[#9aa2ae]'} relative ${kavisPayiM > 0 ? 'overflow-visible' : 'overflow-hidden'}`}
            >
              {/* Ekranlar şeridi (ortalanmış, alta hizalı) */}
              <div
                style={{
                  position: 'absolute',
                  left: marginXpx,
                  top: stripTop,
                  width: totalWpx,
                  height: maxHpx,
                  transform: koseDonusumu(totalWpx, maxHpx, kose) || undefined,
                  transformOrigin: '0 0',
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
                      backgroundSize: `${Math.ceil(totalWpx)}px ${Math.ceil(maxHpx)}px`,
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
                    {spanVideo && (
                      <VideoLayer src={spanVideo} gw={totalWpx} gh={maxHpx} left={0} top={0} lit={spanLit} />
                    )}
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
                      contentUrl={s.content ? null : contentUrl}
                      hideRegions={hideRegions}
                      frameOnly={useSingle}
                      curveAmount={curveAmount}
                      leftCols={s.leftCols}
                      rightCols={s.rightCols}
                      spanW={totalWpx}
                      spanH={maxHpx}
                      offsetX={s.xStart}
                      offsetY={maxHpx - s.hPx}
                    />
                  ))}
                </div>
              </div>
            </div>

            {showMeasurements && (
              <>
                {/* Dikey kılavuz çizgileri: duvar kenarları + ekran sınırları */}
                <VL left={0} top={-56 - bombePx} height={wallH + 140 + kavisPayiPx} />
                <VL left={wallW} top={-56 - bombePx} height={wallH + 140 + kavisPayiPx} />
                {placed.map((s, i) => (
                  <VL key={`v${i}`} left={marginXpx + s.xStart} top={-56 - bombePx} height={wallH + 140 + kavisPayiPx} />
                ))}
                <VL left={marginXpx + totalWpx} top={-56 - bombePx} height={wallH + 140 + kavisPayiPx} />

                {/* Sol/sağ kenar payı (üstte, gri) */}
                {marginXpx > 34 && (
                  <>
                    <div className="absolute" style={{ left: marginXpx / 2, top: -40 - bombePx, transform: 'translateX(-50%)' }}>
                      <span className="bg-neutral-400 text-white text-[10px] sm:text-[11px] px-1.5 py-1 rounded-lg whitespace-nowrap max-w-[40vw] overflow-hidden text-ellipsis">{fmtU(marginXm)}</span>
                    </div>
                    <div className="absolute" style={{ left: wallW - marginXpx / 2, top: -40 - bombePx, transform: 'translateX(-50%)' }}>
                      <span className="bg-neutral-400 text-white text-[10px] sm:text-[11px] px-1.5 py-1 rounded-lg whitespace-nowrap max-w-[40vw] overflow-hidden text-ellipsis">{fmtU(marginXm)}</span>
                    </div>
                  </>
                )}

                {/* Ekran genişlikleri (dönüşümlü üst/alt).
                    "Ekran 01 · İç L Tipi" adı rozeti kaldırıldı: hangi ekranın
                    hangisi olduğu sol paneldeki listede zaten yazıyor, çizimin
                    üstünde ürünün parçasıymış gibi duruyordu. */}
                {placed.map((s, i) => {
                  const isTop = i % 2 === 0
                  return (
                    <div
                      key={`lbl${i}`}
                      className="absolute flex flex-col items-center gap-1 max-w-[70vw] pointer-events-none"
                      style={{ left: marginXpx + s.center, transform: 'translateX(-50%)', top: isTop ? -34 - bombePx : wallH + 26 + bombePx }}
                    >
                      <span className="bg-neutral-800 text-white text-[10px] sm:text-[11px] px-2 py-1 rounded-lg whitespace-nowrap max-w-[40vw] overflow-hidden text-ellipsis">{fmtU(s.wm)}</span>
                    </div>
                  )
                })}

                {/* Sağ kenar: üst boşluk | ekran yüksekliği | alt boşluk */}
                <div style={{ position: 'absolute', left: Math.min(wallW + 10 + sahnePayPx, Math.max(0, wallW + (size.w - wallW) / 2 - 28)), top: 0, height: wallH, width: 26, display: 'flex', flexDirection: 'column' }}>
                  <SegV h={stripTop} label={fmtU(marginYm)} muted />
                  <SegV h={maxHpx} label={fmtU(maxHm)} />
                  <SegV h={wallH - stripTop - maxHpx} label={fmtU(marginYm)} muted />
                </div>
                <HL top={stripTop} left={marginXpx + totalWpx} width={wallW - (marginXpx + totalWpx) + 40} />
                <HL top={stripTop + maxHpx} left={marginXpx + totalWpx} width={wallW - (marginXpx + totalWpx) + 40} />
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ---- TEK EKRAN ----
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
  const SIDE_UI_PX = sahneVar ? (dar ? Math.max(sahnePay, 152) : sahnePay) : dar ? 152 : 180 // sol + sağ
  const VERT_UI_PX = sahneVar ? sahnePay : dar ? 92 : 190 // üst + alt
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
  const sigdirWm = sahneVar ? Math.min(wallWm, Math.max(1, cols) * cw) : wallWm + humanWm
  const sigdirHm = sahneVar ? Math.min(wallHm, Math.max(1, rows) * ch) : wallHm
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
  const basePxPerM = Number.isFinite(sahneOlcek)
    ? sahneOlcek
    : Math.min(availW / sigdirWm, availH / sigdirHm, sahneVar ? Infinity : 340)

  const curveKPre =
    screenType === 'curved' || screenType === 'curvedIn'
      ? (Math.max(0, Math.min(100, curveAmount)) / 100) * curveDepthFor(screenType === 'curvedIn')
      : 0
  const bulgeM = curveKPre * Math.max(1, cols) * cw

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
  const fitScale = Math.min(1, wallW / nativeW, wallH / nativeH)
  const screenW = nativeW * fitScale
  const screenH = nativeH * fitScale

  // Ekran boyutuna göre değişir: sütun/satır arttıkça mesafe de artar
  const viewDist = viewingDistanceFor(model, nCols, nRows)

  const screenWm = Math.min(wallWm, nCols * cw)
  const screenHm = Math.min(wallHm, nRows * ch)
  /*
   * Ölçü düğmelerinin boyu tasarımla birlikte: ekranın kısa kenarının beşte
   * biri, 18–32 piksel arasında. Küçük tasarımda ekranı bastırmıyor, büyük
   * tasarımda kaybolmuyor.
   */
  const marginXpx = Math.max(0, (wallW - screenW) / 2)
  const marginYpx = Math.max(0, (wallH - screenH) / 2)

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
  /* Etiket puntosu da tasarımla birlikte: düğme boyunun ~%38'i. */
  const olcuYazi = Math.max(7, Math.min(10, Math.round(olcuBoy * 0.34)))
  const marginXm = Math.max(0, (wallWm - screenWm) / 2)
  const marginYm = Math.max(0, (wallHm - screenHm) / 2)

  return (
    <div ref={containerRef} className="relative w-full h-[50vh] sm:h-[60vh] md:h-full flex items-center justify-center overflow-hidden min-h-0">
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
          <div style={{ width: wallW, height: wallH, transform: yonDonusumu(yon, wallW) || undefined }} className={`${sahneVar ? '' : 'bg-white dark:bg-[#dfe3e9] border border-neutral-300 dark:border-[#9aa2ae]'} flex items-center justify-center`}>
            {/*
              Dört köşe hedefi varken dönüşüm EKRAN KUTUSUNA uygulanıyor:
              duvar kutusu tasarımdan büyük olabiliyor, homografi ise tam
              tasarımın dört köşesini hedefe eşlemek zorunda.
            */}
            <div
              style={{
                width: screenW,
                height: screenH,
                transform: koseDonusumu(screenW, screenH, kose) || undefined,
                transformOrigin: '0 0',
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
              curveAmount={curveAmount}
            />
            </div>
          </div>

          {/*
            Ölçü düğmelerinin boyu tasarımla birlikte değişiyor: ekranın kısa
            kenarının beşte biri, 18–34 piksel arasında. Küçük tasarımda
            küçülüp ekranı kapatmıyor, büyük tasarımda kaybolmuyor.
          */}
          {/* eslint-disable-next-line no-unused-vars */}
          {showMeasurements && (
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

              {/* Üst ölçü etiketleri */}
              <div
                style={{
                  position: 'absolute',
                  top: gorunenKutu.y - olcuYazi * 2.2 - sahnePayPx,
                  left: gorunenKutu.x,
                  width: gorunenKutu.w,
                  display: 'flex',
                }}
              >
                <SegH w={gorunenKutu.w} label={fmtU(screenWm)} yazi={olcuYazi} />
              </div>

              {/* Sağ ölçü etiketleri */}
              <div
                style={{
                  position: 'absolute',
                  left: gorunenKutu.x + gorunenKutu.w + olcuYazi * 0.8 + sahnePayPx,
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
                style={{ left: gorunenKutu.x + gorunenKutu.w / 2, top: gorunenKutu.y - olcuBoy - olcuYazi * 2.6 - sahnePayPx, transform: 'translateX(-50%)' }}
              >
                <StepBtn boy={olcuBoy} dir="minus" onClick={() => onColsChange?.(Math.max(1, nCols - 1))} disabled={nCols <= 1} />
                <div className="w-px bg-neutral-200 dark:bg-[#2c333f]" />
                <StepBtn boy={olcuBoy} dir="plus" onClick={() => onColsChange?.(Math.min(colsMax, nCols + 1))} disabled={nCols >= colsMax} />
              </div>

              {/* Sağdaki +/- : Satır (ekran yüksekliği) */}
              <div
                data-pdf-gizle className="absolute flex flex-col rounded-full overflow-hidden border border-neutral-300 dark:border-[#39414f] bg-white dark:bg-[#161a21] shadow-sm z-10"
                /* Telefonda kabın dışına düşüp tıklanamaz hale geliyordu: sağ
                   kenarın içinde kalacak şekilde sınırlanıyor. */
                style={{ /* Etiketin genişliği kadar daha dışarıda: hap etiketin üstüne binmesin. */
                  left: gorunenKutu.x + gorunenKutu.w + olcuYazi * 4.6 + sahnePayPx, top: gorunenKutu.y + gorunenKutu.h / 2, transform: 'translateY(-50%)' }}
              >
                <StepBtn boy={olcuBoy} dir="minus" onClick={() => onRowsChange?.(Math.max(1, nRows - 1))} disabled={nRows <= 1} />
                <div className="h-px bg-neutral-200 dark:bg-[#2c333f]" />
                <StepBtn boy={olcuBoy} dir="plus" onClick={() => onRowsChange?.(Math.min(rowsMax, nRows + 1))} disabled={nRows >= rowsMax} />
              </div>

              {/* İzleme mesafesi çizgisi — mekân sahnesi açıkken gizlenir.
                  Sahne zaten mesafe/ölçek hissini kendi veriyor; teknik
                  çizim öğeleri gerçekçi görünümü bozuyor. */}
              {!sahneVar && (
              <svg width="130" height="72" className="absolute" style={{ left: -6, top: wallH - 2, overflow: 'visible' }}>
                <line x1="6" y1="0" x2="104" y2="60" stroke="#9aa0a8" strokeWidth="1" strokeDasharray="4 4" />
                <text x="58" y="32" fill={koyuTema() ? "#9aa4b2" : "#6b7280"} fontSize="11" transform="rotate(31 58 32)" textAnchor="middle">
                  {fmtDist(viewDist)}
                </text>
              </svg>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
