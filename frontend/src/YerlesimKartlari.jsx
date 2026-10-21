/**
 * Duvara sığan yatay / dikey dizilim kartları.
 * Tıklanınca oryantasyon + sütun/satır güncellenir; tuval anında yeniden hesaplanır.
 */
export default function YerlesimKartlari({ t, secenekler, orientation, onSelect }) {
  if (!secenekler) return null

  const { yatay, dikey } = secenekler
  const maxPx = Math.max(yatay.piksel, dikey.piksel)
  const kartlar = [
    { id: 'landscape', etiket: t('conf.layoutHorizontal'), veri: yatay },
    { id: 'portrait', etiket: t('conf.layoutVertical'), veri: dikey },
  ]

  return (
    <div className="mt-3 pt-1 flex flex-col sm:flex-row gap-3">
      {kartlar.map(({ id, etiket, veri }) => {
        const secili = orientation === id
        const maks = veri.piksel === maxPx && maxPx > 0
        return (
          <button
            key={id}
            type="button"
            aria-pressed={secili}
            aria-label={`${etiket}: ${veri.cols}×${veri.rows} ${t('conf.layoutGrid')} · ${veri.piksel.toLocaleString('tr-TR')} ${t('conf.layoutPixels')}`}
            onClick={() => onSelect(id, veri)}
            className={`relative flex-1 text-left rounded-xl border-2 px-4 py-3.5 min-h-[72px] transition-all duration-200 ${
              secili
                ? 'btn-selected ring-2 ring-brand/40 ring-offset-1 dark:ring-offset-[#0d1117]'
                : 'border-neutral-200 dark:border-[#2c333f] bg-white dark:bg-[#161a21] text-neutral-700 dark:text-neutral-200 hover:border-brand/50 hover:bg-brand/[0.04]'
            }`}
          >
            {maks && (
              <span
                className={`absolute -top-2 end-3 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase shadow-sm ${
                  secili ? 'bg-white text-brand' : 'bg-brand text-white'
                }`}
              >
                {t('conf.maxCapacity')}
              </span>
            )}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className={`text-[15px] font-bold leading-snug ${secili ? 'text-white' : 'text-neutral-800 dark:text-neutral-100'}`}>
                  {etiket}: {veri.cols}×{veri.rows} {t('conf.layoutGrid')}
                </div>
                <div className={`mt-1 text-[13px] leading-snug tabular-nums ${secili ? 'text-white/90' : 'text-neutral-500 dark:text-neutral-400'}`}>
                  {veri.piksel.toLocaleString('tr-TR')} {t('conf.layoutPixels')}
                </div>
              </div>
              {secili && (
                <span className="shrink-0 mt-0.5 text-white text-[13px] font-bold" aria-hidden>
                  ✓
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
