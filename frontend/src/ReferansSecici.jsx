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

/*
 * İŞARET KÜÇÜK, VURUŞ ALANI BÜYÜK.
 *
 * İşaret eskiden içine sıra numarası yazılan dolgulu bir daireydi (r=9, yani
 * 22 piksel genişlik): oturtulmak istenen köşe işaretin ALTINDA kalıyor,
 * görünmediği için hassas ayar yapılamıyordu.
 *
 * Şimdi işaret içi boş küçük bir halka: ortasındaki delikten hedef piksel
 * görünüyor, merkezde de 1 pikselik bir nokta var. Tıklama/sürükleme alanı
 * ayrı ve hâlâ geniş (VURUS) — küçük işaret fareyle tutmayı zorlaştırmıyor.
 */
const R = 4.5
const R_SECILI = 6
const VURUS = 18

export default function ReferansSecici({
  noktalar = [],
  onDegis,
  tuvalW,
  tuvalH,
  enAzPiksel = 0,
  enCokNokta = 2,
  gorselCarpani = 1,
  sinir = null,
}) {
  /*
   * HER ŞEY FOTOĞRAFIN İÇİNDE KALIYOR.
   *
   * Tuval fotoğraftan büyük: kenarlarda boş şerit var. Noktalar tuvalin
   * tamamına kıstırılıyordu, dolayısıyla o boş şeride — fotoğrafın DIŞINA —
   * bırakılabiliyordu. Fotoğrafın dışında kalan bir nokta hiçbir şeyi
   * göstermiyor ama ölçeğe giriyor: işaretlenmemiş bir yerin uzunluğu
   * ölçülmüş oluyordu.
   *
   * Sınır App'ten geliyor (fotoğrafın tuvaldeki dikdörtgeni). Yoksa eski
   * davranış: tuvalin kendisi.
   */
  const S = {
    sol: sinir?.sol ?? 0,
    ust: sinir?.ust ?? 0,
    sag: sinir?.sag ?? tuvalW,
    alt: sinir?.alt ?? tuvalH,
  }
  const kis = (p) => ({
    x: Math.max(S.sol, Math.min(S.sag, p.x)),
    y: Math.max(S.ust, Math.min(S.alt, p.y)),
  })
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
          i === secili ? kis({ x: p.x + yon[0] * adim, y: p.y + yon[1] * adim }) : p,
        ),
      )
    }
    window.addEventListener('keydown', tus)
    return () => window.removeEventListener('keydown', tus)
  }, [noktalar, secili, onDegis, tuvalW, tuvalH])

  const yerel = (e) => {
    const r = katmanRef.current?.getBoundingClientRect()
    if (!r) return null
    return kis({ x: e.clientX - r.left, y: e.clientY - r.top })
  }

  /* Boş alana basmak yeni nokta koyuyor; kontenjan dolunca eklemiyor. */
  const katmanaBas = (e) => {
    if (noktalar.length >= enCokNokta) return
    const p = yerel(e)
    if (!p) return
    setSecili(noktalar.length)
    onDegis([...noktalar, p])
  }

  /*
   * İŞARET FAREYE SIÇRAMIYOR.
   *
   * Sürükleme işareti doğrudan farenin bulunduğu noktaya koyuyordu; vuruş
   * alanı işaretten geniş olduğu için (VURUS 18, halka 4,5) tutamağın
   * kenarından tutmak işareti 18 piksele kadar atlatabiliyordu. Referansın
   * hassasiyeti doğrudan ölçeğe geçtiği için bu kabul edilemez. Artık
   * yalnızca farenin gittiği kadar gidiyor.
   */
  const noktayaBas = (i) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    setSecili(i)
    e.currentTarget.setPointerCapture?.(e.pointerId)
    surukleRef.current = { i, fareX: e.clientX, fareY: e.clientY, bas: noktalar[i] }
  }

  const hareket = (e) => {
    const s = surukleRef.current
    if (!s || !s.bas) return
    const p = kis({ x: s.bas.x + (e.clientX - s.fareX), y: s.bas.y + (e.clientY - s.fareY) })
    onDegis(noktalar.map((q, j) => (j === s.i ? p : q)))
  }

  const birak = () => {
    surukleRef.current = null
  }

  const [a, b] = noktalar
  const cizgiKipi = enCokNokta === 2
  const uzunlukPx = cizgiKipi && a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0
  /*
   * ROZETTE YAZAN SAYI ORİJİNAL GÖRSEL PİKSELİ.
   *
   * Noktalar tuval pikselinde tutuluyor ve rozet de bir ara o mesafeyi
   * yazıyordu. Ama ölçek tuval pikselinden HESAPLANMIYOR: fotoğrafın kendi
   * çözünürlüğündeki mesafeden hesaplanıyor (bkz. ikiNoktaPikselMesafesi).
   * İkisi aynı sayı değil — tuval, fotoğrafı küçülterek gösteriyor — ve
   * tuvaldeki sayı pencere boyutuyla da değişiyordu. Yani ekranda, hesaba
   * HİÇ girmeyen bir rakam duruyordu.
   *
   * Çarpan, bir tuval pikselinin kaç görsel pikseli ettiği; App'ten geliyor
   * çünkü fotoğrafın tuvale nasıl oturduğunu bu bileşen bilmiyor.
   */
  const gorselUzunlukPx = uzunlukPx * (gorselCarpani > 0 ? gorselCarpani : 1)
  const kisa = cizgiKipi && !!(a && b) && enAzPiksel > 0 && gorselUzunlukPx < enAzPiksel
  const renk = kisa ? '#d97706' : '#16a34a'
  /*
   * Dört köşe kipinde kapalı bir dörtgen çiziliyor: kullanıcı işaretlediği
   * şeklin dikdörtgen olup olmadığını ancak böyle görüyor.
   */
  const dortgen = !cizgiKipi && noktalar.length === 4 ? noktalar.map((p) => `${p.x},${p.y}`).join(' ') : null

  /*
   * ROZETİN YERİ. Varsayılan yer çizginin ortasının üstü. Fotoğrafın
   * tepesine yakınsa yukarıda yer yok: çizginin altına geçiyor. Yatayda da
   * kendi genişliği kadar içeri çekiliyor — kenara yakın bir referansta
   * rozet fotoğrafın dışına sarkıyordu.
   */
  const rozet = (() => {
    if (!cizgiKipi || !a || !b) return { x: 0, y: 0 }
    const ox = (a.x + b.x) / 2
    const oy = (a.y + b.y) / 2
    const ust = oy - 30 >= S.ust ? oy - 30 : Math.min(oy + 10, S.alt - 24)
    return {
      x: Math.max(S.sol + 48, Math.min(S.sag - 48, ox)),
      y: Math.max(S.ust + 2, ust),
    }
  })()

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
              x={rozet.x - 46}
              y={rozet.y}
              width="92"
              height="22"
              rx="6"
              fill={renk}
              opacity="0.92"
            />
            <text
              x={rozet.x}
              y={rozet.y + 16}
              textAnchor="middle"
              fontSize="12.5"
              fontWeight="700"
              fill="#fff"
            >
              {Math.round(gorselUzunlukPx)} px
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
          {/*
            Beyaz dış hat: işaret hem açık hem koyu zeminde görünür kalıyor.
            İç halka boş — altındaki piksel okunuyor.
          */}
          <circle
            cx={p.x}
            cy={p.y}
            r={i === secili ? R_SECILI : R}
            fill="none"
            stroke="#fff"
            strokeWidth={i === secili ? 3.5 : 3}
            opacity="0.9"
            pointerEvents="none"
          />
          <circle
            cx={p.x}
            cy={p.y}
            r={i === secili ? R_SECILI : R}
            fill="none"
            stroke={renk}
            strokeWidth={i === secili ? 2 : 1.4}
            pointerEvents="none"
          />
          {/* Tam konum: halkanın ortasındaki tek nokta. */}
          <circle cx={p.x} cy={p.y} r="1.1" fill={renk} pointerEvents="none" />
          {/*
            Sıra numarası işaretin İÇİNDE değil YANINDA: içine yazmak işareti
            okunacak kadar büyütmeyi zorunlu kılıyordu.
          */}
          <text
            x={p.x + R_SECILI + 4 > S.sag - 10 ? p.x - R_SECILI - 4 : p.x + R_SECILI + 4}
            textAnchor={p.x + R_SECILI + 4 > S.sag - 10 ? 'end' : 'start'}
            y={p.y - R_SECILI - 2 < S.ust + 10 ? p.y + R_SECILI + 11 : p.y - R_SECILI - 2}
            fontSize="11"
            fontWeight="700"
            fill={renk}
            stroke="#fff"
            strokeWidth="2.5"
            paintOrder="stroke"
            pointerEvents="none"
          >
            {i + 1}
          </text>
        </g>
      ))}

    </svg>
  )
}
