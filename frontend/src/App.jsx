import { useState, useEffect, useLayoutEffect, useMemo, useRef, Suspense } from 'react'
import { guvenliLazy } from './guvenliLazy.js'
import ModelSelectModal from './ModelSelectModal.jsx'
import RecommendationWizard from './RecommendationWizard.jsx'
import ExportModal from './ExportModal.jsx'
import WallPreview from './WallPreview.jsx'
import SpecsSection from './SpecsSection.jsx'
import { useConfigurationPreview } from './useConfigurationPreview.js'
import { computeSpecs, fmt } from './specsData.js'
import ContactModal from './ContactModal.jsx'
import PrivacyModal from './PrivacyModal.jsx'
import { BrandMark, BrandStripe } from './BrandChrome.jsx'
import ProductTypeBadge from './ProductTypeBadge.jsx'
import ProfileMenu from './ProfileMenu.jsx'
import DikeyUyari from './DikeyUyari.jsx'
import ChatHelp from './ChatHelp.jsx'
import Scene, { PANO_ID, SALON_ID, CEPHE_ID } from './Scene.jsx'
import { salonOlcek } from './Salon.jsx'
import {
  santimOku,
  referansOlcek,
  referansAcisi,
  kutuYerlesimMerkezi,
  referansDuzlemi,
  duzlemMerkezi,
  duzlemeDusur,
  duzlemdeKutu,
  refOrtaNokta,
  kutuDortgeni,
  EN_AZ_PIKSEL,
} from './referansOlcek.js'
import { durusDortgeni, faredenDurus, durusaOturt, kutuGovdesi } from './durusKutusu.js'
import ReferansSecici from './ReferansSecici.jsx'
import OlcuSihirbazi from './OlcuSihirbazi.jsx'
import KalinlikKatmani from './KalinlikKatmani.jsx'
import LKoseEkran from './LKoseEkran.jsx'
import EkEkranlar from './EkEkranlar.jsx'
/* Sağ panelde ne görünüyor — tek yerden açma/kapama (hiçbiri silinmedi). */
import { PANEL } from './panelOzellikleri.js'

/*
 * KANAT ŞEKLİ TUŞU — 40 px.
 * İlk halinde 28 px'ti ve okunmuyordu; satır düzeni sadeleşince
 * (etiket, derece, iki tuş) panele 40 px rahat sığıyor.
 */
const OK_YUKARI = 'M12 19V5M5 12l7-7 7 7'
const OK_ASAGI = 'M12 5v14M19 12l-7 7-7-7'
const ISARET_ARTI = 'M12 5v14M5 12h14'
const ISARET_EKSI = 'M5 12h14'

/*
 * AÇILIR PANEL BÖLÜMÜ.
 *
 * Arka planla ilgili ayarlar tek tek düğmeler hâlinde: hangisine basılırsa o
 * bölüm açılıyor, tekrar basılınca kapanıyor. Hepsi aynı anda açık dururken
 * panel okunmuyordu ve hangi ayarın hangi işe yaradığı kayboluyordu.
 */
function PanelBolum({ baslik, acik, onAc, ozet = null, children }) {
  return (
    <div className="mt-2 rounded-xl border border-neutral-200 dark:border-[#2c333f] overflow-hidden">
      <button
        type="button"
        onClick={onAc}
        aria-expanded={acik}
        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
          acik
            ? 'bg-brand/5 text-brand'
            : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-[#222833]'
        }`}
      >
        <span className="flex-1 text-[14.5px] font-semibold">{baslik}</span>
        {ozet && (
          <span className="text-[13px] font-medium text-neutral-500 dark:text-neutral-400">{ozet}</span>
        )}
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: acik ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {acik && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

function SekilTus({ onClick, etiket, yol }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiket}
      title={etiket}
      className="w-10 h-10 shrink-0 rounded-xl border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-300 hover:border-brand hover:text-brand hover:bg-brand/5 flex items-center justify-center transition-colors"
    >
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={yol} />
      </svg>
    </button>
  )
}
import { lKoseGeometri, lKoseYanKanat, cepheYanYuzu, icBukeyKose } from './lKose.js'
/* Alan içine yerleştirme ve sığdırma — ikisi de hazır (bkz. homografi.js). */
import { dortgenNoktasi, sigdirDortgen, koseDonusumu } from './homografi.js'

/* İşaretlenen alanın GERÇEK ölçüsü — eğimi hesaba katarak (bkz. alanOlcu.js). */
import {
  dortgenGercekOlcu,
  odakIkiReferanstan,
  dikdortgeneOtur,
  dortgenGecerli,
  grupDortgenleri,
} from './alanOlcu.js'
/* Fotoğrafın kendi odak uzaklığı — varsa tahmine hiç gerek kalmıyor. */
import { exif35mmOdak } from './exifOdak.js'
import TasmaKatmani from './TasmaKatmani.jsx'
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
  kadrajGenisligi, KADRAJ_KATSAYISI,
} from './ozelMekan.js'
import { SINIF_ADLARI } from './nesneBul.js'
import KoseSecici from './KoseSecici.jsx'
import TaslakKutu from './TaslakKutu.jsx'
import AdaySecici from './AdaySecici.jsx'
import DavetKapisi from './DavetKapisi.jsx'
import { kenarlaraOturt } from './ekranYuzeyi.js'
import { duzlestir } from './egimDenetimi.js'

import { DAVET_OLAYI } from './apiClient.js'
import { useSession } from './SessionContext.jsx'
import { icDortgen, duvarDunyasi, dunyaDortgeni } from './homografi.js'
import { bolmeDilimleri } from './icerikBolme.js'
import { kenarHaritasiCikar, yapisacakNokta } from './kenarBulucu.js'
import { dogruKesisimi } from './alanKenar.js'
import { viewingDistanceFor } from './viewingDistance.js'
import { useSurukleme, kaymayiSinirla } from './hooks/useSurukleme.js'
import { useYon } from './hooks/useYon.js'
import { panoOlculeri, PANO_SAHNE_EN_M } from './Pano.jsx'
import ArView from './ArView.jsx'
// three.js/react-three-fiber/drei/model-viewer tek başına ~1.8 MB — ana pakete
// gömülürse ilk yükleme herkes için ağırlaşır. Bu yüzden "3D Görünüm" düğmesine
// basılana kadar hiç indirilmez (kod bölme / code-splitting).
const Scene3D = guvenliLazy(() => import('./Scene3D.jsx'))
/* Fotograflı mekânda tasarımı yerinde 3B çizen katman — yalnızca gerekince yüklenir. */
const Mekan3D = guvenliLazy(() => import('./Mekan3D.jsx'))
const DuvarIzgara = guvenliLazy(() => import('./DuvarIzgara.jsx'))

/*
 * YERİNDE 3B ŞİMDİLİK KAPALI.
 *
 * Katman çalışıyor ama ekranı YANLIŞ yere ve yanlış boyda koyuyor: tasarımın
 * ortasında/altında duran koyu kutu buydu ve kullanıcı mesafeyi her
 * ayarladığında önüne çıkıyordu. Yanlış duran bir 3B, düz çizimden kötü.
 *
 * Kod olduğu gibi duruyor (Mekan3D.jsx). Eksik olan şey benim tarafımda:
 * yerleşimi yerelde uçtan uca üretip ölçeği ve merkezi doğrulayamadım
 * (yerel arka uç CORS yüzünden model seçimi tamamlanmıyor). Doğrulandığında
 * bu bayrak true yapılıp geri açılacak; başka hiçbir yerde değişiklik
 * gerekmiyor.
 */
const YERINDE_3B = true
import { DEFAULT_CONTENT_SRC, LED_GRADIENT, ledDotsStyle, curveArcDegrees, curveDiameterM, curveAmountForDiameter, L_KIRILMA_PCT, curveDepthFor, IMAGE_MAX_MB, KAVIS_ACI_ADIMI, curveAmountForArc, kavisAciSecenekleri, kavisYuzdesiniOturt } from './content.js'
import { LANGUAGES } from './i18n.js'
import { useAcilirKonum } from './hooks/useAcilirKonum.js'
import { SAMPLE_VIDEO_SRC, VIDEO_TYPES, VIDEO_MAX_MB } from './videoContent.js'
import { useLang } from './useLang.js'
import { useCabinets } from './hooks/useCabinets.js'
import { mmYazi } from './birim.js'
import { birimSozcugu, seriAdi } from './productType.js'
import {
  taslakEkranlari,
  taslakOlustur,
  taslagiSil,
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
/*
 * SÜTUN/SATIR ÜST SINIRI — DUVARDAN DEĞİL, DONANIMDAN.
 *
 * Eskiden sınır duvar ölçüsünden geliyordu: floor(width / kabinEni). Bu,
 * kullanıcının SEÇİMİNİ kısıtlıyordu: 30 cm'lik bir alana 32 cm'lik iki kabin
 * koymak imkânsızdı. Oysa "bu alan yetmiyor, ne kadar yetmiyor?" geçerli bir
 * soru ve cevabı ancak taşan tasarım çizilerek görülüyor.
 *
 * Ölçü kutusu artık yalnızca KARŞILAŞTIRMA REFERANSI: seçimi engellemiyor,
 * taşmayı gösteriyor (bkz. duvaraSigma uyarısı). Kaç tam kabinin sığdığını
 * hesaplamak yalnızca "Tasarımı duvara tam sığdır" düğmesinin işi.
 *
 * Sınır yine var ama anlamı değişti: tek eksende 200 kabin, 320 mm'lik kabinle
 * 64 metre eder; hiçbir gerçek kurulumda aşılmıyor. Buradaki tek işi arayüzün
 * ve 3B sahnenin uçsuz sayılarla kilitlenmesini önlemek.
 */
const EN_COK_KABIN_EKSEN = 200

function yerlesimSecenekleri(m, genislikM, yukseklikM) {
  if (!m) return null
  const EPSILON = 1e-9
  const gW = m.widthMm || 500
  const gH = m.heightMm || 500
  const hesapla = (kabinWmm, kabinHmm) => {
    const c = Math.max(1, Math.floor(genislikM / (kabinWmm / 1000) + EPSILON))
    const r = Math.max(1, Math.floor(yukseklikM / (kabinHmm / 1000) + EPSILON))
    // Kabin başına piksel; dönmekle değişmez, yalnızca yer değiştirir.
    return { cols: c, rows: r, piksel: c * r * (m.pixelWidth || 0) * (m.pixelHeight || 0) }
  }
  return { yatay: hesapla(gW, gH), dikey: hesapla(gH, gW) }
}

// Tema Root.jsx'te kuruluyor (yönetim ekranı da aynı temayı kullansın diye)
function App({ theme, onToggleTheme: temaDegistir }) {
  const { t, lang, setLang } = useLang()
  /* Davet kodu doğrulanınca misafir jetonu buraya yazılıyor. */
  const { setSessionData } = useSession()
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)

  // Kabin/model listesi React Query üzerinden cache'lenir (bkz. hooks/useCabinets.js);
  // sekmeler arası geçişte veya modal tekrar açıldığında ağa tekrar istek atılmaz.
  const { data: cabinets = [], isLoading: cabinetsLoading } = useCabinets()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState(null)
  const [screenType, setScreenType] = useState('flat') // flat | curved
  /*
   * L TİPİ HANGİ KÖŞEYE OTURUYOR.
   *
   * L bir köşe ürünü: bir kanadı ön duvarda, öteki o duvarın döndüğü yan
   * duvarda. Mekânın sol ya da sağ köşesi seçilebiliyor; çizim ikisinde de
   * ayna simetrik (bkz. lKose.js).
   */
  /*
   * KÖŞE SEÇİMİ: null = OTOMATİK.
   *
   * Hangi kanadın duvarda düz durup hangisinin köşeyi döneceği kullanıcının
   * elle seçmesi gereken bir şey değil — fotoğraf zaten söylüyor. Yine de
   * üstüne yazılabiliyor; otomatik yanılırsa düğmeye basmak yetiyor.
   */
  const [lKoseSecim, setLKoseSecim] = useState(null)
  /*
   * ÇİZİLMİŞ MEKÂNDA KAMERANIN YATAY DÖNÜŞÜ (px).
   *
   * null iken otomatik: L seçilince oda kendiliğinden köşeyi açacak kadar
   * dönüyor. Kullanıcı fareyle sürüklerse kendi değeri yazılıyor ve o
   * kazanıyor. L seçili değilken hiç uygulanmıyor — oda tam karşıdan.
   */
  const [lKacis, setLKacis] = useState(null)
  const [orientation, setOrientation] = useState('landscape') // landscape | portrait (video duvarı)
  const [curveAmount, setCurveAmount] = useState(60) // 0..100 — panelde kaydırıcıyla ayarlanır
  const [cols, setCols] = useState(1)
  const [rows, setRows] = useState(1)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  /* Shift ile tasarım alanından seçilen ekranlar. */
  const [secimKumesi, setSecimKumesi] = useState([])
  /* "Shift + tıkla" ipucu bir kez gösteriliyor. */
  const [shiftIpucu, setShiftIpucu] = useState(false)

  /*
   * ORTAK GÖRSELLİ EKRAN KÜMELERİ — birleşik OLMAYAN ekranlar için.
   * Tasarım alanında seçilip "Seçili ekranlara görsel ekle" denince
   * kuruluyor. Birleşik grubun kendi paylaşımı ayrı (bkz. grup.tekGorsel).
   */
  const [icerikGruplari, setIcerikGruplari] = useState([])

  /* İçerik kutusunun üstüne dosya sürükleniyor mu (bkz. content.ekle). */
  const [icerikSurukle, setIcerikSurukle] = useState(false)
  // Teknik Özellikler pop-up'ı (Bileşenler de içinde)
  const [specsOpen, setSpecsOpen] = useState(false)
  /*
   * KAMERADA OTURT — "Nasıl Görüneceğini Gör"den ayrı bir özellik.
   * Orada tasarım doğrudan kameranın üstünde duruyor; burada önce yalnızca
   * ölçülere göre bir TASLAK çerçeve görünüyor, deklanşöre basılınca tasarım
   * o çerçeveye oturuyor. İkisi birbirine karışmasın diye ayrı pencereler.
   */
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
   * FOTOĞRAFTAKİ KENAR VE KÖŞELER.
   *
   * Ölçüm hatasının önemli bir kaynağı tıklama hatası: duvarın köşesi
   * birkaç piksel şaşınca o şaşma ölçeğe girip santimetreye dönüşüyor.
   * Harita bir kez çıkarılıyor (bkz. kenarBulucu.js) ve işaretlerken nokta
   * en yakın gerçek köşeye/kenara oturuyor.
   *
   * Fotoğraf değişince eskisi hemen siliniyor: yeni fotoğrafta eski
   * fotoğrafın köşelerine yapışmak, bir önceki kalibrasyonu kullanmak kadar
   * yanlış olurdu.
   */
  const [kenarHarita, setKenarHarita] = useState(null)
  /*
   * İŞARETLEME YAKINLAŞTIRMASI.
   *
   * Uzaktaki küçük bir alanı işaretlerken birkaç pikselin içine birkaç
   * santim sığıyor; büyüteç o pikseli GÖSTERİYOR ama tıklamayı
   * kolaylaştırmıyor. Yakınlaştırma tuvalin kendisini büyütüyor.
   *
   * Kaydırma tuval pikselinde ve dönüşümden ÖNCE uygulanıyor
   * (translate(...) scale(z)), bu yüzden ekran pikseliyle birebir.
   */
  /*
   * YAKINLAŞTIRMA KALKTI.
   *
   * Fotoğrafta tekerlekle yakınlaştırma ve yakınlaştırılmış fotoğrafı
   * sürükleyip kaydırma gizli hareketlerdi; yanlışlıkla tetiklenince
   * kullanıcı fotoğrafın neden kaydığını anlamıyordu. Ölçek sabit.
   */
  const isaretZoom = 1
  const setIsaretZoom = () => {}
  const [isaretKay, setIsaretKay] = useState({ x: 0, y: 0 })
  /*
   * Fotoğraf değişince kenar haritası yeniden çıkarılıyor. İşlem bir
   * saniyenin altında ama yine de eşzamansız: bitmeden fotoğraf bir daha
   * değişirse geç gelen sonuç atılıyor.
   */
  useEffect(() => {
    const url = ozelSahne?.dosya
    setKenarHarita(null)
    /* Yeni fotoğrafın kadrajı başka: eski yakınlaştırma anlamsız. */
    setIsaretZoom(1)
    setIsaretKay({ x: 0, y: 0 })
    if (!url) return undefined
    let gecerli = true
    kenarHaritasiCikar(url)
      .then((h) => {
        if (gecerli) setKenarHarita(h)
      })
      .catch(() => {})
    return () => {
      gecerli = false
    }
  }, [ozelSahne?.dosya])
  /*
   * FOTOĞRAFIN ÇEKİM MESAFESİ — bütün yerleşimin ölçeği buradan geliyor.
   * Kadrajın kapsadığı genişlik mesafenin ~1,11 katı (bkz. ozelMekan.js).
   */
  const [ozelMesafeM, setOzelMesafeM] = useState(VARSAYILAN_MESAFE_M)
  const [ozelUyari, setOzelUyari] = useState(null)
  /* Model çalışırken kullanıcı beklediğini bilsin — birkaç saniye sürüyor. */
  const [ozelInceleniyor, setOzelInceleniyor] = useState(false)
  /* Yüklenen fotoğrafın görüntü nesnesi — kenar iyileştirmesi bunu kullanıyor. */
  const ozelSahneGorsel = useRef(null)
  /*
   * ÖLÇÜ SORUSU.
   *
   * Aday kare, fotoğraftaki yüzeyin gerçek ölçüsünü de biliyor. Tasarım o
   * ölçüden belirgin biçimde farklıysa yerleşim "oturmuş" görünmüyor: ekran
   * ya yüzeyi taşıyor ya da ortasında küçük kalıyor. Ölçüyü kendiliğinden
   * değiştirmek de doğru değil — kullanıcının seçtiği kabin sayısı onun
   * kararı. O yüzden SORULUYOR.
   */
  /*
   * Ölçü sorusu artık yalnızca "sorulsun mu" bayrağı; ölçünün KENDİSİ
   * saklanmıyor, çünkü mesafeye bağlı olarak değişiyor (bkz.
   * secilenYuzeyOlcu). Saklanan bir kopya mesafe değiştiğinde eskiyip
   * kullanıcıya gerçekte olmayan bir ölçü gösteriyordu.
   */
  const [olcuSorusu, setOlcuSorusu] = useState(false)
  /*
   * "Ölçü kalsın" dendiğinde eski kabin sayısı geri yüklenebilsin diye
   * uydurma öncesi değerler saklanıyor.
   */
  const [olcuOncesi, setOlcuOncesi] = useState(null)
  const [olcuUyduruldu, setOlcuUyduruldu] = useState(false)
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
  /*
   * HEDEFİN TÜRÜ.
   *
   * 'screen' ise fotoğrafta gerçek bir LED ekran/pano bulunmuş demektir;
   * tasarım o yüzeyin İÇİNE, oranı korunarak sığdırılıyor. Metre hesabı
   * orada geçersiz: panonun kaç metre olduğunu bilmiyoruz, ama sınırlarını
   * biliyoruz ve kullanıcının beklediği şey ekranın içini doldurmak.
   */
  const [hedefTur, setHedefTur] = useState(null)
  /*
   * ELLE DÖNDÜRME (derece).
   *
   * Dört köşe yerleşimi geldiğinde döndürme kaldırılmıştı; ama arka plan
   * varken kullanıcı her zaman taşıyıp döndürebilmek istiyor. Döndürme
   * hedef dörtgeni KENDİ MERKEZİ etrafında çeviriyor: yüzeyin perspektifi
   * korunuyor, ekran yalnızca o düzlemde dönüyor.
   */
  /* (Döndürme kaldırıldı: ekranı yüzeyin düzleminden çıkarıyordu.) */
  /*
   * EKRANI DOLDUR / GERÇEK ÖLÇÜ.
   *
   * Fotoğrafta mevcut bir LED ekran bulunduğunda iki farklı beklenti var:
   *   • "Ekranı doldur" — tasarım o panonun alanını kaplasın. Bu durumda
   *     tasarımın METRE ÖLÇÜSÜ de panonun ölçüsüne güncelleniyor (fotoğraf
   *     ölçeğinden hesaplanıyor) ve kullanıcıya yazılıyor; yoksa çizilen
   *     boyutla paneldeki sayılar birbirini tutmuyordu.
   *   • "Gerçek ölçü" — tasarım kendi ölçüsünde kalır, panonun merkezine
   *     onun açısıyla oturur; küçükse içinde kalır, büyükse taşar.
   */
  /*
   * VARSAYILAN: GERÇEK ÖLÇÜ.
   *
   * "Doldur" artık yalnızca ÇİZİMİ panonun içine sığdırıyor; kullanıcının
   * girdiği genişlik/yükseklik ve kabin sayısı hiçbir koşulda kendiliğinden
   * değişmiyor. Arka plan eklemek bir görselleştirme adımı, yapılandırmayı
   * değiştiren bir adım değil.
   */
  /* ("Doldur" kipi kaldırıldı: tasarımın ölçüsünü değiştiriyordu.) */
  /* Tasarım hiçbir yüzeye sığmıyorsa gösterilen uyarı (bkz. scene.doesNotFit). */
  const [sigmazUyari, setSigmazUyari] = useState(null)
  /* yuzeyOlcusu aşağıda tanımlı; öneri işlevi ondan önce geldiği için ref. */
  const yuzeyOlcusuRef = useRef(null)
  /*
   * oneriyiUygula, ölçü güncellemesinden ÖNCE tanımlanıyor (çizim ölçeği
   * ondan sonra hesaplanıyor). Bu yüzden işlev bir ref üzerinden çağrılıyor;
   * aksi halde tanımlanmadan kullanılmış olurdu (bu dosyada üç kez başımıza
   * geldi, bkz. koseTuval ve duzlemOnbellek notları).
   */
  const olculeriPanoyaUydurRef = useRef(null)
  /* Kullanıcı köşeleri elle düzeltiyor mu? */
  /*
   * BETA DAVET KAPISI.
   *
   * Sunucu beta modundaysa yazma uçları davet kodu istiyor; API katmanı bunu
   * haber veriyor, biz de kod ekranını açıyoruz. Kapı kapalıyken (varsayılan)
   * bu ekran hiç görünmüyor.
   */
  const [davetAcik, setDavetAcik] = useState(false)
  useEffect(() => {
    /* API katmanı beta kapısını görürse kod ekranı açılıyor. */
    const ac = () => setDavetAcik(true)
    window.addEventListener(DAVET_OLAYI, ac)
    return () => window.removeEventListener(DAVET_OLAYI, ac)
  }, [])

  /*
   * ELLE AÇI.
   *
   * Otomatik açı yalnızca ölçülebildiğinde uygulanıyor; boş duvarda
   * ölçecek bir şey yok. Bu yüzden açıyı kullanıcı veriyor: kipi açıp
   * tuvalde sürüklüyor (yatay → yana çevirme, dikey → öne/arkaya yatırma).
   */
  /*
   * AYRI AÇI KİPİ KALDIRILDI.
   *
   * Açı artık dört köşe tutamaklarından veriliyor: kullanıcı zaten
   * oradan düzeltmeye alışkın ve tek bir denetim, iki ayrı kipten kolay.
   */
  const [elleAci, setElleAci] = useState({ yaw: 0, tilt: 0 })

  /*
   * KULLANICININ ÇEKTİĞİ DÖRTGEN.
   *
   * Köşe hareketini açıya çevirmeyi denedik; kullanıcı için dolaylı
   * kaldı. En anlaşılır davranış doğrudan olan: tutulan köşe farenin
   * gittiği yere gider, ekran da o dört köşeye giydirilir. Tasarımın
   * panelde yazan metre ölçüsü ve kabin sayısı değişmiyor; değişen
   * yalnızca fotoğraftaki perspektifi.
   */
  const [elleKose, setElleKose] = useState(null)
  /*
   * ───────────────────────────────────────────────────────────────────────
   * AYNI ARKA PLANA BİRDEN ÇOK EKRAN.
   *
   * Bir ekran yerleştirildikten sonra "Ekran ekle" deniyor: o ekran olduğu
   * yere SABİTLENİYOR ve elde yeni bir ekran kalıyor, aynı süreç devam
   * ediyor. Düzenlenmekte olan ekran eskisi gibi tek bir ekran — mevcut
   * yerleştirme, ölçü ve açı mantığının hiçbirine dokunulmadı. Sabitlenenler
   * ayrı bir katmanda çiziliyor (bkz. EkEkranlar.jsx).
   *
   * KÖŞELER ORAN OLARAK (fotoğrafın 0..1'i) saklanıyor, piksel olarak değil:
   * pencere boyutu ya da sahne yakınlığı değişince ekranlar fotoğrafın
   * üstünde durdukları yerde kalıyor.
   *
   * YAPILANDIRMA ŞİMDİLİK ORTAK: eklenen ekran 1. ekranla aynı model, satır,
   * sütun ve içerikle çiziliyor. Ekran başına ayrı yapılandırma sonra
   * gelecek; o yüzden her kayıt kendi kimliğiyle duruyor.
   * ───────────────────────────────────────────────────────────────────────
   */
  const [sabitEkranlar, setSabitEkranlar] = useState([])
  /*
   * DÜZENLENEN EKRANIN KİMLİĞİ.
   *
   * Önce yoktu ve "Düzenle" iki ekranın YERİNİ takas ediyordu: tıklanan
   * kaydın içine duran ekranın dörtgeni yazılıyor, duran ekran da onun
   * yerine geçiyordu. Bugün bütün ekranlar aynı göründüğü için fark
   * edilmiyordu ama kayıtların kimliği karışıyordu — ekran başına ayrı
   * yapılandırma gelince (model, satır, sütun, içerik) o kimlik ayarları da
   * yanlış ekrana taşırdı.
   *
   * Artık her ekranın kimliği kendinde kalıyor: "Düzenle" duran ekranı KENDİ
   * kimliğiyle listeye geri koyuyor, seçileni listeden alıyor. Hiçbir ekran
   * kaybolmuyor ve her an tam olarak biri düzenleniyor.
   */
  const [aktifEkranId, setAktifEkranId] = useState(null)
  const yeniEkranKimligi = () => Date.now() + Math.random()
  /*
   * EKRANIN SIRA NUMARASI — bir kez veriliyor, bir daha değişmiyor.
   *
   * Liste "sabitlenenler, sonra düzenlenen" diye diziliyordu. Bir ekrana
   * tıklayınca o düzenlemeye alınıyor ve duran ekran sabitleniyor, yani
   * ikisi YER DEĞİŞTİRİYOR: kullanıcı "1. ekran"a tıklıyor, o "2. ekran"
   * oluyor ve ekranda hiçbir şey olmamış gibi görünüyordu. Oysa seçim
   * çalışıyordu, yalnızca numaralar kayıyordu.
   *
   * Artık numara ekranın kendisine ait. Liste numaraya göre diziliyor,
   * düzenlenen ekran kendi sırasında duruyor ve "düzenleniyor" diye
   * işaretleniyor.
   */
  const [aktifSira, setAktifSira] = useState(1)
  const sonrakiSira = () =>
    Math.max(0, aktifSira, ...sabitEkranlar.map((e) => e.sira || 0)) + 1
  /*
   * AÇIK OLAN PANEL BÖLÜMÜ — aynı anda yalnızca biri.
   * null ise hepsi kapalı; aynı başlığa tekrar basmak kapatıyor.
   */
  /*
   * ŞU AN KULLANILMIYOR: panelde açılır bölüm kalmadı. Son kullanan
   * "Ekranlar" bölümüydü, o da doğrudan görünen bir listeye çevrildi.
   * Durumu ve PanelBolum bileşeni duruyor — yeni bir bölüm katlanmak
   * istenirse hazır.
   */
  const [acikBolum, setAcikBolum] = useState(null)
  const bolumAc = (ad) => setAcikBolum((o) => (o === ad ? null : ad))
  void acikBolum
  void bolumAc
  /*
   * SABİTLENEN KÖŞELER.
   *
   * Ölçüyü korumak için dörtgeni her hareketten sonra merkezden yeniden
   * ölçekliyordum; bu, daha önce yerleştirilmiş köşeleri de oynatıyordu.
   * Artık kullanıcının dokunduğu köşe SABİTLENİYOR: sonraki düzeltmelerde
   * yerinden kıpırdamıyor, ölçü düzeltmesi yalnızca dokunulmamış köşelere
   * uygulanıyor. Üç köşe sabitlendiyse düzeltme hiç yapılmıyor — o noktada
   * dörtgeni kullanıcı tanımlamış olur.
   */
  const [kilitliKose, setKilitliKose] = useState([])

  const [koseKipi, setKoseKipi] = useState(false)

  /*
   * TASLAK KİPİ — fotoğraflı mekânda yeni akış.
   *
   * Öneri üretimi ve nesne tanıma kalktı. Kullanıcı duvarın gerçek ölçüsünü
   * yazıyor, ekranda o orana sahip bir taslak kutu beliriyor; kutuyu
   * köşelerinden fotoğraftaki duvara oturtuyor. Ölçek o andan itibaren
   * tahmin değil: duvarın kaç metre olduğunu kullanıcı söyledi.
   */
  const TASLAK_KIPI = true
  /*
   * Duvar ölçüsü FOTOĞRAFTAN ÖNCE soruluyor.
   *
   * Ölçüyü sonradan panelde istemek, kullanıcıyı önce ölçeksiz bir sahneyle
   * baş başa bırakıyordu: fotoğraf geliyor, tasarım rastgele bir boyda
   * duruyor, sonra ölçü giriliyor ve her şey zıplıyordu. Artık sıra doğru:
   * önce ölçü, sonra fotoğraf. Fotoğraf yüklenir yüklenmez taslak kutu
   * verilen ölçüyle kuruluyor.
   */
  /*
   * ÇEKİM MESAFESİ — YİNE KULLANICIDAN.
   *
   * Bir ara kaldırıp yalnızca kutudan hesaplamıştım; o zaman da kutunun ilk
   * ölçüsü tahmine kalıyordu ve kullanıcı bildiği bir sayıyı giremiyordu.
   * Doğrusu ikisi birden: mesafe girilince kutu ondan kuruluyor, kutu elle
   * oynatılınca mesafe ondan yeniden hesaplanıp alana yazılıyor. Hangisini
   * bilirsen onu giriyorsun, diğeri kendiliğinden doğruyu gösteriyor.
   */
  /*
   * KAMERA KATSAYISI ÖĞRENİLMİYOR — VE ÖĞRENİLMEMELİ.
   *
   * Bir ara katsayı şöyle çıkarılıyordu:
   *
   *     katsayı = duvarın gerçek eni ÷ (kutunun kadrajdaki payı × mesafe)
   *
   * Buradaki "pay", kutunun AÇILIŞTAKİ payıydı. Oysa açılış kutusu yalnızca
   * bir arayüz kolaylığı: kullanıcı onu sonradan taşıyıp köşelerinden gerçek
   * alana oturtuyor. Dolayısıyla o paydan çıkarılan katsayı rastgele bir
   * sayıydı ve mesafe okumasını anlamsız kılıyordu.
   *
   * Kameranın gerçek görüş açısını bilmenin tek dürüst yolu, fotoğrafın
   * EXIF'inden ya da kullanıcıdan ayrıca sormaktır; elimizde ikisi de yok.
   * Bu yüzden mesafe ile kutu arasındaki çeviri açıkça ORTALAMA bir kamera
   * varsayımıyla yapılıyor (KADRAJ_KATSAYISI) ve bu yalnızca bir YARDIMCI.
   *
   * ÖLÇÜNÜN KAYNAĞI DEĞİL: gerçek ölçek yalnızca kullanıcının yerleştirdiği
   * dört köşe ile girdiği metreden kuruluyor (bkz. duvarDunyasi). Mesafe o
   * zincirin hiçbir yerinde yok.
   */
  /*
   * MESAFEYİ KİM BELİRLEDİ?
   *
   * Kullanıcı mesafeyi yazdıysa ya da kutuyu elle duvara oturttuysa, ölçek
   * artık ONUN kararı: duvar ölçüsünü sonradan düzeltmesi bu kararı
   * bozmamalı. Değeri biz hesapladıysak (kutuyu fotoğrafa sığdırarak)
   * bağlayıcı değil; duvar ölçüsü değişince yeniden hesaplanıyor.
   *
   * Bu ayrım olmadan, kullanıcı ölçüyü ilk seferde yanlış girip düzeltince
   * kutu bir daha fotoğrafı doldurmuyordu.
   */
  /*
   * Taslak kutu TUVAL pikseli cinsinden: kullanıcı onu fareyle taşıyor ve
   * köşelerinden çekiyor, yani doğrudan ekran koordinatında çalışıyor.
   * Tasarım henüz burada değil — kutu yalnızca DUVARI tanıtıyor. Kullanıcı
   * kutuya tıklayınca dörtgen hedef yüzeye çevriliyor ve tasarım kendi
   * gerçek ölçüsüyle içine yerleşiyor.
   */
  const [taslakKutu, setTaslakKutu] = useState(null)

  /*
   * ÖLÇÜ KUTUSU — fotoğraftaki yerleşim alanı.
   *
   * Yalnızca GERÇEK ölçüsü (santimetre) burada. Kutunun fotoğraftaki dörtgeni
   * ayrı tutuluyor (hedefKose) ve kullanıcı onu köşelerinden serbestçe
   * ayarlıyor — o dörtgen fiziksel bir iddia taşımıyor, görsel yerleşim ve
   * perspektif alanı.
   *
   * Köşe sürüklemek enCm/boyCm'i ASLA değiştirmiyor: fiziksel ölçü yalnızca
   * kullanıcının yazdığı sayıdır.
   */
  const [olcuKutu, setOlcuKutu] = useState(null)
  /*
   * Mekân değişince silinen kutunun kopyası; fotoğrafa geri dönülünce buradan
   * geri konuyor (bkz. "SAHNE DEĞİŞİNCE KUTU KALMIYOR").
   */
  const kutuYedek = useRef(null)
  const [kutuEn, setKutuEn] = useState('')
  const [kutuBoy, setKutuBoy] = useState('')
  /*
   * Bu bölümün kendi mesajı.
   *
   * Hatalar ozelUyari'ya yazılıyordu ama o değer hiçbir yerde çizilmiyor —
   * yani "ölçüyü yaz" uyarısı kullanıcıya hiç ulaşmıyordu. Mesaj artık
   * bölümün kendi içinde gösteriliyor.
   */
  const [kutuMesaj, setKutuMesaj] = useState(null)
  /*
   * REFERANS ÖLÇÜ — FOTOĞRAFIN TEK ÖLÇEK KAYNAĞI.
   *
   * Kullanıcı ölçüm düzleminde iki nokta işaretliyor ve aralarındaki gerçek
   * uzunluğu yazıyor; px/cm buradan çıkıyor (bkz. referansOlcek.js).
   *
   * Bir ara burada EXIF odak uzaklığı + çekim mesafesi vardı. Kullanıcının
   * fotoğraflarının hiçbirinde odak uzaklığı yoktu (WhatsApp EXIF'i siliyor),
   * yani o yol pratikte hiç çalışmadı. Yanında duran "görsel kutu" ve 96 PPI
   * modu ise ölçü OLMADIĞI hâlde ölçü gibi görünüyordu. Üçü de kaldırıldı:
   * tek akış iki nokta referansı.
   *
   * Noktalar normalize FOTOĞRAF koordinatında (0..1) tutuluyor — tuval
   * pikselinde değil; yoksa pencere boyutu ve yakınlaştırma ölçeği
   * değiştirirdi.
   */
  const [refNokta, setRefNokta] = useState([])
  /*
   * DUVAR DİBİ İŞARETLEME.
   *
   * Noktalar oran olarak (fotoğrafın 0..1'i) tutuluyor — referans
   * noktalarıyla aynı kural: pencere boyu değişince ya da sahneye
   * yakınlaşınca işaretler fotoğrafın üstünde durdukları yerde kalıyor.
   */
  const [duvarKipi, setDuvarKipi] = useState(false)
  const [duvarNokta, setDuvarNokta] = useState([])
  /*
   * YERLEŞİM DUVAR DİPLERİNDEN Mİ KURULDU.
   *
   * Açıkken grubun üyeleri liderden TÜRETİLMİYOR; her üyenin kendi
   * duvarına oturan dörtgeni geçerli. Türetme açık kalırsa kendi
   * hesabını yazıp duvarlara oturan dörtgenleri eziyor.
   */
  /*
   * ELLE YERLEŞTİRİLDİ Mİ.
   *
   * Açıkken birleşik grubun üyeleri LİDERDEN türetilmiyor: her ekran
   * kullanıcının koyduğu dört köşede kalıyor. Türetme açık kalırsa
   * kendi hesabını yazıp kullanıcının yerleştirmesini eziyor.
   */
  const [elleYerlesti, setElleYerlesti] = useState(false)
  /*
   * YERLEŞTİRME: taşıma (cm) ve kanat açıları (radyan).
   * Açı listesi boşken tipten türetiliyor; kullanıcı bir kanadı
   * çevirince kendi listesi yazılıyor.
   */
  /*
   * EKRAN EKRAN YERLEŞTİRME.
   *
   * yerSira: o an yerleştirilen ekranın listedeki sırası; null ise
   * yerleştirme bitmiş demektir. yerNokta: o ekran için konan köşeler.
   */
  const [yerSira, setYerSira] = useState(null)
  const [yerNokta, setYerNokta] = useState([])
  /* Hangi ekranlar yerleşti — yerleşmemişin rozeti çizilmiyor. */
  const [yerlesmisIdler, setYerlesmisIdler] = useState([])
  const [refUzunlukCm, setRefUzunlukCm] = useState('')
  /*
   * REFERANS TÜRÜ.
   *
   *   'cizgi'   iki nokta + uzunluk  -> ölçek ve eğim, perspektif YOK
   *   'dortgen' dört köşe + en × boy -> düzlemin tam homografisi, perspektif VAR
   *
   * İki nokta bir yön ve bir uzunluk verir; derinlik hakkında hiçbir şey
   * söylemez. Perspektif ancak ölçüsü bilinen bir dikdörtgenin dört
   * köşesinden çıkıyor (8 bilinmeyen, 4 nokta çifti = 8 denklem).
   *
   * İkisi birden duruyor: elinde uygun bir dikdörtgen yoksa çizgi kipi
   * hâlâ ölçek veriyor.
   */
  /*
   * REFERANS TEK TÜR: İKİ NOKTA.
   *
   * "Dört köşe (perspektif)" seçeneği kaldırıldı: perspektif artık alanın
   * kendi dört köşesinden ve gerçek ölçüsünden çıkıyor, referansın işi
   * yalnızca santim ölçeğini vermek. İki ayrı referans türü kullanıcıya
   * gereksiz bir karar sorduruyordu.
   *
   * Durum duruyor ('cizgi' sabit): refDuzlem ve ona bağlı dallar kodda
   * yerinde kalsın, ileride lazım olursa açılacak yer burası.
   */
  const [refTur, setRefTur] = useState('cizgi')
  const [refBoyCm, setRefBoyCm] = useState('')
  const [refKipi, setRefKipi] = useState(false)
  /*
   * ───────────────────────────────────────────────────────────────────────
   * İKİNCİ REFERANS — ÖLÇÜM TAHMİNE DAYANMASIN.
   *
   * Kamera düz tutulup yalnızca sağa-sola döndüyse duvarın dikey kenarları
   * paralel kalır; o yönün kaçış noktası sonsuza gider ve odak uzaklığı
   * iki kaçış noktasından türetilemez. Odak o zaman TAHMİN ediliyor (~65°
   * görüş açısı) ve hata doğrudan referansa DİK eksene biniyor. Ölçüldü:
   * geniş açılı bir karede 300 cm'lik bir en 380 cm (%+26,7) sanılıyor.
   *
   * İkincisi FARKLI YÖNDE bir bilinen uzunluk: ikisinin düzlemdeki oranı
   * yalnızca odağa bağlı olduğu için odak hesaplanabiliyor
   * (bkz. odakIkiReferanstan). Aynı sahnelerde hata %0,0'a iniyor.
   *
   * İsteğe bağlı: ölçüm zaten kesinse (iki kaçış noktası da varsa) gerek
   * yok ve panelde teklif edilmiyor.
   * ───────────────────────────────────────────────────────────────────────
   */
  /*
   * ───────────────────────────────────────────────────────────────────────
   * FOTOĞRAFIN ODAK UZAKLIĞI — BİR KEZ ÖĞRENİLİYOR.
   *
   * Odak kameraya aittir, alana değil: bir fotoğrafta hangi alanı ölçersen
   * ölç aynıdır. Bir kez hesaplandığında saklanıyor ve o fotoğraftaki BÜTÜN
   * alanlar onunla ölçülüyor — ikinci, üçüncü ekranı işaretlerken ölçüm
   * yeniden tahmine düşmüyor.
   *
   * Nereden geliyor: (1) işaretlenen alanın GERÇEK en/boyu yazıldıysa
   * oradan, (2) ikinci referans verildiyse ondan. İkisi de yoksa tahmin.
   * Fotoğraf değişince ya da baştan başlanınca siliniyor.
   * ───────────────────────────────────────────────────────────────────────
   */
  /* EXIF'ten okunan 35 mm eşdeğeri odak (mm). Yoksa null. */
  const [exif35, setExif35] = useState(null)
  const [fotoOdak, setFotoOdak] = useState(null)
  const [ref2Nokta, setRef2Nokta] = useState([])
  const [ref2UzunlukCm, setRef2UzunlukCm] = useState('')
  const [ref2Kipi, setRef2Kipi] = useState(false)
  /*
   * ───────────────────────────────────────────────────────────────────────
   * ÖLÇÜM İLE AYARLA — YERLEŞİM ALANI DÖRT NOKTAYLA.
   *
   * Referans ölçü fotoğrafın santim ölçeğini veriyor; bu adım ise ekranın
   * NEREYE gireceğini veriyor. Kullanıcı kaplanmasını istediği alanın dört
   * köşesine tıklıyor — iki pencere arası, bir duvar paneli, bir bölüm.
   * İşaretlediği şey kendi gördüğü bir yer, hayal etmesi gereken bir şey yok.
   *
   * Dört nokta aynı zamanda o yüzeyin PERSPEKTİFİNİ de veriyor: ekran alanın
   * düzlemine oturuyor, ayrıca açı aramaya gerek kalmıyor.
   *
   * İŞARETLERKEN TASARIM GİZLİ (bkz. ekranGizle): alanın köşeleri tasarımın
   * altında kalıyor ve ne görünüyor ne tıklanabiliyordu.
   * ───────────────────────────────────────────────────────────────────────
   */
  const [alanKipi, setAlanKipi] = useState(false)
  const [alanNokta, setAlanNokta] = useState([])
  /*
   * İŞARETLENEN ALANIN ÇİZGİSİ GİZLENEBİLİYOR.
   *
   * Çizgi hizayı denetlemek için duruyor ama müşteriye gösterilecek kareyi
   * de kirletiyor. Gizlendiğinde yalnızca GÖRÜNÜMÜ kapanıyor; alan, ölçü ve
   * yerleşim olduğu gibi kalıyor. Düzenleme sırasında (sihirbaz açık ya da
   * bir işaretleme kipi) çizgi her hâlükârda görünüyor: orada işin kendisi o.
   */
  const [cizgiGizli, setCizgiGizli] = useState(false)
  /*
   * ───────────────────────────────────────────────────────────────────────
   * GÖRÜNMEYEN KÖŞEYİ KENARLARINDAN BULMA.
   *
   * Köşe bir sütunun arkasında kalabiliyor ya da kadrajın dışında olabiliyor;
   * o zaman tıklanacak bir piksel yok. Ama köşe iki kenarın KESİŞİMİDİR:
   * kenarların görünen kısımlarından ikişer nokta yetiyor.
   *
   * Üstelik daha doğru: uzun bir kenardan çıkarılan çizgi, köşeye yapılan
   * tek tıklamadan daha az şaşıyor (açı hatası baz uzunluğuyla ters orantılı).
   *
   * Dört nokta: ilk ikisi bir kenar, son ikisi öteki kenar.
   * ───────────────────────────────────────────────────────────────────────
   */
  /*
   * DÜZENLEME Mİ, İLK KURULUM MU.
   *
   * Düzenlemede referans adımlarına (1/4, 2/4) hiç girilmiyor: ölçek zaten
   * kurulu ve onu değiştirmek "Baştan başla"nın işi. İlk kurulumda ise
   * alan adımından geri gitmek referansa dönmek demek.
   */
  /*
   * ───────────────────────────────────────────────────────────────────────
   * GİRİŞ YOLU — "Belirli bir alanım var / yok".
   *
   * İki ayrı iş var ve ikisi farklı bilgi istiyor:
   *
   *   ALANIM VAR  — kullanıcı ekranın gideceği yeri biliyor ve gerçek
   *                 ölçüsünü de biliyor. Dört köşe + en/boy hem ölçeği hem
   *                 perspektifi (odak) veriyor; REFERANS SORULMUYOR.
   *   ALANIM YOK  — önce bilinen bir uzunluk referans olarak işaretleniyor,
   *                 ölçek oradan geliyor; sonra alan işaretleniyor ya da
   *                 tasarım elle yerleştiriliyor.
   *
   * null: fotoğraf yeni yüklendi, seçim bekleniyor.
   * ───────────────────────────────────────────────────────────────────────
   */
  /*
   * ───────────────────────────────────────────────────────────────────────
   * EKRAN YERLEŞİMİ — BİRLEŞTİRME.
   *
   * İki ekranı köşede uç uca getirmek, kenarlarını AYNI yapmak demek. Elle
   * yapılınca birkaç piksel şaşıyor; ekranlardan biri taşınınca da dikiş
   * hemen açılıyor.
   *
   * Grup SAKLANMIYOR, TÜRETİLİYOR: yalnızca duruş ("düz", "L", "U",
   * "kutu", "acili"), açı ve üye sırası tutuluyor. Dörtgenler her çizimde
   * LİDER ekrandan ve her ekranın gerçek santim ölçüsünden hesaplanıyor
   * (bkz. alanOlcu.js grupDortgenleri). Lider nereye giderse grup onunla
   * gidiyor, dikiş hiç açılmıyor.
   *
   * Lider = grubun İLK üyesi. Grup tek parça taşındığı için bir üyeye
   * tıklamak lideri düzenlemeye alıyor; tek tek taşımak için "Ayır".
   * ───────────────────────────────────────────────────────────────────────
   */
  const [grup, setGrup] = useState(null)
  const [grupSecim, setGrupSecim] = useState([])
  const [grupTipi, setGrupTipi] = useState('duz')
  const [grupAcisi, setGrupAcisi] = useState(135)
  /*
   * Kutunun KENDİ metni. Sayıdan ayrı tutuluyor, çünkü yazmaya başlayan
   * kullanıcı önce kutuyu boşaltıyor; boş metin sayı olarak geçersiz ama
   * kutuda bir an duruyor olmalı, yoksa yazmak mümkün olmuyor.
   */
  const [grupAciYazi, setGrupAciYazi] = useState('135')
  /*
   * L YERLEŞİMİNDE SOL KANADIN SÜTUN SAYISI.
   * null ise ekran L değil. Sağ kanat kalan sütunlar.
   */
  const [lSolCols, setLSolCols] = useState(null)
  /* Yerleşim panelinde girilen sol kanat sütunu — henüz uygulanmamış değer. */
  const [lSolSecim, setLSolSecim] = useState(1)
  /*
   * KÖŞE YÖNÜ: 'ice' oda köşesi (ortak kenar uzakta), 'disa' kolon köşesi
   * (ortak kenar en yakın nokta). Panelde seçiliyor, birleşimle saklanıyor.
   */
  const [lYonSecim, setLYonSecim] = useState('ice')
  /* Katlanan TEK ekranın (iç L) kendi yönü. */
  const [lYon, setLYon] = useState('ice')

  const [duzenlemede, setDuzenlemede] = useState(false)
  /*
   * ALANIN KENAR ÇİZGİLERİ — sekiz nokta, ikişerli dört çizgi.
   *
   * Köşelere sırayla tıklamak iki sebeple bırakıldı: sıra hatası dörtgeni
   * bozuyordu ve çoğu fotoğrafta köşenin kendisi görünmüyor (kadrajın
   * dışında, bir eşyanın arkasında ya da duvar orada bitmiyor). Kenar ise
   * neredeyse her zaman görünüyor.
   *
   * Köşeler buradan TÜRETİLİYOR (bkz. alanKenar.js) ve alanNokta'ya
   * yazılıyor; alanNokta hâlâ bütün ölçü ve çizim hesaplarının girdisi.
   * Çizgiler ayrıca saklanıyor ki kullanıcı sonradan uçlarını
   * sürükleyebilsin.
   */
  const [alanCizgi, setAlanCizgi] = useState([])
  /*
   * GÖRÜNMEYEN KÖŞEYİ BULMA — tek köşelik bir alt kip.
   *
   * Varsayılan yol dört köşeye tıklamak. Bir köşe görünmüyorsa (kadrajın
   * dışında, bir eşyanın arkasında ya da duvar orada bitmiyorsa) kullanıcı
   * "Köşe görünmüyor" diyor ve O KÖŞEDE BİRLEŞEN İKİ KENARI işaretliyor:
   * her kenarın görünen parçasından ikişer nokta. İki doğrunun kesişimi o
   * köşe oluyor, köşe listeye ekleniyor ve kip kapanıyor.
   *
   * Dört kenarı birden çizdirmek denenip bırakıldı: görünmeyen şey tek bir
   * köşe, dördünü birden çizdirmek görünen köşeleri de elden çıkarıyordu.
   */
  const [alanKenarKipi, setAlanKenarKipi] = useState(false)
  /*
   * ALANIN ÖLÇÜSÜ ELLE DÜZELTİLEBİLİYOR.
   *
   * Uygulama alanı perspektiften ölçüyor ama işaretleme birkaç santim
   * şaşabiliyor ve sonuç kabin sayısına yansıyor. Kullanıcı gerçek ölçüyü
   * biliyorsa doğrudan yazabilsin: dörtgen ŞEKLİ veriyor, bu sayı ÖLÇÜYÜ.
   * Perspektifle uğraşmak gerekmiyor — işaretlenen dörtgen aynen kalıyor,
   * yalnızca kaç santim olduğu değişiyor.
   *
   * Boş bırakılırsa ölçülen değer kullanılıyor.
   */
  const [alanElleEn, setAlanElleEn] = useState('')
  const [alanElleBoy, setAlanElleBoy] = useState('')
  /*
   * TASARIMIN ALAN İÇİNDEKİ YERİ — alanın birim karesinde merkez (0..1).
   *
   * Ekranın yeri artık piksel kaymasıyla değil, ALANIN KENDİ koordinatıyla
   * tutuluyor. Böylece sürükleme alanın dışına çıkamıyor: değer 0..1
   * aralığına sıkıştırılıyor, gerisini alanın homografisi hallediyor
   * (bkz. alanaYerlestir).
   */
  const [alanKonum, setAlanKonum] = useState({ u: 0.5, v: 0.5 })
  /* "Alana sığdır" basıldıysa ekran alanı dolduruyor; sürükleyince çıkıyor. */
  const [alanDoldur, setAlanDoldur] = useState(false)
  /* Tasarımın alan içindeki ölçüsü; sürükleme bunu koruyor (bkz. alanaYerlestir). */
  const [alanOlcek, setAlanOlcek] = useState(null)

  /*
   * L TİPİNDE YERLEŞİM: KÖŞE ÇİZGİSİ.
   *
   * Düz ekranda yerleşim bir ALAN — dikdörtgen ölçü kutusu kurulup tasarım
   * onun içine oturuyor. L'de yerleşimi belirleyen şey alan değil, ekranın
   * KIRILDIĞI yer: mekânın köşesi. Kullanıcı o köşenin üst ve alt ucunu
   * fotoğrafta işaretliyor, gerçek yüksekliğini yazıyor; L'nin dikişi tam
   * oraya, çizginin ortasına oturuyor.
   *
   * Noktalar 0..1 aralığında FOTOĞRAF koordinatında saklanıyor (referans
   * noktalarıyla aynı gerekçe: tuval pikseli pencereye bağlı).
   */
  const [lKoseNokta, setLKoseNokta] = useState([])
  const [lKoseKipi, setLKoseKipi] = useState(false)
  /*
   * KÖŞENİN TUVALDEKİ KAYMASI.
   *
   * Köşenin yeri ya işaretlenen çizgiden ya da önerilen alandan geliyor; ikisi
   * de bir başlangıç. Kullanıcı tasarımı fotoğrafta gözüyle oturtmak istiyor,
   * bu yüzden kanatlardan tutup taşıyabiliyor. Kayma TUVAL pikseli: ölçeğe ve
   * yazılan santimlere dokunmuyor, yalnızca dikişi yerinden oynatıyor.
   */
  const [lKoseKayma, setLKoseKayma] = useState({ x: 0, y: 0 })
  /*
   * KANATLARIN ELLE EĞİMİ — derece, her kanat için ayrı.
   *
   * Kanadın üst ve alt kenarının nerede buluşacağını fotoğraftan kestiriyoruz
   * (asal nokta, ufuk, izleme mesafesi). Bu kestirim her karede tutmuyor:
   * kamera eğik tutulmuşsa ya da fotoğraf kırpılmışsa kanat duvarın hattından
   * sapıyor ve kullanıcı "alttaki çizgiyle paralel değil" diyor. Bu iki sayı
   * o sapmayı gözle kapatıyor; hesabın yerine geçmiyor, üstüne biniyor.
   * Sıfırda hiçbir etkisi yok, yani varsayılan davranış değişmiyor.
   */
  const [lSolUst, setLSolUst] = useState(0)
  const [lSolAlt, setLSolAlt] = useState(0)
  const [lSagUst, setLSagUst] = useState(0)
  const [lSagAlt, setLSagAlt] = useState(0)
  /*
   * TAŞIMA VARSAYILAN OLARAK KÖŞEYE BAĞLI.
   *
   * Ekran işaretlenen köşeye oturuyor; fareyle her yöne serbest kayması
   * oturduğu köşeden kolayca koparıyordu. Varsayılan artık köşe çizgisi
   * BOYUNCA kaydırmak — yükseklik ayarı. Başka bir yere götürmek gerekiyorsa
   * taşıma tuşu açılıyor.
   */
  const [lTasimaSerbest, setLTasimaSerbest] = useState(false)
  /*
   * Bir dokunuş 2 derece, sınır ±45. Sınır boşuna geniş değil: kullanıcının
   * gönderdiği karede yüzün alt kenarı 1,6 eğimle inerken odanın zemin hattı
   * 0,22 ile iniyordu — aradaki fark 46 derece.
   */
  const EGIM_ADIM = 2
  const EGIM_SINIR = 45
  const [lKoseBoyCm, setLKoseBoyCm] = useState('')
  const [refMesaj, setRefMesaj] = useState(null)
  /*
   * Referans değişti ama kutu eski ölçekle kurulmuş. Kullanıcının yerleşimini
   * ve perspektifini silmemek için kutu KENDİLİĞİNDEN yeniden kurulmuyor;
   * bunun yerine uyarı gösteriliyor.
   */
  const [refEskidi, setRefEskidi] = useState(false)
  /*
   * KUTUYU KONUMLANDIRMA KİPİ.
   *
   * Kip AÇIKKEN kutu tutulabiliyor: gövdesinden taşınıyor, köşelerinden
   * perspektifi ayarlanıyor. Kip KAPALIYKEN kutu yalnızca soluk bir çerçeve
   * — ne gövdesi ne köşeleri tutulabiliyor.
   *
   * İkisini ayırmanın sebebi: tasarım göründükten sonra fotoğraf üzerindeki
   * sürükleme tasarımı taşıyor. Kutu da aynı anda tutulabilir olsaydı hangi
   * şeyin hareket ettiği belirsizdi ve kullanıcı tasarımı taşımak isterken
   * kutunun köşesini çekip AÇIYI bozabilirdi. Açı, kullanıcı bilerek
   * konumlandırma kipine girmeden değişmiyor.
   */
  /*
   * KUTU DÜZENLEME KİPİ: null (kapalı) | 'tasi' | 'eg'
   *
   * Tek bir "konumlandır" kipi vardı ve içinde her şey açıktı: kutuyu yerine
   * koyarken açısı, açısını verirken yeri kayıyordu. İkiye ayrıldı; hangi
   * işin yapıldığı belli ve öteki yanlışlıkla bozulamıyor.
   *
   * SİHİRBAZDA AYRIM YOK ('hepsi'). Orada kullanıcı kutuyu ilk kez kuruyor ve
   * tek bir adımda hem yerine koyması hem oturtması gerekiyor; ikiye bölmek
   * o adıma iki düğme daha eklemek olurdu. Ayrım, kurulmuş bir kutuyu sonradan
   * düzeltirken anlamlı — kazara bozmanın olduğu yer orası.
   */
  /*
   * DÜZLEM KİPİNDE KUTU ÖLÇÜLEN PERSPEKTİFTE Mİ?
   *
   * Dört köşe referansında perspektif ölçülüyor ve kutu o düzleme oturuyor.
   * Eğim düğmesi orada gizliydi — "ölçülmüş bir şeyi elle sıfırlamak yanlış"
   * gerekçesiyle. Ama kullanıcı bazen kutuyu düpedüz düz istiyor; düğmenin
   * hiç olmaması ona o seçeneği kapatıyordu.
   *
   * Artık düzlem kipinde de düğme var ve iki durum arasında gidip geliyor:
   * ölçülen perspektif (true) ↔ eksenlere paralel düz kutu (false).
   */
  const [duzlemeOtur, setDuzlemeOtur] = useState(true)
  const [kutuDuzen, setKutuDuzen] = useState(null)
  const kutuKipi = !!kutuDuzen
  /* Sağ paneldeki "Düzenle" bölümü açık mı? */
  const [duzenleAcik, setDuzenleAcik] = useState(false)
  /*
   * Kutu, referans çizgisinin eğiminde mi doğsun?
   *
   * İki noktadan çıkarılabilen tek açı bu (bkz. referansAcisi): düzlem içi
   * dönme. Duvarın yatay bir kenarı referans alındıysa kutu da o eğimde
   * doğuyor ve kullanıcının elle düzeltmesi gereken iş azalıyor.
   *
   * Kapatılabilir olması şart: köşegen bir mesafe referans alınırsa (örneğin
   * kataloğun köşeden köşeye uzunluğu) o eğim kutuyla ilgisiz olur.
   */
  const [refAciKullan, setRefAciKullan] = useState(true)
  /*
   * KUTUNUN DURUŞU — fareyle verilen perspektif.
   *
   * İki nokta referansı perspektif VERMİYOR; dört köşe referansı veriyor ama
   * her fotoğrafta işaretlenecek düzgün bir dikdörtgen yok. Arası burada:
   * kullanıcı kutunun turuncu tutamağını sürüklüyor, kutu çevriliyor.
   *
   * Açılar burada tutuluyor, dörtgende değil: dörtgen her seferinde bu
   * açılardan yeniden üretiliyor. Böylece sürüklemeler birikmiyor ve şekil
   * her zaman gerçek bir dikdörtgenin izdüşümü kalıyor (bkz. durusKutusu.js).
   */
  const [kutuDurus, setKutuDurus] = useState({ roll: 0, yaw: 0, pitch: 0 })
  /*
   * ÖLÇÜ SİHİRBAZI — kaçıncı adım (0 = kapalı).
   *
   * Dört iş tek blokta duruyordu ve sırası belli olmuyordu: noktaları
   * işaretle, uzunluğu yaz, kutuyu kur, kutuyu yerleştir. Artık her adım
   * sırası gelince fotoğrafın altında kendi kartında çıkıyor.
   *
   * Sağ panel yok olmadı: orada akışın ÖZETİ ve "baştan başla" duruyor, ki
   * sihirbazı kapatan kullanıcı sıkışmasın.
   */
  const [sihirbazAdim, setSihirbazAdim] = useState(0)
  /*
   * Kutu onaylandı mı. Onaydan sonra kutu EKRANDAN KALKMIYOR, yalnızca
   * soluyor: tasarımı taşırken duvarın nerede olduğunu görmek gerekiyor.
   * Önce onayla birlikte siliniyordu ve kullanıcı tasarımı kutusuz bir
   * fotoğrafta sürüklüyordu.
   */
  /*
   * TANITILAN DUVAR — kutu uygulandıktan sonra da saklanıyor.
   *
   * Amaç en baştan şuydu: nesne taramasına gerek kalmadan, yerleştirilecek
   * alanı kullanıcı kendi seçsin ve LED ekranın o duvarda nasıl duracağını
   * görsün. Kutu ölçeği kalibre edip kayboluyordu; duvarın KENDİSİ
   * unutuluyordu. Oysa asıl sorular duvarla ilgili: bu ekran bu duvara
   * sığar mı, kaç kabin girer.
   */
  const [duvarOlcu, setDuvarOlcu] = useState(null)
  /* Yerinde 3B katmanı gerçekten çizebildi mi (bkz. Mekan3D → onHazir). */
  const [uc3dHazir, setUc3dHazir] = useState(false)
  /*
   * Ekran kutusunun kapsayıcıdaki yeri (WallPreview ölçüyor). Fotoğraf
   * sınırı bununla uygulanıyor; hesapla bulmak mümkün değil çünkü duvar
   * kutusu kapsayıcının ortasında durmuyor.
   */
  /*
   * ÖLÇÜM DURUM OLARAK TUTULUYOR (ref değil).
   *
   * Ref'e yazmak yeniden çizim tetiklemiyor. Ölçüm geldiğinde o çizim çoktan
   * eski varsayımla yapılmış oluyordu ve düzeltilmiş başnokta hiçbir zaman
   * kullanılmıyordu — tasarım bu yüzden fotoğrafın solunda kalıyordu.
   *
   * Döngü riski yok: aynı değer ikinci kez geldiğinde yarım pikselin
   * altındaki fark yok sayılıp durum güncellenmiyor.
   */
  /*
   * ÇİZİM DÜZELTMESİ — varsayım değil, ölçüm.
   *
   * Tasarımın hangi başnoktaya göre çizildiğini hesapla bulmaya çalıştım ve
   * tutturamadım; tasarım fotoğrafın dışında kalmaya devam etti. Bu yüzden
   * yöntem değişti: ekranın GERÇEKTE düştüğü yer ölçülüyor, olması gereken
   * yerle farkı alınıyor ve bu fark bir sonraki çizimde kapatılıyor.
   *
   * Döngü olmuyor çünkü fark kapandıkça sıfıra gidiyor; yarım pikselin
   * altındaki fark yok sayılıyor.
   */
  const [cizimDuzeltme, setCizimDuzeltme] = useState({ x: 0, y: 0 })
  /* koseTuval, olması gereken sol üst köşeyi buraya yazıyor (tuval koordinatı). */
  const beklenenKoseRef = useRef(null)
  /* Kaç kez düzeltme denendi — sonsuz döngüye karşı emniyet. */
  const duzeltmeSayaciRef = useRef(0)
  const ekranKutuYeriniYaz = (y) => {
    if (!y) return
    const beklenen = beklenenKoseRef.current
    const ana = tuvalRef.current?.getBoundingClientRect()
    if (!beklenen || !ana) return
    const gercekX = y.sol - ana.left
    const gercekY = y.ust - ana.top
    const dx = beklenen.x - gercekX
    const dy = beklenen.y - gercekY
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return
    /*
     * GÜVENLİK SINIRI. Düzeltme normalde tek adımda kapanır. Kapanmıyorsa
     * ölçüm ile çizim aynı şeyi göstermiyor demektir; sonsuza kadar
     * denemektense durup olduğu gibi bırakmak doğru.
     */
    if (!(Math.abs(dx) < 20000) || !(Math.abs(dy) < 20000)) return
    duzeltmeSayaciRef.current += 1
    if (duzeltmeSayaciRef.current > 8) return
    setCizimDuzeltme((e) => ({ x: e.x + dx, y: e.y + dy }))
  }

  /*
   * ELLE YAPILAN DÜZENLEMEYİ BIRAK.
   *
   * elleKose TUVAL PİKSELİ cinsinden mutlak bir dörtgen ve çizimde her şeyin
   * ÖNÜNDE geliyor: doluysa hedef yüzey, yerleşim önerisi, hatta fotoğrafın
   * kendisi dikkate alınmıyor. Hiçbir yerde temizlenmediği için bir kez köşe
   * ayarına dokunan kullanıcı o dörtgene kilitleniyordu:
   *
   *   • fotoğraf değişince eski dörtgen yeni fotoğrafın üstünde — hatta
   *     dışında — asılı kalıyordu (düz duran bir laptop ekranının yanında
   *     havada duran eğik tasarım tam olarak buydu);
   *   • önerilen yerlerden birine tıklamak hiçbir şeyi değiştirmiyordu,
   *     çünkü elle dörtgen her zaman kazanıyordu. "Yerleşimlerde fark yok"
   *     denmesinin sebeplerinden biri de bu.
   *
   * Bu yüzden yeni bir fotoğraf ya da yeni bir yerleşim kararı elle
   * düzenlemeyi sıfırlıyor: köşe ayarı yalnızca o yerleşime ait.
   */
  const elleDuzenlemeyiBirak = () => {
    setElleKose(null)
    setKilitliKose([])
    setElleAci({ yaw: 0, tilt: 0 })
  }
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
  /* Varsayılan: gövde YOK — ekranların çoğu duvara/panoya monteli. */
  const [kioskVar, setKioskVar] = useState(false)
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

  /*
   * ÇİZİM DÜZELTMESİ YERLEŞİM DEĞİŞİNCE BAŞTAN ÖĞRENİLİR.
   *
   * Tuval ölçüsü de sıfırlıyor: dar/geniş görünüm arasında geçerken
   * yerleşim farkı değişiyor ve düzeltmenin yeniden yakınsaması gerekiyor;
   * sayaç tükenmişse ekran yeni görünümde kaymış kalıyordu.
   *
   * BURADA DURUYOR, YUKARIDA DEĞİL: bağımlılık dizisi tuvalBoyut'u okuyor
   * ve o birkaç satır AŞAĞIDA tanımlıydı. Bir const'u tanımlanmadan okumak
   * çalışma anında hata verir (TDZ) — uygulama açılır açılmaz hata ekranına
   * düşüyordu. Aynı tuzağa bu dosyada daha önce de düşüldü; bağımlılık
   * dizisine bir state eklerken tanımının ÜSTTE olduğu doğrulanmalı.
   */
  useEffect(() => {
    duzeltmeSayaciRef.current = 0
  }, [hedefKose, scene, ozelSahne, tuvalBoyut.w, tuvalBoyut.h])
  const panoSahne = scene === PANO_ID
  const [cizimOlcek, setCizimOlcek] = useState(null)
  const [content, setContent] = useState('led') // led | photo | sample(video) | video | none | upload
  const [contentUrl, setContentUrl] = useState(null)
  /*
   * İÇERİK HAVUZU — bir kez yüklenir, her ekranda kullanılır.
   *
   * Önceden yüklenen dosya doğrudan o anki ekranın içeriği oluyordu ve
   * başka bir ekranda kullanmak için yeniden yüklemek gerekiyordu; üstelik
   * yeni yükleme eskisinin blob adresini serbest bırakıyordu, yani ilk
   * ekranın görseli sessizce ölüyordu. Artık yüklenen havuza giriyor,
   * ekranlar havuzdan seçiyor ve hiçbir adres kendiliğinden bırakılmıyor.
   */
  const [icerikHavuzu, setIcerikHavuzu] = useState([])
  /*
   * "Bölünmüş": bu ekran içeriği, aynı içeriği bölünmüş seçen ÖTEKİ
   * ekranlarla paylaşıyor (bkz. icerikBolme.js). Tek başınaysa etkisi yok.
   */
  /* Havuza yükleme: görsel ve video tek düğmeden geçiyor. */
  const havuzInputRef = useRef(null)
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
    } else {
      /*
       * SESSİZ GERİ YÜKLEME YOK.
       *
       * Sayfa her yeniden açılışta sıfırdan, model seçiminden başlıyor.
       * Üzerinde çalışılan bir düzen varken çıkmak isteyen kullanıcıyı
       * tarayıcının kendi uyarısı durduruyor (bkz. ayrılma uyarısı);
       * uyarıya rağmen çıktıysa karar onundur, eski düzen geri
       * getirilmiyor.
       */
      taslagiSil()
      bekleyenTaslakRef.current = null
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
    setScreenType(t.screenType ?? 'flat')
    setOrientation(t.orientation ?? 'landscape')
    setCurveAmount(t.curveAmount ?? 60)
    setResolution(t.resolution ?? 'FHD')
    setSboxRedundancy(t.sboxRedundancy ?? 'no')
    setHasMiniPc(Boolean(t.hasMiniPc))
    setScene(t.scene ?? 'none')
    setSabitEkranlar(taslakEkranlari(t))
    setLSolCols(t.lSolCols ?? null)
    setLYon(t.lYon ?? 'ice')
    /*
     * KİMLİK VE SIRA GERİ GELİYOR.
     *
     * Elde duran ekran yeni bir kimlikle doğuyordu; birleşim üyelerini
     * kimlikle anlattığı için o düzen bir daha kurulamıyordu. Sıra da
     * yazılmayınca 1'e düşüyor ve listede iki tane "1. ekran" oluyordu.
     */
    if (t.aktifEkranId) setAktifEkranId(t.aktifEkranId)
    setAktifSira(t.aktifSira ?? 1)
    if (t.grup && Array.isArray(t.grup.uyeler) && t.grup.uyeler.length > 1) {
      setGrup(t.grup)
      setGrupSecim(t.grup.uyeler)
      if (t.grup.tip) setGrupTipi(t.grup.tip)
      if (t.grup.aci > 0) {
        setGrupAcisi(t.grup.aci)
        setGrupAciYazi(String(t.grup.aci))
      }
      if (t.grup.lYon) setLYonSecim(t.grup.lYon)
    }
    if (Array.isArray(t.icerikGruplari)) setIcerikGruplari(t.icerikGruplari)
    setContent(t.content ?? 'led')
    // Yüklenen görsel/video geri gelemez (blob adresi ölmüştür) — söyle.
    if (t.icerikDustu) setTaslakUyari('Yüklediğiniz görsel/video geri yüklenemedi; içerik LED yüzeye alındı.')
  }, [displayCabinets, cabinetsLoading])


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
    /* Havuza giriyor: eski adres başka bir ekranda kullanılıyor olabilir. */
    const adres = URL.createObjectURL(file)
    setIcerikHavuzu((l) => [
      ...l,
      { id: 'y' + Date.now() + '-' + l.length, ad: file.name, tip: 'video', url: adres },
    ])
    setContentUrl(adres)
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
    const adres = URL.createObjectURL(file)
    setIcerikHavuzu((l) => [
      ...l,
      { id: 'y' + Date.now() + '-' + l.length, ad: file.name, tip: 'gorsel', url: adres },
    ])
    setContentUrl(adres)
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
      ozelSahneGorsel.current = gorsel
      setOzelInceleniyor(true)
      setOzelUyari(null)
      /*
       * YENİ FOTOĞRAF = YENİ ÖLÇEK.
       *
       * Eski referans buraya ait değil ve ondan türeyen hiçbir şey de öyle:
       * ölçü kutusu, köşe çizgisi, kutunun duruşu, elle verilen köşeler,
       * taşıma kayması, yazılan santimler. Önceden yalnızca referans
       * noktaları ve kutu siliniyordu; köşe çizgisi önceki fotoğraftan
       * kalıyor ve ölçü baştan seçilmemiş oluyordu.
       *
       * Silinen küme "Baştan başla"nınkiyle aynı (bkz. sihirbaziBaslat);
       * tek fark burada fotoğrafın kendisinin de değişmesi.
       */
      /* Referansın kendisi */
      setRefNokta([])
      setRefUzunlukCm('')
      setRefBoyCm('')
      setRefTur('cizgi')
      setRefMesaj(null)
      setRefEskidi(false)
      setRefAciKullan(true)
      /* Referanstan türeyen yerleşim */
      setOlcuKutu(null)
      setTaslakKutu(null)
      setHedefKose(null)
      setHedefTur(null)
      setElleKose(null)
      setDuvarOlcu(null)
      setKutuDurus({ roll: 0, yaw: 0, pitch: 0 })
      setDuzlemeOtur(true)
      setKutuDuzen(null)
      setDuzenleAcik(false)
      kutuYedek.current = null
      setTasarimAcik(false)
      setKutuMesaj(null)
      /* Yazılan ölçüler */
      setKutuEn('')
      setKutuBoy('')
      /* L köşesi: çizgi, yüksekliği, taşıma ve elle taraf seçimi */
      setLKoseNokta([])
      setLKoseBoyCm('')
      setLKoseKayma({ x: 0, y: 0 })
      setLKoseSecim(null)
      setLSolUst(0)
      setLSolAlt(0)
      setLSagUst(0)
      setLSagAlt(0)
      /*
       * EKRANLAR MEKÂNA AİT DEĞİL.
       *
       * Ekran listesi — sayısı, tipi, boyutu, içeriği, birleşimi — bütün
       * mekânlarda ORTAK. Yeni fotoğrafa ait olmayan tek şey ekranların o
       * fotoğraftaki YERİ. Eskiden bütün liste siliniyordu: "Mekân yok"ta
       * kurulan üç ekranlı L düzeni, kendi fotoğrafına geçerken tek ekrana
       * iniyor, birleşim ve görseller yok oluyordu.
       */
      setSabitEkranlar((l) => l.map((x) => ({ ...x, oran: null })))
      /* Duvar dibi noktaları da bu fotoğrafa aitti. */
      setDuvarKipi(false)
      setDuvarNokta([])
      setElleYerlesti(false)
      setAlanKipi(false)
      setAlanNokta([])
      setAlanElleEn('')
      setAlanElleBoy('')
      setAlanKonum({ u: 0.5, v: 0.5 })
      setAlanDoldur(false)
      setAlanOlcek(null)
      /*
       * KALİBRASYON DA YENİ FOTOĞRAFA AİT DEĞİL.
       *
       * Odak uzaklığı kameraya ait ve fotoğraftan fotoğrafa değişiyor. Eski
       * fotoğrafta öğrenilen odak siliniyordu sanıyorduk; silinmiyordu.
       * Sonuç: yeni fotoğrafta kart "iki referanstan hesaplandı" diyor,
       * kullanıcı hiçbir şey vermemiş olmasına rağmen ölçü eski kameranın
       * odağıyla kuruluyordu.
       */
      setDuzenlemede(false)
      /*
       * BİRLEŞİM DE MEKÂNA AİT DEĞİL.
       *
       * Ekran listesiyle aynı kural: birleşim ve içerik bütün mekânlarda
       * ortak, yeni fotoğrafa ait olan tek şey ekranların o fotoğraftaki
       * YERİ. Eskiden grup siliniyor ve ekranlar tek tek kalıyordu.
       */
      setFotoOdak(null)
      /*
       * EXIF ODAĞI — ölçümün kesinliği buna bağlı.
       *
       * Telefonlar çektikleri kareye 35 mm eşdeğeri odağı yazıyor; okunursa
       * kameranın görüş açısı tahmin edilmiyor, biliniyor. WhatsApp ve ekran
       * görüntüleri EXIF'i siliyor, o yüzden okunamaması olağan: orada ikinci
       * referans ya da alanın gerçek ölçüsü devreye giriyor.
       *
       * SIFIRLAMADAN SONRA okunuyor: önce okunup sonra sıfırlanırsa (okuma
       * görüntü yüklenmesinden hızlı bitiyor) değer anında siliniyordu.
       */
      setExif35(null)
      dosya
        .arrayBuffer()
        .then((ab) => setExif35(exif35mmOdak(ab)))
        .catch(() => setExif35(null))
      setRef2Nokta([])
      setRef2UzunlukCm('')
      setRef2Kipi(false)
      setAlanCizgi([])
      /*
       * SİHİRBAZ KENDİLİĞİNDEN AÇILIYOR.
       *
       * Fotoğraf yüklendiğinde yapılacak ilk ve tek iş ölçeği kurmak;
       * kullanıcıyı önce bir "başla" düğmesine bastırmak boş bir adımdı.
       * İşaretleme kipi de birlikte açılıyor ki tıklanacak yer hazır olsun.
       */
      /*
       * İLK ADIM HER ZAMAN REFERANS.
       *
       * Bir ara önce "Belirli bir alanım var / yok" diye soruluyordu ve
       * "var" yolunda referans hiç istenmiyordu. Ölçek o yolda yalnızca
       * elle yazılan en/boydan geliyordu; kullanıcı onu yazana kadar
       * fotoğrafın santim ölçeği YOKTU, dolayısıyla tasarım hiç
       * çizilemiyordu ("Henüz ölçek yok"). Soru kalktı: referans tek ve
       * zorunlu başlangıç, ne yapılacağı ondan SONRA seçiliyor.
       *
       * Referans yalnızca yeni fotoğrafta isteniyor — düzenlemede ve yeni
       * ekran eklerken bir daha sorulmuyor (bkz. duzenlemede,
       * yeniEkranaBasla).
       */
      /* L'de ilk iş köşe çizgisi; referans orada da sorulmuyor. */
      setRefKipi(!lTipiVar)
      setLKoseKipi(lTipiVar)
      setSihirbazAdim(1)
      let kayit = null
      try {
        kayit = await ozelMekanKaydi(url, gorsel, tasarimWm / tasarimHm, ozelMesafeM, tasarimWm, TASLAK_KIPI)
      } finally {
        setOzelInceleniyor(false)
      }
      if (!kayit) return
      /* Yeni fotoğraf, yeni sayfa: önceki fotoğrafın köşe ayarı taşınmıyor. */
      elleDuzenlemeyiBirak()
      // Önceki fotoğrafın adresi bellekte kalmasın
      setOzelSahne((eski) => {
        if (eski?.dosya?.startsWith('blob:')) URL.revokeObjectURL(eski.dosya)
        return kayit
      })
      /*
       * BAŞLANGIÇ MESAFESİ TASARIMA GÖRE.
       *
       * Varsayılan 15 m her fotoğrafa uymuyordu; kullanıcı da elle 1 m gibi
       * bir değer bırakınca tasarım kareyi taşıyordu. Bir ekranı bütün olarak
       * görebilmek için kabaca genişliğinin 1,6 katı kadar geriden bakmak
       * gerekir; kadraj = mesafe × 1,11 olduğundan bu, ekranın kadrajın
       * ~%70'ini kaplaması demek. 2–120 m arasına sıkıştırılıyor.
       */
      /*
       * MESAFE ARTIK TASARIMDAN TÜRETİLMİYOR.
       *
       * Önceki kural "mesafe = tasarım genişliği × 1,6" idi; amaç tasarımın
       * kadraja sığmasıydı. Sonuç: ölçek tasarımı takip ediyordu. 12,8 m'lik
       * bir ekran seçilince fotoğrafın kadrajı 22 m sayılıyor ve 3 metrelik
       * bir ofis duvarı 20 metre gibi ölçekleniyordu — çizim "sığıyormuş"
       * gibi görünüyor ama gerçeği yansıtmıyordu.
       *
       * Ölçek artık yalnızca KULLANICININ verdiği mesafeden geliyor.
       * Tasarım o kadraja sığmıyorsa bu bir hata değil, bilgi: o duvara o
       * ekran gerçekten sığmıyor demektir ve aşağıda uyarı olarak yazılıyor.
       */
      setScene('ozel')
      mekaniOrtala()
      oneriyiUygula(kayit, false)   /* yalnızca adaylar; yerleşim kullanıcıdan */
      /*
       * ÖNCE FOTOĞRAF, SONRA ÖLÇÜ.
       *
       * Fotoğraf ekranda göründükten sonra pop-up açılıyor; kullanıcı
       * duvara BAKARAK ölçüyü ve mesafeyi yazıyor. Bir sonraki çizimde
       * açılsın diye kuyruğa alınıyor, yoksa fotoğraf daha görünmeden
       * pop-up üstüne biniyor.
       */
      if (TASLAK_KIPI) {
        /*
         * YENİ FOTOĞRAF, YENİ ÖLÇEK.
         *
         * Referans o fotoğrafa aittir: başka bir fotoğrafta geçerli değil.
         * Eski taslak/mesafe sorusu da artık sorulmuyor — ölçek referanstan
         * geliyor (bkz. referansOlcek.js).
         */
        setOlcuKutu(null)
        setTaslakKutu(null)
        setHedefKose(null)
        setDuvarOlcu(null)
        /* Yedek de düşüyor: o kutu ESKİ fotoğrafa aitti. */
        kutuYedek.current = null
      }
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
  /*
   * uygula=false → YALNIZCA ADAYLARI GÖSTER.
   *
   * Fotoğraf yüklenir yüklenmez tasarım kendiliğinden birinci adaya
   * oturuyordu; yerleşim yanlışsa kullanıcı önce onu bozmak zorunda
   * kalıyordu. Artık tasarım ortada, kendi düz hâliyle duruyor; aday
   * kareler görünüyor ve yerleşim ancak kullanıcı bir kareye tıklayınca
   * ya da "En uygun yere yerleştir" düğmesine basınca uygulanıyor.
   */
  const oneriyiUygula = (kayit, uygula = true) => {
    const aci = kayit?.aci
    /*
     * TASLAK KİPİNDE EĞİM YOK.
     *
     * Fotoğraf eklenince tasarım kendiliğinden eğik geliyordu: sahnenin
     * kaçış noktasından çıkarılan açı dörtgene biniyordu. Kullanıcı eğimi
     * kendi vermek istiyor — köşelerden ayarlayana kadar ekran düz duracak.
     */
    const saglam =
      !TASLAK_KIPI &&
      aci &&
      aci.guven >= ACI_ESIGI &&
      (Math.abs(aci.yaw) > 1.5 || Math.abs(aci.tilt) > 1.5)
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
    /*
     * "En uygun yere yerleştir" de bir yerleşim kararıdır: elle çizilmiş
     * dörtgen kalırsa düğme hiçbir iş yapmıyormuş gibi görünüyor.
     */
    if (uygula) elleDuzenlemeyiBirak()
    /*
     * Tek aday kalsa bile kare gösteriliyor: kullanıcı nereye konduğunu
     * görüyor ve isterse manuel köşelerle düzeltiyor.
     */
    setAdayKipi(bulunan.length > 0)

    const yuzey = kayit?.yuzey
    if (!uygula) {
      /* Sadece kareler gösterildi; tasarım ortada düz kalıyor. */
      setHedefKose(null)
      setHedefTur(null)
      setKoseKipi(false)
      return
    }
    if (yuzey) {
      setHedefKose(yuzey.koseler)
      setHedefTur('screen')
      setKoseKipi(false)
      /* Ölçüler kullanıcıya ait: burada hiçbir şey değiştirilmiyor. */
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
      /*
       * TASARIMIN SIĞDIĞI YÜZEY SEÇİLİYOR.
       *
       * En yüksek puanlı aday her zaman doğru hedef değil: 10 metrelik bir
       * tasarım, 3 metrelik bir duvar parçasına oturtulunca oraya sıkışmak
       * yerine kadrajı basıyordu. Artık önce ölçüsü YETEN yüzeyler aranıyor;
       * hiçbiri yetmiyorsa en büyüğü kullanılıyor ve kullanıcıya sığmadığı,
       * o yüzeye en fazla kaç metrelik bir ekranın gireceğiyle birlikte
       * söyleniyor (bkz. scene.doesNotFit).
       */
      const olculu = bulunan.map((ad) => ({
        ad,
        olcu: yuzeyOlcusuRef.current?.(ad.koseler, kayit?.kaynak, ozelMesafeM) || null,
      }))
      const sigan = olculu.filter(
        (o) => o.olcu && o.olcu.wm >= tasarimWm * 0.98 && o.olcu.hm >= tasarimHm * 0.98,
      )
      const enBuyuk = olculu
        .filter((o) => o.olcu)
        .sort((x, y) => y.olcu.wm * y.olcu.hm - x.olcu.wm * x.olcu.hm)[0]
      /*
       * FOTOĞRAFTAKİ EKRAN HER ZAMAN ÖNCELİKLİ.
       *
       * Sığma kuralını tek başına uygulayınca, tasarım panodan büyük olduğunda
       * öneri başka bir duvara atlıyordu; kullanıcı ise numaralı listede
       * "Fotoğraftaki pano" yazarken tasarımı başka yerde görüyordu. Pano
       * varsa hedef odur; sığmıyorsa yerleşim yine orada kalır, sığmadığı
       * ayrıca yazılır.
       */
      const pano = bulunan.find((ad) => ad.tur === 'screen')
      const secilen = pano || sigan[0]?.ad || enBuyuk?.ad || bulunan[0] || null
      setHedefKose(secilen?.koseler || null)
      setHedefTur(secilen?.tur || null)
      setKoseKipi(false)
      if (!sigan.length && enBuyuk?.olcu) {
        setSigmazUyari(
          `${t('scene.doesNotFit')} ${enBuyuk.olcu.wm.toFixed(1).replace('.', ',')} × ${enBuyuk.olcu.hm
            .toFixed(1)
            .replace('.', ',')} m`,
        )
      } else {
        setSigmazUyari(null)
      }
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
    /* Mesaj, gerçekten kullanılan hedefe göre: pano mu, boş yüzey mi? */
    setOzelUyari(
      yuzey || bulunan.some((ad) => ad.tur === 'screen')
        ? t('scene.screenSurface')
        : t('scene.noSurface'),
    )
  }

  /* Öneriyi tazele: ölçü ya da alan genişliği değişmiş olabilir. */
  const oneriyiTazele = (alanM = ozelMesafeM) => {
    if (!ozelSahne) return
    const gorsel = new Image()
    gorsel.onload = async () => {
      ozelSahneGorsel.current = gorsel
      setOzelInceleniyor(true)
      let kayit = null
      try {
        kayit = await ozelMekanKaydi(ozelSahne.dosya, gorsel, tasarimWm / tasarimHm, alanM, tasarimWm, TASLAK_KIPI)
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
    /* Sıfırlamada havuz da boşalıyor; adresler burada bırakılıyor. */
    for (const h of icerikHavuzu) if (h.url?.startsWith('blob:')) URL.revokeObjectURL(h.url)
    setIcerikHavuzu([])
    setContentUrl(null)
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

    /*
     * ───────────────────────────────────────────────────────────────────
     * FOTOĞRAFA BAĞLI HER ŞEY DE GİDİYOR.
     *
     * Burada bir ara yalnızca model ve içerik temizleniyordu. Fotoğrafın
     * kendisi, referans ölçeği, işaretlenen alan, sabitlenen ekranlar ve
     * sihirbazın hangi adımda kaldığı state'te duruyordu. Sahne 'none'
     * olduğu için ekranda görünmüyorlardı, ama sonraki kurulumda geri
     * geliyorlardı: eski fotoğrafın ölçeği yenisine uygulanıyor,
     * silindiği sanılan ekranlar listeye dönüyor, sihirbaz yarım bir
     * adımda açılıyordu.
     * ───────────────────────────────────────────────────────────────────
     */
    /* 1) Fotoğraf ve ondan türeyen her şey */
    setOzelSahne(null)
    setOzelUyari(null)
    setOzelNesneler(null)
    setOzelInceleniyor(false)
    setSigmazUyari(null)
    setKenarHarita(null)
    setExif35(null)
    setFotoOdak(null)
    setIsaretZoom(1)
    setIsaretKay({ x: 0, y: 0 })

    /* 2) Referans ve ölçek */
    setRefNokta([])
    setRefUzunlukCm('')
    setRefBoyCm('')
    setRefKipi(false)
    setRefMesaj(null)
    setRefEskidi(false)
    setRef2Nokta([])
    setRef2UzunlukCm('')
    setRef2Kipi(false)

    /* 3) İşaretlenen alan */
    /* Duvar dibi kipi açık kalırsa referans tıklamaları ona gider. */
    setDuvarKipi(false)
    setDuvarNokta([])
    setElleYerlesti(false)
    setAlanKipi(false)
    setAlanNokta([])
    setAlanCizgi([])
    setAlanKenarKipi(false)
    setAlanElleEn('')
    setAlanElleBoy('')
    setAlanKonum({ u: 0.5, v: 0.5 })
    setAlanDoldur(false)
    setAlanOlcek(null)

    /* 4) Tasarımın yeri: elle dörtgen, hedef yüzey, ölçü kutusu */
    setElleKose(null)
    setElleAci({ yaw: 0, tilt: 0 })
    setHedefKose(null)
    setHedefTur(null)
    setKoseKipi(false)
    setTaslakKutu(null)
    setOlcuKutu(null)
    setKutuEn('')
    setKutuBoy('')
    setKutuMesaj(null)
    setKutuDuzen(null)
    setCizimDuzeltme({ x: 0, y: 0 })

    /* Duvar dibi işaretlemesi */
    setDuvarKipi(false)
    setDuvarNokta([])
    setElleYerlesti(false)

    /* 5) L köşesi */
    setLKoseKipi(false)
    setLKoseNokta([])
    setLKoseBoyCm('')

    /* 6) Ekranlar ve gruplar */
    setSabitEkranlar([])
    setAktifEkranId(null)
    setAktifSira(1)
    setGrup(null)
    setGrupSecim([])

    /* 7) Sihirbaz: hiçbir adımda değil */
    setSihirbazAdim(0)
    setDuzenlemede(false)
    setTasarimAcik(false)
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
    /*
     * Model yoksa kabin ölçüsü de yok, sığdırılacak bir şey yok. Eskiden
     * burada üst sınıra atlanıyordu; sınır duvardan geldiği için bu "duvarı
     * doldur" anlamına geliyordu. Sınır artık donanım sınırı (200), ona
     * atlamak saçma olurdu.
     */
    if (!m) return

    const { yatay, dikey } = yerlesimSecenekleri(m, width, height)

    /*
     * EŞİTLİKTE YATAY KAZANIYOR.
     *
     * Kabin döndüğünde piksel sayısı değişmiyor, yalnızca yer değiştiriyor;
     * bu yüzden iki dizilim sık sık BİREBİR aynı çıkıyor. Eşitlikte seçim
     * kullanıcının o anki yön ayarına bırakılmıştı ve tasarım sebepsiz yere
     * dikeye dönebiliyordu. Eşitlik bir üstünlük değil: yatay varsayılan
     * kalıyor, dikeye geçmek isteyen YAPILANDIRMA kartından seçiyor.
     */
    const dikeySec = dikey.piksel > yatay.piksel
    const kazanan = dikeySec ? dikey : yatay

    setOrientation(dikeySec ? 'portrait' : 'landscape')
    setCols(kazanan.cols)
    setRows(kazanan.rows)
  }


  /*
   * PANONUN GERÇEK ÖLÇÜSÜ (metre) — fotoğrafın ölçeğinden.
   *
   * Kadrajın kapsadığı genişlik = çekim mesafesi × 1,11 (bkz. ozelMekan.js).
   * Yüzeyin kadrajdaki payı da onun metre karşılığını veriyor. Yükseklik,
   * dörtgenin fotoğraf pikselindeki en/boy oranından çıkıyor.
   */
  const yuzeyOlcusu = (koseler, kaynak, mesafeM) => {
    /* Ölçü hesabı tek yerde; öneri akışı buna ref üzerinden ulaşıyor. */
    if (!Array.isArray(koseler) || koseler.length !== 4 || !kaynak?.w || !kaynak?.h) return null
    const px = koseler.map((k) => ({ x: k.x * kaynak.w, y: k.y * kaynak.h }))
    const en =
      (Math.hypot(px[1].x - px[0].x, px[1].y - px[0].y) +
        Math.hypot(px[2].x - px[3].x, px[2].y - px[3].y)) / 2
    const boy =
      (Math.hypot(px[3].x - px[0].x, px[3].y - px[0].y) +
        Math.hypot(px[2].x - px[1].x, px[2].y - px[1].y)) / 2
    if (!(en > 0) || !(boy > 0)) return null
    const wm = (en / kaynak.w) * kadrajGenisligi(mesafeM)
    return { wm, hm: wm * (boy / en) }
  }

  yuzeyOlcusuRef.current = yuzeyOlcusu

  /*
   * SEÇİLEN YÜZEYİN GERÇEK ÖLÇÜSÜ — MESAFENİN TÜREVİ.
   *
   * Ölçek tek bir şeyden geliyor: fotoğrafın kaç metreden çekildiği.
   * Kadrajın kapsadığı genişlik = mesafe × 1,11; yüzeyin kadrajdaki payı da
   * metre karşılığını veriyor. Yani "şu yüzey 2 m" demek ancak mesafeyle
   * birlikte anlamlı.
   *
   * Önceden ölçü seçim ânında hesaplanıp saklanıyordu; kullanıcı sonradan
   * mesafeyi düzeltince panelde eski (ve gerçekte olmayan) ölçü kalıyordu —
   * 1 metreden çekilmiş bir fotoğrafta 1,99 m'lik yüzey gibi. Artık her
   * mesafe değişiminde yeniden hesaplanıyor.
   */
  const secilenYuzeyOlcu = useMemo(() => {
    if (scene !== 'ozel' || !ozelSahne || !hedefKose) return null
    const o = yuzeyOlcusu(hedefKose, ozelSahne?.kaynak, ozelMesafeM)
    return o && o.wm > 0.05 && o.hm > 0.05 ? o : null
    /* yuzeyOlcusu saf bir hesap; bağımlılığa gerek yok. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, ozelSahne, hedefKose, ozelMesafeM])

  /* Tasarımı panonun ölçüsüne getirir ve kabin sayısını yeniden dağıtır. */
  const olculeriPanoyaUydur = (koseler) => olculeriPanoyaUydurIle(koseler, ozelSahne?.kaynak)
  const olculeriPanoyaUydurIle = (koseler, kaynak) => {
    const olcu = yuzeyOlcusu(koseler, kaynak, ozelMesafeM)
    if (!olcu || !(olcu.wm > 0.1) || !(olcu.hm > 0.1)) return null
    const w = Math.min(20, Math.round(olcu.wm * 100) / 100)
    const h = Math.min(20, Math.round(olcu.hm * 100) / 100)
    setWidth(w)
    setHeight(h)
    if (selectedModel) {
      const { yatay, dikey } = yerlesimSecenekleri(selectedModel, w, h)
      /*
     * EŞİTLİKTE YATAY KAZANIYOR.
     *
     * Kabin döndüğünde piksel sayısı değişmiyor, yalnızca yer değiştiriyor;
     * bu yüzden iki dizilim sık sık BİREBİR aynı çıkıyor. Eşitlikte seçim
     * kullanıcının o anki yön ayarına bırakılmıştı ve tasarım sebepsiz yere
     * dikeye dönebiliyordu. Eşitlik bir üstünlük değil: yatay varsayılan
     * kalıyor, dikeye geçmek isteyen YAPILANDIRMA kartından seçiyor.
     */
    const dikeySec = dikey.piksel > yatay.piksel
      const kazanan = dikeySec ? dikey : yatay
      setOrientation(dikeySec ? 'portrait' : 'landscape')
      setCols(kazanan.cols)
      setRows(kazanan.rows)
    }
    return { w, h }
  }
  olculeriPanoyaUydurRef.current = (koseler, kayit) => {
    const olcu = olculeriPanoyaUydurIle(koseler, kayit?.kaynak || ozelSahne?.kaynak)
    setOzelUyari(
      olcu
        ? `${t('scene.fillResized')} ${olcu.w.toFixed(2).replace('.', ',')} × ${olcu.h
            .toFixed(2)
            .replace('.', ',')} m`
        : t('scene.screenSurface'),
    )
  }

  const hasModel = !!selectedModel

  /*
   * SAYFADAN AYRILMA UYARISI.
   *
   * Tasarım hiçbir yere kaydedilmiyor; sayfa kapanınca ya da yenilenince
   * kayboluyor. Kullanıcı bunu yanlışlıkla yapabilir — tarayıcının kendi
   * onayı araya giriyor. Yalnızca üzerinde çalışılan bir düzen varken,
   * yani model seçiliyken: boş sayfadan çıkarken soru sormak gereksiz.
   *
   * Metni tarayıcı yazıyor; returnValue'ya verilen değer çoğu tarayıcıda
   * yok sayılıyor ama uyarının çıkması için atanması gerekiyor.
   */
  useEffect(() => {
    if (!hasModel) return undefined
    const ayrilirken = (olay) => {
      olay.preventDefault()
      olay.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', ayrilirken)
    return () => window.removeEventListener('beforeunload', ayrilirken)
  }, [hasModel])
  const category = selectedModel?.category || 'led'
  const isVideoWall = category === 'videowall'
  /*
   * DİKEY YERLEŞİM HER MODELDE.
   *
   * LED kabin ve paneller de dikey kurulabiliyor (asansör holü, vitrin
   * kolonu, tabela). Kullanıcı yatay/dikey kartından birini seçer; "Duvara
   * sığdır" hâlâ piksel sayısı yüksek olanı otomatik uygular.
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
  const { preview: hwPreview, error: hwMatchError } = useConfigurationPreview({
    cabinId: selectedModel?.id,
    cols,
    rows,
    hasMiniPc,
    enabled: !!selectedModel?.id,
  })

  const cwM = (previewModel?.widthMm || 500) / 1000
  const chM = (previewModel?.heightMm || 500) / 1000
  // Kabin ölçüsü mm olarak — sütun/satır altındaki hesap satırı için
  const kabinWmm = previewModel?.widthMm || 500
  const kabinHmm = previewModel?.heightMm || 500
  // EPS: 4,8 / 0,32 kayan noktada 14,999... çıkıyor; küçük tolerans olmadan
  // tam sığan son kabin sayılmıyor.
  const EPS = 1e-9
  /* Duvar ölçüsünden bağımsız — bkz. EN_COK_KABIN_EKSEN. */


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
  /*
   * TASARIMIN FİZİKSEL ÖLÇÜSÜ = KABİN SAYISI × KABİN ÖLÇÜSÜ. BAŞKA HİÇBİR ŞEY.
   *
   * Burada eskiden duvar/kutu ölçüsüne kırpma vardı:
   *   Math.min(width, cols * cwM)
   * Bu mantık hatasıydı. 30 cm'lik bir alana 32 cm'lik bir kabin koyunca
   * tasarım 30 cm'e iniyordu: fotoğrafta kabin alana tam oturuyor gibi
   * görünüyor, oysa gerçekte 2 cm taşıyor. Yani ekran tam da kullanıcının
   * görmesi gereken şeyi — sığmadığını — gizliyordu.
   *
   * Kabin bölünemeyen bir donanım; ölçüsü duvara göre esnemez. Duvar
   * küçükse tasarım taşar ve taşması GÖRÜNÜR (bkz. mekanDuvarWm: duvar
   * tasarımı içerecek kadar büyür, WallPreview'daki wallWm ile aynı kural).
   * Kaç tam kabinin sığdığı ayrı bir hesap ve yerinde duruyor:
   * tasarimiDuvaraSigdir / colsMax.
   */
  const ekranWm = Math.max(1, cols) * cwM
  const ekranHm = Math.max(1, rows) * chM

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
  /*
   * GÖRSELİ PAYLAŞAN EKRAN KÜMELERİ.
   *
   * İki kaynak: birleşik grup ("Tek görsel" açıkken) ve tasarım alanında
   * seçilip ortak görsel verilen ekranlar. Bir ekran en çok bir kümede.
   */
  const paylasimKumeleri = (() => {
    const kumeler = []
    if (grup?.tekGorsel !== false && Array.isArray(grup?.uyeler) && grup.uyeler.length > 1) {
      kumeler.push(grup.uyeler)
    }
    for (const k of icerikGruplari) if (Array.isArray(k) && k.length > 1) kumeler.push(k)
    return kumeler
  })()
  const paylasimKumesi = (id) => (id ? paylasimKumeleri.find((k) => k.includes(id)) || null : null)

  /*
   * TASARIMDAKİ BÜTÜN EKRANLAR — fotoğrafsız şerit için.
   *
   * Liste ekran kayıtlarından ve elde duran ekrandan kuruluyor; ayrıca bir
   * "çoklu ekran" durumu tutulmuyor (tek sistem). Her parçanın ölçüsü
   * KENDİ yönünden türüyor.
   */
  const ekranParcalariHam = [
    ...sabitEkranlar.map((e, i) => ({ id: e.id, sira: e.sira || i + 1, ...(e.ayar || {}) })),
    /*
     * İÇERİK DE BURADA. Eksik kalınca parça "içerik yok" sayılıyor ve
     * elde duran ekran, kartında görsel seçili olmasına rağmen tasarım
     * alanında simsiyah çiziliyordu.
     */
    { id: aktifEkranId, sira: aktifSira, cols, rows, orientation, screenType, lSolCols, lYon, content, contentUrl },
  ]
    .sort((a, b) => (a.sira || 0) - (b.sira || 0))
    .map((e) => {
      const dikey = e.orientation === 'portrait'
      const kw = ((dikey ? selectedModel?.heightMm : selectedModel?.widthMm) || 500) / 1000
      const kh = ((dikey ? selectedModel?.widthMm : selectedModel?.heightMm) || 500) / 1000
      const c = Math.max(1, e.cols || 1)
      const r = Math.max(1, e.rows || 1)
      const sol = e.lSolCols ? Math.max(1, Math.min(c - 1, e.lSolCols)) : null
      return {
        id: e.id,
        /* Sıra numarası: panelde ve yerleştirme listesinde aynı numara. */
        sira: e.sira,
        cols: c,
        rows: r,
        type: e.screenType || 'flat',
        leftCols: sol || undefined,
        rightCols: sol ? c - sol : undefined,
        lYon: e.lYon || 'ice',
        wm: c * kw,
        hm: r * kh,
        /* Her parça KENDİ içeriğini taşıyor: önizlemede hepsi aynı
           görseli göstermesin. */
        content: e.content || 'led',
        contentUrl: e.contentUrl || null,
        /*
         * PAYLAŞIM KÜMESİ — görsel yalnızca bu küme boyunca yayılıyor.
         * Kümede olmayan ekran görseli kendi tamamında gösteriyor ve
         * toplam genişlik hesabına girmiyor.
         */
        paylasim: paylasimKumesi(e.id)?.join(',') || null,
      }
    })

  /*
   * PAYLAŞIM KÜMESİNDE İÇERİK ORTAK.
   *
   * "Tek görsel" açık bir birleşimde görsel çoğu zaman tek bir ekranın
   * kartından veriliyor; ötekiler kendi kaydındaki "led" ile kalıyor ve
   * tasarımda SİMSİYAH çiziliyordu. Kart "birleşimin görseli
   * kullanılıyor" dediği hâlde ekranda görünen buydu.
   *
   * İçeriği ekrandan değil KÜMEDEN okumak doğrusu: kümede içerik veren
   * ilk ekran kümenin içeriğidir ve bütün üyeler onu gösterir. Buradan
   * türeyen her şey (şerit, 3B, fotoğraf, PDF) kendiliğinden düzeliyor.
   */
  const ekranParcalari = (() => {
    const kumeIcerigi = new Map()
    for (const p of ekranParcalariHam) {
      if (!p.paylasim || kumeIcerigi.has(p.paylasim)) continue
      if (p.content && p.content !== 'led' && p.content !== 'none') {
        kumeIcerigi.set(p.paylasim, { content: p.content, contentUrl: p.contentUrl })
      }
    }
    if (kumeIcerigi.size === 0) return ekranParcalariHam
    return ekranParcalariHam.map((p) =>
      p.paylasim && kumeIcerigi.has(p.paylasim) ? { ...p, ...kumeIcerigi.get(p.paylasim) } : p,
    )
  })()

  /*
   * KABİN ÖLÇÜSÜ — ekranın duruşuna göre.
   * Dikey duran ekranda kabinin eni ile boyu takas oluyor.
   */
  const kabinEnM = ((orientation === 'portrait' ? selectedModel?.heightMm : selectedModel?.widthMm) || 500) / 1000
  const kabinBoyM = ((orientation === 'portrait' ? selectedModel?.widthMm : selectedModel?.heightMm) || 500) / 1000
  /* Yan yana duran öteki ekranlar duvardan yer kaplıyor. */
  const digerlerininEni = ekranParcalari
    .filter((x) => x.id !== aktifEkranId)
    .reduce((t, x) => t + (x.wm || 0), 0)
  /*
   * SINIR DUVARDAN GELİYOR.
   *
   * Eskiden yalnızca kabin sayısının üst sınırı vardı ve tasarım duvarı
   * rahatça aşabiliyordu. Sığmayan bir tasarım ne üretilebilir ne de
   * doğru çizilir.
   */
  const colsMax = Math.max(
    1,
    Math.min(EN_COK_KABIN_EKSEN, Math.floor(((width || 0) - digerlerininEni) / kabinEnM + 1e-6)),
  )
  /*
   * BİRLEŞİMİN DÜZLEMDEKİ GEOMETRİSİ.
   *
   * Ekranlar üstten bakışta kırık bir çizgi: her eklemde aynı açıyla
   * dönüyorlar. Zincir simetrik kuruluyor, yani köşeye tam çaprazdan
   * bakılıyor ve yüzler eşit açıyla görünüyor.
   *
   * Her ekran için iki şey çıkıyor:
   *   olcek  — genişliğin çizimdeki kısalma oranı (açısının kosinüsü),
   *   kırım  — her KENARIN derinliğine göre kısalması (uzak kenar kısa).
   *
   * Kosinüs sıfıra inince kanat çizgi hâline geliyor; alt sınır var ki
   * kullanıcı ekranın orada olduğunu görebilsin.
   */
  const birlesimGeometrisi = (uyeParcalari, aciGirdi, yon) => {
    const n = uyeParcalari.length
    if (n < 2) return new Map()
    const d = yon === 'disa' ? 1 : -1
    /*
     * HER EKLEMİN KENDİ AÇISI.
     *
     * Tek bir açı bütün eklemlere uygulanıyordu; üç ekranlı bir dizide
     * iki köşenin farklı açıda olması mümkün değildi. Girdi dizi ise her
     * eklem kendi açısını kullanıyor, tek sayı ise hepsi aynı (eski
     * davranış).
     *
     * Zincir simetrik kuruluyor: toplam kırılmanın yarısı kadar geriden
     * başlıyor, böylece köşeye tam çaprazdan bakılıyor.
     */
    const eklemAcilari = Array.from({ length: n - 1 }, (_, j) =>
      Array.isArray(aciGirdi) ? aciGirdi[j] ?? 135 : aciGirdi || 0,
    )
    const kirilmalar = eklemAcilari.map((a) => (((Array.isArray(aciGirdi) ? 180 - a : a) || 0) * Math.PI) / 180)
    const toplam = kirilmalar.reduce((t, k) => t + k, 0)
    const acilar = []
    let gecerli = (-toplam / 2) * d
    for (let k = 0; k < n; k++) {
      acilar.push(gecerli)
      if (k < kirilmalar.length) gecerli += kirilmalar[k] * d
    }
    /* Düzlemdeki köşe noktaları; derinlik y ekseni (büyük y = uzak). */
    let x = 0
    let y = 0
    const koseler = [{ x, y }]
    uyeParcalari.forEach((u, k) => {
      x += Math.cos(acilar[k]) * u.wm
      y += Math.sin(acilar[k]) * u.wm
      koseler.push({ x, y })
    })
    const derinlikler = koseler.map((k) => k.y)
    const enAz = Math.min(...derinlikler)
    const aralik = Math.max(...derinlikler) - enAz
    const kirim = (dy) => (aralik > 1e-6 ? (L_KIRILMA_PCT * (dy - enAz)) / aralik : 0)
    const harita = new Map()
    uyeParcalari.forEach((u, k) => {
      harita.set(u.id, {
        /* Düzlemdeki açı: tasarım ekranı ekranı bununla gerçekten döndürüyor. */
        yon: acilar[k],
        olcek: Math.max(0.4, Math.abs(Math.cos(acilar[k]))),
        solKirim: kirim(koseler[k].y),
        sagKirim: kirim(koseler[k + 1].y),
      })
    })
    return harita
  }

  /*
   * ŞERİT: her ekran kendi ölçüsüyle, birleşimdekiler kırımıyla.
   * Eskiden L tek bir "katlanmış ekrana" indirgeniyor ve ekranların
   * satır sayısı en büyüğüne eşitleniyordu; 1×1'lik ekran 4×4'lük
   * komşusuyla aynı yükseklikte çiziliyordu.
   */
  const ekranSeridi = (() => {
    const uyeler = Array.isArray(grup?.uyeler) ? grup.uyeler : null
    if (!uyeler || uyeler.length < 2) return ekranParcalari
    const uyeSayisi = uyeler.length
    /*
     * L'DE TEK KÖŞE VAR.
     *
     * Açı bütün eklemlere uygulanınca üç ekranlı bir L, iki köşeden
     * kırılıp U'ya dönüşüyordu; tasarım ekranında ikisi birbirinden
     * ayırt edilemiyordu. L'de yalnızca bir eklem dönüyor, ötekiler düz
     * (180°) kalıyor; köşe de diziyi en dengeli bölen yere düşüyor.
     *
     * U'da iki uç eklem 90° dönüyor, aradakiler düz: arka ekran kaç
     * parçadan oluşursa oluşsun iki kol baştan ve sondan çıkıyor.
     */
    const aci =
      grup.tip === 'duz'
        ? 0
        : grup.tip === 'acili'
          ? Array.isArray(grup.eklemler)
            ? grup.eklemler.map((e) => e?.aci ?? 135)
            : grup.aci || 135
          : grup.tip === 'l'
            ? Array.from({ length: uyeSayisi - 1 }, (_, j) =>
                j === Math.max(0, Math.round(uyeSayisi / 2) - 1) ? 90 : 180,
              )
            : grup.tip === 'u'
              ? Array.from({ length: uyeSayisi - 1 }, (_, j) =>
                  j === 0 || j === uyeSayisi - 2 ? 90 : 180,
                )
              : 90
    const uyeParcalari = uyeler.map((id) => ekranParcalari.find((x) => x.id === id)).filter(Boolean)
    if (uyeParcalari.length < 2) return ekranParcalari
    const geo = birlesimGeometrisi(uyeParcalari, aci, grup.lYon || 'ice')
    return ekranParcalari.map((x) => (geo.has(x.id) ? { ...x, ...geo.get(x.id) } : x))
  })()

  /*
   * Fotoğraf akışında ekranlar tek tek yerleşiyor ve her biri kendi
   * dörtgeniyle çiziliyor; şerit yalnızca fotoğrafsız sahnelerde anlamlı.
   */
  const cokluAktif = scene !== 'ozel' && ekranParcalari.length > 1
  const tasarimWm = cokluAktif ? ekranParcalari.reduce((t, s) => t + s.wm, 0) : ekranWm
  const tasarimHm = cokluAktif ? Math.max(...ekranParcalari.map((s) => s.hm)) : ekranHm

  /*
   * BU BLOK TASARIM ÖLÇÜSÜNÜN TANIMINDAN SONRA DURMAK ZORUNDA.
   *
   * Aşağıdaki useEffect'in bağımlılık dizisi tasarimWm/tasarimHm'i ÇİZİM
   * SIRASINDA okuyor. Blok yukarıdayken bu değişkenler henüz tanımlanmamış
   * oluyordu ve uygulama açılışta "Bir şeyler ters gitti" ekranına düşüyordu.
   */
  /*
   * ADAYLARI TAZELE — YERLEŞİME DOKUNMADAN.
   *
   * Aday kareleri artık tasarımın gerçek ölçüsünde çiziliyor; kabin sayısı
   * ya da mesafe değişince o kareler de değişmeli. Ama bu bir "yeniden
   * yerleştir" değil: kullanıcının seçtiği yüzey olduğu gibi kalıyor,
   * yalnızca öneri kareleri yeni ölçüye göre aranıyor.
   *
   * Ağır modeller önbellekte olduğu için bu arama saniyenin altında
   * sürüyor; "inceleniyor" katmanı bu yüzden gösterilmiyor.
   */
  const adaylariTazele = async () => {
    const gorsel = ozelSahneGorsel.current
    if (!ozelSahne || !gorsel) return
    try {
      const kayit = await ozelMekanKaydi(
        ozelSahne.dosya,
        gorsel,
        tasarimWm / tasarimHm,
        ozelMesafeM,
        tasarimWm,
        TASLAK_KIPI,
      )
      if (kayit) setOzelSahne(kayit)
    } catch {
      /* tazeleme başarısızsa eski kareler kalsın */
    }
  }
  const adaylariTazeleRef = useRef(null)
  adaylariTazeleRef.current = adaylariTazele
  useEffect(() => {
    if (scene !== 'ozel' || !ozelSahne?.dosya) return undefined
    /* Artı/eksi düğmesine üst üste basılırken her tıkta aramaya gerek yok. */
    const zaman = setTimeout(() => adaylariTazeleRef.current?.(), 450)
    return () => clearTimeout(zaman)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasarimWm, tasarimHm, ozelMesafeM, scene, ozelSahne?.dosya])

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
   * Duvara sığan yatay/dikey dizilim seçenekleri.
   * Kartlara tıklanınca oryantasyon + sütun/satır uygulanır.
   */
  /*
   * DİZİLİM KARTLARI ÖLÇÜLEN DUVARA GÖRE.
   *
   * Kartlar sol paneldeki "Duvar" ölçüsünden hesaplanıyordu; o alan kendi
   * fotoğrafıyla ilgisiz, varsayılanı 1 × 1 metre. Kullanıcı fotoğrafta 30 × 21
   * santimlik bir alan ölçtükten sonra "maksimum kapasite" kartına basınca
   * 3 × 6 dizilim, yani 0,96 × 0,96 metrelik bir tasarım seçiliyordu: ölçtüğü
   * alanın üç katı. Tasarım fotoğrafı baştan aşağı kaplıyor ve öyle kalıyordu.
   *
   * Fotoğrafta ölçülmüş bir alan varsa kartlar ONA göre hesaplanıyor. Ölçü
   * kutusu hâlâ seçimi ENGELLEMİYOR (bkz. EN_COK_KABIN_EKSEN yorumu) —
   * sütun/satır elle istenildiği kadar artırılabiliyor; değişen tek şey,
   * kartların önerdiği dizilimin artık gerçekten o duvara ait olması.
   */
  /*
   * KARTLAR DÜĞMEYLE AYNI DUVARA BAKIYOR.
   *
   * Bir ara kartlar ölçü kutusuna (duvarOlcu) göre hesaplanmıştı. Niyet
   * iyiydi ama yanlıştı: hemen yanlarındaki "Duvara sığdır" düğmesi SOL
   * PANELDEKİ Duvar ölçüsünü kullanıyor. İkisi ayrışınca kartta yazan
   * dizilim ile düğmenin uyguladığı dizilim farklı çıkıyordu.
   *
   * Bu bölümün işi tek cümleyle: SOL PANELDEKİ duvara en çok LED'i
   * yerleştirmek ve yatay/dikey dizilimi karşılaştırmak. Ölçü kutusuyla
   * karşılaştırma ayrı bir iş ve sağ paneldeki "Tasarımı duvara tam sığdır"
   * onu yapıyor; taşma da taramayla işaretleniyor.
   */

  /*
   * L TİPİ EKRANDA KİOSK ÇİZİLMİYOR.
   *
   * L ekran köşeye giydirilen bir yüzey: iki duvarı ya da bir sütunu
   * sarıyor. Altına kasa, direk ve kaide çizmek yanlış bir ürün gösteriyordu
   * — o gövde dik dörtgen bir totem varsayıyor ve L'nin çıkıntısıyla
   * çakışıyor. Bu yüzden L varken mekân yalnızca ekranı çiziyor.
   */
  const lTipiVar = cokluAktif
    ? ekranParcalari.some((s) => (s.type || 'flat') === 'lshape')
    : (screenType || 'flat') === 'lshape'

  const ekranSekli = useMemo(() => {
    if (!(tasarimWm > 0) || !(tasarimHm > 0)) return null
    // Tek ekranda da tür bilgisi var; çoklu ekranda her ekranın kendi türü
    const parcalar = cokluAktif
      ? ekranParcalari.map((s) => ({ cols: s.cols, rows: s.rows, type: s.type, leftCols: s.leftCols, rightCols: s.rightCols }))
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
  }, [cokluAktif, ekranParcalari, cols, rows, screenType, curveAmount, tasarimWm, tasarimHm, cwM, chM])

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
      ? ekranParcalari.map((s) => ({ cols: s.cols, type: s.type, leftCols: s.leftCols, rightCols: s.rightCols }))
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
  }, [cokluAktif, ekranParcalari, cols, screenType, tasarimWm])

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
  /* Otomatik mesafenin üst sınırı — varsayılan kadraj bununla kuruluyor. */
  const OTO_EN_COK_M = 22
  /*
   * ELLE AYARDA ÜST SINIR 60 m.
   *
   * 22 metrede arka plan küçülmeyi bırakıyordu: sebebi, fotoğrafın küçülünce
   * kenarlarda boş şerit bırakmasıydı. O boşluk artık fotoğrafın kendisinin
   * büyütülüp bulanıklaştırılmış kopyasıyla dolduruluyor (bkz. PanoFoto
   * "KENAR TAMAMLAMA"), dolayısıyla sınırı tutmanın karşılığı kalmadı;
   * kullanıcı 60 metreye kadar gerçekten uzaklaşabiliyor. Otomatik mesafe
   * ise 22'de kalıyor ki varsayılan görünüm değişmesin.
   */
  const ZOOM_EN_COK_M = 60
  const otoIzlemeM = useMemo(() => {
    const baskin = Math.max(tasarimWm, tasarimHm)
    const modelin = viewingDistanceFor(selectedModel, cols, rows) || 0
    const ham = Math.max(baskin * 4.5, modelin)
    return Math.min(OTO_EN_COK_M, Math.max(OTO_EN_AZ_M, ham))
  }, [tasarimWm, tasarimHm, selectedModel, cols, rows])

  /** Yururlukteki mesafe: elle secildiyse o, yoksa otomatik hesap. */
  const izlemeMesafesi = izlemeM != null ? izlemeM : otoIzlemeM

  /*
   * İZLEME MESAFESİ — AVM VE ŞEHİR MEYDANINDA BİLGİ, AYAR DEĞİL.
   *
   * Bu iki sahnede duvar dokuz dilimle esniyor; ölçeği duvarın kendisi
   * taşıyor ve yakınlaştırma hesabı onlar için zaten sabitleniyor
   * (bkz. sahneYakinlik: duvarKutu olan sahnede yakınlık 1'e sabitleniyor). Yani
   * paneldeki mesafe alanı orada hiçbir şey yapmıyordu; çalışmayan bir
   * düğme, bozuk bir düğmeden beterdir.
   *
   * Yerine gerçekten işe yarayan bilgi konuyor: SEÇİLEN MODELİN uygun
   * izleme mesafesi. Bu değer çizim zincirine HİÇ girmiyor — ne yakınlık,
   * ne duvar ölçeği, ne 3B duruş, ne kabin sayısı. Yalnızca gösteriliyor.
   * Bu yüzden izlemeM durumuna da dokunulmuyor, ayrı bir türetilmiş
   * değer olarak duruyor.
   */
  const izlemeBilgiSahnesi = !!fotoSahne?.duvarKutu
  const onerilenIzlemeM = useMemo(
    () => viewingDistanceFor(previewModel, cols, rows) || 0,
    [previewModel, cols, rows],
  )
  /*
   * FOTOĞRAFTA ÖLÇEK = MESAFE.
   *
   * Kendi fotoğrafında kadrajın kaç metre olduğunu yalnızca kamera uzaklığı
   * söylüyor. Ayrı bir "çekim mesafesi" alanı yerine kullanıcının girdiği
   * mesafe doğrudan ölçeğe bağlandı: tek sayı, tek yerde.
   */
  /*
   * FOTOĞRAFTA MESAFE, TASARIMDAN BAĞIMSIZ.
   *
   * Otomatik mesafe (otoIzlemeM) tasarımın ÖNERİLEN İZLEME mesafesidir ve
   * ekran büyüdükçe büyür. Fotoğraflı mekânda bu değer ölçeği belirlediği
   * için ekran ne kadar büyütülürse kadraj da o kadar büyüyor, yani duvar
   * kendiliğinden genişliyordu: 3 metrelik bir ofis duvarına 12 metrelik
   * ekran "sığıyormuş" gibi görünüyordu.
   *
   * Artık fotoğraf seçilince mesafe bir kez gerçek bir çekim mesafesine
   * (VARSAYILAN_MESAFE_M) sabitleniyor; sonrasını kullanıcı giriyor.
   * Ölçek yalnızca bu sayıdan geliyor, tasarımdan değil.
   */
  useEffect(() => {
    if (scene !== 'ozel' || !ozelSahne) return
    if (izlemeM == null) setIzlemeM(VARSAYILAN_MESAFE_M)
  }, [scene, ozelSahne, izlemeM])

  useEffect(() => {
    if (scene !== 'ozel' || !ozelSahne) return
    setOzelMesafeM((onceki) => (Math.abs(onceki - izlemeMesafesi) < 0.01 ? onceki : izlemeMesafesi))
  }, [scene, ozelSahne, izlemeMesafesi])

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
    /*
     * KULLANICININ KENDİ FOTOĞRAFI SABİT DURUYOR.
     *
     * Mesafe değişince fotoğrafı da yakınlaştırıp uzaklaştırıyordum; kadraj
     * her adımda büyüyüp küçüldüğü için kullanıcı neye baktığını
     * kaybediyordu. Artık fotoğraf hiç ölçeklenmiyor: mesafe yalnızca
     * ÖLÇEĞİ belirliyor, yani tasarımın o karede kaç piksel ettiğini
     * (kadraj genişliği = mesafe × 1,11 — bkz. ozelMekan.js).
     */
    if (fotoSahne?.tamGorunsun) return 1
    /*
     * DUVARI ESNEYEN SAHNELERDE YAKINLAŞTIRMA YOK.
     *
     * Orada ölçüyü duvarın kendisi taşıyor: duvar büyüyüp küçülüyor, mekân
     * yerinde kalıyor. Fotoğrafı ayrıca yakınlaştırmak ikinci bir ölçek
     * demek olurdu ve kullanıcının istemediği şey tam olarak buydu.
     */
    if (fotoSahne?.duvarKutu) return 1
    const ilerleme =
      (izlemeMesafesi - OTO_EN_AZ_M) / (ZOOM_EN_COK_M - OTO_EN_AZ_M)
    /*
     * 3 m'de 1,22 (kameranın ekrana girdiği en yakın hâl), 60 m'de 0,50
     * (kadraj küçülüp kenarları bulanık tamamlamaya bırakan en uzak hâl).
     * Alt sınır 0,84 idi; kenar tamamlama gelince kaldırıldı.
     */
    const zoom = 1.22 - ilerleme * 0.72
    const taban = Math.max(0.5, Math.min(1.22, zoom))

    /*
     * KÜÇÜK TASARIMDA KAMERA YAKLAŞIYOR.
     *
     * Ölçek gerçek olunca 1 m'lik bir ekran 33 metrelik meydanda haklı olarak
     * minicik kalıyor. Doğru çözüm ekranı büyütmek değil — o yalan olurdu —
     * kamerayı yaklaştırmak: arka plan da tasarım da aynı oranda büyüyor,
     * ikisinin birbirine oranı, yani ölçü doğruluğu, hiç değişmiyor.
     *
     * Hedef ölçülü: kadrajın enine göre ~%45'i. Üst sınır 1,3 — bir ara 2,4
     * idi ve küçük tasarımlarda kamera fotoğrafın içine dalıp kadrajı
     * tanınmaz hâle getiriyordu. Ölçek zaten gerçek; yakınlaşma sadece
     * küçük ekranı görünür tutmak için hafif bir dokunuş.
     */
    const yer = fotoYerlesim(fotoSahne, tuvalBoyut.w, tuvalBoyut.h)
    /* Ölçek duvar payından geliyorsa yakınlık hesabı da onu kullanmalı. */
    const olcekBirim =
      yer && fotoSahne?.duvarPayW > 0 && mekanDuvarWm > 0
        ? (yer.genislik * fotoSahne.duvarPayW) / mekanDuvarWm
        : yer?.pxPerM
    if (olcekBirim > 0 && tasarimWm > 0 && tasarimHm > 0 && tuvalBoyut.w > 0) {
      const w = tasarimWm * olcekBirim * taban
      const h = tasarimHm * olcekBirim * taban
      /*
       * SIĞMIYORSA KAMERA GERİ ÇEKİLİR — TASARIM KÜÇÜLTÜLMEZ.
       *
       * Eskiden tasarım tuvale sığmadığında ÖLÇEK kırpılıyordu (bkz. fotoOlcek).
       * Sonuç: arka plan mesafeyle küçülürken tasarım sığdırma sınırında
       * takılı kalıyor, 18 m'lik ekran 18 m'lik duvarı aşıyordu. Doğrusu
       * ikisini birlikte küçültmek: kadraj geri çekilir, oran korunur.
       *
       * Pay 150 px: WallPreview'in sahne modunda ayırdığı kenar payıyla aynı
       * (bkz. WallPreview `sahnePay`), yoksa orada ikinci bir kırpma olur.
       */
      const alanW = Math.max(180, tuvalBoyut.w - 150)
      const alanH = Math.max(140, tuvalBoyut.h - 150)
      /*
       * MESAFE HER ZAMAN İŞ GÖRMELİ.
       *
       * Sığdırma sınırını üst sınır olarak uygulayınca, büyük tasarımlarda
       * yakınlık hep o sınıra takılıyor ve mesafe düğmesi hiçbir şeyi
       * değiştirmiyordu (kullanıcının gördüğü hata buydu).
       *
       * Çözüm: sığdırma OTOMATİK MESAFEDEKİ kadrajı belirliyor; elle seçilen
       * mesafe ise bunun ÜZERİNE oran olarak biniyor. Otomatik mesafede
       * tasarım kadraja tam oturuyor, uzaklaştıkça küçülüyor, yaklaştıkça
       * büyüyüp kadrajı taşıyor — gerçekte de öyle olur.
       */
      const sigan = Math.min(alanW / (tasarimWm * olcekBirim), alanH / (tasarimHm * olcekBirim))
      const buyut = Math.min(1.3, Math.max(1, Math.min((alanW * 0.9) / w, (alanH * 0.9) / h)))
      const otoIlerleme = (otoIzlemeM - OTO_EN_AZ_M) / (ZOOM_EN_COK_M - OTO_EN_AZ_M)
      const tabanOto = Math.max(0.5, Math.min(1.22, 1.22 - otoIlerleme * 0.72))
      /*
       * KADRAJ = otomatik mesafedeki yakınlık, gerekiyorsa sığdırma kadar
       * KISILMIŞ hâli. `sigan` bir üst sınır; tek başına kullanılınca küçük
       * tasarımlarda (1 × 1 m) yakınlık 28-44 katına fırlıyor ve sahne
       * tanınmaz oluyordu — bir kez öyle oldu, sınır o yüzden burada.
       */
      const kadraj = Math.min(sigan, tabanOto * buyut)
      const oran = tabanOto > 0 ? taban / tabanOto : 1
      return Math.max(0.3, Math.min(2.2, kadraj * Math.max(0.3, Math.min(1.8, oran))))
    }
    return taban
  }, [fotoSahne, izlemeMesafesi, otoIzlemeM, ozelMesafeM, tuvalBoyut.w, tuvalBoyut.h, tasarimWm, tasarimHm, mekanDuvarWm])

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
    /*
     * TUVALE SIĞDIRMA KURALI KALDIRILDI — ÖLÇEK YİNE GERÇEK.
     *
     * Bir ara bu iki sahnede ölçeği tuvalden alıyordum ("her mekânda aynı
     * boyda görünsün"). Bedeli ağırdı: 2,88 m'lik bir ekran 18 metrelik taş
     * duvarın önünde 10 metre gibi duruyor, duvara yaslanmıyor, havada
     * asılı görünüyordu. Amaç fotogerçekçi bir önizleme olduğu için ölçek
     * artık sahnenin kendi kalibrasyonundan (panel genişliği / panelEnM)
     * geliyor; küçük tasarımların görünürlüğü ise sahnenin kendiliğinden
     * yakınlaşmasıyla çözülüyor (bkz. sahneYakinlik).
     */
    /*
     * DUVARI ESNEYEN SAHNE: ölçek duvarın tuvale sığdırılmasından geliyor —
     * çizilmiş iç/dış mekânla birebir aynı kural (salonOlcek). Böylece 6 m
     * duvar da 18 m duvar da kadraja oturuyor, tasarım duvara göre ölçekli
     * kalıyor.
     */
    if (fotoSahne?.duvarKutu && mekanDuvarWm > 0 && mekanDuvarHm > 0) {
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
    /*
     * ÖLÇEK DUVARIN KENDİSİNDEN.
     *
     * Sahnede duvarPayW alani varsa (AVM koridoru, şehir meydanı) fotoğraftaki
     * arka duvar, KULLANICININ girdiği duvar genişliği sayılıyor. Duvar
     * ölçüsünü değiştirmek fotoğraftaki duvarın metre karşılığını
     * değiştiriyor: 12 m yazınca duvar 12 m'lik, 6 m yazınca 6 m'lik bir
     * duvar gibi davranıyor ve tasarım ona göre ölçekleniyor — çizilmiş
     * iç/dış mekân sahnelerindeki davranışın aynısı.
     */
    const duvarOlcegi =
      fotoSahne.duvarPayW > 0 && mekanDuvarWm > 0
        ? (yer.genislik * fotoSahne.duvarPayW) / mekanDuvarWm
        : yer.pxPerM
    /*
     * KENDİ FOTOĞRAFINDA ÖLÇEK DOĞRUDAN MESAFEDEN.
     *
     * Kadrajın kapsadığı genişlik = mesafe × 1,11. Fotoğrafın tuvaldeki
     * genişliği bu metreye bölününce 1 metrenin piksel karşılığı çıkıyor.
     * Fotoğraf artık ölçeklenmediği için yakınlık çarpanı yok.
     */
    /*
     * ÇEKİM MESAFESİ ÇOK KÜÇÜKSE ÇİZİM SINIRLANIR.
     *
     * 1 metre yazıldığında kadraj 1,11 m ediyor; 2,76 m'lik bir tasarım
     * kareyi baştan aşağı kaplayıp fotoğrafı görünmez hâle getiriyordu.
     * Ölçü hesabı doğru ama gösterilen şey işe yaramıyor. Bu yüzden çizim
     * kadrajın 1,4 katıyla sınırlı; sığmadığı zaten uyarıyla söyleniyor
     * (bkz. scene.doesNotFit).
     */
    const gercek = fotoSahne.tamGorunsun
      ? Math.min(
          yer.genislik / kadrajGenisligi(ozelMesafeM),
          /* Tasarım fotoğrafın dışına taşmıyor: 1,4 kat iken kadrajı aşıyordu. */
          (yer.genislik * 0.98) / Math.max(0.1, tasarimWm),
          (yer.yukseklik * 0.98) / Math.max(0.1, tasarimHm),
        )
      : duvarOlcegi * sahneYakinlik
    /*
     * HAZIR SAHNEDE KIRPMA YOK.
     *
     * Sığdırma işini artık kamera yapıyor (bkz. sahneYakinlik): tasarım
     * kadraja sığmıyorsa arka planla BİRLİKTE küçülüyor. Burada ayrıca
     * kırpmak, tam da kullanıcının gördüğü hatayı üretiyordu — arka plan
     * uzaklaşırken tasarım olduğu yerde kalıyordu.
     */
    if (!fotoSahne.tamGorunsun) return gercek
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
  /*
   * AKTİF L EKRANI — tek ekranda da çoklu ekranda da.
   *
   * L tipi EKRAN TÜRÜ panelinde yok; çoklu ekran kurgusundan seçiliyor. Köşe
   * yerleşimi de oradan gelen L'yi tanımalı, yoksa özellik hiç ulaşılamaz
   * kalıyordu. Çoklu kurguda birden çok ekran varsa köşe çizilmiyor: o zaman
   * sahne tek bir köşeye değil, yan yana dizilmiş birden çok ekrana ait.
   */
  /*
   * KANAT SÜTUNLARI YAPILANDIRMADAN.
   *
   * L ekranın iki kanadının kaç kabin olduğu çoklu ekran kipinde zaten
   * giriliyor (leftCols / rightCols). Daha önce burada sütun sayısı ikiye
   * bölünüyordu; kullanıcı 4 + 2 dediyse ekranda yine 3 + 3 çiziliyordu.
   */
  const lEkran = (() => {
    const kanatlar = (toplam, sol, sag) => {
      const s = Math.max(1, Math.min(toplam - 1, Number(sol) || Math.ceil(toplam / 2)))
      const g = Math.max(1, Number(sag) || toplam - s)
      return { solCols: s, sagCols: g }
    }
    if (!cokluAktif) {
      if ((screenType || 'flat') !== 'lshape') return null
      const c = Math.max(2, cols)
      /* Kullanıcı 4 + 2 dediyse ekranda da 4 + 2 çizilsin (bkz. lSolCols). */
      const sol = lSolCols ? Math.max(1, Math.min(c - 1, lSolCols)) : null
      return { cols: c, rows: Math.max(1, rows), ...kanatlar(c, sol, sol ? c - sol : null) }
    }
    if (ekranParcalari.length !== 1) return null
    const e = ekranParcalari[0]
    if ((e?.type || 'flat') !== 'lshape') return null
    const c = Math.max(2, e.cols)
    return { cols: c, rows: Math.max(1, e.rows), ...kanatlar(c, e.leftCols, e.rightCols) }
  })()

  /*
   * KÖŞE İKİ ÇİZİLMİŞ MEKÂNDA DA ÇALIŞIYOR.
   *
   * İç mekânda köşe odanın kendi köşesi, dış mekânda binanın döndüğü köşe.
   * İkisinin de ölçeği ve duvar dikdörtgeni aynı yapıda olduğu için aynı
   * geometri kullanılıyor; değişen tek şey ölçek kaynağı.
   */
  /*
   * KATLANAN KANAT KÖŞENİN KADRAJDAKİ YERİNDEN.
   *
   * Gerçek bir odada kural şu: köşeden hangi tarafa düşüyorsan o duvar sana
   * doğru gelir. Köşe kadrajın sağındaysa sağdaki duvar izleyiciye açılıyor,
   * solundaysa soldaki. Kullanıcının fotoğrafında köşenin yeri belli
   * (işaretlenen çizgi), dolayısıyla bu seçim tahmin değil.
   *
   * Çizilmiş ve hazır mekânlarda köşe duvarın kenarında ve seçim zaten bir
   * YERLEŞİM kararı; orada otomatik bir şey yok, varsayılan sol köşe.
   */
  const lKoseOtomatik = (() => {
    if (scene !== 'ozel' || !ozelSahne || lKoseNokta.length !== 2) return 'sol'
    const orta = (lKoseNokta[0].x + lKoseNokta[1].x) / 2
    return orta > 0.5 ? 'sag' : 'sol'
  })()
  const lKose = lKoseSecim ?? lKoseOtomatik

  const lCizimMekan = scene === SALON_ID || scene === CEPHE_ID
  /*
   * HAZIR FOTOĞRAFLI MEKÂNDA DA GERÇEK KÖŞE (AVM koridoru, şehir meydanı).
   *
   * Bu iki sahnede duvarın fotoğraftaki dikdörtgeni ÖLÇÜLMÜŞ (sahneler.js
   * duvarKutu) ve duvar, kullanıcının girdiği ölçüye göre tuvalin ortasında
   * esnetilerek çiziliyor (bkz. DuvarDilim). Yani elimizde çizilmiş mekândaki
   * ile AYNI yapı var: ortalanmış, ölçeği bilinen bir duvar dikdörtgeni.
   *
   * Daha önce bu sahnelerde köşe mekândan değil ürünün kendi duruşundan
   * kuruluyordu (sabit açıyla çevrilmiş bir kutu). Ekran havada duruyordu:
   * duvar düz kalıyor, L onun önünde kendi başına katlanıyordu. Artık köşe
   * aynı lKoseGeometri ile duvarın kenarına kuruluyor — iç ve dış mekânla
   * birebir aynı hesap — ve duvarın kendisi de köşeden dönüyor
   * (bkz. fotoDuvarKosesi, DuvarKose.jsx).
   */
  const lFotoDuvarMekan = surukleAktif && !!fotoSahne?.duvarKutu
  const lDuvarMekan = lCizimMekan || lFotoDuvarMekan
  const lOlcek =
    scene === SALON_ID
      ? salonOlcegi
      : scene === CEPHE_ID
        ? cepheOlcegi
        : lFotoDuvarMekan
          ? cizimOlcek
          : null
  const lDuvarWpx = (lOlcek || 0) * mekanDuvarWm
  const lTipiAktif = !!lEkran
  /*
   * YERLEŞİM ADIMI L'YE GÖRE DEĞİŞİYOR — yalnızca kendi fotoğrafında.
   *
   * Hazır mekânlarda köşe zaten mekânın kendi köşesi; işaretlenecek bir şey
   * yok. Kullanıcının fotoğrafında ise köşenin nerede olduğunu ondan başka
   * kimse bilmiyor.
   */
  const lYerlesimKipi = lTipiAktif && scene === 'ozel' && !!ozelSahne
  const lKacisKaymasi = (() => {
    if (!lTipiAktif || !lCizimMekan || !(lDuvarWpx > 0)) return 0
    const varsayilan = (lKose === 'sol' ? 1 : -1) * lDuvarWpx * 0.22
    const istek = lKacis == null ? varsayilan : lKacis
    const sinir = lDuvarWpx * 0.45
    const kirpik = Math.max(-sinir, Math.min(sinir, istek))
    if (!lEkran || !(lOlcek > 0) || !(tuvalBoyut.w > 0)) return kirpik

    /*
     * DÖNÜŞ, EKRANI KADRAJIN DIŞINA ÇIKARMIYOR.
     *
     * Kamera çok dönünce yan kanadın YAKIN ucu tuvalin kenarını aşıyor ve
     * ekran yarım görünüyordu — sabit bir yüzde sınırı bunu önlemiyor, çünkü
     * taşma kanadın derinliğine, ekranın boyuna ve duvarın ölçüsüne göre
     * değişiyor.
     *
     * Bu yüzden sınır sayıdan değil ÖLÇÜMDEN geliyor: istenen dönüş için iki
     * kanadın dörtgeni hesaplanıp kadraja sığıp sığmadığına bakılıyor.
     * Sığmıyorsa dönüş, sığan en yakın değere çekiliyor. Kullanıcı sürüklemeye
     * devam edebiliyor ama ekran kesilmiyor.
     */
    const sol = Math.max(1, Math.ceil(lEkran.cols / 2))
    const sag = Math.max(1, lEkran.cols - sol)
    const olcu = {
      tuvalW: tuvalBoyut.w,
      tuvalH: tuvalBoyut.h,
      pxPerM: lOlcek,
      duvarWm: mekanDuvarWm,
      duvarHm: mekanDuvarHm,
      kose: lKose,
      onM: (lKose === 'sol' ? sag : sol) * cwM,
      yanM: (lKose === 'sol' ? sol : sag) * cwM,
      boyM: lEkran.rows * chM,
    }
    const PAY = 8
    const sigiyor = (deger) => {
      const g = lKoseGeometri({ ...olcu, kacisKaymasi: deger })
      if (!g) return false
      const h = [...g.on.koseler, ...g.yan.koseler]
      const xs = h.map((q) => q.x)
      const ys = h.map((q) => q.y)
      return (
        Math.min(...xs) >= PAY &&
        Math.max(...xs) <= tuvalBoyut.w - PAY &&
        Math.min(...ys) >= PAY &&
        Math.max(...ys) <= tuvalBoyut.h - PAY
      )
    }
    if (sigiyor(kirpik)) return kirpik
    /* Sığan en büyük dönüşü ara: istenen değerden sıfıra doğru. */
    for (let i = 23; i >= 1; i--) {
      const d = (kirpik * i) / 24
      if (sigiyor(d)) return d
    }
    return 0
  })()

  /*
   * L KÖŞE GEOMETRİSİ — yalnızca çizilmiş iç mekânda.
   *
   * Orada köşe gerçekten var: arka duvarın sol/sağ kenarı bir köşe ve yan
   * duvarlar oradan izleyiciye açılıyor. Kanatların kabin sayısı L tipinin
   * kendi alanlarından (leftCols/rightCols) geliyor; yoksa sütunlar ikiye
   * bölünüyor.
   *
   * Hazır mekânlarda ve kendi fotoğrafında köşe tanımlı olmadığı için null
   * dönüyor ve L eskisi gibi düz çiziliyor.
   */
  const lKoseGeo = (() => {
    if (!lDuvarMekan || !lEkran) return null
    if (!(lOlcek > 0) || !(tuvalBoyut.w > 0)) return null
    const sol = Math.max(1, Math.ceil(lEkran.cols / 2))
    const sag = Math.max(1, lEkran.cols - sol)
    const onCols = lKose === 'sol' ? sag : sol
    const yanCols = lKose === 'sol' ? sol : sag
    return lKoseGeometri({
      tuvalW: tuvalBoyut.w,
      tuvalH: tuvalBoyut.h,
      pxPerM: lOlcek,
      duvarWm: mekanDuvarWm,
      duvarHm: mekanDuvarHm,
      kose: lKose,
      onM: onCols * cwM,
      yanM: yanCols * cwM,
      boyM: lEkran.rows * chM,
      /* Fotoğrafta kamerayı çeviremiyoruz: kare sabit, dönüş yalnızca çizimde. */
      kacisKaymasi: lCizimMekan ? lKacisKaymasi : 0,
    })
  })()

  /*
   * KAMERANIN DÖNÜŞÜ — yalnızca L tipinde ve çizilmiş mekânda.
   *
   * Köşe tam karşıdan bakıldığında iki kanat üst üste biniyor ve L hiç
   * okunmuyordu. Oda biraz dönünce köşe açılıyor: bir kanat ön duvarda, öteki
   * yan duvarda ayrı ayrı görünüyor. Varsayılan dönüş duvarın %22'si kadar;
   * kullanıcı fareyle değiştirebiliyor.
   *
   * Sınır %45: ötesinde arka duvar iyice daralıyor ve oda tünele dönüyor.
   */
  /*
   * BİNANIN DÖNEN YAN YÜZÜ — dış mekânda, yalnızca L tipinde.
   *
   * Derinliği yan kanadın derinliğinden biraz fazla: ekran köşeyi sarıyor ama
   * bina ekranın bittiği yerde bitmiyor, biraz daha devam ediyor.
   */
  const cepheKoseYuzu = (() => {
    if (scene !== CEPHE_ID || !lEkran || !(cepheOlcegi > 0)) return null
    const sol = Math.max(1, Math.ceil(lEkran.cols / 2))
    const sag = Math.max(1, lEkran.cols - sol)
    const yanM = (lKose === 'sol' ? sol : sag) * cwM
    return cepheYanYuzu({
      tuvalW: tuvalBoyut.w,
      tuvalH: tuvalBoyut.h,
      pxPerM: cepheOlcegi,
      duvarWm: mekanDuvarWm,
      duvarHm: mekanDuvarHm,
      kose: lKose,
      derinlikM: yanM * 1.35,
      kacisKaymasi: lKacisKaymasi,
    })
  })()

  /*
   * FOTOĞRAFLI MEKÂNDA DUVARIN DÖNEN YÜZÜ.
   *
   * Dörtgen cephedekiyle aynı formülden geliyor; farkı yüzün ne ile
   * doldurulduğu: cephede düz bir yüzey gradyanı, burada fotoğrafın KENDİ
   * duvar dokusu (bkz. DuvarKose.jsx). Böylece duvar gerçekten köşeden
   * dönüyormuş gibi duruyor, üstüne yapıştırılmış bir şekil gibi değil.
   *
   * 'orta' köşede duvar katlanmıyor: orada köşe duvarın kenarında değil,
   * ekranın kendi serbest köşesi duvarın önünde duruyor.
   */
  const fotoDuvarKosesi = (() => {
    if (!lFotoDuvarMekan || !lEkran || lKose === 'orta') return null
    if (!(cizimOlcek > 0) || !(tuvalBoyut.w > 0)) return null
    const sol = Math.max(1, Math.ceil(lEkran.cols / 2))
    const sag = Math.max(1, lEkran.cols - sol)
    const yanM = (lKose === 'sol' ? sol : sag) * cwM
    if (!(yanM > 0)) return null
    /* Duvar ekranın bittiği yerde bitmiyor, köşeden biraz daha devam ediyor. */
    const derinlikM = yanM * 1.35
    const koseler = cepheYanYuzu({
      tuvalW: tuvalBoyut.w,
      tuvalH: tuvalBoyut.h,
      pxPerM: cizimOlcek,
      duvarWm: mekanDuvarWm,
      duvarHm: mekanDuvarHm,
      kose: lKose,
      derinlikM,
    })
    if (!koseler) return null
    return { koseler, derinlikM, duvarWm: mekanDuvarWm, kose: lKose }
  })()

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
  /*
   * KİOSK GÖVDESİ YOKSA EKRAN DUVARA HİZALANIR.
   *
   * Zemine oturtma, yerde duran bir kiosk içindir: kaide zemin çizgisine
   * basar. Gövde kapalıyken ekran duvara/panoya monteli demektir; o zaman
   * doğru hiza mekânın kendi paneli, yani duvarın hizasıdır. Hazır
   * sahnelerde (AVM koridoru, şehir meydanı) fotoğraf zaten panelin merkezi
   * tuvalin merkezine gelecek biçimde yerleştiği için kayma sıfır kalıyor:
   * "Ortala" düğmesi ekranı doğrudan duvara hizalıyor.
   */
  /*
   * TAŞIMA HER FOTOĞRAFLI MEKÂNDA AÇIK.
   *
   * Önce yalnızca kullanıcının kendi fotoğrafında açıktı; AVM koridoru ve
   * şehir meydanında tasarım duvarın ortasına kilitliydi. Kiosk gövdesi
   * eklendiğinde ekran yerde duruyor ve yerini düzeltmek gerekiyor —
   * kilitli olduğu için hiç kıpırdamıyordu.
   *
   * Otomatik yerleşim değişmedi: tasarım yine duvarın ortasına oturuyor.
   * Kullanıcı sürüklediği anda (mekanTasindi) kendi kayması bunun üstüne
   * biniyor; "Ortala" düğmesi her zaman duvara geri getiriyor.
   */
  /*
   * TAŞIMA: HAZIR SAHNELERDE YALNIZCA KIOSK VARKEN.
   *
   * AVM koridoru ve şehir meydanında duvar ölçülü olarak tanımlı; ekran o
   * duvara monteli demektir ve duvardan koparılıp havada bırakılması yanlış
   * bir ürün gösterir. Bu yüzden oralarda tasarım yerinden oynatılmıyor.
   *
   * TEK İSTİSNA KIOSK: kiosk gövdesi eklendiğinde ekran duvara monteli
   * değil, yerde duran bağımsız bir üründür — nereye konacağı kullanıcının
   * kararıdır ve taşınabilir olmalıdır.
   *
   * Kullanıcının kendi fotoğrafında sınır yok: orada duvarın nerede
   * olduğunu yalnızca kullanıcı biliyor.
   */
  const tasimaAcik = surukleAktif && (!fotoSahne?.duvarKutu || kioskVar)

  const duvaraHizali = surukleAktif && !kioskVar
  /*
   * DUVARIN DİBİNE HİZALAMA.
   *
   * Ortalamak yetmiyordu: ekran duvarın ortasında havada asılı gibi
   * duruyordu. Gerçekte bir cephe ekranı duvarın tabanına yakın kurulur.
   * Bu yüzden ekranın ALT kenarı, mekânın panelinin alt kenarına
   * getiriliyor (panel = sahnede ekran için kalibre edilmiş duvar alanı).
   * Yakınlık tuvalin merkezine göre uygulandığı için panelin yarı yüksekliği
   * de aynı oranla ölçekleniyor.
   */
  const duvarDibiKaymasi = () => {
    const tasarimYariH = (tasarimHm * (cizimOlcek || 0)) / 2
    /*
     * ESNEYEN DUVARDA TASARIM HER ZAMAN DUVARI ORTALIYOR.
     *
     * Bir ara alt kenara hizalıyordum; ölçü ya da kabin sayısı değişince
     * ekran duvarın içinde aşağı yukarı kayıyordu. Duvar tuvalin ortasında
     * çizildiği için sıfır kayma = duvarın tam ortası; ölçü ne olursa olsun
     * ekran ortada kalıyor.
     */
    if (fotoSahne?.duvarKutu) return 0
    if (!fotoYer?.panelHpx || fotoYer.sigdir) return 0
    const z = sahneYakinlik || 1
    return (fotoYer.panelHpx / 2) * z - tasarimYariH
  }
  /*
   * ÖNERİ KAYMALARI YALNIZCA BİR YERLEŞİM SEÇİLDİYSE.
   *
   * Fotoğraf yüklenince tasarım artık hiçbir adaya oturmuyor (bkz.
   * oneriyiUygula'daki uygula bayrağı). Buna rağmen "önerilen alana kay"
   * hesapları çalışmaya devam ediyordu: tasarım ortada değil, önerinin
   * bulunduğu yerde ve yukarıda duruyordu. Hedef yokken ve kullanıcı
   * taşımamışken kayma SIFIR — yani tuvalin tam ortası.
   */
  /*
   * BU KURAL YALNIZCA KENDİ FOTOĞRAFINDA GEÇERLİ.
   *
   * 'Yerleşim seçilmediyse kayma sıfır' kuralı kullanıcının kendi fotoğrafı
   * için konmuştu: orada tasarımın kendiliğinden bir yüzeye oturmaması
   * isteniyor. Ama kural bütün kiosk sahnelerine uygulanıyordu; AVM koridoru
   * ve şehir meydanında hedef dörtgen diye bir şey yok, dolayısıyla duvara
   * hizalama da iptal oluyor ve tasarım duvarın üstünden kayıyordu.
   *
   * Hazır sahnelerde duvar zaten tanımlı; oraya hizalanmak doğru davranış.
   */
  const yerlesimSecildi = scene !== 'ozel' || !!hedefKose || mekanTasindi
  const oturmaKaymasi = !surukleAktif || !yerlesimSecildi
    ? 0
    : duvaraHizali
      ? (fotoYer?.sigdir ? oneriDikeyKaymasi(fotoYer, tuvalBoyut.h) : duvarDibiKaymasi())
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
  const oneriKaymasi = surukleAktif && yerlesimSecildi ? oneriYatayKaymasi(fotoYer, tuvalBoyut.w) : 0

  const elleKayma = surukleAktif
    ? kaymayiSinirla(
        mekanOfsetM,
        cizimOlcek || 0,
        tuvalBoyut,
        tasarimWm * (cizimOlcek || 0),
        tuvalBoyut.h / 2,
        tasarimHm * (cizimOlcek || 0),
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
  /*
   * DUVARIN TUVALDEKİ DÖRTGENİ.
   *
   * hedefKose fotoğrafa göre oranlı (0–1); burada tuval pikseline çevriliyor.
   * Yakınlaştırma fotoğrafla birlikte dörtgeni de taşıdığı için aynı dönüşüm
   * uygulanıyor (bkz. PanoFoto).
   *
   * Bu dörtgen artık yalnızca "bir yüzey" değil, GERÇEK DÜNYA KOORDİNAT
   * SİSTEMİNİN dayanağı: dört köşesi duvarın (0,0)–(enM,0)–(enM,boyM)–(0,boyM)
   * dikdörtgenine karşılık geliyor.
   */
  const duvarTuval = (() => {
    if (!fotoYer || !Array.isArray(hedefKose) || hedefKose.length !== 4) return null
    const mX = tuvalBoyut.w / 2
    const mY = tuvalBoyut.h / 2
    const z = sahneYakinlik || 1
    return hedefKose.map((k) => ({
      x: mX + (fotoYer.sol + k.x * fotoYer.genislik - mX) * z,
      y: mY + (fotoYer.ust + k.y * fotoYer.yukseklik - mY) * z,
    }))
  })()

  /*
   * GERÇEK DÜNYA ↔ FOTOĞRAF.
   *
   * Duvarın gerçek ölçüsü biliniyorsa ölçek artık tahmin değil: metre ile
   * piksel arasındaki bağ bu dönüşümde. Ekranın fotoğrafta kaç piksel ettiği
   * bir sonuç; fiziksel oranı belirleyen şey değil.
   */
  /*
   * DUVARIN "EN" EKSENİ EKRANDA YATAY OLAN KENAR.
   *
   * Dünya dönüşümü kutunun köşe SIRASINDAN kuruluyor: 0→1 kenarı duvarın
   * eni, 0→3 kenarı boyu sayılıyor. Kutunun köşeleri serbestçe
   * sürüklenebildiği (ve dört köşe referansı başka bir sırayla
   * işaretlenebildiği) için 0→1 kenarı ekranda DİKEY kalabiliyor. O zaman
   * duvarın eni dikey eksen oluyor ve o duvara çizilen her şey — tasarım ve
   * içindeki görsel — 90 derece yan dönmüş görünüyor. Kullanıcının
   * "görsel bazen yan dönüyor" dediği durum tam olarak bu.
   *
   * Düzeltme köşeleri OYNATMADAN yapılıyor: dizi, 0→1 kenarı en yataya
   * yakın olana gelene kadar kaydırılıyor (en çok üç adım) ve en/boy da
   * birlikte takas ediliyor. Dörtgen aynı dörtgen, dönme yönü aynı; değişen
   * tek şey hangi kenarın "en" sayıldığı.
   *
   * Takas edilmiş ölçü aşağıda yerleşim hesabında da kullanılıyor
   * (duvarDunyaOlcu), yoksa eksenler ile metreler birbirini tutmazdı.
   */
  const duvarEkseni = (() => {
    if (!duvarTuval || !(duvarOlcu?.wm > 0) || !(duvarOlcu?.hm > 0)) return null
    let k = duvarTuval
    let wm = duvarOlcu.wm
    let hm = duvarOlcu.hm
    for (let i = 0; i < 3; i++) {
      const dx = Math.abs(k[1].x - k[0].x)
      const dy = Math.abs(k[1].y - k[0].y)
      if (dx >= dy) break
      k = [k[1], k[2], k[3], k[0]]
      const t = wm
      wm = hm
      hm = t
    }
    return { koseler: k, wm, hm }
  })()
  const duvarDunyaOlcu = duvarEkseni ? { wm: duvarEkseni.wm, hm: duvarEkseni.hm } : duvarOlcu
  const duvarDunya = duvarEkseni
    ? duvarDunyasi(duvarEkseni.koseler, duvarEkseni.wm, duvarEkseni.hm)
    : null

  /* Ekranın duvar üzerindeki yeri (metre) — panelde gösteriliyor. */
  const ekranDunyaRef = useRef(null)
  /*
   * IZGARA — kalibrasyonun gözle denetimi (bkz. DuvarIzgara.jsx). Varsayılan
   * kapalı: her zaman açık durursa çizimin önünü kapatıyor.
   */
  const [izgaraAcik, setIzgaraAcik] = useState(false)

  /*
   * TASARIM KUTUYA TIKLANINCA AÇILIYOR.
   *
   * Eskiden kutu kurulur kurulmaz tasarım çiziliyordu: çizim kapısı
   * koseTuval, o da hedefKose dolar dolmaz üretiliyor ve kutuyu kuran işlev
   * hedefKose'yi hemen dolduruyor. Yani tasarımın görünmesi için ayrı bir
   * onay yoktu.
   *
   * Yeni akış: kutu kurulur, kullanıcı onu taşıyıp köşelerinden duvara
   * oturtur, sonra kutuya tıklar ve tasarım o zaman görünür. Tıklama tek
   * yönlü — ikinci tıklama gizlemiyor; kutuyu ayarlamaya devam etmek
   * tasarımı kapatmamalı.
   *
   * Fiziksel ölçü hesabına dokunulmuyor: koseTuval ve tasarimWm/tasarimHm
   * aynen çalışıyor, yalnızca ÇİZİM gizleniyor.
   */
  const [tasarimAcik, setTasarimAcik] = useState(false)

  /*
   * Tasarım gizli mi? Yalnızca kendi fotoğrafında ve ortada bir ölçü kutusu
   * varken geçerli; hazır mekânlarda ve kutusuz akışta tasarım her zaman
   * görünüyor (orada tıklanacak bir kutu yok).
   *
   * BU SATIR tasarimAcik'TAN SONRA DURMAK ZORUNDA. Bir ara yukarıdaydı ve
   * koşul kısa devre olduğu için hata ancak KUTU KURULUNCA ortaya çıkıyordu:
   * son terim (!tasarimAcik) o zamana kadar hiç değerlendirilmiyor, sonra
   * "Cannot access before initialization" ile uygulama hata ekranına düşüyordu.
   */
  /*
   * TASARIM HER ZAMAN GÖRÜNÜR.
   *
   * Ölçü kutusu kurulunca tasarım gizleniyordu; kullanıcı onu kutuya
   * tıklayarak açacaktı. Niyet, kutuyu yerleştirirken tasarımın üstünü
   * kapatmamasıydı. Sonuç ters oldu: arka plan eklenince kullanıcının
   * tasarımın yerinde gördüğü şey mavi bir dikdörtgen — yani kutunun
   * kendisi — ve bunu "tasarım mavi oldu" diye okudu. Haklı okuma:
   * tasarım ekranında siyah diyot dokusu duruyorken burada mavi bir leke
   * duruyordu.
   *
   * Artık tasarım hiç gizlenmiyor; kutu zaten yarı saydam ve kesikli, ikisi
   * birlikte okunuyor. Tasarım ekranında ne görünüyorsa fotoğrafın üstünde de
   * aynısı görünüyor.
   *
   * tasarimAcik durumu yerinde kalıyor: kutuyu düzenleme kipine sokan
   * düğmeler onu hâlâ yazıyor ve ileride bir "yalnızca kutuyu göster"
   * ihtiyacı doğarsa bağlanacak yer orası.
   */
  /*
   * TASARIM NE ZAMAN GÖRÜNÜR.
   *
   * Ölçü sürerken hiç çizilmiyor; alan onaylanınca da çıkmıyor. Kullanıcı
   * "Tasarımı ölçüye sığdır" deyince çıkıyor — serbest yerleştirmede
   * karşılığı "Bitir ve tasarımı göster".
   *
   * Sihirbaz kapalıyken bu bayrağa bakılmıyor: orada tasarım zaten ürünün
   * kendisi ve her zaman görünür.
   */
  const tasarimGizli = sihirbazAdim > 0 && !tasarimAcik

  /*
   * ÖLÇÜ ETİKETLERİ KUTU KURULANA KADAR GİZLİ.
   *
   * Tasarımın kendi ölçü etiketleri (+/− düğmeleriyle birlikte) fotoğrafın
   * üstünde, kutunun kurulacağı alanın tam ortasında duruyordu. Kullanıcı o
   * sırada nokta işaretliyor ve kutuyu yerleştiriyor: etiketler hem görüşü
   * kapatıyor hem de henüz ÖLÇEĞİ OLMAYAN bir tasarımın ölçüsünü söylüyor,
   * yani o anda yanlış bilgi.
   *
   * Kullanıcının kendi "Ölçüleri gizle" tercihine dokunulmuyor: bu yalnızca
   * kendi fotoğrafında ve yalnızca kutu hazır olana kadar geçerli bir
   * bastırma. Kutu kurulup tasarım gösterildiği anda etiketler geri geliyor.
   */
  const olcuKutusuHazir = !(scene === 'ozel' && !!ozelSahne && (sihirbazAdim > 0 || tasarimGizli || !olcuKutu))
  /*
   * ARKA PLANDA FOTOĞRAF VARSA ETİKETLER HİÇ ÇİZİLMİYOR.
   *
   * Etiketler ve +/− düğmeleri tasarımın üstünde, mekânın ortasında duruyor:
   * fotoğrafı kapatıyorlar ve amaç zaten ekranın o mekânda NASIL DURACAĞINI
   * görmek. Kabin sayısı sağ paneldeki Sütunlar/Satırlar adımlayıcılarından
   * değiştirilebildiği için tuvaldeki düğmeler kaybedilmiş bir yetenek değil.
   *
   * Fotoğrafsız önizlemede (mekân Kapalı) etiketler duruyor; orada arka
   * planda kapatacak bir şey yok ve ölçüyü okumanın tek yeri orası.
   *
   * olcuKutusuHazir bunun içinde kalıyor: kendi fotoğrafında kutu kurulana
   * kadar etiketler zaten yanlış bilgi veriyordu (ölçek henüz yok).
   */
  const olculerGorunsun = showMeasurements && scene === 'none' && olcuKutusuHazir

  const koseTuval = (() => {
    /*
     * DÜZELTME YALNIZCA ÇİZİM VARKEN.
     *
     * Beklenen köşe temizlenmezse, tasarım hiç çizilmediği hâlde ölçüm
     * karşılaştırması sürüyor; fark hiç kapanmıyor ve her çizimde durum
     * güncelleniyordu. React bunu sonsuz döngü sayıp hata ekranına
     * düşüyordu — "bazen böyle oluyor" denen çökme buydu.
     */
    if (!fotoYer || !cizimOlcek) {
      beklenenKoseRef.current = null
      return null
    }
    /*
     * Kullanıcı köşeleri çektiyse çizim doğrudan onlara uyuyor.
     *
     * TAŞIMA BURADA DA GEÇERLİ: köşeler ayarlandıktan sonra tasarımı
     * sürüklemek mümkün olmuyordu (kayma yalnızca otomatik hedefe
     * uygulanıyordu). Artık elle çizilen dörtgen de sürükleme kaymasını
     * alıyor; köşeler kendi aralarındaki şekli koruyarak birlikte gidiyor.
     */
    /* Kalibre duvarda ölçünün kaynağı dünya katmanı; elle dörtgen onu ezmiyor. */
    /*
     * İŞARETLENEN ALAN DUVAR KATMANINI GEÇİYOR.
     *
     * Bu dal "elle kurulmuş dörtgen" demek ve duvar düzlemi ölçülmüşken
     * atlanıyordu: orada ekranın yeri duvarın kendi koordinat sisteminden
     * geliyor. Ama "Ölçüm ile ayarla" ile işaretlenen alan da elle kurulmuş
     * bir dörtgen ve kullanıcının açıkça "şuraya otursun" dediği yer.
     * Atlanınca ekran duvar katmanının söylediği yere gidiyor ve
     * işaretlenen alanla örtüşmüyordu.
     *
     * Alan işaretlenmişse (dört nokta tam) bu dal kazanıyor.
     */
    if (elleKose && (!duvarDunya || alanNokta.length === 4)) {
      const dw0 = tasarimWm * cizimOlcek
      const dh0 = tasarimHm * cizimOlcek
      const bas0 = ekranKutuBasi(dw0, dh0)
      const sol0 = bas0.x
      const ust0 = bas0.y
      /*
       * FOTOĞRAF SINIRI BU DALDA DA GEÇERLİ.
       *
       * Sınır yalnızca otomatik yerleşime konmuştu; elle köşe kurulduğunda
       * dörtgen hiç denetlenmiyordu ve kullanıcı tasarımı fotoğrafın
       * dışındaki boş alana kadar sürükleyebiliyordu. Orası mekân değil.
       */
      const elle = elleKose.map((k) => ({
        x: k.x + (elleKayma?.x || 0),
        y: k.y + (elleKayma?.y || 0),
      }))
      /*
       * ALAN İŞARETLİYSE SINIR YUMUŞUYOR.
       *
       * Sürükleme sınırı kodda kalkmıştı ama tasarım yine işaretlenen kutuyu
       * terk edemiyordu: buradaki fotografaCek dörtgeni her çizimde fotoğrafın
       * içine geri çekiyor, yani sürüklemeyi geri alıyordu. Kullanıcı
       * dört noktayı kendisi işaretlediyse nereye koyacağını da kendisi
       * biliyor; tasarımı alanın ve fotoğrafın dışına taşıyabilmeli.
       *
       * Sınırın tamamını kaldırmıyoruz: dörtgenin dörtte biri kadrajda
       * kalıyor, yoksa tasarım ekrandan kaybolup geri getirilemez olurdu.
       */
      const sinirli =
        /*
         * KULLANICI KÖŞELERİ KENDİ KOYDUYSA ÇEKİLMİYOR.
         *
         * fotografaCek dörtgeni her çizimde fotoğrafın içine geri
         * çekiyor; üst kenarı fotoğrafın dışında kalan bir yerleştirme
         * sessizce aşağı kayıyordu (ölçüldü: 13 piksel). Dört köşeyi
         * kendisi tıklayan kullanıcı nereye koyacağını biliyor.
         */
        alanNokta.length === 4 || elleYerlesti
          ? kadrajaCek(elle, tuvalBoyut)
          : fotografaCek(elle, fotoYer)
      /*
       * ÇİZİM DÜZELTMESİ BU DALDA DA UYGULANIYOR.
       *
       * ekranKutuBasi, tasarım kutusunun tuvalin TAM ORTASINDA duracağını
       * varsayıyor. Gerçekte kutu WallPreview'in kendi yerleşiminin içinde:
       * duvar kutusu, insan silueti, ölçü payları ve alta hizalama onu
       * ortadan kaydırıyor. Fark otomatik yerleşim dalında ölçülüp
       * kapatılıyordu (beklenenKoseRef → ekranKutuYeriniYaz → cizimDuzeltme)
       * ama İŞARETLENEN ALAN dalı bu zincirin dışında kalmıştı: beklenen
       * köşe hiç yazılmadığı için ölçüm geldiğinde karşılaştıracak bir şey
       * bulunmuyor ve düzeltme hiç çalışmıyordu.
       *
       * Belirtisi: geniş (masaüstü) görünümde tasarım alanın ortasına
       * oturuyor — orada kutu zaten ortada — ama dar (telefon) görünümde
       * her seferinde aynı miktarda (~53 px) yukarıda duruyordu. Kayma
       * sabitti çünkü yerleşim farkı sabit.
       */
      beklenenKoseRef.current = {
        x: Math.min(...sinirli.map((k) => k.x)),
        y: Math.min(...sinirli.map((k) => k.y)),
      }
      return sinirli.map((k) => ({
        x: k.x - sol0 + cizimDuzeltme.x,
        y: k.y - ust0 + cizimDuzeltme.y,
      }))
    }
    if (!hedefKose) {
      beklenenKoseRef.current = null
      return null
    }
    const dw = tasarimWm * cizimOlcek
    const dh = tasarimHm * cizimOlcek
    if (!(dw > 0) || !(dh > 0)) return null
    const solUst = ekranKutuBasi(dw, dh)
    /*
     * Fotoğraf yakınlaştıkça yüzey de kadrajda büyüyüp yer değiştiriyor;
     * köşeler aynı dönüşümden geçiyor. Ölçek merkezi PanoFoto ile aynı:
     * panelin merkezi, yani tuvalin ortası.
     */
    const tuvalKose = duvarTuval
    /*
     * EKRANIN YERİ VE ÖLÇÜSÜ GERÇEK DÜNYADA HESAPLANIYOR.
     *
     * Duvar kalibre edildiyse (dört köşe + gerçek en/boy) ekranın dört köşesi
     * önce METRE cinsinden kuruluyor, sonra homografi ile fotoğrafa
     * aktarılıyor. Böylece 4 metrelik duvara konan 2 metrelik ekran, duvarın
     * fotoğrafta kaç piksel ettiğinden bağımsız olarak duvarın yarısını
     * kaplıyor.
     *
     * SÜRÜKLEME DE METREYLE: farenin piksel kayması ters homografiden
     * geçirilip metreye çevriliyor, sınır denetimi de metre ile yapılıyor
     * (ekran duvarın dışına çıkmıyor). Piksel doğrudan metre sayılmıyor.
     *
     * Duvar kalibre edilmemişse (hazır mekânlar, eski kayıtlar) önceki yol
     * olduğu gibi duruyor.
     */
    let kaydirilmis
    if (duvarDunya) {
      /* Eksenler düzeltilmişse metreler de onunla birlikte takas edilmiş. */
      const ortaX = (duvarDunyaOlcu.wm - tasarimWm) / 2
      const ortaY = (duvarDunyaOlcu.hm - tasarimHm) / 2
      let xm = ortaX
      let ym = ortaY
      if (elleKayma && (elleKayma.x || elleKayma.y)) {
        const merkez = duvarDunya.ileri(ortaX + tasarimWm / 2, ortaY + tasarimHm / 2)
        const hedef = merkez && duvarDunya.geri(merkez.x + elleKayma.x, merkez.y + elleKayma.y)
        if (hedef) {
          xm = hedef.x - tasarimWm / 2
          ym = hedef.y - tasarimHm / 2
        }
      }
      /*
       * TASARIM DUVARIN İÇİNE HAPSEDİLMİYOR.
       *
       * Burada iki kilit vardı ve ikisi de sürüklemeyi yiyordu:
       *
       *  1. Tasarım duvardan küçükse konumu duvarın içine kıstırılıyordu;
       *     ekranı duvarın biraz dışına taşırmak mümkün değildi.
       *  2. Tasarım duvardan BÜYÜKSE konum doğrudan ortaya zorlanıyordu
       *     (xm = ortaX). Yani sürükleme tamamen yok sayılıyor, tasarım
       *     çivilenmiş gibi duruyordu — kullanıcının "sabitleme, hareket
       *     ettirebileyim" dediği durum buydu.
       *
       * Duvar bir ölçü kaynağı, bir kafes değil. Konum artık sürüklemenin
       * söylediği yer. Tasarımın kadrajdan büsbütün kaçmasına karşı koruma
       * aşağıda duruyor (kadrajaCek), duvara sığmayan kısım da taramayla
       * işaretleniyor (bkz. TasmaKatmani) — yani bilgi kaybolmuyor.
       */
      ekranDunyaRef.current = { x: xm, y: ym }
      kaydirilmis =
        dunyaDortgeni(duvarDunya, xm, ym, tasarimWm, tasarimHm) || tuvalKose
    } else {
      ekranDunyaRef.current = null
      /*
       * ESKİ YOL — duvarın gerçek ölçüsü bilinmiyor.
       *
       * Ölçek çekim mesafesinden tahmin ediliyor (kadraj = mesafe × 1,11) ve
       * tasarım yüzeyin içine o tahmine göre oturuyor. Yaklaşıktır; kalibre
       * edilmiş duvarda kullanılmıyor.
       */
      const yuzeyPayi =
        (Math.hypot(tuvalKose[1].x - tuvalKose[0].x, tuvalKose[1].y - tuvalKose[0].y) +
          Math.hypot(tuvalKose[2].x - tuvalKose[3].x, tuvalKose[2].y - tuvalKose[3].y)) /
        2 /
        Math.max(1, fotoYer.genislik)
      const yuzeyWm = Math.max(0.2, yuzeyPayi * kadrajGenisligi(ozelMesafeM))
      kaydirilmis = icDortgen(tuvalKose, tasarimWm, tasarimHm, yuzeyWm).map((k) => ({
        x: k.x + (elleKayma?.x || 0),
        y: k.y + (elleKayma?.y || 0),
      }))
    }
    /*
     * TASARIMIN TAMAMI EKRANDA KALIYOR.
     *
     * Yüzey kadrajın kenarına yakınsa dörtgenin bir kısmı dışarı taşıyordu.
     * Önce içeri kaydırılıyor; hâlâ sığmıyorsa merkezine göre küçültülüyor.
     * Kullanıcı sonrasında dilediği yere sürükleyebiliyor.
     */
    /* Elle verilen açı dörtgene burada biniyor (bkz. aciyiUygula). */
    const acili = aciyiUygula(kaydirilmis, elleAci)

    /*
     * SIĞDIRMA YALNIZCA OTOMATİK YERLEŞİMDE.
     *
     * "Tasarımın tamamı ekranda kalsın" kuralı otomatik önerinin kalitesi
     * içindi. Kullanıcı taşırken, açı verirken ya da dört köşeyi elle
     * çekerken aynı kural onu kısıtlıyordu: ekranı kenara götürmek ya da
     * bilerek taşırmak mümkün olmuyordu. Elle müdahale varsa dörtgen
     * olduğu gibi bırakılıyor — kontrol kullanıcıda.
     */
    const elleMudahale =
      mekanTasindi || koseKipi || elleKose || elleAci.yaw !== 0 || elleAci.tilt !== 0
    /*
     * SON EMNİYET: TASARIM HİÇBİR ZAMAN TAMAMEN KAYBOLMUYOR.
     *
     * Elle müdahale varken sığdırma kapalı — kullanıcı ekranı bilerek kenara
     * taşıyabilsin diye. Ama tamamen kadraj dışına çıkması hiçbir işe
     * yaramıyor: kullanıcı tasarımı bir daha bulamıyor ve ne olduğunu
     * anlamıyor. Mesafeyi değiştirdiğinde ölçek değiştiği için bu
     * kendiliğinden de olabiliyordu.
     *
     * Bu yüzden serbestlik korunuyor, yalnızca son bir sınır var: dörtgenin
     * dörtte biri kadrajın içinde kalacak kadar geri çekiliyor.
     */
    /*
     * KALİBRE DUVARDA SIĞDIRMA YOK.
     *
     * ekranaSigdir, dörtgeni tuvale sığsın diye KÜÇÜLTÜYOR. Duvarın gerçek
     * ölçüsü biliniyorken bu doğrudan yanlış: ekranın duvara oranı çizim
     * alanına göre değişiyor, yani fiziksel oran bozuluyor. Ölçümde duvarı
     * tam kaplayan bir ekran %98,82'ye iniyordu.
     *
     * Kalibre duvarda yalnızca son emniyet kalıyor (kadrajaCek): dörtgen
     * tamamen kadrajın dışına çıkarsa geri çekiliyor. O da kaydırma, ölçü
     * değiştirmiyor.
     */
    const kadrajlanmis =
      duvarDunya || elleMudahale ? kadrajaCek(acili, tuvalBoyut) : ekranaSigdir(acili, tuvalBoyut)
    /*
     * TASARIM VE ÖLÇÜLERİ FOTOĞRAFIN DIŞINA TAŞMIYOR.
     *
     * Tuval fotoğraftan geniş olabiliyor: fotoğraf ortalanıyor ve yanlarında
     * boş alan kalıyor. Sınır tuvale göre konunca tasarım o boş alana, yani
     * fotoğrafın dışına çıkabiliyordu; ölçü etiketleri de öyle. Oysa
     * kullanıcının gördüğü mekân fotoğrafın kendisi — dışarısı mekân değil.
     */
    /*
     * Fotoğraf sınırı da kalibre duvarda uygulanmıyor: ölçünün dayanağı artık
     * duvar, fotoğrafın kenarı değil. Duvar fotoğrafın içinde olduğu sürece
     * ekran da içinde kalıyor; taşıyorsa sebep duvarın kendisidir ve onu
     * kırpmak ölçüyü bozar.
     */
    const son = duvarDunya ? kadrajlanmis : fotografaCek(kadrajlanmis, fotoYer)
    /*
     * Olması gereken sol üst köşe (tuval koordinatı) saklanıyor; ölçüm
     * geldiğinde gerçek yerle karşılaştırılıp fark kapatılıyor.
     */
    beklenenKoseRef.current = {
      x: Math.min(...son.map((k) => k.x)),
      y: Math.min(...son.map((k) => k.y)),
    }
    return son.map((k) => ({
      x: k.x - solUst.x + cizimDuzeltme.x,
      y: k.y - solUst.y + cizimDuzeltme.y,
    }))
  })()

  /*
   * Köşelerin TUVALDEKİ mutlak yeri — manuel tutamaklar bunu kullanıyor.
   * (Ekranın dönüşümü için gereken, tasarım kutusuna göre olan sürüm
   * `koseTuval`; ikisi aynı noktalar, farklı başnokta.)
   */
  const koseMutlak = (() => {
    /*
     * TUTAMAKLAR TAM OLARAK ÇİZİLEN TASARIMIN KÖŞELERİNDE.
     *
     * Önce hedef dörtgen (bulunan yüzey) gösteriliyordu; oysa tasarım o
     * dörtgenin içine kendi metre ölçüsüyle oturuyor ve açı da üstüne
     * biniyor. İkisi farklı olunca tutamaklar tasarımı çevrelemiyordu —
     * kullanıcının gördüğü hata buydu. Artık kaynak tek: koseTuval.
     * (koseTuval tasarım kutusunun sol üstüne göre; burada mutlak tuval
     * koordinatına çevriliyor.)
     */
    if (!koseTuval || !cizimOlcek) return null
    const dw = tasarimWm * cizimOlcek
    const dh = tasarimHm * cizimOlcek
    if (!(dw > 0) || !(dh > 0)) return null
    const solUst = ekranKutuBasi(dw, dh)
    return koseTuval.map((k) => ({ x: k.x + solUst.x, y: k.y + solUst.y }))
  })()

  /*
   * EKRAN EKLE — duran ekranı sabitle, elde yenisi kalsın.
   *
   * Sabitlenen ekranın köşeleri o anda EKRANDA GÖRÜNEN dörtgen (koseMutlak),
   * orana çevrilmiş hâli. Yeni ekran aynı ölçüyle, bir ekran boyu sağa
   * kaydırılmış olarak duruyor ki ikisi üst üste binmesin ve kullanıcı yeni
   * olanı görsün.
   */
  /*
   * TASARIMI ALANIN İÇİNE, GERÇEK SANTİM ÖLÇÜSÜYLE KOY.
   *
   * Alanın birim karesinde tasarımın kapladığı pay, tasarımın piksel
   * ölçüsünün alanın piksel ölçüsüne oranı. Yani ekran alanı doldurmuyor;
   * yapılandırmada ne kadarsa o kadar yer kaplıyor ve alanın perspektifine
   * oturuyor. Doldurmak isteyen "Tasarımı sığdır" diyor.
   */
  /*
   * TASARIMIN ALAN İÇİNDEKİ ENİ VE BOYU — alanın birim karesinde (0..1).
   *
   * Sürükleme bunu DEĞİŞTİRMİYOR, yalnızca merkezi oynatıyor. Önce her
   * sürüklemede ölçü gerçek santimden yeniden hesaplanıyordu; "Alana sığdır"
   * ile alana oturtulmuş bir tasarım ilk dokunuşta kendi küçük ölçüsüne geri
   * dönüyordu — "sürükleyince küçülüyor" denen durum buydu.
   */
  const alanaYerlestir = (koseler, uMerkez = 0.5, vMerkez = 0.5, olcek = null, wM = null, hM = null) => {
    if (!Array.isArray(koseler) || koseler.length !== 4) return null
    const dW = wM != null ? wM : tasarimWm
    const dH = hM != null ? hM : tasarimHm
    /* Ölçek referanstan; cizimOlcek yalnızca yedek (bkz. alanOlcegiPxM). */
    const olcekPxM = alanOlcegiPxM || cizimOlcek
    if (!(olcekPxM > 0) || !(dW > 0) || !(dH > 0)) return null
    const enPx =
      (Math.hypot(koseler[1].x - koseler[0].x, koseler[1].y - koseler[0].y) +
        Math.hypot(koseler[2].x - koseler[3].x, koseler[2].y - koseler[3].y)) /
      2
    const boyPx =
      (Math.hypot(koseler[3].x - koseler[0].x, koseler[3].y - koseler[0].y) +
        Math.hypot(koseler[2].x - koseler[1].x, koseler[2].y - koseler[1].y)) /
      2
    if (!(enPx > 1) || !(boyPx > 1)) return null
    /*
     * Ölçü verilmişse o, yoksa tasarımın GERÇEK santiminden.
     *
     * ÜST SINIR YOK: tasarım alandan büyük olabilir ve taşabilir. Önce 1'e
     * kısılıyordu, yani sol panelden kabin eklenince tasarım alanı doldurup
     * orada duruyor, büyümesi ekrana yansımıyordu. Taşması sorun değil;
     * taşarken iki yana eşit taşsın diye ortalanıyor.
     */
    const u =
      olcek && olcek.u > 0
        ? Math.max(0.03, olcek.u)
        : alanEtkinCm && alanEtkinCm.enCm > 0
          ? Math.max(0.03, (dW * 100) / alanEtkinCm.enCm)
          : Math.max(0.03, (dW * olcekPxM) / enPx)
    const v =
      olcek && olcek.v > 0
        ? Math.max(0.03, olcek.v)
        : alanEtkinCm && alanEtkinCm.boyCm > 0
          ? Math.max(0.03, (dH * 100) / alanEtkinCm.boyCm)
          : Math.max(0.03, (dH * olcekPxM) / boyPx)
    /*
     * KONUM KISITLANMIYOR — tasarım alanın dışına da çıkabiliyor.
     *
     * Sol üst köşe 0..1-u arasına sıkıştırılıyordu: tasarım alanı neredeyse
     * dolduruyorsa (sığdır dedikten sonra olağan durum) oynayacak yer
     * kalmıyor, sürükleme sonuçsuz görünüyordu. Ölçülen örnekte 300 px'lik
     * alanda 288 px'lik tasarım yalnızca 6 px kayabiliyordu.
     *
     * İşaretlenen alan artık bir hapishane değil: ölçünün ve ilk yerleşimin
     * kaynağı. Nereye konacağını kullanıcı biliyor. Merkez 0,5 geldiğinde
     * sonuç eskisiyle aynı (ortalı), yani "ölçüye sığdır" davranışı bozulmuyor.
     * Ekrandan tamamen kaçmasını kadrajaCek engelliyor (bkz. koseTuval).
     */
    const u0 = uMerkez - u / 2
    const v0 = vMerkez - v / 2
    const n = [
      dortgenNoktasi(koseler, u0, v0),
      dortgenNoktasi(koseler, u0 + u, v0),
      dortgenNoktasi(koseler, u0 + u, v0 + v),
      dortgenNoktasi(koseler, u0, v0 + v),
    ]
    return n.every((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y)) ? n : null
  }

  /*
   * elleKose'ye MUTLAK dörtgen yazılmaz.
   *
   * Çizim yolu elleKose'nin üstüne sürükleme kaymasını EKLİYOR
   * (bkz. koseTuval). Hesapladığımız dörtgen ekranda görünmesini istediğimiz
   * yer, yani kayma zaten içinde; olduğu gibi yazınca kayma ikinci kez
   * ekleniyor ve tasarım yerinden oynuyor.
   */
  const elleKoseyeYaz = (mutlak) => {
    if (!Array.isArray(mutlak) || mutlak.length !== 4) return
    setElleKose(
      mutlak.map((k) => ({ x: k.x - (elleKayma?.x || 0), y: k.y - (elleKayma?.y || 0) })),
    )
  }


  /*
   * ALANI DÜZENLE — çizgiler duruyor, uçları yeniden sürüklenebiliyor.
   *
   * Sıfırdan işaretleme değil: var olan dört çizgi olduğu gibi açılıyor,
   * kullanıcı yalnızca uçları düzeltiyor. Araç açıldığı için tasarım bu
   * sırada gizleniyor.
   */
  const alaniDuzenle = () => {
    setTasarimAcik(false)
    setAlanKipi(true)
    setRefKipi(false)
    setRef2Kipi(false)
  }

  /* Alanı sıfırdan işaretlemek: çizgiler ve köşeler siliniyor. */
  const alaniTemizle = () => {
    setAlanNokta([])
    setAlanCizgi([])
    setAlanKenarKipi(false)
  }

  /* Köşe görünmüyor: o köşede birleşen iki kenarı işaretlemeye geç. */
  const kenarCizimeGec = () => {
    setAlanCizgi([])
    setAlanKenarKipi(true)
  }

  /* Vazgeç: köşe seçmeye dön, konulmuş köşelere dokunma. */
  const kenarCizimdenVazgec = () => {
    setAlanCizgi([])
    setAlanKenarKipi(false)
  }

  /*
   * İKİ KENARIN KESİŞİMİ = GÖRÜNMEYEN KÖŞE.
   *
   * Köşe kadrajın dışına düşebiliyor; sınır uygulanmıyor çünkü hesap
   * görüntü düzleminde çalışıyor ve pikselin fotoğrafın içinde olması
   * gerekmiyor.
   */
  const gorunmeyenKoseyiEkle = () => {
    const t = alanCizgi.map(oranTuvale)
    if (t.length < 4) return
    const k = dogruKesisimi(t[0], t[1], t[2], t[3])
    if (!k) return
    setAlanNokta((l) => (l.length >= 4 ? l : [...l, tuvalOrana(k)]))
    setAlanCizgi([])
    setAlanKenarKipi(false)
  }

  /*
   * KENAR ÇİZGİLERİ DEĞİŞTİ.
   *
   * Dört çizgi tamamlanmışsa köşeler hemen türetiliyor: kullanıcı
   * "Bitti"ye basmadan da alan çerçevesini ve ölçüyü görüyor. Dörtten az
   * çizgi varsa ya da kesişimler geçerli bir dörtgen vermiyorsa köşeler
   * boşaltılıyor — yarım bir alanın ölçüsü yanlış bilgi olurdu.
   */
  /*
   * Çizgiler yalnızca saklanıyor; köşeler ancak "Köşeleri oluştur"
   * denince kuruluyor (bkz. kenarlardanKur). Her tıklamada köşeleri
   * yeniden yazmak, kullanıcı daha çizerken elindeki köşeleri siliyordu.
   */
  const kenarCizgileriDegisti = (tuvalNoktalari) => setAlanCizgi(tuvalNoktalari.map(tuvalOrana))


  /* Dört nokta tamamlandı: işaretleme kapanıyor, tasarım alana giriyor. */
  const alaniBitir = () => {
    /* Geçersiz işaretleme ölçüye girmiyor: kullanıcı köşeleri düzeltiyor. */
    if (!alanGecerli) return
    const k = alanNokta.length === 4 ? koseleriSirala(alanNokta.map(oranTuvale)) : null
    /*
     * KÖŞELER BUNDAN SONRA SIRALI: SÜ, SağÜ, SağA, SolA.
     *
     * Tıklama sırası herhangi bir sıra olabiliyor; hesaplar zaten her
     * seferinde sıralıyordu. Kaydın kendisi sıralı olunca düzenlemede
     * "hangi köşe hangisi" sorusu da ortadan kalkıyor (bkz. köşe çekme).
     */
    if (k) setAlanNokta(k.map(tuvalOrana))
    setAlanKipi(false)
    setAlanKonum({ u: 0.5, v: 0.5 })
    setAlanDoldur(false)
    setAlanOlcek(null)
    const yeni = k ? alanaYerlestir(k) : null
    if (yeni) elleKoseyeYaz(yeni)
    /*
     * ONAYDAN SONRA TASARIM GÖRÜNÜR.
     *
     * Burada ölçü kesin değilse doğrudan ikinci referans İŞARETLEME kipine
     * geçiliyordu. O kip tasarımı gizliyor (bkz. ekranGizle: işaretlerken
     * altındaki yer görünsün diye) — sonuç, alanı onaylayan kullanıcının
     * hiçbir şey görmemesiydi: sığdırma kabin sayısını hesaplıyor ama
     * ekranda tasarım yok.
     *
     * İkinci referans KALKMADI, teklif olarak duruyor: kart ölçünün kesin
     * olmadığını yazıyor ve işaretleme düğmesini gösteriyor. İşaretleme
     * ancak kullanıcı ona bastığında başlıyor.
     */
    setRef2Kipi(false)
    setSihirbazAdim(4)
    /*
     * ONAY TASARIMI GÖSTERİYOR.
     *
     * Bir ara tasarım ancak "Tasarımı ölçüye sığdır" deyince çıkıyordu;
     * ürün kararı değişti: alan onaylandığı anda görünüyor. Ölçü işi o
     * noktada bitmiş oluyor, dolayısıyla "ölçü yaparken tasarım
     * görünmesin" kuralıyla çelişmiyor.
     */
    setTasarimAcik(true)
    /*
     * OTOMATİK SIĞDIRMA YOK.
     *
     * Onayda tasarım alanı dolduracak boyuta çekiliyordu; kullanıcının
     * panelde kurduğu gerçek ölçü sessizce değişiyordu. Ekran kendi
     * ölçüsüyle ve işaretlenen alanın perspektifinde duruyor; alanı
     * doldurması ancak "Alana sığdır" denince oluyor.
     */
  }

  /* Alanı tamamen doldur — montaj payıyla (bkz. sigdirDortgen). */
  /*
   * ───────────────────────────────────────────────────────────────────────
   * ÖLÇÜYE SIĞDIR — TASARIM İŞARETLENEN DÖRT KÖŞEYE BİREBİR OTURUYOR.
   *
   * Önce sigdirDortgen kullanılıyordu: tasarımın EN-BOY ORANINI koruyarak
   * alana sığdırıyor, üstüne de montaj payı bırakıyordu. Sonuç, kullanıcının
   * işaretlediği alanla örtüşmüyordu — oran tutmayınca tasarım alanın
   * içinde küçük kalıyor, bazen de alanın dışına taşan yamuk bir şekil
   * çıkıyordu.
   *
   * İstenen açık: işaretlenen alan NEREYSE tasarım tam oraya otursun. Artık
   * çizilen dörtgen işaretlenen dörtgenin kendisi; alan, tasarım ve 3B
   * görünüm aynı dört noktayı paylaşıyor.
   *
   * Bedeli dürüst: alanın oranı tasarımın oranından farklıysa görüntü o
   * oranda esniyor. Ürünün kendi ölçüsünü değiştirmek (kaç kabin sığdığını
   * hesaplayıp sütun/satır kurmak) denendi ve geri alındı; orada tasarım
   * alandan taşıyordu. Oranı da birlikte düzeltmek ayrı bir adım.
   * ───────────────────────────────────────────────────────────────────────
   */
  /*
   * ───────────────────────────────────────────────────────────────────────
   * ÖLÇÜYE SIĞDIR — EKRANIN KENDİSİ BÜYÜYOR, GÖRÜNTÜ ESNEMİYOR.
   *
   * İki yanlış deneme oldu, ikisi de burada yazılı dursun:
   *   1) Yalnızca çizilen dörtgen alana oturtuluyordu. Tasarım alanı
   *      dolduruyor gibi görünüyor ama sol paneldeki sütun/satır 1x1
   *      kalıyordu — üründe hiçbir şey değişmiyor, sadece resim esniyordu.
   *   2) Kabin sayısı hesaplanıp çizim yine alanı DOLDURACAK şekilde
   *      yapılıyordu; o zaman da tasarım alandan taşıyordu.
   *
   * Doğrusu: alana kaç kabin sığdığı hesaplanıyor, yapılandırma ona göre
   * kuruluyor ve tasarım KENDİ GERÇEK ÖLÇÜSÜYLE alanın ORTASINA konuyor.
   * Kabinler tam sayı olduğu için kenarlarda boşluk kalıyor — kalsın;
   * gerçekte kurulabilecek olan bu.
   *
   * Hesap duvara sığdırmayla aynı işlevi kullanıyor (yerlesimSecenekleri):
   * iki yön de deneniyor, LED sayısı fazla olan seçiliyor, eşitlikte yatay.
   * ───────────────────────────────────────────────────────────────────────
   */
  /*
   * Köşeler dışarıdan da verilebiliyor: alan ONAYLANDIĞI anda çağrılırken
   * setAlanNokta henüz state'e işlemiş olmuyor ve alanTuval eskisini
   * söylüyor. Verilmezse eski davranış (durumdan okuma) sürüyor.
   */
  const tasarimiAlanaSigdir = (disaridanKose = null) => {
    /* Yalnizca gercek bir dortgen kabul ediliyor (bkz. onAlanSigdir). */
    const alanTuval =
      Array.isArray(disaridanKose) && disaridanKose.length === 4 ? disaridanKose : alanTuvalDurum
    const olcekPxM = alanOlcegiPxM || cizimOlcek
    if (!alanTuval || !(olcekPxM > 0)) return
    /*
     * HAM MODEL — previewModel değil.
     *
     * previewModel, ekran dikey duruyorken kabinin enini ve boyunu takas
     * ederek veriyor. Hesap ondan beslenince "yatay" aslında "şu anki
     * duruş" demek oluyor, ama sonuç MUTLAK yön olarak yazılıyor; ekran bir
     * kez dikeye döndüyse sonraki sığdırmalar yönü ters belirliyordu.
     */
    const m = selectedModel || previewModel
    if (!m) return
    const enPx =
      (Math.hypot(alanTuval[1].x - alanTuval[0].x, alanTuval[1].y - alanTuval[0].y) +
        Math.hypot(alanTuval[2].x - alanTuval[3].x, alanTuval[2].y - alanTuval[3].y)) /
      2
    const boyPx =
      (Math.hypot(alanTuval[3].x - alanTuval[0].x, alanTuval[3].y - alanTuval[0].y) +
        Math.hypot(alanTuval[2].x - alanTuval[1].x, alanTuval[2].y - alanTuval[1].y)) /
      2
    if (!(enPx > 1) || !(boyPx > 1)) return
    /*
     * Alanın gerçek ölçüsü: önce perspektiften (alanGercek), o çıkmazsa
     * tek ölçekli hesap. İkincisi yalnızca yüzey karşıdan görünürken
     * devreye giriyor ve orada zaten doğru.
     */
    const alanWm = alanEtkinCm ? alanEtkinCm.enCm / 100 : enPx / olcekPxM
    const alanHm = alanEtkinCm ? alanEtkinCm.boyCm / 100 : boyPx / olcekPxM
    /*
     * ───────────────────────────────────────────────────────────────────
     * TAŞMA YOK: ALANA SIĞAN EN FAZLA KABİN.
     *
     * Bir ara en yakına yuvarlanıyordu ("boşluk kalmasın" diye): 192 cm'lik
     * bir alan 191,9 ölçülünce 5,997 çıkıyor ve aşağı yuvarlamak bir kabini
     * komple yutuyordu. Ama bedeli ağırdı — 345 x 127 cm'lik bir alana
     * 352 x 128 cm, 391 x 184 cm'lik bir alana 384 x 192 cm kuruluyor,
     * yani tasarım işaretlenen çizginin dışına taşıyordu. Ürün kararı:
     * TAŞMA YOK. Bir satır/sütun daha eklemek alanı aşıyorsa eklenmiyor;
     * kalan küçük boşluğu kullanıcı isterse elle kapatıyor.
     *
     * Bu, "Duvara sığdır"ın kuralıyla da aynı (bkz. yerlesimSecenekleri):
     * iki düğme artık aynı şeyi yapıyor, biri alana biri duvara.
     *
     * YÖN: en çok kabin sığan duruş seçiliyor (bugünkü "Duvara sığdır"
     * mantığı); eşitlikte yatay kalıyor. Kullanıcıya yön sorulmuyor.
     * ───────────────────────────────────────────────────────────────────
     */
    const sigan = (alanM, kabinM) => Math.max(1, Math.floor(alanM / kabinM + 1e-9))
    const kurul = (kabinWmm, kabinHmm) => {
      const kw = kabinWmm / 1000
      const kh = kabinHmm / 1000
      const c = sigan(alanWm, kw)
      const r = sigan(alanHm, kh)
      /* Küçük olan kazanıyor: artık taşma yok, sapma = kalan boşluk. */
      return { cols: c, rows: r, sapma: (alanWm - c * kw) + (alanHm - r * kh), adet: c * r }
    }
    const gWmm = m.widthMm || 500
    const gHmm = m.heightMm || 500
    const yatay = kurul(gWmm, gHmm)
    const dikey = kurul(gHmm, gWmm)
    /* En çok kabin sığan duruş; eşitlikte yatay (sebepsiz çevirme yok). */
    const dikeySec = dikey.adet > yatay.adet
    const kazanan = dikeySec ? dikey : yatay
    /* Kazanan yönün kabin ölçüsü: dikeyde kabin yan yatıyor. */
    const cwM2 = ((dikeySec ? m.heightMm : m.widthMm) || 500) / 1000
    const chM2 = ((dikeySec ? m.widthMm : m.heightMm) || 500) / 1000
    const c = kazanan.cols
    const r = kazanan.rows
    const yeniWm = c * cwM2
    const yeniHm = r * chM2
    if (!(yeniWm > 0) || !(yeniHm > 0)) return
    setOrientation(dikeySec ? 'portrait' : 'landscape')
    setCols(c)
    setRows(r)
    /* Duvar alanı da en az bu kadar olmalı, yoksa üst sınır kabinleri kırpar. */
    setWidth((e) => Math.max(e, +yeniWm.toFixed(2)))
    setHeight((e) => Math.max(e, +yeniHm.toFixed(2)))
    /*
     * Çizim YENİ gerçek ölçüyle, alanın ortasına. Ölçü dışarıdan veriliyor
     * çünkü cols/rows daha state'e yazılmadı ve tasarimWm hâlâ eskisini
     * söylüyor.
     */
    /*
     * ÖLÇÜ DONDURULMUYOR.
     *
     * Sabit bir u/v saklanınca tasarım o boyda kilitleniyor ve sol panelden
     * kabin eklemek ekrana yansımıyordu. null bırakılınca ölçü her çizimde
     * tasarımın O ANKİ gerçek santiminden geliyor; kullanıcı sütun/satır
     * değiştirdikçe ekran da büyüyüp küçülüyor.
     */
    const n = alanaYerlestir(alanTuval, 0.5, 0.5, null, yeniWm, yeniHm)
    if (n) elleKoseyeYaz(n)
    setAlanOlcek(null)
    setAlanKonum({ u: 0.5, v: 0.5 })
    /* Sığdırma aynı zamanda tasarımın göründüğü an. */
    setTasarimAcik(true)
    /* Kenarlarda boşluk var: alanı doldurmuyor, dolayısıyla sürüklenebilir. */
    setAlanDoldur(false)
    setOzelUyari(
      t('scene.alanSigdiDone') +
        ' ' +
        c +
        ' × ' +
        r +
        ' ' +
        t('scene.cabinets') +
        ' (' +
        yeniWm.toFixed(2).replace('.', ',') +
        ' × ' +
        yeniHm.toFixed(2).replace('.', ',') +
        ' m) · ' +
        t('scene.alanOlcusu') +
        ' ' +
        alanWm.toFixed(2).replace('.', ',') +
        ' × ' +
        alanHm.toFixed(2).replace('.', ',') +
        ' m',
    )
  }

  /*
   * ALAN İÇİNDE TAŞIMA.
   *
   * Fare hareketi alanın birim karesine çevriliyor ve 0..1'e sıkıştırılıyor:
   * ekran işaretlenen alanın dışına çıkamıyor. Çevirme oranı alanın ortalama
   * piksel ölçüsü — perspektif yüzünden uzak kenarda bir piksel daha çok yol
   * demek ama fark sürükleme hissinde kayboluyor; sınır yine de kesin.
   *
   * Sürüklemek "alanı doldur" halinden çıkarıyor: doldurulmuş bir ekranı
   * taşımanın anlamı yok, alanın tamamı zaten o.
   */
  const alanIcindeSurukle = (e) => {
    if (!alanTuval) return
    if (e.button != null && e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const enPx =
      (Math.hypot(alanTuval[1].x - alanTuval[0].x, alanTuval[1].y - alanTuval[0].y) +
        Math.hypot(alanTuval[2].x - alanTuval[3].x, alanTuval[2].y - alanTuval[3].y)) /
      2
    const boyPx =
      (Math.hypot(alanTuval[3].x - alanTuval[0].x, alanTuval[3].y - alanTuval[0].y) +
        Math.hypot(alanTuval[2].x - alanTuval[1].x, alanTuval[2].y - alanTuval[1].y)) /
      2
    if (!(enPx > 1) || !(boyPx > 1)) return
    const basX = e.clientX
    const basY = e.clientY
    const bas = alanKonum
    const tasi = (ev) => {
      /*
       * SERBEST TAŞIMA — alanın dışına da çıkabiliyor.
       *
       * Önce 0..1 arasına sıkıştırılıyordu: ekran işaretlenen alanı hiç
       * terk edemiyor, alanı tam dolduruyorsa da hiç kıpırdamıyordu.
       * İstenen serbestlik; alan artık bir hapishane değil, yalnızca
       * ölçünün ve ilk yerleşimin kaynağı. Değer yine alanın kendi
       * koordinatında olduğu için ekran taşınırken o düzlemin
       * perspektifine oturmaya devam ediyor.
       *
       * Çok uzağa kaçıp kaybolmasın diye geniş bir sınır var: alanın iki
       * katı kadar dışarı.
       */
      /*
       * SINIR YOK: tasarim tuvalde istenen her yere goturulebiliyor.
       *
       * Once 0..1 arasina sikistiriliyordu (alanin disina cikamiyordu),
       * sonra alanin iki kati kadar disari izin verilmisti. Ikisi de
       * yetmedi; istenen tam serbestlik. Deger yine alanin kendi
       * koordinatinda oldugu icin tasarim nereye giderse gitsin o duzlemin
       * perspektifine oturmaya devam ediyor.
       */
      const u = bas.u + (ev.clientX - basX) / enPx
      const v = bas.v + (ev.clientY - basY) / boyPx
      if (!Number.isFinite(u) || !Number.isFinite(v)) return
      setAlanKonum({ u, v })
      /* Ölçü KORUNUYOR: sürükleme yalnızca yeri değiştiriyor. */
      const yeni = alanaYerlestir(alanTuval, u, v, alanOlcek)
      if (yeni) elleKoseyeYaz(yeni)
    }
    const birak = () => {
      window.removeEventListener('pointermove', tasi)
      window.removeEventListener('pointerup', birak)
      window.removeEventListener('pointercancel', birak)
    }
    window.addEventListener('pointermove', tasi)
    window.addEventListener('pointerup', birak)
    window.addEventListener('pointercancel', birak)
  }

  /*
   * EKRANIN O ANKİ YAPILANDIRMASI — kayda birlikte giriyor.
   *
   * Bugün hepsi aynı çiziliyor (eklenen ekran 1. ekranla aynı model, satır,
   * sütun ve içerikle geliyor; istenen de bu). Ama ekran başına ayrı
   * yapılandırma sonra gelecek ve o zaman geçmişe dönük veri üretilemez —
   * bu yüzden anlık görüntü ŞİMDİDEN saklanıyor. Çizimde henüz
   * kullanılmıyor, yani bugünkü davranış değişmiyor.
   */
  /*
   * ───────────────────────────────────────────────────────────────────────
   * EKRANIN AYARI — YÖN DE BURADA.
   *
   * Sütun/satır saklanıyordu ama KABİNİN YÖNÜ (yatay/dikey) saklanmıyordu.
   * Yön tek bir genel durumdur ve "ölçüye sığdır" onu değiştirebiliyor:
   * dar ve uzun bir alana sığdırınca kabin yan yatıyor. Başka bir ekrana
   * geçilince o yön olduğu yerde kalıyor ve geri dönülen ekranın sütun/satır
   * sayısı YANLIŞ kabin ölçüsüyle çiziliyordu.
   *
   * Ölçüldü: 9 × 160 mm ile kurulan ekran (çizim 432 × 96) geri dönüldüğünde
   * 9 × 320 mm oluyor ve çizim 864 × 48'e dönüyordu — kullanıcının gördüğü
   * "tıklayınca tasarımın boyutları bozuluyor" buydu.
   *
   * Ekran türü (düz/kavisli) ve kavis miktarı da aynı sebeple burada.
   * ───────────────────────────────────────────────────────────────────────
   */
  /*
   * MODEL EKRAN BAŞINA SAKLANMIYOR: bütün ekranlar aynı modeli kullanıyor
   * (ürün kararı). Kayıtta durması, geri yüklenmediği hâlde "her ekranın
   * kendi modeli var" izlenimi bırakıyordu.
   */
  /*
   * DUVAR GRUBUN TAMAMINA AİT.
   *
   * Birleşik bir grup tek bir duvarın önünde duruyor; üyelerin ayrı
   * duvar ölçüsü olması, hangi üye seçiliyse kutuda başka bir sayı
   * görünmesi demekti. Değer elde duran ekrana yazılıyor, grup varsa
   * öteki üyelerin kaydına da işleniyor.
   */
  const duvariGrubaYaz = (alan, deger) => {
    const uyeler = Array.isArray(grup?.uyeler) ? grup.uyeler : null
    if (!uyeler || uyeler.length < 2) return
    setSabitEkranlar((l) =>
      l.map((e) => (uyeler.includes(e.id) ? { ...e, ayar: { ...(e.ayar || {}), [alan]: deger } } : e)),
    )
  }
  const duvarEniniYaz = (v) => {
    setWidth(v)
    duvariGrubaYaz('duvarW', v)
  }
  const duvarBoyunuYaz = (v) => {
    setHeight(v)
    duvariGrubaYaz('duvarH', v)
  }

  const ekranAyariAnlik = () => ({
    cols,
    rows,
    orientation,
    screenType,
    curveAmount,
    lSolCols,
    lYon,
    content,
    contentUrl: contentUrl || null,
    /* Her ekranın kendi duvarı: ekran değiştirince geri gelsin. */
    duvarW: width,
    duvarH: height,
  })

  /*
   * EKRAN KAYDI — sabitlenen ekranin tasidigi her sey.
   * Yalnizca dortgeni degil KENDI ALANINI ve alan icindeki yerini de
   * tasiyor; "Duzenle" ile donuldugunde alani da geri gelsin diye.
   */
  const ekranKaydi = () => {
    /*
     * YERİ OLMAYAN EKRAN DA KAYIT. Fotoğrafsız sahnede ekranın yeri hiç
     * yok; fotoğraflı sahnede de henüz yerleştirilmemiş olabilir. Kayıt
     * üretilmediğinde o ekran listeden sessizce düşüyordu — akordeonda
     * bir satıra tıklamak bütün bir ekranı siliyor demekti.
     */
    /*
     * Çizimden okunamıyorsa yerleştirmede saklanan köşeler kullanılıyor:
     * ekran yer değiştirirken dörtgenini kaybetmiyor.
     */
    const hamKose =
      Array.isArray(koseMutlak) && koseMutlak.length === 4
        ? koseMutlak
        : Array.isArray(yerKoseRef.current[aktifEkranId]) && yerKoseRef.current[aktifEkranId].length === 4
          ? yerKoseRef.current[aktifEkranId]
          : null
    const yerliKose = hamKose ? hamKose.map(tuvalOrana) : null
    const oran =
      yerliKose && !yerliKose.some((q) => !Number.isFinite(q?.x) || !Number.isFinite(q?.y)) ? yerliKose : null
    if (scene !== 'ozel' || !oran) {
      return {
        id: aktifEkranId ?? yeniEkranKimligi(),
        sira: aktifSira,
        oran: null,
        ayar: ekranAyariAnlik(),
      }
    }
    return {
      id: aktifEkranId ?? yeniEkranKimligi(),
      sira: aktifSira,
      oran,
      alan: alanNokta.length === 4 ? alanNokta.map((q) => ({ ...q })) : null,
      konum: { ...alanKonum },
      doldur: alanDoldur,
      olcek: alanOlcek ? { ...alanOlcek } : null,
      /*
       * Elle yazilan olcu de ekranin kendi bilgisi: iki ekranin alani ayni
       * olcude olmak zorunda degil. Tasinmazsa duzenlemeye donuldugunde
       * kutuda baska ekranin yazdigi sayi duruyordu.
       */
      elleEn: alanElleEn,
      elleBoy: alanElleBoy,
      /* Kenar çizgileri de ekranın kendi bilgisi: düzenlemede geri geliyor. */
      cizgi: alanCizgi.length === 8 ? alanCizgi.map((q) => ({ ...q })) : null,
      ayar: ekranAyariAnlik(),
    }
  }

  /*
   * YENİ EKRAN İÇİN AYNI SÜREÇ BAŞTAN.
   *
   * Yeni ekran duranın bir boy sağına kopyalanıyordu; 2. ekranın nereye
   * gireceği de 1. ekranınki gibi İŞARETLENEREK belirlenmeli. Alan
   * işaretleme hemen açılıyor, tasarım işaretleme bitene kadar gizli.
   */
  const yeniEkranaBasla = () => {
    setAktifEkranId(yeniEkranKimligi())
    setAktifSira(sonrakiSira())
    /*
     * YENİ EKRAN BOŞ BAŞLIYOR.
     *
     * İçerik bir önceki ekrandan devralınıyordu; oysa yeni ekran ayrı bir
     * ürün ve içeriği ayrıca seçiliyor. Varsayılan LED (boş ekran).
     */
    setContent('led')
    /* Havuzdaki adres bırakılmıyor: başka ekranlar onu kullanıyor olabilir. */
    setContentUrl(null)
    setAlanNokta([])
    setAlanCizgi([])
    setAlanElleEn('')
    setAlanElleBoy('')
    setAlanKonum({ u: 0.5, v: 0.5 })
    setAlanDoldur(false)
    setAlanOlcek(null)
    setElleKose(null)
    setRefKipi(false)
    setLKoseKipi(false)
    /*
     * YENİ EKRANDA DA AYNI SEÇİM, REFERANS YOK.
     *
     * Ölçek fotoğrafa ait; bir kez kurulduktan sonra bütün ekranlar onu
     * kullanıyor. Yeni ekran doğrudan alan işaretlemeye giriyordu; artık
     * o da "Alanı işaretle / Serbest yerleştir" seçimiyle başlıyor.
     */
    setAlanKipi(false)
    /* Ölçü sihirbazı fotoğrafa ait; fotoğrafsız sahnede açılacak adım yok. */
    if (scene === 'ozel') setSihirbazAdim(3)
  }

  const ekranEkleEski = () => {
    if (!Array.isArray(koseMutlak) || koseMutlak.length !== 4) return
    const oran = koseMutlak.map(tuvalOrana)
    if (oran.some((p) => !Number.isFinite(p?.x) || !Number.isFinite(p?.y))) return
    const kimlik = aktifEkranId ?? yeniEkranKimligi()
    setSabitEkranlar((l) => [...l, { id: kimlik, oran, ayar: ekranAyariAnlik() }])
    setAktifEkranId(yeniEkranKimligi())
    /* Yeni ekran: aynı dörtgen, bir boy sağa. */
    const en = Math.max(
      Math.hypot(koseMutlak[1].x - koseMutlak[0].x, koseMutlak[1].y - koseMutlak[0].y),
      Math.hypot(koseMutlak[2].x - koseMutlak[3].x, koseMutlak[2].y - koseMutlak[3].y),
    )
    const pay = en * 1.1
    setElleKose(koseMutlak.map((k) => ({ x: k.x + pay, y: k.y })))
  }
  void ekranEkleEski

  const ekranEkle = () => {
    const kayit = ekranKaydi()
    if (!kayit) return
    setSabitEkranlar((l) => [...l, kayit])
    yeniEkranaBasla()
  }

  /*
   * SABİT EKRANI DÜZENLEMEYE AL.
   *
   * Duran ekran KENDİ kimliğiyle listeye dönüyor, seçilen listeden çıkıp ele
   * geliyor. Hiçbir ekran kaybolmuyor, her an tam olarak biri düzenleniyor ve
   * kimlikler yer değiştirmiyor (bkz. aktifEkranId).
   */
  const ekraniDuzenle = (id) => {
    const secilen = sabitEkranlar.find((e) => e.id === id)
    if (!secilen) return
    /*
     * Ele alinan ekranin yerini birakan ekran TAM kaydiyla sabitleniyor.
     * Daha once yalnizca dortgeni ve ayari saklaniyordu; kendi ALANI ve alan
     * icindeki yeri dusuyordu, yani bir kere yer degistirdikten sonra o
     * ekrani duzenlemeye donmek artik olcuyu geri getirmiyordu.
     * ekranKaydi() aktif kimligi ve sirayi kullandigi icin birakan ekran
     * kendi kimligiyle kaliyor.
     */
    const birakan = ekranKaydi()
    setSabitEkranlar((l) => {
      const kalan = l.filter((e) => e.id !== id)
      /* Duran ekranın dörtgeni yoksa (ölçü kurulmamış) sabitlenecek bir şey de yok. */
      return birakan ? [...kalan, birakan] : kalan
    })
    /*
     * ───────────────────────────────────────────────────────────────────
     * EKRANIN KENDİ DİZİLİMİ DE GERİ GELİYOR.
     *
     * Dörtgen geri yükleniyordu ama sütun/satır yüklenmiyordu. Çizim her
     * değişiklikte tasarımın O ANKİ gerçek ölçüsünden yeniden kuruluyor
     * (bkz. aşağıdaki useEffect), dolayısıyla 2. ekrana geçildiğinde o
     * ekran 1. ekranın diziliminden türeyen ölçüyle çiziliyordu: kullanıcı
     * tıkladığı ekranın boyunun değiştiğini görüyordu.
     *
     * Modelin kendisi değiştirilmiyor: previewModel seçili modelden
     * türüyor ve ekranlar arasında model değiştirmek ayrı bir iş.
     * ───────────────────────────────────────────────────────────────────
     */
    const ayar = secilen.ayar
    if (ayar) {
      /*
       * YÖN SÜTUN/SATIRDAN ÖNCE: kabin ölçüsü ondan türüyor. Eski
       * kayıtlarda yön yok; oradaki davranış değişmesin diye dokunulmuyor.
       */
      if (ayar.orientation) setOrientation(ayar.orientation)
      if (ayar.screenType) setScreenType(ayar.screenType)
      setLSolCols(ayar.lSolCols ?? null)
      setLYon(ayar.lYon || 'ice')
      if (ayar.curveAmount != null) setCurveAmount(ayar.curveAmount)
      if (ayar.cols > 0) setCols(ayar.cols)
      if (ayar.rows > 0) setRows(ayar.rows)
      if (ayar.content) setContent(ayar.content)
      setContentUrl(ayar.contentUrl || null)
    }
    /* Seçilen ekranın kendi alanı ve alan içindeki yeri de geri geliyor. */
    setAlanKipi(false)
    /* Duvar da ekranın kendi kaydından. */
    if (secilen.ayar?.duvarW > 0) setWidth(secilen.ayar.duvarW)
    if (secilen.ayar?.duvarH > 0) setHeight(secilen.ayar.duvarH)
    setAlanNokta(Array.isArray(secilen.alan) && secilen.alan.length === 4 ? secilen.alan : [])
    setAlanCizgi(Array.isArray(secilen.cizgi) && secilen.cizgi.length === 8 ? secilen.cizgi : [])
    setAlanKonum(secilen.konum || { u: 0.5, v: 0.5 })
    setAlanDoldur(!!secilen.doldur)
    setAlanOlcek(secilen.olcek || null)
    setAlanElleEn(secilen.elleEn || '')
    setAlanElleBoy(secilen.elleBoy || '')
    /*
     * Yersiz kayıtta geri yüklenecek köşe yok; eldekiler de TEMİZLENİYOR.
     * Önceki ekranın köşeleri kalırsa yeri belli olmayan ekran yerleşmiş
     * gibi görünüyor ve bölünmüş içerikte kendine dilim alıyordu.
     */
    /*
     * Dörtgen önce kayıttan, o yoksa yerleştirmede saklanan köşelerden.
     * Böylece arada bir kayıt güncellemesi kaçsa bile ekran yerini
     * kaybetmiyor.
     */
    if (Array.isArray(secilen.oran) && secilen.oran.length === 4) {
      elleKoseyeYaz(secilen.oran.map(oranTuvale))
    } else if (Array.isArray(yerKoseRef.current[id]) && yerKoseRef.current[id].length === 4) {
      elleKoseyeYaz(yerKoseRef.current[id])
    }
    else setElleKose(null)
    setAktifEkranId(secilen.id)
    setAktifSira(secilen.sira || 1)
    /*
     * ÖLÇÜ KARTI SON ADIMDAN AÇILIYOR.
     *
     * Akış baştan açılıyordu: düzenlemek istenen tek şey kutunun yeri ya da
     * santimi olsa bile referans yeniden işaretleniyor, dört köşe yeniden
     * konuyor, her şey başa sarıyordu. Oysa bu ekranın ölçüsü zaten kurulu.
     * Kart, yapılacak işin bulunduğu adımda açılıyor: taşıma, "ölçüye
     * sığdır" ve santim kutuları 4. adımda. Baştan kurmak isteyen "Geri"
     * ile adım adım geriye gidebiliyor.
     *
     * Ölçüsü hiç kurulmamış bir ekran (alanı yok) için başa dönmek doğru:
     * orada 4. adımda gösterilecek bir şey yok.
     */
    /*
     * ───────────────────────────────────────────────────────────────────
     * REFERANS BİR KEZ SORULUYOR.
     *
     * Ölçüsü kurulmamış bir ekrana geçerken akış 1. adımdan açılıyordu,
     * yani fotoğrafın ölçeği ÇOKTAN kurulmuşken referans yeniden
     * isteniyordu. Referans fotoğrafa aittir, ekrana değil: bir kere
     * verilir, bütün ekranlar onu kullanır.
     *
     * Sıralama: alanı varsa yerleştirmeye (4), yoksa ama ölçek kuruluysa
     * doğrudan alan işaretlemeye, ölçek de yoksa en baştan.
     * Referansı yine de değiştirmek isteyen "Geri" ile oraya gidiyor.
     * ───────────────────────────────────────────────────────────────────
     */
    /*
     * ÖLÇÜ AKIŞI FOTOĞRAFA AİT.
     *
     * Fotoğrafsız sahnede ölçülecek bir şey yok; akışı açmak tasarımı
     * gizliyor ve mekân panelini kapatıyordu (bkz. olcuAcik). Ekran
     * kartına tıklamak bütün ekranları yok ediyor gibi görünmesinin
     * sebebi buydu.
     */
    if (scene !== 'ozel') {
      setDuzenlemede(false)
      setRefKipi(false)
      setAlanKipi(false)
      setSihirbazAdim(0)
      return
    }
    setDuzenlemede(true)
    /*
     * TIKLAMAK YALNIZCA SEÇİYOR.
     *
     * Burada eskiden "kayıtta alan yoksa dört köşeyi yeniden işaretlet"
     * vardı. Yeni yolda ekranın yeri dört köşesinde duruyor, ayrı bir
     * alan kaydı yok; o yüzden her tıklama ölçümü baştan istiyor ve
     * tasarım gizlendiği için ekran kayboluyordu.
     *
     * Ölçek yoksa (referans hiç alınmamış) tek yapılacak iş o: referans
     * adımı açılıyor. Varsa hiçbir şey sorulmuyor.
     */
    setRefKipi(false)
    setAlanKipi(false)
    setSihirbazAdim(refPxCm || refDuzlem ? 0 : 1)
  }

  /*
   * KALDIRMAK ONAY İSTİYOR.
   *
   * Ekranın alanı, ölçüsü, dizilimi ve içeriği onunla birlikte gidiyor ve
   * geri alma yok; yanlışlıkla basılan bir düğme bütün bir ekranın kurulum
   * emeğini siliyordu.
   */

  /*
   * BİRLEŞİMİ KUR — değerler DIŞARIDAN veriliyor.
   *
   * Şekle, kutucuğa, açıya ya da köşe yönüne basıldığı anda çağrılıyor.
   * Durum güncellemeleri eşzamansız olduğu için o anki değerleri
   * beklemek yerine çağıran ne verdiyse onunla kuruluyor.
   */
  const birlesimiKur = (tip, secim, aci, yon) => {
    const sirali = [...sabitEkranlar, { id: aktifEkranId, sira: aktifSira }]
      .filter((e) => secim.includes(e.id))
      .sort((a, b) => (a.sira || 0) - (b.sira || 0))
      .map((e) => e.id)
    /* İki ekrandan azı birleşim değildir. */
    if (sirali.length < 2) {
      setGrup(null)
      return
    }
    setGrup((eski) => ({
      tip,
      aci,
      uyeler: sirali,
      /* Görsel paylaşımı kullanıcının kararı; şekil değişince sıfırlanmıyor. */
      tekGorsel: eski?.tekGorsel ?? true,
      lYon: yon,
      /*
       * EKLEMLER — her komşu çift için bir kayıt.
       * Var olanlar korunuyor; yeni eklem varsayılanla doğuyor. Ekran
       * eklenip çıkınca ötekilerin açısı bozulmuyor.
       */
      eklemler: Array.from({ length: Math.max(0, sirali.length - 1) }, (_, j) => ({
        aci: eski?.eklemler?.[j]?.aci ?? aci ?? 135,
      })),
    }))
    /*
     * DUVAR BİRLEŞİMİN TAMAMININ.
     *
     * Birleşik grup tek bir duvarın önünde duruyor. Üyeler kendi duvar
     * ölçüsünü taşımayı sürdürseydi, hangi üye seçilirse kartta başka bir
     * sayı görünecekti. Elde duran ekranın ölçüsü hepsine yazılıyor.
     */
    setSabitEkranlar((l) =>
      l.map((e) =>
        sirali.includes(e.id)
          ? { ...e, ayar: { ...(e.ayar || {}), duvarW: width, duvarH: height } }
          : e,
      ),
    )
  }

  /*
   * DÜZ BİRLEŞİM VARSAYILAN.
   *
   * İkinci ekran eklenince hiçbir tip seçili olmuyordu: "Düz" bile
   * vurgusuz duruyor, altındaki görsel paylaşımı ve "Ayır" sönük
   * kalıyordu. Kullanıcı seçeneklerin çalıştığını ancak bir tipe
   * tıklayınca görüyordu.
   *
   * Varsayılan BİR KEZ kuruluyor: "Ayır" dendikten sonra geri
   * gelmiyor, yoksa ayırmak imkânsız olurdu.
   */
  const duzVarsayilanRef = useRef(false)
  useEffect(() => {
    if (grup || duzVarsayilanRef.current) return
    if (ekranParcalari.length < 2) return
    duzVarsayilanRef.current = true
    const idler = ekranParcalari.map((x) => x.id)
    setGrupSecim(idler)
    setGrupTipi('duz')
    birlesimiKur('duz', idler, grupAcisi, lYonSecim)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grup, ekranParcalari.length])

  /*
   * AYIR — grup bozuluyor, ekranlar BULUNDUKLARI yerde kalıyor.
   * Türetilmiş dörtgenler kayıtlara yazılıyor ki hiçbiri yerinden oynamasın.
   */
  const grubuAyir = () => {
    /* İç L'de grup yok; katlanan ekranın kendisi düze dönüyor. */
    if (!grup && (screenType || 'flat') === 'lshape') {
      setScreenType('flat')
      setLSolCols(null)
      setLYon('ice')
      return
    }
    if (grupKoseleri) {
      setSabitEkranlar((l) =>
        l.map((e) =>
          grupKoseleri.has(e.id) ? { ...e, oran: grupKoseleri.get(e.id).map(tuvalOrana) } : e,
        ),
      )
    }
    setGrup(null)
  }

  const ekranSil = (id) => {
    if (!window.confirm(t('ekran.silOnay'))) return
    setSabitEkranlar((l) => l.filter((e) => e.id !== id))
  }

  /*
   * AKORDEONDAN EKRAN KALDIRMA.
   *
   * ekranSil yalnızca KAYITLI ekranı siliyordu; akordeonda "Kaldır" açık
   * satırda duruyor ve açık satır elde duran ekran. Elde duran ekran
   * kaldırılınca listedeki ilk ekran ele alınıyor, bırakan ekran da
   * düşüyor. İki güncelleme de işlevsel olduğu için sıraları korunuyor.
   */
  const ekraniKaldir = (id) => {
    if (!window.confirm(t('ekran.silOnay'))) return
    if (id !== aktifEkranId) {
      setSabitEkranlar((l) => l.filter((e) => e.id !== id))
      return
    }
    const sonraki = sabitEkranlar[0]
    if (!sonraki) return
    ekraniDuzenle(sonraki.id)
    setSabitEkranlar((l) => l.filter((e) => e.id !== id))
  }

  /*
   * ───────────────────────────────────────────────────────────────────────
   * İÇERİK HAVUZU
   * ───────────────────────────────────────────────────────────────────────
   *
   * Havuz = dört sabit seçenek (LED, boş, örnek görsel, örnek video) +
   * kullanıcının yükledikleri. Ekranlar içeriği havuzdan seçiyor; aynı
   * öğeyi seçen iki ekran onu gerçekten PAYLAŞIYOR (aynı blob adresi), bu
   * yüzden "Bölünmüş" seçildiğinde hangi içeriğin paylaşıldığı adresten
   * anlaşılıyor — ayrıca bir kimlik saklamaya gerek yok.
   */
  const icerikHavuzuTam = [
    { id: 'led', ad: t('content.led'), tip: 'desen', content: 'led', url: null },
    { id: 'none', ad: t('content.none'), tip: 'bos', content: 'none', url: null },
    { id: 'photo', ad: t('content.default'), tip: 'gorsel', content: 'photo', url: DEFAULT_CONTENT_SRC },
    { id: 'sample', ad: t('content.sample'), tip: 'video', content: 'sample', url: SAMPLE_VIDEO_SRC },
    ...icerikHavuzu.map((h) => ({ ...h, content: h.tip === 'video' ? 'video' : 'upload' })),
  ]

  /* (content, contentUrl) ikilisinin havuzdaki karşılığı. */
  const icerikKimligi = (c, u) => {
    if (c === 'upload' || c === 'video') {
      const h = icerikHavuzu.find((x) => x.url === u)
      return h ? h.id : 'led'
    }
    return c || 'led'
  }

  /* Hedef ekranın içeriğini havuzdan seçilenle değiştirir. */
  const icerikAta = (hedefId, havuzId) => {
    const h = icerikHavuzuTam.find((x) => x.id === havuzId)
    if (!h) return
    /* Sabit seçeneklerin adresi kodda duruyor; kayda yazılmıyor. */
    const u = h.id.startsWith('y') ? h.url : null
    /*
     * PAYLAŞIMDAKİ BİR EKRANA SEÇİLEN GÖRSEL BÜTÜN KÜMEYE.
     * Küme tek resmi paylaşıyor; üyelerden birine başka bir görsel
     * vermek paylaşımı sessizce bozardı.
     */
    const kume = paylasimKumesi(hedefId || aktifEkranId)
    const hedefler = kume || [hedefId || aktifEkranId]
    if (hedefler.includes(aktifEkranId) || !hedefId) {
      setContent(h.content)
      setContentUrl(u)
    }
    setSabitEkranlar((l) =>
      l.map((e) => (hedefler.includes(e.id) ? { ...e, ayar: { ...(e.ayar || {}), content: h.content, contentUrl: u } } : e)),
    )
  }



  /*
   * SÜRÜKLE-BIRAK DA YÜKLÜYOR.
   *
   * Dosya denetimleri bir olay nesnesi bekliyor (target.files, target.value);
   * sürüklenen dosya için aynı biçimde bir nesne hazırlanıyor ki iki yolda
   * da aynı boyut ve biçim denetimleri çalışsın.
   */
  const dosyayiHavuzaAl = (dosya) => {
    if (!dosya) return
    havuzaYukle({ target: { files: [dosya], value: '' } })
  }

  /* Havuza yükleme: tek düğme, türüne göre doğru denetime gidiyor. */
  const havuzaYukle = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (VIDEO_TYPES.includes(f.type)) handleVideoFile(e)
    else handleFile(e)
  }

  /* Havuzdan çıkarma — adres burada bırakılıyor, kullanan ekranlar LED'e döner. */
  const havuzdanCikar = (id) => {
    const h = icerikHavuzu.find((x) => x.id === id)
    if (!h) return
    setSabitEkranlar((l) =>
      l.map((e) =>
        e.ayar?.contentUrl === h.url ? { ...e, ayar: { ...e.ayar, content: 'led', contentUrl: null } } : e,
      ),
    )
    if (contentUrl === h.url) {
      setContent('led')
      setContentUrl(null)
    }
    setIcerikHavuzu((l) => l.filter((x) => x.id !== id))
    if (h.url?.startsWith('blob:')) URL.revokeObjectURL(h.url)
  }

  /*
   * ELLE AÇIYI DÖRTGENE UYGULAR.
   *
   * Yaw: yüzeyi dikey ekseninde çevirmek — yaklaşan kenar uzar, uzaklaşan
   * kenar kısalır ve içeri çekilir. Tilt: aynısının yatay eksendeki hâli.
   * Perspektifin kendisi bu iki ölçekten çıkıyor; dörtgen kelebek olmuyor
   * çünkü ölçekler sınırlı (±42°).
   */
  function aciyiUygula(koseler, aci) {
    if (!aci || (!aci.yaw && !aci.tilt)) return koseler
    const yaw = (Math.max(-60, Math.min(60, aci.yaw)) * Math.PI) / 180
    const tilt = (Math.max(-60, Math.min(60, aci.tilt)) * Math.PI) / 180
    const cx = koseler.reduce((t, k) => t + k.x, 0) / 4
    const cy = koseler.reduce((t, k) => t + k.y, 0) / 4
    /* Yakınlaşan kenar büyür: 1 + sin; uzaklaşan küçülür: 1 − sin. */
    const sagOlcek = 1 - Math.sin(yaw) * 0.5
    const solOlcek = 1 + Math.sin(yaw) * 0.5
    const ustOlcek = 1 - Math.sin(tilt) * 0.5
    const altOlcek = 1 + Math.sin(tilt) * 0.5
    return koseler.map((k, i) => {
      const solda = i === 0 || i === 3
      const ustte = i === 0 || i === 1
      const dikeyOlcek = solda ? solOlcek : sagOlcek
      const yatayOlcek = ustte ? ustOlcek : altOlcek
      return {
        x: cx + (k.x - cx) * yatayOlcek,
        y: cy + (k.y - cy) * dikeyOlcek,
      }
    })
  }

  /*
   * Dörtgeni tuvalin içine alır: önce kaydırır, gerekiyorsa merkezine göre
   * küçültür. Oran korunuyor — tek çarpanla ölçekleniyor.
   */
  /*
   * KENARDAN BIRAKILAN PAY.
   *
   * Ölçü etiketleri ekranın kutusunun dışına taşıyor, bu yüzden fotoğrafın
   * kenarında bir pay bırakılıyordu. 44 piksel fazla geldi: tasarımı
   * fotoğrafın kenarına yaklaştırmak mümkün olmuyor, ortada kocaman bir
   * boşluk kalıyordu.
   *
   * Pay artık fotoğrafın kendi ölçüsüne göre: kısa kenarının %3'ü, en çok
   * 14 piksel. Küçük bir fotoğrafta neredeyse yok, büyüğünde etiketin
   * tamamen dışarı düşmesini önleyecek kadar var. Etiketin bir ucunun
   * fotoğraf dışına birkaç piksel taşması, tasarımı kenara götürememekten
   * daha az sorun.
   */
  /*
   * BİLEREK FONKSİYON BİLDİRİMİ (const değil).
   *
   * Bunu koseTuval ÇİZİM SIRASINDA çağırıyor ve koseTuval dosyada bu
   * satırdan ÖNCE duruyor. const olarak yazıldığında her çizimde
   * "tanımlanmadan önce erişim" hatası veriyor ve uygulama hata ekranına
   * düşüyordu. Fonksiyon bildirimi yukarı taşındığı için sorun olmuyor.
   */
  /*
   * EKRAN KUTUSUNUN BAŞNOKTASI.
   *
   * koseTuval, köşeleri "tasarım kutusunun sol üstü" başnoktasına göre
   * veriyor ve şimdiye kadar o kutunun TUVALİN ortasında durduğunu
   * varsayıyordu. Oysa çizimi yapan WallPreview onu DUVAR KUTUSUNUN
   * ortasına koyuyor; duvar kutusu da tuvalde ortalı değil (insan silueti,
   * boşluklar, ölçü payları). İki farklı başnokta yüzünden 2B çizim ile
   * yerinde 3B ayrı yerlerde duruyordu — biri duvarda, öteki fotoğrafın
   * dışında.
   *
   * Başnokta artık ÖLÇÜLEN değerden geliyor (bkz. ekranKutuYeri). Ölçüm
   * henüz gelmediyse eski varsayıma düşülüyor.
   */
  function ekranKutuBasi(dw, dh) {
    return { x: tuvalBoyut.w / 2 - dw / 2, y: tuvalBoyut.h / 2 - dh / 2 }
  }

  function etiketPayi(yer) {
    if (!(yer?.genislik > 0) || !(yer?.yukseklik > 0)) return 0
    return Math.min(14, Math.min(yer.genislik, yer.yukseklik) * 0.03)
  }

  /**
   * Dörtgeni (ve onunla birlikte ölçü etiketlerini) FOTOĞRAFIN içine çeker.
   *
   * Etiketler ekranın kutusunun dışına taşıyor, o yüzden kenarlardan etiket
   * payı kadar içeride duruluyor. Fotoğraf bu payı kaldıramayacak kadar
   * darsa pay kendiliğinden küçülüyor — dar bir fotoğrafta tasarımı hiç
   * çizememektense etiketin biraz kırpılması yeğ.
   *
   * Tasarım fotoğraftan büyükse kırpmak yerine ortalanıyor: kullanıcı zaten
   * "kadrajından büyük" uyarısını görüyor, üstüne bir de ekranı kenara
   * yapıştırmak durumu anlaşılmaz kılardı.
   */
  /**
   * Dörtgeni fotoğrafın içine SIĞDIRIR — gerekirse küçülterek.
   *
   * Girişteki nokta kırpması yetmiyordu: kırpmadan sonra eş köşe hareketi ve
   * ölçü düzeltmesi geliyor, ikisi de köşeleri yeniden dışarı itebiliyor.
   * Sınır bu yüzden zincirin EN SONUNDA uygulanıyor. Önce kaydırılıyor,
   * kaydırma yetmiyorsa (dörtgen fotoğraftan geniş) merkezine göre
   * küçültülüyor; şekil ve açı korunuyor.
   */
  function fotografaCek(koseler, yer) {
    if (!Array.isArray(koseler) || koseler.length !== 4) return koseler
    if (!(yer?.genislik > 0) || !(yer?.yukseklik > 0)) return koseler
    /*
     * SINIR EKRANDA GÖRÜNEN YERE GÖRE.
     *
     * koseler, ekran kutusunun sol üstüne göre. O kutunun kapsayıcıdaki
     * yeri ölçülüyor (bkz. ekranKutuYeri); fotoğrafın dikdörtgeni de
     * kapsayıcı koordinatında. İkisi aynı uzaya getirilmeden yapılan
     * karşılaştırma yanlış çıkıyordu ve tasarım fotoğrafın dışına
     * taşabiliyordu.
     */
    /*
     * Ölçüm viewport koordinatında geliyor; fotoğrafın dikdörtgeni ise
     * tuvale (ana bölgeye) göre. İkisi burada aynı uzaya getiriliyor.
     */
    const ana = tuvalRef.current?.getBoundingClientRect()
    /*
     * ÖLÇÜM YOKSA SINIR DA YOK.
     *
     * Başnokta ölçülmeden sıfır kabul edilirse dörtgen fotoğrafın çok
     * dışındaymış gibi görünüyor ve her çizimde geri çekiliyordu; kullanıcı
     * tasarımı hiç kıpırdatamıyordu. Ölçüm gelmediyse serbest bırakmak,
     * yanlış yere hapsetmekten iyidir.
     */
    if (!ana) return koseler
    const kx = 0
    const ky = 0
    const xs = koseler.map((k) => k.x + kx)
    const ys = koseler.map((k) => k.y + ky)
    const x0 = Math.min(...xs)
    const x1 = Math.max(...xs)
    const y0 = Math.min(...ys)
    const y1 = Math.max(...ys)

    const taban = etiketPayi(yer)
    const payX = Math.min(taban, Math.max(0, (yer.genislik - (x1 - x0)) / 2))
    const payY = Math.min(taban, Math.max(0, (yer.yukseklik - (y1 - y0)) / 2))
    const solSinir = yer.sol + payX
    const sagSinir = yer.sol + yer.genislik - payX
    const ustSinir = yer.ust + payY
    const altSinir = yer.ust + yer.yukseklik - payY

    let dx = 0
    let dy = 0
    if (x1 - x0 <= sagSinir - solSinir) {
      if (x0 < solSinir) dx = solSinir - x0
      else if (x1 > sagSinir) dx = sagSinir - x1
    } else {
      dx = (solSinir + sagSinir) / 2 - (x0 + x1) / 2
    }
    if (y1 - y0 <= altSinir - ustSinir) {
      if (y0 < ustSinir) dy = ustSinir - y0
      else if (y1 > altSinir) dy = altSinir - y1
    } else {
      dy = (ustSinir + altSinir) / 2 - (y0 + y1) / 2
    }
    if (!dx && !dy) return koseler
    return koseler.map((k) => ({ x: k.x + dx, y: k.y + dy }))
  }

  /**
   * Dörtgeni, en az dörtte biri kadrajda kalacak kadar geri çeker.
   *
   * Sığdırmadan farkı: şekli ve ölçüyü HİÇ değiştirmiyor, yalnızca gerekirse
   * kaydırıyor. Zaten yeterince görünüyorsa hiçbir şey yapmıyor.
   */
  function kadrajaCek(koseler, tuval) {
    if (!Array.isArray(koseler) || koseler.length !== 4 || !(tuval?.w > 0)) return koseler
    const xs = koseler.map((k) => k.x)
    const ys = koseler.map((k) => k.y)
    const x0 = Math.min(...xs)
    const x1 = Math.max(...xs)
    const y0 = Math.min(...ys)
    const y1 = Math.max(...ys)
    const gen = x1 - x0
    const yuk = y1 - y0
    if (!(gen > 0) || !(yuk > 0)) return koseler
    const pay = 0.25
    let dx = 0
    let dy = 0
    if (x1 < gen * pay) dx = gen * pay - x1
    else if (x0 > tuval.w - gen * pay) dx = tuval.w - gen * pay - x0
    if (y1 < yuk * pay) dy = yuk * pay - y1
    else if (y0 > tuval.h - yuk * pay) dy = tuval.h - yuk * pay - y0
    if (!dx && !dy) return koseler
    return koseler.map((k) => ({ x: k.x + dx, y: k.y + dy }))
  }

  function ekranaSigdir(koseler, tuval) {
    if (!koseler?.length || !tuval?.w || !tuval?.h) return koseler
    const pay = 6
    let k = koseler
    const kutu = (q) => ({
      x0: Math.min(...q.map((p) => p.x)),
      x1: Math.max(...q.map((p) => p.x)),
      y0: Math.min(...q.map((p) => p.y)),
      y1: Math.max(...q.map((p) => p.y)),
    })
    let b = kutu(k)
    const olcek = Math.min(
      1,
      (tuval.w - pay * 2) / Math.max(1, b.x1 - b.x0),
      (tuval.h - pay * 2) / Math.max(1, b.y1 - b.y0),
    )
    if (olcek < 1) {
      const cx = (b.x0 + b.x1) / 2
      const cy = (b.y0 + b.y1) / 2
      k = k.map((p) => ({ x: cx + (p.x - cx) * olcek, y: cy + (p.y - cy) * olcek }))
      b = kutu(k)
    }
    let dx = 0
    let dy = 0
    if (b.x0 < pay) dx = pay - b.x0
    else if (b.x1 > tuval.w - pay) dx = tuval.w - pay - b.x1
    if (b.y0 < pay) dy = pay - b.y0
    else if (b.y1 > tuval.h - pay) dy = tuval.h - pay - b.y1
    return dx || dy ? k.map((p) => ({ x: p.x + dx, y: p.y + dy })) : k
  }

  /*
   * BİR ADAYI UYGULA — kareye tıklayınca da listeden seçince de burası.
   *
   * Puanı düşük adayda otomatik uygulama yapılmıyor: yüzey sınırları belirsizken
   * kesin bir yerleşim göstermek kullanıcıyı yanıltıyor. Onun yerine uyarı
   * veriliyor ve manuel dört köşe öneriliyor (bkz. GUVEN_ESIGI).
   */
  const GUVEN_ESIGI = 70
  const adayiUygula = (aday) => {
    if (!aday) return
    /*
     * SEÇİLEN KAREYİ GÖRÜNTÜDEKİ KENARLARA OTURT.
     *
     * Aday doğru yeri gösterse bile açısı birkaç derece tutmayabiliyor;
     * ekran "az kaymış" duruyordu. Burada dörtgen, fotoğraftaki gerçek
     * kenarlara göre ince ayarlanıyor (bkz. kenarlaraOturt): küçük
     * döndürme/ölçek/yamukluk denemeleri arasından kenar enerjisi en
     * yüksek olan seçiliyor. Belirgin kazanç yoksa aday olduğu gibi
     * kalıyor — gürültüye bakıp ekranı oynatmıyoruz.
     */
    let koseler = aday.koseler
    try {
      const g = ozelSahneGorsel.current
      if (g) koseler = kenarlaraOturt(g, aday.koseler) || aday.koseler
    } catch {
      /* iyileştirme başarısızsa aday olduğu gibi uygulanır */
    }
    /*
     * AÇIYI SİSTEM DEĞİL KULLANICI VERİYOR.
     *
     * Yerleşim düz uygulanıyor; eğim isteyen "Köşelerden ayarla" ile dört
     * köşeyi fareyle çekiyor. Otomatik eğim ölçümü yeterince güvenilir
     * değildi ve L tipi ekranda dörtgeni tamamen bozuyordu.
     */
    try {
      koseler = duzlestir(koseler)
    } catch {
      /* düzleştirme yapılamadıysa kare olduğu gibi kalır */
    }
    /* Yeni yerleşim seçildi: önceki elle köşe ayarı geçerliliğini yitirdi. */
    elleDuzenlemeyiBirak()
    setHedefKose(koseler)
    setHedefTur(aday.tur || null)
    setAdayKipi(false)

    /* Yüzeyin gerçek ölçüsü ile tasarımın ölçüsü belirgin ayrılıyorsa sor. */
    const olcu = yuzeyOlcusuRef.current?.(koseler, ozelSahne?.kaynak, ozelMesafeM) || null
    if (olcu && olcu.wm > 0.05 && olcu.hm > 0.05) {
      const fark = Math.max(
        Math.abs(olcu.wm - tasarimWm) / Math.max(0.01, tasarimWm),
        Math.abs(olcu.hm - tasarimHm) / Math.max(0.01, tasarimHm),
      )
      setOlcuSorusu(fark > 0.1)
      setOlcuUyduruldu(false)
      setOlcuOncesi(null)
    } else {
      setOlcuSorusu(false)
    }
    if ((aday.skor || 0) < GUVEN_ESIGI) {
      setOzelUyari(t('scene.lowConfidence'))
    } else {
      setOzelUyari(null)
    }
  }

  /**
   * Yüzey ölçüsünü kabin sayısına çevirip uygular.
   *
   * Kabin ölçüsü sabit olduğu için her ölçü birebir tutturulamaz: yüzeye
   * SIĞAN en büyük kabin sayısı seçiliyor (en az 1). Böylece ekran yüzeyi
   * taşmıyor, kalan boşluk da en aza iniyor.
   */
  const olcuyuYuzeyeUydur = () => {
    const hedef = secilenYuzeyOlcu
    if (!hedef) return
    /* İlk uydurmada mevcut ölçü saklanıyor; "Ölçü kalsın" buna dönüyor. */
    if (!olcuOncesi) setOlcuOncesi({ cols, rows, width, height })
    const kw = (previewModel?.widthMm || 500) / 1000
    const kh = (previewModel?.heightMm || 500) / 1000
    const yeniCols = Math.max(1, Math.floor(hedef.wm / kw + 1e-6))
    const yeniRows = Math.max(1, Math.floor(hedef.hm / kh + 1e-6))
    /* Duvar ölçüsü de en az tasarım kadar olmalı, yoksa kabin sayısı kırpılır. */
    setWidth((e) => Math.max(e, +(yeniCols * kw).toFixed(2)))
    setHeight((e) => Math.max(e, +(yeniRows * kh).toFixed(2)))
    setCols(yeniCols)
    setRows(yeniRows)
    setOlcuSorusu(false)
    setOlcuUyduruldu(true)
    setOzelUyari(t('scene.fitResult'))
  }

  /*
   * ÖLÇEĞİ GERÇEK ÖLÇÜDEN KUR.
   *
   * Sahnedeki her şeyin ölçeği tek bir sayıdan geliyor: fotoğrafın kaç
   * metreden çekildiği. Kullanıcı bunu bilmiyor ve tahmin etmek zorunda
   * kalıyordu; yanlış tahmin, gerçekte birbirine yakın iki şeyin (bir
   * dizüstü ekranı ile 0,32 m'lik bir LED tasarımı) fotoğrafta bambaşka
   * ölçüde görünmesi demek.
   *
   * Oysa kullanıcı mesafeyi bilmese de, seçtiği yüzeyin GERÇEK GENİŞLİĞİNİ
   * çoğu zaman biliyor ya da ölçebiliyor. Hesap tersten kuruluyor:
   *
   *   yüzeyin kadrajdaki payı = ölçülen genişlik ÷ (mesafe × 1,11)
   *   bu pay sabit olduğuna göre  →  mesafe = gerçek genişlik ÷ (pay × 1,11)
   *
   * Böylece tek bir bilinen ölçü bütün sahnenin ölçeğini doğruya çekiyor;
   * tasarım da kendi gerçek boyuyla, o yüzeye göre doğru oranda görünüyor.
   */
  /** Uydurmadan önceki kabin sayısına döner. */
  /*
   * MESAFE DEĞİŞİNCE EKRAN ÖLÇÜSÜNE DOKUNULMUYOR.
   *
   * Bir ara mesafe değişince ölçü kendiliğinden yeniden uyduruluyordu.
   * Kullanıcının itirazı haklıydı: ekranın kaç kabin olacağı onun kararı,
   * mesafeyi düzeltmek "ekranımı büyüt" demek değil. Artık yalnızca
   * BİLGİ güncelleniyor — paneldeki "Seçtiğiniz yüzey yaklaşık…" satırı
   * yeni mesafeye göre yeniden hesaplanıyor — ve "Ölçüyü ayarla" düğmesi
   * panelde durmaya devam ediyor. Uygulama kararı kullanıcıya bırakıyor.
   */

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

  /*
   * KÖŞEDEN AÇI VERME.
   *
   * Köşeyi serbest bırakmak tasarımın ÖLÇÜSÜNÜ bozuyordu: kullanıcı
   * yön düzeltmek isterken ekran uzayıp kısalıyordu. Artık köşe
   * hareketi bir AÇI olarak okunuyor —
   *   • sağ köşeleri sağa çekmek: yüzey sağa dönüyor,
   *   • sol köşeleri sola çekmek: sola dönüyor,
   *   • üst köşeleri yukarı çekmek: yukarıdan bakış,
   *   • alt köşeleri aşağı çekmek: aşağıdan bakış.
   * Ekranın metre ölçüsü ve oranı sabit kalıyor; yalnızca perspektif
   * değişiyor. Tuvalin tamamını sürüklemek ise ekranı taşımaya devam
   * ediyor.
   */
  /*
   * KÖŞEYİ DOĞRUDAN TAŞI.
   *
   * Tutamak nereye bırakılırsa ekranın o köşesi oraya gider; dörtgen
   * kelebek biçimine girmiyorsa (KoseSecici bunu zaten engelliyor)
   * hareket olduğu gibi kabul ediliyor. Ekranın METRE ölçüsü ve kabin
   * sayısı bundan etkilenmiyor — değişen yalnızca fotoğraftaki
   * perspektif.
   */
  const koseleriTasi = (noktalar) => {
    if (!Array.isArray(noktalar) || noktalar.length !== 4) return
    /*
     * TUTAMAK FOTOĞRAFIN DIŞINA ÇIKAMIYOR.
     *
     * Köşe fotoğrafın dışına çekilince tasarımın bir parçası mekânın
     * dışında kalıyor; orada duvar da yok, ölçü de anlamsız. Nokta daha
     * kaydedilmeden fotoğrafın dikdörtgenine sıkıştırılıyor.
     */
    if (fotoYer?.genislik > 0 && fotoYer?.yukseklik > 0) {
      noktalar = noktalar.map((k) => ({
        x: Math.max(fotoYer.sol, Math.min(fotoYer.sol + fotoYer.genislik, k.x)),
        y: Math.max(fotoYer.ust, Math.min(fotoYer.ust + fotoYer.yukseklik, k.y)),
      }))
    }
    /*
     * HANGİ DÖRTGEN DÜZENLENİYOR — HATANIN KAYNAĞI BURASIYDI.
     *
     * Katman, duvar kalibre edilmişse DUVARIN dörtgenini (duvarTuval)
     * gösteriyor; kalibre değilse tasarımın kendi dörtgenini. Oysa hareket
     * her iki durumda da TASARIMIN dörtgeniyle (koseMutlak) karşılaştırılıyor
     * ve yeni dörtgen onun köşelerinden kuruluyordu.
     *
     * İkisi ayrı dörtgen: duvar büyük, tasarım onun içinde küçük. Sonuç,
     * tek bir tutamağı bir piksel oynatınca duvarın tasarımın şekline
     * atlaması oluyordu — kullanıcının gördüğü "ufacık oynattım, her şey
     * bozuldu" tam olarak buydu.
     *
     * Artık karşılaştırma ekranda GÖSTERİLEN dörtgenle yapılıyor.
     */
    const kalibreDuvar = !!duvarOlcu && fotoYer?.genislik > 0 && fotoYer?.yukseklik > 0
    /*
     * Kayma düzeltmesi yalnızca elle dörtgen dalına ait: orada tutamaklar
     * kayma uygulanmış hâli gösteriyor ve kaydedilen değer kaymasız olmalı.
     * Duvar dalında duvarTuval'da kayma yok; çıkarmak dörtgeni kaydırırdı.
     */
    if (!kalibreDuvar) {
      noktalar = noktalar.map((k) => ({
        x: k.x - (elleKayma?.x || 0),
        y: k.y - (elleKayma?.y || 0),
      }))
    }
    const oncekiler = kalibreDuvar ? duvarTuval : elleKose || koseMutlak
    if (!oncekiler) {
      if (!kalibreDuvar) setElleKose(noktalar)
      return
    }

    /*
     * TUTULAN KÖŞE FAREYİ BİREBİR İZLİYOR.
     *
     * Burada bir süre "düzenli yamuk" kuralı vardı: tutulan köşenin aynı
     * yandaki eşi de yarı yolu gidiyor, sonra dörtgen eski ölçüsüne geri
     * ölçekleniyor ve fotoğrafa ortalanıyordu. Niyet iyiydi (kelebek şekil
     * oluşmasın) ama sonuç kullanılamazdı: tutamak elin altından kaçıyor,
     * çekilmeyen köşeler kendiliğinden oynuyor, dörtgen her harekette
     * yeniden boyutlanıyordu.
     *
     * Kural artık tek: hangi köşe tutulduysa yalnızca o gidiyor, gittiği
     * yere gidiyor. Köşelerden duvara oturtmak ancak böyle yapılabilir.
     *
     * Geriye tek bir koruma kalıyor: dörtgen kendi üstüne katlanmasın.
     * Katlanma, ardışık kenarların çapraz çarpımlarının işaret değiştirmesi
     * demektir; öyle bir hamle kabul edilmiyor ve köşe son geçerli yerinde
     * kalıyor.
     */
    let oynayan = -1
    let enBuyuk = 0.5
    for (let i = 0; i < 4; i++) {
      const d = Math.hypot(noktalar[i].x - oncekiler[i].x, noktalar[i].y - oncekiler[i].y)
      if (d > enBuyuk) {
        enBuyuk = d
        oynayan = i
      }
    }
    if (oynayan < 0) return

    const aday = oncekiler.map((k, i) => (i === oynayan ? noktalar[oynayan] : k))

    /* Dörtgen dışbükey mi: dört çapraz çarpımın da aynı işarette olması gerekir. */
    const disbukey = (k) => {
      let arti = 0
      let eksi = 0
      for (let i = 0; i < 4; i++) {
        const a = k[i]
        const b = k[(i + 1) % 4]
        const c = k[(i + 2) % 4]
        const z = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
        if (z > 0) arti++
        else if (z < 0) eksi++
      }
      return arti === 0 || eksi === 0
    }

    /* Kenarlar da ölçülemeyecek kadar kısalmasın. */
    const enKisaKenar = (k) =>
      Math.min(
        ...[0, 1, 2, 3].map((i) =>
          Math.hypot(k[(i + 1) % 4].x - k[i].x, k[(i + 1) % 4].y - k[i].y),
        ),
      )

    if (!disbukey(aday) || enKisaKenar(aday) < 24) return

    /*
     * KALİBRE DUVARDA DÜZENLENEN ŞEY DUVARIN KENDİSİ.
     *
     * Dörtgen tuval pikselinde; duvar ise fotoğrafa göre oranlı saklanıyor.
     * Yakınlaştırma da geri alınıyor (bkz. duvarTuval'daki ileri yön).
     */
    if (duvarOlcu && fotoYer?.genislik > 0 && fotoYer?.yukseklik > 0) {
      const mX = tuvalBoyut.w / 2
      const mY = tuvalBoyut.h / 2
      const z = sahneYakinlik || 1
      setHedefKose(
        aday.map((k) => ({
          x: (mX + (k.x - mX) / z - fotoYer.sol) / fotoYer.genislik,
          y: (mY + (k.y - mY) / z - fotoYer.ust) / fotoYer.yukseklik,
        })),
      )
      setTaslakKutu(
        aday.map((k) => ({
          x: (mX + (k.x - mX) / z - fotoYer.sol) / fotoYer.genislik,
          y: (mY + (k.y - mY) / z - fotoYer.ust) / fotoYer.yukseklik,
        })),
      )
      return
    }
    setElleKose(aday)
  }

  /* Elle köşe seçimi ekranın kendi sınırlarını kullanır; oranı orada kullanıcı kurar. */
  /*
   * KÖŞE AYARINI SIFIRLA.
   *
   * Kullanıcı köşeleri çeke çeke içinden çıkılmaz bir şekle sokabiliyordu ve
   * geri dönüşü yoktu; tek çare bütün yerleşimi sıfırlamaktı. Bu düğme
   * yalnızca köşe ayarını bırakıyor: seçilen yüzey, ölçü ve mesafe yerinde
   * kalıyor, dörtgen o yüzeyin kendi düzgün dikdörtgenine dönüyor.
   */
  /*
   * ÖLÇEK DEĞİŞİNCE ELLE DÖRTGEN DE ONUNLA BÜYÜYÜP KÜÇÜLÜYOR.
   *
   * elleKose tuval PİKSELİ cinsinden saklanıyor. Mesafe ya da gerçek
   * genişlik değişince tasarımın piksel karşılığı değişiyor ama dörtgen
   * eski ölçekte kalıyordu; ikisi birbirini tutmayınca homografi bozuluyor
   * ve tasarım ekranı kesen dev bir yalamaya dönüyordu (kullanıcının
   * gönderdiği görüntü buydu). Dörtgen artık aynı oranda ölçekleniyor:
   * kullanıcının kurduğu açı korunuyor, yalnızca boy ölçekle birlikte
   * değişiyor.
   */
  const olcekIzi = useRef(null)
  useEffect(() => {
    const eski = olcekIzi.current
    olcekIzi.current = cizimOlcek
    if (!eski || !cizimOlcek || eski === cizimOlcek) return
    const oran = cizimOlcek / eski
    if (!(oran > 0) || Math.abs(oran - 1) < 1e-6) return
    setElleKose((onceki) => {
      if (!onceki) return onceki
      const mx = tuvalBoyut.w / 2
      const my = tuvalBoyut.h / 2
      return onceki.map((k) => ({ x: mx + (k.x - mx) * oran, y: my + (k.y - my) * oran }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cizimOlcek])

  /*
   * TASLAK KUTUYU KUR.
   *
   * Kullanıcının yazdığı duvar ölçüsünden, fotoğrafın ortasına o oranda bir
   * dikdörtgen konuyor ve ÖLÇEK ondan türetiliyor:
   *
   *   kutu fotoğrafın %70'ini kaplıyor  →  kadraj = duvar eni ÷ 0,70
   *   mesafe = kadraj ÷ 1,11
   *
   * Yani kullanıcı duvarın kaç metre olduğunu söylediği anda sahnenin
   * ölçeği biliniyor; tahmine gerek kalmıyor. Kutu köşelerinden gerçek
   * duvara oturtuldukça ölçek daha da doğrulanıyor.
   *
   * Kutu yükseklikte fotoğrafa sığmıyorsa (çok basık/çok uzun duvar) pay
   * küçültülüyor; oran hep korunuyor.
   */
  /*
   * KUTU FOTOĞRAFA GÖRE ORANLI SAKLANIYOR (tuval pikselinde değil).
   *
   * Piksel olarak saklandığında, mesafe değişip fotoğrafın yakınlığı
   * değiştiğinde kutu yerinde kalıyor ve fotoğraf altından kayıyordu; yani
   * kullanıcının duvara oturttuğu kutu duvarı göstermez oluyordu. Oranlı
   * saklanınca kutu fotoğrafa yapışık kalıyor.
   */
  const oranTuvale = (k) => {
    const yer = fotoYer
    /* Fotoğraf yerleşimi yoksa dönüşüm yapılamaz; nokta olduğu gibi döner. */
    if (!(yer?.genislik > 0) || !(yer?.yukseklik > 0)) return k
    const z = sahneYakinlik || 1
    const mX = tuvalBoyut.w / 2
    const mY = tuvalBoyut.h / 2
    return {
      x: mX + (yer.sol + k.x * yer.genislik - mX) * z,
      y: mY + (yer.ust + k.y * yer.yukseklik - mY) * z,
    }
  }
  /*
   * FOTOĞRAFIN TUVALDEKİ DİKDÖRTGENİ.
   *
   * Tuval fotoğraftan büyük olabiliyor (en-boy oranları tutmayınca kenarlarda
   * şerit kalıyor). İşaretleme ve kutu katmanları bu sınırı kullanıyor ki
   * hiçbir şey fotoğrafın dışına taşmasın.
   */
  /*
   * FOTOĞRAFIN TUVALDEKİ DİKDÖRTGENİ.
   *
   * Aşağıdaki fotoSinir ile aynı hesap; ayrı durmasının sebebi sıra:
   * büyüteç ve yapışma işlevi ondan önce tanımlanmak zorunda (ikisi de
   * aşağıdaki işaretleyici kurulumunda kullanılıyor) ve bir const'u
   * tanımlanmadan okumak çalışma anında hata verir.
   */
  /*
   * Kaydırma tuvalin dışına çıkamıyor: yakınlaştırılmış görüntünün kenarı
   * tuvalin kenarından içeri giremez, yoksa yanda boş gri şerit kalır.
   */
  const kaydirmayiKis = (k, z) => ({
    x: Math.max(tuvalBoyut.w * (1 - z), Math.min(0, k.x)),
    y: Math.max(tuvalBoyut.h * (1 - z), Math.min(0, k.y)),
  })

  /* Tuvalin ORTASI sabit kalacak şekilde yakınlaştırır. */
  const isaretYakinlastir = (yeni) => {
    const z = Math.max(1, Math.min(4, Math.round(yeni * 2) / 2))
    if (z <= 1) {
      setIsaretZoom(1)
      setIsaretKay({ x: 0, y: 0 })
      return
    }
    const mx = tuvalBoyut.w / 2
    const my = tuvalBoyut.h / 2
    /* Ortadaki noktanın ölçeksiz karşılığı — yeni ölçekte de orada kalmalı. */
    const ox = (mx - isaretKay.x) / isaretZoom
    const oy = (my - isaretKay.y) / isaretZoom
    setIsaretZoom(z)
    setIsaretKay(kaydirmayiKis({ x: mx - ox * z, y: my - oy * z }, z))
  }

  const isaretKaydir = (dx, dy) =>
    setIsaretKay((k) => kaydirmayiKis({ x: k.x + dx, y: k.y + dy }, isaretZoom))

  const fotoSinirHam = (() => {
    if (!(fotoYer?.genislik > 0) || !(fotoYer?.yukseklik > 0)) return null
    const a = oranTuvale({ x: 0, y: 0 })
    const b = oranTuvale({ x: 1, y: 1 })
    return {
      sol: Math.min(a.x, b.x),
      ust: Math.min(a.y, b.y),
      sag: Math.max(a.x, b.x),
      alt: Math.max(a.y, b.y),
    }
  })()

  /*
   * YAPIŞMA İŞLEVİ — tuval pikseli alır, düzeltilmiş tuval pikseli verir.
   *
   * Harita küçültülmüş bir kopyadan çıkarıldığı için iki yönlü ölçek
   * çevirimi burada yapılıyor; işaretleyici fotoğrafın çözünürlüğünü
   * bilmek zorunda kalmıyor.
   *
   * ARAMA YARIÇAPI DAR TUTULUYOR (7 piksel).
   *
   * 14 pikselde yapışma fazla güçlüydü: kullanıcı kenarın biraz yanına
   * koymak istediğinde nokta en yakın güçlü geçişe kaçıyordu. Yarıçap
   * yarıya indi; bilerek yanına koymak isteyen Alt ile tamamen
   * kapatabiliyor (kart ayrıntısında yazıyor).
   */
  const kenaraYapis = (() => {
    if (!kenarHarita || !fotoSinirHam) return null
    const en = fotoSinirHam.sag - fotoSinirHam.sol
    const boy = fotoSinirHam.alt - fotoSinirHam.ust
    if (!(en > 0) || !(boy > 0)) return null
    const olcekX = kenarHarita.w / en
    const olcekY = kenarHarita.h / boy
    return (p) => {
      const b = yapisacakNokta(
        kenarHarita,
        (p.x - fotoSinirHam.sol) * olcekX,
        (p.y - fotoSinirHam.ust) * olcekY,
        7 * olcekX,
      )
      if (!b) return null
      return {
        x: fotoSinirHam.sol + (b.x / kenarHarita.w) * en,
        y: fotoSinirHam.ust + (b.y / kenarHarita.h) * boy,
      }
    }
  })()

  /* Büyüteç kaynağı: fotoğrafın adresi ve tuvaldeki dikdörtgeni. */
  const isaretFoto =
    fotoSinirHam && ozelSahne?.dosya
      ? {
          url: ozelSahne.dosya,
          sol: fotoSinirHam.sol,
          ust: fotoSinirHam.ust,
          en: fotoSinirHam.sag - fotoSinirHam.sol,
          boy: fotoSinirHam.alt - fotoSinirHam.ust,
        }
      : null

  const fotoSinir = fotoSinirHam

  /*
   * Alanın tuvaldeki dörtgeni — dört nokta tamamsa.
   *
   * BURADA DURUYOR, YUKARIDA DEĞİL: render sırasında hesaplanıyor ve
   * oranTuvale'yi okuyor. Önce yukarıda, eylemlerin yanındaydı; orada
   * oranTuvale henüz tanımlı olmadığı için uygulama "Ölçüm ile ayarla"ya
   * basılır basılmaz hata ekranına düşüyordu (TDZ).
   */
  /*
   * DÖRT KÖŞE HER ZAMAN AYNI SIRADA: sol üst, sağ üst, sağ alt, sol alt.
   *
   * Sıra tıklama sırasına bırakılmıştı. Kullanıcı köşeleri çapraz sırayla
   * tıklayınca (örneğin sol üst, sağ üst, SOL alt, sağ alt) dörtgen kendi
   * üstünden geçiyor; homografi böyle bir dörtgende tasarımı ters çeviriyor
   * ve bir şeride eziyor — "tasarım ters dönüyor, bozuluyor" denen durum.
   * Taşıma da aynı bozuk dörtgen üstünden hesaplandığı için şaşırıyordu.
   *
   * Köşeler artık ağırlık merkezine göre açıya sıralanıyor. Ekran
   * koordinatında (y aşağı) açıyı küçükten büyüğe dizmek doğrudan
   * sol üst → sağ üst → sağ alt → sol alt sırasını veriyor. Kullanıcı
   * hangi sırayla tıklarsa tıklasın sonuç aynı.
   */
  const koseleriSirala = (n) => {
    if (!Array.isArray(n) || n.length !== 4) return n
    const mx = (n[0].x + n[1].x + n[2].x + n[3].x) / 4
    const my = (n[0].y + n[1].y + n[2].y + n[3].y) / 4
    return [...n].sort((a, b) => Math.atan2(a.y - my, a.x - mx) - Math.atan2(b.y - my, b.x - mx))
  }

  /*
   * ───────────────────────────────────────────────────────────────────────
   * ALAN HESAPLARININ ÖLÇEĞİ DOĞRUDAN REFERANSTAN.
   *
   * Önce cizimOlcek kullanılıyordu (WallPreview'in bildirdiği metre başına
   * piksel). Ölçüldü: referans 300 tuval pikseli = 100 cm iken cizimOlcek
   * 229,7 px/m diyordu — yani %23 küçük. Alanın gerçek ölçüsü o oranda
   * BÜYÜK çıkıyor ve kabin sayısı şişiyordu: kullanıcının 96 x 196 cm
   * olarak işaretlediği kapı 1,92 x 4,00 m sanılıp 6 x 25 kabin kuruluyordu.
   *
   * Burada hesaplanan ölçek, işaretlerin KENDİ uzayında: referansın iki ucu
   * da alanın köşeleri de aynı oranTuvale'den geçiyor, dolayısıyla aradaki
   * her çarpan (sahne yakınlığı, fotoğrafın tuvale oturma oranı) ikisinde de
   * aynı ve sadeleşiyor. Ölçek referanstan geldiği için kullanıcının
   * işaretlediği uzunluk neyse o.
   * ───────────────────────────────────────────────────────────────────────
   */
  const alanTuval = alanNokta.length === 4 ? koseleriSirala(alanNokta.map(oranTuvale)) : null
  /* Sığdırma işlevinin kendi parametresiyle çakışmasın diye ikinci ad. */
  const alanTuvalDurum = alanTuval

  /* İki kenar tamam ve kesişiyorlar mı — kesişim de gösteriliyor. */
  const kenarKesisimi = (() => {
    const t = alanCizgi.map(oranTuvale)
    if (t.length < 4) return null
    return dogruKesisimi(t[0], t[1], t[2], t[3])
  })()

  /*
   * FOTOĞRAFIN SANTİM ÖLÇEĞİ (piksel / metre).
   *
   * Birincil kaynak referans: iki nokta ve aralarındaki gerçek santim.
   *
   * YEDEK KAYNAK işaretlenen alanın kendisi: kullanıcı dört köşeyi
   * işaretleyip gerçek en/boyu yazdıysa ölçek oradan da çıkar. Yedek,
   * referansın hiç verilmediği eski kayıtlar ve referansın henüz
   * tamamlanmadığı anlar için duruyor; olmadığında ölçek yokluğu
   * tasarımın HİÇ çizilmemesi demek oluyordu.
   */
  const alanOlcegiPxM = (() => {
    const cm = Number(String(refUzunlukCm).replace(',', '.'))
    if (refNokta.length === 2 && cm > 0) {
      const a = oranTuvale(refNokta[0])
      const b = oranTuvale(refNokta[1])
      const px = Math.hypot(b.x - a.x, b.y - a.y)
      if (px > 1) return (px / cm) * 100
    }
    if (alanTuval) {
      const enCm = Number(String(alanElleEn).replace(',', '.'))
      const boyCm = Number(String(alanElleBoy).replace(',', '.'))
      const enPx =
        (Math.hypot(alanTuval[1].x - alanTuval[0].x, alanTuval[1].y - alanTuval[0].y) +
          Math.hypot(alanTuval[2].x - alanTuval[3].x, alanTuval[2].y - alanTuval[3].y)) /
        2
      const boyPx =
        (Math.hypot(alanTuval[3].x - alanTuval[0].x, alanTuval[3].y - alanTuval[0].y) +
          Math.hypot(alanTuval[2].x - alanTuval[1].x, alanTuval[2].y - alanTuval[1].y)) /
        2
      /* İki kenarın ortalaması: perspektifte ikisi aynı ölçeği vermiyor. */
      const olcekler = []
      if (enCm > 0 && enPx > 1) olcekler.push((enPx / enCm) * 100)
      if (boyCm > 0 && boyPx > 1) olcekler.push((boyPx / boyCm) * 100)
      if (olcekler.length) return olcekler.reduce((t, x) => t + x, 0) / olcekler.length
    }
    return null
  })()


  /*
   * İŞARETLEME GEÇERLİ Mİ — içe çökmüş ya da çökük dörtgen kabul edilmiyor
   * (bkz. alanOlcu.js dortgenGecerli). Dört köşe tamamlanmadan sorulmuyor.
   */
  const alanGecerli = alanNokta.length !== 4 || !alanTuval ? true : dortgenGecerli(alanTuval)


  /*
   * ───────────────────────────────────────────────────────────────────────
   * YAPIŞILACAK NOKTALAR — ekranları uç uca getirmek için.
   *
   * İki ekranın köşede birleşmesi, aslında aynı iki noktanın iki alanda da
   * kullanılması demek. Göz kararıyla tıklamak birkaç piksel şaşıyor ve
   * çizimde açık bir dikiş ya da bindirme oluyor (kullanıcı bunu "üst üste
   * biniyor" diye bildirdi). Yeni bir alan işaretlenirken duran ekranların
   * köşeleri ve onların işaretli alanlarının köşeleri hedef oluyor.
   *
   * Yalnızca İŞARETLEME kolaylığı: kayıtlara ya da ölçüme dokunmuyor.
   * ───────────────────────────────────────────────────────────────────────
   */
  const yapiskanNoktalar = (() => {
    if (!(fotoYer?.genislik > 0)) return []
    const l = []
    for (const e of sabitEkranlar) {
      if (Array.isArray(e?.oran)) for (const k of e.oran) l.push(oranTuvale(k))
      if (Array.isArray(e?.alan)) for (const k of e.alan) l.push(oranTuvale(k))
    }
    return l.filter((k) => k && Number.isFinite(k.x) && Number.isFinite(k.y))
  })()

  /*
   * ───────────────────────────────────────────────────────────────────────
   * ALANIN GERÇEK ÖLÇÜSÜ — EĞİM HESABA KATILARAK.
   *
   * Tek ölçekle (px/cm) bölmek, fotoğraf tam karşıdan çekilmemişse yanlış:
   * referans yatayda alınmışsa yatay doğru çıkıyor ama DİKEY kenar uzaklaşan
   * yüzeyde durduğu için santim başına daha az piksel ediyor ve yükseklik
   * KISA ölçülüyor. Kullanıcının 196 cm'lik kapısı 168-184 cm sanılıp 12
   * yerine 11 satır kuruluyordu.
   *
   * Oysa işaretlenen dörtgen bu bilgiyi zaten taşıyor: bir dikdörtgenin eğik
   * görüntüsü o düzlemin perspektifinin kendisi. Sentetik sahnede ölçüldü —
   * iki yönde de dönük bir yüzeyde eski yöntem yükseklikte %15-37 şaşarken
   * yeni yöntem %0,0 veriyor ve odak uzunluğunu da birebir buluyor.
   *
   * Çıkmazsa (yüzey tam karşıdan görünüyorsa) null dönüyor; orada perspektif
   * olmadığı için tek ölçekli hesap zaten doğru.
   * ───────────────────────────────────────────────────────────────────────
   */
  /*
   * ODAK: TAHMİN DEĞİL, İKİ REFERANSTAN HESAP (varsa).
   * İkinci referans yoksa eski tahmin (~65° görüş açısı) kullanılıyor.
   */
  const cozulenOdak = (() => {
    if (!alanTuval || refNokta.length !== 2 || ref2Nokta.length !== 2) return null
    const cm1 = Number(String(refUzunlukCm).replace(',', '.'))
    const cm2 = Number(String(ref2UzunlukCm).replace(',', '.'))
    if (!(cm1 > 0) || !(cm2 > 0)) return null
    if (!(fotoYer?.genislik > 0)) return null
    const asal = oranTuvale({ x: 0.5, y: 0.5 })
    return odakIkiReferanstan(
      alanTuval,
      oranTuvale(refNokta[0]),
      oranTuvale(refNokta[1]),
      cm1,
      oranTuvale(ref2Nokta[0]),
      oranTuvale(ref2Nokta[1]),
      cm2,
      asal,
      fotoYer.genislik * (sahneYakinlik || 1),
    )
  })()

  /*
   * YAZILAN GERÇEK ÖLÇÜDEN ODAK.
   *
   * Kullanıcı işaretlediği alanın gerçek EN ve BOYUNU yazdıysa, dörtgenin
   * iki kenarı birbirine dik iki bilinen uzunluk demektir — ikinci referansın
   * yaptığı işin aynısı, fazladan işaretleme olmadan. Odak buradan
   * hesaplanıyor ve artık tahmin edilmiyor.
   */
  const odakYazilandan = (() => {
    if (!alanTuval) return null
    /* sayiCm aşağıda tanımlı: burada kendi çevrimimizi yapıyoruz (TDZ). */
    const oku = (x) => {
      const n = Number(String(x).replace(',', '.'))
      return n > 0 ? n : null
    }
    const en = oku(alanElleEn)
    const boy = oku(alanElleBoy)
    if (!(en > 0) || !(boy > 0)) return null
    if (!(fotoYer?.genislik > 0)) return null
    const asal = oranTuvale({ x: 0.5, y: 0.5 })
    /* Üst kenar = en, sol kenar = boy. */
    return odakIkiReferanstan(
      alanTuval,
      alanTuval[0],
      alanTuval[1],
      en,
      alanTuval[0],
      alanTuval[3],
      boy,
      asal,
      fotoYer.genislik * (sahneYakinlik || 1),
    )
  })()

  /* Çözülen odak fotoğrafa yazılıyor: öteki alanlar da ondan yararlanıyor. */
  useEffect(() => {
    const y = cozulenOdak > 1 ? cozulenOdak : odakYazilandan > 1 ? odakYazilandan : null
    if (!(y > 1)) return
    setFotoOdak((o) => (o && Math.abs(o - y) / y < 0.001 ? o : y))
  }, [cozulenOdak, odakYazilandan])

  /*
   * EXIF ODAĞININ TUVALDEKİ KARŞILIĞI.
   *
   * f_piksel = (f35 / 36) × görüntünün piksel genişliği. Burada "görüntünün
   * genişliği" fotoğrafın TUVALDEKİ genişliği; özgün piksel genişliği
   * sadeleşiyor, çünkü ölçüm de tuval pikselinde yapılıyor.
   */
  const exifOdak =
    exif35 > 0 && fotoYer?.genislik > 0
      ? (exif35 / 36) * fotoYer.genislik * (sahneYakinlik || 1)
      : null

  /* Ölçü kesin bir odakla mı kuruluyor. */
  const odakKesin = cozulenOdak > 1 || odakYazilandan > 1 || exifOdak > 1 || fotoOdak > 1

  const alanGercek = (() => {
    if (!alanTuval || refNokta.length !== 2) return null
    const cm = Number(String(refUzunlukCm).replace(',', '.'))
    if (!(cm > 0)) return null
    const a = oranTuvale(refNokta[0])
    const b = oranTuvale(refNokta[1])
    const asal = oranTuvale({ x: 0.5, y: 0.5 })
    /*
     * Odak sırası: ikinci referanstan > yazılan ölçüden > fotoğrafın daha
     * önce öğrenilmiş odağı > tahmin.
     */
    const odak =
      cozulenOdak > 1
        ? cozulenOdak
        : odakYazilandan > 1
          ? odakYazilandan
          : exifOdak > 1
            ? exifOdak
            : fotoOdak > 1
              ? fotoOdak
              : fotoYer?.genislik > 0
                ? fotoYer.genislik * (sahneYakinlik || 1) * 0.785
                : 0
    return dortgenGercekOlcu(alanTuval, a, b, cm, asal, odak)
  })()

  const sayiCm = (x) => {
    const n = Number(String(x).replace(',', '.'))
    return n > 0 ? n : null
  }

  /*
   * ALANIN ETKİN ÖLÇÜSÜ — hesapların tamamı buna bakıyor.
   * Elle yazılan değer ölçüleni eziyor; yalnız biri yazılmışsa öteki
   * ölçülen kalıyor.
   */
  /*
   * ALANIN ÖLÇÜLEN BOYU — perspektif hesabı çıkmazsa tek ölçekli hesap.
   *
   * Panelde hiçbir şey yazmıyordu: alan tam dikdörtgen işaretlenince (kapı
   * karşıdan çekilmişse olağan durum) kaçış noktaları sonsuza gidiyor,
   * perspektif hesabı null dönüyor ve yazdıracak değer kalmıyordu. Oysa
   * orada tek ölçekli hesap zaten doğru; gösterilecek bir sayı hep var.
   */
  /*
   * CANLI ÖLÇÜ — köşe sürüklenirken büyütecin altında yazıyor.
   *
   * Ölçü kartta zaten güncelleniyordu ama kullanıcı sürüklerken gözü
   * fotoğrafta; panele bakmak için sürüklemeyi bırakmak gerekiyordu.
   * (alanOlculenCm hemen aşağıda; metin onu okuduğu için orada kuruluyor.)
   */
  const alanOlculenCm = (() => {
    if (alanGercek) return { enCm: alanGercek.enCm, boyCm: alanGercek.boyCm }
    if (!alanTuval || !(alanOlcegiPxM > 0)) return null
    const enPx =
      (Math.hypot(alanTuval[1].x - alanTuval[0].x, alanTuval[1].y - alanTuval[0].y) +
        Math.hypot(alanTuval[2].x - alanTuval[3].x, alanTuval[2].y - alanTuval[3].y)) /
      2
    const boyPx =
      (Math.hypot(alanTuval[3].x - alanTuval[0].x, alanTuval[3].y - alanTuval[0].y) +
        Math.hypot(alanTuval[2].x - alanTuval[1].x, alanTuval[2].y - alanTuval[1].y)) /
      2
    if (!(enPx > 1) || !(boyPx > 1)) return null
    return { enCm: (enPx / alanOlcegiPxM) * 100, boyCm: (boyPx / alanOlcegiPxM) * 100 }
  })()

  const alanEtkinCm = (() => {
    const olculenEn = alanOlculenCm?.enCm ?? null
    const olculenBoy = alanOlculenCm?.boyCm ?? null
    const en = sayiCm(alanElleEn) ?? olculenEn
    const boy = sayiCm(alanElleBoy) ?? olculenBoy
    return en > 0 && boy > 0 ? { enCm: en, boyCm: boy } : null
  })()

  /*
   * ÖLÇÜ ELLE YAZILDIYSA ZATEN KESİN — ODAĞA GEREK YOK.
   *
   * "Tasarımı ölçüye sığdır" odak çözülmeden açılmıyordu. Odak, fotoğraftan
   * SANTİM çıkarmak için gerekiyor; kullanıcı alanın gerçek en/boyunu
   * kendisi yazdıysa o santim zaten elimizde ve sığdırma hesabı da onu
   * kullanıyor (bkz. tasarimiAlanaSigdir → alanEtkinCm).
   *
   * Belirtisi: "Belirli bir alanım var" yolunda — ki orada ölçü HER ZAMAN
   * elle yazılıyor ve referans hiç sorulmuyor — sığdır düğmesi karşıdan
   * çekilmiş fotoğraflarda hiç çıkmıyordu. Karşıdan çekilen bir duvarda
   * kaçış noktaları sonsuzda olduğu için odak o kareden matematiksel
   * olarak çıkmaz; oysa ölçü biliniyor.
   */
  const alanOlcusuYazildi = sayiCm(alanElleEn) > 0 && sayiCm(alanElleBoy) > 0

  /*
   * ───────────────────────────────────────────────────────────────────────
   * TASARIMIN ÖLÇÜSÜ DEĞİŞİNCE ÇİZİM DE DEĞİŞİYOR.
   *
   * Alan işaretlendikten sonra ekrandaki dörtgen bir kez yazılıp öylece
   * kalıyordu. Sol panelden sütun/satır değiştirmek tasarımın gerçek
   * ölçüsünü değiştiriyor ama ekranda hiçbir şey olmuyordu.
   *
   * Artık alan duruyorken dörtgen, tasarımın o anki gerçek ölçüsünden ve
   * alan içindeki yerinden yeniden kuruluyor. Sürükleme de aynı yerden
   * besleniyor, dolayısıyla ikisi çakışmıyor.
   *
   * BURADA DURUYOR, YUKARIDA DEĞİL. Bağımlılık dizisi RENDER sırasında
   * okunuyor; etki yukarıdayken dizideki alanOlcegiPxM henüz tanımlı
   * olmuyor ve uygulama açılır açılmaz hata ekranına düşüyordu (TDZ).
   * ───────────────────────────────────────────────────────────────────────
   */
  useEffect(() => {
    if (alanNokta.length !== 4 || alanKipi) return
    /*
     * Gruplu bir üyenin yeri GRUPTAN geliyor; alanından yeniden kurmak
     * dikişi açardı (bkz. aktifGrupKose).
     */
    if (grup && aktifEkranId && grup.uyeler?.includes(aktifEkranId) && grup.uyeler[0] !== aktifEkranId) return
    if (!(alanOlcegiPxM || cizimOlcek) || !(tasarimWm > 0) || !(tasarimHm > 0)) return
    const k = alanNokta.map(oranTuvale)
    const sirali = koseleriSirala(k)
    const n = alanaYerlestir(sirali, alanKonum.u, alanKonum.v, alanOlcek)
    if (n) elleKoseyeYaz(n)
    /* elleKose'yi bu etki yazıyor; bağımlılığa koymak döngü olurdu. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
    /* Elle yazilan olcu de cizimi etkiliyor: yazar yazmaz yansisin. */
  }, [
    tasarimWm,
    tasarimHm,
    cizimOlcek,
    alanOlcegiPxM,
    alanElleEn,
    alanElleBoy,
    alanNokta,
    alanKipi,
    alanKonum.u,
    alanKonum.v,
  ])

  const tuvalOrana = (k) => {
    const yer = fotoYer
    if (!(yer?.genislik > 0) || !(yer?.yukseklik > 0)) return k
    const z = sahneYakinlik || 1
    const mX = tuvalBoyut.w / 2
    const mY = tuvalBoyut.h / 2
    return {
      x: (mX + (k.x - mX) / z - yer.sol) / yer.genislik,
      y: (mY + (k.y - mY) / z - yer.ust) / yer.yukseklik,
    }
  }

  /*
   * KUTU OYNATILDIKÇA ÖLÇEK YENİDEN HESAPLANIYOR.
   *
   * Kullanıcı kutuyu gerçek duvarın üstüne oturtuyor. O anda iki şey
   * biliniyor: duvarın GERÇEK eni (kullanıcı yazdı) ve fotoğrafta kapladığı
   * PAY (kutunun genişliği). İkisinden kadraj, kadrajdan da mesafe çıkıyor:
   *
   *   kadraj = duvar eni ÷ kutunun genişlik payı
   *   mesafe = kadraj ÷ 1,11
   *
   * Böylece kullanıcının girdiği ölçü gerçekten geçerli oluyor: kutuyu
   * duvara oturttuğu anda sahnenin ölçeği ona göre kalibre ediliyor.
   */
  /*
   * KUTU FOTOĞRAFIN DIŞINA ÇIKMIYOR.
   *
   * Kutu fotoğrafa göre ORANLI saklanıyor: 0 ile 1 arası fotoğrafın içi,
   * dışı fotoğrafın dışı. Kullanıcı kutuyu kenardan dışarı sürüklediğinde
   * dörtgen olduğu gibi geri kaydırılıyor — şekli ve ölçüsü bozulmuyor,
   * yalnızca yeri düzeltiliyor.
   *
   * Kutu fotoğraftan büyükse (girilen duvar o mesafeye sığmıyorsa) kırpmak
   * yanlış olur: o zaman ortalanıyor ve sebep zaten uyarı olarak yazılı.
   */
  /*
   * TASARIMI DUVARA TAM SIĞDIR.
   *
   * Duvarın gerçek ölçüsü biliniyor (pop-up'ta girildi). Ekran kabinlerden
   * oluştuğu için duvara TAM oturması ancak tam sayıda kabinle mümkün:
   * duvara sığan en çok sütun ve satır alınıyor, artan birkaç santim boş
   * kalıyor. Kabin ölçüsü ekranın yönüne göre (yatay/dikey) değiştiği için
   * hesap cwM/chM üzerinden yapılıyor.
   */
  /*
   * TASARIMI KUTUYA YERLEŞTİR.
   *
   * Tasarımı kutunun içine fareyle oturtmak zordu: kutu küçükse hedef birkaç
   * piksel ve her denemede kayıyordu. Oysa doğru yer zaten hesaplanabiliyor —
   * sürükleme kayması sıfırken tasarım kutunun TAM ORTASINA düşüyor
   * (bkz. ortaX/ortaY). Düğme yalnızca o kaymayı sıfırlıyor.
   *
   * Ölçüler eşitse ortalamak = tam oturmak; değilse kutunun ortasında
   * duruyor, taşan kısım da taramayla işaretli kalıyor.
   */
  const tasarimiKutuyaYerlestir = () => {
    if (!duvarOlcu) return
    mekaniOrtala()
    /*
     * BURADA MESAJ BIRAKILMIYOR.
     *
     * Düğme bir ara sonucu ozelUyari'ya yazıyordu: "Tasarım kutuya tam
     * oturdu." Sorun, o cümlenin BASILDIĞI ANIN fotoğrafı olması — kullanıcı
     * sonra kutuyu 96 × 192'den 106 × 224'e çıkarıyor, tasarım artık kutudan
     * küçük kalıyor ama ekranda hâlâ "tam oturdu" yazıyor. Doğru çizim ile
     * yanlış yazı yan yana durunca hangisine inanacağı belirsizleşiyordu.
     *
     * Yerine aşağıda CANLI bir karşılaştırma satırı var: iki ölçüyü o anki
     * değerleriyle yazıyor, dolayısıyla eskiyemiyor.
     */
  }

  /*
   * SIĞDIR MESAJI SÜTUN/SATIR DEĞİŞİNCE DÜŞÜYOR.
   *
   * O cümle bir EYLEMİN sonucu; kullanıcı sonrasında kabin sayısını
   * değiştirdiğinde artık doğru değil. Eskimiş bir cümleyi ekranda tutmak,
   * hiç yazmamaktan kötü.
   */
  useEffect(() => {
    setOzelUyari(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, rows, olcuKutu])

  const tasarimiDuvaraSigdir = () => {
    if (!duvarOlcu) return
    /*
     * YÖN DE SEÇİLİYOR — EN ÇOK LED HANGİSİNDEYSE O.
     *
     * Düğme hesabı o anki yönün kabin ölçüsüyle (cwM/chM) yapıyordu, yani
     * kabini yan çevirmeyi hiç denemiyordu. Yatay varsayılan olduğu için
     * sonuç hep yatay çıkıyordu; dikey dizilim duvara daha çok kabin
     * sığdırıyor olsa bile.
     *
     * Artık iki yön de hesaplanıp LED sayısı fazla olan seçiliyor. Eşitlikte
     * yatay kalıyor: kabin döndüğünde LED sayısı değişmez, yalnızca yer
     * değiştirir, bu yüzden iki dizilim sık sık birebir aynı çıkıyor ve
     * eşitlik bir üstünlük sayılmıyor (aynı kural yüzey önerisinde de var).
     */
    /* Burada da ham model: yatay/dikey mutlak kalsın (bkz. tasarimiAlanaSigdir). */
    const m = selectedModel || previewModel
    const secenek = yerlesimSecenekleri(m, duvarOlcu.wm, duvarOlcu.hm)
    if (!secenek) return
    const { yatay, dikey } = secenek
    const dikeySec = dikey.piksel > yatay.piksel
    const kazanan = dikeySec ? dikey : yatay
    /* Kazanan yönün kabin ölçüsü: dikeyde kabin yan yatıyor. */
    const cwM2 = ((dikeySec ? m.heightMm : m.widthMm) || 500) / 1000
    const chM2 = ((dikeySec ? m.widthMm : m.heightMm) || 500) / 1000
    const c = kazanan.cols
    const r = kazanan.rows
    setOrientation(dikeySec ? 'portrait' : 'landscape')
    setCols(c)
    setRows(r)
    /* Duvar alanı da en az bu kadar olmalı, yoksa üst sınır kabinleri kırpar. */
    setWidth((e) => Math.max(e, +(c * cwM2).toFixed(2)))
    setHeight((e) => Math.max(e, +(r * chM2).toFixed(2)))
    /*
     * SONUCU SÖYLE.
     *
     * Duvar bir kabinden küçükse hesap zaten 1 × 1 çıkıyor ve ekranda
     * hiçbir şey değişmiyordu; kullanıcı düğmenin bozuk olduğunu sanıyordu.
     * Değişsin değişmesin sonuç yazılıyor.
     */
    const ayni = c === cols && r === rows
    setOzelUyari(
      (ayni ? t('scene.fitWallSame') : t('scene.fitWallDone')) +
        ' ' +
        c +
        ' × ' +
        r +
        ' ' +
        t('scene.cabinets') +
        ' (' +
        (c * cwM2).toFixed(2).replace('.', ',') +
        ' × ' +
        (r * chM2).toFixed(2).replace('.', ',') +
        ' m)',
    )
  }

  /*
   * ÖLÇEK FOTOĞRAFTAN GELİYOR, MESAFE TAHMİNİNDEN DEĞİL.
   *
   * Eskiden kutunun büyüklüğü girilen mesafeden hesaplanıyordu
   * (kadraj = mesafe × 1,11). Bu, her kameranın görüş açısını aynı sayan bir
   * TAHMİNDİ ve gerçek ölçümde tutmadı: fotoğrafın neredeyse tamamını
   * kaplayan 0,36 m'lik bir dizüstü ekranı için kutu fotoğrafın %65'inde
   * kalıyordu. Aynı mesafeden çekilen iki fotoğraf, lens değişince bambaşka
   * genişlikleri kapsar; mesafeden ölçek çıkarmak baştan yanlıştı.
   *
   * KUTU KALİBRASYONDUR; METRE ONUN NE ANLAMA GELDİĞİNİ SÖYLER.
   *
   * Burada uzun süre bir hata vardı: duvarın metre değeri her değiştiğinde
   * kutu yeniden kuruluyordu. Oysa kutu, fotoğraftaki duvarın DÖRT KÖŞESİ —
   * duvarın kaç metre olduğunu yazmak o köşeleri oynatmamalı, yalnızca o
   * dörtgenin kaç metre ettiğini değiştirmeli.
   *
   * Belirtisi şuydu: fotoğrafın tamamı kullanıcının ekranıyken kutuyu
   * fotoğrafa oturtmak için gerçek ölçü yerine uydurma bir ölçü (0,55 × 0,34)
   * yazmak gerekiyordu.
   *
   * Artık tetikleyene göre ayrışıyor:
   *
   *   ilk kurulum    → kutu fotoğrafın tamamını kaplar, MESAFE ondan hesaplanır
   *   ölçü değişti   → kutu YERİNDE kalır, yalnızca ölçeği değişir
   *   mesafe girildi → kutu o mesafeden görünen kadraja göre yeniden kurulur
   *   kutu oynatıldı → mesafe kutudan yeniden hesaplanır
   *
   * İLK KURULUMDA ÖLÇÜ KAZANIYOR. Pop-up'ta en/boy ve mesafe aynı anda
   * giriliyordu ve ikisi birbiriyle çelişebiliyordu: fotoğrafın tamamı
   * 0,355 m iken mesafeye 0,5 yazılınca kadraj 0,555 m sayılıyor ve duvar
   * karenin ancak %64'ünü kaplıyordu — kullanıcının "kutu küçük duruyor"
   * dediği durum tam buydu. Fotoğraftaki duvarın ne kadarını kapladığını
   * bilen tek şey kullanıcının kendisi; o da kutuyu sürükleyerek söylüyor.
   * Bu yüzden ilk kutu her zaman fotoğrafın tamamı ve mesafe ondan çıkıyor.
   *
   * @param {'ilk'|'olcu'|'mesafe'} kaynak değişikliği hangi alan tetikledi
   */
  /*
   * SOL PANELDEKİ DUVAR = TASLAK KUTU.
   *
   * Sol paneldeki "Duvar" alanı kabin sayısının üst sınırını belirliyor
   * (colsMax / rowsMax). Fotoğraflı mekânda varsayılan 1 × 1 m kalıyor ve
   * kullanıcının taslak kutuyla tanıttığı gerçek duvardan habersiz oluyordu:
   * duvar 4 metre olsa bile sütun sayısı 3'te takılıyordu.
   *
   * Kalibrasyon tamamlandığında ikisi eşitleniyor — duvar neyse ekranın
   * sığabileceği alan da o.
   */
  /*
   * BURADA duvariEsitle VARDI VE KALDIRILDI.
   *
   * Ölçü kutusunun santimetresini sol panelin duvar metresine yazıyordu.
   * Varlık sebebi, duvar ölçüsünden gelen sütun/satır üst sınırını (colsMax)
   * büyütmekti; o sınır artık duvardan gelmiyor, dolayısıyla işlevsiz kaldı.
   *
   * Kaldırılma gerekçesi işsizlikten de öte: sol paneldeki duvarın kutuyu
   * takip etmesi, ikisinin AYNI ŞEY olduğu izlenimi veriyordu. Üçü ayrı:
   *   ölçü kutusu  -> fotoğraftaki yerleşim alanı (cm)
   *   tasarım      -> cols × cwM, rows × chM
   *   sol panel duvarı -> fotoğrafsız önizlemedeki duvar (m)
   */

  /*
   * KUTUYA TIKLANDI: TASARIM İÇİNE YERLEŞİYOR.
   *
   * Kutu tuval pikselinde; hedef yüzey ise fotoğrafa göre oranlı. Aynı
   * eşlemenin tersi uygulanıyor. Kutu bundan sonra ekranda durmuyor —
   * görevi bitti, duvarı tanıttı.
   */
  /*
   * SAHNE DEĞİŞİNCE KUTU KALMIYOR — AMA GERİ DÖNÜNCE GERİ GELİYOR.
   *
   * Kutu yalnızca kullanıcının kendi fotoğrafına ait; başka bir mekâna
   * geçilince ekranda asılı kalması, oraya ait olmayan bir duvarı göstermek
   * demek. Bu yüzden siliniyordu.
   *
   * Ama yalnızca SİLİNİYORDU. Mekânı "Kapalı" yapıp sonra fotoğrafa geri
   * dönen kullanıcı yarım bir durumla kalıyordu: referans ve ölçü kutusunun
   * santimetresi panelde hâlâ yazıyor (onlar silinmiyor), oysa kutunun
   * dörtgeni ve duvar ölçüsü gitmiş oluyor. Duvar ölçüsü olmayınca tasarım
   * duvarın koordinat sisteminden değil, çekim mesafesinden ölçekleniyor ve
   * fotoğrafın ortasında minicik kalıyordu.
   *
   * Çözüm: silmeden önce bir kopya alınıyor, fotoğrafa dönüldüğünde geri
   * konuyor. Yeni bir fotoğraf yüklenirse kopya da düşüyor (bkz. fotoğraf
   * yükleme dalındaki kutuYedek temizliği) — çünkü o kutu o fotoğrafa aitti.
   */
  useEffect(() => {
    if (scene !== 'ozel' || !ozelSahne) {
      if (taslakKutu || duvarOlcu) kutuYedek.current = { taslak: taslakKutu, olcu: duvarOlcu }
      setTaslakKutu(null)
      setDuvarOlcu(null)
      return
    }
    if (!taslakKutu && kutuYedek.current) {
      setTaslakKutu(kutuYedek.current.taslak)
      setDuvarOlcu(kutuYedek.current.olcu)
      kutuYedek.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, ozelSahne])

  /*
   * KUTUYA TIKLAMAK = 'DUVARI BULDUM, BİTİR'.
   *
   * Tasarım zaten kutunun içinde; tıklamak yalnızca kutuyu ekrandan
   * kaldırıyor. Duvarın ölçüsü saklı kaldığı için sığma denetimi çalışmaya
   * devam ediyor.
   */
  /*
   * ÖLÇÜ KUTUSU → ÇİZİM.
   *
   * Kutunun GERÇEK ölçüsü duvar ölçüsü olarak veriliyor; tasarım bu ölçüyle
   * karşılaştırılarak kutunun içine oturuyor (bkz. koseTuval). Kutunun
   * fotoğraftaki dörtgeni (hedefKose) kullanıcının çizdiği şekildir ve
   * fiziksel bir ölçüm iddiası taşımaz.
   */
  /*
   * DEĞİŞMEZLİK — BURAYA KABİN SAYISI YAZILMAZ.
   *
   * Kutu, tasarımı BARINDIRIR; tasarım kutudan TÜREMEZ. Bu effect'e asla
   * setCols/setRows eklenmemeli ve tasarımın fiziksel ölçüsü (cols × cwM,
   * rows × chM) kutu ölçüsünden okunmamalı.
   *
   * Kural bir kez bozulmuştu, iki yerden sızıyordu:
   *   1) ekranWm = Math.min(width, cols × cwM)  — tasarımı duvara kırpıyordu
   *   2) cols > colsMax ise setCols(colsMax)    — seçimi sessizce azaltıyordu
   * İkisi de kaldırıldı. Aşağıdaki duvariEsitle yalnızca SOL PANELDEKİ duvar
   * metresini yazıyor; o sayı tasarım hesabına hiçbir yerden girmiyor.
   *
   * Tasarım ölçüsünü değiştirmeye yetkili yalnızca iki şey: kullanıcının
   * sütun/satır ayarı ve "Tasarımı duvara tam sığdır" düğmesi.
   */
  useEffect(() => {
    if (!olcuKutu) return
    setDuvarOlcu({ wm: olcuKutu.enCm / 100, hm: olcuKutu.boyCm / 100 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [olcuKutu])

  /** Girilen santimetreyi okur; geçersizse mesaj yazıp null döner. */
  /*
   * SANTİM METRE SANILDI MI?
   *
   * Alan SANTİMETRE isteniyor ama soldaki "Duvar" bölümü METRE ile çalışıyor;
   * kullanıcı oradan okuyup 0,96 × 1,91 yazabiliyor. Alt sınır 0,5 cm olduğu
   * için bu kabul ediliyordu ve sonuç yaklaşık 1 SANTİMLİK bir ölçü kutusuydu:
   * ekranda 7 piksel, yani tutulup taşınamayan bir nokta. Tasarım da o kutudan
   * yüz kat büyük kaldığı için her yer taşma taramasına dönüyordu.
   *
   * En küçük kabin 160 mm; bundan küçük bir yerleşim alanı hiçbir kurulumda
   * işe yaramaz. Sessizce düzeltmiyoruz — metreyi santime çevirmek kullanıcının
   * kararı — ama ne yazması gerektiğini söylüyoruz.
   */
  const EN_AZ_KUTU_CM = 5

  const kutuOlcusuOku = () => {
    const en = Number(String(kutuEn).replace(',', '.'))
    const boy = Number(String(kutuBoy).replace(',', '.'))
    if (!(en > 0) || !(boy > 0)) {
      setKutuMesaj(t('ref.hata.olcuYok'))
      return null
    }
    if (en < EN_AZ_KUTU_CM || boy < EN_AZ_KUTU_CM) {
      setKutuMesaj(
        t('ref2.olcuCokKucuk') +
          ' ' +
          Math.round(en * 100) +
          ' × ' +
          Math.round(boy * 100) +
          ' cm',
      )
      return null
    }
    return { en, boy }
  }

  /*
   * REFERANSTAN ÖLÇEK.
   *
   * Zincirin her halkası ayrı ayrı null olabiliyor ve olduğunda sonuç da null:
   * eksik veri hiçbir yerde varsayılanla doldurulmuyor, tahmin üretilmiyor.
   */
  const refOlcek = useMemo(
    () =>
      referansOlcek(
        refNokta[0],
        refNokta[1],
        refUzunlukCm,
        ozelSahne?.kaynak?.w,
        ozelSahne?.kaynak?.h,
      ),
    [refNokta, refUzunlukCm, ozelSahne],
  )
  const refPxCm = refOlcek?.pxPerCm || null
  /*
   * DÜZLEM — yalnızca dört köşe kipinde.
   *
   * Varsa ölçek artık tek bir sayı değil: px/cm düzlemin her yerinde
   * farklı ve bu doğru olan. Kutu dünyada santim cinsinden kurulup
   * homografiyle fotoğrafa düşürülüyor.
   */
  const refDuzlem = useMemo(
    () =>
      refTur === 'dortgen'
        ? referansDuzlemi(refNokta, refUzunlukCm, refBoyCm, ozelSahne?.kaynak?.w, ozelSahne?.kaynak?.h)
        : null,
    [refTur, refNokta, refUzunlukCm, refBoyCm, ozelSahne],
  )

  /* Referans çizgisinin görseldeki eğimi — yalnızca düzlem içi dönme. */
  const refAci = useMemo(
    () => referansAcisi(refNokta[0], refNokta[1], ozelSahne?.kaynak?.w, ozelSahne?.kaynak?.h),
    [refNokta, ozelSahne],
  )
  /* Kutu ancak referans kurulduktan sonra oluşturulabiliyor. */
  const kutuKurulabilir = !!((refPxCm || refDuzlem) && ozelSahne?.kaynak?.w > 0)

  /*
   * ÖLÇÜ KUTUSU — TEK KURUCU.
   *
   * Mutlak piksel büyüklüğü doğrudan fiziksel hesaptan:
   *   kutuPx = cm × px/cm,   px/cm = referansPikselMesafesi / referansCm
   *
   * Kutu, referans çizgisinin ORTASINA kuruluyor: iki noktalı ölçek
   * perspektifli fotoğrafta yereldir ve ölçeğin ölçüldüğü yere en yakın
   * nokta orasıdır. Kadraja sığmıyorsa KÜÇÜLTÜLMÜYOR (ölçüyü yalanlamamak
   * için), yalnızca fotoğrafın içinde kalacak biçimde kaydırılıyor.
   */
  const olcuKutusunuKur = () => {
    const o = kutuOlcusuOku()
    if (!o) return
    const kaynak = ozelSahne?.kaynak
    if ((!refPxCm && !refDuzlem) || !(kaynak?.w > 0)) {
      setKutuMesaj(t('ref2.onceReferans'))
      return
    }
    /*
     * DÜZLEM VARSA KUTU ONUN ÜSTÜNE OTURUYOR.
     *
     * Kutu dünyada bir dikdörtgen; fotoğrafta perspektif yüzünden yamuk
     * görünüyor ve bu doğru olan. Eğim ayrıca uygulanmıyor — düzlem
     * zaten dönmeyi de içeriyor.
     */
    const k = refDuzlem
      ? duzlemdeKutu(refDuzlem, o.en, o.boy, duzlemMerkezi(refDuzlem))
      : kutuDortgeni(
          o.en,
          o.boy,
          refPxCm,
          kaynak.w,
          kaynak.h,
          /*
           * Kutu referansın ORTASINA değil, YANINA kuruluyor: referans
           * çizgisi kutunun kenarı oluyor ve kutu boş tarafa açılıyor.
           * Hangi tarafın boş olduğu ölçülüyor (bkz. kutuYerlesimMerkezi).
           */
          kutuYerlesimMerkezi(
            refNokta[0],
            refNokta[1],
            o.en,
            o.boy,
            refPxCm,
            kaynak.w,
            kaynak.h,
            refAciKullan ? refAci?.kutuAci || 0 : 0,
          ),
          refAciKullan ? refAci?.kutuAci || 0 : 0,
        )
    if (!k) {
      setKutuMesaj(t('ref2.onceReferans'))
      return
    }
    setOlcuKutu({ enCm: o.en, boyCm: o.boy })
    setHedefKose(k.koseler)
    setTaslakKutu(k.koseler)
    setHedefTur('taslak')
    /* Yeni kutu: tasarım yeniden gizleniyor, kullanıcı kutuya tıklayınca açılacak. */
    setTasarimAcik(false)
    /*
     * Yeni kutunun duruşu: referanstan gelen düzlem içi eğim var, çevirme
     * ve yatırma yok. Eğim artık DURUŞUN parçası — köşelerden oturtma onu
     * da değiştirebiliyor, dolayısıyla tek yerde tutulması gerekiyor.
     */
    setKutuDurus({ roll: refAciKullan ? refAci?.kutuAci || 0 : 0, yaw: 0, pitch: 0 })
    /* Yeni kutu doğrudan konumlandırılabilir olsun; ilk iş onu yerine koymak. */
    setKutuDuzen('hepsi')
    setRefEskidi(false)
    setKutuMesaj(k.tasiyor ? t('ref2.kadrajaSigmaz') : null)
  }

  /*
   * MANUEL DÜZENLE — köşe işaretlemeden doğrudan yerleştirmeye.
   *
   * Şartnamedeki ikinci yol: köşe işaretleme yok, tasarım referanstan gelen
   * ölçekle KENDİ GERÇEK BOYUTUNDA fotoğrafa konuyor ve kullanıcı onu
   * sürükleyip köşelerinden duvara oturtuyor. Büyütüp küçültmek yalnızca
   * kabin sayısıyla — bu yüzden kutunun ölçüsü burada SORULMUYOR, tasarımın
   * kendi santiminden alınıyor.
   *
   * Düğme eskiden sihirbazı bir adım ilerletiyordu; o adım elle santim yazma
   * adımıydı ve oradaki "Kutuyu kur" düğmesi kapalı olduğu için (PANEL
   * .olcuKutusu) yol çıkmaz sokağa giriyordu — kullanıcının gördüğü "henüz
   * hazır değil" notu da bu yüzden duruyordu.
   *
   * Kutuyu kuran hesap olcuKutusunuKur ile aynı; ayrılan tek şey ölçünün
   * nereden geldiği.
   */
  /*
   * DÖRTGENİ KENDİ EKSENLERİNDE ÖLÇEKLER.
   *
   * Genişlik yönünde kx, yükseklik yönünde ky. Eksenler kutunun KENDİ
   * kenarlarından çıkıyor; bu yüzden döndürülmüş ya da perspektifli bir
   * kutu da doğru yönde büyüyor. Merkez sabit kalıyor: kabin eklemek
   * kutuyu yerinden oynatmıyor, yalnızca büyütüyor.
   */
  const dortgeniOlcekle = (k, kx, ky) => {
    if (!Array.isArray(k) || k.length !== 4) return k
    const cx = (k[0].x + k[1].x + k[2].x + k[3].x) / 4
    const cy = (k[0].y + k[1].y + k[2].y + k[3].y) / 4
    /* u: üst ve alt kenarın ortalaması, v: sol ve sağ kenarınki. */
    const ux = (k[1].x - k[0].x + (k[2].x - k[3].x)) / 2
    const uy = (k[1].y - k[0].y + (k[2].y - k[3].y)) / 2
    const vx = (k[3].x - k[0].x + (k[2].x - k[1].x)) / 2
    const vy = (k[3].y - k[0].y + (k[2].y - k[1].y)) / 2
    const det = ux * vy - uy * vx
    if (!(Math.abs(det) > 1e-6)) return k
    return k.map((p) => {
      const dx = p.x - cx
      const dy = p.y - cy
      /* Köşeyi (u, v) tabanına çöz, ölçekle, geri topla. */
      const a = ((dx * vy - dy * vx) / det) * kx
      const b = ((ux * dy - uy * dx) / det) * ky
      return { x: cx + a * ux + b * vx, y: cy + a * uy + b * vy }
    })
  }

  /*
   * SERBEST YERLEŞTİRMEDE KUTU KABİN SAYISIYLA BÜYÜYOR.
   *
   * Kutu, serbest yerleştirmeye geçilen ANDAKİ tasarım ölçüsüyle bir kez
   * kuruluyordu ve orada kalıyordu: kullanıcı sütun/satır artırınca panel
   * "kutu 0,32 × 0,16 m · tasarım 0,64 × 0,32 m" diyor ama fotoğraftaki
   * kutu tek kabinlik kalıyordu. Kutu tasarımın yerini gösteriyor;
   * tasarım büyüyorsa kutu da büyümeli.
   *
   * Yalnızca serbest yerleştirmede: alan işaretlenmişse kutunun ölçüsü
   * alandan geliyor (bkz. alanaYerlestir) ve oraya karışılmıyor.
   */
  useEffect(() => {
    if (hedefTur !== 'taslak' || alanNokta.length === 4) return
    if (!olcuKutu || !(olcuKutu.enCm > 0) || !(olcuKutu.boyCm > 0)) return
    if (!(tasarimWm > 0) || !(tasarimHm > 0)) return
    const enCm = tasarimWm * 100
    const boyCm = tasarimHm * 100
    /* Yarım milimetrelik fark yok sayılıyor: yoksa döngü kapanmaz. */
    if (Math.abs(olcuKutu.enCm - enCm) < 0.05 && Math.abs(olcuKutu.boyCm - boyCm) < 0.05) return
    const kx = enCm / olcuKutu.enCm
    const ky = boyCm / olcuKutu.boyCm
    setHedefKose((k) => dortgeniOlcekle(k, kx, ky))
    setTaslakKutu((k) => dortgeniOlcekle(k, kx, ky))
    setOlcuKutu({ enCm, boyCm })
    /* dortgeniOlcekle her çizimde yeni: bağımlılığa koymak döngü olurdu. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasarimWm, tasarimHm, hedefTur, alanNokta.length, olcuKutu])

  const elleDuzenlemeyeGec = () => {
    const kaynak = ozelSahne?.kaynak
    if ((!refPxCm && !refDuzlem) || !(kaynak?.w > 0)) {
      setKutuMesaj(t('ref2.onceReferans'))
      return
    }
    /*
     * TEK KABİNLE BAŞLAMIYOR.
     *
     * Varsayılan 1 × 1 kabin, yani 32 × 16 cm: fotoğrafta pul kadar bir
     * kutu çıkıyor ve kullanıcı onu büyütmeye çalışırken ne taşıdığını
     * göremiyordu. Hiç dokunulmamışsa (1 × 1) yaklaşık 2 × 1 metrelik
     * makul bir duvar ekranıyla başlıyor; kullanıcı zaten sütun/satırdan
     * istediğini yapıyor.
     */
    let sutun = cols
    let satir = rows
    if (cols === 1 && rows === 1) {
      const m = selectedModel || previewModel
      const dikey = orientation === 'portrait'
      const kwM = ((dikey ? m?.heightMm : m?.widthMm) || 500) / 1000
      const khM = ((dikey ? m?.widthMm : m?.heightMm) || 500) / 1000
      sutun = Math.max(1, Math.min(colsMax, Math.round(2 / kwM)))
      satir = Math.max(1, Math.min(rowsMax, Math.round(1 / khM)))
      setCols(sutun)
      setRows(satir)
    }
    /* Kutu, az sonra uygulanacak kabin sayısının karşılığı kadar. */
    const m2 = selectedModel || previewModel
    const dikey2 = orientation === 'portrait'
    const enCm = (sutun * ((dikey2 ? m2?.heightMm : m2?.widthMm) || 500)) / 10
    const boyCm = (satir * ((dikey2 ? m2?.widthMm : m2?.heightMm) || 500)) / 10
    if (!(enCm > 0) || !(boyCm > 0)) return
    const aci = refAciKullan ? refAci?.kutuAci || 0 : 0
    const k = refDuzlem
      ? duzlemdeKutu(refDuzlem, enCm, boyCm, duzlemMerkezi(refDuzlem))
      : kutuDortgeni(
          enCm,
          boyCm,
          refPxCm,
          kaynak.w,
          kaynak.h,
          kutuYerlesimMerkezi(refNokta[0], refNokta[1], enCm, boyCm, refPxCm, kaynak.w, kaynak.h, aci),
          aci,
        )
    if (!k) {
      setKutuMesaj(t('ref2.onceReferans'))
      return
    }
    setOlcuKutu({ enCm, boyCm })
    setHedefKose(k.koseler)
    setTaslakKutu(k.koseler)
    setHedefTur('taslak')
    /*
     * Tasarım AÇIK başlıyor: manuel yolda kullanıcı tasarımı taşıyacak,
     * önce onu görmesi gerekiyor. (Kutu kurma yolunda gizli başlıyor çünkü
     * orada bir sonraki iş kutunun ölçüsünü onaylamak.)
     */
    /*
     * Kutu konurken tasarım gizli: taşınan şey kutunun kendisi ve
     * altındaki duvarın görünmesi gerekiyor. Tasarımı "Bitir ve tasarımı
     * göster" ortaya çıkarıyor.
     */
    setTasarimAcik(false)
    setKutuDurus({ roll: aci, yaw: 0, pitch: 0 })
    setKutuDuzen('hepsi')
    setRefEskidi(false)
    setKutuMesaj(k.tasiyor ? t('ref2.kadrajaSigmaz') : null)
    /* İşaretleme kapanıyor: artık taşınan şey tasarımın kendisi. */
    setRefKipi(false)
    setAlanKipi(false)
    setSihirbazAdim(4)
  }

  /*
   * SİHİRBAZ ADIMLARI.
   *
   * Her adım yalnızca kendi işini yapıyor; ölçek ve kutu mantığı aşağıdaki
   * mevcut işlevlerde kalıyor (referansiSifirla, olcuKutusunuKur).
   */
  /*
   * BAŞTAN BAŞLA GERÇEKTEN BAŞTAN BAŞLATIYOR.
   *
   * Eskiden yalnızca referans noktaları ve uzunluk siliniyordu; ölçü kutusu,
   * tasarımın yerleşimi, eğim ve yazılan santimetreler ekranda duruyordu.
   * Kullanıcının gördüğü şey "hiçbir şey silinmedi" idi — haklıydı, çünkü
   * ekranda duran her şey ESKİ ölçeğe aitti ve yeni referansla ilgisi yoktu.
   *
   * Sıfırlanan şeyler üç kümede: referansın kendisi, referanstan türeyen
   * kutu/tasarım yerleşimi, ve kullanıcının yazdığı ölçüler. Fotoğraf
   * duruyor — baştan başlamak fotoğrafı değiştirmek değil.
   */
  const sihirbaziBaslat = () => {
    /* 1) Referans */
    setRefNokta([])
    setRefUzunlukCm('')
    setRefBoyCm('')
    setRefMesaj(null)
    setRefEskidi(false)
    setRefAciKullan(true)
    /* 2) Referanstan türeyen her şey */
    setOlcuKutu(null)
    setTaslakKutu(null)
    setHedefKose(null)
    setHedefTur(null)
    setElleKose(null)
    setDuvarOlcu(null)
    setKutuDurus({ roll: 0, yaw: 0, pitch: 0 })
    setDuzlemeOtur(true)
    setKutuDuzen(null)
    setDuzenleAcik(false)
    kutuYedek.current = null
    setTasarimAcik(false)
    setKutuMesaj(null)
    /* 3) Yazılan ölçüler */
    setKutuEn('')
    setKutuBoy('')
    setLKoseNokta([])
    setLKoseBoyCm('')
    setLKoseKipi(false)
    setLKoseKayma({ x: 0, y: 0 })
    setLSolUst(0)
    setLSolAlt(0)
    setLSagUst(0)
    setLSagAlt(0)
    setSabitEkranlar([])
    setAktifEkranId(null)
    setAktifSira(1)
    /* Duvar dibi kipi açık kalırsa referans tıklamaları ona gider. */
    setDuvarKipi(false)
    setDuvarNokta([])
    setElleYerlesti(false)
    setAlanKipi(false)
    setAlanNokta([])
    setAlanElleEn('')
    setAlanElleBoy('')
    setAlanKonum({ u: 0.5, v: 0.5 })
    setAlanDoldur(false)
    setAlanOlcek(null)
    setRef2Nokta([])
    setRef2UzunlukCm('')
    setRef2Kipi(false)
    setFotoOdak(null)
    setDuzenlemede(false)
    setGrup(null)
    setGrupSecim([])
    /* 4) İlk adım — L'de referans yok, doğrudan köşe çizgisi. */
    if (lYerlesimKipi) {
      setRefKipi(false)
      setLKoseKipi(true)
    } else {
      setRefKipi(true)
    }
    setSihirbazAdim(1)
  }
  const sihirbazIleri = () => {
    /*
     * L'DE ÜÇ ADIM: çizgiyi işaretle, ölçüleri yaz, kanatları duvara otur.
     *
     * İşaretleme kipi 2. adımda da açık kalıyor — kullanıcı santimleri
     * yazarken noktaları hâlâ düzeltebilsin (referans akışıyla aynı gerekçe).
     * 3. adımda KAPANIYOR: orada ayarlanan şey tasarımın kendisi, görünmesi
     * gerekiyor (işaretleme sürerken tasarım çizilmiyor, bkz. ekranGizle).
     */
    if (lYerlesimKipi) {
      setSihirbazAdim((a) => {
        const sonraki = Math.min(3, a + 1)
        if (sonraki === 3) setLKoseKipi(false)
        return sonraki
      })
      return
    }
    setSihirbazAdim((a) => {
      /* 2. adıma geçerken işaretleme kipi kapanmıyor: kullanıcı uzunluğu
         yazarken noktaları hâlâ düzeltebilsin. 3. adımda kapanıyor. */
      if (a === 2) setRefKipi(false)
      return Math.min(4, a + 1)
    })
  }
  const sihirbazGeri = () => {
    if (lYerlesimKipi) {
      setLKoseKipi(true)
      setSihirbazAdim((a) => Math.max(1, a - 1))
      return
    }
    setSihirbazAdim((a) => {
      /*
       * 4. ADIMDAN GERİ = ALAN İŞARETLEME.
       *
       * Eskiden 2. adıma (referans) dönülüyordu; oysa düzenlemede
       * değiştirilmek istenen şey alanın kendisi, referans değil. Köşeler
       * yerinde duruyor ve sürüklenebiliyor; sıfırdan işaretlemek isteyen
       * "Temizle" kullanıyor. Referans yalnızca "Baştan başla" ile
       * değişiyor (bkz. duzenlemede).
       */
      if (a === 4 && alanNokta.length === 4) {
        setRefKipi(false)
        setRef2Kipi(false)
        setAlanKipi(true)
        return 4
      }
      if (a === 4 && !PANEL.olcuKutusu) {
        setRefKipi(true)
        return 2
      }
      if (a === 3) setRefKipi(true)
      if (a === 4) setKutuDuzen('hepsi')
      return Math.max(1, a - 1)
    })
  }
  const sihirbazKutuKur = () => {
    olcuKutusunuKur()
    setSihirbazAdim(4)
  }
  const sihirbazBitir = () => {
    setLKoseKipi(false)
    setKutuDuzen(null)
    setTasarimAcik(true)
    setSihirbazAdim(0)
  }
  const sihirbaziKapat = () => {
    setRefKipi(false)
    setLKoseKipi(false)
    setSihirbazAdim(0)
  }

  /*
   * REFERANS NOKTALARI DEĞİŞTİ.
   *
   * Noktalar tuval pikselinde geliyor (ReferansSecici), normalize fotoğraf
   * koordinatına çevrilerek saklanıyor; tuval pikseli yakınlaştırmaya ve
   * pencere boyutuna bağlı olduğu için ölçek ondan hesaplanamaz.
   *
   * Ortada bir kutu varsa o kutu ESKİ ölçekle kurulmuştu: kendiliğinden
   * yeniden kurulmuyor (kullanıcının yerleşimi ve perspektifi gider),
   * yalnızca uyarı işaretleniyor.
   */
  const refNoktaDegisti = (tuvalNoktalari) => {
    setRefNokta(tuvalNoktalari.map(tuvalOrana))
    setRefMesaj(null)
    if (olcuKutu) setRefEskidi(true)
  }

  /** Referansı sıfırla ve işaretleme kipini aç. */
  const referansiSifirla = () => {
    setRefNokta([])
    setRefUzunlukCm('')
    setRefKipi(true)
    setRefMesaj(null)
  }

  /*
   * EĞİMİ SIFIRLA — kutuyu düz hâline döndür.
   *
   * Kutu referansın eğiminde doğuyor ve kullanıcı köşelerinden perspektif
   * verebiliyor. Bir noktadan sonra "baştan düz başlayayım" demek
   * gerekiyordu; tek yol kutuyu yeniden kurmaktı ve o da yerini
   * kaybettiriyordu.
   *
   * Burada kutunun o anki MERKEZİ korunuyor, yalnızca şekli eksenlere
   * paralel dikdörtgene dönüyor. Fiziksel ölçü (enCm/boyCm) değişmiyor.
   *
   * Düzlem kipinde anlamsız: orada perspektif referanstan ÖLÇÜLÜYOR,
   * sıfırlanacak bir elle ayar yok.
   */
  /*
   * Kutuda şu an eğim var mı? Üç kaynaktan biri yeter: referanstan gelen
   * düzlem içi dönme, ya da fareyle verilen çevirme/yatırma.
   */
  const refEgimi = refAci?.kutuAci || 0
  /*
   * EĞİM EKRANDAKİ DÖRTGENDEN OKUNUYOR, SAKLANAN AÇIDAN DEĞİL.
   *
   * "Eğim var mı" sorusu kutuDurus'a (roll/yaw/pitch) bakılarak
   * cevaplanıyordu. Ama köşeler serbestçe sürüklenebiliyor: kullanıcı kutuyu
   * elle eğdiğinde dörtgen eğik duruyor, kutuDurus ise sıfır kalıyor. Düğme
   * de "Eğimi ayarla" yazmaya devam ediyor, oysa ortada kaldırılacak bir
   * eğim var.
   *
   * İki ölçü birlikte bakılıyor:
   *   DÖNME    — üst kenarın yatayla açısı (düzlem içi eğim)
   *   YAMUKLUK — sol ve sağ kenarın uzunluk farkı (perspektif)
   * Biri bile eşiği aşıyorsa kutu eğiktir.
   *
   * Hesap görsel pikselinde: normalize uzayda x ve y farklı sayılara
   * bölündüğü için oradaki açı gerçek açı değil.
   */
  const kutuEgimi = (() => {
    const kaynak = ozelSahne?.kaynak
    if (!Array.isArray(hedefKose) || hedefKose.length !== 4) return { derece: 0, yamuk: 0 }
    if (!(kaynak?.w > 0) || !(kaynak?.h > 0)) return { derece: 0, yamuk: 0 }
    const k = hedefKose.map((q) => ({ x: q.x * kaynak.w, y: q.y * kaynak.h }))
    const uz = (a2, b2) => Math.hypot(b2.x - a2.x, b2.y - a2.y)
    const derece = (Math.atan2(k[1].y - k[0].y, k[1].x - k[0].x) * 180) / Math.PI
    const sol = uz(k[0], k[3])
    const sag = uz(k[1], k[2])
    const ort = (sol + sag) / 2
    return { derece, yamuk: ort > 0 ? Math.abs(sol - sag) / ort : 0 }
  })()
  const egimVar = refDuzlem
    ? duzlemeOtur
    : Math.abs(kutuEgimi.derece) > 0.5 || kutuEgimi.yamuk > 0.01
  /*
   * Düğme ancak yapacak bir iş varsa duruyor: eğim varsa sıfırlanır, yoksa
   * geri yüklenecek bir referans eğimi varsa uygulanır. Referans da düzse
   * iki yönde de yapacak iş yok, düğme hiç çıkmıyor.
   */
  /*
   * EĞİM DÜĞMESİ KUTU VARKEN HER ZAMAN DURUYOR.
   *
   * Düğme "yapacak bir işi varsa" gösteriliyordu: referans düzse ve kutu da
   * düzse ortadan kayboluyordu. Niyet iyiydi ama sonuç kötü — kullanıcı
   * eğimle ilgili aracı arayıp bulamıyor ve kaldırıldığını sanıyordu.
   * Kutu varsa düğme de var; ne yapacağını da üstünde yazan derece söylüyor.
   */
  const egimDugmesiVar = !!olcuKutu

  const kutuEgiminiCevir = () => {
    const kaynak = ozelSahne?.kaynak
    if (!olcuKutu || !(kaynak?.w > 0)) return
    if (!Array.isArray(hedefKose) || hedefKose.length !== 4) return
    /*
     * DÜZLEM KİPİ: ölçülen perspektif ile düz kutu arasında gidip geliyor.
     * Düzleştirmek ölçeği bozmuyor — kutu yine enCm × boyCm, yalnızca
     * düzlemin yamukluğu uygulanmıyor.
     */
    if (refDuzlem) {
      if (!refPxCm) return
      const merkez = koseMerkezi(hedefKose)
      const k2 = duzlemeOtur
        ? kutuDortgeni(olcuKutu.enCm, olcuKutu.boyCm, refPxCm, kaynak.w, kaynak.h, merkez, 0)
        : (() => {
            const md = duzlemeDusur(refDuzlem, merkez)
            return md && duzlemdeKutu(refDuzlem, olcuKutu.enCm, olcuKutu.boyCm, md)
          })()
      if (!k2) return
      setHedefKose(k2.koseler)
      setTaslakKutu(k2.koseler)
      setHedefTur('taslak')
      setDuzlemeOtur((v) => !v)
      return
    }
    if (!refPxCm) return
    /* Eğim varsa düzleştiriyoruz, yoksa referansın eğimini geri veriyoruz. */
    const hedefAci = egimVar ? 0 : refEgimi
    const k = kutuDortgeni(
      olcuKutu.enCm,
      olcuKutu.boyCm,
      refPxCm,
      kaynak.w,
      kaynak.h,
      koseMerkezi(hedefKose),
      hedefAci,
    )
    if (!k) return
    setHedefKose(k.koseler)
    setTaslakKutu(k.koseler)
    setHedefTur('taslak')
    /* Çevirme ve yatırma her iki yönde de sıfırlanıyor. */
    setKutuDurus({ roll: hedefAci, yaw: 0, pitch: 0 })
    /* Kutu bir daha kurulursa aynı kararla başlasın. */
    setRefAciKullan(!egimVar)
  }

  /*
   * MESAFE DEĞİŞİNCE EĞİMLİ KUTU YENİDEN ÇİZİLİYOR.
   *
   * Çekim mesafesi perspektifin sertliğini belirliyor (bkz. durusKutusu.js).
   * Kutu düzken görünür bir etkisi yok — izdüşüm ölçeği açı sıfırken 1 — ama
   * çevrilmiş bir kutuda var. Burada yeniden üretilmezse panelde yazan sayı
   * ekranda duran şekle uymuyordu.
   *
   * Bağımlılık listesi kasten kısa: yalnızca mesafe değişince çalışması
   * gerekiyor, hedefKose'yi kendisi yazdığı için onu listeye koymak döngü
   * yapardı.
   */
  useEffect(() => {
    if (refDuzlem || !olcuKutu || !refPxCm) return
    if (!Math.abs(kutuDurus.yaw) && !Math.abs(kutuDurus.pitch)) return
    const kaynak = ozelSahne?.kaynak
    if (!(kaynak?.w > 0) || !Array.isArray(hedefKose) || hedefKose.length !== 4) return
    const k = durusDortgeni(
      olcuKutu.enCm,
      olcuKutu.boyCm,
      refPxCm,
      kaynak.w,
      kaynak.h,
      koseMerkezi(hedefKose),
      kutuDurus.roll,
      kutuDurus.yaw,
      kutuDurus.pitch,
      (izlemeMesafesi || 0) * 100,
    )
    if (!k) return
    setHedefKose(k.koseler)
    setTaslakKutu(k.koseler)
    setHedefTur('taslak')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [izlemeMesafesi])

  /*
   * FAREYLE PERSPEKTİF — tutamağın her hareketi duruşu çeviriyor.
   *
   * Kutunun MERKEZİ sabit kalıyor, yalnızca duruşu değişiyor. Düzlem
   * kipinde çalışmıyor: orada perspektif referanstan ölçülüyor ve elle
   * ayarlamak o ölçümü yalanlardı.
   */
  /*
   * Sürükleme başındaki açı. State yerine ref: sürükleme sırasında çalışan
   * dinleyici, basıldığı andaki kapanışı tutuyor ve state'in yeni değerini
   * GÖREMİYOR. Toplam yer değiştirme hep bu sabit başlangıca ekleniyor.
   */
  const durusBaslangici = useRef({ yaw: 0, pitch: 0 })
  const kutuDurusuBasladi = () => {
    durusBaslangici.current = kutuDurus
  }

  const kutuDurusunuCevir = (toplamDx, toplamDy) => {
    const kaynak = ozelSahne?.kaynak
    if (!olcuKutu || refDuzlem || !refPxCm || !(kaynak?.w > 0)) return
    if (!Array.isArray(hedefKose) || hedefKose.length !== 4) return
    const istek = faredenDurus(durusBaslangici.current, toplamDx, toplamDy)
    const k = durusDortgeni(
      olcuKutu.enCm,
      olcuKutu.boyCm,
      refPxCm,
      kaynak.w,
      kaynak.h,
      koseMerkezi(hedefKose),
      kutuDurus.roll,
      istek.yaw,
      istek.pitch,
      /* Perspektifin sertliği çekim mesafesinden — metre, santime çevriliyor. */
      (izlemeMesafesi || 0) * 100,
    )
    if (!k) return
    /* Sınırda sürüklemeye devam edince açı büyümesin: kırpılmış hâli geri alınıyor. */
    setKutuDurus({ roll: kutuDurus.roll, yaw: k.yawRad, pitch: k.pitchRad })
    setHedefKose(k.koseler)
    setTaslakKutu(k.koseler)
    setHedefTur('taslak')
  }

  /*
   * ÖLÇÜYÜ YERİNDE GÜNCELLE.
   *
   * Santimetreyi değiştirmenin tek yolu kutuyu YENİDEN KURMAKTI; o da kutuyu
   * referansın yanına geri götürüp kullanıcının yerleştirmesini ve duruşunu
   * siliyordu. Oysa ölçüyü düzeltmek ayrı bir iş: kutu olduğu yerde, olduğu
   * duruşta kalmalı, yalnızca büyüyüp küçülmeli.
   *
   * Merkez ve duruş korunuyor, dörtgen yeni santimetreyle yeniden üretiliyor.
   */
  const olcuyuGuncelle = () => {
    const o = kutuOlcusuOku()
    if (!o) return
    const kaynak = ozelSahne?.kaynak
    if (!olcuKutu || !(kaynak?.w > 0)) return
    if (!Array.isArray(hedefKose) || hedefKose.length !== 4) return
    const merkez = koseMerkezi(hedefKose)
    /* Düzlem kipinde perspektif ölçülmüş: kutu o düzlemde yeniden kuruluyor. */
    const k = refDuzlem
      ? (() => {
          const md = duzlemeDusur(refDuzlem, merkez)
          return md && duzlemdeKutu(refDuzlem, o.en, o.boy, md)
        })()
      : refPxCm &&
        durusDortgeni(
          o.en,
          o.boy,
          refPxCm,
          kaynak.w,
          kaynak.h,
          merkez,
          kutuDurus.roll,
          kutuDurus.yaw,
          kutuDurus.pitch,
          (izlemeMesafesi || 0) * 100,
        )
    if (!k) return
    setOlcuKutu({ enCm: o.en, boyCm: o.boy })
    setHedefKose(k.koseler)
    setTaslakKutu(k.koseler)
    setHedefTur('taslak')
    setKutuMesaj(k.tasiyor ? t('ref2.kadrajaSigmaz') : null)
  }

  /* Panelde yazılan mesafenin ham metni (bkz. OlcuSihirbazi, aynı gerekçe). */
  const [mesafeYazi, setMesafeYazi] = useState(null)
  const mesafeGoster =
    mesafeYazi ?? (izlemeMesafesi == null ? '' : Number(izlemeMesafesi).toFixed(1).replace('.', ','))
  const mesafeYaz = (metin) => {
    setMesafeYazi(metin)
    const n = Number(String(metin).replace(',', '.'))
    if (Number.isFinite(n) && n >= 0.2) setIzlemeM(Math.round(n * 100) / 100)
  }
  const mesafeAdim = (fark) => {
    setMesafeYazi(null)
    setIzlemeM(Math.max(0.2, Math.round(((Number(izlemeMesafesi) || 0) + fark) * 10) / 10))
  }

  /*
   * GÖZ HİZASI — işaretlenen köşe çizgisinden.
   *
   * Köşe zeminden tavana uzanıyor ve gerçek yüksekliği yazılı. Kamera tipik
   * olarak yerden 1,5 metrede tutulur; o hâlde göz hizası çizginin alt
   * ucundan yukarı doğru 1,5/yükseklik oranında bir yerdedir. Yazılan ölçü
   * küçükse (kullanıcı tavana kadar değil, bir panelin köşesini işaretlemiş
   * olabilir) oran sınırlanıyor: çizginin dışına düşen bir göz hizası
   * perspektifi tersine çeviriyor.
   */
  const KAMERA_YUKSEKLIGI_CM = 150

  const lUfukY = (() => {
    if (lKoseNokta.length !== 2) return null
    const koseBoyCm = Number(String(lKoseBoyCm).replace(',', '.'))
    if (!(koseBoyCm > 0)) return null
    const a = oranTuvale(lKoseNokta[0])
    const b = oranTuvale(lKoseNokta[1])
    const cUst = a.y <= b.y ? a : b
    const cAlt = a.y <= b.y ? b : a
    const oran = Math.max(0.1, Math.min(0.9, KAMERA_YUKSEKLIGI_CM / koseBoyCm))
    return cAlt.y - oran * (cAlt.y - cUst.y)
  })()

  /*
   * KÖŞEYİ FAREYLE TAŞIMA.
   *
   * Kayma TOPLAM yer değiştirmeden hesaplanıyor, adım adım toplanarak değil:
   * olaylar arasında bir kare atlanırsa toplam yine doğru kalıyor ve imleç
   * tasarımdan kopmuyor (aynı gerekçe: kutu taşıma, köşe tutamakları).
   */
  const lKoseSurukle = (e) => {
    if (e.button != null && e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const basX = e.clientX
    const basY = e.clientY
    const baslangic = lKoseKayma
    /*
     * Serbest değilsek hareket KÖŞE ÇİZGİSİNİN doğrultusuna izdüşürülüyor:
     * farenin yana giden bileşeni atılıyor, ekran çizgiden ayrılmıyor.
     * İşaretlenmiş çizgi yoksa (hazır mekânlar) köşe dik kabul ediliyor.
     */
    let yon = null
    if (!lTasimaSerbest) {
      if (lKoseNokta.length === 2) {
        const p1 = oranTuvale(lKoseNokta[0])
        const p2 = oranTuvale(lKoseNokta[1])
        const vx = p2.x - p1.x
        const vy = p2.y - p1.y
        const u = Math.hypot(vx, vy)
        if (u > 1) yon = { x: vx / u, y: vy / u }
      }
      if (!yon) yon = { x: 0, y: 1 }
    }
    const hareket = (ev) => {
      let tx = ev.clientX - basX
      let ty = ev.clientY - basY
      if (yon) {
        const boy = tx * yon.x + ty * yon.y
        tx = yon.x * boy
        ty = yon.y * boy
      }
      setLKoseKayma({ x: baslangic.x + tx, y: baslangic.y + ty })
    }
    const birak = () => {
      window.removeEventListener('pointermove', hareket)
      window.removeEventListener('pointerup', birak)
      window.removeEventListener('pointercancel', birak)
    }
    window.addEventListener('pointermove', hareket)
    window.addEventListener('pointerup', birak)
    window.addEventListener('pointercancel', birak)
  }

  /*
   * Kayma uygulanmış dikiş. Fotoğrafın dışına çıkmıyor: dikişin orta noktası
   * fotoğrafın dikdörtgeninde kalmak zorunda (bkz. fotoSinir).
   */
  /*
   * TAŞIMA HER YÖNE SERBEST.
   *
   * Bir ara köşe işaretliyken yalnızca çizgi boyunca taşınabiliyordu; gerekçe
   * "ekran köşeden ayrılmasın" idi. Ama yana taşıma artık bozucu değil: köşe
   * bütün olarak sürekli dönüyor (bkz. icBukeyKose aci), yani ekran nereye
   * giderse açısı da oraya göre değişiyor. Kısıt gereksiz kalmış oluyor ve
   * kullanıcının tasarımı fotoğrafta gözüyle oturtmasını engelliyordu.
   *
   * Tek sınır fotoğrafın kendisi: dikişin orta noktası kadrajın dışına
   * çıkmıyor.
   */
  const lKaymayiUygula = (ust, alt) => {
    const k = lKoseKayma
    if (!k.x && !k.y) return [ust, alt]
    let dx = k.x
    let dy = k.y
    if (fotoSinir) {
      const ox = (ust.x + alt.x) / 2 + dx
      const oy = (ust.y + alt.y) / 2 + dy
      const kx = Math.max(fotoSinir.sol, Math.min(fotoSinir.sag, ox))
      const ky = Math.max(fotoSinir.ust, Math.min(fotoSinir.alt, oy))
      dx += kx - ox
      dy += ky - oy
    }
    return [
      { x: ust.x + dx, y: ust.y + dy },
      { x: alt.x + dx, y: alt.y + dy },
    ]
  }

  /*
   * DİKİŞTEN İKİ KANAT — iç bükey köşe, iki yolun ortak kurucusu.
   *
   * Hem işaretlenen köşe çizgisi hem de ölçü öncesi varsayılan köşe aynı
   * şeyi istiyor: elimizdeki dikiş parçasından iki kanat çıkarmak. Tek fark
   * dikişin nereden geldiği.
   *
   * İçerik tek bir şerit gibi düşünülüyor: önce sol kanadın dilimi, sonra
   * sağınki. Koyu çizilen kanat köşe seçimine göre değişiyor — sol köşede
   * yan kanat solda, sağ köşede sağda.
   */
  const lKanatlariKur = (ust, alt) => {
    if (!lEkran) return null
    /*
     * Kanat genişlikleri yapılandırmadan: sol kanat kaç kabinse o kadar
     * geniş. Kullanıcıya sorulmuyor, zaten girilmiş bir bilgi.
     */
    const solM = lEkran.solCols * cwM
    const sagM = lEkran.sagCols * cwM
    const boyM = lEkran.rows * chM
    /*
     * KAÇIŞ NOKTASI.
     *
     * Kanadın yukarı mı aşağı mı açılacağını belirleyen tek şey bu noktanın
     * YÜKSEKLİĞİ, yani göz hizası: ekranın göz hizasının üstünde kalan kısmı
     * öne gelirken yukarı, altında kalan kısmı aşağı açılır.
     *
     * Önce fotoğraftan ÖLÇÜLENİ deniyoruz (bkz. aciBul.js). Ama o ölçüm çoğu
     * karede çıkmıyor: oda karşıdan çekilmişse eğik çizgi kalmıyor ve yöntem
     * "yüzey karşıdan görünüyor" deyip boş dönüyor (örnek odalarda ölçüldü:
     * üç fotoğrafın ikisinde kaçış noktası yok, birinde güven 0,26).
     *
     * Ölçüm yoksa göz hizası İŞARETLENEN KÖŞE ÇİZGİSİNDEN çıkarılıyor
     * (lUfukY): çizgi zeminden tavana uzanıyor ve gerçek yüksekliği de
     * yazılmış durumda, kamera da tipik olarak yerden 1,5 metrede. Yatayda
     * ise kadrajın ortası kalıyor; oradaki doğru nokta kameranın asal
     * noktasıdır ve o da kadrajın ortasıdır.
     *
     * Beş örnek odada ölçüldü: gerçek ufka ortalama sapma, kadrajın ortası
     * kabul edilince %7,1; köşe çizgisinden hesaplanınca %5,2.
     */
    const olcum = ozelSahne?.aci
    const kacis =
      olcum?.kacis && olcum.guven >= 0.35
        ? oranTuvale(olcum.kacis)
        : { x: oranTuvale({ x: 0.5, y: 0.5 }).x, y: lUfukY ?? oranTuvale({ x: 0.5, y: 0.5 }).y }
    /*
     * KÖŞENİN AÇISI — dikişin kadrajdaki yerinden, sürekli.
     *
     * Köşeye hangi yönden bakıldığını dikişin kaçış noktasına olan yatay
     * uzaklığı söylüyor: tam üstündeyse karşıdan bakılıyor (açı 0, iki kanat
     * eşit), kenara gittikçe bir kanat duvara yatıp öteki kenarından
     * görünüyor. Kadrajın kenarında açı ±45 derece, yani bir kanat tam düz.
     *
     * Elle seçim varsa sabit: 'sol' sol kanadı kenara alıyor, 'sag' sağı,
     * 'orta' köşeyi tam karşıya.
     */
    const dikisX = (ust.x + alt.x) / 2
    const yariKadraj = Math.max(1, (fotoYer?.genislik || tuvalBoyut.w) / 2)
    /*
     * Sınır 35 derece (bkz. icBukeyKose): 45'te bir kanat kenarından
     * görünüp kayboluyor ve tasarım düz bir dikdörtgene dönüyor.
     */
    const EN_COK_KOSE_ACI = (35 * Math.PI) / 180
    const aci =
      lKose === 'orta'
        ? 0
        : lKoseSecim === 'sol'
          ? -EN_COK_KOSE_ACI
          : lKoseSecim === 'sag'
            ? EN_COK_KOSE_ACI
            : kacis
              ? Math.max(-1, Math.min(1, (dikisX - kacis.x) / yariKadraj)) * EN_COK_KOSE_ACI
              : 0
    /*
     * Hangi kanat YAN duvarda: mevcut sol/orta/sağ mantığı, değişmedi.
     * Elle seçim varsa o, yoksa dikişin kadrajdaki yeri karar veriyor.
     */
    const etkinKose =
      lKose === 'orta'
        ? 'orta'
        : (lKoseSecim ?? (kacis && dikisX > kacis.x ? 'sag' : 'sol'))
    const k = icBukeyKose({
      ust,
      alt,
      solM,
      sagM,
      boyM,
      mesafeM: izlemeMesafesi,
      aci,
      ufukY: kacis?.y ?? null,
      kose: etkinKose,
      /*
       * Kanatların duruşu artık KULLANICIDAN (bkz. lSolEgim). Fotoğraftan
       * kestirilen asal nokta / ufuk / odak girdileri kaldırıldı: bir
       * fotoğraf açı verir, uzunluk vermez ve o kestirim her karede
       * tutmuyordu.
       */
      solUstAci: lSolUst,
      solAltAci: lSolAlt,
      sagUstAci: lSagUst,
      sagAltAci: lSagAlt,
    })
    if (!k) return null
    const solPx = solM * k.pxPerM
    const sagPx = sagM * k.pxPerM
    const hPx = boyM * k.pxPerM
    const solKanat = { koseler: k.sol, wPx: solPx, hPx, kaydir: 0 }
    const sagKanat = { koseler: k.sag, wPx: sagPx, hPx, kaydir: solPx }
    /*
     * Koyu çizilen kanat daha çok DÖNEN olanı: köşeyi dönen yüz ışığı daha az
     * alır. Açı sürekli değiştiği için bu da kendiliğinden yer değiştiriyor,
     * tam karşıdan bakıldığında (iki kanat eşitken) sınırda kalıyor.
     */
    const yanSolda = k.donenSol
    return {
      on: yanSolda ? sagKanat : solKanat,
      yan: yanSolda ? solKanat : sagKanat,
      toplamWpx: solPx + sagPx,
    }
  }

  /*
   * FOTOĞRAFLI MEKÂNDA L KÖŞESİ.
   *
   * Çizilmiş iç mekânda köşe hazırdı. Kullanıcının kendi fotoğrafında ise
   * çizim yok; elimizde ölçülmüş bir DÜZLEM var. Ama o düzlemin duruşu
   * çıkarılabiliyor, dolayısıyla ikinci kanat tahmin değil: ön kanadı dikiş
   * kenarından 90 derece katlamak (bkz. lKoseYanKanat).
   *
   * Ön kanat tasarımın durduğu yerde başlıyor; yan kanat oradan köşeyi dönüyor.
   * Seçilen köşe kameraya sırtını dönmüşse yan kanat çizilmiyor — o açıdan o
   * köşe gerçekten görünmez, uydurmak yanlış olurdu.
   */
  /*
   * KANAT ŞEKLİ TUŞLARI — tek yerde kurulup iki yerde çiziliyor:
   * sihirbazın son adımında ve akış bittikten sonra özet kartında.
   *
   * ARTI = O KENARIN UZAK UCU AŞAĞI, iki kanatta da aynı (işaret çevirme
   * geometride, bkz. lKose.js sekilVer). İç bükey köşede üst eksi, alt artı
   * olur: köşe en uzak nokta, duvar boyunca uzaklaşıldıkça kanat açılır.
   */
  /*
   * ───────────────────────────────────────────────────────────────────────
   * ÖLÇÜ SİHİRBAZI FOTOĞRAFLI MEKÂNDA POP-UP.
   *
   * Panelin içinde, öteki ayarların arasında duruyordu; arka plan yüklenince
   * yapılacak İLK ve TEK iş ölçüyü kurmak olduğu halde göze çarpmıyordu.
   * Artık öne çıkan bir pencere.
   *
   * PERDESİ YOK ve sağ tarafa yaslı: adımların çoğu TUVALE tıklamakla
   * ilerliyor (referansın iki ucu, alanın dört köşesi). Arka planı kapatan
   * bir kalıp pencere tam da yapılması gereken işi engellerdi.
   *
   * Öteki mekânlarda (hazır sahneler) eskisi gibi panelin içinde duruyor —
   * orada akış zaten farklı ve yerinde çalışıyor.
   */
  /*
   * SİHİRBAZ PANELİN KENDİSİNDE — ayrı bir pencere değil.
   *
   * Kendi fotoğrafında kart tuvalin üstünde yüzen bir pencereydi; fotoğrafın
   * bir kısmını kapatıyor ve panelde ayrıca boşluk bırakıyordu. Artık sağ
   * panelin içinde, öteki mekânlarda olduğu gibi. Açıkken panelin ölçüyle
   * ilgisi olmayan bölümleri gizleniyor (bkz. olcuAcik), yani kart yerini
   * onlardan alıyor ve ekranda iki iş birbirine karışmıyor.
   */
  const olcuPencereSinifi = ''

  /*
   * GRUBUN DÖRTGENLERİ — liderden türetiliyor.
   *
   * Lider düzenlenmekte olan ekransa onun o anki dörtgeni, değilse kaydı
   * kullanılıyor. Üyelerin gerçek ölçüsü kendi dizilimlerinden geliyor.
   */
  const grupKoseleri = (() => {
    if (!grup || !Array.isArray(grup.uyeler) || grup.uyeler.length < 2) return null
    /*
     * FOTOĞRAFTA TÜRETME YOK.
     *
     * Birleşim tipi (L, U, açılı, içe/dışa) fotoğraftaki şekle hiç
     * karışmıyor: her ekranın yeri ve şekli YALNIZCA kullanıcının
     * tıkladığı dört köşeden geliyor. Türetme açık kaldığında iki ekran
     * tek bir dev eşkenar dörtgene dönüşüyor, yerleştirilmemiş olan da
     * tavana doğru yamuluyordu.
     *
     * Birleşimin fotoğraftaki tek etkisi GÖRSEL: "Tek görsel" seçiliyse
     * resim ekranlara gerçek genişlikleri oranında bölünüyor
     * (bkz. icerikBolme).
     */
    if (scene === 'ozel') return null
    if (!(fotoYer?.genislik > 0)) return null
    const odak =
      fotoOdak > 1
        ? fotoOdak
        : exifOdak > 1
          ? exifOdak
          : fotoYer.genislik * (sahneYakinlik || 1) * 0.785
    if (!(odak > 1)) return null
    const kayitlar = new Map(sabitEkranlar.map((e) => [e.id, e]))
    const liderId = grup.uyeler[0]
    const liderKose =
      liderId === aktifEkranId
        ? koseMutlak
        : kayitlar.get(liderId)?.oran?.map(oranTuvale)
    if (!Array.isArray(liderKose) || liderKose.length !== 4) return null
    const kabinOlcu = (id) => {
      const a = id === aktifEkranId ? ekranAyariAnlik() : kayitlar.get(id)?.ayar
      if (!a) return null
      const m = selectedModel || previewModel
      if (!m) return null
      const dikey = a.orientation === 'portrait'
      const kw = ((dikey ? m.heightMm : m.widthMm) || 500) / 10
      const kh = ((dikey ? m.widthMm : m.heightMm) || 500) / 10
      return { enCm: Math.max(1, a.cols || 1) * kw, boyCm: Math.max(1, a.rows || 1) * kh }
    }
    const olculer = grup.uyeler.map(kabinOlcu)
    if (olculer.some((o) => !o)) return null
    /*
     * KÖŞE YÖNÜ KIRIMIN İŞARETİ.
     * İçe (oda köşesi) ile dışa (kolon köşesi) aynı açının iki yönü;
     * zincir hep aynı yöne kırılınca ikisi aynı çıkıyordu.
     */
    const hamAci = grup.tip === 'duz' ? 0 : grup.tip === 'acili' ? grup.aci || 135 : 90
    const aci = hamAci === 0 ? 0 : grup.lYon === 'disa' ? 360 - hamAci : hamAci
    const acilar = grup.uyeler.slice(1).map(() => aci)
    const dortgenler = grupDortgenleri(
      liderKose,
      oranTuvale({ x: 0.5, y: 0.5 }),
      odak,
      olculer,
      acilar,
    )
    if (!dortgenler) return null
    const harita = new Map()
    grup.uyeler.forEach((id, i) => harita.set(id, dortgenler[i]))
    return harita
  })()

  /*
   * DÜZENLENMEKTE OLAN ÜYE DE GRUPTAN GELİYOR.
   *
   * Sabit ekranlar grup dörtgeniyle çiziliyordu ama elde duran ekran kendi
   * yerinde kalıyordu: grup yarım görünüyordu. Lider kendi yerinde duruyor
   * (grup ondan türüyor); öteki üyeler hesaplanan dörtgene oturuyor.
   *
   * Bağımlılık dörtgenin İMZASI: grupKoseleri her çizimde yeni bir Map
   * olduğu için onu doğrudan bağımlılığa koymak sonsuz döngü olurdu.
   */
  const aktifGrupKose =
    grupKoseleri && aktifEkranId && grup?.uyeler?.[0] !== aktifEkranId
      ? grupKoseleri.get(aktifEkranId) || null
      : null
  const aktifGrupImza = aktifGrupKose
    ? aktifGrupKose.map((k) => Math.round(k.x) + ',' + Math.round(k.y)).join('|')
    : ''
  useEffect(() => {
    if (!aktifGrupKose) return
    elleKoseyeYaz(aktifGrupKose)
    /* İmza değişince yazılıyor; dörtgenin kendisi bağımlılıkta olamaz. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktifGrupImza])

  /*
   * BÖLÜNMÜŞ İÇERİK — hangi ekrana içeriğin hangi dilimi düşüyor.
   *
   * Aynı içeriği "Bölünmüş" seçen ekranlar bir küme oluşturuyor; içerik o
   * kümenin TAMAMINA tek parça seriliyor. Kim hangi dilimi gösterecek,
   * ekranların fotoğraftaki dizilişinden ve gerçek cm ölçülerinden
   * hesaplanıyor (bkz. icerikBolme.js).
   *
   * İçeriğin kimliği (content, contentUrl) ikilisi: aynı havuz öğesini
   * seçen ekranlar aynı adresi taşıyor, dolayısıyla ayrıca bir kimlik
   * saklamaya gerek kalmıyor.
   *
   * Tek başına kalan ekran bölünmez — bölecek kimse yok, içeriğin tamamını
   * gösteriyor. Bu yüzden iki kişiden az küme atlanıyor.
   */

  /*
   * SEÇİM: elde duran ekran her zaman dahil.
   *
   * Kullanıcı zaten onu düzenliyor; "şu an üzerinde çalıştığım ekranla
   * şunu paylaştır" doğal okunuş. Ayrıca elde duran ekran EkEkranlar'da
   * çizilmediği için Shift ile tıklanamıyor; dışarıda bırakmak iki
   * ekranı paylaştırmayı imkânsız kılardı.
   */
  const secilenEkranlar = secimKumesi.length
    ? [...new Set([aktifEkranId, ...secimKumesi].filter(Boolean))]
    : []

  /* Seçilen ekranlar ortak görselli bir küme oluyor. */
  const secimiPaylastir = () => {
    if (secilenEkranlar.length < 2) return
    setIcerikGruplari((l) => [
      ...l.filter((k) => !k.some((x) => secilenEkranlar.includes(x))),
      secilenEkranlar,
    ])
    setSecimKumesi([])
    havuzInputRef.current?.click()
  }

  /*
   * İPUCU BİR KEZ.
   * Çoklu seçim görünmez bir özellik; ilk tıklamada bir kez söyleniyor,
   * birkaç saniye sonra kendiliğinden kalkıyor ve bir daha çıkmıyor.
   */
  const ipucunuGoster = () => {
    try {
      if (localStorage.getItem('vds.shiftIpucu')) return
      localStorage.setItem('vds.shiftIpucu', '1')
    } catch {
      /* Depolama kapalıysa ipucu her açılışta bir kez çıkar; zararsız. */
    }
    setShiftIpucu(true)
    setTimeout(() => setShiftIpucu(false), 5000)
  }

  /*
   * PAYLAŞIMDAKİ EKRANLAR AYNI GÖRSELİ TAŞIR.
   *
   * Tek resmin dilimleri ancak hepsi aynı adresi gösterdiğinde
   * hesaplanabiliyor. Elde duran ekranın içeriği değiştiğinde (havuzdan
   * seçim, yükleme, sürükle-bırak) kümedeki ötekilere de yazılıyor.
   * Değişiklik yoksa liste OLDUĞU GİBİ dönüyor: her render yeni bir dizi
   * üretmek sonsuz döngü olurdu.
   */
  useEffect(() => {
    const kume = paylasimKumesi(aktifEkranId)
    if (!kume) return
    /*
     * BOŞ İÇERİK KÜMEYE YAZILMIYOR.
     *
     * Yeni eklenen ekran "LED EKRAN" (boş) ile doğuyor ve elde duran
     * ekran o oluyor; bu etki o boşluğu kümenin tamamına yazınca
     * 1. ekrana konulmuş görsel siliniyordu. Paylaşım yalnızca
     * GERÇEK bir içerik verildiğinde yayılıyor; boş ekran kümenin
     * görselini zaten gösteriyor (bkz. ekranParcalari).
     */
    if (content === 'led' || content === 'none') return
    setSabitEkranlar((l) => {
      let degisti = false
      const yeni = l.map((e) => {
        if (!kume.includes(e.id)) return e
        const a = e.ayar || {}
        if (a.content === content && (a.contentUrl || null) === (contentUrl || null)) return e
        degisti = true
        return { ...e, ayar: { ...a, content, contentUrl: contentUrl || null } }
      })
      return degisti ? yeni : l
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, contentUrl, aktifEkranId, icerikGruplari, grup])

  /*
   * İKİ EKRAN VARSA İKİSİ DE İŞARETLİ.
   * Tek olasılık zaten o; kullanıcıdan iki kutucuğu ayrıca işaretlemesini
   * istemek boş bir adım. Daha çok ekran varken seçim kullanıcıya kalıyor.
   */
  useEffect(() => {
    if (grupSecim.length || grup) return
    const hepsi = [...sabitEkranlar.map((e) => e.id), aktifEkranId].filter(Boolean)
    if (hepsi.length === 2) setGrupSecim(hepsi)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sabitEkranlar, aktifEkranId])

  const bolunmusDilimler = (() => {
    const m = selectedModel || previewModel
    if (!m) return null
    const kabinOlcusu = (a) => {
      const dikey = a.orientation === 'portrait'
      const kw = ((dikey ? m.heightMm : m.widthMm) || 500) / 10
      const kh = ((dikey ? m.widthMm : m.heightMm) || 500) / 10
      return { enCm: Math.max(1, a.cols || 1) * kw, boyCm: Math.max(1, a.rows || 1) * kh }
    }
    /*
     * ADAYLAR: paylaşım kümesindeki ekranlar. Eskiden ölçüt "aynı içeriği
     * seçmiş ve Bölünmüş işaretlenmiş olmak"tı; kullanıcı iki işi birden
     * doğru yapmak zorundaydı.
     */
    const adaylar = []
    for (const e of sabitEkranlar) {
      const kume = paylasimKumesi(e.id)
      if (!kume) continue
      /* Birleşmiş gruptaki ekran kendi kaydında değil, türetilmiş yerinde. */
      const k = grupKoseleri?.get(e.id) || e.oran?.map(oranTuvale)
      adaylar.push({
        id: e.id,
        koseler: Array.isArray(k) && k.length === 4 ? k : null,
        ...kabinOlcusu(e.ayar || {}),
        anahtar: kume.join(','),
      })
    }
    /*
     * YERİ BELLİ OLMAYAN EKRAN DA HESABA GİRİYOR — ama yalnızca
     * "bölmeye katılamıyor" damgasıyla. Dışarıda bırakılınca içeriğin
     * TAMAMINI çiziyor ve görsel tekrarlanmış gibi görünüyordu.
     */
    if (aktifEkranId && paylasimKumesi(aktifEkranId)) {
      const yerli = Array.isArray(koseMutlak) && koseMutlak.length === 4
      adaylar.push({
        id: aktifEkranId,
        koseler: yerli ? aktifGrupKose || koseMutlak : null,
        ...kabinOlcusu(ekranAyariAnlik()),
        anahtar: paylasimKumesi(aktifEkranId).join(','),
      })
    }
    if (adaylar.length < 2) return null
    const kumeler = new Map()
    for (const a of adaylar) {
      if (!kumeler.has(a.anahtar)) kumeler.set(a.anahtar, [])
      kumeler.get(a.anahtar).push(a)
    }
    const harita = new Map()
    for (const liste of kumeler.values()) {
      if (liste.length < 2) continue
      const yerli = liste.filter((x) => x.koseler)
      /* Bölünecek bir şey olması için en az iki YERLEŞMİŞ ekran gerekiyor. */
      if (yerli.length < 2) continue
      const d = bolmeDilimleri(yerli)
      if (!d) continue
      for (const [id, v] of d) harita.set(id, v)
      /*
       * Aynı içeriği bölünmüş seçmiş ama yeri henüz belli olmayan ekran:
       * içerik çizmiyor. Tamamını çizerse görsel tekrarlanmış görünüyor.
       */
      for (const x of liste) if (!x.koseler) harita.set(x.id, { bos: true })
    }
    return harita.size ? harita : null
  })()

  /*
   * PAYLAŞIM NOTU — görsel bu ekrana nereden geliyor.
   * Birleşik grupta görsel birleşimin; ortak görselli kümede ekranların
   * kendi aralarında kurdukları bir bağ, o yüzden ayrılabiliyor.
   */
  const paylasimNotu = (id) => {
    const kume = paylasimKumesi(id)
    if (!kume) return null
    const grupta = grup?.uyeler && kume === grup.uyeler
    if (grupta) return { metin: t('icerik.grupGorseli'), ayrilabilir: false }
    const siralar = kume
      .map((x) => ekranOzetleri.find((o) => o.id === x)?.sira)
      .filter(Boolean)
      .join(', ')
    return { metin: t('icerik.ortak') + ' (' + siralar + ')', ayrilabilir: true }
  }

  /* Ortak görsel kümesini bozar; ekranlar görseli kendi tamamında gösterir. */
  const icerikGrubunuAyir = (id) => setIcerikGruplari((l) => l.filter((k) => !k.includes(id)))

  /* Metre yazımı: "2,88". Panelde ve özet satırında aynı biçim. */
  const mYazi = (v) => (v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  /*
   * AKORDEON SATIRLARI — ekran başına tek özet kaydı.
   *
   * Açık satır ELDE DURAN ekran: ayarları global durumda (ekranAyariAnlik).
   * Kapalı satırlar kayıtlı ekranlardan okunuyor. İkisi tek listede
   * birleşiyor ki panel, Teknik Özellikler ve PDF aynı kaynaktan beslensin.
   *
   * Kabin ölçüsü ekranın KENDİ yönünden türüyor: previewModel yalnızca elde
   * duran ekranın yönüne göre takla attığı için kapalı satırlarda yanlış
   * ölçü veriyordu (6×6 + 8×6 tasarımda toplam "1 birim" görünmesinin
   * sebebi buydu).
   */
  const ekranOzetleri = [
    ...sabitEkranlar.map((e, i) => ({
      id: e.id,
      sira: e.sira || i + 1,
      acik: false,
      ayar: e.ayar || {},
    })),
    { id: aktifEkranId, sira: aktifSira, acik: true, ayar: ekranAyariAnlik() },
  ]
    .sort((a, b) => (a.sira || 0) - (b.sira || 0))
    .map((r) => {
      /*
       * Kabin ölçüsü ekranın KENDİ yönünden: previewModel yalnızca elde
       * duran ekranın yönüne göre takla atıyor, öbür satırlarda yanlış
       * ölçü veriyordu.
       */
      const m = selectedModel
      const dikey = r.ayar.orientation === 'portrait'
      const ekranModeli =
        m && dikey
          ? { ...m, widthMm: m.heightMm, heightMm: m.widthMm, pixelWidth: m.pixelHeight, pixelHeight: m.pixelWidth }
          : m
      const sut = Math.max(1, r.ayar.cols || 1)
      const sat = Math.max(1, r.ayar.rows || 1)
      /* Ağırlık, güç, ısı ve çözünürlük panelde, pencerede ve PDF'te aynı
         formülden gelsin diye computeSpecs kullanılıyor. */
      const spec = ekranModeli ? computeSpecs(ekranModeli, sut, sat) : null
      return {
        ...r,
        spec,
        kabin: sut * sat,
        enM: spec?.W || 0,
        boyM: spec?.H || 0,
        resW: spec?.resW || 0,
        resH: spec?.resH || 0,
        /* İçeriği olmayan eski kayıt elde duran ekranın içeriğini gösteriyor. */
        /*
         * KÜÇÜK RESİM, EKRANIN GERÇEKTEN GÖSTERDİĞİ İÇERİK.
         *
         * Kutucuk ekranın KENDİ kaydındaki içeriği gösteriyordu; "Tek
         * görsel" açıkken ekran kümenin görselini gösterdiği hâlde
         * kutucukta siyah (LED) duruyordu. Çizimle kutucuk aynı kaynaktan
         * okuyor: ekranParcalari paylaşım kümesini zaten çözüyor.
         */
        havuzId: (() => {
          const parca = ekranParcalari.find((x) => x.id === r.id)
          const ic = parca?.content ?? (r.ayar.content || content)
          const url = parca ? parca.contentUrl : r.ayar.content ? r.ayar.contentUrl : contentUrl
          return icerikKimligi(ic, url)
        })(),
        /* Bölünmüşse küçük resim o ekranın KENDİ dilimini göstersin. */
        dilim: paylasimKumesi(r.id) ? bolunmusDilimler?.get(r.id) || null : null,
      }
    })

  /*
   * DÜZENLENECEK ALAN ancak fotoğrafta ve ölçü kurulduktan sonra var.
   * Fotoğrafsız sahnede "Alana sığdır" duvar ölçüsüne sığdırıyor,
   * "Alanı düzenle" ise hiç görünmüyor.
   */
  const alanDuzenlenebilir = scene === 'ozel' && !!koseMutlak
  /*
   * İŞARETLENMİŞ ALAN — "Alana sığdır" ancak bu varken bir iş yapıyor.
   * Serbest yerleştirmede alan yok; tasarım doğrudan taşınıyor.
   */
  const alanIsaretli = scene === 'ozel' && Array.isArray(alanNokta) && alanNokta.length === 4


  /*
   * TASARIMIN TOPLAMI — ekranlar yan yana duruyor kabulüyle.
   * Panel, Teknik Özellikler ve PDF bu tek kaynaktan okuyor.
   */
  const tasarimToplami = ekranOzetleri.reduce(
    (t, e) => ({
      kabin: t.kabin + e.kabin,
      resW: t.resW + e.resW,
      resH: Math.max(t.resH, e.resH),
      alan: t.alan + (e.spec?.area || 0),
      agirlik: t.agirlik + (e.spec?.weight || 0),
      gucMax: t.gucMax + (e.spec?.pMax || 0),
      gucTip: t.gucTip + (e.spec?.pTyp || 0),
    }),
    { kabin: 0, resW: 0, resH: 0, alan: 0, agirlik: 0, gucMax: 0, gucTip: 0 },
  )

  /*
   * RAPOR SATIRLARI — Teknik Özellikler, PDF ve tablo bunu okuyor.
   * Ölçüler burada hesaplanmış hâlde gidiyor; alıcı taraf modelden yeniden
   * türetmeye kalkarsa her ekranın kendi yönünü kaybeder.
   */
  const raporEkranlari = ekranOzetleri.map((e) => ({
    sira: e.sira,
    cols: e.ayar.cols || 1,
    rows: e.ayar.rows || 1,
    type: e.ayar.screenType || 'flat',
    orientation: e.ayar.orientation || 'landscape',
    adet: e.kabin,
    wm: e.enM,
    hm: e.boyM,
    resW: e.resW,
    resH: e.resH,
    agirlik: e.spec?.weight || 0,
    gucMax: e.spec?.pMax || 0,
    icerik: icerikHavuzuTam.find((x) => x.id === e.havuzId)?.ad || '',
    bolunmus: !!paylasimKumesi(e.id),
  }))


  /* Ölçü akışı açık mı: panelde yalnızca onun işi görünsün. */
  const olcuAcik = sihirbazAdim > 0 || alanKipi

  /*
   * Ölçüm akışı kapanınca yakınlaştırma da kalkıyor.
   *
   * Yakınlaştırma yalnızca işaretlerken açılabiliyor ama açık kalırsa
   * sonraki araçlar (köşelerden ayarla, taşıma) ölçeksiz koordinat
   * beklediği için fareyi yanlış yere düşürüyordu.
   */
  useEffect(() => {
    if (olcuAcik) return
    setIsaretZoom(1)
    setIsaretKay({ x: 0, y: 0 })
  }, [olcuAcik])

  /*
   * ALANIN KÖŞELERİ DÜZENLEME SIRASINDA TUTAMAKLI.
   *
   * İşaretleme bitince dört nokta kayboluyor, geriye yalnızca kesik çizgi
   * kalıyordu: köşeyi birkaç piksel düzeltmek isteyen kullanıcı alanı
   * BAŞTAN işaretlemek zorundaydı. Düzenleme açıkken noktalar yerinde
   * duruyor ve sürüklenebiliyor; ölçü de kendiliğinden yeniden hesaplanıyor
   * çünkü bütün hesap bu dört noktadan türüyor.
   *
   * Yeni nokta EKLENMİYOR: kontenjan dolu (bkz. ReferansSecici), katmanın
   * saydam kısmı da fareyi bırakıyor, dolayısıyla tasarım yine
   * sürüklenebiliyor.
   */
  /*
   * ALANIN TUTAMAKLARI KENDİLİĞİNDEN AÇILMIYOR.
   *
   * Alan onaylandıktan sonra kenar çizgileri ve tutamakları tuvalde
   * duruyordu: tasarım da çizildiği için ekranda aynı anda hem ölçü
   * araçları hem ürün vardı ve hangisinin ne olduğu karışıyordu.
   *
   * Artık araçlar yalnızca DÜZENLE denince açılıyor (bkz. alaniDuzenle);
   * açıkken tasarım gizleniyor, kapanınca geri geliyor.
   */
  const alanTutamaklari = false


  const lSekilPaneli = (
    <div className="mt-2">
      <div className="text-[14px] font-semibold text-neutral-700 dark:text-neutral-200">
        {t('screen.lSekilBaslik')}
      </div>
      <p className="mt-0.5 mb-0 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
        {t('screen.lSekilIpucu')}
      </p>
      {[
        { ad: 'screen.lEgimSol', ustAci: lSolUst, setUst: setLSolUst, altAci: lSolAlt, setAlt: setLSolAlt },
        { ad: 'screen.lEgimSag', ustAci: lSagUst, setUst: setLSagUst, altAci: lSagAlt, setAlt: setLSagAlt },
      ].map(({ ad, ustAci, setUst, altAci, setAlt }) => {
        const oynat = (ayarla, isaret) =>
          ayarla((v) => Math.max(-EGIM_SINIR, Math.min(EGIM_SINIR, v + isaret * EGIM_ADIM)))
        const satir = (etiket, deger, yukari, asagi, yukariYol, asagiYol) => (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="w-11 text-[14px] text-neutral-500 dark:text-neutral-400">{etiket}</span>
            <span className="w-12 text-right text-[15px] font-semibold tabular-nums text-neutral-800 dark:text-neutral-100">
              {deger != null ? (deger > 0 ? '+' : '') + deger + '°' : ''}
            </span>
            <div className="ml-auto flex gap-1.5">
              <SekilTus onClick={yukari} etiket={`${t(ad)} ${etiket} — ${t('screen.lSekilYukari')}`} yol={yukariYol} />
              <SekilTus onClick={asagi} etiket={`${t(ad)} ${etiket} — ${t('screen.lSekilAsagi')}`} yol={asagiYol} />
            </div>
          </div>
        )
        return (
          <div
            key={ad}
            className="mt-1.5 rounded-xl border border-neutral-200 dark:border-[#2c333f] px-2.5 pt-2 pb-2.5"
          >
            <div className="text-[14px] font-semibold text-neutral-800 dark:text-neutral-100">{t(ad)}</div>
            {satir(t('screen.lKenarUst'), ustAci, () => oynat(setUst, -1), () => oynat(setUst, 1), OK_YUKARI, OK_ASAGI)}
            {satir(t('screen.lKenarAlt'), altAci, () => oynat(setAlt, -1), () => oynat(setAlt, 1), OK_YUKARI, OK_ASAGI)}
            {satir(
              t('screen.lKenarIkisi'),
              null,
              () => {
                oynat(setUst, -1)
                oynat(setAlt, -1)
              },
              () => {
                oynat(setUst, 1)
                oynat(setAlt, 1)
              },
              ISARET_ARTI,
              ISARET_EKSI,
            )}
          </div>
        )
      })}
      <div className="mt-1.5 flex gap-1.5">
        <button
          type="button"
          onClick={() => setLTasimaSerbest((a) => !a)}
          className={`flex-1 py-2 rounded-lg text-[13.5px] font-medium border transition-colors ${
            lTasimaSerbest
              ? 'border-brand text-brand'
              : 'border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand'
          }`}
        >
          {t(lTasimaSerbest ? 'screen.lTasimaSerbest' : 'screen.lTasimaKose')}
        </button>
        <button
          type="button"
          disabled={!lSolUst && !lSolAlt && !lSagUst && !lSagAlt}
          onClick={() => {
            setLSolUst(0)
            setLSolAlt(0)
            setLSagUst(0)
            setLSagAlt(0)
          }}
          className="flex-1 py-2 rounded-lg text-[13.5px] font-medium border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 enabled:hover:border-brand enabled:hover:text-brand disabled:opacity-40 transition-colors"
        >
          {t('screen.lEgimSifirla')}
        </button>
      </div>
    </div>
  )

  /* Ekran türü ya da mekân değişince kamera otomatik açıya dönüyor. */
  useEffect(() => {
    setLKacis(null)
  }, [screenType, scene, lKose, cokluAktif])

  const lKoseFotoGeo = (() => {
    if (!lEkran) return null
    if (!duvarDunya || !(duvarDunyaOlcu?.wm > 0) || !refPxCm) return null
    if (!(cizimOlcek > 0) || !(tuvalBoyut.w > 0)) return null
    /* Kanatlar yapılandırmadan (bkz. lEkran): dikişin yeri de buna göre. */
    const solM = lEkran.solCols * cwM
    const sagM = lEkran.sagCols * cwM
    const tamM = solM + sagM
    const boyM = lEkran.rows * chM
    if (!(tamM > 0) || !(boyM > 0)) return null
    /* Ekranın duvardaki yeri: kullanıcı taşıdıysa oradan, yoksa ortalanmış. */
    const yer = ekranDunyaRef.current || {
      x: (duvarDunyaOlcu.wm - tamM) / 2,
      y: (duvarDunyaOlcu.hm - boyM) / 2,
    }
    /*
     * DUVAR YALNIZCA DİKİŞİN YERİNİ VERİYOR.
     *
     * Ölçülmüş düzlem ekranın duvarda nerede durduğunu ve o noktadaki
     * perspektifi biliyor; kırımın kendisi ise bir KÖŞE davranışı ve onu
     * ortak kurucu açıyor (bkz. icBukeyKose). Böylece ölçülmüş duvarla,
     * işaretlenmiş köşe çizgisiyle ve ölçü öncesi varsayılanla kurulan köşe
     * birbirinin aynısı görünüyor — üçü de içe dönük.
     */
    const q = dunyaDortgeni(duvarDunya, yer.x, yer.y, tamM, boyM)
    if (!q) return null
    const t = solM / tamM
    const ara = (a, b) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
    return lKanatlariKur(ara(q[0], q[1]), ara(q[3], q[2]))
  })()


  /*
   * L KÖŞESİ İŞARETLENEN ÇİZGİDEN.
   *
   * Ölçülmüş düzlemden türeyen yol (lKoseFotoGeo) ekranı duvarın üstünde bir
   * yere koyuyor ve köşeyi oradan katlıyor; köşenin fotoğrafta NEREDE olduğunu
   * bilmiyor. Burada kullanıcı onu doğrudan gösteriyor.
   *
   * Hesap şöyle yürüyor:
   *  • Çizginin kendisi ölçek veriyor: işaretlenen uzunluk, yazılan santime
   *    bölününce o derinlikte 1 cm kaç piksel ediyor çıkıyor. Referanstan
   *    gelen ölçek uzaktaki bir yüzeye ait olabilir; köşedeki ölçek daha
   *    doğrudur.
   *  • Çizginin eğimi dikişin eğimini veriyor (roll): dünyada dik duran bir
   *    kenar fotoğrafta bu kadar yatıyor.
   *  • Gövde her zamanki iğnedelik kamerayla kuruluyor (kutuGovdesi), yani
   *    iki kanadın birbirine oranı ve perspektifi doğru.
   *  • Son adımda kutunun DİKİŞ kenarı, işaretlenen çizginin ortasındaki
   *    hedef parçaya bir benzerlik dönüşümüyle birebir oturtuluyor. Böylece
   *    kullanıcının gösterdiği yer ile ekranın kırıldığı yer aynı oluyor —
   *    yaklaşık değil, tam.
   *
   * Uydurulan tek şey kanatların açılma açısı: fotoğraf onu söylemiyor.
   * Köşeye karşıdan bakmak varsayılıyor (her kanat 45°).
   */

  /*
   * KÖŞEDEN ÇIKAN ÖLÇEK.
   *
   * İşaretlenen çizginin fotoğraf pikseli, yazılan santime bölününce o
   * derinlikte 1 cm kaç piksel ediyor çıkıyor. Ayrı bir referans adımına
   * gerek bırakmayan şey bu: köşe hem YERİ hem ÖLÇEĞİ veriyor. Üstelik
   * ölçek tam köşenin bulunduğu derinlikte ölçülmüş oluyor — uzaktaki bir
   * yüzeyden alınan referanstan daha doğru.
   */
  const lKoseOlcek = (() => {
    if (lKoseNokta.length !== 2 || !(ozelSahne?.kaynak?.w > 0)) return null
    const koseBoyCm = Number(String(lKoseBoyCm).replace(',', '.'))
    if (!(koseBoyCm > 0)) return null
    const a = lKoseNokta[0]
    const b = lKoseNokta[1]
    const px = Math.hypot((b.x - a.x) * ozelSahne.kaynak.w, (b.y - a.y) * ozelSahne.kaynak.h)
    if (!(px > 1)) return null
    return { px, cm: koseBoyCm, pxCm: px / koseBoyCm }
  })()

  /*
   * İŞARETLENEN ÇİZGİ DİK Mİ.
   *
   * Köşe fotoğrafta dikey bir kenardır. Kullanıcı yanlışlıkla duvar boyunca
   * iki nokta koyarsa (yatay bir çizgi) ortaya anlamlı bir köşe çıkmıyor;
   * sihirbaz bunu söylüyor ve devam ettirmiyor.
   */
  const lKoseDikMi = (() => {
    if (lKoseNokta.length !== 2) return true
    const a = oranTuvale(lKoseNokta[0])
    const b = oranTuvale(lKoseNokta[1])
    const u = Math.hypot(b.x - a.x, b.y - a.y)
    if (!(u > 2)) return false
    return Math.abs(b.y - a.y) >= u * 0.5
  })()

  /* Sihirbazda yazılan ölçünün yanında duran karşılaştırma. */
  const lKabinGenislik = (() => {
    if (!lEkran) return { sol: 0, sag: 0 }
    return { sol: lEkran.solCols * cwM * 100, sag: lEkran.sagCols * cwM * 100 }
  })()

  /* Sihirbazdaki canlı kontrol: ekranın boyu köşenin yüzde kaçı. */
  const lKoseOran = (() => {
    if (!lEkran || lKoseNokta.length !== 2) return 0
    const koseBoyCm = Number(String(lKoseBoyCm).replace(',', '.'))
    if (!(koseBoyCm > 0)) return 0
    const boyCm = lEkran.rows * chM * 100
    return boyCm > 0 ? boyCm / koseBoyCm : 0
  })()

  const lKoseCizgiGeo = (() => {
    if (!lEkran || scene !== 'ozel' || !ozelSahne) return null
    if (lKoseNokta.length !== 2) return null
    const kaynak = ozelSahne.kaynak
    if (!(kaynak?.w > 0) || !(kaynak?.h > 0) || !(tuvalBoyut.w > 0)) return null
    const koseBoyCm = Number(String(lKoseBoyCm).replace(',', '.'))
    if (!(koseBoyCm > 0)) return null

    /* İşaretlenen çizgi, tuval pikselinde. */
    const a = oranTuvale(lKoseNokta[0])
    const b = oranTuvale(lKoseNokta[1])
    if (!(Math.hypot(b.x - a.x, b.y - a.y) > 4)) return null
    /* Kullanıcı hangi ucu önce koyarsa koysun: üstteki üst sayılıyor. */
    const cUst = a.y <= b.y ? a : b
    const cAlt = a.y <= b.y ? b : a

    /*
     * DİKİŞ ÇİZGİNİN ORTASINDA.
     *
     * İşaretlenen çizgi köşenin TAMAMI (örneğin tavandan zemine); ekran onun
     * bir parçası. Oran iki yazılı ölçüden geliyor, tahmin yok.
     */
    const boyCm = lEkran.rows * chM * 100
    const oran = boyCm / koseBoyCm
    const ortaX = (cUst.x + cAlt.x) / 2
    const ortaY = (cUst.y + cAlt.y) / 2
    const yariX = ((cAlt.x - cUst.x) / 2) * oran
    const yariY = ((cAlt.y - cUst.y) / 2) * oran
    return lKanatlariKur(
      ...lKaymayiUygula(
        { x: ortaX - yariX, y: ortaY - yariY },
        { x: ortaX + yariX, y: ortaY + yariY },
      ),
    )
  })()

  /*
   * ÖLÇÜ YAPILMADAN ÖNCEKİ KÖŞE — kullanıcının kendi fotoğrafında.
   *
   * L bir KÖŞE ürünü; fotoğraf eklenir eklenmez düz bir dikdörtgen olarak
   * görünmesi yanlış. Ama o anda köşeyi kuracak hiçbir ölçü yok: duvarın
   * düzlemi ölçülmemiş (lKoseFotoGeo), köşe çizgisi de işaretlenmemiş
   * (lKoseCizgiGeo). Bu yüzden köşe MEKÂNDAN değil ÜRÜNÜN KENDİ DURUŞUNDAN
   * kuruluyor: ekran hafifçe çevrilmiş duruyor ve ikinci kanat o duruşun
   * 90 derece katlanmış yüzü.
   *
   * Hesap yine aynı iğnedelik kamera (kutuGovdesi), yani iki kanadın
   * birbirine oranı ve perspektifi doğru. Uydurulan tek şey ekranın mekâna
   * göre açısı — fotoğraf onu söylemiyor, söyleyemez de. Kullanıcı köşe
   * çizgisini işaretleyince bu yol susuyor ve yerini ölçülmüş köşeye
   * bırakıyor.
   *
   * Hazır fotoğraflı mekânlarda (AVM, meydan) gerekmiyor: orada duvarın
   * dikdörtgeni ölçülü, köşe lKoseGeo'dan geliyor.
   */
  const lKoseHamGeo = (() => {
    if (!lEkran || scene !== 'ozel' || !ozelSahne) return null
    if (lKoseCizgiGeo || lKoseGeo || lKoseFotoGeo) return null
    if (!(cizimOlcek > 0) || !(tuvalBoyut.w > 0) || !(tuvalBoyut.h > 0)) return null
    const hPx = lEkran.rows * chM * cizimOlcek
    if (!(hPx > 2)) return null
    /* Dikiş önerilen yerleşim alanının ortasında, dik. */
    const cx = fotoYer?.merkezXpx > 0 ? fotoYer.merkezXpx : tuvalBoyut.w / 2
    const cy = fotoYer?.merkezYpx > 0 ? fotoYer.merkezYpx : tuvalBoyut.h / 2
    return lKanatlariKur(...lKaymayiUygula({ x: cx, y: cy - hPx / 2 }, { x: cx, y: cy + hPx / 2 }))
  })()

  /*
   * KÖŞE KİPİNDE MİYİZ — düz şerit de 3B katman da o zaman çizilmiyor.
   *
   * lKoseFotoGeo bu satırın üstünde hesaplandığı için kısayol burada duruyor;
   * daha yukarıda tanımlanırsa henüz başlatılmamış değişkeni okur.
   */
  const lKoseCizimi = lKoseCizgiGeo || lKoseGeo || lKoseFotoGeo || lKoseHamGeo

  /*
   * TASLAK KUTU TUVALDE Mİ.
   *
   * Hem çizim koşulu hem de "ölçü aracı açık mı" sorusunun bir parçası;
   * ikisi ayrı yazılınca kutu görünmeden tasarım gizlenebiliyordu.
   */
  const taslakKutuAcik =
    kutuKipi &&
    alanNokta.length !== 4 &&
    !!olcuKutu &&
    !!taslakKutu &&
    fotoYer?.genislik > 0 &&
    scene === 'ozel' &&
    !!ozelSahne

  /*
   * TUVALDE ÖLÇÜ ARACI VAR MI.
   *
   * Referans noktaları, kenar çizgileri, L köşesi ve taslak kutu — hepsi
   * tam tasarımın duracağı yere konuyor. Tasarım da çizilirse altındaki
   * yeri ne görmek ne tıklamak mümkün oluyor; üstelik ikisi ayrı yerde
   * duruyorsa (kutu solda, tasarım ortada) ekran büsbütün anlaşılmaz
   * hâle geliyor. Araç açıkken tasarım gizli, kapanınca görünür.
   */
  /*
   * ÇİZİMİN KENDİSİ GİZLEME SEBEBİ DEĞİL.
   *
   * L köşesi çizimi (lKoseCizimi) bir KİP değil, iki duvar işaretlendikten
   * sonra kalıcı olarak duran bir SONUÇ. Listeye dahil edilince köşe bir
   * kez işaretlendiğinde "araç açık" bir daha kapanmıyor ve tasarım bir
   * daha hiç çizilmiyordu. İşaretleme sürerken gizlemenin gerekçesi
   * geçerli; onu zaten lKoseKipi anlatıyor.
   */
  /*
   * BİTEN ÖLÇÜ ARTIK GİZLEMİYOR.
   *
   * Kipler işaretleme bittikten sonra da açık kalıyor (çizgiler ekranda
   * dursun diye; onları "Çizgileri gizle" kaldırıyor). Gizleme kuralı
   * doğrudan kipe bakınca tasarım bir daha hiç çizilmiyordu: referans
   * alınmış, alan işaretlenmiş, içerik seçilmiş ama fotoğrafta hiçbir
   * şey yok.
   *
   * Her araç kendi BİTİŞ ölçütüyle susuyor:
   *   referans → ölçek (px/cm) alındı,
   *   alan     → dört köşe kondu.
   */
  /*
   * DUVAR DİBİ PLANI.
   *
   * Kaç tık gerektiği tasarımın kaç duvara yaslandığına bağlı: düz ve
   * kavisli tek duvara (2), L ve açılı bir köşeye (3), U iki köşeye (4),
   * küp ise hiçbir duvara değil zemine oturuyor (2, zemin çizgisi).
   */

  /*
   * ÖLÇÜ BİTTİ Mİ.
   *
   * Ölçek alınmış ve alanın dört köşesi belli: ekranın nereye, hangi
   * büyüklükte duracağı artık biliniyor. Bu noktadan sonra tasarımı
   * gizlemenin hiçbir gerekçesi yok.
   */
  /*
   * Ölçek alındığı anda tasarım çiziliyor: yerleştirme artık ayrı bir
   * işaretleme adımı değil, tutamaklarla yapılan bir ayar.
   */
  const olcuTamam = !!refPxCm


  /*
   * ───────────────────────────────────────────────────────────────────
   * EKRAN EKRAN YERLEŞTİRME
   * ───────────────────────────────────────────────────────────────────
   */
  /*
   * KONAN DÖRTGENLER ELDE TUTULUYOR.
   *
   * Toplama (ortak kenarların yapışması) durumdan okunduğunda son
   * yazılan dörtgen henüz yerine geçmemiş oluyordu ve yapışma hiç
   * çalışmıyordu. Dörtgenler konuldukları anda burada birikiyor.
   */
  const yerKoseRef = useRef({})
  /*
   * KÖŞE SIRASI DÜZELTİLİYOR.
   *
   * Köşeler tıklama sırasıyla saklanıyordu; farklı sırayla tıklayan
   * kullanıcıda dörtgenin köşeleri yer değiştiriyor ve görsel 90 derece
   * dönmüş ya da aynalanmış oturuyordu. Dörtgen artık her zaman
   * [solÜst, sağÜst, sağAlt, solAlt] sırasında.
   */
  const koseSirala = (k) => {
    if (!Array.isArray(k) || k.length !== 4) return k
    const cx = k.reduce((t, q) => t + q.x, 0) / 4
    const cy = k.reduce((t, q) => t + q.y, 0) / 4
    /* Ekran koordinatında y aşağı: açıya göre sıralamak saat yönü veriyor. */
    const sirali = [...k].sort(
      (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
    )
    /* Başlangıç sol üst: merkeze göre hem solda hem yukarıda olan. */
    let bas = 0
    let enIyi = Infinity
    sirali.forEach((q, i) => {
      const puan = q.x - cx + (q.y - cy)
      if (puan < enIyi) {
        enIyi = puan
        bas = i
      }
    })
    return [0, 1, 2, 3].map((i) => sirali[(bas + i) % 4])
  }

  /* Yerleşmemiş ilk ekranın sırası — ekleme yerleşimi bozmasın diye. */
  const ilkYerlesmemis = () => ekranParcalari.findIndex((x) => !yerlesmisIdler.includes(x.id))

  const yerAktif = yerSira != null && yerSira >= 0 && yerSira < ekranParcalari.length
  const yerEkran = yerAktif ? ekranParcalari[yerSira] : null

  /* Bir ekranın dörtgenini yerine yazıyor: elde duran ekran ayrı yola gidiyor. */
  const dortgeniYaz = (id, kose) => {
    if (!Array.isArray(kose) || kose.length !== 4) return
    /* Elle konan dörtgen, liderden türetmeyi kapatıyor. */
    setElleYerlesti(true)
    if (id === aktifEkranId) {
      elleKoseyeYaz(kose)
      return
    }
    const oran = kose.map(tuvalOrana)
    setSabitEkranlar((l) => l.map((e) => (e.id === id ? { ...e, oran } : e)))
  }


  /*
   * REFERANS ÖLÇEĞİ — TUVAL PİKSELİNDE.
   *
   * Referans kartındaki px/cm fotoğrafın KENDİ çözünürlüğüne ait;
   * buradaki hesaplar tuval pikselinde yapılıyor. İkisini karıştırmak
   * ekranı kat kat yanlış büyüklükte koyar.
   */
  const olcekTuvalPxCm = (() => {
    const cm = Number(String(refUzunlukCm).replace(',', '.'))
    if (refNokta.length !== 2 || !(cm > 0)) return 0
    const a2 = oranTuvale(refNokta[0])
    const b2 = oranTuvale(refNokta[1])
    const o = Math.hypot(b2.x - a2.x, b2.y - a2.y) / cm
    return Number.isFinite(o) && o > 0 ? o : 0
  })()

  /*
   * İŞARETLENEN ALANIN GERÇEK ÖLÇÜSÜ DUVARA YAZILIYOR.
   *
   * Kenar uzunlukları referans ölçeğiyle santime çevriliyor; karşılıklı
   * kenarların ortalaması alınıyor ki perspektif tek bir kenarı
   * yanıltmasın. Santime yuvarlanıyor: panelde 0,01 m adımla okunuyor.
   */
  const alandanDuvar = (kose) => {
    if (!Array.isArray(kose) || kose.length !== 4 || !(olcekTuvalPxCm > 0)) return
    const uzak = (a2, b2) => Math.hypot(a2.x - b2.x, a2.y - b2.y)
    const enPx = (uzak(kose[0], kose[1]) + uzak(kose[3], kose[2])) / 2
    const boyPx = (uzak(kose[0], kose[3]) + uzak(kose[1], kose[2])) / 2
    const enM = Math.round((enPx / olcekTuvalPxCm) * 1) / 100
    const boyM = Math.round((boyPx / olcekTuvalPxCm) * 1) / 100
    if (enM > 0.05) duvarEniniYaz(enM)
    if (boyM > 0.05) duvarBoyunuYaz(boyM)
  }

  /*
   * DÖRT KÖŞE KONDUKTAN SONRA DÜZELTİLEBİLİR.
   *
   * Son köşeye tıklayınca sıradaki ekrana atlanmıyordu ve yanlış konan
   * bir köşe için baştan başlamak gerekiyordu. Köşeler sürüklenebilir
   * tutamak olarak duruyor; kullanıcı beğenince onaylıyor.
   */
  const yerNoktaDegisti = (tuvalNoktalari) => {
    setYerNokta(tuvalNoktalari)
    /* Köşeler sürüklenirken duvar ölçüsü de anında güncelleniyor. */
    if (tuvalNoktalari.length === 4) alandanDuvar(koseSirala(tuvalNoktalari))
  }

  /*
   * BİR EKRANI YERLEŞTİRMEYE YA DA DÜZENLEMEYE AL.
   *
   * Yerleşmiş ekranda mevcut dört köşe tutamak olarak geliyor; kullanıcı
   * sürükleyip onaylıyor. Yerleşmemişte boş başlıyor.
   */
  const yerEkraniSec = (sira) => {
    const i = ekranParcalari.findIndex((x) => x.sira === sira)
    if (i < 0) return
    const id = ekranParcalari[i].id
    const mevcut =
      id === aktifEkranId
        ? koseMutlak
        : (() => {
            const k = sabitEkranlar.find((e) => e.id === id)?.oran
            return Array.isArray(k) && k.length === 4 ? k.map(oranTuvale) : null
          })()
    setYerNokta(Array.isArray(mevcut) && mevcut.length === 4 ? mevcut : [])
    setYerSira(i)
    setSihirbazAdim(3)
  }

  const yerEkraniOnayla = () => {
    if (yerNokta.length !== 4 || !yerEkran) return

  /*
   * TIKLANAN DÖRTGEN PERSPEKTİFİ VERİYOR, ÖLÇÜYÜ DEĞİL.
   *
   * Kullanıcı dört köşeye tıklarken yüzeyin AÇISINI gösteriyor; ekranın
   * büyüklüğü ise panelde kurulan gerçek ölçüden (sütun × kabin) ve
   * referans ölçeğinden geliyor. İkisi ayrılmazsa 0,96 m lik bir ekran
   * fotoğrafta kullanıcının çizdiği kutu kadar — yani çoğu zaman kat kat
   * büyük — çiziliyordu.
   *
   * Dörtgen merkezinden ölçekleniyor: şekli ve eğimi korunuyor, yalnızca
   * boyu gerçeğe oturuyor.
   */
  const gercegeOlcekle = (kose, enM, boyM) => {
    if (!Array.isArray(kose) || kose.length !== 4) return kose
    if (!(olcekTuvalPxCm > 0) || !(enM > 0) || !(boyM > 0)) return kose
    const uzak = (a2, b2) => Math.hypot(a2.x - b2.x, a2.y - b2.y)
    const enPx = (uzak(kose[0], kose[1]) + uzak(kose[3], kose[2])) / 2
    const boyPx = (uzak(kose[0], kose[3]) + uzak(kose[1], kose[2])) / 2
    if (!(enPx > 1) || !(boyPx > 1)) return kose
    const sx = (enM * 100 * olcekTuvalPxCm) / enPx
    const sy = (boyM * 100 * olcekTuvalPxCm) / boyPx
    if (!(sx > 0) || !(sy > 0)) return kose
    const cx = kose.reduce((t2, q) => t2 + q.x, 0) / 4
    const cy = kose.reduce((t2, q) => t2 + q.y, 0) / 4
    return kose.map((q) => ({ x: cx + (q.x - cx) * sx, y: cy + (q.y - cy) * sy }))
  }



    /* Alanın kendisi duvar; tasarım onun içine kendi ölçüsüyle oturuyor. */
    alandanDuvar(koseSirala(yerNokta))
    const duzgun = gercegeOlcekle(koseSirala(yerNokta), yerEkran.wm, yerEkran.hm)
    yerKoseRef.current[yerEkran.id] = duzgun
    dortgeniYaz(yerEkran.id, duzgun)
    const yeni = yerlesmisIdler.includes(yerEkran.id) ? yerlesmisIdler : [...yerlesmisIdler, yerEkran.id]
    setYerlesmisIdler(yeni)
    setYerNokta([])
    /* Sıra, yerleşmemiş ilk ekrana geçiyor. */
    const sonraki = ekranParcalari.findIndex((x) => !yeni.includes(x.id))
    if (sonraki >= 0) {
      setYerSira(sonraki)
      return
    }
    /*
     * Hepsi bitti. Köşelere DOKUNULMUYOR: her ekran kullanıcının
     * tıkladığı dört köşede kalıyor.
     */
    setYerSira(null)
    setTasarimAcik(true)
    setSihirbazAdim(0)
  }


  /* Referans bitince yerleştirme başlıyor. */
  useEffect(() => {
    if (scene !== 'ozel' || !ozelSahne) return
    if (sihirbazAdim !== 3) return
    if (yerSira !== null) return
    /*
     * BİRİKİMLER KORUNUYOR.
     *
     * Burada her seferinde temizleniyordu ve sıra ilk ekrana dönüyordu:
     * yeni bir ekran eklemek, yerleşmiş ekranları yeniden yerleştirtmek
     * anlamına geliyordu. Sıra yalnızca yerleşmemiş ilk ekrandan
     * başlıyor; hepsi yerleştiyse adım hiç açılmıyor.
     */
    const bos = ilkYerlesmemis()
    if (bos < 0) return
    setYerNokta([])
    setYerSira(bos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sihirbazAdim, scene, ozelSahne])

  /*
   * ÖLÇÜ DEĞİŞİNCE FOTOĞRAFTAKİ EKRAN DA DEĞİŞİYOR.
   *
   * Sütun/satır değiştirince fotoğraftaki ekran olduğu gibi kalıyordu.
   * Dörtgen artık merkezi ve perspektifi korunarak yeni gerçek ölçünün
   * oranında büyüyüp küçülüyor; ekran aynı duvarda, aynı açıda kalıyor.
   *
   * Oran BİR ÖNCEKİ ölçüye göre alınıyor: üst üste değişiklikler
   * birikmiyor ve dörtgenin şekli bozulmuyor.
   */
  const sonOlcuRef = useRef(null)
  useEffect(() => {
    const onceki = sonOlcuRef.current
    sonOlcuRef.current = { w: ekranWm, h: ekranHm }
    if (scene !== 'ozel' || !ozelSahne || !elleYerlesti) return
    if (!onceki || !(onceki.w > 0) || !(onceki.h > 0)) return
    if (!(ekranWm > 0) || !(ekranHm > 0)) return
    const sx = ekranWm / onceki.w
    const sy = ekranHm / onceki.h
    if (Math.abs(sx - 1) < 1e-4 && Math.abs(sy - 1) < 1e-4) return
    const k = koseMutlak
    if (!Array.isArray(k) || k.length !== 4) return
    /*
     * ÖLÇEĞİN DAYANAĞI ORTAK KÖŞE.
     *
     * Merkezden ölçeklemek komşuyla paylaşılan kenarı da kaydırıyor ve
     * L birleşimi satır/sütun değişince görünürde ayrılıyordu. Dayanak,
     * başka bir ekranın köşesine EN YAKIN köşe: ortak köşe yerinde
     * kalıyor, ekran yalnızca öteki yöne doğru büyüyüp küçülüyor.
     * Komşu yoksa eskisi gibi merkez.
     */
    const komsuKoseler = Object.entries(yerKoseRef.current)
      .filter(([id]) => id !== String(aktifEkranId))
      .flatMap(([, v]) => v || [])
    let dayanak = {
      x: k.reduce((t, q) => t + q.x, 0) / 4,
      y: k.reduce((t, q) => t + q.y, 0) / 4,
    }
    if (komsuKoseler.length) {
      let enYakin = Infinity
      for (const q of k) {
        for (const r of komsuKoseler) {
          const u = Math.hypot(q.x - r.x, q.y - r.y)
          if (u < enYakin) {
            enYakin = u
            dayanak = q
          }
        }
      }
      /* Çok uzaktaysa komşu sayılmıyor. */
      if (!(enYakin < 40)) {
        dayanak = {
          x: k.reduce((t, q) => t + q.x, 0) / 4,
          y: k.reduce((t, q) => t + q.y, 0) / 4,
        }
      }
    }
    elleKoseyeYaz(
      k.map((q) => ({ x: dayanak.x + (q.x - dayanak.x) * sx, y: dayanak.y + (q.y - dayanak.y) * sy })),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ekranWm, ekranHm])

  const refIsaretleniyor = (refKipi || ref2Kipi) && !refPxCm
  const alanIsaretleniyor = alanKipi && alanNokta.length < 4
  const olcuAraciAcik = refIsaretleniyor || lKoseKipi || alanIsaretleniyor || taslakKutuAcik || yerAktif

  /*
   * YERİNDE 3B KATMAN ÇİZİLİYOR MU.
   *
   * Tek kaynak: hem katmanın kendisi hem de "düz çizimi gizle" kararı
   * buradan okuyor. Ayrı ayrı yazıldıklarında ikisi ayrışıyordu — ölçü
   * kipi katmanı kaldırıyor, "gizle" kararı ise bir kez açılmış
   * uc3dHazir bayrağına bakmaya devam ediyordu: 3B yok, 2B de gizli,
   * ekranda hiçbir şey kalmıyordu.
   */
  const uc3dKatmanVar =
    PANEL.kabinGovdesi &&
    !tasarimGizli &&
    !duvarDunya &&
    YERINDE_3B &&
    surukleAktif &&
    !lKoseCizimi &&
    !refKipi &&
    !lKoseKipi

  /** Dörtgenin merkezi, durusaOturt'un beklediği {cx, cy} adlarıyla. */
  const koseMerkeziCx = (k) => ({
    cx: k.reduce((t, q) => t + q.x, 0) / k.length,
    cy: k.reduce((t, q) => t + q.y, 0) / k.length,
  })

  /** Dörtgenin merkezi — köşelerin ortalaması. */
  const koseMerkezi = (k) => ({
    x: k.reduce((t, q) => t + q.x, 0) / k.length,
    y: k.reduce((t, q) => t + q.y, 0) / k.length,
  })

  /*
   * KABİNİN GÖRÜNEN YÜZLERİ.
   *
   * Tasarımın dörtgeni zaten bir duruştan üretiliyor; aynı duruş ve aynı
   * kamera kabinin sekiz köşesini de veriyor (bkz. kutuGovdesi). Böylece
   * gövde tasarımdan kopamıyor — ayrı bir 3B sahne ve yaklaşık bir duruş
   * yok. Ölçüldü: gövdenin ön yüzü tasarımın dörtgeniyle 0,000 piksel farklı.
   *
   * Derinlik gerçek veri: kabinin depthMm alanı.
   *
   * Düzlem kipinde kapalı — orada duruş ölçülmüş bir homografiden geliyor,
   * açılara ayrılmış hâli elimizde yok.
   */
  const kabinYuzleri = (() => {
    const kaynak = ozelSahne?.kaynak
    /*
     * DÜZLEM KİPİNDE DE GÖVDE VAR.
     *
     * Dört köşe referansında gövde hiç çizilmiyordu, çünkü duruş açıları
     * orada kullanılmıyor. Gerek de yok: duruş zaten ekrandaki dörtgenden
     * çıkarılıyor (durusaOturt) ve gövde ona yapıştırılıyor. Dörtgenin
     * nereden geldiğinin önemi yok.
     */
    if (!refPxCm || !(kaynak?.w > 0)) return null
    if (!Array.isArray(koseMutlak) || koseMutlak.length !== 4) return null
    if (!(previewModel?.depthMm > 0) || !(tasarimWm > 0) || !(tasarimHm > 0)) return null
    const mesafeCm = (izlemeMesafesi || 0) * 100
    const n = koseMutlak.map(tuvalOrana)
    /*
     * DURUŞ, SAKLANAN DEĞERDEN DEĞİL EKRANDAKİ ŞEKİLDEN.
     *
     * Köşeler serbest sürüklenebildiği için kutuDurus artık ekranda duran
     * şekli anlatmıyor olabilir. Gövdeyi ona göre çizmek kabini tasarımdan
     * koparırdı. Bu yüzden duruş her seferinde dörtgenin KENDİSİNDEN
     * çıkarılıyor; saklanan duruş yalnızca aramanın başlangıcı oluyor
     * (sürüklerken sürekliliği o sağlıyor).
     */
    const poz = durusaOturt(
      n,
      tasarimWm * 100,
      tasarimHm * 100,
      refPxCm,
      kaynak.w,
      kaynak.h,
      { ...koseMerkeziCx(n), roll: kutuDurus.roll, yaw: kutuDurus.yaw, pitch: kutuDurus.pitch },
      mesafeCm,
    )
    if (!poz) return null
    /*
     * ───────────────────────────────────────────────────────────────────
     * KALINLIK ESNEMEYLE BÜYÜMÜYOR.
     *
     * Gövde tasarımın GERÇEK ölçüsünden kuruluyor (32 x 16 cm gibi), sonra
     * ön yüzü ekrandaki dörtgene oturtuluyor. Dörtgen işaretlenen alana
     * sığdırıldığında tasarım gerçek ölçüsünün katları kadar büyüyor ve
     * derinlik de aynı katla büyüyordu: 10 cm'lik bir kabin yarım metre
     * kalınlıkta görünüyordu.
     *
     * Çözüm, derinliği o katsayıya BÖLMEK: gövde oturtulurken aynı katla
     * çarpılacağı için ekranda kalan şey kabinin gerçek derinliği oluyor.
     * Katsayı, ekrandaki enin fotoğrafın santim ölçeğindeki karşılığının
     * tasarımın gerçek enine oranı.
     * ───────────────────────────────────────────────────────────────────
     */
    const derinlikCm = (() => {
      const ham = previewModel.depthMm / 10
      if (!(cizimOlcek > 0) || !(tasarimWm > 0)) return ham
      const enPx =
        (Math.hypot(koseMutlak[1].x - koseMutlak[0].x, koseMutlak[1].y - koseMutlak[0].y) +
          Math.hypot(koseMutlak[2].x - koseMutlak[3].x, koseMutlak[2].y - koseMutlak[3].y)) /
        2
      const cizilenM = enPx / cizimOlcek
      const carpan = cizilenM / tasarimWm
      /* Katsayı anlamsızsa (ölçek yok, dörtgen bozuk) dokunma. */
      if (!Number.isFinite(carpan) || carpan <= 0.01) return ham
      return ham / carpan
    })()
    const g = kutuGovdesi(
      tasarimWm * 100,
      tasarimHm * 100,
      derinlikCm,
      refPxCm,
      kaynak.w,
      kaynak.h,
      poz.merkez,
      poz.roll,
      poz.yawRad,
      poz.pitchRad,
      mesafeCm,
    )
    if (!g) return null

    /*
     * GÖVDEYİ DÖRTGENE YAPIŞTIRMA.
     *
     * Elle bozulmuş bir dörtgen gerçek bir dikdörtgenin görüntüsü olmak
     * zorunda değil; o yüzden bulunan duruşun ön yüzü ekrandaki dörtgene tam
     * oturmayabiliyor. İkisi arasındaki fark bir DÜZLEM dönüşümü, yani
     * homografi: bulunan ön yüzden birim kareye, oradan gerçek dörtgene.
     * Aynı dönüşüm sekiz köşeye birden uygulanınca gövde dörtgenin üstüne
     * birebir oturuyor ve perspektifi bozulmuyor.
     */
    const onTuval = g.on.map(oranTuvale)
    const A = duvarDunyasi(onTuval, 1, 1)
    const B = duvarDunyasi(koseMutlak, 1, 1)
    if (!A || !B) return null
    const yapistir = (p) => {
      const u = A.geri(p.x, p.y)
      return u && B.ileri(u.x, u.y)
    }
    const yuzler = []
    for (const y of g.yuzler) {
      const k = y.koseler.map(oranTuvale).map(yapistir)
      if (k.some((q) => !q)) continue
      yuzler.push({ ...y, koseler: k })
    }
    return { yuzler, on: koseMutlak }
  })()

  /*
   * BURADA ESKİ KUTU KURUCULARI VARDI VE KALDIRILDI.
   *
   * oranliDortgen ("fotoğrafın %60'ı" payıyla oranı doğru ama ölçüsü
   * olmayan kutu), dikdortgenMi, kaynakOran ve olcuKutusunuGuncelle.
   * Hepsi ölçüsüz kutu akışına aitti. Tek akış artık referans ölçek.
   *
   * Ölçüyü değiştirmek de ayrı bir yol değil: ölçek belli olduğuna göre yeni
   * santimetre yeni bir kutu demek, "Ölçü kutusunu oluştur" yeniden
   * kuruyor.
   */

  /*
   * KUTUNUN DÖRTGENİ DEĞİŞTİ — FİZİKSEL ÖLÇÜ DEĞİŞMEDİ.
   *
   * Kullanıcı kutuyu taşıyor ya da köşelerinden çekiyor. Bu yalnızca
   * fotoğraftaki görünümü belirler: yer, piksel boyutu, perspektif şekli.
   * enCm/boyCm'e DOKUNULMUYOR — fiziksel ölçü kullanıcının yazdığı sayıdır
   * ve gözle ayarlanamaz.
   */
  const olcuKutusuDegisti = (tuvalKoseler, tur) => {
    if (!Array.isArray(tuvalKoseler) || tuvalKoseler.length !== 4) return
    const oranli = tuvalKoseler.map(tuvalOrana)
    /*
     * KÖŞE SÜRÜKLEME SERBEST.
     *
     * Bir ara çekilen köşeler HEDEF sayılıp gerçek ölçüsündeki dikdörtgenin
     * o hedefe en yakın duruşu aranıyordu (durusaOturt). Niyet doğruydu —
     * şekil hep gerçek bir dikdörtgenin görüntüsü kalsın — ama kullanımda
     * tutmadı: ulaşılamayan bir köşe istendiğinde arama bambaşka bir duruşa
     * atlıyor ve tek bir köşenin ufak hareketi dörtgenin tamamını
     * değiştiriyordu. Kullanıcının elinde kalan şey öngörülemezlikti.
     *
     * Artık köşe nereye çekilirse oraya gidiyor. Şeklin gerçek bir
     * dikdörtgenin görüntüsü olma zorunluluğu kalktı; bozuk dörtgen ve
     * yalayan perspektif denetimleri yerinde (bkz. TaslakKutu).
     *
     * 3B GÖVDE KAYBOLMUYOR. Kabinin yüzleri artık duruş durumundan değil,
     * ekrandaki dörtgenin KENDİSİNDEN çıkarılan duruştan çiziliyor ve
     * dörtgene homografiyle yapıştırılıyor (bkz. kabinYuzleri). Yani şekli
     * elle bozsan da kutu üç boyutlu kalıyor.
     */
    /*
     * DÜZLEM KİPİNDE KUTU SERBEST BİR DÖRTGEN DEĞİL.
     *
     * Düzlem biliniyorsa kutunun perspektifi de belli; kullanıcının
     * sürüklediği şekli olduğu gibi almak o bilgiyi çöpe atardı. Bunun
     * yerine sürüklenen dörtgenin MERKEZİ dünyaya çevriliyor ve kutu o
     * noktada yeniden kuruluyor. Sonuç: kutu taşındıkça perspektifi
     * kendiliğinden düzeliyor — uzağa gidince küçülüyor.
     */
    if (refDuzlem && duzlemeOtur && olcuKutu) {
      const mn = {
        x: oranli.reduce((t2, q) => t2 + q.x, 0) / 4,
        y: oranli.reduce((t2, q) => t2 + q.y, 0) / 4,
      }
      const md = duzlemeDusur(refDuzlem, mn)
      const k = md && duzlemdeKutu(refDuzlem, olcuKutu.enCm, olcuKutu.boyCm, md)
      if (k) {
        setHedefKose(k.koseler)
        setTaslakKutu(k.koseler)
        setHedefTur('taslak')
        return
      }
    }
    setHedefKose(oranli)
    setTaslakKutu(oranli)
    setHedefTur('taslak')
  }


  /*
   * TASARIM BU DUVARA SIĞIYOR MU?
   *
   * Şimdiye kadar denetim fotoğrafın KADRAJINA bakıyordu; oysa soru duvarla
   * ilgili. Duvar tanıtıldıysa karşılaştırma onunla yapılıyor ve cevap somut
   * veriliyor: duvara en fazla kaç kabinlik, kaç metrelik bir ekran girer.
   */
  /*
   * SANTİM METRE SANILDI MI?
   *
   * Duvar ölçüsü metre isteniyor ama insan duvarı santimle ölçüyor: 35,5 × 23
   * yazınca program 35,5 METRELİK bir duvar anlıyor ve tasarım o duvarın
   * yanında birkaç piksel kalıyor — kullanıcının gördüğü şey tasarımın yok
   * olması.
   *
   * Sessizce bölmek yanlış olur: 35 metrelik video duvarları gerçekten var.
   * Bu yüzden düzeltmiyoruz, soruyoruz — ve metre karşılığını da yazıyoruz ki
   * kullanıcı ne yazacağını bilsin.
   */
  const birimSuphesi = useMemo(() => {
    if (!duvarOlcu || !(tasarimWm > 0)) return null
    const oran = tasarimWm / duvarOlcu.wm
    if (oran >= 0.02) return null
    return { wm: duvarOlcu.wm, hm: duvarOlcu.hm, yuzde: oran * 100 }
  }, [duvarOlcu, tasarimWm])

  const duvaraSigma = useMemo(() => {
    if (lTipiVar) return null
    if (!duvarOlcu || !(tasarimWm > 0) || !(tasarimHm > 0)) return null
    const sigiyor = tasarimWm <= duvarOlcu.wm + 1e-6 && tasarimHm <= duvarOlcu.hm + 1e-6
    if (sigiyor) return null
    const kw = (previewModel?.widthMm || 0) / 1000
    const kh = (previewModel?.heightMm || 0) / 1000
    const enCokSutun = kw > 0 ? Math.floor(duvarOlcu.wm / kw + 1e-6) : 0
    const enCokSatir = kh > 0 ? Math.floor(duvarOlcu.hm / kh + 1e-6) : 0
    return {
      duvar: duvarOlcu,
      sutun: enCokSutun,
      satir: enCokSatir,
      wm: enCokSutun * kw,
      hm: enCokSatir * kh,
    }
  }, [lTipiVar, duvarOlcu, tasarimWm, tasarimHm, previewModel])

  /*
   * MESAFE KARTI BOŞSA HİÇ ÇİZİLMİYOR.
   *
   * Taslak kutu varken kartın içindeki mesafe satırı gizleniyor (mesafe
   * yukarıda, en/boy ile aynı yerde soruluyor); geriye yalnızca uyarılar
   * kalıyor. Uyarı da yoksa panelde boş, çerçeveli bir dikdörtgen kalıyordu.
   */
  const mesafeKartiVar =
    !(scene === 'ozel' && ozelSahne && taslakKutu) || !!birimSuphesi || !!duvaraSigma

  const koseAyariniSifirla = () => {
    setElleKose(null)
    setKilitliKose([])
    setElleAci({ yaw: 0, tilt: 0 })
  }

  /* Manuel kip açılırken elde bir dörtgen yoksa fotoğrafın ortasında biri kurulur. */
  const koseKipiAc = () => {
    /*
     * Tutamaklar çizilen tasarımın köşelerinden başlıyor.
     *
     * KAYMA İKİ KEZ EKLENMİYOR: koseMutlak ekranda görünen yeri veriyor ve
     * sürükleme kaymasını ZATEN içinde taşıyor. Olduğu gibi kaydedilince
     * okuma yolunda kayma bir kez daha ekleniyor ve kip açılır açılmaz
     * tasarım yer değiştiriyordu. Saklanan değer kaymasız olmalı — tıpkı
     * koseleriTasi'nda olduğu gibi.
     */
    /*
     * KALİBRE DUVARDA EKRANIN KENDİ DÖRTGENİ TUTULMUYOR.
     *
     * Köşe kipini açmak elleKose'yi dolduruyordu; o dolu olduğu sürece çizim
     * dünya katmanını atlayıp doğrudan o dörtgeni kullanıyor, yani ölçü
     * sistemi devre dışı kalıyordu. Ölçümde belirtisi şuydu: duvarın köşesi
     * çekiliyor ama ekran kılını kıpırdatmıyordu.
     *
     * Duvar kalibre edilmişse köşe kipi DUVARI düzenliyor (bkz. koseleriTasi)
     * ve ekran duvarın koordinat sisteminden kendiliğinden geliyor.
     */
    if (!duvarOlcu && !elleKose && koseMutlak) {
      setElleKose(
        koseMutlak.map((k) => ({
          x: k.x - (elleKayma?.x || 0),
          y: k.y - (elleKayma?.y || 0),
        })),
      )
    }
    /* Yeni düzenleme turunda hiçbir köşe sabit değil. */
    setKilitliKose([])
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
    /*
     * ELLE TAŞIMADA İKİNCİ KISIT YOK.
     *
     * Aşağıdaki hesap ekranı fotoğrafın içinde tutuyor; otomatik yerleşim
     * için doğru, elle taşımada ise kullanıcıyı engelliyordu. Kullanıcı
     * taşımaya başladıysa kayma olduğu gibi geçiyor (tek güvence
     * kaymayiSinirla'daki "dörtte biri kadrajda kalsın" kuralı).
     */
    if (mekanTasindi) return { x: elleKayma.x + oneriKaymasi, y: elleKayma.y + oturmaKaymasi }
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
  /* Duvar ölçüsünden bağımsız — bkz. EN_COK_KABIN_EKSEN. */
  const rowsMax = Math.max(1, Math.min(EN_COK_KABIN_EKSEN, Math.floor((height || 0) / kabinBoyM + 1e-6)))
  /*
   * DUVARIN ALT SINIRI TASARIMA BAĞLI DEĞİL.
   *
   * Alt sınır "mevcut ekranı barındıran en küçük ölçü" idi ve 0,1 m'ye YUKARI
   * yuvarlanıyordu: 3 × 32 cm'lik bir tasarımda sınır 0,96 değil 1,00 oluyor,
   * kullanıcı 0,96 yazınca alan sessizce 1'e çekiliyordu. Yani gerçek duvar
   * ölçüsünü yazmak mümkün değildi.
   *
   * Aynı kararı projenin geri kalanı çoktan verdi: sütun/satır üst sınırı da
   * duvardan koparıldı, taşma engellenmiyor yalnızca söyleniyor (bkz.
   * EN_COK_KABIN_EKSEN ve "Tasarım bu duvara sığmıyor" uyarısı). Duvar da
   * aynı kurala giriyor: ne yazıldıysa o. Tasarım sığmıyorsa uyarı zaten var
   * ve çizimde taşan kısım taramayla işaretli.
   *
   * Alt sınır yalnızca sıfır/eksi olmasın diye: 0,1 m.
   */
  /*
   * DUVAR TASARIMDAN KÜÇÜK OLAMIYOR.
   *
   * Alt sınır bir ara tasarımdan koparılmıştı (yuvarlama yüzünden
   * kullanıcının yazdığı ölçü sessizce değişiyordu). Yuvarlama yok:
   * sınır tasarımın KENDİ ölçüsü, bu yüzden sessiz bir değişiklik de
   * olmuyor.
   */
  const tasarimToplamEn = ekranParcalari.reduce((t, x) => t + (x.wm || 0), 0)
  const tasarimEnYuksek = Math.max(...ekranParcalari.map((x) => x.hm || 0), 0)
  const widthMin = hasModel ? Math.max(0.1, tasarimToplamEn) : 0
  const heightMin = hasModel ? Math.max(0.1, tasarimEnYuksek) : 0

  /*
   * BURADA ESKİDEN BİR "GÜVENLİK AĞI" VARDI VE KALDIRILDI.
   *
   * Ekran duvardan büyük kalırsa satır/sütunu sınıra çekiyordu. Sınır duvar
   * ölçüsünden geldiği için bu, kullanıcının seçtiği kabin sayısını sessizce
   * azaltmak demekti: 30 cm'lik alana 2 sütun seçilince bir sonraki çizimde
   * kendiliğinden 1'e düşüyordu.
   *
   * Tasarımın fiziksel ölçüsü artık hiçbir yerde kutuya göre küçültülmüyor
   * (bkz. ekranWm/ekranHm). Taşma bir hata değil, gösterilecek bir bilgi:
   * uyarıyı duvaraSigma veriyor.
   */

  return (
    <div className="bg-[#f7f9fc] dark:bg-[#0b0f16] text-[#1c1c2b] dark:text-neutral-100 font-sans">
      {/* Dik telefonda uyarı; yan çevrilince kendiliğinden kalkıyor. */}
      <DikeyUyari />
      {/* Konfigüratör — tek ekran yüksekliği */}
      {/* Masaüstü: tek ekran yüksekliği. Mobil: içerik alt alta dizilip sayfa kayar. */}
      <div className="yatay-sayfa min-h-screen lg:h-screen lg:overflow-hidden flex flex-col">
      {/* Başlık çubuğu — kurumsal logo + sayfa adı */}
      <header className="bg-white dark:bg-[#121821] border-b border-neutral-200/80 dark:border-[#2a3342] px-4 sm:px-6 lg:px-6 py-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        {/*
          ALT BAŞLIK KALDIRILDI.

          Antette üç satır vardı ve üçü de kırpılıyordu. Slogan bilgi
          taşımıyor; kalkınca kalan iki satıra yetecek yer kalıyor.
        */}
        <BrandMark title={t('app.title')} />

        {/*
          MODEL ÇİPİ — hangi modelle çalışıldığı her ekranda görünsün.
          Sol paneldeki kart en uzun bloktu ama tasarım boyunca bir kez
          dokunuluyor. Seçilmemişken vurgulu: yapılacak ilk iş o.
        */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          title={seriAdi(selectedModel?.series?.name, t) || t('model.heading')}
          className={`shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
            hasModel
              ? 'border border-neutral-300 text-neutral-700 hover:border-brand hover:text-brand dark:border-[#39414f] dark:text-neutral-200'
              : 'bg-brand text-white hover:opacity-90'
          }`}
        >
          <span>{hasModel ? selectedModel.modelCode : t('model.select')}</span>
          {/* Tip etiketi ve ok yatay telefonda gizli: ad kesilmesin. */}
          {hasModel && (
            <span className="yatay-gizle inline-flex items-center gap-1.5">
              <ProductTypeBadge productType={selectedModel.productType} />
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          )}
        </button>

        {/*
          Araç düğmeleri başlık çubuğunda. Önce solda dikey bir şeritteydi ama
          duvar büyüdükçe çizimin üstüne biniyordu; burada hiçbir zaman çakışmaz.
        */}
        {/*
          Telefonda dokuz denetim tek satıra sığmıyordu: son ikisi (dil ve profil)
          ekranın dışında kalıyor ve tıklanamıyordu. Dar ekranda satır SARIYOR,
          sm ve üzerinde eski tek satır düzeni sürüyor.
        */}
        {/*
          ŞERİT SIĞMAYINCA ALT SATIRA SARIYOR.

          Eskiden shrink-0 + flex-nowrap'ti: şerit hiç daralmıyor, kalan
          her şeyi (antet dâhil) sıfıra eziyordu. Düğmelerin kendisi
          değişmiyor — yalnızca dar masaüstünde ikinci satıra geçiyorlar.
        */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-start sm:justify-end">
<IconButton active={hasModel} pasifNot={t('tool.modelGerek')} label={t('tool.reset')} onClick={() => hasModel && setResetConfirmOpen(true)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
              <path d="M4 4v4h4" />
            </svg>
          </IconButton>
          <IconButton
            active={hasModel}
            pasifNot={t('tool.modelGerek')}
            label={showMeasurements ? t('tool.hideMeasures') : t('tool.showMeasures')}
            onClick={() => hasModel && setShowMeasurements((m) => !m)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="1.5" />
              <line x1="4" y1="14" x2="14" y2="14" />
              <line x1="14" y1="4" x2="14" y2="20" />
            </svg>
          </IconButton>

          {/*
            KAMERA TEK KAPIDAN.
            "Nasıl görüneceğini gör", "Kamerada oturt" ve sağ paneldeki
            kopyaları aynı yere çıkıyordu; hangisinin ne yaptığı belli
            değildi. Tek giriş kaldı.
          */}
          <IconButton active={hasModel} pasifNot={t('tool.modelGerek')} label={t('cam.open')} onClick={() => hasModel && setArAcik(true)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8a2 2 0 0 1 2-2h2.2l1.2-2h7.2l1.2 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <circle cx="12" cy="12.5" r="3.4" />
            </svg>
          </IconButton>

          {/* Gerçek 3D sahne (HDRI ışıklandırma + WebXR/model-viewer AR dışa aktarma) */}
          <IconButton active={hasModel} pasifNot={t('tool.modelGerek')} label={t('scene3d.open')} onClick={() => hasModel && setScene3dOpen(true)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
              <path d="M12 3v18M4 7.5l8 4.5 8-4.5" />
            </svg>
          </IconButton>

          <span className="w-px h-6 bg-neutral-200 dark:bg-[#2c333f] mx-1 hidden sm:block" />

          {/* Teknik Özellikler (Bileşenler de içinde) */}
          <IconButton active={hasModel} pasifNot={t('tool.modelGerek')} label={t('sp.title')} onClick={() => hasModel && setSpecsOpen(true)}>
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
      {hasModel && hwMatchError && (
        <div className="px-4 sm:px-6 lg:px-10 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 text-sm text-amber-900 dark:text-amber-200">
          {hwMatchError}
        </div>
      )}

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
        {/* select-none: Shift + tıklama metin seçimi başlatıyordu (bkz. onSec). */}
        <main ref={tuvalRef} id="pdf-onizleme" className={(adayKipi ? 'aday-secim ' : '') + "select-none yatay-onizleme order-1 lg:order-2 grow-0 shrink-0 basis-auto h-[62vh] min-w-0 relative overflow-hidden bg-[#f4f4f4] dark:bg-[#232830] lg:flex-1 lg:h-auto lg:min-h-0"}>
          {/*
            YAKINLAŞTIRMA SARMALAYICISI.

            Bütün katmanlar (fotoğraf, işaretler, tasarım, ölçü etiketleri)
            BİRLİKTE büyüyor; yalnız fotoğrafı büyütmek işaretleri yerinden
            oynatırdı. Tuvalin kendisi (main) ölçeklenmiyor: tuvalBoyut onun
            dikdörtgeninden okunuyor ve ölçeklenseydi her yakınlaştırma
            yerleşimi baştan hesaplatırdı.

            Yakınlaştırma 1 iken dönüşüm hiç uygulanmıyor — kalıcı bir
            dönüşüm, içindeki sabit konumlu her öğenin başnoktasını değiştirir.
          */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform:
                isaretZoom > 1
                  ? `translate(${isaretKay.x}px, ${isaretKay.y}px) scale(${isaretZoom})`
                  : undefined,
              transformOrigin: '0 0',
            }}
          >

          {/*
            FOTOĞRAF İNCELENİRKEN YÜKLENİYOR KATMANI.

            İnceleme birkaç saniye sürüyor (iki yapay zekâ modeli tarayıcıda
            çalışıyor, ilk seferde ~30 MB model indiriliyor). Bu sırada
            ekranda hiçbir şey değişmediği için uygulama donmuş sanılıyordu.
            Panelde küçük bir yazı vardı ama kullanıcı tuvale bakıyor —
            gösterge de tuvalde olmalı.
          */}
          {ozelInceleniyor && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/80 backdrop-blur-[2px] dark:bg-[#12161d]/80">
              <div className="mx-4 flex max-w-[320px] flex-col items-center gap-3 text-center">
                <svg className="h-9 w-9 animate-spin text-brand" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <div className="text-[15px] font-semibold text-neutral-800 dark:text-neutral-100">
                  {t('scene.analysingTitle')}
                </div>
                <p className="m-0 text-[12.5px] leading-snug text-neutral-500 dark:text-neutral-400">
                  {t('scene.analysingHint')}
                </p>
                <p className="m-0 text-[11.5px] leading-snug text-neutral-400 dark:text-neutral-500">
                  {t('scene.analysingPrivacy')}
                </p>
              </div>
            </div>
          )}

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
              /* L tipinde oda köşeyi gösterecek kadar dönüyor. */
              kacisKaymasi={lKacisKaymasi}
              /* Dış mekânda binanın dönen yan yüzü (yalnızca L tipinde). */
              yanYuz={cepheKoseYuzu}
              /* Fotoğraflı mekânda duvarın dönen yüzü (yalnızca L tipinde). */
              duvarKosesi={fotoDuvarKosesi}
              ekranWpx={tasarimWm * (cizimOlcek || 0)}
              ekranHpx={tasarimHm * (cizimOlcek || 0)}
              /* Kasa dikdörtgen değil, ekranın dış hattını izlesin (iç L tipi) */
              ekranSekli={ekranSekli}
              ayakOrani={ayakOrani}
              yon={koseTuval ? null : mekanYon}
              /*
               * KIOSK GÖVDESİ KULLANICININ KARARI.
               *
               * Dört köşe hedefi varken gövde gizleniyordu; gerekçe "duvara
               * oturtulmuş ekranın ayağı olmaz"dı. Ama kullanıcı gövdeyi
               * açıkça AÇTIYSA onu gizlemek, düğmenin hiçbir işe yaramaması
               * demek — kioskun hiç görünmemesinin sebebi buydu. Yalnızca
               * iç L tipi dışarıda: onun gövdesi çizilemiyor.
               */
              kioskGizle={lTipiVar || !kioskVar}
              /* Mekânın gerçek ölçüleri, ölçü gösterimi açıkken görünüyor. */
              olcuGoster={olculerGorunsun}
              /* Duvar etiketi kullanıcının kendi ölçüsünü yazıyor */
              duvarWmEtiket={mekanDuvarWm}
              duvarHmEtiket={mekanDuvarHm}
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
              screens={cokluAktif ? ekranSeridi : null}
              cols={cols}
              rows={rows}
              /*
               * Bölünmüş seçili ama yeri belli değilse içerik çizilmiyor
               * (bkz. bolunmusDilimler → bos). Tamamını çizmek, öteki
               * ekranlar parça gösterirken tekrar izlenimi veriyordu.
               */
              content={bolunmusDilimler?.get(aktifEkranId)?.bos ? 'led' : content}
              contentUrl={bolunmusDilimler?.get(aktifEkranId)?.bos ? null : contentUrl}
              dilim={
                bolunmusDilimler?.get(aktifEkranId)?.bos
                  ? null
                  : bolunmusDilimler?.get(aktifEkranId) || null
              }
              screenType={screenType}
              resolution={resolution}
              curveAmount={curveAmount}
              showMeasurements={olculerGorunsun}
              /* Küp birleşiminde şerit yerine gerçek kutu çiziliyor. */
              kupKipi={grup?.tip === 'kutu'}
              /*
               * L, U ve açılı da şerit değil: kollar gerçek açısıyla
               * duruyor, yoksa 90°'lik kol yassılıp U, L gibi görünüyor.
               */
              birlesimKipi={
                (grup?.tip === 'l' || grup?.tip === 'u' || grup?.tip === 'acili') &&
                cokluAktif &&
                ekranSeridi.length > 1 &&
                ekranSeridi.every((x) => Number.isFinite(x.yon))
              }
              /* Rozetler de "Ölçüleri gizle" ile kalkıyor. */
              numaraGoster={showMeasurements}
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
              /*
               * Sürükleme tutamağı arka plan varken HER ZAMAN açık; dört köşe
               * hedefi varken kayma köşelere uygulanıyor (bkz. koseTuval).
               */
              /*
               * Konumlandırma kipinde tasarımın sürükleme tutamağı kapalı:
               * o sırada fotoğraf üzerindeki sürükleme KUTUYA ait.
               */
              tutamak={tasimaAcik && !kutuKipi ? etkinTutamak : null}
              yon={surukleAktif && !koseTuval ? mekanYon : null}
              sahneOlcekVarsayilan={sahneOlcekVarsayilan}
              onPxPerM={setCizimOlcek}
              onEkranKutusu={ekranKutuYeriniYaz}
              /*
               * YERİNDE 3B — ARKA PLAN VARKEN TASARIM ÜÇ BOYUTLU.
               *
               * Düz çizim, fotoğrafın üstüne yapıştırılmış bir dikdörtgendi:
               * kasası, derinliği, kenar ışığı yoktu. Katman aynı ekranı 3D
               * görünümdeki geometriyle (CabinetGrid) çiziyor; tuval saydam
               * olduğu için arkada kullanıcının fotoğrafı, üstünde de ölçü
               * etiketleri ve köşe tutamakları çalışmaya devam ediyor.
               *
               * Açıyı sistem uydurmuyor: kullanıcının köşe tutamaklarıyla
               * kurduğu dörtgenden çıkarılıyor (bkz. Mekan3D → acilariCikar).
               *
               * Düz çizim ancak 3B GERÇEKTEN çizildiyse gizleniyor
               * (uc3dHazir); WebGL kapalıysa ya da katman yüklenemezse
               * ekranda hiçbir şey kalmasın.
               */
              /*
               * KALİBRE DUVARDA 2B KATMAN GÖRÜNÜR KALIYOR.
               *
               * Duvarın düzlemi biliniyorsa tasarımın dörtgeni kesin olarak
               * hesaplanıyor (dunyaDortgeni) ve 2B katman onu birebir çiziyor —
               * ölçüldü, 1 piksel içinde tutuyor. 3B katman ise dörtgenden
               * yaklaşık bir duruş (yaw/pitch/roll) türetiyor ve küçük
               * perspektifi yutuyor: kutu 47,7 piksel yamukken tasarım 9,9
               * piksel kalıyor, üstelik açısı 2,6 derece sapıyordu. Ekranda
               * tasarım duvarın düzleminde DURMUYOR gibi görünüyordu.
               */
              /*
               * L KÖŞE KİPİNDE ŞERİT ÇİZİLMİYOR.
               *
               * Burada tek bir şerit ve ona uygulanan TEK bir dörtgen dönüşümü
               * var. Köşede iki ayrı düzlem, yani iki ayrı dönüşüm gerekiyor;
               * tek şeride sığmıyor. Ekranı o kipte LKoseEkran çiziyor.
               */
              /*
               * İŞARETLEME SÜRERKEN TASARIM ÇİZİLMİYOR.
               *
               * Referans noktaları ve köşe çizgisi tam tasarımın durduğu yere
               * konuyor; tasarım ekranda dururken altındaki yeri ne görmek ne
               * de tıklamak mümkün oluyordu. Köşe çizgisi adımında zaten
               * böyleydi, referans adımı için de aynısı geçerli.
               */
              /* Ölçü aracı açıkken tasarım çizilmiyor (bkz. olcuAraciAcik). */
              /* Düz çizim yalnızca 3B GERÇEKTEN çiziliyorken gizleniyor. */
              /*
                Ölçü bitince tasarım çıkıyor: ayrıca bir düğmeye basılması
                beklenmiyor (o düğme akış yenilenirken kalkmıştı ve
                tasarimAcik'ı yazan kimse kalmamıştı).
              */
              ekranGizle={
                (uc3dHazir && uc3dKatmanVar && !duvarDunya) ||
                (tasarimGizli && !olcuTamam) ||
                olcuAraciAcik
              }
              uc3dKatman={
                uc3dKatmanVar
                  ? ({ koseler, genislik, yukseklik }) => (
                      <Suspense fallback={null}>
                        <Mekan3D
                          model={previewModel}
                          cols={cols}
                          rows={rows}
                          content={content}
                          contentUrl={contentUrl}
                          screenType={screenType}
                          lYon={lYon}
                          curveAmount={curveAmount}
                          screens={cokluAktif ? ekranSeridi : null}
                          koseler={koseler}
                          tuvalW={genislik}
                          tuvalH={yukseklik}
                          tasarimWm={tasarimWm}
                          tasarimHm={tasarimHm}
                          onHazir={setUc3dHazir}
                        />
                      </Suspense>
                    )
                  : null
              }
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
            DUVAR IZGARASI — gerçek metre çizgileri.

            Kalibrasyon doğruysa çizgiler duvarın üstüne oturur ve aralıkları
            duvarın perspektifini izler. Bu, ölçünün doğruluğunu gözle
            denetlemenin tek pratik yolu.
          */}
          {izgaraAcik && duvarDunya && scene === 'ozel' && ozelSahne && (
            <Suspense fallback={null}>
              <DuvarIzgara dunya={duvarDunya} tuvalW={tuvalBoyut.w} tuvalH={tuvalBoyut.h} />
            </Suspense>
          )}

          {/*
            TASLAK KUTU — duvarı tanıtan dörtgen.

            Fotoğrafın üstünde duruyor; kullanıcı taşıyıp köşelerinden
            çekerek gerçek duvara oturtuyor. Üstüne tıklayınca tasarım
            kendi ölçüsüyle içine yerleşiyor ve kutu kayboluyor.
          */}
          {/*
            SİHİRBAZ BURADA DEĞİL, SAĞ PANELDE.

            Bir ara fotoğrafın üstünde yüzen bir kart olarak duruyordu;
            tuvalin önemli bir kısmını kapatıp tam da yapılması istenen işi
            (nokta koyma, kutu taşıma) engelliyordu. Tuval artık tamamen
            serbest; sihirbaz sağ panelde (bkz. OlcuSihirbazi).
          */}

          {/*
            REFERANS KATMANI — iki nokta işaretleme.          {/*
            REFERANS KATMANI — iki nokta işaretleme.

            Ölçü kutusunun ÜSTÜNDE duruyor: referans kipi açıkken kutuyu
            yanlışlıkla sürüklemek yerine nokta konmalı.
          */}
          {/*
            L KÖŞE EKRANI — iki duvara oturan iki kanat.

            Yalnızca çizilmiş iç mekânda ve L tipi seçiliyken çiziliyor;
            orada köşe gerçekten var (arka duvarın kenarı) ve yan duvarın
            perspektifi biliniyor. Diğer mekânlarda lKoseGeo null kalıyor ve
            ekran eskisi gibi WallPreview tarafından düz çiziliyor.
          */}
          {/*
            ODAYI FAREYLE ÇEVİRME — yalnızca L tipinde ve çizilmiş mekânda.

            Katman yalnızca o kipte var; başka hiçbir durumda tuvale
            dokunmuyor, dolayısıyla tasarımın kendi sürüklemesini çalmıyor.
          */}
          {lTipiAktif && lCizimMekan && lKoseGeo && (
            <div
              className="absolute inset-0 z-10"
              style={{ cursor: 'ew-resize', touchAction: 'none' }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture?.(e.pointerId)
                const basX = e.clientX
                const bas = lKacisKaymasi
                const tasi = (ev) => setLKacis(bas + (ev.clientX - basX))
                const bitir = () => {
                  window.removeEventListener('pointermove', tasi)
                  window.removeEventListener('pointerup', bitir)
                }
                window.addEventListener('pointermove', tasi)
                window.addEventListener('pointerup', bitir)
              }}
              /* Çift tıklama otomatik açıya döndürüyor. */
            />
          )}

          {/*
            İŞARETLERKEN TASARIM GİZLİ.

            Köşe çizgisi tasarımın tam durduğu yere konuyor; tasarım ekranda
            dururken altındaki köşeyi ne görmek ne de tıklamak mümkün oluyordu.
            Bu adımda katman hiç çizilmiyor — düz şerit de çizilmiyor, çünkü
            lKoseCizimi hâlâ dolu (bkz. ekranGizle). Ölçüler sihirbazda yazılı
            olarak görünmeye devam ediyor; tasarım "Köşeyi kur" ile geri geliyor.
          */}
          {/*
            SEÇİM ÇUBUĞU — birden çok ekran seçiliyken.
            Seçilen ekranlar bir görseli tasarım alanındaki yerlerine göre
            tek resim gibi paylaşabiliyor.
          */}
          {scene === 'ozel' && !olcuAraciAcik && secilenEkranlar.length > 1 && (
            <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#001334]/85 px-3 py-1.5 text-[13px] text-white shadow-lg">
              <span className="opacity-80">{secilenEkranlar.length} {t('ekran.tekil')}</span>
              <button
                type="button"
                onClick={secimiPaylastir}
                className="rounded-full bg-white/15 px-2.5 py-1 font-medium transition-colors hover:bg-white/30"
              >
                {t('secim.gorselEkle')}
              </button>
              <button
                type="button"
                onClick={() => setSecimKumesi([])}
                className="opacity-75 underline underline-offset-2 transition-opacity hover:opacity-100"
              >
                {t('secim.kaldir')}
              </button>
            </div>
          )}

          {/* Çoklu seçim görünmez bir özellik; bir kez söyleniyor. */}
          {shiftIpucu && (
            <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[#001334]/80 px-3 py-1.5 text-[12.5px] text-white shadow-lg">
              {t('secim.ipucu')}
            </div>
          )}

          {/*
            EKRAN NUMARALARI — listedeki satırla fotoğraftaki ekranı eşlemek için.
            Sabitlenenler kendi dörtgeninden, elde duran ekran koseMutlak'tan
            (grup varsa gruptaki yerinden) okunuyor.
          */}
          {showMeasurements && scene === 'ozel' && !refKipi && !lKoseKipi && (
            <EkranNumaralari
              aktifId={aktifEkranId}
              ekranlar={[
                ...sabitEkranlar.map((e, i) => ({
                  id: e.id,
                  sira: e.sira || i + 1,
                  koseler:
                    (grupKoseleri && grupKoseleri.get(e.id)) ||
                    (Array.isArray(e.oran) && e.oran.length === 4 ? e.oran.map(oranTuvale) : null),
                })),
                {
                  id: aktifEkranId,
                  sira: aktifSira,
                  koseler: aktifGrupKose || koseMutlak,
                },
              ].filter((x) => yerSira == null || yerlesmisIdler.includes(x.id))}
            />
          )}

          {/*
            SABİTLENMİŞ EKRANLAR — aynı arka plana konmuş öteki ekranlar.

            Düzenlenmekte olan ekran eskisi gibi WallPreview'de; burada
            yalnızca sabitlenenler var. Üzerine tıklayınca o ekran düzenlemeye
            alınıyor, elde duran da onun yerine sabitleniyor (takas).

            İşaretleme sürerken çizilmiyor: o sırada tuvale yapılan tıklama
            ölçü noktalarına gitmeli.
          */}
          {scene === 'ozel' && !refKipi && !lKoseKipi && (
            <EkEkranlar
              ekranlar={
                grupKoseleri
                  ? sabitEkranlar.map((e) =>
                      grupKoseleri.has(e.id)
                        ? { ...e, oran: grupKoseleri.get(e.id).map(tuvalOrana) }
                        : e,
                    )
                  : sabitEkranlar
              }
              tuvalW={tuvalBoyut.w}
              tuvalH={tuvalBoyut.h}
              cols={cols}
              rows={rows}
              content={content}
              contentUrl={contentUrl}
              /* Ekranın kendi kaydında tip yoksa panelden gelen değerler. */
              model={previewModel}
              resolution={resolution}
              curveAmount={curveAmount}
              oranTuvale={oranTuvale}
              dilimler={bolunmusDilimler}
              secililer={secimKumesi}
              /*
               * İŞARETLEME SÜRERKEN EKRAN SEÇİLMİYOR.
               *
               * Sabit ekranlar tıklanabilir (üstlerine basınca düzenlemeye
               * giriliyor). Ama alan işaretlenirken kullanıcı tam onların
               * köşesine nokta koymak istiyor — uç uca getirmenin yolu bu.
               * O sırada tıklama ekranı seçiyordu ve nokta hiç konmuyordu.
               */
              onSec={
                olcuAraciAcik
                  ? null
                  : (id, shift) => {
                      /* Shift: seçime ekle/çıkar. Düz tıklama: düzenlemeye al. */
                      if (shift) {
                        /*
                         * Tasarım alanındaki seçim ile yerleşim çipleri AYNI
                         * listeyi kullanıyor; iki ayrı seçim kullanıcıyı
                         * hangisinin geçerli olduğunu tahmin etmeye bırakıyordu.
                         */
                        const yeni = grupSecim.includes(id)
                          ? grupSecim.filter((x) => x !== id)
                          : [...grupSecim, id]
                        setGrupSecim(yeni)
                        setSecimKumesi((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))
                        return
                      }
                      setSecimKumesi([])
                      ipucunuGoster()
                      ekraniDuzenle(id)
                    }
              }
            />
          )}

          {lKoseCizimi && !lKoseKipi && !refKipi && (
            <LKoseEkran
              /*
                İşaretleme sürerken taşıma kapalı: o sırada tuvale yapılan
                tıklama köşe noktalarına gitmeli, tasarıma değil.
              */
              onSurukle={!lKoseKipi && !refKipi ? lKoseSurukle : null}
              /* Kısıtlıyken imleç de çizgi boyunca olduğunu söylüyor. */
              surukleImleci={lTasimaSerbest ? 'move' : 'ns-resize'}
              geo={lKoseCizimi}
              tuvalW={tuvalBoyut.w}
              tuvalH={tuvalBoyut.h}
              cols={lEkran?.cols || cols}
              rows={lEkran?.rows || rows}
              content={content}
              contentUrl={contentUrl}
              model={previewModel}
            />
          )}


          {/*
            KABİN KALINLIĞI — tasarımın yan yüzü.

            Yalnızca duvarın düzlemi biliniyorken çiziliyor: orada tasarımın
            dörtgeni kesin (dunyaDortgeni) ve yan yüz doğrudan ondan
            türetiliyor, yerleşime hiç dokunmuyor. Düz bakışta kendiliğinden
            gizleniyor (bkz. KalinlikKatmani).
          */}
          {/*
            TASMA — tasarimin duvarin disinda kalan kismi.

            Olculen alandan buyuk bir tasarim gercek olcusunde ciziliyor ve
            onizleme penceresinden tasip kenarlardan kirpiliyor. Cizim dogru
            ama kirpilmis bir kare genis bir bant gibi gorundugu icin
            kullanicida "oran bozuldu" izlenimi birakiyordu. Tasarim
            kucultulmuyor; yalnizca duvarin disinda kalan bolge taraniyor.
          */}
          {/*
            KÖŞE KİPİNDE ÇİZİLMİYOR.

            Taşma, tasarımın DÜZ dörtgeninden (koseMutlak) hesaplanıyor. Köşede
            ekran o dörtgende değil, iki ayrı düzlemde duruyor; düz dörtgene
            göre taranan bölge ekranla ilgisiz bir yere düşüyor ve ikinci bir
            tasarım gibi görünüyor.
          */}
          {duvarTuval && koseMutlak && !lTipiVar && !refKipi && scene === 'ozel' && ozelSahne && (
            <TasmaKatmani
              tasarim={koseMutlak}
              duvar={duvarTuval}
              tuvalW={tuvalBoyut.w}
              tuvalH={tuvalBoyut.h}
            />
          )}

          {/*
            KÖŞE KİPİNDE ÇİZİLMİYOR — ikinci tasarımın asıl sebebi buydu.

            Kabin gövdesi tasarımın düz dörtgeninden türüyor: tek bir kutu,
            tek bir duruş. Köşede ekran katlı olduğu için o kutu ekranın
            durduğu yerde değil, düz hâlinin durduğu yerde çiziliyor ve
            kullanıcı aynı tasarımı iki kere görüyor. Köşenin kendi gövdesi
            ayrı bir iş (bkz. LKoseEkran).
          */}
          {PANEL.kabinGovdesi && duvarDunya && !tasarimGizli && kabinYuzleri && !lTipiVar && !refKipi && scene === 'ozel' && ozelSahne && (
            <KalinlikKatmani
              yuzler={kabinYuzleri.yuzler}
              on={kabinYuzleri.on}
              tuvalW={tuvalBoyut.w}
              tuvalH={tuvalBoyut.h}
            />
          )}

          {/*
            EKRANI YERLEŞTİRME — DÖRT KÖŞE.

            Sıradaki ekranın duracağı yerin dört köşesi tıklanıyor;
            perspektif oradan geliyor. Katman en üstte: alttaki katmanlar
            tıklamaları yutuyordu.
          */}
          {yerAktif && fotoYer?.genislik > 0 && scene === 'ozel' && ozelSahne && (
            <>
              <div style={{ position: 'absolute', inset: 0, zIndex: 18 }}>
                <ReferansSecici
                  foto={isaretFoto}
                  olcek={isaretZoom}
                  onKaydir={isaretKaydir}
                  noktalar={yerNokta}
                  onDegis={yerNoktaDegisti}
                  enCokNokta={4}
                  tuvalW={tuvalBoyut.w}
                  tuvalH={tuvalBoyut.h}
                  sinir={fotoSinir}
                  /*
                   * YERLEŞMİŞ EKRANLARIN KÖŞELERİNE YAPIŞMA.
                   *
                   * İkinci ekranı birincinin kenarına denk getirmek göz
                   * kararıyla yapılınca arada birkaç piksellik boşluk ya da
                   * üst üste binme kalıyordu. Konan köşeler yakındaki
                   * köşeye yapışıyor; hizalama elle uğraşmadan tutuyor.
                   */
                  yapiskanNoktalar={Object.values(yerKoseRef.current).flat()}
                />
              </div>
            </>
          )}

          {refKipi && fotoYer?.genislik > 0 && scene === 'ozel' && ozelSahne && (
            <ReferansSecici
              /* 2.1 — büyüteç, kenara/köşeye yapışma, yakınlaştırma. */
              foto={isaretFoto}
              kenaraYapis={kenaraYapis}
              olcek={isaretZoom}
              onKaydir={isaretKaydir}
              noktalar={refNokta.map(oranTuvale)}
              onDegis={refNoktaDegisti}
              enCokNokta={refTur === 'dortgen' ? 4 : 2}
              tuvalW={tuvalBoyut.w}
              tuvalH={tuvalBoyut.h}
              /*
               * Rozetteki piksel sayısı ölçeğe giren sayı olmalı: tuval
               * pikseli değil, fotoğrafın kendi çözünürlüğündeki piksel.
               * Çarpan ikisi arasındaki oran — fotoğraf tuvale en-boy oranı
               * korunarak oturduğu için tek bir sayı iki eksen için de geçerli.
               */
              gorselCarpani={
                ozelSahne?.kaynak?.w > 0 && fotoYer?.genislik > 0
                  ? ozelSahne.kaynak.w / (fotoYer.genislik * (sahneYakinlik || 1))
                  : 1
              }
              /* Kısa referans uyarısı artık aynı birimde: görsel pikseli. */
              enAzPiksel={EN_AZ_PIKSEL}
              /* İşaretler fotoğrafın dışına çıkamıyor. */
              sinir={fotoSinir}
              /*
               * Tuvalin üstünde yönerge şeridi YOK.
               *
               * Bir ara "Bilinen uzunluğun BİRİNCİ ucuna tıklayın" diye koyu
               * bir şerit çiziliyordu; fotoğrafın üstünü kapatıyordu ve aynı
               * bilgi zaten sağ paneldeki adım kartında yazıyor. Tuvalin içi
               * temiz kalıyor.
               */
            />
          )}

          {/*
            İŞARETLENEN ALANIN SINIRI — işaretleme bittikten sonra da duruyor.

            Alan onaylanınca çizgiler kayboluyordu; tasarımın oraya oturup
            oturmadığını görmenin bir yolu kalmıyordu. İnce kesik bir çizgi
            olarak kalıyor: hem kullanıcı hizayı gözüyle denetleyebiliyor hem
            de bir sapma varsa nerede olduğu görünüyor. Fareyi hiç görmüyor.
          */}
          {alanTuval &&
            !alanKipi &&
            /* Tutamaklar varken seçicinin kendi dörtgeni çiziliyor; ikisi üst üste gelmesin. */
            !alanTutamaklari &&
            !refKipi &&
            !lKoseKipi &&
            /* Gizlenmişse yalnızca düzenleme sırasında görünüyor. */
            (!cizgiGizli || olcuAcik) &&
            scene === 'ozel' &&
            ozelSahne && (
            <svg
              className="absolute inset-0"
              width={tuvalBoyut.w}
              height={tuvalBoyut.h}
              style={{ pointerEvents: 'none', zIndex: 12 }}
            >
              <polygon
                points={alanTuval.map((k) => `${k.x},${k.y}`).join(' ')}
                fill="none"
                stroke="#ff8a3d"
                strokeWidth="1.5"
                strokeDasharray="7 5"
                opacity="0.9"
              />
            </svg>
          )}

          {/*
            ALAN İÇİNDE TAŞIMA KATMANI.

            Tasarımın kendi dörtgeninin üstünde duran saydam bir yüzey;
            yalnızca işaretlenmiş bir alan varken ve hiçbir işaretleme kipi
            açık değilken. Sürükleme alanın birim karesinde hesaplanıyor,
            dolayısıyla ekran alanın dışına çıkamıyor.
          */}
          {alanTuval &&
            !alanKipi &&
            !refKipi &&
            !lKoseKipi &&
            !koseKipi &&
            scene === 'ozel' &&
            ozelSahne &&
            Array.isArray(koseMutlak) &&
            koseMutlak.length === 4 &&
            (() => {
              const enPx = Math.hypot(koseMutlak[1].x - koseMutlak[0].x, koseMutlak[1].y - koseMutlak[0].y)
              const boyPx = Math.hypot(koseMutlak[3].x - koseMutlak[0].x, koseMutlak[3].y - koseMutlak[0].y)
              if (!(enPx > 2) || !(boyPx > 2)) return null
              const d = koseDonusumu(enPx, boyPx, koseMutlak)
              if (!d) return null
              return (
                <div
                  onPointerDown={alanIcindeSurukle}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: enPx,
                    height: boyPx,
                    transform: d,
                    transformOrigin: '0 0',
                    cursor: 'move',
                    touchAction: 'none',
                    zIndex: 11,
                  }}
                />
              )
            })()}

          {/*
            YERLEŞİM ALANI SEÇİCİ — dört nokta.

            Referans seçiciyle aynı bileşen; ayrı bir araç yazmak aynı
            davranışı (sürüklenebilir işaretler, fotoğrafın dışına çıkmama)
            ikinci kez yazmak olurdu.
          */}
          {/* İKİNCİ REFERANS — iki nokta, ilkiyle aynı araç. */}
          {ref2Kipi && fotoYer?.genislik > 0 && scene === 'ozel' && ozelSahne && (
            <ReferansSecici
              /* 2.1 — büyüteç, kenara/köşeye yapışma, yakınlaştırma. */
              foto={isaretFoto}
              kenaraYapis={kenaraYapis}
              olcek={isaretZoom}
              onKaydir={isaretKaydir}
              noktalar={ref2Nokta.map(oranTuvale)}
              onDegis={(tuvalNoktalari) => setRef2Nokta(tuvalNoktalari.map(tuvalOrana))}
              enCokNokta={2}
              tuvalW={tuvalBoyut.w}
              tuvalH={tuvalBoyut.h}
              sinir={fotoSinir}
            />
          )}

          {/*
            KENARDAN KÖŞE — iki kenar, dört nokta, kesişim.
            Kendi seçicisiyle çiziliyor; alan seçicisi bu sırada kapalı ki
            tıklamalar karışmasın.
          */}
          {/*
            ALANIN KENAR ÇİZGİLERİ.

            Tek tip tutamak: çizgilerin uçları. Ayrı bir köşe tutamağı yok —
            köşeler çizgilerin kesişimi, kendileri çekilmiyor. Düzenlemede de
            aynı araç açılıyor, dolayısıyla kullanıcı iki ayrı tutamak takımı
            arasında seçim yapmak zorunda kalmıyor.
          */}
          {/* KENAR ÇİZİMİ — yalnızca köşe görünmediğinde açılan alt kip. */}
          {alanKipi && alanKenarKipi && fotoYer?.genislik > 0 && scene === 'ozel' && ozelSahne && (
            <ReferansSecici
              foto={isaretFoto}
              kenaraYapis={kenaraYapis}
              olcek={isaretZoom}
              onKaydir={isaretKaydir}
              kenarCizim
              /* İki kenar = dört nokta; kesişimleri aranan köşe. */
              enCokNokta={4}
              kesisimNoktasi={kenarKesisimi}
              noktalar={alanCizgi.map(oranTuvale)}
              onDegis={kenarCizgileriDegisti}
              yapiskanNoktalar={yapiskanNoktalar}
              tuvalW={tuvalBoyut.w}
              tuvalH={tuvalBoyut.h}
            />
          )}

          {/* KÖŞE SEÇME — varsayılan yol. */}
          {(alanKipi || alanTutamaklari) && !alanKenarKipi && fotoYer?.genislik > 0 && scene === 'ozel' && ozelSahne && (
            <ReferansSecici
              /* 2.1 — büyüteç, kenara/köşeye yapışma, yakınlaştırma. */
              foto={isaretFoto}
              kenaraYapis={kenaraYapis}
              olcek={isaretZoom}
              onKaydir={isaretKaydir}
              /* Alan köşelerinde ölçü de anlık: sürüklerken panele bakmaya gerek yok. */
              olcuYazi={
                alanOlculenCm
                  ? Math.round(alanOlculenCm.enCm) + ' × ' + Math.round(alanOlculenCm.boyCm) + ' cm'
                  : null
              }
              enCokNokta={4}
              noktalar={alanNokta.map(oranTuvale)}
              onDegis={(tuvalNoktalari) => {
                /*
                 * DÜZENLEMEDE DÖRTGEN BÜKÜLEMİYOR.
                 *
                 * Tek köşe serbestçe oynatılınca dörtgen bir dikdörtgenin
                 * görüntüsü olmaktan çıkıyor ve ölçü anlamsız bir yere
                 * atlıyordu. Duvarın düzlemi ilk işaretlemede belli; köşe
                 * çekilince o düzlemde yeni bir DİKDÖRTGEN kuruluyor:
                 * çekilen köşenin karşısı sabit kalıyor, öteki iki köşe
                 * kendiliğinden kayıyor. İlk işaretleme serbest.
                 */
                if (alanTutamaklari && tuvalNoktalari.length === 4 && alanNokta.length === 4) {
                  const eski = alanNokta.map(oranTuvale)
                  let hangi = -1
                  let sayi = 0
                  for (let k = 0; k < 4; k++) {
                    const q = tuvalNoktalari[k]
                    if (!q || !eski[k]) continue
                    if (Math.hypot(q.x - eski[k].x, q.y - eski[k].y) > 0.5) {
                      hangi = k
                      sayi++
                    }
                  }
                  const odak =
                    fotoOdak > 1
                      ? fotoOdak
                      : fotoYer?.genislik > 0
                        ? fotoYer.genislik * (sahneYakinlik || 1) * 0.785
                        : 0
                  if (sayi === 1 && odak > 1) {
                    const yeniKose = dikdortgeneOtur(
                      eski,
                      oranTuvale({ x: 0.5, y: 0.5 }),
                      odak,
                      hangi,
                      tuvalNoktalari[hangi],
                    )
                    if (yeniKose) {
                      setAlanNokta(yeniKose.map(tuvalOrana))
                      return
                    }
                  }
                }
                setAlanNokta(tuvalNoktalari.map(tuvalOrana))
              }}
              tuvalW={tuvalBoyut.w}
              tuvalH={tuvalBoyut.h}
              /*
               * SINIR FOTOĞRAF DEĞİL TUVAL.
               *
               * Köşe kadrajın dışında kalabiliyor (kenarlardan bulunan kesişim
               * çoğu zaman öyle). Fotoğrafa kilitlenirse köşe yanlış yere
               * oturuyordu. Hesap görüntü düzleminde çalıştığı için pikselin
               * fotoğrafın içinde olması gerekmiyor.
               */
            />
          )}

          {/*
            KÖŞE ÇİZGİSİ SEÇİCİ — yalnızca L tipinde, kendi fotoğrafında.

            Referans seçiciyle aynı bileşen: iki nokta, sürüklenebilir, fotoğrafın
            dışına çıkamıyor. Ayrı bir araç yazmak aynı davranışı ikinci kez
            yazmak olurdu.
          */}
          {lKoseKipi && fotoYer?.genislik > 0 && scene === 'ozel' && ozelSahne && (
            <ReferansSecici
              /* 2.1 — büyüteç, kenara/köşeye yapışma, yakınlaştırma. */
              foto={isaretFoto}
              kenaraYapis={kenaraYapis}
              olcek={isaretZoom}
              onKaydir={isaretKaydir}
              noktalar={lKoseNokta.map(oranTuvale)}
              onDegis={(tuvalNoktalari) => setLKoseNokta(tuvalNoktalari.map(tuvalOrana))}
              enCokNokta={2}
              tuvalW={tuvalBoyut.w}
              tuvalH={tuvalBoyut.h}
              gorselCarpani={
                ozelSahne?.kaynak?.w > 0 && fotoYer?.genislik > 0
                  ? ozelSahne.kaynak.w / (fotoYer.genislik * (sahneYakinlik || 1))
                  : 1
              }
              sinir={fotoSinir}
            />
          )}

          {/*
            ÖLÇÜ KUTUSU — tasarımın yerleşeceği alan.

            Dört köşesinden serbestçe ayarlanıyor: fotoğraftaki duvara gözle
            oturtuluyor, gerekirse perspektif veriliyor. Bu ayar kutunun
            GERÇEK ölçüsünü değiştirmiyor — o, panele yazılan santimetredir.
          */}
          {/*
            DÜZENLEME KAPALIYKEN KUTU ÇİZİLMİYOR.

            Kutunun işi duvarı tanıtmak; tanıttıktan sonra müşteriye
            gösterilecek karenin üstünde çizgi bırakmasının anlamı yok.
            Bir ara bu yapılmış ama geri alınmıştı: o zaman kutu olmayınca
            Düzenle bölümü de boşalıyor ve kullanıcı araçları kaybediyordu.
            O sebep ortadan kalktı (Düzenle artık kutu yokken de ölçü alanı
            ve kurma düğmesi gösteriyor), dolayısıyla kutu yalnızca sihirbaz
            ya da Düzenle açıkken çiziliyor.
          */}
          {/*
            TEK TAKIM KÖŞE TUTAMAĞI.

            Alan işaretlendiğinde fotoğrafta İKİ takım tutamak oluyordu:
            alanın dört köşesi ve kutunun dört köşesi. İkisi birbirinin
            üstüne biniyor, hangisinin ne yaptığı anlaşılmıyordu. Alan
            varsa tasarım zaten onun içine kendiliğinden oturuyor
            (bkz. alanaYerlestir); kutuyu ayrıca köşesinden ayarlamaya
            gerek yok. Serbest yerleştirmede alan yok, dolayısıyla orada
            kutunun tutamakları tek takım olarak duruyor.
          */}
          {taslakKutuAcik && (
            <TaslakKutu
              koseler={taslakKutu.map(oranTuvale)}
              tuvalW={tuvalBoyut.w}
              tuvalH={tuvalBoyut.h}
              onKose={olcuKutusuDegisti}
              /*
               * KONUMLANDIRIRKEN TIKLAMA TASARIMI AÇMIYOR.
               *
               * Kutuya tıklamak bir ara "tasarımı göster" demekti. Ama
               * konumlandırma kipinde kullanıcı kutuyu TUTMAK için tıklıyor;
               * sürüklemeden önceki o tıklama kipi kapatıyor ve kutu bir daha
               * sürüklenemiyordu — sağdaki düğmeye basmak gerekiyordu.
               *
               * Tasarımı açmanın yeri artık 4. adımdaki "Bitir ve tasarımı
               * göster" düğmesi. Kip kapalıyken kutu zaten soluk ve tıklanamaz
               * olduğu için bu kanca hiç gerekmiyor.
               */
              /*
               * Kip kapalıyken kutu SOLUK ve köşeleri KAPALI: gövdesi
               * pointerEvents almıyor, tutamakları hiç çizilmiyor. Böylece
               * tasarımı taşırken kutunun açısı yanlışlıkla bozulamıyor.
               */
              soluk={!kutuKipi}
              /*
               * Düzlem kipinde köşe tutamağı yok: perspektif düzlemden
               * geliyor, köşeyi elle çekmek o bilgiyi bozardı. Kutu yalnızca
               * taşınıyor ve taşındıkça perspektifi kendiliğinden düzeliyor.
               */
              koseKapali={!kutuKipi || !!refDuzlem}
              /* Taşıma kipinde açı, eğim kipinde yer yanlışlıkla bozulamıyor. */
              /*
               * Düzenleme açıkken taşıma da eğim de açık: kullanıcı iki ayrı
               * düğme arasında gidip gelmek istemiyor, tek kip yetiyor.
               */
              tasimaAcik={kutuKipi}
              egimAcik={kutuKipi}
              /*
               * Perspektif tutamağı yalnızca iki nokta kipinde: düzlem
               * kipinde perspektif ölçülmüş durumda, elle çevirmek o ölçümü
               * bozardı.
               */
              onDurus={refDuzlem ? null : kutuDurusunuCevir}
              onDurusBasla={kutuDurusuBasladi}
              /* Kutu da tutamakları da fotoğrafın içinde kalıyor. */
              sinir={fotoSinir}
              /*
               * YÖNERGE FOTOĞRAFIN ÜSTÜNDE DEĞİL, PANELDE.
               *
               * "Taşı · köşelerden açı ver…" şeridi kutunun üstünde
               * duruyordu ve tam da bakılmak istenen yeri kapatıyordu.
               * Aynı cümle 4. adım kartında yazıyor (sih.4.aciklama).
               */
              etiket={tasarimGizli ? t('kutu.tiklaGoster') : null}
            />
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
          {/*
            ÖLÇÜLER GİZLİYKEN YERLEŞİM KATMANLARI DA GİZLİ.

            "Ölçüleri gizle" temiz bir görüntü almak için kullanılıyor —
            ekran görüntüsü, PDF, müşteriye gösterme. Ölçü etiketleri gidip
            köşe tutamakları ve aday kareler ekranın üstünde kalınca amaç
            gerçekleşmiyordu.
          */}
          {showMeasurements && !koseKipi && adayTuval && (
            <AdaySecici
              adaylar={adayTuval}
              tuvalW={tuvalBoyut.w}
              tuvalH={tuvalBoyut.h}
              onSec={(a) => adayiUygula(adaylar[adayTuval.indexOf(a)])}
            />
          )}



          {/*
            KÖŞELERDEN AYARLA = DUVARI KALİBRE ET.

            Önce ekranın kendi dörtgenini düzenliyordu; ekran duvardan bağımsız
            eğilebiliyor, ölçü sistemiyle ilişkisi kopuyordu. Artık düzenlenen
            şey DUVAR: kullanıcı dört köşeyi fotoğraftaki duvara oturtuyor,
            ekran da duvarın koordinat sisteminden kendiliğinden doğru yere ve
            doğru perspektife düşüyor.

            Duvar ölçüsü bilinmiyorsa (hazır mekânlar) eski davranış duruyor.
          */}
          {showMeasurements && koseKipi && (duvarOlcu ? duvarTuval : koseMutlak) && (
            <KoseSecici
              koseler={duvarOlcu ? duvarTuval : koseMutlak}
              onDegis={koseleriTasi}
              tuvalW={tuvalBoyut.w}
              tuvalH={tuvalBoyut.h}
              /* Köşeler fotoğrafın dışına çıkamıyor. */
              sinir={fotoSinir}
            />
          )}
          </div>

        </main>

        {/*
          BETA DAVET KAPISI — yalnızca sunucu kod istediğinde açılır.
          Kod doğrulanınca 24 saatlik misafir jetonu oturuma yazılıyor ve
          kullanıcı kaldığı yerden devam ediyor.
        */}
        {/*
          ÖLÇÜ SORUSU — küçük pop-up.

          Karar anı burada: yerleşim yeni uygulandı. Panelde de aynı seçim
          kalıcı duruyor, yani pop-up kapandıktan sonra fikir değiştirmek
          mümkün.
        */}
        {olcuSorusu && secilenYuzeyOlcu && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[#001334]/45 p-4"
            onClick={() => setOlcuSorusu(false)}
          >
            <div
              className="w-full max-w-[340px] rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_18px_50px_-18px_rgba(0,19,52,0.45)] dark:border-[#2c333f] dark:bg-[#161a21]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="m-0 text-[15.5px] font-bold text-neutral-900 dark:text-neutral-50">
                {t('scene.fitAsk')}
              </h3>
              <div className="mt-2.5 rounded-lg bg-neutral-50 px-3 py-2.5 dark:bg-[#1b2029]">
                <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-neutral-400 dark:text-neutral-500">
                  {t('scene.fitAskDetail')}
                </div>
                <div className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
                  {secilenYuzeyOlcu.wm.toFixed(2).replace('.', ',')} ×{' '}
                  {secilenYuzeyOlcu.hm.toFixed(2).replace('.', ',')} m
                </div>
                <div className="mt-2 text-[11.5px] font-medium uppercase tracking-[0.06em] text-neutral-400 dark:text-neutral-500">
                  {t('scene.fitAskNow')}
                </div>
                <div className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
                  {tasarimWm.toFixed(2).replace('.', ',')} × {tasarimHm.toFixed(2).replace('.', ',')} m
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={olcuyuYuzeyeUydur}
                  className="flex-1 rounded-full bg-brand py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {t('scene.fitApply')}
                </button>
                <button
                  type="button"
                  onClick={() => setOlcuSorusu(false)}
                  className="flex-1 rounded-full border border-neutral-200 py-2.5 text-[14px] font-medium text-neutral-600 transition-colors hover:border-brand hover:text-brand dark:border-[#2c333f] dark:text-neutral-300"
                >
                  {t('scene.fitKeep')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/*
          DUVAR ÖLÇÜSÜ SORUSU — fotoğraftan önce.

          Kullanıcı fotoğrafı seçmeden önce fotoğraftaki duvarın gerçek
          ölçüsünü yazıyor. Onay verilince dosya seçici açılıyor; fotoğraf
          yüklenir yüklenmez taslak kutu bu ölçüyle kuruluyor ve sahnenin
          ölçeği ilk andan itibaren doğru oluyor.
        */}
        <DavetKapisi
          acik={davetAcik}
          onKapat={() => setDavetAcik(false)}
          /* Davet kodu bayi hesabı açıyor: sunucudan gelen rol ve ad kullanılıyor. */
          onJeton={(veri) =>
            setSessionData({
              accessToken: veri.accessToken,
              refreshToken: veri.refreshToken,
              role: veri.role || 'Dealer',
              email: veri.email || null,
              displayName: veri.displayName || 'Bayi',
              firma: veri.companyName || null,
              firmaTelefon: veri.companyPhone || null,
              firmaEposta: veri.companyEmail || null,
              firmaNot: veri.companyNote || null,
            })
          }
        />

        {/*
          yatay-sag: telefon yatayken iki panel TEK kaydırma sütunu olur; normalde
          (dikey telefon / masaüstü) display:contents ile görünmez, yerleşimi
          değiştirmez. Ayrı ayrı kaydırılan iki kutu olduğunda alttaki İletişim /
          PDF bloğu sabit duruyor, panelle birlikte kaymıyordu.
        */}
        <div className="yatay-sag">
        <aside className="yatay-panel yatay-panel-model w-full min-w-0 lg:w-[340px] shrink-0 order-2 lg:order-1 border-t lg:border-t-0 lg:border-r border-neutral-200 dark:border-[#2c333f] px-4 sm:px-6 lg:px-5 py-5 flex flex-col lg:overflow-hidden">
          <Sigdir className="flex flex-col gap-2">
          {/*
            MODEL SEÇİLMEDEN PANEL BOŞ KALMIYOR.

            Panelin bütün blokları modele bağlı olduğu için sol taraf model
            seçilene kadar bomboş duruyordu; kullanıcı nereden başlayacağını
            bilmiyordu. Kart ilk adımı veriyor, altındaki kilitli satırlar da
            sıranın ne olduğunu gösteriyor.
          */}
          {!hasModel && (
            <div className="mb-1 flex flex-col gap-3">
              <div className="rounded-2xl border-2 border-brand bg-brand/5 p-4 dark:bg-brand/10">
                <h2 className="m-0 text-[18px] font-bold tracking-tight">{t('ilk.baslik')}</h2>
                <p className="m-0 mt-1 text-[13.5px] leading-snug text-neutral-600 dark:text-neutral-300">
                  {t('ilk.aciklama')}
                </p>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="mt-3 w-full rounded-full bg-brand px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-dark"
                >
                  {t('ilk.dugme')}
                </button>
                <button
                  type="button"
                  onClick={() => setWizardOpen(true)}
                  className="mt-2 w-full text-[12.5px] font-medium text-brand hover:underline"
                >
                  {t('wiz.entry')}
                </button>
              </div>

              {/* Sonraki adımlar: soluk ve tıklanamaz — yalnızca sırayı anlatıyor. */}
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {[t('ilk.adim2'), t('ilk.adim3'), t('ilk.adim4')].map((ad) => (
                  <li
                    key={ad}
                    className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-neutral-400 dark:border-[#2c333f] dark:bg-[#161a21] dark:text-neutral-500"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0"
                    >
                      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
                      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
                    </svg>
                    <span className="text-[14px] font-semibold">{ad}</span>
                    <span className="ml-auto text-[11.5px] font-normal">{t('ilk.kilit')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/*
            DUVAR BURADA DEĞİL, EKRANIN KARTINDA.

            Panelin en üstünde genel bir "Duvar" kutusu duruyordu; oysa
            duvar ölçüsü her ekranda ayrı tutuluyor (bkz. ayar.duvarW) ve
            ekran değişince kutudaki sayı sessizce değişiyordu. Kullanıcı
            genel bir ayar sanıp seçili ekranın duvarını değiştiriyordu.
          */}

          {/*
            EKRANLAR — TEK SİSTEM, AKORDEON.

            Aynı iş iki ayrı yerde yapılıyordu: üstteki "Çoklu Ekran"
            penceresi ve fotoğraf akışındaki ekran listesi. İkisi birleşti.

            AÇIK SATIR ELDE DURAN EKRANDIR. Ayarları global durumda tutuluyor
            (bkz. ekranAyariAnlik), denetimler de burada BİR KEZ yazılı; bu
            yüzden 2. ya da 3. ekranın ayarı 1. ekrandan eksik kalamıyor.
            Kapalı satıra tıklamak o ekranı ele alıyor (bkz. ekraniDuzenle),
            fotoğraftaki ekrana tıklamak da aynı yola çıkıyor.
          */}
          {hasModel && (
            <div className="mb-1">
              {/*
                BAŞLIK VE EKLEME TEK SATIRDA.

                Ekleme kutusu kutularla aynı boydaydı ve üç ekranda tek
                başına bir satır kaplıyordu; ekranlardan daha çok yer
                tutan bir "artı" anlamsız. Düğme başlığın yanında, normal
                boyda ve marka renginde.
              */}
              <div className="mb-1 flex items-center justify-between gap-2">
                <h2 className="m-0 text-[20px] font-bold tracking-tight">{t('ekran.coklu')}</h2>
                <span data-ekle="1" className="shrink-0">
                  <button
                    type="button"
                    onClick={ekranEkle}
                    disabled={scene === 'ozel' && !koseMutlak}
                    className="rounded-lg bg-brand px-3 py-1.5 text-[14px] font-semibold text-white transition-opacity enabled:hover:opacity-90 disabled:opacity-40"
                  >
                    + {t('ekran.ekle')}
                  </button>
                </span>
              </div>
              {/*
                KARELER — hangisinin hangisi olduğu tek bakışta.
                Satıra sığmayan kutu alt satıra geçiyor; "+ Ekran ekle" de
                aynı boyda ve dizinin sonunda.
              */}
              <ul className="m-0 grid list-none grid-cols-3 gap-1.5 p-0">
                {ekranOzetleri.map((e) => {
                  const secili = icerikHavuzuTam.find((x) => x.id === e.havuzId)
                  /* Birleşik ekranlar burada da bir arada görünsün. */
                  const grupta = !!grup && Array.isArray(grup.uyeler) && grup.uyeler.includes(e.id)
                  return (
                    <li key={e.id || 'aktif'} data-ekran={e.sira} className="m-0 p-0">
                      <button
                        type="button"
                        onClick={() => !e.acik && ekraniDuzenle(e.id)}
                        className={`flex aspect-square w-full flex-col gap-1 rounded-lg p-1.5 text-left transition-colors ${
                          e.acik
                            ? 'border-2 border-brand bg-brand/5 dark:bg-brand/10'
                            : 'border border-neutral-200 hover:border-brand dark:border-[#2c333f]'
                        } ${grupta ? 'ring-2 ring-brand/35' : ''}`}
                      >
                        <span className="relative block w-full flex-1 overflow-hidden rounded border border-neutral-200 dark:border-[#2c333f]">
                          <IcerikOnizleme oge={secili} dilim={e.dilim} oynatImi />
                        </span>
                        <span className="block truncate text-[13px] font-semibold leading-tight text-neutral-800 dark:text-neutral-100">
                          {e.sira}. {t('ekran.tekil')}
                        </span>
                        <span className="block truncate text-[12px] leading-tight tabular-nums text-neutral-500 dark:text-neutral-400">
                          {t(`screen.${e.ayar.screenType || 'flat'}`)} · {e.ayar.cols || 1}×{e.ayar.rows || 1}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              {/*
                AYARLAR — KUTULARIN ALTINDA, SEÇİLİ EKRANA AİT.

                Gövde satırın içinden buraya taşındı; içi değişmedi. Başka
                bir kutuya tıklamak o ekranı ele alıyor (bkz. ekraniDuzenle)
                ve ayarlar kendiliğinden ona geçiyor.
              */}
              {(() => {
                const acik = ekranOzetleri.find((x) => x.acik)
                if (!acik) return null
                /* Gövde satırdan taşındığı gibi duruyor; oradaki adla eşleşsin. */
                const e = acik
                return (
                  <div
                    data-ekran={acik.sira}
                    data-acik="1"
                    className="mt-2 overflow-hidden rounded-lg border-2 border-brand"
                  >
                    <div className="flex items-center gap-2 bg-brand px-2.5 py-1.5 text-white">
                      <span className="flex-1 text-[16px] font-semibold">
                        {acik.sira}. {t('ekran.tekil')}
                      </span>
                      {/* Son ekran kaldırılamaz: tasarımda hiç ekran kalmaması demekti. */}
                      {ekranOzetleri.length > 1 && (
                        <button
                          type="button"
                          onClick={() => ekraniKaldir(acik.id)}
                          aria-label={t('ekran.kaldir')}
                          title={t('ekran.kaldir')}
                          className="shrink-0 rounded-md p-1 text-white/85 transition-colors hover:bg-white/20 hover:text-white"
                        >
                          <CopKutusu />
                        </button>
                      )}
                    </div>
                      <div className="flex flex-col gap-2.5 bg-neutral-100 px-2.5 py-2 dark:bg-[#1b2029]">
                        {/* ---- Tür ---- */}
                        {!isVideoWall && (
                          <div>
                            <div className="mb-1 text-[14px] font-semibold uppercase tracking-[0.06em] text-neutral-500 dark:text-neutral-400">
                              {t('screen.type')}
                            </div>
                            <Segmented
                              cols={3}
                              value={screenType}
                              onChange={setScreenType}
                              options={[
                                { v: 'flat', l: t('screen.flat') },
                                { v: 'curved', l: t('screen.curved') },
                                { v: 'curvedIn', l: t('screen.curvedIn') },
                              ]}
                            />
                            {(screenType === 'curved' || screenType === 'curvedIn') && (
                              <KavisAyari
                                t={t}
                                deger={curveAmount}
                                onChange={setCurveAmount}
                                icbukey={screenType === 'curvedIn'}
                                genislikM={tasarimWm}
                              />
                            )}
                          </div>
                        )}

                        {/*
                          ---- Duvar ----
                          Ekranın durduğu duvar: sütun/satır sınırı,
                          "Duvara sığdır" ve mekân çizimi hep buradan
                          besleniyor. Birleşik grupta tek duvar var;
                          değişiklik bütün üyelere yazılıyor.
                        */}
                        <div>
                          <div className="mb-1 text-[14px] font-semibold uppercase tracking-[0.06em] text-neutral-500 dark:text-neutral-400">
                            {t('wall.heading')}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                            <SayiKutusu
                              etiket={t('wall.width')}
                              deger={width}
                              onChange={duvarEniniYaz}
                              min={widthMin}
                              max={40}
                              adim={0.1}
                              birim="m"
                            />
                            <SayiKutusu
                              etiket={t('wall.height')}
                              deger={height}
                              onChange={duvarBoyunuYaz}
                              min={heightMin}
                              max={20}
                              adim={0.1}
                              birim="m"
                            />
                          </div>
                          {grup && Array.isArray(grup.uyeler) && grup.uyeler.length > 1 && (
                            <p className="mt-1 mb-0 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                              {t('wall.grup')}
                            </p>
                          )}
                        </div>

                        {/* ---- Boyut ---- */}
                        <div>
                          <div className="mb-1 text-[14px] font-semibold uppercase tracking-[0.06em] text-neutral-500 dark:text-neutral-400">
                            {t('screen.boyut')}
                          </div>
                          {/*
                            Sütun ve satır KENDİ kutularında: etiketle sayı
                            aynı satırdayken panel daraldıkça bitişiyor ve
                            + düğmesi dışarı düşüyordu.
                          */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                            <SayiKutusu etiket={t('screen.colsShort')} deger={cols} onChange={setCols} min={1} max={colsMax} />
                            <SayiKutusu etiket={t('screen.rowsShort')} deger={rows} onChange={setRows} min={1} max={rowsMax} />
                            {/* Artış neden durdu: sessiz sınır yerine açık not. */}
                            {(cols >= colsMax || rows >= rowsMax) && (
                              <span className="w-full text-[13px] leading-snug text-amber-600 dark:text-amber-400">
                                {t('olcu.duvarSiniri')}
                              </span>
                            )}
                          </div>

                          {/*
                            YÖN AYRI BİR KARAR DEĞİL.

                            Yatay/dikey, duvara sığdırmanın SONUCU: hangi
                            dizilim boşluksuz sığıp daha çok piksel veriyorsa
                            o seçiliyor (bkz. fitToWall). İki ayrı karar
                            bırakıldığında biri ötekini bozuyordu.
                          */}
                          <button
                            type="button"
                            onClick={fitToWall}
                            className="mt-2 w-full rounded-lg border border-neutral-300 py-1.5 text-[14.5px] font-medium text-neutral-700 transition-colors hover:border-brand hover:text-brand dark:border-[#39414f] dark:text-neutral-300"
                          >
                            {t('conf.fitToWall')}
                          </button>

                          {/*
                            Metre ve piksel ALTTA tek satırda: kullanıcı kabin
                            sayısını değil kurulacak ekranın ölçüsünü soruyor.
                          */}
                          <div className="mt-1 text-[14.5px] tabular-nums text-neutral-600 dark:text-neutral-300">
                            {mYazi(e.enM)} × {mYazi(e.boyM)} m
                            {e.resW > 0 && ` · ${fmt(e.resW)} × ${fmt(e.resH)} piksel`}
                          </div>
                        </div>

                        {/* ---- İçerik ---- */}
                        <div>
                          <div className="mb-1 text-[14px] font-semibold uppercase tracking-[0.06em] text-neutral-500 dark:text-neutral-400">
                            {t('content.heading')}
                          </div>
                          {/*
                            KÜÇÜK RESİMLER VE EKLEME TEK SATIRDA.

                            Kocaman bir önizleme kutusu kartın yarısını
                            kaplıyordu; oysa seçili içerik havuzda zaten
                            halkalı duruyor. Sürükle-bırak satırın kendisinde.
                          */}
                          <div
                            onDragOver={(ev) => {
                              ev.preventDefault()
                              setIcerikSurukle(true)
                            }}
                            onDragLeave={() => setIcerikSurukle(false)}
                            onDrop={(ev) => {
                              ev.preventDefault()
                              setIcerikSurukle(false)
                              dosyayiHavuzaAl(ev.dataTransfer?.files?.[0])
                            }}
                            className={`flex gap-1 overflow-x-auto rounded-lg pb-0.5 ${
                              icerikSurukle ? 'ring-2 ring-brand' : ''
                            }`}
                          >
                            {/* "Resim yok" ayrı bir seçenek değil: kapalı LED zaten o. */}
                            {icerikHavuzuTam
                              .filter((h) => h.id !== 'none')
                              .map((h) => (
                              <span key={h.id} className="relative shrink-0">
                                <button
                                  type="button"
                                  onClick={() => icerikAta(e.id, h.id)}
                                  title={h.ad}
                                  className={`relative block h-8 w-11 overflow-hidden rounded ${
                                    e.havuzId === h.id
                                      ? 'ring-2 ring-brand'
                                      : 'border border-neutral-300 dark:border-[#39414f]'
                                  }`}
                                >
                                  <IcerikOnizleme oge={h} oynatImi />
                                </button>
                                {/* Yüklenen öğe havuzdan çıkarılabiliyor; sabitler duruyor. */}
                                {h.id.startsWith('y') && (
                                  <button
                                    type="button"
                                    onClick={() => havuzdanCikar(h.id)}
                                    aria-label={t('content.havuzCikar')}
                                    title={t('content.havuzCikar')}
                                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-700 text-[11px] leading-none text-white hover:bg-red-600"
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            ))}
                            {/* Ekleme düğmesi küçük resimlerle AYNI satırda. */}
                            <button
                              type="button"
                              onClick={() => havuzInputRef.current?.click()}
                              className="flex h-8 shrink-0 items-center gap-1 rounded border border-dashed border-neutral-300 px-2 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-brand hover:text-brand dark:border-[#39414f] dark:text-neutral-400"
                            >
                              + {t('content.ekleKisa')}
                            </button>
                          </div>

                          {/*
                            PAYLAŞIM NOTU.
                            Görselin bu ekrana nereden geldiğini söylüyor;
                            paylaşımda olmayan ekranda hiç çıkmıyor çünkü
                            söylenecek bir şey yok.
                          */}
                          {paylasimNotu(e.id) && (
                            <div className="mt-1.5 flex items-center gap-2 text-[12.5px] text-neutral-500 dark:text-neutral-400">
                              <span className="min-w-0 flex-1 truncate">{paylasimNotu(e.id).metin}</span>
                              {paylasimNotu(e.id).ayrilabilir && (
                                <button
                                  type="button"
                                  onClick={() => icerikGrubunuAyir(e.id)}
                                  className="shrink-0 underline underline-offset-2 transition-colors hover:text-brand"
                                >
                                  {t('yerlesim.ayir')}
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/*
                          ALAN İŞLERİ.
                          "Alana sığdır" her zaman var: fotoğraf varsa işaretli
                          alana, yoksa duvar ölçüsüne sığdırıyor. "Alanı düzenle"
                          fotoğrafsız sahnede düzenlenecek bir alan olmadığı
                          için gizli.
                        */}
                        {/* Sığdırılacak bir alan yoksa düğmenin yapacağı iş de yok. */}
                        {alanIsaretli && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => tasarimiAlanaSigdir()}
                              className="w-full rounded-lg border border-neutral-300 py-1.5 text-[14.5px] font-medium text-neutral-700 transition-colors hover:border-brand hover:text-brand dark:border-[#39414f] dark:text-neutral-300"
                            >
                              {t('ekran.alanaSigdir')}
                            </button>
                          </div>
                        )}
                      </div>
                  </div>
                )
              })()}

              {/* Havuza yükleme girişi: büyük kutu ve sürükle-bırak buraya basıyor. */}
              <input
                ref={havuzInputRef}
                type="file"
                accept="image/jpeg,image/png,video/mp4,video/webm,video/ogg"
                onChange={havuzaYukle}
                className="hidden"
              />
            </div>
          )}
              {/*
                EKRAN YERLEŞİMİ — birleştirme.

                İki ya da daha çok ekran seçilip duruş biçimi veriliyor;
                ekranlar kenarlarından birleşiyor ve aralarında boşluk
                kalmıyor. Grup liderden TÜRETİLDİĞİ için tek parça taşınıyor
                ve dikiş hiç açılmıyor (bkz. grupKoseleri). "Ayır" grubu
                bozuyor, ekranlar bulundukları yerde kalıyor.

                Birleştirme isteğe bağlı: seçilmeyen ekranlar bağımsız.
              */}
              {/*
                YERLEŞİM HEP AÇIK.

                Ekran kutucukları ve şekil düğmeleri her zaman görünüyor;
                her değişiklik ANINDA uygulanıyor. Önce "şekli seç, sonra
                Birleştir'e bas" iki adımdı ve ilk adım hiçbir şey
                yapmadığı için düğmeler işlevsiz görünüyordu.

                Birleştirecek ikinci bir ekran yoksa bölümün de işi yok.
              */}
              {hasModel && ekranOzetleri.length > 1 && (
                <div className="mt-3 rounded-lg border border-neutral-200 dark:border-[#2c333f] p-2.5">
                  <div className="text-[16px] font-semibold text-neutral-700 dark:text-neutral-200">
                    {t('yerlesim.baslik')}
                  </div>

                  {/*
                    Seçim satırları ekran listesiyle AYNI kaynaktan
                    (ekranOzetleri): küçük resim ve dizilim burada da
                    görünsün, kullanıcı hangi ekranı işaretlediğini
                    sırasından tahmin etmek zorunda kalmasın.
                  */}
                  {/*
                    ÇİP IZGARASI — alt alta onay kutuları paneli uzatıyordu.
                    İki sütun: dört ekran iki satır, altı ekran üç satır.
                    Seçim durumu çipin KENDİSİNDE (dolu mavi), ayrı bir
                    kutucuğa gerek yok.
                  */}
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    {ekranOzetleri.map((e) => {
                      const secili = grupSecim.includes(e.id)
                      return (
                        <button
                          key={e.id ?? 'aktif'}
                          type="button"
                          onClick={() => {
                            const yeni = secili ? grupSecim.filter((x) => x !== e.id) : [...grupSecim, e.id]
                            setGrupSecim(yeni)
                            birlesimiKur(grupTipi, yeni, grupAcisi, lYonSecim)
                          }}
                          className={`flex min-w-0 items-center gap-1.5 rounded-lg border px-1.5 py-1 text-[13.5px] transition-colors ${
                            secili
                              ? 'border-brand bg-brand text-white'
                              : 'border-neutral-300 text-neutral-600 hover:border-brand dark:border-[#39414f] dark:text-neutral-300'
                          }`}
                        >
                          <span className="relative h-5 w-7 shrink-0 overflow-hidden rounded border border-black/15">
                            <IcerikOnizleme
                              oge={icerikHavuzuTam.find((x) => x.id === e.havuzId)}
                              dilim={e.dilim}
                              oynatImi
                            />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-left">
                            {e.sira} · {e.ayar.cols || 1}×{e.ayar.rows || 1}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/*
                    Şekil düğmesi doğrudan işi yapıyor; ayrıca onay istemiyor.
                    Her şeklin kendi en az ekran sayısı var: U üç, küp dört
                    yüzeyden oluşuyor.
                  */}
                  <div className="mt-2 grid grid-cols-5 gap-1">
                    {[
                      { tip: 'duz', enAz: 2 },
                      { tip: 'l', enAz: 2 },
                      { tip: 'u', enAz: 3 },
                      { tip: 'kutu', enAz: 4 },
                      { tip: 'acili', enAz: 2 },
                    ].map(({ tip, enAz }) => (
                      <button
                        key={tip}
                        type="button"
                        /*
                          TİPE BASMAK BİRLEŞTİRİYOR.

                          Düğme önce çip seçmeyi bekliyordu: hiçbir çip
                          seçilmemişken tipe basmak hiçbir şey yapmıyor,
                          kullanıcı da düğmenin bozuk olduğunu sanıyordu.
                          Çip seçilmemişse BÜTÜN ekranlar birleşiyor;
                          seçim varsa yalnızca seçilenler.
                        */
                        disabled={ekranOzetleri.length < enAz}
                        onClick={() => {
                          const secim =
                            grupSecim.length >= enAz ? grupSecim : ekranOzetleri.map((x) => x.id)
                          setGrupTipi(tip)
                          setGrupSecim(secim)
                          birlesimiKur(tip, secim, grupAcisi, lYonSecim)
                        }}
                        title={t('yerlesim.' + tip)}
                        className={`rounded-md py-1.5 text-[13px] font-semibold leading-tight transition-colors disabled:opacity-40 ${
                          grup && grupTipi === tip
                            ? 'bg-brand text-white'
                            : 'border border-neutral-300 text-neutral-600 enabled:hover:border-brand enabled:hover:text-brand dark:border-[#39414f] dark:text-neutral-400'
                        }`}
                      >
                        {t('yerlesim.' + tip)}
                      </button>
                    ))}
                  </div>
                  {/* Eksik olan ne, düğmenin altında yazıyor. */}
                  {grupSecim.length < 4 && (
                    <p className="mt-1.5 mb-0 text-[13px] leading-snug text-red-600 dark:text-red-400">
                      {grupSecim.length < 2
                        ? t('yerlesim.enAzIki')
                        : grupSecim.length < 3
                          ? t('yerlesim.enAzUc') + ' · ' + t('yerlesim.enAzDort')
                          : t('yerlesim.enAzDort')}
                    </p>
                  )}

                  {/*
                    KÖŞE YÖNÜ — oda köşesi mi kolon köşesi mi.
                    İkisi bambaşka görünür; hangisinin kurulacağını
                    ancak kullanıcı bilir.
                  */}
                  {/* Açılı birleşim de yönü kullanıyor: düğmesi artık orada da var. */}
                  {(grupTipi === 'l' || grupTipi === 'u' || grupTipi === 'kutu' || grupTipi === 'acili') && (
                    <div className="mt-2 flex overflow-hidden rounded-lg border border-neutral-300 dark:border-[#39414f]">
                      {['ice', 'disa'].map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => {
                            setLYonSecim(y)
                            birlesimiKur(grupTipi, grupSecim, grupAcisi, y)
                          }}
                          className={`flex-1 px-1 py-1 text-[13.5px] ${
                            lYonSecim === y ? 'bg-brand text-white' : 'text-neutral-600 dark:text-neutral-300'
                          }`}
                        >
                          {t('yerlesim.' + y)}
                        </button>
                      ))}
                    </div>
                  )}

                  {/*
                    BİRLEŞİMLER — her köşenin kendi açısı.

                    Tek bir açı kutusu vardı ve hangi köşeye ait olduğu
                    belli değildi; üç ekranlı bir dizide iki köşeyi farklı
                    açıda kurmak da mümkün değildi.
                  */}
                  {grupTipi === 'acili' && grup && Array.isArray(grup.uyeler) && grup.uyeler.length > 1 && (
                    <div className="mt-2">
                      <div className="mb-1 text-[13.5px] font-semibold uppercase tracking-[0.06em] text-neutral-500 dark:text-neutral-400">
                        {t('eklem.baslik')}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {grup.uyeler.slice(0, -1).map((id, j) => {
                          const solSira = ekranParcalari.find((x) => x.id === id)?.sira ?? j + 1
                          const sagSira =
                            ekranParcalari.find((x) => x.id === grup.uyeler[j + 1])?.sira ?? j + 2
                          const deger = grup.eklemler?.[j]?.aci ?? 135
                          const disinda = !(deger >= 90 && deger <= 180)
                          return (
                            <div key={id} className="flex items-center gap-2">
                              <span className="w-14 shrink-0 text-[14px] font-medium tabular-nums text-neutral-700 dark:text-neutral-200">
                                {solSira} – {sagSira}
                              </span>
                              <input
                                type="number"
                                min="10"
                                max="180"
                                step="1"
                                value={deger}
                                onChange={(e) => {
                                  const v = Number(e.target.value)
                                  setGrup((g) => {
                                    if (!g) return g
                                    const liste = Array.from(
                                      { length: Math.max(0, g.uyeler.length - 1) },
                                      (_, k) => ({ aci: g.eklemler?.[k]?.aci ?? 135 }),
                                    )
                                    liste[j] = { aci: Number.isFinite(v) ? v : 135 }
                                    return { ...g, eklemler: liste }
                                  })
                                }}
                                className="w-20 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-[16.5px] text-neutral-800 outline-none focus:border-brand dark:border-[#39414f] dark:bg-[#232936] dark:text-neutral-200"
                              />
                              <span className="text-[16.5px] text-neutral-500 dark:text-neutral-400">°</span>
                              {disinda && (
                                <span className="text-[12.5px] leading-snug text-amber-600 dark:text-amber-400">
                                  {t('eklem.uyari')}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/*
                    GÖRSEL PAYLAŞIMI VE AYIRMA — HEP GÖRÜNÜYOR.

                    Eskiden yalnızca birleşim kurulduktan sonra beliriyordu;
                    kullanıcı seçeneklerin varlığını ancak bir tipe tıklayınca
                    öğreniyordu. Ekran tipi düğmeleri gibi hep duruyorlar,
                    birleşim yokken sönük ve tıklanamaz.
                  */}
                  <div className="mt-2 flex w-full overflow-hidden rounded-lg border border-neutral-200 dark:border-[#2c333f]">
                    {[true, false].map((v) => (
                      <button
                        key={String(v)}
                        type="button"
                        disabled={!grup}
                        onClick={() => setGrup((g) => (g ? { ...g, tekGorsel: v } : g))}
                        className={`flex-1 px-1 py-1 text-[13.5px] disabled:opacity-40 ${
                          grup && (grup.tekGorsel !== false) === v
                            ? 'bg-brand text-white'
                            : 'text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        {v ? t('icerik.tekGorsel') : t('icerik.ayriGorsel')}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={!grup}
                    onClick={grubuAyir}
                    className="mt-2 w-full rounded-lg border border-neutral-200 py-2 text-[15px] font-medium text-neutral-600 transition-colors enabled:hover:border-brand enabled:hover:text-brand disabled:opacity-40 dark:border-[#2c333f] dark:text-neutral-400"
                  >
                    {t('yerlesim.ayir')}
                  </button>
                </div>
              )}
          {/*
            TOPLAM — tasarımın tamamı tek satırda.

            Teknik Özellikler ve PDF ile AYNI kaynaktan (ekranOzetleri)
            okunuyor; iki yerde ayrı formül tutulmuyor.
          */}
          {hasModel && (
            <div className="rounded-lg border border-neutral-200 dark:border-[#2c333f] px-3 py-2 text-[15px] tabular-nums text-neutral-700 dark:text-neutral-200">
              <span className="font-semibold">{t('panel.toplam')}:</span> {ekranOzetleri.length} {t('ekran.tekil')} ·{' '}
              {fmt(tasarimToplami.kabin)} {birimSozcugu(selectedModel?.productType, t)} · {fmt(tasarimToplami.resW)} × {fmt(tasarimToplami.resH)} piksel
            </div>
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

              {/*
                MEKÂN — ekranın arkasına çizilen oda.
                İçerik ekranın İÇİNE, mekân ekranın ARKASINA gider; ikisi
                birbirinden bağımsız seçilir, o yüzden ayrı bir başlık altında.
              */}
              <div className="mb-2">
                {/*
                  Mekân seçimi ölçü akışı sürerken gizli: akışın ortasında
                  mekânı değiştirmek yapılan işi çöpe atardı.
                */}
                {!olcuAcik && (
                  <>
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
                      /* Fotoğraf henüz yokken de listede: seçmek dosya seçiciyi açıyor. */
                      { id: 'ozel', ad: 'scene.custom' },
                      { id: 'none', ad: 'scene.customOff' }].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setScene(s.id)
                          /*
                           * "Kendi fotoğrafım" seçildi ama ortada fotoğraf yok:
                           * kullanıcıdan ayrıca bir düğme aramasını istemek
                           * yerine dosya seçici doğrudan açılıyor.
                           */
                          if (s.id === 'ozel' && !ozelSahne) ozelDosyaRef.current?.click()
                        }}
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
                  </>
                )}

                {/*
                  L KÖŞESİ — MEKÂN SEÇİMİNİN YANINDA.

                  Köşe seçimi bir EKRAN ayarı değil, bir YERLEŞİM kararı:
                  ekran mekânın hangi köşesine kuruluyor. Bu yüzden yeri
                  mekân bölümü. Yalnızca L tipi seçiliyken görünüyor; başka
                  hiçbir ekran türünde panel değişmiyor.
                */}
                {/* Mekân seçilmeden köşe kararı anlamsız: hangi mekânın köşesi? */}
                {PANEL.lKoseTarafi && lTipiAktif && scene !== 'none' && (
                  <div className="mt-2">
                    <div className="mb-1 text-[15px] font-semibold text-neutral-600 dark:text-neutral-400">
                      {t('screen.lKoseBaslik')}
                    </div>
                    <Segmented
                      cols={3}
                      value={lKose}
                      onChange={setLKoseSecim}
                      options={[
                        { v: 'sol', l: t('screen.lKoseSol') },
                        { v: 'orta', l: t('screen.lKoseOrta') },
                        { v: 'sag', l: t('screen.lKoseSag') },
                      ]}
                    />
                    {/*
                      OTOMATİK SEÇİM GÖRÜNÜR OLUYOR.

                      Seçim kendiliğinden yapıldıysa bunun söylenmesi gerekiyor;
                      yoksa kullanıcı düğmenin neden o tarafta durduğunu bilmiyor.
                      Elle değiştirildiyse geri dönüş yolu duruyor.
                    */}
                    {scene === 'ozel' && ozelSahne && lKoseNokta.length === 2 && (
                      <div className="mt-1 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                        {lKoseSecim == null ? (
                          <span>
                            {t('screen.lKoseOto')}{' '}
                            {lKoseOtomatik === 'sag' ? t('screen.lKoseOtoSag') : t('screen.lKoseOtoSol')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setLKoseSecim(null)}
                            className="text-brand hover:underline"
                          >
                            {t('screen.lKoseOtoDon')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

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
                {/*
                  Fotoğrafı değiştirmek akışın ortasında yapılacak iş değil;
                  hazır mekânda ya da mekânsız çalışırken ise değiştirilecek
                  bir fotoğraf yok.
                */}
                {!olcuAcik && scene === 'ozel' && (
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
                )}

                {/*
                  TASARIMI ALANA SIĞDIR — bir adımın içinde saklı değil.
                  Fotoğrafta alan işaretlendiği anda yapılacak ilk iş bu;
                  menü arkasında durunca kimse bulamıyordu.
                */}
                {alanIsaretli && !olcuAcik && (
                  <button
                    type="button"
                    onClick={() => tasarimiAlanaSigdir()}
                    className="mt-2 w-full rounded-lg bg-brand px-4 py-2.5 text-[16px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    {t('ekran.alanaSigdir')}
                  </button>
                )}

                {/*
                  ÇEKİM MESAFESİ ARTIK AYRI BİR ALAN DEĞİL.

                  Kendi fotoğrafında ölçeği belirleyen tek sayı vardı ama iki
                  yerde soruluyordu: burada "fotoğraf kaç metreden çekildi",
                  aşağıda da "izleme mesafesi". İkisi de aynı şeyi anlatıyor —
                  kamera ile ekran arasındaki uzaklık. Bu alan kaldırıldı,
                  değer aşağıdaki MESAFE alanından alınıyor.
                */}
                {scene === 'ozel' && ozelSahne && (
                  <div className="mt-2 border border-neutral-200 dark:border-[#2c333f] rounded-lg p-2.5">
                    {/*
                      YERLEŞİM DENETİMLERİ — iş sırasına göre.

                      Önce tek tuşla en iyi yer (birincil, dolu buton),
                      altında iki yardımcı yan yana: başka yerleri görmek
                      ve köşelerden elle ayarlamak. Sıfırlama en altta ve
                      yalnızca gerçekten bir düzenleme varken görünüyor.
                      Önceden dördü de aynı görünümde alt alta duruyordu;
                      hangisinin ana iş olduğu belli olmuyordu.
                    */}
                    {/*
                      DUVAR ÖLÇÜSÜ ÖNCE SORULUYOR.

                      Öneri üretimi kalktı: ölçeği tahmin etmek yerine
                      kullanıcıya soruyoruz. Duvarın gerçek eni ve boyu
                      girilince fotoğrafın ortasına o oranda bir taslak kutu
                      konuyor ve sahnenin ölçeği o andan itibaren biliniyor.
                      Kullanıcı kutuyu köşelerinden gerçek duvara oturtuyor.
                    */}
                    {/*
                      ÖLÇÜ KUTUSU — fotoğraftaki yerleşim alanı.
                    
                      Bir ara bu bölüm fotoğraftan gerçek santimetre çıkarmaya çalışıyordu
                      (referans nesne + homografi kalibrasyonu). O yol kaldırıldı: tek bir
                      fotoğraftan gerçek ölçü çıkarmak matematiksel olarak mümkün değil ve
                      kullanıcıya her seferinde fazladan bir iş yüklüyordu.
                    
                      Yeni kural basit: alanın gerçek ölçüsünü KULLANICI yazar. Fotoğraftaki
                      kutu yalnızca görsel yerleşim ve perspektif alanıdır; köşelerinden
                      serbestçe ayarlanır ve bu ayar fiziksel ölçüyü DEĞİŞTİRMEZ.
                    */}
                    {TASLAK_KIPI && (
                      <>
                        {kutuMesaj && (
                          <p className="mb-1 mt-0 text-[13px] leading-snug text-amber-600 dark:text-amber-400">
                            {kutuMesaj}
                          </p>
                        )}
                        {/*
                          SAĞ PANEL: SİHİRBAZ ya da ÖZET.
                        
                          Akış sürerken adım kartı burada duruyor; bitince yerini o anki durumun
                          özetine ve üç eyleme bırakıyor. Ayarların ikinci bir kopyası yok —
                          bir ara hem panelde hem kartta aynı alanlar vardı ve hangisinin
                          geçerli olduğu belirsizdi.
                        */}
                        {sihirbazAdim > 0 || alanKipi ? (
                          <div className={olcuPencereSinifi}>
                          <OlcuSihirbazi
                            adim={sihirbazAdim}
                            t={t}
                            refNoktaSayisi={refNokta.length}
                            /* Yerleştir adımının ana düğmesi. */
                            onYerOnayla={yerAktif ? yerEkraniOnayla : null}
                            yerOnayHazir={yerNokta.length === 4}
                            yerYonerge={yerAktif ? t('yer.ekran').replace('{0}', String(yerEkran?.sira ?? yerSira + 1)) : ''}
                            yerSayac={yerAktif ? t('yer.kose').replace('{0}', String(yerNokta.length)) : ''}
                            yerListe={ekranParcalari.map((x, i) => ({
                              id: x.id,
                              sira: x.sira,
                              yerlesti: yerlesmisIdler.includes(x.id),
                              aktif: yerSira === i,
                            }))}
                            onYerSec={yerEkraniSec}
                            onIsaretle={() => {
                              setRefNokta([])
                              setRefKipi(true)
                            }}
                            refUzunlukCm={refUzunlukCm}
                            setRefUzunlukCm={setRefUzunlukCm}
                            refOlcek={refOlcek}
                            refPxCm={refPxCm}
                            refAci={refAci}
                            refTur={refTur}
                            setRefTur={(tur) => {
                              setRefTur(tur)
                              setRefNokta([])
                              setRefKipi(true)
                            }}
                            refBoyCm={refBoyCm}
                            setRefBoyCm={setRefBoyCm}
                            refDuzlem={refDuzlem}
                            refAciKullan={refAciKullan}
                            setRefAciKullan={setRefAciKullan}
                            kutuEn={kutuEn}
                            setKutuEn={setKutuEn}
                            kutuBoy={kutuBoy}
                            setKutuBoy={setKutuBoy}
                            kutuMesaj={kutuMesaj}
                            /* L tipinde 3. adım kutu değil köşe çizgisi. */
                            lKose={lYerlesimKipi}
                            lKoseNoktaSayisi={lKoseNokta.length}
                            lKoseBoyCm={lKoseBoyCm}
                            setLKoseBoyCm={setLKoseBoyCm}
                            lKoseKabinSolCm={lKabinGenislik.sol}
                            lKoseKabinSagCm={lKabinGenislik.sag}
                            lKoseIsaretle={() => {
                              setLKoseNokta([])
                              setLKoseKayma({ x: 0, y: 0 })
                              setLSolUst(0)
                              setLSolAlt(0)
                              setLSagUst(0)
                              setLSagAlt(0)
                              setLKoseKipi(true)
                            }}
                            lKoseOran={lKoseOran}
                            lKoseDikMi={lKoseDikMi}
                            onGeri={sihirbazGeri}
                            onIleri={sihirbazIleri}
                            onKutuKur={sihirbazKutuKur}
                            onBitir={sihirbazBitir}
                            onKapat={sihirbaziKapat}
                            /*
                             * ÇEKİM MESAFESİ ARTIK KİLİTLİ DEĞİL.
                             *
                             * Kutu kurulduktan sonra kilitlenmesinin sebebi, mesafenin o
                             * noktadan sonra ölçeği değiştirmesiydi — ölçek referanstan
                             * geldiği için mesafe işsiz kalmış, kilit de anlamını
                             * yitirmişti. Şimdi mesafenin gerçek bir işi var:
                             * perspektifin sertliğini belirliyor (bkz. durusKutusu.js),
                             * yani kameranın kutudan ne kadar uzakta durduğunu. Ölçüye
                             * hâlâ dokunmuyor, bu yüzden serbest bırakmak güvenli.
                             */
                            mesafeM={izlemeMesafesi}
                            onMesafe={setIzlemeM}
                            mesafeKilitli={false}
                            onEgim={egimDugmesiVar ? kutuEgiminiCevir : null}
                            egimVar={egimVar}
                            /*
                             * İKİNCİ REFERANS — ölçüm tahmine dayanıyorsa teklif ediliyor.
                             */
                            /*
                             * ÖLÇÜM KALİBRE Mİ.
                             *
                             * Uyarı yalnızca "tek kaçış noktası" durumuna
                             * bağlıydı; oysa perspektif hesabı hiç çıkmadığında
                             * (dörtgen bir dikdörtgenin görüntüsü değilse ya da
                             * yüzey karşıdan görünüyorsa) tek ölçekli hesaba
                             * düşülüyor ve o da eğimli yüzeyde çok şaşıyor —
                             * ama hiçbir şey söylenmiyordu. Kullanıcı "ikinci
                             * referans diye bir şey yok, ölçüler hâlâ çok
                             * farklı" derken bunu görüyordu.
                             *
                             * Artık ölçü KESİN bir odakla kurulmadıysa uyarı
                             * ve ikinci referans teklifi çıkıyor.
                             */
                            odakTahminMi={alanNokta.length === 4 && !odakKesin && !alanOlcusuYazildi}
                            odakCozuldu={odakKesin || alanOlcusuYazildi}
                            odakExiften={exifOdak > 1 && !(cozulenOdak > 1) && !(odakYazilandan > 1)}
                            ref2Kipi={ref2Kipi}
                            ref2NoktaSayisi={ref2Nokta.length}
                            ref2UzunlukCm={ref2UzunlukCm}
                            setRef2UzunlukCm={setRef2UzunlukCm}
                            onRef2Isaretle={() => {
                              setRef2Nokta([])
                              setRef2UzunlukCm('')
                              setRefKipi(false)
                              setAlanKipi(false)
                              setRef2Kipi(true)
                            }}
                            onRef2Bitir={() => setRef2Kipi(false)}
                            /* ÖLÇÜM İLE AYARLA — dört noktayla yerleşim alanı. */
                            alanKipi={alanKipi}
                            /*
                             * Alan duruyorsa yeniden işaretlemeden yerleştirmeye.
                             * Referans işaretleme KAPANIYOR: açık kalırsa alan
                             * çizgisi ve tasarım gizleniyor, fotoğrafa yapılan
                             * tıklamalar da referans noktalarına gidiyor.
                             */
                            onYerlesim={
                              alanNokta.length === 4
                                ? () => {
                                    setRefKipi(false)
                                    setSihirbazAdim(4)
                                  }
                                : null
                            }
                            /* Ölçülen değer yazılı duruyor; elle düzeltilebiliyor. */
                            alanOlculenEn={alanOlculenCm ? Math.round(alanOlculenCm.enCm) : null}
                            alanOlculenBoy={alanOlculenCm ? Math.round(alanOlculenCm.boyCm) : null}
                            alanElleEn={alanElleEn}
                            alanElleBoy={alanElleBoy}
                            setAlanElleEn={setAlanElleEn}
                            setAlanElleBoy={setAlanElleBoy}
                            alanNoktaSayisi={alanNokta.length}
                            alanVar={!!alanTuval}
                            onAlanIsaretle={() => {
                              setAlanNokta([])
                              setRefKipi(false)
                              setAlanKipi(true)
                            }}
                            /* Görünmeyen köşeyi kenarlarından bulma. */
                            duzenlemede={duzenlemede}
                            onAlanTemizle={alaniTemizle}
                            /* Alan varken: çizgileri yeniden açar (tutamaklar geri gelir). */
                            alanGecerli={alanGecerli}
                            /* Kenar çizimi alt kipi: köşe görünmediğinde. */
                            kenarCizim={alanKenarKipi}
                            kenarCizgiSayisi={Math.floor(alanCizgi.length / 2)}
                            kenarAlaniHazir={!!kenarKesisimi}
                            onKenarCizimeGec={kenarCizimeGec}
                            onKenarVazgec={kenarCizimdenVazgec}
                            onKenarlardanKur={gorunmeyenKoseyiEkle}
                            onAlanBitir={alaniBitir}
                            /* Sarmalayici sart: dogrudan verilince React tiklama olayini
                               ilk parametre olarak gecirir ve dortgen sanilir. */
                            onAlanSigdir={() => tasarimiAlanaSigdir()}
                            /* L'nin son adımı: kanat şekli (bkz. lSekilPaneli). */
                            kanatSekli={lSekilPaneli}
                          />
                          </div>
                        ) : (
                          <>
                            {/*
                              L'DE ÖZET DE BAŞKA.

                              Orada ayrı bir referans adımı yok: ölçek köşe
                              çizgisinin kendisinden geliyor. "Henüz ölçek yok"
                              yazmak yanlıştı — eksik bir şey yokken eksikmiş
                              gibi duruyordu.
                            */}
                            <div className="flex items-center gap-1.5 text-[14px] font-semibold text-neutral-700 dark:text-neutral-200">
                              <span
                                className={`inline-block h-2.5 w-2.5 rounded-[3px] ${
                                  (lYerlesimKipi ? lKoseOlcek : refPxCm)
                                    ? 'bg-emerald-500'
                                    : 'bg-neutral-300 dark:bg-[#39404d]'
                                }`}
                              />
                              {lYerlesimKipi ? t('refL.baslik') : t('ref2.baslik')}
                            </div>
                            {lYerlesimKipi ? (
                              lKoseOlcek ? (
                                <p className="mt-0.5 mb-0 text-[13px] leading-snug text-emerald-700 dark:text-emerald-400">
                                  {Math.round(lKoseOlcek.px)} px / {Math.round(lKoseOlcek.cm)} cm ={' '}
                                  <strong>{lKoseOlcek.pxCm.toFixed(3).replace('.', ',')} px/cm</strong>
                                </p>
                              ) : (
                                <p className="mt-0.5 mb-0 text-[13.5px] leading-snug text-neutral-500 dark:text-neutral-400">
                                  {t('refL.yok')}
                                </p>
                              )
                            ) : refPxCm ? (
                              <p className="mt-0.5 mb-0 text-[13px] leading-snug text-emerald-700 dark:text-emerald-400">
                                {Math.round(refOlcek.pxMesafe)} px / {refOlcek.gercekCm} cm ={' '}
                                <strong>{refPxCm.x.toFixed(3).replace('.', ',')} px/cm</strong>
                              </p>
                            ) : (
                              <p className="mt-0.5 mb-0 text-[13.5px] leading-snug text-neutral-500 dark:text-neutral-400">
                                {t('sih.ozetYok')}
                              </p>
                            )}
                            {olcuKutu && !lYerlesimKipi && (
                              <p className="mt-0.5 mb-0 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                                {t('ref.kutuBaslik')}: {olcuKutu.enCm} × {olcuKutu.boyCm} cm
                              </p>
                            )}
                            {/* L'de kutu yerine köşe çizgisi duruyor. */}
                            {lKoseCizgiGeo && (
                              <p className="mt-0.5 mb-0 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                                {t('refL.ozet')}: {Math.round(Number(String(lKoseBoyCm).replace(',', '.')))} cm ·{' '}
                                {Math.round(lKabinGenislik.sol)} + {Math.round(lKabinGenislik.sag)} cm
                              </p>
                            )}
                            {refEskidi && (
                              <p className="mt-1 mb-0 text-[13.5px] leading-snug text-amber-600 dark:text-amber-400">
                                {t('ref2.eskidi')}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={sihirbaziBaslat}
                              className="mt-1.5 w-full py-2 rounded-lg text-[14.5px] font-semibold bg-brand text-white hover:opacity-90 transition-opacity"
                            >
                              {lYerlesimKipi
                                ? lKoseOlcek
                                  ? t('refL.yeniden')
                                  : t('refL.basla')
                                : olcuKutu || refPxCm
                                  ? t('sih.yeniden')
                                  : t('sih.basla')}
                            </button>
                            {/*
                              KANAT ŞEKLİ — DÜĞME ARKASINDA DEĞİL, AÇIKTA.

                              Sihirbazın son adımında zaten gösteriliyor;
                              akış bitince burada durmaya devam ediyor ki
                              sonradan düzeltmek için bir yere girmek
                              gerekmesin.
                            */}
                            {/*
                              İKİ ANA EYLEM: BAŞTAN BAŞLA ve DÜZENLE.

                              Önce dört düğme alt alta duruyordu — ölçüyü
                              değiştir, konumlandır, baştan başla — ve her
                              küçük düzeltme için hangisine basılacağı belli
                              olmuyordu. Artık üstte yalnızca iki şey var:
                              her şeyi silip baştan kurmak, ya da duran kutuyu
                              düzenlemek. Düzenlemenin ayrıntıları açılır
                              bölümün içinde.
                            */}
                            {(refPxCm || olcuKutu) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    /*
                                     * DÜZENLE = ÖLÇÜ AKIŞI BAŞTAN.
                                     *
                                     * Önce altında ayrı bir kutu açılıyordu; orada
                                     * yalnızca santim alanları ve mesafe vardı, kutuyu
                                     * yeniden ölçmenin yolu ise ayrı bir düğmeydi
                                     * ("Referansı yeniden seç"). İki giriş kapısı
                                     * olmasının anlamı yok: Düzenle artık o düğmenin
                                     * yaptığını yapıyor ve akışı 1. adımdan açıyor —
                                     * referans, dört köşe, ölçü ve yerleştirme aynı
                                     * yerde. Kutu da aynı anda elle taşınabilir
                                     * durumda kalıyor.
                                     */
                                    setDuzenleAcik(true)
                                    /* Manuel kutu yolu kapalıyken kip açılmıyor: taşımayı kilitliyordu. */
                                    setKutuDuzen(PANEL.olcuKutusu ? 'hepsi' : null)
                                    setTasarimAcik(true)
                                    if (olcuKutu) {
                                      setKutuEn(String(olcuKutu.enCm))
                                      setKutuBoy(String(olcuKutu.boyCm))
                                    }
                                    /*
                                     * Ölçü kuruluysa son adım: yapılacak iş
                                     * orada. Alan yoksa ama fotoğrafın ölçeği
                                     * kuruluysa referans yeniden sorulmuyor,
                                     * doğrudan alan işaretlemeye gidiliyor
                                     * (bkz. ekraniDuzenle).
                                     */
                                    /*
                                     * DÜZENLE = DUVAR DİPLERİNİ YENİDEN İŞARETLE.
                                     *
                                     * Eskiden burası "alanın dört köşesini
                                     * işaretle" kipini açıyordu; o akış
                                     * kaldırıldı ve içine giren kullanıcı
                                     * geri dönemiyordu. Ölçek varsa iş
                                     * duvar dibini yeniden koymak, yoksa
                                     * önce referans.
                                     */
                                    setDuzenlemede(true)
                                    setRefKipi(false)
                                    setAlanKipi(false)
                                    if (refPxCm || refDuzlem) {
                                      /* Yerleştirme adımı: tasarım zaten ekranda, tutamaklarla ayarlanıyor. */
                                      setSihirbazAdim(3)
                                    } else {
                                      setSihirbazAdim(1)
                                    }
                                  }}
                                  className="mt-1.5 w-full py-2 rounded-lg text-[14.5px] font-medium border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand transition-colors"
                                >
                                  {t('ref2.duzenle')}
                                </button>
                                {/*
                                  ÇİZGİYİ GİZLE — müşteriye gösterilecek kare temiz kalsın.
                                  Düzenlemeye girilince çizgi kendiliğinden geri geliyor.
                                */}
                                <button
                                  type="button"
                                  onClick={() => setCizgiGizli((o) => !o)}
                                  className="mt-1.5 w-full py-2 rounded-lg text-[14.5px] font-medium border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand transition-colors"
                                >
                                  {cizgiGizli ? t('ref2.cizgiGoster') : t('ref2.cizgiGizle')}
                                </button>
                                {PANEL.olcuDuzenlePaneli && duzenleAcik && (
                                  <div className="mt-1.5 rounded-lg border border-neutral-200 p-2 dark:border-[#2c333f]">
                                    {/*
                                      DÜZENLEMENİN TAMAMI TEK YERDE.

                                      Önce her iş ayrı bir düğmenin arkasındaydı — ölçü
                                      için sihirbaz açılıyor, taşımak ve eğmek için iki
                                      ayrı kip seçiliyordu. Kullanıcı aynı anda yapmak
                                      istiyor: kutuyu tutup oynatırken santimi de
                                      düzeltebilmeli. Araçlar burada yan yana, kip ayrımı
                                      yok.
                                    */}
                                    {/*
                                      ÖLÇÜ ALANLARI KUTU YOKKEN DE DURUYOR.

                                      Alanlar `olcuKutu` varken çiziliyordu. Ölçü
                                      reddedildiğinde (örneğin metre yerine santim
                                      yazıldığında) kutu kurulamıyor, kutu olmayınca da
                                      bu alanlar kayboluyordu: kullanıcı ölçüyü
                                      düzeltmek için gereken tek yeri kaybediyor ve
                                      "her şeyi kaldırmışsın" durumuna düşüyordu.
                                      Çıkış yolu yalnızca "Baştan başla" idi.

                                      Artık referans varsa alanlar her zaman duruyor;
                                      düğme kutu yoksa KURUYOR, varsa yerinde
                                      güncelliyor.
                                    */}
                                    {(refPxCm || refDuzlem) && (
                                      <>
                                        <div className="text-[13px] font-semibold text-neutral-600 dark:text-neutral-300">
                                          {t('sih.3.baslik')}
                                        </div>
                                        <div className="mt-1 flex items-center gap-1.5">
                                          <input
                                            type="number"
                                            min="1"
                                            value={kutuEn}
                                            onChange={(e) => setKutuEn(e.target.value)}
                                            placeholder={t('ref.en')}
                                            className="w-full min-w-0 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-[15px] text-neutral-800 outline-none focus:border-brand dark:border-[#39414f] dark:bg-[#232936] dark:text-neutral-200"
                                          />
                                          <span className="text-[14px] text-neutral-400">×</span>
                                          <input
                                            type="number"
                                            min="1"
                                            value={kutuBoy}
                                            onChange={(e) => setKutuBoy(e.target.value)}
                                            placeholder={t('ref.boy')}
                                            className="w-full min-w-0 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-[15px] text-neutral-800 outline-none focus:border-brand dark:border-[#39414f] dark:bg-[#232936] dark:text-neutral-200"
                                          />
                                          <span className="text-[14px] font-semibold text-neutral-500 dark:text-neutral-400">
                                            cm
                                          </span>
                                        </div>
                                        {/*
                                          Ölçü YERİNDE güncelleniyor: kutu referansın
                                          yanına geri dönmüyor, merkezi ve duruşu
                                          korunuyor (bkz. olcuyuGuncelle).
                                        */}
                                        {PANEL.olcuKutusu && (
                                        <button
                                          type="button"
                                          onClick={olcuKutu ? olcuyuGuncelle : olcuKutusunuKur}
                                          className="mt-1.5 w-full py-2 rounded-lg text-[14px] font-medium border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand transition-colors"
                                        >
                                          {olcuKutu ? t('ref2.olcuUygula') : t('ref2.kutuKur')}
                                        </button>
                                        )}
                                        {/* Reddedilen ölçünün sebebi burada da görünsün. */}
                                        {kutuMesaj && (
                                          <p className="mt-1.5 mb-0 text-[13px] leading-snug text-amber-600 dark:text-amber-400">
                                            {kutuMesaj}
                                          </p>
                                        )}
                                      </>
                                    )}

                                    {/* Çekim mesafesi: perspektifin sertliği. */}
                                    {!refDuzlem && (
                                      <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1.5 dark:border-[#2c333f] dark:bg-[#1b2029]">
                                        <span className="text-[13px] text-neutral-600 dark:text-neutral-400">
                                          {t('scene.viewDist')}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => mesafeAdim(-0.1)}
                                            className="h-7 w-7 rounded-md border border-neutral-300 text-[16px] leading-none text-neutral-600 hover:border-brand hover:text-brand dark:border-[#39414f] dark:text-neutral-300"
                                          >
                                            −
                                          </button>
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            value={mesafeGoster}
                                            onChange={(e) => mesafeYaz(e.target.value)}
                                            onBlur={() => setMesafeYazi(null)}
                                            className="w-12 rounded-md border border-neutral-300 bg-white px-1 py-1 text-center text-[14px] font-semibold tabular-nums text-neutral-800 outline-none focus:border-brand dark:border-[#39414f] dark:bg-[#232936] dark:text-neutral-200"
                                          />
                                          <span className="text-[13px] font-semibold text-neutral-500 dark:text-neutral-400">
                                            m
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => mesafeAdim(0.1)}
                                            className="h-7 w-7 rounded-md border border-neutral-300 text-[16px] leading-none text-neutral-600 hover:border-brand hover:text-brand dark:border-[#39414f] dark:text-neutral-300"
                                          >
                                            +
                                          </button>
                                        </span>
                                      </div>
                                    )}

                                    {PANEL.egim && olcuKutu && egimDugmesiVar && (
                                      <button
                                        type="button"
                                        onClick={kutuEgiminiCevir}
                                        className="mt-1.5 w-full py-2 rounded-lg text-[13.5px] font-medium border border-neutral-200 bg-white text-neutral-600 hover:border-brand hover:text-brand dark:border-[#39414f] dark:bg-[#1b2029] dark:text-neutral-300"
                                      >
                                        {/*
                                          DERECE DÜĞMENİN ÜSTÜNDE.

                                          Düğme referansın eğimini uyguluyor; o eğim
                                          1 derece ise kutuda birkaç piksellik dönme
                                          oluyor ve düğme "hiçbir şey yapmıyor" gibi
                                          görünüyordu. Kaç derece uygulanacağı yazınca
                                          ne bekleneceği belli oluyor.
                                        */}
                                        {egimVar
                                          ? t('sih.egimSifirla')
                                          : refDuzlem
                                            ? t('sih.egimDuzleme')
                                            : t('sih.egimAyarla') +
                                              ': ' +
                                              ((refEgimi * 180) / Math.PI).toFixed(1).replace('.', ',') +
                                              '°'}
                                      </button>
                                    )}

                                    {/*
                                      "Referansı yeniden seç" kaldırıldı: aynı işi
                                      ekran listesindeki "Düzenle" yapıyor ve akışı
                                      1. adımdan açıyor (bkz. ekraniDuzenle).
                                    */}

                                    <p className="mt-1.5 mb-0 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                                      {t('ref2.duzenleIpucu')}
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        )}

                        {/*
                          EKRANLAR bölümü SOL PANELE taşındı: ekran eklemek
                          modelin ve dizilimin yanında, yani ekranın kendisiyle
                          ilgili işlerin olduğu yerde duruyor. Sağ panel
                          ölçü/yerleşim işlerine kaldı.
                        */}

                        {/*
                          YERLEŞİM başlığı — altındaki düğmeler kapalı olduğu
                          için boş bir satır olarak duruyordu (bkz. PANEL).
                        */}
                        {PANEL.yerlesimBasligi && (
                          <div className="mt-3 text-[14px] font-semibold text-neutral-700 dark:text-neutral-200">
                            {t('scene.placeHeading')}
                          </div>
                        )}
                        {/*
                          KUTUYA YERLEŞTİR — fareyle uğraşmadan.
                          Kutu küçükken tasarımı elle içine oturtmak neredeyse
                          imkânsızdı; bu düğme sürükleme kaymasını sıfırlayıp
                          tasarımı kutunun ortasına koyuyor.
                        */}
                        {PANEL.kutuyaYerlestir && duvarOlcu && (
                          <button
                            type="button"
                            onClick={tasarimiKutuyaYerlestir}
                            className="mt-1.5 w-full py-2 rounded-lg text-[14px] font-medium border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand transition-colors"
                          >
                            {t('scene.kutuyaYerlestir')}
                          </button>
                        )}
                        {PANEL.duvaraSigdir && duvarOlcu && (
                          <button
                            type="button"
                            onClick={tasarimiDuvaraSigdir}
                            className="mt-1.5 w-full py-2 rounded-lg text-[14px] font-medium border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand transition-colors"
                          >
                            {t('scene.fitWall')}
                          </button>
                        )}
                        {/*
                          CANLI ÖLÇÜ KARŞILAŞTIRMASI.

                          Kutunun ve tasarımın o ANKİ ölçüsü yan yana yazıyor.
                          Eskiyen bir cümle değil, her değişiklikte kendiliğinden
                          güncellenen bir satır: hangisi büyük, eşit mi, tek
                          bakışta görünüyor.
                        */}
                        {duvarOlcu && (
                          <p className="mt-1.5 mb-0 text-[13px] leading-snug text-neutral-600 dark:text-neutral-300">
                            {t('scene.olcuKarsilastir')}{' '}
                            <strong>
                              {duvarOlcu.wm.toFixed(2).replace('.', ',')} ×{' '}
                              {duvarOlcu.hm.toFixed(2).replace('.', ',')} m
                            </strong>{' '}
                            · {t('scene.olcuTasarim')}{' '}
                            <strong>
                              {tasarimWm.toFixed(2).replace('.', ',')} ×{' '}
                              {tasarimHm.toFixed(2).replace('.', ',')} m
                            </strong>
                            {Math.abs(duvarOlcu.wm - tasarimWm) < 0.005 &&
                            Math.abs(duvarOlcu.hm - tasarimHm) < 0.005
                              ? ' · ' + t('scene.olcuTamOturuyor')
                              : ''}
                          </p>
                        )}
                        {/*
                          SONUCU SÖYLE.

                          Düğme sonucu ozelUyari'ya yazıyordu ama o değer
                          hiçbir yerde çizilmiyordu. Duvara sığan en büyük
                          düzen zaten seçiliyse ekranda hiçbir şey değişmiyor
                          ve kullanıcı düğmenin bozuk olduğunu sanıyordu —
                          oysa düğme doğru çalışıyor, söyleyecek yeri yoktu.
                        */}
                        {duvarOlcu && ozelUyari && (
                          <p className="mt-1.5 mb-0 text-[13px] leading-snug text-neutral-600 dark:text-neutral-300">
                            {ozelUyari}
                          </p>
                        )}
                        {PANEL.izgara && duvarDunya && (
                          <button
                            type="button"
                            onClick={() => setIzgaraAcik((v) => !v)}
                            className="mt-1.5 w-full py-2 rounded-lg text-[14.5px] font-medium border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand transition-colors"
                          >
                            {izgaraAcik ? t('scene.gridOff') : t('scene.gridOn')}
                          </button>
                        )}
                      </>
                    )}
                    {PANEL.enUygunYer && !TASLAK_KIPI && (
                      <button
                        type="button"
                        onClick={() => oneriyiTazele()}
                        className="w-full py-2.5 rounded-lg text-[15px] font-semibold bg-brand text-white hover:opacity-90 transition-opacity"
                      >
                        {t('scene.suggest')}
                      </button>
                    )}
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      {PANEL.digerYerler && !TASLAK_KIPI && adaylar.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setAdayKipi((v) => !v)}
                          className={`py-2 rounded-lg text-[14px] font-medium border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand transition-colors ${adayKipi ? 'border-brand text-brand' : ''}`}
                        >
                          {adayKipi ? t('scene.spotsOff') : t('scene.spots')}
                        </button>
                      )}
                      {/*
                        "DUVARI KÖŞELERDEN KALİBRE ET" KALKTI.

                        Aynı işi ölçü kutusunun kendi düzenleme kipi yapıyor:
                        orada köşeler serbestçe çekiliyor ve tasarım kutuyla
                        birlikte gidiyor. İki ayrı yerden aynı dörtgeni
                        düzenlemek, hangisinin geçerli olduğunu belirsiz
                        bırakıyordu.
                      */}
                    </div>
                    {adayKipi && adaylar.length > 0 && (
                      <p className="mt-1.5 mb-0 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                        {t('scene.spotsHint')}
                      </p>
                    )}
                    {/*
                      ÖLÇÜ SEÇİMİ PANELDE KALIYOR.

                      Pop-up yalnızca karar anında çıkıyor; seçim burada
                      duruyor ki kullanıcı sonradan fikrini değiştirebilsin.
                      Etkin seçenek işaretli.
                    */}
                    {PANEL.koseAyariniSifirla &&
                      (elleKose || elleAci.yaw !== 0 || elleAci.tilt !== 0 || hedefKose) && (
                      <button
                        type="button"
                        onClick={() => {
                          setElleKose(null)
                          setKilitliKose([])
                          setElleAci({ yaw: 0, tilt: 0 })
                          setKoseKipi(false)
                          setHedefKose(null)
                          setHedefTur(null)
                        }}
                        className="mt-1.5 w-full py-1 text-[13px] text-neutral-500 dark:text-neutral-400 hover:text-brand transition-colors underline underline-offset-2 decoration-neutral-300 dark:decoration-[#3a4150]"
                      >
                        {t('scene.cornersReset')}
                      </button>
                    )}
                    {ozelInceleniyor && (
                      <p className="mt-2 mb-0 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                        {t('scene.analysing')}
                      </p>
                    )}
                    {/*
                      "Fotoğrafta görülenler" listesi ve yüzey güven uyarısı
                      kaldırıldı: kullanıcıya yapacak bir iş vermiyor, sonucu
                      da değiştirmiyorlardı. Yerleşim doğru değilse zaten
                      köşelerden düzeltiliyor.
                    */}
                    {sigmazUyari && (
                      <p className="mt-2 mb-0 text-[13px] leading-snug text-amber-600 dark:text-amber-400">
                        {sigmazUyari}
                      </p>
                    )}
                  </div>
                )}

                {/*
                  İZLEME MESAFESİ — yalnızca fotoğraflı mekânda.
                  Varsayılanı modelin önerilen mesafesi; artırınca ekran
                  uzaktan bakılmış gibi küçülür.
                */}
                {/*
                  Sihirbaz açıkken mesafe onun 4. adımında gösteriliyor;
                  aynı sayıyı iki yerde göstermek hangisinin geçerli olduğunu
                  belirsizleştiriyordu.
                */}
                {surukleAktif && mesafeKartiVar && !(sihirbazAdim > 0) && (
                  <div className="mt-2 border border-neutral-200 dark:border-[#2c333f] rounded-lg p-2.5">
                    {/*
                      TASLAK KUTU VARKEN BU SATIR YOK.

                      Mesafe yukarıda, en/boy ile aynı yerde soruluyor. Aynı
                      sayıyı bir de burada göstermek kafa karıştırıyordu:
                      kullanıcı hangisinin geçerli olduğunu bilmiyordu. Kutu
                      yokken (hazır mekânlar) burası hâlâ tek adres.
                    */}
                    <div
                      className={
                        (taslakKutu || !PANEL.mesafe ? 'hidden' : 'flex') +
                        ' items-center justify-between gap-3'
                      }
                    >
                      <span className="text-[15px] text-neutral-600 dark:text-neutral-400">
                        {izlemeBilgiSahnesi ? t('scene.viewDistFixed') : t('scene.viewDist')}
                      </span>
                      {izlemeBilgiSahnesi ? (
                        /* Salt bilgi: modelin kendi izleme mesafesi. */
                        <span className="text-[15px] font-semibold tabular-nums text-neutral-800 dark:text-neutral-200">
                          {onerilenIzlemeM.toFixed(1).replace('.', ',')} m
                        </span>
                      ) : /*
                          TASLAK KUTU VARSA MESAFE ELLE DEĞİŞTİRİLEMİYOR.

                          Ölçek kutudan geliyor; mesafeyi buradan oynatmak
                          kadrajı değiştirip kutuyla tasarımın ilişkisini
                          bozuyordu. Kutu duvara oturtuldukça bu sayı zaten
                          kendiliğinden doğruyu gösteriyor.
                        */
                      (izlemeM == null && !(scene === 'ozel' && ozelSahne)) ||
                        (scene === 'ozel' && ozelSahne && taslakKutu) ? (
                        <span className="text-[15px] font-semibold tabular-nums text-neutral-800 dark:text-neutral-200">
                          {(scene === 'ozel' && taslakKutu
                            ? izlemeMesafesi.toFixed(2)
                            : izlemeMesafesi.toFixed(1)
                          ).replace('.', ',')}{' '}
                          m
                        </span>
                      ) : (
                        /*
                          METRENİN ALTI DA GİRİLEBİLİR.

                          Yakın çekim fotoğraflarda (bir masa üstü ekranı, bir
                          vitrin) kamera bir metreden yakın olabiliyor; alt
                          sınır 1 m iken ölçek olduğundan büyük çıkıyordu.
                          Alt sınır 0,2 m'ye indi ve adım 0,1 m oldu; kutuya
                          elle istenen değer de yazılabiliyor.
                        */
                        <Stepper
                          value={izlemeMesafesi}
                          onChange={setIzlemeM}
                          min={0.2}
                          max={scene === 'ozel' && ozelSahne ? 300 : 60}
                          step={0.1}
                          decimals={1}
                        />
                      )}
                    </div>
                    {/*
                      MESAFE KAPALIYKEN AÇIKLAMASI DA YOK.

                      Mesafe alanı gizlendi (bkz. PANEL.mesafe) ama onu
                      anlatan yazı ortada kalmıştı: olmayan bir alanı
                      tarif eden bir cümle.
                    */}
                    {PANEL.mesafe && (
                      <p
                        className={(taslakKutu ? 'hidden ' : '') + 'mt-1 mb-0 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400'}
                      >
                        {izlemeBilgiSahnesi
                          ? t('scene.viewDistFixedHint')
                          : scene === 'ozel' && ozelSahne
                          ? t('scene.photoDistanceHint')
                          : t('scene.viewDistHint')}
                      </p>
                    )}
                    {/*
                      ÖLÇEK UYARISI.

                      Tasarım, verilen mesafeden görünen kadrajdan genişse
                      çizim zaten taşıyor. Sessizce sığdırmak yerine sebebi
                      söyleniyor: ya mesafe yanlış girilmiş ya da o ekran o
                      mekâna gerçekten sığmıyor.
                    */}
                    {/*
                      DUVARA SIĞMA UYARISI.

                      Duvar tanıtıldıysa ölçüt odur; kadraj denetimi yalnızca
                      duvar yokken anlamlı (o zaman elimizdeki tek referans
                      fotoğrafın kendisi).
                    */}
                    {birimSuphesi && (
                      <p className="mt-2 mb-0 text-[13px] leading-snug text-amber-600 dark:text-amber-400">
                        {t('scene.unitDoubt')}{' '}
                        {t('scene.unitDoubtFix')}{' '}
                        {birimSuphesi.wm.toFixed(2).replace('.', ',')} ×{' '}
                        {birimSuphesi.hm.toFixed(2).replace('.', ',')} cm ={' '}
                        {(birimSuphesi.wm / 100).toFixed(3).replace('.', ',')} ×{' '}
                        {(birimSuphesi.hm / 100).toFixed(3).replace('.', ',')} m.
                      </p>
                    )}
                    {duvaraSigma && (
                      <p className="mt-2 mb-0 text-[13px] leading-snug text-amber-600 dark:text-amber-400">
                        {t('scene.tooBigForWall')}{' '}
                        {t('scene.wallIs')} {duvaraSigma.duvar.wm.toFixed(2).replace('.', ',')} ×{' '}
                        {duvaraSigma.duvar.hm.toFixed(2).replace('.', ',')} m,{' '}
                        {t('scene.designIs')} {tasarimWm.toFixed(2).replace('.', ',')} ×{' '}
                        {tasarimHm.toFixed(2).replace('.', ',')} m.
                        {duvaraSigma.sutun > 0 && duvaraSigma.satir > 0 && (
                          <>
                            {' '}
                            {t('scene.wallFitsAtMost')}{' '}
                            {duvaraSigma.wm.toFixed(2).replace('.', ',')} ×{' '}
                            {duvaraSigma.hm.toFixed(2).replace('.', ',')} m ({duvaraSigma.sutun} ×{' '}
                            {duvaraSigma.satir} {t('scene.cabinets')}).
                          </>
                        )}
                      </p>
                    )}
                    {!duvarOlcu && scene === 'ozel' && ozelSahne && tasarimWm > kadrajGenisligi(ozelMesafeM) && (
                      <p className="mt-2 mb-0 text-[13px] leading-snug text-amber-600 dark:text-amber-400">
                        {t('scene.tooBigForFrame')}{' '}
                        {/*
                          Kullanıcıya "mesafeyi düzelt" demek yetmiyor, KAÇ
                          olması gerektiğini de söylemek gerekiyor: kadraj
                          genişliği = mesafe × 1,11 olduğuna göre bu ekranın
                          sığdığı en küçük mesafe doğrudan hesaplanabiliyor.
                        */}
                        {t('scene.needDistance')}{' '}
                        {(Math.ceil((tasarimWm / KADRAJ_KATSAYISI) * 10) / 10)
                          .toFixed(1)
                          .replace('.', ',')}{' '}
                        m
                      </p>
                    )}
                    {/* Fotoğrafta otomatik mesafe yok: ölçek ondan geliyor. */}
                    <div className={`mt-2 items-center justify-between gap-3 ${(scene === 'ozel' && ozelSahne) || izlemeBilgiSahnesi ? 'hidden' : 'flex'}`}>
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
                {/* Ölçüm akışı sürerken gizli: ekranın gövdesiyle ilgisi yok. */}
                {surukleAktif && !olcuAcik && (
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
                {PANEL.ortala && surukleAktif && mekanTasindi && (
                  <button
                    type="button"
                    onClick={mekaniOrtala}
                    className="mt-2 w-full py-2 rounded-lg text-[15px] font-medium border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand transition-colors"
                  >
                    {t('scene.recenter')}
                  </button>
                )}
              </div>
            </>
          )}

          {/*
            İletişim + PDF — yan yana.
            Ölçüm akışı sürerken gizli: teklif ve rapor, ölçü oturduktan
            sonraki işler (bkz. olcuAcik).
          */}
          {!olcuAcik && (
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
          )}

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
        ekranlar={raporEkranlari}
        toplam={tasarimToplami}
        /* Sol panelden taşındı: donanım seçeneği, tasarımın sayılarıyla birlikte. */
        onMiniPc={setHasMiniPc}
        preview={hwPreview}
        matchError={hwMatchError}
      />

      <ModelSelectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        /* "Hangi modeli seçeceğinizi bilmiyorum" yardımı pencerenin içinde. */
        onWizard={() => {
          setModalOpen(false)
          setWizardOpen(true)
        }}
        cabinets={displayCabinets}
        onChoose={handleChoose}
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
        screens={cokluAktif ? ekranSeridi : null}
        content={content}
        contentUrl={contentUrl}
        screenType={screenType}
        lYon={lYon}
        resolution={resolution}
        curveAmount={curveAmount}
        hideRegions={isVideoWall}
        /* Kamerada "Kaydet" denen kare rapora da girsin (bkz. kareKaydedildi) */
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
            lYon={lYon}
            curveAmount={curveAmount}
            screens={cokluAktif ? ekranSeridi : null}
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
          /* Sayılan şeyin adı ürün tipinden türüyor (bkz. birimSozcugu). */
          productType: selectedModel?.productType ?? null,
          /* Ekranlar tek listeden; biri de olsa üçü de aynı yoldan geçsin. */
          screenMode: raporEkranlari.length > 1 ? 'multi' : 'single',
          screens: raporEkranlari,
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
            selectedModel, width, height, cols, rows, screenType,
            orientation, curveAmount, resolution, sboxRedundancy, hasMiniPc, scene,
            ekranlar: sabitEkranlar, content,
            /* Birleşim ve kimlikler olmadan teklif düzenlenirken düzen dağılıyor. */
            lSolCols, lYon, aktifEkranId, aktifSira, grup, icerikGruplari,
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
function KavisAyari({ t, deger, onChange, icbukey, coklu = false, genislikM = 0 }) {
  /*
   * ÇAP, KAVİSİN ASIL ÖLÇÜSÜ.
   *
   * Montajcı da müşteri de kavisi çapla konuşuyor ("3 m çapında"); yüzde
   * bizim iç ölçümüz. Bu yüzden çap doğrudan girilebiliyor ve yüzdeye
   * çevriliyor; kaydırıcı yerinde kalıyor, ikisi bağlı.
   */
  const cap = curveDiameterM(deger, icbukey, genislikM)
  /*
   * KURULABİLİR AÇILAR.
   *
   * Kabin kilitleri yüzünden toplam yay 32°'nin katı olmak zorunda; ara
   * değerler sahada kurulamıyor. Kaydırıcı artık bu duraklar arasında
   * geziyor, çap alanı da en yakın durağa oturuyor. Yüzde iç ölçümüz
   * olarak kalıyor ama kullanıcı artık açıyı seçiyor.
   */
  const acilar = kavisAciSecenekleri(icbukey)
  const aci = curveArcDegrees(deger, icbukey)
  let durak = 0
  acilar.forEach((a, i) => { if (Math.abs(a - aci) < Math.abs(acilar[durak] - aci)) durak = i })
  const acidanYuzde = (a) => Math.round(curveAmountForArc(a, icbukey))
  /* Açık olmayan bir değerle gelindiyse (eski kayıt, varsayılan) en yakın durağa çekiliyor. */
  useEffect(() => {
    const oturmus = kavisYuzdesiniOturt(deger, icbukey)
    if (oturmus !== deger) onChange(oturmus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [icbukey])
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[16px] font-semibold tracking-[0.06em] uppercase text-neutral-600 dark:text-neutral-400">
          {t('screen.curveAmount')}
        </span>
        <span className="text-[16px] font-semibold text-brand">{acilar[durak]}°</span>
      </div>
      {/*
        KAYDIRICI YERİNE İKİ AÇI.

        Kurulabilir açılar 32°'nin katları; kaydırıcı iki durak arasında
        gidip geliyor, hangi değerde olduğunu da ayrı bir yazıdan okumak
        gerekiyordu. Düğmeler seçeneği doğrudan gösteriyor.
      */}
      <div className="grid grid-cols-2 gap-2">
        {[32, 64].map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange(acidanYuzde(a))}
            className={`rounded-lg py-2 text-[15px] font-semibold transition-colors ${
              acilar[durak] === a
                ? 'bg-brand text-white'
                : 'border border-neutral-300 text-neutral-600 hover:border-brand hover:text-brand dark:border-[#39414f] dark:text-neutral-300'
            }`}
          >
            {a}°
          </button>
        ))}
      </div>
      {/*
        Yüzde tek başına anlamsız: "%60 kavis" kaç derece demek, kullanıcı
        bilemiyordu. Yüzde derinliği (sagitta) ölçer, açı ondan türer —
        karşılığını burada gösteriyoruz. Açı ekran boyutundan bağımsız, o
        yüzden kabin sayısı değişince de doğru kalır.
      */}
      <div className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
        {t('screen.curveArc')}: {acilar[durak]}° · {KAVIS_ACI_ADIMI}° {t('screen.curveStepNote')}
      </div>
      {coklu && (
        <div className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
          {t('screen.curveAllScreens')}
        </div>
      )}
    </div>
  )
}

/**
 * EKRAN NUMARASI ROZETLERİ.
 *
 * Her ekranın dörtgeninin ağırlık merkezine sırasını yazıyor. Tıklama
 * geçiyor (pointerEvents: none): altta duran ekranın kendi seçimi
 * engellenmesin.
 */
function EkranNumaralari({ ekranlar, aktifId }) {
  if (!Array.isArray(ekranlar) || ekranlar.length < 1) return null
  return (
    /*
     * ROZETLER EKRANLARIN ÜSTÜNDE.
     *
     * Katman zIndex 6 ile çiziliyordu; sabit ekranlar katmanı ise 13.
     * Yani kayıtlı bir ekranın rozeti KENDİ ekranının arkasında kalıyor
     * ve hiç görünmüyordu: iki ekranlı bir birleşimde yalnızca elde
     * duran ekranın numarası okunuyordu.
     */
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 14 }}>
      {ekranlar.map((e) => {
        const k = e.koseler
        if (!Array.isArray(k) || k.length !== 4) return null
        if (k.some((pt) => !Number.isFinite(pt?.x) || !Number.isFinite(pt?.y))) return null
        const x = k.reduce((a, pt) => a + pt.x, 0) / 4
        const y = k.reduce((a, pt) => a + pt.y, 0) / 4
        const acik = e.id === aktifId
        return (
          <span
            key={e.id ?? e.sira}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              width: acik ? 30 : 24,
              height: acik ? 30 : 24,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: acik ? 15 : 12.5,
              fontWeight: 700,
              color: '#ffffff',
              background: acik ? '#2962ad' : 'rgba(0,19,52,0.55)',
              boxShadow: acik ? '0 0 0 3px rgba(41,98,173,0.35)' : 'none',
            }}
          >
            {e.sira}
          </span>
        )
      })}
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
/*
 * PANEL KAYDIRILMIYOR — İÇERİK SIĞDIRILIYOR.
 *
 * Ürün kararı: sol panelde kaydırma olmayacak, içeriğin tamamı tek
 * ekranda görünecek. Bedeli yazının küçülmesi; kullanıcı bunu bilerek
 * istedi ("sığdır hepsini, yazıları küçült").
 *
 * Taban, kaydırmanın hiç gerekmeyeceği kadar düşük: iki ekran kurulu bir
 * panelde içerik 1542, panel 795 piksel — yani oran 0,52'ye kadar
 * inebiliyor; alçak ekranlarda daha da aşağı.
 */
const EN_KUCUK_ORAN = 0.35

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
      /*
       * TABANDA DA SIĞMIYORSA KAYDIRILIYOR.
       *
       * Eskiden kaydırma hiç yoktu: içerik ne olursa olsun sığdırılıyordu,
       * bedeli de okunmayan yazıydı. Artık küçültme okunur bir tabanda
       * duruyor ve artan içerik kaydırmayla geziliyor.
       */
      /* Kaydırma yok: içerik her hâlükârda panele sığdırılıyor. */
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
/*
 * ÜST ÇUBUK DÜĞMESİ.
 *
 * "active" burada bir açık/kapalı durumu değil, düğmenin KULLANILABİLİR
 * olup olmadığı: hepsi model seçilmişken çalışıyor. Düğme kapalı görünümde
 * çiziliyordu ama gerçekten kapalı DEĞİLDİ; basınca hiçbir şey olmuyor ve
 * hiçbir şey de söylenmiyordu (kullanıcı "tepkisiz kalıyor" diye bildirdi).
 * Artık gerçekten kapalı ve sebebini yazıyor.
 */
/*
 * HAVUZ ÖĞESİNİN KÜÇÜK ÖNİZLEMESİ.
 *
 * Hem havuz karelerinde hem ekran satırlarında aynı görünüm kullanılıyor;
 * ikisi birbirinden ayrı düşmesin diye tek yerde.
 *
 * Kapsayıcı konumlandırmayı kendi yapıyor (relative + overflow-hidden);
 * burası yalnızca içini dolduruyor.
 */
/**
 * DAR PANELDE DE TAM GÖRÜNEN SAYI KUTUSU.
 *
 * Etiket üstte, altında eksi–sayı–artı. Düğmeler sabit boyda, sayı
 * aradaki esnek alanda: kutu ne kadar daralırsa daralsın düğmeler
 * kırpılmıyor. (Stepper daraldıkça etiketle bitişip + düğmesini dışarı
 * düşürüyordu.)
 */
function SayiKutusu({ etiket, deger, onChange, min = 1, max = 99, adim = 1, birim = null }) {
  const dugme =
    'h-6 w-6 shrink-0 rounded border border-neutral-300 text-[15px] leading-none text-neutral-700 transition-colors enabled:hover:border-brand enabled:hover:text-brand disabled:opacity-35 dark:border-[#39414f] dark:text-neutral-200'
  /* Ondalık adımda kayan nokta kalıntısı kalmasın (0,1+0,2). */
  const yuvarla = (v) => Number(v.toFixed(2))
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="shrink-0 text-[13.5px] text-neutral-600 dark:text-neutral-300">{etiket}</span>
      <button
        type="button"
        aria-label="−"
        onClick={() => onChange(Math.max(min, yuvarla(deger - adim)))}
        disabled={deger <= min}
        className={dugme}
      >
        −
      </button>
      <span className="min-w-[1.5rem] text-center text-[14.5px] font-semibold tabular-nums text-neutral-800 dark:text-neutral-100">
        {adim < 1 ? (deger || 0).toFixed(2).replace('.', ',') : deger}
      </span>
      <button
        type="button"
        aria-label="+"
        onClick={() => onChange(Math.min(max, yuvarla(deger + adim)))}
        disabled={deger >= max}
        className={dugme}
      >
        +
      </button>
      {birim && <span className="shrink-0 text-[13px] text-neutral-500 dark:text-neutral-400">{birim}</span>}
    </span>
  )
}

/* Ekran satırlarındaki iki küçük ikon — ayrı bileşen, iki yerde kullanılıyor. */
function CopKutusu() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 7V5h6v2" />
      <path d="M6.5 7l1 13h9l1-13" />
    </svg>
  )
}

function Kalem() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  )
}

function IcerikOnizleme({ oge, dilim = null, oynatImi = false }) {
  if (!oge) return null
  /*
   * DİLİM YÜZDEYLE: kutunun kaç piksel olduğunu bilmeye gerek kalmıyor.
   * Görsel kutunun sw katı büyütülüyor; CSS'te yüzdeli konum "kutu eksi
   * görsel" farkına oranlandığı için kayma sx/(sw-1) oluyor.
   */
  const dilimStili = dilim
    ? {
        backgroundSize: `${(dilim.sw || 1) * 100}% ${(dilim.sh || 1) * 100}%`,
        backgroundPosition: `${dilim.sw > 1 ? (dilim.sx / (dilim.sw - 1)) * 100 : 0}% ${
          dilim.sh > 1 ? (dilim.sy / (dilim.sh - 1)) * 100 : 0
        }%`,
      }
    : null
  if (oge.id === 'led')
    return (
      <>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: LED_GRADIENT }} />
        <div style={{ position: 'absolute', inset: 0, ...ledDotsStyle(3) }} />
      </>
    )
  if (oge.tip === 'bos')
    return <div style={{ position: 'absolute', inset: 0, background: '#ffffff' }} />
  if (oge.tip === 'video')
    return (
      <>
        <video
          src={oge.url}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        {oynatImi && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="#ffffff" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,.7))' }}>
              <polygon points="8 5 19 12 8 19" />
            </svg>
          </span>
        )}
      </>
    )
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url("${oge.url}")`,
        /* Kutuyu tam dolduruyor: çizimdeki kuralla aynı (kırpma yok). */
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        ...(dilimStili || {}),
      }}
    />
  )
}

function IconButton({ children, label, active, onClick, sadeceIkon = false, pasifNot = null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={active === false}
      title={active === false && pasifNot ? pasifNot : label}
      aria-label={label}
      className={`arac-dugme h-9 rounded-full px-2.5 lg:pl-2.5 lg:pr-3 inline-flex items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors shrink-0 ${
        active
          ? 'btn-selected'
          : 'border border-neutral-300 dark:border-[#39414f] text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
      }`}
    >
      <span className="shrink-0 flex items-center justify-center">{children}</span>
      {/* Yatay telefonda da görünür (bkz. .arac-etiket). */}
      {!sadeceIkon && <span className="arac-etiket hidden lg:inline">{label}</span>}
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

  /*
   * VİRGÜL DE ONDALIK AYIRACI.
   *
   * Alan type="number" idi ve tarayıcı virgüllü yazımı geçersiz sayıp
   * değeri boşaltıyordu; odaktan çıkınca da boş değer EN KÜÇÜK sınıra
   * düşüyordu. Kullanıcının gördüğü "virgüllü sayıyı kabul etmiyor,
   * yuvarlıyor" tam olarak buydu — yuvarlama değil, sıfırlamaydı.
   *
   * Alan artık metin; sayıya çevirirken virgül noktaya dönüyor. Telefonda
   * sayı tuş takımı yine açılıyor (inputMode="decimal").
   */
  const sayiya = (metin) => Number(String(metin).replace(',', '.'))
  const handleChange = (e) => {
    const t = e.target.value
    setDraft(t)
    if (t === '') return // boş bırakmaya izin ver; kırpma odaktan çıkınca
    const n = sayiya(t)
    if (!Number.isNaN(n)) onChange(Math.min(max, n))
  }
  const handleBlur = () => {
    const n = sayiya(draft)
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
        type="text"
        inputMode="decimal"
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
