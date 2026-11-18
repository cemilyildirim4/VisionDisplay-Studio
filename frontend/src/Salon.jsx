import { mekanOlcegi } from './mekanOlcek.js'

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
 * Salonun ölçeği (px/m) — DUVAR ölçüsünden hesaplanır.
 *
 * Eskiden salon ekrana orantılıydı: duvar kutularına ne yazılırsa yazılsın
 * oda aynı görünüyordu. Artık "Duvar" alanları gerçekten arka duvarı, "Ekran"
 * alanları da ekranı belirliyor; ikisi bağımsız ve ikisi de gerçek metre.
 *
 * Hesabın kendisi bütün mekânlarda ortak (bkz. mekanOlcek.js): duvar ölçüsünü
 * büyütünce odadaki duvar da büyüyor. Önceki "duvarı tuvale sığdır" kuralında
 * duvar her ölçüde tuvalin %62'sini kaplıyordu, yani duvar ölçüsünü
 * değiştirmek mekânda hiçbir şeyi değiştirmiyordu.
 */
export function salonOlcek(tuvalW, tuvalH, duvarWm, duvarHm) {
  return mekanOlcegi(tuvalW, tuvalH, duvarWm, duvarHm)
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
  /*
   * KAÇIŞ NOKTASININ YATAY KAYMASI (px).
   *
   * Tek kaçış noktalı bir çizimde kaçış noktasını yana kaydırmak, KAMERAYI
   * ÇEVİRMENİN tam karşılığıdır: bir yan duvar açılır, öteki kapanır. Sahte
   * bir efekt değil — arka duvar yerinde kalır, yalnızca bakış yönü döner.
   *
   * L tipi ekranda köşenin iki kanadı da okunsun diye kullanılıyor. Sıfırken
   * oda eskisi gibi tam karşıdan görünüyor, yani L seçili değilken hiçbir şey
   * değişmiyor.
   */
  kacisKaymasi = 0,
}) {
  if (!wPx || !hPx || !tuvalW || !tuvalH || !pxPerM) return null
  if (!(duvarWm > 0) || !(duvarHm > 0)) return null

  const m = pxPerM // 1 metrenin piksel karşılığı
  const cx = tuvalW / 2
  const cy = tuvalH / 2
  /* Kaçış noktası: merkezden kaydırılmış hâli. Arka duvar merkezde kalıyor. */
  const kx = cx + (Number(kacisKaymasi) || 0)

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
   * BAKIŞ YÜKSEKLİĞİ: AYAKTA DURAN BİR İNSANIN GÖZÜ.
   *
   * Kaçış noktası tuvalin tam ortasındaydı, yani kamera duvarın yarı
   * yüksekliğinden bakıyordu: 4 m'lik bir duvarda göz 2 m'de, 1 m'lik
   * duvarda 50 cm'de — her duvarda başka bir boydan. Oysa mekânı gezen
   * hep aynı insan. Göz artık zeminden 1,60 m'de; alçak duvarda ekrana
   * yukarıdan bakılıyor, yüksek duvarda ekran yukarıda kalıyor.
   *
   * SINIR: odanın tavanı duvarın kendisi (bkz. tavanY). Göz tavanın
   * üstüne çıkarsa tavan ile zemin yer değiştirir ve oda ters dönerdi;
   * bu yüzden alçak duvarlarda göz, duvar boyunun %80'inde kalıyor.
   */
  const GOZ_M = 1.6
  const ky = sahneY - Math.min(GOZ_M, duvarHm * 0.8) * m

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
  /*
   * Ön çerçeve tuvali her yönden aşmalı. Kaçış noktası artık ortada
   * olmadığı için katsayı dört kenarın HEPSİNDEN hesaplanıyor; eskisi
   * (tuval/duvar oranı) yalnızca ortadaki kaçış noktası için yeterliydi
   * ve göz aşağı indiğinde tavan tuvalin üstünü boş bırakıyordu.
   */
  const k =
    Math.max(
      kx / Math.max(1e-6, kx - duvarSol),
      (tuvalW - kx) / Math.max(1e-6, duvarSag - kx),
      ky / Math.max(1e-6, ky - tavanY),
      (tuvalH - ky) / Math.max(1e-6, sahneY - ky),
      1,
    ) * 1.06
  /*
   * Ön çerçeve, arka duvarın KAÇIŞ NOKTASI etrafında k katı büyütülmüş hâli.
   * Kaçış noktası kaydığında bu dört kenar da onunla birlikte kayıyor; sekiz
   * kenar yine tek noktada birleşiyor, perspektif tutarlı kalıyor.
   */
  const onSol = kx + (duvarSol - kx) * k
  const onSag = kx + (duvarSag - kx) * k
  const onUst = ky + (tavanY - ky) * k
  const onAlt = ky + (sahneY - ky) * k

  /** Arka duvar kenarındaki bir noktanın ön çerçevedeki karşılığı. */
  const ileri = (x, y) => [kx + (x - kx) * k, ky + (y - ky) * k]

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
          {/* Zemin derzleri yan duvarlara taşmasın. */}
          <clipPath id="salon-zemin-kirp">
            <polygon
              points={`${onSol},${onAlt} ${onSag},${onAlt} ${duvarSag},${sahneY} ${duvarSol},${sahneY}`}
            />
          </clipPath>
          <linearGradient id="salon-tavan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f2f4f7" />
            <stop offset="100%" stopColor="#dfe3ea" />
          </linearGradient>
          {/*
            ZEMİN — düz kahverengi bir levha yerine kademeli bir yüzey.

            Eski iki duraklı degrade, tuvalin alt yarısını tek parça koyu
            kahverengiye boyuyordu; yatay bir yüzey değil, arkada duran
            başka bir duvar gibi duruyordu (dış mekândaki zeminde de aynı
            sorun vardı ve orada derzlerle çözülmüştü).
          */}
          <linearGradient id="salon-zemin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cfc4b4" />
            <stop offset="35%" stopColor="#b6a893" />
            <stop offset="100%" stopColor="#8d7f6c" />
          </linearGradient>
          {/*
            KÖŞE GÖLGESİ — duvarların birleştiği yerdeki yumuşak kararma.
            Odanın kutu olduğunu çizgi çekmeden anlatıyor.
          */}
          <radialGradient id="salon-kose-golge" cx="0.5" cy="0.5" r="0.62">
            <stop offset="55%" stopColor="#2b3442" stopOpacity="0" />
            <stop offset="100%" stopColor="#2b3442" stopOpacity="0.16" />
          </radialGradient>
          <linearGradient id="salon-duvar-sol" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d3d8e0" />
            <stop offset="100%" stopColor="#f0f2f6" />
          </linearGradient>
          <linearGradient id="salon-duvar-sag" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f0f2f6" />
            <stop offset="100%" stopColor="#d3d8e0" />
          </linearGradient>
          {/*
            ARKA DUVAR ODANIN PARÇASI.

            Tonu yan duvarlardan belirgin biçimde açıktı; oda beyaz,
            ortasındaki duvar ayrı ve daha parlak bir levha gibi
            duruyordu — "arka duvardaki açık panel" denen şey buydu.
            Artık yan duvarların duvara komşu ucuyla (#f0f2f6) aynı
            tondan başlıyor ve çok az koyulaşıyor; sınırı yalnızca
            köşelerdeki yumuşak gölge çiziyor.
          */}
          <linearGradient id="salon-arka" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0f2f6" />
            <stop offset="100%" stopColor="#e6e9ef" />
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
            /*
             * ŞERİDİN ÖNE DOĞRU AÇILMASI SINIRLI.
             *
             * Genişlik tam perspektifle (×k) büyütülüyordu. k, ön çerçeveyi
             * tuvali taşıracak kadar büyütmek için seçiliyor ve küçük bir
             * duvarda 8–10'a çıkıyor: arkada 2 piksellik şerit önde 20
             * piksel oluyor ve tavanda dev çapraz bantlar beliriyordu —
             * "artefakt gibi duruyor" denen şey buydu. Gerçek bir aydınlatma
             * hattının eni de sabittir; perspektifte yalnızca bir miktar
             * genişler. Çarpan 2,2 ile sınırlı ve şerit çok daha sönük.
             */
            const arkaX = duvarSol + t * (duvarSag - duvarSol)
            const [onX, onY] = ileri(arkaX, tavanY)
            const arkaYari = Math.max(0.5, (duvarSag - duvarSol) * 0.004)
            const onYari = arkaYari * Math.min(k, 2.2)
            return (
              <polygon
                key={i}
                points={`${onX - onYari},${onY} ${onX + onYari},${onY} ${arkaX + arkaYari},${tavanY} ${arkaX - arkaYari},${tavanY}`}
                fill="#8ea0b8"
                opacity="0.09"
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
        {/*
          ZEMİN DERZLERİ — kaçış noktasında birleşen kaplama çizgileri.

          Dış mekânın zemininde kullanılan kuralın aynısı: kaçış noktasına
          giden derzler ve izleyiciye yaklaştıkça aralığı açılan enine
          çizgiler (perspektifte uzak sıralar sıkışır). İkisi de sönük;
          zemin ekranın önüne geçmemeli.
        */}
        <g clipPath="url(#salon-zemin-kirp)" opacity="0.4">
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t, i) => {
            const arkaX = duvarSol + t * (duvarSag - duvarSol)
            const [onX, onY] = ileri(arkaX, sahneY)
            return (
              <line
                key={`zd${i}`}
                x1={arkaX}
                y1={sahneY}
                x2={onX}
                y2={onY}
                stroke="#5d5142"
                strokeWidth={Math.max(0.6, tuvalW * 0.0011)}
              />
            )
          })}
          {[1, 2, 3, 4].map((i) => {
            const t = i / 4
            const y = sahneY + (onAlt - sahneY) * t * t
            return (
              <line
                key={`ze${i}`}
                x1={0}
                y1={y}
                x2={tuvalW}
                y2={y}
                stroke="#5d5142"
                strokeWidth={Math.max(0.6, tuvalW * 0.0009)}
                opacity="0.55"
              />
            )
          })}
        </g>

        {/*
          KÖŞE ÇİZGİLERİ — duvar/tavan/zemin birleşimleri.

          Eskiden 0,35 opaklıkta çizgilerdi ve arka duvarı çerçeveleyip onu
          mekândan ayrı bir levha gibi gösteriyordu. Artık yalnızca bir iz:
          odanın kutu olduğunu asıl köşe gölgesi anlatıyor.
        */}
        <g stroke="#9aa6b8" strokeWidth="1" opacity="0.16" fill="none">
          <polyline points={`${onSol},${onUst} ${duvarSol},${tavanY} ${duvarSag},${tavanY} ${onSag},${onUst}`} />
          <polyline points={`${onSol},${onAlt} ${duvarSol},${sahneY} ${duvarSag},${sahneY} ${onSag},${onAlt}`} />
          <line x1={duvarSol} y1={tavanY} x2={duvarSol} y2={sahneY} />
          <line x1={duvarSag} y1={tavanY} x2={duvarSag} y2={sahneY} />
        </g>

        {/* Köşelere doğru yumuşak kararma — odayı kutu yapan asıl şey. */}
        <rect x={0} y={0} width={tuvalW} height={tuvalH} fill="url(#salon-kose-golge)" />

        {/* Ekranın duvara vuran soğuk ışığı */}
        <ellipse cx={cx} cy={cy} rx={wPx * 1.35} ry={hPx * 1.9} fill="url(#salon-isik)" />

        {/*
          SAHNE ALNI KALDIRILDI.

          Duvarın tam dibinde, duvar genişliğinde gri bir bant çiziliyordu.
          Podyum kenarı olsun diye konmuştu ama odada podyum yok; yaptığı tek
          şey arka duvarı alttan çerçeveleyip onu ayrı bir levha gibi
          göstermekti. Duvarın zeminle birleştiği yeri köşe çizgisi ve köşe
          gölgesi zaten anlatıyor.
        */}

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
