/**
 * KABİNİN GÖVDESİ — ekranın arkasındaki kutu.
 *
 * Ekran duvara yapıştırılmış bir kâğıt değil; kabinin bir derinliği var ve
 * duvara açılı bakıldığında o derinlik görünür.
 *
 * NEDEN ELLE ÇİZİLEN ŞERİT DEĞİL. Kalınlık bir süre tek bir dörtgendi:
 * yakın kenarın yanına derinlik kadar bir şerit konuyordu. Geometrisi kabaca
 * doğru olsa da sonradan yapıştırılmış bir çizim gibi duruyordu, çünkü
 * gerçek bir kutu tek yüz göstermez — açıya göre yanını, üstünü ya da altını
 * birlikte gösterir ve her yüz ışığa göre farklı parlar.
 *
 * Artık kabinin sekiz köşesi de hesaplanıyor ve tasarımı yerine koyan
 * kamerayla AYNI izdüşümden geçiyor (bkz. durusKutusu.js kutuGovdesi).
 * Hangi yüzün görüneceğini ve ne kadar parlayacağını o hesap söylüyor;
 * burada yapılan iş yalnızca çizmek.
 *
 * NEDEN 3B MOTOR DEĞİL. Bir ara derinlik gerçek bir 3B sahneyle (Mekan3D)
 * çiziliyordu. O katman dörtgenden YAKLAŞIK bir duruş türetiyor ve küçük
 * perspektifi yutuyordu: kutu 47,7 piksel yamukken tasarım 9,9 pikselde
 * kalıyor, açısı 2,6 derece sapıyordu. Burada duruş zaten biliniyor —
 * tasarımın dörtgeni ondan ÜRETİLİYOR — dolayısıyla gövde tasarımdan
 * kopamıyor. Ölçüldü: ön yüz, tasarımın dörtgeniyle 0,000 piksel farklı.
 *
 * KOYU ARKA PLANDA KENAR IŞIĞI.
 *
 * Kabin koyu gri bir kutu. Beyaz zeminde gövde hemen okunuyor ama koyu bir
 * fotoğrafın (siyah kapı, gece sahnesi) önünde koyu yüz koyu zemine karışıyor
 * ve ekran yine düz görünüyordu — kullanıcının "arka planın dışında 3B
 * duruyor, içinde durmuyor" dediği durum buydu: gövde çiziliyordu ama
 * görünmüyordu.
 *
 * Ön yüzle yan yüzün paylaştığı kenara ince bir açık çizgi konuyor. Gerçek
 * bir kabinin kenarındaki ışık yansıması bu; açık zeminde göze batmıyor,
 * koyu zeminde kutunun sınırını çiziyor.
 *
 * DÜZ BAKIŞTA DERİNLİĞİ GÖLGE OKUTUYOR.
 *
 * Ekrana tam karşıdan bakıldığında kabinin hiçbir yanı görünmez — bu doğru,
 * ama ekran da duvara yapışık bir kâğıt gibi durur. Gerçekte duvardan çıkan
 * bir cisim duvara GÖLGE düşürür ve o konumda derinliği okutan tek şey odur.
 * Gölge, ön yüzün ışığın tersine ötelenmiş ve yumuşatılmış kopyası; ön yüzün
 * altında kalan kısmı maskeyle çıkarılıyor, yani yalnızca ekranın DIŞINDA
 * görünüyor, üstüne binmiyor.
 */

/* Kabinin kasa rengi, tam ışık alırken. Yüzler bunun parlaklıkla çarpımı. */
const KASA = { r: 86, g: 94, b: 107 }

/* Işık sol üstten geldiği için gölge sağ alta düşüyor (birim yön). */
const GOLGE_YON = { x: 0.62, y: 0.78 }

function renk(parlaklik) {
  const p = Math.max(0, Math.min(1, parlaklik))
  return `rgb(${Math.round(KASA.r * p)},${Math.round(KASA.g * p)},${Math.round(KASA.b * p)})`
}

/* Ön yüzün hangi kenarını paylaştığı: kenar ışığı oraya çiziliyor. */
const PAYLASILAN_KENAR = { sol: [0, 3], sag: [1, 2], ust: [0, 1], alt: [3, 2] }

const dortgenMi = (k) =>
  Array.isArray(k) && k.length === 4 && k.every((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y))

export default function KalinlikKatmani({ yuzler, on, tuvalW, tuvalH }) {
  const onVar = dortgenMi(on)
  const gecerli = (Array.isArray(yuzler) ? yuzler : []).filter((y) => dortgenMi(y?.koseler))
  if (!onVar && gecerli.length === 0) return null

  const nokta = (k) => k.map((p) => `${p.x},${p.y}`).join(' ')

  /* Gölgenin ötelenmesi ve yumuşaması ekranın kendi boyuna oranlı. */
  const golge = (() => {
    if (!onVar) return null
    const uz = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)
    const olcu = (uz(on[0], on[1]) + uz(on[1], on[2])) / 2
    if (!(olcu > 0)) return null
    const kayma = Math.max(3, olcu * 0.045)
    return {
      koseler: on.map((p) => ({ x: p.x + GOLGE_YON.x * kayma, y: p.y + GOLGE_YON.y * kayma })),
      bulanik: Math.max(2, olcu * 0.022),
    }
  })()

  return (
    <svg
      width={tuvalW}
      height={tuvalH}
      className="absolute inset-0"
      style={{ pointerEvents: 'none', zIndex: 5 }}
      data-pdf-gizle="hayir"
    >
      <defs>
        {golge && (
          <>
            <filter id="kabinGolge" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation={golge.bulanik} />
            </filter>
            <mask id="kabinGolgeMaske">
              <rect x="0" y="0" width={tuvalW} height={tuvalH} fill="#fff" />
              <polygon points={nokta(on)} fill="#000" />
            </mask>
          </>
        )}
        {/* Yan yüz dışa doğru koyulaşmıyor; düz renk + kenar çizgisi yetiyor. */}
      </defs>

      {golge && (
        <g mask="url(#kabinGolgeMaske)">
          <polygon points={nokta(golge.koseler)} fill="rgba(8,10,14,0.42)" filter="url(#kabinGolge)" />
        </g>
      )}

      {gecerli.map((y) => (
        <polygon
          key={y.ad}
          points={nokta(y.koseler)}
          fill={renk(y.parlaklik)}
          /*
            Yüzler arasındaki kenar çizgisi: iki yüz birbirine çok yakın
            parlaklıkta olduğunda ayrım kalmıyor ve kutu düz bir leke gibi
            görünüyor. İnce koyu çizgi kenarı okutuyor.
          */
          stroke="rgba(10,13,17,0.55)"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
      ))}

      {/* Kenar ışığı: ön yüzle yan yüzün paylaştığı kenar. */}
      {onVar &&
        gecerli.map((y) => {
          const u = PAYLASILAN_KENAR[y.ad]
          if (!u) return null
          return (
            <line
              key={'kenar-' + y.ad}
              x1={on[u[0]].x}
              y1={on[u[0]].y}
              x2={on[u[1]].x}
              y2={on[u[1]].y}
              /*
                KENAR IŞIĞI KIL İNCELİĞİNDE.

                İlk hâli (beyaza yakın, %75 opak, 1,1 piksel) ekranın kenarında
                belirgin beyaz bir şerit gibi duruyordu. Amaç kutunun sınırını
                sezdirmek, parlak bir çizgi çizmek değil: yüzler zaten ortam
                ışığıyla zeminden ayrışıyor, bu yalnızca köşeyi okutuyor.
              */
              stroke="rgba(226,232,240,0.22)"
              strokeWidth="0.7"
              strokeLinecap="round"
            />
          )
        })}
    </svg>
  )
}
