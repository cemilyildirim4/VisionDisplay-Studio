/**
 * TASLAK KUTU — fotoğraftaki duvarı kullanıcının kendi tanıtması.
 *
 * Eski akışta sistem fotoğrafı çözümleyip "uygun yerler" öneriyordu; her
 * fotoğrafta tutmadı. Yeni akışta bilen taraf kullanıcı: duvarın gerçek
 * ölçüsünü ve çekim mesafesini yazıyor, ekranda o ölçüde bir kutu beliriyor,
 * kutuyu fotoğraftaki duvarın üstüne getiriyor. Böylece duvarın NEREDE ve NE
 * KADAR olduğu ölçümle biliniyor, tahminle değil.
 *
 * Kutunun kendisi ekran değil, DUVAR. Kullanıcı kutuya tıkladığında tasarım
 * kendi gerçek ölçüsüyle onun içine yerleşiyor.
 *
 * Köşe tutamakları buradaki dörtgeni doğrudan değiştiriyor; ölçü kilidi yok,
 * çünkü burada ayarlanan şey ekranın boyu değil, duvarın fotoğraftaki yeri.
 */

export default function TaslakKutu({ koseler, tuvalW, tuvalH, onSec, onKose, etiket, soluk = false }) {
  if (!Array.isArray(koseler) || koseler.length !== 4) return null

  const nokta = koseler.map((k) => `${k.x},${k.y}`).join(' ')
  const mx = koseler.reduce((t, k) => t + k.x, 0) / 4
  const my = koseler.reduce((t, k) => t + k.y, 0) / 4

  /* Bir köşeyi sürükle: fare hareketi doğrudan o köşeye gidiyor. */
  const koseSurukle = (i) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    const hedef = e.currentTarget
    hedef.setPointerCapture?.(e.pointerId)
    const kutu = hedef.ownerSVGElement.getBoundingClientRect()
    const tasi = (ev) => {
      const yeni = koseler.map((k, j) =>
        j === i ? { x: ev.clientX - kutu.left, y: ev.clientY - kutu.top } : k,
      )
      onKose?.(yeni)
    }
    const bitir = () => {
      window.removeEventListener('pointermove', tasi)
      window.removeEventListener('pointerup', bitir)
    }
    window.addEventListener('pointermove', tasi)
    window.addEventListener('pointerup', bitir)
  }

  /* Kutunun tamamını taşı: içeriden tutup sürükleme. */
  const govdeSurukle = (e) => {
    if (e.button != null && e.button !== 0) return
    e.preventDefault()
    const kutu = e.currentTarget.ownerSVGElement.getBoundingClientRect()
    let sonX = e.clientX - kutu.left
    let sonY = e.clientY - kutu.top
    let oynadi = false
    let simdiki = koseler
    const tasi = (ev) => {
      const x = ev.clientX - kutu.left
      const y = ev.clientY - kutu.top
      const dx = x - sonX
      const dy = y - sonY
      if (!oynadi && Math.hypot(dx, dy) < 3) return
      oynadi = true
      sonX = x
      sonY = y
      simdiki = simdiki.map((k) => ({ x: k.x + dx, y: k.y + dy }))
      onKose?.(simdiki)
    }
    const bitir = () => {
      window.removeEventListener('pointermove', tasi)
      window.removeEventListener('pointerup', bitir)
      /* Sürükleme olmadıysa bu bir TIKLAMADIR: tasarım kutuya yerleşsin. */
      if (!oynadi) onSec?.()
    }
    window.addEventListener('pointermove', tasi)
    window.addEventListener('pointerup', bitir)
  }

  return (
    /*
      KATMAN TIKLAMA YUTMUYOR.

      Saydam bir div de tıklamayı yakalar. Bu katman tuvalin tamamını
      kaplıyordu ve altındaki tasarım sürüklenemiyordu. Yalnızca dörtgenin
      kendisi ve tutamaklar tıklanabilir.
    */
    <div data-pdf-gizle className="absolute inset-0 z-20 pointer-events-none" style={{ touchAction: 'none' }}>
      <svg width={tuvalW} height={tuvalH} className="absolute inset-0">
        <polygon
          points={nokta}
          /*
            ONAYDAN SONRA SOLUK.
            Kutu duvarın nerede olduğunu göstermeye devam ediyor ama
            tasarımın önüne geçmiyor: dolgu kalkıyor, çizgi inceliyor.
          */
          /*
           * ONAYDAN SONRA GÖVDE FAREYİ YUTMUYOR.
           *
           * Kutu onaylandıktan sonra da dolgusu 'transparent' idi; SVG'de
           * saydam dolgu hâlâ tıklanabilir olduğu için kutunun üstündeki her
           * sürükleme kutuya gidiyordu ve TASARIM hiç kıpırdamıyordu.
           * 'none' dolgu hiç hedef olmuyor; köşe tutamakları yerinde kalıyor,
           * yani kutu hâlâ ayarlanabiliyor.
           */
          fill={soluk ? 'none' : 'rgba(41,98,173,0.14)'}
          stroke="#2962ad"
          strokeWidth={soluk ? 1.5 : 2}
          strokeOpacity={soluk ? 0.55 : 1}
          strokeDasharray="7 5"
          onPointerDown={soluk ? undefined : govdeSurukle}
          style={{ cursor: soluk ? 'default' : 'move', pointerEvents: soluk ? 'none' : 'auto' }}
        />
        {etiket && (
          <text
            x={mx}
            y={my}
            textAnchor="middle"
            fontSize="13"
            fontWeight="600"
            fill="#2962ad"
            style={{ pointerEvents: 'none' }}
          >
            {etiket}
          </text>
        )}
        {koseler.map((k, i) => (
          <circle
            key={i}
            cx={k.x}
            cy={k.y}
            r={soluk ? 7 : 9}
            fill="#ffffff"
            stroke="#2962ad"
            strokeWidth="3"
            opacity={soluk ? 0.6 : 1}
            onPointerDown={koseSurukle(i)}
            style={{ cursor: 'grab', pointerEvents: 'auto' }}
          />
        ))}
      </svg>
    </div>
  )
}
