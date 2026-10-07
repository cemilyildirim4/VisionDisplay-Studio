/**
 * DUVARIN KÖŞEDEN DÖNEN YÜZÜ — fotoğraflı mekânda.
 *
 * Hazır fotoğraflı mekânlarda (AVM koridoru, şehir meydanı) duvar düz bir
 * yüzeydi: tam karşıdan görünen bir dikdörtgen, derinlik yok. L bir KÖŞE
 * ürünü olduğu için ikinci kanadın oturacağı bir yüzey gerekiyor; duvar
 * köşeden dönüyor ve yan yüzü izleyiciye doğru kaçıyor.
 *
 * NEDEN FOTOĞRAFIN KENDİ DOKUSU. Çizilmiş dış mekânda (Cephe.jsx) bu yüz düz
 * bir yüzey gradyanıyla doldurulabiliyor, çünkü cephenin kendisi de öyle
 * çiziliyor. Burada arkada gerçek bir fotoğraf var; yüzü düz bir renkle
 * doldurmak duvarın üstüne yapıştırılmış bir kâğıt gibi dururdu. Bu yüzden
 * yüz, fotoğrafın KENDİ duvar dokusundan bir şeritle dolduruluyor: aynı taş,
 * aynı kaplama, köşeden döndüğü için biraz daha sönük.
 *
 * DOKU AYNALANIYOR. Şerit, duvarın köşeye bakan kenarından alınıyor ve ters
 * çevriliyor; böylece dikişte iki yüz aynı pikselle buluşuyor ve köşede
 * görünür bir sıçrama olmuyor. Dokuyu köşenin dışından almak mümkün değil:
 * orada duvar yok (vitrin, gökyüzü, başka bina).
 *
 * Dörtgen burada hesaplanmıyor; iç/dış mekânla AYNI formülden geliyor
 * (bkz. lKose.js cepheYanYuzu, App.jsx fotoDuvarKosesi). Köşenin ekranla
 * hizalı kalması buna bağlı.
 */

import { koseDonusumu } from './homografi.js'

/* Yan yüzün ışığı: ön yüze göre bu oranda sönük (LKoseEkran ile aynı fikir). */
const KARARTMA = 0.78

export default function DuvarKose({ sahne, kutu, yuz }) {
  if (!sahne?.dosya || !sahne?.kaynak || !kutu) return null
  if (!yuz?.koseler || yuz.koseler.length !== 4) return null

  const { derinlikM, duvarWm, kose } = yuz
  const kaynakW = kutu.x1 - kutu.x0
  const kaynakH = kutu.y1 - kutu.y0
  if (!(kaynakW > 0) || !(kaynakH > 0)) return null
  if (!(duvarWm > 0) || !(derinlikM > 0)) return null

  /*
   * Şeridin kaynak genişliği: yüzün derinliği kadar metre, duvarın
   * fotoğraftaki çözünürlüğüyle. Duvardan geniş olamaz — o kadar duvar yok.
   */
  const kaynakPxM = kaynakW / duvarWm
  const w = Math.max(2, Math.min(kaynakW, derinlikM * kaynakPxM))
  /* Şerit köşeye bakan kenardan alınıyor: sol köşede soldan, sağda sağdan. */
  const x0 = kose === 'sag' ? kutu.x1 - w : kutu.x0

  const d = koseDonusumu(w, kaynakH, yuz.koseler)
  if (!d) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: w,
        height: kaynakH,
        /*
         * Sağdaki iki dönüşüm önce uygulanıyor: scale doku yönünü çeviriyor,
         * translate onu tekrar [0, w] aralığına getiriyor. Sonuç, dikişin
         * duvarın kendi kenar pikseliyle buluşması.
         */
        transform: `${d} translate(${w}px, 0px) scale(-1, 1)`,
        transformOrigin: '0 0',
        backgroundImage: `url("${sahne.dosya}")`,
        backgroundRepeat: 'no-repeat',
        /* Kaynak pikseli birebir: ölçeklemeyi dörtgen dönüşümü yapıyor. */
        backgroundSize: `${sahne.kaynak.w}px ${sahne.kaynak.h}px`,
        backgroundPosition: `${-x0}px ${-kutu.y0}px`,
        filter: `brightness(${KARARTMA})`,
      }}
    />
  )
}
