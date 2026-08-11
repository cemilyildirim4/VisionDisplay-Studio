import { useQuery } from '@tanstack/react-query'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5007'

async function fetchCabinets() {
  const res = await fetch(`${API_URL}/api/cabinets`)
  if (!res.ok) throw new Error(`Kabin listesi alınamadı (HTTP ${res.status})`)
  return res.json()
}

/**
 * Kabin/model listesi — az değişen, sık okunan bir veri seti.
 *
 * React Query ile cache'lenir: aynı oturumda modül seçim modalı birden fazla
 * açılıp kapansa da ağa tekrar istek atılmaz (staleTime boyunca cache'ten
 * okunur), sekmeler arası geçişte de veri anında hazır olur.
 */
export function useCabinets() {
  return useQuery({
    queryKey: ['cabinets'],
    queryFn: fetchCabinets,
    staleTime: 5 * 60 * 1000, // 5 dakika: admin panelinde model eklense de kullanıcı kısa sürede görür
    gcTime: 30 * 60 * 1000,
  })
}
