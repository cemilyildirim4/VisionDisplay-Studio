/*
 * SAYILAR SEÇİLEN DİLE GÖRE YAZILIYOR.
 *
 * Her yerde 'tr-TR' sabiti vardı: İngilizce arayüzde de "0,96 m" ve
 * "1.536 × 256" çıkıyordu. İngilizce okuyan için ondalık ayırıcı NOKTA,
 * binlik ayırıcı VİRGÜL — "0,96" o dilde bin dokuz yüz altmış demek.
 *
 * Dil bir React bağlamında (LanguageContext) duruyor ama sayı biçimi
 * bileşen olmayan yerlerden de isteniyor (specsData, PDF hesapları).
 * Bu yüzden burada modül düzeyinde bir kopyası tutuluyor; dil değişince
 * sağlayıcı bunu da güncelliyor.
 *
 * Arapça: rakamlar Latin kalıyor (Arap-Hint rakamları ölçü tablolarında
 * okunmuyor), biçim Türkçeyle aynı.
 */
let yer = 'tr-TR'

export function sayiYeriniKur(lang) {
  yer = lang === 'en' ? 'en-US' : 'tr-TR'
}

export function sayiYeri() {
  return yer
}

/** Ondalık basamağı sabit sayı — ölçü etiketleri ve toplamlar. */
export function sayiYaz(n, d = 0) {
  return Number(n || 0).toLocaleString(yer, { minimumFractionDigits: d, maximumFractionDigits: d })
}
