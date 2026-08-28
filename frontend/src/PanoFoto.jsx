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

import { fotoYerlesim, govdeOlculeri } from './sahneler.js'
import { yonDonusumu } from './hooks/useYon.js'

export default function PanoFoto({
  sahne,
  tuvalW,
  tuvalH,
  ekranWpx = 0,
  ekranHpx = 0,
  yakinlik = 1,
  /*
   * EKRANIN DIS HATTI (0..1 aralikta noktalar, App.jsx).
   *
   * Duz ekranda null. L tipinde ve kavislide ekran dikdortgen degildir;
   * kasa duz bir kutu olarak cizilirse kirilmanin oldugu yerde ekranin
   * disina tasar ve arkada siyah bir kama gorunur. Kasa ayni hatta
   * kirpilarak bu duzeltiliyor.
   */
  ekranSekli = null,
  /* Tasiyici direk L kosesinin altina gelsin diye (0..1). */
  ayakOrani = 0.5,
  /* Ekrana verilen aci (bkz. hooks/useYon.js) — govde de ayni acida durur. */
  yon = null,
  /*
   * Dort kose kipinde kiosk cizilmiyor: ekran mevcut bir yuzeye (bilbord,
   * pano, vitrin) oturtuluyor; onun onune bir de totem koymak yanlis olur.
   */
  kioskGizle = false,
  kayma = null,
  /* Ayaklar (direk + kaide) gizlenebiliyor; kasa ve gölge her hâlükârda kalır. */
  ayakVar = true,
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
  const kiosk = sahne.kiosk && !kioskGizle && ekranWpx > 0 && ekranHpx > 0
  // Ekran arka planla birlikte olceklendigi icin kiosk govdesi de ayni oranda
  const pxPerM = (yer.pxPerM || 1) * yakinlik
  const kasa = Math.max(3, Math.min(14, ekranWpx * 0.014))
  const ekranHm = ekranHpx / pxPerM
  const { direkM, kaideM } = govdeOlculeri(ekranHm)
  const direkH = direkM * pxPerM
  const direkW = Math.min(0.45, Math.max(0.09, (ekranWpx / pxPerM) * 0.09)) * pxPerM
  const kaideH = Math.max(2, kaideM * pxPerM)
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

  /*
   * Direk sabit boyda; kiosku zemine getiren sey App.jsx tarafindan
   * uygulanan DIKEY KAYMA (bkz. zeminOturmaKaymasi). Ekran ve govde ayni
   * kaymayi aldigi icin ikisi birlikte iniyor.
   */
  const direk = direkH

  /*
   * KASA KIRPMASI — ekranin dis hatti kutuya oturtuluyor.
   *
   * Noktalar 0..1 araliginda ve EKRAN kutusuna gore; kasa kutusu her
   * yandan `kasa` kadar daha buyuk oldugu icin ayni oranlar buyuk kutuya
   * uygulaniyor. Sonuc: dis kenarlarda duzgun bir cerceve payi, kirilma
   * yerinde ekranla ayni egim.
   */
  const kasaKirpma =
    ekranSekli && ekranSekli.length > 2
      ? `polygon(${ekranSekli
          .map(([nx, ny]) => {
            /*
             * Kavisli ekranin dis hatti kutunun bir parmak disina tasabiliyor;
             * kirpma kutunun disini zaten gostermedigi icin degerler araliga
             * cekiliyor. L tipinde noktalar zaten aralikta, bir sey degismez.
             */
            const x = Math.max(0, Math.min(1, nx)) * (ekranWpx + kasa * 2)
            const y = Math.max(0, Math.min(1, ny)) * (ekranHpx + kasa * 2)
            return `${x.toFixed(2)}px ${y.toFixed(2)}px`
          })
          .join(', ')})`
      : null

  /* Direk ve kaidenin yatay merkezi — L kosesinin altina gelir. */
  const ayakX = tuvalW / 2 + (ayakOrani - 0.5) * ekranWpx

  /*
   * DIREGIN UST UCU.
   *
   * Duz ekranda ekranin dibi (ekranAlt). L tipinde ise ekranin alt kenari
   * kosede YUKARI kiriliyor; direk kutunun dibinden baslarsa aradaki kama
   * bos kalir ve direk ekrana degmiyormus gibi gorunur. Bu yuzden dis hattin
   * kosedeki alt noktasi bulunup direk oraya kadar uzatiliyor.
   */
  const direkUst = (() => {
    if (!ekranSekli || ekranSekli.length < 3) return ekranAlt
    const kutuUst = tuvalH / 2 - ekranHpx / 2
    const yakinlar = ekranSekli.filter(([nx, ny]) => ny > 0.5 && Math.abs(nx - ayakOrani) < 0.03)
    if (!yakinlar.length) return ekranAlt
    const ny = Math.min(...yakinlar.map(([, y]) => y))
    return Math.min(ekranAlt, kutuUst + Math.max(0, Math.min(1, ny)) * ekranHpx)
  })()

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
      {/*
        Kiosk govdesi ekranla AYNI kaymayi aliyor: ekran WallPreview
        tarafindan cizildigi icin ikisi ayri katmanda, ama tek parca
        gorunmeleri gerekiyor.
      */}
      {kiosk && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            /*
             * Once tasima, sonra aci: aci ekranin KENDI merkezi etrafinda
             * donmeli. Tuvalin merkezi zaten ekranin merkezi oldugu icin
             * donusum noktasi ortada birakiliyor.
             */
            transform: [
              kayma ? `translate(${kayma.x}px, ${kayma.y}px)` : null,
              yonDonusumu(yon, ekranWpx),
            ]
              .filter(Boolean)
              .join(' ') || undefined,
            transformStyle: 'preserve-3d',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: tuvalW / 2 - ekranWpx / 2 - kasa,
              top: tuvalH / 2 - ekranHpx / 2 - kasa,
              width: ekranWpx + kasa * 2,
              height: ekranHpx + kasa * 2,
              background: metal,
              /*
               * Kirpma varken yuvarlak kose anlamsiz (kirpma zaten koseleri
               * belirliyor) ve golge de kirpilirdi; duz ekranda ikisi de duruyor.
               */
              borderRadius: kasaKirpma ? 0 : Math.max(2, kasa * 0.35),
              clipPath: kasaKirpma || undefined,
              boxShadow: kasaKirpma
                ? undefined
                : 'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.5), 0 10px 26px rgba(0,0,0,0.35)',
            }}
          />

          {/*
            AYAKLAR — kullanıcı gizleyebilir. Duvara asılan bir ekranın ayağı
            olmaz; zorla çizilen direk o tasarımı yanlış gösterir. Gizlenince
            ekranın dibi doğrudan zemine oturuyor (bkz. zeminOturmaKaymasi).
          */}
          {ayakVar && (
            <>
            {/* --- tasiyici direk(ler) --- */}
            <div
              style={{
                position: 'absolute',
                left: ayakX - direkW / 2,
                top: direkUst,
                width: direkW,
                height: direk + (ekranAlt - direkUst),
                background: metal,
              }}
            />
            {yanDestek &&
              [-0.3, 0.3].map((k) => (
                <div
                  key={k}
                  style={{
                    position: 'absolute',
                    left: ayakX + k * ekranWpx - direkW * 0.31,
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
                left: ayakX - (yanDestek ? 0.39 : 0.22) * ekranWpx,
                top: ekranAlt + direk,
                width: (yanDestek ? 0.78 : 0.44) * ekranWpx,
                height: kaideH,
                background: 'linear-gradient(180deg, #2a2e34 0%, #171a1e 60%, #0d0f12 100%)',
                borderRadius: Math.max(1, kaideH * 0.15),
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            />
            </>
          )}

          {/* --- zemin golgesi --- */}
          <div
            style={{
              position: 'absolute',
              left: ayakX - ekranWpx * 0.62,
              top: tabanY - Math.max(4, ekranWpx * 0.025),
              width: ekranWpx * 1.24,
              height: Math.max(8, ekranWpx * 0.05),
              background:
                'radial-gradient(ellipse at center, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0) 74%)',
            }}
          />
        </div>
      )}
    </div>
  )
}
