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

  /*
   * UYARI ALTTA, KÜÇÜK.
   *
   * Şerit sayfanın en üstünde ve her şeyin önünde (z-100) duruyordu: üst
   * menünün ilk satırını, 3B görünümün başlığını ve "Kapat" düğmesini
   * kapatıyor, kullanıcı pencereden çıkamıyordu. Uyarının kendisi gerekli
   * ama ikinci derecede bir bilgi — altta, ortada, küçük bir balon olarak
   * duruyor; z değeri de pencerelerin altında kalıyor ki hiçbir düğmeyi
   * örtmesin.
   */
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-3 z-[55] flex justify-center px-3"
    >
      <span
        className={`max-w-[92vw] rounded-full px-3.5 py-1.5 text-center text-[12.5px] font-medium text-white shadow-lg ${
          state === 'retrying' ? 'bg-[#2962ad]' : 'bg-[#b45309]'
        }`}
      >
        {text}
      </span>
    </div>
  )
}
