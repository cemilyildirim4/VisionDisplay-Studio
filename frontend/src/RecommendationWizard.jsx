import { useMemo, useState } from 'react'
import { useLang } from './useLang.js'
import { baseViewingDistance } from './viewingDistance.js'

/**
 * ÖNERİ SİHİRBAZI — "Kullanım Amacı → Mekan → İzleme Mesafesi → Önerilen Modeller"
 *
 * NEDEN AYRI BİR BİLEŞEN VE MEVCUT AKIŞIN YERİNE GEÇMİYOR:
 * Bu projede önceden dört adımlı bir sihirbaz (StepBar + Geri/İleri) vardı ve
 * kasıtlı olarak kaldırıldı (bkz. App.jsx'teki not): kullanıcı adım atlayıp
 * geri dönmek zorunda kalıyordu ve hiçbir an yapılandırmanın tamamını
 * göremiyordu. O kararı bozmadan, "hangi modeli seçeceğini bilmeyen" ilk kez
 * gelen bir kullanıcıya YARDIMCI, isteğe bağlı bir katman ekliyoruz: sihirbaz
 * sadece 2-3 soruyla ModelSelectModal'daki uzun listeyi 3 öneriye indiriyor,
 * ama son kararı yine kullanıcı --- ana akış tek ekranda kalmaya devam ediyor.
 *
 * PUANLAMA MANTIĞI (kod bazlı, keyfi değil):
 *   - Ana sürücü İZLEME MESAFESİdir: LED sektöründe piksel aralığı seçimi
 *     doğrudan izleme mesafesine bağlıdır (bkz. viewingDistance.js). Her
 *     kabin için `baseViewingDistance` hesaplanıp kullanıcının hedef
 *     mesafesine en yakın olanlar öne çıkar.
 *   - Dış mekân seçilirse parlaklığı (nits) yüksek modellere bonus verilir —
 *     güneş ışığında görünürlük gerçek bir kısıt.
 *   - Kullanım amacı, video duvarı / LED panel kategorisi arasında bir ön
 *     eğilim oluşturur (örn. "Sahne/Etkinlik" büyük LED panel, "Stüdyo/Sanal
 *     Üretim" ince pikseli video duvarını öne çıkarır).
 */

const PURPOSES = [
  { id: 'signage', labelKey: 'wiz.purpose.signage', category: 'led', brightnessBias: 0.5 },
  { id: 'meeting', labelKey: 'wiz.purpose.meeting', category: 'videowall', brightnessBias: 0 },
  { id: 'event', labelKey: 'wiz.purpose.event', category: 'led', brightnessBias: 0.5 },
  { id: 'retail', labelKey: 'wiz.purpose.retail', category: 'led', brightnessBias: 0.2 },
  { id: 'studio', labelKey: 'wiz.purpose.studio', category: 'videowall', brightnessBias: -0.2 },
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

function scoreCabinet(cab, { purpose, place, distance }) {
  const targetM = distance.meters
  const actualM = baseViewingDistance(cab) || targetM
  // Mesafe farkı ne kadar küçükse skor o kadar iyi (negatif ceza).
  let score = -Math.abs(actualM - targetM) * 10

  // Kategori eğilimi — tam eşleşme küçük bir bonus, zıt kategori küçük bir ceza.
  if (purpose.category && cab.category === purpose.category) score += 8
  else if (purpose.category) score -= 3

  // Dış mekân + düşük parlaklık = kötü kombinasyon; parlaklık yüksekse ödüllendir.
  const brightness = Number(cab.brightnessNits) || 0
  if (place.outdoor) score += (brightness - 700) / 100
  else score += (700 - Math.abs(brightness - 700)) / 200

  score += purpose.brightnessBias * (brightness / 100)
  return score
}

function StepDots({ step, total }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-3">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-brand' : 'w-1.5 bg-neutral-300 dark:bg-[#39414f]'}`}
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
      className={`w-full text-left rounded-xl border-2 px-4 py-3.5 transition-colors ${
        active
          ? 'border-brand bg-brand-tint text-brand dark:text-brand-light font-semibold'
          : 'border-neutral-200 dark:border-[#2c333f] hover:border-neutral-300 dark:hover:border-[#39414f]'
      }`}
    >
      {label}
    </button>
  )
}

export default function RecommendationWizard({ open, onClose, cabinets, onChoose, onOpenFullList }) {
  const { t } = useLang()
  const [step, setStep] = useState(0)
  const [purposeId, setPurposeId] = useState(null)
  const [placeId, setPlaceId] = useState(null)
  const [distanceId, setDistanceId] = useState(null)

  const reset = () => {
    setStep(0)
    setPurposeId(null)
    setPlaceId(null)
    setDistanceId(null)
  }

  const recommendations = useMemo(() => {
    if (step < 3 || !purposeId || !placeId || !distanceId) return []
    const purpose = PURPOSES.find((p) => p.id === purposeId)
    const place = PLACES.find((p) => p.id === placeId)
    const distance = DISTANCES.find((d) => d.id === distanceId)
    return [...cabinets]
      .map((cab) => ({ cab, score: scoreCabinet(cab, { purpose, place, distance }) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.cab)
  }, [step, purposeId, placeId, distanceId, cabinets])

  if (!open) return null

  const close = () => {
    reset()
    onClose()
  }

  const steps = [
    {
      titleKey: 'wiz.step1Title',
      body: (
        <div className="flex flex-col gap-2">
          {PURPOSES.map((p) => (
            <ChoiceCard key={p.id} label={t(p.labelKey)} active={purposeId === p.id} onClick={() => { setPurposeId(p.id); setStep(1) }} />
          ))}
        </div>
      ),
    },
    {
      titleKey: 'wiz.step2Title',
      body: (
        <div className="grid grid-cols-2 gap-2">
          {PLACES.map((p) => (
            <ChoiceCard key={p.id} label={t(p.labelKey)} active={placeId === p.id} onClick={() => { setPlaceId(p.id); setStep(2) }} />
          ))}
        </div>
      ),
    },
    {
      titleKey: 'wiz.step3Title',
      body: (
        <div className="flex flex-col gap-2">
          {DISTANCES.map((d) => (
            <ChoiceCard key={d.id} label={t(d.labelKey)} active={distanceId === d.id} onClick={() => { setDistanceId(d.id); setStep(3) }} />
          ))}
        </div>
      ),
    },
  ]

  const current = steps[step]

  return (
    <div className="fixed inset-0 z-[70] bg-[#001334]/45 flex items-center justify-center p-4" onClick={close}>
      <div
        className="bg-white dark:bg-[#161a21] rounded-2xl w-full max-w-[480px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#12151c] text-white px-5 py-3.5 flex items-center justify-between gap-4">
          <h2 className="text-base font-bold m-0">{t('wiz.title')}</h2>
          <button type="button" onClick={close} aria-label={t('exp.close')} className="text-white/70 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <StepDots step={Math.min(step, 3)} total={4} />

        <div className="flex-1 overflow-auto px-5 pb-5">
          {step < 3 ? (
            <>
              <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3 mt-1">{t(current.titleKey)}</h3>
              {current.body}
              {step > 0 && (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="mt-4 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                  ← {t('wiz.back')}
                </button>
              )}
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3 mt-1">{t('wiz.resultsTitle')}</h3>
              <div className="flex flex-col gap-2.5">
                {recommendations.map((cab) => (
                  <button
                    key={cab.id}
                    type="button"
                    onClick={() => {
                      onChoose(cab)
                      close()
                    }}
                    className="w-full text-left rounded-xl border border-neutral-200 dark:border-[#2c333f] px-4 py-3 hover:border-brand transition-colors flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-brand">{cab.modelCode}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {cab.pixelPitchMm ? `P${cab.pixelPitchMm} · ` : ''}
                        {cab.brightnessNits ? `${cab.brightnessNits} nits · ` : ''}
                        {baseViewingDistance(cab).toFixed(1)} m {t('wiz.idealDistance')}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-brand shrink-0">{t('wiz.pick')} →</span>
                  </button>
                ))}
                {recommendations.length === 0 && (
                  <p className="text-sm text-neutral-400">{t('wiz.noResults')}</p>
                )}
              </div>
              <div className="flex items-center justify-between mt-4">
                <button type="button" onClick={() => setStep(2)} className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                  ← {t('wiz.back')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenFullList?.()
                    close()
                  }}
                  className="text-xs font-semibold text-brand hover:underline"
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
