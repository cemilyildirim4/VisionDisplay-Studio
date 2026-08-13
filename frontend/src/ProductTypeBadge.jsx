import { useLang } from './useLang.js'
import { isModule, productTypeLabelKey } from './productType.js'

/**
 * Kabin / Panel rozeti — model listesi, seçili kart ve admin tablosunda ortak.
 */
export default function ProductTypeBadge({ productType, size = 'sm', className = '' }) {
  const { t } = useLang()
  const panel = isModule(productType)
  const pad = size === 'md' ? 'px-2.5 py-1 text-[11px]' : 'px-1.5 py-0.5 text-[10px]'

  return (
    <span
      className={`inline-flex items-center rounded-md font-bold uppercase tracking-wide whitespace-nowrap shrink-0 ${pad} ${
        panel
          ? 'bg-accent-tint text-accent-dark dark:bg-accent/20 dark:text-accent'
          : 'bg-brand-tint text-brand dark:bg-brand/20 dark:text-brand-light'
      } ${className}`}
      title={panel ? t('type.panelHint') : t('type.cabinetHint')}
    >
      {t(productTypeLabelKey(productType))}
    </span>
  )
}
