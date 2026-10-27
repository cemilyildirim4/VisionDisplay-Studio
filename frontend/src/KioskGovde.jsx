/**
 * KİOSK GÖVDESİ — katalogdaki modelin çizimi.
 *
 * Gövde ekranın ETRAFINA çiziliyor: koordinatlar ekranın kendi
 * genişliğinin ve yüksekliğinin katı (bkz. kioskModelleri.js). Böylece
 * hangi ekran seçilirse seçilsin ekran gövdedeki yerine tam oturuyor ve
 * gövdenin geri kalanı katalogdaki oranda büyüyüp küçülüyor.
 *
 * EKRANIN KENDİSİ BURADA ÇİZİLMİYOR. Ekranı zaten tasarım katmanı
 * çiziyor; burada yalnızca arkasında ve çevresinde kalan gövde var.
 * İkisi aynı kutuyu paylaştığı için ekran gövdenin içine oturuyor.
 *
 * SVG, canvas değil: gövde her ölçekte keskin kalıyor ve PDF'i alan
 * html2canvas de SVG'yi sorunsuz çiziyor.
 */

/* Zemine düşen gölge: gövdenin altında, hafif ve geniş. */
const GOLGE_RENK = 'rgba(8, 12, 20, 0.34)'

/**
 * @param {object} model   kioskModelleri.js kaydı
 * @param {number} ekranW  ekranın piksel genişliği
 * @param {number} ekranH  ekranın piksel yüksekliği
 */
/**
 * Çizimin kapsadığı alan — bütün parçalar ve zemin içeride kalsın.
 * Hem gövde hem karttaki küçük simge aynı sınırı kullanıyor: ikisi
 * ayrışırsa kartta görülen şekil mekândakine benzemez.
 */
export function govdeSinirlari(model) {
  let solE = 0
  let sagE = 1
  let ustE = 0
  let altE = model?.zemin ? 1 + (model.taban || 0) : 1
  for (const q of model?.parcalar || []) {
    if (q.nokta) {
      for (const [nx, ny] of q.nokta) {
        if (nx < solE) solE = nx
        if (nx > sagE) sagE = nx
        if (ny < ustE) ustE = ny
        if (ny > altE) altE = ny
      }
      continue
    }
    if (q.x < solE) solE = q.x
    if (q.x + q.en > sagE) sagE = q.x + q.en
    if (q.y < ustE) ustE = q.y
    if (q.y + q.boy > altE) altE = q.y + q.boy
  }
  /* Gölge için altta biraz daha pay. */
  if (model?.zemin) altE += 0.08
  return { solE, sagE, ustE, altE }
}

export default function KioskGovde({ model, ekranW, ekranH, golge = true }) {
  if (!model || !(ekranW > 0) || !(ekranH > 0)) return null

  const p = model.parcalar || []
  const { solE, sagE, ustE, altE } = govdeSinirlari(model)

  const X = (v) => (v - solE) * ekranW
  const Y = (v) => (v - ustE) * ekranH
  const W = (sagE - solE) * ekranW
  const H = (altE - ustE) * ekranH

  const zeminY = Y(1 + (model.taban || 0))

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{
        position: 'absolute',
        /* Ekranın sol üst köşesi çizimde (solE, ustE) noktasına denk geliyor. */
        left: solE * ekranW,
        top: ustE * ekranH,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {/*
        ZEMİN GÖLGESİ — gövde havada durmasın.
        Duvara monte modelde yok: orada gövde zemine değmiyor.
      */}
      {golge && model.zemin && (
        <ellipse
          cx={X(0.5)}
          cy={zeminY + ekranH * 0.02}
          rx={ekranW * 0.9}
          ry={ekranH * 0.05}
          fill={GOLGE_RENK}
        />
      )}

      {p.map((q, i) => {
        if (q.tur === 'yamuk') {
          return (
            <polygon
              key={i}
              points={q.nokta.map(([nx, ny]) => `${X(nx)},${Y(ny)}`).join(' ')}
              fill={q.renk}
            />
          )
        }
        if (q.tur === 'yay') {
          /* Üstü dışa kavisli kapak: iki ucu alçak, ortası yüksek. */
          const x0 = X(q.x)
          const x1 = X(q.x + q.en)
          const y0 = Y(q.y)
          const y1 = Y(q.y + q.boy)
          return (
            <path
              key={i}
              d={`M${x0},${y1} Q${(x0 + x1) / 2},${y0 - (y1 - y0) * 0.8} ${x1},${y1} Z`}
              fill={q.renk}
            />
          )
        }
        return (
          <rect
            key={i}
            x={X(q.x)}
            y={Y(q.y)}
            width={q.en * ekranW}
            height={q.boy * ekranH}
            rx={(q.kose || 0) * ekranW}
            fill={q.renk}
          />
        )
      })}
    </svg>
  )
}

/**
 * KART KÜÇÜK ÇİZİMİ — model seçme kartındaki simge.
 *
 * Aynı tablodan besleniyor: kartta görülen şekil ile mekânda çizilen
 * gövde ayrışamıyor. Ekran yerine düz bir açık dikdörtgen konuyor.
 */
export function KioskSimge({ model, boy = 54 }) {
  if (!model) return null
  /*
   * Gövdenin TAMAMI karta sığıyor: ekranın ölçüsü sınırlardan geri
   * hesaplanıyor. Sabit bir ekran ölçüsü verilseydi uzun modeller
   * (CK serisi) kartın dışına taşardı.
   */
  const { solE, sagE, ustE, altE } = govdeSinirlari(model)
  /* Kartta ekran her modelde aynı oranda: dikey, kabaca 9:16. */
  const ORAN = 0.56
  const genisBirim = sagE - solE
  const boyBirim = (altE - ustE) / ORAN
  const ekranW = boy / Math.max(genisBirim, boyBirim)
  const ekranH = ekranW / ORAN
  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: boy, height: boy }}
    >
      <span
        className="relative"
        style={{
          width: ekranW,
          height: ekranH,
          /* Gövde ekranın etrafına taştığı için kutu ortalanıyor. */
          transform:
            'translate(' +
            (-(solE + sagE) / 2 + 0.5) * ekranW +
            'px, ' +
            (-(ustE + altE) / 2 + 0.5) * ekranH +
            'px)',
        }}
      >
        <KioskGovde model={model} ekranW={ekranW} ekranH={ekranH} golge={false} />
        {/* Ekranın kendisi: gövdenin üstünde açık bir dikdörtgen. */}
        <span
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg,#dfe6ee,#aeb9c6)' }}
        />
      </span>
    </span>
  )
}
