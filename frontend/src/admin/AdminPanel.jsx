import { useEffect, useState, useCallback } from 'react'
import { BrandMark, BrandStripe } from '../BrandChrome.jsx'
import { BRAND } from '../brand.js'
import ProductTypeBadge from '../ProductTypeBadge.jsx'
import { normalizeProductType } from '../productType.js'
import { API_URL, apiFetch } from '../apiClient.js'
import { queryClient } from '../queryClient.js'
import { TESTER_ROLE_ENABLED } from '../featureFlags.js'
import { useSession } from '../SessionContext.jsx'
import HardwareCatalogSection from './HardwareCatalogSection.jsx'

/**
 * Yönetim ekranı — pgAdmin'den elle veri girmeye alternatif.
 * Adres: http://localhost:5173/#yonetim
 *
 * Gruplar:
 *  - Genel:   Dashboard (özet + analitik)
 *  - Ürün:    Modeller, Seriler, Donanım (güç kaynağı, mini PC, patch, alıcı kart, işlemci + işçilik)
 *  - Satış:   Teklifler, Kayıtlı Projeler
 *  - Sistem:  Sohbet Kayıtları, Geri Bildirimler, Kullanıcılar
 *
 * Veriler doğrudan API üzerinden okunur/yazılır; API kapalıysa ekran uyarı gösterir
 * (ana sayfadaki gibi demo veriye düşmez, çünkü burada gerçek kayıt yapılıyor).
 */

const CATEGORIES = [
  { v: 'led', label: 'LED' },
  { v: 'videowall', label: 'Video Duvarı' },
]

const PRODUCT_TYPES = [
  { v: 'CABINET', label: 'Kabin', hint: 'Hazır kabin ünitesi — duvar/istifleme montajı' },
  { v: 'MODULE', label: 'Tekli Panel (Modül)', hint: 'Outdoor / Indoor / Flexible panel — kart başına gruplanır' },
]

/** Sekmeler gruplu — 7 düz sekme yerine SaaS tarzı bölümler. */
const TAB_GROUPS = [
  {
    label: 'Genel',
    items: [{ key: 'dashboard', label: 'Dashboard' }],
  },
  {
    label: 'Ürün',
    items: [
      { key: 'cabins', label: 'Modeller' },
      { key: 'series', label: 'Seriler' },
      { key: 'hardware', label: 'Donanım' },
    ],
  },
  {
    label: 'Satış',
    items: [
      { key: 'quotes', label: 'Teklifler' },
      { key: 'configs', label: 'Kayıtlı Projeler' },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { key: 'chatlogs', label: 'Sohbet Kayıtları' },
      { key: 'feedback', label: 'Geri Bildirimler' },
      { key: 'users', label: 'Kullanıcılar' },
    ],
  },
]

const STATUS_OPTIONS_QUOTE = ['Beklemede', 'Onaylandı', 'Reddedildi']
const STATUS_OPTIONS_CONFIG = ['Taslak', 'Beklemede', 'Onaylandı', 'Reddedildi']

/** Durum rozetlerinin rengi — teklif/proje süreç takibinde görsel hızlı okunabilirlik için. */
function StatusBadge({ status }) {
  const cls =
    status === 'Onaylandı'
      ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800'
      : status === 'Reddedildi'
      ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
      : status === 'Taslak'
      ? 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-[#222833] dark:text-neutral-300 dark:border-[#39414f]'
      : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800'
  return <span className={`rounded-full px-2 py-0.5 text-xs border whitespace-nowrap ${cls}`}>{status || '—'}</span>
}

/** Sayfalama kontrolleri — teklif/proje listeleri büyüdükçe tek seferde tüm veriyi çekmemek için. */
function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 border-t border-neutral-100 dark:border-[#242b36] text-sm">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="px-3 py-2 min-h-[44px] rounded border border-neutral-200 dark:border-[#39414f] disabled:opacity-40">
        ← Önceki
      </button>
      <span className="text-neutral-500 dark:text-neutral-400">Sayfa {page} / {totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="px-3 py-2 min-h-[44px] rounded border border-neutral-200 dark:border-[#39414f] disabled:opacity-40">
        Sonraki →
      </button>
    </div>
  )
}

/** Tarayıcı window.confirm yerine kurumsal silme onayı. */
function ConfirmDialog({ open, title, body, confirmLabel = 'Sil', onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] bg-[#001334]/45 flex items-center justify-center p-0 sm:p-4" onClick={onCancel}>
      <div
        className="bg-white dark:bg-[#161a21] rounded-2xl w-full max-w-[calc(100%-2rem)] mx-4 md:mx-auto md:max-w-sm p-4 md:p-6 shadow-2xl border border-neutral-200 dark:border-[#2c333f] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold m-0 text-neutral-900 dark:text-neutral-100">{title}</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 m-0 mt-2 leading-relaxed">{body}</p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-neutral-300 dark:border-[#39414f] px-4 py-2 min-h-[44px] text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-[#1b2029] w-full sm:w-auto"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-red-600 text-white px-4 py-2 min-h-[44px] text-sm font-semibold hover:bg-red-700 w-full sm:w-auto"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Model seçme ekranındaki filtreler. Buradaki seçenekler ModelSelectModal ile
 * birebir aynı olmalı — aksi halde girilen değer hiçbir filtreye takılmaz.
 * Değerler veritabanında virgülle ayrılmış tek metin olarak tutulur.
 */
const FILTER_FIELDS = [
  { key: 'filterCategory', label: 'Kategori', options: ['Kapalı', 'Duvar', 'Dış Mekan'] },
  { key: 'usage', label: 'Kullanım', options: ['Ticari İç Mekan', 'Pencereye bakan', 'Sanal Üretim', 'Sinema', 'Dış Mekan'] },
  { key: 'installation', label: 'Kurulum', options: ['Düz', 'Dışbükey', 'İçbükey', 'İç L Tipi', 'Dış L Tipi', 'Asılı', 'İstifleme'] },
  { key: 'configurable', label: 'Yapılandırılabilir', options: ['Hepsi Bir Arada', 'Dolap'] },
  { key: 'service', label: 'Hizmet', options: ['Ön', 'Arka', 'Kısmen Ön ve Kısmen Arka'] },
  { key: 'ledType', label: 'LED Tipi', options: ['CoB', 'SMD', 'MIP'] },
  { key: 'protection', label: 'Koruma', options: ['CoB', 'Ağız'] },
  {
    key: 'certification',
    label: 'Sertifikasyon',
    options: ['EMC B Sınıfı', 'TÜV Göz Konforu', 'TÜV Düşük Gri Tonlamalı Görüntü Netliği', 'Pantone Renk ve Cilt Tonu Doğrulama', 'Yangın Yönetmeliği', 'Deprem Testi'],
  },
  { key: 'features', label: 'Vesaire', options: ['LED HDR', 'HDR 10/10+', 'VXT', 'SmartThings Pro', 'Güç Yedekliliği'] },
]

/** Virgüllü metni diziye çevirir: "Düz,Kavisli" → ["Düz", "Kavisli"] */
const toList = (s) => (s ? String(s).split(',').map((x) => x.trim()).filter(Boolean) : [])

/** Çoklu seçim: onay kutularıyla değer seçtirir, virgüllü metin olarak döner */
function MultiCheck({ label, options, value, onChange }) {
  const selected = toList(value)
  const toggle = (opt) => {
    const next = selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt]
    onChange(next.join(','))
  }
  return (
    <div>
      <span className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o)
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              className={`text-xs rounded-full px-3 py-2 min-h-[44px] border transition-colors ${
                on ? 'bg-brand border-brand text-white' : 'bg-white dark:bg-[#161a21] border-neutral-300 dark:border-[#39414f] text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-[#4a5364]'
              }`}
            >
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const BLANK = {
  seriesId: 1,
  category: 'led',
  modelCode: '',
  name: '',
  productType: 'CABINET',
  defaultModulesPerCard: 10,
  price: 0,
  pixelPitchMm: 1.25,
  widthMm: 320,
  heightMm: 160,
  depthMm: 100,
  weightKg: 1.6,
  pixelWidth: 256,
  pixelHeight: 128,
  brightnessNits: 800,
  refreshRateHz: 3840,
  powerTypicalWatts: 11,
  powerMaxWatts: 32,
  viewingDistanceM: 3.1,
  sizeInch: '',
  bezelMm: '',
  // Filtre nitelikleri (virgüllü metin)
  filterCategory: '',
  usage: '',
  installation: '',
  configurable: '',
  service: '',
  ledType: '',
  protection: '',
  certification: '',
  features: '',
  ipRating: '',
  featured: false,
  // Görsel ve bileşen kodları
  imageUrl: '',
  sboxCode: '',
  jigCode: '',
  powerCord110Code: '',
  powerCord220Code: '',
}

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))
const money = (v) =>
  v === null || v === undefined
    ? '—'
    : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
const dt = (v) => (v ? new Date(v).toLocaleString('tr-TR') : '—')

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">{hint}</span>}
    </label>
  )
}

const inputCls =
  'w-full max-w-full border border-neutral-300 rounded-lg px-2.5 py-2 min-h-[44px] text-sm text-neutral-800 focus:outline-none focus:border-brand'

function Banner({ message }) {
  if (!message) return null
  return (
    <div
      className={`mb-5 rounded-lg px-4 py-3 text-sm ${
        message.type === 'ok'
          ? 'border border-green-200 bg-green-50 text-green-700'
          : 'border border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {message.text}
    </div>
  )
}

/** JWT sorma ekranı — Role=Admin oturumu yoksa yönetim ekranı çizilmez. */
function GirisEkrani() {
  const { setSessionData } = useSession()
  const [email, setEmail] = useState('')
  const [parola, setParola] = useState('')
  const [hata, setHata] = useState(null)
  const [deneniyor, setDeneniyor] = useState(false)

  const girisYap = async (e) => {
    e.preventDefault()
    if (deneniyor || !email || !parola) return
    setDeneniyor(true)
    setHata(null)
    try {
      const res = await apiFetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: parola }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setHata(body.message || 'E-posta veya parola hatalı.')
        return
      }
      if (body.role !== 'Admin') {
        setHata('Bu hesap yönetim paneline giremez. Admin hesabı gerekli.')
        return
      }
      setSessionData({
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        role: body.role,
        email: body.email,
        displayName: body.displayName || body.email,
      })
    } catch {
      setHata("API'ye bağlanılamadı. Backend (Docker API veya dotnet) çalışıyor mu kontrol edin.")
    } finally {
      setDeneniyor(false)
    }
  }

  const inputClass =
    'w-full max-w-full mt-1 border border-neutral-300 dark:border-[#39414f] rounded-lg px-3 py-2 min-h-[44px] text-sm bg-transparent focus:outline-none focus:border-brand'

  return (
    <div className="min-h-screen bg-[#f7f9fc] dark:bg-[#0b0f16] text-[#1c1c2b] dark:text-neutral-100 font-sans flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white dark:bg-[#121821] border border-neutral-200 dark:border-[#2a3342] rounded-2xl p-6 shadow-sm brand-page-enter overflow-hidden relative">
        <div className="brand-stripe absolute top-0 left-0 right-0 h-[3px]" aria-hidden />
        <div className="mb-4 pt-1">
          <BrandMark title="Yönetim Paneli" subtitle={BRAND.companyShort} showCompany={false} />
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0 mb-4">
          Admin hesabınızla e-posta ve parola girin.
        </p>

        <form onSubmit={girisYap} className="flex flex-col gap-3">
          <label className="block text-[13px] font-semibold text-neutral-600 dark:text-neutral-400">
            E-posta
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-[13px] font-semibold text-neutral-600 dark:text-neutral-400">
            Parola
            <input
              type="password"
              required
              minLength={8}
              value={parola}
              onChange={(e) => setParola(e.target.value)}
              className={inputClass}
            />
          </label>
          {hata && <p className="text-[13px] text-red-600 m-0">{hata}</p>}
          <button
            type="submit"
            disabled={deneniyor || !email || !parola}
            className="w-full mt-1 rounded-lg bg-brand text-white text-sm font-semibold py-2.5 min-h-[44px] hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {deneniyor ? 'Kontrol ediliyor…' : 'Giriş'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
            window.dispatchEvent(new Event('hashchange'))
          }}
          className="w-full mt-3 text-[13px] text-brand dark:text-brand-light hover:underline min-h-[44px] inline-flex items-center justify-center"
        >
          ← Konfigüratöre dön
        </button>
      </div>
    </div>
  )
}

export default function AdminPanel() {
  const { isAdmin, session, logout, displayName, email } = useSession()
  const girisYapildi = isAdmin && !!session?.accessToken
  const [tab, setTab] = useState('dashboard')
  const [formSection, setFormSection] = useState('basic') // basic | tech | parts
  const [confirm, setConfirm] = useState(null) // { title, body, onConfirm }

  // ---- Modeller + Seriler (birlikte yüklenir, çünkü form seri listesine ihtiyaç duyar) ----
  const [cabinets, setCabinets] = useState([])
  const [seriesList, setSeriesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(null)
  const [form, setForm] = useState(null) // null = form kapalı
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [productTypeFilter, setProductTypeFilter] = useState('all') // all | CABINET | MODULE

  const oturumDustu = () => {
    logout()
  }

  const askConfirm = (title, body, onConfirm) => {
    setConfirm({
      title,
      body,
      onConfirm: async () => {
        setConfirm(null)
        await onConfirm()
      },
    })
  }

  const load = useCallback(async () => {
    setLoading(true)
    setApiError(null)
    try {
      const [cRes, sRes] = await Promise.all([
        apiFetch(`${API_URL}/api/cabinets`),
        apiFetch(`${API_URL}/api/cabinets/series`),
      ])
      if (!cRes.ok || !sRes.ok) throw new Error('API yanıt vermedi')
      setCabinets(await cRes.json())
      setSeriesList(await sRes.json())
      await queryClient.invalidateQueries({ queryKey: ['cabinets'] })
    } catch {
      setApiError(
        'API\'ye bağlanılamadı. Docker API konteynerinin (port 5007) çalıştığından ve veritabanının açık olduğundan emin olun. Yerel dotnet run ile Docker aynı portta çakışmasın.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const startNew = () => {
    setEditingId(null)
    setFormSection('basic')
    setForm({ ...BLANK, seriesId: seriesList[0]?.id ?? 1 })
    setMessage(null)
  }

  const startEdit = (c) => {
    setEditingId(c.id)
    setFormSection('basic')
    setForm({
      seriesId: c.seriesId,
      category: c.category,
      modelCode: c.modelCode,
      name: c.name ?? '',
      productType: c.productType || 'CABINET',
      defaultModulesPerCard: c.defaultModulesPerCard ?? 10,
      price: c.price ?? 0,
      pixelPitchMm: c.pixelPitchMm,
      widthMm: c.widthMm,
      heightMm: c.heightMm,
      depthMm: c.depthMm,
      weightKg: c.weightKg,
      pixelWidth: c.pixelWidth,
      pixelHeight: c.pixelHeight,
      brightnessNits: c.brightnessNits,
      refreshRateHz: c.refreshRateHz,
      powerTypicalWatts: c.powerTypicalWatts,
      powerMaxWatts: c.powerMaxWatts,
      viewingDistanceM: c.viewingDistanceM ?? '',
      sizeInch: c.sizeInch ?? '',
      bezelMm: c.bezelMm ?? '',
      filterCategory: c.filterCategory ?? '',
      usage: c.usage ?? '',
      installation: c.installation ?? '',
      configurable: c.configurable ?? '',
      service: c.service ?? '',
      ledType: c.ledType ?? '',
      protection: c.protection ?? '',
      certification: c.certification ?? '',
      features: c.features ?? '',
      ipRating: c.ipRating ?? '',
      featured: Boolean(c.featured),
      imageUrl: c.imageUrl ?? '',
      sboxCode: c.sboxCode ?? '',
      jigCode: c.jigCode ?? '',
      powerCord110Code: c.powerCord110Code ?? '',
      powerCord220Code: c.powerCord220Code ?? '',
    })
    setMessage(null)
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Piksel sayısını ölçü ÷ pitch'ten hesaplar (tam bölünmüyorsa uyarı gösterilir)
  const pxW = form ? Number(form.widthMm) / Number(form.pixelPitchMm) : 0
  const pxH = form ? Number(form.heightMm) / Number(form.pixelPitchMm) : 0
  const pxWhole = Number.isFinite(pxW) && Number.isFinite(pxH) && Math.abs(pxW - Math.round(pxW)) < 1e-9 && Math.abs(pxH - Math.round(pxH)) < 1e-9

  const applyCalculatedPixels = () => {
    set('pixelWidth', Math.round(pxW))
    set('pixelHeight', Math.round(pxH))
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const body = {
        seriesId: Number(form.seriesId),
        category: form.category,
        name: form.name || null,
        modelCode: form.modelCode,
        productType: form.productType,
        defaultModulesPerCard: Number(form.defaultModulesPerCard),
        price: Number(form.price),
        pixelPitchMm: Number(form.pixelPitchMm),
        widthMm: Number(form.widthMm),
        heightMm: Number(form.heightMm),
        depthMm: Number(form.depthMm),
        weightKg: Number(form.weightKg),
        pixelWidth: Number(form.pixelWidth),
        pixelHeight: Number(form.pixelHeight),
        brightnessNits: Number(form.brightnessNits),
        refreshRateHz: Number(form.refreshRateHz),
        powerTypicalWatts: Number(form.powerTypicalWatts),
        powerMaxWatts: Number(form.powerMaxWatts),
        viewingDistanceM: num(form.viewingDistanceM),
        sizeInch: num(form.sizeInch),
        bezelMm: num(form.bezelMm),
        filterCategory: form.filterCategory || null,
        usage: form.usage || null,
        installation: form.installation || null,
        configurable: form.configurable || null,
        service: form.service || null,
        ledType: form.ledType || null,
        protection: form.protection || null,
        certification: form.certification || null,
        features: form.features || null,
        ipRating: num(form.ipRating),
        featured: Boolean(form.featured),
        imageUrl: form.imageUrl || null,
        sboxCode: form.sboxCode || null,
        jigCode: form.jigCode || null,
        powerCord110Code: form.powerCord110Code || null,
        powerCord220Code: form.powerCord220Code || null,
      }
      const res = await apiFetch(
        editingId ? `${API_URL}/api/cabinets/${editingId}` : `${API_URL}/api/cabinets`,
        {
          method: editingId ? 'PUT' : 'POST',
          auth: true,
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      if (res.status === 401) {
        // Parola sunucuda değişmiş olabilir; oturumu düşürüp yeniden sor.
        oturumDustu()
        throw new Error('Yönetim parolası geçersiz. Lütfen yeniden girin.')
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Kaydedilemedi.')
      }
      setForm(null)
      setEditingId(null)
      setMessage({ type: 'ok', text: editingId ? 'Model güncellendi.' : 'Yeni model eklendi.' })
      await load()
    } catch (e) {
      setMessage({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const remove = (c) => {
    askConfirm(
      'Modeli sil',
      `"${c.modelCode}" modeli kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
      async () => {
        try {
          const res = await apiFetch(`${API_URL}/api/cabinets/${c.id}`, {
            method: 'DELETE',
            auth: true,
          })
          if (res.status === 401) { oturumDustu(); return }
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.message || err.title || 'Silinemedi.')
          }
          setMessage({ type: 'ok', text: `"${c.modelCode}" silindi.` })
          await load()
        } catch (e) {
          setMessage({ type: 'err', text: e.message })
        }
      },
    )
  }

  // ---- Seriler ----
  const [seriesForm, setSeriesForm] = useState(null) // null kapalı, {} yeni, {id,...} düzenleme
  const [seriesSaving, setSeriesSaving] = useState(false)
  const [seriesMessage, setSeriesMessage] = useState(null)

  const startNewSeries = () => { setSeriesForm({ name: '', description: '' }); setSeriesMessage(null) }
  const startEditSeries = (s) => { setSeriesForm({ id: s.id, name: s.name, description: s.description || '' }); setSeriesMessage(null) }

  const saveSeries = async () => {
    setSeriesSaving(true)
    setSeriesMessage(null)
    try {
      const body = { name: seriesForm.name, description: seriesForm.description || null }
      const res = await apiFetch(
        seriesForm.id ? `${API_URL}/api/cabinets/series/${seriesForm.id}` : `${API_URL}/api/cabinets/series`,
        {
          method: seriesForm.id ? 'PUT' : 'POST',
          auth: true,
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      if (res.status === 401) { oturumDustu(); throw new Error('Yönetim parolası geçersiz.') }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Kaydedilemedi.')
      }
      setSeriesForm(null)
      await load()
    } catch (e) {
      setSeriesMessage({ type: 'err', text: e.message })
    } finally {
      setSeriesSaving(false)
    }
  }

  const removeSeries = (s) => {
    askConfirm(
      'Seriyi sil',
      `"${s.name}" serisi silinecek. Bağlı modeller etkilenebilir.`,
      async () => {
        try {
          const res = await apiFetch(`${API_URL}/api/cabinets/series/${s.id}`, { method: 'DELETE', auth: true })
          if (res.status === 401) { oturumDustu(); return }
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.message || 'Silinemedi.')
          }
          setSeriesMessage({ type: 'ok', text: `"${s.name}" silindi.` })
          await load()
        } catch (e) {
          setSeriesMessage({ type: 'err', text: e.message })
        }
      },
    )
  }

  // ---- Teklifler (Quotes) ----
  const [quotes, setQuotes] = useState([])
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [quotesError, setQuotesError] = useState(null)
  const [quotesPage, setQuotesPage] = useState(1)
  const [quotesTotalPages, setQuotesTotalPages] = useState(1)
  const [quotesTotalCount, setQuotesTotalCount] = useState(0)
  const [quotesSearch, setQuotesSearch] = useState('')

  const loadQuotes = useCallback(async (page = 1, search = '') => {
    setQuotesLoading(true)
    setQuotesError(null)
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (search) qs.set('search', search)
      const res = await apiFetch(`${API_URL}/api/quotes?${qs}`, { auth: true })
      if (res.status === 401) { oturumDustu(); return }
      if (!res.ok) throw new Error('Teklifler alınamadı.')
      const data = await res.json()
      setQuotes(data.items || [])
      setQuotesTotalPages(data.totalPages || 1)
      setQuotesTotalCount(data.totalCount ?? (data.items || []).length)
      setQuotesPage(data.page || page)
    } catch (e) {
      setQuotesError(e.message)
    } finally {
      setQuotesLoading(false)
    }
  }, [])

  const removeQuote = (q) => {
    askConfirm(
      'Teklifi sil',
      `"${q.customerName || 'İsimsiz'}" teklifi kalıcı olarak silinecek.`,
      async () => {
        try {
          const res = await apiFetch(`${API_URL}/api/quotes/${q.id}`, { method: 'DELETE', auth: true })
          if (res.status === 401) { oturumDustu(); return }
          if (!res.ok) throw new Error('Silinemedi.')
          await loadQuotes(quotesPage, quotesSearch)
        } catch (e) {
          setQuotesError(e.message)
        }
      },
    )
  }

  const updateQuoteStatus = async (q, status) => {
    try {
      const res = await apiFetch(`${API_URL}/api/quotes/${q.id}/status`, {
        method: 'PUT',
        auth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.status === 401) { oturumDustu(); return }
      if (!res.ok) throw new Error('Durum güncellenemedi.')
      await loadQuotes(quotesPage, quotesSearch)
    } catch (e) {
      setQuotesError(e.message)
    }
  }

  // ---- Sohbet Kayıtları (ChatLogs) ----
  const [chatLogs, setChatLogs] = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState(null)
  const [onlyUnanswered, setOnlyUnanswered] = useState(false)

  const loadChatLogs = useCallback(async (unansweredOnly) => {
    setChatLoading(true)
    setChatError(null)
    try {
      const res = await apiFetch(`${API_URL}/api/chatlogs?limit=300&onlyUnanswered=${unansweredOnly ? 'true' : 'false'}`, {
        auth: true,
      })
      if (res.status === 401) { oturumDustu(); return }
      if (!res.ok) throw new Error('Sohbet kayıtları alınamadı.')
      setChatLogs(await res.json())
    } catch (e) {
      setChatError(e.message)
    } finally {
      setChatLoading(false)
    }
  }, [])

  /* ---- Geri Bildirimler (test kullanıcılarının hata notları) ---- */
  const [feedback, setFeedback] = useState([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState(null)
  const [onlyOpenFeedback, setOnlyOpenFeedback] = useState(false)

  const loadFeedback = useCallback(async (openOnly) => {
    setFeedbackLoading(true)
    setFeedbackError(null)
    try {
      const res = await apiFetch(`${API_URL}/api/feedback?limit=300&onlyOpen=${openOnly ? 'true' : 'false'}`, {
        auth: true,
      })
      if (res.status === 401) { oturumDustu(); return }
      if (!res.ok) throw new Error('Geri bildirimler alınamadı.')
      setFeedback(await res.json())
    } catch (e) {
      setFeedbackError(e.message)
    } finally {
      setFeedbackLoading(false)
    }
  }, [])

  const setFeedbackResolved = async (f, resolved) => {
    try {
      const res = await apiFetch(`${API_URL}/api/feedback/${f.id}/resolved`, {
        method: 'PUT',
        auth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved }),
      })
      if (res.status === 401) { oturumDustu(); return }
      if (!res.ok && res.status !== 404) throw new Error('Güncellenemedi.')
    } catch (e) {
      setFeedbackError(e.message)
    } finally {
      await loadFeedback(onlyOpenFeedback)
    }
  }

  const removeFeedback = (f) => {
    askConfirm(
      'Bildirimi sil',
      'Bu geri bildirim kalıcı olarak silinecek.',
      async () => {
        try {
          const res = await apiFetch(`${API_URL}/api/feedback/${f.id}`, { method: 'DELETE', auth: true })
          if (res.status === 401) { oturumDustu(); return }
          // 404 = zaten silinmiş; hata sayılmaz (bkz. kullanıcı silme notu)
          if (!res.ok && res.status !== 404) throw new Error('Silinemedi.')
        } catch (e) {
          setFeedbackError(e.message)
        } finally {
          await loadFeedback(onlyOpenFeedback)
        }
      },
    )
  }

  // ---- Kayıtlı Projeler (Configurations) ----
  const [configs, setConfigs] = useState([])
  const [configsLoading, setConfigsLoading] = useState(false)
  const [configsError, setConfigsError] = useState(null)
  const [configsPage, setConfigsPage] = useState(1)
  const [configsTotalPages, setConfigsTotalPages] = useState(1)
  const [configsTotalCount, setConfigsTotalCount] = useState(0)
  const [configsSearch, setConfigsSearch] = useState('')

  const loadConfigs = useCallback(async (page = 1, search = '') => {
    setConfigsLoading(true)
    setConfigsError(null)
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (search) qs.set('search', search)
      const res = await apiFetch(`${API_URL}/api/configurations?${qs}`, { auth: true })
      if (res.status === 401) { oturumDustu(); return }
      if (!res.ok) throw new Error('Kayıtlı projeler alınamadı.')
      const data = await res.json()
      setConfigs(data.items || [])
      setConfigsTotalPages(data.totalPages || 1)
      setConfigsTotalCount(data.totalCount ?? (data.items || []).length)
      setConfigsPage(data.page || page)
    } catch (e) {
      setConfigsError(e.message)
    } finally {
      setConfigsLoading(false)
    }
  }, [])

  const removeConfig = (c) => {
    askConfirm(
      'Projeyi sil',
      `"${c.projectName}" projesi kalıcı olarak silinecek.`,
      async () => {
        try {
          const res = await apiFetch(`${API_URL}/api/configurations/${c.id}`, { method: 'DELETE', auth: true })
          if (res.status === 401) { oturumDustu(); return }
          if (!res.ok) throw new Error('Silinemedi.')
          await loadConfigs(configsPage, configsSearch)
        } catch (e) {
          setConfigsError(e.message)
        }
      },
    )
  }

  const updateConfigStatus = async (c, status) => {
    try {
      const res = await apiFetch(`${API_URL}/api/configurations/${c.id}/status`, {
        method: 'PUT',
        auth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.status === 401) { oturumDustu(); return }
      if (!res.ok) throw new Error('Durum güncellenemedi.')
      await loadConfigs(configsPage, configsSearch)
    } catch (e) {
      setConfigsError(e.message)
    }
  }

  // ---- Analitik (Dashboard) ----
  const [dashboard, setDashboard] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState(null)

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true)
    setDashboardError(null)
    try {
      const res = await apiFetch(`${API_URL}/api/analytics/dashboard`, { auth: true })
      if (res.status === 401) { oturumDustu(); return }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Analitik veriler alınamadı.')
      }
      setDashboard(await res.json())
    } catch (e) {
      setDashboardError(e.message)
    } finally {
      setDashboardLoading(false)
    }
  }, [])

  // ---- Kullanıcılar (Admin / Dealer; Tester yalnızca beta/dev) ----
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState(null)
  const [userForm, setUserForm] = useState({ email: '', password: '', displayName: '', role: 'Dealer' })
  const [userSaving, setUserSaving] = useState(false)

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      const res = await apiFetch(`${API_URL}/api/users`, { auth: true })
      if (res.status === 401) { oturumDustu(); return }
      if (!res.ok) throw new Error('Kullanıcı listesi alınamadı.')
      setUsers(await res.json())
    } catch (e) {
      setUsersError(e.message)
    } finally {
      setUsersLoading(false)
    }
  }, [])

  const createUser = async (e) => {
    e.preventDefault()
    if (userSaving) return
    setUserSaving(true)
    setUsersError(null)
    try {
      const res = await apiFetch(`${API_URL}/api/users`, {
        method: 'POST',
        auth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      })
      const body = await res.json().catch(() => ({}))
      if (res.status === 401) { oturumDustu(); return }
      if (!res.ok) throw new Error(body.message || 'Kullanıcı oluşturulamadı.')
      setUserForm({ email: '', password: '', displayName: '', role: 'Dealer' })
      await loadUsers()
    } catch (err) {
      setUsersError(err.message)
    } finally {
      setUserSaving(false)
    }
  }

  const updateUserRole = async (u, role) => {
    try {
      const res = await apiFetch(`${API_URL}/api/users/${u.id}/role`, {
        method: 'PUT',
        auth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.status === 401) { oturumDustu(); return }
      if (!res.ok) throw new Error(body.message || 'Rol güncellenemedi.')
      await loadUsers()
    } catch (err) {
      setUsersError(err.message)
    }
  }

  const removeUser = (u) => {
    askConfirm(
      'Kullanıcıyı sil',
      `"${u.email}" hesabı silinecek.`,
      async () => {
        try {
          const res = await apiFetch(`${API_URL}/api/users/${u.id}`, { method: 'DELETE', auth: true })
          const body = await res.json().catch(() => ({}))
          if (res.status === 401) { oturumDustu(); return }
          /*
           * 404 = kayıt zaten yok (ör. düğmeye iki kez basıldı ya da başka bir
           * sekmede silindi). Bu bir hata değil, istenen sonuç; hata sayılınca
           * ekranda "Silinemedi." yazıyor ve satır listede kalmaya devam
           * ediyordu — oysa kullanıcı gerçekten silinmişti.
           */
          if (!res.ok && res.status !== 404) throw new Error(body.message || 'Silinemedi.')
          setUsersError(null)
        } catch (err) {
          setUsersError(err.message)
        } finally {
          /*
           * Liste HER durumda yenilenir. Yenileme yalnızca başarı yolundaydı;
           * hata mesajı gösterilen durumda ekran sunucudaki gerçeğe göre
           * güncellenmiyor, silinmiş satır sayfa elle yenilenene kadar
           * duruyordu.
           */
          await loadUsers()
        }
      },
    )
  }

  const downloadConfigPdf = async (c) => {
    try {
      const res = await apiFetch(`${API_URL}/api/configurations/${c.id}/pdf?kind=admin`, { auth: true })
      if (!res.ok) throw new Error('PDF indirilemedi.')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Ic_Rapor_${c.id}_${c.projectName || ''}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setConfigsError(e.message)
    }
  }

  // Sekme değişince ilgili veriyi getir
  useEffect(() => {
    if (!girisYapildi) return
    if (tab === 'dashboard') loadDashboard()
    if (tab === 'quotes') loadQuotes(1, '')
    if (tab === 'chatlogs') loadChatLogs(onlyUnanswered)
    if (tab === 'feedback') loadFeedback(onlyOpenFeedback)
    if (tab === 'configs') loadConfigs(1, '')
    if (tab === 'users') loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, girisYapildi])

  useEffect(() => {
    if (tab === 'chatlogs' && girisYapildi) loadChatLogs(onlyUnanswered)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyUnanswered])

  useEffect(() => {
    if (tab === 'feedback' && girisYapildi) loadFeedback(onlyOpenFeedback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyOpenFeedback])

  if (!girisYapildi) {
    return <GirisEkrani />
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] dark:bg-[#0b0f16] text-[#1c1c2b] dark:text-neutral-100 font-sans">
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        body={confirm?.body}
        onCancel={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
      />

      <header className="bg-white dark:bg-[#121821] border-b border-neutral-200/80 dark:border-[#2a3342] px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <BrandMark
          title="Yönetim Paneli"
          subtitle={
            email
              ? `${displayName || email}`
              : 'Ürün kataloğu, satış talepleri ve sistem izleme'
          }
          size="lg"
          /* Telefonda sağdaki "Çıkış / Konfigüratöre dön" ile yarışıp
             "MASAÜSTÜ Bİ… / Yönetim P…" diye kırpılıyordu; dar ekranda
             yalnızca logo kalıyor (bkz. BrandMark → hideTextOnMobile). */
          hideTextOnMobile
        />
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={oturumDustu}
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 min-h-[44px] inline-flex items-center"
          >
            Çıkış
          </button>
          <button
            type="button"
            onClick={() => {
              window.history.replaceState(null, '', window.location.pathname + window.location.search)
              window.dispatchEvent(new Event('hashchange'))
            }}
            className="text-sm text-brand dark:text-brand-light hover:underline min-h-[44px] inline-flex items-center"
          >
            ← Konfigüratöre dön
          </button>
        </div>
      </header>
      <BrandStripe />

      {/*
        ---- Gruplu sekme çubuğu ----

        SEKMELER HER GENİŞLİKTE SARMALANIR, HİÇBİR ZAMAN KESİLMEZ.

        Çubuk tek satıra zorlanıyordu (`min-w-max` + `overflow-x-auto`): sekiz
        sekme dar ekrana sığmadığı için son sekmeler dışarıda kalıyor, kenarda
        yarım kesilmiş bir sekme görünüyordu. Yatay kaydırma vardı ama görünür
        bir işareti olmadığından devamı olduğu fark edilmiyordu.

        SARMALAMA NEDEN KIRILIM NOKTASINA BAĞLANMADI: ilk düzeltmede sarmalama
        yalnızca `sm` altında (< 640 px) açılmıştı. Telefon YAN tutulduğunda
        görüntü alanı 844 px oluyor, yani 640'ın üstünde — masaüstü dalı devreye
        giriyor ve sekmeler yine kesiliyordu. Genişlik eşiğiyle "telefon mu"
        sorusunu doğru cevaplamak mümkün değil; onun yerine sarmalama HER
        genişlikte açık. Geniş ekranda sekmeler zaten yan yana sığdığı için tek
        satır kalır, yani masaüstü görünümü değişmez; yer kalmadığında ise
        kesilmek yerine alt satıra iner.

        Grup başlıkları (GENEL / ÜRÜN / SATIŞ / SİSTEM) ve gruplar arası ayraç
        `lg` (≥ 1024 px) altında gizleniyor: sekmeler sarmalandığında başlık
        kendi grubundan kopup yanlış sekmenin üstünde kalıyor, gruplama
        anlatmak yerine yanıltıyordu.
      */}
      <div className="bg-white dark:bg-[#121821] border-b border-neutral-200 dark:border-[#2a3342] px-4 sm:px-8 w-full">
        <div className="flex flex-wrap items-end gap-x-1 lg:gap-6">
          {TAB_GROUPS.map((group, gi) => (
            <div key={group.label} className="flex flex-wrap items-end lg:gap-1">
              {gi > 0 && <span className="hidden lg:block w-px h-6 bg-neutral-200 dark:bg-[#2c333f] mx-1 mb-2" />}
              <div className="flex flex-col">
                <span className="hidden lg:block text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400 px-2 mb-0.5">
                  {group.label}
                </span>
                <div className="flex flex-wrap">
                  {group.items.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={`whitespace-nowrap px-2 lg:px-3 xl:px-4 py-2 lg:py-2.5 min-h-[44px] text-[13px] lg:text-sm font-medium border-b-2 -mb-px transition-colors ${
                        tab === t.key
                          ? 'border-[#2962ad] text-[#2962ad] dark:text-[#9db9dc]'
                          : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 w-full max-w-full overflow-x-hidden">
        {apiError && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {apiError}
            <button type="button" onClick={load} className="ml-3 underline min-h-[44px] inline-flex items-center">Tekrar dene</button>
          </div>
        )}

        {/* ================= DASHBOARD ================= */}
        {tab === 'dashboard' && (
          <div>
            {dashboardError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{dashboardError}</div>}
            {dashboardLoading && !dashboard && <p className="text-sm text-neutral-500 dark:text-neutral-400">Yükleniyor…</p>}
            {dashboard && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Toplam Teklif', value: dashboard.totalQuotes, go: 'quotes' },
                    { label: 'Beklemede', value: dashboard.pendingQuotes, go: 'quotes' },
                    { label: 'Kayıtlı Proje', value: dashboard.totalConfigurations, go: 'configs' },
                    { label: 'Cevaplanamayan Soru', value: dashboard.unansweredChatLogs, go: 'chatlogs' },
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setTab(s.go)}
                      className="text-left bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-xl p-4 hover:border-brand transition-colors min-h-[44px] w-full max-w-full"
                    >
                      <div className="text-2xl font-bold">{s.value}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{s.label}</div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="border border-neutral-200 dark:border-[#2c333f] rounded-xl p-5 bg-white dark:bg-[#161a21]">
                    <h3 className="text-sm font-bold m-0 mb-3">Hızlı işlemler</h3>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                      <button type="button" onClick={() => setTab('cabins')} className="rounded-full border border-neutral-300 dark:border-[#39414f] px-3.5 py-2 min-h-[44px] text-[13px] font-semibold hover:border-brand">Modeller</button>
                      <button type="button" onClick={() => setTab('hardware')} className="rounded-full border border-neutral-300 dark:border-[#39414f] px-3.5 py-2 min-h-[44px] text-[13px] font-semibold hover:border-brand">Donanım</button>
                      <button type="button" onClick={() => setTab('quotes')} className="rounded-full border border-neutral-300 dark:border-[#39414f] px-3.5 py-2 min-h-[44px] text-[13px] font-semibold hover:border-brand">Teklifler</button>
                      <button type="button" onClick={() => setTab('users')} className="rounded-full border border-neutral-300 dark:border-[#39414f] px-3.5 py-2 min-h-[44px] text-[13px] font-semibold hover:border-brand">Kullanıcılar</button>
                    </div>
                  </div>
                  <div className="border border-neutral-200 dark:border-[#2c333f] rounded-xl p-5 bg-white dark:bg-[#161a21]">
                    <h3 className="text-sm font-bold m-0 mb-2">Katalog özeti</h3>
                    <p className="text-[13px] text-neutral-600 dark:text-neutral-300 m-0">
                      {loading ? '…' : `${cabinets.length} model · ${seriesList.length} seri`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-neutral-100 dark:border-[#242b36]">
                      <h3 className="text-sm font-bold m-0">En çok konfigüre edilen modeller</h3>
                    </div>
                    <div className="overflow-x-auto w-full">
                    <table className="w-full text-sm">
                      <tbody>
                        {(dashboard.topModels || []).map((m) => (
                          <tr key={m.cabinId} className="border-t border-neutral-100 dark:border-[#242b36]">
                            <td className="px-4 py-2.5 font-medium">{m.modelCode}</td>
                            <td className="px-4 py-2.5 text-right text-neutral-500 dark:text-neutral-400">{m.configurationCount} proje</td>
                          </tr>
                        ))}
                        {(dashboard.topModels || []).length === 0 && (
                          <tr><td className="px-4 py-6 text-center text-neutral-400 dark:text-neutral-500">Henüz veri yok.</td></tr>
                        )}
                      </tbody>
                    </table>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-neutral-100 dark:border-[#242b36] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <h3 className="text-sm font-bold m-0">SSS önerisi (cevaplanamayan sorular)</h3>
                      <button type="button" onClick={() => setTab('chatlogs')} className="text-xs text-brand hover:underline min-h-[44px] inline-flex items-center">Loglar</button>
                    </div>
                    <div className="overflow-x-auto w-full">
                    <table className="w-full text-sm">
                      <tbody>
                        {(dashboard.faqSuggestions || []).map((f, i) => (
                          <tr key={i} className="border-t border-neutral-100 dark:border-[#242b36] align-top">
                            <td className="px-4 py-2.5">{f.question}</td>
                            <td className="px-4 py-2.5 text-right text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{f.askedCount}×</td>
                          </tr>
                        ))}
                        {(dashboard.faqSuggestions || []).length === 0 && (
                          <tr><td className="px-4 py-6 text-center text-neutral-400 dark:text-neutral-500">Cevaplanamayan soru yok.</td></tr>
                        )}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= MODELLER ================= */}
        {tab === 'cabins' && (
          <>
            <Banner message={message} />

            {form && (
              <div className="mb-6 bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-xl p-6">
                <h2 className="text-lg font-bold m-0 mb-4">
                  {editingId ? `Model düzenle (#${editingId})` : 'Yeni model ekle'}
                </h2>

                <div className="flex flex-col md:flex-row flex-wrap gap-2 mb-5">
                  {[
                    { id: 'basic', label: 'Temel' },
                    { id: 'tech', label: 'Teknik' },
                    { id: 'parts', label: 'Bileşenler & Filtre' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFormSection(s.id)}
                      className={`px-3.5 py-2 min-h-[44px] rounded-lg text-[13px] font-semibold transition-colors w-full md:w-auto ${
                        formSection === s.id
                          ? 'bg-brand text-white'
                          : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#1f2530]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className={formSection === 'basic' ? '' : 'hidden'}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <Field label="Ad" hint="Katalogda görünen ad; boşsa model kodu kullanılır">
                    <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="ör. Indoor P2.5 Modül" />
                  </Field>
                  <Field label="Model Kodu" hint="Örn: Q30H15B13V3 Outdoor Panel, 550012949A Indoor Panel">
                    <input value={form.modelCode} onChange={(e) => set('modelCode', e.target.value)} className={inputCls} placeholder="ör. LED-P1.25" />
                  </Field>
                  <Field label="Kategori">
                    <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
                      {CATEGORIES.map((c) => (
                        <option key={c.v} value={c.v}>{c.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Seri">
                    <select value={form.seriesId} onChange={(e) => set('seriesId', e.target.value)} className={inputCls}>
                      {seriesList.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Piksel Aralığı (mm)">
                    <input type="number" step="0.01" value={form.pixelPitchMm} onChange={(e) => set('pixelPitchMm', e.target.value)} className={inputCls} />
                  </Field>
                </div>

                {/* Ürün tipi — Kabin vs Tekli Panel */}
                <div className="mb-4">
                  <div className="text-[12px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Ürün tipi <span className="font-normal text-neutral-400">(Kabin mi, Tekli Panel mi?)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRODUCT_TYPES.map((p) => {
                      const on = form.productType === p.v
                      return (
                        <button
                          key={p.v}
                          type="button"
                          onClick={() => set('productType', p.v)}
                          className={`text-left rounded-xl border-2 px-4 py-3 min-h-[44px] transition-colors ${
                            on
                              ? 'btn-selected'
                              : 'border-neutral-200 dark:border-[#2c333f] hover:border-brand/40'
                          }`}
                        >
                          <div className="text-sm font-bold">{p.label}</div>
                          <div className={`text-[11px] mt-0.5 ${on ? 'text-white/80' : 'text-neutral-500 dark:text-neutral-400'}`}>{p.hint}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* --- Fiyat ve panel kartı (Configurations hesap motoruna girdi) --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <Field label="Fiyat (USD)" hint="Birim fiyat ABD doları cinsinden. Kayıtlı proje toplamı bu değerle hesaplanır.">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">$</span>
                      <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} className={inputCls} />
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">USD</span>
                    </div>
                  </Field>
                  <Field label="Kart Başına Modül" hint="Yalnızca Tekli Panel seçiliyken anlamlı">
                    <input
                      type="number"
                      min="1"
                      value={form.defaultModulesPerCard}
                      onChange={(e) => set('defaultModulesPerCard', e.target.value)}
                      className={inputCls}
                      disabled={form.productType !== 'MODULE'}
                    />
                  </Field>
                </div>
                </div>

                <div className={formSection === 'tech' ? '' : 'hidden'}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <Field label="Genişlik (mm)">
                    <input type="number" value={form.widthMm} onChange={(e) => set('widthMm', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Yükseklik (mm)">
                    <input type="number" value={form.heightMm} onChange={(e) => set('heightMm', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Derinlik (mm)">
                    <input type="number" value={form.depthMm} onChange={(e) => set('depthMm', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Ağırlık (kg)">
                    <input type="number" step="0.1" value={form.weightKg} onChange={(e) => set('weightKg', e.target.value)} className={inputCls} />
                  </Field>
                </div>

                {/* Piksel — ölçü ÷ pitch tam bölünmeli */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
                  <Field label="Piksel Genişlik">
                    <input type="number" value={form.pixelWidth} onChange={(e) => set('pixelWidth', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Piksel Yükseklik">
                    <input type="number" value={form.pixelHeight} onChange={(e) => set('pixelHeight', e.target.value)} className={inputCls} />
                  </Field>
                  <div className="col-span-1 sm:col-span-2 lg:col-span-2 flex items-end">
                    <div className={`text-xs rounded-lg px-3 py-2 w-full ${pxWhole ? 'bg-neutral-100 dark:bg-[#222833] text-neutral-600 dark:text-neutral-400' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                      Ölçü ÷ pitch = <strong>{Number.isFinite(pxW) ? pxW.toFixed(2) : '—'}</strong> × <strong>{Number.isFinite(pxH) ? pxH.toFixed(2) : '—'}</strong>
                      {!pxWhole && ' — tam bölünmüyor, gerçek bir kabinde bu değerler tam sayı olmalı.'}
                      <button type="button" onClick={applyCalculatedPixels} className="ml-2 underline min-h-[44px] inline-flex items-center">
                        hesaplanan değeri uygula
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <Field label="Parlaklık (nit)">
                    <input type="number" value={form.brightnessNits} onChange={(e) => set('brightnessNits', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Yenileme Hızı (Hz)">
                    <input type="number" value={form.refreshRateHz} onChange={(e) => set('refreshRateHz', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Tipik Güç (W)">
                    <input type="number" value={form.powerTypicalWatts} onChange={(e) => set('powerTypicalWatts', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Maksimum Güç (W)">
                    <input type="number" value={form.powerMaxWatts} onChange={(e) => set('powerMaxWatts', e.target.value)} className={inputCls} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                  <Field label="İzleme Mesafesi (m)" hint="Boş bırakılırsa pitch × 2,5 ile hesaplanır">
                    <input type="number" step="0.1" value={form.viewingDistanceM} onChange={(e) => set('viewingDistanceM', e.target.value)} className={inputCls} />
                  </Field>
                  {form.category === 'videowall' && form.productType !== 'MODULE' && (
                    <>
                      <Field label="Panel Boyutu (inç)" hint="Yalnızca video duvarı">
                        <input type="number" value={form.sizeInch} onChange={(e) => set('sizeInch', e.target.value)} className={inputCls} />
                      </Field>
                      <Field label="Çerçeve (mm)" hint="Yalnızca video duvarı">
                        <input type="number" step="0.01" value={form.bezelMm} onChange={(e) => set('bezelMm', e.target.value)} className={inputCls} />
                      </Field>
                    </>
                  )}
                </div>
                </div>

                <div className={formSection === 'parts' ? '' : 'hidden'}>
                {/* --- Filtre nitelikleri --- */}
                <div className="border-t border-neutral-100 dark:border-[#242b36] pt-5 mb-5">
                  <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 m-0 mb-1">Filtre Nitelikleri</h3>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 m-0 mb-4">
                    Model seçme ekranındaki filtrelerde bu modelin görünmesi için işaretleyin. Birden fazla seçebilirsiniz.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {FILTER_FIELDS.map((f) => (
                      <MultiCheck
                        key={f.key}
                        label={f.label}
                        options={f.options}
                        value={form[f.key]}
                        onChange={(v) => set(f.key, v)}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                    <Field label="IP sınıfı" hint="İç 20/30 · dış 65. Boş = sihirbaz IP elemez">
                      <input type="number" min="10" max="69" value={form.ipRating} onChange={(e) => set('ipRating', e.target.value)} className={inputCls} placeholder="30" />
                    </Field>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer min-h-[44px]">
                        <input
                          type="checkbox"
                          checked={Boolean(form.featured)}
                          onChange={(e) => set('featured', e.target.checked)}
                        />
                        Öne çıkar (sihirbaz hedef stok)
                      </label>
                    </div>
                  </div>
                </div>

                {/* --- Görsel ve bileşen kodları --- */}
                <div className="border-t border-neutral-100 dark:border-[#242b36] pt-5 mb-5">
                  <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 m-0 mb-1">Görsel ve Bileşen Kodları</h3>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 m-0 mb-4">
                    Görsel adresi model kartında, bileşen kodları sayfa altındaki "Bileşenler" bölümünde gösterilir.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="col-span-2 md:col-span-3">
                      <Field label="Ürün Görseli Adresi" hint="Boş bırakılırsa genel bir ekran ikonu gösterilir">
                        <input value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} className={inputCls} placeholder="https://... veya /urun-gorseli.jpg" />
                      </Field>
                    </div>
                    <Field label="S-Kutu Kodu">
                      <input value={form.sboxCode} onChange={(e) => set('sboxCode', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Jig Kodu">
                      <input value={form.jigCode} onChange={(e) => set('jigCode', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Güç Kablosu (110V)">
                      <input value={form.powerCord110Code} onChange={(e) => set('powerCord110Code', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Güç Kablosu (220V)">
                      <input value={form.powerCord220Code} onChange={(e) => set('powerCord220Code', e.target.value)} className={inputCls} />
                    </Field>
                  </div>
                </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="rounded-full bg-brand text-white text-sm font-semibold px-6 py-2.5 min-h-[44px] hover:bg-brand-dark disabled:bg-neutral-300 w-full sm:w-auto"
                  >
                    {saving ? 'Kaydediliyor…' : editingId ? 'Güncelle' : 'Ekle'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForm(null); setEditingId(null) }}
                    className="rounded-full border border-neutral-300 dark:border-[#39414f] text-sm px-6 py-2.5 min-h-[44px] hover:bg-neutral-50 dark:hover:bg-[#1b2029] w-full sm:w-auto"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-xl overflow-hidden">
              <div className="flex flex-col md:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-neutral-100 dark:border-[#242b36]">
                <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-2 md:gap-3">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400 mr-1">
                    {loading
                      ? 'Yükleniyor…'
                      : `${cabinets.filter((c) => productTypeFilter === 'all' || normalizeProductType(c.productType) === productTypeFilter).length} model`}
                  </span>
                  {[
                    { v: 'all', l: 'Tümü' },
                    { v: 'CABINET', l: 'Kabin' },
                    { v: 'MODULE', l: 'Panel' },
                  ].map((f) => (
                    <button
                      key={f.v}
                      type="button"
                      onClick={() => setProductTypeFilter(f.v)}
                      className={`rounded-full px-3 py-2 min-h-[44px] text-[12px] font-semibold border transition-colors ${
                        productTypeFilter === f.v
                          ? 'btn-selected border'
                          : 'border-neutral-300 dark:border-[#39414f] text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      {f.l}
                    </button>
                  ))}
                </div>
                {!form && (
                  <button
                    type="button"
                    onClick={startNew}
                    disabled={!!apiError}
                    className="rounded-full bg-brand text-white text-sm font-semibold px-5 py-2 min-h-[44px] hover:bg-brand-dark disabled:bg-neutral-300 shrink-0 w-full sm:w-auto"
                  >
                    + Yeni model ekle
                  </button>
                )}
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-[#1b2029] text-neutral-500 dark:text-neutral-400 text-xs">
                    <tr>
                      {['ID', 'Model Kodu', 'Tür', 'Kategori', 'Seri', 'Pitch', 'Ölçü (mm)', 'Piksel', 'Ağırlık', 'Fiyat (USD)', ''].map((h) => (
                        <th key={h} className="text-left font-medium px-4 py-2.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cabinets
                      .filter((c) => productTypeFilter === 'all' || normalizeProductType(c.productType) === productTypeFilter)
                      .map((c) => (
                      <tr key={c.id} className="border-t border-neutral-100 dark:border-[#242b36] hover:bg-neutral-50 dark:hover:bg-[#1b2029]">
                        <td className="px-4 py-2.5 text-neutral-400 dark:text-neutral-500">{c.id}</td>
                        <td className="px-4 py-2.5 font-medium">{c.modelCode}</td>
                        <td className="px-4 py-2.5"><ProductTypeBadge productType={c.productType} /></td>
                        <td className="px-4 py-2.5">{c.category === 'videowall' ? 'Video Duvarı' : 'LED'}</td>
                        <td className="px-4 py-2.5 text-neutral-500 dark:text-neutral-400">{c.series?.name || '—'}</td>
                        <td className="px-4 py-2.5">{c.pixelPitchMm} mm</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">{c.widthMm} × {c.heightMm} × {c.depthMm}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">{c.pixelWidth} × {c.pixelHeight}</td>
                        <td className="px-4 py-2.5">{c.weightKg} kg</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">{money(c.price)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right">
                          <button type="button" onClick={() => startEdit(c)} className="text-brand dark:text-brand-light hover:underline mr-3 inline-flex items-center min-h-[44px] px-2">Düzenle</button>
                          <button type="button" onClick={() => remove(c)} className="text-red-600 hover:underline inline-flex items-center min-h-[44px] px-2">Sil</button>
                        </td>
                      </tr>
                    ))}
                    {!loading && cabinets.filter((c) => productTypeFilter === 'all' || normalizeProductType(c.productType) === productTypeFilter).length === 0 && !apiError && (
                      <tr>
                        <td colSpan={11} className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500">
                          {productTypeFilter === 'all'
                            ? 'Henüz model yok. "Yeni model ekle" ile başlayın.'
                            : 'Bu ürün tipinde kayıt yok.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-4">
              Buradaki değişiklikler doğrudan veritabanına yazılır. Konfigüratör sayfasını yenilediğinizde yeni modeller görünür.
            </p>
          </>
        )}

        {/* ================= DONANIM + İŞÇİLİK ================= */}
        {tab === 'hardware' && (
          <HardwareCatalogSection oturumDustu={oturumDustu} askConfirm={askConfirm} />
        )}

        {/* ================= SERİLER ================= */}
        {tab === 'series' && (
          <>
            <Banner message={seriesMessage} />

            {seriesForm && (
              <div className="mb-6 bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-xl p-6">
                <h2 className="text-lg font-bold m-0 mb-4">{seriesForm.id ? `Seri düzenle (#${seriesForm.id})` : 'Yeni seri ekle'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <Field label="Seri Adı">
                    <input value={seriesForm.name} onChange={(e) => setSeriesForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="ör. LED İç Mekan" />
                  </Field>
                  <Field label="Açıklama">
                    <input value={seriesForm.description} onChange={(e) => setSeriesForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
                  </Field>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button type="button" onClick={saveSeries} disabled={seriesSaving || !seriesForm.name} className="rounded-full bg-brand text-white text-sm font-semibold px-6 py-2.5 min-h-[44px] hover:bg-brand-dark disabled:bg-neutral-300 w-full sm:w-auto">
                    {seriesSaving ? 'Kaydediliyor…' : seriesForm.id ? 'Güncelle' : 'Ekle'}
                  </button>
                  <button type="button" onClick={() => setSeriesForm(null)} className="rounded-full border border-neutral-300 dark:border-[#39414f] text-sm px-6 py-2.5 min-h-[44px] hover:bg-neutral-50 dark:hover:bg-[#1b2029] w-full sm:w-auto">
                    Vazgeç
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-xl overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-neutral-100 dark:border-[#242b36]">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {loading ? 'Yükleniyor…' : `${seriesList.length} seri kayıtlı`}
                </span>
                {!seriesForm && (
                  <button type="button" onClick={startNewSeries} disabled={!!apiError} className="rounded-full bg-brand text-white text-sm font-semibold px-5 py-2 min-h-[44px] hover:bg-brand-dark disabled:bg-neutral-300 w-full sm:w-auto">
                    + Yeni seri ekle
                  </button>
                )}
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-[#1b2029] text-neutral-500 dark:text-neutral-400 text-xs">
                    <tr>
                      {['ID', 'Ad', 'Açıklama', 'Model Sayısı', ''].map((h) => (
                        <th key={h} className="text-left font-medium px-4 py-2.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {seriesList.map((s) => {
                      const cabinCount = cabinets.filter((c) => c.seriesId === s.id).length
                      return (
                        <tr key={s.id} className="border-t border-neutral-100 dark:border-[#242b36] hover:bg-neutral-50 dark:hover:bg-[#1b2029]">
                          <td className="px-4 py-2.5 text-neutral-400 dark:text-neutral-500">{s.id}</td>
                          <td className="px-4 py-2.5 font-medium">{s.name}</td>
                          <td className="px-4 py-2.5 text-neutral-500 dark:text-neutral-400">{s.description || '—'}</td>
                          <td className="px-4 py-2.5">{cabinCount}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right">
                            <button type="button" onClick={() => startEditSeries(s)} className="text-brand dark:text-brand-light hover:underline mr-3 inline-flex items-center min-h-[44px] px-2">Düzenle</button>
                            <button
                              type="button"
                              onClick={() => removeSeries(s)}
                              className={cabinCount > 0 ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed inline-flex items-center min-h-[44px] px-2' : 'text-red-600 hover:underline inline-flex items-center min-h-[44px] px-2'}
                              title={cabinCount > 0 ? 'Bu seriye bağlı modeller var; önce onları taşıyın veya silin.' : undefined}
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {!loading && seriesList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500">Henüz seri yok.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ================= TEKLİFLER ================= */}
        {tab === 'quotes' && (
          <div className="bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-xl overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-neutral-100 dark:border-[#242b36]">
              <span className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                {quotesLoading ? 'Yükleniyor…' : `${quotesTotalCount} teklif kaydı`}
              </span>
              <input
                value={quotesSearch}
                onChange={(e) => setQuotesSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadQuotes(1, quotesSearch)}
                placeholder="Ad, telefon, e-posta veya model ara…"
                className="w-full md:flex-1 md:max-w-xs border border-neutral-300 dark:border-[#39414f] rounded-lg px-3 py-2 min-h-[44px] text-sm bg-transparent focus:outline-none focus:border-brand"
              />
              <button type="button" onClick={() => loadQuotes(1, quotesSearch)} className="text-sm text-brand dark:text-brand-light hover:underline whitespace-nowrap min-h-[44px] inline-flex items-center">Ara</button>
              <button type="button" onClick={() => loadQuotes(quotesPage, quotesSearch)} className="text-sm text-brand dark:text-brand-light hover:underline whitespace-nowrap min-h-[44px] inline-flex items-center">Yenile</button>
            </div>
            {quotesError && <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{quotesError}</div>}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-[#1b2029] text-neutral-500 dark:text-neutral-400 text-xs">
                  <tr>
                    {['ID', 'Müşteri', 'Telefon', 'E-posta', 'Model', 'Duvar (m)', 'Düzen', 'Sütun×Satır', 'Çözünürlük', 'Durum', 'Tarih', ''].map((h) => (
                      <th key={h} className="text-left font-medium px-4 py-2.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} className="border-t border-neutral-100 dark:border-[#242b36] hover:bg-neutral-50 dark:hover:bg-[#1b2029] align-top">
                      <td className="px-4 py-2.5 text-neutral-400 dark:text-neutral-500">{q.id}</td>
                      <td className="px-4 py-2.5 font-medium">{q.customerName || '—'}</td>
                      <td className="px-4 py-2.5">{q.phone || '—'}</td>
                      <td className="px-4 py-2.5">{q.email || '—'}</td>
                      <td className="px-4 py-2.5">{q.modelCode || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{q.wallWidthM ?? '—'} × {q.wallHeightM ?? '—'}</td>
                      <td className="px-4 py-2.5">{q.screenMode === 'multi' ? 'Çoklu' : 'Tekli'}</td>
                      <td className="px-4 py-2.5">{q.columns ?? '—'} × {q.rows ?? '—'}</td>
                      <td className="px-4 py-2.5">{q.resolution || '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                          <StatusBadge status={q.status || 'Beklemede'} />
                          <select
                            value={q.status || 'Beklemede'}
                            onChange={(e) => updateQuoteStatus(q, e.target.value)}
                            className="text-xs border border-neutral-200 dark:border-[#39414f] rounded-full px-3 py-2 min-h-[44px] bg-transparent max-w-full"
                          >
                            {STATUS_OPTIONS_QUOTE.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-neutral-500 dark:text-neutral-400">{dt(q.createdAt)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right">
                        <button type="button" onClick={() => removeQuote(q)} className="text-red-600 hover:underline inline-flex items-center min-h-[44px] px-2">Sil</button>
                      </td>
                    </tr>
                  ))}
                  {!quotesLoading && quotes.length === 0 && (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500">Henüz teklif talebi yok.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={quotesPage} totalPages={quotesTotalPages} onChange={(p) => loadQuotes(p, quotesSearch)} />
          </div>
        )}

        {/* ================= SOHBET KAYITLARI ================= */}
        {tab === 'chatlogs' && (
          <div className="bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-xl overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-neutral-100 dark:border-[#242b36]">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {chatLoading ? 'Yükleniyor…' : `${chatLogs.length} kayıt`} — Asistana sorulan sorular
              </span>
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer min-h-[44px]">
                  <input type="checkbox" checked={onlyUnanswered} onChange={(e) => setOnlyUnanswered(e.target.checked)} />
                  Yalnızca cevaplanamayanlar
                </label>
                <button type="button" onClick={() => loadChatLogs(onlyUnanswered)} className="text-sm text-brand dark:text-brand-light hover:underline min-h-[44px] inline-flex items-center">Yenile</button>
              </div>
            </div>
            {chatError && <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{chatError}</div>}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-[#1b2029] text-neutral-500 dark:text-neutral-400 text-xs">
                  <tr>
                    {['ID', 'Soru', 'Konu', 'Cevaplandı mı', 'Dil', 'Tarih'].map((h) => (
                      <th key={h} className="text-left font-medium px-4 py-2.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chatLogs.map((l) => (
                    <tr key={l.id} className="border-t border-neutral-100 dark:border-[#242b36] hover:bg-neutral-50 dark:hover:bg-[#1b2029]">
                      <td className="px-4 py-2.5 text-neutral-400 dark:text-neutral-500">{l.id}</td>
                      <td className="px-4 py-2.5 max-w-md">{l.question}</td>
                      <td className="px-4 py-2.5 text-neutral-500 dark:text-neutral-400">{l.topicId || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${l.answered ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                          {l.answered ? 'Evet' : 'Hayır'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 uppercase text-neutral-500 dark:text-neutral-400">{l.lang || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-neutral-500 dark:text-neutral-400">{dt(l.createdAt)}</td>
                    </tr>
                  ))}
                  {!chatLoading && chatLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500">Kayıt bulunamadı.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 px-5 py-3">
              "Cevaplanamayanlar" filtresi, bilgi tabanına (helpTopics.js) eklenmesi gereken konuları bulmak içindir.
            </p>
          </div>
        )}

        {/* ================= GERİ BİLDİRİMLER ================= */}
        {tab === 'feedback' && (
          <div className="bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-xl overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-neutral-100 dark:border-[#242b36]">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {feedbackLoading ? 'Yükleniyor…' : `${feedback.length} bildirim`} — Kullanıcıların gönderdiği hata notları
              </span>
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer min-h-[44px]">
                  <input type="checkbox" checked={onlyOpenFeedback} onChange={(e) => setOnlyOpenFeedback(e.target.checked)} />
                  Yalnızca açık olanlar
                </label>
                <button type="button" onClick={() => loadFeedback(onlyOpenFeedback)} className="text-sm text-brand dark:text-brand-light hover:underline min-h-[44px] inline-flex items-center">Yenile</button>
              </div>
            </div>
            {feedbackError && <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{feedbackError}</div>}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-[#1b2029] text-neutral-500 dark:text-neutral-400 text-xs">
                  <tr>
                    {['ID', 'Bildirim', 'Rol', 'Sayfa / tarayıcı', 'Durum', 'Tarih', ''].map((h) => (
                      <th key={h} className="text-left font-medium px-4 py-2.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {feedback.map((f) => (
                    <tr key={f.id} className="border-t border-neutral-100 dark:border-[#242b36] hover:bg-neutral-50 dark:hover:bg-[#1b2029] align-top">
                      <td className="px-4 py-2.5 text-neutral-400 dark:text-neutral-500">{f.id}</td>
                      <td className="px-4 py-2.5 max-w-md whitespace-pre-wrap">{f.note}</td>
                      <td className="px-4 py-2.5 text-neutral-500 dark:text-neutral-400">{f.role || '—'}</td>
                      {/* Ortam bilgisi: hatayı tekrar üretebilmek için */}
                      <td className="px-4 py-2.5 max-w-xs text-xs text-neutral-500 dark:text-neutral-400 break-all">
                        {f.pageUrl || '—'}
                        {f.userAgent && <span className="block mt-1 opacity-70">{f.userAgent}</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => setFeedbackResolved(f, !f.resolved)}
                          title="Durumu değiştir"
                          className={`rounded-full px-3 py-2 min-h-[44px] text-xs ${f.resolved
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'}`}
                        >
                          {f.resolved ? 'Çözüldü' : 'Açık'}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-neutral-500 dark:text-neutral-400">{dt(f.createdAt)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button type="button" onClick={() => removeFeedback(f)} className="text-red-600 hover:underline inline-flex items-center min-h-[44px] px-2">Sil</button>
                      </td>
                    </tr>
                  ))}
                  {!feedbackLoading && feedback.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500">Henüz bildirim yok.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 px-5 py-3">
              Bildirimler Kontrol Merkezi &gt; Test Araçları ekranından gönderilir. Ele aldığınız kaydı "Çözüldü" olarak işaretleyebilirsiniz.
            </p>
          </div>
        )}

        {/* ================= KAYITLI PROJELER ================= */}
        {tab === 'configs' && (
          <div className="bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-xl overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-neutral-100 dark:border-[#242b36]">
              <span className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                {configsLoading ? 'Yükleniyor…' : `${configsTotalCount} kayıtlı proje`}
              </span>
              <input
                value={configsSearch}
                onChange={(e) => setConfigsSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadConfigs(1, configsSearch)}
                placeholder="Proje adı veya müşteri ara…"
                className="w-full md:flex-1 md:max-w-xs border border-neutral-300 dark:border-[#39414f] rounded-lg px-3 py-2 min-h-[44px] text-sm bg-transparent focus:outline-none focus:border-brand"
              />
              <button type="button" onClick={() => loadConfigs(1, configsSearch)} className="text-sm text-brand dark:text-brand-light hover:underline whitespace-nowrap min-h-[44px] inline-flex items-center">Ara</button>
              <button type="button" onClick={() => loadConfigs(configsPage, configsSearch)} className="text-sm text-brand dark:text-brand-light hover:underline whitespace-nowrap min-h-[44px] inline-flex items-center">Yenile</button>
            </div>
            {configsError && <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{configsError}</div>}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-[#1b2029] text-neutral-500 dark:text-neutral-400 text-xs">
                  <tr>
                    {['ID', 'Proje', 'Müşteri', 'Model', 'Sütun×Satır', 'Çözünürlük', 'Alıcı Kart', 'RJ45', 'İşlemci', 'Fiyat (USD)', 'Durum', 'Tarih', ''].map((h) => (
                      <th key={h} className="text-left font-medium px-4 py-2.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {configs.map((c) => (
                    <tr key={c.id} className="border-t border-neutral-100 dark:border-[#242b36] hover:bg-neutral-50 dark:hover:bg-[#1b2029]">
                      <td className="px-4 py-2.5 text-neutral-400 dark:text-neutral-500">{c.id}</td>
                      <td className="px-4 py-2.5 font-medium">{c.projectName}</td>
                      <td className="px-4 py-2.5">{c.customerName || '—'}</td>
                      <td className="px-4 py-2.5">{c.cabinModelName || '—'}</td>
                      <td className="px-4 py-2.5">{c.cols} × {c.rows}</td>
                      <td className="px-4 py-2.5">{c.totalResolution || '—'}</td>
                      <td className="px-4 py-2.5">{c.receivingCardCount}</td>
                      <td className="px-4 py-2.5">{c.requiredRj45Ports}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-neutral-500 dark:text-neutral-400">{c.recommendedProcessor || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{money(c.totalPrice)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                          <StatusBadge status={c.status || 'Taslak'} />
                          <select
                            value={c.status || 'Taslak'}
                            onChange={(e) => updateConfigStatus(c, e.target.value)}
                            className="text-xs border border-neutral-200 dark:border-[#39414f] rounded-full px-3 py-2 min-h-[44px] bg-transparent max-w-full"
                          >
                            {STATUS_OPTIONS_CONFIG.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-neutral-500 dark:text-neutral-400">{dt(c.createdAt)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right">
                        <button type="button" onClick={() => downloadConfigPdf(c)} className="text-brand dark:text-brand-light hover:underline mr-3 inline-flex items-center min-h-[44px] px-2">PDF</button>
                        <button type="button" onClick={() => removeConfig(c)} className="text-red-600 hover:underline inline-flex items-center min-h-[44px] px-2">Sil</button>
                      </td>
                    </tr>
                  ))}
                  {!configsLoading && configs.length === 0 && (
                    <tr>
                      <td colSpan={13} className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500">Henüz kayıtlı proje yok.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={configsPage} totalPages={configsTotalPages} onChange={(p) => loadConfigs(p, configsSearch)} />
          </div>
        )}

        {/* ================= KULLANICILAR ================= */}
        {tab === 'users' && (
          <div className="flex flex-col gap-5">
            <form onSubmit={createUser} className="bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-xl p-5 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <Field label="E-posta">
                <input required type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Görünen ad">
                <input value={userForm.displayName} onChange={(e) => setUserForm((f) => ({ ...f, displayName: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Parola (min. 8)">
                <input required minLength={8} type="password" value={userForm.password} onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Rol">
                <select value={userForm.role} onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))} className={inputCls}>
                  <option value="Dealer">Bayi (Dealer)</option>
                  {TESTER_ROLE_ENABLED && <option value="Tester">Tester</option>}
                  <option value="Admin">Admin</option>
                </select>
              </Field>
              <button type="submit" disabled={userSaving} className="rounded-full bg-brand text-white text-sm font-semibold px-4 py-2.5 min-h-[44px] hover:bg-brand-dark disabled:opacity-50 w-full md:w-auto">
                {userSaving ? 'Ekleniyor…' : '+ Kullanıcı ekle'}
              </button>
            </form>

            <div className="bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-xl overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-neutral-100 dark:border-[#242b36]">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {usersLoading ? 'Yükleniyor…' : `${users.length} kullanıcı`}
                </span>
                <button type="button" onClick={loadUsers} className="text-sm text-brand dark:text-brand-light hover:underline min-h-[44px] inline-flex items-center">Yenile</button>
              </div>
              {usersError && <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{usersError}</div>}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-[#1b2029] text-neutral-500 dark:text-neutral-400 text-xs">
                    <tr>
                      {['ID', 'E-posta', 'Ad', 'Rol', 'Oluşturulma', ''].map((h) => (
                        <th key={h} className="text-left font-medium px-4 py-2.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-neutral-100 dark:border-[#242b36] hover:bg-neutral-50 dark:hover:bg-[#1b2029]">
                        <td className="px-4 py-2.5 text-neutral-400 dark:text-neutral-500">{u.id}</td>
                        <td className="px-4 py-2.5 font-medium">{u.email}</td>
                        <td className="px-4 py-2.5">{u.displayName || '—'}</td>
                        <td className="px-4 py-2.5">
                          <select
                            value={u.role}
                            onChange={(e) => updateUserRole(u, e.target.value)}
                            className="text-xs border border-neutral-200 dark:border-[#39414f] rounded-full px-3 py-2 min-h-[44px] bg-transparent max-w-full"
                          >
                            <option value="Admin">Admin</option>
                            <option value="Dealer">Dealer</option>
                            {(TESTER_ROLE_ENABLED || u.role === 'Tester') && <option value="Tester">Tester</option>}
                          </select>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-neutral-500 dark:text-neutral-400">{dt(u.createdAt)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button type="button" onClick={() => removeUser(u)} className="text-red-600 hover:underline inline-flex items-center min-h-[44px] px-2">Sil</button>
                        </td>
                      </tr>
                    ))}
                    {!usersLoading && users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500">
                          Henüz kullanıcı yok. Yukarıdaki formdan ekleyebilirsiniz.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
