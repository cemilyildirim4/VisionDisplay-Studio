/**
 * En Uygun İzleme Mesafesi hesabı.
 *
 * İki kural birlikte çalışır ve BÜYÜĞÜ alınır:
 *
 *  1) Piksel aralığı kuralı — bundan daha yakından bakınca tek tek pikseller
 *     seçilmeye başlar. Ekran boyutundan bağımsızdır; modelin kendi özelliğidir.
 *     Modelde `viewingDistanceM` girilmişse o kullanılır, yoksa pitch × 2,5.
 *
 *  2) Ekran boyutu kuralı — ekranın TAMAMINI rahat görebilmek için gereken
 *     mesafe. Ekran büyüdükçe orantılı olarak artar; köşegen uzunluğu kadar.
 *
 * Küçük ekranlarda (1) baskındır: yaklaşsanız da pikseller görünmesin diye
 * belli bir mesafe gerekir. Ekran büyüdükçe (2) devreye girer ve mesafe
 * ekranla orantılı büyür.
 */

/*
 * PİKSEL ARALIĞI → MESAFE KATSAYISI (pitch mm × bu değer = metre).
 *
 * 2,5 idi: P1.25 bir panel için 3,1 m çıkıyordu. Sektördeki kural birebir —
 * "en yakın izleme mesafesi, piksel aralığı kaç mm ise o kadar metre"
 * (P2.5 → 2,5 m). Modelin yönetim panelinde değeri girilmişse zaten o
 * kullanılıyor; bu yalnızca girilmemiş modellerin karşılığı.
 */
export const VIEW_DIST_PITCH_FACTOR = 1.0

/** Köşegen → mesafe katsayısı. 1,0 = ekranın köşegeni kadar uzaklık. */
export const VIEW_DIST_DIAGONAL_FACTOR = 1.0

/**
 * Modelin kendi izleme mesafesi — ekran boyutundan bağımsız.
 * Model listesinde/karşılaştırmada bu değer kullanılır.
 */
/*
 * KURAL ÖNCE PİKSEL ARALIĞINDAN.
 *
 * Modelde elle girilmiş bir mesafe varsa o kullanılıyordu; kayıtlardaki
 * değerler ise eski 2,5 katsayısıyla hesaplanmış sayılardı (P1.25 için
 * 3,1 m). Sektör kuralı birebir: piksel aralığı kaç mm ise o kadar metre.
 * Elle girilen değer yalnızca piksel aralığı BİLİNMİYORSA devreye giriyor.
 */
export function baseViewingDistance(model) {
  if (!model) return 0
  const pitch = Number(model.pixelPitchMm) || 0
  if (pitch > 0) return +(pitch * VIEW_DIST_PITCH_FACTOR).toFixed(2)
  if (model.viewingDistanceM != null) return Number(model.viewingDistanceM)
  return 0
}

/**
 * MESAFE YAZISI — gereksiz sıfır yok, kırpma da yok.
 *
 * Tek ondalıkla yazılıyordu: 1,25 m'lik bir mesafe "1,3 m" oluyordu, yani
 * ürünün kuralı ("piksel aralığı kaç mm ise o kadar metre") ekranda tutmuyor
 * gibi görünüyordu. En çok iki ondalık; sondaki sıfırlar atılıyor, yani 3 m
 * yine "3 m".
 */
export function mesafeYazisi(m) {
  const n = Math.round((Number(m) || 0) * 100) / 100
  return String(n).replace('.', ',')
}

/**
 * Bu yapılandırma için en uygun izleme mesafesi (m).
 * Ekran boyutunu hesaba katar: sütun/satır arttıkça mesafe de artar.
 */
export function viewingDistanceFor(model, cols, rows) {
  const base = baseViewingDistance(model)
  if (!model || !cols || !rows) return base

  const widthM = (cols * (model.widthMm || 0)) / 1000
  const heightM = (rows * (model.heightMm || 0)) / 1000
  const diagonalM = Math.sqrt(widthM * widthM + heightM * heightM)

  return Math.max(base, diagonalM * VIEW_DIST_DIAGONAL_FACTOR)
}
