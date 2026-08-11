import { useEffect, useState } from 'react'

/**
 * Cihazda kamera var mı, varsa nasıl kullanılabilir?
 *
 * Hem "Kendi Mekânım" fotoğraf yükleme penceresi hem AR ekranı buna bakar;
 * iki yerde ayrı ayrı tahmin yürütmeyelim diye tek yere alındı.
 *
 * Dönenler:
 *   dokunmatik   telefon/tablet mi (birincil işaretleyici parmak mı)
 *   durum        'var' | 'yok' | 'bilinmiyor'
 *   tur          FOTOĞRAF ÇEKMEK için yol:
 *                  'yerlesik' — cihazın kendi kamera uygulaması (capture'lı
 *                               dosya girişi). Telefonda en iyisi: tam
 *                               çözünürlük, arka kamera, http'de de çalışır.
 *                  'sayfaici' — sayfa içinde canlı görüntü (getUserMedia)
 *                  null       — kamera yok ya da erişilemiyor
 *   canliMumkun  AR ekranı açılabilir mi. AR'da cihazın kendi kamera
 *                uygulaması işe yaramaz — tasarımı görüntünün ÜZERİNE
 *                bindirmek için akışın sayfa içinde olması şart. Bu da
 *                yalnızca güvenli bağlantıda (https / localhost) mümkün.
 */
export function useKamera(aktif = true) {
  const [dokunmatik] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches,
  )
  const [durum, setDurum] = useState('bilinmiyor')

  /*
   * enumerateDevices izin penceresi AÇMAZ. İzin verilmemişken cihaz ADLARI boş
   * gelir ama TÜRÜ (videoinput) yine görünür — bize yeten bu.
   *
   * Güvenli olmayan bağlantıda (ağdaki http adresi) navigator.mediaDevices hiç
   * tanımlı olmaz. O durumda dokunmatik cihaz 'bilinmiyor' sayılır: telefonda
   * kamera olmaması neredeyse imkânsız ve orada zaten cihazın kendi kamera
   * uygulaması açılıyor.
   */
  useEffect(() => {
    if (!aktif) return
    let iptal = false
    const md = navigator.mediaDevices
    if (!md?.enumerateDevices) {
      setDurum(dokunmatik ? 'bilinmiyor' : 'yok')
      return
    }
    md.enumerateDevices()
      .then((liste) => {
        if (!iptal) setDurum(liste.some((c) => c.kind === 'videoinput') ? 'var' : 'yok')
      })
      .catch(() => !iptal && setDurum('bilinmiyor'))
    return () => {
      iptal = true
    }
  }, [aktif, dokunmatik])

  const erisilebilir = durum === 'var' || (durum === 'bilinmiyor' && dokunmatik)
  const guvenli = typeof window !== 'undefined' && window.isSecureContext
  const tur = !erisilebilir ? null : dokunmatik ? 'yerlesik' : guvenli ? 'sayfaici' : null

  return { dokunmatik, durum, erisilebilir, tur, canliMumkun: erisilebilir && guvenli }
}
