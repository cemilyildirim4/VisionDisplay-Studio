// Varsayılan içerik görseli — public/default-content.jpg (kullanıcı bu dosyayı ekler)
export const DEFAULT_CONTENT_SRC = '/default-content.jpg'

/*
 * KAVİS DERİNLİĞİ
 *
 * Dikey taşma payı = (kavis miktarı 0–1) × ekran genişliği × buradaki oran.
 * Hem çizim (CurvedScreen) hem ölçekleme (WallPreview) AYNI değeri kullanmalı,
 * yoksa kavis panelin dışına taşar ya da kırpılır.
 *
 * İki tip için ayrı oran var, çünkü aynı derinlikte çizildiklerinde eşit
 * belirginlikte görünmüyorlar:
 *   • İçe kavisde orta kısalır, kenarlar öne çıkar — göz bunu kolay yakalar.
 *   • Dışa kavisde orta uzar — aynı miktar daha az fark edilir.
 * Bu yüzden dışa kavis biraz daha derin. Fiziksel bir iddia değil, görsel denge.
 *
 * Kavisi az/çok bulursanız değiştireceğiniz yer burasıdır.
 */
export const CONCAVE_DEPTH_RATIO = 0.13 // içe kavisli (konkav)
export const CONVEX_DEPTH_RATIO = 0.16 // dışa kavisli (konveks)

/** Ekran tipine göre kavis derinliği oranı. */
export const curveDepthFor = (concave) => (concave ? CONCAVE_DEPTH_RATIO : CONVEX_DEPTH_RATIO)

/**
 * Kavis yüzdesinin karşılığı olan TOPLAM YAY AÇISI (derece).
 *
 * Yüzde doğrudan açı değildir: önce derinliğe (sagitta) çevrilir, açı ondan
 * türer. Genişlik sadeleştiği için sonuç ekran boyutundan bağımsızdır —
 * 3 kabinlik ve 12 kabinlik duvar aynı yüzdede aynı açıyı verir.
 *
 *   d = (%/100) × W × oran      R = W²/(8d) + d/2      açı = 2·asin(W/2R)
 *
 * Bu, Scene3D'deki `yayOlculeri` ile AYNI formül; burada yalnızca kullanıcıya
 * gösterilecek sayıyı üretiyor (W = 1 alınmış hâli).
 */
export function curveArcDegrees(curveAmount, concave) {
  const p = Math.max(0, Math.min(100, curveAmount)) / 100
  const d = p * curveDepthFor(concave)
  if (d <= 0) return 0
  const R = 1 / (8 * d) + d / 2
  return Math.round((2 * Math.asin(Math.min(1, 1 / (2 * R))) * 180) / Math.PI)
}

/**
 * LED panel görünümü — kapalı (görüntüsüz) gerçek panel gibi.
 * Neredeyse siyah yüzey; hafif degrade yalnızca panelin ışığa göre parlamasını taklit eder.
 */
export const LED_GRADIENT =
  'linear-gradient(160deg, #1a1a1e 0%, #101013 45%, #17171b 75%, #0d0d10 100%)'

/** LED nokta dokusunun varsayılan hücre boyutu (px) — küçük önizlemeler için. */
export const LED_DOT_SIZE = 5

/**
 * TEK KABİNDEKİ diyot sayısı (temsili).
 * Gerçek bir 320 × 160 mm kabinde binlerce diyot var; ekranda o yoğunluk
 * ayırt edilemeyeceği için desen bu sayıda temsil ediliyor. Önemli olan
 * diyotların KABİNE ait olması: kabin eklendikçe aynı desen tekrarlanır.
 */
export const LEDS_PER_CABINET_X = 16
export const LEDS_PER_CABINET_Y = 8

/** Bir diyot hücresi bundan küçükse desen çizilmez (nokta nokta seçilemez, kir gibi durur). */
export const MIN_DOT_PX = 3

/**
 * Panel yüzeyindeki LED diyotları.
 * Siyah zeminde açık noktalar (diyot mercekleri), aralarında koyu boşluk.
 * Fotoğraf/video içerikte de aynı doku biner — gerçek panelde de öyle görünür.
 */
export const ledDotsStyle = (dotW = LED_DOT_SIZE, dotH = dotW) => {
  const r = Math.max(0.4, Math.min(dotW, dotH) * 0.15)
  return {
    backgroundImage: `radial-gradient(circle, rgba(185,192,205,0.13) ${r}px, rgba(0,0,0,0.22) ${r * 1.35}px)`,
    backgroundSize: `${dotW}px ${dotH}px`,
  }
}

/**
 * Bir kabinin piksel ölçüsünden tek diyot hücresinin en/boyunu verir.
 * Canvas ile çizen bileşenler bunu kullanır. Diyotlar ayırt edilemeyecek
 * kadar sıklaşırsa null döner.
 */
export function ledDotSize(cellW, cellH) {
  const dotW = cellW / LEDS_PER_CABINET_X
  const dotH = cellH / LEDS_PER_CABINET_Y
  if (!Number.isFinite(dotW) || !Number.isFinite(dotH)) return null
  if (Math.min(dotW, dotH) < MIN_DOT_PX) return null
  return { dotW, dotH }
}

/**
 * Görüntü YAYINDAYKEN panele uygulanan "ışık saçan ekran" etkisi.
 * LED ekran kendi ışığını üretir: renkler daha doygun, parlaklık daha yüksek
 * görünür. Diyot aralarındaki koyu boşluk görüntüyü söndürdüğü için burada
 * bir miktar telafi de yapılır — aksi halde fotoğraf soluk kalıyor.
 */
export const LED_LIT_FILTER = 'saturate(1.3) brightness(1.18) contrast(1.06)'

/**
 * Panel yüzeyindeki cam parlaması — üstten gelen ışığın yansıması.
 * Çok hafif; ekranın camlı bir yüzeyi olduğunu sezdirir.
 */
export const LED_SHEEN =
  'linear-gradient(168deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 18%, rgba(255,255,255,0) 42%)'

/**
 * Kabin birleşim çizgileri.
 * Her hücreye ayrı kenarlık çizmek yerine tek katmanda gradyanla çizilir:
 * komşu kenarlıklar üst üste binip kalınlaşmaz, çizgi hep saç teli inceliğinde kalır.
 * Renk çok soluk — panel tek parça görünsün, birleşim sadece sezilsin.
 */
export const cabinetGridStyle = (cellW, cellH, color = 'rgba(255,255,255,0.13)') => ({
  backgroundImage: `linear-gradient(to right, ${color} 1px, transparent 1px), linear-gradient(to bottom, ${color} 1px, transparent 1px)`,
  backgroundSize: `${cellW}px ${cellH}px`,
})

/**
 * VİDEO DUVARI çerçeve payı (bezel).
 *
 * Video duvarında paneller arasında fiziksel bir çerçeve vardır; görüntü bu
 * çizgilerle bölünür. LED duvarı video duvarından ayıran en belirgin fark budur.
 *
 * ÖLÇEK NOTU: Gerçek ölçekte 1,74 mm'lik bir çerçeve ekranda ~0,3 piksel eder,
 * yani hiç görünmez. Bu yüzden — haritalardaki yol çizgileri gibi — görünürlük
 * için abartılır. Oran korunur: 1,74 mm'lik çerçeve, 0,88 mm'likten belirgin
 * şekilde kalın çizilir, böylece modeller kıyaslanabilir.
 */
export const BEZEL_EXAGGERATION = 10
export const BEZEL_COLOR = '#0b0b0d'

/** Panel ölçüsünden çerçeve payının piksel karşılığını verir (abartılı, 1–6 px arası). */
export function bezelPxFor(bezelMm, cellW, panelWidthMm) {
  if (!bezelMm || !panelWidthMm || !Number.isFinite(cellW)) return null
  const pxPerMm = cellW / panelWidthMm
  return Math.min(6, Math.max(1, bezelMm * pxPerMm * BEZEL_EXAGGERATION))
}

/** Paneller arasındaki koyu çerçeve boşluğu (kabin ızgarasının video duvarı karşılığı). */
export const bezelGapStyle = (cellW, cellH, gapPx, color = BEZEL_COLOR) => ({
  backgroundImage: `linear-gradient(to right, ${color} ${gapPx}px, transparent ${gapPx}px), linear-gradient(to bottom, ${color} ${gapPx}px, transparent ${gapPx}px)`,
  backgroundSize: `${cellW}px ${cellH}px`,
})

/**
 * İç L tipi ekranda dikişe doğru kanadın içeri girme oranı (%).
 * Hem ekranın kırpımı (WallPreview) hem mekândaki kasa (Salon/Cephe) bu
 * değeri kullanır; ikisi ayrışırsa çerçeve ekranı tutmaz.
 */
export const L_KIRILMA_PCT = 10
