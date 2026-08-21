import { useMemo, useState } from 'react'
import { useLang } from './useLang.js'
import { baseViewingDistance } from './viewingDistance.js'
import { rankCabinets } from './recommendEngine.js'

/**
 * ÖNERİ SİHİRBAZI — isteğe bağlı yardımcı katman.
 * Ana akış tek ekranda kalır; sihirbaz listeyi 2 öneriye indirir.
 *
 * Adımlar: mekan (sert) → mesafe (sert) → amaç (puan) → sonuç + isteğe bağlı bütçe.
 */

const PURPOSES = [
  { id: 'signage', labelKey: 'wiz.purpose.signage', category: 'led' },
  { id: 'meeting', labelKey: 'wiz.purpose.meeting', category: 'videowall' },
  { id: 'event', labelKey: 'wiz.purpose.event', category: 'led' },
  { id: 'retail', labelKey: 'wiz.purpose.retail', category: 'led' },
  { id: 'studio', labelKey: 'wiz.purpose.studio', category: 'videowall' },
]

const PLACES = [
  { id: 'indoor', labelKey: 'wiz.place.indoor', outdoor: false },
  { id: 'outdoor', labelKey: 'wiz.place.outdoor', outdoor: true },
]

const DISTANCES = [
  { id: 'close', labelKey: 'wiz.distance.close', meters: 1.5 },
  { id: 'mid', labelKey: 'wiz.distance.mid', meters: 5 },
  { id: 'far', labelKey: 'wiz.distance.far', meters: 12 },
]

function fill(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

function StepDots({ step, total }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-3">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-accent' : i < step ? 'w-4 bg-brand' : 'w-1.5 bg-neutral-300 dark:bg-[#39414f]'}`}
        />
      ))}
    </div>
  )
}

function ChoiceCard({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-4 md:p-6 min-h-[44px] text-sm md:text-base transition-colors ${
        active
          ? 'btn-selected'
          : 'border-neutral-200 dark:border-[#2c333f] hover:border-neutral-300 dark:hover:border-[#39414f]'
      }`}
    >
      {label}
    </button>
  )
}

function RecCard({ rec, badge, why, pickLabel, onPick }) {
  const cab = rec.cab
  return (
    <button
      type="button"
      onClick={() => onPick(cab)}
      className="w-full md:flex-1 text-left rounded-xl border border-neutral-200 dark:border-[#2c333f] p-4 md:p-6 hover:border-brand transition-colors max-w-full min-w-0"
    >
      <div className="flex flex-col md:flex-row items-start justify-between gap-3">
        <div className="min-w-0 w-full md:w-auto max-w-full">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-0.5">{badge}</div>
          <div className="font-bold text-brand text-sm md:text-base">{cab.modelCode}</div>
          {cab.series?.name ? (
            <div className="text-xs text-neutral-500 dark:text-neutral-400">{cab.series.name}</div>
          ) : null}
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {cab.pixelPitchMm ? `P${cab.pixelPitchMm} · ` : ''}
            {cab.brightnessNits ? `${cab.brightnessNits} nits · ` : ''}
            {cab.ipRating ? `IP${cab.ipRating} · ` : ''}
            {baseViewingDistance(cab).toFixed(1)} m
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-2 mb-0 leading-relaxed">{why}</p>
        </div>
        <span className="text-xs font-semibold text-brand shrink-0 mt-1 md:mt-4 inline-flex items-center min-h-[44px]">{pickLabel} →</span>
      </div>
    </button>
  )
}

export default function RecommendationWizard({ open, onClose, cabinets, onChoose, onOpenFullList }) {
  const { t } = useLang()
  const [step, setStep] = useState(0)
  const [placeId, setPlaceId] = useState(null)
  const [distanceId, setDistanceId] = useState(null)
  const [purposeId, setPurposeId] = useState(null)
  const [budgetText, setBudgetText] = useState('')

  const reset = () => {
    setStep(0)
    setPlaceId(null)
    setDistanceId(null)
    setPurposeId(null)
    setBudgetText('')
  }

  const place = PLACES.find((p) => p.id === placeId)
  const distance = DISTANCES.find((d) => d.id === distanceId)
  const purpose = PURPOSES.find((p) => p.id === purposeId)
  const budget = Number(budgetText)
  const budgetN = Number.isFinite(budget) && budget > 0 ? budget : null

  const ranked = useMemo(() => {
    if (!place || !distance || !purpose) {
      return { passed: [], primary: null, alternative: null }
    }
    return rankCabinets(cabinets, {
      outdoor: place.outdoor,
      distanceM: distance.meters,
      purpose,
      budget: budgetN,
    })
  }, [cabinets, place, distance, purpose, budgetN])

  if (!open) return null

  const close = () => {
    reset()
    onClose()
  }

  const pick = (cab) => {
    onChoose(cab)
    close()
  }

  const primaryWhy = ranked.primary
    ? fill(t('wiz.whyPrimary'), {
        place: t(place.labelKey),
        pitch: String(ranked.primary.cab.pixelPitchMm ?? '—'),
        distance: String(distance.meters),
        featured: ranked.primary.cab.featured ? t('wiz.featuredHint') : '',
      })
    : ''

  const altWhy = ranked.primary && ranked.alternative
    ? (() => {
        const a = ranked.alternative.cab
        const p = ranked.primary.cab
        const aPrice = Number(a.price)
        const pPrice = Number(p.price)
        if (Number.isFinite(aPrice) && Number.isFinite(pPrice) && aPrice < pPrice) {
          return fill(t('wiz.whyAltCheaper'), { code: a.modelCode })
        }
        if ((a.pixelPitchMm || 0) < (p.pixelPitchMm || 0)) {
          return fill(t('wiz.whyAltFiner'), { code: a.modelCode })
        }
        return fill(t('wiz.whyAltOther'), { code: a.modelCode })
      })()
    : ''

  const steps = [
    {
      titleKey: 'wiz.step1Title',
      body: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {PLACES.map((p) => (
            <ChoiceCard
              key={p.id}
              label={t(p.labelKey)}
              active={placeId === p.id}
              onClick={() => {
                setPlaceId(p.id)
                setStep(1)
              }}
            />
          ))}
        </div>
      ),
    },
    {
      titleKey: 'wiz.step2Title',
      body: (
        <div className="flex flex-col gap-2">
          {DISTANCES.map((d) => (
            <ChoiceCard
              key={d.id}
              label={t(d.labelKey)}
              active={distanceId === d.id}
              onClick={() => {
                setDistanceId(d.id)
                setStep(2)
              }}
            />
          ))}
        </div>
      ),
    },
    {
      titleKey: 'wiz.step3Title',
      body: (
        <div className="flex flex-col gap-2">
          {PURPOSES.map((p) => (
            <ChoiceCard
              key={p.id}
              label={t(p.labelKey)}
              active={purposeId === p.id}
              onClick={() => {
                setPurposeId(p.id)
                setStep(3)
              }}
            />
          ))}
        </div>
      ),
    },
  ]

  const current = steps[step]

  return (
    <div className="fixed inset-0 z-[70] bg-[#001334]/45 flex items-center justify-center p-0 sm:p-4" onClick={close}>
      <div
        className="bg-white dark:bg-[#161a21] rounded-2xl w-full max-w-[calc(100%-2rem)] mx-4 md:mx-auto md:max-w-[520px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#12151c] text-white px-4 md:px-5 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4">
          <h2 className="text-sm md:text-base font-bold m-0">{t('wiz.title')}</h2>
          <button type="button" onClick={close} aria-label={t('exp.close')} className="text-white/70 hover:text-white transition-colors inline-flex items-center justify-center min-h-[44px] min-w-[44px]">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <StepDots step={Math.min(step, 3)} total={4} />

        <div className="flex-1 overflow-auto px-4 md:px-6 pb-4 md:pb-6">
          {step < 3 ? (
            <>
              <h3 className="text-sm md:text-base font-semibold text-neutral-500 dark:text-neutral-400 mb-3 mt-1">{t(current.titleKey)}</h3>
              {current.body}
              {step > 0 && (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="mt-4 text-xs md:text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 min-h-[44px] inline-flex items-center">
                  ← {t('wiz.back')}
                </button>
              )}
            </>
          ) : (
            <>
              <h3 className="text-sm md:text-base font-semibold text-neutral-500 dark:text-neutral-400 mb-3 mt-1">{t('wiz.resultsTitle')}</h3>
              <label className="block mb-3">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('wiz.budget')}</span>
                <input
                  type="number"
                  min="0"
                  value={budgetText}
                  onChange={(e) => setBudgetText(e.target.value)}
                  placeholder={t('wiz.budgetPlaceholder')}
                  className="mt-1 w-full max-w-full rounded-lg border border-neutral-200 dark:border-[#2c333f] bg-white dark:bg-[#12151c] px-3 py-2 min-h-[44px] text-sm md:text-base"
                />
              </label>
              <div className="flex flex-col md:flex-row flex-wrap gap-2.5">
                {ranked.primary && (
                  <RecCard
                    rec={ranked.primary}
                    badge={t('wiz.primary')}
                    why={primaryWhy}
                    pickLabel={t('wiz.pick')}
                    onPick={pick}
                  />
                )}
                {ranked.alternative && (
                  <RecCard
                    rec={ranked.alternative}
                    badge={t('wiz.alternative')}
                    why={altWhy}
                    pickLabel={t('wiz.pick')}
                    onPick={pick}
                  />
                )}
                {!ranked.primary && (
                  <p className="text-sm text-neutral-400">{t('wiz.noResults')}</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-4">
                <button type="button" onClick={() => setStep(2)} className="text-xs md:text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 min-h-[44px] inline-flex items-center">
                  ← {t('wiz.back')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenFullList?.()
                    close()
                  }}
                  className="text-xs md:text-sm font-semibold text-brand hover:underline min-h-[44px] inline-flex items-center"
                >
                  {t('wiz.seeAll')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
