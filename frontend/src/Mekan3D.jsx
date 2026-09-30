import { Suspense, useEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { CabinetGrid } from './Scene3D.jsx'

/**
 * YERİNDE 3D — kullanıcının kendi fotoğrafının üstünde gerçek bir 3B ekran.
 *
 * Fotoğraflı mekânda tasarım şimdiye kadar DÜZ bir görüntüydü: fotoğrafın
 * üstüne yapıştırılmış bir dikdörtgen. Ekranın kasası, derinliği, kenarının
 * ışığı yoktu; duvara asılmış bir ürün değil, bir çıkartma gibi duruyordu.
 *
 * Burada aynı ekran, 3D görünümde kullanılan geometrinin ta kendisiyle
 * (Scene3D → CabinetGrid) çiziliyor: kabin ızgarası, kasa, derinlik, HDRI
 * ortam ışığı. Tuval SAYDAM, yani arkasında kullanıcının fotoğrafı görünmeye
 * devam ediyor ve üstündeki 2D katmanlar (ölçü etiketleri, aday kareleri,
 * köşe tutamakları) olduğu gibi çalışmaya devam ediyor.
 *
 * AÇIYI KULLANICI VERİYOR: duruş, kullanıcının köşe tutamaklarıyla kurduğu
 * dörtgenden çıkıyor (bkz. perspektifDurusu). Görsel yan duruyorsa kullanıcı
 * köşeleri o yana çekiyor, ekran da o yana dönüyor. Sistem kendiliğinden açı
 * uydurmuyor.
 */

/**
 * KAMERA DÖRTGENDEN ÇÖZÜLÜYOR.
 *
 * Kamera önce dar açılı (18°) ve sabitti; gerekçe "2D ölçü etiketleriyle
 * tutsun" idi. Ama o kamera neredeyse ortografikti, yani kullanıcının çizdiği
 * perspektifi ÜRETEMİYORDU: köşelerden yamuk bir dörtgen çizildiğinde ekran
 * ancak birkaç derece dönebiliyordu.
 *
 * Sonra açıyı sabitleyip (30°) uzaklığı ondan çözmeyi denedim; o da yanlıştı.
 * Dörtgen aslında hem açıyı hem uzaklığı BİRLİKTE belirliyor, ikisi serbest
 * değil. Ölçüm bunu açıkça gösterdi: 30°'lik dönme ekranı hedefin %16 üstüne
 * çıkarıyordu.
 *
 * DOĞRU ÇÖZÜM iki ayrı bilgiyi ayrı ayrı okuyor:
 *
 *   1) EN/BOY ORANI → AÇI.
 *      Yana dönen bir dikdörtgenin yalnızca eni kısalır, boyu değil. Demek ki
 *      izdüşümün oranı gerçek oranından ne kadar sapmışsa dönme o kadardır:
 *
 *          cos(yaw) = (izdüşüm en/boy) ÷ (gerçek en/boy)
 *
 *      Oran ters yöne saptıysa daralan kenar boydur; o zaman dönme yatay
 *      değil dikeydir (pitch).
 *
 *   2) KARŞILIKLI KENAR FARKI → UZAKLIK.
 *      Yakın kenar d − (en/2)·sin(açı), uzak kenar d + (en/2)·sin(açı)
 *      uzaklıkta olduğundan
 *
 *          güç = (yakın − uzak) / (yakın + uzak) = (en/2)·sin(açı) / d
 *
 *      Açı (1)'den bilindiğine göre uzaklık buradan tek başına çıkıyor.
 *      Fark yoksa perspektif de yok: kamera uzağa çekiliyor.
 *
 * Ölçek de aynı geometriden geliyor; ayrıca tahmin edilmiyor (bkz. pxPerM).
 */

/** Bu gücün altındaki fark çizim gürültüsüdür; ekran titremesin diye yok sayılıyor. */
const GUC_ESIGI = 0.02

/** Dönme sınırı: ötesinde ekran profilden görünüp tamamen kayboluyor. */
const EN_COK_ACI = (72 * Math.PI) / 180

/**
 * Kamera uzaklığının sınırları, ekranın büyük kenarının katı olarak.
 *
 * Alt sınır olmazsa tutarsız bir dörtgen (kullanıcı köşeleri gelişigüzel
 * çektiğinde olabiliyor) kamerayı ekranın burnuna sokuyor: görüş açısı 100°'yi
 * aşıyor ve görüntü balık gözüne dönüyor. 1,2 kat uzaklık yaklaşık 45°'lik
 * doğal bir bakış demek. Sınıra takılan dörtgende perspektif kullanıcının
 * çizdiğinden zayıf kalıyor — ölçüyü bozmaktansa eğimi yumuşatmak yeğdir.
 * Üst sınır da hesabı ortografiğe yuvarlıyor.
 */
const EN_YAKIN = 1.2
const EN_UZAK = 60

/** Tuval, duvar kutusunun her kenarında bu oranda taşma payı alıyor (bkz. yerleşim). */
const PAY = 0.5

const kis = (d, en, cok) => Math.max(en, Math.min(cok, d))

/**
 * Dörtgenden ekranın duruşunu ve kameranın uzaklığını çıkarır.
 *
 * @param {Array<{x:number,y:number}>} k  dörtgen (tuval pikseli, saat yönünde)
 * @param {number} enM   tasarımın gerçek genişliği (m)
 * @param {number} boyM  tasarımın gerçek yüksekliği (m)
 */
export function perspektifDurusu(k, enM, boyM) {
  const buyuk = Math.max(enM || 1, boyM || 1)
  const bos = {
    yaw: 0,
    pitch: 0,
    roll: 0,
    uzaklikM: buyuk * EN_UZAK,
    pxPerM: 0,
  }
  if (!Array.isArray(k) || k.length !== 4 || !(enM > 0) || !(boyM > 0)) return bos

  const uz = (a, b) => Math.hypot(k[b].x - k[a].x, k[b].y - k[a].y)
  const ust = uz(0, 1)
  const alt = uz(3, 2)
  const sol = uz(0, 3)
  const sag = uz(1, 2)
  if (!(ust > 0) || !(alt > 0) || !(sol > 0) || !(sag > 0)) return bos

  /*
   * DÖRTGENİN KENDİ EKSENLERİ.
   *
   * En ve boy, kenar uzunluklarının ortalamasından değil karşılıklı kenarların
   * ORTA NOKTALARI arasından ölçülüyor. Perspektifte üst kenar eğik görünür
   * (yakın ucu aşağı düşer); uzunluğunu yatay en saymak ekranı olduğundan
   * geniş gösteriyordu. Orta noktalar ise yamukluktan etkilenmiyor.
   */
  const orta = (a, b) => ({ x: (k[a].x + k[b].x) / 2, y: (k[a].y + k[b].y) / 2 })
  const solOrta = orta(0, 3)
  const sagOrta = orta(1, 2)
  const ustOrta = orta(0, 1)
  const altOrta = orta(3, 2)
  const enPx = Math.hypot(sagOrta.x - solOrta.x, sagOrta.y - solOrta.y)
  const boyPx = Math.hypot(altOrta.x - ustOrta.x, altOrta.y - ustOrta.y)
  if (!(enPx > 1) || !(boyPx > 1)) return bos

  /* Sol kenar uzunsa sol yan yakın; üst kenar uzunsa üst yan yakın. */
  const gucYaw = (sol - sag) / (sol + sag)
  const gucPitch = (ust - alt) / (ust + alt)

  /* (1) Oran sapması hangi eksende daralma olduğunu söylüyor. */
  const oran = enPx / boyPx / (enM / boyM)
  let yaw = 0
  let pitch = 0
  if (oran < 1) yaw = Math.min(EN_COK_ACI, Math.acos(kis(oran, 0.05, 1)))
  else if (oran > 1) pitch = Math.min(EN_COK_ACI, Math.acos(kis(1 / oran, 0.05, 1)))

  /*
   * Dönme yönü, hangi kenarın uzun olduğundan geliyor. Fark ölçülemeyecek
   * kadar küçükse yön belirsizdir; o zaman ekranın sağ yanı geriye gidiyor
   * sayılıyor — bir yön seçmek gerekiyor ve bu ikisinden biri.
   */
  const yonY = gucYaw < 0 ? -1 : 1
  const yonP = gucPitch < 0 ? -1 : 1

  /* (2) Karşılıklı kenar farkı uzaklığı veriyor. */
  const mY = Math.abs(gucYaw)
  const mP = Math.abs(gucPitch)
  let uzaklikM = buyuk * EN_UZAK
  if (yaw > 0 && mY > GUC_ESIGI) uzaklikM = ((enM / 2) * Math.sin(yaw)) / mY
  else if (pitch > 0 && mP > GUC_ESIGI) uzaklikM = ((boyM / 2) * Math.sin(pitch)) / mP
  uzaklikM = kis(uzaklikM, buyuk * EN_YAKIN, buyuk * EN_UZAK)

  /*
   * Sınıra takıldıysa çizilecek perspektif, dörtgenin istediğinden farklı
   * olur. Ölçek bu YENİ uzaklıktan hesaplanıyor; yoksa ekran hedeften büyük
   * çiziliyordu.
   */
  const gY = uzaklikM > 0 ? ((enM / 2) * Math.sin(yaw)) / uzaklikM : 0
  const gP = uzaklikM > 0 ? ((boyM / 2) * Math.sin(pitch)) / uzaklikM : 0

  /*
   * ÖLÇEK: nesne düzleminde 1 metre kaç piksel.
   *
   * Daralmayan kenardan okunuyor — dönme onu kısaltmadığı için ölçek doğrudan
   * oradan çıkıyor. Kenarların ortalaması yakın/uzak büyütmesini 1/(1−güç²)
   * kadar şişirdiğinden bu çarpan geri alınıyor.
   */
  const pxPerM =
    yaw > 0 || pitch === 0
      ? (boyPx * (1 - gY * gY)) / boyM
      : (enPx * (1 - gP * gP)) / enM

  return {
    yaw: yaw * yonY,
    /* Üst kenar uzunsa ekranın altı geriye gitmeli: işaret ters. */
    pitch: -pitch * yonP,
    /*
     * DÜZLEM İÇİ EĞİM — ÜST KENARDAN DEĞİL, YATAY EKSENDEN.
     *
     * Üst kenarın açısını roll saymak yanlıştı: yana dönmüş düz bir ekranın
     * üst kenarı da eğik görünür, oysa ekran hiç eğilmemiştir. Ölçüm bunu
     * gösterdi — dümdüz duran yamuk için 6° eğim uyduruluyor ve çizim hedefin
     * %9 dışına taşıyordu. Yatay eksen (yan kenarların orta noktaları) ise
     * perspektiften etkilenmiyor.
     */
    roll: Math.atan2(sagOrta.y - solOrta.y, sagOrta.x - solOrta.x),
    uzaklikM,
    pxPerM,
  }
}

/** Dörtgenin merkezi ve ortalama kenar uzunlukları (tuval pikseli). */
export function dortgenDurusu(k) {
  if (!Array.isArray(k) || k.length !== 4) return null
  const uz = (a, b) => Math.hypot(k[b].x - k[a].x, k[b].y - k[a].y)
  const en = (uz(0, 1) + uz(3, 2)) / 2
  const boy = (uz(0, 3) + uz(1, 2)) / 2
  if (!(en > 1) || !(boy > 1)) return null
  /*
   * MERKEZ = KÖŞEGENLERİN KESİŞİMİ, DÖRT KÖŞENİN ORTALAMASI DEĞİL.
   *
   * Perspektifte dikdörtgenin ortası, dörtgenin ağırlık merkezine düşmez:
   * yakın kenar büyük göründüğü için ağırlık o yana kayar. Ekranı ağırlık
   * merkezine koymak, eğim verildikçe tasarımı yakın kenara doğru
   * kaydırıyordu. Köşegenlerin kesişimi ise izdüşüm altında korunuyor —
   * dikdörtgenin gerçek ortası oraya düşer.
   */
  const payda =
    (k[2].x - k[0].x) * (k[3].y - k[1].y) - (k[2].y - k[0].y) * (k[3].x - k[1].x)
  let mx = k.reduce((t, p) => t + p.x, 0) / 4
  let my = k.reduce((t, p) => t + p.y, 0) / 4
  if (Math.abs(payda) > 1e-6) {
    const t =
      ((k[1].x - k[0].x) * (k[3].y - k[1].y) - (k[1].y - k[0].y) * (k[3].x - k[1].x)) / payda
    if (t > -0.5 && t < 1.5) {
      mx = k[0].x + t * (k[2].x - k[0].x)
      my = k[0].y + t * (k[2].y - k[0].y)
    }
  }
  return { x: mx, y: my, en, boy }
}

/**
 * Kamerayı her değişiklikte yeniden kuran yardımcı.
 *
 * İKİ SEBEPLE GEREKLİ:
 *
 * 1) react-three-fiber'da <Canvas camera={...}> yalnızca İLK kurulumda
 *    okunuyor, sonraki değerler sessizce yok sayılıyor. Oysa ölçek ve açı
 *    kullanıcı kutuyu her oynattığında değişiyor.
 *
 * 2) EKSEN KAYMASI (setViewOffset). Ekran tuvalin ortasında değilse ve kamera
 *    geniş açılıysa, eksenden uzakta kalan nesne kendiliğinden gerilip büyür;
 *    ölçü artık tutmaz. Bu yüzden kamera nesnenin tam karşısına konuyor
 *    (nesne eksende) ve görüntü penceresi kaydırılarak nesne tuvalde olması
 *    gereken piksele oturtuluyor. Böylece ölçü ile perspektif birbirini
 *    bozmuyor.
 */
function Kamera({ uzaklik, fov, x, y, genisW, genisH, merkezX, merkezY }) {
  const kamera = useThree((d) => d.camera)
  useEffect(() => {
    if (!(uzaklik > 0) || !(fov > 0) || !(genisW > 0) || !(genisH > 0)) return
    kamera.fov = fov
    kamera.position.set(x, y, uzaklik)
    kamera.near = Math.max(0.01, uzaklik / 200)
    kamera.far = uzaklik * 6
    kamera.setViewOffset(genisW, genisH, genisW / 2 - merkezX, genisH / 2 - merkezY, genisW, genisH)
    kamera.updateProjectionMatrix()
  }, [kamera, uzaklik, fov, x, y, genisW, genisH, merkezX, merkezY])
  return null
}

export default function Mekan3D({
  model,
  cols,
  rows,
  content,
  contentUrl,
  screenType,
  curveAmount,
  leftCols,
  rightCols,
  screens,
  /** Ekranın tuvaldeki dörtgeni — yer, ölçü ve açı buradan çıkıyor. */
  koseler,
  tuvalW,
  tuvalH,
  /** Tasarımın gerçek ölçüleri (metre) — piksel/metre oranı ve duruş için. */
  tasarimWm,
  tasarimHm,
  /** 3B gerçekten çizildi mi — düz çizim ancak o zaman gizleniyor. */
  onHazir,
}) {
  const durus = useMemo(() => dortgenDurusu(koseler), [koseler])
  const acilar = useMemo(
    () => perspektifDurusu(koseler, tasarimWm, tasarimHm),
    [koseler, tasarimWm, tasarimHm],
  )

  const yerlesim = useMemo(() => {
    if (!durus || !(tuvalW > 0) || !(tuvalH > 0) || !(tasarimWm > 0)) return null

    /* Ölçek duruşla birlikte çözülüyor (bkz. perspektifDurusu → pxPerM). */
    const pxPerM = acilar.pxPerM
    if (!(pxPerM > 0)) return null

    /*
     * TUVAL DUVAR KUTUSUNDAN BÜYÜK.
     *
     * Katman önce tam duvar kutusu kadardı. Ekran duvarı dolduracak kadar
     * büyükse — "duvara tam sığdır" bunu yapıyor — en ufak dönmede kasanın
     * kenarı kutunun dışına taşıp KIRPILIYORDU. Ekran o yüzden dönmüş değil,
     * düz bir renk bloğu gibi görünüyordu: görünen şey ekranın kenarı değil,
     * tuvalin kenarıydı.
     *
     * Tuval hem büyüyor hem aynı oranda daha geniş bir dünya gösteriyor,
     * yani ekranın sayfadaki boyu değişmiyor; yalnızca dönen ekranın
     * etrafında yer kalıyor.
     */
    const genisW = tuvalW * (1 + 2 * PAY)
    const genisH = tuvalH * (1 + 2 * PAY)
    const merkezX = durus.x + tuvalW * PAY
    const merkezY = durus.y + tuvalH * PAY

    /*
     * Görüş açısı kamera uzaklığından çıkıyor: nesne düzleminde tuvalin
     * kapsaması gereken yükseklik genisH/pxPerM metre.
     */
    const fov = (2 * Math.atan(genisH / (2 * pxPerM * acilar.uzaklikM)) * 180) / Math.PI
    if (!(fov > 0.5) || !(fov < 150)) return null

    /* Tuval merkezine göre kayma — piksel, dünya birimine çevriliyor. */
    return {
      genisW,
      genisH,
      merkezX,
      merkezY,
      sol: -tuvalW * PAY,
      ust: -tuvalH * PAY,
      uzaklik: acilar.uzaklikM,
      fov,
      x: (durus.x - tuvalW / 2) / pxPerM,
      y: -(durus.y - tuvalH / 2) / pxPerM,
    }
  }, [durus, acilar.pxPerM, acilar.uzaklikM, tuvalW, tuvalH, tasarimWm])

  /*
   * DÜZ ÇİZİM ANCAK 3B ÇİZİLDİYSE GİZLENİYOR.
   *
   * Düz çizimi koşulsuz gizlemek tehlikeli: bu katman geç yükleniyor (kod
   * bölünmüş), WebGL kapalı olabiliyor ya da yerleşim hesabı sonuç
   * vermeyebiliyor. Öyle bir durumda ekranda HİÇBİR ŞEY kalmıyor —
   * kullanıcının "tasarım görseli görünmüyor" dediği durum tam buydu.
   * Haber vermeden gizlenmiyor.
   */
  useEffect(() => {
    onHazir?.(!!yerlesim)
    return () => onHazir?.(false)
  }, [onHazir, yerlesim])

  if (!yerlesim) return null

  return (
    /*
     * KATMAN TIKLAMA YUTMUYOR.
     *
     * Sürükleme, köşe tutamakları ve aday kareleri bu katmanın ÜSTÜNDE ve
     * ALTINDA çalışmaya devam ediyor; 3D tuval yalnızca görüntü.
     */
    <div
      className="absolute z-[15] pointer-events-none"
      style={{
        left: yerlesim.sol,
        top: yerlesim.ust,
        width: yerlesim.genisW,
        height: yerlesim.genisH,
      }}
      data-pdf-3d
    >
      <Canvas
        /*
         * TUVAL FAREYİ YUTMUYOR.
         *
         * Sarmalayıcıda pointer-events-none var ama react-three-fiber kendi
         * tuvaline olay dinleyicileri bağlıyor; tarayıcıya "bu katman hiç
         * yokmuş gibi davran" demek için kuralı tuvalin kendisine de yazmak
         * gerekiyor. Aksi hâlde 3B katman açıkken tasarım sürüklenemiyor.
         */
        style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        /*
         * Tuval duvar kutusunun iki katı; piksel yoğunluğunu 2'de tutmak dört
         * kat piksel demek olurdu. 1,5 hem keskin duruyor hem zayıf makinede
         * akıcı kalıyor.
         */
        dpr={[1, 1.5]}
        camera={{ fov: yerlesim.fov, position: [yerlesim.x, yerlesim.y, yerlesim.uzaklik] }}
      >
        <Kamera
          uzaklik={yerlesim.uzaklik}
          fov={yerlesim.fov}
          x={yerlesim.x}
          y={yerlesim.y}
          genisW={yerlesim.genisW}
          genisH={yerlesim.genisH}
          merkezX={yerlesim.merkezX}
          merkezY={yerlesim.merkezY}
        />
        <Suspense fallback={<ambientLight intensity={0.9} />}>
          <Environment preset="warehouse" />
        </Suspense>
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} />

        <group
          position={[yerlesim.x, yerlesim.y, 0]}
          rotation={[acilar.pitch, acilar.yaw, acilar.roll, 'YXZ']}
        >
          <CabinetGrid
            model={model}
            cols={cols}
            rows={rows}
            content={content}
            contentUrl={contentUrl}
            detailLevel={cols * rows > 200 ? 'low' : 'high'}
            screenType={screenType}
            curveAmount={curveAmount}
            leftCols={leftCols}
            rightCols={rightCols}
            screens={screens}
          />
        </group>
      </Canvas>
    </div>
  )
}
