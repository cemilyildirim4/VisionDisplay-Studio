/**
 * Tester rolü ve test araçları yalnızca geliştirme sunucusunda
 * (import.meta.env.DEV) veya VITE_BETA_ENABLED=true ile derlenen
 * beta paketinde açıktır. Canlı Vercel/production derlemesinde kapalıdır.
 */
export const TESTER_ROLE_ENABLED =
  import.meta.env.DEV || String(import.meta.env.VITE_BETA_ENABLED || '').toLowerCase() === 'true'

/** Sohbet kaydı ve hata bildirimi yazma — canlı production derlemesinde kapalı. */
export const OBSERVATION_WRITE_ENABLED = TESTER_ROLE_ENABLED
