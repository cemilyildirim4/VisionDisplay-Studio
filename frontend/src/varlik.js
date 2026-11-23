/*
 * PUBLIC KLASÖRÜNDEKİ DOSYANIN ADRESİ.
 *
 * Bu dosyalara (logo, örnek görsel, mekân fotoğrafı, yapay zekâ modeli)
 * kodun içinde "/duvar.jpg" gibi KÖKTEN yazılmış adreslerle gidiliyordu.
 * Site kendi alan adının kökünde dururken bu doğru çalışıyor; ama bir ALT
 * ADRESTE yayınlandığında (ör. GitHub Pages'te .../ekran-konfiguratoru/)
 * tarayıcı o dosyaları yine kökte arıyor ve hiçbirini bulamıyor: logo,
 * örnek içerik, örnek video ve iç/dış mekân arka planları eksik kalıyordu.
 *
 * Adres artık sitenin KENDİ kökünden türüyor (Vite bunu derlerken yazıyor).
 * Kökte yayınlanan kopyada sonuç birebir eskisi gibi: "/duvar.jpg".
 */
const TABAN = typeof import.meta.env === 'undefined' ? '/' : import.meta.env.BASE_URL || '/'

export function varlik(ad) {
  return TABAN + String(ad).replace(/^\/+/, '')
}
