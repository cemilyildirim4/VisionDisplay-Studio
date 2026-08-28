import { useState, useEffect, useLayoutEffect, useMemo, useRef, Suspense } from 'react'
import { guvenliLazy } from './guvenliLazy.js'
import ModelSelectModal from './ModelSelectModal.jsx'
import RecommendationWizard from './RecommendationWizard.jsx'
import MultiScreenModal from './MultiScreenModal.jsx'
import ExportModal from './ExportModal.jsx'
import WallPreview from './WallPreview.jsx'
import SpecsSection from './SpecsSection.jsx'
import Oturtma from './Oturtma.jsx'
import { computeSpecs, fmt } from './specsData.js'
import ContactModal from './ContactModal.jsx'
import PrivacyModal from './PrivacyModal.jsx'
import { BrandMark, BrandStripe } from './BrandChrome.jsx'
import ProductTypeBadge from './ProductTypeBadge.jsx'
import ProfileMenu from './ProfileMenu.jsx'
import ChatHelp from './ChatHelp.jsx'
import Scene, { PANO_ID, SALON_ID, CEPHE_ID } from './Scene.jsx'
import { salonOlcek } from './Salon.jsx'
import { cepheOlcek } from './Cephe.jsx'
// SAHNELER (fotoğraflı mekânlar) şu an listede yok; sahneBul yine de gerekli
// çünkü kayıtlı bir mekân geri açılırsa ölçek hesabı ondan çıkıyor.
import {
  sahneBul,
  fotoYerlesim,
  EN_AZ_YAKINLIK,
  zeminOturmaKaymasi,
  oneriYatayKaymasi,
  oneriDikeyKaymasi,
} from './sahneler.js'
import {
  ozelMekanKaydi,
  MEKAN_TURLERI,
  MEKAN_EN_COK_MB,
  VARSAYILAN_MESAFE_M,
  kadrajGenisligi,
} from './ozelMekan.js'
import { SINIF_ADLARI } from './nesneBul.js'
import KoseSecici from './KoseSecici.jsx'
import AdaySecici from './AdaySecici.jsx'
import { icDortgen } from './homografi.js'
import { viewingDistanceFor } from './viewingDistance.js'
import { useSurukleme, kaymayiSinirla } from './hooks/useSurukleme.js'
import { useYon } from './hooks/useYon.js'
import { panoOlculeri, PANO_SAHNE_EN_M } from './Pano.jsx'
import ArView from './ArView.jsx'
// three.js/react-three-fiber/drei/model-viewer tek başına ~1.8 MB — ana pakete
// gömülürse ilk yükleme herkes için ağırlaşır. Bu yüzden "3D Görünüm" düğmesine
// basılana kadar hiç indirilmez (kod bölme / code-splitting).
const Scene3D = guvenliLazy(() => import('./Scene3D.jsx'))
import { DEFAULT_CONTENT_SRC, LED_GRADIENT, ledDotsStyle, curveArcDegrees, L_KIRILMA_PCT, curveDepthFor, IMAGE_MAX_MB } from './content.js'
import { LANGUAGES } from './i18n.js'
import { useAcilirKonum } from './hooks/useAcilirKonum.js'
import { SAMPLE_VIDEO_SRC, VIDEO_TYPES, VIDEO_MAX_MB } from './videoContent.js'
import { useLang } from './useLang.js'
import { useCabinets } from './hooks/useCabinets.js'
import {
  taslakOlustur,
  taslagiYaz,
  taslagiOku,
  taslagiSil,
  sayfaYenilendi,
  duzenlemeyiAl,
} from './tasarimTaslagi.js'

// API kapalıyken de akış çalışsın diye örnek (generic) demo veri.
// Kullanıcı kendi ürünleriyle değiştirecek.
const SAMPLE_CABINETS = [
  // Kabin standardı: 320 × 160 × 100 mm (alan 0,0512 m²).
  // Pitch'ler 320/160'ı TAM bölecek şekilde seçildi → piksel sayıları tam sayı.
  // Ağırlık ~31 kg/m², maks. güç ~625 W/m² (iç mekan LED için gerçekçi aralık).
  {
    id: 1,
    category: 'led',
    productType: 'CABINET',
    modelCode: 'DEMO-P1.25',
    series: { name: 'LED İç Mekan (Duvar)' },
    pixelPitchMm: 1.25,
    widthMm: 320,
    heightMm: 160,
    depthMm: 100,
    weightKg: 1.6,
    pixelWidth: 256, // 320 / 1,25
    pixelHeight: 128, // 160 / 1,25
    brightnessNits: 800,
    usage: 'Ticari İç Mekan',
    ipRating: 30,
    featured: true,
    refreshRateHz: 3840,
    powerTypicalWatts: 11,
    powerMaxWatts: 32,
    viewingDistanceM: 3.1,
  },
  {
    id: 2,
    category: 'led',
    productType: 'MODULE',
    modelCode: 'DEMO-PANEL-INDOOR',
    series: { name: 'Indoor Panel' },
    pixelPitchMm: 1.6,
    widthMm: 320,
    heightMm: 160,
    depthMm: 100,
    weightKg: 1.6,
    pixelWidth: 200, // 320 / 1,6
    pixelHeight: 100, // 160 / 1,6
    brightnessNits: 700,
    usage: 'Ticari İç Mekan',
    ipRating: 30,
    refreshRateHz: 3840,
    powerTypicalWatts: 10,
    powerMaxWatts: 30,
    viewingDistanceM: 4.0,
  },
  {
    id: 3,
    category: 'led',
    productType: 'MODULE',
    modelCode: 'DEMO-PANEL-OUTDOOR',
    series: { name: 'Outdoor Panel' },
    pixelPitchMm: 2.0,
    widthMm: 320,
    heightMm: 160,
    depthMm: 100,
    weightKg: 1.5,
    pixelWidth: 160, // 320 / 2,0
    pixelHeight: 80, // 160 / 2,0
    brightnessNits: 5500,
    usage: 'Dış Mekan',
    filterCategory: 'Dış Mekan',
    ipRating: 65,
    refreshRateHz: 3840,
    powerTypicalWatts: 9,
    powerMaxWatts: 28,
    viewingDistanceM: 5.0,
  },
  {
    id: 11,
    category: 'videowall',
    productType: 'CABINET',
    modelCode: 'VW-55-088',
    series: { name: 'Video Duvarı' },
    sizeInch: 55,
    bezelMm: 0.88,
    pixelPitchMm: 0.63,
    widthMm: 1210,
    heightMm: 680,
    depthMm: 70,
    weightKg: 22,
    pixelWidth: 1920,
    pixelHeight: 1080,
    brightnessNits: 500,
    usage: 'Ticari İç Mekan',
    ipRating: 20,
    refreshRateHz: 3840,
    powerTypicalWatts: 120,
    powerMaxWatts: 180,
    viewingDistanceM: 3.0,
  },
  {
    id: 12,
    category: 'videowall',
    modelCode: 'VW-55-174',
    series: { name: 'Video Duvarı' },
    sizeInch: 55,
    bezelMm: 1.74,
    pixelPitchMm: 0.63,
    widthMm: 1210,
    heightMm: 680,
    depthMm: 70,
    weightKg: 21,
    pixelWidth: 1920,
    pixelHeight: 1080,
    brightnessNits: 700,
    usage: 'Ticari İç Mekan',
    ipRating: 20,
    refreshRateHz: 3840,
    powerTypicalWatts: 130,
    powerMaxWatts: 190,
    viewingDistanceM: 3.0,
  },
]

/*
 * NOT: API adresi burada tanımlıydı ama bu dosyada hiç kullanılmıyordu —
 * ağ istekleri kendi bileşenlerinde (ControlCenter, ChatHelp, AdminPanel…)
 * yapılıyor ve her biri kendi API_URL'ini okuyor. Kullanılmayan sabit
 * kaldırıldı.
 */

/**
 * İKİ YERLEŞİMİN DE HESABI (yatay ve dikey).
 *
 * "Duvara sığdır" bu hesabı yapıp çok LED olanı uyguluyor. Aynı hesap sol
 * panelde geçici bir bilgi satırı olarak da gösteriliyor; ikisi TEK yerden
 * geliyor ki gösterilen sayı ile uygulanan yerleşim ayrışmasın.
 */
function yerlesimSecenekleri(m, genislikM, yukseklikM) {
  if (!m) return null
  const EPSILON = 1e-9
  const gW = m.widthMm || 500
  const gH = m.heightMm || 500
  const hesapla = (kabinWmm, kabinHmm) => {
    const c = Math.max(1, Math.floor(genislikM / (kabinWmm / 1000) + EPSILON))
    const r = Math.max(1, Math.floor(yukseklikM / (kabinHmm / 1000) + EPSILON))
    // Kabin başına LED = piksel sayısı; dönmekle değişmez, yalnızca yer değiştirir.
    return { cols: c, rows: r, led: c * r * (m.pixelWidth || 0) * (m.pixelHeight || 0) }
  }
  return { yatay: hesapla(gW, gH), dikey: hesapla(gH, gW) }
}

// Tema Root.jsx'te kuruluyor (yönetim ekranı da aynı temayı kullansın diye)
function App({ theme, onToggleTheme: temaDegistir }) {
  const { t, lang, setLang } = useLang()
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)

  // Kabin/model listesi React Query üzerinden cache'lenir (bkz. hooks/useCabinets.js);
  // sekmeler arası geçişte veya modal tekrar açıldığında ağa tekrar istek atılmaz.
  const { data: cabinets = [], isLoading: cabinetsLoading } = useCabinets()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState(null)
  const [screenMode, setScreenMode] = useState('single') // single | multi
  const [screenType, setScreenType] = useState('flat') // flat | curved
  const [orientation, setOrientation] = useState('landscape') // landscape | portrait (video duvarı)
  const [curveAmount, setCurveAmount] = useState(60) // 0..100 — panelde kaydırıcıyla ayarlanır
  const [cols, setCols] = useState(1)
  const [rows, setRows] = useState(1)
  const [multiModalOpen, setMultiModalOpen] = useState(false)
  const [screens, setScreens] = useState([])
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  // Teknik Özellikler pop-up'ı (Bileşenler de içinde)
  const [specsOpen, setSpecsOpen] = useState(false)
  /*
   * KAMERADA OTURT — "Nasıl Görüneceğini Gör"den ayrı bir özellik.
   * Orada tasarım doğrudan kameranın üstünde duruyor; burada önce yalnızca
   * ölçülere göre bir TASLAK çerçeve görünüyor, deklanşöre basılınca tasarım
   * o çerçeveye oturuyor. İkisi birbirine karışmasın diye ayrı pencereler.
   */
  const [oturtmaAcik, setOturtmaAcik] = useState(false)
  const [showMeasurements, setShowMeasurements] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)
  /*
   * KAMERADA KAYDEDİLEN KARE.
   *
   * "Kaydet" cihaza indiriyor; aynı kare burada da tutuluyor ki PDF raporuna
   * "Mekânda Görünüm" sayfası olarak girsin. Yapılandırma değişse bile kare
   * durur — müşteri o kareyi bilerek çekti, sessizce silmek yanlış olur.
   */
  const [arFotolar, setArFotolar] = useState([])

  /*
   * İKİNCİ VE SONRAKİ KARELERDE KULLANICIYA SORULUR.
   *
   * İlk kare doğrudan eklenir — sorulacak bir şey yok. Elde kare varken
   * yenisi gelince kullanıcının niyeti belirsizdir: bazen farklı açılardan
   * birkaç kare toplar, bazen de "bu daha iyi oldu" diye eskisinin yerine
   * koymak ister. Sessizce birini seçmek yerine üç seçenek sunuluyor:
   * hepsi kalsın · yalnızca bu kalsın · bunu ekleme.
   *
   * Sunucu en çok 6 kare basıyor; burada da aynı sınır tutuluyor ki
   * gereksiz büyük istek gönderilmesin. Aynı kare iki kez eklenmez (aynı
   * düğmeye iki kez basmak raporu çoğaltmasın).
   */
  const [kareSorusu, setKareSorusu] = useState(null)

  /*
   * KAMERA VE AR KARELERİ AYRI DEĞERLENDİRİLİR.
   *
   * İkisi aynı torbadaydı: kamerada kare varken AR'de kaydedince "yalnızca
   * bu kalsın" demek kamera karesini de siliyordu. Oysa bunlar birbirinin
   * alternatifi değil — biri mekânın fotoğrafı, öbürü odaya yerleştirilmiş
   * gerçek boyutlu model; rapora ikisi birden girebilmeli.
   *
   * Bu yüzden her kare kaynağıyla saklanıyor ve soru YALNIZCA aynı kaynaktan
   * kare varsa çıkıyor; "yalnızca bu kalsın" da yalnızca aynı kaynağı temizler.
   *
   * Dönen değer: kare rapora GİRDİ mi. Kamera/AR ekranı bildirimini buna
   * göre seçiyor — karar sorulduysa henüz söz verecek bir şey yok.
   */
  const kareKaydedildi = (veri, kaynak = 'kamera') => {
    if (!veri) return false
    if (arFotolar.some((k) => k.veri === veri)) return true
    if (!arFotolar.some((k) => k.kaynak === kaynak)) {
      setArFotolar((l) => [...l, { veri, kaynak }].slice(-6))
      return true
    }
    setKareSorusu({ veri, kaynak })
    return false
  }

  /* Tasarım kimlik değiştirdiğinde (sıfırlama, model değişimi, kayıtlı
     projeye dönüş) kareler ve varsa bekleyen soru birlikte silinir. */
  const kareleriTemizle = () => {
    setArFotolar([])
    setKareSorusu(null)
  }

  /* Soru sorulan kareyle AYNI kaynaktan olanlar — pencere yalnızca bunları
     gösterir ve "yalnızca bu kalsın" yalnızca bunları düşürür. */
  const ayniTurKareler = kareSorusu
    ? arFotolar.filter((k) => k.kaynak === kareSorusu.kaynak)
    : []

  const kareKarariVer = (karar) => {
    const yeni = kareSorusu
    setKareSorusu(null)
    if (!yeni) return
    if (karar === 'hepsi') setArFotolar((l) => [...l, yeni].slice(-6))
    else if (karar === 'yalniz')
      // Yalnızca AYNI kaynaktakiler düşer; öbür türdeki kareler yerinde kalır.
      setArFotolar((l) => [...l.filter((k) => k.kaynak !== yeni.kaynak), yeni].slice(-6))
    // 'ekleme' → rapor olduğu gibi kalır
  }
  /*
   * Ekrana gönderilen SİNYALİN standardı (ekranın kendi çözünürlüğü değil).
   * Önizlemede sinyal bölgelerinin kaç parçaya bölündüğünü belirler, PDF ve
   * kayıtlı tekliflerde de saklanır. Kullanıcıya sunulan FHD/UHD düğmeleri
   * kaldırıldı: o alan artık ekranın gerçek piksel çözünürlüğünü gösteriyor.
   * Değer yalnızca taslak geri yüklenirken ve sıfırlamada değişir.
   */
  const [resolution, setResolution] = useState('FHD')
  const [sboxRedundancy, setSboxRedundancy] = useState('no') // no | yes
  const [hasMiniPc, setHasMiniPc] = useState(false)
  /*
   * Ekranın arkasındaki mekân: 'none' ya da PANO_ID.
   *
   * Bir ara müşterinin KENDİ FOTOĞRAFINI yükleyip tasarımı onun üzerine
   * yerleştirmesi de vardı; kaldırıldı. Fotoğraf yolu ölçeği müşterinin elle
   * oturtmasına bırakıyordu, yani her seferinde tahmin kalıyordu; pano ise
   * tamamen tasarımın gerçek ölçüsünden türüyor ve hiçbir hazırlık istemiyor.
   * Mekânda deneme ihtiyacını da "Kamerada dene" (AR) ekranı karşılıyor.
   */
  const [scene, setScene] = useState('none')
  /*
   * KULLANICININ KENDİ MEKÂN FOTOĞRAFI.
   *
   * Hazır mekânlar sahneler.js'te sabit; bu ise çalışma anında üretiliyor
   * (bkz. ozelMekan.js). Fotoğraf sunucuya gitmiyor, blob adresi olarak
   * tarayıcıda kalıyor — içerik görselinde olduğu gibi.
   */
  const [ozelSahne, setOzelSahne] = useState(null)
  /*
   * FOTOĞRAFIN ÇEKİM MESAFESİ — bütün yerleşimin ölçeği buradan geliyor.
   * Kadrajın kapsadığı genişlik mesafenin ~1,11 katı (bkz. ozelMekan.js).
   */
  const [ozelMesafeM, setOzelMesafeM] = useState(VARSAYILAN_MESAFE_M)
  const [ozelUyari, setOzelUyari] = useState(null)
  /* Model çalışırken kullanıcı beklediğini bilsin — birkaç saniye sürüyor. */
  const [ozelInceleniyor, setOzelInceleniyor] = useState(false)
  /* Modelin fotoğrafta gördükleri — arayüzde adlarıyla yazılıyor. */
  const [ozelNesneler, setOzelNesneler] = useState(null)
  /*
   * HEDEF DÖRTGEN — tasarımın oturacağı yüzeyin dört köşesi.
   *
   * FOTOĞRAFA GÖRE 0–1 oranlı tutuluyor: pencere boyutlandığında ya da
   * telefon yan çevrildiğinde yüzey fotoğrafın neresindeyse orada kalıyor.
   * null ise eski davranış (ortalama + sürükleme) geçerli.
   */
  const [hedefKose, setHedefKose] = useState(null)
  /* Kullanıcı köşeleri elle düzeltiyor mu? */
  const [koseKipi, setKoseKipi] = useState(false)
  /*
   * ADAY KARELER — fotoğrafta yerleştirmeye uygun bulunan yüzeyler.
   * Tek bir tahmine mahkûm kalmamak için hepsi gösteriliyor; kullanıcı
   * birine tıklayınca tasarım oraya oturuyor (bkz. adayYuzeyler.js).
   */
  const [adaylar, setAdaylar] = useState([])
  const [adayKipi, setAdayKipi] = useState(false)
  /* Kiosk ayakları — duvara asılan ekranda ayak olmaz, kapatılabiliyor. */
  /*
   * Kiosk ayagi VARSAYILAN OLARAK YOK. Ekranlarin cogu duvara ya da bir
   * panoya montelidir; ayak isteyen tek dugmeyle ekliyor.
   */
  /*
   * KIOSK TİPİ: duvar | totem | ciftAyak | askili
   * Varsayılan duvara monte — ekranların çoğu öyle kuruluyor ve gövde
   * çizmemek en az varsayım içeren seçenek.
   */
  const [kioskTipi, setKioskTipi] = useState('duvar')
  /*
   * KİOSK GÖVDESİ ÇİZİLSİN Mİ?
   *
   * Ekran kimi zaman doğrudan duvara/panoya monteli gösteriliyor, kimi zaman
   * bir kiosk gövdesiyle. Tip listesi ancak gövde varken anlamlı; kapalıyken
   * gizleniyor ki panel gereksiz seçenekle dolmasın.
   */
  const [kioskVar, setKioskVar] = useState(true)
  /* Yere basan tipler: dikey yerleşimde zemine oturma bunlara uygulanıyor. */
  const ayakVar = kioskTipi !== 'duvar'
  /*
   * İZLEME MESAFESİ — mekânda ekrana kaç metreden bakıldığı.
   *
   * null = kullanıcı dokunmadı; o zaman modelin/tasarımın kendi ÖNERİLEN
   * mesafesi kullanılır (viewingDistance.js — modeldeki değer ya da
   * pitch × 2,5 ile köşegenin büyüğü). Kullanıcı değiştirdiği anda kendi
   * değeri geçerli olur; model veya ölçü değişse bile ona dokunulmaz.
   */
  const [izlemeM, setIzlemeM] = useState(null)
  const ozelDosyaRef = useRef(null)
  const [arAcik, setArAcik] = useState(false)
  const [scene3dOpen, setScene3dOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  /*
   * Ekran, sahne seçiliyse mekânın DUVARI kadar yer kaplar; tuvalin tamamını
   * değil. Bunun için tuvalin canlı ölçüsü gerekiyor — pencere büyüyünce
   * duvarın yeri de değişiyor.
   */
  const tuvalRef = useRef(null)
  const [tuvalBoyut, setTuvalBoyut] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = tuvalRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect
      setTuvalBoyut({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const panoSahne = scene === PANO_ID
  const [cizimOlcek, setCizimOlcek] = useState(null)
  const [content, setContent] = useState('led') // led | photo | sample(video) | video | none | upload
  const [contentUrl, setContentUrl] = useState(null)
  const fileInputRef = useRef(null)
  const videoInputRef = useRef(null)
  // Adım adım akış: 1 Model · 2 Duvar · 3 Ekran · 4 İçerik
  const [chatOpen, setChatOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)

  // API verisi varsa onu, yoksa örnek veriyi kullan
  const displayCabinets = cabinets.length > 0 ? cabinets : SAMPLE_CABINETS

  /*
   * ══════════════ TASARIM TASLAĞI: GERİ TUŞU ve "DÜZENLE" ══════════════
   *
   * İki ayrı ihtiyaç, tek mekanizma (bkz. tasarimTaslagi.js):
   *
   *   • GERİ TUŞU. Telefonda geri tuşuna basıp dönünce sayfa baştan
   *     kuruluyor ve kurulan tasarım kayboluyordu. Taslak her değişiklikte
   *     sessionStorage'a yazılıyor, açılışta geri okunuyor.
   *     SAYFA YENİLENDİĞİNDE ise bilerek sıfırlanıyor — istenen davranış bu.
   *
   *   • "TEKLİFLERİM → DÜZENLE". Kontrol Merkezi teklifin tasarımını bir
   *     kutuya bırakıp konfigüratöre yönlendiriyor; burada alınıp yükleniyor.
   *     Bu, geri tuşu taslağından ÖNCE gelir: kullanıcı açıkça o teklifi
   *     açmak istemiştir.
   */
  const bekleyenTaslakRef = useRef(undefined)
  if (bekleyenTaslakRef.current === undefined) {
    const duzenle = duzenlemeyiAl()
    if (duzenle) {
      bekleyenTaslakRef.current = duzenle
    } else if (sayfaYenilendi()) {
      taslagiSil()
      bekleyenTaslakRef.current = null
    } else {
      bekleyenTaslakRef.current = taslagiOku()
    }
  }
  const [taslakUyari, setTaslakUyari] = useState(null)

  /*
   * Model NESNESİ taslakta durmuyor, yalnızca kodu duruyor: kabin listesi
   * sunucudan geliyor ve fiyat/ölçü gibi alanları değişebilir. Bu yüzden
   * yükleme, liste hazır olana kadar bekler ve modeli GÜNCEL listeden çözer.
   */
  useEffect(() => {
    const t = bekleyenTaslakRef.current
    if (!t) return
    const model =
      displayCabinets.find((m) => m.modelCode && m.modelCode === t.modelCode) ||
      displayCabinets.find((m) => m.id === t.modelId)
    if (!model) {
      // Liste henüz gelmemiş olabilir; gelmiş ve model yoksa taslak ölüdür.
      if (cabinetsLoading) return
      bekleyenTaslakRef.current = null
      taslagiSil()
      setTaslakUyari(t.modelCode ? `${t.modelCode} artık listede yok.` : null)
      return
    }
    bekleyenTaslakRef.current = null

    // Geri yüklenen tasarım BAŞKA bir çalışma: bu oturumda toplanmış kareler
    // ona ait değil.
    kareleriTemizle()
    setSelectedModel(model)
    setWidth(t.width ?? 0)
    setHeight(t.height ?? 0)
    setCols(t.cols ?? 1)
    setRows(t.rows ?? 1)
    setScreenMode(t.screenMode ?? 'single')
    setScreenType(t.screenType ?? 'flat')
    setOrientation(t.orientation ?? 'landscape')
    setCurveAmount(t.curveAmount ?? 60)
    setResolution(t.resolution ?? 'FHD')
    setSboxRedundancy(t.sboxRedundancy ?? 'no')
    setHasMiniPc(Boolean(t.hasMiniPc))
    setScene(t.scene ?? 'none')
    setScreens(Array.isArray(t.screens) ? t.screens : [])
    setContent(t.content ?? 'led')
    // Yüklenen görsel/video geri gelemez (blob adresi ölmüştür) — söyle.
    if (t.icerikDustu) setTaslakUyari('Yüklediğiniz görsel/video geri yüklenemedi; içerik LED yüzeye alındı.')
  }, [displayCabinets, cabinetsLoading])

  /* Tasarım her değiştiğinde taslak tazelenir. */
  useEffect(() => {
    // Geri yükleme sırası gelmemişken yazmak, bekleyen taslağın üstüne boş
    // durum yazıp onu silerdi.
    if (bekleyenTaslakRef.current) return
    taslagiYaz(
      taslakOlustur({
        selectedModel, width, height, cols, rows, screenMode, screenType,
        orientation, curveAmount, resolution, sboxRedundancy, hasMiniPc, scene, screens, content,
      }),
    )
  }, [selectedModel, width, height, cols, rows, screenMode, screenType,
      orientation, curveAmount, resolution, sboxRedundancy, hasMiniPc, scene, screens, content])

  const handleChoose = (model) => {
    // Başka bir modele geçmek, tasarımı baştan kurmak demek: eldeki kareler
    // artık gösterilmeyen bir ürünün fotoğrafı. Aynı model yeniden seçilirse
    // kareler durur (yanlışlıkla aynı satıra tıklamak çalışmayı silmesin).
    if (model?.id !== selectedModel?.id) kareleriTemizle()
    setSelectedModel(model)
    setWidth((w) => w || 1)
    setHeight((h) => h || 1)
    // Ekran her zaman TEK kabinle (standart 320 × 160 × 100 mm) açılır.
    // Model değiştirilse bile önceki sütun/satır sayısı taşınmaz.
    setCols(1)
    setRows(1)
  }

  /*
   * Video Yükle: bilgisayardan video seç.
   *
   * Görselden farkı: base64'e çevrilmez. Video dosyaları büyük olduğu için
   * base64 hem belleği şişirir hem yavaştır; bunun yerine tarayıcıda geçici
   * bir blob adresi üretilir. Eski adres, bellekte kalmasın diye serbest bırakılır.
   */
  const handleVideoFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // aynı dosya tekrar seçilebilsin
    if (!file) return
    if (!VIDEO_TYPES.includes(file.type)) {
      alert(t('content.errVideoFormat'))
      return
    }
    if (file.size > VIDEO_MAX_MB * 1024 * 1024) {
      alert(t('content.errVideoSize'))
      return
    }
    if (contentUrl?.startsWith('blob:')) URL.revokeObjectURL(contentUrl)
    setContentUrl(URL.createObjectURL(file))
    setContent('video')
  }

  // Resim Yükle: bilgisayardan görsel seç
  const handleFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // aynı dosya tekrar seçilebilsin
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert(t('content.errFormat'))
      return
    }
    if (file.size > IMAGE_MAX_MB * 1024 * 1024) {
      alert(t('content.errSize'))
      return
    }
    /*
     * Blob adresi, base64 değil.
     *
     * Eskiden dosya FileReader ile data URL'e çevriliyordu; base64 dosyayı
     * ~%37 büyütür ve tamamı bir dize olarak React durumunda tutulur. 3 MB'da
     * bunun bedeli görünmezdi, 60 MB'da sekmeyi zorlar. Blob adresi ise yalnızca
     * bir işaretçi; dosya diskte kalır, tarayıcı gerektiği kadarını okur.
     * Video zaten böyle çalışıyordu, görsel de artık aynı yolu kullanıyor.
     */
    if (contentUrl?.startsWith('blob:')) URL.revokeObjectURL(contentUrl)
    setContentUrl(URL.createObjectURL(file))
    setContent('upload')
  }

  /*
   * MEKÂN FOTOĞRAFI SEÇİLDİ.
   *
   * Görsel yüklendikten sonra yüzey bulucu çalışıyor ve ekranın oturacağı
   * yer öneriliyor (bkz. ozelMekan.js). Kullanıcı beğenmezse sürükleyerek
   * taşıyabiliyor; ölçek de "bu alan kaç metre" ile elinde.
   */
  const mekanFotoSecildi = (e) => {
    const dosya = e.target.files?.[0]
    e.target.value = ''
    if (!dosya) return
    if (!MEKAN_TURLERI.includes(dosya.type)) {
      alert(t('scene.customErr'))
      return
    }
    if (dosya.size > MEKAN_EN_COK_MB * 1024 * 1024) {
      alert(t('content.errSize'))
      return
    }
    const url = URL.createObjectURL(dosya)
    const gorsel = new Image()
    gorsel.onload = async () => {
      setOzelInceleniyor(true)
      setOzelUyari(null)
      let kayit = null
      try {
        kayit = await ozelMekanKaydi(url, gorsel, tasarimWm / tasarimHm, ozelMesafeM)
      } finally {
        setOzelInceleniyor(false)
      }
      if (!kayit) return
      // Önceki fotoğrafın adresi bellekte kalmasın
      setOzelSahne((eski) => {
        if (eski?.dosya?.startsWith('blob:')) URL.revokeObjectURL(eski.dosya)
        return kayit
      })
      setScene('ozel')
      mekaniOrtala()
      oneriyiUygula(kayit)
    }
    gorsel.src = url
  }

  /*
   * ÖNERİYİ UYGULA — yer ve açı birlikte.
   *
   * Yer, düz ve boş bir alan arayan yüzey bulucudan geliyor (duvarBul.js);
   * açı ise fotoğrafın kaçış noktasından ölçülüyor (aciBul.js). İkisi ayrı
   * ölçüm: biri 'nereye', öteki 'hangi açıyla'. Güven düşükse ekran
   * karşıdan konuyor ve kullanıcıya söyleniyor — yanlış bir açıyla
   * çevirmektense düz bırakmak daha dürüst.
   */
  const ACI_ESIGI = 0.45
  const oneriyiUygula = (kayit) => {
    const aci = kayit?.aci
    const saglam = aci && aci.guven >= ACI_ESIGI && (Math.abs(aci.yaw) > 1.5 || Math.abs(aci.tilt) > 1.5)
    yonuAyarla(saglam ? aci : null)

    /*
     * Modelin gördükleri kullanıcıya yazılıyor. Sebebi şu: yerleştirme
     * artık bir kara kutu değil — 'sandalye, masa gördüm' diyorsa neden
     * oraya koymadığı anlaşılıyor; hiçbir şey görmediyse de bunu bilmek
     * kullanıcının işine yarıyor.
     */
    /*
     * AYAK KARARINI ARTIK UYGULAMA VERMİYOR.
     *
     * Bir ara önerilen alanın zemine uzaklığına bakıp ayakları kendiliğinden
     * açıp kapatıyordum. Kaldırıldı: ayak varsayılan olarak yok, isteyen tek
     * düğmeyle ekliyor. Ekranların çoğu duvara ya da bir panoya monteli
     * olduğu için doğru varsayılan bu.
     */

    /*
     * YÜZEY BULUNDUYSA HEDEF ODUR.
     *
     * Skor eşikleri: 75 üstü kendiliğinden uygulanıyor, 60–74 arası
     * uygulanıyor ama kullanıcıya "elle düzeltebilirsiniz" deniyor,
     * altındaysa hiç dokunulmuyor — yanlış bir yüzeye yapıştırmaktansa
     * ekranı ortada bırakmak ve manuel seçimi önermek doğru.
     */
    const bulunan = Array.isArray(kayit?.adaylar) ? kayit.adaylar : []
    setAdaylar(bulunan)
    /* Birden çok seçenek varsa kareler açılıyor: seçim kullanıcının. */
    setAdayKipi(bulunan.length > 1)

    const yuzey = kayit?.yuzey
    if (yuzey) {
      setHedefKose(yuzey.koseler)
      setKoseKipi(false)
    } else {
      /*
       * EKRAN YÜZEYİ BULUNAMADIYSA: önerilen yere koy, MANUEL KİPİ AÇMA.
       *
       * Bir ara burada manuel dört köşe kipini kendiliğinden açıyordum; ekran
       * tanınmayan her fotoğrafta düğmeye basmak dört tutamak çıkarıyordu ve
       * düğme işini yapmamış oluyordu. Düğmenin sözü "önerilen yere koy" —
       * bir şey yapmalı. Bu durumda kamera oturtmadaki gibi en uygun alana
       * konuyor; köşeleri düzeltmek isteyen ayrı düğmeyle manuel kipe geçiyor.
       */
      /*
       * ADAY VARSA EN İYİSİNE OTUR.
       *
       * Yüzey bulunamadığında tasarımı kadrajın ortasında bırakıyordum;
       * ekran hiçbir şeyin üstünde durmuyor, havada asılı görünüyordu.
       * Artık en yüksek puanlı aday kareye oturuyor — kullanıcı isterse
       * diğer karelerden birine tıklayıp taşıyor.
       */
      setHedefKose(bulunan[0]?.koseler || null)
      setKoseKipi(false)
    }

    const sayim = kayit?.nesneSayimi
    if (sayim) {
      const toplam = Object.values(sayim).reduce((a, b) => a + b, 0) || 1
      const adlar = Object.entries(sayim)
        .filter(([c, n]) => SINIF_ADLARI[c] && n / toplam > 0.004)
        .sort((a, b) => b[1] - a[1])
        .map(([c]) => SINIF_ADLARI[c])
      setOzelNesneler(adlar.length ? adlar : null)
    } else {
      setOzelNesneler(null)
    }
    setOzelUyari(yuzey ? t('scene.screenSurface') : t('scene.noSurface'))
  }

  /* Öneriyi tazele: ölçü ya da alan genişliği değişmiş olabilir. */
  const oneriyiTazele = (alanM = ozelMesafeM) => {
    if (!ozelSahne) return
    const gorsel = new Image()
    gorsel.onload = async () => {
      setOzelInceleniyor(true)
      let kayit = null
      try {
        kayit = await ozelMekanKaydi(ozelSahne.dosya, gorsel, tasarimWm / tasarimHm, alanM)
      } finally {
        setOzelInceleniyor(false)
      }
      if (kayit) setOzelSahne(kayit)
      mekaniOrtala()
      if (kayit) oneriyiUygula(kayit)
    }
    gorsel.src = ozelSahne.dosya
  }

  // Üst buton: tüm tasarımı ve modeli sıfırla
  const resetAll = () => {
    setSelectedModel(null)
    setWidth(0)
    setHeight(0)
    setCols(1)
    setRows(1)
    setScreenType('flat')
    setOrientation('landscape')
    setCurveAmount(60)
    setResolution('FHD')
    setSboxRedundancy('no')
    setHasMiniPc(false)
    setContent('led')
    if (contentUrl?.startsWith('blob:')) URL.revokeObjectURL(contentUrl)
    setContentUrl(null)
    setScreenMode('single')
    setScreens([])
    setShowMeasurements(true)
    setResetConfirmOpen(false)
    setScene('none')
    /*
     * MEKÂN KARELERİ DE SİLİNİR.
     *
     * Kareler eski tasarımın fotoğrafı. Sıfırlayıp bambaşka bir ekran
     * kurduktan sonra rapora hâlâ önceki tasarımın kamera görüntüsü
     * giriyordu — müşteriye yanlış ürünün fotoğrafı gitmesi demek bu.
     */
    kareleriTemizle()
    // Sıfırlama kalıcı olmalı: taslak durursa geri tuşuyla eski tasarım döner.
    taslagiSil()
  }

  /*
   * DUVARA SIĞDIR — İKİ YERLEŞİMİ DE HESAPLAR, ÇOK LED OLANI SEÇER.
   *
   * Aynı duvara kabin yatay ya da dikey dizilebiliyor ve ikisi genellikle
   * aynı sayıda kabin almıyor: 320 × 160 mm'lik bir kabinle 2,00 × 1,00 m
   * duvara yatay 6 × 6 = 36 kabin sığarken, dikey (160 × 320) 12 × 3 = 36
   * çıkar; ölçüler değişince biri açık ara öne geçer. Daha çok kabin, daha
   * çok LED, daha çok piksel demek — müşterinin duvarından alabileceği en
   * yüksek çözünürlük.
   *
   * Bu yüzden düğme her iki yerleşimi de arka planda hesaplıyor ve LED sayısı
   * fazla olanı uyguluyor. Kullanıcı hesabı görmüyor; yalnızca sonucu, yani
   * ekranın o duvardaki en verimli hâlini görüyor. Eşitlikte o anki yerleşim
   * korunuyor — sebepsiz yere ekranı çevirmek şaşırtıcı olurdu.
   */
  const fitToWall = () => {
    const m = selectedModel
    if (!m) {
      setCols(colsMax)
      setRows(rowsMax)
      return
    }

    const { yatay, dikey } = yerlesimSecenekleri(m, width, height)

    const dikeySec = dikey.led > yatay.led || (dikey.led === yatay.led && portrait)
    const kazanan = dikeySec ? dikey : yatay

    setOrientation(dikeySec ? 'portrait' : 'landscape')
    setCols(kazanan.cols)
    setRows(kazanan.rows)
  }

  const hasModel = !!selectedModel
  const category = selectedModel?.category || 'led'
  const isVideoWall = category === 'videowall'
  /*
   * DİKEY YERLEŞİM HER MODELDE — AMA DÜĞMESİ YOK.
   *
   * LED kabin ve paneller de dikey kurulabiliyor (asansör holü, vitrin
   * kolonu, tabela); mekanizma zaten geneldi, yalnızca video duvarına
   * kilitliydi. Kilidi kalktı.
   *
   * Kullanıcıya ayrı bir Yatay/Dikey düğmesi SUNULMUYOR: "Duvara sığdır"
   * iki yerleşimi de hesaplayıp çok LED olanı zaten kendisi seçiyor
   * (bkz. fitToWall). Aynı kararı bir de elle sordurmak gereksiz.
   * Video duvarında Oryantasyon denetimi eskisi gibi duruyor.
   */
  const portrait = orientation === 'portrait'
  // Portre modunda ekran 90° döner: kabin en/boy ve piksel değerleri takas edilir
  const previewModel =
    selectedModel && portrait
      ? {
          ...selectedModel,
          widthMm: selectedModel.heightMm,
          heightMm: selectedModel.widthMm,
          pixelWidth: selectedModel.pixelHeight,
          pixelHeight: selectedModel.pixelWidth,
        }
      : selectedModel

  // Duvar–ekran dengesi: ekran duvardan büyük olamaz (Samsung mantığı)
  // Ekranın gerçek piksel çözünürlüğü (Teknik Özellikler ile aynı kaynak).
  const ekranCozunurlugu = computeSpecs(previewModel, cols, rows)

  const cwM = (previewModel?.widthMm || 500) / 1000
  const chM = (previewModel?.heightMm || 500) / 1000
  // Kabin ölçüsü mm olarak — sütun/satır altındaki hesap satırı için
  const kabinWmm = previewModel?.widthMm || 500
  const kabinHmm = previewModel?.heightMm || 500
  // EPS: 4,8 / 0,32 kayan noktada 14,999... çıkıyor; küçük tolerans olmadan
  // tam sığan son kabin sayılmıyor.
  const EPS = 1e-9
  const colsMax = hasModel ? Math.max(1, Math.floor(width / cwM + EPS)) : 999

  /*
   * PANO ölçeği.
   *
   * EKRAN her zaman tuvalin TAM ORTASINDA çiziliyor (WallPreview böyle
   * çalışıyor ve pano onunla üst üste oturmak zorunda). Panonun direği ve
   * tabanı ekranın epeyce ALTINDA kaldığı için "panonun toplam boyu tuvale
   * sığsın" demek yetmiyor — merkez sabitken aşağı taşan kısım tuvalin
   * yarısını aşabiliyor ve direk kesiliyordu.
   *
   * Bu yüzden SIĞMA ölçeği, ekran merkezinin ÜSTÜNDE ve ALTINDA kalan
   * parçalar ayrı ayrı yarım tuvale sığacak şekilde seçiliyor.
   *
   * Ama tek başına sığma ölçeği yanlış: pano hep tuvali dolduruyor, 2 m'lik
   * tasarımla 10 m'lik tasarım aynı büyüklükte görünüyordu. Arka plandaki
   * manzara sabit ve gerçek ölçüsü belli (PANO_SAHNE_EN_M), o yüzden asıl
   * ölçek GERÇEK METRE: ekran büyüdükçe pano manzaranın üzerinde gerçekten
   * büyüyor. Sığma ölçeği yalnızca ÜST SINIR olarak duruyor — aşırı büyük
   * tasarımlarda pano tuvalden tamamen çıkıp mekân kaybolmasın diye.
   */
  const ekranWm = Math.min(Number(width) || Infinity, cols * cwM)
  const ekranHm = Math.min(Number(height) || Infinity, rows * chM)

  /*
   * TASARIMIN KAPLADIĞI ALAN ve MEKÂNIN DUVARI — çoklu ekran dahil.
   *
   * Tek ekranda tasarım = ekranın kendisi. ÇOKLU ekranda ise yan yana dizilen
   * ekranların toplamı: L tipi, kavisli ve düz ekranlar bir arada kullanılınca
   * şerit tek bir ekrandan çok daha geniş oluyor (WallPreview de aynı toplamı
   * hesaplıyor).
   *
   * Bu yüzden MEKÂN da bu toplama göre çiziliyor. Eskiden sahneye tek ekranın
   * ölçüsü gidiyordu: altı ekranlık 7 m'lik bir şeridin arkasına 2 m'lik bir
   * oda çiziliyor, ekranlar duvarın dışına taşıyordu.
   *
   * Duvar, kullanıcının yazdığı ölçüden KÜÇÜK olamaz ama tasarımdan da küçük
   * olamaz — tasarım duvara sığmıyorsa duvar büyür. WallPreview'daki
   * `wallWm/wallHm` ile birebir aynı kural; ikisi ayrışırsa mekân ile ekranlar
   * yine birbirini tutmaz.
   */
  const cokluAktif = screenMode === 'multi' && screens.length > 0
  const tasarimWm = cokluAktif
    ? screens.reduce((t, s) => t + Math.max(1, s.cols) * cwM, 0)
    : ekranWm
  const tasarimHm = cokluAktif
    ? Math.max(...screens.map((s) => Math.max(1, s.rows) * chM))
    : ekranHm
  /*
   * EKRANIN DIŞ HATTI (0..1 arası oranlarla, sol üst köşe 0,0).
   *
   * Mekân çizimindeki kasa şimdiye kadar DİKDÖRTGENDİ; iç L tipi ekranın
   * arkasında çerçeve ekranı takip etmiyor, köşesi kırık ekranın çevresinde
   * düz bir dikdörtgen duruyordu. Hat buradan üretilip mekâna veriliyor.
   *
   * L yoksa null döner ve mekân eskisi gibi dikdörtgen kasa çizer.
   */
  /*
   * GEÇİCİ BİLGİ SATIRI.
   *
   * "Duvara sığdır" kararını arka planda veriyor; bu satır kararın
   * dayanağını (iki yerleşimin LED sayısı) görünür kılıyor. Doğrulama
   * bitince kaldırılacak — hesabın kendisi yerinde kalır.
   */
  const yerlesimBilgisi = useMemo(
    () => yerlesimSecenekleri(selectedModel, width, height),
    [selectedModel, width, height],
  )

  /*
   * L TİPİ EKRANDA KİOSK ÇİZİLMİYOR.
   *
   * L ekran köşeye giydirilen bir yüzey: iki duvarı ya da bir sütunu
   * sarıyor. Altına kasa, direk ve kaide çizmek yanlış bir ürün gösteriyordu
   * — o gövde dik dörtgen bir totem varsayıyor ve L'nin çıkıntısıyla
   * çakışıyor. Bu yüzden L varken mekân yalnızca ekranı çiziyor.
   */
  const lTipiVar = cokluAktif
    ? screens.some((s) => (s.type || 'flat') === 'lshape')
    : (screenType || 'flat') === 'lshape'

  const ekranSekli = useMemo(() => {
    if (!(tasarimWm > 0) || !(tasarimHm > 0)) return null
    // Tek ekranda da tür bilgisi var; çoklu ekranda her ekranın kendi türü
    const parcalar = cokluAktif
      ? screens.map((s) => ({ cols: Math.max(1, s.cols), rows: Math.max(1, s.rows), type: s.type || "flat", leftCols: s.leftCols, rightCols: s.rightCols }))
      : [{ cols: Math.max(1, cols), rows: Math.max(1, rows), type: screenType || "flat" }]
    // Hepsi düzse mekân eskisi gibi dikdörtgen kasa çizsin
    if (!parcalar.some((p) => p.type === "lshape" || p.type === "curved" || p.type === "curvedIn")) return null

    const oranX = tasarimWm / tasarimHm
    const p = L_KIRILMA_PCT / 100
    const ADIM = 28 // yay örnekleme çözünürlüğü

    const ust = []
    const altParcalar = []   // her parça kendi alt kenarını sırayla verir
    let x = 0
    parcalar.forEach((s) => {
      const w = (s.cols * cwM) / tasarimWm       // genişlik oranı
      const h = (s.rows * chM) / tasarimHm       // yükseklik oranı
      const taban = 1 - h                        // ekranlar ALTA hizalı
      const x0 = x
      const x1 = x + w
      const altBu = []

      if (s.type === "curved" || s.type === "curvedIn") {
        /*
         * Kavisli ekranın dış hattı bir yay. Kavis derinliği ekranın kendi
         * GENİŞLİĞİNİN oranı olarak veriliyor (curveDepthFor); burada yükseklik
         * birimine çevriliyor ki hat kutuya oturabilsin. Formül CurvedScreen /
         * curvedRenderer ile aynı: d = amp·(1 − t²)/2, t = -1..+1.
         */
        const icbukey = s.type === "curvedIn"
        const amp = (Math.max(0, Math.min(100, curveAmount)) / 100) * curveDepthFor(icbukey) * w * oranX
        /*
         * Tuval kutunun `maxD/2` üstüne yerleşiyor ve çizim içeride aynı kadar
         * aşağı kaydırılıyor (bkz. CurvedScreen + curvedRenderer). İki kayma
         * sadeleşiyor: kutu koordinatında kenar yalnızca ±d kadar oynuyor.
         */
        for (let i = 0; i <= ADIM; i++) {
          const u = i / ADIM
          const t = 2 * u - 1
          const d = (amp * Math.max(0, 1 - t * t)) / 2
          const nx = x0 + w * u
          ust.push([nx, taban + (icbukey ? d : -d)])
          altBu.push([nx, taban + h + (icbukey ? -d : d)])
        }
      } else if (s.type === "lshape") {
        const lc = Math.max(1, s.leftCols || Math.ceil(s.cols / 2))
        const rc = Math.max(1, s.rightCols || Math.max(1, s.cols - lc))
        const kirilma = x0 + w * (lc / (lc + rc))
        ust.push([x0, taban], [kirilma, taban + h * p], [x1, taban])
        altBu.push([x0, 1], [kirilma, 1 - h * p], [x1, 1])
      } else {
        ust.push([x0, taban], [x1, taban])
        altBu.push([x0, 1], [x1, 1])
      }

      altParcalar.push(altBu)
      x = x1
    })

    // Alt kenar sağdan sola dönerken: parçaların sırası ve her parçanın kendi
    // noktaları ters çevrilir (sıralamayla değil — yay noktaları x eşit olsa da
    // sırası bozulmamalı).
    const alt = altParcalar.reverse().flatMap((noktalar) => [...noktalar].reverse())
    return [...ust, ...alt]
  }, [cokluAktif, screens, cols, rows, screenType, curveAmount, tasarimWm, tasarimHm, cwM, chM])

  /*
   * KIOSK AYAĞININ YATAY YERİ (0..1, ekran kutusunda).
   *
   * L tipi ekran ortada bir köşe yapar; taşıyıcı direk o köşenin altına
   * gelir, çünkü ağırlık orada toplanır ve iki kanat oradan ayrılır.
   * Kanatların sütun sayısı farklıysa köşe ortada değildir, direk de
   * ortada olmamalı. L yoksa değer 0,5 — yani eskisi gibi tam orta.
   */
  const ayakOrani = useMemo(() => {
    const parcalar = cokluAktif
      ? screens.map((s) => ({ cols: Math.max(1, s.cols), type: s.type || 'flat', leftCols: s.leftCols, rightCols: s.rightCols }))
      : [{ cols: Math.max(1, cols), type: screenType || 'flat' }]
    if (!(tasarimWm > 0)) return 0.5
    const toplamCols = parcalar.reduce((a, s) => a + s.cols, 0)
    if (!toplamCols) return 0.5
    let gecen = 0
    for (const s of parcalar) {
      if (s.type === 'lshape') {
        const lc = Math.max(1, s.leftCols || Math.ceil(s.cols / 2))
        const rc = Math.max(1, s.rightCols || Math.max(1, s.cols - lc))
        return (gecen + s.cols * (lc / (lc + rc))) / toplamCols
      }
      gecen += s.cols
    }
    return 0.5
  }, [cokluAktif, screens, cols, screenType, tasarimWm])

  const mekanDuvarWm = Math.max(Number(width) || 0, tasarimWm)
  const mekanDuvarHm = Math.max(Number(height) || 0, tasarimHm)
  const panoOlcek =
    panoSahne && tuvalBoyut.w && ekranWm > 0 && ekranHm > 0
      ? (() => {
          const denemeH = (100 * ekranHm) / ekranWm
          const d = panoOlculeri(100, denemeH)
          const ust = d.ekranUst + denemeH / 2 // ekran merkezinin üstünde kalan
          const alt = d.H - ust // altında kalan (direk, taban)
          // 0,88: ölçü etiketleri panonun dışında duruyor, onlara da yer kalsın
          const yariW = (tuvalBoyut.w / 2) * 0.88
          const yariH = (tuvalBoyut.h / 2) * 0.88
          const kat = Math.min(yariW / (d.W / 2), yariH / ust, yariH / alt)
          const sigdir = (100 * kat) / ekranWm
          return Math.min(tuvalBoyut.w / PANO_SAHNE_EN_M, sigdir)
        })()
      : null
  /*
   * FOTOĞRAFLI mekânın ölçeği — GERÇEK METRE.
   *
   * Fotoğraf sabit ve gerçek ölçüsü biliniyor (`panelEnM`, bkz. sahneler.js),
   * dolayısıyla fotoğrafın kendi px/m'si sabittir. Ekran de tam o ölçekte
   * çiziliyor: 2 m'lik bir tasarım 7 m'lik panonun üçte birini kaplıyor,
   * 10 m'lik bir tasarım panodan taşıyor. Taşması hata değil, bilgi.
   *
   * ESKİDEN: ekran panelin TAM YERİNE sığdırılıyordu. Görüntü derli topluydu
   * ama yanlıştı — 2 m'lik ekranla 10 m'lik ekran tuvalde birebir aynı
   * büyüklükte çıkıyordu, yani mekân hiçbir ölçü bilgisi vermiyordu. Toplantı
   * salonunda da aynı kusur vardı ve gerçek ölçüye geçilerek düzeltildi.
   */
  const fotoSahne = scene === 'ozel' ? ozelSahne : sahneBul(scene)
  /*
   * MEKANDA SURUKLEME.
   *
   * Ekranin mekan icindeki yeri sabit degil: musteri onu vitrinin onunde,
   * girisin yaninda ya da koridorun solunda gormek isteyebilir. Kayma
   * METRE olarak tutuluyor (bkz. useSurukleme) — pencere boyutlandiginda
   * ekran mekan icinde kendiliginden yer degistirmesin diye.
   *
   * Yalnizca fotografli mekanlarda acik: cizilmis mekanlarda ekranin yeri
   * odanin geometrisine bagli, oradan koparilmasi anlamsiz olurdu.
   */
  const surukleAktif = !!fotoSahne?.kiosk

  /*
   * SAHNE YAKINLIGI — "kamera geri cekiliyor" etkisi.
   *
   * Kucuk bir kiosk, fotografin cekildigi mesafeden bakildiginda nokta
   * gibi kaliyor; buyuk bir billboard ise kadraja sigmiyor. Cozum, tek
   * bir fotograf uzerinde kamerayi yaklastirip uzaklastirmak.
   *
   * Bakis mesafesi ekranin kendi olcusunden geliyor: ekran buyudukce onu
   * butun olarak gorebilmek icin geriye cekilmek gerekir. Baskin kenarin
   * 4,5 kati, 3-22 m arasina sikistirilmis hali.
   *
   * Modelin kendi en uygun izleme mesafesi de bir ALT SINIR sayiliyor:
   * piksel araligi geregi o mesafeden yakina gelinemez, gelinirse tek tek
   * pikseller secilir. Formule eklenen tek sart bu.
   */
  const OTO_EN_AZ_M = 3
  const OTO_EN_COK_M = 22
  const otoIzlemeM = useMemo(() => {
    const baskin = Math.max(tasarimWm, tasarimHm)
    const modelin = viewingDistanceFor(selectedModel, cols, rows) || 0
    const ham = Math.max(baskin * 4.5, modelin)
    return Math.min(OTO_EN_COK_M, Math.max(OTO_EN_AZ_M, ham))
  }, [tasarimWm, tasarimHm, selectedModel, cols, rows])

  /** Yururlukteki mesafe: elle secildiyse o, yoksa otomatik hesap. */
  const izlemeMesafesi = izlemeM != null ? izlemeM : otoIzlemeM

  /*
   * SAHNE YAKINLIGI — mesafenin arka plana yansimasi.
   *
   * Uzaklastikca kamera geri cekiliyor (zoom out), yaklastikca iceri
   * giriyor. Sinirlar dar: 1,22 uzerinde fotograf cozunurlugunu kaybediyor,
   * 0,84 altinda kenarlardan disari cikiyor.
   *
   * Yalnizca arka plan <img> ogesine uygulaniyor (bkz. PanoFoto). Kiosk,
   * olcu etiketleri ve surukleme katmani ayni kaliyor; ekranin en-boy orani,
   * modul hesabi ve icerik orani hicbir sekilde etkilenmiyor.
   */
  const sahneYakinlik = useMemo(() => {
    /*
     * KENDİ FOTOĞRAFI: yakınlık ÇEKİM MESAFESİNDEN.
     *
     * Mesafeyi değiştirmek kamerayı ileri geri götürmek demek; o zaman
     * yalnızca tasarım değil, arka plan da yakınlaşıp uzaklaşmalı.
     * z = referans mesafe / seçilen mesafe: 15 m referansında 7,5 m
     * seçilirse görüntü iki katına çıkıyor.
     *
     * SINIR: uzaklaşırken fotoğraf küçülüyor ve kenarlarda boşluk kalıyor
     * — elimizde o kareden fazlası yok, uydurmak yerine olanı gösteriyoruz.
     * Bu yüzden 0,55 altına inmiyor.
     */
    if (fotoSahne?.tamGorunsun) {
      const z = VARSAYILAN_MESAFE_M / Math.max(1, ozelMesafeM)
      return Math.max(0.55, Math.min(3, z))
    }
    const ilerleme =
      (izlemeMesafesi - OTO_EN_AZ_M) / (OTO_EN_COK_M - OTO_EN_AZ_M)
    const zoom = 1.22 - ilerleme * 0.38
    return Math.max(0.84, Math.min(1.22, zoom))
  }, [fotoSahne, izlemeMesafesi, ozelMesafeM])

  /*
   * FOTOĞRAFLI MEKÂNDA ÇİZİM ÖLÇEĞİ.
   *
   * Ölçek mekânın kendi ölçeğinden geliyor: 4 m'lik ekran, fotoğrafta 4 m'ye
   * denk gelen kadar piksel kaplıyor. Ama tasarım mekândan büyükse bu, ekranın
   * fotoğrafın dışına taşması demek — özellikle kendi fotoğrafında, çünkü orada
   * fotoğraf tuvale sığdırıldığı için üstte ve altta bant kalıyor ve taşan ekran
   * boşluğa çıkıyor.
   *
   * Bu yüzden ölçek, tasarımın (kiosk gövdesiyle birlikte) fotoğrafın içinde
   * kalacağı değerle sınırlanıyor. Sınır devreye girdiğinde ekran artık birebir
   * ölçekte değil; ama görünmeyen bir ekranın ölçeği de bir işe yaramıyor.
   */
  const fotoOlcek = (() => {
    /*
     * HAZIR FOTOĞRAFLI MEKÂNLAR (AVM koridoru, şehir meydanı) ÖLÇEĞİ
     * TUVALDEN ALIYOR.
     *
     * Bu iki sahnede ölçek fotoğrafın kendi kalibrasyonundan geliyordu; sonuç
     * olarak aynı tasarım, arka plansız tuvale ve öteki mekânlara göre belirgin
     * biçimde küçük görünüyordu. Kullanıcı bütün mekânlarda aynı büyüklüğü
     * istedi: null dönünce WallPreview kendi sığdırma kuralını uyguluyor —
     * yani arka plansız tasarım ekranıyla birebir aynı boy.
     *
     * Bedeli: ekran artık fotoğraftaki panelin metre karşılığına kilitli değil.
     * Kendi fotoğrafında ölçek yine gerçek (mesafeden hesaplanıyor).
     */
    if (fotoSahne?.dosya && fotoSahne.id !== 'ozel') {
      /*
       * İç/dış mekân sahneleriyle AYNI kural: ölçek duvarın metre ölçüsünden
       * sığdırılıyor (salonOlcek). Böylece dört mekânda ve arka plansız
       * tuvalde tasarım aynı boyda görünüyor.
       */
      return salonOlcek(tuvalBoyut.w, tuvalBoyut.h, mekanDuvarWm, mekanDuvarHm)
    }
    if (!fotoSahne?.dosya || !(ekranWm > 0) || !(ekranHm > 0)) return null
    const yer = fotoYerlesim(fotoSahne, tuvalBoyut.w, tuvalBoyut.h)
    if (!yer?.pxPerM) return null
    /*
     * OLCU DOGRULUGU.
     *
     * Ekranin piksel olcegi fotografinkiyle AYNI olmak zorunda: fotograf
     * yakinlastiginda mekandaki 1 metre daha fazla piksel ediyor, ekran da
     * ayni oranda buyumezse 4 m lik bir tasarim mekanda 4 m yer kaplamaz.
     * (Zoom yalnizca arka plan <img> ine uygulanan bir CSS donusumu; burasi
     * ise ekranin gercek metre karsiligi. Olcu etiketleri, surukleme ve
     * arayuz bundan etkilenmiyor.)
     */
    const gercek = yer.pxPerM * sahneYakinlik
    // Fotoğrafın tuvalde görünen kısmı: sığdırılmışta bantlar dışında kalan alan
    const alanW = Math.min(tuvalBoyut.w, yer.genislik * sahneYakinlik)
    const alanH = Math.min(tuvalBoyut.h, yer.yukseklik * sahneYakinlik)
    const enCokW = (alanW * 0.94) / tasarimWm
    // Yükseklikte kiosk gövdesine de pay bırakılıyor
    const enCokH = (alanH * 0.82) / tasarimHm
    return Math.min(gercek, enCokW, enCokH) || null
  })()
  /*
   * SALON ölçeği. Salonun arka duvarı gerçek metre ölçüsünde çizildiği için
   * tuvale sığma hesabı da metre üzerinden yapılıyor — bkz. Salon.jsx.
   */
  const salonOlcegi =
    scene === SALON_ID
      ? salonOlcek(tuvalBoyut.w, tuvalBoyut.h, mekanDuvarWm, mekanDuvarHm)
      : null
  /* CEPHE ölçeği — salonunkiyle aynı kural, bkz. Cephe.jsx */
  const cepheOlcegi =
    scene === CEPHE_ID
      ? cepheOlcek(tuvalBoyut.w, tuvalBoyut.h, mekanDuvarWm, mekanDuvarHm)
      : null
  const sahneOlcekVarsayilan = panoOlcek || fotoOlcek || salonOlcegi || cepheOlcegi

  /*
   * Ölçü etiketlerinin panonun kasasına binmemesi için gereken pay.
   * Kasa ekranın dışına taşan tek parça (direk aşağıda, etiketler yukarıda
   * ve sağda), o yüzden kasa kalınlığı + biraz nefes payı yetiyor.
   */
  const sahnePayPx = !cizimOlcek
    ? 0
    : panoSahne
      ? Math.round(panoOlculeri(ekranWm * cizimOlcek, 1).kasa + 6)
      : scene === SALON_ID || scene === CEPHE_ID
        ? Math.round(Math.max(2, 0.05 * cizimOlcek) + 6) // çizilmiş kasa: 5 cm
        : 0

  /*
   * MEKANDA SÜRÜKLEME — ölçek hesabından SONRA.
   * Kaymanın metre karşılığı çizim ölçeğine bağlı; yukarıda tanımlansaydı
   * bu değerlere henüz erişilemezdi.
   */
  const {
    ofsetM: mekanOfsetM,
    tasindi: mekanTasindi,
    sifirla: mekaniOrtala,
    tutamak: mekanTutamak,
  } = useSurukleme(cizimOlcek || 0)

  /*
   * MEKANDA YÖN VERME.
   *
   * Fotoğraf karşıdan çekilmemişse ekranı da o açıya çevirmek gerekiyor;
   * yoksa yamuk bir duvara dümdüz bir dikdörtgen yapıştırılmış gibi
   * duruyor. Fare aynı tutamağı kullanıyor, sadece kipi değişiyor:
   * taşımak da yön vermek de ekranı elle tutup sürüklemek.
   */
  const {
    yon: mekanYon,
    dondu: mekanDondu,
    sifirla: yonuSifirla,
    ayarla: yonuAyarla,
    tutamak: yonTutamak,
  } = useYon()
  /* Fare her zaman TAŞIR; yön verme yerine dört köşe yerleşimi kullanılıyor. */
  const etkinTutamak = mekanTutamak

  /*
   * Kioskun zemine oturmasi icin gereken sabit dikey kayma. Kullanicinin
   * suruklemesi bunun UZERINE biniyor: "Ortala" dedigi yer de burasi.
   */
  const fotoYer = surukleAktif ? fotoYerlesim(fotoSahne, tuvalBoyut.w, tuvalBoyut.h) : null
  /*
   * DUVARA ASILI MI, YERDE Mİ?
   *
   * Ayaklar gizliyse ekran duvara asiliyor demektir; o zaman dikey yerini de
   * oneri belirliyor (model odada asili duran ekranin hizasini bulmussa oraya
   * gidiyor). Ayak varsa kiosk yerde durur ve dikey yeri zemin cizgisine
   * kilitlidir.
   */
  const duvaraAsili = surukleAktif && !ayakVar && !!fotoYer?.sigdir
  const oturmaKaymasi = !surukleAktif
    ? 0
    : duvaraAsili
      ? oneriDikeyKaymasi(fotoYer, tuvalBoyut.h)
      : zeminOturmaKaymasi(
          fotoSahne,
          fotoYer,
          tuvalBoyut.h,
          sahneYakinlik,
          tasarimHm * (cizimOlcek || 0),
          ayakVar,
          tasarimWm * (cizimOlcek || 0),
        )
  /* Sığdırılmış fotoğrafta ekran, önerilen alanın üstüne yatayda da kayar. */
  const oneriKaymasi = surukleAktif ? oneriYatayKaymasi(fotoYer, tuvalBoyut.w) : 0

  const elleKayma = surukleAktif
    ? kaymayiSinirla(
        mekanOfsetM,
        cizimOlcek || 0,
        tuvalBoyut,
        tasarimWm * (cizimOlcek || 0),
        tuvalBoyut.h / 2,
      )
    : null

  /*
   * EKRAN HER ZAMAN FOTOĞRAFIN İÇİNDE.
   *
   * Zemine oturtma kayması ekranı aşağı çekiyor; büyük tasarımlarda ekranın
   * ÜSTÜ fotoğrafın dışına, kendi fotoğrafında da bantlara taşabiliyordu.
   * Burada son bir sınır uygulanıyor: kioskun tamamı fotoğrafın çizildiği
   * dikdörtgenin içinde kalıyor. Kiosk fotoğraftan uzunsa ortalanıyor —
   * yarısını göstermektense tamamını göstermek daha faydalı.
   */
  /*
   * HEDEF DÖRTGENİN TUVALDEKİ KARŞILIĞI.
   *
   * Köşeler fotoğrafa göre oranlı; fotoğrafın tuvaldeki yerleşimi
   * (fotoYerlesim) ile piksele çevriliyor, sonra TASARIM KUTUSUNUN sol
   * üstüne göre yazılıyor — homografi kutunun kendi köşelerini hedefe
   * eşliyor (bkz. homografi.js).
   */
  const koseTuval = (() => {
    if (!hedefKose || !fotoYer || !cizimOlcek) return null
    const dw = tasarimWm * cizimOlcek
    const dh = tasarimHm * cizimOlcek
    if (!(dw > 0) || !(dh > 0)) return null
    const solUst = { x: tuvalBoyut.w / 2 - dw / 2, y: tuvalBoyut.h / 2 - dh / 2 }
    /*
     * Fotoğraf yakınlaştıkça yüzey de kadrajda büyüyüp yer değiştiriyor;
     * köşeler aynı dönüşümden geçiyor. Ölçek merkezi PanoFoto ile aynı:
     * panelin merkezi, yani tuvalin ortası.
     */
    const mX = tuvalBoyut.w / 2
    const mY = tuvalBoyut.h / 2
    const z = sahneYakinlik || 1
    const tuvalKose = hedefKose.map((k) => ({
      x: mX + (fotoYer.sol + k.x * fotoYer.genislik - mX) * z,
      y: mY + (fotoYer.ust + k.y * fotoYer.yukseklik - mY) * z,
    }))
    /*
     * ÖLÇEK ÇEKİM MESAFESİNDEN.
     *
     * Kadrajın kapsadığı genişlik = mesafe × 1,11 (bkz. ozelMekan.js). Yüzeyin
     * gerçek genişliği de kadrajdaki payı kadarı: yarısını kaplıyorsa kadrajın
     * yarısı kadar metre. Tasarım bu ölçeğe göre yüzeyin içine oturuyor —
     * yüzeye yayılmıyor. Böylece 4 m'lik bir ekran her fotoğrafta 4 metre
     * gibi görünüyor.
     *
     * Manuel dört köşede de aynı kural geçerli.
     */
    const yuzeyPayi =
      (Math.hypot(tuvalKose[1].x - tuvalKose[0].x, tuvalKose[1].y - tuvalKose[0].y) +
        Math.hypot(tuvalKose[2].x - tuvalKose[3].x, tuvalKose[2].y - tuvalKose[3].y)) /
      2 /
      Math.max(1, fotoYer.genislik)
    const yuzeyWm = Math.max(0.2, yuzeyPayi * kadrajGenisligi(ozelMesafeM))
    const olcekli = icDortgen(tuvalKose, tasarimWm, tasarimHm, yuzeyWm)
    return olcekli.map((k) => ({ x: k.x - solUst.x, y: k.y - solUst.y }))
  })()

  /*
   * Köşelerin TUVALDEKİ mutlak yeri — manuel tutamaklar bunu kullanıyor.
   * (Ekranın dönüşümü için gereken, tasarım kutusuna göre olan sürüm
   * `koseTuval`; ikisi aynı noktalar, farklı başnokta.)
   */
  const koseMutlak = (() => {
    if (!hedefKose || !fotoYer) return null
    const mX = tuvalBoyut.w / 2
    const mY = tuvalBoyut.h / 2
    const z = sahneYakinlik || 1
    return hedefKose.map((k) => ({
      x: mX + (fotoYer.sol + k.x * fotoYer.genislik - mX) * z,
      y: mY + (fotoYer.ust + k.y * fotoYer.yukseklik - mY) * z,
    }))
  })()

  /* ADAY KARELERİN TUVALDEKİ KARŞILIĞI — köşelerle birebir aynı dönüşüm. */
  const adayTuval = (() => {
    if (!adayKipi || !adaylar.length || !fotoYer) return null
    const mX = tuvalBoyut.w / 2
    const mY = tuvalBoyut.h / 2
    const z = sahneYakinlik || 1
    return adaylar.map((a) => ({
      ...a,
      koseler: a.koseler.map((k) => ({
        x: mX + (fotoYer.sol + k.x * fotoYer.genislik - mX) * z,
        y: mY + (fotoYer.ust + k.y * fotoYer.yukseklik - mY) * z,
      })),
    }))
  })()

  /* Tuval noktasını fotoğrafa göre orana çevirir (manuel sürükleme). */
  const koseleriYaz = (noktalar) => {
    if (!fotoYer?.genislik || !fotoYer?.yukseklik) return
    const mX = tuvalBoyut.w / 2
    const mY = tuvalBoyut.h / 2
    const z = sahneYakinlik || 1
    setHedefKose(
      noktalar.map((k) => ({
        x: (mX + (k.x - mX) / z - fotoYer.sol) / fotoYer.genislik,
        y: (mY + (k.y - mY) / z - fotoYer.ust) / fotoYer.yukseklik,
      })),
    )
  }

  /* Manuel kip açılırken elde bir dörtgen yoksa fotoğrafın ortasında biri kurulur. */
  const koseKipiAc = () => {
    if (!hedefKose) {
      setHedefKose([
        { x: 0.3, y: 0.3 },
        { x: 0.7, y: 0.3 },
        { x: 0.7, y: 0.7 },
        { x: 0.3, y: 0.7 },
      ])
    }
    setKoseKipi(true)
  }

  const mekanKayma = (() => {
    if (!surukleAktif) return null
    const x = elleKayma.x + oneriKaymasi
    let y = elleKayma.y + oturmaKaymasi
    const yer = fotoYer
    if (yer) {
      const merkez = tuvalBoyut.h / 2
      const fotoUst = Math.max(0, merkez + (yer.ust - merkez) * sahneYakinlik)
      const fotoAlt = Math.min(
        tuvalBoyut.h,
        merkez + (yer.ust + yer.yukseklik - merkez) * sahneYakinlik,
      )
      const hPx = tasarimHm * (cizimOlcek || 0)
      const govdeM = ayakVar ? 0.6 : 0
      const govde = govdeM * (cizimOlcek || 0)
      const ust = merkez - hPx / 2
      const alt = merkez + hPx / 2 + govde
      const toplam = alt - ust
      if (toplam >= fotoAlt - fotoUst) {
        y = (fotoUst + fotoAlt) / 2 - (ust + alt) / 2
      } else {
        y = Math.max(fotoUst + 4 - ust, Math.min(fotoAlt - 4 - alt, y))
      }
    }
    return { x, y }
  })()


  /*
   * Satır sayısı YALNIZCA duvar yüksekliğine bağlıdır — kavisli olması sonucu
   * değiştirmez. Kavisin şişkinliği duvar çizgisinin dışına taşar; gerçekte de
   * ekran izleyiciye doğru büküldüğü için doğrusu budur.
   * (Bir ara şişkinliğe yer bırakıp satır azaltmayı denedik: sayılar kendiliğinden
   * değiştiği için kafa karıştırıcı bulundu.)
   */
  const rowsMax = hasModel ? Math.max(1, Math.floor(height / chM + EPS)) : 999
  // Duvarın alt sınırı: mevcut ekranı barındıran en küçük ölçü, 0,1 m'ye yuvarlanır
  const widthMin = hasModel ? Math.max(0.1, Math.ceil(cols * cwM * 10 - EPS) / 10) : 0
  const heightMin = hasModel ? Math.max(0.1, Math.ceil(rows * chM * 10 - EPS) / 10) : 0

  // Güvenlik ağı: paylaşılan bağlantı ya da duvar küçülmesi yüzünden ekran
  // duvardan büyük kalırsa sınıra çekilir.
  useEffect(() => {
    if (!hasModel) return
    if (rows > rowsMax) setRows(rowsMax)
    if (cols > colsMax) setCols(colsMax)
  }, [hasModel, rows, rowsMax, cols, colsMax])

  return (
    <div className="bg-[#f7f9fc] dark:bg-[#0b0f16] text-[#1c1c2b] dark:text-neutral-100 font-sans">
      {/* Konfigüratör — tek ekran yüksekliği */}
      {/* Masaüstü: tek ekran yüksekliği. Mobil: içerik alt alta dizilip sayfa kayar. */}
      <div className="yatay-sayfa min-h-screen lg:h-screen lg:overflow-hidden flex flex-col">
      {/* Başlık çubuğu — kurumsal logo + sayfa adı */}
      <header className="bg-white dark:bg-[#121821] border-b border-neutral-200/80 dark:border-[#2a3342] px-4 sm:px-6 lg:px-10 py-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <BrandMark title={t('app.title')} subtitle={t('app.tagline')} />

        {/*
          Araç düğmeleri başlık çubuğunda. Önce solda dikey bir şeritteydi ama
          duvar büyüdükçe çizimin üstüne biniyordu; burada hiçbir zaman çakışmaz.
        */}
        {/*
          Telefonda dokuz denetim tek satıra sığmıyordu: son ikisi (dil ve profil)
          ekranın dışında kalıyor ve tıklanamıyordu. Dar ekranda satır SARIYOR,
          sm ve üzerinde eski tek satır düzeni sürüyor.
        */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto justify-start sm:flex-nowrap sm:justify-end">
<IconButton active={hasModel} label={t('tool.reset')} onClick={() => hasModel && setResetConfirmOpen(true)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
              <path d="M4 4v4h4" />
            </svg>
          </IconButton>
          <IconButton
            active={hasModel}
            label={showMeasurements ? t('tool.hideMeasures') : t('tool.showMeasures')}
            onClick={() => hasModel && setShowMeasurements((m) => !m)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="1.5" />
              <line x1="4" y1="14" x2="14" y2="14" />
              <line x1="14" y1="4" x2="14" y2="20" />
            </svg>
          </IconButton>

          {/* Kamerada oturt — taslak çerçeve, sonra çekim (bkz. Oturtma.jsx) */}
          <IconButton
            active={hasModel}
            label={t('fit.open')}
            sadeceIkon
            onClick={() => hasModel && setOturtmaAcik(true)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7V5a1 1 0 0 1 1-1h2M20 7V5a1 1 0 0 0-1-1h-2M4 17v2a1 1 0 0 0 1 1h2M20 17v2a1 1 0 0 1-1 1h-2" />
              <rect x="8" y="8" width="8" height="8" rx="1" />
            </svg>
          </IconButton>

          {/* AR / kamera simülasyonu — bkz. Mekân bölümündeki eşi */}
          <IconButton active={hasModel} label={t('ar.open')} onClick={() => hasModel && setArAcik(true)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8a2 2 0 0 1 2-2h2.2l1.2-2h7.2l1.2 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <circle cx="12" cy="12.5" r="3.4" />
            </svg>
          </IconButton>

          {/* Gerçek 3D sahne (HDRI ışıklandırma + WebXR/model-viewer AR dışa aktarma) */}
          <IconButton active={hasModel} label={t('scene3d.open')} onClick={() => hasModel && setScene3dOpen(true)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
              <path d="M12 3v18M4 7.5l8 4.5 8-4.5" />
            </svg>
          </IconButton>

          <span className="w-px h-6 bg-neutral-200 dark:bg-[#2c333f] mx-1 hidden sm:block" />

          {/* Teknik Özellikler (Bileşenler de içinde) */}
          <IconButton active={hasModel} label={t('sp.title')} onClick={() => hasModel && setSpecsOpen(true)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 6h14M5 12h14M5 18h9" />
            </svg>
          </IconButton>

          <span className="w-px h-6 bg-neutral-200 dark:bg-[#2c333f] mx-1 hidden sm:block" />

          {/* Asistan — her zaman kullanılabilir, model gerekmez */}
          <IconButton active label={t('chat.button')} onClick={() => setChatOpen((o) => !o)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-4.4A8.4 8.4 0 1 1 21 11.5z" />
              <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
            </svg>
          </IconButton>

          <span className="w-px h-6 bg-neutral-200 dark:bg-[#2c333f] mx-1 hidden sm:block" />

          {/* Açık / koyu tema */}
          <button
            type="button"
            onClick={temaDegistir}
            title={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')}
            aria-label={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')}
            className="h-9 w-9 rounded-full border border-neutral-300 dark:border-[#39414f] text-neutral-500 dark:text-neutral-300 hover:border-brand hover:text-brand inline-flex items-center justify-center transition-colors shrink-0"
          >
            {theme === 'dark' ? (
              // Güneş — tıklayınca açık temaya döner
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              // Ay — tıklayınca koyu temaya geçer
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            )}
          </button>

          <LanguageSelect value={lang} onChange={setLang} />

          <span className="w-px h-6 bg-neutral-200 dark:bg-[#2c333f] mx-1 hidden sm:block" />

          {/* Profil / rol menüsü — eski dişli (ayarlar) ikonunun yerini alır */}
          <ProfileMenu />
        </div>
      </header>
      <BrandStripe />

      {/* Gövde */}
      {/* yatay-kap: telefon yatayken iki sütun — bkz. index.css */}
      <div className="yatay-kap flex flex-col lg:flex-row flex-1 min-h-0 min-w-0 brand-page-enter">
        {/* SOL: Çalışma Alanı */}
        {/*
          Mobilde önizlemeye KESİN bir yükseklik verilir (min-h değil, h).
          Sebebi: içerideki çizim alanı h-full ile bu kutuyu dolduruyor; yüzde
          yükseklik ancak üst kutunun yüksekliği kesinken çözülür. min-h ile
          kutu "içeriği kadar" sayılıyordu, çizim kendi boyunu kendi boyundan
          hesaplamaya çalışıyor ve duvar olduğundan çok küçük çiziliyordu.
          Geniş ekranda düzen eskisi gibi (flex-1) bırakıldı.
        */}
        {/*
          SOL PANEL — kurulum. Model, duvar ve ekran ayarlari burada.

          Eskiden dort adimli bir sihirbaz vardi (StepBar + Geri/Ileri).
          Kaldirildi: kullanici her seferinde adim atlayip geri donmek
          zorunda kaliyordu ve hicbir an yapilandirmanin tamamini goremiyordu.
          Artik hepsi tek ekranda; alanlar iki panele bolunerek kaydirma
          gerekmeden sigiyor.
        */}
        <main ref={tuvalRef} id="pdf-onizleme" className={(adayKipi ? 'aday-secim ' : '') + "yatay-onizleme order-1 lg:order-2 grow-0 shrink-0 basis-auto h-[62vh] min-w-0 relative overflow-hidden bg-[#f4f4f4] dark:bg-[#232830] lg:flex-1 lg:h-auto lg:min-h-0"}>

          {/*
            Mekân sahnesi — her şeyin arkasında (z-0). Ortası kasıtlı boştur,
            ekran oraya oturur. Yalnızca model seçildikten sonra çizilir;
            boş durum kartının arkasında anlamı olmaz.
          */}
          {hasModel && (
            <Scene
              id={scene}
              tuvalW={tuvalBoyut.w}
              tuvalH={tuvalBoyut.h}
              /* Pano ekranın ölçüsüne göre çizildiği için piksel karşılığı gerekiyor */
              pxPerM={cizimOlcek}
              /* Toplantı salonunda arka duvar bu ölçülerden çiziliyor */
              duvarWm={mekanDuvarWm}
              duvarHm={mekanDuvarHm}
              ekranWpx={tasarimWm * (cizimOlcek || 0)}
              ekranHpx={tasarimHm * (cizimOlcek || 0)}
              /* Kasa dikdörtgen değil, ekranın dış hattını izlesin (iç L tipi) */
              ekranSekli={ekranSekli}
              ayakOrani={ayakOrani}
              yon={koseTuval ? null : mekanYon}
              kioskGizle={!!koseTuval || lTipiVar || !kioskVar}
              /* Mekânın gerçek ölçüleri, ölçü gösterimi açıkken görünüyor. */
              olcuGoster={showMeasurements}
              /* Fotografli mekanda arka plan bu oranda yakinlasip uzaklasiyor */
              yakinlik={sahneYakinlik}
              kayma={mekanKayma}
              ozelSahne={ozelSahne}
              kioskTipi={kioskTipi}
            />
          )}

          {hasModel ? (
            <WallPreview
              model={previewModel}
              width={width}
              height={height}
              screenMode={screenMode}
              screens={screens}
              cols={cols}
              rows={rows}
              content={content}
              contentUrl={contentUrl}
              screenType={screenType}
              resolution={resolution}
              curveAmount={curveAmount}
              showMeasurements={showMeasurements}
              onColsChange={setCols}
              onRowsChange={setRows}
              colsMax={colsMax}
              rowsMax={rowsMax}
              hideRegions={isVideoWall}
              sahneVar={scene !== 'none'}
              sahnePayPx={sahnePayPx}
              kose={koseTuval}
              /*
               * Dört köşe hedefi varken sürükleme ve açı kapalı: yerleşimi
               * artık dörtgen belirliyor, ikisi birbiriyle yarışmamalı.
               */
              kayma={koseTuval ? null : mekanKayma}
              tutamak={surukleAktif && !koseTuval ? etkinTutamak : null}
              yon={surukleAktif && !koseTuval ? mekanYon : null}
              sahneOlcekVarsayilan={sahneOlcekVarsayilan}
              onPxPerM={setCizimOlcek}
            />
          ) : (
            /* Boş durum tuvali */
            <div className="h-full flex items-center justify-center">
              <div className="w-[min(560px,100%)] aspect-square bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-2xl flex flex-col items-center justify-center gap-6 px-8">
                <svg viewBox="0 0 48 48" width="52" height="52" fill="none" stroke="#1c1c2b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="12" width="36" height="24" rx="1.5" />
                  <path d="M24 18v12M18 24h12" />
                  <path d="M24 16l-2.5 2.5M24 16l2.5 2.5" />
                  <path d="M24 32l-2.5-2.5M24 32l2.5-2.5" />
                  <path d="M16 24l2.5-2.5M16 24l2.5 2.5" />
                  <path d="M32 24l-2.5-2.5M32 24l-2.5 2.5" />
                </svg>
                <p className="text-center text-neutral-600 dark:text-neutral-400 text-lg leading-snug m-0">
                  {t('empty.prompt')}
                </p>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="bg-brand text-white text-sm font-semibold rounded-full px-6 py-2.5 hover:bg-brand-dark transition-colors"
                >
                  {t('empty.start')}
                </button>
              </div>
            </div>
          )}

          {/*
            MANUEL DÖRT KÖŞE KATMANI — tuvalin üstünde.
            Otomatik bulma her fotoğrafta doğru sonuç veremez; kesin sonucu
            kullanıcının kendi işaretlediği dört köşe verir.
          */}
          {/*
            ADAY KARELER — manuel köşe kipi kapalıyken gösteriliyor; ikisi
            birden açık olsaydı tutamaklar karelerin altında kalırdı.
          */}
          {!koseKipi && adayTuval && (
            <AdaySecici
              adaylar={adayTuval}
              tuvalW={tuvalBoyut.w}
              tuvalH={tuvalBoyut.h}
              onSec={(a) => {
                const i = adayTuval.indexOf(a)
                const ham = adaylar[i]
                if (!ham) return
                setHedefKose(ham.koseler)
                setAdayKipi(false)
                setOzelUyari(null)
              }}
            />
          )}

          {koseKipi && koseMutlak && (
            <KoseSecici
              koseler={koseMutlak}
              onDegis={koseleriYaz}
              tuvalW={tuvalBoyut.w}
              tuvalH={tuvalBoyut.h}
            />
          )}
        </main>

        {/*
          yatay-sag: telefon yatayken iki panel TEK kaydırma sütunu olur; normalde
          (dikey telefon / masaüstü) display:contents ile görünmez, yerleşimi
          değiştirmez. Ayrı ayrı kaydırılan iki kutu olduğunda alttaki İletişim /
          PDF bloğu sabit duruyor, panelle birlikte kaymıyordu.
        */}
        <div className="yatay-sag">
        <aside className="yatay-panel yatay-panel-model w-full min-w-0 lg:w-[340px] shrink-0 order-2 lg:order-1 border-t lg:border-t-0 lg:border-r border-neutral-200 dark:border-[#2c333f] px-4 sm:px-6 lg:px-5 py-5 flex flex-col lg:overflow-hidden">
          <Sigdir className="flex flex-col gap-2">
          {/* Tek/Çoklu Ekran sekmeleri (yalnızca model seçilince) */}
          {hasModel && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  setScreenMode('single')
                  setCols(1)
                  setRows(1)
                }}
                className={`py-2.5 rounded-lg text-[18px] transition-colors ${
                  screenMode === 'single'
                    ? 'btn-selected border-2'
                    : 'border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-[#39414f]'
                }`}
              >
                {t('mode.single')}
              </button>
              <button
                type="button"
                onClick={() => setMultiModalOpen(true)}
                className={`py-2.5 rounded-lg text-[18px] transition-colors ${
                  screenMode === 'multi'
                    ? 'btn-selected border-2'
                    : 'border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-[#39414f]'
                }`}
              >
                {t('mode.multi')}
              </button>
            </div>
          )}

          {/* Model */}
          <h2 className="text-[27px] font-bold tracking-tight m-0 mb-2">{t('model.heading')}</h2>

          {/*
            Hangi modeli seçeceğini bilmeyen kullanıcı için isteğe bağlı
            sihirbaz. Yeri model panelinin ÜSTÜ: soru zaten "hangisini
            seçeceğim" diye sorulurken, cevabı seçim kutusundan sonra sunmak
            geç kalıyordu. Ana akış (tek ekran, sihirbazsız) değişmiyor —
            burası yalnızca bir kısayol, o yüzden düğme değil satır: ince
            kenarlık, tek satır metin ve önünde sade bir pusula ikonu.
          */}
          {!hasModel && !cabinetsLoading && (
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="w-full mb-2 rounded-lg border border-neutral-200 dark:border-[#2c333f] px-2.5 py-2 flex items-center gap-2 text-left text-brand hover:border-brand hover:bg-brand-tint dark:hover:bg-[#1b2436] transition-colors"
            >
              {/*
                İkon dolu bir daire içinde: ince çizgili hâli panel küçültülünce
                (bkz. Sigdir) silikleşip görünmez oluyordu.
              */}
              <span className="w-6 h-6 rounded-full bg-brand text-white shrink-0 inline-flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.2 9a3 3 0 1 1 4 2.8c-.8.3-1.2 1-1.2 1.8v.4" />
                  <path d="M12 17.4h.01" />
                </svg>
              </span>
              <span className="text-[13px] font-semibold leading-tight">{t('wiz.entry')}</span>
            </button>
          )}
          {hasModel ? (
            <div className="border border-neutral-200 dark:border-[#2c333f] rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[16px] text-neutral-400 dark:text-neutral-500 mb-1">{selectedModel.series?.name || t('model.defaultSeries')}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-[28px] font-bold text-neutral-900 dark:text-neutral-100 leading-tight">{selectedModel.modelCode}</div>
                    <ProductTypeBadge productType={selectedModel.productType} size="md" />
                  </div>
                </div>
                {/* Ürün görseli — veritabanında adres varsa o, yoksa genel ekran ikonu */}
                <div className="w-16 h-11 rounded-lg bg-neutral-50 dark:bg-[#1b2029] border border-neutral-200 dark:border-[#2c333f] shrink-0 flex items-center justify-center overflow-hidden">
                  {selectedModel.imageUrl ? (
                    <img src={selectedModel.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2.5" y="5" width="19" height="12" rx="1" />
                      <line x1="8" y1="20" x2="16" y2="20" />
                      <line x1="12" y1="17" x2="12" y2="20" />
                    </svg>
                  )}
                </div>
              </div>
              <hr className="border-neutral-100 dark:border-[#242b36] my-3" />
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1 text-[18px] font-semibold text-neutral-800 dark:text-neutral-200 hover:text-brand"
              >
                {t('model.change')}
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 6 15 12 9 18" />
                </svg>
              </button>
            </div>
          ) : cabinetsLoading ? (
            // İskelet (skeleton) yükleme — API'den model listesi gelene kadar boş bir
            // "seç" butonu göstermek yerine yüklendiğini hissettiren bir animasyon.
            <div className="w-full h-[150px] rounded-lg border border-neutral-200 dark:border-[#2c333f] p-3 animate-pulse">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="h-3 w-24 bg-neutral-200 dark:bg-[#242b36] rounded mb-2" />
                  <div className="h-5 w-36 bg-neutral-200 dark:bg-[#242b36] rounded" />
                </div>
                <div className="w-16 h-11 rounded-lg bg-neutral-200 dark:bg-[#242b36] shrink-0" />
              </div>
              <div className="h-px bg-neutral-100 dark:bg-[#242b36] my-3" />
              <div className="h-4 w-28 bg-neutral-200 dark:bg-[#242b36] rounded" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="w-full h-[150px] border-2 border-dashed border-neutral-300 dark:border-[#39414f] rounded-lg flex flex-col items-center justify-center gap-3 text-neutral-400 dark:text-neutral-500 hover:border-neutral-400 dark:hover:border-[#4a5364] hover:text-neutral-500 transition-colors"
            >
              <span className="w-9 h-9 rounded-full border-2 border-current flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="6" x2="12" y2="18" />
                  <line x1="6" y1="12" x2="18" y2="12" />
                </svg>
              </span>
              <span className="text-base">{t('model.select')}</span>
            </button>
          )}

          <h2 className="text-[27px] font-bold tracking-tight m-0 mb-2">{t('wall.heading')}</h2>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <FieldLabel muted={!hasModel}>{t('wall.width')}</FieldLabel>
              <Stepper value={width} onChange={setWidth} min={widthMin} max={40} step={1} decimals={2} />
            </div>
            <div className="flex items-center justify-between">
              <FieldLabel muted={!hasModel}>{t('wall.height')}</FieldLabel>
              <Stepper value={height} onChange={setHeight} min={heightMin} max={20} step={1} decimals={2} />
            </div>
          </Card>

              {/* Yapılandırma */}
              <div className="mb-2">
                <div className="text-[18px] font-semibold tracking-[0.06em] uppercase text-neutral-600 dark:text-neutral-400 mb-2">{t('conf.heading')}</div>
                <button
                  type="button"
                  onClick={fitToWall}
                  className="w-full py-2.5 rounded-lg text-[18px] font-medium transition-colors border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand"
                >
                  {t('conf.fitToWall')}
                </button>
                {yerlesimBilgisi && (
                  <div className="mt-2 text-[15px] leading-snug text-neutral-500 dark:text-neutral-400 tabular-nums">
                    <div>
                      Yatay: {yerlesimBilgisi.yatay.cols}×{yerlesimBilgisi.yatay.rows} kabin ·{' '}
                      {yerlesimBilgisi.yatay.led.toLocaleString('tr-TR')} LED
                    </div>
                    <div>
                      Dikey: {yerlesimBilgisi.dikey.cols}×{yerlesimBilgisi.dikey.rows} kabin ·{' '}
                      {yerlesimBilgisi.dikey.led.toLocaleString('tr-TR')} LED
                    </div>
                  </div>
                )}
              </div>

          {hasModel && (
            <>
              <h2 className="text-[27px] font-bold tracking-tight m-0 mb-2">{t('screen.heading')}</h2>

              {screenMode === 'multi' ? (
                /* Çoklu ekran: ekran listesi */
                <div className="border border-neutral-200 dark:border-[#2c333f] rounded-lg p-3 mb-2">
                  {screens.map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-neutral-100 dark:border-[#242b36] last:border-b-0">
                      <div>
                        <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {t('screen.label')} {String(i + 1).padStart(2, '0')} ({t(`screen.${s.type}`)})
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {t('screen.columns')} {s.cols} × {t('screen.rows')} {s.rows}
                        </div>
                      </div>
                      <ScreenThumb content={content} contentUrl={contentUrl} type={s.type} />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMultiModalOpen(true)}
                    className="flex items-center gap-1 text-[18px] font-semibold text-neutral-800 dark:text-neutral-200 hover:text-brand mt-3"
                  >
                    {t('screen.changeSettings')}
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 6 15 12 9 18" />
                    </svg>
                  </button>

                  {/*
                    Listede kavisli ekran varsa kavis burada da ayarlanabilir.
                    Denetim yalnızca tek ekran dalındaydı; çoklu düzende
                    kavisli ekran seçilince kavisi değiştirmenin hiçbir yolu
                    yoktu, tasarım %60'a mahkûm kalıyordu.
                  */}
                  {screens.some((s) => s.type === 'curved' || s.type === 'curvedIn') && (
                    <KavisAyari
                      t={t}
                      deger={curveAmount}
                      onChange={setCurveAmount}
                      /* Listede iç bükey varsa açı ona göre okunur */
                      icbukey={screens.some((s) => s.type === 'curvedIn')}
                      coklu
                    />
                  )}
                </div>
              ) : (
                <>
                  {isVideoWall ? (
                    /* Video duvarı: Oryantasyon */
                    <div className="mb-2">
                      <div className="text-[18px] font-semibold tracking-[0.06em] uppercase text-neutral-600 dark:text-neutral-400 mb-2">{t('screen.orientation')}</div>
                      <Segmented
                        buyuk
                        value={orientation}
                        onChange={setOrientation}
                        options={[
                          { v: 'landscape', l: t('screen.landscape') },
                          { v: 'portrait', l: t('screen.portrait') },
                        ]}
                      />
                    </div>
                  ) : (
                    /* LED: Ekran Türü */
                    <div className="mb-2">
                      <div className="text-[18px] font-semibold tracking-[0.06em] uppercase text-neutral-600 dark:text-neutral-400 mb-2">{t('screen.type')}</div>
                      <Segmented
                        buyuk
                        cols={3}
                        value={screenType}
                        onChange={setScreenType}
                        options={[
                          { v: 'flat', l: t('screen.flat') },
                          { v: 'curved', l: t('screen.curved') },
                          { v: 'curvedIn', l: t('screen.curvedIn') },
                        ]}
                      />

                      {/*
                        KAVİS MİKTARI — yalnızca kavisli tiplerde görünür.
                        Değer state'te vardı ama ayarlanacak bir denetim yoktu
                        (kodda "UI slider ileride" notu duruyordu): herkes 60
                        değerine mahkûmdu. Kavis 2D önizlemede, kamerada ve 3D
                        sahnede aynı anda değişir.
                      */}
                      {(screenType === 'curved' || screenType === 'curvedIn') && (
                        <KavisAyari
                          t={t}
                          deger={curveAmount}
                          onChange={setCurveAmount}
                          icbukey={screenType === 'curvedIn'}
                        />
                      )}
                    </div>
                  )}

                  {/* Sütunlar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[18px] font-semibold tracking-[0.06em] uppercase text-neutral-600 dark:text-neutral-400">{t('screen.columns')}</span>
                      <Stepper value={cols} onChange={setCols} min={1} max={colsMax} />
                    </div>
                    {/*
                      Kabin hesabı: kaç kabin × kabinin gerçek ölçüsü = toplam.
                      Ölçüler modelden geliyor (previewModel), sabit değil —
                      başka bir model seçilince kendiliğinden değişir.
                    */}
                    <div className="text-[14px] text-neutral-400 dark:text-neutral-500 mt-1">
                      {cols} × {kabinWmm} mm = {(cols * kabinWmm).toLocaleString('tr-TR')} mm
                    </div>
                  </div>

                  {/* Satırlar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[18px] font-semibold tracking-[0.06em] uppercase text-neutral-600 dark:text-neutral-400">{t('screen.rows')}</span>
                      <Stepper value={rows} onChange={setRows} min={1} max={rowsMax} />
                    </div>
                    <div className="text-[14px] text-neutral-400 dark:text-neutral-500 mt-1">
                      {rows} × {kabinHmm} mm = {(rows * kabinHmm).toLocaleString('tr-TR')} mm
                    </div>
                  </div>
                </>
              )}

            </>
          )}

          {/*
            ÇÖZÜNÜRLÜK ve İÇERİK SOL PANELDE.
            İkisi de ekranın kendi özelliği — model, duvar ve kabin ayarlarının
            devamı. Sağ panel mekân ve yerleştirme işleriyle dolduğu için bu iki
            blok buraya alındı; içerikleri değişmedi.
          */}
          {hasModel && (
            <>
              {!isVideoWall && ekranCozunurlugu && (
                <div className="mb-2">
                  <div className="text-[16px] font-semibold tracking-[0.06em] uppercase text-neutral-600 dark:text-neutral-400 mb-2">{t('res.heading')}</div>
                  <div
                    title={t('res.totalHint')}
                    className="py-2.5 px-4 rounded-lg border border-neutral-200 dark:border-[#2c333f] text-[17px] font-semibold tabular-nums text-neutral-800 dark:text-neutral-100"
                  >
                    {fmt(ekranCozunurlugu.resW)} × {fmt(ekranCozunurlugu.resH)} px
                  </div>
                </div>
              )}

              <div className="mb-2">
                <h2 className="text-[25px] font-bold tracking-tight m-0 mb-2">{t('content.heading')}</h2>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" onChange={handleFile} className="hidden" />
                <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/ogg" onChange={handleVideoFile} className="hidden" />

                {/*
                  Üç sütun: her önizleme kutusunun ALTINDA kendi eylemi durur.
                  LED → Resim Yok · Örnek Görüntü → Resim Ekle · Örnek Video → Video Ekle
                */}
                <div className="grid grid-cols-3 gap-2">
                  {/* 1) LED ekran görünümü — varsayılan */}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setContent('led')}
                      className={`relative h-16 rounded-lg overflow-hidden flex items-center justify-center text-center px-1 ${
                        content === 'led' ? 'ring-2 ring-brand' : ''
                      }`}
                    >
                      <div style={{ position: 'absolute', inset: 0, backgroundImage: LED_GRADIENT }} />
                      <div style={{ position: 'absolute', inset: 0, ...ledDotsStyle(3) }} />
                      <span className="relative text-white text-[10px] font-semibold drop-shadow">
                        {t('content.led')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setContent('none')}
                      className={`py-2.5 rounded-lg text-[15px] hover:border-neutral-300 dark:hover:border-[#39414f] ${
                        content === 'none'
                          ? 'btn-selected border-2'
                          : 'border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      {t('content.none')}
                    </button>
                  </div>

                  {/* 2) Örnek görüntü */}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setContent('photo')}
                      className={`relative h-16 rounded-lg overflow-hidden flex items-center justify-center text-center px-1 ${
                        content === 'photo' ? 'ring-2 ring-brand' : ''
                      }`}
                    >
                      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${DEFAULT_CONTENT_SRC}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                      <span className="relative text-white text-[10px] font-semibold drop-shadow">
                        {t('content.default')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`py-2.5 rounded-lg text-[15px] hover:border-neutral-300 dark:hover:border-[#39414f] flex items-center justify-center gap-1 ${
                        content === 'upload'
                          ? 'btn-selected border-2'
                          : 'border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <circle cx="8.5" cy="10" r="1.5" />
                        <path d="m21 16-5-5L7 19" />
                      </svg>
                      {t('content.upload')}
                    </button>
                  </div>

                  {/* 3) Örnek video — küçük önizleme videonun kendisidir */}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setContent('sample')}
                      className={`relative h-16 rounded-lg overflow-hidden bg-neutral-900 flex items-center justify-center text-center px-1 ${
                        content === 'sample' ? 'ring-2 ring-brand' : ''
                      }`}
                    >
                      <video
                        src={SAMPLE_VIDEO_SRC}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <span className="relative text-white text-[10px] font-semibold drop-shadow">
                        {t('content.sample')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className={`py-2.5 rounded-lg text-[15px] hover:border-neutral-300 dark:hover:border-[#39414f] flex items-center justify-center gap-1 ${
                        content === 'video'
                          ? 'btn-selected border-2'
                          : 'border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <rect x="2" y="6" width="14" height="12" rx="2" />
                        <path d="M16 10.5 22 7v10l-6-3.5z" />
                      </svg>
                      {t('content.uploadVideo')}
                    </button>
                  </div>
                </div>
                <p className="text-[14px] text-neutral-400 dark:text-neutral-500 mt-2 m-0">
                  {t('content.hint')}
                </p>
              </div>
            </>
          )}

          </Sigdir>
        </aside>


        {/* SAĞ: Panel */}
        <aside className="yatay-panel yatay-panel-ayar w-full min-w-0 lg:w-[340px] shrink-0 order-3 lg:order-3 border-t lg:border-t-0 lg:border-l border-neutral-200 dark:border-[#2c333f] px-4 sm:px-6 lg:px-5 py-5 flex flex-col lg:overflow-hidden">
          <Sigdir className="flex flex-col gap-2">

          {/* ---- ADIM 4: İçerik ---- */}
          {hasModel && (
            <>
              {/*
                "Ekran Ayarları" BAŞLIĞI KALDIRILDI.

                Çözünürlük ve İçerik sol panele taşındıktan sonra bu panelde
                yalnızca Mini PC ve mekân işleri kaldı; başlık altındaki
                içeriği artık anlatmıyordu.
              */}

{/*
                ÇÖZÜNÜRLÜK: seçilebilen bir ayar değil, HESAPLANAN bir sonuç.
                Eskiden burada FHD/UHD düğmeleri vardı; bunlar ekrana gönderilen
                sinyalin standardıydı, ekranın kendi çözünürlüğü değil. Kullanıcı
                "çözünürlük" başlığı altında ekranının kaç piksel olduğunu
                görmeyi bekliyor — o değer de kabin sayısıyla birlikte değişiyor.

                Değer Teknik Özellikler'deki "Optik Parametre → Çözünürlük"
                satırıyla AYNI kaynaktan (computeSpecs) geliyor; iki yerde ayrı
                formül tutulmuyor, ayrı state de yok.
              */}
              


              {/*
                S-KUTU YEDEKLİLİĞİ ALANI KALDIRILDI (ikinci kez — bkz. 7944640).
                Bir dal birleşmesiyle geri gelmişti. sboxRedundancy state'i
                duruyor ('no'): Teknik Özellikler'deki bileşen listesi, donanım
                hesabı ve kayıtlı teklifler hâlâ onu okuyor.
              */}

              {/* Mini PC — opsiyonel görüntü kaynağı; kapalıysa yalnızca işlemci */}
              {!isVideoWall && (
                <div className="mb-3">
                  <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-neutral-200 dark:border-[#2c333f] p-3 hover:border-brand/40 transition-colors min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={hasMiniPc}
                      onChange={(e) => setHasMiniPc(e.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#2962ad]"
                    />
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold text-neutral-800 dark:text-neutral-100 leading-snug">
                        {t('minipc.heading')}
                      </span>
                      <span className="inline-block mt-1.5 text-[11px] font-medium rounded-full px-2 py-0.5 bg-neutral-100 dark:bg-[#222833] text-neutral-600 dark:text-neutral-300">
                        {t('minipc.hint')}
                      </span>
                      {!hasMiniPc && (
                        <span className="block mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                          {t('minipc.offHint')}
                        </span>
                      )}
                    </span>
                  </label>
                </div>
              )}

              

              {/*
                MEKÂN — ekranın arkasına çizilen oda.
                İçerik ekranın İÇİNE, mekân ekranın ARKASINA gider; ikisi
                birbirinden bağımsız seçilir, o yüzden ayrı bir başlık altında.
              */}
              <div className="mb-2">
                <h2 className="text-[25px] font-bold tracking-tight m-0 mb-1">{t('scene.heading')}</h2>
                <p className="text-[14px] text-neutral-400 dark:text-neutral-500 m-0 mb-3">{t('scene.hint')}</p>
                {/*
                  İki mekân: iç mekân (Salon.jsx) ve dış mekân (Cephe.jsx).
                  İkisi de aynı mantıkta çizim — "Duvar" alanları mekânın
                  yüzeyini, "Ekran" alanları ekranı belirler, ikisi de gerçek
                  metre.

                  LİSTEDEN ÇIKARILANLAR (kod duruyor, ileride lazım olabilir):
                  fotoğraflı mekânlar (sahneler.js: cadde panosu, ofis duvarı)
                  ve yol kenarı panosu (Pano.jsx). Hepsinin çizim/ölçek kodu
                  yerinde; geri getirmek için buraya bir satır eklemek yeterli.
                */}
                <div className="grid grid-cols-3 gap-2">
                  {[{ id: SALON_ID, ad: 'scene.salon' },
                    { id: CEPHE_ID, ad: 'scene.cephe' },
                    { id: 'avm', ad: 'avm.title' },
                    { id: 'meydan-gece', ad: 'dis.title' },
                    ...(ozelSahne ? [{ id: 'ozel', ad: 'scene.custom' }] : []),
                    { id: 'none', ad: 'scene.customOff' }].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setScene(s.id)}
                      className={`py-2.5 rounded-lg text-[16px] transition-colors hover:border-neutral-300 dark:hover:border-[#39414f] ${
                        scene === s.id
                          ? 'btn-selected border-2'
                          : 'border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      {t(s.ad)}
                    </button>
                  ))}
                </div>

                {/*
                  KAMERADA DENE — akışın içinde, mekân seçiminin hemen altında.
                  Yeri burası: "ekran gerçekte nasıl durur" sorusunun ikinci
                  cevabı. Başlık çubuğundaki simge de duruyor.

                  Düğme HER ZAMAN görünür. Önce yalnızca canlı kamera mümkünse
                  gösteriliyordu; yanlıştı — kamera açılamayan cihazda düğme
                  sessizce yok oluyor, kullanıcı özelliğin var olduğunu bile
                  bilmiyordu. Şimdi ekran her hâlükârda açılıyor ve sorun varsa
                  sebebini yazıp fotoğrafla devam etme yolu sunuyor.
                */}
                {/* Kendi fotoğrafı: ekleme, öneri ve ölçek */}
                <input
                  ref={ozelDosyaRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={mekanFotoSecildi}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => ozelDosyaRef.current?.click()}
                  className="mt-2 w-full py-2.5 rounded-lg text-[16px] font-semibold border border-brand text-brand hover:bg-brand-tint dark:hover:bg-[#1b2436] transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 16 5-5 4 4 3-3 6 6" />
                  </svg>
                  {ozelSahne ? t('scene.customChange') : t('scene.customAdd')}
                </button>

                {/*
                  Kendi fotoğrafında ÖLÇEK fotoğraftan çıkarılamaz: bir duvarın
                  kaç metre olduğunu görüntü söylemez. Bu yüzden soruluyor.
                  Kullanıcı değeri değiştirince öneri de tazeleniyor.
                */}
                {scene === 'ozel' && ozelSahne && (
                  <div className="mt-2 border border-neutral-200 dark:border-[#2c333f] rounded-lg p-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px] text-neutral-600 dark:text-neutral-400">
                        {t('scene.photoDistance')}
                      </span>
                      <Stepper
                        value={ozelMesafeM}
                        onChange={(v) => {
                          /*
                            MESAFE DEĞİŞİNCE MODELLERİ YENİDEN ÇALIŞTIRMA.

                            Önce her adımda tüm çözümleme (nesne tanıma +
                            derinlik, ~4 sn) baştan koşuyordu; üstelik burada
                            artık var olmayan bir işlev çağrılıyordu ve değer
                            hiç değişmiyordu. Mesafe yalnızca ÖLÇEĞİ belirliyor:
                            yüzeyin fotoğraftaki payı aynı kalıyor, o payın kaç
                            metre ettiği değişiyor. O yüzden sadece ölçek
                            güncelleniyor — sonuç anında görünüyor.
                          */
                          /* Ölçek sabit; mesafe yalnızca yakınlığı değiştiriyor. */
                          setOzelMesafeM(v)
                        }}
                        min={1}
                        max={300}
                        step={1}
                        decimals={0}
                      />
                    </div>
                    <p className="mt-1 mb-0 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                      {t('scene.photoDistanceHint')}
                    </p>
                    {/*
                      DÖRT KÖŞE — otomatik bulunanı düzeltmek ya da yüzeyi
                      elle işaretlemek için. Güvenilir omurga bu: otomatik
                      tespit iyi bir başlangıç noktası, kesin sonuç elle.
                    */}
                    <button
                      type="button"
                      onClick={() => (koseKipi ? setKoseKipi(false) : koseKipiAc())}
                      className="mt-2 w-full py-2 rounded-lg text-[15px] font-medium border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand transition-colors"
                    >
                      {koseKipi ? t('scene.cornersOff') : t('scene.cornersManual')}
                    </button>
                    {koseKipi && (
                      <p className="mt-1 mb-0 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                        {t('scene.cornersHint')}
                      </p>
                    )}
                    {hedefKose && (
                      <button
                        type="button"
                        onClick={() => {
                          setHedefKose(null)
                          setKoseKipi(false)
                        }}
                        className="mt-2 w-full py-2 rounded-lg text-[15px] font-medium border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand transition-colors"
                      >
                        {t('scene.cornersReset')}
                      </button>
                    )}
                    {/*
                      UYGUN YERLER — tek tahmin yerine seçenek listesi:
                      kareleri gör, birine tıkla, tasarım oraya gitsin.
                    */}
                    {adaylar.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAdayKipi((v) => !v)}
                        className="mt-2 w-full py-2 rounded-lg text-[15px] font-medium border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand transition-colors"
                      >
                        {adayKipi ? t('scene.spotsOff') : t('scene.spots')}
                      </button>
                    )}
                    {adayKipi && adaylar.length > 0 && (
                      <p className="mt-1 mb-0 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                        {t('scene.spotsHint')}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => oneriyiTazele()}
                      className="mt-2 w-full py-2 rounded-lg text-[15px] font-medium border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand transition-colors"
                    >
                      {t('scene.suggest')}
                    </button>
                    {ozelInceleniyor && (
                      <p className="mt-2 mb-0 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                        {t('scene.analysing')}
                      </p>
                    )}
                    {!ozelInceleniyor && ozelNesneler && (
                      <p className="mt-2 mb-0 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                        {t('scene.objectsFound')} {ozelNesneler.join(', ')}
                      </p>
                    )}
                    {ozelUyari && (
                      <p className="mt-2 mb-0 text-[13px] leading-snug text-amber-600 dark:text-amber-400">{ozelUyari}</p>
                    )}
                  </div>
                )}

                {/*
                  İZLEME MESAFESİ — yalnızca fotoğraflı mekânda.
                  Varsayılanı modelin önerilen mesafesi; artırınca ekran
                  uzaktan bakılmış gibi küçülür.
                */}
                {surukleAktif && (
                  <div className="mt-2 border border-neutral-200 dark:border-[#2c333f] rounded-lg p-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[15px] text-neutral-600 dark:text-neutral-400">
                        {t('scene.viewDist')}
                      </span>
                      {izlemeM == null ? (
                        <span className="text-[15px] font-semibold tabular-nums text-neutral-800 dark:text-neutral-200">
                          {izlemeMesafesi.toFixed(1).replace('.', ',')} m
                        </span>
                      ) : (
                        <Stepper
                          value={izlemeM}
                          onChange={setIzlemeM}
                          min={1}
                          max={60}
                          step={0.5}
                          decimals={1}
                        />
                      )}
                    </div>
                    <p className="mt-1 mb-0 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                      {t('scene.viewDistHint')}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-[14px] text-neutral-600 dark:text-neutral-400">
                        {t('scene.viewDistAuto')}
                      </span>
                      <div className="flex rounded-lg overflow-hidden border border-neutral-200 dark:border-[#2c333f]">
                        {[true, false].map((oto) => (
                          <button
                            key={String(oto)}
                            type="button"
                            onClick={() => setIzlemeM(oto ? null : +izlemeMesafesi.toFixed(1))}
                            className={`px-3 py-1.5 text-[14px] transition-colors ${
                              (izlemeM == null) === oto
                                ? 'bg-brand text-white'
                                : 'text-neutral-600 dark:text-neutral-400 hover:text-brand'
                            }`}
                          >
                            {t(oto ? 'scene.on' : 'scene.off')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/*
                  KIOSK TİPİ — yalnızca fotoğraflı mekânda.

                  Aynı ekran gerçekte farklı biçimlerde kuruluyor; müşteriye
                  gösterilecek görüntü de buna göre değişmeli. Varsayılan
                  duvara monte: ekranların çoğu öyle kuruluyor ve gövde
                  çizmemek en az varsayım içeren seçenek.
                */}
                {surukleAktif && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="text-[14px] text-neutral-600 dark:text-neutral-400">
                        {t('scene.kiosk')}
                      </span>
                      <div className="flex rounded-lg border border-neutral-200 dark:border-[#2c333f] overflow-hidden">
                        {[true, false].map((v) => (
                          <button
                            key={String(v)}
                            type="button"
                            onClick={() => setKioskVar(v)}
                            className={`py-1.5 px-3 text-[13px] font-medium transition-colors ${
                              kioskVar === v
                                ? 'bg-brand text-white'
                                : 'text-neutral-600 dark:text-neutral-400 hover:text-brand'
                            }`}
                          >
                            {t(v ? 'scene.kioskOn' : 'scene.kioskOff')}
                          </button>
                        ))}
                      </div>
                    </div>
                    {kioskVar && (
                      <div className="text-[14px] text-neutral-600 dark:text-neutral-400 mb-1">
                        {t('scene.kioskType')}
                      </div>
                    )}
                    {kioskVar && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        ['duvar', 'scene.kioskWall'],
                        ['dokunmatik', 'scene.kioskTouch'],
                        ['totem', 'scene.kioskTotem'],
                        ['masa', 'scene.kioskTable'],
                        ['disMekan', 'scene.kioskOutdoor'],
                      ].map(([tip, anahtar]) => (
                        <button
                          key={tip}
                          type="button"
                          onClick={() => setKioskTipi(tip)}
                          className={`py-1.5 px-2 rounded-lg text-[13px] font-medium border transition-colors ${
                            kioskTipi === tip
                              ? 'btn-selected border-transparent'
                              : 'border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand'
                          }`}
                        >
                          {t(anahtar)}
                        </button>
                      ))}
                    </div>
                    )}
                  </div>
                )}

                {/*
                  YÖN VER KALDIRILDI — yerini dört köşe yerleşimi aldı.
                  Tek açıyla döndürmek yamuk bir yüzeye tam oturmuyordu; dört
                  köşe hem kesin hem kullanıcının denetiminde. Sürükleyerek
                  taşıma eskisi gibi açık.
                */}


                {/*
                  ORTALA — yalnızca ekran mekân içinde taşınmışken görünür.
                  Fotoğraflı mekânda ekran sürüklenerek taşınabiliyor; bu düğme
                  onu açılıştaki yerine geri koyar. Hiç taşınmamışken göstermek,
                  yapılmamış bir şeyi geri alma seçeneği sunmak olurdu.
                */}
                {surukleAktif && mekanTasindi && (
                  <button
                    type="button"
                    onClick={mekaniOrtala}
                    className="mt-2 w-full py-2 rounded-lg text-[15px] font-medium border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand transition-colors"
                  >
                    {t('scene.recenter')}
                  </button>
                )}
                {hasModel && (
                  <button
                    type="button"
                    onClick={() => setArAcik(true)}
                    className="mt-2 w-full py-2.5 rounded-lg text-[16px] font-semibold border border-brand text-brand hover:bg-brand-tint dark:hover:bg-[#1b2436] transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8a2 2 0 0 1 2-2h2.2l1.2-2h7.2l1.2 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <circle cx="12" cy="12.5" r="3.4" />
                    </svg>
                    {t('ar.open')}
                  </button>
                )}
                {hasModel && (
                  <button
                    type="button"
                    onClick={() => setOturtmaAcik(true)}
                    className="mt-2 w-full py-2.5 rounded-lg text-[16px] font-semibold border border-brand text-brand hover:bg-brand-tint dark:hover:bg-[#1b2436] transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7V5a1 1 0 0 1 1-1h2M20 7V5a1 1 0 0 0-1-1h-2M4 17v2a1 1 0 0 0 1 1h2M20 17v2a1 1 0 0 1-1 1h-2" />
                      <rect x="8" y="8" width="8" height="8" rx="1" />
                    </svg>
                    {t('fit.open')}
                  </button>
                )}
              </div>
            </>
          )}

          {/* İletişim + PDF — yan yana */}
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="flex-1 rounded-full text-[16px] font-semibold py-2.5 border border-brand text-brand hover:bg-brand-tint transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
              </svg>
              {t('contact.heading')}
            </button>

          <button
            type="button"
            disabled={!hasModel}
            onClick={() => setExportOpen(true)}
            className={`flex-1 rounded-full text-[16px] font-semibold py-2.5 transition-colors ${
              hasModel
                ? 'btn-brand-primary cursor-pointer'
                : 'bg-neutral-100 dark:bg-[#222833] text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
            }`}
          >
            {t('pdf.professional')}
          </button>
          </div>

          {/*
            Gizlilik ve Güvenlik Notu — sağ panelin en altında, iletişim/PDF
            düğmelerinin hemen ardında. Önce sayfanın sol alt köşesinde
            position:fixed duruyordu; orada tuvalin üstünde yüzen, hangi bölüme
            ait olduğu belirsiz bir etiketti. Panelin sonu bilgi/onay
            metinlerinin doğal yeri.
          */}
          <button
            type="button"
            onClick={() => setPrivacyOpen(true)}
            className="mt-2 w-full text-center text-[12px] text-neutral-400 hover:text-brand dark:text-neutral-500 dark:hover:text-brand-light underline-offset-2 hover:underline transition-colors"
          >
            {t('privacy.footerLink')}
          </button>
          </Sigdir>
        </aside>
        </div>
      </div>
      </div>

      {/* Teknik Özellikler + Bileşenler pop-up'ı — sol simge şeridinden açılır */}
      <SpecsSection
        open={specsOpen}
        onClose={() => setSpecsOpen(false)}
        model={previewModel}
        cols={cols}
        rows={rows}
        sboxRedundancy={sboxRedundancy}
        hasMiniPc={hasMiniPc}
        screenType={screenType}
        isVideoWall={isVideoWall}
        screenMode={screenMode}
      />

      <ModelSelectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        cabinets={displayCabinets}
        onChoose={handleChoose}
      />

      <MultiScreenModal
        open={multiModalOpen}
        onClose={() => setMultiModalOpen(false)}
        modelCode={selectedModel?.modelCode}
        category={category}
        initialScreens={screens}
        onComplete={(list) => {
          setScreens(list)
          setScreenMode('multi')
        }}
      />

      {/* AR / kamera simülasyonu — tam ekran, yapılandırmanın üstünde */}
      <ArView
        open={arAcik && hasModel}
        onClose={() => setArAcik(false)}
        model={previewModel}
        cols={cols}
        rows={rows}
        /* Çoklu düzen kuruluysa kamerada da AYNI düzen çizilsin diye
           ekran listesi geçilir; tek ekranda null kalır. */
        screens={screenMode === 'multi' ? screens : null}
        content={content}
        contentUrl={contentUrl}
        screenType={screenType}
        resolution={resolution}
        curveAmount={curveAmount}
        hideRegions={isVideoWall}
        /* Kamerada "Kaydet" denen kare rapora da girsin (bkz. kareKaydedildi) */
        onSaved={kareKaydedildi}
      />

      <Oturtma
        open={oturtmaAcik && hasModel}
        onClose={() => setOturtmaAcik(false)}
        model={previewModel}
        cols={cols}
        rows={rows}
        screens={screenMode === 'multi' ? screens : null}
        content={content}
        contentUrl={contentUrl}
        screenType={screenType}
        resolution={resolution}
        curveAmount={curveAmount}
        hideRegions={isVideoWall}
        onSaved={kareKaydedildi}
      />

      {/*
        AVM KORİDORU — fotoğraflı mekân.
        Ölçüler burada da uygulamanın kendi kabin ızgarasından geliyor;
        pencerede değiştirilenler doğrudan yapılandırmayı değiştirir.
      */}


      <RecommendationWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        cabinets={displayCabinets}
        onChoose={handleChoose}
        onOpenFullList={() => setModalOpen(true)}
      />

      {/* Gerçek 3D sahne — HDRI ışıklandırma, serbest kamera, GLB dışa aktarma ile
          WebXR/Scene Viewer/Quick Look AR. Yalnızca açıldığında yüklenir (lazy). */}
      {scene3dOpen && hasModel && (
        <Suspense fallback={<div className="fixed inset-0 z-[60] bg-[#0b0d12] flex items-center justify-center text-white/60 text-sm">{t('scene3d.exporting')}</div>}>
          <Scene3D
            open={scene3dOpen && hasModel}
            onClose={() => setScene3dOpen(false)}
            model={previewModel}
            cols={cols}
            rows={rows}
            content={content}
            contentUrl={contentUrl}
            /*
             * Ekran biçimi 3D'de de görünsün. Tek ekranda seçilen tip; çoklu
             * ekran kuruluysa listenin tamamı geçilir ve her ekran kendi
             * biçimiyle (düz / kavisli / iç L) yan yana çizilir.
             */
            screenType={screenType}
            curveAmount={curveAmount}
            screens={screenMode === 'multi' ? screens : null}
            /* AR'da deklanşör işletim sistemine ait; fotoğraf için kamera
               ekranına geçiriyoruz (bkz. Scene3D → onOpenCamera) */
            onOpenCamera={() => {
              setScene3dOpen(false)
              setArAcik(true)
            }}
            /* AR'de "Kaydet" denen kare de rapora girsin */
            onSaved={kareKaydedildi}
          />
        </Suspense>
      )}

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />

      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />

      <ChatHelp open={chatOpen} onClose={() => setChatOpen(false)} />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        summary={{
          modelCode: selectedModel?.modelCode,
          // Rapordaki teknik özet (ağırlık, güç, ısı) modelin kendi
          // değerlerinden hesaplanıyor — kod tek başına yetmiyor.
          model: previewModel,
          width,
          height,
          cols,
          rows,
          screenType,
          resolution,
          screenMode,
          screens,
          // Teknik özellik sayfası da aynı PDF'in içine giriyor; o sayfanın
          // ihtiyaç duyduğu iki alan yalnızca burada mevcut.
          sboxRedundancy,
          hasMiniPc,
          isVideoWall,
          /* Kamerada ve AR'de kaydedilen kareler — her biri PDF'e ek sayfa olur.
             Rapora yalnızca görüntü gider; kaynak (kamera/AR) arayüzde,
             hangi karenin hangisinin yerine geçeceğini bilmek için tutuluyor. */
          arFotolar: arFotolar.map((k) => k.veri),
          /*
           * Tasarımın TAMAMI teklifle birlikte saklansın diye. Teklif kaydında
           * yalnızca özet vardı (model kodu, toplam sütun/satır, okunur bir
           * çoklu ekran cümlesi) ve tasarım geri açılamıyordu. Bu alan
           * "Tekliflerim → Düzenle"nin birebir çalışmasını sağlıyor.
           */
          tasarim: taslakOlustur({
            selectedModel, width, height, cols, rows, screenMode, screenType,
            orientation, curveAmount, resolution, sboxRedundancy, hasMiniPc, scene, screens, content,
          }),
        }}
      />

      {/*
        TASLAK UYARISI — geri yüklemede tam olarak eski hâline dönülemediyse
        kullanıcı bunu bilmeli (model listeden kalkmış ya da yüklediği
        görsel/video geri gelememiş olabilir).
      */}
      {taslakUyari && (
        <div className="fixed bottom-4 inset-x-0 z-[70] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto max-w-md rounded-xl bg-neutral-900 text-white text-[13px] px-4 py-3 shadow-2xl flex items-start gap-3">
            <span className="flex-1">{taslakUyari}</span>
            <button
              type="button"
              onClick={() => setTaslakUyari(null)}
              className="text-white/60 hover:text-white font-semibold shrink-0"
            >
              {t('ar.close')}
            </button>
          </div>
        </div>
      )}

      {/*
        Yeni kare geldiğinde çıkan seçim. AR/kamera katmanlarının ÜSTÜNDE
        durmalı (onlar z-50/z-60), yoksa kullanıcı soruyu göremez.
        Dışına tıklamak kapatmaz: üç seçenekten biri bilinçli seçilmeli.
      */}
      {kareSorusu && (
        <div className="fixed inset-0 z-[90] bg-[#001334]/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161a21] rounded-3xl p-6 sm:p-8 w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 text-center">
              {t('frame.title')}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center mt-2">
              {t('frame.body')
                .replace('{n}', String(ayniTurKareler.length))
                .replace('{k}', t(kareSorusu.kaynak === 'ar' ? 'frame.kindAr' : 'frame.kindCamera'))}
            </p>

            {/*
              RAPORDA HÂLİHAZIRDA NE VAR — kullanıcı "hangi kareler?" diye
              tahmin etmesin. Yeni kare hemen yanında duruyor ki karşılaştırıp
              karar verebilsin.
            */}
            <div className="mt-5">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 text-center">
                {t('frame.existing')}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {ayniTurKareler.map((k, i) => (
                  <img
                    key={i}
                    src={k.veri}
                    alt=""
                    className="w-20 h-14 object-cover rounded-lg border border-neutral-200 dark:border-[#2c333f]"
                  />
                ))}
              </div>
            </div>

            {/* Hangi kareden söz edildiği görünsün diye küçük önizleme */}
            <div className="mt-5 flex justify-center">
              <figure className="w-40">
                <img
                  src={kareSorusu.veri}
                  alt=""
                  className="w-40 h-28 object-cover rounded-xl border border-neutral-200 dark:border-[#2c333f]"
                />
                <figcaption className="text-[11px] text-neutral-500 dark:text-neutral-400 text-center mt-1.5">
                  {t('frame.newLabel')}
                </figcaption>
              </figure>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => kareKarariVer('hepsi')}
                className="rounded-2xl bg-brand text-white text-left px-5 py-3.5 hover:bg-brand-dark"
              >
                <span className="block font-semibold">{t('frame.keepAll')}</span>
                <span className="block text-[12px] text-white/80 mt-0.5">{t('frame.keepAllNote')}</span>
              </button>
              <button
                type="button"
                onClick={() => kareKarariVer('yalniz')}
                className="rounded-2xl border border-neutral-300 dark:border-[#39414f] text-left px-5 py-3.5 hover:bg-neutral-50 dark:hover:bg-[#1b2029]"
              >
                <span className="block font-semibold text-neutral-800 dark:text-neutral-200">{t('frame.replace')}</span>
                <span className="block text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5">{t('frame.replaceNote')}</span>
              </button>
              <button
                type="button"
                onClick={() => kareKarariVer('ekleme')}
                className="rounded-2xl border border-neutral-300 dark:border-[#39414f] text-left px-5 py-3.5 hover:bg-neutral-50 dark:hover:bg-[#1b2029]"
              >
                <span className="block font-semibold text-neutral-800 dark:text-neutral-200">{t('frame.discard')}</span>
                <span className="block text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5">{t('frame.discardNote')}</span>
              </button>
            </div>

            {arFotolar.length > ayniTurKareler.length && (
              <p className="text-[12px] text-neutral-500 dark:text-neutral-400 text-center mt-4">
                {t('frame.otherKept')}
              </p>
            )}

            {arFotolar.length >= 6 && (
              <p className="text-[12px] text-neutral-500 dark:text-neutral-400 text-center mt-4">
                {t('frame.full')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Sıfırlama onayı */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-[#001334]/45 flex items-center justify-center p-4" onClick={() => setResetConfirmOpen(false)}>
          <div className="bg-white dark:bg-[#161a21] rounded-3xl px-10 py-9 w-full max-w-md relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setResetConfirmOpen(false)}
              aria-label="Kapat"
              className="absolute top-5 right-5 text-neutral-500 dark:text-neutral-400 hover:text-brand"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
            <p className="text-center text-lg text-neutral-700 dark:text-neutral-300 mt-2 mb-8">
              {t('reset.body')}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="rounded-full border border-neutral-300 dark:border-[#39414f] text-neutral-800 dark:text-neutral-200 font-medium px-10 py-3 hover:bg-neutral-50 dark:hover:bg-[#1b2029]"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="rounded-full bg-brand text-white font-semibold px-12 py-3 hover:bg-brand-dark"
              >
                {t('common.ok')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * KAVİS MİKTARI DENETİMİ.
 *
 * Hem tek ekranda hem ÇOKLU ekranda kullanılıyor. Önce yalnızca tek ekran
 * dalında duruyordu: çoklu düzende kavisli bir ekran seçildiğinde kavisi
 * ayarlayacak hiçbir denetim yoktu ve tasarım %60'a mahkûm kalıyordu.
 *
 * Değer TASARIMIN TAMAMI için tek: kavisli ekranların hepsi aynı kavisle
 * çiziliyor (2D önizleme, kamera ve 3D sahne aynı değeri okuyor). Çoklu
 * düzende bunu kullanıcıya da söylüyoruz.
 */
function KavisAyari({ t, deger, onChange, icbukey, coklu = false }) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[16px] font-semibold tracking-[0.06em] uppercase text-neutral-600 dark:text-neutral-400">
          {t('screen.curveAmount')}
        </span>
        <span className="text-[16px] font-semibold text-brand">%{deger}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={deger}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={t('screen.curveAmount')}
        className="w-full accent-[#2962ad] cursor-pointer"
      />
      <div className="flex justify-between text-[13px] text-neutral-400 dark:text-neutral-500">
        <span>{t('screen.curveFlat')}</span>
        <span>{t('screen.curveMax')}</span>
      </div>
      {/*
        Yüzde tek başına anlamsız: "%60 kavis" kaç derece demek, kullanıcı
        bilemiyordu. Yüzde derinliği (sagitta) ölçer, açı ondan türer —
        karşılığını burada gösteriyoruz. Açı ekran boyutundan bağımsız, o
        yüzden kabin sayısı değişince de doğru kalır.
      */}
      <div className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
        {t('screen.curveArc')}: ≈{curveArcDegrees(deger, icbukey)}°
      </div>
      {coklu && (
        <div className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
          {t('screen.curveAllScreens')}
        </div>
      )}
    </div>
  )
}

function ScreenThumb({ content, contentUrl, type }) {
  return (
    <div className="w-14 h-9 rounded-lg overflow-hidden border border-neutral-200 dark:border-[#2c333f] shrink-0 relative bg-neutral-900">
      {content === 'led' && <div className="absolute inset-0" style={{ backgroundImage: LED_GRADIENT }} />}
      {content === 'photo' && (
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${DEFAULT_CONTENT_SRC}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      )}
      {content === 'upload' && contentUrl && <img src={contentUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      {/*
        Video içerikte küçük önizleme VİDEONUN KENDİSİ — içerik seçicideki
        "Örnek video" karesiyle aynı davranış. Eskiden burada yeşil bir degrade
        duruyordu; ekranda video oynarken listede alakasız yeşil bir kare
        görünüyordu. Sessiz ve döngülü; ses ya da denetim yok.
      */}
      {(content === 'sample' || (content === 'video' && contentUrl)) && (
        <video
          src={content === 'sample' ? SAMPLE_VIDEO_SRC : contentUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {content === 'none' && <div className="absolute inset-0 bg-white dark:bg-[#161a21]" />}
      {content === 'led' && <div className="absolute inset-0" style={ledDotsStyle(3)} />}
      {type === 'lshape' && (
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-2" style={{ background: 'linear-gradient(90deg,transparent,rgba(0,0,0,0.45),transparent)' }} />
      )}
    </div>
  )
}

/* ---- Dil seçimi ---- */
/* Bayraklar satır içi SVG: dış dosya/emoji gerekmiyor (Windows'ta bayrak emojileri
   harf olarak görünüyor, bu yüzden çizildiler). */

function FlagTR() {
  return (
    <svg viewBox="0 0 60 40" preserveAspectRatio="xMidYMid slice" className="w-full h-full block">
      <rect width="60" height="40" fill="#E30A17" />
      <circle cx="23" cy="20" r="9" fill="#fff" />
      <circle cx="26.5" cy="20" r="7.2" fill="#E30A17" />
      <polygon
        fill="#fff"
        points="37,15.5 38.06,18.54 41.28,18.61 38.71,20.56 39.65,23.64 37,21.8 34.35,23.64 35.29,20.56 32.72,18.61 35.94,18.54"
      />
    </svg>
  )
}

function FlagGB() {
  return (
    <svg viewBox="0 0 60 40" preserveAspectRatio="xMidYMid slice" className="w-full h-full block">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="8" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 V40 M0,20 H60" stroke="#fff" strokeWidth="13" />
      <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="8" />
    </svg>
  )
}

function FlagSA() {
  return (
    <svg viewBox="0 0 60 40" preserveAspectRatio="xMidYMid slice" className="w-full h-full block">
      <rect width="60" height="40" fill="#165D31" />
      {/* Şehâdet yazısı yerine sade beyaz şerit + kılıç (yer tutucu gösterim) */}
      <rect x="12" y="14" width="36" height="3.2" rx="1.6" fill="#fff" />
      <rect x="12" y="20" width="30" height="2.4" rx="1.2" fill="#fff" />
      <path d="M12 27 H44" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M44 27 l4 -2.2 v4.4 z" fill="#fff" />
    </svg>
  )
}

// Bayraklar dil kodlarıyla eşleştirilir; dil listesi i18n.js'ten gelir
const FLAGS = { tr: FlagTR, en: FlagGB, ar: FlagSA }

function LanguageSelect({ value, onChange }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  // Panel ekran dışına taşmasın diye konum düğmeye göre kıstırılarak hesaplanır
  const panelKonum = useAcilirKonum(ref, open, 170)
  const current = LANGUAGES.find((l) => l.code === value) || LANGUAGES[0]
  const CurrentFlag = FLAGS[current.code] || FlagTR

  // Dışarı tıklayınca kapat
  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('app.langLabel')}
        aria-expanded={open}
        className="h-9 pl-1.5 pr-2.5 rounded-full border border-neutral-300 dark:border-[#39414f] hover:border-brand flex items-center gap-1.5 transition-colors"
      >
        <span className="w-6 h-6 rounded-full overflow-hidden border border-neutral-200 dark:border-[#2c333f] block shrink-0">
          <CurrentFlag />
        </span>
        <span className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase">{current.code}</span>
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={panelKonum || undefined} className="absolute end-0 top-11 bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-lg shadow-lg py-1 z-50 min-w-[150px]">
          {LANGUAGES.map((l) => {
            const F = FLAGS[l.code] || FlagTR
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  onChange(l.code)
                  setOpen(false)
                }}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-[#1b2029] ${
                  l.code === value ? 'text-neutral-900 dark:text-neutral-100 font-medium' : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <span className="w-6 h-6 rounded-full overflow-hidden border border-neutral-200 dark:border-[#2c333f] block shrink-0">
                  <F />
                </span>
                {l.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Panelin üstündeki adım çubuğu.
 * Model seçilmeden 2–4. adımlara geçilemez; tamamlanan adımlara tıklanarak dönülür.
 */
/**
 * Ayar grubu kartı. Düz liste yerine hafif çerçeveli kutu —
 * hangi ayarların bir arada olduğu görsel olarak belli olur.
 */
/**
 * Bölmeli düğme (segmented control) — radyo düğmelerinin yerine.
 * Seçili olan dolgulu; tarayıcının varsayılan radyo görünümünden uzak.
 */
function Segmented({ options, value, onChange, cols, buyuk = false }) {
  return (
    <div className={`grid gap-1.5 p-1 bg-neutral-100 dark:bg-[#222833] rounded-lg`} style={{ gridTemplateColumns: `repeat(${cols || options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`py-1.5 px-2 rounded-md ${buyuk ? 'text-[15px]' : 'text-[12px]'} font-semibold transition-colors ${
            value === o.v
              ? 'btn-selected'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

/**
 * İÇERİĞİ KUTUYA SIĞDIRIR — kaydırma çubuğu yerine küçültme.
 *
 * Yan paneller taşınca kaydırma çubuğu çıkıyordu; istenmiyor. Burada içerik
 * ölçülüp gerekirse `transform: scale` ile küçültülüyor, böylece her ekran
 * yüksekliğinde tamamı görünüyor.
 *
 * İki ayrıntı önemli:
 *
 *  • transform YERLEŞİMİ değiştirmez, yalnızca çizimi etkiler. Bu yüzden
 *    küçültülen içerik hâlâ eski genişliğinde yerleşir ve sağda boşluk kalır.
 *    Telafi için genişlik 100/oran'a çıkarılıyor.
 *
 *  • Genişlik değişince satırlar yeniden sarılıyor ve gereken yükseklik de
 *    değişiyor — yani oran kendi kendini etkiliyor. Onun için tek hamlede
 *    değil, birkaç turda yakınsayana kadar hesaplanıyor.
 *
 * BÜYÜTME YOK, boşluk dağıtma var. Panel içeriğinden uzun kalınca altta boş bir
 * şerit kalıyordu. Bir ara oran 1'in üstüne çıkarılıp içerik büyütüldü ama
 * ters tepti: büyütünce genişlik telafisi kutuyu daraltıyor, yazılar alt
 * satıra kayıyor, gereken yükseklik artıyor ve döngü üst sınıra dayanıp
 * içeriği taşırıyordu. Onun yerine içerik kutusu panelin tam boyuna
 * uzatılıyor (`height: 100%`) ve artan boşluk `justify-between` ile bölümlerin
 * ARASINA dağıtılıyor — son satır panelin alt hizasına oturuyor.
 *
 * Alt sınır 0,5: oraya dayanırsa (çok kısa bir pencerede) kaydırma açılır;
 * içeriğin kırpılıp erişilemez kalmasındansa kaydırılabilir olması iyidir.
 */
const EN_KUCUK_ORAN = 0.3

function Sigdir({ children, className = '' }) {
  const disRef = useRef(null)
  const icRef = useRef(null)

  useLayoutEffect(() => {
    const dis = disRef.current
    const ic = icRef.current
    if (!dis || !ic) return

    const hesapla = () => {
      /*
       * Küçültme YALNIZCA masaüstünde (lg ve üstü) anlamlı: panel orada tek
       * ekran boyuna sıkıştırılıyor. Dar pencerede panel sayfayla birlikte
       * uzuyor; orada ölçekleme yapılırsa içerik kırpılıyor ve alttaki
       * düğmelere hiç erişilemiyordu. Bu yüzden altında her şey sıfırlanıp
       * doğal akışa bırakılıyor.
       */
      if (!window.matchMedia('(min-width: 1024px)').matches) {
        ic.style.width = ''
        ic.style.height = ''
        ic.style.transform = ''
        dis.style.overflowY = ''
        return
      }

      const disH = dis.clientHeight
      if (!disH) return
      /*
       * ÖLÇERKEN yükseklik serbest (auto) — içeriğin gerçekte ne kadar yer
       * istediği ancak öyle okunur. Kutuya panel boyu verilmiş olsaydı
       * scrollHeight hep o boyu döndürür, oran 1'de takılır ve küçültme hiç
       * çalışmazdı.
       */
      ic.style.height = 'auto'
      /*
       * ÖLÇERKEN küçültme de kapalı. Ölçekli ölçüm alt kenarda kırpılmaya yol
       * açıyordu; transform yerleşimi değiştirmediği için ölçüyü ölçeksiz alıp
       * sonunda uygulamak hem daha doğru hem daha basit.
       */
      ic.style.transform = 'none'
      let oran = 1
      for (let i = 0; i < 12; i++) {
        ic.style.width = `${100 / oran}%`
        /*
         * scrollHeight son çocuğun alt boşluğunu (margin) saymaz; bu yüzden
         * birkaç piksel eksik ölçülüp içerik taşıyordu. Küçük bir pay ekleniyor.
         */
        const gerek = ic.scrollHeight + 6
        if (!gerek) break
        /*
         * scrollHeight ÖLÇEKSİZ yerleşim yüksekliğidir; ekranda kapladığı yer
         * gerek * oran eder. İstenen bunun panele eşit olması, yani doğrudan
         * oran = disH / gerek. Bir ara buna bir de mevcut oran çarpılıyordu;
         * her tur oranı katlayarak küçültüyor, birkaç turda alt sınıra dayanıp
         * yazıları yarı boya düşürüyordu.
         */
        const yeni = Math.max(EN_KUCUK_ORAN, Math.min(1, disH / gerek))
        const bitti = Math.abs(yeni - oran) < 0.004
        oran = yeni
        if (bitti) break
      }
      /*
       * SON KONTROL: döngü salınıp biraz büyük bir oranda bitmiş olabilir.
       * Ölçeksiz gereken boy hâlâ panele sığmıyorsa oran doğrudan sığacak
       * değere çekilir — kaydırma yerine her zaman sığdırma.
       */
      ic.style.width = `${100 / oran}%`
      const sonGerek = ic.scrollHeight + 6
      if (sonGerek * oran > disH) {
        oran = Math.max(EN_KUCUK_ORAN, disH / sonGerek)
        ic.style.width = `${100 / oran}%`
      }

      ic.style.transform = `scale(${oran})`
      /*
       * ÖLÇTÜKTEN SONRA kutu panelin tam boyuna uzatılır. Küçültme yerleşimi
       * değiştirmediği için boy da 100/oran olmalı: ekranda tam 100% eder.
       * Artan boşluğu justify-between bölümlerin arasına dağıtır.
       */
      ic.style.height = `${100 / oran}%`
      // Masaüstünde kaydırma yok: içerik her hâlükârda panele sığdırılıyor.
      dis.style.overflowY = 'hidden'
    }

    hesapla()
    /*
     * Yalnızca panelin boyu değil, içeriğin boyu da değişiyor (görsel yüklenmesi,
     * yazı tipi, açılıp kapanan bölümler). İkisi de izleniyor; kendi yaptığımız
     * ölçü değişikliği tekrar tetiklemesin diye basit bir kilit var.
     */
    let calisiyor = false
    const gozcu = new ResizeObserver(() => {
      if (calisiyor) return
      calisiyor = true
      hesapla()
      requestAnimationFrame(() => { calisiyor = false })
    })
    gozcu.observe(dis)
    gozcu.observe(ic)
    return () => gozcu.disconnect()
  })

  return (
    <div ref={disRef} className="flex-1 min-h-0 lg:overflow-hidden">
      <div
        ref={icRef}
        className={className}
        style={{ transformOrigin: 'top left' }}
      >
        {children}
      </div>
    </div>
  )
}

function Card({ title, children, className = '' }) {
  return (
    <div className={`border border-neutral-200 dark:border-[#2c333f] rounded-xl p-3.5 mb-3 ${className}`}>
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-3.5 rounded-full bg-brand shrink-0" />
          <h3 className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-500 dark:text-neutral-400 m-0">
            {title}
          </h3>
        </div>
      )}
      {children}
    </div>
  )
}

/** Kart içindeki küçük alan etiketi — büyük harf, harf aralıklı. */
function FieldLabel({ children, muted = false }) {
  return (
    <span className={`text-[15px] font-semibold tracking-[0.06em] uppercase ${muted ? 'text-neutral-400 dark:text-neutral-500' : 'text-neutral-600 dark:text-neutral-400'}`}>
      {children}
    </span>
  )
}

/**
 * Üst çubuk düğmesi.
 *
 * : yazı hiç çizilmez, yalnızca simge kalır. Üst çubuk dar
 * ekranlarda sıkışıyordu; adı zaten simgesinden anlaşılan düğmelerde yazıyı
 * taşımak yer israfı. Ad, ipucu (title) ve ekran okuyucu etiketi olarak
 * duruyor — erişilebilirlik kaybı yok.
 */
function IconButton({ children, label, active, onClick, sadeceIkon = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`h-9 rounded-full px-2.5 lg:pl-2.5 lg:pr-3 inline-flex items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors shrink-0 ${
        active
          ? 'btn-selected'
          : 'border border-neutral-300 dark:border-[#39414f] text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
      }`}
    >
      <span className="shrink-0 flex items-center justify-center">{children}</span>
      {!sadeceIkon && <span className="hidden lg:inline">{label}</span>}
    </button>
  )
}

function Stepper({ value, onChange, min = 0, max = Infinity, step = 1, decimals = 0 }) {
  // draft: kullanıcı yazarken kutunun tamamen boşaltılabilmesi için geçici metin.
  // null iken gerçek değer gösterilir; odaktan çıkınca sınırlara kırpılır.
  const [draft, setDraft] = useState(null)
  const v = Number(value) || 0
  const atMin = v <= min
  const atMax = v >= max
  // Ondalık işlemlerde kayan nokta hatasını önlemek için yuvarla (0,1+0,2 = 0,30000000004)
  const round = (n) => Number(n.toFixed(decimals))
  const EPS = 1e-9
  // Adım tam sayıysa butonlar TAM SAYIYA oturtur: 4,5 → (+) 5 → (+) 6, (−) 4.
  // Klavyeden ondalık yazmak serbest; yalnızca +/- butonları tam sayıya çeker.
  const dec = () => {
    if (atMin) return
    const next = Number.isInteger(step) ? Math.ceil(v - EPS) - step : v - step
    onChange(round(Math.max(min, next)))
  }
  const inc = () => {
    if (atMax) return
    const next = Number.isInteger(step) ? Math.floor(v + EPS) + step : v + step
    onChange(round(Math.min(max, next)))
  }

  const handleChange = (e) => {
    const t = e.target.value
    setDraft(t)
    if (t === '') return // boş bırakmaya izin ver; kırpma odaktan çıkınca
    const n = Number(t)
    if (!Number.isNaN(n)) onChange(Math.min(max, n))
  }
  const handleBlur = () => {
    const n = Number(draft)
    if (draft === '' || draft === null || Number.isNaN(n)) onChange(min)
    else onChange(round(Math.min(max, Math.max(min, n))))
    setDraft(null)
  }

  return (
    <div className="flex items-stretch text-neutral-500 dark:text-neutral-400">
      <button
        type="button"
        onClick={dec}
        disabled={atMin}
        className={`w-9 h-9 border border-neutral-200 dark:border-[#2c333f] rounded-l-md flex items-center justify-center ${
          atMin ? 'text-neutral-300 cursor-not-allowed' : 'hover:bg-neutral-50 dark:hover:bg-[#1b2029]'
        }`}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="6" y1="12" x2="18" y2="12" />
        </svg>
      </button>
      <input
        type="number"
        step="any"
        value={draft !== null ? draft : value}
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-16 h-9 border-y border-neutral-200 dark:border-[#2c333f] text-center text-[16px] text-neutral-700 dark:text-neutral-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={inc}
        disabled={atMax}
        className={`w-9 h-9 border border-neutral-200 dark:border-[#2c333f] rounded-r-lg flex items-center justify-center ${
          atMax ? 'text-neutral-300 cursor-not-allowed' : 'hover:bg-neutral-50 dark:hover:bg-[#1b2029]'
        }`}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="6" x2="12" y2="18" />
          <line x1="6" y1="12" x2="18" y2="12" />
        </svg>
      </button>
    </div>
  )
}

export default App
