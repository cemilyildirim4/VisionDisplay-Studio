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
  /*
   * AÇILDI, GERİ KAPATILDI (27 Ekim 2026).
   *
   * Açınca fotoğraf akışında tasarım kayboluyor: Mekan3D hazır deyince
   * düz çizim gizleniyor (ekranGizle), ama ikinci kurulumda 3B katman
   * çizmiyor ve ekranda hiçbir şey kalmıyor. Akış testinin "ikinci
   * kurulumda tasarım görünmüyor" adımı tam olarak bunu yakalıyor.
   *
   * Kalınlığın geri gelmesi için önce o gizleme kuralının düzelmesi
   * gerekiyor: 3B GERÇEKTEN çizene kadar düz çizim durmalı.
   */
  kabinGovdesi: false,

  /* L köşesinin tarafı: Sol köşe / Orta / Sağ köşe ve "Otomatiğe dön". */
  lKoseTarafi: false,

  /*
   * "DÜZENLE"NİN ALTINDAKİ KUTU — ölçü alanları, mesafe, ipucu.
   *
   * Artık Düzenle doğrudan ölçü akışını (pop-up) 1. adımdan açıyor; aynı
   * işler orada, sırasıyla ve açıklamasıyla yapılıyor. Panelde ikinci bir
   * kopya durması yalnızca yer kaplıyordu.
   */
  olcuDuzenlePaneli: false,

  /*
   * "Yerleşim" başlığı — altındaki düğmelerin hepsi kapalı olduğu için
   * boş bir satır olarak duruyordu.
   */
  yerlesimBasligi: false,

  /*
   * MANUEL DÜZENLE — referanstan sonraki ikinci yol.
   *
   * Köşe işaretlemek yok. Tasarım, referanstan gelen ölçekle KENDİ GERÇEK
   * BOYUTUNDA fotoğrafa konuyor; kullanıcı gövdesinden tutup taşıyor,
   * köşelerinden çekip duvara oturtuyor. Büyütüp küçültmek yalnızca kabin
   * sayısıyla — serbest gerdirme yok — böylece santim ölçüsü hep doğru
   * kalıyor. Bu, 4. adımın (Kutuyu yerine koy) işaretlenmiş alan olmadan
   * çalışan hâli; ayrı bir ekran değil.
   */
  manuelDuzenle: true,
}
