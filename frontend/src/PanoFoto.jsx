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
import DuvarDilim from './DuvarDilim.jsx'

/**
 * ÖLÇÜ ETİKETİNİN METNİ.
 *
 * Duvar ölçüsü artık kullanıcıdan geliyor (bkz. sahneler.js duvarPayW):
 * fotoğraftaki duvar, girilen genişlik kadar sayılıyor. O yüzden kadraj
 * genişliği, kamera mesafesi ve görünen derinlik de sabit yazı olamaz —
 * hepsi duvardan türüyor:
 *   kadraj  = duvar / duvarın kadrajdaki payı
 *   mesafe  = kadraj / 1,11  (yatay görüş açısı ~58° kabulü)
 *   derinlik= mesafe − kameranın önündeki ölü mesafe (~%26)
 */
function etiketMetni(o, sahne, duvarWm, duvarHm) {
  if (!o.tur && !o.duvarOlcusu) return o.etiket
  if (o.duvarOlcusu) {
    return duvarWm > 0 ? `${o.etiket} ${bicimM(duvarWm)} × ${bicimM(duvarHm)} m` : o.etiket
  }
  const pay = sahne?.duvarPayW || 0
  if (!(pay > 0) || !(duvarWm > 0)) return o.etiket
  const kadraj = duvarWm / pay
  const mesafe = kadraj / 1.11
  if (o.tur === 'kadraj') return `${o.etiket} ~${bicimM(kadraj)} m`
  if (o.tur === 'mesafe') return `${o.etiket} ~${bicimM(mesafe)} m`
  if (o.tur === 'derinlik') return `${o.etiket} ~${bicimM(mesafe * 0.74)} m`
  return o.etiket
}

/** 12 → "12", 4,5 → "4,5" */
function bicimM(v) {
  const n = Math.round((Number(v) || 0) * 10) / 10
  return String(n).replace('.', ',')
}

export default function PanoFoto({
  sahne,
  tuvalW,
  tuvalH,
  ekranWpx = 0,
  ekranHpx = 0,
  yakinlik = 1,
  /* Çizim ölçeği (px/m) — gövde ölçüleri buradan; ekranla aynı ölçekte kalsın. */
  cizimOlcek = 0,
  /* Mekânın gerçek ölçü etiketleri gösterilsin mi (Ölçüleri göster/gizle). */
  olcuGoster = false,
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
  duvarWmEtiket = 0,
  duvarHmEtiket = 0,
  kayma = null,
  /*
   * KIOSK TİPİ: duvar | dokunmatik | totem | masa | disMekan
   * Ürün ailesiyle aynı adlar; duvar dışındaki tipler yere basıyor.
   */
  kioskTipi = 'duvar',
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
  const pxPerM = cizimOlcek > 0 ? cizimOlcek : (yer.pxPerM || 1) * yakinlik
  /*
   * Duvarı esneterek çizme koşulu: sahne bunu destekliyor ve elde geçerli bir
   * duvar ölçüsü var. Yoksa fotoğraf eskisi gibi tek parça çiziliyor.
   */
  const dilimliDuvar =
    !!sahne.duvarKutu && duvarWmEtiket > 0 && duvarHmEtiket > 0 && pxPerM > 0
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

  /*
   * Fotoğraf tuvali doldurmuyorsa (uzaklaşma) kenar tamamlama devreye giriyor.
   * Yarım piksellik yuvarlama farkları için küçük bir pay bırakılıyor.
   */
  const kenarDoldur =
    yer.genislik * yakinlik < tuvalW - 1 || yer.yukseklik * yakinlik < tuvalH - 1

  /*
   * TİPE GÖRE GÖVDE YÜKSEKLİKLERİ (metre).
   *  • dokunmatik kabin: 0,95 m — işlem yüzeyi el hizasında olsun diye.
   *  • dış mekân kabini: 0,80 m — kasa daha alçak, ağırlık merkezi aşağıda.
   *  • masa ayağı: 0,75 m — standart masa yüksekliği.
   * Ekran zaten kendi yüksekliğinde çizildiği için bunlar onun ALTINA
   * ekleniyor; toplam yükseklik gerçeğe yakın kalıyor.
   */
  const kabinM = kioskTipi === 'dokunmatik' ? 0.95 : kioskTipi === 'disMekan' ? 0.8 : kioskTipi === 'totem' ? 0.35 : 0
  const kabinH = kabinM * pxPerM
  const masaAyakH = kioskTipi === 'masa' ? 0.75 * pxPerM : 0

  const tabanY = ekranAlt + kabinH + masaAyakH + kaideH
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
          {/*
            KENAR TAMAMLAMA.

            Uzaklaşınca fotoğraf küçülüyor ve kenarlarda boş şerit kalıyor —
            elimizde o karenin gösterdiğinden fazlası yok. Boşluğu, fotoğrafın
            KENDİSİNİN tuvali kaplayacak kadar büyütülmüş ve bulanıklaştırılmış
            bir kopyasıyla dolduruyoruz: renkler ve ışık sürüyor, kadraj bir
            yerde bitmiş gibi durmuyor.

            Bu bir üretim (outpainting) değil, mevcut pikselleri uzatma. Gerçek
            yapay zekâ tamamlaması için görüntünün bir sunucuya gönderilmesi
            gerekir; burada fotoğraf cihazdan çıkmıyor.
          */}
          {kenarDoldur && (
            <img
              src={sahne.dosya}
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'blur(26px) saturate(0.9) brightness(0.82)',
                transform: 'scale(1.12)',
                pointerEvents: 'none',
              }}
            />
          )}
          {/*
            DUVARI ESNEYEN SAHNE.

            Sahnede duvarKutu tanımlıysa (AVM koridoru, şehir meydanı)
            fotoğraf dokuz dilim çiziliyor: duvar, kullanıcının girdiği
            ölçüye göre büyüyüp küçülüyor, çevresi yerinde kalıyor. Aksi
            hâlde eski davranış — fotoğraf tek parça ve yakınlıkla ölçekli.
          */}
          {dilimliDuvar ? (
            <DuvarDilim
              sahne={sahne}
              kutu={sahne.duvarKutu}
              tuvalW={tuvalW}
              tuvalH={tuvalH}
              duvarWpx={duvarWmEtiket * pxPerM}
              duvarHpx={duvarHmEtiket * pxPerM}
              disOlcek={yer.s}
            />
          ) : (
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
          )}
          {/*
            MEKÂNIN GERÇEK ÖLÇÜLERİ.

            Sahne kayıtlarındaki `olculer` (bkz. sahneler.js) fotoğrafın
            üstüne küçük etiketler olarak yazılıyor. Konumlar kaynak görselin
            0–1 aralığında olduğu için fotoğrafla birlikte kayıyor ve
            ölçekleniyor; yakınlık uygulanınca etiketler de yerinde kalıyor.

            Ölçüler YAKLAŞIKTIR: fotoğraftaki bilinen referanslardan (panel
            genişliği, tavan yüksekliği, kapı boyu) ve görüş açısı kabulünden
            türetildi. Sahne ayarlarının dayanağı bunlar.
          */}
          {olcuGoster &&
            Array.isArray(sahne.olculer) &&
            sahne.olculer.map((o) => (
              <span
                key={o.etiket}
                style={{
                  position: 'absolute',
                  /*
                    Fotoğraf yakınlaştığında (cover) etiket kadrajın dışına
                    düşüp yarım görünüyordu; konum yakınlığa göre hesaplanıp
                    tuvalin içine sıkıştırılıyor.
                  */
                  left: Math.max(
                    54,
                    Math.min(
                      tuvalW - 54,
                      tuvalW / 2 + (yer.sol + o.x * yer.genislik - tuvalW / 2) * yakinlik,
                    ),
                  ),
                  top: Math.max(
                    14,
                    Math.min(
                      tuvalH - 14,
                      tuvalH / 2 + (yer.ust + o.y * yer.yukseklik - tuvalH / 2) * yakinlik,
                    ),
                  ),
                  transform: 'translate(-50%, -50%)',
                  transformOrigin: 'center',
                  /*
                    Etiketler bilgi notu, süs değil: küçük, tek satır ve yarı
                    saydam. Kutu yerine hap biçimi ve hafif bulanık zemin,
                    fotoğrafın üstünde daha az yer kaplıyor.
                  */
                  fontSize: 8.5,
                  fontWeight: 500,
                  lineHeight: 1,
                  padding: '3px 7px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                  background: 'rgba(17,20,26,0.42)',
                  backdropFilter: 'blur(3px)',
                  WebkitBackdropFilter: 'blur(3px)',
                  color: 'rgba(255,255,255,0.86)',
                  letterSpacing: '0.03em',
                }}
              >
                {/*
                  Duvar etiketi sahnenin sabit ölçüsünü değil, KULLANICININ
                  girdiği duvar ölçüsünü yazıyor: fotoğraftaki duvar artık
                  o ölçüyü temsil ediyor (bkz. sahneler.js duvarPayW).
                */}
                {etiketMetni(o, sahne, duvarWmEtiket, duvarHmEtiket)}
              </span>
            ))}

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
            KIOSK TİPLERİ — ürün ailesiyle aynı adlar.

              • dokunmatik — ekranın altında işlem/klavye kabini; sipariş,
                bilet ve bilgi kioskları böyle. Kabin yüksekliği gerçek ölçüden
                (0,95 m) hesaplanıyor.
              • totem      — ekranı içine alan, zemine kadar inen dik kolon.
              • masa       — yatay konumlanan masa; ekranın altında tabla eteği
                ve iki yanda ayak. Masa yüksekliği 0,75 m.
              • disMekan   — kalın koruma kasası + üstte güneşlik, sağlam ayak.
              • duvar      — gövde yok; montaj ya da askı.

            Ölçüler metreden geliyor (pxPerM), yani mekânın ölçeğiyle birlikte
            büyüyüp küçülüyor. Zemine oturma yalnızca yere basan tiplerde.
          */}
          {(kioskTipi === 'dokunmatik' || kioskTipi === 'disMekan') && (
            <>
              {/* Gövde kabini: ekranın altında, ekranla aynı genişlikte */}
              <div
                style={{
                  position: 'absolute',
                  left: ayakX - ekranWpx * (kioskTipi === 'disMekan' ? 0.34 : 0.42),
                  top: ekranAlt,
                  width: ekranWpx * (kioskTipi === 'disMekan' ? 0.68 : 0.84),
                  height: Math.max(6, kabinH),
                  background: metal,
                  borderRadius: Math.max(2, kasa * 0.4),
                }}
              />
              {/* Dokunmatikte öne eğik işlem yüzeyi — kabinin üst kısmında */}
              {kioskTipi === 'dokunmatik' && (
                <div
                  style={{
                    position: 'absolute',
                    left: ayakX - ekranWpx * 0.32,
                    top: ekranAlt + Math.max(3, kabinH * 0.12),
                    width: ekranWpx * 0.64,
                    height: Math.max(3, kabinH * 0.22),
                    background: 'linear-gradient(180deg, #4a515b 0%, #2b3038 100%)',
                    borderRadius: Math.max(1, kasa * 0.3),
                    opacity: 0.95,
                  }}
                />
              )}
              {/* Dış mekânda üstte güneşlik/yağmurluk */}
              {kioskTipi === 'disMekan' && (
                <div
                  style={{
                    position: 'absolute',
                    left: tuvalW / 2 - ekranWpx / 2 - kasa * 2.2,
                    top: tuvalH / 2 - ekranHpx / 2 - kasa * 2.6,
                    width: ekranWpx + kasa * 4.4,
                    height: Math.max(3, kasa * 1.6),
                    background: 'linear-gradient(180deg, #454b55 0%, #22262c 100%)',
                    borderRadius: Math.max(1, kasa * 0.4),
                  }}
                />
              )}
            </>
          )}

          {/* --- totem: ekranı içine alan dik kolon --- */}
          {kioskTipi === 'totem' && (
            <div
              style={{
                position: 'absolute',
                left: tuvalW / 2 - (ekranWpx * 1.18) / 2,
                top: tuvalH / 2 - ekranHpx / 2 - kasa * 2.4,
                width: ekranWpx * 1.18,
                height: ekranHpx + kasa * 2.4 + kabinH,
                background: metal,
                borderRadius: Math.max(3, kasa * 0.9),
                zIndex: -1,
              }}
            />
          )}

          {/* --- masa tipi: tabla eteği ve iki yanda ayak --- */}
          {kioskTipi === 'masa' && (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: ayakX - ekranWpx * 0.54,
                  top: ekranAlt,
                  width: ekranWpx * 1.08,
                  height: Math.max(4, kasa * 1.4),
                  background: 'linear-gradient(180deg, #3d434c 0%, #23272d 100%)',
                  borderRadius: Math.max(2, kasa * 0.4),
                }}
              />
              {[-0.42, 0.42].map((k) => (
                <div
                  key={k}
                  style={{
                    position: 'absolute',
                    left: ayakX + k * ekranWpx - direkW * 0.3,
                    top: ekranAlt + Math.max(4, kasa * 1.4),
                    width: direkW * 0.6,
                    height: Math.max(6, masaAyakH),
                    background: metal,
                  }}
                />
              ))}
            </>
          )}

          {/* --- yere basan tiplerde kaide --- */}
          {(kioskTipi === 'dokunmatik' || kioskTipi === 'totem' || kioskTipi === 'disMekan') && (
            <div
              style={{
                position: 'absolute',
                left: ayakX - (kioskTipi === 'totem' ? 0.66 : 0.5) * ekranWpx,
                top: ekranAlt + kabinH,
                width: (kioskTipi === 'totem' ? 1.32 : 1) * ekranWpx,
                height: kaideH,
                background: 'linear-gradient(180deg, #2a2e34 0%, #171a1e 60%, #0d0f12 100%)',
                borderRadius: Math.max(1, kaideH * 0.15),
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            />
          )}

          {/* --- zemin golgesi: yalnızca yere basan tiplerde --- */}
          {kioskTipi !== 'duvar' && (
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
          )}
        </div>
      )}
    </div>
  )
}
