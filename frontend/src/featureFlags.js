/**
 * Tester rolü ve test araçları yalnızca geliştirme sunucusunda
 * (import.meta.env.DEV) veya VITE_BETA_ENABLED=true ile derlenen
 * beta paketinde açıktır. Canlı Vercel/production derlemesinde kapalıdır.
 */
export const TESTER_ROLE_ENABLED =
  import.meta.env.DEV || String(import.meta.env.VITE_BETA_ENABLED || '').toLowerCase() === 'true'

/** Hata bildirimi yazma — canlı production derlemesinde kapalı. */
export const OBSERVATION_WRITE_ENABLED = TESTER_ROLE_ENABLED

/**
 * SOHBET KAYDI CANLIDA DA AÇIK.
 *
 * Eskiden bu da tester bayrağına bağlıydı; sonuç olarak canlıda sorulan
 * hiçbir soru kaydedilmiyor, yönetim panelindeki "Cevaplanamayan Soru"
 * listesi hep boş kalıyordu. Asistanın nerede yetersiz kaldığını görebilmek
 * için gerçek soruların birikmesi gerekiyor.
 *
 * Kaydedilen: sorunun metni, eşleşen konu, cevaplandı bilgisi ve dil.
 * Kullanıcıya ait hiçbir kimlik bilgisi gönderilmez.
 */
export const CHAT_LOG_ENABLED = true
