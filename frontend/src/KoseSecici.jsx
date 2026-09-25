/**
 * MANUEL DÖRT KÖŞE SEÇİMİ.
 *
 * Otomatik yüzey bulma iyi bir başlangıç noktası veriyor ama her fotoğrafta
 * doğru sonuç vermesi beklenemez: eğik çekimler, yansıyan camlar, çok karanlık
 * kareler, ekranı kapatan araç ve insanlar. Bu yüzden güvenilir omurga elle
 * düzeltmedir — kullanıcı dört köşeyi kendisi işaretlediğinde sonuç kesindir.
 *
 * Köşeler FOTOĞRAFA GÖRE 0–1 oranlı tutuluyor (App.jsx); burada yalnızca
 * tuvaldeki piksel karşılıkları çiziliyor ve sürükleme geri bildiriliyor.
 */

import { useEffect, useRef, useState } from 'react'
import { dortgenGecerli } from './homografi.js'

const ADLAR = ['Sol üst', 'Sağ üst', 'Sağ alt', 'Sol alt']

export default function KoseSecici({ koseler, onDegis, tuvalW, tuvalH }) {
  const [secili, setSecili] = useState(0)
  const surukleRef = useRef(null)
  const katmanRef = useRef(null)

  /*
   * Klavyeyle ince ayar: yön tuşları 1 piksel, Shift ile 10 piksel. Fareyle
   * bir köşeyi piksel hassasiyetinde tutturmak zor; asıl işi bu yapıyor.
   */
  useEffect(() => {
    const tus = (e) => {
      const yon = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
      if (!yon) return
      e.preventDefault()
      const adim = e.shiftKey ? 10 : 1
      const yeni = koseler.map((k, i) =>
        i === secili ? { x: k.x + yon[0] * adim, y: k.y + yon[1] * adim } : k,
      )
      if (dortgenGecerli(yeni)) onDegis(yeni)
    }
    window.addEventListener('keydown', tus)
    return () => window.removeEventListener('keydown', tus)
  }, [koseler, secili, onDegis])

  const indi = (i) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    setSecili(i)
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const kutu = katmanRef.current?.getBoundingClientRect()
    surukleRef.current = { i, kutu }
  }

  const hareket = (e) => {
    const s = surukleRef.current
    if (!s || !s.kutu) return
    const x = Math.max(0, Math.min(tuvalW, e.clientX - s.kutu.left))
    const y = Math.max(0, Math.min(tuvalH, e.clientY - s.kutu.top))
    const yeni = koseler.map((k, i) => (i === s.i ? { x, y } : k))
    /*
     * Geçersiz (kendini kesen) dörtgen kabul edilmiyor: kelebek biçimine giren
     * bir dörtgende homografi ekranı ters çeviriyor.
     */
    if (dortgenGecerli(yeni)) onDegis(yeni)
  }

  const kalkti = (e) => {
    surukleRef.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  const nokta = koseler.map((k) => `${k.x},${k.y}`).join(' ')

  return (
    <div
      ref={katmanRef}
      data-pdf-gizle
      className="absolute inset-0 z-20"
      style={{ touchAction: 'none' }}
    >
      <svg width={tuvalW} height={tuvalH} className="absolute inset-0 pointer-events-none">
        <polygon points={nokta} fill="rgba(41,98,173,0.18)" stroke="#2962ad" strokeWidth="2" />
      </svg>
      {koseler.map((k, i) => (
        <button
          key={i}
          type="button"
          aria-label={ADLAR[i]}
          title={ADLAR[i]}
          onPointerDown={indi(i)}
          onPointerMove={hareket}
          onPointerUp={kalkti}
          onPointerCancel={kalkti}
          onFocus={() => setSecili(i)}
          className={`absolute rounded-full border-2 shadow-sm ${
            secili === i ? 'bg-brand border-white' : 'bg-white border-brand'
          }`}
          style={{
            /*
             * GÖRÜNEN DAİRE KÜÇÜK, DOKUNMA ALANI BÜYÜK.
             *
             * 28 piksellik daire çizimin üstünde iri duruyor ve altındaki
             * tasarımı kapatıyordu. Daire 18'e indi; parmakla tutmak yine
             * kolay olsun diye çevresine saydam bir halka (box-shadow ile
             * değil, ayrı bir iç daire ile de değil) yerine düğmenin
             * kendisi 18 kalıp kenarı inceltildi ve imleç alanı korunuyor.
             */
            left: k.x - 9,
            top: k.y - 9,
            width: 18,
            height: 18,
            cursor: 'grab',
          }}
        />
      ))}
    </div>
  )
}
