import * as THREE from 'three'

/**
 * GERÇEK DÜNYAYA YERLEŞTİRME (WebXR).
 *
 * Kameradaki tasarım katmanı bir görsel bindirmesidir: telefon kımıldayınca
 * ekranda kalır, duvarda kalmaz. Burada yapılan farklı — tasarım gerçek
 * dünyada bir noktaya çakılıyor:
 *
 *   • Yüzey algılama  : WebXR hit-test, kameranın baktığı yerdeki düzlemi verir.
 *   • Taslak (reticle): bulunan yer, yerleştirmeden ÖNCE ekranın gerçek
 *                       ölçüsünde soluk bir çerçeve olarak gösterilir.
 *                       Kullanıcı beğendiği yerde dokununca oraya oturur.
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
 */

/** Yüzey yatay mı (zemin, masa) yoksa dikey mi (duvar, cephe)? */
const YATAY_ESIK = 0.7

/** Hit-test yoksa taslak kameranın bu kadar önünde durur (metre). */
const YEDEK_UZAKLIK = 2.5

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
 * OTURUM AÇMA MERDİVENİ.
 *
 * isSessionSupported('immersive-ar') true dese bile requestSession, istenen
 * özelliklerden biri o cihazda yoksa NotSupportedError ile reddediliyor —
 * telefonda görülen hata buydu. Tarayıcı hangi özellikte takıldığını
 * söylemediği için önceden bilmenin yolu yok.
 *
 * Bu yüzden en zengin yapılandırmadan en yalınına doğru sırayla deneniyor.
 * İlk açılan kullanılıyor; hepsi başarısızsa hataların tamamı birlikte
 * bildiriliyor, böylece cihazda neyin eksik olduğu görünür oluyor.
 */
const MERDIVEN = [
  { ad: 'tam', required: ['hit-test'], optional: ['anchors', 'local-floor', 'dom-overlay'], overlay: true },
  { ad: 'örtüsüz', required: ['hit-test'], optional: ['anchors', 'local-floor'], overlay: false },
  { ad: 'esnek', required: [], optional: ['hit-test', 'anchors', 'local-floor', 'dom-overlay'], overlay: true },
  { ad: 'yalın', required: [], optional: [], overlay: false },
]

async function oturumAc(ustKatman) {
  const hatalar = []
  for (const k of MERDIVEN) {
    const istek = { requiredFeatures: k.required, optionalFeatures: k.optional }
    if (k.overlay && ustKatman) istek.domOverlay = { root: ustKatman }
    try {
      const oturum = await navigator.xr.requestSession('immersive-ar', istek)
      return { oturum, kademe: k.ad, hatalar }
    } catch (e) {
      hatalar.push(`${k.ad}: ${e?.name || e?.message || 'bilinmeyen'}`)
    }
  }
  const e = new Error(hatalar.join(' · '))
  e.name = 'OturumAcilamadi'
  throw e
}

/** Tasarımın gerçek ölçüsünde soluk taslak çerçevesi. */
function taslakYap(genislikM, yukseklikM) {
  const grup = new THREE.Group()

  grup.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(genislikM, yukseklikM),
      new THREE.MeshBasicMaterial({ color: 0x2962ad, transparent: true, opacity: 0.18, side: THREE.DoubleSide }),
    ),
  )
  grup.add(
    new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(genislikM, yukseklikM)),
      new THREE.LineBasicMaterial({ color: 0x8ec5ff, transparent: true, opacity: 0.95 }),
    ),
  )

  grup.matrixAutoUpdate = false
  grup.visible = false
  return grup
}

/** Tasarım yüzeyi: gerçek ölçüsünde dikdörtgen + ince çerçeve. */
function tasarimYap(doku, genislikM, yukseklikM) {
  const grup = new THREE.Group()

  const malzeme = new THREE.MeshBasicMaterial({ map: doku, toneMapped: false, side: THREE.DoubleSide })
  grup.add(new THREE.Mesh(new THREE.PlaneGeometry(genislikM, yukseklikM), malzeme))

  const kenar = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(genislikM, yukseklikM)),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
  )
  kenar.position.z = 0.001
  grup.add(kenar)

  grup.matrixAutoUpdate = false
  grup.visible = false
  return { grup, malzeme }
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
export function yerlesimMatrisi(durusMatrisi, kameraKonumu, yukseklikM) {
  const konum = new THREE.Vector3()
  const donme = new THREE.Quaternion()
  const olcek = new THREE.Vector3()
  durusMatrisi.clone().decompose(konum, donme, olcek)

  const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(donme)
  const yatay = Math.abs(normal.y) > YATAY_ESIK
  const hedef = new THREE.Matrix4()

  if (yatay) {
    // Zemin/masa: ekran yüzeyin üstünde ayakta, yüzü kameraya dönük.
    const bakis = new THREE.Vector3(kameraKonumu.x - konum.x, 0, kameraKonumu.z - konum.z)
    if (bakis.lengthSq() < 1e-6) bakis.set(0, 0, 1)
    bakis.normalize()
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(bakis.x, bakis.z), 0))
    const yer = konum.clone().add(new THREE.Vector3(0, yukseklikM / 2, 0))
    hedef.compose(yer, q, new THREE.Vector3(1, 1, 1))
  } else {
    // Duvar/cephe: yüz yüzey normaline bakar, üst dünyada yukarıda kalır.
    const q = donme.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)))
    const yer = konum.clone().add(normal.clone().multiplyScalar(0.01))
    hedef.compose(yer, q, new THREE.Vector3(1, 1, 1))
  }

  return { matris: hedef, yatay }
}

/**
 * Hit-test yoksa: taslak kameranın önünde, kameraya dönük durur.
 * Yüzey algılanmıyor ama tasarım yine gerçek ölçüsünde ve dünyaya çakılabiliyor.
 */
export function kameraOnu(kameraMatris, uzaklik = YEDEK_UZAKLIK) {
  const konum = new THREE.Vector3()
  const donme = new THREE.Quaternion()
  const olcek = new THREE.Vector3()
  kameraMatris.clone().decompose(konum, donme, olcek)

  const ileri = new THREE.Vector3(0, 0, -1).applyQuaternion(donme)
  const yer = konum.clone().add(ileri.clone().multiplyScalar(uzaklik))
  // Yalnız yatay eksende döner: ekran dünyada dik durur, eğilmez.
  const duz = new THREE.Vector3(ileri.x, 0, ileri.z)
  if (duz.lengthSq() < 1e-6) duz.set(0, 0, -1)
  duz.normalize()
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(-duz.x, -duz.z), 0))
  return new THREE.Matrix4().compose(yer, q, new THREE.Vector3(1, 1, 1))
}

/**
 * AR oturumunu açar.
 *
 * @param {object} p
 *   dokuUret   : () => Promise<THREE.Texture> — oturum AÇILDIKTAN SONRA çağrılır
 *   genislikM  : tasarımın gerçek genişliği (metre)
 *   yukseklikM : tasarımın gerçek yüksekliği (metre)
 *   ustKatman  : dom-overlay kökü (DOM öğesi)
 *   onDurum    : (DURUM) => void
 *   onBitti    : () => void
 */
export async function arBaslat({
  dokuUret,
  genislikM,
  yukseklikM,
  ustKatman,
  onDurum = () => {},
  onBitti = () => {},
  onAdim = () => {},
}) {
  /*
   * ADIM BİLDİRİMİ.
   *
   * AR açılışı birbirine bağlı birkaç adımdan geçiyor ve bunlardan biri
   * takılırsa dışarıdan bakınca "hiçbir şey olmadı" gibi görünüyor — cihazda
   * hata ayıklamak da mümkün değil. Her adım dışarı bildiriliyor; arayüz son
   * ulaşılan adımı gösteriyor, böylece nerede durduğu görünür oluyor.
   */
  /*
   * OTURUM İSTEĞİ İLK İŞTİR — ÖNÜNDE HİÇBİR await OLAMAZ.
   * requestSession yalnızca kullanıcı hareketinin hemen ardından kabul edilir;
   * araya bir bekleme girerse tarayıcı isteği reddeder.
   */
  onAdim('oturum isteniyor')
  const { oturum, kademe } = await oturumAc(ustKatman)

  onAdim('oturum açıldı: ' + kademe)
  const doku = await dokuUret()
  if (!doku) {
    oturum.end().catch(() => {})
    throw new Error('tasarım görüntüsü üretilemedi')
  }

  onAdim('tasarım görüntüsü hazır')
  const cizer = new THREE.WebGLRenderer({ canvas: document.createElement('canvas'), alpha: true, antialias: true })
  cizer.setPixelRatio(window.devicePixelRatio)
  cizer.xr.enabled = true
  cizer.xr.setReferenceSpaceType('local')
  await cizer.xr.setSession(oturum)
  onAdim('çizici bağlandı')

  const sahne = new THREE.Scene()
  const kamera = new THREE.PerspectiveCamera()

  const taslak = taslakYap(genislikM, yukseklikM)
  sahne.add(taslak)

  const { grup: tasarim, malzeme } = tasarimYap(doku, genislikM, yukseklikM)
  sahne.add(tasarim)

  const referans = await oturum.requestReferenceSpace('local')
  onAdim('referans uzayı alındı')

  // Hit-test olmayabilir (merdivenin alt basamakları); o zaman kamera önü kullanılır.
  let vurusUzayi = null
  try {
    const gorucu = await oturum.requestReferenceSpace('viewer')
    vurusUzayi = await oturum.requestHitTestSource({ space: gorucu })
  } catch {
    vurusUzayi = null
  }

  let durum = DURUM.ARANIYOR
  let capa = null
  let capaUzayi = null
  let capaFarki = null
  let sabitMatris = null
  let sonAday = null // { matris, yatay } — taslağın o anki yeri
  let sonVurusHam = null

  const durumBildir = (d) => {
    if (d === durum) return
    durum = d
    onDurum(d)
  }

  /** Taslağın durduğu yere yerleştirir ve dünyaya çapalar. */
  const yerlestir = async () => {
    if (!sonAday) return
    sabitMatris = sonAday.matris.clone()
    tasarim.matrix.copy(sabitMatris)
    tasarim.visible = true
    taslak.visible = false
    durumBildir(DURUM.YERLESTI)

    if (sonVurusHam?.createAnchor) {
      try {
        capa = await sonVurusHam.createAnchor()
        capaUzayi = capa?.anchorSpace || null
        capaFarki = null
      } catch {
        capa = null
        capaUzayi = null
      }
    }
  }

  /*
   * YERLEŞTİRME EKRANA DOKUNARAK OLUR.
   * 'select', WebXR'ın kendi dokunma olayıdır ve dom-overlay olmasa da gelir;
   * bu yüzden yerleştirme merdivenin her kademesinde çalışır.
   */
  oturum.addEventListener('select', () => {
    if (durum !== DURUM.YERLESTI) yerlestir()
  })

  const kareCiz = (zaman, kare) => {
    if (!kare) return
    const durus = kare.getViewerPose(referans)
    if (!durus) return

    const kameraMatris = new THREE.Matrix4().fromArray(durus.transform.matrix)
    const kameraKonumu = new THREE.Vector3().setFromMatrixPosition(kameraMatris)

    // --- yerleştirilmeden önce: taslak sürekli aday yeri gösterir ---
    if (durum !== DURUM.YERLESTI) {
      let bulundu = false
      if (vurusUzayi) {
        const vuruslar = kare.getHitTestResults(vurusUzayi)
        if (vuruslar.length) {
          const p = vuruslar[0].getPose(referans)
          if (p) {
            sonVurusHam = vuruslar[0]
            sonAday = yerlesimMatrisi(new THREE.Matrix4().fromArray(p.transform.matrix), kameraKonumu, yukseklikM)
            bulundu = true
          }
        }
      }
      if (!bulundu) {
        // Yüzey yok: taslak kameranın önünde durur, yerleştirme yine mümkün.
        sonVurusHam = null
        sonAday = { matris: kameraOnu(kameraMatris), yatay: false }
      }
      taslak.matrix.copy(sonAday.matris)
      taslak.visible = true
      durumBildir(bulundu ? DURUM.YUZEY_VAR : DURUM.ARANIYOR)
    }

    // --- yerleştirildikten sonra: dünyadaki yerini korur ---
    if (durum === DURUM.YERLESTI && sabitMatris) {
      if (capaUzayi) {
        const cp = kare.getPose(capaUzayi, referans)
        if (cp) {
          const capaM = new THREE.Matrix4().fromArray(cp.transform.matrix)
          if (!capaFarki) capaFarki = new THREE.Matrix4().copy(capaM).invert().multiply(sabitMatris)
          tasarim.matrix.copy(capaM).multiply(capaFarki)
        }
      } else {
        tasarim.matrix.copy(sabitMatris)
      }
    }

    if (doku.userData?.canliMi) doku.needsUpdate = true

    /*
     * Kamera matrisleri ELLE kurulmaz: renderer.xr her karede görünüm ve
     * izdüşüm matrislerini oturumdan alıp kameraya yazar.
     */
    cizer.render(sahne, kamera)
  }

  cizer.setAnimationLoop(kareCiz)
  onAdim(vurusUzayi ? 'yüzey aranıyor' : 'yüzey algılama yok, taslak önde')

  oturum.addEventListener('end', () => {
    cizer.setAnimationLoop(null)
    onBitti()
  })

  return {
    /** Hangi kademede açıldı, yüzey algılama var mı — arayüzde gösterilir. */
    bilgi: { kademe, yuzeyAlgilama: !!vurusUzayi },
    kapat: () => {
      try {
        cizer.setAnimationLoop(null)
        vurusUzayi?.cancel?.()
        capa?.delete?.()
        cizer.dispose()
        oturum.end().catch(() => {})
      } catch {
        /* oturum zaten kapanmış olabilir */
      }
    },
    /** Yerleştirmeyi geri alır: taslak yine kameranın baktığı yeri gösterir. */
    yenidenYerlestir: () => {
      capa?.delete?.()
      capa = null
      capaUzayi = null
      capaFarki = null
      sabitMatris = null
      tasarim.visible = false
      durumBildir(DURUM.ARANIYOR)
    },
    /** Arayüzdeki düğmeden yerleştirme (dokunma olayının eşdeğeri). */
    yerlestir,
    malzeme,
  }
}
