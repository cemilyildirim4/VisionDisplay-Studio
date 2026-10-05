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

/*
 * İKİ AYRI İŞ, İKİ AYRI RENK.
 *
 * Aynı bileşen iki yerde kullanılıyor ve ikisi karıştırılmamalı:
 *
 *   REFERANS kutusu  — gerçek ölçüsü bilinen nesne, kalibrasyonu kuran şey
 *   ÖLÇÜ kutusu      — tasarımın yerleşeceği alan, kalibrasyondan türeyen şey
 *
 * Renk ayrımı bunun için. `koseKapali` ise ölçü kutusu içindir: onun boyu
 * girilen santimetreden gelir, elle çekilerek değiştirilemez (yoksa fiziksel
 * ölçü bozulurdu); yalnızca yeri değişir.
 */
import { dortgenGecerli, perspektifGecerli } from './homografi.js'

export default function TaslakKutu({
  koseler,
  tuvalW,
  tuvalH,
  onSec,
  onKose,
  onDurus,
  etiket,
  soluk = false,
  renk = '#2962ad',
  dolgu = 'rgba(41,98,173,0.14)',
  koseKapali = false,
}) {
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
      /*
       * BOZUK DÖRTGEN KABUL EDİLMİYOR.
       *
       * Köşe karşı köşenin ötesine geçerse dörtgen kelebek oluyor;
       * perspektif paydası sıfırı geçerse de içerik ekranı boydan boya
       * kesen dev bir yalamaya dönüşüyor. İkisi de burada durduruluyor:
       * hareket kabul edilmiyor, köşe olduğu yerde kalıyor.
       */
      if (!dortgenGecerli(yeni) || !perspektifGecerli(yeni)) return
      onKose?.(yeni)
    }
    const bitir = () => {
      window.removeEventListener('pointermove', tasi)
      window.removeEventListener('pointerup', bitir)
    }
    window.addEventListener('pointermove', tasi)
    window.addEventListener('pointerup', bitir)
  }

  /*
   * PERSPEKTİF TUTAMAĞI — sürükledikçe kutu çevriliyor.
   *
   * Köşeleri tek tek çekmek yerine tek tutamak: yatay hareket kutuyu dikey
   * eksende çeviriyor, dikey hareket yatay eksende yatırıyor. Fare hareketi
   * ARTIM olarak gidiyor (mutlak konum değil); böylece tutamağın kutuyla
   * birlikte yer değiştirmesi sürüklemeyi bozmuyor.
   */
  const durusSurukle = (e) => {
    if (e.button != null && e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    let sonX = e.clientX
    let sonY = e.clientY
    const tasi = (ev) => {
      const dx = ev.clientX - sonX
      const dy = ev.clientY - sonY
      if (!dx && !dy) return
      sonX = ev.clientX
      sonY = ev.clientY
      onDurus?.(dx, dy)
    }
    const bitir = () => {
      window.removeEventListener('pointermove', tasi)
      window.removeEventListener('pointerup', bitir)
    }
    window.addEventListener('pointermove', tasi)
    window.addEventListener('pointerup', bitir)
  }

  /*
   * Tutamağın yeri: alt kenarın ortasından DIŞARI doğru. Kutunun içinde
   * olsaydı gövde sürüklemesiyle (taşıma) çakışırdı.
   */
  const durusTutamagi = () => {
    const altOrta = { x: (koseler[2].x + koseler[3].x) / 2, y: (koseler[2].y + koseler[3].y) / 2 }
    const dx = altOrta.x - mx
    const dy = altOrta.y - my
    const boy = Math.hypot(dx, dy)
    if (!(boy > 0)) return null
    const UZAKLIK = 30
    return {
      bas: altOrta,
      uc: { x: altOrta.x + (dx / boy) * UZAKLIK, y: altOrta.y + (dy / boy) * UZAKLIK },
    }
  }

  const tutamakYeri = !soluk && onDurus ? durusTutamagi() : null

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
          fill={soluk ? 'none' : dolgu}
          stroke={renk}
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
            fill={renk}
            style={{ pointerEvents: 'none' }}
          >
            {etiket}
          </text>
        )}
        {!koseKapali &&
          koseler.map((k, i) => (
          <circle
            key={i}
            cx={k.x}
            cy={k.y}
            r={soluk ? 7 : 9}
            fill="#ffffff"
            stroke={renk}
            strokeWidth="3"
            opacity={soluk ? 0.6 : 1}
            onPointerDown={koseSurukle(i)}
            style={{ cursor: 'grab', pointerEvents: 'auto' }}
          />
        ))}
        {/*
          PERSPEKTİF TUTAMAĞI — köşelerden ayrı renk.
          Köşe tutamakları kutuyu BOZARAK şekil veriyor; bu tutamak kutuyu
          ÇEVİRİYOR, şekli hep gerçek bir dikdörtgenin izdüşümü kalıyor.
          Karıştırılmasın diye mavi değil turuncu.
        */}
        {!soluk && onDurus && tutamakYeri && (
          <g>
            <line
              x1={tutamakYeri.bas.x}
              y1={tutamakYeri.bas.y}
              x2={tutamakYeri.uc.x}
              y2={tutamakYeri.uc.y}
              stroke="#d97706"
              strokeWidth="2"
              style={{ pointerEvents: 'none' }}
            />
            <circle
              cx={tutamakYeri.uc.x}
              cy={tutamakYeri.uc.y}
              r="11"
              fill="#d97706"
              stroke="#ffffff"
              strokeWidth="2.5"
              onPointerDown={durusSurukle}
              style={{ cursor: 'move', pointerEvents: 'auto' }}
            />
            {/* Dört yön oku: bu tutamağın her yöne sürüklendiğini anlatıyor. */}
            <path
              d={`M ${tutamakYeri.uc.x - 6} ${tutamakYeri.uc.y} L ${tutamakYeri.uc.x + 6} ${tutamakYeri.uc.y}
                  M ${tutamakYeri.uc.x} ${tutamakYeri.uc.y - 6} L ${tutamakYeri.uc.x} ${tutamakYeri.uc.y + 6}`}
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        )}
      </svg>
    </div>
  )
}
