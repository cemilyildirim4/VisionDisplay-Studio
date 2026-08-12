import { useEffect } from 'react'
import { useLang } from './useLang.js'

/**
 * Gizlilik ve Güvenlik Notu (KVKK tarzı aydınlatma metni).
 *
 * Footer'daki küçük bağlantıdan ve teklif formundaki onay kutusunun
 * yanındaki "Aydınlatma metnini oku" bağlantısından açılır. Sadece bilgi
 * verir; onayı ExportModal'daki checkbox zaten alıyor.
 */
function Section({ title, children }) {
  return (
    <div className="mb-4">
      <h3 className="text-[12.5px] font-bold uppercase tracking-wide text-brand m-0 mb-1.5">{title}</h3>
      <p className="text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300 m-0">{children}</p>
    </div>
  )
}

export default function PrivacyModal({ open, onClose }) {
  const { t } = useLang()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] bg-[#001334]/45 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#161a21] rounded-2xl w-full max-w-[520px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-brand text-white px-5 py-4 flex items-start justify-between gap-3 shrink-0 relative">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 p-1">
              <img src="/masaustu-logo-isaret.png" alt="" className="w-full h-full object-contain" />
            </span>
            <div className="min-w-0">
              <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/70">Masaüstü Bilişim</p>
              <h2 className="text-base font-bold m-0 leading-tight">{t('privacy.title')}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('privacy.close')}
            className="text-white/70 hover:text-white transition-colors shrink-0"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="brand-stripe absolute bottom-0 left-0 right-0 h-[3px]" aria-hidden />
        </div>

        <div className="p-5 overflow-y-auto">
          <p className="text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-200 m-0 mb-4">{t('privacy.intro')}</p>
          <Section title={t('privacy.purpose.title')}>{t('privacy.purpose.body')}</Section>
          <Section title={t('privacy.security.title')}>{t('privacy.security.body')}</Section>
          <Section title={t('privacy.rights.title')}>{t('privacy.rights.body')}</Section>
        </div>
      </div>
    </div>
  )
}
