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
 * KAMERA DUVARIN ÖNÜNDE — TASARIM EKRANINDAKİ ORANIN AYNISI.
 *
 * Ölçek sabit bir kadrajdan geliyordu (10 × 6 m): 1 m'lik bir duvar kadrajın
 * onda biri, yani mekânda nokta kadar kalıyordu. Kullanıcının gördüğü
 * "mekânda duvar da tasarım da çok uzak" buydu — ölçüldü: 1,00 m duvar
 * 1.070 piksellik tuvalde 107 piksel.
 *
 * Kamera artık duvara göre duruyor: duvar her ölçüde tuvalin aynı oranını
 * kaplıyor, tıpkı arka plansız tasarım ekranındaki gibi. "Duvar büyüdü mü"
 * sorusunun cevabı kaybolmuyor, çünkü mekândaki İNSAN gerçek metre ölçüsünde
 * çiziliyor: 1 m'lik duvarın yanında insan duvardan uzun, 4 m'lik duvarın
 * yanında duvarın dörtte biri kadar duruyor.
 *
 * Oran %62/%58: tasarım ekranında duvar tuvalin dörtte üçünü kaplıyor, ama
 * burada duvarın ÇEVRESİNE de yer gerek (tavan, zemin, yan duvarlar). Bu
 * değerler duvarı öne çıkarırken mekânı da görünür bırakıyor.
 */
const PAY_EN = 0.62
const PAY_BOY = 0.58


export function mekanOlcegi(tuvalW, tuvalH, duvarWm, duvarHm) {
  if (!tuvalW || !tuvalH || !(duvarWm > 0) || !(duvarHm > 0)) return null
  return Math.min((tuvalW * PAY_EN) / duvarWm, (tuvalH * PAY_BOY) / duvarHm)
}

export default mekanOlcegi
