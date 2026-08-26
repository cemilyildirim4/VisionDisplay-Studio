/**
 * FOTOĞRAFLI MEKÂNLARIN ORTAK ÖLÇEK HESABI.
 *
 * Fotoğraf `object-fit: cover` ile gösteriliyor: iki ekseni de kaplayacak en
 * küçük ölçekle çiziliyor, taşan taraf ortadan kırpılıyor. Ekranı bu
 * fotoğrafın ÜSTÜNE doğru büyüklükte koyabilmek için aynı hesabı burada da
 * yapmak gerekiyor — yoksa pencere oranı değiştiğinde zemin çizgisi kayar,
 * ekran havada ya da yerin altında kalırdı.
 *
 * Ölçeğin pencereye değil FOTOĞRAFA bağlanmasının sebebi de bu: pencereye
 * bağlansaydı, pencere genişledikçe ekran mekâna göre büyüyüp küçülürdü ve
 * "bu ekran orada ne kadar yer kaplar" sorusunun cevabı kalmazdı.
 *
 * Her sahnenin kendi kalibrasyonu var (zemin çizgisi ve o derinlikte
 * fotoğrafın kaç metreye denk geldiği). İkisi de gözle kestirilmiş
 * referanslardır — ölçüm değil.
 */

/**
 * @param {{w:number,h:number}} sahne  görünen alan (px)
 * @param {{w:number,h:number}} foto   fotoğrafın doğal ölçüsü (px)
 * @param {object} kalibrasyon
 * @param {number} kalibrasyon.zeminOrani   taban çizgisi — fotoğraf yüksekliğinin oranı
 * @param {number} kalibrasyon.kadrajMetre  fotoğrafın TAM genişliğinin o derinlikte kaç metre ettiği
 * @param {number} [kalibrasyon.tabanEnAz]  tabanın kadraj dışına düşmemesi için alt sınır (oran)
 * @param {number} [kalibrasyon.tabanEnCok] üst sınır (oran)
 * @returns {{pxPerM:number, tabanY:number}|null}
 */
export function fotoYerlesimi(sahne, foto, kalibrasyon) {
  if (!(sahne?.w > 0) || !(sahne?.h > 0)) return null

  const { zeminOrani, kadrajMetre, tabanEnAz = 0.5, tabanEnCok = 0.95 } = kalibrasyon

  // Fotoğraf henüz yüklenmediyse pencereye dayalı makul bir yedek.
  if (!(foto?.w > 0) || !(foto?.h > 0)) {
    return {
      pxPerM: Math.min(sahne.w / 8, sahne.h / 4.5),
      tabanY: sahne.h * zeminOrani,
    }
  }

  const olcek = Math.max(sahne.w / foto.w, sahne.h / foto.h)
  const cizilenW = foto.w * olcek
  const cizilenH = foto.h * olcek
  const ham = sahne.h / 2 + (zeminOrani - 0.5) * cizilenH

  return {
    pxPerM: cizilenW / kadrajMetre,
    // Uç pencere oranlarında taban kadrajın dışına düşebiliyor; emniyet sınırı.
    tabanY: Math.max(sahne.h * tabanEnAz, Math.min(sahne.h * tabanEnCok, ham)),
  }
}

/**
 * Ekranı sahneye sığdıran ORTAK katsayı.
 *
 * Genişlik ve yükseklik ayrı katsayılarla küçültülseydi en/boy oranı bozulurdu;
 * ikisine de aynı sayı uygulanıyor. `payW`/`payH` çerçeve, kaide ve nefes payı
 * gibi ekranın dışında kalan piksellerdir — sığma hesabına onlar da girer.
 */
export function sigdirmaKatsayisi(wPx, hPx, enCokW, enCokH, payW = 0, payH = 0) {
  if (!(wPx > 0) || !(hPx > 0)) return 1
  const kullanilabilirW = Math.max(1, enCokW - payW)
  const kullanilabilirH = Math.max(1, enCokH - payH)
  return Math.min(1, kullanilabilirW / wPx, kullanilabilirH / hPx)
}

/**
 * FOTOGRAFIN CEKILDIGI MESAFE - izleme mesafesi denetiminin baslangici.
 *
 * Kadrajin zemin hizasinda kac metreye denk geldigini biliyoruz; kameranin
 * yatay gorus acisini da varsayarsak, fotografcinin o noktadan ne kadar
 * uzakta durdugu basit bir ucgen: yari genislik / tan(yari aci).
 *
 * Kesin bir sayi degil, gorus acisi varsayim. Ama denetim GORELI calisiyor:
 * onemli olan "buradan bakinca" ile "yaklasinca" arasindaki oran.
 */
export const KAMERA_ACISI = 65

export function kadrajMesafesi(kadrajMetre) {
  return kadrajMetre / 2 / Math.tan((KAMERA_ACISI * Math.PI) / 360)
}
