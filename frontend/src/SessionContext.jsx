import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { setSessionBridge } from './apiClient.js'

/**
 * Oturum / rol bağlamı.
 *
 * Backend'de roller: Admin | Dealer (User entity).
 * Frontend beta için ek olarak "Tester" ve oturumsuz "Guest" desteklenir.
 *
 * Öncelik sırası:
 *  1. Yönetim parolası (sessionStorage) doğrulanmışsa → Admin
 *  2. Kaydedilmiş JWT oturumu (localStorage) varsa → o kullanıcının rolü
 *  3. Beta demo rol seçimi (localStorage) — yalnızca test/pilot için
 *  4. Aksi halde Guest
 */

export const ROLES = {
  GUEST: 'Guest',
  DEALER: 'Dealer',
  TESTER: 'Tester',
  ADMIN: 'Admin',
}

const ADMIN_KEY = 'yonetim-parolasi'
const ADMIN_JWT = 'yonetim-jwt'
const SESSION_KEY = 'vds-session'
const DEMO_ROLE_KEY = 'vds-demo-role'

const SessionContext = createContext(null)

function readStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function readDemoRole() {
  try {
    return localStorage.getItem(DEMO_ROLE_KEY) || null
  } catch {
    return null
  }
}

function initialsOf(name, email) {
  const src = (name || email || 'G').trim()
  const parts = src.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession())
  const [demoRole, setDemoRoleState] = useState(() => readDemoRole())
  const [adminUnlocked, setAdminUnlocked] = useState(() => {
    try {
      return !!(sessionStorage.getItem(ADMIN_KEY) || sessionStorage.getItem(ADMIN_JWT))
    } catch {
      return false
    }
  })

  /*
   * API istemcisine oturumu okuyup yazma yolu ver. apiClient React ağacının
   * dışında yaşıyor; jetonu buradan alıyor ve 401'de tazeleyip yenisini
   * buraya geri yazıyor. Ref üzerinden okunuyor ki köprü her oturum
   * değişiminde yeniden kurulmasın ve okuyan hep güncel değeri görsün.
   */
  const oturumRef = useRef(session)
  oturumRef.current = session
  useEffect(() => {
    setSessionBridge({
      oku: () => oturumRef.current,
      yaz: (next) => {
        setSession(next)
        try {
          if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next))
          else localStorage.removeItem(SESSION_KEY)
        } catch {
          /* ignore */
        }
      },
    })
  }, [])

  // Yönetim paneli başka sekmede/oturumda parola veya JWT doğrularsa burayı güncelle.
  useEffect(() => {
    const sync = () => {
      try {
        setAdminUnlocked(!!(sessionStorage.getItem(ADMIN_KEY) || sessionStorage.getItem(ADMIN_JWT)))
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('storage', sync)
    window.addEventListener('vds-admin-auth', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('vds-admin-auth', sync)
    }
  }, [])

  const role = useMemo(() => {
    // 1) Gerçek JWT oturumu her zaman baskın
    if (session?.accessToken && session?.role) {
      if (session.role === ROLES.ADMIN) return ROLES.ADMIN
      if (session.role === ROLES.TESTER) return ROLES.TESTER
      if (session.role === ROLES.DEALER) return ROLES.DEALER
    }
    // 2) Beta demo rolü — yönetim oturumunu UI'da ezer (rol simülasyonu)
    if (demoRole === ROLES.GUEST) return ROLES.GUEST
    if (demoRole === ROLES.ADMIN) return ROLES.ADMIN
    if (demoRole === ROLES.TESTER) return ROLES.TESTER
    if (demoRole === ROLES.DEALER) return ROLES.DEALER
    // 3) Yönetim paneli doğrulaması (demo seçilmemişken)
    if (adminUnlocked) return ROLES.ADMIN
    // 4) Demo session kaydı
    if (session?.demo && session?.role) {
      if (session.role === ROLES.ADMIN) return ROLES.ADMIN
      if (session.role === ROLES.TESTER) return ROLES.TESTER
      if (session.role === ROLES.DEALER) return ROLES.DEALER
    }
    return ROLES.GUEST
  }, [adminUnlocked, session, demoRole])

  const displayName = session?.displayName || (role === ROLES.GUEST ? 'Misafir' : role)
  const email = session?.email || null

  const value = useMemo(() => {
    const setSessionData = (next) => {
      setSession(next)
      try {
        if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next))
        else localStorage.removeItem(SESSION_KEY)
      } catch {
        /* ignore */
      }
    }

    const setDemoRole = (nextRole) => {
      setDemoRoleState(nextRole)
      try {
        if (nextRole) localStorage.setItem(DEMO_ROLE_KEY, nextRole)
        else localStorage.removeItem(DEMO_ROLE_KEY)
      } catch {
        /* ignore */
      }
    }

    const logout = () => {
      setSessionData(null)
      setDemoRole(null)
      try {
        sessionStorage.removeItem(ADMIN_KEY)
        sessionStorage.removeItem(ADMIN_JWT)
        sessionStorage.removeItem('yonetim-jwt-meta')
        localStorage.removeItem(DEMO_ROLE_KEY)
      } catch {
        /* ignore */
      }
      setAdminUnlocked(false)
      window.dispatchEvent(new Event('vds-admin-auth'))
    }

    const markAdminUnlocked = () => {
      setAdminUnlocked(true)
      window.dispatchEvent(new Event('vds-admin-auth'))
    }

    return {
      role,
      displayName,
      email,
      initials: initialsOf(displayName, email),
      isAuthenticated: !!(session?.accessToken || session?.email) && role !== ROLES.GUEST,
      // Menü / yetki: tam rol eşleşmesi (cascade yok — Admin Dealer menüsünü görmez)
      isAdmin: role === ROLES.ADMIN,
      isTester: role === ROLES.TESTER,
      isDealer: role === ROLES.DEALER,
      // Bazı ekranlar (Kontrol Merkezi sekmeleri) Admin'e de bayi/tester panelleri açabilir:
      canDealerTools: role === ROLES.DEALER || role === ROLES.ADMIN,
      canTesterTools: role === ROLES.TESTER || role === ROLES.ADMIN,
      session,
      demoRole,
      setSessionData,
      setDemoRole,
      logout,
      markAdminUnlocked,
      ROLES,
    }
  }, [role, displayName, email, session, demoRole])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession, SessionProvider içinde kullanılmalı')
  return ctx
}
