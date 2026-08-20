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

const KASA = 0.05 // kasa kalınlığı, metre

const sinirla = (v, alt, ust) => Math.min(Math.max(v, alt), ust)

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
  const kasa = sinirla(KASA * m, 1.5, wPx * 0.02)

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
            <stop offset="0%" stopColor="#2f7cc0" />
            <stop offset="55%" stopColor="#71b3e0" />
            <stop offset="100%" stopColor="#bcdcf0" />
          </linearGradient>
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
            KOMŞU BİNA RENKLERİ.
            Eskiden tek düz koyu mavi (#4a5a70) idi; gökyüzünün yanında ham bir
            lacivert leke gibi duruyordu. Artık ikisi de yukarıda koyu, ufka
            doğru açılan gri-mavi: uzaklaştıkça havanın pusa dönmesi. Sol yüzey
            ışık alan taraf olduğu için bir tık açık, sağ taraf gölgede —
            biçimler simetrik, ayrımı yalnızca ışık yapıyor.
          */}
          <linearGradient id="cephe-bina-sol" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#68788c" />
            <stop offset="100%" stopColor="#9aa7b4" />
          </linearGradient>
          <linearGradient id="cephe-bina-sag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#55647a" />
            <stop offset="100%" stopColor="#8794a3" />
          </linearGradient>
          {/* Ekranın cepheye vuran ışığı */}
          <radialGradient id="cephe-isik" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#9dc6ee" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#9dc6ee" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Gökyüzü — tuvalin tamamı, cephe bunun önünde durur */}
        <rect x={0} y={0} width={tuvalW} height={tuvalH} fill="url(#cephe-gok)" />

        {/*
          KOMŞU BİNALAR — cephenin iki yanında, geride kalan yapılar.
          Sönük tutuluyorlar: derinlik hissi versinler ama ekranla yarışmasınlar.
          Gökyüzünden belirgin biçimde koyular; daha açık bir tonda bina değil,
          ufuktaki pus gibi duruyorlardı.

          SİMETRİ: İki yanın yüksekliği farklı oranlardaydı (0,72 ve 0,84);
          sol ve sağ blok gözle görülür biçimde farklı boyda duruyor, sahne
          yamuk görünüyordu. Artık ikisi de AYNI oranda — fark yalnızca ışıkta.

          PERSPEKTİF: Düz dikdörtgen olduklarında yere dik duran yapılar değil,
          arka planda duran koyu bir bant gibi görünüyorlardı. Artık iki kenar
          da AYNI kaçış noktasına (cx, ufuk) aynı oranda çekiliyor — üst kenar
          iniyor, alt kenar yükseliyor. Aynı oran şart: farklı olursa yüzey tek
          bir noktada buluşmaz, perspektif değil çarpılma gibi okunur.

          Derinliği pekiştiren iki ayrıntı:
            • Dikey derzler cepheye yaklaştıkça SIKLAŞIYOR (t² dağılımı).
              Eşit aralıklı olsalardı yamuk yine düz bir yüzey gibi dururdu.
            • Kat çizgileri yüzeyi boydan boya geçiyor; taperlı dörtgende
              kendiliğinden kaçış noktasına doğru toplanıyorlar.
        */}
        {[
          { dis: 0, ic: sol, dolgu: 'url(#cephe-bina-sol)' },
          { dis: tuvalW, ic: sag, dolgu: 'url(#cephe-bina-sag)' },
        ].map((b, i) => {
          const genislik = Math.abs(b.ic - b.dis)
          if (genislik <= 2) return null
          const disUst = ust + duvarH * 0.22
          // İç kenar (cepheye bitişen) uzakta kalır: üst ve alt, kaçış
          // noktasına aynı oranda (S) yaklaşır.
          const S = 0.42
          const icUst = disUst + (ufukY - disUst) * S
          const icAlt = alt + (ufukY - alt) * S
          const cizgi = Math.max(0.6, tuvalW * 0.0012)
          return (
            <g key={i}>
              <polygon
                points={`${b.dis},${disUst} ${b.ic},${icUst} ${b.ic},${icAlt} ${b.dis},${alt}`}
                fill={b.dolgu}
              />
              {/* Cepheye yaklaştıkça sıklaşan derzler — t² ile dağıtılıyor */}
              {[1, 2, 3, 4, 5].map((k) => {
                const t = 1 - (k / 6) * (k / 6) // dış kenarda seyrek, içte sık
                const x = b.dis + (b.ic - b.dis) * t
                const y1 = disUst + (icUst - disUst) * t
                const y2 = alt + (icAlt - alt) * t
                return (
                  <line
                    key={k}
                    x1={x}
                    y1={y1}
                    x2={x}
                    y2={y2}
                    stroke="#33414f"
                    strokeWidth={cizgi}
                    opacity="0.35"
                  />
                )
              })}
              {/* Kat çizgileri — dörtgen daraldıkça kendiliğinden yaklaşırlar */}
              {[0.22, 0.44, 0.66, 0.88].map((k) => (
                <line
                  key={`k${k}`}
                  x1={b.dis}
                  y1={disUst + (alt - disUst) * k}
                  x2={b.ic}
                  y2={icUst + (icAlt - icUst) * k}
                  stroke="#33414f"
                  strokeWidth={cizgi}
                  opacity="0.22"
                />
              ))}
              {/*
                Cepheye bitişen kenardaki koyu gölge KALDIRILDI: duvarın rengini
                değiştiriyor, yüzeyin yarısını asıl tondan başka bir renge
                çekiyordu. Derinliği yamuk biçim, sıklaşan derzler ve ufka doğru
                açılan degrade zaten veriyor.
              */}
            </g>
          )
        })}

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

        {/* CEPHE — ekranın monte edildiği yüzey */}
        <rect x={sol} y={ust} width={duvarW} height={duvarH} fill="url(#cephe-yuzey)" />
        {/*
          Cephenin üst kenarındaki kahverengi saçak KALDIRILDI. Binaya karakter
          katsın diye eklenmişti ama duvarın üstünde asılı duran, hangi
          malzeme olduğu anlaşılmayan bir şerit gibi görünüyor ve gözü
          ekrandan alıyordu. Cephe düz yüzey olarak kalıyor.
        */}

        {/* Ekranın cepheye vuran soğuk ışığı */}
        <ellipse cx={cx} cy={cy} rx={wPx * 1.35} ry={hPx * 1.9} fill="url(#cephe-isik)" />

        {/*
          KASA — ekranın çevresinde ince çerçeve. İçi BOŞ, gerçek ekran oraya
          oturuyor.
        */}
        {ekranSekli && ekranSekli.length > 2 ? (
          /*
            KASA, EKRANIN DIŞ HATTINI İZLER. İç L tipi ekranın arkasında
            dikdörtgen bir çerçeve duruyordu; köşesi kırık ekranla çerçeve
            birbirini tutmuyordu.

            Şekil bir yol olarak çiziliyor ve kalınlığı 2×kasa olan bir konturla
            genişletiliyor: konturun dış yarısı çerçeveyi yapar, iç yarısı zaten
            ekranın altında kalır. Böylece köşe kırılmasında da kalınlık sabit
            kalıyor.
          */
          <path
            d={
              ekranSekli
                .map(([nx, ny], i) => `${i ? "L" : "M"}${(eSol + nx * wPx).toFixed(2)},${(eUst + ny * hPx).toFixed(2)}`)
                .join(" ") + " Z"
            }
            fill="#13161a"
            stroke="#13161a"
            strokeWidth={kasa * 2}
            strokeLinejoin="miter"
          />
        ) : (
          <rect
            x={eSol - kasa}
            y={eUst - kasa}
            width={wPx + kasa * 2}
            height={hPx + kasa * 2}
            fill="#13161a"
          />
        )}
        <rect
          x={eSol - kasa}
          y={eUst - kasa}
          width={wPx + kasa * 2}
          height={Math.max(0.5, kasa * 0.3)}
          fill="#5b636c"
          opacity="0.65"
        />
      </svg>
    </div>
  )
}
