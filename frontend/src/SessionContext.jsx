import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { setSessionBridge } from './apiClient.js'
import { TESTER_ROLE_ENABLED } from './featureFlags.js'

/**
 * Oturum / rol bağlamı.
 *
 * Canlıda roller: Admin | Dealer | oturumsuz Guest.
 * Tester yalnızca geliştirme sunucusu veya VITE_BETA_ENABLED=true paketinde
 * görünür; production JWT'si Tester olsa bile arayüz Dealer gibi davranır.
 *
 * Öncelik sırası:
 *  1. Kaydedilmiş JWT oturumu (localStorage) varsa → o kullanıcının rolü
 *  2. Yönetim paneli JWT'si (sessionStorage) doğrulanmışsa → Admin
 *  3. Beta demo rol seçimi (localStorage) — yalnızca test/pilot için
 *  4. Aksi halde Guest
 */

export const ROLES = {
  GUEST: 'Guest',
  DEALER: 'Dealer',
  TESTER: 'Tester',
  ADMIN: 'Admin',
}

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
      return !!sessionStorage.getItem(ADMIN_JWT)
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
        setAdminUnlocked(!!sessionStorage.getItem(ADMIN_JWT))
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
    let resolved = ROLES.GUEST

    // 1) Gerçek JWT oturumu her zaman baskın
    if (session?.accessToken && session?.role) {
      if (session.role === ROLES.ADMIN) resolved = ROLES.ADMIN
      else if (session.role === ROLES.TESTER) resolved = ROLES.TESTER
      else if (session.role === ROLES.DEALER) resolved = ROLES.DEALER
    } else if (demoRole === ROLES.GUEST) {
      resolved = ROLES.GUEST
    } else if (demoRole === ROLES.ADMIN) {
      resolved = ROLES.ADMIN
    } else if (demoRole === ROLES.TESTER) {
      resolved = ROLES.TESTER
    } else if (demoRole === ROLES.DEALER) {
      resolved = ROLES.DEALER
    } else if (adminUnlocked) {
      resolved = ROLES.ADMIN
    } else if (session?.demo && session?.role) {
      if (session.role === ROLES.ADMIN) resolved = ROLES.ADMIN
      else if (session.role === ROLES.TESTER) resolved = ROLES.TESTER
      else if (session.role === ROLES.DEALER) resolved = ROLES.DEALER
    }

    // Canlıda Tester yok: eski JWT / demo seçimi Dealer'a düşer.
    if (!TESTER_ROLE_ENABLED && resolved === ROLES.TESTER) return ROLES.DEALER
    return resolved
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
      testerRoleEnabled: TESTER_ROLE_ENABLED,
      // Bayi araçları Admin'e de açık. Tester araçları yalnızca beta/dev.
      canDealerTools: role === ROLES.DEALER || role === ROLES.ADMIN,
      canTesterTools: TESTER_ROLE_ENABLED && (role === ROLES.TESTER || role === ROLES.ADMIN),
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
