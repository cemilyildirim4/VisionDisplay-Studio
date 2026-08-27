/**
 * FOTOĞRAFLI MEKÂN — sabit fotoğraf, değişken LED ekran.
 *
 * Fotoğraf hiç ölçeklenmez. Panelin merkezi tuvalin merkezine gelecek şekilde
 * yerleştirilir ve tuvali kaplar; kabin eklendikçe mekân olduğu yerde durur.
 * Değişen tek şey ortadaki gerçek ekrandır — onu WallPreview tuvalin merkezine
 * çiziyor, yani tam panelin üstüne.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ÖNCEKİ YOL VE NEDEN BIRAKILDI — 9 PARÇALI ("9-slice") ÖLÇEKLEME
 *
 * Fotoğraf dokuz parçaya bölünüyor, panelin yeri boş bırakılıp kenar bantları
 * esnetiliyordu; böylece pano tasarımın ölçüsüne göre açılıp kapanıyordu.
 * Mekanizma çalışıyordu ama istenen bu değildi: tasarım değişince panonun
 * kasası, dolayısıyla fotoğrafın dış sınırı da değişiyordu. İstenen, mekânın
 * tamamen sabit kalıp yalnızca LED ekranın büyüyüp küçülmesi.
 *
 * Bunun bir bedeli var: ekran artık panonun kasasına kilitli değil. Tasarım
 * panodan büyükse ekran kasanın dışına taşar. Bu kasıtlı — panonun gerçek
 * ölçüsü sabittir (sahneler.js'teki `panelEnM`) ve müşterinin ekranı ondan
 * büyükse bunu görmesi gerekir. Ölçü hissini veren şey de bu.
 * ────────────────────────────────────────────────────────────────────────────
 */

import { fotoYerlesim } from './sahneler.js'

export default function PanoFoto({
  sahne,
  tuvalW,
  tuvalH,
  ekranWpx = 0,
  ekranHpx = 0,
  yakinlik = 1,
}) {
  const yer = fotoYerlesim(sahne, tuvalW, tuvalH)
  if (!yer) return null

  const tasma = Math.max(2, Math.round(yer.panelWpx * 0.006))
  const panelYariW = (sahne.panel.x1 - sahne.panel.x0) / 2
  const panelYariH = (sahne.panel.y1 - sahne.panel.y0) / 2

  /*
   * KIOSK GOVDESI.
   *
   * Ekranin kendisini WallPreview ciziyor; burada onun ARKASINA ve ALTINA
   * duran parcalar var: kasa, tasiyici direk, kaide ve zemin golgesi.
   * Ekran tuvalin merkezine cizildigi icin hepsi merkeze gore konumlanir.
   *
   * Kasa kalinligi piksel ve SINIRLI: ekranla birlikte orantili buyuseydi
   * 6 m lik bir ekranda yarim metrelik bir cerceve olurdu. Direk ve kaide
   * ise gercek metre - mekanin kendi olceginden (yer.pxPerM) turuyor.
   */
  const kiosk = sahne.kiosk && ekranWpx > 0 && ekranHpx > 0
  // Ekran arka planla birlikte olceklendigi icin kiosk govdesi de ayni oranda
  const pxPerM = (yer.pxPerM || 1) * yakinlik
  const kasa = Math.max(3, Math.min(14, ekranWpx * 0.014))
  const ekranHm = ekranHpx / pxPerM
  const direkH = Math.min(2.5, Math.max(0.5, ekranHm * 0.3)) * pxPerM
  const direkW = Math.min(0.45, Math.max(0.09, (ekranWpx / pxPerM) * 0.09)) * pxPerM
  const kaideH = Math.max(3, 0.14 * pxPerM)
  const ekranAlt = tuvalH / 2 + ekranHpx / 2

  /*
   * KIOSK FOTOGRAFIN ICINDE KALSIN.
   *
   * Buyuk tasarimlarda ekran fotografin alt kenarindan tasabiliyor; ekranin
   * tasmasi kasitli (mekan o kadar buyuk degil, bilgi bu), ama DIREK ve KAIDE
   * fotografin disinda, bos zeminde asili kalinca kirik gorunuyordu. Govdenin
   * dibi fotografin alt kenarini gecmiyor; gecmesi gerekiyorsa direk kisaliyor.
   *
   * Fotograf panelin merkezine gore olceklendigi icin alt kenarin yakinlik
   * sonrasi yeri de ayni merkeze gore hesaplaniyor.
   */
  const panelMerkezY = tuvalH / 2
  const fotoAlt = panelMerkezY + (yer.ust + yer.yukseklik - panelMerkezY) * yakinlik
  const yerKalan = fotoAlt - kaideH - ekranAlt
  const direk = Math.max(0, Math.min(direkH, yerKalan))
  const tabanY = ekranAlt + direk + kaideH
  const metal = 'linear-gradient(180deg, #3a3f47 0%, #23272d 42%, #14171b 100%)'
  const yanDestek = ekranWpx / pxPerM > 2.5

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/*
        Arka planı olmayan mekân (sahneler.js'te `dosya: null`): fotoğraf
        çizilmez, yerine sade bir zemin gelir. Böylece görünen tek dikdörtgen
        müşterinin ekranı olur.
      */}
      {!sahne.dosya && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#e9edf2] to-[#cfd6df] dark:from-[#252b34] dark:to-[#171b21]" />
      )}
      {sahne.dosya && (
        <>
          <img
            src={sahne.dosya}
            alt=""
            style={{
              position: 'absolute',
              left: yer.sol,
              top: yer.ust,
              width: yer.genislik,
              height: yer.yukseklik,
              maxWidth: 'none',
              /*
               * Yakinlik yalnizca FOTOGRAFA uygulaniyor. Sahne kapsayicisina
               * uygulansaydi olcu etiketleri ve denetimler de olceklenirdi.
               * Olcegin merkezi panelin merkezi: yaklasirken ekranin durdugu
               * nokta kadrajda yerinde kaliyor, mekan onun etrafinda aciliyor.
               */
              transform: `scale(${yakinlik})`,
              transformOrigin: `${(sahne.panel.x0 + panelYariW) * yer.s}px ${
                (sahne.panel.y0 + panelYariH) * yer.s
              }px`,
              transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
              willChange: 'transform',
            }}
          />
          {/*
        FOTOĞRAFTAKİ LED YÜZEYİNİ KAPATAN MASKE — yalnızca `maskeli` sahnelerde.
        Panonun kendi ekranı olan fotoğraflarda gerekli; düz duvar gibi temiz
        yüzeylerde konsaydı duvarın ortasına koyu bir dikdörtgen basardı.
        Ekran panelin tam yerine oturuyor ama oranı farklıysa (kare tasarım,
        enine panel) kenarlarda fotoğrafın kendi LED yüzeyi görünüyor ve iki
        ekran varmış gibi duruyordu. Maske orayı düz bir kasa yüzeyine
        çeviriyor: geriye tek bir ekran kalıyor, o da bizimki.

        Birkaç piksel TAŞIRILIYOR (`tasma`): panel koordinatları piksel piksel
        ölçülse de yuvarlama ve fotoğrafın kendi kenar yumuşaması yüzünden alt
        kenarda eski reklamdan ince bir şerit sızıyordu.
      */}
          {sahne.maskeli && (
          <div
            style={{
              position: 'absolute',
              left: tuvalW / 2 - yer.panelWpx / 2 - tasma,
              top: tuvalH / 2 - yer.panelHpx / 2 - tasma,
              width: yer.panelWpx + tasma * 2,
              height: yer.panelHpx + tasma * 2,
              background: 'linear-gradient(180deg,#191d24 0%,#12151a 100%)',
            }}
          />
          )}
        </>
      )}

      {/* --- kiosk: kasa (ekranin arkasinda, kenarlardan tasar) ------- */}
      {kiosk && (
        <>
          <div
            style={{
              position: 'absolute',
              left: tuvalW / 2 - ekranWpx / 2 - kasa,
              top: tuvalH / 2 - ekranHpx / 2 - kasa,
              width: ekranWpx + kasa * 2,
              height: ekranHpx + kasa * 2,
              background: metal,
              borderRadius: Math.max(2, kasa * 0.35),
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.5), 0 10px 26px rgba(0,0,0,0.35)',
            }}
          />

          {/* --- tasiyici direk(ler) --- */}
          <div
            style={{
              position: 'absolute',
              left: tuvalW / 2 - direkW / 2,
              top: ekranAlt,
              width: direkW,
              height: direk,
              background: metal,
            }}
          />
          {yanDestek &&
            [-0.3, 0.3].map((k) => (
              <div
                key={k}
                style={{
                  position: 'absolute',
                  left: tuvalW / 2 + k * ekranWpx - direkW * 0.31,
                  top: ekranAlt,
                  width: direkW * 0.62,
                  height: direk,
                  background: metal,
                  opacity: 0.92,
                }}
              />
            ))}

          {/* --- kaide --- */}
          <div
            style={{
              position: 'absolute',
              left: tuvalW / 2 - (yanDestek ? 0.39 : 0.22) * ekranWpx,
              top: ekranAlt + direk,
              width: (yanDestek ? 0.78 : 0.44) * ekranWpx,
              height: kaideH,
              background: 'linear-gradient(180deg, #2a2e34 0%, #171a1e 60%, #0d0f12 100%)',
              borderRadius: Math.max(1, kaideH * 0.15),
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          />

          {/* --- zemin golgesi --- */}
          <div
            style={{
              position: 'absolute',
              left: tuvalW / 2 - ekranWpx * 0.62,
              top: tabanY - Math.max(4, ekranWpx * 0.025),
              width: ekranWpx * 1.24,
              height: Math.max(8, ekranWpx * 0.05),
              background:
                'radial-gradient(ellipse at center, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0) 74%)',
            }}
          />
        </>
      )}
    </div>
  )
}
