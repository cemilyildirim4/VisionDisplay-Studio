import { varlik } from './varlik.js'
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
  { yol: varlik('ornek-toplanti.jpg'), ad: 'ar.bgMeeting' },
  { yol: varlik('ornek-toplanti-genis.jpg'), ad: 'ar.bgMeetingWide' },
  { yol: varlik('ornek-gri-oda.jpg'), ad: 'ar.bgGreyRoom' },
  { yol: varlik('ornek-koyu-oda.jpg'), ad: 'ar.bgDarkRoom' },
]
