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
 * Bir de emniyet sınırı var (`sinirla`). Demo modellerde ekran 30 cm olabiliyor
 * ve gerçek boyutlu insan ekranın beş katı çıkıp sahneyi kaplıyordu; anlamlı
 * bir ölçü hissi değil, saçmalık oluyordu. Onun için insan ekrana göre bir alt
 * ve bir üst sınırda tutuluyor. Gerçekçi ölçülerde (2-6 m) bu sınırlar hiç
 * devreye girmiyor, ölçü hissi bozulmuyor.
 *
 * PERSPEKTİF:
 * Tek kaçış noktalı. Arka duvar tam karşıda bir dikdörtgen; yan duvarlar,
 * tavan ve zemin oradan tuvalin kenarlarına açılan yamuklar. Ekran arka
 * duvarın üzerinde, tam karşıdan görünür — o yüzden ekranın kendisi hiç
 * eğrilmez, ölçüleri okunaklı kalır.
 */

// Salonun ekrana oranları
const KASA = 0.05 // kasa kalınlığı, metre

const sinirla = (v, alt, ust) => Math.min(Math.max(v, alt), ust)

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
   * Kasa gerçek ölçüde (5 cm) ama ekrana göre de sınırlı: küçük demo
   * ekranlarda px/m çok büyüyor ve 5 cm, ekranın çeyreği kadar bir çerçeve
   * çıkarıyordu.
   */
  const kasa = sinirla(KASA * m, 1.5, wPx * 0.02)

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

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0" width={tuvalW} height={tuvalH}>
        <defs>
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
          points={`0,0 ${tuvalW},0 ${duvarSag},${tavanY} ${duvarSol},${tavanY}`}
          fill="url(#salon-tavan)"
        />
        {/* Zemin */}
        <polygon
          points={`0,${tuvalH} ${tuvalW},${tuvalH} ${duvarSag},${sahneY} ${duvarSol},${sahneY}`}
          fill="url(#salon-zemin)"
        />
        {/* Yan duvarlar */}
        <polygon
          points={`0,0 ${duvarSol},${tavanY} ${duvarSol},${sahneY} 0,${tuvalH}`}
          fill="url(#salon-duvar-sol)"
        />
        <polygon
          points={`${tuvalW},0 ${duvarSag},${tavanY} ${duvarSag},${sahneY} ${tuvalW},${tuvalH}`}
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
        {[-0.66, -0.4, -0.14, 0.14, 0.4, 0.66].map((o, i) => {
          const onX = cx + o * tuvalW
          const arkaX = cx + o * (duvarSag - duvarSol) * 0.55
          const yari = tuvalW * 0.012
          return (
            <polygon
              key={i}
              points={`${onX - yari},0 ${onX + yari},0 ${arkaX + 1},${tavanY} ${arkaX - 1},${tavanY}`}
              fill="#8ea0b8"
              opacity="0.30"
            />
          )
        })}

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
          KASA — ekranın çevresinde ince bir çerçeve. İçi BOŞ bırakılıyor,
          gerçek ekran oraya oturuyor.
        */}
        <rect
          x={eSol - kasa}
          y={eUst - kasa}
          width={wPx + kasa * 2}
          height={hPx + kasa * 2}
          fill="#13161a"
        />
        <rect
          x={eSol - kasa}
          y={eUst - kasa}
          width={wPx + kasa * 2}
          height={Math.max(0.5, kasa * 0.3)}
          fill="#5b636c"
          opacity="0.65"
        />

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
