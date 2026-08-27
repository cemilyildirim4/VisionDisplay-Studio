/**
 * Tuvalin ARKASINA çizilen mekân.
 *
 * Tek bir mekân var: örnek pano (Pano.jsx). Ekranın ARKASINA çizilir, ortası
 * kasıtlı boştur, gerçek ekran oraya oturur.
 *
 * NOT — kaldırılan iki yol ve sebepleri:
 *
 *   • HAZIR MEKÂNLAR (çizilmiş odalar, üretilmiş fotoğraflar): bir fotoğrafın
 *     duvarı kaç metre, bilinmiyordu; geri hesaplamak gerekiyordu ve her
 *     seferinde tahmin kalıyordu.
 *
 *   • MÜŞTERİNİN KENDİ FOTOĞRAFI: ölçek, müşterinin tasarımı fotoğraf üzerine
 *     gözüyle oturtmasına bağlıydı — yine tahmin. Üstelik her seferinde
 *     fotoğraf çekip yerleştirme işi çıkarıyordu.
 *
 * Pano ikisinin de derdini taşımıyor: tamamen tasarımın GERÇEK ölçüsünden
 * türüyor, hiçbir hazırlık istemiyor. Ekranı gerçek mekânda görme ihtiyacını
 * da "Kamerada dene" (ArView.jsx) karşılıyor.
 */

import Pano from './Pano.jsx'
import PanoFoto from './PanoFoto.jsx'
import Salon from './Salon.jsx'
import Cephe from './Cephe.jsx'
import { sahneBul } from './sahneler.js'

export const PANO_ID = 'pano' // çizilmiş yol kenarı panosu — şimdilik listede yok
export const SALON_ID = 'salon' // çizilmiş iç mekân
export const CEPHE_ID = 'cephe' // çizilmiş dış mekân (bina cephesi)

export default function Scene({
  id,
  tuvalW,
  tuvalH,
  ekranWpx,
  ekranHpx,
  pxPerM,
  duvarWm,
  duvarHm,
  ekranSekli,
  yakinlik = 1,
  kayma = null,
  /* Kullanicinin kendi fotografi — sahneler.js listesinde yok, disaridan gelir */
  ozelSahne = null,
}) {
  // Fotoğraflı mekânlar sahneler.js'te tanımlı; yeni eklemek için orası yeterli
  const sahne = id === 'ozel' ? ozelSahne : sahneBul(id)
  // Fotoğraflı mekân sabittir; ekranın ölçüsünü bilmesi gerekmez
  /*
   * Fotografli mekan sabittir; olcegi tasarimdan gelmez. Ama kiosk govdesi
   * (kasa, direk, kaide) ekranin olcusune gore cizildigi icin ekranin
   * piksel olcusunu bilmesi gerekiyor.
   */
  if (sahne)
    return (
      <PanoFoto
        sahne={sahne}
        tuvalW={tuvalW}
        tuvalH={tuvalH}
        ekranWpx={ekranWpx}
        ekranHpx={ekranHpx}
        yakinlik={yakinlik}
        kayma={kayma}
      />
    )

  if (id === SALON_ID) {
    return (
      <Salon
        wPx={ekranWpx}
        hPx={ekranHpx}
        tuvalW={tuvalW}
        tuvalH={tuvalH}
        pxPerM={pxPerM}
        duvarWm={duvarWm}
        duvarHm={duvarHm}
        ekranSekli={ekranSekli}
      />
    )
  }
  if (id === CEPHE_ID) {
    return (
      <Cephe
        wPx={ekranWpx}
        hPx={ekranHpx}
        tuvalW={tuvalW}
        tuvalH={tuvalH}
        pxPerM={pxPerM}
        duvarWm={duvarWm}
        duvarHm={duvarHm}
        ekranSekli={ekranSekli}
      />
    )
  }
  if (id !== PANO_ID) return null
  return <Pano wPx={ekranWpx} hPx={ekranHpx} tuvalW={tuvalW} tuvalH={tuvalH} />
}
