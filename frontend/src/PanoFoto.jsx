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

export default function PanoFoto({ sahne, tuvalW, tuvalH }) {
  const yer = fotoYerlesim(sahne, tuvalW, tuvalH)
  if (!yer) return null

  const tasma = Math.max(2, Math.round(yer.panelWpx * 0.006))

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
    </div>
  )
}
