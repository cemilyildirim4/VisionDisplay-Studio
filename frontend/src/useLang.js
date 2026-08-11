import { createContext, useContext } from 'react'

/** Dil bağlamı — sağlayıcısı LanguageContext.jsx içindeki LanguageProvider'dır. */
export const LanguageContext = createContext(null)

/** Dil bilgisine erişim: const { t, lang, setLang, dir } = useLang() */
export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang, LanguageProvider içinde kullanılmalı')
  return ctx
}
