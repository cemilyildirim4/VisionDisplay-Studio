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

  /* Duvar tuvalin ortasında duruyor; çevresi ona göre diziliyor. */
  const duvarSol = tuvalW / 2 - duvarWpx / 2
  const duvarUst = tuvalH / 2 - duvarHpx / 2

  /*
   * KADRAJ HER ZAMAN DOLU — dış dilimler gerektiğinde büyüyor.
   *
   * Dış dilimler fotoğrafın kendi ölçeğinde (disOlcek) çiziliyordu. O ölçek
   * fotoğrafın TAMAMI için hesaplanmış bir kaplama ölçeği; ama burada duvar
   * dilimi esniyor ve duvar yeniden ORTALANıyor, yani fotoğraf artık o
   * hesabın varsaydığı yerde durmuyor. Duvar kısaldıkça çevresi de yetişemez
   * oluyor ve kenarda beyaz bir şerit kalıyordu.
   *
   * AVM koridorunda bu üstte görülüyordu: duvarın üstünde kaynakta yalnızca
   * 178 piksel tavan var (şehir meydanında 410). Duvar ortalanınca o tavan
   * tuvalin üst yarısını dolduramıyor.
   *
   * Çözüm, dış dilimleri kadrajı kapatacak kadar BÜYÜTMEK. Dört kenar ayrı
   * ayrı hesaplanıp en büyüğü alınıyor; ölçek tek olduğu için hiçbir dilimin
   * en-boy oranı bozulmuyor — mekân sadece biraz yakından görünüyor.
   */
  const gerek = (pay, bosluk) => (pay > 0 ? bosluk / 2 / pay : 0)
  const olcek = Math.max(
    disOlcek,
    gerek(sol, tuvalW - duvarWpx),
    gerek(sag, tuvalW - duvarWpx),
    gerek(ust, tuvalH - duvarHpx),
    gerek(alt, tuvalH - duvarHpx),
  )

  const solPx = sol * olcek
  const sagPx = sag * olcek
  const ustPx = ust * olcek
  const altPx = alt * olcek

  const sutun = [
    { x: duvarSol - solPx, w: solPx, sx: olcek, kx: 0 },
    { x: duvarSol, w: duvarWpx, sx: duvarWpx / (kutu.x1 - kutu.x0), kx: kutu.x0 },
    { x: duvarSol + duvarWpx, w: sagPx, sx: olcek, kx: kutu.x1 },
  ]
  const satir = [
    { y: duvarUst - ustPx, h: ustPx, sy: olcek, ky: 0 },
    { y: duvarUst, h: duvarHpx, sy: duvarHpx / (kutu.y1 - kutu.y0), ky: kutu.y0 },
    { y: duvarUst + duvarHpx, h: altPx, sy: olcek, ky: kutu.y1 },
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
