/**
 * YERLEŞTİRME TUTAMAKLARI.
 *
 * Tasarımın fotoğraftaki yeri ve kanatların açısı buradan ayarlanıyor:
 *
 *   • ORTADAKİ tutamak taşıyor. Birleşik grup tek parça gidiyor, çünkü
 *     bütün kanatlar aynı zincirden türüyor.
 *   • KANAT UÇLARINDAKİ tutamaklar o kanadı köşe etrafında çeviriyor;
 *     kanat duvara yatıyor.
 *
 * Boyut tutamağı YOK: ölçü referanstan geliyor ve kilitli. Kullanıcının
 * tasarımı büyütüp küçültmesi, fotoğraftaki gerçek ölçüyü yalan hâline
 * getirirdi.
 *
 * Bu katman yalnızca FARENİN nerede olduğunu bildiriyor; açının ne
 * olacağına App karar veriyor (kamera ve zincir orada).
 */
import { useRef } from 'react'

const ORTA_R = 15
const UC_R = 11

export default function YerlesimTutamaklari({
  orta = null,
  uclar = [],
  tuvalW,
  tuvalH,
  onTasi,
  onKanat,
  ipucu = '',
}) {
  const katmanRef = useRef(null)
  const surukle = useRef(null)

  if (!(tuvalW > 0) || !(tuvalH > 0)) return null
  if (!orta && !uclar.length) return null

  /* Fare konumunu tuval pikseline çeviriyor. */
  const yerel = (e) => {
    const r = katmanRef.current?.getBoundingClientRect()
    if (!r) return null
    return { x: e.clientX - r.x, y: e.clientY - r.y }
  }

  const bas = (tur, i) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    surukle.current = { tur, i, x: e.clientX, y: e.clientY }
  }

  const hareket = (e) => {
    const s = surukle.current
    if (!s) return
    if (s.tur === 'orta') {
      /* Taşımada FARK veriliyor: birikme olmasın diye her adımda sıfırlanıyor. */
      onTasi?.(e.clientX - s.x, e.clientY - s.y)
      surukle.current = { ...s, x: e.clientX, y: e.clientY }
      return
    }
    const p = yerel(e)
    if (p) onKanat?.(s.i, p)
  }

  const birak = (e) => {
    surukle.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  const tutamak = (nokta, r, tur, i, baslik) => (
    <g key={tur + i}>
      <circle
        cx={nokta.x}
        cy={nokta.y}
        r={r}
        fill="#2962ad"
        stroke="#ffffff"
        strokeWidth="2.5"
        style={{ cursor: tur === 'orta' ? 'move' : 'ew-resize', pointerEvents: 'auto' }}
        onPointerDown={bas(tur, i)}
        onPointerMove={hareket}
        onPointerUp={birak}
        onPointerCancel={birak}
      >
        <title>{baslik}</title>
      </circle>
      {tur === 'orta' ? (
        /* Taşıma imi: dört yöne ok. */
        <path
          d={`M${nokta.x - 7},${nokta.y} h14 M${nokta.x},${nokta.y - 7} v14`}
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          pointerEvents="none"
        />
      ) : (
        <path
          d={`M${nokta.x - 4},${nokta.y - 4} a6 6 0 1 1 0 8`}
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          pointerEvents="none"
        />
      )}
    </g>
  )

  return (
    <>
      <svg
        ref={katmanRef}
        width={tuvalW}
        height={tuvalH}
        viewBox={`0 0 ${tuvalW} ${tuvalH}`}
        style={{ position: 'absolute', inset: 0, zIndex: 19, pointerEvents: 'none' }}
      >
        {uclar.map((u, k) => tutamak(u.nokta, UC_R, 'uc', u.i, 'Kanadı çevir'))}
        {orta && tutamak(orta, ORTA_R, 'orta', -1, 'Taşı')}
      </svg>
      {ipucu && (
        <div
          style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}
          className="pointer-events-none max-w-[90%] rounded-xl bg-[#001334]/85 px-4 py-2 text-center text-[13.5px] font-medium leading-snug text-white shadow-lg"
        >
          {ipucu}
        </div>
      )}
    </>
  )
}
