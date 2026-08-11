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

/** Piksel aralığı → mesafe katsayısı (pitch mm × bu değer = metre) */
export const VIEW_DIST_PITCH_FACTOR = 2.5

/** Köşegen → mesafe katsayısı. 1,0 = ekranın köşegeni kadar uzaklık. */
export const VIEW_DIST_DIAGONAL_FACTOR = 1.0

/**
 * Modelin kendi izleme mesafesi — ekran boyutundan bağımsız.
 * Model listesinde/karşılaştırmada bu değer kullanılır.
 */
export function baseViewingDistance(model) {
  if (!model) return 0
  if (model.viewingDistanceM != null) return Number(model.viewingDistanceM)
  return +((model.pixelPitchMm || 0) * VIEW_DIST_PITCH_FACTOR).toFixed(1)
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
