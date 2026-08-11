import { QueryClient } from '@tanstack/react-query'

// Tek, uygulama genelinde paylaşılan React Query istemcisi.
// Varsayılan olarak pencereye tekrar odaklanınca otomatik yeniden çekmeyi
// kapatıyoruz — konfigüratör uzun süre açık kalabilen bir araç, gereksiz
// arka plan isteklerini önlemek istiyoruz.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
