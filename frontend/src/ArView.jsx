import { useCallback, useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas-pro'
import { Screen } from './WallPreview.jsx'
import { useLang } from './useLang.js'

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
      /* Tasarımın üstünde kalmalı: kenarlara yapışan ölçüler aksi hâlde
         tasarımın altında kalıp görünmüyor. */
      style={{ left: x, top: y, zIndex: 2 }}
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
}) {
  const { t } = useLang()
  const videoRef = useRef(null)
  const akisRef = useRef(null)
  const kapRef = useRef(null)
  const katmanRef = useRef(null)

  const [ornekAcik, setOrnekAcik] = useState(false)
  const [hata, setHata] = useState(null)
  /*
   * ÖRNEK MEKÂNLAR — hazır arka planlar. Yeni bir tane eklemek için görseli
   * public/ içine koyup buraya bir satır yazmak yeterli.
   */
  const ORNEKLER = [
    { yol: '/ornek-toplanti.jpg', ad: 'ar.bgMeeting' },
    { yol: '/ornek-toplanti-genis.jpg', ad: 'ar.bgMeetingWide' },
    { yol: '/ornek-gri-oda.jpg', ad: 'ar.bgGreyRoom' },
    { yol: '/ornek-koyu-oda.jpg', ad: 'ar.bgDarkRoom' },
  ]
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
  const [cekim, setCekim] = useState(null)
  /*
   * Ölçü etiketleri ve kenar boşluğu çizgileri açık/kapalı. Kamerada asıl amaç
   * ekranın mekânda nasıl duracağını GÖRMEK; ölçüler yardımcıdır ve fotoğrafta
   * çoğu zaman istenmez. Ana sayfadaki "ölçüleri gizle" düğmesinin karşılığı.
   */
  const [olculer, setOlculer] = useState(true)
  const [mesgul, setMesgul] = useState(false)

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
  merkezRef.current = merkez
  olcekRef.current = pxPerM

  const anlikKaydet = () => {
    const n = [...isaretRef.current.values()]
    if (!n.length) return (baslangicRef.current = null)
    baslangicRef.current = {
      merkez: merkezRef.current,
      pxPerM: olcekRef.current,
      orta: ortaNokta(n),
      uzaklik: n.length > 1 ? uzaklik(n[0], n[1]) : 0,
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
      return veri
    } catch {
      setHata(t('ar.errCapture'))
      return null
    } finally {
      setMesgul(false)
    }
  }

  const kaydet = async () => {
    const veri = cekim || (await yakala())
    if (!veri) return
    const a = document.createElement('a')
    a.href = veri
    a.download = `ar-${model?.name || 'tasarim'}-${cols}x${rows}.jpg`
    a.click()
  }

  if (!open) return null

  /* ------------------------------------------------------------- geometri */

  const w = tasarimWm * pxPerM
  const h = tasarimHm * pxPerM
  const sol = merkez.x - w / 2
  const sag = merkez.x + w / 2
  const ust = merkez.y - h / 2
  const alt = merkez.y + h / 2

  // Kenar boşlukları — görüntü çerçevesine olan uzaklık, o anki ölçekle metreye
  const bosluk = {
    sol: Math.max(0, sol) / pxPerM,
    sag: Math.max(0, kutu.w - sag) / pxPerM,
    ust: Math.max(0, ust) / pxPerM,
    alt: Math.max(0, kutu.h - alt) / pxPerM,
  }

  const cizgi = 'absolute border-dashed border-white/60 pointer-events-none'

  return (
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
        {!hata && arAcik && kutu.w > 0 && (
          <div ref={katmanRef} className="absolute inset-0 pointer-events-none">
            {olculer && (
              <>
                {/* Kenar boşluğu çizgileri: tasarımdan görüntü kenarlarına */}
                <div className={cizgi} style={{ left: 0, top: merkez.y, width: Math.max(0, sol), borderTopWidth: 1 }} />
                <div className={cizgi} style={{ left: sag, top: merkez.y, width: Math.max(0, kutu.w - sag), borderTopWidth: 1 }} />
                <div className={cizgi} style={{ left: merkez.x, top: 0, height: Math.max(0, ust), borderLeftWidth: 1 }} />
                <div className={cizgi} style={{ left: merkez.x, top: alt, height: Math.max(0, kutu.h - alt), borderLeftWidth: 1 }} />

                <Etiket x={Math.max(28, sol / 2)} y={merkez.y}>{metre(bosluk.sol)}</Etiket>
                <Etiket x={Math.min(kutu.w - 28, sag + (kutu.w - sag) / 2)} y={merkez.y}>{metre(bosluk.sag)}</Etiket>
                <Etiket x={merkez.x} y={Math.max(20, ust / 2)}>{metre(bosluk.ust)}</Etiket>
                <Etiket x={merkez.x} y={Math.min(kutu.h - 20, alt + (kutu.h - alt) / 2)}>{metre(bosluk.alt)}</Etiket>

                {/*
                  Tasarımın kendi ölçüleri — vurgulu, çünkü bunlar KESİN.
                  Tasarımın İÇİNE, kenarlarına yapışık duruyorlar: dışarı
                  konduklarında kenar boşluğu etiketleriyle üst üste biniyorlardı.
                */}
                <Etiket x={merkez.x} y={ust + 14} vurgu>{metre(tasarimWm)}</Etiket>
                <Etiket x={sag - 32} y={merkez.y} vurgu>{metre(tasarimHm)}</Etiket>
              </>
            )}

            {/* Tasarımın kendisi */}
            <div
              className="absolute pointer-events-auto"
              style={{ left: sol, top: ust, width: w, height: h, cursor: 'move', touchAction: 'none' }}
              onPointerDown={parmakIndi}
              onPointerMove={parmakHareket}
              onPointerUp={parmakKalkti}
              onPointerCancel={parmakKalkti}
              onWheel={tekerlek}
            >
              {/* Ekranlar şeridi — alta hizalı, WallPreview ile aynı yerleşim */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end' }}>
                {parcalar.map((s, i) => {
                  const sh = s.hm * pxPerM
                  return (
                    <Screen
                      key={i}
                      wPx={s.wm * pxPerM}
                      hPx={sh}
                      cols={s.cols}
                      rows={s.rows}
                      type={s.type || 'flat'}
                      resolution={resolution}
                      model={model}
                      content={s.content || content}
                      contentUrl={s.content ? null : contentUrl}
                      hideRegions={hideRegions}
                      curveAmount={curveAmount}
                      leftCols={s.leftCols}
                      rightCols={s.rightCols}
                      spanW={w}
                      spanH={h}
                      offsetX={s.xm * pxPerM}
                      offsetY={h - sh}
                    />
                  )
                })}
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

        {/* ---------------------------------------------------------- ÜST BAR */}
        <div className="absolute top-0 inset-x-0 flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
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
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-5">
          <div className="flex items-center justify-center gap-4 px-4">
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
  )
}
