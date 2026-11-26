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
   * DIŞ DİLİMLER BÜYÜTÜLMÜYOR, KENDİ YÖNÜNDE ESNİYOR.
   *
   * Önce şöyleydi: dış dilimlerin hepsi TEK bir ölçekle (olcek) çiziliyor ve
   * o ölçek, kadrajın boş kalan en geniş kenarını kapatacak kadar
   * BÜYÜTÜLÜYORDU. AVM koridorunda duvarın üstünde kaynakta yalnızca 178
   * piksel tavan olduğu için bu ölçek 1,40'a fırlıyor, duvarın kendi ölçeği
   * ise 0,56 kalıyordu: çevre duvardan 2,5 KAT BÜYÜK çiziliyor, kolonlar
   * devleşip duvarın üstüne taşıyor ve duvar fotoğrafa yapıştırılmış bir
   * pano gibi duruyordu.
   *
   * Dokuz dilimin mantığı zaten bu değil: kenar dilimleri BOŞLUĞU DOLDURMAK
   * için kendi yönünde esner. Yan dilimler yatayda, üst/alt dilimler dikeyde
   * uzuyor; dikişin ÜSTÜNDEKİ yön her zaman komşusuyla aynı ölçekte
   * (yan dilimlerin dikey ölçeği satırdan, üst/alt dilimlerin yatay ölçeği
   * sütundan geliyor). Böylece çevre duvarla hizalı kalıyor ve kadraj yine
   * tam doluyor. disOlcek artık yalnızca kaynak boşsa (kenar payı yok)
   * devreye giriyor.
   */
  const solPx = Math.max(0, duvarSol)
  const sagPx = Math.max(0, tuvalW - duvarSol - duvarWpx)
  const ustPx = Math.max(0, duvarUst)
  const altPx = Math.max(0, tuvalH - duvarUst - duvarHpx)
  /* Kaynakta o kenarda piksel yoksa esnetilecek bir şey de yok. */
  const esne = (hedefPx, kaynakPx) => (kaynakPx > 0 ? hedefPx / kaynakPx : disOlcek)

  const sutun = [
    { x: duvarSol - solPx, w: solPx, sx: esne(solPx, sol), kx: 0 },
    { x: duvarSol, w: duvarWpx, sx: duvarWpx / (kutu.x1 - kutu.x0), kx: kutu.x0 },
    { x: duvarSol + duvarWpx, w: sagPx, sx: esne(sagPx, sag), kx: kutu.x1 },
  ]
  const satir = [
    { y: duvarUst - ustPx, h: ustPx, sy: esne(ustPx, ust), ky: 0 },
    { y: duvarUst, h: duvarHpx, sy: duvarHpx / (kutu.y1 - kutu.y0), ky: kutu.y0 },
    { y: duvarUst + duvarHpx, h: altPx, sy: esne(altPx, alt), ky: kutu.y1 },
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

  /*
   * DUVARIN SINIRI (bkz. sahneler.js duvarYuzeyi).
   *
   * Dilimler duvarı gerçek ölçüsünde esnetiyor ama kenarı belli olmuyordu.
   * Bu katman yalnızca duvarın dikdörtgenini işaretliyor: ince bir kenar
   * çizgisi ve dışa düşen gölge. Tıklamaya kapalı, ekranın altında kalıyor.
   */
  if (sahne.duvarYuzeyi) {
    /*
     * KAİDE VE TEMAS GÖLGESİ — YALNIZCA AYRIK DURAN DUVARDA.
     *
     * Şehir meydanındaki duvar meydanın ortasında duran ayrı bir blok:
     * dibinde kaide ve zemine düşen gölge olmadan havada duruyor gibiydi.
     * AVM koridorunda ise duvar BİNANIN kendi duvarı ve fotoğrafta zaten
     * kendi süpürgeliği var — oraya ikinci bir kaide çizmek duvarın dibine
     * çift şerit koyuyor, kalın gölge de duvarı fotoğrafın önüne
     * yapıştırılmış bir pano gibi gösteriyordu (bkz. sahneler.js
     * duvarKaide).
     */
    const ayrikDuvar = sahne.duvarKaide !== false
    const kaideH = Math.max(3, duvarHpx * 0.045)
    const kaideTasma = Math.max(2, duvarWpx * 0.008)
    /* Temas gölgesi kaidenin dibinde, duvardan geniş ve çok yumuşak. */
    if (ayrikDuvar) dilimler.push(
      <div
        key="duvar-temas-golge"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: duvarSol - duvarWpx * 0.06,
          top: duvarUst + duvarHpx + kaideH - kaideH * 0.4,
          width: duvarWpx * 1.12,
          height: Math.max(6, duvarHpx * 0.1),
          pointerEvents: 'none',
          background:
            'radial-gradient(50% 50% at 50% 0%, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.18) 55%, rgba(0,0,0,0) 100%)',
          filter: 'blur(1.5px)',
        }}
      />,
      <div
        key="duvar-kaide"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: duvarSol - kaideTasma,
          top: duvarUst + duvarHpx,
          width: duvarWpx + kaideTasma * 2,
          height: kaideH,
          pointerEvents: 'none',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(0,0,0,0.16) 55%, rgba(0,0,0,0.3) 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
        }}
      />,
    )
    /*
     * DUVARIN KENARI — binanın duvarında çok daha sessiz.
     *
     * Ayrık duvarda kenar + dışa düşen gölge duvarı mekândan ayırıyor.
     * Binanın duvarında ayrılacak bir şey yok: orada bu işaret yalnızca
     * kullanıcının girdiği ölçünün NEREDE bittiğini söylüyor, o yüzden ince
     * ve soluk.
     */
    dilimler.push(
      <div
        key="duvar-sinir"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: duvarSol,
          top: duvarUst,
          width: duvarWpx,
          height: duvarHpx,
          pointerEvents: 'none',
          border: ayrikDuvar
            ? '1px solid rgba(255,255,255,0.45)'
            : '1px solid rgba(255,255,255,0.18)',
          boxShadow: ayrikDuvar
            ? '0 10px 26px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(0,0,0,0.06)'
            : 'inset 0 0 0 1px rgba(0,0,0,0.04)',
        }}
      />,
    )
  }

  return <>{dilimler}</>
}
