# Kullanıcı Test Yol Haritası

Ürün seçiminden PDF oluşturmaya kadar uçtan uca kullanıcı senaryoları.
Her maddeyi sırayla işaretleyin. Hata bulursanız: ne yaptınız → ne beklediniz → ne oldu.

---

## 1. Model seçimi

- [ ] Ana ekranda **Model Seç** ile katalog açılıyor
- [ ] LED / Video Duvarı sekmeleri arasında geçiş yapılabiliyor
- [ ] Bir model seçilince sol panelde model adı ve görsel görünüyor
- [ ] **Model Değiştir** ile başka modele geçilebiliyor
- [ ] Model öneri sihirbazı açılıyor; 3 soru sonrası öneriler geliyor
- [ ] Önerilen bir model seçilince konfigüratöre yansıyor

---

## 2. Ekran düzeni

- [ ] **Tek ekran** seçilince önizleme tek yüzey gösteriyor
- [ ] **Çoklu ekran** ile birden fazla ekran tanımlanabiliyor
- [ ] Düz / kavisli (veya L tipi, varsa) seçenekleri çalışıyor
- [ ] Sütun ve satır artırılınca / azaltılınca duvar boyutu güncelleniyor
- [ ] Genişlik / yükseklik elle girilince kabin sayısı uyumlu kalıyor
- [ ] Ölçü göster/gizle düğmesi çizimde ölçüleri açıp kapatıyor

---

## 3. Hesaplama ve özet

- [ ] Kabin sayısı değişince **fiyat** güncelleniyor
- [ ] **Güç** (tipik / max) doğru görünüyor
- [ ] **Ağırlık** doğru görünüyor
- [ ] Çözünürlük / piksel bilgisi model ve grid ile uyumlu
- [ ] Video duvarı modelinde LED’e özel alanlar (S-kutu vb.) gizleniyor veya uyumlu

---

## 4. İçerik ve görünüm

- [ ] LED / örnek görüntü / resim yükle / video seçenekleri çalışıyor
- [ ] Yüklenen görsel ekran önizlemesinde görünüyor
- [ ] Açık / koyu tema geçişi bozulmadan çalışıyor
- [ ] Dil değiştirince (TR / EN / AR) metinler güncelleniyor

---

## 5. Teknik özellikler

- [ ] Teknik özellikler paneli açılıyor
- [ ] Ölçü, çözünürlük, güç, ağırlık, izleme mesafesi dolu
- [ ] Teknik özellik **PDF indir** çalışıyor
- [ ] PDF’de model kodu ve seçilen grid doğru

---

## 6. Teklif ve PDF (uçtan uca)

- [ ] **PDF olarak dışa aktar** formu açılıyor
- [ ] Müşteri adı, telefon, e-posta, adres girilebiliyor
- [ ] Gizlilik / onay kutusu işaretlenmeden indirme kapalı
- [ ] Onay sonrası PDF indiriliyor
- [ ] PDF antetinde logo / şirket bilgisi var
- [ ] PDF’de model, ölçü, kabin sayısı, güç, ağırlık doğru
- [ ] Çoklu ekranda PDF’de ekran tablosu görünüyor
- [ ] Teklif kaydı yönetimde (teklif listesinde) görünüyor

---

## 7. 3D ve AR

- [ ] **3D Görünüm** açılıyor; sahne döndürülebiliyor
- [ ] AR / kamera simülasyonu açılıyor
- [ ] Mobilde AR veya yerleştirme deneyimi kullanılabilir (cihaz destekliyorsa)

---

## 8. Yardım ve iletişim

- [ ] Asistan / sohbet açılıyor; soru önerileri çalışıyor
- [ ] İletişim modalı açılıyor; telefon / WhatsApp / e-posta linkleri doğru
- [ ] Gizlilik metni okunabiliyor

---

## 9. Profil ve roller (kısa)

- [ ] Misafir menüsünde Yönetim Paneli **yok**
- [ ] Bayi menüsünde Tekliflerim var, Yönetim **yok**
- [ ] Admin menüsünde Yönetim Paneli en üstte
- [ ] Kontrol Merkezi açılıyor; geri dönüş konfigüratöre çalışıyor

---

## 10. Yönetimde teklif takibi (kısa)

- [ ] Admin girişi sonrası teklif listesinde yeni kayıt var
- [ ] Teklif durumu değiştirilebiliyor (Beklemede / Onaylandı / Reddedildi)
- [ ] Kayıtlı proje / konfigürasyon listeleniyor (kayıt alındıysa)

---

## Hızlı smoke (5 dakika)

1. Model seç  
2. Boyut ayarla → özet güncellendi mi?  
3. PDF teklif indir → açılıyor mu?  
4. Yönetimde teklif görünüyor mu?  

Bu dördü geçtiyse temel kullanıcı yolu çalışıyordur.
