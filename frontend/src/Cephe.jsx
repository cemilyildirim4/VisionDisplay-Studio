/**
 * DIŞ MEKÂN — bina cephesi. Çizim, fotoğraf değil.
 *
 * Toplantı salonuyla (Salon.jsx) BİREBİR aynı mantık, farklı çevre:
 *
 *   • "Duvar" alanları gerçekten cepheyi (ekranın monte edildiği yüzeyi)
 *     belirler, "Ekran" alanları ekranı. İkisi bağımsız.
 *   • İkisi de aynı px/m ölçeğinde çizilir; böylece ekranın cepheye göre ne
 *     kadar yer kapladığı doğrudan okunur. Ekran cepheden büyükse taşar —
 *     bu hata değil, bilgi.
 *   • Ekranın yeri BOŞ bırakılır; gerçek ekran oraya oturur.
 *
 * Fotoğraf yerine çizim olmasının sebebi Salon.jsx'te anlatılıyor: hazır bir
 * fotoğrafın duvarı kaç metre bilinmiyor ve fotoğrafın kendi LED panosu bizim
 * ekranımızla iç içe iki dikdörtgen oluşturuyordu.
 */


/**
 * Cephenin tuvale sığması için ölçek (px/m) — DUVAR ölçüsünden hesaplanır.
 *
 * 0,62: yanlarda gökyüzü ve komşu binalar, altta kaldırım görünsün diye pay
 * bırakılıyor. Cephe tuvali baştan başa kaplasaydı dış mekân değil düz bir
 * yüzey gibi dururdu. Salon.jsx ile aynı oran — iki mekân arasında geçiş
 * yapınca ekranın büyüklüğü zıplamasın diye.
 */
export function cepheOlcek(tuvalW, tuvalH, duvarWm, duvarHm) {
  if (!tuvalW || !tuvalH || !(duvarWm > 0) || !(duvarHm > 0)) return null
  return Math.min((tuvalW * 0.62) / duvarWm, (tuvalH * 0.62) / duvarHm)
}

export default function Cephe({
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

  // Kasa gerçek ölçüde (5 cm) ama ekrana göre sınırlı — bkz. Salon.jsx

  // CEPHE — doğrudan duvar ölçüsünden, ekranla aynı ölçekte
  const duvarW = duvarWm * m
  const duvarH = duvarHm * m
  const sol = cx - duvarW / 2
  const sag = cx + duvarW / 2
  const ust = cy - duvarH / 2
  const alt = cy + duvarH / 2 // cephenin kaldırımla birleştiği çizgi

  // Kaldırım, cephenin dibinden başlar; tuvalin altı sokak
  const kaldirimH = Math.max(4, Math.min(tuvalH - alt, duvarH * 0.06))
  // Zeminin başladığı çizgi (kaldırımın bittiği yer) ve kalan yükseklik
  const ufukY = alt + kaldirimH
  const zeminH = tuvalH - ufukY

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0" width={tuvalW} height={tuvalH}>
        <defs>
          {/*
            RENKLER — katmanlar birbirinden AÇIK SEÇİK ayrılsın diye seçildi.
            İlk denemede hepsi soluk pastel tonlardaydı; gökyüzü, komşu binalar
            ve cephe birbirine karışıp tek bir gri leke gibi duruyordu. Şimdi
            her katman bir öncekinden belirgin biçimde koyu ya da açık:
            gökyüzü doygun mavi → cephe sıcak krem → sokak koyu asfalt.
          */}
          <linearGradient id="cephe-gok" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2b6fae" />
            <stop offset="45%" stopColor="#7ab6de" />
            <stop offset="80%" stopColor="#c8e2f1" />
            <stop offset="100%" stopColor="#eddfd0" />
          </linearGradient>
          {/* Ufuktaki gün ışığı — gökyüzünü düz bir mavi levha olmaktan çıkarır */}
          <radialGradient id="cephe-ufuk-isik" cx="0.5" cy="1" r="0.75">
            <stop offset="0%" stopColor="#ffe7c4" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#ffd9a8" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ffd9a8" stopOpacity="0" />
          </radialGradient>
          {/* Cephe yüzeyi — iç mekândaki arka duvarla (Salon.jsx) aynı ton */}
          <linearGradient id="cephe-yuzey" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eef0f4" />
            <stop offset="100%" stopColor="#dcdfe6" />
          </linearGradient>
          <linearGradient id="cephe-sokak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5c626a" />
            <stop offset="100%" stopColor="#3a3f46" />
          </linearGradient>
          {/*
            ŞEHİR SİLÜETİ — iki katman, ikisi de HAVA PERSPEKTİFİYLE soluyor.
            Uzaktaki katman gökyüzüne daha yakın bir tonda; yakındaki bir tık
            daha koyu. Gerçek şehirde uzaklık böyle okunur ve göz sıralamayı
            kendiliğinden yapar.

            ÖNCESİ: cephenin iki yanında, ekranla neredeyse aynı yükseklikte
            iki büyük gri yamuk vardı. Derz ve kat çizgileriyle birlikte
            "komşu bina" değil, ekranı iki yandan sıkıştıran duvarlar gibi
            duruyordu; dış mekân hissi hiç yoktu.
          */}
          <linearGradient id="cephe-silu-uzak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a9c2d6" />
            <stop offset="100%" stopColor="#d6e4ee" />
          </linearGradient>
          <linearGradient id="cephe-silu-yakin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8fa8c0" />
            <stop offset="100%" stopColor="#c3d3e0" />
          </linearGradient>
          {/* Ufuk pusu — silüetin dibini gökyüzünde eritir */}
          <linearGradient id="cephe-pus" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8e2f1" stopOpacity="0" />
            <stop offset="70%" stopColor="#d8e9f4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#eddfd0" stopOpacity="0.75" />
          </linearGradient>
          {/* Ekranın cepheye vuran ışığı */}
          <radialGradient id="cephe-isik" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#9dc6ee" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#9dc6ee" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Gökyüzü — tuvalin tamamı, cephe bunun önünde durur */}
        <rect x={0} y={0} width={tuvalW} height={tuvalH} fill="url(#cephe-gok)" />

        {/* Ufuk ışığı — gökyüzünün alt yarısına sıcak bir hava katar */}
        <rect x={0} y={0} width={tuvalW} height={alt} fill="url(#cephe-ufuk-isik)" />

        {(() => {
          /*
           * UZAKTAKİ ŞEHİR — cephenin arkasında, ufka yakın.
           *
           * ÖNCEKİ HÂLİ YAPAY DURUYORDU. Sebepleri tek tek:
           *   • Fazla YÜKSEKTİLER. Cephenin yarısına kadar çıkan bloklar
           *     "uzaktaki şehir" değil, hemen yanı başındaki binalar gibi
           *     okunuyordu; oysa hepsi arka plan olmalı.
           *   • Fazla KOYUYDULAR. Uzaktaki her şey havanın pusuyla gökyüzüne
           *     yaklaşır. Gökten belirgin biçimde ayrılan bir gri, kartondan
           *     kesilmiş gibi durur.
           *   • Beyaz PENCERE ŞERİTLERİ vardı. Bu ölçekte tek tek pencere
           *     görünmez; parlak beyaz bantlar oyuncak binası hissi veriyordu.
           *
           * Şimdi: alçak, gökyüzüne yakın tonda, penceresiz siluet. Biçim
           * çeşitliliği (ince kule, geniş blok, kademeli çatı, anten) ve
           * üstüne binen pus, "şehir" hissini pencere çizmeden veriyor.
           *
           * Ölçüler cepheye oranlı — duvar ölçüsü değişince silüet de onunla
           * büyür. Dizi sabit: her çizimde aynı şehir, bloklar oynamaz.
           */
          const solYer = Math.max(0, sol)
          const sagYer = Math.max(0, tuvalW - sag)
          if (solYer < 16 && sagYer < 16) return null

          // [genişlik payı, yükseklik payı, tip] · tip: 0 düz · 1 kademeli · 2 antenli
          const UZAK = [
            [0.26, 0.15, 0], [0.15, 0.24, 2], [0.30, 0.11, 0],
            [0.19, 0.19, 1], [0.24, 0.13, 0],
          ]
          const YAKIN = [
            [0.34, 0.10, 0], [0.20, 0.17, 1], [0.28, 0.08, 0], [0.22, 0.13, 0],
          ]
          const UZAK_SAG = [...UZAK].reverse()
          const YAKIN_SAG = [...YAKIN].reverse()

          const seri = (x0, genislik, liste, dolgu, taban, anahtar, yon) => {
            if (genislik < 16) return null
            let imlec = x0
            const parcalar = []
            liste.forEach(([gp, yp, tip], i) => {
              const w = genislik * gp
              const h = duvarH * yp
              const x = yon > 0 ? imlec : imlec - w
              const y = taban - h
              parcalar.push(
                <g key={anahtar + i}>
                  <rect x={x} y={y} width={w} height={h} fill={dolgu} />
                  {/* Kademeli çatı: üstte daha dar bir kat */}
                  {tip === 1 && (
                    <rect
                      x={x + w * 0.22}
                      y={y - h * 0.22}
                      width={w * 0.56}
                      height={h * 0.22}
                      fill={dolgu}
                    />
                  )}
                  {/* Anten/kule — siluete dikey bir vurgu, hepsi kutu olmasın */}
                  {tip === 2 && (
                    <rect
                      x={x + w * 0.46}
                      y={y - h * 0.3}
                      width={Math.max(0.8, w * 0.07)}
                      height={h * 0.3}
                      fill={dolgu}
                    />
                  )}
                </g>,
              )
              imlec += yon * (w + genislik * 0.035)
            })
            return parcalar
          }

          const usta = Math.min(alt, ust + duvarH * 0.42) // silüetin çıkabileceği en üst hat
          return (
            <>
              {/* Uzak sıra — gökyüzüne en yakın ton, neredeyse pus */}
              <g opacity="0.55">
                {seri(sol, solYer, UZAK, 'url(#cephe-silu-uzak)', alt - duvarH * 0.02, 'us', -1)}
                {seri(sag, sagYer, UZAK_SAG, 'url(#cephe-silu-uzak)', alt - duvarH * 0.02, 'ud', 1)}
              </g>
              {/* Yakın sıra — bir tık belirgin, tabanı kaldırım hizasında */}
              <g opacity="0.7">
                {seri(sol, solYer, YAKIN, 'url(#cephe-silu-yakin)', alt, 'ys', -1)}
                {seri(sag, sagYer, YAKIN_SAG, 'url(#cephe-silu-yakin)', alt, 'yd', 1)}
              </g>
              {/*
                PUS — silüetin dibine doğru koyulaşan gökyüzü rengi. Uzaktaki
                yapıların ayakları havada erir; keskin biten bir silüet maket
                gibi durur.
              */}
              <rect
                x={0}
                y={usta}
                width={tuvalW}
                height={Math.max(1, alt - usta)}
                fill="url(#cephe-pus)"
              />
            </>
          )
        })()}

        {/* Sokak */}
        <rect x={0} y={alt} width={tuvalW} height={tuvalH - alt} fill="url(#cephe-sokak)" />
        {/* Kaldırım — cephenin dibindeki açık şerit */}
        <rect x={0} y={alt} width={tuvalW} height={kaldirimH} fill="#b8bec5" />

        {/*
          ZEMİN PERSPEKTİFİ.
          Düz bir degrade dikdörtgen, yere değil arkadaki başka bir duvara
          benziyordu — yatay yüzey olduğunu anlatan hiçbir işaret yoktu.
          Yüzeyi yere çeviren iki şey ekleniyor:

          1) Kaçış noktasına doğru daralan kaplama derzleri. Kaçış noktası
             kaldırımın hizasında (cx, ufuk) — cepheyle aynı bakış açısı.
          2) İzleyiciye yaklaştıkça ARALIĞI AÇILAN enine çizgiler. Perspektifte
             uzaktaki sıralar sıkışır; eşit aralıklı çizseydik yine düz bir
             yüzey gibi dururdu. Aralık t² ile büyütülüyor.

          İkisi de sönük: zemin ekranın önüne geçmemeli.
        */}
        {zeminH > 8 && (
          <g opacity="0.5">
            {/* Derzler — kaçış noktasından tuvalin altına doğru açılan ışın */}
            {[-1.15, -0.72, -0.38, -0.12, 0.12, 0.38, 0.72, 1.15].map((k, i) => (
              <line
                key={`d${i}`}
                x1={cx}
                y1={ufukY}
                x2={cx + k * tuvalW}
                y2={tuvalH}
                stroke="#20242a"
                strokeWidth={Math.max(0.6, tuvalW * 0.0012)}
                opacity="0.5"
              />
            ))}
            {/* Enine çizgiler — aşağı indikçe aralık açılıyor */}
            {[1, 2, 3, 4, 5].map((i) => {
              const t = i / 5
              const y = ufukY + (tuvalH - ufukY) * t * t
              return (
                <line
                  key={`e${i}`}
                  x1={0}
                  y1={y}
                  x2={tuvalW}
                  y2={y}
                  stroke="#20242a"
                  strokeWidth={Math.max(0.6, tuvalW * 0.001)}
                  opacity="0.35"
                />
              )
            })}
          </g>
        )}
        {/* Ufka yakın ince açık bant — uzaklık pusu, derinliği pekiştirir */}
        {zeminH > 8 && (
          <rect
            x={0}
            y={ufukY}
            width={tuvalW}
            height={Math.max(1, zeminH * 0.06)}
            fill="#aab2bb"
            opacity="0.45"
          />
        )}

        {/* Binanın kaldırıma düşen gölgesi — cepheyi zemine oturtur */}
        <rect
          x={sol}
          y={alt}
          width={duvarW}
          height={Math.max(1, kaldirimH * 0.45)}
          fill="#5c626a"
          opacity="0.28"
        />

        {/* CEPHE — ekranın monte edildiği yüzey */}
        <rect x={sol} y={ust} width={duvarW} height={duvarH} fill="url(#cephe-yuzey)" />
        {/*
          CEPHEYE KARAKTER — üç ince ayrıntı, hiçbiri ekranla yarışmıyor:
            • Panel derzleri: düz beyaz levha kâğıt gibi duruyordu; ince
              düşey çizgiler yüzeyi kaplama panellere böler.
            • Parapet: çatı hattındaki açık şerit. Binanın nerede bittiğini
              gösterir; onsuz cephe gökyüzüne yapışık duruyordu.
            • Zemin kotu: cephenin dibindeki koyu şerit (bodrum/giriş bandı).
        */}
        <g opacity="0.5">
          {[0.2, 0.4, 0.6, 0.8].map((k) => (
            <line
              key={k}
              x1={sol + duvarW * k}
              y1={ust}
              x2={sol + duvarW * k}
              y2={alt}
              stroke="#b9c1cc"
              strokeWidth={Math.max(0.5, tuvalW * 0.0008)}
            />
          ))}
        </g>
        <rect
          x={sol}
          y={ust}
          width={duvarW}
          height={Math.max(1.5, duvarH * 0.022)}
          fill="#ffffff"
          opacity="0.75"
        />
        <rect
          x={sol}
          y={ust + Math.max(1.5, duvarH * 0.022)}
          width={duvarW}
          height={Math.max(0.6, duvarH * 0.005)}
          fill="#9aa3ae"
          opacity="0.45"
        />
        <rect
          x={sol}
          y={alt - Math.max(2, duvarH * 0.03)}
          width={duvarW}
          height={Math.max(2, duvarH * 0.03)}
          fill="#c3cad3"
          opacity="0.7"
        />
        {/*
          Cephenin üst kenarındaki kahverengi saçak KALDIRILDI. Binaya karakter
          katsın diye eklenmişti ama duvarın üstünde asılı duran, hangi
          malzeme olduğu anlaşılmayan bir şerit gibi görünüyor ve gözü
          ekrandan alıyordu. Cephe düz yüzey olarak kalıyor.
        */}

        {/* Ekranın cepheye vuran soğuk ışığı */}
        <ellipse cx={cx} cy={cy} rx={wPx * 1.35} ry={hPx * 1.9} fill="url(#cephe-isik)" />

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
      </svg>
    </div>
  )
}
