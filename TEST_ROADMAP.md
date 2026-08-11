# LED Ekran Konfigüratörü — Test ve Pilot Yol Haritası

Bu doküman, uygulamayı önce sizin test etmeniz, ardından güvenilir bir grupla
"kapalı beta" yapmanız, sonra kurumsal bir müşteriyle pilot çalışması
yürütmeniz ve son olarak bireysel kullanıcılara açmanız için hazırlanmış
adım adım bir rehberdir. Teknik bilgi gerektirmez — hem sizin hem de
test edecek şirket/kişilerin doğrudan kullanabileceği şekilde yazılmıştır.

---

## Genel Bakış — 5 Aşama

| Aşama | Kim test eder? | Süre (öneri) | Amaç |
|---|---|---|---|
| 1. İç Test | Siz (kurucu ekip) | 3-5 gün | Temel hataları yakalamak |
| 2. Kapalı Beta | 3-5 güvendiğiniz kişi | 1-2 hafta | Gerçek kullanıcı gözüyle ilk izlenim |
| 3. Kurumsal Pilot | 1 şirket (gerçek müşteri) | 2-4 hafta | "Parayla satılabilir mi?" sorusuna cevap |
| 4. Bireysel Beta | 15-30 kişi (halka açık davetli) | 2-4 hafta | Ölçek ve çeşitlilik testi |
| 5. Karar Noktası | Siz | 1 gün | Production'a geç / geç bırak / iyileştir |

---

## AŞAMA 1 — İç Test (Siz)

**Adım 1: Ortamı hazırlayın.** `.env` dosyanızda şu değerlerin dolu olduğundan emin olun: `ADMIN_PASSWORD`, `JWT_SECRET`, `POSTGRES_PASSWORD`. Boş bırakılan bir değer, ilgili özelliğin sessizce çalışmamasına yol açabilir.

**Adım 2: Servisleri ayağa kaldırın.**
```
docker compose up -d --build
```

**Adım 3: Aşağıdaki temel senaryoları kendiniz baştan sona deneyin.** Her biri 2-3 dakika sürer:

- [ ] Ana sayfada bir model seçip duvar boyutunu değiştirin, fiyat/güç/ağırlık anlık güncelleniyor mu?
- [ ] "Model Öneri Sihirbazı"nı açıp 3 soruyu cevaplayın — önerilen modeller mantıklı mı?
- [ ] Bir teklif formu doldurup gönderin — admin panelde (`/#yonetim`) görünüyor mu?
- [ ] PDF teklif indirin — açılıyor mu, bilgiler doğru mu?
- [ ] AR (kamera) ekranını telefonunuzdan açıp ekranı duvara "yerleştirin".
- [ ] "3D Görünüm" ekranını açıp döndürün, "AR'da Gör" ile telefonda deneyin.
- [ ] Koyu/Açık tema düğmesini deneyin.
- [ ] Sayfayı telefon tarayıcısında "Ana Ekrana Ekle" ile uygulama gibi yükleyin.
- [ ] Admin panelde bir teklifin durumunu "Onaylandı" yapın, müşteriye bilgi gitti mi (SMTP tanımlıysa)?

**Adım 4: Bulduğunuz her hatayı not edin** — ekran görüntüsü + "ne yaptım, ne bekliyordum, ne oldu" formatında. Bu notlar bana aktarıldığında çok daha hızlı çözüm üretebilirim (bkz. aşağıdaki "Asistan İşbirliği" bölümü).

---

## AŞAMA 2 — Kapalı Beta (3-5 Güvenilir Kişi)

Amaç: Sizin fark edemediğiniz, "ilk kez gören biri" sorunlarını bulmak.

**Adım 1: Davet kodu oluşturun.** Admin panelde "Davet Kodları" sekmesinden 5 adet kod üretin.

**Adım 2: Katılımcılara şu 3 şeyi gönderin:**
1. Uygulamanın adresi (link)
2. Kendi davet kodu
3. Aşağıdaki "Basit Geri Bildirim Formu" (bu dokümanın sonunda)

**Adım 3: Katılımcılardan şunu isteyin:** "Kendi gerçek bir projenizi (örneğin ofisinizdeki bir toplantı odası ekranı) düşünerek uçtan uca bir teklif oluşturun ve PDF'i indirin." — soyut bir test yerine gerçek bir senaryo, çok daha güvenilir geri bildirim verir.

**Adım 4: 1 hafta sonra toplayın.** Formdaki cevapları bir tabloya toplayın; tekrar eden şikayetlere öncelik verin.

---

## AŞAMA 3 — Kurumsal Pilot (1 Gerçek Şirket)

Bu aşamada artık "ücretsiz deneme" değil, gerçek bir iş ilişkisi kurulur.

**Adım 1: Doğru pilot şirketi seçin.** İdeal profil: sizinle zaten konuşmuş, LED ekran ihtiyacı gerçek ve yakın zamanda olan, geri bildirim vermeye istekli bir şirket.

**Adım 2: Beklentiyi yazılı olarak netleştirin (tek sayfa yeter):**
- Pilot süresi (örn. 3 hafta)
- Şirketin bu süre içinde ne yapacağı (örn. "3 farklı proje için teklif oluşturup PDF'i kendi içlerinde paylaşacaklar")
- Sizin ne sağlayacağınız (destek, davet kodu, gerektiğinde ekran paylaşımlı yardım)
- Pilot sonunda kısa bir görüşme yapılacağı

**Adım 3: Şirkete özel bir davet kodu / hesap açın.** Kurumsal kullanıcı hissi vermesi için (mümkünse) şirket adını admin panelden not edin.

**Adım 4: Pilot ortasında (1-2. hafta) kısa bir "nasıl gidiyor" kontrolü yapın.** Sorunları pilot bitmeden çözme şansı verir.

**Adım 5: Pilot sonunda 20-30 dakikalık bir görüşme yapın.** Aşağıdaki 5 soruyu sorun:
1. Rakip/alternatif çözümlere (Excel, PDF katalog, satış temsilcisiyle telefon) göre zaman kazandırdı mı?
2. Ekibinizden kaç kişi kullandı, hangi departman?
3. Hangi özellik hiç kullanılmadı? Neden?
4. Bu aracı parayla kullanmaya devam eder misiniz? Ne kadar öderdiniz?
5. Bir arkadaşınıza/iş ortağınıza önerir misiniz?

Bu 5 sorunun cevabı, ürünün "satılabilir" olup olmadığının en somut kanıtıdır.

---

## AŞAMA 4 — Bireysel Kullanıcı Beta (15-30 Kişi)

Amaç: Farklı cihaz/tarayıcı/internet hızı/teknik bilgi seviyesindeki insanlarla ölçek testi.

**Adım 1: "Beta" etiketini görünür yapın.** Ana sayfada küçük bir "BETA" rozeti kullanıcıya bunun test sürümü olduğunu, geri bildirim beklendiğini hissettirir.

**Adım 2: Katılımcı çeşitliliğine dikkat edin.** Sadece bilgisayardan değil, en az %30'unun telefondan (Android + iPhone karışık) test etmesini isteyin — AR ve 3D özellikleri mobilde en kritik.

**Adım 3: Her katılımcıya aynı 2 görevi verin** (karşılaştırma yapılabilsin diye):
- Görev A: "Bir dış mekan reklam ekranı için teklif oluşturun."
- Görev B: "AR ekranını kullanarak tasarımı bir duvara yerleştirin ve fotoğrafını kaydedin."

**Adım 4: Basit Geri Bildirim Formu'nu (aşağıda) gönderin.**

**Adım 5: Sonuçları aşama 2 ve aşama 3'ün bulgularıyla birleştirip önceliklendirin.**

---

## AŞAMA 5 — Karar Noktası

Tüm aşamalar bittiğinde şu 3 basit soruya "evet/hayır" cevap verin:

1. **Güven:** Hesaplamalar (fiyat, güç, ağırlık) test kullanıcılarının hiçbirinde şüphe/şikayet yaratmadı mı?
2. **Akış:** Kullanıcıların çoğu yardım almadan teklif oluşturup PDF indirebildi mi?
3. **Değer:** En az 1 kurumsal pilot, "bunun için öderdim" dedi mi?

Üçü de "evet" ise production'a (gerçek domain, gerçek SSL, gerçek JWT_SECRET, e-posta bildirimleri açık) geçiş için hazırsınız. Herhangi biri "hayır" ise, o başlığa odaklanıp bir sonraki beta turunu tekrarlayın — tüm süreci baştan yapmanıza gerek yok.

---

## Basit Geri Bildirim Formu (Kopyalayıp Google Forms / Typeform'a Yapıştırın)

1. Uygulamayı hangi cihazdan kullandınız? (Bilgisayar / Telefon / Tablet)
2. 1-5 arası: Ekranı yapılandırmak ne kadar kolaydı? (1=çok zor, 5=çok kolay)
3. Herhangi bir noktada "şimdi ne yapacağım?" diye takıldınız mı? Nerede?
4. Beklediğiniz ama bulamadığınız bir özellik var mıydı?
5. Bir hata/garip davranış gördünüz mü? (Ekran görüntüsü ekleyebilirseniz çok yardımcı olur)
6. 1-5 arası: Bu aracı meslektaşlarınıza önerir misiniz?
7. Serbest yorum:

---

## Ek: Beta Öncesi Kontrol Listesi (Sizin İçin, Teknik)

Bu liste her aşamaya geçmeden önce hızlıca göz gezdirilmesi için:

- [ ] `.env` içinde `JWT_SECRET` gerçek, rastgele bir değerle dolu (boş bırakılmamalı)
- [ ] `ADMIN_PASSWORD` güçlü bir değere ayarlı
- [ ] Kişisel veri toplanan formlarda (teklif formu) kısa bir gizlilik notu var (KVKK/GDPR)
- [ ] Admin panele sadece sizin bildiğiniz kişiler erişebiliyor
- [ ] Test verileri (demo teklifler/konfigürasyonlar) gerçek pilotdan önce temizlendi
