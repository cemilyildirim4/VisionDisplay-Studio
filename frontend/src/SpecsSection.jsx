/**
 * "Teknik Özellikler" pop-up'ı.
 *
 * Değerler seçilen modelin verisinden HESAPLANIR (specsData.js). Model yoksa
 * "-" gösterilir. Bu dosya yalnızca SUNUM katmanıdır: hiçbir sayıyı kendisi
 * üretmez, biçimlendirmeyi `fmt` yapar.
 *
 * TASARIM NOTU:
 * Kartlar duruyor — ama hepsi TEK bir sistemin parçası: aynı çerçeve, aynı
 * başlık biçimi (sitenin her yerindeki mavi şerit + ayırıcı), aynı iç
 * boşluk. Kartların GENİŞLİĞİ içerik miktarına göre veriliyor: uzun listeler
 * (güç, katalog donanımı, toplam paket) iki sütun kaplıyor, kısa olanlar
 * bir sütun. Böylece ızgara hizalı kalıyor, kartlar rastgele dizilmiş
 * görünmüyor. Renkler index.css'teki değişkenlerden: brand #2962ad ve
 * gövdedeki nötr tonlar; yeni palet yok.
 *
 * NOT: Bileşenler bölümündeki aksesuar parça kodları (S-Kutu, Jig, Güç Kablosu vb.)
 * yer tutucudur; kendi katalog kodlarınızla değiştirilecek.
 */

import { useEffect } from 'react'
import { useGovdeKilidi } from './hooks/useGovdeKilidi.js'
import { useLang } from './useLang.js'
import { DASH, fmt, computeSpecs } from './specsData.js'

/* ------------------------------------------------------------- yapı taşları */

/**
 * Tek veri: ETİKET ÜSTTE küçük ve gri, DEĞER ALTTA koyu.
 *
 * Etiket ile değer aynı satırda karşılıklı dururken uzun model adları dar
 * kartta kırpılıyordu; alt alta dizilince hem sığıyor hem de göz doğrudan
 * değeri buluyor. `buyuk` yalnızca kartın ana sayısı için.
 */
function Veri({ label, value, buyuk = false }) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-neutral-400 dark:text-neutral-500">
        {label}
      </div>
      <div
        className={`mt-0.5 whitespace-pre-line break-words text-neutral-900 dark:text-neutral-50 ${
          buyuk ? 'text-[21px] leading-tight font-bold tracking-tight' : 'text-[14.5px] leading-snug font-semibold'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

/**
 * Kart.
 *
 * `genis` = ızgarada iki sütun kaplar (uzun listeler için). Kart yüksekliği
 * içeriğe göre; `self-start` ile kısa kartlar boşuna uzamıyor.
 */
function Kart({ baslik, genis = false, vurgulu = false, children }) {
  return (
    <div
      className={`flex h-full min-w-0 flex-col rounded-xl border px-4 py-3.5 ${genis ? 'sm:col-span-2' : ''} ${
        vurgulu
          ? 'border-brand/25 bg-brand/[0.06] dark:bg-brand/10'
          : 'border-neutral-200 bg-white dark:border-[#2c333f] dark:bg-[#161a21]'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="h-4 w-1 shrink-0 rounded-full bg-brand" />
        <h3 className="m-0 text-[12.5px] font-bold uppercase tracking-[0.06em] text-neutral-700 dark:text-neutral-200">
          {baslik}
        </h3>
      </div>
      <div className="mt-2.5 flex-1 border-t border-neutral-100 pt-3 dark:border-[#242b36]">
        <div className={`grid content-start gap-x-6 gap-y-3 ${genis ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>{children}</div>
      </div>
    </div>
  )
}

/**
 * Kit kartı ("Miktarı görüntüle").
 *
 * Eskiden kartın ortasında iri bir yazıydı, tıklanabilir görünmüyordu.
 * Artık ok işaretli sade bir satır; davranışı değişmedi.
 */
function KitKarti({ baslik, eylem, genis = false }) {
  return (
    <div className={`flex h-full min-w-0 flex-col rounded-xl border border-neutral-200 bg-white px-4 py-3.5 dark:border-[#2c333f] dark:bg-[#161a21] ${genis ? 'sm:col-span-2' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="h-4 w-1 shrink-0 rounded-full bg-brand" />
        <h3 className="m-0 text-[12.5px] font-bold uppercase tracking-[0.06em] text-neutral-700 dark:text-neutral-200">
          {baslik}
        </h3>
      </div>
      <button
        type="button"
        className="group mt-2.5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-neutral-600 transition-colors hover:text-brand dark:text-neutral-300"
      >
        {eylem}
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h13M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  )
}

/**
 * Kartların dizildiği ızgara: geniş 4, tablet 2, mobil 1 sütun.
 *
 * Kartlar satırın yüksekliğini DOLDURUYOR (items-stretch). Önce içerik
 * kadar yükseliyorlardı; yan yana duran kısa ve uzun kartlar arasında
 * boşluklar kalıyor, ızgara dağınık görünüyordu. Kart sırası da satırların
 * tam dolacağı biçimde seçildi: 1+2+1, 2+1+1, 2+2, 1+1+1+1, 1+1.
 */
function Izgara({ children }) {
  return <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
}

/* ------------------------------------------------------------------ içerik */

/** Pop-up içeriği (Teknik Özellikler + Bileşenler tek ızgarada). */
function SpecsBody({ model, cols = 1, rows = 1, sboxRedundancy = 'no', screenType = 'flat', isVideoWall = false, hasMiniPc = false, preview = null, matchError = null }) {
  const { t } = useLang()
  const has = !!model
  const total = cols * rows
  const s = computeSpecs(model, cols, rows)
  if (s && preview) {
    if (Number(preview.totalMaxPowerWatts) > 0) s.pMax = Number(preview.totalMaxPowerWatts)
    if (Number(preview.totalAvgPowerWatts) > 0) s.pTyp = Number(preview.totalAvgPowerWatts)
    if (Number(preview.heatDissipationBtu) > 0) s.btuMax = Number(preview.heatDissipationBtu)
  }
  const breakdown = Array.isArray(preview?.hardwareBreakdown) ? preview.hardwareBreakdown : []
  const modulesPerCard = Number(model?.defaultModulesPerCard) > 0 ? Number(model.defaultModulesPerCard) : 10
  const receivingCards = preview?.receivingCardCount
    ? Number(preview.receivingCardCount)
    : String(model?.productType || '').toUpperCase() === 'MODULE'
      ? Math.ceil(total / modulesPerCard)
      : total

  const lineQty = (key, fallbackQty) => {
    const item = breakdown.find((x) => x.key === key)
    if (!item) return `${fmt(fallbackQty)} ${t('sp.unit')}`
    const name = item.name ? ` · ${item.name}` : ''
    return `${fmt(item.quantity)} ${t('sp.unit')}${name}`
  }

  const circuitText = (c) =>
    has ? `${c.circuits} ${t('sp.circuit')}\n${t('sp.perCircuit')}: ${c.perCircuit} ${t('sp.cabinet')}` : DASH

  // ---- VİDEO DUVARI: sadeleştirilmiş özellikler, "Bileşenler" bölümü yok ----
  if (isVideoWall) {
    const depthM = has ? (model.depthMm || 0) / 1000 : 0
    return (
      <Izgara>
        <Kart baslik={t('sp.screenConfig')}>
          <Veri buyuk label={t('sp.lengthHeight')} value={has ? `${cols} ${t('sp.unit')} x ${rows} ${t('sp.unit')}` : DASH} />
          <Veri label={t('sp.totalScreens')} value={has ? `${fmt(total)} ${t('sp.unit')}` : DASH} />
        </Kart>

        <Kart baslik={t('sp.screenSpecs')} genis>
          <Veri
            label={t('sp.lengthHeightDepth')}
            value={has ? `${fmt(s.W, 3)} x ${fmt(s.H, 3)} x ${fmt(depthM, 2)} m` : DASH}
          />
          <Veri label={t('sp.diagonal')} value={has ? `${fmt(s.diagIn, 3)} ${t('sp.inch')}` : DASH} />
          <Veri label={t('sp.weight')} value={has ? `${fmt(s.weight, 1)} kg` : DASH} />
        </Kart>

        <Kart baslik={t('sp.power')}>
          <Veri buyuk label={t('sp.max')} value={has ? `${fmt(s.pMax)} (W/h)` : DASH} />
          <Veri buyuk label={t('sp.typical')} value={has ? `${fmt(s.pTyp)} (W/h)` : DASH} />
        </Kart>
      </Izgara>
    )
  }

  // Teknik özellikler ve bileşenler TEK ızgarada.
  return (
    <>
      {has && matchError && (
        <div className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-amber-700 dark:text-amber-400">
            {t('sp.hwMatchError')}
          </div>
          <p className="m-0 mt-1 text-[13px] leading-relaxed text-amber-700 dark:text-amber-300">{matchError}</p>
        </div>
      )}

      <Izgara>
        <Kart baslik={t('sp.screenConfigLxh')}>
          <Veri buyuk label={t('sp.screenConfigLxh')} value={has ? `${cols} ${t('sp.unit')} x ${rows} ${t('sp.unit')}` : DASH} />
        </Kart>

        <Kart baslik={t('sp.screenSpecs')} genis>
          <Veri label={t('sp.lengthHeight')} value={has ? `${fmt(s.W, 3)} x ${fmt(s.H, 3)} m` : DASH} />
          <Veri label={t('sp.area')} value={has ? `${fmt(s.area, 3)} m²` : DASH} />
          <Veri label={t('sp.diagonal')} value={has ? `${fmt(s.diagIn, 1)} ${t('sp.inch')}` : DASH} />
          <Veri label={has ? t('sp.weightCabinets') : t('sp.weight')} value={has ? `${fmt(s.weight, 1)} kg` : DASH} />
          {has && <Veri label={t('sp.viewingDistance')} value={`${fmt(s.viewDist, 1)} m`} />}
        </Kart>

        {has && (
          <Kart baslik={t('sp.optical')}>
            <Veri buyuk label={t('sp.resolution')} value={`${fmt(s.resW)} x ${fmt(s.resH)}`} />
          </Kart>
        )}

        {has && (
          <Kart baslik={t('sp.power')} genis>
            <Veri buyuk label={t('sp.max')} value={`${fmt(s.pMax)} ${t('sp.watt')}`} />
            <Veri buyuk label={t('sp.typical')} value={`${fmt(s.pTyp)} ${t('sp.watt')}`} />
            <Veri label={`110V 20A ${t('sp.circuits')}`} value={circuitText(s.circuits.c110_20)} />
            <Veri label={`208V 20A ${t('sp.circuits')}`} value={circuitText(s.circuits.c208_20)} />
            <Veri label={`230V 13A ${t('sp.circuits')}`} value={circuitText(s.circuits.c230_13)} />
            <Veri label={`230V 16A ${t('sp.circuits')}`} value={circuitText(s.circuits.c230_16)} />
          </Kart>
        )}

        {has && (
          <Kart baslik={t('sp.heat')}>
            <Veri buyuk label={t('sp.max')} value={`${fmt(s.btuMax)} BTU`} />
            <Veri buyuk label={t('sp.typical')} value={`${fmt(s.btuTyp)} BTU`} />
          </Kart>
        )}

        {has && (
          <Kart baslik={t('sp.customerSelection')}>
            <Veri label={t('screen.type')} value={t(`screen.${screenType}`)} />
            <Veri label={t('sbox.heading')} value={sboxRedundancy === 'yes' ? t('common.yes') : t('common.no')} />
            <Veri label={t('sp.miniPc')} value={hasMiniPc ? t('common.yes') : t('common.no')} />
          </Kart>
        )}

        {has && breakdown.length > 0 && (
          <Kart baslik={t('sp.matchedHardware')} genis>
            {breakdown.filter((x) => x.quantity > 0).map((x) => (
              <Veri key={x.key} label={x.name} value={`${fmt(x.quantity)} ${t('sp.unit')}`} />
            ))}
          </Kart>
        )}

        {has && (
          <Kart baslik={t('sp.package')} genis vurgulu>
            <Veri label={t('sp.pkg.module')} value={`${fmt(total)} ${t('sp.unit')}`} />
            <Veri label={t('sp.pkg.processor')} value={lineQty('processor', 1)} />
            <Veri label={t('sp.pkg.psu')} value={lineQty('powerSupply', total)} />
            <Veri
              label={t('sp.pkg.miniPc')}
              value={hasMiniPc ? lineQty('miniPc', 1) : t('sp.pkg.viaProcessor')}
            />
            <Veri label={t('sp.pkg.patch')} value={lineQty('patchCable', Math.max(0, receivingCards - 1))} />
            <Veri label={t('sp.pkg.receiving')} value={lineQty('receivingCard', receivingCards)} />
          </Kart>
        )}

        {/* --- Buradan sonrası eski "Bileşenler" bölümüydü, aynı ızgarada --- */}

        <Kart baslik={t('sp.ledCabinets')}>
          <Veri label={t('sp.cabinetCount')} value={has ? `${fmt(total)} ${t('sp.unit')}` : DASH} />
          {has && <Veri label={t('sp.spareCabinets')} value={`0 ${t('sp.unit')}`} />}
          {has && <Veri label={`${t('sp.totalCabinets')} (${model.modelCode})`} value={`${fmt(total)} ${t('sp.units')}`} />}
        </Kart>

        {has && (
          <Kart baslik={t('sp.sbox')}>
            <Veri label={t('sp.model')} value={model.sboxCode || DASH} />
            <Veri label={t('sp.spare')} value={`${sboxRedundancy === 'yes' ? 1 : 0} ${t('sp.unit')}`} />
          </Kart>
        )}

        {has && (
          <Kart baslik={t('sp.jig')}>
            <Veri label={t('sp.model')} value={model.jigCode || DASH} />
          </Kart>
        )}

        {has && (
          <Kart baslik={t('sp.powerCord')}>
            <Veri label="110V" value={model.powerCord110Code || DASH} />
            <Veri label="220V" value={model.powerCord220Code || DASH} />
          </Kart>
        )}

        {has && <KitKarti genis baslik={t('sp.frameKit')} eylem={t('sp.viewQuantity')} />}
        {has && <KitKarti genis baslik={t('sp.decoKit')} eylem={t('sp.viewQuantity')} />}
      </Izgara>
    </>
  )
}

/**
 * Teknik Özellikler pop-up'ı (Bileşenler de bunun içinde).
 *
 * Dışarıdan kontrol edilir: `open` false ise hiç render edilmez.
 * Başlık şeridi sabit kalır, yalnızca içerik kayar.
 */
export default function SpecsSection({ open = false, onClose, ...props }) {
  const { t } = useLang()

  // Esc ile kapatma
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Pencere açıkken arkadaki sayfa kaymasın (mobilde kaydırma devri)
  useGovdeKilidi(open)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#001334]/45 p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-full w-full flex-col overflow-hidden border border-neutral-200 bg-white shadow-[0_18px_50px_-18px_rgba(0,19,52,0.35)] dark:border-[#2c333f] dark:bg-[#12161d] sm:h-[88vh] sm:w-[92vw] sm:max-w-[1360px] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık şeridi — içerik kayarken yerinde kalır */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-200 px-4 py-4 dark:border-[#2c333f] sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-1 h-5 w-1 shrink-0 rounded-full bg-brand" />
            <div className="min-w-0">
              <h2 className="m-0 text-[19px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                {t('sp.title')}
              </h2>
              <p className="m-0 mt-0.5 text-[12.5px] leading-snug text-neutral-500 dark:text-neutral-400">
                {t('sp.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('exp.close')}
            className="inline-flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-brand dark:text-neutral-500 dark:hover:bg-[#1b2029]"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* İçerik */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-50 px-4 py-5 dark:bg-[#12161d] sm:px-6">
          <SpecsBody {...props} />
          <div className="mt-5 space-y-1 border-t border-neutral-200 pt-4 text-[11px] leading-relaxed text-neutral-400 dark:border-[#2c333f] dark:text-neutral-500">
            <p className="m-0">{t('sp.footnote1')}</p>
            <p className="m-0">{t('sp.footnote2')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
