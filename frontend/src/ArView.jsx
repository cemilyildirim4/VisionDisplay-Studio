import { useCallback, useEffect, useRef, useState } from 'react'
import { useGovdeKilidi } from './hooks/useGovdeKilidi.js'
import html2canvas from 'html2canvas-pro'
import { Screen, VideoLayer, contentImage, seritMaskePolygon } from './WallPreview.jsx'
import { videoSrcFor } from './videoContent.js'
import { LED_LIT_FILTER } from './content.js'
import { useLang } from './useLang.js'
import { ORNEK_MEKANLAR } from './ornekMekanlar.js'
import * as THREE from 'three'
import { arBaslat, arDestekliMi, DURUM } from './ar/arDunya.js'
/* Yerleştirme akışının görünen parçaları AR ekranıyla ortak — bkz. ArYerlestirme.jsx */
import {
  YerlestirKatmani,
  AraclarSutunu,
  TusTakimi,
} from './ArYerlestirme.jsx'

/**
 * AR / KAMERA SİMÜLASYON EKRANI
 *
 * Müşteri telefonunu duvara tutar, yapılandırdığı ekranı canlı kamera
 * görüntüsünün üzerinde görür, parmağıyla duvarda istediği yere taşır ve iki
 * parmakla büyütüp küçültür. Ölçüler anlık güncellenir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ÖLÇEK NEREDEN GELİYOR — bunu bilmek şart
 *
 * Tarayıcıda derinlik algılama yok: kameranın gördüğü duvarın kaç metre
 * olduğunu ölçemeyiz. Bu yüzden ölçek KULLANICIDAN gelir. Müşteri tasarımı
 * iki parmakla büyütüp gerçek duvarına oturttuğunda, o an ekrandaki
 * tasarımın kaç piksel geldiği bilinir; tasarımın GERÇEK genişliği de zaten
 * bilinir (kabin sayısı × kabin ölçüsü). İkisinin oranı metre→piksel
 * ölçeğini verir ve o andan itibaren ekrandaki her mesafe metreye çevrilebilir.
 *
 * Yani:
 *   • Tasarımın genişlik/yüksekliği HER ZAMAN doğrudur — yapılandırmadan
 *     gelir, yakınlaştırmayla değişmez. Değişen yalnızca ne kadar büyük
 *     GÖRÜNDÜĞÜdür.
 *   • Kenar boşlukları TAHMİNDİR: kullanıcının tasarımı duvara doğru
 *     oturtmasına bağlıdır. Arayüzde de tahmin olduğu yazıyor.
 *
 * Perspektif düzeltmesi yapılmaz. Telefon duvara açıyla tutulduğunda
 * gerçek dünyada eşit olan mesafeler görüntüde eşit olmaz; bunu düzeltmek
 * düzlem algılama ister (WebXR / ARCore). Doğru kullanım duvara TAM
 * KARŞIDAN bakmaktır ve ekranda bu yazıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

const EN_KUCUK_OLCEK = 20 // px/m
const EN_BUYUK_OLCEK = 4000

const uzaklik = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const ortaNokta = (l) => ({
  x: l.reduce((t, p) => t + p.x, 0) / l.length,
  y: l.reduce((t, p) => t + p.y, 0) / l.length,
})
const kis = (v, en, boy) => Math.max(en, Math.min(boy, v))

/** Metre etiketi. Küçük değerlerde cm'ye düşer — "0,04 m" okunmuyor. */
function metre(v) {
  if (!isFinite(v)) return '—'
  if (Math.abs(v) < 1) return `${Math.round(v * 100)} cm`
  return `${v.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} m`
}

/** Ölçü baloncuğu */
function Etiket({ x, y, children, vurgu = false }) {
  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap shadow-lg ${
        vurgu ? 'bg-brand text-white' : 'bg-black/70 text-white'
      }`}
      /*
       * Tasarımın ÜSTÜNDE kalmalı. Tasarım katmanı `transform` taşıdığı için
       * kendi yığın bağlamını kuruyor; etiketin ondan yüksek bir z değeri
       * olmazsa tasarımın kenarına denk gelen etiket yarım görünüyordu.
       */
      style={{ left: x, top: y, zIndex: 5 }}
    >
      {children}
    </div>
  )
}

/** Alt bardaki yardımcı düğme */
function AracDugme({ onClick, etiket, deger, aktif = false }) {
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

export default function ArView({
  open,
  onClose,
  model,
  cols,
  rows,
  screens,
  content,
  contentUrl,
  screenType,
  resolution,
  curveAmount,
  hideRegions,
  /** Kaydedilen kare — rapora (PDF) girsin diye üst bileşene bildirilir. */
  onSaved,
}) {
  const { t } = useLang()
  const videoRef = useRef(null)
  const akisRef = useRef(null)
  const kapRef = useRef(null)
  // Son bilinen görünüm alanı ölçüsü — döndürmede oranlı taşıma için
  const oncekiKutuRef = useRef(null)
  const katmanRef = useRef(null)

  const [ornekAcik, setOrnekAcik] = useState(false)
  /* Kaydetme/paylaşma sonrası kısa onay yazısı (bkz. kaydet) */
  const [bildirim, setBildirim] = useState(null)
  const [hata, setHata] = useState(null)
  // Hazır arka planlar — 3D görünümüyle ortak liste (bkz. ornekMekanlar.js)
  const ORNEKLER = ORNEK_MEKANLAR
  /*
   * Kamera açılamadığında ekran BOŞ KALMAZ: müşteri arka plana bir fotoğraf
   * koyup taşıma, boyutlandırma ve ölçüleri aynen kullanabilir. Kamerası
   * olmayan masaüstünde tek çalışan yol bu; ayrıca mekânda çekilmiş eski bir
   * fotoğrafla da denenebiliyor.
   */
  const [arkaFoto, setArkaFoto] = useState(null)
  const fotoRef = useRef(null)
  const resimRef = useRef(null)
  const [arAcik, setArAcik] = useState(true)
  /*
   * Deklanşörle yakalanan son kare. Kaydet bunu KULLANIR, yeniden yakalamaz —
   * yeniden yakalamak (html2canvas) beklemek demek ve bekleme sırasında
   * tarayıcının "kullanıcı bastı" izni düşüyor; iOS Safari o izin olmadan
   * indirmeyi sessizce iptal ediyor, ekranda "kaydedildi" yazsa bile dosya
   * hiçbir yere inmiyordu.
   *
   * Bayatlamasın diye: tasarım kımıldadığı anda (taşıma, ölçek, dönüş, ölçü
   * gizleme, arka plan değişimi) kare atılır. Böylece hem eski kare tekrar
   * kaydedilmez hem de deklanşöre basılmışsa indirme beklemesiz olur.
   */
  const [cekim, setCekim] = useState(null)
  /*
   * Karenin yakalandığı an. Kamera CANLI: tasarım kımıldamasa bile telefonu
   * çevirince görüntü değişir, yani eldeki kare saniyeler içinde eskir.
   * Bu yüzden kare yalnızca çok tazeyken (deklanşöre basıp hemen Kaydet
   * demek gibi) yeniden kullanılır; ötesinde yeniden yakalanır.
   */
  const cekimZamanRef = useRef(0)
  const KARE_TAZELIK_MS = 2000
  /*
   * Ölçü etiketleri ve kenar boşluğu çizgileri açık/kapalı. Kamerada asıl amaç
   * ekranın mekânda nasıl duracağını GÖRMEK; ölçüler yardımcıdır ve fotoğrafta
   * çoğu zaman istenmez. Ana sayfadaki "ölçüleri gizle" düğmesinin karşılığı.
   */
  const [olculer, setOlculer] = useState(true)
  const [mesgul, setMesgul] = useState(false)
  /* Cihaza kaydetme sayfası: kare + "Fotoğraflara kaydet" / "İndir" */
  const [kareSayfasi, setKareSayfasi] = useState(null)
  /*
   * iPhone'da indirilen dosya GALERİYE düşmüyor (Dosyalar › İndirilenler).
   * Galeriye koymanın tek yolu paylaşma sayfasındaki "Görüntüyü Kaydet" —
   * ama onu kendiliğinden açmak istemiyoruz. Bu yüzden kaydetme bildiriminin
   * yanında, yalnızca iOS'ta, tek dokunuşluk bir kısayol duruyor.
   */
  const [galeriKare, setGaleriKare] = useState(null)

  /*
   * ────────────────────────────────────────────────────────────────────────
   * YERLEŞTİRME AKIŞI — referans: Amazon "Odanızda görüntüleyin"
   *
   * Orada iş üç adımda yürüyor ve her adım ne yapılacağını kendisi söylüyor:
   *   1) 'yerlestir' — "Yerleştirmek için dokunun", ekranda bir nişangâh var
   *   2) 'yerlesti'  — ürün duruyor; taşınıyor, döndürülüyor, ölçekleniyor
   *
   * Önce bir de "Sürükle ve döndür" karşılama kartı vardı; kaldırıldı.
   * Akış doğrudan yerleştirmeyle başlıyor.
   *
   * Bizde eskiden bu adımlar yoktu: pencere açılır açılmaz tasarım ortada
   * beliriyordu, ne yapılacağını anlatan hiçbir şey yoktu. Müşteri ekranı
   * sürükleyebileceğini ya da iki parmakla büyütebileceğini ancak tesadüfen
   * keşfediyordu.
   *
   * NOT — GERÇEK YÜZEY ALGILAMA YOK, OLAMAZ.
   * Amazon bunu kendi uygulamasında ARKit ile yapıyor: zemini tanıyor,
   * noktalarla gösteriyor ve sen yürüsen bile ürün yerinde kalıyor. Tarayıcıda
   * bunun karşılığı WebXR ve iOS Safari WebXR'ı desteklemiyor. Burada kamera
   * görüntüsünün ÜSTÜNE çiziyoruz: yerleştirme, taşıma, döndürme ve ölçekleme
   * aynı şekilde çalışıyor; eksik olan tek şey dünya takibi.
   * ────────────────────────────────────────────────────────────────────────
   */
  /*
   * GERÇEK YÜZEYE YERLEŞTİRME (WebXR).
   *
   * Buradaki kamera görünümü bir BİNDİRMEDİR: tasarım ekrana çizilir, telefon
   * kımıldayınca ekranla birlikte gelir. Cihaz WebXR destekliyorsa tasarım
   * gerçek dünyada bir yüzeye çakılabiliyor — duvara koyup telefonu gezdirince
   * ekran duvarda kalıyor. Desteklemeyen cihazlarda bu düğme hiç görünmez,
   * bindirme yolu aynen çalışmaya devam eder.
   */
  const arKatmanRef = useRef(null)
  const tasarimRef = useRef(null)
  const oturumRef = useRef(null)
  const [dunyaVar, setDunyaVar] = useState(false)
  const [dunyaAcik, setDunyaAcik] = useState(false)
  const [dunyaDurum, setDunyaDurum] = useState(DURUM.ARANIYOR)
  const [dunyaOtomatik, setDunyaOtomatik] = useState(true)
  const [dunyaHazirlaniyor, setDunyaHazirlaniyor] = useState(false)

  const [asama, setAsama] = useState('yerlestir')
  // Y ekseni dönüşü (derece) — iki parmakla çevirerek ya da tuş takımıyla
  const [donus, setDonus] = useState(0)
  // Hassas ayar tuş takımı (ok tuşları + döndürme) açık mı
  const [tusTakimi, setTusTakimi] = useState(false)

  // Tasarımın ekrandaki yeri (merkez, px) ve ölçeği (px/m)
  const [merkez, setMerkez] = useState({ x: 0, y: 0 })
  const [pxPerM, setPxPerM] = useState(200)
  const [kutu, setKutu] = useState({ w: 0, h: 0 }) // görüntü alanı

  // Kamera yetenekleri
  const [zoom, setZoom] = useState(null) // { min, max, deger } ya da null
  const [cihazlar, setCihazlar] = useState([])
  const [cihazNo, setCihazNo] = useState(0)
  const [flas, setFlas] = useState('oto') // 'oto' | 'acik' | 'kapali'
  const [flasVar, setFlasVar] = useState(false)

  // Tasarımın GERÇEK ölçüsü — yapılandırmadan gelir, yakınlaştırmayla değişmez
  const kabinW = (model?.widthMm || 500) / 1000
  const kabinH = (model?.heightMm || 500) / 1000

  /*
   * ÇOKLU EKRAN DA AYNEN ÇİZİLİR.
   *
   * Burada eskiden yalnızca tek bir düz ekran vardı: çoklu düzen kurulmuş
   * olsa bile (L tipi, kavisli, farklı satır/sütun) kamerada tek bir düz
   * dikdörtgen görünüyordu. Yani müşteri kamerada kendi tasarımını değil,
   * ona hiç benzemeyen başka bir şeyi görüyordu.
   *
   * Yerleşim WallPreview'ın çoklu dalıyla aynı: ekranlar yan yana, alta
   * hizalı; ortak içerik `spanW/spanH/offsetX/offsetY` ile tüm şeride
   * yayılır, her ekran kendi dilimini gösterir. Ölçü etiketleri şeridin
   * dış sınırını anlatır.
   */
  const cokluListe = Array.isArray(screens) && screens.length > 0 ? screens : null
  let _xm = 0
  const parcalar = (cokluListe || [{ cols, rows, type: screenType }]).map((s) => {
    const wm = Math.max(1, s.cols) * kabinW
    const p = { ...s, wm, hm: Math.max(1, s.rows) * kabinH, xm: _xm }
    _xm += wm
    return p
  })
  const tasarimWm = parcalar.reduce((t, s) => t + s.wm, 0)
  const tasarimHm = Math.max(...parcalar.map((s) => s.hm))

  /* ---------------------------------------------------------------- kamera */

  const akisiKur = useCallback(async (deviceId) => {
    akisRef.current?.getTracks().forEach((iz) => iz.stop())
    const akis = await navigator.mediaDevices.getUserMedia({
      video: deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
      audio: false,
    })
    akisRef.current = akis
    if (videoRef.current) {
      videoRef.current.srcObject = akis
      await videoRef.current.play().catch(() => {})
    }
    // Yetenekler cihazdan cihaza değişir; olmayanın düğmesi gösterilmez.
    const iz = akis.getVideoTracks()[0]
    const y = iz?.getCapabilities?.() || {}
    setFlasVar(!!y.torch)
    setZoom(y.zoom ? { min: y.zoom.min ?? 1, max: y.zoom.max ?? 1, deger: iz.getSettings?.().zoom ?? y.zoom.min ?? 1 } : null)
  }, [])

  useEffect(() => {
    if (!open) return
    let iptal = false
    setHata(null)
    ;(async () => {
      try {
        await akisiKur(null)
        if (iptal) return
        // İzin verildikten SONRA cihaz adları görünür olur; lens düğmesi için
        // liste ancak burada anlamlı doluyor.
        const l = (await navigator.mediaDevices.enumerateDevices()).filter((c) => c.kind === 'videoinput')
        if (!iptal) setCihazlar(l)
      } catch (e) {
        /*
         * Sebebi SÖYLENİYOR. Önceden tek bir genel mesaj vardı ve düğme de
         * gizleniyordu; "açılmıyor" deyip kalmak dışında yapılacak bir şey
         * bırakmıyordu. Sebep belliyse çözümü de belli.
         */
        if (iptal) return
        if (!window.isSecureContext) setHata(t('ar.errInsecure'))
        else if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') setHata(t('ar.errDenied'))
        else if (e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError') setHata(t('ar.errNoDevice'))
        else if (e?.name === 'NotReadableError') setHata(t('ar.errBusy'))
        else setHata(t('ar.errCamera'))
      }
    })()
    return () => {
      iptal = true
    }
  }, [open, akisiKur, t])

  /*
   * Pencere kapanınca akış durdurulur — cihazın kamera ışığı yanık kalmasın.
   *
   * Arka plan fotoğrafı da BURADA temizleniyor. Bileşen kapanınca sökülmüyor,
   * yalnızca `open` false oluyor; dolayısıyla seçilen fotoğraf durumda kalıyor
   * ve pencere yeniden açıldığında kamera yerine eski fotoğraf karşılıyordu.
   * Vazgeçmenin yolu yoktu.
   */
  useEffect(() => {
    if (open) return
    akisRef.current?.getTracks().forEach((iz) => iz.stop())
    akisRef.current = null
    setCekim(null)
    setArkaFoto(null)
    /*
     * Yerleştirme akışı da başa alınır. Bileşen kapanınca DOM'dan kalkmıyor
     * (yalnızca `open` false oluyor), dolayısıyla sıfırlanmasaydı pencere
     * yeniden açıldığında ürün bir önceki oturumun konumunda ve dönüşünde
     * hazır beliriyor, "dokunarak yerleştirme" adımı hiç görünmüyordu.
     */
    setAsama('yerlestir')
    setDonus(0)
    setTusTakimi(false)
    setMerkez({ x: 0, y: 0 }) // {0,0} = "henüz konmadı"; ölçüm etkisi ortalar
  }, [open])

  useEffect(() => () => akisRef.current?.getTracks().forEach((iz) => iz.stop()), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Görüntü alanının ölçüsü + tasarımın ilk yerleşimi
  useEffect(() => {
    if (!open || !kapRef.current) return
    const el = kapRef.current
    const oku = () => {
      const r = el.getBoundingClientRect()
      /*
       * TELEFON DÖNDÜRÜLDÜĞÜNDE tasarım ekranda kalmalı. Eskiden yalnızca kutu
       * ölçüsü güncelleniyordu; merkez ve ölçek dikeydeki piksel değerlerinde
       * kaldığı için yatay çevrildiğinde tasarım kenara kayıyor, çoğu zaman
       * görünüm alanının dışına çıkıyordu.
       *
       * Çözüm: yeni ölçüye ORANLA taşı. Merkez bağıl konumunu, ölçek de bağıl
       * büyüklüğünü korur — kullanıcı neyi nereye koyduysa döndürdükten sonra
       * da orada bulur.
       */
      const onceki = oncekiKutuRef.current
      if (onceki && onceki.w > 1 && onceki.h > 1 && (Math.abs(onceki.w - r.width) > 1 || Math.abs(onceki.h - r.height) > 1)) {
        const kx = r.width / onceki.w
        const ky = r.height / onceki.h
        const k = Math.min(kx, ky)
        setMerkez((e) => ({ x: e.x * kx, y: e.y * ky }))
        setPxPerM((e) => kis(e * k, EN_KUCUK_OLCEK, EN_BUYUK_OLCEK))
      }
      oncekiKutuRef.current = { w: r.width, h: r.height }
      setKutu({ w: r.width, h: r.height })
      setMerkez((e) => (e.x === 0 && e.y === 0 ? { x: r.width / 2, y: r.height / 2 } : e))
      // İlk ölçek: tasarım genişliğin yarısı kadar görünsün — hem tamamı
      // ekranda kalsın hem büyütmeye yer olsun.
      setPxPerM((e) => (e === 200 ? kis((r.width * 0.5) / tasarimWm, EN_KUCUK_OLCEK, EN_BUYUK_OLCEK) : e))
    }
    oku()
    const ro = new ResizeObserver(oku)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open, tasarimWm])

  /* -------------------------------------------------------------- hareket */

  /*
   * Sürükleme ve iki parmakla boyutlandırma tek elden yürür: aktif parmaklar
   * bir haritada tutulur, hareket geldiğinde HAREKETİN BAŞINDAKİ duruma göre
   * yeni konum/ölçek hesaplanır. Adım adım toplamak yerine başlangıca göre
   * hesaplamak, parmak sayısı değişince sıçramayı önlüyor.
   */
  const isaretRef = useRef(new Map())
  const baslangicRef = useRef(null)
  const merkezRef = useRef(merkez)
  const olcekRef = useRef(pxPerM)
  const donusRef = useRef(donus)
  merkezRef.current = merkez
  olcekRef.current = pxPerM
  donusRef.current = donus

  /*
   * İki parmağın YATAYLA yaptığı açı (derece). Parmaklar çevrildikçe bu açı
   * değişiyor ve farkı doğrudan ürünün dönüşüne yazılıyor — Amazon'daki
   * "Sürükle ve döndür" jestinin karşılığı. Ölçekleme (parmak arası mesafe)
   * ve döndürme (parmak arası açı) aynı hareketten aynı anda okunuyor, tıpkı
   * orada olduğu gibi.
   */
  const aci = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI

  const anlikKaydet = () => {
    const n = [...isaretRef.current.values()]
    if (!n.length) return (baslangicRef.current = null)
    baslangicRef.current = {
      merkez: merkezRef.current,
      pxPerM: olcekRef.current,
      donus: donusRef.current,
      orta: ortaNokta(n),
      uzaklik: n.length > 1 ? uzaklik(n[0], n[1]) : 0,
      aci: n.length > 1 ? aci(n[0], n[1]) : 0,
    }
  }

  const parmakIndi = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    isaretRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    anlikKaydet()
  }

  const parmakHareket = (e) => {
    if (!isaretRef.current.has(e.pointerId)) return
    isaretRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const b = baslangicRef.current
    if (!b) return
    const n = [...isaretRef.current.values()]
    const orta = ortaNokta(n)

    if (n.length > 1 && b.uzaklik > 0) {
      setPxPerM(kis(b.pxPerM * (uzaklik(n[0], n[1]) / b.uzaklik), EN_KUCUK_OLCEK, EN_BUYUK_OLCEK))
      // Parmakların çevrilmesi ürünü Y ekseninde döndürür (bkz. `aci`)
      let fark = aci(n[0], n[1]) - b.aci
      // -180/+180 sınırından atlarken dönüşün sıçramaması için sarma
      if (fark > 180) fark -= 360
      if (fark < -180) fark += 360
      setDonus(b.donus + fark)
    }
    setMerkez({ x: b.merkez.x + (orta.x - b.orta.x), y: b.merkez.y + (orta.y - b.orta.y) })
  }

  const parmakKalkti = (e) => {
    isaretRef.current.delete(e.pointerId)
    anlikKaydet() // kalan parmakla sürüklemeye sıçramadan devam
  }

  // Masaüstünde tekerlek = büyüt/küçült
  const tekerlek = (e) => setPxPerM((o) => kis(o * (e.deltaY < 0 ? 1.08 : 1 / 1.08), EN_KUCUK_OLCEK, EN_BUYUK_OLCEK))
  const adimla = (kat) => setPxPerM((o) => kis(o * kat, EN_KUCUK_OLCEK, EN_BUYUK_OLCEK))

  /* -------------------------------------------------- kamera araç düğmeleri */

  const zoomDegistir = async () => {
    const iz = akisRef.current?.getVideoTracks()[0]
    if (zoom && iz) {
      // 1x → 2x → en yüksek → 1x
      const basamaklar = [zoom.min, Math.min(2, zoom.max), zoom.max].filter(
        (v, i, a) => a.indexOf(v) === i,
      )
      const sonraki = basamaklar[(basamaklar.indexOf(zoom.deger) + 1) % basamaklar.length] ?? zoom.min
      try {
        await iz.applyConstraints({ advanced: [{ zoom: sonraki }] })
        setZoom({ ...zoom, deger: sonraki })
      } catch {
        /* cihaz kabul etmediyse mevcut değerde kalır */
      }
      return
    }
    // Optik zoom yoksa düğme kameralar arasında geçiş yapar
    if (cihazlar.length > 1) {
      const s = (cihazNo + 1) % cihazlar.length
      setCihazNo(s)
      try {
        await akisiKur(cihazlar[s].deviceId)
      } catch {
        setHata(t('ar.errCamera'))
      }
    }
  }

  /*
   * KAMERA DEĞİŞTİR — birden fazla kamera varsa sıradakine geçer.
   *
   * Ayrı bir düğme, çünkü LENS düğmesi cihazlar arasında YALNIZCA optik zoom
   * yokken geçiş yapıyor. Masaüstünde bu bir çıkmaz oluyordu: sanal kamera
   * (OBS, sanal toplantı kamerası, sürücünün gizlilik görüntüsü) ilk sırada
   * geldiğinde ekranda "kamera kapalı" simgesi kalıyor ve gerçek webcam'e
   * geçmenin yolu bulunmuyordu. Hata da yok — akış açılmış durumda, sadece
   * yanlış kameradan geliyor.
   */
  const kameraDegistir = async () => {
    if (cihazlar.length < 2) return
    const s = (cihazNo + 1) % cihazlar.length
    setCihazNo(s)
    try {
      await akisiKur(cihazlar[s].deviceId)
    } catch {
      setHata(t('ar.errCamera'))
    }
  }

  const flasDegistir = async () => {
    const sira = ['oto', 'acik', 'kapali']
    const s = sira[(sira.indexOf(flas) + 1) % sira.length]
    setFlas(s)
    const iz = akisRef.current?.getVideoTracks()[0]
    try {
      // Tarayıcı "otomatik flaş" sunmuyor; oto = ışığı biz zorlamayız,
      // pozlamayı kameranın kendisi ayarlar.
      await iz?.applyConstraints({ advanced: [{ torch: s === 'acik' }] })
    } catch {
      /* desteklenmiyorsa yalnızca etiket değişir */
    }
  }

  /**
   * Hazır bir örnek mekânı arka plan yapar.
   *
   * Kendi fotoğrafını yüklemekle aynı yola girer: canlı akış durur, görüntü
   * arkaya geçer, tasarım üstünde kalır. Amaç ekranı fotoğrafsız da denenebilir
   * kılmak — özellikle kamerası olmayan ya da kamerası çalışmayan masaüstünde.
   */
  const ornekSecildi = (yol) => {
    akisRef.current?.getTracks().forEach((iz) => iz.stop())
    akisRef.current = null
    setArkaFoto(yol)
    setHata(null)
  }

  /* ----------------------------------------------------------- çekim/kayıt */

  /** Arka plan olarak fotoğraf kullan — kamera açılamadığında ya da istenirse. */
  const fotoSecildi = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const okuyucu = new FileReader()
    okuyucu.onload = () => {
      akisRef.current?.getTracks().forEach((iz) => iz.stop())
      akisRef.current = null
      setArkaFoto(okuyucu.result)
      setHata(null)
    }
    okuyucu.readAsDataURL(f)
  }

  const yenidenDene = async () => {
    setHata(null)
    setArkaFoto(null)
    try {
      await akisiKur(null)
    } catch {
      setHata(t('ar.errCamera'))
    }
  }

  /*
   * Tasarım kımıldadıysa eldeki kare artık o görüntüyü göstermiyor.
   * (Kaydet'in eski kareyi tekrar rapora sokması bu yüzden mümkündü.)
   */
  useEffect(() => {
    setCekim(null)
  }, [merkez, pxPerM, donus, olculer, arAcik, arkaFoto, asama])

  const yakala = async () => {
    const v = arkaFoto ? resimRef.current : videoRef.current
    const kap = kapRef.current
    const kW = arkaFoto ? v?.naturalWidth : v?.videoWidth
    const kH = arkaFoto ? v?.naturalHeight : v?.videoHeight
    if (!kW || !kap) return null
    setMesgul(true)
    try {
      const W = Math.round(kap.clientWidth)
      const H = Math.round(kap.clientHeight)
      const c = document.createElement('canvas')
      c.width = W
      c.height = H
      const g = c.getContext('2d')

      // object-fit: cover — ekranda görünen kadarını al, gerisini kırp
      const oranV = kW / kH
      const oranK = W / H
      let sw, sh, sx, sy
      if (oranV > oranK) {
        sh = kH
        sw = sh * oranK
        sx = (kW - sw) / 2
        sy = 0
      } else {
        sw = kW
        sh = sw / oranK
        sx = 0
        sy = (kH - sh) / 2
      }
      g.drawImage(v, sx, sy, sw, sh, 0, 0, W, H)

      // Tasarım katmanı üstüne — html2canvas <video> çizemez, bu yüzden ikisi
      // ayrı ayrı alınıp burada birleştiriliyor.
      if (arAcik && katmanRef.current) {
        const k = await html2canvas(katmanRef.current, {
          backgroundColor: null,
          scale: 1,
          logging: false,
          useCORS: true,
        })
        g.drawImage(k, 0, 0, W, H)
      }
      const veri = c.toDataURL('image/jpeg', 0.92)
      setCekim(veri)
      cekimZamanRef.current = Date.now()
      return veri
    } catch {
      setHata(t('ar.errCapture'))
      return null
    } finally {
      setMesgul(false)
    }
  }

  /*
   * KAYDET — çekilen görüntü İKİ yere birden gider:
   *   1) Cihaza iner (telefonda tarayıcının indirme akışı).
   *   2) Rapora verilir: PDF alındığında "Mekânda Görünüm" sayfası olarak
   *      basılır. Eskiden yalnızca indiriliyordu; müşteriye giden raporda
   *      ekranın gerçek mekândaki hâli hiç görünmüyordu.
   *
   * İndirme <a download> ile yapılıyor. iOS Safari bunu doğrudan Fotoğraflar'a
   * atmaz, "indirmek istiyor musunuz?" diye sorar ve Dosyalar'a kaydeder —
   * bu tarayıcının kendi davranışı, sayfadan değiştirilemiyor. Fotoğraflar'a
   * atmak isteyen için PAYLAŞ düğmesi duruyor: iOS'un paylaşma sayfasından
   * "Görüntüyü Kaydet" Fotoğraflar'a koyar.
   */
  const kareTaze = () => cekim && Date.now() - cekimZamanRef.current < KARE_TAZELIK_MS

  const kaydet = async () => {
    // Elde TAZE kare varsa onu kullan (bkz. cekim): beklemesiz indirme.
    const veri = kareTaze() ? cekim : await yakala()
    if (!veri) return
    const raporaGirdi = onSaved?.(veri, 'kamera')

    /*
     * BLOB URL — data: URL DEĞİL.
     *
     * Belirti: iPhone'da "Kaydet"e basınca Safari "…dosyasını indirmek
     * istiyor musunuz?" diye soruyor, ama "İndir"e de "Görüntüle"ye de
     * basınca hiçbir şey olmuyordu. Sebep indirilen adresin dev bir
     * `data:image/jpeg;base64,…` dizesi olması: iOS Safari birkaç yüz KB'ı
     * aşan data: URL'lerini indiremiyor ve sessizce düşüyor.
     *
     * Aynı bayt dizisi bir Blob'a konup `blob:` adresiyle veriliyor; bu yol
     * boyut sınırına takılmıyor ve indirme gerçekten tamamlanıyor.
     */
    const indi = await cihazaKaydet(veri)

    /*
     * TELEFONDA "İNDİ" DEMEK YETMİYOR.
     *
     * <a download> masaüstünde çalışıyor ama iOS Safari'de dosya çoğu zaman
     * Fotoğraflar'a değil Dosyalar'a gidiyor ya da hiç inmiyor; kullanıcı
     * "kaydedildi" yazısını görüp telefonunda hiçbir şey bulamıyordu.
     * Bu yüzden indirme kesin değilse kare EKRANDA açılıyor: oradan
     * paylaşma sayfasıyla Fotoğraflar'a atılabiliyor ya da görsele basılı
     * tutup kaydedilebiliyor.
     */
    if (indi) {
      setBildirim(t(iosCihaz() ? 'shot.savedFiles' : raporaGirdi ? 'ar.savedNote' : 'ar.savedOnlyNote'))
      setGaleriKare(iosCihaz() ? veri : null)
    } else await kareSayfasiAc(veri, raporaGirdi)
  }

  /** Kareyi işletim sisteminin paylaşma sayfasına verir (iOS: Fotoğraflar). */
  const galeriyeEkle = async (veri) => {
    try {
      const blob = await (await fetch(veri)).blob()
      const dosya = new File([blob], `ar-${model?.name || 'tasarim'}.jpg`, { type: 'image/jpeg' })
      if (navigator.canShare?.({ files: [dosya] })) {
        await navigator.share({ files: [dosya], title: t('ar.title') })
      }
    } catch {
      /* kullanıcı vazgeçti — dosya zaten inmişti */
    }
    setGaleriKare(null)
  }

  /** Kareyi ekranda açar; indirme bağlantısı için blob adresi hazırlar. */
  const kareSayfasiAc = async (veri, raporaGirdi) => {
    let indirmeUrl = null
    try {
      indirmeUrl = URL.createObjectURL(await (await fetch(veri)).blob())
    } catch {
      /* blob kurulamazsa görsele basılı tutma yolu yine açık */
    }
    setKareSayfasi((eski) => {
      if (eski?.indirmeUrl) URL.revokeObjectURL(eski.indirmeUrl)
      return { veri, raporaGirdi, indirmeUrl }
    })
  }

  /** iPhone/iPad mi? (iPadOS kendini Mac gibi tanıtıyor, dokunma sayısına bakılıyor.) */
  const iosCihaz = () => {
    if (typeof navigator === 'undefined') return false
    const p = navigator.platform || ''
    return /iPhone|iPad|iPod/.test(p) || (/Mac/.test(p) && navigator.maxTouchPoints > 1)
  }

  /**
   * Kareyi cihaza kaydetmeye çalışır. Döner: kesin kaydedildi mi.
   *
   * Sıra: paylaşma sayfası (telefonda Fotoğraflar'a atmanın tek güvenilir
   * yolu) → <a download> (masaüstü ve Android). Hiçbiri kesin değilse false
   * döner ve çağıran taraf kareyi ekranda açar.
   */
  const cihazaKaydet = async (veri) => {
    const ad = `ar-${model?.name || 'tasarim'}-${cols}x${rows}.jpg`
    let blob
    try {
      blob = await (await fetch(veri)).blob()
    } catch {
      return false
    }

    /*
     * KAYDET HİÇBİR CİHAZDA PAYLAŞMA SAYFASI AÇMAZ.
     *
     * Bir ara iPhone'da paylaşma sayfası açılıyordu; oradaki "Görüntüyü
     * Kaydet" kareyi Fotoğraflar'a koyuyor diye. Ama kullanıcı "Kaydet"
     * dediğinde ek bir sayfayla uğraşmak istemiyor: dosya doğrudan insin,
     * kare rapora girsin, o kadar. Paylaşmak isteyen için ayrı PAYLAŞ
     * düğmesi zaten var.
     *
     * Sonuç: her cihazda <a download>. iPhone'da dosya Safari'nin
     * İndirilenler klasörüne (Dosyalar uygulaması) iner.
     */
    const a = document.createElement('a')
    if (!('download' in a)) return false
    const url = URL.createObjectURL(blob)
    a.href = url
    a.download = ad
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    return true
  }

  /*
   * PAYLAŞ — Amazon'un AR ekranındaki paylaşma düğmesinin karşılığı.
   * Telefonda işletim sisteminin kendi paylaşma sayfası açılır (WhatsApp,
   * e-posta…); desteklemeyen tarayıcıda dosya indirmeye düşer, yani düğme
   * hiçbir cihazda ölü kalmaz.
   */
  const paylas = async () => {
    const veri = kareTaze() ? cekim : await yakala()
    if (!veri) return
    const raporaGirdi = onSaved?.(veri, 'kamera') // paylaşılan kare de rapora girsin
    /*
     * PAYLAŞMA SAYFASI YALNIZCA BU DÜĞMEDE.
     *
     * Kaydet hiçbir cihazda paylaşma sayfası açmıyor (dosya doğrudan iniyor).
     * Paylaşmak isteyen buraya basıyor: telefonda işletim sisteminin paylaşma
     * sayfası açılıyor — iPhone'da oradaki "Görüntüyü Kaydet" kareyi
     * Fotoğraflar'a da koyar. Desteklenmeyen tarayıcıda indirmeye düşüyor,
     * yani düğme hiçbir cihazda ölü kalmıyor.
     */
    try {
      const blob = await (await fetch(veri)).blob()
      const dosya = new File([blob], `ar-${model?.name || 'tasarim'}.jpg`, { type: 'image/jpeg' })
      if (navigator.canShare?.({ files: [dosya] })) {
        await navigator.share({ files: [dosya], title: t('ar.title') })
        setBildirim(t(raporaGirdi ? 'ar.savedNote' : 'ar.savedOnlyNote'))
        return
      }
    } catch {
      /* kullanıcı vazgeçti ya da desteklenmiyor — indirmeye düşülür */
    }
    const indi = await cihazaKaydet(veri)
    if (indi) setBildirim(t(raporaGirdi ? 'ar.savedNote' : 'ar.savedOnlyNote'))
    else await kareSayfasiAc(veri, raporaGirdi)
  }

  /*
   * SIFIRLA — ürünü ortaya, dönüşü sıfıra, ölçeği başlangıca alır ve
   * yerleştirme adımına döner. Amazon'daki ↻ düğmesi de aynı işi yapıyor:
   * ürün kaybolduğunda ya da ölçek iyice bozulduğunda çıkış yolu.
   */
  const sifirla = () => {
    setDonus(0)
    setTusTakimi(false)
    setMerkez({ x: kutu.w / 2, y: kutu.h / 2 })
    setAsama('yerlestir')
  }

  /* Tuş takımı adımları: dokunmatikte parmakla tutturulamayan ince ayar için */
  const kaydir = (dx, dy) => setMerkez((m) => ({ x: m.x + dx, y: m.y + dy }))
  const cevir = (d) => setDonus((a) => a + d)

  // Onay yazısı birkaç saniye sonra kendiliğinden kalkar
  useEffect(() => {
    if (!bildirim) return undefined
    const z = setTimeout(() => setBildirim(null), 4000)
    return () => clearTimeout(z)
  }, [bildirim])

  // Cihaz gerçek AR oturumu açabiliyor mu? (bir kez, pencere açılınca)
  useEffect(() => {
    if (!open) return
    let iptal = false
    arDestekliMi().then((v) => {
      if (!iptal) setDunyaVar(v)
    })
    return () => {
      iptal = true
    }
  }, [open])

  // Pencere kapanırsa oturum da kapansın — kamera ve XR açık kalmasın.
  useEffect(() => {
    if (open) return
    oturumRef.current?.kapat?.()
    oturumRef.current = null
    setDunyaAcik(false)
  }, [open])

  /**
   * Tasarımın o anki görüntüsünü dokuya çevirir.
   *
   * Kaynak, ekranda duran tasarımın KENDİSİ: aynı bileşen, aynı içerik, aynı
   * diyot dokusu. Böylece AR'de görünen şey önizlemedekiyle birebir aynı olur
   * ve ikinci bir çizim yolu (dolayısıyla ikinci bir hata kaynağı) doğmaz.
   */
  const tasarimDokusu = async () => {
    const el = tasarimRef.current
    if (!el) return null
    const k = await html2canvas(el, { backgroundColor: null, scale: 2, logging: false, useCORS: true })
    const doku = new THREE.CanvasTexture(k)
    doku.colorSpace = THREE.SRGBColorSpace
    doku.anisotropy = 4
    return doku
  }

  const dunyayaGir = async () => {
    if (dunyaHazirlaniyor) return
    setDunyaHazirlaniyor(true)
    try {
      const doku = await tasarimDokusu()
      if (!doku) throw new Error('tasarım yok')
      const o = await arBaslat({
        doku,
        // FİZİKSEL ÖLÇEK: konfigüratördeki metre değerleri doğrudan geçer.
        genislikM: tasarimWm,
        yukseklikM: tasarimHm,
        ustKatman: arKatmanRef.current,
        otomatik: dunyaOtomatik,
        onDurum: setDunyaDurum,
        onBitti: () => {
          oturumRef.current = null
          setDunyaAcik(false)
          setDunyaDurum(DURUM.ARANIYOR)
        },
      })
      oturumRef.current = o
      setDunyaAcik(true)
      setDunyaDurum(DURUM.ARANIYOR)
    } catch {
      setBildirim(t('arw.failed'))
    } finally {
      setDunyaHazirlaniyor(false)
    }
  }

  // Pencere açıkken arkadaki sayfa kaymasın (mobilde kaydırma devri)
  useGovdeKilidi(open)

  if (!open) return null

  /* ------------------------------------------------------------- geometri */

  const w = tasarimWm * pxPerM
  const h = tasarimHm * pxPerM
  const sol = merkez.x - w / 2
  const sag = merkez.x + w / 2
  const ust = merkez.y - h / 2
  const alt = merkez.y + h / 2

  /*
   * TASARIMDAKİYLE BİREBİR AYNI ÇİZİM.
   *
   * Çalışma alanı önizlemesinde (WallPreview) bütün ekranlar düz/L tipiyse ve
   * hepsi ortak içeriği kullanıyorsa içerik TEK katman olarak şeridin tamamına
   * yayılıyor, ekranlar onun üstüne yalnızca çerçeve olarak çiziliyor. Kamerada
   * ise her ekran kendi içeriğini ayrı ayrı çiziyordu; bu iki farka yol
   * açıyordu:
   *   - Video içerikte her ekran (L tipinde her KANAT) ayrı bir <video>
   *     demekti; telefon hepsini birden oynatamayınca aradaki panel siyah
   *     kalıyor, tasarımın ortasında kopma görünüyordu.
   *   - Ekranlar arası içerik dizilimi önizlemedekiyle tam örtüşmüyordu.
   * Artık kamera da aynı tek katmanı ve aynı dış hat maskesini kullanıyor.
   */
  const yerlesim = parcalar.map((s) => ({
    ...s,
    wPx: s.wm * pxPerM,
    hPx: s.hm * pxPerM,
    xStart: s.xm * pxPerM,
  }))
  const sekilUygun = yerlesim.every((s) => {
    const t = s.type || 'flat'
    return t === 'flat' || t === 'lshape'
  })
  const ortakIcerik = yerlesim.every((s) => !s.content)
  const seritGorsel = content !== 'none' ? contentImage(content, contentUrl) : null
  const seritVideo = content !== 'none' ? videoSrcFor(content, contentUrl) : null
  const tekKatman = sekilUygun && ortakIcerik && !!(seritGorsel || seritVideo)
  // Yayın var mı (kapalı panel ve boş çerçeve ışık saçmaz)
  const seritYayin = content !== 'none' && content !== 'led'
  const maskePolygon = tekKatman ? seritMaskePolygon(yerlesim, h) : undefined

  // Kenar boşlukları — görüntü çerçevesine olan uzaklık, o anki ölçekle metreye
  const bosluk = {
    sol: Math.max(0, sol) / pxPerM,
    sag: Math.max(0, kutu.w - sag) / pxPerM,
    ust: Math.max(0, ust) / pxPerM,
    alt: Math.max(0, kutu.h - alt) / pxPerM,
  }


  /*
   * ÖLÇÜ ETİKETLERİNİN YERİ
   *
   * İki takım etiket var ve ikisi de aynı iki eksen üzerinde duruyor:
   *   • tasarımın KENDİ ölçüleri (vurgulu) — tasarımın hemen dışında,
   *   • kenar BOŞLUKLARI — tasarımla görüntü kenarı arasındaki orta nokta.
   *
   * Tasarım küçüldükçe boşluklar büyüyor ve boşluk etiketi orta noktada
   * kaldığı için tasarımın üstüne biniyordu; tasarım büyüdükçe de ikisi
   * birbirine değiyordu. Bu yüzden ölçü etiketleri tasarımın DIŞINA alındı ve
   * boşluk etiketleri onlardan en az AYRIK kadar uzağa itiliyor. Her ikisi de
   * görüntü çerçevesinin içinde kalacak şekilde kırpılıyor.
   */
  const olcu = (() => {
    /* Açıklık etiketlerin MERKEZLERİ arasında ölçülüyor; yatayda etiketin
       kendi genişliği (~55 px) de araya girdiği için orası daha büyük. */
    const AYRIK_X = 68
    const AYRIK_Y = 26
    const KENAR_X = 30 // etiketin görüntü kenarına en yakın durabileceği yer
    const KENAR_Y = 22

    // Tasarımın kendi ölçüleri: üst kenarın ÜSTÜ, sağ kenarın SAĞI
    const genislikY = kis(ust - 14, KENAR_Y, kutu.h - KENAR_Y)
    const yukseklikX = kis(sag + 34, KENAR_X, kutu.w - KENAR_X)

    return {
      genislikY,
      yukseklikX,
      /* Boşluk etiketleri boşluğun ortasında durur, ama tasarımın kendi
         etiketine AYRIK kadar bile yaklaşamaz. */
      boslukSolX: kis(sol / 2, KENAR_X, kutu.w - KENAR_X),
      boslukSagX: kis(Math.max(sag + (kutu.w - sag) / 2, yukseklikX + AYRIK_X), KENAR_X, kutu.w - KENAR_X),
      boslukUstY: kis(Math.min(ust / 2, genislikY - AYRIK_Y), KENAR_Y, kutu.h - KENAR_Y),
      boslukAltY: kis(alt + (kutu.h - alt) / 2, KENAR_Y, kutu.h - KENAR_Y),
      /* Kenar kadrajın dışındaysa o boşluk ölçülemez — etiketi hiç çizilmez */
      solVar: sol > KENAR_X,
      sagVar: sag < kutu.w - KENAR_X,
      ustVar: ust > KENAR_Y,
      altVar: alt < kutu.h - KENAR_Y,
    }
  })()

  const cizgi = 'absolute border-dashed border-white/60 pointer-events-none'

  /*
   * AR OTURUMUNUN ARAYÜZÜ.
   *
   * WebXR oturumunda sayfa görünmez; yalnızca dom-overlay kökü olarak verilen
   * bu ağaç kamera görüntüsünün üstünde çizilir. Bu yüzden kök HER ZAMAN DOM'da
   * durur (oturum dışında gizli): oturum açılırken hazır olmalı.
   */
  const dunyaYazi =
    dunyaDurum === DURUM.YERLESTI
      ? t('arw.placed')
      : dunyaDurum === DURUM.YUZEY_VAR
        ? t('arw.found')
        : t('arw.aim')
  const dunyaAlt =
    dunyaDurum === DURUM.YERLESTI
      ? t('arw.walk')
      : dunyaDurum === DURUM.YUZEY_VAR && !dunyaOtomatik
        ? t('arw.tapHint')
        : null

  const dunyaArayuz = (
    <div
      ref={arKatmanRef}
      className={dunyaAcik ? 'fixed inset-0 z-[80] flex flex-col' : 'hidden'}
      style={{ touchAction: 'none' }}
    >
      {/* Durum şeridi: yüzey aranıyor → algılandı → yerleşti */}
      <div className="pt-4 px-4 flex justify-center">
        <div className="rounded-full bg-black/70 backdrop-blur px-4 py-2 text-center">
          <p className="m-0 text-white text-[13px] font-semibold flex items-center gap-2 justify-center">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                dunyaDurum === DURUM.YERLESTI
                  ? 'bg-emerald-400'
                  : dunyaDurum === DURUM.YUZEY_VAR
                    ? 'bg-amber-300'
                    : 'bg-white/50 animate-pulse'
              }`}
            />
            {dunyaYazi}
          </p>
          {dunyaAlt && <p className="m-0 mt-0.5 text-white/70 text-[11.5px]">{dunyaAlt}</p>}
        </div>
      </div>

      {/*
        TAŞIMA ALANI. Basılı tutup sürüklerken tasarım yüzey üzerinde kayar
        (motor her karede yeniden hit-test yapar). Düğmeler bunun ÜSTÜNDE
        durduğu için tıklamalarını bu alan yutmaz.
      */}
      <div
        className="flex-1"
        onPointerDown={() => oturumRef.current?.suruklemeBaslat?.()}
        onPointerUp={() => oturumRef.current?.suruklemeBitir?.()}
        onPointerCancel={() => oturumRef.current?.suruklemeBitir?.()}
        onClick={() => {
          // Elle modda dokunmak yerleştirir.
          if (!dunyaOtomatik) oturumRef.current?.dokunmaYerlestir?.()
        }}
      />

      {/* Ölçü künyesi: gösterilen şey gerçek ürünün ölçüsüdür. */}
      <div className="px-4 pb-3 flex justify-center">
        <div className="rounded-lg bg-black/70 backdrop-blur px-3 py-1.5">
          <p className="m-0 text-white text-[12.5px] font-semibold tabular-nums">
            {metre(tasarimWm)} × {metre(tasarimHm)}
          </p>
          <p className="m-0 text-white/60 text-[10.5px] leading-tight">{t('arw.scaleLocked')}</p>
        </div>
      </div>

      {/* Denetimler */}
      <div className="px-4 pb-6 flex items-center justify-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => oturumRef.current?.yenidenYerlestir?.()}
          className="rounded-full bg-white/95 text-[#10141b] text-[12.5px] font-semibold px-4 py-2"
        >
          {t('arw.replace')}
        </button>
        <button
          type="button"
          onClick={() => {
            const yeni = !dunyaOtomatik
            setDunyaOtomatik(yeni)
            oturumRef.current?.otomatikAyarla?.(yeni)
          }}
          className="rounded-full border border-white/40 text-white text-[12.5px] font-semibold px-4 py-2"
        >
          {dunyaOtomatik ? t('arw.auto') : t('arw.manual')}
        </button>
        <button
          type="button"
          onClick={() => {
            oturumRef.current?.kapat?.()
            oturumRef.current = null
            setDunyaAcik(false)
          }}
          className="rounded-full border border-white/40 text-white text-[12.5px] font-semibold px-4 py-2"
        >
          {t('arw.exit')}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {dunyaArayuz}
    <div className="fixed inset-0 z-[60] bg-black select-none" style={{ touchAction: 'none' }}>
      <div ref={kapRef} className="absolute inset-0 overflow-hidden">
        {arkaFoto ? (
          <img ref={resimRef} src={arkaFoto} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        )}

        <input ref={fotoRef} type="file" accept="image/*" onChange={fotoSecildi} className="hidden" />

        {/*
          Kamera açılamadıysa: sebep + ÇIKIŞ YOLU. Yalnızca "açılamadı" deyip
          kapatmak, ekranı hiç denenemez bırakıyordu.
        */}
        {hata && (
          <div className="absolute inset-0 flex items-center justify-center p-8 bg-[#10141b]">
            <div className="max-w-sm text-center">
              <p className="text-neutral-200 text-sm leading-relaxed m-0">{hata}</p>
              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => fotoRef.current?.click()}
                  className="rounded-full px-6 py-2.5 text-sm font-semibold bg-brand text-white hover:bg-brand-dark transition-colors"
                >
                  {t('ar.usePhoto')}
                </button>
                <button
                  type="button"
                  onClick={yenidenDene}
                  className="rounded-full px-6 py-2 text-[13px] font-semibold border border-white/25 text-white/85 hover:border-white/60 transition-colors"
                >
                  {t('ar.retry')}
                </button>
                <button type="button" onClick={onClose} className="text-[12.5px] text-white/50 hover:text-white/80 mt-1">
                  {t('ar.close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/*
          TASARIM KATMANI — çekimde bu katman olduğu gibi kameranın üstüne
          bindiriliyor, o yüzden arayüz çubukları buranın DIŞINDA duruyor.
        */}
        {/*
          KAMERADAN BAĞIMSIZ ÇİZİLİR. Eskiden "kamera akışı hazır" bayrağına
          bağlıydı; akış izin penceresi beklerken, kamerayı başka bir uygulama
          tutarken ya da sessizce takıldığında o bayrak hiç true olmuyordu.
          Hata da yok — dolayısıyla ekran siyah kalıyor ve müşteri tasarımını
          hiç göremiyordu. Tasarımın görünmesi kameraya bağlı olmamalı: kamera
          yalnızca arka plandır, gecikirse arkası siyah kalır, tasarım durur.
        */}
        {/* Tasarım YALNIZCA yerleştirildikten sonra çizilir (bkz. `asama`) */}
        {!hata && arAcik && kutu.w > 0 && asama === 'yerlesti' && (
          <div ref={katmanRef} className="absolute inset-0 pointer-events-none">
            {olculer && (
              <>
                {/* Kenar boşluğu çizgileri: tasarımdan görüntü kenarlarına */}
                <div className={cizgi} style={{ left: 0, top: merkez.y, width: Math.max(0, sol), borderTopWidth: 1 }} />
                <div className={cizgi} style={{ left: sag, top: merkez.y, width: Math.max(0, kutu.w - sag), borderTopWidth: 1 }} />
                <div className={cizgi} style={{ left: merkez.x, top: 0, height: Math.max(0, ust), borderLeftWidth: 1 }} />
                <div className={cizgi} style={{ left: merkez.x, top: alt, height: Math.max(0, kutu.h - alt), borderLeftWidth: 1 }} />

                {/*
                  Boşluk etiketi yalnızca o kenar GÖRÜNTÜNÜN İÇİNDEyken çizilir.
                  Tasarım kadraja sığmayacak kadar büyütüldüğünde boşluk yok
                  demektir; "0 cm" yazmak bilgi taşımadığı gibi tasarımın kendi
                  ölçü etiketiyle aynı kenara sıkışıp üst üste biniyordu.
                */}
                {olcu.solVar && <Etiket x={olcu.boslukSolX} y={merkez.y}>{metre(bosluk.sol)}</Etiket>}
                {olcu.sagVar && <Etiket x={olcu.boslukSagX} y={merkez.y}>{metre(bosluk.sag)}</Etiket>}
                {olcu.ustVar && <Etiket x={merkez.x} y={olcu.boslukUstY}>{metre(bosluk.ust)}</Etiket>}
                {olcu.altVar && <Etiket x={merkez.x} y={olcu.boslukAltY}>{metre(bosluk.alt)}</Etiket>}

                {/*
                  Tasarımın kendi ölçüleri — vurgulu, çünkü bunlar KESİN.
                  Tasarımın DIŞINDA: genişlik üst kenarın üstünde, yükseklik sağ
                  kenarın sağında. Önceden içeride, kenarlara yapışıktılar;
                  tasarım küçültüldüğünde etiketler ekranın neredeyse tamamını
                  kaplayıp altındaki tasarımı görünmez ediyordu (bkz. olcuYerlesimi).
                */}
                <Etiket x={merkez.x} y={olcu.genislikY} vurgu>{metre(tasarimWm)}</Etiket>
                <Etiket x={olcu.yukseklikX} y={merkez.y} vurgu>{metre(tasarimHm)}</Etiket>
              </>
            )}

            {/* Tasarımın kendisi */}
            <div
              ref={tasarimRef}
              className="absolute pointer-events-auto"
              style={{
                left: sol,
                top: ust,
                width: w,
                height: h,
                cursor: 'move',
                touchAction: 'none',
                /*
                 * DÖNDÜRME — iki parmakla çevirince ya da tuş takımından.
                 * Ekranlar 2B çiziliyor, dolayısıyla dönüş bir perspektif
                 * dönüşümüyle veriliyor: ürün yana döndükçe kenarı daralıyor
                 * ve mekâna açılı oturduğu hissi çıkıyor. Amazon'da bu gerçek
                 * 3B model dönüşü; buradaki yaklaşık karşılığı.
                 */
                transform: `perspective(1400px) rotateY(${donus}deg)`,
                transformStyle: 'preserve-3d',
              }}
              onPointerDown={parmakIndi}
              onPointerMove={parmakHareket}
              onPointerUp={parmakKalkti}
              onPointerCancel={parmakKalkti}
              onWheel={tekerlek}
            >
              {/*
                SEÇİM DIŞ HATTI KALDIRILDI.

                Ürünün çevresinde camgöbeği bir çerçeve vardı; jestlerin ona
                işlediğini göstermesi içindi. Ama çerçeve silüeti değil SINIR
                KUTUSUNU izliyordu: kavisli ekranda ürün yaya bükülüyor,
                dikdörtgen çizgi ise düz kalıyor ve ekranın kenarlarıyla hiç
                örtüşmüyordu — mekâna oturup oturmadığına bakılan bir ekranda
                göze batan, yanıltıcı bir çizgi. Silüeti izletmek her karede
                filtre maliyeti demek, mobilde pahalı.

                Seçili olduğu zaten anlaşılıyor: ölçü etiketleri ürünle
                birlikte gidiyor, sağdaki araç sütunu ve tuş takımı yalnızca
                ürün yerleştikten sonra çıkıyor.
              */}
              {/* Ekranlar şeridi — alta hizalı, WallPreview ile aynı yerleşim */}
              <div style={{ position: 'absolute', inset: 0 }}>
                {/* z0: Tek içerik katmanı — tüm şeride yayılır, ekran şekline kırpılır */}
                {tekKatman && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 0,
                      overflow: 'hidden',
                      clipPath: maskePolygon,
                      backgroundColor: '#0a0a0a',
                      backgroundImage: seritGorsel || undefined,
                      backgroundSize: `${w}px ${h}px`,
                      backgroundRepeat: 'no-repeat',
                      filter: seritGorsel && seritYayin ? LED_LIT_FILTER : undefined,
                    }}
                  >
                    {seritVideo && <VideoLayer src={seritVideo} gw={w} gh={h} left={0} top={0} lit={seritYayin} />}
                  </div>
                )}
                {/* z2: Ekranlar (tek katman varsa yalnız çerçeve) */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'flex-end' }}>
                {yerlesim.map((s, i) => (
                    <Screen
                      key={i}
                      wPx={s.wPx}
                      hPx={s.hPx}
                      cols={s.cols}
                      rows={s.rows}
                      type={s.type || 'flat'}
                      resolution={resolution}
                      model={model}
                      content={s.content || content}
                      contentUrl={s.content ? null : contentUrl}
                      hideRegions={hideRegions}
                      frameOnly={tekKatman}
                      curveAmount={curveAmount}
                      leftCols={s.leftCols}
                      rightCols={s.rightCols}
                      spanW={w}
                      spanH={h}
                      offsetX={s.xStart}
                      offsetY={h - s.hPx}
                    />
                ))}
                </div>
              </div>
              {/*
                Tasarımın etrafındaki mavi kenarlık KALDIRILDI. Bir seçim
                çerçevesiydi; kamerada ekranın mekâna gerçekten oturup
                oturmadığına bakılıyor ve bu çizgi hem görüntüyü bozuyor hem de
                çekilen fotoğrafa giriyordu. Taşıma/ölçekleme yine aynı alandan
                yapılıyor, sadece çizgi çizilmiyor.
              */}
            </div>
          </div>
        )}

        {/* ══════════════════ YERLEŞTİRME AKIŞI (bkz. `asama`) ══════════════════ */}
        {/* Karşılama → yerleştirme → araçlar sırası AR ekranıyla ortak parçalardan
            geliyor (ArYerlestirme.jsx); ikisi de birebir aynı görünsün diye. */}

        {/*
          Ekranın herhangi bir yerine dokunulunca ürün TAM ORAYA konur. Amazon
          gerçek zeminde bir nişangâh gösteriyor; bizde yüzey algılama olmadığı
          için nişangâh sabit bir hedef — dokunulan nokta yine de yerleştirme
          noktası.
        */}
        {!hata && arAcik && asama === 'yerlestir' && (
          <YerlestirKatmani
            t={t}
            onYerlestir={(n) => {
              setMerkez(n)
              setAsama('yerlesti')
            }}
          />
        )}

        {!hata && arAcik && asama === 'yerlesti' && (
          <AraclarSutunu
            t={t}
            onSifirla={sifirla}
            onPaylas={paylas}
            onTusTakimi={() => setTusTakimi((a) => !a)}
            tusTakimi={tusTakimi}
          />
        )}

        {/*
          GERÇEK YÜZEYE YERLEŞTİR.
          Yalnızca cihaz WebXR AR açabiliyorsa görünür; desteklemeyen
          cihazlarda kimseye çalışmayan bir düğme gösterilmez.
        */}
        {!hata && arAcik && asama === 'yerlesti' && dunyaVar && !dunyaAcik && (
          <div className="absolute bottom-28 inset-x-0 z-40 flex justify-center px-6 pointer-events-none">
            <button
              type="button"
              onClick={dunyayaGir}
              disabled={dunyaHazirlaniyor}
              className="pointer-events-auto rounded-full bg-brand text-white text-[13px] font-semibold px-5 py-2.5 shadow-lg disabled:opacity-60 flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7l9-4 9 4-9 4-9-4z" />
                <path d="M3 12l9 4 9-4M3 17l9 4 9-4" />
              </svg>
              {dunyaHazirlaniyor ? t('arw.starting') : t('arw.enter')}
            </button>
          </div>
        )}

        {!hata && arAcik && asama === 'yerlesti' && tusTakimi && (
          /* Adım büyüklüğü kameraya ait: burada piksel, AR ekranında metre. */
          <TusTakimi t={t} onKaydir={(dx, dy) => kaydir(dx * 12, dy * 12)} onCevir={(d) => cevir(d * 15)} />
        )}

        {/*
          KAYDETME ONAYI — üst barın altında, kısa süre görünür.
          z-50: araç çubukları z-40'ta; onay onların da üstünde durmalı.
        */}
        {/*
          KARE HAZIR — indirme kesin olmadığında açılır (çoğunlukla iOS).
          Kullanıcı buradan paylaşma sayfasıyla Fotoğraflar'a atabilir,
          indirmeyi tekrar deneyebilir ya da görsele basılı tutup kaydedebilir.
          Kamera araçlarının üstünde durmalı, bu yüzden z-[70].
        */}
        {kareSayfasi && (
          <div className="absolute inset-0 z-[70] bg-black/85 flex items-center justify-center p-4">
            <div className="w-full max-w-sm max-h-full overflow-y-auto bg-[#161a21] rounded-3xl p-5 text-center">
              <h3 className="m-0 text-white text-base font-semibold">{t('shot.title')}</h3>
              <img
                src={kareSayfasi.veri}
                alt=""
                className="mt-4 w-full rounded-2xl border border-white/15"
              />
              <p className="mt-3 mb-0 text-[12px] text-white/60">
                {iosCihaz() ? t('shot.iosNote') : t('shot.hint')}
              </p>
              {kareSayfasi.raporaGirdi && (
                <p className="mt-1 mb-0 text-[12px] text-white/60">{t('shot.inReport')}</p>
              )}
              <div className="mt-4 flex flex-col gap-2">
                {typeof navigator !== 'undefined' && navigator.canShare && (
                  <button
                    type="button"
                    onClick={() => cihazaKaydet(kareSayfasi.veri)}
                    className="rounded-full bg-white text-[#10141b] font-semibold py-3 hover:bg-white/85"
                  >
                    {t('shot.savePhotos')}
                  </button>
                )}
                <a
                  href={kareSayfasi.indirmeUrl || kareSayfasi.veri}
                  download={`ar-${model?.name || 'tasarim'}-${cols}x${rows}.jpg`}
                  className="rounded-full border border-white/25 text-white font-semibold py-3 no-underline"
                >
                  {t('shot.download')}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    if (kareSayfasi.indirmeUrl) URL.revokeObjectURL(kareSayfasi.indirmeUrl)
                    setKareSayfasi(null)
                  }}
                  className="rounded-full text-white/60 text-[13px] py-2 hover:text-white"
                >
                  {t('shot.close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {bildirim && (
          <div className="absolute top-16 inset-x-0 z-50 flex justify-center px-6 pointer-events-none">
            <div className="flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 shadow-lg pointer-events-auto">
              <p className="m-0 text-white text-[12.5px] font-semibold text-center">{bildirim}</p>
              {galeriKare && (
                <button
                  type="button"
                  onClick={() => galeriyeEkle(galeriKare)}
                  className="shrink-0 rounded-full bg-white text-[#10141b] text-[12px] font-semibold px-3 py-1"
                >
                  {t('shot.toGallery')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------- ÜST BAR */}
        <div className="absolute top-0 inset-x-0 z-40 flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('ar.close')}
            className="text-white/90 hover:text-white p-1"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <span className="text-white text-[13px] font-semibold">{t('ar.title')}</span>

          <div className="ml-auto flex items-center gap-2.5">
            {/* Ölçüleri göster/gizle — fotoğraf çekmeden önce sadeleştirmek için */}
            <button
              type="button"
              onClick={() => setOlculer((o) => !o)}
              aria-label={olculer ? t('tool.hideMeasures') : t('tool.showMeasures')}
              title={olculer ? t('tool.hideMeasures') : t('tool.showMeasures')}
              className={`rounded-full px-3 py-1.5 text-[13px] font-semibold border transition-colors ${
                olculer
                  ? 'border-white/30 text-white/85 hover:border-white/70'
                  : 'border-white/70 bg-white/15 text-white'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="1.5" />
                  <line x1="4" y1="14" x2="14" y2="14" />
                  <line x1="14" y1="4" x2="14" y2="20" />
                </svg>
                {olculer ? t('tool.hideMeasures') : t('tool.showMeasures')}
              </span>
            </button>
            {cekim && (
              <img
                src={cekim}
                alt={t('ar.lastShot')}
                className="w-10 h-10 rounded-lg object-cover border-2 border-white/70"
              />
            )}
            <button
              type="button"
              onClick={kaydet}
              disabled={mesgul}
              className="rounded-full px-4 py-1.5 text-[13px] font-semibold bg-white text-[#10141b] hover:bg-white/85 disabled:opacity-50 transition-colors"
            >
              {t('ar.save')}
            </button>
          </div>
        </div>

        {/* Kullanım uyarısı — perspektif düzeltmesi yok, karşıdan bakılmalı */}
        {!hata && (
          <p className="absolute top-16 inset-x-0 text-center text-[11px] text-white/70 px-8 m-0 pointer-events-none">
            {t('ar.hint')}
          </p>
        )}

        {/* ------------------------------------------------- ÖLÇEK DÜĞMELERİ */}
        {!hata && arAcik && (
          /* Sağ kenarın ORTASINDA değil altında: ortada tasarımın ölçü
             etiketlerinin üstüne biniyordu. */
          <div className="absolute right-3 bottom-32 flex flex-col rounded-full bg-black/55 backdrop-blur-sm overflow-hidden">
            <button type="button" onClick={() => adimla(1.12)} aria-label={t('ar.bigger')} className="w-10 h-10 text-white text-xl leading-none hover:bg-white/15">
              +
            </button>
            <div className="h-px bg-white/25" />
            <button type="button" onClick={() => adimla(1 / 1.12)} aria-label={t('ar.smaller')} className="w-10 h-10 text-white text-xl leading-none hover:bg-white/15">
              −
            </button>
          </div>
        )}

        {/*
          ÖRNEK MEKÂN ŞERİDİ — alt barın hemen üstünde, açılıp kapanır.
          Küçük resimler; dokunulan mekân arka plan olur.
        */}
        {ornekAcik && (
          <div className="absolute bottom-28 inset-x-0 px-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {ORNEKLER.map((o) => (
                <button
                  key={o.yol}
                  type="button"
                  onClick={() => {
                    ornekSecildi(o.yol)
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
        <div className="absolute bottom-0 inset-x-0 z-40 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-5">
          {/*
            Dar telefonlarda beş denetim 390 pikselin dışına taşıyordu (soldaki
            LENS ve sağdaki AR düğmesi ekranın dışında kalıyor, tıklanamıyordu).
            Şerit artık YATAY KAYDIRILIYOR; sığdığında ortalanmış duruyor.
          */}
          <div className="flex items-center justify-center sm:justify-center gap-4 px-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Fotoğraf arka plandayken lens/flaş anlamsız — yerine fotoğrafı değiştir */}
            {arkaFoto ? (
              /* Fotoğraftayken: fotoğrafı değiştir, ya da kameraya geri dön */
              <>
                <AracDugme onClick={() => fotoRef.current?.click()} etiket={t('ar.background')} deger={t('ar.photo')} aktif />
                {/* Vazgeçme yolu: fotoğrafı kaldırıp canlı kameraya döner */}
                <AracDugme onClick={yenidenDene} etiket={t('ar.background')} deger={t('ar.removeBg')} />
              </>
            ) : (
              <AracDugme
                onClick={zoomDegistir}
                etiket={t('ar.lens')}
                deger={zoom ? `${zoom.deger.toFixed(1)}x` : cihazlar.length > 1 ? `${cihazNo + 1}/${cihazlar.length}` : '1.0x'}
              />
            )}

            {/* Deklanşör */}
            <button
              type="button"
              onClick={yakala}
              disabled={mesgul || !!hata}
              aria-label={t('ar.shoot')}
              className="w-16 h-16 rounded-full border-4 border-white/90 flex items-center justify-center disabled:opacity-40"
            >
              <span className={`w-12 h-12 rounded-full transition-colors ${mesgul ? 'bg-white/50' : 'bg-white'}`} />
            </button>

            {/* Birden fazla kamera varsa seçim düğmesi — bkz. kameraDegistir */}
            {!arkaFoto && cihazlar.length > 1 && (
              <AracDugme
                onClick={kameraDegistir}
                etiket={t('ar.camera')}
                deger={`${cihazNo + 1}/${cihazlar.length}`}
              />
            )}

            {!arkaFoto && (
              <AracDugme
                onClick={flasDegistir}
                etiket={t('ar.flash')}
                deger={t(`ar.flash.${flas}`)}
                aktif={flas === 'acik'}
              />
            )}

            {/*
              ARKA PLAN — fotoğrafa geçiş HER ZAMAN açık.
              Önceden yalnızca kamera HATA verdiğinde sunuluyordu. Ama kameranın
              açılıp da işe yaramaz görüntü vermesi mümkün: sanal kamera, kapağı
              kapalı webcam ya da Windows'un kamerayı engellediğinde sürücünün
              yolladığı "kamera kapalı" karesi. Bunların hiçbiri hata değil, akış
              teknik olarak çalışıyor — dolayısıyla hata ekranı hiç çıkmıyor ve
              kullanıcı elinde çalışmayan bir kamerayla kilitli kalıyordu.
              Fotoğrafla deneme yolu artık o durumda da açık.
            */}
            {!arkaFoto && (
              <AracDugme
                onClick={() => fotoRef.current?.click()}
                etiket={t('ar.background')}
                deger={t('ar.photo')}
              />
            )}

            {/* Hazır mekânlar — kendi fotoğrafı olmayan da deneyebilsin */}
            <AracDugme
              onClick={() => setOrnekAcik((a) => !a)}
              etiket={t('ar.samples')}
              deger={ornekAcik ? t('ar.on') : t('ar.off')}
              aktif={ornekAcik}
            />
            <AracDugme
              onClick={() => setArAcik((a) => !a)}
              etiket={t('ar.mode')}
              deger={arAcik ? t('ar.on') : t('ar.off')}
              aktif={arAcik}
            />
          </div>

          {/* Flaş desteklenmiyorsa sessizce yanıltmayalım */}
          {!flasVar && !hata && !arkaFoto && (
            <p className="text-center text-[10px] text-white/45 mt-2 m-0">{t('ar.noFlash')}</p>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
