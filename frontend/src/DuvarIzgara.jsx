/**
 * DUVAR IZGARASI — kalibrasyonun gözle denetlenmesi.
 *
 * Ölçü sistemi doğru çalışıyor mu, bunu sayılara bakarak anlamak zor. Izgara
 * duvarın GERÇEK koordinat sisteminden üretiliyor: çizgiler her tam metrede,
 * fotoğraftaki yerleri de duvarın kendi perspektifinden geçirilerek.
 *
 * Yani 4 metrelik bir duvarda 0–1–2–3–4 işaretleri eşit aralıklı görünmek
 * ZORUNDA DEĞİL: duvar yana dönükse uzak taraftaki aralıklar daralır. Doğru
 * olan budur; aralıkların fotoğrafta eşit çıkması kalibrasyonun değil,
 * duvarın karşıdan çekildiğinin işaretidir.
 *
 * Homografi doğruları doğruya eşlediği için her çizgi iki uçtan çiziliyor;
 * ara nokta örneklemeye gerek yok.
 */

const CIZGI = 'rgba(41,98,173,0.55)'
const ANA_CIZGI = 'rgba(41,98,173,0.9)'

export default function DuvarIzgara({ dunya, tuvalW, tuvalH }) {
  if (!dunya || !(tuvalW > 0) || !(tuvalH > 0)) return null
  const { enM, boyM } = dunya

  /*
   * Aralık duvarın büyüklüğüne göre: 1 metrelik ızgara 40 metrelik bir video
   * duvarında okunamaz hâle geliyor, 0,4 metrelik bir vitrinde ise hiç çizgi
   * çıkmıyor.
   */
  const adim = enM > 24 ? 5 : enM > 10 ? 2 : enM > 2 ? 1 : enM > 0.8 ? 0.25 : 0.1
  const yaz = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')).replace('.', ',')

  /*
   * SON KENAR HER ZAMAN ÇİZİLİYOR.
   *
   * Yalnızca tam adımlarda çizgi koymak, duvarın ölçüsü adımın katı değilse
   * son kenarı atlıyordu: 1,92 metrelik duvarda en son çizgi 1,75'te kalıyor
   * ve ızgaraya bakarak ölçü alan herkes duvarı olduğundan dar sanıyordu.
   * Kenarlar ayrıca ekleniyor, çok yakın düşen ara çizgi atılıyor.
   */
  const degerler = (uzunluk) => {
    const liste = []
    for (let v = 0; v <= uzunluk - adim * 0.35; v += adim) liste.push(v)
    liste.push(uzunluk)
    return liste
  }

  const dikey = degerler(enM)
    .map((x) => ({ x, a: dunya.ileri(x, 0), b: dunya.ileri(x, boyM) }))
    .filter((c) => c.a && c.b)
  const yatay = degerler(boyM)
    .map((y) => ({ y, a: dunya.ileri(0, y), b: dunya.ileri(enM, y) }))
    .filter((c) => c.a && c.b)

  return (
    <svg
      data-pdf-gizle
      width={tuvalW}
      height={tuvalH}
      className="absolute inset-0 z-[12] pointer-events-none"
    >
      {dikey.map((c, i) => (
        <line
          key={`d${i}`}
          x1={c.a.x}
          y1={c.a.y}
          x2={c.b.x}
          y2={c.b.y}
          stroke={i === 0 || i === dikey.length - 1 ? ANA_CIZGI : CIZGI}
          strokeWidth={i === 0 || i === dikey.length - 1 ? 1.6 : 0.8}
          strokeDasharray={i === 0 || i === dikey.length - 1 ? undefined : '4 5'}
        />
      ))}
      {yatay.map((c, i) => (
        <line
          key={`y${i}`}
          x1={c.a.x}
          y1={c.a.y}
          x2={c.b.x}
          y2={c.b.y}
          stroke={i === 0 || i === yatay.length - 1 ? ANA_CIZGI : CIZGI}
          strokeWidth={i === 0 || i === yatay.length - 1 ? 1.6 : 0.8}
          strokeDasharray={i === 0 || i === yatay.length - 1 ? undefined : '4 5'}
        />
      ))}
      {/* Alt kenarda metre işaretleri — ölçünün okunabildiği tek yer. */}
      {dikey.map((c, i) => (
        <text
          key={`e${i}`}
          x={c.b.x}
          y={c.b.y + 13}
          textAnchor="middle"
          fontSize="10.5"
          fontWeight="600"
          fill="#2962ad"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="2.5"
          paintOrder="stroke"
        >
          {yaz(c.x)} m
        </text>
      ))}
    </svg>
  )
}
