import { useEffect } from 'react'
import { useLang } from './useLang.js'
import { CONTACT } from './contactInfo.js'

/**
 * İletişim pop-up'ı.
 *
 * Her satır TIKLANABİLİR ve cihaza göre doğru uygulamayı açar:
 *   sabit telefon → tel:      (bilgisayarda Skype/Teams, telefonda arama)
 *   cep telefonu  → WhatsApp  (wa.me) + ayrıca ara seçeneği
 *   e-posta       → mailto:   (Gmail, Outlook, hangisi varsayılansa)
 *   adres         → Google Haritalar
 */

function Row({ icon, label, value, href, note, external }) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className="flex items-start gap-3 px-3 py-3 rounded-xl border border-neutral-200 dark:border-[#2c333f] hover:border-brand hover:bg-brand-tint transition-colors group"
    >
      <span className="w-9 h-9 rounded-lg bg-brand-tint group-hover:bg-white dark:group-hover:bg-[#0f1626] flex items-center justify-center shrink-0 text-brand dark:text-brand-light transition-colors">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold tracking-[0.06em] uppercase text-neutral-500 dark:text-neutral-400">
          {label}
        </span>
        <span className="block text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-brand transition-colors break-words">
          {value}
        </span>
        {note && <span className="block text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">{note}</span>}
      </span>
    </a>
  )
}

export default function ContactModal({ open, onClose }) {
  const { t } = useLang()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-[#001334]/45 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#161a21] rounded-2xl w-full max-w-[400px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="bg-brand text-white px-5 py-4 flex items-start justify-between gap-3 relative">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 p-1">
              <img src="/masaustu-logo-isaret.png" alt="" className="w-full h-full object-contain" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold m-0 leading-tight">{t('contact.heading')}</h2>
              <p className="text-[11px] text-white/70 m-0 mt-0.5 leading-tight">{CONTACT.company}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('exp.close')}
            className="text-white/70 hover:text-white transition-colors shrink-0"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="brand-stripe absolute bottom-0 left-0 right-0 h-[3px]" aria-hidden />
        </div>

        <div className="p-4 flex flex-col gap-2.5">
          {/* WhatsApp — cep numarası */}
          <Row
            external
            href={`https://wa.me/${CONTACT.whatsapp}`}
            label="WhatsApp"
            value={CONTACT.mobileDisplay}
            note={t('contact.whatsappNote')}
            icon={
              <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
                <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.4-.2-.6.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5 0-.2 0-.4 0-.5 0-.2-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.2.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.5-.3z" />
                <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
              </svg>
            }
          />

          {/* Sabit hat */}
          <Row
            href={`tel:${CONTACT.phone}`}
            label={t('contact.phone')}
            value={CONTACT.phoneDisplay}
            icon={
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
              </svg>
            }
          />

          {/* E-posta */}
          <Row
            href={`mailto:${CONTACT.email}`}
            label={t('contact.email')}
            value={CONTACT.email}
            note={t('contact.emailNote')}
            icon={
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
                <path d="m3 6.5 9 6.5 9-6.5" />
              </svg>
            }
          />

          {/* Adres */}
          <Row
            external
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.address)}`}
            label={t('contact.address')}
            value={CONTACT.address}
            note={t('contact.mapNote')}
            icon={
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 5.5-8 12-8 12S4 15.5 4 10a8 8 0 1 1 16 0z" />
                <circle cx="12" cy="10" r="2.8" />
              </svg>
            }
          />

          {/* Web sitesi */}
          <a
            href={`https://${CONTACT.site}`}
            target="_blank"
            rel="noreferrer"
            className="text-center text-[12.5px] text-neutral-500 dark:text-neutral-400 hover:text-brand transition-colors py-1"
          >
            {CONTACT.site}
          </a>
        </div>
      </div>
    </div>
  )
}
