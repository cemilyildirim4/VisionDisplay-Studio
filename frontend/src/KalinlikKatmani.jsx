/**
 * KABİN KALINLIĞI — tasarımın yan yüzü.
 *
 * Ekran duvara yapıştırılmış bir kâğıt değil; kabinin bir derinliği var ve
 * duvara açılı bakıldığında o derinlik görünür. Düz bakışta görünmez.
 *
 * NEDEN 3B DEĞİL. Bir ara derinlik gerçek bir 3B sahneyle (Mekan3D)
 * çiziliyordu. O katman dörtgenden yaklaşık bir duruş (yaw/pitch/roll)
 * türetiyor ve küçük perspektifi yutuyordu: kutu 47,7 piksel yamukken
 * tasarım 9,9 pikselde kalıyor, açısı 2,6 derece sapıyordu — tasarım
 * duvarın düzleminde durmuyor gibi görünüyordu. Burada tam tersi yapılıyor:
 * çizilen dörtgen KESİN olanı (dunyaDortgeni'nin verdiği), yan yüz de
 * doğrudan O dörtgenden türetiliyor. Yerleşim hiç bozulmuyor.
 *
 * YAN YÜZ DE KISALIR — EN ÖNEMLİ KURAL.
 *
 * Bir ara yan yüz, bakış açısı ne olursa olsun kabinin TAM derinliğinde
 * çiziliyordu. Sonuç saçmaydı: 32 santimlik bir ekranın yanında 10 santimlik
 * kabin, ekranın üçte biri kadar kalın kara bir şerit oluyordu. Oysa yana
 * döndükçe görünen şey derinliğin kendisi değil, onun İZDÜŞÜMÜ:
 *
 *   görünen yan genişliği = derinlik × sin(dönme açısı)
 *
 * Düz bakışta (açı 0) sinüs sıfırdır ve yan yüz hiç görünmez; 90 derecede
 * tam derinliği görürsün. Araya da doğru oranda dağılır.
 *
 * AÇI NEREDEN GELİYOR. Kullanıcı kutuyu tutamakla çevirdiyse açı zaten
 * biliniyor ve doğrudan veriliyor (yawRad). Verilmediğinde dörtgenin
 * kendisinden ölçülüyor: ön yüz döndükçe DARALIR, daralma oranı kosinüstür.
 *
 *   cos(açı) = (görünen genişlik ÷ piksel/metre) ÷ gerçek genişlik
 *
 * Yani ayrı bir kamera modeline, odak uzaklığına ya da tahmine gerek yok.
 *
 * HANGİ YAN GÖRÜNÜR. Perspektifte yakın kenar uzun, uzak kenar kısa görünür.
 * Görünen yan yüz YAKIN kenara ait: soldan bakınca panelin sol yanını
 * görürsün. Açı biliniyorsa yönü işareti söylüyor; bilinmiyorsa kenar
 * uzunluklarını karşılaştırmak söylüyor.
 *
 * DERİNLİK GERÇEK VERİ. Kabinin depthMm alanından geliyor (demo kabinde
 * 100 mm), tahmin değil.
 */

/* Bu açının altında yan yüz bir pikselin altına düşüyor: çizilmiyor. */
const EN_AZ_ACI = 0.0087 /* ~0,5 derece */
/* Bir pikselden ince bir şerit kalınlık hissi vermiyor, kir gibi duruyor. */
const EN_AZ_PIKSEL = 1.5

export default function KalinlikKatmani({
  koseler,
  derinlikMm,
  tasarimWm,
  tasarimHm,
  yawRad,
  tuvalW,
  tuvalH,
}) {
  if (!Array.isArray(koseler) || koseler.length !== 4) return null
  if (!(derinlikMm > 0) || !(tasarimHm > 0)) return null

  const [ust0, ust1, alt1, alt0] = koseler
  const uz = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)
  const solKenar = uz(ust0, alt0)
  const sagKenar = uz(ust1, alt1)
  if (!(solKenar > 0) || !(sagKenar > 0)) return null

  /*
   * Piksel/metre DİKEY kenardan: yatay eksende dönmek yüksekliği
   * değiştirmiyor, dolayısıyla ölçeği bozmayan kenar bu. İki kenarın
   * ortalaması perspektif farkını da dengeliyor.
   */
  const pxPerM = (solKenar + sagKenar) / 2 / tasarimHm
  if (!(pxPerM > 0)) return null

  const acililMi = Number.isFinite(yawRad) && Math.abs(yawRad) > EN_AZ_ACI

  /* Dönme açısının sinüsü: yan yüzün ne kadarının görüneceği. */
  let sinus
  if (acililMi) {
    sinus = Math.abs(Math.sin(yawRad))
  } else if (tasarimWm > 0) {
    /* Ön yüzün daralmasından: cos = görünen genişlik ÷ gerçek genişlik. */
    const genislikPx = (uz(ust0, ust1) + uz(alt0, alt1)) / 2
    const kosinus = Math.min(1, Math.max(0, genislikPx / pxPerM / tasarimWm))
    sinus = Math.sqrt(1 - kosinus * kosinus)
  } else {
    return null
  }
  if (!(sinus > 0)) return null

  const derinlikPx = (derinlikMm / 1000) * pxPerM * sinus
  if (!(derinlikPx > EN_AZ_PIKSEL)) return null

  /*
   * YÖN. Açı biliniyorsa işaretinden: duruş hesabında yaw > 0 sağ kenarı
   * kameraya yaklaştırıyor (bkz. durusKutusu.js), yani sol yan ancak yaw < 0
   * iken görünür. Açı bilinmiyorsa yakın kenar uzun görünendir.
   */
  const solYakin = acililMi ? yawRad < 0 : solKenar > sagKenar

  const yA = solYakin ? ust0 : ust1
  const yB = solYakin ? alt0 : alt1
  const uA = solYakin ? ust1 : ust0
  const uB = solYakin ? alt1 : alt0
  const yakinOrta = { x: (yA.x + yB.x) / 2, y: (yA.y + yB.y) / 2 }
  const uzakOrta = { x: (uA.x + uB.x) / 2, y: (uA.y + uB.y) / 2 }

  /*
   * DIŞARI YÖNÜ: uzak kenardan yakın kenara doğru. Panel duvardan izleyiciye
   * doğru çıktığı için yan yüz, yakın kenarın kadrajda DIŞ tarafında kalıyor.
   */
  const dx = yakinOrta.x - uzakOrta.x
  const dy = yakinOrta.y - uzakOrta.y
  const boy = Math.hypot(dx, dy)
  if (!(boy > 0)) return null

  const d = { x: (dx / boy) * derinlikPx, y: (dy / boy) * derinlikPx }
  /*
   * Yan yüz: yakın kenar + o kenarın derinlik kadar dışarı ötelenmiş hâli.
   * Köşe sırası kapalı bir dörtgen veriyor.
   */
  const yan = [yA, { x: yA.x + d.x, y: yA.y + d.y }, { x: yB.x + d.x, y: yB.y + d.y }, yB]
  const nokta = (k) => k.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <svg
      width={tuvalW}
      height={tuvalH}
      className="absolute inset-0"
      style={{ pointerEvents: 'none', zIndex: 5 }}
      data-pdf-gizle="hayir"
    >
      <defs>
        {/* Yan yüz dışa doğru koyulaşıyor: ışık panelin yüzünden geliyor. */}
        <linearGradient
          id="kabinYan"
          gradientUnits="userSpaceOnUse"
          x1={yA.x}
          y1={yA.y}
          x2={yA.x + d.x}
          y2={yA.y + d.y}
        >
          <stop offset="0" stopColor="#3f4650" />
          <stop offset="1" stopColor="#1c2027" />
        </linearGradient>
      </defs>
      <polygon points={nokta(yan)} fill="url(#kabinYan)" stroke="#11151b" strokeWidth="0.75" />
    </svg>
  )
}
