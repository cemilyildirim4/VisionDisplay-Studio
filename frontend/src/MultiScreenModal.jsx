import { useEffect, useState } from 'react'
import { useLang } from './useLang.js'

/**
 * "Çoklu Ekran" pop-up'ı: birden fazla ekran tanımlama.
 * Her ekran: tür (Düz/Kavisli/İç L Tipi) + Sütun + Satır.
 * Ekle / sil / sırala (yukarı-aşağı) / sıfırla / Tamamlamak.
 */

const TYPES = ['flat', 'curved', 'curvedIn', 'lshape']

function MiniStepper({ value, onChange, min = 1 }) {
  // draft: yazarken kutunun tamamen boşaltılabilmesi için geçici metin
  const [draft, setDraft] = useState(null)
  const dec = () => onChange(Math.max(min, (Number(value) || min) - 1))
  const inc = () => onChange((Number(value) || min) + 1)
  const atMin = (Number(value) || min) <= min

  const handleChange = (e) => {
    const t = e.target.value
    setDraft(t)
    if (t === '') return // boş bırakmaya izin ver
    const n = Number(t)
    if (!Number.isNaN(n)) onChange(n)
  }
  const handleBlur = () => {
    const n = Number(draft)
    if (draft === '' || draft === null || Number.isNaN(n)) onChange(min)
    else onChange(Math.max(min, n))
    setDraft(null)
  }

  return (
    <div className="flex items-stretch text-neutral-500 dark:text-neutral-400">
      <button
        type="button"
        onClick={dec}
        disabled={atMin}
        className={`w-11 h-11 min-w-[44px] min-h-[44px] border border-neutral-200 dark:border-[#2c333f] rounded-l-md flex items-center justify-center ${
          atMin ? 'text-neutral-300' : 'hover:bg-neutral-50 dark:hover:bg-[#1b2029]'
        }`}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="6" y1="12" x2="18" y2="12" />
        </svg>
      </button>
      <input
        type="number"
        value={draft !== null ? draft : value}
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-12 min-w-0 h-11 min-h-[44px] border-y border-neutral-200 dark:border-[#2c333f] text-center text-sm text-neutral-700 dark:text-neutral-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={inc}
        className="w-11 h-11 min-w-[44px] min-h-[44px] border border-neutral-200 dark:border-[#2c333f] rounded-r-lg flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-[#1b2029]"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="6" x2="12" y2="18" />
          <line x1="6" y1="12" x2="18" y2="12" />
        </svg>
      </button>
    </div>
  )
}

/** Hangi kategoride çalışıldığını gösteren etiket (seçim aracı değil). */
function CategoryTag({ label, active }) {
  return (
    <div
      className={`py-3.5 rounded-lg text-[15px] text-center ${
        active
          ? 'border-2 border-brand text-neutral-900 dark:text-neutral-100 font-medium'
          : 'border border-neutral-200 dark:border-[#2c333f] text-neutral-400 dark:text-neutral-500'
      }`}
    >
      {label}
    </div>
  )
}

export default function MultiScreenModal({ open, onClose, modelCode, category, initialScreens, onComplete }) {
  const { t } = useLang()
  const [screens, setScreens] = useState([{ type: 'flat', cols: 6, rows: 6 }])

  // Açılışta mevcut ekran ayarlarını yükle (düzenlenebilsin)
  useEffect(() => {
    if (open) {
      setScreens(initialScreens && initialScreens.length ? initialScreens.map((s) => ({ ...s })) : [{ type: 'flat', cols: 6, rows: 6 }])
    }
  }, [open, initialScreens])

  if (!open) return null

  const isVideoWall = category === 'videowall'

  const update = (i, patch) => setScreens((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  const add = () => setScreens((prev) => [...prev, { type: 'flat', cols: 1, rows: 1 }])
  const remove = (i) => setScreens((prev) => prev.filter((_, idx) => idx !== i))
  const move = (i, dir) => {
    setScreens((prev) => {
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  const reset = () => setScreens([{ type: 'flat', cols: 6, rows: 6 }])

  const many = screens.length > 1

  return (
    <div className="fixed inset-0 z-50 bg-[#001334]/45 flex items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#161a21] rounded-3xl w-full max-w-[calc(100%-2rem)] mx-4 md:mx-auto md:max-w-[1120px] max-h-[90vh] overflow-y-auto flex flex-col relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="flex items-start justify-between px-4 sm:px-8 pt-5 sm:pt-7 pb-4 shrink-0 gap-3">
          <h2 className="text-lg sm:text-2xl font-bold m-0">{t('msm.title')}</h2>
          <button type="button" onClick={onClose} aria-label={t('exp.close')} className="text-neutral-600 dark:text-neutral-400 hover:text-brand inline-flex items-center justify-center min-h-[44px] min-w-[44px] shrink-0">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* İçerik (kaydırılabilir) */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-2">
          {/*
            Kategori göstergesi. Tıklanabilir DEĞİL — model bu pop-up'a girmeden önce
            seçilmiş oluyor. Burada yalnızca hangi kategoride çalışıldığı gösteriliyor,
            bu yüzden seçili modelin kategorisine göre vurgulanır.
          */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-5 mb-5 sm:mb-6">
            <CategoryTag label={t('msm.tabLed')} active={!isVideoWall} />
            <CategoryTag label={t('msm.tabVideowall')} active={isVideoWall} />
          </div>

          {/* Seçilen Model */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-10 mb-6 text-[15px] max-w-full">
            <span className="text-neutral-500 dark:text-neutral-400">{t('mse.selectedModel')}</span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{modelCode || '—'}</span>
          </div>

          {/* Ekran kartları — yan yana ızgara (dar ekranda tek sütuna düşer) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {screens.map((s, i) => (
              <div key={i} className="border border-neutral-200 dark:border-[#2c333f] rounded-xl p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-100 dark:border-[#242b36] pb-2.5 mb-3 gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base font-bold m-0">{t('screen.label')} {String(i + 1).padStart(2, '0')}</h3>
                    {many && i > 0 && (
                      <button type="button" onClick={() => move(i, -1)} aria-label={t('mse.moveUp')} className="text-neutral-500 dark:text-neutral-400 hover:text-brand inline-flex items-center justify-center min-h-[44px] min-w-[44px]">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 19V5" />
                          <path d="M6 11l6-6 6 6" />
                        </svg>
                      </button>
                    )}
                    {many && i < screens.length - 1 && (
                      <button type="button" onClick={() => move(i, 1)} aria-label={t('mse.moveDown')} className="text-neutral-500 dark:text-neutral-400 hover:text-brand inline-flex items-center justify-center min-h-[44px] min-w-[44px]">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14" />
                          <path d="M6 13l6 6 6-6" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {many && (
                    <button type="button" onClick={() => remove(i)} aria-label={t('mse.delete')} className="text-neutral-400 dark:text-neutral-500 hover:text-red-500 inline-flex items-center justify-center min-h-[44px] min-w-[44px]">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Ekran Türü */}
                <div className="mb-3">
                  <span className="text-sm text-neutral-700 dark:text-neutral-300 block mb-1.5">{t('screen.type')}</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1.5">
                    {TYPES.map((tv) => (
                      <label key={tv} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer min-h-[44px]">
                        <input
                          type="radio"
                          name={`type-${i}`}
                          checked={s.type === tv}
                          onChange={() => {
                            if (tv === 'lshape' && !s.leftCols) {
                              const l = Math.max(1, Math.ceil((Number(s.cols) || 2) / 2))
                              const r = Math.max(1, (Number(s.cols) || 2) - l)
                              update(i, { type: tv, leftCols: l, rightCols: r, cols: l + r })
                            } else {
                              update(i, { type: tv })
                            }
                          }}
                          className="accent-black"
                        />
                        {t(`screen.${tv}`)}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sütunlar / Satırlar */}
                {s.type === 'lshape' ? (
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 flex-wrap max-w-full">
                    <div className="flex items-center justify-between md:justify-start gap-4 md:gap-8 w-full md:w-auto">
                      <span className="text-sm text-neutral-700 dark:text-neutral-300 w-20 shrink-0">{t('mse.leftWing')}</span>
                      <MiniStepper
                        value={s.leftCols || 1}
                        onChange={(v) => update(i, { leftCols: v, cols: v + (s.rightCols || 1) })}
                      />
                    </div>
                    <div className="flex items-center justify-between md:justify-start gap-4 md:gap-6 w-full md:w-auto">
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">{t('mse.rightWing')}</span>
                      <MiniStepper
                        value={s.rightCols || 1}
                        onChange={(v) => update(i, { rightCols: v, cols: (s.leftCols || 1) + v })}
                      />
                    </div>
                    <div className="flex items-center justify-between md:justify-start gap-4 md:gap-6 w-full md:w-auto">
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">{t('screen.rows')}</span>
                      <MiniStepper value={s.rows} onChange={(v) => update(i, { rows: v })} />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 flex-wrap max-w-full">
                    <div className="flex items-center justify-between md:justify-start gap-4 md:gap-8 w-full md:w-auto">
                      <span className="text-sm text-neutral-700 dark:text-neutral-300 w-24">{t('screen.columns')}</span>
                      <MiniStepper value={s.cols} onChange={(v) => update(i, { cols: v })} />
                    </div>
                    <div className="flex items-center justify-between md:justify-start gap-4 md:gap-6 w-full md:w-auto">
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">{t('screen.rows')}</span>
                      <MiniStepper value={s.rows} onChange={(v) => update(i, { rows: v })} />
                    </div>
                  </div>
                )}

              </div>
            ))}

            {/*
              "Başka bir ekran ekle" ızgaranın son hücresi olarak durur.
              Tek sayıda ekranda yandaki boşluğu doldurur, çift sayıda yeni
              satırın soluna geçer — her iki durumda da aynı kesikli kart.
            */}
            {(
              <button
                type="button"
                onClick={add}
                className="border-2 border-dashed border-neutral-300 dark:border-[#39414f] rounded-xl p-4 min-h-[160px] flex flex-col items-center justify-center gap-2 text-neutral-500 dark:text-neutral-400 hover:border-brand hover:text-brand hover:bg-brand-tint/40 transition-colors"
              >
                <span className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
                <span className="text-sm font-medium">{t('mse.addScreen')}</span>
              </button>
            )}
          </div>

          {/* Sıfırla — ekleme düğmesi artık ızgarada */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mt-5 mb-2">
            {many && (
              <button type="button" onClick={reset} className="text-sm text-neutral-700 dark:text-neutral-300 underline hover:text-brand min-h-[44px] inline-flex items-center">
                {t('mse.reset')}
              </button>
            )}
          </div>
        </div>

        {/* Tamamlamak */}
        <div className="flex flex-col sm:flex-row justify-center py-5 px-4 shrink-0">
          <button
            type="button"
            onClick={() => {
              onComplete(screens)
              onClose()
            }}
            className="rounded-full px-8 sm:px-20 py-3.5 min-h-[44px] font-semibold text-white bg-brand hover:bg-brand-dark transition-colors w-full sm:w-auto max-w-full"
          >
            {t('mse.complete')}
          </button>
        </div>
      </div>
    </div>
  )
}
