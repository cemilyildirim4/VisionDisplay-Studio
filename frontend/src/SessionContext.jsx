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

/*
 * OTURUM TARAYICI GENELİNDE.
 *
 * Oturum localStorage'da duruyor, yani aynı tarayıcıda açılan yeni sekme
 * de girişli açılıyor. Ama localStorage her yerde yazılabilir değil:
 * gizli pencerede ya da site verisi kısıtlıyken yazma hata atıyor, hata
 * da sessizce yutuluyordu. O zaman oturum yalnızca React durumunda,
 * yani YALNIZCA O SEKMEDE kalıyor; yeni sekme giriş ekranıyla açılıyordu.
 *
 * Yazma tutmazsa aynı kayıt çerezde tutuluyor: çerez de tarayıcı
 * genelinde ve tarihli. Süre yenileme jetonuyla aynı (30 gün); "Çıkış"
 * ikisini birden siliyor.
 */
const CEREZ_GUN = 30

function cerezOku(ad) {
  try {
    const parcalar = document.cookie ? document.cookie.split('; ') : []
    for (const p of parcalar) {
      const esit = p.indexOf('=')
      if (esit > 0 && p.slice(0, esit) === ad) return decodeURIComponent(p.slice(esit + 1))
    }
  } catch {
    /* ignore */
  }
  return null
}

function cerezYaz(ad, deger) {
  try {
    const guvenli = location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${ad}=${encodeURIComponent(deger)}; Max-Age=${CEREZ_GUN * 24 * 60 * 60}; Path=/; SameSite=Lax${guvenli}`
  } catch {
    /* ignore */
  }
}

function cerezSil(ad) {
  try {
    document.cookie = `${ad}=; Max-Age=0; Path=/; SameSite=Lax`
  } catch {
    /* ignore */
  }
}

/* Kaydı yazar; localStorage tutmazsa çereze düşer. */
function oturumuSakla(next) {
  if (!next) {
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
    cerezSil(SESSION_KEY)
    return
  }
  const metin = JSON.stringify(next)
  let yazildi = false
  try {
    localStorage.setItem(SESSION_KEY, metin)
    yazildi = localStorage.getItem(SESSION_KEY) === metin
  } catch {
    yazildi = false
  }
  if (yazildi) cerezSil(SESSION_KEY)
  else cerezYaz(SESSION_KEY, metin)
}

/* Kayıt önce localStorage'dan, yoksa çerezden. */
function oturumMetni() {
  try {
    const ham = localStorage.getItem(SESSION_KEY)
    if (ham) return ham
  } catch {
    /* ignore */
  }
  return cerezOku(SESSION_KEY)
}
const LEGACY_DEMO_ROLE_KEY = 'vds-demo-role'
const LEGACY_ADMIN_JWT = 'yonetim-jwt'
const LEGACY_ADMIN_META = 'yonetim-jwt-meta'

const SessionContext = createContext(null)

/**
 * JWT'nin bitiş zamanı (ms). Okunamazsa null döner.
 *
 * Jetonun gövdesi base64url; imzayı doğrulamıyoruz (o sunucunun işi),
 * yalnızca "süresi geçmiş mi" sorusuna bakıyoruz.
 */
function jetonBitisi(token) {
  try {
    const govde = token.split('.')[1]
    if (!govde) return null
    const duz = govde.replace(/-/g, '+').replace(/_/g, '/')
    const veri = JSON.parse(atob(duz.padEnd(duz.length + ((4 - (duz.length % 4)) % 4), '=')))
    return typeof veri?.exp === 'number' ? veri.exp * 1000 : null
  } catch {
    return null
  }
}

/**
 * Saklanan oturumu okur.
 *
 * SÜRESİ GEÇMİŞ JETON OTURUM SAYILMAZ. Önce yalnızca "jeton var mı" diye
 * bakılıyordu; günler önce alınmış, artık sunucunun kabul etmediği bir
 * jeton kullanıcıyı giriş kapısından geçiriyor, sonra her istek 401
 * veriyordu. Artık böyle bir kayıt siliniyor ve giriş yeniden isteniyor.
 */
function readStoredSession() {
  try {
    const raw = oturumMetni()
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Eski demo oturumları (JWT yok) yok sayılır.
    if (!parsed?.accessToken) return null

    const bitis = jetonBitisi(parsed.accessToken)
    /*
     * Yenileme jetonu varsa süresi dolmuş erişim jetonu sorun değil:
     * apiClient ilk istekte tazeliyor. Yenileme jetonu yoksa (davet
     * kodundan önceki misafir oturumları) kayıt işe yaramaz.
     */
    if (bitis != null && bitis <= Date.now() && !parsed.refreshToken) {
      oturumuSakla(null)
      return null
    }
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
        oturumuSakla(next)
      },
    })
  }, [])

  /*
   * AÇIK SEKMELER DE AYNI OTURUMU GÖRÜYOR.
   *
   * localStorage sekmeler arasında ortak ama ZATEN AÇIK olan sekme
   * kendiliğinden haberdar olmuyordu: bir sekmede giriş yapıldığında öteki
   * sekme giriş ekranında kalıyor, çıkış yapıldığında da girişli
   * görünmeye devam ediyordu. Tarayıcının storage olayı dinleniyor; kayıt
   * değişince oturum olduğu gibi yeniden okunuyor.
   */
  useEffect(() => {
    const dinle = (e) => {
      if (e.key !== null && e.key !== SESSION_KEY) return
      const yeni = readStoredSession()
      oturumRef.current = yeni
      setSession(yeni)
    }
    window.addEventListener('storage', dinle)
    return () => window.removeEventListener('storage', dinle)
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
      oturumuSakla(next)
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
