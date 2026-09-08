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
 * Kart içindeki tek veri: ETİKET ÜSTTE, DEĞER ALTTA.
 *
 * Önceden etiket solda, değer sağdaydı; uzun model adları dar sütunda
 * kırılıp okunmuyordu ve her satırın altındaki çizgi kartı ızgaraya
 * çeviriyordu. Artık değer kendi satırında, etiketten belirgin biçimde
 * ayrışıyor; ayırıcı çizgi yerine boşluk kullanılıyor.
 *
 * Etiketsiz kullanım (ör. Ekran Yapılandırması) ANA DEĞER sayılıyor:
 * büyük ve dikkat çekici yazılıyor.
 */
function Pair({ label, value }) {
  if (!label) {
    return (
      <div className="py-1 text-[22px] leading-tight font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 whitespace-pre-line">
        {value}
      </div>
    )
  }
  return (
    <div className="min-w-0">
      <div className="text-[12px] leading-snug text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-0.5 text-[14px] leading-snug font-semibold text-neutral-900 dark:text-neutral-100 whitespace-pre-line break-words">
        {value}
      </div>
    </div>
  )
}

/**
 * Bir başlık grubu = bir kart.
 *
 * Çerçeve ve gölge sadeleşti: koyu çizgi yerine tek ince kenar, yumuşak
 * köşe ve içerik miktarına göre büyüyen yükseklik. Başlıklar her kartta
 * aynı: küçük, seyrek harfli, gri. Böylece göz önce DEĞERLERİ okuyor.
 */
function Block({ title, children, vurgulu = false }) {
  return (
    <div
      className={`rounded-xl px-4 py-3.5 min-w-0 max-w-full self-start ${
        vurgulu
          ? 'bg-brand/[0.05] dark:bg-brand/10 border border-brand/25'
          : 'bg-white dark:bg-[#161a21] border border-neutral-200/80 dark:border-[#252b35]'
      }`}
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-neutral-500 dark:text-neutral-400 m-0 mb-2.5">
        {title}
      </h3>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  )
}

/**
 * Kart ızgarası.
 *
 * Geniş ekranda 4, orta ekranda 2, dar ekranda tek sütun. Kartlar
 * `self-start` ile içerikleri kadar yükseliyor: kısa kartlar boşuna
 * uzamıyor, satır hizaları bozulmuyor.
 */
function CardGrid({ children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
      {children}
    </div>
  )
}

/**
 * Kit kartlarındaki "Miktarı görüntüle" satırı.
 *
 * Eskiden kartın ortasında iri bir yazıydı ve tıklanabilir görünmüyordu.
 * Artık ikincil buton biçiminde: dokunmaya rahat, üzerine gelince
 * belirginleşiyor. Davranışı değişmedi.
 */
function KitDugmesi({ children }) {
  return (
    <button
      type="button"
      className="w-full min-h-[38px] px-3 rounded-lg text-[13px] font-medium border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-300 hover:border-brand hover:text-brand transition-colors"
    >
      {children}
    </button>
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
        <Block title={t('sp.screenConfigLxh')} vurgulu>
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
            <p className="m-0 text-[13px] leading-relaxed text-amber-600 dark:text-amber-400">{matchError}</p>
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
            <KitDugmesi>{t('sp.viewQuantity')}</KitDugmesi>
          </Block>
        )}

        {has && (
          <Block title={t('sp.decoKit')}>
            <KitDugmesi>{t('sp.viewQuantity')}</KitDugmesi>
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
        className="bg-white dark:bg-[#161a21] rounded-2xl w-full max-w-[calc(100%-2rem)] mx-4 md:mx-auto md:max-w-[1280px] max-h-[92vh] flex flex-col overflow-hidden shadow-[0_24px_60px_-12px_rgba(0,19,52,0.35)]"
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
        <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-[#12161d] px-4 sm:px-6 py-5">
          <SpecsBody {...props} />
          <div className="mt-5 pt-4 border-t border-neutral-200/70 dark:border-[#252b35] space-y-1 text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
            <p className="m-0">{t('sp.footnote1')}</p>
            <p className="m-0">{t('sp.footnote2')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
