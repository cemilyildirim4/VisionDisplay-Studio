/**
 * ADAY YERLEŞİM KARELERİ KATMANI.
 *
 * Fotoğrafın üstünde, uygun bulunan yüzeyleri kendi perspektifleriyle çiziyor.
 * Bir kareye tıklamak tasarımı oraya taşıyor — otomatik bulmanın tek bir
 * tahminine mahkûm kalmadan, doğru yeri kullanıcı seçiyor.
 *
 * Köşeler FOTOĞRAFA GÖRE 0–1 oranlı geliyor; tuvaldeki piksele çevirme işi
 * çağıran tarafta (App.jsx), çünkü yakınlaştırma ve fotoğrafın tuvaldeki
 * yerleşimi orada biliniyor.
 */

export default function AdaySecici({ adaylar, tuvalW, tuvalH, onSec }) {
  if (!adaylar?.length) return null

  return (
    /*
      KATMAN TIKLAMALARI YUTMUYOR.

      Kapsayıcı tüm tuvali kaplıyordu ve pointer olaylarını yakalıyordu; bu
      yüzden kareler açıkken tasarım sürüklenemiyordu. Artık yalnızca
      karelerin kendisi tıklanabilir.
    */
    <div
      data-pdf-gizle
      className="absolute inset-0 z-20 pointer-events-none"
      style={{ touchAction: 'none' }}
    >
      <svg width={tuvalW} height={tuvalH} className="absolute inset-0">
        {adaylar.map((a, i) => {
          const nokta = a.koseler.map((k) => `${k.x},${k.y}`).join(' ')
          const mx = a.koseler.reduce((t, k) => t + k.x, 0) / 4
          const my = a.koseler.reduce((t, k) => t + k.y, 0) / 4
          /* İlk sıra fotoğraftaki gerçek ekran ise ayırt edilsin. */
          const vurgu = a.tur === 'screen'
          return (
            /*
              TIKLAMA YALNIZCA NUMARA ROZETİNDE.

              Dörtgenin tamamı tıklanabilir olduğunda tasarımın üstünü
              kaplıyor ve sürükleyerek taşımayı engelliyordu. Kare artık
              yalnızca gösterge; seçim numaraya (ya da paneldeki listeye)
              tıklayarak yapılıyor.
            */
            <g key={i} className="aday-kare">
              <polygon
                points={nokta}
                style={{ pointerEvents: 'none' }}
                fill={vurgu ? 'rgba(41,98,173,0.26)' : 'rgba(41,98,173,0.12)'}
                stroke={vurgu ? '#2962ad' : '#5b8fd6'}
                strokeWidth={vurgu ? 3 : 2}
                strokeDasharray={vurgu ? '' : '6 4'}
              />
              <circle
                cx={mx}
                cy={my}
                r="14"
                fill="#2962ad"
                onClick={() => onSec(a)}
                style={{ cursor: 'pointer', pointerEvents: 'auto' }}
              />
              <text
                x={mx}
                y={my + 5}
                textAnchor="middle"
                fontSize="14"
                fontWeight="700"
                fill="#fff"
                onClick={() => onSec(a)}
                style={{ cursor: 'pointer', pointerEvents: 'auto' }}
              >
                {i + 1}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
