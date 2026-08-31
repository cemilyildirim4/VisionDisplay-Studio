/**
 * DUVARI ESNETEN ARKA PLAN — dokuz dilim (9-slice).
 *
 * SORUN: hazır fotoğraflı mekânlarda duvar ölçüsünü değiştirmek, fotoğrafın
 * tamamını yakınlaştırıp uzaklaştırıyordu. Oysa istenen şey mekânın
 * DEĞİŞMESİ değil, duvarın büyüyüp küçülmesi: çizilmiş iç/dış mekân
 * sahnelerinde olduğu gibi 6 metrelik duvar dar, 18 metrelik duvar geniş
 * görünsün, yan taraftaki binalar ve zemin yerinde kalsın.
 *
 * ÇÖZÜM: fotoğraf dokuz parçaya bölünüyor. Duvarın bulunduğu ORTA sütun
 * yatayda, ORTA satır dikeyde esniyor; köşeler hiç ölçeklenmiyor, kenar
 * dilimleri yalnızca tek yönde esniyor. Arayüz kütüphanelerindeki 9-slice
 * mantığının aynısı — orada düğme kenarları, burada duvar dokusu korunuyor.
 *
 * Her dilim aynı görselden, kendi ölçeğiyle çizilen bir arka plan katmanı:
 *   background-size     = kaynak ölçüsü × o dilimin ölçeği
 *   background-position = dilimin kaynaktaki başlangıcı × ölçek (negatif)
 *
 * Duvar dokusu (taş panel, ahşap kaplama) yatayda esnediğinde göze
 * batmıyor; panolar biraz genişliyor ya da daralıyor, o kadar.
 */

export default function DuvarDilim({ sahne, kutu, tuvalW, tuvalH, duvarWpx, duvarHpx, disOlcek }) {
  const { w: kw, h: kh } = sahne.kaynak
  const sol = kutu.x0
  const sag = kw - kutu.x1
  const ust = kutu.y0
  const alt = kh - kutu.y1

  /* Dış dilimler sabit ölçekte; yalnızca duvar dilimi esniyor. */
  const solPx = sol * disOlcek
  const sagPx = sag * disOlcek
  const ustPx = ust * disOlcek
  const altPx = alt * disOlcek

  /* Duvar tuvalin ortasında duruyor; çevresi ona göre diziliyor. */
  const duvarSol = tuvalW / 2 - duvarWpx / 2
  const duvarUst = tuvalH / 2 - duvarHpx / 2

  const sutun = [
    { x: duvarSol - solPx, w: solPx, sx: disOlcek, kx: 0 },
    { x: duvarSol, w: duvarWpx, sx: duvarWpx / (kutu.x1 - kutu.x0), kx: kutu.x0 },
    { x: duvarSol + duvarWpx, w: sagPx, sx: disOlcek, kx: kutu.x1 },
  ]
  const satir = [
    { y: duvarUst - ustPx, h: ustPx, sy: disOlcek, ky: 0 },
    { y: duvarUst, h: duvarHpx, sy: duvarHpx / (kutu.y1 - kutu.y0), ky: kutu.y0 },
    { y: duvarUst + duvarHpx, h: altPx, sy: disOlcek, ky: kutu.y1 },
  ]

  const dilimler = []
  satir.forEach((r, ri) => {
    sutun.forEach((c, ci) => {
      if (c.w <= 0 || r.h <= 0) return
      dilimler.push(
        <div
          key={`${ri}-${ci}`}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: c.x,
            top: r.y,
            width: c.w,
            height: r.h,
            backgroundImage: `url("${sahne.dosya}")`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${kw * c.sx}px ${kh * r.sy}px`,
            backgroundPosition: `${-c.kx * c.sx}px ${-r.ky * r.sy}px`,
          }}
        />,
      )
    })
  })

  return <>{dilimler}</>
}
