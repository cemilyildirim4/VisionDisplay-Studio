/**
 * REFERANS ÖLÇÜ — İKİ NOKTA İŞARETLEME.
 *
 * Kullanıcı fotoğrafta gerçek uzunluğunu bildiği bir yerin iki ucunu
 * işaretliyor; ölçek bu iki noktadan çıkıyor (bkz. referansOlcek.js).
 *
 * Noktalar burada TUVAL PİKSELİNDE tutuluyor ve öyle geri veriliyor; normalize
 * fotoğraf koordinatına çevirmek App.jsx'in işi (tuvalOrana). Böylece bu
 * bileşen yakınlaştırmadan ve fotoğrafın tuvale nasıl yerleştiğinden habersiz
 * kalıyor — tek işi işaretlemek.
 *
 * KoseSecici'den ayrı duruyor: o dört köşeli bir dörtgeni düzenliyor ve
 * dörtgenin geçerliliğini denetliyor; burada dörtgen yok, iki nokta var ve
 * denetim başka (noktalar birbirine çok yakın olmamalı).
 */

import { useEffect, useRef, useState } from 'react'

/* Tutamak yarıçapı ve tıklama alanı. */
const R = 9
const VURUS = 18

export default function ReferansSecici({
  noktalar = [],
  onDegis,
  tuvalW,
  tuvalH,
  ipucu,
  enAzPiksel = 0,
  enCokNokta = 2,
}) {
  const katmanRef = useRef(null)
  const surukleRef = useRef(null)
  const [secili, setSecili] = useState(0)

  /*
   * Klavyeyle ince ayar: fareyle bir noktayı tam köşeye oturtmak zor ve
   * referansın hassasiyeti doğrudan ölçeğe geçiyor. Ok tuşları 1 piksel,
   * Shift ile 10 piksel.
   */
  useEffect(() => {
    const tus = (e) => {
      if (!noktalar[secili]) return
      const yon = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
      if (!yon) return
      e.preventDefault()
      const adim = e.shiftKey ? 10 : 1
      onDegis(
        noktalar.map((p, i) =>
          i === secili
            ? {
                x: Math.max(0, Math.min(tuvalW, p.x + yon[0] * adim)),
                y: Math.max(0, Math.min(tuvalH, p.y + yon[1] * adim)),
              }
            : p,
        ),
      )
    }
    window.addEventListener('keydown', tus)
    return () => window.removeEventListener('keydown', tus)
  }, [noktalar, secili, onDegis, tuvalW, tuvalH])

  const yerel = (e) => {
    const r = katmanRef.current?.getBoundingClientRect()
    if (!r) return null
    return {
      x: Math.max(0, Math.min(tuvalW, e.clientX - r.left)),
      y: Math.max(0, Math.min(tuvalH, e.clientY - r.top)),
    }
  }

  /* Boş alana basmak yeni nokta koyuyor; kontenjan dolunca eklemiyor. */
  const katmanaBas = (e) => {
    if (noktalar.length >= enCokNokta) return
    const p = yerel(e)
    if (!p) return
    setSecili(noktalar.length)
    onDegis([...noktalar, p])
  }

  const noktayaBas = (i) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    setSecili(i)
    e.currentTarget.setPointerCapture?.(e.pointerId)
    surukleRef.current = i
  }

  const hareket = (e) => {
    const i = surukleRef.current
    if (i === null || i === undefined) return
    const p = yerel(e)
    if (!p) return
    onDegis(noktalar.map((q, j) => (j === i ? p : q)))
  }

  const birak = () => {
    surukleRef.current = null
  }

  const [a, b] = noktalar
  const cizgiKipi = enCokNokta === 2
  const uzunlukPx = cizgiKipi && a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0
  const kisa = cizgiKipi && !!(a && b) && enAzPiksel > 0 && uzunlukPx < enAzPiksel
  const renk = kisa ? '#d97706' : '#16a34a'
  /*
   * Dört köşe kipinde kapalı bir dörtgen çiziliyor: kullanıcı işaretlediği
   * şeklin dikdörtgen olup olmadığını ancak böyle görüyor.
   */
  const dortgen = !cizgiKipi && noktalar.length === 4 ? noktalar.map((p) => `${p.x},${p.y}`).join(' ') : null

  return (
    <svg
      ref={katmanRef}
      width={tuvalW}
      height={tuvalH}
      className="absolute inset-0 z-30"
      style={{ touchAction: 'none', cursor: noktalar.length < enCokNokta ? 'crosshair' : 'default' }}
      onPointerDown={katmanaBas}
      onPointerMove={hareket}
      onPointerUp={birak}
      onPointerCancel={birak}
    >
      {/* Noktasız alan da tıklanabilir olmalı: saydam dolgu hedef oluyor. */}
      <rect x="0" y="0" width={tuvalW} height={tuvalH} fill="rgba(0,0,0,0.001)" />

      {dortgen && (
        <polygon points={dortgen} fill="rgba(22,163,74,0.10)" stroke={renk} strokeWidth="2.5" strokeDasharray="8 5" />
      )}

      {cizgiKipi && a && b && (
        <>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={renk} strokeWidth="2.5" strokeDasharray="8 5" />
          <g>
            <rect
              x={(a.x + b.x) / 2 - 46}
              y={(a.y + b.y) / 2 - 30}
              width="92"
              height="22"
              rx="6"
              fill={renk}
              opacity="0.92"
            />
            <text
              x={(a.x + b.x) / 2}
              y={(a.y + b.y) / 2 - 14}
              textAnchor="middle"
              fontSize="12.5"
              fontWeight="700"
              fill="#fff"
            >
              {Math.round(uzunlukPx)} px
            </text>
          </g>
        </>
      )}

      {noktalar.map((p, i) => (
        <g key={i}>
          {/* Görünmeyen geniş vuruş alanı: küçük daireyi tutturmak zor. */}
          <circle
            cx={p.x}
            cy={p.y}
            r={VURUS}
            fill="rgba(0,0,0,0.001)"
            onPointerDown={noktayaBas(i)}
            style={{ cursor: 'grab' }}
          />
          <circle
            cx={p.x}
            cy={p.y}
            r={R}
            fill="#fff"
            stroke={renk}
            strokeWidth={i === secili ? 4 : 2.5}
            pointerEvents="none"
          />
          <text
            x={p.x}
            y={p.y + 4}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill={renk}
            pointerEvents="none"
          >
            {i + 1}
          </text>
        </g>
      ))}

      {ipucu && (
        <g pointerEvents="none">
          <rect x={tuvalW / 2 - 190} y="14" width="380" height="30" rx="8" fill="rgba(17,24,39,0.86)" />
          <text x={tuvalW / 2} y="34" textAnchor="middle" fontSize="13" fontWeight="600" fill="#fff">
            {ipucu}
          </text>
        </g>
      )}
    </svg>
  )
}
