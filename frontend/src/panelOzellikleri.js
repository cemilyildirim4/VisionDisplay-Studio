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

  /*
   * EKRANIN 3B HÂLİ — KALINLIĞI ÇİZEN HER ŞEY.
   *
   * İki ayrı katman var ve ikisi de buraya bağlı:
   *   KalinlikKatmani — dörtgenden türetilen yan/üst yüzler, duvar düzlemi
   *                     ölçülmüşken çiziliyor.
   *   Mekan3D         — fotoğrafın üstüne oturtulan gerçek 3B model; kabinin
   *                     derinliği onda da var. Ekranda görünen kalınlık
   *                     çoğunlukla BUYDU; ilk denememde yalnızca ötekini
   *                     kapatmıştım ve kalınlık yerinde kalmıştı.
   *
   * Şimdilik kapalı: yerleşimdeki sorun 3B olmadan aranacak. Hesapları ve
   * çizimleri yerinde duruyor, burayı true yapmak ikisini de geri getiriyor.
   */
  kabinGovdesi: false,

  /* L köşesinin tarafı: Sol köşe / Orta / Sağ köşe ve "Otomatiğe dön". */
  lKoseTarafi: false,

  /*
   * MANUEL DÜZENLE — referanstan sonraki ikinci yol.
   *
   * SEÇENEK GÖRÜNÜYOR ama İŞLEVİ YOK: akışta iki yol olduğu baştan belli
   * olsun isteniyor, manuel yolun kendisi sonra tasarlanacak. Basılınca
   * yalnızca "yakında" notu çıkıyor; eski cm'li kutu yolu açılmıyor, çünkü
   * onu tamamlayan düğmeler kapalı (bkz. olcuKutusu).
   */
  manuelDuzenle: true,
  /* Manuel yolun kendisi çalışıyor mu — şimdilik hayır. */
  manuelCalisir: false,
}
