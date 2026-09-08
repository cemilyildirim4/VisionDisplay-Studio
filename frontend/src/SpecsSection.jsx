/**
 * Model seçildikten sonra sayfanın altında görünen "Teknik Özellikler" ve "Bileşenler" bölümleri.
 * Değerler seçilen modelin verisinden HESAPLANIR. Model yoksa "-" gösterilir.
 *
 * NOT: Bileşenler bölümündeki aksesuar parça kodları (S-Kutu, Jig, Güç Kablosu vb.)
 * yer tutucudur; kendi katalog kodlarınızla değiştirilecek.
 */

import { useEffect } from 'react'
import { useGovdeKilidi } from './hooks/useGovdeKilidi.js'
import { useLang } from './useLang.js'
import { DASH, fmt, computeSpecs } from './specsData.js'

/**
 * Kart içindeki tek satır: solda etiket, sağda değer.
 * Etiket boşsa (ör. Çerçeve Kiti) değer tek başına, ortada ve büyük gösterilir.
 */
function Pair({ label, value }) {
  if (!label) {
    return (
      <div className="py-1 text-center text-lg font-semibold text-neutral-900 dark:text-neutral-100 whitespace-pre-line">
        {value}
      </div>
    )
  }
  return (
    <div className="flex items-baseline justify-between gap-3 sm:gap-4 py-1.5 border-b border-neutral-100 dark:border-[#242b36] last:border-b-0 min-w-0 max-w-full overflow-x-auto">
      <span className="text-sm text-neutral-500 dark:text-neutral-400 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 text-right whitespace-pre-line min-w-0">
        {value}
      </span>
    </div>
  )
}

/**
 * Bir başlık grubu = bir kart.
 * wide: geniş içerikli gruplar (ör. Güç, 6 satır) iki sütun yer kaplar.
 */
function Block({ title, children }) {
  return (
    <div
      className="bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-lg px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] min-w-0 max-w-full"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1 h-4 rounded-full bg-brand shrink-0" />
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 m-0">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  )
}

/**
 * Kartların aktığı iki sütun.
 * CSS sütun akışı kullanılır: kartlar sırayla dizilir, ortada ayırıcı çizgi olur
 * ve hiçbir kart ikiye bölünmez.
 */
function CardGrid({ children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 overflow-x-auto">
      {children}
    </div>
  )
}

/** Pop-up içeriği (Teknik Özellikler + Bileşenler tek listede). */
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
      <CardGrid>
          <Block title={t('sp.screenConfig')}>
            <Pair label={t('sp.lengthHeight')} value={has ? `${cols} ${t('sp.unit')} x ${rows} ${t('sp.unit')}` : DASH} />
            <Pair label={t('sp.totalScreens')} value={has ? `${fmt(total)} ${t('sp.unit')}` : DASH} />
          </Block>

          <Block title={t('sp.screenSpecs')}>
            <Pair
              label={t('sp.lengthHeightDepth')}
              value={has ? `${fmt(s.W, 3)} x ${fmt(s.H, 3)} x ${fmt(depthM, 2)} m` : DASH}
            />
            <Pair label={t('sp.diagonal')} value={has ? `${fmt(s.diagIn, 3)} ${t('sp.inch')}` : DASH} />
            <Pair label={t('sp.weight')} value={has ? `${fmt(s.weight, 1)} kg` : DASH} />
          </Block>

          <Block title={t('sp.power')}>
            <Pair label={t('sp.max')} value={has ? `${fmt(s.pMax)} (W/h)` : DASH} />
            <Pair label={t('sp.typical')} value={has ? `${fmt(s.pTyp)} (W/h)` : DASH} />
          </Block>
      </CardGrid>
    )
  }

  // Teknik özellikler ve bileşenler TEK listede; sütunlara sırayla dağılır.
  return (
    <CardGrid>
        <Block title={t('sp.screenConfigLxh')}>
          <Pair label="" value={has ? `${cols} ${t('sp.unit')} x ${rows} ${t('sp.unit')}` : DASH} />
        </Block>

        <Block title={t('sp.screenSpecs')}>
          <Pair label={t('sp.lengthHeight')} value={has ? `${fmt(s.W, 3)} x ${fmt(s.H, 3)} m` : DASH} />
          <Pair label={t('sp.area')} value={has ? `${fmt(s.area, 3)} m²` : DASH} />
          <Pair label={t('sp.diagonal')} value={has ? `${fmt(s.diagIn, 1)} ${t('sp.inch')}` : DASH} />
          <Pair label={has ? t('sp.weightCabinets') : t('sp.weight')} value={has ? `${fmt(s.weight, 1)} kg` : DASH} />
          {has && <Pair label={t('sp.viewingDistance')} value={`${fmt(s.viewDist, 1)} m`} />}
        </Block>

        {has && (
          <Block title={t('sp.optical')}>
            <Pair label={t('sp.resolution')} value={`${fmt(s.resW)} x ${fmt(s.resH)}`} />
          </Block>
        )}

        {has && (
          <Block title={t('sp.power')}>
            <Pair label={t('sp.max')} value={`${fmt(s.pMax)} ${t('sp.watt')}`} />
            <Pair label={t('sp.typical')} value={`${fmt(s.pTyp)} ${t('sp.watt')}`} />
            <Pair label={`110V 20A ${t('sp.circuits')}`} value={circuitText(s.circuits.c110_20)} />
            <Pair label={`208V 20A ${t('sp.circuits')}`} value={circuitText(s.circuits.c208_20)} />
            <Pair label={`230V 13A ${t('sp.circuits')}`} value={circuitText(s.circuits.c230_13)} />
            <Pair label={`230V 16A ${t('sp.circuits')}`} value={circuitText(s.circuits.c230_16)} />
          </Block>
        )}

        {has && (
          <Block title={t('sp.heat')}>
            <Pair label={t('sp.max')} value={`${fmt(s.btuMax)} BTU`} />
            <Pair label={t('sp.typical')} value={`${fmt(s.btuTyp)} BTU`} />
          </Block>
        )}

        {has && matchError && (
          <Block title={t('sp.hwMatchError')}>
            <Pair label="" value={matchError} />
          </Block>
        )}

        {has && breakdown.length > 0 && (
          <Block title={t('sp.matchedHardware')}>
            {breakdown.filter((x) => x.quantity > 0).map((x) => (
              <Pair key={x.key} label={x.name} value={`${fmt(x.quantity)} ${t('sp.unit')}`} />
            ))}
          </Block>
        )}

        {has && (
          <Block title={t('sp.customerSelection')}>
            <Pair label={t('screen.type')} value={t(`screen.${screenType}`)} />
            <Pair label={t('sbox.heading')} value={sboxRedundancy === 'yes' ? t('common.yes') : t('common.no')} />
            <Pair label={t('sp.miniPc')} value={hasMiniPc ? t('common.yes') : t('common.no')} />
          </Block>
        )}

        {has && (
          <Block title={t('sp.package')}>
            <Pair label={t('sp.pkg.module')} value={`${fmt(total)} ${t('sp.unit')}`} />
            <Pair label={t('sp.pkg.processor')} value={lineQty('processor', 1)} />
            <Pair label={t('sp.pkg.psu')} value={lineQty('powerSupply', total)} />
            <Pair
              label={t('sp.pkg.miniPc')}
              value={hasMiniPc ? lineQty('miniPc', 1) : t('sp.pkg.viaProcessor')}
            />
            <Pair label={t('sp.pkg.patch')} value={lineQty('patchCable', Math.max(0, receivingCards - 1))} />
            <Pair label={t('sp.pkg.receiving')} value={lineQty('receivingCard', receivingCards)} />
          </Block>
        )}

      {/* --- Buradan sonrası eski "Bileşenler" bölümüydü, aynı listeye taşındı --- */}

        <Block title={t('sp.ledCabinets')}>
          <Pair label={t('sp.cabinetCount')} value={has ? `${fmt(total)} ${t('sp.unit')}` : DASH} />
          {has && <Pair label={t('sp.spareCabinets')} value={`0 ${t('sp.unit')}`} />}
          {has && <Pair label={`${t('sp.totalCabinets')} (${model.modelCode})`} value={`${fmt(total)} ${t('sp.units')}`} />}
        </Block>

        {has && (
          <Block title={t('sp.sbox')}>
            <Pair label={t('sp.model')} value={model.sboxCode || DASH} />
            <Pair label={t('sp.spare')} value={`${sboxRedundancy === 'yes' ? 1 : 0} ${t('sp.unit')}`} />
          </Block>
        )}

        {has && (
          <Block title={t('sp.jig')}>
            <Pair label={t('sp.model')} value={model.jigCode || DASH} />
          </Block>
        )}

        {has && (
          <Block title={t('sp.powerCord')}>
            <Pair label="110V" value={model.powerCord110Code || DASH} />
            <Pair label="220V" value={model.powerCord220Code || DASH} />
          </Block>
        )}

        {has && (
          <Block title={t('sp.frameKit')}>
            <Pair label="" value={t('sp.viewQuantity')} />
          </Block>
        )}

        {has && (
          <Block title={t('sp.decoKit')}>
            <Pair label="" value={t('sp.viewQuantity')} />
          </Block>
        )}
    </CardGrid>
  )
}

/**
 * Teknik Özellikler pop-up'ı (Bileşenler de bunun içinde).
 *
 * Dışarıdan kontrol edilir: `open` false ise hiç render edilmez.
 * Açma butonu App.jsx'teki sol dikey simge şeridinde.
 *
 * İçerik ortadan ikiye bölünmüş iki sütuna sırayla akar; tek bakışta
 * görünsün diye kartlar sıkışıktır. Küçük ekranlarda erişilebilir kalsın
 * diye kaydırma yine de açık bırakıldı.
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
      className="fixed inset-0 z-50 bg-[#001334]/45 flex items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#161a21] rounded-2xl w-full max-w-[calc(100%-2rem)] mx-4 md:mx-auto md:max-w-6xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-200 dark:border-[#2c333f]">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-5 rounded-full bg-brand shrink-0" />
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 m-0">{t('sp.title')}</h2>
          </div>
          <div className="flex items-center gap-5">
            <button type="button" onClick={onClose} aria-label={t('exp.close')} className="text-neutral-400 dark:text-neutral-500 hover:text-brand inline-flex items-center justify-center min-h-[44px] min-w-[44px]">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto overflow-x-auto bg-neutral-50/60 dark:bg-[#12161d] px-3 sm:px-5 py-4">
          <SpecsBody {...props} />
          <div className="mt-4 space-y-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">
            <p className="m-0">{t('sp.footnote1')}</p>
            <p className="m-0">{t('sp.footnote2')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
