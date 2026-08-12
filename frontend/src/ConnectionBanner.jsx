import { useEffect, useState } from 'react'
import { onApiConnectionChange } from './apiClient.js'

/**
 * Geçici API kopmalarında sayfa yerine üstte sakin bir uyarı şeridi.
 */
export default function ConnectionBanner() {
  const [state, setState] = useState('ok')
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    return onApiConnectionChange((next, info) => {
      setState(next)
      setDetail(info || null)
    })
  }, [])

  if (state === 'ok') return null

  const text =
    state === 'retrying'
      ? `Sunucuya yeniden bağlanılıyor${detail?.attempt ? ` (${detail.attempt})` : ''}…`
      : state === 'degraded'
        ? 'Sunucu geçici olarak yanıt veremiyor. Biraz sonra tekrar deneyin.'
        : 'API bağlantısı kurulamadı. Backend çalışıyor mu kontrol edin.'

  return (
    <div
      role="status"
      className={`fixed top-0 inset-x-0 z-[100] px-3 py-2 text-center text-[12.5px] font-medium text-white ${
        state === 'retrying' ? 'bg-[#2962ad]' : 'bg-[#b45309]'
      }`}
    >
      {text}
    </div>
  )
}
