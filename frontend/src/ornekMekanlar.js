/**
 * ÖRNEK MEKÂNLAR — ekranın önüne konabilecek hazır arka planlar.
 *
 * Hem kamera görünümü (ArView) hem 3D görünüm (Scene3D) aynı listeyi kullanır:
 * müşteri aynı mekânı iki görünümde de görebilsin, biri güncellenip öbürü
 * geride kalmasın diye liste tek yerde duruyor.
 *
 * Yeni bir mekân eklemek için görseli public/ içine koyup buraya bir satır
 * yazmak ve i18n.js'e adının çevirisini eklemek yeterli.
 */
export const ORNEK_MEKANLAR = [
  { yol: '/ornek-toplanti.jpg', ad: 'ar.bgMeeting' },
  { yol: '/ornek-toplanti-genis.jpg', ad: 'ar.bgMeetingWide' },
  { yol: '/ornek-gri-oda.jpg', ad: 'ar.bgGreyRoom' },
  { yol: '/ornek-koyu-oda.jpg', ad: 'ar.bgDarkRoom' },
]
