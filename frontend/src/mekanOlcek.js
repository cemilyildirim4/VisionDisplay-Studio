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
 * SABİT KADRAJIN KAPSADIĞI MEKÂN (m) — tipik bir toplantı salonu / cephe önü.
 *
 * Bu sayı "kameranın ne kadar geniş gördüğü"dür ve ikisini birden belirler:
 * küçük duvar kadrajda ne kadar küçük kalacak, büyük duvar ne zaman
 * kadrajı dolduracak. 12 m denendi: 1 m'lik varsayılan duvar tuvalin
 * dörtte birine düşüyor ve oda tünele benziyordu. 8 m'de 1–11 m arası
 * duvar ölçüsü ekranda karşılığını buluyor, varsayılan duvar da küçük ama
 * okunaklı kalıyor.
 */
export const KADRAJ_EN_M = 8
export const KADRAJ_BOY_M = 4.5

/* Sığdırma payı: yanlarda ve üstte mekânın kendisi görünsün. */
const SIGDIRMA_PAYI = 0.62
/* Duvar hiçbir koşulda kadrajı aşmasın (çok geniş duvarlarda devreye girer). */
const EN_COK_EN = 0.9
const EN_COK_BOY = 0.86

export function mekanOlcegi(tuvalW, tuvalH, duvarWm, duvarHm) {
  if (!tuvalW || !tuvalH || !(duvarWm > 0) || !(duvarHm > 0)) return null
  const sigdirma = Math.min(
    (tuvalW * SIGDIRMA_PAYI) / duvarWm,
    (tuvalH * SIGDIRMA_PAYI) / duvarHm,
  )
  const sabit = Math.min(tuvalW / KADRAJ_EN_M, tuvalH / KADRAJ_BOY_M)
  const karisim = Math.sqrt(sigdirma * sabit)
  return Math.min(karisim, (tuvalW * EN_COK_EN) / duvarWm, (tuvalH * EN_COK_BOY) / duvarHm)
}

export default mekanOlcegi
