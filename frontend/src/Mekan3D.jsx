import { Suspense, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
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
 * KAMERA NEDEN NEREDEYSE ORTOGRAFİK: ekranın fotoğraftaki yeri ve boyu
 * PİKSEL olarak biliniyor (2D taraf hesaplıyor). Geniş açılı bir kamera
 * kadrajın kenarına giden nesneyi kendi perspektifiyle de eğerdi ve çizim
 * 2D ölçü etiketleriyle tutmazdı. Dar açı (18°) + uzak kamera, piksel
 * karşılığını bire bir korurken nesnenin kendi derinliğini göstermeye yetiyor.
 *
 * AÇIYI KULLANICI VERİYOR: yaw/pitch/roll, kullanıcının köşe tutamaklarıyla
 * kurduğu dörtgenden çıkıyor (bkz. acilariCikar). Görsel yan duruyorsa
 * kullanıcı köşeleri o yana çekiyor, ekran da o yana dönüyor. Sistem
 * kendiliğinden açı uydurmuyor.
 */

/** Kameranın dikey görüş açısı (derece) — dar tutuluyor, bkz. başlık. */
const GORUS_ACISI = 18

/**
 * Dörtgenden ekranın duruşunu çıkarır.
 *
 * Fizik basit: bir dikdörtgen kendi ekseninde döndüğünde, kameraya YAKIN
 * kalan kenarı uzun, uzaklaşan kenarı kısa görünür. Oran ne kadar farklıysa
 * dönme o kadar büyüktür.
 *
 *   yaw   (sağa/sola dönme)  ← sol ve sağ kenar uzunluklarının farkı
 *   pitch (öne/arkaya yatma) ← üst ve alt kenar uzunluklarının farkı
 *   roll  (düzlemde eğilme)  ← üst kenarın yatayla yaptığı açı
 *
 * Dönme ±55° ile sınırlı: daha ötesi ölçüm gürültüsünden geliyor ve ekranı
 * profilden gösterip tamamen kaybediyor.
 *
 * @param {Array<{x:number,y:number}>} k  dörtgen (tuval pikseli)
 */
export function acilariCikar(k) {
  const bos = { yaw: 0, pitch: 0, roll: 0 }
  if (!Array.isArray(k) || k.length !== 4) return bos
  const uz = (a, b) => Math.hypot(k[b].x - k[a].x, k[b].y - k[a].y)
  const ust = uz(0, 1)
  const alt = uz(3, 2)
  const sol = uz(0, 3)
  const sag = uz(1, 2)
  if (!(ust > 0) || !(alt > 0) || !(sol > 0) || !(sag > 0)) return bos

  const SINIR = (55 * Math.PI) / 180
  const donme = (yakin, uzak) => {
    const t = (yakin - uzak) / (yakin + uzak)
    /* Küçük farkları yok sayıyoruz: çizim gürültüsü ekranı titretmesin. */
    if (Math.abs(t) < 0.02) return 0
    return Math.max(-SINIR, Math.min(SINIR, Math.asin(Math.max(-1, Math.min(1, t * 1.6)))))
  }

  return {
    /* Sol kenar uzunsa sol yan yakındır: ekranın sağ yanı geriye gider. */
    yaw: donme(sol, sag),
    /* Üst kenar uzunsa üst yan yakındır: ekranın altı geriye gider. */
    pitch: -donme(ust, alt),
    roll: Math.atan2(k[1].y - k[0].y, k[1].x - k[0].x),
  }
}

/** Dörtgenin merkezi ve ortalama kenar uzunlukları (tuval pikseli). */
export function dortgenDurusu(k) {
  if (!Array.isArray(k) || k.length !== 4) return null
  const uz = (a, b) => Math.hypot(k[b].x - k[a].x, k[b].y - k[a].y)
  const en = (uz(0, 1) + uz(3, 2)) / 2
  const boy = (uz(0, 3) + uz(1, 2)) / 2
  if (!(en > 1) || !(boy > 1)) return null
  return {
    x: k.reduce((t, p) => t + p.x, 0) / 4,
    y: k.reduce((t, p) => t + p.y, 0) / 4,
    en,
    boy,
  }
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
  /** Tasarımın gerçek genişliği (metre) — piksel/metre oranı için. */
  tasarimWm,
  /** 3B gerçekten çizildi mi — düz çizim ancak o zaman gizleniyor. */
  onHazir,
}) {
  const durus = useMemo(() => dortgenDurusu(koseler), [koseler])
  const acilar = useMemo(() => acilariCikar(koseler), [koseler])

  const yerlesim = useMemo(() => {
    if (!durus || !(tuvalW > 0) || !(tuvalH > 0) || !(tasarimWm > 0)) return null

    /*
     * Dörtgen döndüğünde İZDÜŞÜMÜ daralıyor; kullanıcının çizdiği genişliği
     * korumak için dönmenin kosinüsüne bölünüyor. Böylece ekran, köşelerle
     * belirlenen alanı tam dolduruyor.
     */
    const kosYaw = Math.max(0.25, Math.cos(acilar.yaw))
    const gercekEnPx = durus.en / kosYaw
    const pxPerM = gercekEnPx / tasarimWm
    if (!(pxPerM > 0)) return null

    /* Kamera uzaklığı: verilen görüş açısında 1 metre kaç piksel ediyorsa. */
    const yariAci = (GORUS_ACISI * Math.PI) / 360
    const uzaklik = tuvalH / (2 * Math.tan(yariAci) * pxPerM)

    /* Tuval merkezine göre kayma — piksel, dünya birimine çevriliyor. */
    return {
      uzaklik,
      x: (durus.x - tuvalW / 2) / pxPerM,
      y: -(durus.y - tuvalH / 2) / pxPerM,
    }
  }, [durus, acilar.yaw, tuvalW, tuvalH, tasarimWm])

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
    <div className="absolute inset-0 z-[15] pointer-events-none" data-pdf-3d>
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
        camera={{ fov: GORUS_ACISI, position: [0, 0, yerlesim.uzaklik], near: 0.01, far: yerlesim.uzaklik * 4 }}
      >
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
