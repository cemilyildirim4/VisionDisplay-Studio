/**
 * TOPLANTI SALONU — çizilmiş mekân, fotoğraf değil.
 *
 * NEDEN ÇİZİM:
 * Fotoğrafta ekran, fotoğrafın bir parçasıdır. Ortasını kesip çıkarsak bile
 * kalan parçaları esnetmek gerekiyor ve mekân bozuluyor. Burada ekranın yeri
 * en baştan BOŞ bırakılıyor — kesip çıkarılan bir delik değil, hiç çizilmemiş
 * bir alan. Ekran gerçekten mekândan bağımsız. Üstelik vektör olduğu için
 * hiçbir ölçekte bulanıklaşmıyor ve içinde ekranla yarışan kalabalık yok.
 *
 * SALONUN ÖLÇÜSÜ EKRANA ORANTILI, İÇİNDEKİLER GERÇEK ÖLÇÜDE:
 * Duvarlar, tavan ve sahne ekranın piksel ölçüsünün katıdır — ekran büyüdükçe
 * salon da açılır, kompozisyon her ölçüde aynı kalır. Buna karşılık sahnedeki
 * İNSAN gerçek metre ölçüsündedir (1,70 m, pxPerM ile). Ekranın ne kadar büyük
 * olduğunu anlatan tek şey o: ekran büyüdükçe insan küçülür.
 *
 * PERSPEKTİF:
 * Tek kaçış noktalı. Arka duvar tam karşıda bir dikdörtgen; yan duvarlar,
 * tavan ve zemin oradan tuvalin kenarlarına açılan yamuklar. Ekran arka
 * duvarın üzerinde, tam karşıdan görünür — o yüzden ekranın kendisi hiç
 * eğrilmez, ölçüleri okunaklı kalır.
 */

/**
 * Salonun tuvale sığması için ölçek (px/m) — DUVAR ölçüsünden hesaplanır.
 *
 * Eskiden salon ekrana orantılıydı: duvar kutularına ne yazılırsa yazılsın
 * oda aynı görünüyordu. Artık "Duvar" alanları gerçekten arka duvarı, "Ekran"
 * alanları da ekranı belirliyor; ikisi bağımsız ve ikisi de gerçek metre.
 *
 * 0,62: yanlarda, üstte ve altta yan duvarların/tavanın/zeminin görünmesi için
 * pay bırakılıyor. Duvar tuvali baştan başa kaplasaydı oda değil düz bir yüzey
 * gibi dururdu.
 */
export function salonOlcek(tuvalW, tuvalH, duvarWm, duvarHm) {
  if (!tuvalW || !tuvalH || !(duvarWm > 0) || !(duvarHm > 0)) return null
  return Math.min((tuvalW * 0.62) / duvarWm, (tuvalH * 0.62) / duvarHm)
}

export default function Salon({
  wPx,
  hPx,
  tuvalW,
  tuvalH,
  pxPerM,
  duvarWm,
  duvarHm,
  ekranSekli,
}) {
  if (!wPx || !hPx || !tuvalW || !tuvalH || !pxPerM) return null
  if (!(duvarWm > 0) || !(duvarHm > 0)) return null

  const m = pxPerM // 1 metrenin piksel karşılığı
  const cx = tuvalW / 2
  const cy = tuvalH / 2

  // Ekranın tuvaldeki yeri (gerçek ekran da tam buraya çizilir)
  const eSol = cx - wPx / 2
  const eUst = cy - hPx / 2


  /*
   * ARKA DUVAR — doğrudan duvar ölçüsünden, gerçek metre olarak. Ekranla aynı
   * ölçekte (m) çizildiği için ikisi birbirine göre doğru oranda görünür:
   * ekran duvardan büyükse taşar, küçükse duvarda boşluk kalır.
   */
  const duvarW = duvarWm * m
  const duvarH = duvarHm * m
  const duvarSol = cx - duvarW / 2
  const duvarSag = cx + duvarW / 2
  const tavanY = cy - duvarH / 2
  const sahneY = cy + duvarH / 2 // duvarın zeminle birleştiği çizgi

  /*
   * TEK KAÇIŞ NOKTALI PERSPEKTİF — kaçış noktası tuvalin merkezi (cx, cy).
   *
   * ÖNCEKİ ÇİZİM TUTARSIZDI: tavan/zemin/yan duvarlar arka duvarın
   * köşelerinden TUVALİN KÖŞELERİNE çekiliyordu. Bu, yatayda ve dikeyde
   * FARKLI kaçış noktası demek — duvarın en/boy oranı tuvalinkine eşit
   * olmadıkça (ki hiç olmuyor) oda kutu gibi değil, çarpık bir huni gibi
   * görünüyordu. Tavandaki şeritler de bu yüzden hiçbir yerde birleşmiyordu.
   *
   * DOĞRUSU: ön çerçeve, arka duvarın kaçış noktası etrafında k katı
   * büyütülmüş hâlidir. Böylece sekiz kenarın hepsi aynı noktada birleşir.
   * k, ön çerçeve tuvali taşıracak kadar büyük seçiliyor; taşan kısım zaten
   * görünmüyor (SVG tuvali kırpıyor).
   */
  const k = Math.max(tuvalW / duvarW, tuvalH / duvarH) * 1.06
  const onSol = cx - (duvarW / 2) * k
  const onSag = cx + (duvarW / 2) * k
  const onUst = cy - (duvarH / 2) * k
  const onAlt = cy + (duvarH / 2) * k

  /** Arka duvar kenarındaki bir noktanın ön çerçevedeki karşılığı. */
  const ileri = (x, y) => [cx + (x - cx) * k, cy + (y - cy) * k]

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0" width={tuvalW} height={tuvalH}>
        <defs>
          {/* Şeritler tavanın dışına taşmasın (yan duvara binen çizgi
              perspektifi bozar). */}
          <clipPath id="salon-tavan-kirp">
            <polygon
              points={`${onSol},${onUst} ${onSag},${onUst} ${duvarSag},${tavanY} ${duvarSol},${tavanY}`}
            />
          </clipPath>
          <linearGradient id="salon-tavan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f2f4f7" />
            <stop offset="100%" stopColor="#dfe3ea" />
          </linearGradient>
          <linearGradient id="salon-zemin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b9a58c" />
            <stop offset="100%" stopColor="#8a7862" />
          </linearGradient>
          <linearGradient id="salon-duvar-sol" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d3d8e0" />
            <stop offset="100%" stopColor="#f0f2f6" />
          </linearGradient>
          <linearGradient id="salon-duvar-sag" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f0f2f6" />
            <stop offset="100%" stopColor="#d3d8e0" />
          </linearGradient>
          <linearGradient id="salon-arka" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eef0f4" />
            <stop offset="100%" stopColor="#dcdfe6" />
          </linearGradient>
          {/* Ekranın duvara vuran ışığı */}
          <radialGradient id="salon-isik" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#9dc6ee" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#9dc6ee" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Tavan */}
        <polygon
          points={`${onSol},${onUst} ${onSag},${onUst} ${duvarSag},${tavanY} ${duvarSol},${tavanY}`}
          fill="url(#salon-tavan)"
        />
        {/* Zemin */}
        <polygon
          points={`${onSol},${onAlt} ${onSag},${onAlt} ${duvarSag},${sahneY} ${duvarSol},${sahneY}`}
          fill="url(#salon-zemin)"
        />
        {/* Yan duvarlar */}
        <polygon
          points={`${onSol},${onUst} ${duvarSol},${tavanY} ${duvarSol},${sahneY} ${onSol},${onAlt}`}
          fill="url(#salon-duvar-sol)"
        />
        <polygon
          points={`${onSag},${onUst} ${duvarSag},${tavanY} ${duvarSag},${sahneY} ${onSag},${onAlt}`}
          fill="url(#salon-duvar-sag)"
        />
        {/* Arka duvar */}
        <rect
          x={duvarSol}
          y={tavanY}
          width={duvarSag - duvarSol}
          height={sahneY - tavanY}
          fill="url(#salon-arka)"
        />

        {/*
          TAVAN IŞIK HATLARI — kaçış noktasına doğru daralan ince şeritler.
          Perspektifi asıl bunlar okutuyor; düz renk tavanı düz bir zemin gibi
          gösteriyordu. Kalın ve parlak olunca dikkati ekrandan çaldıkları için
          ince ve sönük tutuldular.
        */}
        <g clipPath="url(#salon-tavan-kirp)">
          {[0.18, 0.38, 0.62, 0.82].map((t, i) => {
            /*
             * Şerit, arka duvarın üst kenarındaki bir noktadan kaçış noktası
             * doğrultusunda ÖNE uzatılır — yani odanın gerçek derinlik
             * çizgisidir. Eskiden ön ucu tuvalin kenarına, arka ucu gelişigüzel
             * bir orana konuyordu; hiçbiri kaçış noktasında birleşmiyordu.
             */
            const arkaX = duvarSol + t * (duvarSag - duvarSol)
            const [onX, onY] = ileri(arkaX, tavanY)
            const arkaYari = Math.max(0.6, (duvarSag - duvarSol) * 0.006)
            const onYari = arkaYari * k
            return (
              <polygon
                key={i}
                points={`${onX - onYari},${onY} ${onX + onYari},${onY} ${arkaX + arkaYari},${tavanY} ${arkaX - arkaYari},${tavanY}`}
                fill="#8ea0b8"
                opacity="0.15"
              />
            )
          })}
        </g>

        {/*
          KÖŞE ÇİZGİLERİ — duvar/tavan/zemin birleşimleri.
          Yüzeyler yalnızca renkle ayrılınca sınırlar belirsiz kalıyor ve göz
          odayı kutu olarak okumuyordu. Dört köşe çizgisi de kaçış noktasında
          birleştiği için derinliği doğrudan anlatıyor.
        */}
        <g stroke="#9aa6b8" strokeWidth="1" opacity="0.35" fill="none">
          <polyline points={`${onSol},${onUst} ${duvarSol},${tavanY} ${duvarSag},${tavanY} ${onSag},${onUst}`} />
          <polyline points={`${onSol},${onAlt} ${duvarSol},${sahneY} ${duvarSag},${sahneY} ${onSag},${onAlt}`} />
          <line x1={duvarSol} y1={tavanY} x2={duvarSol} y2={sahneY} />
          <line x1={duvarSag} y1={tavanY} x2={duvarSag} y2={sahneY} />
        </g>

        {/* Ekranın duvara vuran soğuk ışığı */}
        <ellipse cx={cx} cy={cy} rx={wPx * 1.35} ry={hPx * 1.9} fill="url(#salon-isik)" />

        {/* Sahne alnı — ekranın altındaki podyumun ön kenarı */}
        <rect
          x={duvarSol}
          y={sahneY}
          width={duvarSag - duvarSol}
          height={Math.max(1, hPx * 0.012)}
          fill="#9aa1ac"
          opacity="0.5"
        />

        {/*
          KASA (ekranın çevresindeki koyu çerçeve) KALDIRILDI.

          Mekân arka planı seçilince ekranın dört yanında siyah bir bant
          çıkıyordu. Gerçek bir kurulumda kabinler duvara yüzeyi yüzeyine
          oturur, çevresinde ayrı bir kasa görünmez; buradaki çerçeve ekranı
          mekândan koparıp televizyon gibi gösteriyordu. Düz ve kavisli
          ekranda aynı sorun vardı — kavislide dikdörtgen çerçeve eğrinin
          dışına da taşıyordu.

          NOT: ekranSekli prop'u (App.jsx → Scene.jsx) yalnızca bu çerçeveyi
          ekranın dış hattına oturtmak için vardı; artık kullanılmıyor.
        */}

        {/*
          İNSAN SİLUETİ KALDIRILDI. Ölçü hissi versin diye 1,70 m'lik bir figür
          duruyordu; artık gerek yok, çünkü duvar da ekran da gerçek metre
          ölçüsünde çiziliyor — ekranın büyüklüğü doğrudan duvara göre okunuyor.
        */}

        {/*
          KOLTUK SIRALARI KALDIRILDI. Ölçü hissi versinler diye gerçek boyutta
          (0,52 m) çiziliyorlardı ama tuvalin alt üçte birini yuvarlak köşeli
          koyu kutularla dolduruyor, koltuktan çok leke gibi duruyorlardı.
          Ölçü hissini sahnedeki 1,70 m'lik insan zaten veriyor.
        */}
      </svg>
    </div>
  )
}
