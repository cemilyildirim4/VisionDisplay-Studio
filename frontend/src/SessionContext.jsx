import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { setSessionBridge } from './apiClient.js'
import { TESTER_ROLE_ENABLED } from './featureFlags.js'

/**
 * Oturum / rol bağlamı.
 *
 * Tek JWT: localStorage vds-session. Rol claim'i (Admin | Dealer | Tester)
 * hem konfigüratör hem yönetim paneli yetkisini belirler.
 */

export const ROLES = {
  GUEST: 'Guest',
  DEALER: 'Dealer',
  TESTER: 'Tester',
  ADMIN: 'Admin',
}

const SESSION_KEY = 'vds-session'
const LEGACY_DEMO_ROLE_KEY = 'vds-demo-role'
const LEGACY_ADMIN_JWT = 'yonetim-jwt'
const LEGACY_ADMIN_META = 'yonetim-jwt-meta'

const SessionContext = createContext(null)

function readStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Eski demo oturumları (JWT yok) yok sayılır.
    if (!parsed?.accessToken) return null
    return parsed
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
        oturumRef.current = next
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

  // Eski çift oturum / demo anahtarlarını bir kez temizle.
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_DEMO_ROLE_KEY)
      sessionStorage.removeItem(LEGACY_ADMIN_JWT)
      sessionStorage.removeItem(LEGACY_ADMIN_META)
    } catch {
      /* ignore */
    }
  }, [])

  const role = useMemo(() => {
    let resolved = ROLES.GUEST

    if (session?.accessToken && session?.role) {
      if (session.role === ROLES.ADMIN) resolved = ROLES.ADMIN
      else if (session.role === ROLES.TESTER) resolved = ROLES.TESTER
      else if (session.role === ROLES.DEALER) resolved = ROLES.DEALER
    }

    if (!TESTER_ROLE_ENABLED && resolved === ROLES.TESTER) return ROLES.DEALER
    return resolved
  }, [session])

  const displayName = session?.displayName || (role === ROLES.GUEST ? 'Misafir' : role)
  const email = session?.email || null

  const value = useMemo(() => {
    const setSessionData = (next) => {
      oturumRef.current = next
      setSession(next)
      try {
        if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next))
        else localStorage.removeItem(SESSION_KEY)
      } catch {
        /* ignore */
      }
    }

    const logout = () => {
      setSessionData(null)
      try {
        localStorage.removeItem(LEGACY_DEMO_ROLE_KEY)
        sessionStorage.removeItem(LEGACY_ADMIN_JWT)
        sessionStorage.removeItem(LEGACY_ADMIN_META)
      } catch {
        /* ignore */
      }
    }

    return {
      role,
      displayName,
      email,
      initials: initialsOf(displayName, email),
      isAuthenticated: !!(session?.accessToken) && role !== ROLES.GUEST,
      isAdmin: role === ROLES.ADMIN,
      isTester: role === ROLES.TESTER,
      isDealer: role === ROLES.DEALER,
      testerRoleEnabled: TESTER_ROLE_ENABLED,
      canDealerTools: role === ROLES.DEALER || role === ROLES.ADMIN,
      canTesterTools: TESTER_ROLE_ENABLED && (role === ROLES.TESTER || role === ROLES.ADMIN),
      session,
      setSessionData,
      logout,
      ROLES,
    }
  }, [role, displayName, email, session])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession, SessionProvider içinde kullanılmalı')
  return ctx
}
