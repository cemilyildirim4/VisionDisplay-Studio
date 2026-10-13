/**
 * SAĞ PANELDE NE GÖRÜNÜYOR — TEK YERDEN AÇMA/KAPAMA.
 *
 * Aşağıdaki özelliklerin hiçbiri SİLİNMEDİ; yalnızca kapatıldı. Panel
 * zamanla çok kalabalıklaştı ve hangi düğmenin hangi işe yaradığı
 * kayboldu, bu yüzden şimdilik yalnızca kullanılan akış açık duruyor.
 *
 * GERİ AÇMAK: ilgili satırı true yapmak yeterli. Kodun kendisi, hesaplar ve
 * çevirileri yerinde duruyor — hiçbir şeyi yeniden yazmak gerekmiyor.
 *
 * KAPALIYKEN İŞLEVİ DE YOK: düğme çizilmediği için çağırdığı iş de
 * çalışmıyor. Yani "görünmüyor ama arkada hâlâ bir şey yapıyor" durumu
 * oluşmuyor.
 */
export const PANEL = {
  /* İzleme mesafesi (− 4 +) — perspektifin sertliğini belirliyordu. */
  mesafe: false,

  /* Fotoğrafın üstüne metre ızgarası çizen aç/kapa. */
  izgara: false,

  /* Fotoğrafta önerilen alana oturtan düğme. */
  enUygunYer: false,

  /* Başka aday alanları kareler hâlinde gösteren düğme. */
  digerYerler: false,

  /* Tasarımı tuvalin ortasına alan düğme. */
  ortala: false,

  /* Ölçü kutusunu kuran / güncelleyen düğmeler (manuel yolun tamamlayıcısı). */
  olcuKutusu: false,

  /* Tasarımı ölçü kutusuna yerleştiren düğme. */
  kutuyaYerlestir: false,

  /* Tasarımı duvarı dolduracak en büyük dizilişe çeviren düğme. */
  duvaraSigdir: false,

  /*
   * Eğim düğmeleri: referans eğimine döndür / ölçülen perspektife döndür /
   * eğimi sıfırla. Üçü aynı grupta.
   */
  egim: false,

  /* Elle çekilen köşeleri sıfırlayan düğme. */
  koseAyariniSifirla: false,

  /* L köşesinin tarafı: Sol köşe / Orta / Sağ köşe ve "Otomatiğe dön". */
  lKoseTarafi: false,

  /*
   * MANUEL DÜZENLE — referanstan sonraki ikinci yol.
   *
   * Kapalı, çünkü onu tamamlayan düğmeler ("Ölçü kutusunu oluştur",
   * "Ölçüyü uygula") kapatıldı; açık bırakmak hiçbir yere çıkmayan bir
   * düğme bırakmak olurdu. Manuel yol yeniden tasarlanınca birlikte açılır.
   */
  manuelDuzenle: false,
}
