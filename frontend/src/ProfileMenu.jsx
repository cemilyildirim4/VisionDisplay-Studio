import { useEffect, useMemo, useRef, useState } from 'react'
import { useLang } from './useLang.js'
import { ROLES, useSession } from './SessionContext.jsx'

const ROLE_STYLE = {
  [ROLES.ADMIN]: {
    badge: 'bg-brand text-white',
    ring: 'ring-brand/30',
    avatar: 'bg-brand text-white',
  },
  [ROLES.TESTER]: {
    badge: 'bg-accent-tint text-accent-dark dark:bg-accent/20 dark:text-accent',
    ring: 'ring-accent/30',
    avatar: 'bg-accent text-white',
  },
  [ROLES.DEALER]: {
    badge: 'bg-brand-tint text-brand dark:bg-brand/20 dark:text-brand-light',
    ring: 'ring-brand/25',
    avatar: 'bg-brand text-white',
  },
  [ROLES.GUEST]: {
    badge: 'bg-neutral-100 text-neutral-600 dark:bg-[#222833] dark:text-neutral-300',
    ring: 'ring-neutral-300/40 dark:ring-[#39414f]/50',
    avatar: 'bg-neutral-200 text-neutral-700 dark:bg-[#2c333f] dark:text-neutral-200',
  },
}

function MenuItem({ href, onClick, icon, children, danger }) {
  const cls = `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-left transition-colors ${
    danger
      ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
      : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-[#1f2530]'
  }`
  if (href) {
    return (
      <a href={href} onClick={onClick} className={cls}>
        <span className="shrink-0 opacity-70">{icon}</span>
        <span>{children}</span>
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      <span className="shrink-0 opacity-70">{icon}</span>
      <span>{children}</span>
    </button>
  )
}

/**
 * Sağ üst profil menüsü — dişli çarkın yerine geçer.
 * Menü öğeleri role göre filtrelenir; yetkisiz seçenek listede yer almaz.
 *
 *  Admin  → Yönetim Paneli, Kontrol Merkezi, Çıkış
 *  Dealer → Kontrol Merkezi, Tekliflerim, Çıkış
 *  Tester → Kontrol Merkezi, Test Araçları, Çıkış
 *  Guest  → Kontrol Merkezi, Giriş yap
 */
export default function ProfileMenu() {
  const { t } = useLang()
  const { role, displayName, email, initials, isAdmin, isTester, isDealer, isAuthenticated, logout } = useSession()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const style = ROLE_STYLE[role] || ROLE_STYLE[ROLES.GUEST]

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const roleLabel = t(`role.${role.toLowerCase()}`)
  const close = () => setOpen(false)

  const items = useMemo(() => {
    const list = []

    if (isAdmin) {
      list.push({ id: 'admin', type: 'adminPanel' })
    }

    list.push({ id: 'cc', type: 'controlCenter' })

    if (isDealer) {
      list.push({ id: 'quotes', type: 'myQuotes' })
    }

    if (isTester) {
      list.push({ id: 'tester', type: 'testerTools' })
    }

    return list
  }, [isAdmin, isDealer, isTester])

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={t('profile.menu')}
        className={`h-9 pl-1 pr-2.5 rounded-full border border-neutral-300 dark:border-[#39414f] inline-flex items-center gap-2 hover:border-brand transition-colors ${open ? 'border-brand' : ''}`}
      >
        <span className={`h-7 w-7 rounded-full ${style.avatar} inline-flex items-center justify-center text-[11px] font-bold tracking-wide ring-2 ${style.ring}`}>
          {initials}
        </span>
        <span className="hidden sm:inline text-[11px] font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300 max-w-[72px] truncate">
          {roleLabel}
        </span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className={`text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-[280px] z-50 rounded-xl border border-neutral-200 dark:border-[#2c333f] bg-white dark:bg-[#161a21] shadow-xl overflow-hidden"
        >
          <div className="px-3.5 py-3 border-b border-neutral-100 dark:border-[#2c333f]">
            <div className="flex items-center gap-3">
              <span className={`h-10 w-10 rounded-full ${style.avatar} inline-flex items-center justify-center text-sm font-bold`}>
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{displayName}</div>
                {email && <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">{email}</div>}
                <span className={`inline-flex mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase ${style.badge}`}>
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="p-1.5 flex flex-col gap-0.5">
            {items.map((item) => {
              if (item.type === 'adminPanel') {
                return (
                  <a
                    key={item.id}
                    href="#yonetim"
                    onClick={close}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mb-0.5 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                    style={{
                      background: 'linear-gradient(90deg, #f37021 0%, #e07a3a 35%, #4a7ab8 70%, #2962ad 100%)',
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" className="shrink-0">
                      <rect x="3" y="3" width="7" height="7" rx="1.5" />
                      <rect x="14" y="3" width="7" height="7" rx="1.5" />
                      <rect x="3" y="14" width="7" height="7" rx="1.5" />
                      <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    </svg>
                    {t('profile.adminPanel')}
                  </a>
                )
              }
              if (item.type === 'controlCenter') {
                return (
                  <MenuItem
                    key={item.id}
                    href="#hesap"
                    onClick={close}
                    icon={
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <circle cx="12" cy="8" r="3.5" />
                        <path d="M5 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5" strokeLinecap="round" />
                      </svg>
                    }
                  >
                    {t('profile.controlCenter')}
                  </MenuItem>
                )
              }
              if (item.type === 'myQuotes') {
                return (
                  <MenuItem
                    key={item.id}
                    href="#hesap?tab=quotes"
                    onClick={close}
                    icon={
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
                        <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" />
                      </svg>
                    }
                  >
                    {t('profile.myQuotes')}
                  </MenuItem>
                )
              }
              if (item.type === 'testerTools') {
                return (
                  <MenuItem
                    key={item.id}
                    href="#hesap?tab=tester"
                    onClick={close}
                    icon={
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <path d="M9 3h6M10 3v6l-4.5 8.5a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 9V3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    }
                  >
                    {t('profile.testerTools')}
                  </MenuItem>
                )
              }
              return null
            })}
          </div>

          <div className="border-t border-neutral-100 dark:border-[#2c333f] p-1.5">
            {isAuthenticated || role !== ROLES.GUEST ? (
              <MenuItem
                danger
                onClick={() => {
                  logout()
                  close()
                }}
                icon={
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M10 17l-5-5 5-5M5 12h11M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              >
                {t('profile.logout')}
              </MenuItem>
            ) : (
              <MenuItem
                href="#hesap?tab=session"
                onClick={close}
                icon={
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M14 7l5 5-5 5M19 12H8M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              >
                {t('profile.signIn')}
              </MenuItem>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
