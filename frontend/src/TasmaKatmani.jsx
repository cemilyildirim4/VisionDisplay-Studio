/**
 * TAŞMA KATMANI — tasarımın duvarın dışında kalan kısmı.
 *
 * Ölçülen alandan büyük bir tasarım, fotoğrafta gerçek ölçüsünde çiziliyor:
 * duvarı aşıyor ve önizleme penceresinden de taşıp kenarlardan kırpılıyor.
 * Çizim doğru — o ekran o duvara gerçekten sığmıyor — ama ekranda bunu
 * söyleyen bir şey yoktu. Kırpılmış bir kare geniş bir bant gibi göründüğü
 * için kullanıcı tasarımın ORANININ bozulduğunu sanıyordu (ölçüldü: oran
 * bozulmuyor, kare tasarım 204 × 204 piksel çiziliyor).
 *
 * Burada tasarım küçültülmüyor ya da kırpılmıyor; yalnızca duvarın DIŞINDA
 * kalan bölgesi taranarak işaretleniyor. Böylece hem ekranın gerçek ölçüsü
 * korunuyor hem de neyin sığmadığı tek bakışta görünüyor.
 *
 * NASIL: taşan bölge iki dörtgenin farkı. İki dışbükey dörtgenin farkını
 * poligon olarak hesaplamak gereksiz yere zor; SVG maskesi aynı işi
 * kesinlikle yapıyor — maskede tasarım beyaz (görünür), duvar siyah (gizli),
 * geriye yalnızca dışarıda kalan kısım kalıyor.
 */

/* Taşma yoksa katman hiç çizilmiyor; bu kadar piksellik taşma gürültüdür. */
const EN_AZ_TASMA_PX = 2

/** Nokta dışbükey dörtgenin içinde mi (köşeler sıralı). */
function icindeMi(p, q) {
  let arti = 0
  let eksi = 0
  for (let i = 0; i < 4; i++) {
    const a = q[i]
    const b = q[(i + 1) % 4]
    const z = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)
    if (z > EN_AZ_TASMA_PX) arti++
    else if (z < -EN_AZ_TASMA_PX) eksi++
  }
  return arti === 0 || eksi === 0
}

export default function TasmaKatmani({ tasarim, duvar, tuvalW, tuvalH }) {
  const gecerli = (k) =>
    Array.isArray(k) && k.length === 4 && k.every((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y))
  if (!gecerli(tasarim) || !gecerli(duvar)) return null
  /* Tasarımın dört köşesi de duvarın içindeyse taşma yok. */
  if (tasarim.every((p) => icindeMi(p, duvar))) return null

  const nokta = (k) => k.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <svg
      width={tuvalW}
      height={tuvalH}
      className="absolute inset-0"
      style={{ pointerEvents: 'none', zIndex: 6 }}
      data-pdf-gizle="hayir"
    >
      <defs>
        {/*
          Tarama deseni: eğik çizgiler. Dolgu yarı saydam, altındaki tasarım
          okunur kalıyor — amaç saklamak değil, sınırı göstermek.
        */}
        <pattern id="tasmaTarama" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="rgba(220,38,38,0.14)" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(220,38,38,0.55)" strokeWidth="2" />
        </pattern>
        {/* Maske: tasarım görünür, duvarın içi gizli → kalan taşan bölge. */}
        <mask id="tasmaMaske">
          <polygon points={nokta(tasarim)} fill="#fff" />
          <polygon points={nokta(duvar)} fill="#000" />
        </mask>
      </defs>
      <polygon points={nokta(tasarim)} fill="url(#tasmaTarama)" mask="url(#tasmaMaske)" />
      {/*
        Duvarın kendi sınırı da çiziliyor: taranan alanın NEREDE bittiğini
        gösteren çizgi bu. Ölçü kutusu kapalıyken de görünür olmalı, çünkü
        taşma uyarısı o kutudan bağımsız.
      */}
      <polygon
        points={nokta(duvar)}
        fill="none"
        stroke="rgba(220,38,38,0.85)"
        strokeWidth="2"
        strokeDasharray="6 4"
      />
    </svg>
  )
}
