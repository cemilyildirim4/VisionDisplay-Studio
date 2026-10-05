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
 * HANGİ YAN GÖRÜNÜR. Perspektifte yakın kenar uzun, uzak kenar kısa görünür.
 * Görünen yan yüz YAKIN kenara ait: soldan bakınca panelin sol yanını
 * görürsün. Kenar uzunluklarını karşılaştırmak hangi tarafın yakın olduğunu
 * söylüyor — ayrı bir kamera modeline gerek yok.
 *
 * DERİNLİK GERÇEK VERİ. Kabinin depthMm alanından geliyor (demo kabinde
 * 100 mm), tahmin değil. Piksele çevrim yakın kenarın kendi ölçeğiyle:
 *   px/metre = yakınKenarPiksel / tasarımBoyuMetre
 */

/* Kenarlar bu orandan az ayrışıyorsa bakış neredeyse diktir: yan yüz görünmez. */
const EN_AZ_FARK = 0.015

export default function KalinlikKatmani({ koseler, derinlikMm, tasarimHm, tuvalW, tuvalH }) {
  if (!Array.isArray(koseler) || koseler.length !== 4) return null
  if (!(derinlikMm > 0) || !(tasarimHm > 0)) return null

  const [ust0, ust1, alt1, alt0] = koseler
  const uz = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)
  const solKenar = uz(ust0, alt0)
  const sagKenar = uz(ust1, alt1)
  if (!(solKenar > 0) || !(sagKenar > 0)) return null

  const ortalama = (solKenar + sagKenar) / 2
  const fark = Math.abs(solKenar - sagKenar) / ortalama
  /* Düz bakışta kalınlık görünmez — zorlamak yanlış bir derinlik hissi verir. */
  if (fark < EN_AZ_FARK) return null

  const solYakin = solKenar > sagKenar
  /* Yakın kenarın iki ucu ve uzak kenarın orta noktası. */
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
  const ux = dx / boy
  const uy = dy / boy

  /* Derinliğin piksel karşılığı, yakın kenarın kendi ölçeğiyle. */
  const pxPerM = solKenar > sagKenar ? solKenar / tasarimHm : sagKenar / tasarimHm
  const derinlikPx = (derinlikMm / 1000) * pxPerM
  if (!(derinlikPx > 0.5)) return null

  const d = { x: ux * derinlikPx, y: uy * derinlikPx }
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
