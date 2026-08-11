import { useEffect, useMemo, useState } from 'react'
import { useLang } from './useLang.js'
import { translateOption } from './i18n.js'
import { baseViewingDistance } from './viewingDistance.js'

/**
 * Model seçme pop-up'ı ("Yapılandırma için bir model seçin").
 *
 * Filtre alt menüleri Samsung'daki gerçek değerlerle dolduruldu.
 *  - field'ı olanlar (pitch/brightness/distance) tabloyu ARALIK bazlı GERÇEKTEN filtreler.
 *  - field'ı olmayan kategorik filtreler demo veride nitelik olmadığı için tabloyu daraltmaz
 *    (gerçek ürün nitelikleri eklendiğinde çalışır).
 *  - option.info=true olan seçeneklerde (?) bilgi butonu var; tooltip metni sonra girilecek.
 */

const TAB_META = {
  led: {
    labelKey: 'msm.tabLed',
    columnKeys: [
      'col.modelName',
      'col.pitch',
      'col.maxBrightness',
      'col.dimensions',
      'col.refreshRate',
      'col.viewingDistance',
      'col.compare',
    ],
    grid: 'minmax(110px,1.3fr) 0.8fr 1.5fr 1.9fr 1fr 1.3fr 0.9fr',
  },
  videowall: {
    labelKey: 'msm.tabVideowall',
    columnKeys: ['col.modelName', 'col.size', 'col.bezel', 'col.maxBrightness', 'col.dimensions', 'col.compare'],
    grid: 'minmax(110px,1.3fr) 0.8fr 1.4fr 1.2fr 1.9fr 0.9fr',
  },
}

// Model listesinde ekran yapılandırması yok; modelin KENDİ mesafesi gösterilir.
// Ekran boyutuna göre değişen değer tuvalde ve Teknik Özellikler'de görünür.
const viewingDistance = baseViewingDistance

// Bir seçenek: string veya { l, info, min, max }
const optLabel = (o) => (typeof o === 'string' ? o : o.l)

function buildFilters(tab) {
  if (tab === 'videowall') {
    return [
      {
        label: 'Boyut',
        labelKey: 'col.size',
        field: 'size',
        options: [
          { l: '46"', min: 46, max: 47 },
          { l: '55"', min: 55, max: 56 },
        ],
      },
      {
        label: 'Çerçeveden çerçeveye',
        labelKey: 'col.bezel',
        field: 'bezel',
        options: [
          { l: '0.0 ~ 1.0', min: 0, max: 1 },
          { l: '1.0 ~ 2.0', min: 1, max: 2 },
          { l: '2.0 ~ 3.0', min: 2, max: 3 },
          { l: '3.0 ~ 4.0', min: 3, max: 4 },
        ],
      },
      {
        label: 'Panel Parlaklığı',
        labelKey: 'f.panelBrightness',
        field: 'brightness',
        options: [
          { l: '500', min: 500, max: 501 },
          { l: '700', min: 700, max: 701 },
        ],
      },
    ]
  }
  // attr: modeldeki hangi alana bakılacağı (veritabanından gelir, virgülle ayrılmış olabilir)
  return [
    { label: 'Kategori', labelKey: 'f.category', attr: 'filterCategory', options: ['Kapalı', 'Duvar'] },
    { label: 'Kullanım', labelKey: 'f.usage', attr: 'usage', options: ['Ticari İç Mekan', 'Pencereye bakan', 'Sanal Üretim', 'Sinema'] },
    {
      label: 'Kurulum',
      labelKey: 'f.installation',
      attr: 'installation',
      options: [
        { l: 'Düz', info: true },
        { l: 'Dışbükey', info: true },
        { l: 'İçbükey', info: true },
        { l: 'İç L Tipi', info: true },
        { l: 'Dış L Tipi', info: true },
        { l: 'Asılı', info: true },
        { l: 'İstifleme', info: true },
      ],
    },
    { label: 'Yapılandırılabilir', labelKey: 'f.configurable', attr: 'configurable', options: [{ l: 'Hepsi Bir Arada', info: true }, 'Dolap'] },
    { label: 'Hizmet', labelKey: 'f.service', attr: 'service', options: ['Ön', 'Arka', 'Kısmen Ön ve Kısmen Arka'] },
    {
      label: 'LED Tipi',
      labelKey: 'f.ledType',
      attr: 'ledType',
      options: [{ l: 'CoB', info: true }, { l: 'SMD', info: true }, { l: 'MIP', info: true }],
    },
    { label: 'Koruma', labelKey: 'f.protection', attr: 'protection', options: [{ l: 'CoB', info: true }, { l: 'Ağız', info: true }] },
    {
      label: 'Sertifikasyon',
      labelKey: 'f.certification',
      attr: 'certification',
      options: [
        'EMC B Sınıfı',
        { l: 'TÜV Göz Konforu', info: true },
        { l: 'TÜV Düşük Gri Tonlamalı Görüntü Netliği', info: true },
        { l: 'Pantone Renk ve Cilt Tonu Doğrulama', info: true },
        { l: 'Yangın Yönetmeliği', info: true },
        { l: 'Deprem Testi', info: true },
      ],
    },
    {
      label: 'Piksel Aralığı',
      labelKey: 'f.pixelPitch',
      field: 'pitch',
      options: [
        { l: '0.0 ~ 1.0', min: 0, max: 1 },
        { l: '1.0 ~ 1.5', min: 1, max: 1.5 },
        { l: '1.5 ~ 2.0', min: 1.5, max: 2 },
        { l: '2.0 ~ 3.0', min: 2, max: 3 },
        { l: '3.0 ~ 4.0', min: 3, max: 4 },
        { l: '4.0 veya üzeri', min: 4, max: Infinity },
      ],
    },
    {
      label: 'Maksimum Parlaklık',
      labelKey: 'col.maxBrightness',
      field: 'brightness',
      options: [
        { l: '0 ~ 500', min: 0, max: 500 },
        { l: '500 ~ 1.000', min: 500, max: 1000 },
        { l: '1.000 ~ 1.500', min: 1000, max: 1500 },
        { l: '1.500 ~ 2.000', min: 1500, max: 2000 },
        { l: '2.000 veya daha fazla', min: 2000, max: Infinity },
      ],
    },
    {
      label: 'En Uygun İzleme Mesafesi',
      labelKey: 'f.viewingDistance',
      field: 'distance',
      options: [
        { l: '0 ~ 3.0', min: 0, max: 3 },
        { l: '3.0 ~ 6.0', min: 3, max: 6 },
        { l: '6.0 ~ 9.0', min: 6, max: 9 },
        { l: '9.0 ~ 15.0', min: 9, max: 15 },
        { l: '15 veya daha fazla', min: 15, max: Infinity },
      ],
    },
    {
      label: 'Vesaire',
      labelKey: 'f.etc',
      attr: 'features',
      options: ['LED HDR', 'HDR 10/10+', { l: 'VXT', info: true }, { l: 'SmartThings Pro', info: true }, 'Güç Yedekliliği'],
    },
  ]
}

/**
 * Sütun başlığına tıklayınca neye göre sıralanacağı.
 * Değeri olmayan sütunlar (boyutlar, karşılaştır) listede yok — tıklanmaz.
 */
const SORT_BY = {
  'col.modelName': (c) => String(c.modelCode || '').toLowerCase(),
  'col.pitch': (c) => c.pixelPitchMm ?? 0,
  'col.maxBrightness': (c) => c.brightnessNits ?? 0,
  'col.refreshRate': (c) => c.refreshRateHz ?? 0,
  'col.viewingDistance': (c) => viewingDistance(c),
  'col.size': (c) => c.sizeInch ?? 0,
  'col.bezel': (c) => c.bezelMm ?? 0,
}

function SortArrow({ dir }) {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: dir === 'desc' ? 'rotate(180deg)' : undefined }}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  )
}

/** Üst şeritteki açılır filtre düğmesi. */
function FilterDropdown({ filter, selected, onToggle, isOpen, onOpen }) {
  const { t } = useLang()
  const count = selected.length
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onOpen}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
          count > 0
            ? 'border-brand text-brand dark:text-brand-light font-medium bg-brand-tint'
            : 'border-neutral-300 dark:border-[#39414f] text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-[#4a5364]'
        }`}
      >
        {filter.labelKey ? t(filter.labelKey) : filter.label}
        {count > 0 && <span className="font-semibold">({count})</span>}
        <ChevronDown open={isOpen} />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-64 max-h-72 overflow-y-auto rounded-lg border border-neutral-200 dark:border-[#2c333f] bg-white dark:bg-[#161a21] p-3 shadow-xl flex flex-col gap-2.5">
          {filter.options.map((opt) => (
            <OptionRow
              key={optLabel(opt)}
              filterLabel={filter.label}
              option={opt}
              selected={selected}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ChevronDown({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function OptionRow({ filterLabel, option, selected, onToggle }) {
  const { t, lang } = useLang()
  const label = optLabel(option)
  const hasInfo = typeof option === 'object' && option.info
  const [showInfo, setShowInfo] = useState(false)
  return (
    <div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2.5 text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={selected.includes(label)}
            onChange={() => onToggle(filterLabel, label)}
            className="w-4 h-4 accent-brand shrink-0"
          />
          {translateOption(label, lang)}
        </label>
        {hasInfo && (
          <button
            type="button"
            onClick={() => setShowInfo((s) => !s)}
            aria-label={t('msm.info')}
            className="w-4 h-4 rounded-full border border-neutral-400 text-neutral-400 dark:text-neutral-500 text-[10px] leading-none flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-[#222833] shrink-0"
          >
            ?
          </button>
        )}
      </div>
      {showInfo && (
        <div className="mt-1 ml-6 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-[#1b2029] border border-neutral-200 dark:border-[#2c333f] rounded-lg p-2">
          {t('msm.info')}
        </div>
      )}
    </div>
  )
}

// Karşılaştırma tablosunda satır olarak gösterilecek nitelikler.
// "Seç" (choose) akışından bağımsız — birden fazla model işaretlenebilir.
const COMPARE_ROWS = [
  { key: 'compare.price', get: (c) => (c.price ? `${Number(c.price).toLocaleString('tr-TR')} ₺` : '—') },
  { key: 'compare.pitch', get: (c) => (c.pixelPitchMm ? `${c.pixelPitchMm} mm` : '—') },
  { key: 'compare.brightness', get: (c) => (c.brightnessNits ? `${c.brightnessNits} nit` : '—') },
  { key: 'compare.dimensions', get: (c) => `${c.widthMm} × ${c.heightMm} × ${c.depthMm} mm` },
  { key: 'compare.weight', get: (c) => (c.weightKg ? `${c.weightKg} kg` : '—') },
  { key: 'compare.powerTypical', get: (c) => (c.powerTypicalWatts ? `${c.powerTypicalWatts} W` : '—') },
  { key: 'compare.powerMax', get: (c) => (c.powerMaxWatts ? `${c.powerMaxWatts} W` : '—') },
  { key: 'compare.refreshRate', get: (c) => (c.refreshRateHz ? `${c.refreshRateHz} Hz` : '—') },
  { key: 'compare.viewingDistance', get: (c) => `${viewingDistance(c)} m` },
]

const MAX_COMPARE = 4

export default function ModelSelectModal({ open, onClose, cabinets, onChoose }) {
  const { t, lang } = useLang()
  const [tab, setTab] = useState('led')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [filters, setFilters] = useState({}) // { [label]: string[] }
  const [openFilter, setOpenFilter] = useState(null) // üstte açık duran filtre
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [compareIds, setCompareIds] = useState([])
  const [compareOpen, setCompareOpen] = useState(false)

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_COMPARE) return prev
      return [...prev, id]
    })
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const filterList = useMemo(() => buildFilters(tab), [tab])

  if (!open) return null

  const cfg = TAB_META[tab]
  const filterCount = Object.values(filters).reduce((n, arr) => n + arr.length, 0)

  const toggleFilter = (label, opt) => {
    setFilters((prev) => {
      const cur = prev[label] || []
      const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]
      return { ...prev, [label]: next }
    })
  }

  const clearFilters = () => setFilters({})
  const removeFilter = (label, opt) =>
    setFilters((prev) => ({ ...prev, [label]: (prev[label] || []).filter((x) => x !== opt) }))

  const switchTab = (key) => {
    setTab(key)
    setSelectedId(null)
    setFilters({})
    setOpenFilter(null)
    setSort({ key: null, dir: 'asc' })
    setCompareIds([])
    setCompareOpen(false)
  }

  // Aynı başlığa tekrar tıklanınca yön değişir
  const toggleSort = (key) => {
    if (!SORT_BY[key]) return
    setSort((p) => (p.key === key ? { key, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  // Aralık bazlı veri filtreleri (pitch / parlaklık / mesafe)
  const dataFilters = filterList.filter((f) => f.field && (filters[f.label] || []).length > 0)
  const matchRanges = (f, value) => {
    const sel = filters[f.label]
    const ranges = f.options.filter((o) => sel.includes(o.l))
    return ranges.some((r) => value >= r.min && value < r.max)
  }

  // Kategorik filtreler: modeldeki virgülle ayrılmış metinle eşleşme.
  // Seçilen değerlerden EN AZ BİRİ modelde varsa geçer (VEYA mantığı).
  const catFilters = filterList.filter((f) => f.attr && (filters[f.label] || []).length > 0)
  const matchAttr = (f, c) => {
    const raw = c[f.attr]
    if (!raw) return false // niteliği girilmemiş model, o filtreye takılır
    const have = String(raw).split(',').map((s) => s.trim())
    return filters[f.label].some((sel) => have.includes(sel))
  }

  const wantCat = tab === 'videowall' ? 'videowall' : 'led'
  const rows = cabinets.filter((c) => {
    if ((c.category || 'led') !== wantCat) return false
    if (!(c.modelCode || '').toLowerCase().includes(query.toLowerCase())) return false
    const rangesOk = dataFilters.every((f) => {
      if (f.field === 'pitch') return matchRanges(f, c.pixelPitchMm)
      if (f.field === 'brightness') return matchRanges(f, c.brightnessNits)
      if (f.field === 'distance') return matchRanges(f, viewingDistance(c))
      if (f.field === 'size') return matchRanges(f, c.sizeInch ?? -1)
      if (f.field === 'bezel') return matchRanges(f, c.bezelMm ?? -1)
      return true
    })
    return rangesOk && catFilters.every((f) => matchAttr(f, c))
  })

  // Sıralama seçiliyse uygula (seçili değilse veritabanı sırası korunur)
  const sortedRows =
    sort.key && SORT_BY[sort.key]
      ? [...rows].sort((a, b) => {
          const va = SORT_BY[sort.key](a)
          const vb = SORT_BY[sort.key](b)
          const cmp = typeof va === 'string' ? va.localeCompare(vb, 'tr') : va - vb
          return sort.dir === 'asc' ? cmp : -cmp
        })
      : rows

  const selected = rows.find((r) => r.id === selectedId) || null

  // Satıra çift tıklama: seç ve pop-up’ı kapat
  const confirmChoice = (c) => {
    onChoose(c)
    onClose()
  }

  const rowValues = (c) =>
    tab === 'videowall'
      ? [c.modelCode, `${c.sizeInch}"`, `${c.bezelMm} mm`, `${c.brightnessNits} nit`, `${c.widthMm} x ${c.heightMm} x ${c.depthMm} mm`]
      : [
          c.modelCode,
          `${c.pixelPitchMm} mm`,
          `${c.brightnessNits} nit`,
          `${c.widthMm} x ${c.heightMm} x ${c.depthMm} mm`,
          `${c.refreshRateHz} Hz`,
          `${viewingDistance(c)} m`,
        ]

  return (
    <div className="fixed inset-0 z-50 bg-[#001334]/45 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#161a21] rounded-2xl sm:rounded-3xl w-full max-w-[1040px] max-h-[95vh] sm:max-h-[92vh] flex flex-col relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık — koyu şerit; iki kocaman sekme yerine bölmeli düğme */}
        <div className="bg-[#12151c] text-white px-4 sm:px-6 py-3.5 shrink-0 flex items-center justify-between gap-4 rounded-t-2xl sm:rounded-t-3xl">
          <h2 className="text-base sm:text-lg font-bold m-0 truncate">{t('msm.title')}</h2>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex bg-white/10 rounded-lg p-1 gap-1">
              {Object.entries(TAB_META).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchTab(key)}
                  className={`px-3.5 py-1.5 rounded-md text-[12.5px] font-semibold transition-colors ${
                    tab === key ? 'bg-white dark:bg-[#161a21] text-brand' : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  {t(meta.labelKey)}
                </button>
              ))}
            </div>
            <button type="button" onClick={onClose} aria-label={t('exp.close')} className="text-white/70 hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Gövde */}
        <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 pt-4">
          {/* Dar ekranda sekmeler başlığa sığmaz, buraya düşer */}
          <div className="sm:hidden grid grid-cols-2 gap-2 mb-3 shrink-0">
            {Object.entries(TAB_META).map(([key, meta]) => (
              <button
                key={key}
                type="button"
                onClick={() => switchTab(key)}
                className={`py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                  tab === key ? 'bg-brand text-white' : 'bg-neutral-100 dark:bg-[#222833] text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {t(meta.labelKey)}
              </button>
            ))}
          </div>

          {/* Arama */}
          <div className="flex items-center gap-3 mb-3 shrink-0">
            <div className="relative flex-1">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('msm.modelNamePh')}
                className="w-full bg-neutral-100 dark:bg-[#222833] rounded-lg py-2 pl-10 pr-3 text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand/25"
              />
            </div>
          </div>

          {/*
            Filtre şeridi — eskiden soldaki 240 px'lik sütundaydı.
            Üste alınınca tablo tüm genişliği kullanıyor.
          */}
          <div className="shrink-0 mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100 mr-1">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                {t('msm.filter')}
              </span>
              {filterList.map((f) => (
                <FilterDropdown
                  key={f.label}
                  filter={f}
                  selected={filters[f.label] || []}
                  onToggle={toggleFilter}
                  isOpen={openFilter === f.label}
                  onOpen={() => setOpenFilter((p) => (p === f.label ? null : f.label))}
                />
              ))}
            </div>

            {/* Seçili filtreler rozet olarak — tek tek kaldırılabilir */}
            {filterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                {filterList.flatMap((f) =>
                  (filters[f.label] || []).map((opt) => (
                    <button
                      key={f.label + opt}
                      type="button"
                      onClick={() => removeFilter(f.label, opt)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint text-brand dark:text-brand-light text-xs px-2.5 py-1 hover:bg-brand hover:text-white transition-colors"
                    >
                      {translateOption(opt, lang)}
                      <span aria-hidden>✕</span>
                    </button>
                  ))
                )}
                <button type="button" onClick={clearFilters} className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-brand underline">
                  {t('msm.clear')}
                </button>
              </div>
            )}
          </div>

          {/* Sonuç sayısı */}
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-neutral-500 dark:text-neutral-400">
              {rows.length} {t('msm.results')}
            </span>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate ml-3">{t('msm.availability')}</span>
          </div>

          {/*
            Dar ekranda sütunlar sıkışıp okunmaz hale geliyordu. Başlık ve gövde
            birlikte YATAY kaydırılır; min-w sayesinde sütunlar ezilmez.
          */}
          <div className="flex-1 flex flex-col min-h-0 overflow-x-auto">
          <div className="min-w-[680px] flex-1 flex flex-col min-h-0">
          {/* Tablo başlığı — sıralanabilir sütunlar */}
          <div
            className="grid items-center text-[11px] font-bold tracking-[0.04em] uppercase text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-[#1b2029] border-y border-neutral-200 dark:border-[#2c333f] py-2 px-2 shrink-0"
            style={{ gridTemplateColumns: cfg.grid }}
          >
            {cfg.columnKeys.map((colKey) => {
              const sortable = !!SORT_BY[colKey]
              const active = sort.key === colKey
              return (
                <span key={colKey} className={colKey === 'col.compare' ? 'text-center' : ''}>
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(colKey)}
                      className={`inline-flex items-center gap-1 hover:text-brand ${active ? 'text-brand' : ''}`}
                    >
                      {t(colKey)}
                      {active ? <SortArrow dir={sort.dir} /> : <span className="text-neutral-300">↕</span>}
                    </button>
                  ) : (
                    t(colKey)
                  )}
                </span>
              )
            })}
          </div>

          {/* Tablo gövdesi — satırın herhangi bir yerine tıklanabilir */}
          <div className="flex-1 overflow-y-auto min-h-[200px]">
            {sortedRows.length === 0 ? (
              <div className="h-full flex items-center justify-center text-neutral-400 dark:text-neutral-500 text-sm py-10">
                {t('msm.empty')}
              </div>
            ) : (
              sortedRows.map((c) => {
                const isSel = c.id === selectedId
                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId((prev) => (prev === c.id ? null : c.id))}
                    onDoubleClick={() => confirmChoice(c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedId(c.id)
                      }
                    }}
                    className={`grid items-center text-[13.5px] py-2.5 px-2 cursor-pointer transition-colors border-l-[3px] border-b border-b-neutral-100 ${
                      isSel
                        ? 'bg-brand-tint border-l-brand'
                        : 'border-l-transparent hover:bg-neutral-50 dark:hover:bg-[#1b2029] hover:border-l-neutral-300'
                    }`}
                    style={{ gridTemplateColumns: cfg.grid }}
                  >
                    {rowValues(c).map((val, idx) => (
                      <span
                        key={idx}
                        className={
                          idx === 0
                            ? `font-medium ${isSel ? 'text-brand dark:text-brand-light' : 'text-neutral-900 dark:text-neutral-100'}`
                            : 'text-neutral-600 dark:text-neutral-300'
                        }
                      >
                        {val}
                      </span>
                    ))}
                    <span className="flex justify-center items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => setSelectedId((prev) => (prev === c.id ? null : c.id))}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 accent-brand cursor-pointer"
                        title={t('msm.choose')}
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleCompare(c.id) }}
                        title={t('compare.add')}
                        className={`w-5 h-5 rounded border text-[11px] font-bold flex items-center justify-center transition-colors ${
                          compareIds.includes(c.id)
                            ? 'bg-brand border-brand text-white'
                            : 'border-neutral-300 dark:border-[#39414f] text-neutral-400 dark:text-neutral-500 hover:border-brand hover:text-brand'
                        }`}
                      >
                        ⇄
                      </button>
                    </span>
                  </div>
                )
              })
            )}
          </div>
          </div>
          </div>
        </div>

        {/* Karşılaştırmaya eklenen modeller varsa, altta uyarı çubuğu */}
        {compareIds.length > 0 && !compareOpen && (
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-t border-neutral-200 dark:border-[#2c333f] bg-brand-tint shrink-0">
            <span className="text-sm text-brand dark:text-brand-light font-medium">
              {compareIds.length} {t('compare.selectedCount')}
            </span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setCompareIds([])} className="text-xs text-neutral-500 dark:text-neutral-400 hover:underline">
                {t('msm.clear')}
              </button>
              <button
                type="button"
                disabled={compareIds.length < 2}
                onClick={() => setCompareOpen(true)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-colors ${
                  compareIds.length >= 2 ? 'bg-brand hover:bg-brand-dark' : 'bg-neutral-300 dark:bg-[#2c333f] cursor-not-allowed'
                }`}
              >
                {t('compare.view')} ({compareIds.length})
              </button>
            </div>
          </div>
        )}

        {/* Alt: Seç butonu */}
        {/* Alt bar — seçilen model solda, onay sağda */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-neutral-200 dark:border-[#2c333f] bg-neutral-50 dark:bg-[#1b2029] shrink-0 rounded-b-2xl sm:rounded-b-3xl">
          <div className="min-w-0 text-sm">
            {selected ? (
              <>
                <span className="text-neutral-500 dark:text-neutral-400">{t('mse.selectedModel')}: </span>
                <span className="font-semibold text-brand">{selected.modelCode}</span>
              </>
            ) : (
              <span className="text-neutral-400 dark:text-neutral-500">{t('msm.pickHint')}</span>
            )}
          </div>
          <button
            type="button"
            disabled={!selected}
            onClick={() => {
              if (selected) {
                onChoose(selected)
                onClose()
              }
            }}
            className={`rounded-lg px-6 sm:px-10 py-2.5 text-sm font-semibold text-white transition-colors shrink-0 ${
              selected
                ? 'bg-brand hover:bg-brand-dark'
                : 'bg-neutral-300 dark:bg-[#2c333f] dark:text-neutral-500 cursor-not-allowed'
            }`}
          >
            {t('msm.choose')}
          </button>
        </div>
      </div>

      {/* Karşılaştırma tablosu — modelleri yan yana gösterir, buradan doğrudan seçilebilir */}
      {compareOpen && (
        <div className="absolute inset-0 z-10 bg-white dark:bg-[#161a21] rounded-2xl sm:rounded-3xl flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="bg-[#12151c] text-white px-4 sm:px-6 py-3.5 shrink-0 flex items-center justify-between gap-4 rounded-t-2xl sm:rounded-t-3xl">
            <h2 className="text-base sm:text-lg font-bold m-0">{t('compare.title')}</h2>
            <button type="button" onClick={() => setCompareOpen(false)} aria-label={t('exp.close')} className="text-white/70 hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-neutral-400 dark:text-neutral-500 text-xs font-semibold pb-3 pr-4 w-40">{t('compare.attribute')}</th>
                  {compareIds.map((id) => {
                    const c = cabinets.find((x) => x.id === id)
                    if (!c) return null
                    return (
                      <th key={id} className="text-left pb-3 px-4 min-w-[160px]">
                        <div className="font-bold text-brand dark:text-brand-light">{c.modelCode}</div>
                        <button
                          type="button"
                          onClick={() => confirmChoice(c)}
                          className="mt-1.5 rounded-full bg-brand text-white text-xs font-semibold px-3 py-1 hover:bg-brand-dark"
                        >
                          {t('msm.choose')}
                        </button>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.key} className="border-t border-neutral-100 dark:border-[#242b36]">
                    <td className="py-2.5 pr-4 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{t(row.key)}</td>
                    {compareIds.map((id) => {
                      const c = cabinets.find((x) => x.id === id)
                      return <td key={id} className="py-2.5 px-4 font-medium">{c ? row.get(c) : '—'}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
