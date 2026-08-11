import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_LANG, dirOf, translate } from './i18n.js'
import { LanguageContext } from './useLang.js'

/**
 * Dil durumu tüm uygulamada paylaşılır.
 * Seçim tarayıcıda saklanır, sayfa yenilense de korunur.
 * Arapça seçilince sayfa yönü sağdan sola (rtl) döner.
 *
 * Kullanım: bileşenlerde useLang() (bkz. useLang.js)
 */

const STORAGE_KEY = 'ekran-konfiguratoru-dil'

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG
    } catch {
      return DEFAULT_LANG
    }
  })

  const dir = dirOf(lang)

  // Sayfanın dil ve yön bilgisini HTML'e yaz (tarayıcı çevirisi ve rtl için)
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang, dir])

  const value = useMemo(() => {
    const setLang = (next) => {
      setLangState(next)
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* localStorage kapalıysa sessizce geç */
      }
    }
    return { lang, setLang, dir, t: (key) => translate(key, lang) }
  }, [lang, dir])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
