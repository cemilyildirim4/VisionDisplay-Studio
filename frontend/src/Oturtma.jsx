import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas-pro'
import { Screen, VideoLayer, contentImage, seritMaskePolygon } from './WallPreview.jsx'
import { videoSrcFor } from './videoContent.js'
import { LED_LIT_FILTER } from './content.js'
import { useLang } from './useLang.js'
import { useGovdeKilidi } from './hooks/useGovdeKilidi.js'
import { viewingDistanceFor } from './viewingDistance.js'
import { uygunYuzeyBul } from './duvarBul.js'

/**
 * KAMERADA OTURTMA.
 *
 * "Nasıl Görüneceğini Gör"den AYRI bir özellik: orası tasarımı doğrudan
 * kameranın üstünde gösterip taşımaya yarıyor. Burada sıra tersine çevrildi:
 *
 *   1) Önce yalnızca TASLAK görünür — tasarımın ölçülerine göre çizilmiş
 *      boş bir çerçeve. Ne kadar yer kaplayacağı buradan anlaşılır.
 *   2) Taslak istenen yere getirilir (parmakla taşı, iki parmakla büyüt).
 *   3) Deklanşöre basılınca tasarım TAM O ÇERÇEVEYE yerleşir ve kare çekilir.
 *
 * Gerçek AR (WebXR) burada kullanılmıyor: cihazların çoğunda ya hiç yok
 * (iPhone/Safari) ya da oturum açılmıyor. Bu yol her telefonda çalışır,
 * yalnızca kamera ister.
 *
 * ÖLÇÜ: taslağın en/boy oranı ve etiketleri yapılandırmadaki GERÇEK metre
 * değerlerinden gelir; büyütüp küçültmek yalnızca kadraja oturtmak içindir,
 * ürünün ölçüsünü değiştirmez.
 */

const EN_KUCUK = 40 // piksel/metre
const EN_BUYUK = 4000

/*
 * TELEFON ARKA KAMERASININ YATAY GÖRÜŞ AÇISI (derece).
 *
 * Tarayıcı gerçek görüş açısını vermiyor — MediaTrackSettings'te böyle bir
 * alan yok. Ana kameralarda tipik değer 65°–70° arasında; 67° alındı.
 * Bu yüzden aşağıdaki uzaklık kestirimi YAKLAŞIKTIR ve kullanıcıya da öyle
 * söyleniyor. Amaç santim hassasiyeti değil, "uzaklaşın / yaklaşın" gibi
 * doğru yönü göstermek.
 */
const KAMERA_ACISI = 67

/**
 * Ekrandaki görüntü hangi uzaklıktan bakmaya denk geliyor?
 *
 * Gerçek genişliği W olan bir ekran, d uzaklıktan bakıldığında kadrajın
 * belli bir oranını kaplar. Buradaki hesap bunun tersi: kadrajı ne kadar
 * kapladığına bakıp d'yi buluyor.
 *
 *   yarıAçı   = atan(oran · tan(kameraAçısı / 2))
 *   uzaklık   = (W / 2) / tan(yarıAçı)
 */
function denkUzaklik(genislikM, kapladigiOran) {
  if (!(genislikM > 0) || !(kapladigiOran > 0)) return null
  const yariAci = Math.atan(kapladigiOran * Math.tan((KAMERA_ACISI * Math.PI) / 360))
  if (yariAci <= 0) return null
  return genislikM / 2 / Math.tan(yariAci)
}

function metre(v) {
  if (!isFinite(v)) return '—'
  return v < 1 ? `${Math.round(v * 100)} cm` : `${v.toFixed(2).replace('.', ',')} m`
}

/** İki dokunuş arasındaki uzaklık (pinch). */
function uzaklik(a, b) {
  const dx = a.clientX - b.clientX
  const dy = a.clientY - b.clientY
  return Math.hypot(dx, dy)
}

export default function Oturtma({
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
  onSaved,
}) {
  const { t } = useLang()
  const videoRef = useRef(null)
  const akisRef = useRef(null)
  const kapRef = useRef(null)
  const tasarimRef = useRef(null)
  const parmaklarRef = useRef(new Map())
  const baslangicRef = useRef(null)

  const [kutu, setKutu] = useState({ w: 0, h: 0 })
  const [merkez, setMerkez] = useState({ x: 0, y: 0 })
  const [pxPerM, setPxPerM] = useState(0)
  const [hata, setHata] = useState(null)
  const [sonuc, setSonuc] = useState(null)
  const [mesgul, setMesgul] = useState(false)
  const [bildirim, setBildirim] = useState(null)
  const [taraniyor, setTaraniyor] = useState(false)
  // Otomatik yerleştirmenin bulduğu alan — taslağın arkasında soluk gösterilir.
  const [bulunan, setBulunan] = useState(null)
  const otoDenendiRef = useRef(false)

  useGovdeKilidi(open)

  /* ------------------------------------------------------------ ölçüler */

  // Tasarımın GERÇEK ölçüsü — yapılandırmadan gelir, yakınlaştırmayla değişmez.
  const kabinW = (model?.widthMm || 500) / 1000
  const kabinH = (model?.heightMm || 500) / 1000
  const cokluListe = Array.isArray(screens) && screens.length > 0 ? screens : null
  let _xm = 0
  const parcalar = (cokluListe || [{ cols, rows, type: screenType }]).map((s) => {
    const wm = Math.max(1, s.cols) * kabinW
    const p = { ...s, wm, hm: Math.max(1, s.rows) * kabinH, xm: _xm }
    _xm += wm
    return p
  })
  const tasarimWm = parcalar.reduce((tp, s) => tp + s.wm, 0)
  const tasarimHm = Math.max(...parcalar.map((s) => s.hm))

  /* ------------------------------------------------------------- kamera */

  useEffect(() => {
    if (!open) return
    let iptal = false
    ;(async () => {
      try {
        const akis = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
          audio: false,
        })
        if (iptal) {
          akis.getTracks().forEach((iz) => iz.stop())
          return
        }
        akisRef.current = akis
        if (videoRef.current) {
          videoRef.current.srcObject = akis
          await videoRef.current.play().catch(() => {})
        }
      } catch {
        if (!iptal) setHata(t('fit.errCamera'))
      }
    })()
    return () => {
      iptal = true
      akisRef.current?.getTracks().forEach((iz) => iz.stop())
      akisRef.current = null
    }
  }, [open, t])

  // Görüntü alanı ölçüsü; taslak ilk açılışta ortada ve kadrajın yarısı kadar.
  useEffect(() => {
    if (!open || !kapRef.current) return
    const el = kapRef.current
    const olc = () => {
      const r = el.getBoundingClientRect()
      setKutu({ w: r.width, h: r.height })
      setMerkez((m) => (m.x === 0 && m.y === 0 ? { x: r.width / 2, y: r.height / 2 } : m))
      setPxPerM((p) => (p === 0 ? Math.max(EN_KUCUK, Math.min(EN_BUYUK, (r.width * 0.55) / tasarimWm)) : p))
    }
    olc()
    const go = new ResizeObserver(olc)
    go.observe(el)
    return () => go.disconnect()
  }, [open, tasarimWm])

  // Pencere kapanınca her şey sıfırlansın (yeniden açılışta eski kare kalmasın)
  useEffect(() => {
    if (open) return
    setSonuc(null)
    setHata(null)
    setPxPerM(0)
    setMerkez({ x: 0, y: 0 })
    setBulunan(null)
    otoDenendiRef.current = false
  }, [open])

  /*
   * Kamera görüntüsü akmaya başlayınca BİR KEZ kendiliğinden taranır:
   * kullanıcı hiçbir şeye dokunmadan bir öneri görsün. Sessiz yapılıyor —
   * uygun yer bulunamazsa kimseyi uyarmaya gerek yok, taslak ortada durur.
   */
  useEffect(() => {
    if (!open || hata || !(kutu.w > 0) || otoDenendiRef.current) return
    const v = videoRef.current
    if (!v) return
    let zaman = null
    const dene = () => {
      if (otoDenendiRef.current) return
      if (!v.videoWidth) {
        zaman = setTimeout(dene, 400)
        return
      }
      otoDenendiRef.current = true
      otomatikYerlestir(true)
    }
    zaman = setTimeout(dene, 600)
    return () => clearTimeout(zaman)
    // otomatikYerlestir her render'da yenilenir; bağımlılığa almak taramayı
    // tekrarlatır. Tek seferlik olması otoDenendiRef ile güvence altında.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hata, kutu.w])

  useEffect(() => {
    if (!bildirim) return
    const z = setTimeout(() => setBildirim(null), 2600)
    return () => clearTimeout(z)
  }, [bildirim])

  /* -------------------------------------------------------------- jestler */

  const parmakIndi = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    parmaklarRef.current.set(e.pointerId, e)
    const p = [...parmaklarRef.current.values()]
    baslangicRef.current =
      p.length >= 2
        ? { tur: 'olcek', uzaklik: uzaklik(p[0], p[1]), pxPerM }
        : { tur: 'tasi', x: e.clientX, y: e.clientY, merkez }
  }

  const parmakHareket = (e) => {
    if (!parmaklarRef.current.has(e.pointerId)) return
    parmaklarRef.current.set(e.pointerId, e)
    const b = baslangicRef.current
    if (!b) return
    const p = [...parmaklarRef.current.values()]

    if (b.tur === 'olcek' && p.length >= 2) {
      const oran = uzaklik(p[0], p[1]) / (b.uzaklik || 1)
      setPxPerM(Math.max(EN_KUCUK, Math.min(EN_BUYUK, b.pxPerM * oran)))
      return
    }
    if (b.tur === 'tasi') {
      setMerkez({ x: b.merkez.x + (e.clientX - b.x), y: b.merkez.y + (e.clientY - b.y) })
    }
  }

  const parmakKalkti = (e) => {
    parmaklarRef.current.delete(e.pointerId)
    if (parmaklarRef.current.size === 0) baslangicRef.current = null
    else {
      const p = [...parmaklarRef.current.values()]
      baslangicRef.current =
        p.length >= 2
          ? { tur: 'olcek', uzaklik: uzaklik(p[0], p[1]), pxPerM }
          : { tur: 'tasi', x: p[0].clientX, y: p[0].clientY, merkez }
    }
  }

  /* -------------------------------------------------------------- çekim */

  const w = tasarimWm * pxPerM
  const h = tasarimHm * pxPerM
  const sol = merkez.x - w / 2
  const ust = merkez.y - h / 2

  /*
   * İZLEME MESAFESİ REHBERİ.
   *
   * İki sayı karşılaştırılıyor:
   *   • önerilen : bu ekranın rahat izlenebileceği mesafe (piksel aralığı ve
   *                ekran köşegeninden; Teknik Özellikler'dekiyle aynı hesap)
   *   • şimdiki  : taslak kadrajın bu kadarını kaplıyorsa, gerçekte hangi
   *                uzaklıktan bakmaya denk gelir
   * Aradaki fark kullanıcıya yön olarak söyleniyor: uzaklaşın / yaklaşın.
   */
  const onerilenM = model ? viewingDistanceFor(model, cols, rows) : null
  const simdikiM = kutu.w > 0 ? denkUzaklik(tasarimWm, w / kutu.w) : null
  const sigmiyor = kutu.w > 0 && (w > kutu.w || h > kutu.h)
  const oran = onerilenM && simdikiM ? simdikiM / onerilenM : null
  const yonerge = sigmiyor
    ? t('fit.tooBig')
    : oran === null
      ? null
      : oran < 0.8
        ? t('fit.goBack')
        : oran > 1.25
          ? t('fit.comeCloser')
          : t('fit.goodDistance')
  const yonergeIyi = !sigmiyor && oran !== null && oran >= 0.8 && oran <= 1.25

  /**
   * OTOMATİK YERLEŞTİRME.
   *
   * Kameranın o anki karesi taranır (bkz. duvarBul.js), tasarımın en/boy
   * oranına uyan en düz ve boş alan bulunur, taslak oraya taşınır.
   *
   * Kare, ekranda görünen KIRPILMIŞ hâliyle taranıyor (object-fit: cover);
   * böylece bulunan dikdörtgenin oranlı koordinatları doğrudan ekran
   * koordinatına çevrilebiliyor, arada kayma olmuyor.
   *
   * Boyut, bulunan alanı aşmaz ve önerilen izleme mesafesinden daha yakın
   * görünecek kadar da büyümez — ikisinin küçüğü alınır.
   */
  const otomatikYerlestir = async (sessiz = false) => {
    const v = videoRef.current
    if (!v?.videoWidth || !(kutu.w > 0) || taraniyor) return
    setTaraniyor(true)
    try {
      const W = Math.round(kutu.w)
      const H = Math.round(kutu.h)
      const c = document.createElement('canvas')
      c.width = W
      c.height = H
      const g = c.getContext('2d')
      const oranV = v.videoWidth / v.videoHeight
      const oranK = W / H
      let sw, sh, sx, sy
      if (oranV > oranK) {
        sh = v.videoHeight
        sw = sh * oranK
        sx = (v.videoWidth - sw) / 2
        sy = 0
      } else {
        sw = v.videoWidth
        sh = sw / oranK
        sx = 0
        sy = (v.videoHeight - sh) / 2
      }
      g.drawImage(v, sx, sy, sw, sh, 0, 0, W, H)

      const yer = uygunYuzeyBul(c, tasarimWm / tasarimHm)
      if (!yer) {
        setBulunan(null)
        if (!sessiz) setBildirim(t('fit.autoNone'))
        return
      }

      const alanW = yer.w * W
      // Önerilen mesafedeki genişlik: bundan büyüğü ekranı olduğundan yakın gösterir.
      const onerilenW = onerilenM
        ? W * (Math.tan(Math.atan(tasarimWm / 2 / onerilenM)) / Math.tan((KAMERA_ACISI * Math.PI) / 360))
        : alanW
      const hedefW = Math.min(alanW, onerilenW || alanW)

      setPxPerM(Math.max(EN_KUCUK, Math.min(EN_BUYUK, hedefW / tasarimWm)))
      setMerkez({ x: (yer.x + yer.w / 2) * W, y: (yer.y + yer.h / 2) * H })
      setBulunan({ x: yer.x * W, y: yer.y * H, w: yer.w * W, h: yer.h * H })
      if (!sessiz) setBildirim(t('fit.autoDone'))
    } catch {
      setBulunan(null)
      if (!sessiz) setBildirim(t('fit.autoNone'))
    } finally {
      setTaraniyor(false)
    }
  }

  /** Taslağı, önerilen mesafeden görünecek büyüklüğe ayarlar. */
  const onerilenMesafeyeAyarla = () => {
    if (!onerilenM || !(kutu.w > 0)) return
    // denkUzaklik'in tersi: bu uzaklıkta ekran kadrajın ne kadarını kaplar?
    const yariAci = Math.atan(tasarimWm / 2 / onerilenM)
    const kaplama = Math.tan(yariAci) / Math.tan((KAMERA_ACISI * Math.PI) / 360)
    const yeni = (kutu.w * kaplama) / tasarimWm
    setPxPerM(Math.max(EN_KUCUK, Math.min(EN_BUYUK, yeni)))
  }

  /**
   * Kamera karesini ve tasarımı tek görüntüde birleştirir.
   * Tasarım ekranda saydam duruyor; yalnızca html2canvas'ın KOPYASI görünür
   * yapılıyor, böylece taslak akışı bozulmadan gerçek görüntü elde ediliyor.
   */
  const cek = async () => {
    const v = videoRef.current
    const kap = kapRef.current
    if (!v?.videoWidth || !kap || mesgul) return
    setMesgul(true)
    try {
      const W = Math.round(kap.clientWidth)
      const H = Math.round(kap.clientHeight)
      const c = document.createElement('canvas')
      c.width = W
      c.height = H
      const g = c.getContext('2d')

      // object-fit: cover — ekranda görünen kadarı alınır
      const oranV = v.videoWidth / v.videoHeight
      const oranK = W / H
      let sw, sh, sx, sy
      if (oranV > oranK) {
        sh = v.videoHeight
        sw = sh * oranK
        sx = (v.videoWidth - sw) / 2
        sy = 0
      } else {
        sw = v.videoWidth
        sh = sw / oranK
        sx = 0
        sy = (v.videoHeight - sh) / 2
      }
      g.drawImage(v, sx, sy, sw, sh, 0, 0, W, H)

      const el = tasarimRef.current
      if (el) {
        const k = await html2canvas(el, {
          backgroundColor: null,
          scale: 2,
          logging: false,
          useCORS: true,
          onclone: (_b, kopya) => {
            kopya.style.opacity = '1'
            kopya.style.visibility = 'visible'
          },
        })
        g.drawImage(k, sol, ust, w, h)
      }

      setSonuc(c.toDataURL('image/jpeg', 0.92))
    } catch {
      setHata(t('fit.errShot'))
    } finally {
      setMesgul(false)
    }
  }

  /** Kareyi cihaza indirir ve rapora bildirir. */
  const kaydet = async () => {
    if (!sonuc) return
    onSaved?.(sonuc, 'kamera')
    try {
      const yanit = await fetch(sonuc)
      const veri = await yanit.blob()
      const url = URL.createObjectURL(veri)
      const a = document.createElement('a')
      a.href = url
      a.download = `ekran-${Date.now()}.jpg`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      setBildirim(t('fit.saved'))
    } catch {
      setBildirim(t('fit.saveFailed'))
    }
  }

  if (!open) return null

  /* ------------------------------------------------------- tasarım çizimi */

  const yerlesim = parcalar.map((s) => ({ ...s, wPx: s.wm * pxPerM, hPx: s.hm * pxPerM, xStart: s.xm * pxPerM }))
  const sekilUygun = yerlesim.every((s) => (s.type || 'flat') === 'flat' || (s.type || 'flat') === 'lshape')
  const ortakIcerik = yerlesim.every((s) => !s.content)
  const seritGorsel = content !== 'none' ? contentImage(content, contentUrl) : null
  const seritVideo = content !== 'none' ? videoSrcFor(content, contentUrl) : null
  const tekKatman = sekilUygun && ortakIcerik && !!(seritGorsel || seritVideo)
  const seritYayin = content !== 'none' && content !== 'led'
  const maskePolygon = tekKatman ? seritMaskePolygon(yerlesim, h) : undefined

  const kose = 'absolute w-7 h-7 border-white'

  return (
    <div className="fixed inset-0 z-[60] bg-black select-none" style={{ touchAction: 'none' }}>
      <div ref={kapRef} className="absolute inset-0 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />

        {hata && (
          <div className="absolute inset-0 flex items-center justify-center p-8 bg-[#10141b]">
            <div className="max-w-sm text-center">
              <p className="text-neutral-200 text-sm leading-relaxed m-0">{hata}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 rounded-full px-6 py-2.5 text-sm font-semibold bg-brand text-white"
              >
                {t('fit.close')}
              </button>
            </div>
          </div>
        )}

        {/*
          TASARIM — ekranda saydam durur, yalnızca çekilen karede görünür.
          Taslak aşamasında görünmemesi ÖZELLİKLE isteniyor: önce ne kadar yer
          kaplayacağı çerçeveden anlaşılsın, tasarım sonra otursun.
        */}
        {!hata && kutu.w > 0 && (
          <div
            ref={tasarimRef}
            aria-hidden
            style={{ position: 'absolute', left: sol, top: ust, width: w, height: h, opacity: 0, pointerEvents: 'none' }}
          >
            <div style={{ position: 'absolute', inset: 0 }}>
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
                    spanW={tekKatman ? w : undefined}
                    spanH={tekKatman ? h : undefined}
                    offsetX={tekKatman ? -s.xStart : 0}
                    offsetY={0}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/*
          BULUNAN YÜZEY. Otomatik yerleştirmenin seçtiği alan soluk bir
          dikdörtgenle gösteriliyor: kullanıcı önerinin nereye dayandığını
          görüyor, beğenmezse taslağı elle taşımaya devam ediyor.
        */}
        {!hata && !sonuc && bulunan && (
          <div
            className="absolute border border-emerald-300/60 bg-emerald-300/10 pointer-events-none rounded-sm"
            style={{ left: bulunan.x, top: bulunan.y, width: bulunan.w, height: bulunan.h }}
          />
        )}

        {/* TASLAK — ölçülere göre çizilmiş boş çerçeve */}
        {!hata && !sonuc && kutu.w > 0 && (
          <div
            className="absolute"
            style={{ left: sol, top: ust, width: w, height: h, touchAction: 'none', cursor: 'move' }}
            onPointerDown={parmakIndi}
            onPointerMove={parmakHareket}
            onPointerUp={parmakKalkti}
            onPointerCancel={parmakKalkti}
          >
            <div className="absolute inset-0 border-2 border-dashed border-white/85 bg-white/5" />
            {/* Köşe işaretleri: çerçeve kamera görüntüsünün üstünde okunur kalsın */}
            <div className={`${kose} left-0 top-0 border-l-4 border-t-4`} />
            <div className={`${kose} right-0 top-0 border-r-4 border-t-4`} />
            <div className={`${kose} left-0 bottom-0 border-l-4 border-b-4`} />
            <div className={`${kose} right-0 bottom-0 border-r-4 border-b-4`} />

            {/* Gerçek ölçüler */}
            <span className="absolute left-1/2 -translate-x-1/2 -top-7 rounded-lg bg-brand text-white text-[12px] font-semibold px-2 py-0.5 whitespace-nowrap">
              {metre(tasarimWm)}
            </span>
            <span className="absolute top-1/2 -translate-y-1/2 -right-2 translate-x-full rounded-lg bg-brand text-white text-[12px] font-semibold px-2 py-0.5 whitespace-nowrap">
              {metre(tasarimHm)}
            </span>
          </div>
        )}

        {/* ÇEKİLEN KARE */}
        {sonuc && <img src={sonuc} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      </div>

      {/* ÜST BAR */}
      <div className="absolute top-0 inset-x-0 z-40 flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
        <button type="button" onClick={onClose} aria-label={t('fit.close')} className="text-white/90 hover:text-white p-1">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <span className="text-white text-[13px] font-semibold">{t('fit.title')}</span>
      </div>

      {/* YÖNERGE + İZLEME MESAFESİ */}
      {!hata && !sonuc && (
        <div className="absolute top-14 inset-x-0 z-40 px-6 flex flex-col items-center gap-2">
          <p className="text-center text-white/85 text-[12.5px] m-0">{t('fit.hint')}</p>

          {onerilenM && (
            <div className="rounded-xl bg-black/70 backdrop-blur px-3.5 py-2 max-w-[320px] w-full">
              {yonerge && (
                <p
                  className={`m-0 text-[13px] font-semibold text-center ${
                    sigmiyor ? 'text-amber-300' : yonergeIyi ? 'text-emerald-300' : 'text-white'
                  }`}
                >
                  {yonerge}
                </p>
              )}
              <p className="m-0 mt-1 text-white/75 text-[11.5px] text-center tabular-nums">
                {t('fit.viewDist')}: <b className="text-white">{metre(onerilenM)}</b>
                {simdikiM ? ` · ${t('fit.asSeenFrom')} ${metre(simdikiM)}` : ''}
              </p>
              <p className="m-0 mt-0.5 text-white/45 text-[10px] text-center">{t('fit.distNote')}</p>
              <div className="mt-1.5 flex gap-1.5">
                <button
                  type="button"
                  onClick={onerilenMesafeyeAyarla}
                  className="flex-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11.5px] font-semibold py-1.5 transition-colors"
                >
                  {t('fit.snap')}
                </button>
                <button
                  type="button"
                  onClick={() => otomatikYerlestir(false)}
                  disabled={taraniyor}
                  className="flex-1 rounded-lg bg-brand hover:bg-brand-dark text-white text-[11.5px] font-semibold py-1.5 transition-colors disabled:opacity-60"
                >
                  {taraniyor ? t('fit.scanning') : t('fit.auto')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {bildirim && (
        <div className="absolute top-24 inset-x-0 z-50 flex justify-center px-6 pointer-events-none">
          <span className="rounded-full bg-black/80 text-white text-[12.5px] font-semibold px-4 py-2">{bildirim}</span>
        </div>
      )}

      {/* ALT ÇUBUK */}
      <div className="absolute bottom-0 inset-x-0 z-40 pb-7 pt-4 bg-gradient-to-t from-black/75 to-transparent">
        {sonuc ? (
          <div className="flex items-center justify-center gap-3 px-6">
            <button
              type="button"
              onClick={() => setSonuc(null)}
              className="rounded-full border border-white/45 text-white text-[13px] font-semibold px-5 py-2.5"
            >
              {t('fit.again')}
            </button>
            <button
              type="button"
              onClick={kaydet}
              className="rounded-full bg-white text-[#10141b] text-[13px] font-semibold px-6 py-2.5"
            >
              {t('fit.save')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={cek}
              disabled={mesgul}
              aria-label={t('fit.shoot')}
              className="w-[70px] h-[70px] rounded-full bg-white border-4 border-white/45 disabled:opacity-60 active:scale-95 transition-transform"
            />
            <span className="text-white/75 text-[11.5px]">{mesgul ? t('fit.working') : t('fit.shootHint')}</span>
          </div>
        )}
      </div>
    </div>
  )
}
