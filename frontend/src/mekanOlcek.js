/**
 * MEKÂNDAKİ ÇİZİM ÖLÇEĞİ (piksel / metre) — bütün mekânlar için tek kural.
 *
 * SORUN:
 * Ölçek, duvarı tuvale SIĞDIRARAK hesaplanıyordu: `0,62 × tuval / duvar`.
 * Bu formülde duvarın ekrandaki boyu duvar ölçüsünden bağımsızdır —
 * genişliğe 3 m de yazılsa 9 m de yazılsa duvar her zaman tuvalin aynı
 * oranını (%62) kaplıyordu. Değişen tek şey tasarımın duvara göre küçülmesi
 * oluyordu; kullanıcının gördüğü "duvar ölçüsünü değiştiriyorum, mekândaki
 * duvar değişmiyor" şikâyeti tam olarak buydu.
 *
 * ÇÖZÜM — SABİT KADRAJ İLE SIĞDIRMANIN ORTASI:
 * Ölçek tamamen sabit bir kadrajdan gelseydi (1 m her zaman aynı piksel)
 * duvar ölçüsüyle birlikte büyürdü, ama 3 m'lik küçük bir duvar tuvalin
 * dörtte birinde kalır, 18 m'lik duvar da kadrajdan taşardı. Bu yüzden iki
 * ölçeğin GEOMETRİK ORTASI alınıyor:
 *
 *   ölçek = √(sığdırma × sabit)   →   duvarın piksel eni ∝ √(duvar metresi)
 *
 * Yani duvar büyüdükçe ekrandaki duvar da büyüyor (istenen davranış), ama
 * kamera aynı anda biraz geri çekiliyor; küçük duvar kadrajı boş bırakmıyor,
 * büyük duvar da taşmıyor.
 *
 * NEDEN HER MEKÂNDA AYNI SAYI:
 * Ölçek yalnızca duvar ölçüsüne bakıyor, mekâna değil. Aynı duvar ölçüsünde
 * aynı tasarım; iç mekânda, dış mekânda, AVM koridorunda ve şehir meydanında
 * birebir aynı boyda çiziliyor (kullanıcının istediği "bütün mekânlarda aynı
 * gerçek ölçek"). Sahnelerin kendi metre tahminleri (kadraj ≈ 21 m / 33 m)
 * yalnızca ölçü etiketleri içindir, çizim ölçeğini belirlemez.
 */

/*
 * SABİT KADRAJIN KAPSADIĞI MEKÂN (m) — kameranın ne kadar geniş gördüğü.
 *
 * Ölçek YALNIZCA bu kadrajdan geliyor: 1 m her mekânda aynı piksel sayısı.
 * Dolayısıyla 4 m'lik duvar 1 m'lik duvarın tam dört katı çiziliyor — metre
 * ile ekrandaki boy birebir orantılı. 10 m seçildi: 1 m'lik varsayılan duvar
 * kadrajın onda birinde kalıyor (gerçekte de öyle), 9–10 m'lik bir duvar
 * kadrajı dolduruyor.
 */
export const KADRAJ_EN_M = 10
export const KADRAJ_BOY_M = 6

/*
 * TAVAN — yalnızca çok büyük duvarlar için.
 *
 * 11 m'den geniş duvar kadrajı aşıyor ve çizim tuvalin dışına taşıyordu.
 * Bu sınır devreye girene kadar (günlük ölçülerin tamamı) orantı birebir
 * korunuyor; aşan duvarlarda da duvarla birlikte tasarım aynı oranda
 * küçüldüğü için ikisinin birbirine oranı yine doğru kalıyor.
 */
const EN_COK_EN = 0.92
const EN_COK_BOY = 0.88

export function mekanOlcegi(tuvalW, tuvalH, duvarWm, duvarHm) {
  if (!tuvalW || !tuvalH || !(duvarWm > 0) || !(duvarHm > 0)) return null
  const sabit = Math.min(tuvalW / KADRAJ_EN_M, tuvalH / KADRAJ_BOY_M)
  return Math.min(sabit, (tuvalW * EN_COK_EN) / duvarWm, (tuvalH * EN_COK_BOY) / duvarHm)
}

export default mekanOlcegi
