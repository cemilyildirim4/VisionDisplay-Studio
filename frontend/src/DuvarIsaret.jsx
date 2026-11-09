/**
 * İŞARETLENEN DUVARLAR — RENKLİ DÖRTGENLER, SÜRÜKLENEBİLİR KÖŞELER.
 *
 * Fotoğraflı mekânda çoklu ekran yerleşiminin ana yolu artık duvarları
 * işaretlemek: kullanıcı fotoğraftaki her duvarın dört köşesine tıklıyor,
 * tasarım o duvarların perspektifine kendiliğinden oturuyor (bkz. App.jsx →
 * duvarlaraYerlestir). Bu bileşen yalnızca İŞARETİ çiziyor.
 *
 * Her duvar kendi renginde: iki duvarın hangisinin hangisi olduğu tek
 * bakışta görünüyor, ortak kenarları da (bina köşesi) iki rengin buluştuğu
 * yer oluyor.
 *
 * Köşeler konulduktan sonra sürüklenerek düzeltilebiliyor; sürükleme
 * sırasında tasarım anında yeni perspektife geçiyor, yani kullanıcı
 * duvarı nereye oturttuğunu onaydan önce görüyor.
 *
 * Köşe fareye SIÇRAMIYOR: basıldığı andaki fare ile köşe arasındaki fark
 * uygulanıyor (aynı tuzak için bkz. KoseSecici).
 */
import { useRef } from 'react'

export default function DuvarIsaret({
  duvarlar = [],
  renkler = [],
  tuvalW = 0,
  tuvalH = 0,
  onDegis,
  /* Köşeler fotoğrafın dışına çıkamıyor: {sol, ust, sag, alt}. */
  sinir = null,
  /*
   * TUTAMAKLAR YENİ KÖŞE KONURKEN TIKLAMAYI YUTMUYOR.
   *
   * İkinci duvarın ilk köşesi tam olarak birincinin son köşesinde (bina
   * köşesinde) oluyor; oradaki tutamak tıklamayı kendine alınca o köşe
   * hiç konamıyordu. İşaretleme sürerken tutamaklar yalnızca çizim.
   */
  surukleAcik = true,
}) {
  const surukleRef = useRef(null)
  const S = {
    sol: sinir?.sol ?? 0,
    ust: sinir?.ust ?? 0,
    sag: sinir?.sag ?? tuvalW,
    alt: sinir?.alt ?? tuvalH,
  }
  const kis = (v, a, b) => Math.max(a, Math.min(b, v))

  const bas = (di, ki, nokta) => (e) => {
    e.stopPropagation()
    e.preventDefault()
    surukleRef.current = { di, ki, fx: e.clientX, fy: e.clientY, px: nokta.x, py: nokta.y }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const devam = (e) => {
    const s = surukleRef.current
    if (!s || !onDegis) return
    onDegis(s.di, s.ki, {
      x: kis(s.px + (e.clientX - s.fx), S.sol, S.sag),
      y: kis(s.py + (e.clientY - s.fy), S.ust, S.alt),
    })
  }
  const bitir = () => {
    surukleRef.current = null
  }

  return (
    <svg
      className="absolute inset-0"
      width={tuvalW}
      height={tuvalH}
      style={{ pointerEvents: 'none', overflow: 'visible' }}
    >
      {duvarlar.map((d, di) => {
        if (!Array.isArray(d) || d.length === 0) return null
        const renk = renkler[di % renkler.length] || '#2962ad'
        const yol = d.map((p) => `${p.x},${p.y}`).join(' ')
        return (
          <g key={di}>
            {d.length >= 3 && (
              <polygon
                points={yol}
                fill={renk}
                fillOpacity="0.14"
                stroke={renk}
                strokeWidth="2"
                strokeDasharray={d.length === 4 ? undefined : '6 5'}
              />
            )}
            {d.length === 2 && (
              <line x1={d[0].x} y1={d[0].y} x2={d[1].x} y2={d[1].y} stroke={renk} strokeWidth="2" strokeDasharray="6 5" />
            )}
            {/* Duvar numarası: panelle aynı sırayı tuvalde de gösteriyor. */}
            {d.length === 4 && (
              <text
                x={d.reduce((t, p) => t + p.x, 0) / 4}
                y={d.reduce((t, p) => t + p.y, 0) / 4}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="15"
                fontWeight="700"
                fill={renk}
                style={{ paintOrder: 'stroke', stroke: 'rgba(255,255,255,0.85)', strokeWidth: 4 }}
              >
                {di + 1}
              </text>
            )}
            {d.map((p, ki) => (
              <circle
                key={ki}
                cx={p.x}
                cy={p.y}
                r="9"
                fill="#ffffff"
                stroke={renk}
                strokeWidth="3"
                style={{
                  pointerEvents: surukleAcik ? 'auto' : 'none',
                  cursor: 'grab',
                  touchAction: 'none',
                }}
                onPointerDown={surukleAcik ? bas(di, ki, p) : undefined}
                onPointerMove={surukleAcik ? devam : undefined}
                onPointerUp={surukleAcik ? bitir : undefined}
                onPointerCancel={surukleAcik ? bitir : undefined}
              />
            ))}
          </g>
        )
      })}
    </svg>
  )
}
