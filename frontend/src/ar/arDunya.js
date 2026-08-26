import * as THREE from 'three'

/**
 * GERÇEK DÜNYAYA YERLEŞTİRME (WebXR).
 *
 * Kameradaki tasarım katmanı bir görsel bindirmesidir: telefon kımıldayınca
 * ekranda kalır, duvarda kalmaz. Burada yapılan farklı — tasarım gerçek
 * dünyada bir noktaya çakılıyor:
 *
 *   • Yüzey algılama  : WebXR hit-test, kameranın baktığı yerdeki düzlemi verir.
 *   • Çapa (anchor)   : yerleştirilen nokta dünyaya bağlanır; cihaz kendi
 *                       konum kestirimini düzelttikçe tasarım kaymaz.
 *   • Fiziksel ölçek  : WebXR birimi METREDİR. Tasarımın eni/boyu metre olarak
 *                       verildiği için ölçek dönüşümü yok, birebir konur.
 *                       Bu yüzden yakınlaştırma ekranı BÜYÜTMEZ; büyütseydi
 *                       gösterilen ekran artık gerçek ürünün ölçüsü olmazdı.
 *   • Perspektif      : Kameranın görüş matrisinden gelir; tasarım düzlemi
 *                       yüzeyin üzerinde durduğu için açı kendiliğinden doğar.
 *
 * Bu dosya React bilmez: bir oturum açar, geri çağrılarla durum bildirir.
 * Cihaz desteklemiyorsa hiç çalışmaz; ArView o zaman kendi kamera
 * bindirmesiyle devam eder (yedek yol).
 */

/** Yüzey yatay mı (zemin, masa) yoksa dikey mi (duvar, cephe)? */
const YATAY_ESIK = 0.7

/** Yerleştirmeden sonra kaç kare boyunca hit-test aranmaya devam edilsin. */
export const DURUM = {
  ARANIYOR: 'araniyor',
  YUZEY_VAR: 'yuzeyVar',
  YERLESTI: 'yerlesti',
}

/** Cihaz gerçek AR oturumu açabiliyor mu? */
export async function arDestekliMi() {
  if (typeof navigator === 'undefined' || !navigator.xr) return false
  try {
    return await navigator.xr.isSessionSupported('immersive-ar')
  } catch {
    return false
  }
}

/**
 * Nişangâh: yüzey bulunduğunda o noktada duran ince halka.
 * Yatay yüzeyde yere yatık, dikey yüzeyde duvara yapışık görünür.
 */
function nisangahYap() {
  const g = new THREE.RingGeometry(0.055, 0.075, 48)
  g.rotateX(-Math.PI / 2) // halka kendi düzleminde yatsın
  const m = new THREE.MeshBasicMaterial({ color: 0x2962ad, transparent: true, opacity: 0.9 })
  const halka = new THREE.Mesh(g, m)
  halka.matrixAutoUpdate = false
  halka.visible = false
  return halka
}

/**
 * Tasarım yüzeyi: gerçek ölçüsünde bir dikdörtgen + ince çerçeve.
 * Doku, tasarımın kendi görüntüsüdür (ArView html2canvas ile üretir).
 */
function tasarimYap(doku, genislikM, yukseklikM) {
  const grup = new THREE.Group()

  const malzeme = new THREE.MeshBasicMaterial({ map: doku, toneMapped: false })
  const yuzey = new THREE.Mesh(new THREE.PlaneGeometry(genislikM, yukseklikM), malzeme)
  grup.add(yuzey)

  // İnce çerçeve: ekranın sınırı gerçek ortamda da okunsun.
  const kenar = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(genislikM, yukseklikM)),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
  )
  kenar.position.z = 0.001
  grup.add(kenar)

  return { grup, malzeme, yuzey, kenar }
}

/**
 * Hit-test sonucundan yerleşim matrisi üretir.
 *
 * WebXR'ın verdiği duruşta +Y yüzeyin normalidir. Ekranı ham hâliyle koyarsak
 * zeminde yüzüstü yatar. Doğrusu:
 *   • DİKEY yüzey (duvar) : ekran yüzeye yapışır, yüzü normal yönüne bakar.
 *   • YATAY yüzey (zemin) : ekran yüzeyin üstünde DİK durur, yüzü kullanıcıya
 *                           döner — LED ekran zeminde yatmaz, ayakta durur.
 */
// Dışa açık: yerleştirme matematiği ölçülebilsin (bkz. scratchpad/arMat.mjs).
export function yerlesimMatrisi(duruşMatrisi, kameraKonumu, yukseklikM) {
  const m = duruşMatrisi.clone()
  const konum = new THREE.Vector3()
  const donme = new THREE.Quaternion()
  const olcek = new THREE.Vector3()
  m.decompose(konum, donme, olcek)

  const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(donme)
  const yatay = Math.abs(normal.y) > YATAY_ESIK

  const hedef = new THREE.Matrix4()

  if (yatay) {
    /*
     * Zemin/masa: ekran yüzeyin üstünde ayakta. Yüzü kameraya döner ama
     * eğilmez — yalnızca Y ekseninde döner (dünyada dik durur).
     */
    const bakis = new THREE.Vector3(kameraKonumu.x - konum.x, 0, kameraKonumu.z - konum.z)
    if (bakis.lengthSq() < 1e-6) bakis.set(0, 0, 1)
    bakis.normalize()
    const aci = Math.atan2(bakis.x, bakis.z)
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, aci, 0))
    // Tabanı yüzeye otursun diye yarım boy yukarı kaldırılır.
    const yer = konum.clone().add(new THREE.Vector3(0, yukseklikM / 2, 0))
    hedef.compose(yer, q, new THREE.Vector3(1, 1, 1))
  } else {
    /*
     * Duvar/cephe: ekranın yüzü yüzey normaline bakar. Duruştaki +Y normal
     * olduğu için düzlemi -90° X ile çevirmek yeterli; ekranın üstü dünyada
     * yukarıda kalsın diye dönme yalnız yatay eksende düzeltilir.
     */
    const q = donme.clone().multiply(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)),
    )
    // Duvardan bir tık öne al: yüzeyle aynı düzlemde titreşim (z-fighting) olmasın.
    const yer = konum.clone().add(normal.clone().multiplyScalar(0.01))
    hedef.compose(yer, q, new THREE.Vector3(1, 1, 1))
  }

  return { matris: hedef, yatay }
}

/**
 * AR oturumunu açar.
 *
 * @param {object} p
 *   doku          : THREE.Texture — tasarımın görüntüsü
 *   genislikM     : tasarımın gerçek genişliği (metre)
 *   yukseklikM    : tasarımın gerçek yüksekliği (metre)
 *   ustKatman     : dom-overlay olarak gösterilecek DOM öğesi
 *   otomatik      : yüzey bulunur bulunmaz kendiliğinden yerleştirilsin mi
 *   onDurum       : (DURUM) => void
 *   onBitti       : () => void
 *   onHata        : (Error) => void
 * @returns {Promise<{ kapat: fn, yenidenYerlestir: fn, otomatikAyarla: fn, kareAl: fn }>}
 */
export async function arBaslat({
  doku,
  genislikM,
  yukseklikM,
  ustKatman,
  otomatik = true,
  onDurum = () => {},
  onBitti = () => {},
  onHata = () => {},
}) {
  const ozellikler = {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['anchors', 'local-floor', 'dom-overlay'],
  }
  if (ustKatman) ozellikler.domOverlay = { root: ustKatman }

  const oturum = await navigator.xr.requestSession('immersive-ar', ozellikler)

  const tuval = document.createElement('canvas')
  const cizer = new THREE.WebGLRenderer({ canvas: tuval, alpha: true, antialias: true })
  cizer.setPixelRatio(window.devicePixelRatio)
  cizer.xr.enabled = true
  cizer.xr.setReferenceSpaceType('local')
  await cizer.xr.setSession(oturum)

  const sahne = new THREE.Scene()
  const kamera = new THREE.PerspectiveCamera()

  const nisangah = nisangahYap()
  sahne.add(nisangah)

  const { grup: tasarim, malzeme } = tasarimYap(doku, genislikM, yukseklikM)
  tasarim.matrixAutoUpdate = false
  tasarim.visible = false
  sahne.add(tasarim)

  const referans = await oturum.requestReferenceSpace('local')
  let vurusUzayi = null
  try {
    const gorucu = await oturum.requestReferenceSpace('viewer')
    vurusUzayi = await oturum.requestHitTestSource({ space: gorucu })
  } catch (e) {
    onHata(e)
  }

  let durum = DURUM.ARANIYOR
  let capa = null // XRAnchor
  let capaUzayi = null
  let sabitMatris = null // çapa yoksa: referans uzayındaki sabit duruş
  let otomatikAcik = otomatik
  let sonVurus = null // { matris, yatay }
  let sonVurusHam = null // XRHitTestResult — çapa bundan üretilir
  let capaFarki = null // çapa → tasarım dönüşümü (bir kez hesaplanır)
  let surukleniyor = false

  const durumBildir = (d) => {
    if (d === durum) return
    durum = d
    onDurum(d)
  }

  /** Tasarımı verilen duruşa yerleştirir; mümkünse çapa oluşturur. */
  const yerlestir = async ({ matris }) => {
    sabitMatris = matris.clone()
    tasarim.visible = true
    durumBildir(DURUM.YERLESTI)

    // Çapa: cihazın konum kestirimi düzeldikçe tasarım kaymasın.
    if (oturum.enabledFeatures?.includes?.('anchors') && sonVurusHam?.createAnchor) {
      try {
        const yeni = await sonVurusHam.createAnchor()
        if (yeni) {
          capa = yeni
          capaUzayi = yeni.anchorSpace
          // Çapa duruşuyla istenen duruş arasındaki fark saklanır: çapa
          // dünyayı takip eder, tasarım da ona göre yerini korur.
          capaFarki = null
        }
      } catch {
        capa = null
      }
    }
  }

  const kareCiz = (zaman, kare) => {
    if (!kare) return
    const duruş = kare.getViewerPose(referans)
    if (!duruş) return

    const kameraKonumu = new THREE.Vector3(
      duruş.transform.position.x,
      duruş.transform.position.y,
      duruş.transform.position.z,
    )

    // --- yüzey arama ---
    if (vurusUzayi && (durum !== DURUM.YERLESTI || surukleniyor)) {
      const vuruslar = kare.getHitTestResults(vurusUzayi)
      if (vuruslar.length) {
        const v = vuruslar[0]
        const p = v.getPose(referans)
        if (p) {
          sonVurusHam = v
          const ham = new THREE.Matrix4().fromArray(p.transform.matrix)
          sonVurus = yerlesimMatrisi(ham, kameraKonumu, yukseklikM)
          nisangah.matrix.fromArray(p.transform.matrix)
          nisangah.visible = durum !== DURUM.YERLESTI || surukleniyor
          if (durum === DURUM.ARANIYOR) durumBildir(DURUM.YUZEY_VAR)
          if (surukleniyor) sabitMatris = sonVurus.matris.clone()
          else if (otomatikAcik && durum === DURUM.YUZEY_VAR) yerlestir(sonVurus)
        }
      } else {
        nisangah.visible = false
        if (durum === DURUM.YUZEY_VAR) durumBildir(DURUM.ARANIYOR)
      }
    } else {
      nisangah.visible = false
    }

    // --- tasarımın dünyadaki yeri ---
    if (durum === DURUM.YERLESTI && sabitMatris) {
      if (capaUzayi) {
        const cp = kare.getPose(capaUzayi, referans)
        if (cp) {
          const capaM = new THREE.Matrix4().fromArray(cp.transform.matrix)
          if (!capaFarki) {
            // Yerleştirme anındaki çapa→tasarım farkı bir kez hesaplanır.
            capaFarki = new THREE.Matrix4().copy(capaM).invert().multiply(sabitMatris)
          }
          tasarim.matrix.copy(capaM).multiply(capaFarki)
        }
      } else {
        tasarim.matrix.copy(sabitMatris)
      }
    }

    // Video içerik: doku her karede tazelenir.
    if (doku.userData?.canliMi) doku.needsUpdate = true

    /*
     * Kamera matrisleri ELLE kurulmaz: renderer.xr her karede görünüm ve
     * izdüşüm matrislerini oturumdan alıp kameraya yazar. Elle yazmak
     * stereo/çoklu görünümde bozar.
     */
    cizer.render(sahne, kamera)
  }

  cizer.setAnimationLoop(kareCiz)

  const kapat = () => {
    try {
      cizer.setAnimationLoop(null)
      vurusUzayi?.cancel?.()
      capa?.delete?.()
      cizer.dispose()
      oturum.end().catch(() => {})
    } catch {
      /* oturum zaten kapanmış olabilir */
    }
  }

  oturum.addEventListener('end', () => {
    cizer.setAnimationLoop(null)
    onBitti()
  })

  return {
    kapat,
    /** Yerleştirmeyi iptal eder, yeniden yüzey aramaya döner. */
    yenidenYerlestir: () => {
      capa?.delete?.()
      capa = null
      capaUzayi = null
      capaFarki = null
      sabitMatris = null
      tasarim.visible = false
      durumBildir(DURUM.ARANIYOR)
    },
    /** Otomatik yerleştirme açık/kapalı. Kapalıyken kullanıcı dokunarak koyar. */
    otomatikAyarla: (a) => {
      otomatikAcik = a
    },
    /** Parmakla taşıma: basılı tutulduğu sürece tasarım yüzeyde kaydırılır. */
    suruklemeBaslat: () => {
      if (durum === DURUM.YERLESTI) surukleniyor = true
    },
    suruklemeBitir: () => {
      surukleniyor = false
      nisangah.visible = false
      // Taşındıktan sonra çapa yeniden kurulur (yeni noktaya bağlansın).
      capa?.delete?.()
      capa = null
      capaUzayi = null
      capaFarki = null
      if (sonVurus) yerlestir(sonVurus)
    },
    /** Dokunuşla yerleştirme (otomatik kapalıyken ya da yeniden koyarken). */
    dokunmaYerlestir: () => {
      if (sonVurus) yerlestir(sonVurus)
    },
    /** Ölçü çerçevesini göster/gizle. */
    cerceveAyarla: (a) => {
      tasarim.children.forEach((c) => {
        if (c.isLineSegments) c.visible = a
      })
    },
    malzeme,
  }
}
