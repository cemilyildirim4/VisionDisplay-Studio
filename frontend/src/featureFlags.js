/**
 * Tester rolü ve test araçları yalnızca geliştirme sunucusunda
 * (import.meta.env.DEV) veya VITE_BETA_ENABLED=true ile derlenen
 * beta paketinde açıktır. Canlı Vercel/production derlemesinde kapalıdır.
 */
export const TESTER_ROLE_ENABLED =
  import.meta.env.DEV || String(import.meta.env.VITE_BETA_ENABLED || '').toLowerCase() === 'true'
