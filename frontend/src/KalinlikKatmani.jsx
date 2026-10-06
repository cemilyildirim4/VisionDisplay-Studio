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
 */

/* Kabinin kasa rengi, tam ışık alırken. Yüzler bunun parlaklıkla çarpımı. */
const KASA = { r: 86, g: 94, b: 107 }

function renk(parlaklik) {
  const p = Math.max(0, Math.min(1, parlaklik))
  return `rgb(${Math.round(KASA.r * p)},${Math.round(KASA.g * p)},${Math.round(KASA.b * p)})`
}

export default function KalinlikKatmani({ yuzler, tuvalW, tuvalH }) {
  if (!Array.isArray(yuzler) || yuzler.length === 0) return null
  const gecerli = yuzler.filter(
    (y) =>
      Array.isArray(y?.koseler) &&
      y.koseler.length === 4 &&
      y.koseler.every((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y)),
  )
  if (gecerli.length === 0) return null

  const nokta = (k) => k.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <svg
      width={tuvalW}
      height={tuvalH}
      className="absolute inset-0"
      style={{ pointerEvents: 'none', zIndex: 5 }}
      data-pdf-gizle="hayir"
    >
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
    </svg>
  )
}
