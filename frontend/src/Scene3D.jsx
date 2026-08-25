import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useGovdeKilidi } from './hooks/useGovdeKilidi.js'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Instances, Instance, ContactShadows } from '@react-three/drei'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js'
import * as THREE from 'three'
import { useLang } from './useLang.js'
import { curveDepthFor, DEFAULT_CONTENT_SRC } from './content.js'
import { ORNEK_MEKANLAR } from './ornekMekanlar.js'
import { videoSrcFor, createVideoElement } from './videoContent.js'
/* AR yerleştirme akışının görünen parçaları kamera ekranıyla ORTAK — bkz. ArYerlestirme.jsx */
import {
  YerlestirKatmani,
  AraclarSutunu,
  TusTakimi,
} from './ArYerlestirme.jsx'

/**
 * GERÇEK 3D GÖRÜNÜM (react-three-fiber) — mevcut 2D Canvas/SVG önizlemenin
 * yanına eklenen, gerçek bir sahne grafiği kullanan üçüncü görselleştirme modu.
 *
 * Neden ayrı bir bileşen ve mevcut WallPreview/ArView'ın yerini almıyor:
 *   - WallPreview (2D) ve ArView (kamera üzeri 2D overlay) zaten olgun ve
 *     performanslı; ölçü etiketleri, kavis, çoklu ekran gibi ince işler o
 *     tarafta duruyor. Onları three.js'e taşımak büyük bir yeniden yazım
 *     gerektirir ve regresyon riski taşır.
 *   - Bu bileşen, "gerçek 3D" ihtiyacını (HDRI ışıklandırma, serbest kamera
 *     döndürme, WebXR/AR için dışa aktarılabilir bir 3D model) katmanlı bir
 *     şekilde ekliyor: kullanıcı isterse açar, kapatırsa hiçbir maliyeti yok
 *     (kod bölünmüş/dynamic import ile yüklenir).
 *
 * LOD (Level of Detail) STRATEJİSİ:
 *   - Kabin sayısı arttıkça (büyük video duvarları) tek tek "çerçeveli kutu"
 *     yerine paylaşılan bir geometri instance'lanır (GPU'da tek draw call'a
 *     yakın maliyet). Bkz. `Instances`/`Instance` kullanımı.
 *   - 200'den fazla kabin olduğunda çerçeve/bezel çizgileri (ince detay)
 *     tamamen kaldırılır, yalnızca düz panel + doku kalır — hem çizim
 *     maliyeti hem de bellek düşer (bkz. `detailLevel`).
 *   - Kamera belli bir uzaklığın ötesindeyken (`camera.position.z` eşiği)
 *     doku çözünürlüğü ihtiyacı da azalır; `texture.anisotropy` ve
 *     `minFilter` ayarları bunu göz önünde bulundurur.
 */

const MAX_DETAILED_CABINETS = 200

/** İç L tipinde iki kanadın arasındaki açı 90° — yani her kanat eksenden 45° döner. */
const L_YARIM_ACI = Math.PI / 4

/**
 * EKRAN BİÇİMİ 3D'de
 *
 * 2D önizleme (WallPreview/CurvedScreen) düz, dışa kavisli, içe kavisli ve iç L
 * tipini çiziyordu; 3D sahne ise her yapılandırmayı düz duvar olarak gösteriyor,
 * yani seçilen biçim burada kayboluyordu. Aşağıdaki üç bileşen o boşluğu kapatır.
 *
 * Kavis derinliği 2D ile AYNI kaynaktan (`curveDepthFor`) geliyor — iki görünüm
 * arasında kavis miktarı tutarsız görünmesin diye.
 */

/**
 * ESNEK KABİN GÖVDESİ
 *
 * Kabinler DÜZ kutu olarak çizildiğinde kavisli duvarın dikişleri açılıyor:
 * kutu merkezleri R yarıçapındaki yayda dursa da kutunun ön yüzü konkavda
 * yaydan içeride, konveksde dışarıda kalıyor. İçerideki/dışarıdaki kirişin
 * boyu kabin genişliğinden farklı olduğu için komşu kutular ön kenarlarında
 * ya birbirini deliyor ya da aralarında kama biçimli karanlık yarıklar
 * bırakıyor — ekran görüntüsündeki dikey koyu bantlar buydu.
 *
 * Gerçek LED kabinleri esnek: kavis kabinin KENDİ içinde massediliyor, kabin
 * yayı takip ediyor. Burada da her kabin düz kutu yerine yayın üstüne oturan
 * bükülmüş bir dilim olarak üretiliyor; böylece ön yüzler her kavis
 * miktarında uç uca geliyor ve dikişte kalınlık görünmüyor.
 *
 * Tüm kabinler tek bir BufferGeometry'de birleştiriliyor (Instances bir kutuyu
 * paylaştığı için kabin başına farklı büküm veremezdi).
 */
function esnekKabinGovdesi({ cabH, cabD, cols, rows, R, aci, konkav, bosluk }) {
  const totalH = rows * cabH
  const adim = aci / cols
  // Kenar boşluğu (bezel) açı cinsinden: yay boyunca sabit uzunluk kalsın
  const acikPay = bosluk / R / 2
  const yPay = bosluk / 2

  const pos = []
  const idx = []

  for (let c = 0; c < cols; c++) {
    const a0 = -aci / 2 + c * adim + acikPay
    const a1 = -aci / 2 + (c + 1) * adim - acikPay
    // Kabin ne kadar dönüyorsa o kadar dilim: düşük kavislerde tek dilim yeter
    const dilim = Math.max(1, Math.ceil((a1 - a0) / 0.035))

    for (let r = 0; r < rows; r++) {
      const yAlt = r * cabH - totalH / 2 + yPay
      const yUst = (r + 1) * cabH - totalH / 2 - yPay
      const taban = pos.length / 3

      for (let i = 0; i <= dilim; i++) {
        const a = a0 + ((a1 - a0) * i) / dilim
        const on = yayNoktasi(a, R, konkav, cabD / 2)
        const arka = yayNoktasi(a, R, konkav, -cabD / 2)
        // Halka başına 4 köşe: ön-alt, ön-üst, arka-üst, arka-alt
        pos.push(on.x, yAlt, on.z)
        pos.push(on.x, yUst, on.z)
        pos.push(arka.x, yUst, arka.z)
        pos.push(arka.x, yAlt, arka.z)
      }

      // Halkalar arası dört yüzey şeridi (ön, üst, arka, alt)
      for (let i = 0; i < dilim; i++) {
        const s = taban + i * 4
        const n = s + 4
        for (let k = 0; k < 4; k++) {
          const a = s + k
          const b = s + ((k + 1) % 4)
          const c2 = n + ((k + 1) % 4)
          const d = n + k
          idx.push(a, b, c2, a, c2, d)
        }
      }

      // İki uç kapak
      const ilk = taban
      const son = taban + dilim * 4
      idx.push(ilk, ilk + 2, ilk + 1, ilk, ilk + 3, ilk + 2)
      idx.push(son, son + 1, son + 2, son, son + 2, son + 3)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Kiriş genişliği ve sarkma derinliğinden yarıçap + toplam yay açısı. */
function yayOlculeri(genislik, derinlik) {
  const d = Math.max(0.0001, derinlik)
  const R = (genislik * genislik) / (8 * d) + d / 2
  const aci = 2 * Math.asin(Math.min(1, genislik / (2 * R)))
  return { R, aci }
}

/**
 * Bir sütunun yay üzerindeki konumu ve kendi ekseni etrafındaki dönüşü.
 *
 * `d` verilirse nokta yaydan d kadar DIŞARI (izleyiciye doğru, yani yüzey
 * normali boyunca) kaydırılır. Bu, içerik yüzeyini kabinlerin önüne koymak için
 * şart: kaydırma dünya-z'sinde yapılırsa kenarlarda panel eğildiği için kayma
 * normal yönünde küçülüyor, yüzey kabinlerin içine gömülüyor ve ekran
 * mavi/siyah şeritler halinde parçalanmış görünüyordu (z-fighting).
 */
function yayNoktasi(a, R, konkav, d = 0) {
  /*
   * İşaret: içe kavisli (konkav) ekranda kenarlar İZLEYİCİYE doğru gelir, orta
   * geride kalır; dışa kavislide tersi. Panelin dönüşü de aynı işaretle ters
   * yönde — böylece her kabin yayın teğetinde durur, kenarlar birbirine girmez.
   */
  const u = konkav ? -1 : 1 // yayın merkezi konkavda önde, konveksde arkada
  const merkezZ = -u * R
  const yaricap = R + u * d // konkavda dışarısı KÜÇÜK yarıçap tarafıdır
  return {
    x: yaricap * Math.sin(a),
    z: merkezZ + u * yaricap * Math.cos(a),
    rotY: u * a,
  }
}

/** Kavisli bir duvarın yarıçapı ve toplam yay açısı (kabinden türetilmiş adımla). */
function kavisOlculeri(cols, cabW, curveAmount, konkav) {
  const totalW = cols * cabW
  const derinlik = (Math.max(0, Math.min(100, curveAmount)) / 100) * totalW * curveDepthFor(konkav)
  const { R } = yayOlculeri(totalW, derinlik)
  const adim = 2 * Math.asin(Math.min(1, cabW / (2 * R)))
  return { R, aci: adim * cols }
}

/**
 * Bir ekranın UÇ NOKTALARI: sol ve sağ kenarının, ekranın kendi merkezine göre
 * konumu (x, z) ve o kenardaki yüzey açısı.
 *
 * Çoklu ekranda ekranlar bu uçlardan birbirine EKLENİYOR. Yalnızca X'te genişlik
 * toplamak yetmez: kavisli ekranın uçları merkezine göre ileri/geri kaçar, iç L
 * tipinin uçları ise hem yana hem öne gider. Uçlar eşleştirilmezse yan yana
 * duran farklı türler arasında hem yatay hem derinlik farkı kalıyor, ekranlar
 * kopuk görünüyordu.
 *
 * Açı = o kenardaki panelin Y ekseni etrafındaki dönüşü; iki ekranın birleştiği
 * yerde aradaki dönüş farkı dikiş payını belirler (bkz. dikisPayi).
 */
function ekranUclari(s, cabW, curveAmount) {
  const cols = Math.max(1, s.cols || 1)
  const tip = s.type || 'flat'

  if (tip === 'lshape') {
    const solCols = Math.max(1, s.leftCols || Math.ceil(cols / 2))
    const sagCols = Math.max(1, s.rightCols || Math.max(1, cols - solCols))
    const cos = Math.cos(L_YARIM_ACI)
    const sin = Math.sin(L_YARIM_ACI)
    return {
      sol: { x: -solCols * cabW * cos, z: solCols * cabW * sin, aci: L_YARIM_ACI },
      sag: { x: sagCols * cabW * cos, z: sagCols * cabW * sin, aci: -L_YARIM_ACI },
    }
  }

  if (tip === 'curved' || tip === 'curvedIn') {
    const konkav = tip === 'curvedIn'
    const { R, aci } = kavisOlculeri(cols, cabW, curveAmount, konkav)
    const uc = yayNoktasi(aci / 2, R, konkav)
    return {
      sol: { x: -uc.x, z: uc.z, aci: -uc.rotY },
      sag: { x: uc.x, z: uc.z, aci: uc.rotY },
    }
  }

  const yari = (cols * cabW) / 2
  return { sol: { x: -yari, z: 0, aci: 0 }, sag: { x: yari, z: 0, aci: 0 } }
}

/**
 * DİKİŞ PAYI
 *
 * İçerik yüzeyi kabinlerin ÖN yüzünde durur. İki ekran birbirine açılı
 * birleştiğinde (iç L'nin dış ucu, komşu ekranın başlangıcı) bu iki ön yüz
 * köşede birbirinden uzaklaşır ve aradan kabin kalınlığı görünür — ekran
 * görüntüsündeki koyu şerit. Gerçekte köşe kabinleri gönyeli kesilir, kalınlık
 * görünmez.
 *
 * Karşılığı: birleşen kenarda içerik yüzeyi, iki yüzey arasındaki DÖNÜŞ kadar
 * uzatılır: pay = mesafe × tan(dönüş / 2). 90°'lik köşede bu tam olarak
 * mesafeye eşit olur (tan45 = 1) ve iki yüzey köşede birebir buluşur; düz iki
 * ekran arasında dönüş sıfır olduğu için pay da sıfırdır.
 *
 * Yalnızca DIŞA dönen (konveks) köşelerde gerek var; içe dönen köşelerde iki
 * yüzey zaten örtüşür. Serbest (komşusuz) kenarlara da pay verilmez, oralarda
 * panel havada uzamasın.
 */
const onYuzMesafesi = (cabD) => cabD / 2 + 0.002

function dikisPayi(cabD, donus) {
  if (!(donus > 0.0001)) return 0
  // Dönüş 180°'ye yaklaşırsa tanjant patlar; makul bir tavanla sınırlanır
  return onYuzMesafesi(cabD) * Math.min(4, Math.tan(Math.min(donus, Math.PI * 0.8) / 2))
}

/** Düz bir kabin duvarı + önüne gerilen içerik düzlemi. */
function DuzDuvar({ cabW, cabH, cabD, cols, rows, texture, showBezels, uvOffset = 0, uvRepeat = 1, payL = 0, payR = 0 }) {
  const totalW = cols * cabW
  const totalH = rows * cabH

  const positions = useMemo(() => {
    const arr = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        arr.push([c * cabW - totalW / 2 + cabW / 2, r * cabH - totalH / 2 + cabH / 2, 0])
      }
    }
    return arr
  }, [cols, rows, cabW, cabH, totalW, totalH])

  return (
    <group>
      <Instances limit={Math.max(1, positions.length)} range={positions.length}>
        <boxGeometry args={[cabW - (showBezels ? 0.003 : 0), cabH - (showBezels ? 0.003 : 0), cabD]} />
        <meshStandardMaterial roughness={0.55} metalness={0.15} color="#12151c" />
        {positions.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>

      <mesh position={[(payR - payL) / 2, 0, cabD / 2 + 0.002]}>
        <planeGeometry args={[totalW + payL + payR, totalH]} />
        <IcerikMalzemesi texture={texture} uvOffset={uvOffset} uvRepeat={uvRepeat} />
      </mesh>
    </group>
  )
}

/** Kavisli duvar: kabinler yay üzerine dizilir, içerik düzlemi de aynı yaya bükülür. */
function KavisliDuvar({ cabW, cabH, cabD, cols, rows, texture, showBezels, curveAmount, konkav, uvOffset = 0, uvRepeat = 1, payL = 0, payR = 0 }) {
  const totalW = cols * cabW
  const totalH = rows * cabH
  /*
   * KABİNLER ARASINDA BOŞLUK OLMAMALI
   *
   * Yarıçap toplam genişlikten (kiriş) hesaplanıyor, ama sütunlar yaya EŞİT AÇI
   * ile bölünürse her kabinin kapladığı kiriş kabin genişliğinden bir tık uzun
   * düşüyor; düz kutular yayda uç uca gelmiyor ve dikişlerde kama biçimli
   * boşluklar açılıyordu (ekran görüntüsündeki yarıklar).
   *
   * Doğrusu açıyı kabinden türetmek: bir kabin yayda tam olarak kendi
   * genişliği kadar KİRİŞ kaplasın, yani adım açısı 2·asin(cabW / 2R). Gerçek
   * LED kabinleri de esnek olduğundan kavis kabinin kendi içinde massedilir —
   * komşular birbirine değmeye devam eder. Toplam yay açısı da bu adımların
   * toplamı; içerik yüzeyi aynı açıyı kullandığı için panelle birebir örtüşür.
   */
  const { R, aci } = useMemo(
    () => kavisOlculeri(cols, cabW, curveAmount, konkav),
    [cols, cabW, curveAmount, konkav],
  )

  // Kabin gövdeleri: düz kutu değil, yayı takip eden bükülmüş dilimler
  const govde = useMemo(
    () =>
      esnekKabinGovdesi({
        cabH,
        cabD,
        cols,
        rows,
        R,
        aci,
        konkav,
        bosluk: showBezels ? 0.003 : 0,
      }),
    [cabH, cabD, cols, rows, R, aci, konkav, showBezels],
  )

  useEffect(() => () => govde.dispose(), [govde])

  /*
   * İçerik yüzeyi: düz bir düzlemin köşe noktaları yayın üstüne taşınıyor.
   * (CylinderGeometry yerine bu yol seçildi; UV'ler düzlemdeki gibi kalıyor,
   * yani içerik 2D önizlemedeki gibi kırpılmadan geriliyor.)
   */
  const geometri = useMemo(() => {
    const seg = Math.max(24, Math.min(160, cols * 4))
    const g = new THREE.PlaneGeometry(totalW + payL + payR, totalH, seg, 1)
    const p = g.attributes.position
    // Dikiş payı yaya AÇI olarak eklenir: pay uzunluğu / yarıçap
    const acıPayL = payL / R
    const acıPayR = payR / R
    const genisAci = aci + acıPayL + acıPayR
    const merkezKayma = (acıPayR - acıPayL) / 2
    for (let i = 0; i < p.count; i++) {
      const oran = p.getX(i) / (totalW + payL + payR) // -0.5 .. 0.5
      const a = oran * genisAci + merkezKayma
      // Yüzey, kabinlerin ön yüzünden 2 mm dışarıda — normal boyunca kaydırılır
      const { x, z } = yayNoktasi(a, R, konkav, cabD / 2 + 0.002)
      p.setX(i, x)
      p.setZ(i, z)
    }
    p.needsUpdate = true
    g.computeVertexNormals()
    return g
  }, [totalW, totalH, cols, aci, R, konkav, cabD, payL, payR])

  // Geometri yeniden üretildiğinde eskisinin GPU belleği bırakılmalı
  useEffect(() => () => geometri.dispose(), [geometri])

  return (
    <group>
      <mesh geometry={govde}>
        <meshStandardMaterial roughness={0.55} metalness={0.15} color="#12151c" />
      </mesh>

      <mesh geometry={geometri}>
        <IcerikMalzemesi texture={texture} uvOffset={uvOffset} uvRepeat={uvRepeat} />
      </mesh>
    </group>
  )
}

/** İç L tipi: iki düz kanat ortada 90°'lik bir köşe yapar. */
function LDuvar({ cabW, cabH, cabD, cols, rows, texture, showBezels, leftCols, rightCols, uvOffset = 0, uvRepeat = 1, payL = 0, payR = 0 }) {
  const solCols = Math.max(1, leftCols || Math.ceil(cols / 2))
  const sagCols = Math.max(1, rightCols || Math.max(1, cols - solCols))
  const toplamCols = solCols + sagCols
  const solW = solCols * cabW
  const sagW = sagCols * cabW
  const cos = Math.cos(L_YARIM_ACI)
  const sin = Math.sin(L_YARIM_ACI)

  /*
   * Köşe (dikiş) orijinde; iki kanat oradan izleyiciye doğru açılıyor. Kanat
   * merkezleri kendi uzunluklarının yarısı kadar dışarı kaydırılıyor, dönüşleri
   * ±45° — aradaki açı 90°, dikişte boşluk kalmıyor.
   *
   * İçerik tek görsel: her kanat dokunun kendi sütun payına düşen dilimini
   * gösteriyor (uvOffset/uvRepeat), 2D'deki bölme mantığıyla aynı.
   *
   * Dikiş payı kanatların DIŞ uçlarına verilir (sol kanadın local -x'i, sağ
   * kanadın local +x'i): komşu ekranla birleşen kenarlar bunlar. Ortadaki köşe
   * içbükey olduğu için iki yüzey orada zaten örtüşür, pay gerekmez.
   */
  return (
    <group>
      <group position={[-(solW / 2) * cos, 0, (solW / 2) * sin]} rotation={[0, L_YARIM_ACI, 0]}>
        <DuzDuvar
          cabW={cabW}
          cabH={cabH}
          cabD={cabD}
          cols={solCols}
          rows={rows}
          texture={texture}
          showBezels={showBezels}
          uvOffset={uvOffset}
          uvRepeat={uvRepeat * (solCols / toplamCols)}
          payL={payL}
        />
      </group>
      <group position={[(sagW / 2) * cos, 0, (sagW / 2) * sin]} rotation={[0, -L_YARIM_ACI, 0]}>
        <DuzDuvar
          cabW={cabW}
          cabH={cabH}
          cabD={cabD}
          cols={sagCols}
          rows={rows}
          texture={texture}
          showBezels={showBezels}
          uvOffset={uvOffset + uvRepeat * (solCols / toplamCols)}
          uvRepeat={uvRepeat * (sagCols / toplamCols)}
          payR={payR}
        />
      </group>
    </group>
  )
}

/**
 * İçerik yüzeyinin malzemesi. Doku yoksa 2D'deki "yayında panel" görünümüne
 * denk düşen mavi ışıklı yüzey kullanılır.
 *
 * uvOffset/uvRepeat verilirse doku yatayda dilimlenir — L tipinde iki kanadın
 * tek bir görseli paylaşması için gerekli. Doku paylaşıldığı için her dilim
 * kendi klonunu kullanır (repeat/offset dokunun kendi özelliği).
 */
function IcerikMalzemesi({ texture, uvOffset = 0, uvRepeat = 1 }) {
  const dilim = useMemo(() => {
    if (!texture) return null
    if (uvOffset === 0 && uvRepeat === 1) return texture
    const t = texture.clone()
    t.needsUpdate = true
    t.offset.set(uvOffset, 0)
    t.repeat.set(uvRepeat, 1)
    return t
  }, [texture, uvOffset, uvRepeat])

  useEffect(() => {
    if (dilim && dilim !== texture) return () => dilim.dispose()
    return undefined
  }, [dilim, texture])

  if (dilim) return <meshBasicMaterial map={dilim} toneMapped={false} />
  return <meshStandardMaterial color="#0a4f8c" emissive="#0a4f8c" emissiveIntensity={0.4} />
}

/** Tek bir ekranı, biçimine göre doğru duvar bileşeniyle çizer. */
function Duvar({ ortak, screenType, curveAmount, leftCols, rightCols, uvOffset, uvRepeat, payL, payR }) {
  const uv = { uvOffset, uvRepeat, payL, payR }
  if (screenType === 'lshape') {
    return <LDuvar {...ortak} {...uv} leftCols={leftCols} rightCols={rightCols} />
  }
  if (screenType === 'curved' || screenType === 'curvedIn') {
    return <KavisliDuvar {...ortak} {...uv} curveAmount={curveAmount} konkav={screenType === 'curvedIn'} />
  }
  return <DuzDuvar {...ortak} {...uv} />
}

/**
 * Sahnedeki ekran(lar).
 *
 * `screens` verilmişse çoklu ekran düzeni çizilir: 2D önizlemedeki gibi ekranlar
 * yan yana, aralarında boşluk olmadan ve ALTTAN hizalı dizilir; tek içerik
 * görseli şeridin tamamına yayılıp her ekranın genişlik payına düşen dilimi o
 * ekrana verilir. Her ekran kendi biçimini (düz / kavisli / iç L) korur.
 */
function CabinetGrid({ model, cols, rows, content, contentUrl, detailLevel, screenType, curveAmount, leftCols, rightCols, screens }) {
  const cabW = (model?.widthMm || 500) / 1000
  const cabH = (model?.heightMm || 500) / 1000
  const cabD = (model?.depthMm || 100) / 1000

  /*
   * İÇERİK KAYNAĞI
   *
   * Eskiden yalnızca `contentUrl` kullanılıyordu; o da sadece kullanıcı kendi
   * görselini YÜKLEDİĞİNDE doluyor. "Örnek görüntü" seçiliyken tasarımda resim
   * görünüyor ama 3D'de görünmüyordu, çünkü onun kaynağı `contentUrl` değil
   * varsayılan görsel. Kaynak artık 2D tarafla (CurvedScreen) aynı kuralla
   * seçiliyor.
   */
  const src = useMemo(() => {
    if (content === 'photo') return DEFAULT_CONTENT_SRC
    if (content === 'upload' && contentUrl) return contentUrl
    // Geriye dönük: içerik türü bilinmiyorsa elde bir URL varsa o kullanılır
    if (!content && contentUrl) return contentUrl
    return null
  }, [content, contentUrl])

  // VİDEO içerik ('Örnek video' ve yüklenen video) — 2D tarafla aynı kural
  const videoSrc = useMemo(() => videoSrcFor(content, contentUrl), [content, contentUrl])

  /*
   * VİDEO DA 3D'DE VE AR'DE GÖRÜNÜR.
   *
   * Belirti: tasarımda video seçiliyken 3D görünümde ve oradan açılan AR'de
   * panel simsiyah bir kutu olarak duruyordu — çünkü doku yalnızca GÖRSEL
   * kaynaklardan üretiliyor, video hiç okunmuyordu.
   *
   * Video doğrudan THREE.VideoTexture ile de verilebilirdi, ama AR için sahne
   * GLB dosyasına aktarılıyor ve GLTFExporter video dokusunu yazamıyor: AR'de
   * panel yine boş kalırdı. Bunun yerine videonun kareleri bir tuvale
   * çiziliyor ve tuval dokusu kullanılıyor. Tuval hem 3D'de canlı akar hem de
   * dışa aktarımda o anki kare gömülü görsel olarak GLB'ye girer.
   */
  const texture = useMemo(() => {
    if (videoSrc) {
      const tuval = document.createElement('canvas')
      tuval.width = 1280
      tuval.height = 720
      const ctx = tuval.getContext('2d')
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, tuval.width, tuval.height)
      const tex = new THREE.CanvasTexture(tuval)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 4
      // Video öğesi dokunun yanında taşınır ki her karede ondan okunabilsin
      tex.userData.video = createVideoElement(videoSrc)
      return tex
    }
    if (!src) return null
    const loader = new THREE.TextureLoader()
    const tex = loader.load(src)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [src, videoSrc])

  // Doku değişince/sahne kapanınca video ve doku bırakılır
  useEffect(() => {
    return () => {
      const v = texture?.userData?.video
      if (v) {
        v.pause()
        v.removeAttribute('src')
        v.load()
      }
      texture?.dispose?.()
    }
  }, [texture])

  // Her karede videonun o anki görüntüsü tuvale çizilir
  useFrame(() => {
    const v = texture?.userData?.video
    if (!v || v.readyState < 2) return
    const tuval = texture.image
    const ctx = tuval.getContext('2d')
    ctx.drawImage(v, 0, 0, tuval.width, tuval.height)
    texture.needsUpdate = true
  })

  const showBezels = detailLevel === 'high'

  // Çoklu ekran: şerit üzerinde konumlar
  const yerlesim = useMemo(() => {
    if (!screens?.length) return null
    const list = screens.map((s) => ({
      ...s,
      cols: Math.max(1, s.cols || 1),
      rows: Math.max(1, s.rows || 1),
    }))
    /*
     * ZİNCİRLEME
     *
     * Her ekran, SOL ucu bir öncekinin SAĞ ucuyla çakışacak şekilde konuluyor —
     * hem x hem z'de. Böylece farklı boyutta ve farklı türde ekranlar (düz,
     * kavisli, iç L) yan yana geldiğinde uçları birbirine değiyor; kavislinin
     * uçlarının öne/arkaya kaçması ya da L'nin daralması boşluk yaratmıyor.
     *
     * Dikey hizalama alttan (2D önizlemedeki gibi): boyları farklı ekranlar
     * tabanda buluşur.
     */
    const uclar = list.map((s) => ekranUclari(s, cabW, curveAmount))
    const enYuksek = Math.max(...list.map((s) => s.rows * cabH))

    let x = 0
    let z = 0
    const konum = list.map((s, i) => {
      // Ekranın merkezi: sol ucu mevcut zincir ucuna denk gelecek şekilde
      const p = { x: x - uclar[i].sol.x, z: z - uclar[i].sol.z }
      x = p.x + uclar[i].sag.x
      z = p.z + uclar[i].sag.z
      return p
    })

    // Zinciri yatayda ortala (ilk sol uç ile son sağ uç arasının ortası orijine)
    const ortala = (konum[0].x + uclar[0].sol.x + x) / 2
    const genislikler = uclar.map((u) => u.sag.x - u.sol.x)
    const toplamW = genislikler.reduce((acc, w) => acc + w, 0)

    let uv = 0
    return list.map((s, i) => {
      const h = s.rows * cabH
      /*
       * Dikiş payı komşuyla arasındaki DÖNÜŞE göre: iki yüzey dışa dönerek
       * birleşiyorsa (ör. iki iç L'nin sırt sırta gelen uçları) aradan kabin
       * kalınlığı görünmesin diye yüzey uzatılır.
       */
      const oncekiDonus = i > 0 ? uclar[i].sol.aci - uclar[i - 1].sag.aci : 0
      const sonrakiDonus = i < list.length - 1 ? uclar[i + 1].sol.aci - uclar[i].sag.aci : 0
      const yer = {
        key: i,
        s,
        x: konum[i].x - ortala,
        y: (h - enYuksek) / 2,
        z: konum[i].z,
        uvOffset: uv,
        uvRepeat: genislikler[i] / toplamW,
        payL: dikisPayi(cabD, oncekiDonus),
        payR: dikisPayi(cabD, sonrakiDonus),
      }
      uv += genislikler[i] / toplamW
      return yer
    })
  }, [screens, cabW, cabH, cabD, curveAmount])

  if (yerlesim) {
    return (
      <group>
        {yerlesim.map((y) => (
          <group key={y.key} position={[y.x, y.y, y.z]}>
            <Duvar
              ortak={{ cabW, cabH, cabD, cols: y.s.cols, rows: y.s.rows, texture, showBezels }}
              screenType={y.s.type || 'flat'}
              curveAmount={curveAmount}
              leftCols={y.s.leftCols}
              rightCols={y.s.rightCols}
              uvOffset={y.uvOffset}
              uvRepeat={y.uvRepeat}
              payL={y.payL}
              payR={y.payR}
            />
          </group>
        ))}
      </group>
    )
  }

  return (
    <Duvar
      ortak={{ cabW, cabH, cabD, cols, rows, texture, showBezels }}
      screenType={screenType}
      curveAmount={curveAmount}
      leftCols={leftCols}
      rightCols={rightCols}
    />
  )
}

function SceneContent({ model, cols, rows, content, contentUrl, onReady, screenType, curveAmount, leftCols, rightCols, screens }) {
  const { camera } = useThree()
  const cabinetCount = screens?.length
    ? screens.reduce((acc, s) => acc + Math.max(1, s.cols || 1) * Math.max(1, s.rows || 1), 0)
    : cols * rows
  const detailLevel = cabinetCount > MAX_DETAILED_CABINETS ? 'low' : 'high'
  const enYuksekRows = screens?.length
    ? Math.max(...screens.map((s) => Math.max(1, s.rows || 1)))
    : rows

  /*
   * AR dışa aktarımı SAHNENİN TAMAMINI değil, yalnızca ÜRÜNÜ alır.
   *
   * Eskiden `scene` veriliyordu; içinde ContactShadows'un zemin gölgesi de
   * vardı. O gölge bir render hedefine çiziliyor ve düzleme doku olarak
   * bindiriliyor; GLTFExporter render hedefi dokusunu okuyamıyor ve
   * "Invalid image type" diyerek tüm dışa aktarımı düşürüyordu. "AR'da Gör"
   * her tıklamada bu yüzden hata veriyordu.
   *
   * Zaten yalnızca ürün gitmeli: gölge, ortam ışığı ve sahne lambaları
   * AR görüntüleyicisinin kendi ortamında yeniden üretiliyor; onları modele
   * gömmek yanlış sonuç verirdi.
   */
  const urunRef = useRef(null)
  useEffect(() => {
    if (urunRef.current) onReady?.(urunRef.current, camera)
  }, [camera, onReady, screens, cols, rows, screenType, content, contentUrl])

  return (
    <>
      {/* HDRI ortam ışığı: "warehouse" preset'i drei'nin barındırdığı bir HDR
          panoramadan gerçek zamanlı yansıma/aydınlatma üretir (fotogerçekçilik).
          Preset yüklenemezse (örn. ağ kısıtlı ortam) Suspense fallback'i devreye
          girer ve sahne düz ambient/directional ışıkla görünür kalır. */}
      <Suspense fallback={<ambientLight intensity={0.9} />}>
        <Environment preset="warehouse" />
      </Suspense>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} castShadow />

      <group ref={urunRef}>
        <CabinetGrid
          model={model}
          cols={cols}
          rows={rows}
          content={content}
          contentUrl={contentUrl}
          detailLevel={detailLevel}
          screenType={screenType}
          curveAmount={curveAmount}
          leftCols={leftCols}
          rightCols={rightCols}
          screens={screens}
        />
      </group>

      {/* Zemin gölgesi en yüksek ekranın altına oturur (çoklu ekranda boylar farklı) */}
      <ContactShadows position={[0, -(enYuksekRows * (model?.heightMm || 500)) / 2000 - 0.05, 0]} opacity={0.45} scale={10} blur={2} far={2} />
    </>
  )
}

/**
 * USDZ, YALNIZCA MeshStandardMaterial ANLAR.
 *
 * Ekran yüzeyi sahnede `meshBasicMaterial` kullanıyor (ışıktan etkilenmesin,
 * görüntü olduğu gibi görünsün diye). USDZExporter bu türü tanımıyor ve
 * "Unsupported material type" deyip atlıyor: iPhone'da Quick Look'ta panelin
 * içeriği kayboluyor, geriye kapkara kabin gövdeleri kalıyordu.
 *
 * Dışa aktarma sırasında bu malzemeler geçici olarak MeshStandardMaterial'e
 * çevriliyor. Doku hem `map` hem `emissiveMap` olarak veriliyor: LED paneli
 * ışık YAYAR, o yüzden AR'de odanın aydınlatmasından bağımsız olarak parlak
 * görünmeli — aksi halde karanlık bir odada ekran da sönük çıkardı. Aynı
 * malzeme GLB'ye de gidiyor, yani Android tarafı da bundan kazanıyor.
 *
 * Değiştirilen malzemeler geri konmak üzere döndürülüyor; sahnedeki canlı
 * görüntü hiç bozulmuyor.
 */
function disaAktarmaMalzemeleri(scene) {
  const geriAl = []
  scene.traverse((o) => {
    const m = o.material
    if (!m || !m.isMeshBasicMaterial) return
    const std = new THREE.MeshStandardMaterial({
      map: m.map || null,
      color: m.color ? m.color.clone() : new THREE.Color(0xffffff),
      emissive: new THREE.Color(0xffffff),
      emissiveMap: m.map || null,
      emissiveIntensity: 1,
      roughness: 0.35,
      metalness: 0,
      toneMapped: false,
    })
    geriAl.push({ nesne: o, eski: m, yeni: std })
    o.material = std
  })
  return {
    geriYukle() {
      for (const k of geriAl) {
        k.nesne.material = k.eski
        k.yeni.dispose()
      }
    },
  }
}

/**
 * INSTANCE'LAR DIŞA AKTARIMDA GERÇEK NESNEYE ÇEVRİLİR.
 *
 * Kabin gövdeleri sahnede tek bir InstancedMesh olarak çiziliyor (yüzlerce
 * kabin tek çizim çağrısına iniyor, bkz. `Instances`). Ama:
 *   • USDZExporter instance matrislerini hiç yazmıyor — ürettiği dosyada
 *     kabinlerin yalnızca BİRİ geometri taşıyor, kalanlar boş birer düğüm
 *     olarak çıkıyor.
 *   • Sonuç: iPhone'da Quick Look'ta duvarın arkasına dönüldüğünde koca bir
 *     LED duvar yerine tek, ince bir plaka görünüyordu.
 *
 * Dışa aktarma sırasında instance'lar geçici olarak sıradan mesh'lere
 * açılıyor: geometri ve malzeme PAYLAŞILIYOR, yalnızca konum/dönüş/ölçek
 * kopyalanıyor — bellek maliyeti yok denecek kadar az. Sahne dosyaya
 * yazıldıktan sonra her şey aynen geri konuyor, canlı görünüm instance'lı
 * hızlı hâline dönüyor.
 */
function disaAktarmaGeometrileri(scene) {
  const geriAl = []
  const hedefler = []
  scene.traverse((o) => { if (o.isInstancedMesh) hedefler.push(o) })

  for (const im of hedefler) {
    const ebeveyn = im.parent
    if (!ebeveyn) continue

    const grup = new THREE.Group()
    grup.name = im.name || 'Kabinler'
    // InstancedMesh'in KENDİ dönüşümü (kavisli duvarda grup döndürülüyor)
    grup.position.copy(im.position)
    grup.quaternion.copy(im.quaternion)
    grup.scale.copy(im.scale)

    const m = new THREE.Matrix4()
    const adet = Math.min(im.count, im.instanceMatrix?.count ?? im.count)
    for (let i = 0; i < adet; i++) {
      im.getMatrixAt(i, m)
      const mesh = new THREE.Mesh(im.geometry, im.material)
      m.decompose(mesh.position, mesh.quaternion, mesh.scale)
      grup.add(mesh)
    }

    const sira = ebeveyn.children.indexOf(im)
    ebeveyn.remove(im)
    ebeveyn.add(grup)
    geriAl.push({ ebeveyn, im, grup, sira })
  }

  return {
    geriYukle() {
      for (const k of geriAl) {
        k.ebeveyn.remove(k.grup)
        k.grup.clear() // geometri/malzeme paylaşıldığı için dispose EDİLMEZ
        k.ebeveyn.add(k.im)
        // Kardeş sırası korunur: çizim sırası sahnedeki yerleşimi etkiliyor
        const su = k.ebeveyn.children.indexOf(k.im)
        if (k.sira >= 0 && su !== k.sira) {
          k.ebeveyn.children.splice(su, 1)
          k.ebeveyn.children.splice(k.sira, 0, k.im)
        }
      }
    },
  }
}

/** GLB + USDZ dışa aktarma ve `<model-viewer>` ile gerçek Scene Viewer / Quick Look AR. */
function useGlbAr() {
  const { t } = useLang()
  const [busy, setBusy] = useState(false)
  const [viewerUrl, setViewerUrl] = useState(null)
  // iOS Quick Look yalnızca USDZ açar; GLB'yi hiç tanımaz (bkz. model-viewer)
  const [iosUrl, setIosUrl] = useState(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)

  const onReady = useCallback((scene, camera) => {
    sceneRef.current = scene
    cameraRef.current = camera
  }, [])

  const exportAndOpen = useCallback(async () => {
    if (!sceneRef.current) return
    setBusy(true)
    try {
      // model-viewer web component'i yalnızca ihtiyaç anında yükleniyor
      // (dynamic import) — kullanılmıyorsa ana paketin boyutunu şişirmez.
      await import('@google/model-viewer')

      /*
       * İÇERİK DOKUSU GERÇEKTEN HAZIR MI?
       *
       * Belirti: AR'de (Quick Look / Scene Viewer) panel kapkara çıkıyordu —
       * ne görsel ne video görünüyordu. Sebep iki ayrı yarış:
       *
       *   GÖRSEL: TextureLoader asenkron yüklüyor. Eskiden yalnızca dokunun
       *     `image` alanı DOLU MU diye bakılıyordu; oysa `image` daha ilk
       *     karede atanmış olabiliyor ve içi boş oluyor. Artık gerçekten
       *     çözülmüş mü (`complete` + genişlik) diye bakılıyor.
       *
       *   VİDEO: dokusu bir TUVAL. Tuval en baştan var, yani eski kontrol
       *     anında geçiyordu — ama üzerine henüz tek bir kare çizilmemişti.
       *     Dışa aktarılan şey o boş, siyah tuvaldi. Artık videonun ilk
       *     karesi beklenip tuvale ELLE çiziliyor; hazır kare GLB/USDZ'ye
       *     gömülüyor.
       *
       * Bekleme süresi 3 sn'den 10 sn'ye çıkarıldı: telefonda hücresel ağda
       * örnek video/görsel bu sürede inmiyordu ve boş doku aktarılıyordu.
       */
      await new Promise((resolve) => {
        const bitis = performance.now() + 10000
        const bak = () => {
          let bekleyen = false
          sceneRef.current.traverse((o) => {
            const harita = o.material?.map
            if (!harita) return
            const video = harita.userData?.video
            if (video) {
              // Videonun ilk karesi gelmeden tuval boş; kareyi burada da çiz
              if (video.readyState < 2) { bekleyen = true; return }
              try {
                harita.image.getContext('2d').drawImage(video, 0, 0, harita.image.width, harita.image.height)
                harita.needsUpdate = true
              } catch { /* kare henüz çizilemiyor — bir sonraki turda yeniden */ }
              return
            }
            const g = harita.image
            const hazir = g && (g.complete === undefined || g.complete) && (g.naturalWidth ?? g.width ?? 0) > 0
            if (!hazir) bekleyen = true
          })
          if (!bekleyen || performance.now() > bitis) resolve()
          else requestAnimationFrame(bak)
        }
        bak()
      })

      /*
       * İKİ FORMAT birden üretiliyor — platformlar farklı dosya istiyor:
       *   Android (Scene Viewer) + WebXR → .glb
       *   iOS (Quick Look)               → .usdz
       * Eskiden yalnızca GLB vardı; iPhone'da `quick-look` kipi açılacak dosya
       * bulamadığı için "AR'da Gör" hiçbir şey yapmıyordu.
       */
      const acilmis = disaAktarmaGeometrileri(sceneRef.current)
      const kilit = disaAktarmaMalzemeleri(sceneRef.current)
      let glb
      let usdz = null
      try {
        glb = await new Promise((resolve, reject) => {
          new GLTFExporter().parse(
            sceneRef.current,
            (result) => resolve(result),
            (err) => reject(err),
            { binary: true },
          )
        })
        /*
         * USDZ üretimi başarısız olsa bile GLB ile devam edilir: Android ve
         * WebXR yine çalışsın, tek bir platformun sorunu hepsini düşürmesin.
         *
         * anchoring/planeAnchoring: modelin YATAY bir düzleme (zemin/masa)
         * oturacağını söyler — Quick Look açılır açılmaz yüzey arar ve
         * kullanıcı ekranı parmağıyla istediği yere sürükler.
         */
        try {
          usdz = await new USDZExporter().parseAsync(sceneRef.current, {
            ar: { anchoring: { type: 'plane' }, planeAnchoring: { alignment: 'horizontal' } },
            includeAnchoringProperties: true,
            maxTextureSize: 2048,
          })
        } catch (e) {
          console.warn('USDZ üretilemedi, iOS AR devre dışı:', e)
        }
      } finally {
        kilit.geriYukle()
        acilmis.geriYukle()
      }

      setViewerUrl(URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' })))
      setIosUrl(usdz ? URL.createObjectURL(new Blob([usdz], { type: 'model/vnd.usdz+zip' })) : null)
    } catch (e) {
      console.error('AR modeli oluşturulamadı:', e)
      alert(t('scene3d.arExportError'))
    } finally {
      setBusy(false)
    }
  }, [t])

  const close = useCallback(() => {
    if (viewerUrl) URL.revokeObjectURL(viewerUrl)
    if (iosUrl) URL.revokeObjectURL(iosUrl)
    setViewerUrl(null)
    setIosUrl(null)
  }, [viewerUrl, iosUrl])

  return { onReady, exportAndOpen, close, viewerUrl, iosUrl, busy }
}

/** Alt bardaki arka plan düğmesi — kameradaki AracDugme ile aynı görünüm. */
function ArkaPlanDugme({ onClick, etiket, deger, aktif = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[64px] transition-colors ${
        aktif ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white'
      }`}
    >
      <span className="text-[10px] uppercase tracking-wide">{etiket}</span>
      <span className="text-[12px] font-semibold">{deger}</span>
    </button>
  )
}

export default function Scene3D({ open, onClose, model, cols, rows, content, contentUrl, screenType = 'flat', curveAmount = 60, leftCols, rightCols, screens, onOpenCamera, onSaved }) {
  const { t } = useLang()
  const { onReady, exportAndOpen, close, viewerUrl, iosUrl, busy } = useGlbAr()

  /*
   * AR GERÇEKTEN AÇILABİLİYOR MU?
   *
   * Bunu tarayıcı adından tahmin etmiyoruz; model-viewer modeli yükleyip
   * platformu yokladıktan sonra `canActivateAR` ile kendisi söylüyor. Cevap
   * `ar-status` olayıyla geliyor, o yüzden hem olaya abone oluyoruz hem de
   * (olay biz dinlemeye başlamadan önce geçmiş olabileceği için) bir kez
   * doğrudan okuyoruz.
   */
  const mvRef = useRef(null)
  const [arDestekli, setArDestekli] = useState(false)
  useEffect(() => {
    const mv = mvRef.current
    if (!viewerUrl || !mv) {
      setArDestekli(false)
      return
    }
    const bak = () => setArDestekli(!!mv.canActivateAR)
    bak()
    mv.addEventListener('ar-status', bak)
    mv.addEventListener('load', bak)
    return () => {
      mv.removeEventListener('ar-status', bak)
      mv.removeEventListener('load', bak)
    }
  }, [viewerUrl, iosUrl])

  /*
   * YERLEŞTİRME AKIŞI — kameradakinin (ArView) AR ekranındaki karşılığı.
   * Amazon'da AR üç adımda yürüyor ve her adım ne yapılacağını kendisi
   * söylüyor: karşılama kartı → "yerleştirmek için dokunun" → yerleşmiş
   * ürünün araçları. Burası model-viewer üstünde aynı sırayı kuruyor.
   *
   * NOT: Ürün gerçekten odaya oturtulduğunda (Scene Viewer / Quick Look /
   * WebXR) yerleştirmeyi ARTIK İŞLETİM SİSTEMİ yönetir; oradaki arayüzü
   * tarayıcıdan değiştiremeyiz. Bu akış AR'a girmeden önceki sayfa-içi
   * görünümde çalışır: jestler burada öğrenilir, ölçü ve açı burada
   * ayarlanır, sonra tek dokunuşla odaya taşınır.
   */
  const [asama, setAsama] = useState('yerlestir')
  /* Kaydetme/paylaşma sonrası kısa onay yazısı — kameradakiyle aynı */
  const [arBildirim, setArBildirim] = useState(null)

  /*
   * EL ANİMASYONU (model-viewer'ın etkileşim ipucu) SÜREKLİ DÖNÜYORDU.
   *
   * Sebep: ipucu "kullanıcı bir süredir hiç dokunmadı" diye gösteriliyor;
   * bizim jest katmanımız model-viewer'ın ÜSTÜNDE durup dokunuşları kendisi
   * yuttuğu için model-viewer hiçbir zaman etkileşim görmüyor ve ipucunu
   * tekrar tekrar açıyordu.
   *
   * İstenen: yalnızca ilk açılışta bir kez görünsün, sonra gitsin. Açılışta
   * hemen gösteriliyor (eşik 0) ve ilk dokunuşta — dokunulmasa bile birkaç
   * saniye sonra — kalıcı olarak kapatılıyor.
   */
  const [ipucuAcik, setIpucuAcik] = useState(true)
  const [tusTakimi, setTusTakimi] = useState(false)

  /* Pencere her açılışında akış başa alınır — bileşen DOM'da kaldığı için
     aksi hâlde önceki oturumun adımı hazır beliriyor. */
  useEffect(() => {
    setAsama('yerlestir')
    setTusTakimi(false)
    setIpucuAcik(true)
  }, [viewerUrl])

  /*
   * Sayaç, ürün YERLEŞTİKTEN sonra başlar; panel açılır açılmaz değil.
   * Açılışta karşılama kartı ekranı kaplıyor, altındaki ipucu görülmüyor:
   * sayacı orada başlatmak, el hiç görünmeden kapanması demekti.
   * Ekran gerçekten kullanılabilir hâle geldiğinde bir kez gösterilip
   * dokunulmasa bile birkaç saniye sonra kalıcı olarak kapanıyor.
   */
  useEffect(() => {
    if (!ipucuAcik || asama !== 'yerlesti') return undefined
    const z = setTimeout(() => setIpucuAcik(false), 4000)
    return () => clearTimeout(z)
  }, [ipucuAcik, asama])

  /** Kamera hedefini (bakılan nokta) kaydırır — ürün ekranda o yöne kayar. */
  const ADIM_M = 0.08
  const kaydirAr = useCallback((dx, dy) => {
    const mv = mvRef.current
    if (!mv?.getCameraTarget) return
    const h = mv.getCameraTarget()
    /* Hedef ürünün TERSİNE kayar: hedefi sağa almak ürünü sola götürür. */
    mv.cameraTarget = `${h.x - dx * ADIM_M}m ${h.y + dy * ADIM_M}m ${h.z}m`
  }, [])

  /** Ürünü yatayda döndürür (kamerayı çevirerek — model-viewer'ın yolu bu). */
  const cevirAr = useCallback((yon) => {
    const mv = mvRef.current
    if (!mv?.getCameraOrbit) return
    const o = mv.getCameraOrbit()
    const derece = (o.theta * 180) / Math.PI + yon * 15
    mv.cameraOrbit = `${derece}deg ${(o.phi * 180) / Math.PI}deg ${o.radius}m`
  }, [])

  /** Yakınlaştırma — yörünge yarıçapı; iki parmakla yapılanın tuşlu karşılığı. */
  const olcekAr = useCallback((kat) => {
    const mv = mvRef.current
    if (!mv?.getCameraOrbit) return
    const o = mv.getCameraOrbit()
    mv.cameraOrbit = `${(o.theta * 180) / Math.PI}deg ${(o.phi * 180) / Math.PI}deg ${o.radius * kat}m`
  }, [])

  /*
   * ═══════════════ PARMAK / FARE İLE TAŞI, DÖNDÜR, BOYUTLANDIR ═══════════════
   *
   * Tuş takımı ince ayar için; asıl kullanım parmakla olmalı — kamera
   * ekranında da öyle. model-viewer'ın kendi denetimlerinde sürükleme
   * DÖNDÜRÜYOR, taşımak için iki parmak (ya da farede sağ tuş) gerekiyor;
   * kimse bunu kendiliğinden bulmuyordu.
   *
   * Bu yüzden ürün yerleştikten sonra model-viewer'ın üstüne kendi jest
   * katmanımız geliyor ve kameradakiyle AYNI kuralı uyguluyor:
   *   • tek parmak / fare sürükleme → ürünü TAŞI,
   *   • iki parmak aç-kapa         → büyüt / küçült,
   *   • iki parmak çevir           → döndür,
   *   • fare tekerleği             → büyüt / küçült.
   *
   * Piksel → metre çevrimi görüntü yüksekliğine ve kameranın uzaklığına
   * bağlı: uzaktayken aynı sürükleme daha çok metre eder, yakınken daha az.
   * Sabit bir katsayı yakınlaştırmanın her kademesinde yanlış hissettiriyordu.
   */
  // Onay yazısı birkaç saniye sonra kendiliğinden kalkar
  useEffect(() => {
    if (!arBildirim) return undefined
    const z = setTimeout(() => setArBildirim(null), 4000)
    return () => clearTimeout(z)
  }, [arBildirim])

  const jestRef = useRef({ isaretciler: new Map(), uzaklik: 0, aci: 0 })

  const jestOlcegi = useCallback(() => {
    const mv = mvRef.current
    if (!mv?.getCameraOrbit) return 0
    const kutu = mv.getBoundingClientRect()
    if (!kutu.height) return 0
    // Görüntünün yüksekliği kabaca kamera uzaklığı kadar dünya yüksekliği gösterir
    return mv.getCameraOrbit().radius / kutu.height
  }, [])

  const jestBasla = useCallback((e) => {
    setIpucuAcik(false) // ilk dokunuşta ipucu kalkar, bir daha gelmez
    const d = jestRef.current
    // Parmak ÖNCE kaydedilir: setPointerCapture atarsa (bazı tarayıcılar ve
    // otomatik testler atıyor) ikinci parmak hiç kaydolmuyor, iki parmaklı
    // jestler sessizce tek parmak sanılıp taşımaya dönüşüyordu.
    d.isaretciler.set(e.pointerId, { x: e.clientX, y: e.clientY })
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {
      /* yakalama olmasa da olur: olaylar zaten bu katmana geliyor */
    }
    if (d.isaretciler.size === 2) {
      const [a, b] = [...d.isaretciler.values()]
      d.uzaklik = Math.hypot(a.x - b.x, a.y - b.y)
      d.aci = Math.atan2(b.y - a.y, b.x - a.x)
    }
  }, [])

  const jestHareket = useCallback((e) => {
    const d = jestRef.current
    const onceki = d.isaretciler.get(e.pointerId)
    if (!onceki) return
    const simdi = { x: e.clientX, y: e.clientY }
    d.isaretciler.set(e.pointerId, simdi)
    const mv = mvRef.current
    if (!mv?.getCameraOrbit) return

    if (d.isaretciler.size === 1) {
      // TAŞI — hedefi ürünün TERSİNE kaydırınca ürün parmağı takip eder
      const m = jestOlcegi()
      if (!m) return
      const h = mv.getCameraTarget()
      mv.cameraTarget =
        String(h.x - (simdi.x - onceki.x) * m) + 'm ' +
        String(h.y + (simdi.y - onceki.y) * m) + 'm ' +
        String(h.z) + 'm'
      return
    }

    if (d.isaretciler.size === 2) {
      const [a, b] = [...d.isaretciler.values()]
      const uzaklik = Math.hypot(a.x - b.x, a.y - b.y)
      const aci = Math.atan2(b.y - a.y, b.x - a.x)
      const o = mv.getCameraOrbit()
      // Parmaklar açıldıkça yarıçap küçülür, yani ürün büyür
      const kat = d.uzaklik > 0 ? d.uzaklik / uzaklik : 1
      const derece = (o.theta * 180) / Math.PI + ((aci - d.aci) * 180) / Math.PI
      mv.cameraOrbit =
        String(derece) + 'deg ' +
        String((o.phi * 180) / Math.PI) + 'deg ' +
        String(o.radius * kat) + 'm'
      d.uzaklik = uzaklik
      d.aci = aci
    }
  }, [jestOlcegi])

  const jestBitir = useCallback((e) => {
    const d = jestRef.current
    d.isaretciler.delete(e.pointerId)
    if (d.isaretciler.size < 2) {
      d.uzaklik = 0
      d.aci = 0
    }
  }, [])

  const jestTekerlek = useCallback((e) => {
    olcekAr(e.deltaY > 0 ? 1.08 : 1 / 1.08)
  }, [olcekAr])

  /*
   * SIFIRLA — açıyı, yakınlaştırmayı ve kaydırmayı başlangıca alıp yerleştirme
   * adımına döner. Amazon'daki ↻ düğmesi de aynı işi yapıyor: ürün kadrajdan
   * çıktığında ya da açı iyice bozulduğunda çıkış yolu.
   */
  const sifirlaAr = useCallback(() => {
    const mv = mvRef.current
    if (mv) {
      mv.cameraOrbit = 'auto auto auto'
      mv.cameraTarget = 'auto auto auto'
      mv.fieldOfView = 'auto'
      mv.resetTurntableRotation?.()
      mv.jumpCameraToGoal?.()
    }
    setTusTakimi(false)
    setAsama('yerlestir')
  }, [])

  /*
   * KAYDET — kameradaki "Kaydet" düğmesinin AR'deki karşılığı.
   *
   * Kare iki yere birden gider: cihaza iner ve rapora verilir; PDF alındığında
   * "Mekânda Görünüm" sayfası olarak basılır. Eskiden AR'den rapora hiçbir şey
   * gitmiyordu — yalnızca kamera ekranı besliyordu.
   *
   * İndirme blob adresiyle yapılıyor, data: URL ile değil: iOS Safari büyük
   * data: URL'lerini indiremeyip sessizce düşüyor (kamerada da aynı sebeple
   * blob'a geçilmişti).
   */
  const kaydetAr = useCallback(async () => {
    const mv = mvRef.current
    if (!mv?.toDataURL) return
    const veri = mv.toDataURL('image/jpeg', 0.92)
    const raporaGirdi = onSaved?.(veri, 'ar')
    /*
     * ÖNCE PAYLAŞMA SAYFASI, SONRA İNDİRME.
     *
     * Telefonda aranan yer Fotoğraflar; <a download> ise iOS'ta dosyayı
     * Dosyalar'a koyuyor ya da hiç indirmiyor. Paylaşma sayfasındaki
     * "Görüntüyü Kaydet" kareyi doğrudan Fotoğraflar'a atıyor.
     * (Kameradaki Kaydet ile aynı sıra — bkz. ArView/cihazaKaydet.)
     */
    const ad = 'ar-' + (model?.name || 'tasarim') + '.jpg'
    // iPhone/iPad'de Fotoğraflar'a ulaşmanın tek yolu paylaşma sayfası;
    // masaüstü ve Android'de doğrudan indirme. (bkz. ArView/cihazaKaydet)
    const ios =
      typeof navigator !== 'undefined' &&
      (/iPhone|iPad|iPod/.test(navigator.platform || '') ||
        (/Mac/.test(navigator.platform || '') && navigator.maxTouchPoints > 1))
    try {
      const blob = await (await fetch(veri)).blob()
      const dosya = new File([blob], ad, { type: 'image/jpeg' })
      if (ios && navigator.canShare?.({ files: [dosya] })) {
        await navigator.share({ files: [dosya], title: t('ar.title') })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = ad
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      }
    } catch {
      /* kullanıcı vazgeçti ya da indirme engellendi — kare yine rapora girdi */
    }
    setArBildirim(t(raporaGirdi ? 'ar.savedNote' : 'ar.savedOnlyNote'))
  }, [model, onSaved, t])

  /*
   * PAYLAŞ — o anki görüntüyü işletim sisteminin paylaşma sayfasına verir
   * (WhatsApp, e-posta…). Desteklemeyen tarayıcıda dosya indirmeye düşer,
   * yani düğme hiçbir cihazda ölü kalmaz. Kameradaki paylaş düğmesiyle aynı.
   */
  const paylasAr = useCallback(async () => {
    const mv = mvRef.current
    if (!mv?.toDataURL) return
    const veri = mv.toDataURL('image/jpeg', 0.92)
    onSaved?.(veri, 'ar') // paylaşılan kare de rapora girsin
    const ad = `ar-${model?.name || 'tasarim'}.jpg`
    try {
      const blob = await (await fetch(veri)).blob()
      const dosya = new File([blob], ad, { type: 'image/jpeg' })
      if (navigator.canShare?.({ files: [dosya] })) {
        await navigator.share({ files: [dosya], title: t('ar.title') })
        return
      }
    } catch {
      /* kullanıcı vazgeçti ya da tarayıcı desteklemiyor — indirmeye düşülür */
    }
    const a = document.createElement('a')
    a.href = veri
    a.download = ad
    a.click()
  }, [model, t])

  /*
   * ARKA PLAN — kameradaki (ArView) ile aynı mantık: sahnenin arkasına hazır
   * bir mekân ya da kullanıcının kendi fotoğrafı konur. 3D tuvali saydam
   * çizildiği için görsel doğrudan arkasından görünür; ekran gerçek bir odanın
   * duvarında duruyormuş gibi değerlendirilebilir.
   *
   * Boşken arkada koyu stüdyo zemini kalır — eski davranış aynen korunuyor.
   */
  const [arkaFoto, setArkaFoto] = useState(null)
  const [ornekAcik, setOrnekAcik] = useState(false)
  const fotoRef = useRef(null)

  /** Kendi fotoğrafını arka plan yap. */
  const fotoSecildi = (e) => {
    const f = e.target.files?.[0]
    e.target.value = '' // aynı dosya tekrar seçilebilsin
    if (!f) return
    const okuyucu = new FileReader()
    okuyucu.onload = () => {
      setArkaFoto(okuyucu.result)
      setOrnekAcik(false)
    }
    okuyucu.readAsDataURL(f)
  }

  /*
   * Pencere kapanırken arka plan da temizlenir. Bileşen kapanınca sökülmüyor,
   * yalnızca `open` false oluyor; temizlenmezse bir dahaki açılışta kullanıcı
   * seçmediği hâlde eski fotoğrafla karşılaşıyor. (ArView'da da aynı durum
   * yaşanmış ve orada da kapanışta temizlenmişti.)
   */
  const kapat = useCallback(() => {
    setArkaFoto(null)
    setOrnekAcik(false)
    onClose?.()
  }, [onClose])

  // Pencere açıkken arkadaki sayfa kaymasın (mobilde kaydırma devri)
  useGovdeKilidi(open)

  if (!open) return null

  const cokluVar = !!screens?.length
  const cabinetCount = cokluVar
    ? screens.reduce((acc, s) => acc + Math.max(1, s.cols || 1) * Math.max(1, s.rows || 1), 0)
    : Math.max(1, cols) * Math.max(1, rows)

  /*
   * Kamera uzaklığı yapılandırmaya göre: çoklu ekran şeridi tek duvardan çok
   * daha geniş olabiliyor, sabit 3,2 m'de kadraja sığmıyordu. Kabaca genişlik
   * ve yüksekliğe göre geri çekiliyor; kullanıcı yine de serbestçe yakınlaşıp
   * uzaklaşabilir.
   */
  const cabW = (model?.widthMm || 500) / 1000
  const cabH = (model?.heightMm || 500) / 1000
  const toplamW = cokluVar
    ? screens.reduce((acc, s) => {
        const u = ekranUclari(s, cabW, curveAmount)
        return acc + (u.sag.x - u.sol.x)
      }, 0)
    : Math.max(1, cols) * cabW
  const toplamH = cokluVar
    ? Math.max(...screens.map((s) => Math.max(1, s.rows || 1))) * cabH
    : Math.max(1, rows) * cabH
  const uzaklik = Math.max(1.2, toplamW * 0.95, toplamH * 1.7)

  return (
    <div className="fixed inset-0 z-[60] bg-[#0b0d12]">
      {/* Arka plan görseli — 3D tuvali saydam olduğu için sahnenin arkasında kalır */}
      {arkaFoto && (
        <img src={arkaFoto} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <input ref={fotoRef} type="file" accept="image/*" onChange={fotoSecildi} className="hidden" />

      <div className="absolute top-0 inset-x-0 z-10 flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
        <button type="button" onClick={kapat} aria-label={t('ar.close')} className="text-white/90 hover:text-white p-1">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <span className="text-white text-[13px] font-semibold">{t('scene3d.title')}</span>
        <span className="text-white/50 text-[11px]">
          {cabinetCount > MAX_DETAILED_CABINETS ? t('scene3d.lodLow') : t('scene3d.lodHigh')}
        </span>
        <div className="ml-auto">
          <button
            type="button"
            onClick={exportAndOpen}
            disabled={busy}
            className="rounded-full px-4 py-1.5 text-[13px] font-semibold bg-brand text-white hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {busy ? t('scene3d.exporting') : t('scene3d.viewInAr')}
          </button>
        </div>
      </div>

      {/*
        preserveDrawingBuffer: PDF'e giden tasarım görseli html2canvas ile
        alınıyor; WebGL tuvali çizim sonrası temizlenirse ekran görüntüsü
        bomboş çıkar. Bu bayrak tamponu tutar, görsel PDF'e sağlam gider.
      */}
      <Canvas
        shadows
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: [0, toplamH * 0.12, uzaklik], fov: 45, far: Math.max(100, uzaklik * 10) }}
        dpr={[1, 2]}
      >
        <SceneContent
          model={model}
          cols={Math.max(1, cols)}
          rows={Math.max(1, rows)}
          content={content}
          contentUrl={contentUrl}
          onReady={onReady}
          screenType={screenType}
          curveAmount={curveAmount}
          leftCols={leftCols}
          rightCols={rightCols}
          screens={screens}
        />
        <OrbitControls makeDefault enablePan={false} minDistance={0.8} maxDistance={Math.max(12, uzaklik * 3)} />
      </Canvas>

      {/*
        ÖRNEK MEKÂN ŞERİDİ — alt barın üstünde açılıp kapanır; kameradaki
        şeridin birebir karşılığı, aynı görselleri kullanır.
      */}
      {ornekAcik && (
        <div className="absolute bottom-24 inset-x-0 px-4">
          <div className="flex gap-2 overflow-x-auto pb-1 justify-center">
            {ORNEK_MEKANLAR.map((o) => (
              <button
                key={o.yol}
                type="button"
                onClick={() => {
                  setArkaFoto(o.yol)
                  setOrnekAcik(false)
                }}
                className={`shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  arkaFoto === o.yol ? 'border-brand' : 'border-white/40 hover:border-white/80'
                }`}
                title={t(o.ad)}
              >
                <img src={o.yol} alt={t(o.ad)} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------- ALT BAR */}
      <div className="absolute bottom-0 inset-x-0 pb-4 pt-8 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-3 px-4">
          <ArkaPlanDugme
            onClick={() => setOrnekAcik((a) => !a)}
            etiket={t('ar.background')}
            deger={t('ar.samples')}
            aktif={ornekAcik}
          />
          <ArkaPlanDugme
            onClick={() => fotoRef.current?.click()}
            etiket={t('ar.background')}
            deger={t('ar.photo')}
            aktif={!!arkaFoto && !ORNEK_MEKANLAR.some((o) => o.yol === arkaFoto)}
          />
          {/* Vazgeçme yolu: arka planı kaldırıp koyu stüdyo zeminine döner */}
          {arkaFoto && (
            <ArkaPlanDugme
              onClick={() => setArkaFoto(null)}
              etiket={t('ar.background')}
              deger={t('ar.removeBg')}
            />
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-white/50 px-8 m-0 pointer-events-none">
          {t('scene3d.hint')}
        </p>
      </div>

      {/* model-viewer, gerçek cihazda dokunulduğunda Android'de Scene Viewer'ı,
          iOS'ta Quick Look'u açar (WebXR destekleyen tarayıcılarda doğrudan
          sayfa-içi AR oturumu da başlatabilir) — ayrı bir "AR modu" yazmaya
          gerek kalmadan platformun kendi AR motorunu kullanır. */}
      {viewerUrl && (
        <div className="absolute inset-0 z-20 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-white text-sm font-semibold truncate">{t('scene3d.arReady')}</span>
            <div className="flex items-center gap-2.5 shrink-0">
              {/*
                KAYDET — kameradaki düğmenin karşılığı. Kare cihaza iner ve
                rapora girer; yalnızca ürün yerleştikten sonra anlamlı.
              */}
              {asama === 'yerlesti' && (
                <button
                  type="button"
                  onClick={kaydetAr}
                  className="rounded-full px-4 py-1.5 text-[13px] font-semibold bg-white text-[#10141b] hover:bg-white/85 transition-colors"
                >
                  {t('ar.save')}
                </button>
              )}
              <button type="button" onClick={close} className="text-white/80 hover:text-white text-sm">
                {t('ar.close')}
              </button>
            </div>
          </div>

          {/* Kaydetme onayı — kameradakiyle aynı yazı ve aynı davranış */}
          {arBildirim && (
            <div className="absolute top-14 inset-x-0 z-30 flex justify-center px-6 pointer-events-none">
              <p className="m-0 rounded-full bg-black/85 text-white text-[12.5px] font-semibold px-4 py-2 text-center shadow-lg">
                {arBildirim}
              </p>
            </div>
          )}

          {/* model-viewer'ın kendisi ve akışın katmanları aynı kutuda; katmanlar
              onun ÜSTÜNE biniyor, o yüzden burası `relative`. */}
          <div className="flex-1 relative">
            {/* model-viewer standart bir HTML özel elemanıdır; React JSX'te
                doğrudan kullanılabilir, ekstra sarmalayıcıya gerek yoktur. */}
            <model-viewer
              ref={mvRef}
              src={viewerUrl}
              /* iOS Quick Look USDZ ister; bu olmadan iPhone'da AR hiç açılmaz */
              ios-src={iosUrl || undefined}
              ar
              ar-modes="webxr scene-viewer quick-look"
              /*
               * Model zemine oturur (Amazon'un mobilya yerleştirmesiyle aynı):
               * kullanıcı yüzeyi tarar, ekranı parmağıyla istediği yere
               * sürükler, iki parmakla döndürür.
               */
              ar-placement="floor"
              /*
               * "auto": kullanıcı AR'de modeli iki parmakla BÜYÜTÜP küçültebilir.
               * "fixed" olsaydı model gerçek ölçüsüne kilitlenir, boyutlandırma
               * kapanırdı — istenen, ölçüyü de düzenleyebilmek.
               */
              ar-scale="auto"
              camera-controls
              /* El animasyonu bir kez görünsün, sonra sussun — bkz. ipucuAcik */
              interaction-prompt={ipucuAcik && asama === 'yerlesti' ? 'auto' : 'none'}
              interaction-prompt-threshold="0"
              shadow-intensity="1"
              style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
            />

            {/*
              JEST KATMANI — parmak/fare ile taşı, döndür, boyutlandır.
              Yalnızca ürün yerleştikten sonra ve model-viewer'ın ÜSTÜNDE.
              model-viewer'ın kendi denetiminde sürükleme döndürüyor, taşımak
              iki parmak istiyordu; burada kural kameradakiyle aynı:
              tek parmak taşır, iki parmak döndürüp boyutlandırır.
              z-10: araç düğmeleri (z-20) bunun üstünde kalmalı.
              touchAction 'none': tarayıcı sayfayı kaydırmaya kalkmasın.
            */}
            {asama === 'yerlesti' && (
              <div
                className="absolute inset-0 z-10"
                style={{ touchAction: 'none' }}
                onPointerDown={jestBasla}
                onPointerMove={jestHareket}
                onPointerUp={jestBitir}
                onPointerCancel={jestBitir}
                onWheel={jestTekerlek}
              />
            )}

            {/* ═════════════ YERLEŞTİRME AKIŞI (bkz. `asama`) ═════════════
                Kameradakiyle birebir aynı parçalar — ArYerlestirme.jsx. */}

            {/*
              "Yerleştirmek için dokunun" — ürün yerleşir ve ARAÇLAR AÇILIR.
              Dokunuş İŞLETİM SİSTEMİNİN AR'INI AÇMAZ.

              Önce açıyordu ve bütün mesele buydu: telefonda dokunulur
              dokunulmaz Quick Look/Scene Viewer devreye giriyor, ekranı
              tamamen işletim sistemi devralıyordu. Bizim yön tuşlarımız,
              sıfırlama düğmemiz ve parmak jestlerimiz hiç görünmüyordu —
              kullanıcı AR'de kamera ekranındaki araçların hiçbirini
              bulamıyordu.

              Artık akış kameradakiyle aynı: yerleştir → araçlarla oynat.
              Odaya gerçekten koymak isteyen alttaki "Odanızda görüntüleyin"
              düğmesine basar; orası zaten işletim sisteminin işi.
            */}
            {asama === 'yerlestir' && (
              <YerlestirKatmani t={t} onYerlestir={() => setAsama('yerlesti')} />
            )}

            {asama === 'yerlesti' && (
              <AraclarSutunu
                t={t}
                onSifirla={sifirlaAr}
                onPaylas={paylasAr}
                onTusTakimi={() => setTusTakimi((a) => !a)}
                tusTakimi={tusTakimi}
              />
            )}

            {/* Yakınlaştırma sütunu — kameradaki +/− ile aynı yerde, sağ altta */}
            {asama === 'yerlesti' && (
              <div className="absolute right-3 bottom-32 z-20 flex flex-col rounded-full bg-black/55 backdrop-blur-sm overflow-hidden">
                <button type="button" onClick={() => olcekAr(1 / 1.12)} aria-label={t('ar.bigger')} className="w-10 h-10 text-white text-xl leading-none hover:bg-white/15">
                  +
                </button>
                <div className="h-px bg-white/25" />
                <button type="button" onClick={() => olcekAr(1.12)} aria-label={t('ar.smaller')} className="w-10 h-10 text-white text-xl leading-none hover:bg-white/15">
                  −
                </button>
              </div>
            )}

            {asama === 'yerlesti' && tusTakimi && (
              /* Adım büyüklüğü AR ekranına ait: burada metre, kamerada piksel. */
              <TusTakimi t={t} onKaydir={kaydirAr} onCevir={cevirAr} className="bottom-6" />
            )}
          </div>

          {/*
            TEK DOKUNUŞLA AR — Amazon'daki "Odanızda görüntüleyin" düğmesinin
            karşılığı. model-viewer'ın kendi küçük AR rozeti köşede duruyor ve
            telefonda çoğu kullanıcı onu fark etmiyordu; buradaki büyük düğme
            doğrudan `activateAR()` çağırıyor, yani Android'de Scene Viewer,
            iPhone'da Quick Look tek dokunuşta açılıyor.

            AR desteklenmeyen cihazda (masaüstü tarayıcı, USDZ üretilememiş
            iPhone) düğme yerine sebebini söyleyen bir satır gösteriliyor —
            eskiden düğmeye basılıyor ve hiçbir şey olmuyordu.
          */}
          <div className="px-4 pb-4 pt-1 shrink-0">
            {arDestekli ? (
              <button
                type="button"
                onClick={() => mvRef.current?.activateAR?.()}
                className="w-full rounded-full py-3 text-[15px] font-semibold bg-brand text-white hover:bg-brand-dark transition-colors"
              >
                {t('scene3d.arPlace')}
              </button>
            ) : (
              <p className="text-center text-[12px] text-white/55 m-0">{t('scene3d.arUnsupported')}</p>
            )}
            {/*
              FOTOĞRAF — AR'a girildiğinde ekranı işletim sistemi devralıyor
              (Quick Look / Scene Viewer). Oradaki beyaz deklanşör Apple'ın
              kendi düğmesi; ne davranışına ne de görünümüne sayfadan
              müdahale edebiliyoruz ve her cihazda çalışmıyor. Bizim kamera
              ekranımızda deklanşör çalışıyor, üstelik kare hem cihaza iniyor
              hem PDF raporuna giriyor — kısayol oraya götürüyor.
            */}
            {onOpenCamera && (
              <button
                type="button"
                onClick={onOpenCamera}
                className="mt-2 w-full rounded-full py-2.5 text-[13.5px] font-semibold border border-white/30 text-white/85 hover:border-white/70 transition-colors inline-flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8.5A1.5 1.5 0 014.5 7h2l1.2-2h8.6L17.5 7h2A1.5 1.5 0 0121 8.5v9A1.5 1.5 0 0119.5 19h-15A1.5 1.5 0 013 17.5v-9z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
                {t('scene3d.takePhoto')}
              </button>
            )}
            <p className="mt-2 text-center text-[11px] text-white/45 m-0">{t('scene3d.arHint')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
