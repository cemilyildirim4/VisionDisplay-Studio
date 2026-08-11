import { useEffect, useState } from 'react'

/**
 * Açık / koyu tema.
 *
 * Seçim tarayıcıya kaydedilir; kullanıcı sayfayı kapatıp açtığında aynı temayla
 * karşılaşır. Hiç seçim yapmamışsa işletim sisteminin ayarı kullanılır.
 *
 * Tema, kök öğeye data-theme="dark" olarak yazılır — index.css'teki dark:
 * varyantı bu niteliğe bakıyor.
 */

const KEY = 'ekran-konfiguratoru-tema'

function ilkTema() {
  if (typeof window === 'undefined') return 'light'
  const kayitli = localStorage.getItem(KEY)
  if (kayitli === 'dark' || kayitli === 'light') return kayitli
  // Kullanıcı hiç seçmediyse cihazın tercihine uy
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState(ilkTema)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(KEY, theme)
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  return { theme, setTheme, toggle }
}
