/**
 * Yardımcının bilgi tabanı.
 *
 * Yapay zekâ YOK: her konunun anahtar kelimeleri ve hazır cevabı var.
 * Kullanıcının yazdığı metin anahtar kelimelerle eşleştirilip en yüksek
 * puanı alan konu döndürülür.
 *
 * NEDEN BÖYLE: ücretsiz, internetsiz çalışır, öngörülebilir ve yanlış bilgi
 * uydurmaz. Karşılığında yalnızca burada yazılanları bilir.
 *
 * CEVAPLAR BU PROJEYE ÖZGÜDÜR. Uygulamadaki bir kural değişirse (ör. izleme
 * mesafesi formülü) buradaki metin de güncellenmelidir.
 */

import { CONTACT } from './contactInfo.js'

/**
 * Cevaplayamadığımız (fiyat, garanti, kurulum gibi ticari) konularda
 * kullanılan ortak iletişim bloğu. Numaralar contactInfo.js'ten gelir —
 * değişirse tek yerde güncellenir.
 */
const ILETISIM_TR = `☎ ${CONTACT.phoneDisplay}\n📱 ${CONTACT.mobileDisplay}\n✉ ${CONTACT.email}`
const ILETISIM_EN = `☎ +90 216 415 52 52\n📱 +90 532 451 99 00\n✉ ${CONTACT.email}`

export const TOPICS = [
  {
    id: 'greeting',
    keys: {
      /*
       * "neler yapabilirsin" ayrıca yazılı: anahtar yalnızca "ne yapabilirsin"
       * iken konunun KENDİ başlığı ("Neler yapabilirsin?") eşleşmiyordu.
       */
      tr: ['merhaba', 'selam', 'iyi günler', 'iyi gunler', 'nasılsın', 'nasilsin', 'kimsin', 'ne yapabilirsin', 'neler yapabilirsin', 'yardım'],
      en: ['hello', 'hi', 'who are you', 'what can you do', 'help'],
      ar: ['مرحبا', 'من أنت', 'ماذا يمكنك'],
    },
    q: { tr: 'Neler yapabilirsin?', en: 'What can you do?', ar: 'ماذا يمكنك أن تفعل؟' },
    a: {
      tr: `Ben Masaüstü Bilişim Teknolojileri asistanıyım.\n\nFirmamız, ürünlerimiz ve LED ekran çözümleri hakkında merak ettiklerinizi sorabilirsiniz.\n\nFiyat, garanti ve kurulum gibi konular için lütfen bizimle iletişime geçin:\n\n${ILETISIM_TR}`,
      en: `I am the Masaüstü Bilişim Teknolojileri assistant.\n\nFeel free to ask anything about our company, our products and LED display solutions.\n\nFor matters such as pricing, warranty and installation, please get in touch with us:\n\n${ILETISIM_EN}`,
      ar: `أنا مساعد Masaüstü Bilişim Teknolojileri.\n\nاسألني عمّا تريد معرفته عن شركتنا ومنتجاتنا وحلول شاشات LED.\n\nللأسعار والضمان والتركيب، يُرجى التواصل معنا:\n\n${ILETISIM_EN}`,
    },
  },
  {
    id: 'pitch',
    keys: {
      tr: ['piksel aralığı', 'piksel araligi', 'piksell', 'pixell', 'pixel araligi', 'pixel aralığı', 'pitch', 'p1.25', 'p1.6', 'p2.0', 'piksel', 'mm ne demek', 'hangi pitch', 'ne kadar sık', 'netlik', 'keskinlik'],
      en: ['pixel pitch', 'pitch', 'pixel'],
      ar: ['المسافة بين البكسل', 'بكسل'],
    },
    q: {
      tr: 'Piksel aralığı nedir?',
      en: 'What is pixel pitch?',
      ar: 'ما هي المسافة بين البكسل؟',
    },
    a: {
      tr: 'İki LED diyotun merkezleri arasındaki mesafedir, milimetre cinsinden ölçülür. P1.25 = 1,25 mm demektir.\n\nSayı küçüldükçe pikseller sıklaşır, görüntü netleşir ve ekrana daha yakından bakılabilir — ama maliyet artar. Yakın mesafeden izlenecek ekranlarda küçük, uzaktan izlenecek ekranlarda büyük aralık seçilir.',
      en: 'It is the distance between the centres of two LED diodes, in millimetres. P1.25 means 1.25 mm.\n\nThe smaller the number, the denser the pixels and the sharper the image, so you can stand closer — but the cost rises. Choose a small pitch for close viewing, a larger one for distant viewing.',
      ar: 'هي المسافة بين مركزَي ديودين، بالمليمتر. P1.25 تعني 1.25 مم.\n\nكلما صغر الرقم زادت كثافة البكسل ووضوح الصورة، لكن التكلفة ترتفع.',
    },
  },
  {
    id: 'viewdist',
    keys: {
      tr: ['izleme mesafesi', 'bakma uzaklığı', 'bakma uzakligi', 'ne kadar uzak', 'kaç metre uzak', 'mesafe', 'uzaktan izlen', 'ne kadar uzaktan', 'kaç metreden', 'yakından bak', 'oturma mesafesi', 'ne kadar uzağa'],
      en: ['viewing distance', 'how far', 'distance'],
      ar: ['مسافة المشاهدة', 'المسافة'],
    },
    q: {
      tr: 'İzleme mesafesi nasıl hesaplanıyor?',
      en: 'How is viewing distance calculated?',
      ar: 'كيف تُحسب مسافة المشاهدة؟',
    },
    a: {
      tr: 'İki kuralın BÜYÜĞÜ alınır:\n\n1) Piksel aralığı kuralı — bundan yakına gelirseniz tek tek pikseller seçilmeye başlar. Ekran boyutundan bağımsızdır.\n\n2) Ekran boyutu kuralı — ekranın tamamını rahat görebilmek için gereken mesafe; ekranın köşegeni kadardır.\n\nKüçük ekranlarda 1. kural baskındır, o yüzden ekranı biraz büyütünce mesafe değişmez. Ekran yeterince büyüdüğünde 2. kural devreye girer ve mesafe ekranla birlikte artar.',
      en: 'The LARGER of two rules is used:\n\n1) Pixel pitch rule — come closer than this and individual pixels become visible. Independent of screen size.\n\n2) Screen size rule — the distance needed to comfortably see the whole screen; equal to the screen diagonal.\n\nOn small screens rule 1 dominates, so enlarging the screen a little does not change the distance. Once the screen is large enough rule 2 takes over and the distance grows with it.',
      ar: 'يُؤخذ الأكبر من قاعدتين: قاعدة المسافة بين البكسل، وقاعدة قطر الشاشة.',
    },
  },
  {
    id: 'cabinet',
    keys: {
      tr: ['kabin', 'kabbin', 'kabinn', 'dolabı', 'modül', 'modul', 'parça ölçüsü', 'parca olcusu', '320', 'sütun satır ne', 'sutun satir ne', 'panel sayısı', 'kaç tane panel', 'kaç panel', 'kaç kabin', 'modül sayısı'],
      en: ['cabinet', 'module', 'panel size'],
      ar: ['خزانة', 'وحدة'],
    },
    q: {
      tr: 'Kabin nedir, ölçüsü ne?',
      en: 'What is a cabinet and what size is it?',
      ar: 'ما هي الخزانة وما مقاسها؟',
    },
    a: {
      tr: 'Kabin, ekranı oluşturan tek bir LED parçasıdır. Bu konfigüratörde standart kabin 320 × 160 × 100 mm\'dir.\n\nEkran ölçüsünü kabin ölçüsü belirler: sütun ekledikçe genişler, satır ekledikçe yükselir. Kabinin kendi boyutu ASLA değişmez — sadece kaç tane kullanıldığı değişir.\n\nÖrnek: 6 sütun × 3 satır = 1,92 × 0,48 m ekran.',
      en: 'A cabinet is a single LED module that makes up the screen. In this configurator the standard cabinet is 320 × 160 × 100 mm.\n\nScreen size is determined by cabinet count: adding columns widens it, adding rows heightens it. The cabinet size itself NEVER changes — only how many are used.\n\nExample: 6 columns × 3 rows = 1.92 × 0.48 m.',
      ar: 'الخزانة وحدة LED واحدة تكوّن الشاشة. المقاس القياسي هنا 320 × 160 × 100 مم.',
    },
  },
  {
    id: 'fit',
    keys: {
      tr: ['duvara sığdır', 'duvara sigdir', 'sığdır', 'sigdir', 'otomatik doldur', 'doldur', 'tam doldur', 'otomatik', 'büyüt', 'ekranı büyüt'],
      en: ['fit to wall', 'fit wall'],
      ar: ['ملاءمة الجدار'],
    },
    q: {
      tr: '"Duvara sığdır" ne yapıyor?',
      en: 'What does "Fit to wall" do?',
      ar: 'ماذا يفعل "ملاءمة الجدار"؟',
    },
    a: {
      tr: 'Duvara tam sığan en fazla kabin sayısını hesaplayıp uygular:\n\n• sütun = duvar genişliği ÷ kabin genişliği (tam sayı)\n• satır = duvar yüksekliği ÷ kabin yüksekliği (tam sayı)\n\nÖrnek: 1 × 1 m duvarda 320 × 160 mm kabinle 3 sütun × 6 satır çıkar. Kalan boşluk kabin eklemeye yetmediği için boş bırakılır.',
      en: 'It calculates and applies the maximum number of cabinets that fit the wall:\n\n• columns = wall width ÷ cabinet width (whole number)\n• rows = wall height ÷ cabinet height (whole number)\n\nExample: on a 1 × 1 m wall with a 320 × 160 mm cabinet you get 3 columns × 6 rows. The remainder is left empty because it is too small for another cabinet.',
      ar: 'يحسب أكبر عدد من الخزانات التي تتسع للجدار ويطبّقه.',
    },
  },
  {
    id: 'curve',
    keys: {
      tr: ['kavis', 'kavisli', 'dışa kavisli', 'disa kavisli', 'içe kavisli', 'ice kavisli', 'konveks', 'konkav', 'bükülmüş', 'bük', 'eğri', 'yuvarlak ekran'],
      en: ['curve', 'curved', 'concave', 'convex'],
      ar: ['منحني', 'مقعر', 'محدب'],
    },
    q: {
      tr: 'Dışa ve içe kavisli farkı ne?',
      en: 'Convex vs concave — what is the difference?',
      ar: 'ما الفرق بين المحدب والمقعر؟',
    },
    a: {
      tr: '• Dışa kavisli (konveks): ekranın ortası izleyiciye doğru çıkıntı yapar. Ortadaki sütun bir yerine geniş bir alandan görünür; mağaza vitrini, sütun sarma gibi kullanımlar.\n\n• İçe kavisli (konkav): ekran izleyiciyi sarar, ortası geriye kaçar. Sinema, simülatör, toplantı odası gibi tek noktadan izlenen yerler için uygundur.\n\nHer iki durumda da kabin ölçüsü değişmez; ekran sadece bükülmüş görünür.',
      en: '• Convex: the centre of the screen bulges toward the viewer. Useful for shop windows or wrapping a column.\n\n• Concave: the screen wraps around the viewer, the centre recedes. Suits cinemas, simulators and meeting rooms viewed from one spot.\n\nIn both cases the cabinet size is unchanged; the screen only appears bent.',
      ar: '• محدب: يبرز وسط الشاشة نحو المشاهد.\n• مقعر: تحيط الشاشة بالمشاهد ويتراجع وسطها.',
    },
  },
  {
    id: 'curveAmount',
    keys: {
      tr: ['kavis miktarı', 'kavis miktari', 'kavis yüzdesi', 'kavis yuzdesi', 'yüzde kaç kavis', 'kavis açısı', 'kavis acisi', 'yay açısı', 'yay acisi', 'kavis barı', 'kaç derece'],
      en: ['curve amount', 'curve percentage', 'curve angle', 'arc angle', 'how many degrees'],
      ar: ['مقدار الانحناء', 'زاوية القوس'],
    },
    q: {
      tr: 'Kavis miktarındaki yüzde neyi ölçüyor?',
      en: 'What does the curve amount percentage measure?',
      ar: 'ماذا تقيس نسبة مقدار الانحناء؟',
    },
    a: {
      tr: 'Yüzde açıyı değil, kavisin DERİNLİĞİNİ (şişkinliğini) ölçer; açı ondan hesaplanır.\n\n• Derinlik = yüzde × ekran genişliği × tip oranı (dışa kavisli 0,16 — içe kavisli 0,13)\n• Derinlik ekran genişliğine oranlı olduğu için 3 kabinlik ve 12 kabinlik duvar aynı yüzdede aynı eğrilikte görünür.\n• %100 yarım daire demek değildir: dışa kavislide toplam yay ≈71°, içe kavislide ≈58°.\n\nKarşılıkları (dışa kavisli): %25 ≈ 18°, %50 ≈ 36°, %60 ≈ 43°, %100 ≈ 71°. Güncel açı barın altında yazar.',
      en: 'The percentage measures the DEPTH (bulge) of the curve, not the angle; the angle is derived from it.\n\n• Depth = percentage × screen width × type ratio (convex 0.16 — concave 0.13)\n• Because depth is proportional to screen width, a 3-cabinet and a 12-cabinet wall look equally curved at the same percentage.\n• 100% is not a half circle: the total arc is ≈71° for convex and ≈58° for concave.\n\nConvex equivalents: 25% ≈ 18°, 50% ≈ 36°, 60% ≈ 43°, 100% ≈ 71°. The current angle is shown under the slider.',
      ar: 'النسبة تقيس عمق الانحناء وليس الزاوية؛ الزاوية تُشتق منه. عند 100% يكون القوس ≈71° للمحدب و≈58° للمقعر، وتظهر الزاوية الحالية أسفل الشريط.',
    },
  },
  {
    id: 'lshape',
    keys: {
      tr: ['l tipi', 'l tip', 'köşe ekran', 'kose ekran', 'l şekli', 'köşe', 'köşeye', 'duvarın köşesi', 'iki duvar', 'monte'],
      en: ['l type', 'l shape', 'corner screen'],
      ar: ['نوع L', 'زاوية'],
    },
    q: {
      tr: 'İç L Tipi nedir?',
      en: 'What is Inner L-Type?',
      ar: 'ما هو النوع L الداخلي؟',
    },
    a: {
      tr: 'İki ekranın 90 derecelik bir köşe oluşturacak şekilde birleştirilmesidir. Odanın köşesine kurulan ekranlar için kullanılır.\n\nGörüntü iki kanada bölünür ve köşede kesintisiz devam eder. Kanatların sütun sayısı ayrı ayrı belirlenebilir; yani köşe ortada olmak zorunda değildir.',
      en: 'Two screens joined to form a 90° corner, used for screens installed in a room corner.\n\nThe image is split across the two wings and continues without a break at the corner. Each wing can have its own column count, so the corner need not be in the middle.',
      ar: 'شاشتان متصلتان بزاوية 90 درجة، تُستخدم لزوايا الغرف.',
    },
  },
  {
    id: 'ledvswall',
    keys: {
      tr: ['video duvarı', 'video duvari', 'led mi video mu', 'fark ne', 'hangisi', 'çerçeve', 'cerceve', 'bezel', 'lcd', 'panel arası çizgi', 'çizgi görünüyor', 'birleşim', 'hangisi daha iyi'],
      en: ['video wall', 'led vs', 'difference', 'bezel'],
      ar: ['جدار الفيديو', 'الفرق'],
    },
    q: {
      tr: 'LED ekran ile video duvarı farkı ne?',
      en: 'LED display vs video wall?',
      ar: 'ما الفرق بين شاشة LED وجدار الفيديو؟',
    },
    a: {
      tr: '• LED ekran: kabinler birleşince tek parça, kesintisiz bir yüzey oluşur. Çerçeve çizgisi yoktur.\n\n• Video duvarı: yan yana dizilmiş LCD panellerdir. Her panelin ince bir çerçevesi (bezel) vardır, görüntü bu çizgilerle bölünür. Çerçeve ne kadar inceyse (ör. 0,88 mm) o kadar iyidir.\n\nNot: Önizlemede çerçeve çizgileri gerçek ölçekte görünmeyecek kadar ince olduğu için 10 kat kalın çizilir; modeller arası oran korunur.',
      en: '• LED display: cabinets join into one seamless surface. No frame lines.\n\n• Video wall: LCD panels placed side by side. Each has a thin frame (bezel) that divides the image. The thinner the bezel (e.g. 0.88 mm) the better.\n\nNote: in the preview bezels are drawn 10× thicker because at true scale they would be invisible; the ratio between models is preserved.',
      ar: '• شاشة LED: سطح واحد بلا فواصل.\n• جدار الفيديو: شاشات LCD متجاورة لكل منها إطار رفيع.',
    },
  },
  {
    id: 'resolution',
    keys: {
      tr: ['çözünürlük', 'cozunurluk', 'fhd', 'uhd', '4k', '1080', 'kaç piksel', 'çözünürlük yeterli', 'netlik yeterli'],
      en: ['resolution', 'fhd', 'uhd', '4k'],
      ar: ['الدقة', 'وضوح'],
    },
    q: {
      tr: 'FHD ve UHD ne demek?',
      en: 'What do FHD and UHD mean?',
      ar: 'ماذا تعني FHD و UHD؟',
    },
    a: {
      tr: '• FHD (Full HD): 1920 × 1080 piksel, yaklaşık 2,1 milyon piksel. Halk arasında 1080p denir.\n\n• UHD (4K): 3840 × 2160 piksel, yaklaşık 8,3 milyon piksel — FHD\'nin tam 4 katı. Büyük ekranlarda daha keskin görüntü verir.\n\nBu ayar, ekrana gönderilecek sinyalin çözünürlüğüdür. Ekranın kendi piksel sayısı kabin sayısından hesaplanır ve Teknik Özellikler bölümünde ayrıca gösterilir.',
      en: '• FHD (Full HD): 1920 × 1080 pixels, about 2.1 million pixels — commonly called 1080p.\n\n• UHD (4K): 3840 × 2160 pixels, about 8.3 million — exactly four times FHD. Sharper on large screens.\n\nThis setting is the resolution of the signal sent to the screen. The screen\'s own pixel count comes from the cabinet count and is shown separately under Specifications.',
      ar: '• FHD: 1920 × 1080 بكسل.\n• UHD (4K): 3840 × 2160 بكسل، أي أربعة أضعاف FHD.',
    },
  },
  {
    id: 'brightness',
    keys: {
      tr: ['parlaklık', 'parlaklik', 'nit', 'ne kadar parlak', 'güneş', 'gunes', 'aydınlık', 'dışarıda', 'dış mekan', 'dis mekan', 'vitrin', 'karanlık', 'iç mekan'],
      en: ['brightness', 'nit', 'nits', 'sunlight'],
      ar: ['السطوع', 'نيت'],
    },
    q: {
      tr: 'Parlaklık (nit) ne anlama geliyor?',
      en: 'What does brightness (nit) mean?',
      ar: 'ماذا يعني السطوع (نيت)؟',
    },
    a: {
      tr: 'Nit, ekranın ne kadar ışık yaydığının ölçüsüdür. Kaba bir rehber:\n\n• 500–800 nit — kapalı mekân, kontrollü aydınlatma\n• 1.000–1.500 nit — pencereye bakan, gün ışığı alan iç mekân\n• 2.000 nit ve üzeri — dış mekân, doğrudan güneş\n\nGereğinden parlak ekran hem pahalıdır hem gözü yorar; ortamın ışığına göre seçilmelidir.',
      en: 'A nit measures how much light the screen emits. Rough guide:\n\n• 500–800 nits — indoor, controlled lighting\n• 1,000–1,500 nits — indoor facing a window, daylight\n• 2,000+ nits — outdoor, direct sun\n\nAn unnecessarily bright screen costs more and tires the eyes; match it to the ambient light.',
      ar: 'النيت وحدة قياس سطوع الشاشة. 500–800 للداخل، 2000+ للخارج تحت الشمس.',
    },
  },
  {
    id: 'sbox',
    keys: {
      tr: ['s-kutu', 's kutu', 'sbox', 'yedeklilik', 'yedekli', 'kontrolcü', 'denetleyici', 'arıza', 'bozulursa'],
      en: ['s-box', 'sbox', 'redundancy'],
      ar: ['صندوق', 'التكرار'],
    },
    q: {
      tr: 'S-Kutu yedekliliği nedir?',
      en: 'What is S-Box redundancy?',
      ar: 'ما هو تكرار الصندوق؟',
    },
    a: {
      tr: 'S-Kutu, ekranı süren denetleyici birimdir. Yedeklilik "Evet" seçilirse sisteme bir yedek S-Kutu daha eklenir.\n\nAsıl birim arızalanırsa yedek devreye girer ve ekran kararmaz. Havalimanı, hastane, canlı yayın gibi kesintiye tahammülü olmayan yerlerde tercih edilir. Maliyeti artırır.',
      en: 'The S-Box is the controller unit that drives the screen. Choosing redundancy "Yes" adds a spare S-Box.\n\nIf the main unit fails the spare takes over and the screen stays on. Preferred where downtime is unacceptable — airports, hospitals, live broadcast. It adds cost.',
      ar: 'الصندوق S هو وحدة التحكم بالشاشة. التكرار يضيف وحدة احتياطية تعمل عند العطل.',
    },
  },
  {
    id: 'refresh',
    keys: {
      tr: ['yenileme hızı', 'yenileme hizi', 'yenileme', 'hz', 'hertz', 'kamerayla çek', 'kamerayla cek', 'kameraya çek', 'kamerada titre', 'titreme', 'çekim', 'video çek', 'yayın', 'stüdyo', 'banding', 'titre'],
      en: ['refresh rate', 'hz', 'filming', 'on camera', 'flicker'],
      ar: ['معدل التحديث', 'هرتز'],
    },
    q: {
      tr: 'Yenileme hızı neden önemli?',
      en: 'Why does refresh rate matter?',
      ar: 'لماذا يهم معدل التحديث؟',
    },
    a: {
      tr: 'Ekranın saniyede kaç kez tazelendiğidir (Hz). Gözle bakarken 1.920 Hz yeterlidir.\n\nAma ekran KAMERAYLA çekilecekse yüksek değer şarttır: düşük yenileme hızında kamerada yatay bantlar ve titreme görünür. Canlı yayın, stüdyo ve sanal üretim için 3.840 Hz ve üzeri seçilir.',
      en: 'How many times per second the screen refreshes (Hz). For the naked eye 1,920 Hz is enough.\n\nBut if the screen will be filmed, a high value is essential: at low refresh rates cameras pick up horizontal banding and flicker. For live broadcast, studios and virtual production choose 3,840 Hz or above.',
      ar: 'عدد مرات تحديث الشاشة في الثانية. للتصوير بالكاميرا يلزم 3840 هرتز أو أعلى.',
    },
  },
  {
    id: 'power',
    keys: {
      tr: ['amper', 'sigorta', 'elektrik hattı', 'elektrik hatti', 'güç', 'guc', 'watt', 'elektrik', 'tüketim', 'tuketim', 'devre', 'ısı üretimi', 'ısınma', 'btu', 'kaç watt', 'sigorta', 'klima', 'soğutma', 'fatura'],
      en: ['power', 'watt', 'consumption', 'circuit', 'heat', 'btu'],
      ar: ['الطاقة', 'واط', 'استهلاك'],
    },
    q: {
      tr: 'Güç ve devre sayısı ne anlama geliyor?',
      en: 'What do power and circuit counts mean?',
      ar: 'ماذا تعني الطاقة وعدد الدوائر؟',
    },
    a: {
      tr: 'Teknik Özellikler bölümünde iki değer görürsünüz:\n\n• Maksimum — tüm ekran beyaz olduğunda çekilen güç. Elektrik tesisatı buna göre kurulur.\n• Tipik — normal içerikte ortalama tüketim, genelde maksimumun üçte biri kadardır.\n\nDevre sayısı, bu gücü taşımak için kaç ayrı elektrik hattı gerektiğini gösterir (%80 güvenlik payıyla hesaplanır). Isı değeri (BTU) ise klima ihtiyacını planlamak içindir.',
      en: 'Under Specifications you see two values:\n\n• Maximum — draw when the whole screen is white. Wiring is sized for this.\n• Typical — average draw with normal content, usually about a third of maximum.\n\nThe circuit count shows how many separate electrical lines are needed (calculated with a 20% safety margin). The heat figure (BTU) helps plan air conditioning.',
      ar: 'الحد الأقصى للطاقة عند الشاشة البيضاء بالكامل، والنموذجي هو المتوسط في المحتوى العادي.',
    },
  },
  {
    id: 'model',
    keys: {
      tr: ['hangi model', 'ne önerirsin', 'ne onerirsin', 'hangisini seç', 'hangisini sec', 'hangisini almalı', 'tavsiye', 'öneri', 'toplantı odası', 'toplanti odasi', 'mağaza', 'magaza', 'lobi', 'salon', 'hangi modeli'],
      en: ['which model', 'recommend', 'suggestion', 'meeting room', 'which one'],
      ar: ['أي طراز', 'توصية'],
    },
    q: { tr: 'Hangi modeli seçmeliyim?', en: 'Which model should I choose?', ar: 'أي طراز أختار؟' },
    a: {
      tr: 'Model seçimini belirleyen ana ölçüt İZLEME MESAFESİDİR. Kaba bir rehber:\n\n• 2–3 m (toplantı odası, lobi) → P1.25\n• 3–4 m (mağaza, orta boy salon) → P1.6\n• 5 m ve üzeri (büyük salon, sahne) → P2.0 ve üzeri\n\nGereğinden küçük piksel aralığı boşuna maliyettir; izleyici farkı göremez.\n\nKesin öneri için satış ekibiyle görüşün — mekân ışığı ve bütçe de etkiler.',
      en: 'The main criterion is VIEWING DISTANCE. Rough guide:\n\n• 2–3 m (meeting room, lobby) → P1.25\n• 3–4 m (retail, mid-size hall) → P1.6\n• 5 m and beyond (large hall, stage) → P2.0 or larger\n\nA finer pitch than needed is wasted money — the viewer cannot tell.\n\nFor a firm recommendation talk to sales; ambient light and budget matter too.',
      ar: 'المعيار الأساسي هو مسافة المشاهدة: 2–3 م → P1.25، 3–4 م → P1.6، 5 م فأكثر → P2.0.',
    },
  },
  {
    id: 'weight',
    keys: {
      tr: ['ağırlık', 'agirlik', 'kaç kilo', 'kac kilo', 'ne kadar ağır', 'duvar taşır', 'duvar tasir', 'ağırlığı'],
      en: ['weight', 'how heavy', 'load bearing'],
      ar: ['الوزن', 'كم كيلو'],
    },
    q: { tr: 'Ekran ne kadar ağır olur?', en: 'How heavy is the screen?', ar: 'كم تزن الشاشة؟' },
    a: {
      tr: 'Toplam ağırlık = kabin sayısı × kabin ağırlığı. Teknik Özellikler bölümünde "Ağırlık (Sadece Dolaplar)" satırında görürsünüz.\n\nDikkat: bu değer YALNIZCA kabinlerindir. Montaj çerçevesi, askı sistemi ve kablolama dâhil değildir; gerçek yük daha yüksektir.\n\nDuvarın bu yükü taşıyıp taşımayacağı mutlaka kontrol edilmelidir — özellikle alçıpan duvarlarda takviye gerekir.',
      en: 'Total weight = cabinet count × cabinet weight. See "Weight (Cabinets Only)" under Specifications.\n\nNote: this covers ONLY the cabinets. Mounting frame, rigging and cabling are excluded, so the real load is higher.\n\nAlways verify the wall can carry it — drywall in particular needs reinforcement.',
      ar: 'الوزن الكلي = عدد الخزانات × وزن الخزانة. لا يشمل إطار التركيب والكابلات.',
    },
  },
  {
    id: 'quote',
    keys: {
      tr: ['teklif', 'fiyat', 'kaç para', 'kac para', 'maliyet', 'ücret', 'ucret', 'satın al', 'satin al', 'sipariş', 'siparis'],
      en: ['quote', 'price', 'cost', 'how much', 'buy', 'order'],
      ar: ['عرض سعر', 'السعر', 'التكلفة'],
    },
    q: { tr: 'Fiyat ve teklif nasıl alınır?', en: 'How do I get pricing and a quote?', ar: 'كيف أحصل على السعر وعرض السعر؟' },
    a: {
      tr: `Fiyatlar; model, adet, montaj koşulları ve güncel kura göre proje bazında belirlenir. Bu konu için lütfen bizimle iletişime geçin:\n\n${ILETISIM_TR}\n\nDilerseniz yapılandırmanızı tamamlayıp "PDF olarak dışa aktar" düğmesiyle teklif talebi de gönderebilirsiniz.`,
      en: `Prices are set per project, based on model, quantity, installation conditions and current exchange rates. Please get in touch with us:\n\n${ILETISIM_EN}\n\nYou can also finish your configuration and use "Export as PDF" to send a quote request.`,
      ar: `تُحدَّد الأسعار حسب المشروع. يُرجى التواصل معنا:\n\n${ILETISIM_EN}`,
    },
  },
  {
    id: 'contact',
    keys: {
      tr: ['iletişim', 'iletisim', 'telefon', 'numara', 'arayabilir', 'mail', 'eposta', 'e-posta', 'mail adresi', 'adres', 'adresiniz', 'nerdesiniz', 'neredesiniz', 'ofis', 'ulaş', 'ulas', 'bize ulaş'],
      en: ['contact', 'phone', 'email', 'address', 'where are you', 'office', 'reach you'],
      ar: ['اتصال', 'هاتف', 'بريد', 'عنوان'],
    },
    q: { tr: 'Size nasıl ulaşabilirim?', en: 'How can I reach you?', ar: 'كيف يمكنني الوصول إليكم؟' },
    a: {
      tr: 'Masaüstü Bilişim Teknolojileri\n\n☎ (0216) 415 52 52\n📱 (0532) 451 99 00\n✉ info@masaustutasarim.com.tr\n\n📍 İnönü Mah., Kayışdağı Cd. No: 198/A\n    34750 Ataşehir / İstanbul\n\n🌐 masaustubilisim.com.tr',
      en: 'Masaüstü Bilişim Teknolojileri\n\n☎ +90 216 415 52 52\n📱 +90 532 451 99 00\n✉ info@masaustutasarim.com.tr\n\n📍 İnönü Mah., Kayışdağı Cd. No: 198/A\n    34750 Ataşehir / İstanbul\n\n🌐 masaustubilisim.com.tr',
      ar: 'Masaüstü Bilişim Teknolojileri\n\n☎ ‎+90 216 415 52 52\n📱 ‎+90 532 451 99 00\n✉ info@masaustutasarim.com.tr\n\n📍 Ataşehir / İstanbul',
    },
  },
  {
    id: 'company',
    keys: {
      tr: ['kiosk', 'dijital tabela', 'signage', 'menü panosu', 'menu panosu', 'menu board', 'tabela', 'masaüstü', 'masaustu', 'firma', 'şirket', 'sirket', 'hakkınızda', 'hakkinizda', 'kimsiniz', 'ne iş yapıyorsunuz', 'ne is yapiyorsunuz', 'hizmetler', 'ürünler', 'urunler', 'neler satıyorsunuz'],
      en: ['about', 'company', 'who are you company', 'services', 'products', 'what do you sell'],
      ar: ['الشركة', 'عن الشركة', 'الخدمات', 'المنتجات'],
    },
    q: { tr: 'Firma hangi ürün ve hizmetleri sunuyor?', en: 'What products and services do you offer?', ar: 'ما المنتجات والخدمات التي تقدمونها؟' },
    a: {
      tr: 'Masaüstü Bilişim Teknolojileri — "İşinizin Dijital Yüzü".\n\nÜrünler:\n• LED ekranlar (LED küp ekran, LED tünel ekran, ayaklı poster LED ekran)\n• Video duvarı\n• Dijital tabela (digital signage)\n• Dijital menü panosu\n• Kiosk\n\nHizmetler:\n• Danışmanlık\n• Sistem kurulumu\n• İzleme ve yönetim\n• Teknik destek\n• Eğitim\n• Yazılım çözümleri\n\nAyrıntı için: masaustubilisim.com.tr',
      en: 'Masaüstü Bilişim Teknolojileri — "The Digital Face of Your Business".\n\nProducts:\n• LED displays (LED cube, LED tunnel, standing poster LED)\n• Video wall\n• Digital signage\n• Digital menu board\n• Kiosk\n\nServices:\n• Consulting\n• System installation\n• Monitoring and management\n• Technical support\n• Training\n• Software solutions\n\nMore at masaustubilisim.com.tr',
      ar: 'Masaüstü Bilişim Teknolojileri: شاشات LED، جدران الفيديو، اللافتات الرقمية، قوائم الطعام الرقمية، الأكشاك، وخدمات التركيب والدعم والتدريب.',
    },
  },
  {
    id: 'usage',
    keys: {
      tr: ['teknik özellik', 'teknik ozellik', 'özellikler nerede', 'ozellikler nerede', 'pdf', 'nereden iner', 'nasıl indiririm', 'nasil indiririm', 'çıktı', 'cikti', 'dışa aktar', 'disa aktar', 'kaydet', 'nereden bakarım'],
      en: ['pdf', 'download', 'export', 'where is'],
      ar: ['بي دي اف', 'تنزيل', 'تصدير'],
    },
    q: { tr: 'PDF çıktılarını nereden alırım?', en: 'Where do I get the PDF outputs?', ar: 'من أين أحصل على ملفات PDF؟' },
    a: {
      tr: 'Sağ panelin altındaki "PDF Raporu Al" düğmesini kullanın. Raporda teklif/özet, teknik özellikler tablosu (güç, ağırlık, RJ45, işlemci) ve ölçülü yapılandırma görseli yer alır; kamerada veya AR\u2019da kaydettiğiniz kareler de eklenir.',
      en: 'Use "Get PDF report" at the bottom of the right panel. It contains the quote/summary, the specifications table (power, weight, RJ45, processor) and a dimensioned configuration drawing; frames you saved in camera or AR mode are appended too.',
      ar: 'استخدم زر تنزيل تقرير PDF الاحترافي أسفل اللوحة اليمنى. مستند واحد: الملخص أعلى والجدول التقني أسفل.',
    },
  },
  {
    id: 'install',
    keys: {
      tr: ['kurulum', 'montaj', 'nasıl monte', 'nasil monte', 'kim kurar', 'servis', 'bakım', 'bakim', 'garanti'],
      en: ['installation', 'mounting', 'who installs', 'service', 'warranty', 'maintenance'],
      ar: ['التركيب', 'الضمان', 'الصيانة'],
    },
    q: { tr: 'Kurulum ve garanti nasıl?', en: 'Installation and warranty?', ar: 'ماذا عن التركيب والضمان؟' },
    a: {
      tr: `Kurulum, servis ve garanti şartları projeye göre belirlenir. Bu konular için lütfen bizimle iletişime geçin:\n\n${ILETISIM_TR}\n\nBir not: modelin "Hizmet" bilgisi (ön/arka erişim) bakımın hangi yönden yapılacağını belirtir; dar alanlarda ön erişimli modeller tercih edilir.`,
      en: `Installation, service and warranty terms are set per project. Please get in touch with us for these:\n\n${ILETISIM_EN}\n\nOne note: the "Service" attribute (front/rear access) indicates from which side maintenance is done; front-service models suit tight spaces.`,
      ar: `تُحدَّد شروط التركيب والصيانة والضمان حسب المشروع. يُرجى التواصل معنا:\n\n${ILETISIM_EN}`,
    },
  },
  /* ------------------------------------------------------------------
   * UYGULAMAYI KULLANMA
   * Aşağıdaki konular ürünü değil, bu ekranı anlatır: hangi düğme ne yapar.
   * Gelen soruların çoğu "şu özelliği nasıl kullanırım" oluyordu ve yardımcı
   * bunların hiçbirini bilmiyordu.
   * ------------------------------------------------------------------ */
  {
    id: 'camera',
    keys: {
      tr: ['galeri', 'galeriye', 'fotoğraflara kaydet', 'fotograflara kaydet', 'kamera', 'kameray', 'kamera özelliği', 'kamera ozelligi', 'nasıl görüneceğini gör', 'nasil gorunecegini gor', 'duvarımda gör', 'duvarimda gor', 'odamda gör', 'odamda gor', 'fotoğrafta gör', 'fotografta gor', 'canlı önizleme', 'canli onizleme', 'gerçek mekân', 'gercek mekan', 'telefonun kamerası'],
      en: ['camera', 'see how it will look', 'see it on my wall', 'in my room', 'live preview'],
      ar: ['الكاميرا', 'في غرفتي', 'على جداري'],
    },
    q: { tr: 'Ekranı kendi duvarımda nasıl görürüm?', en: 'How do I see the screen on my own wall?', ar: 'كيف أرى الشاشة على جداري؟' },
    a: {
      tr: '"Nasıl görüneceğini gör" düğmesi telefonunuzun/bilgisayarınızın kamerasını açar ve ekranı gerçek görüntünün üzerine yerleştirir.\n\nNasıl kullanılır:\n1) Kamerayı duvara doğrultun.\n2) Ekranın durmasını istediğiniz yere dokunun — tasarım oraya yerleşir.\n3) Parmakla sürükleyerek taşıyın, iki parmakla büyütüp küçültün. İsterseniz "Konumlandır" tuş takımıyla ok tuşlarını kullanın.\n4) "Sıfırla" ilk hâline döndürür.\n5) "Kaydet" o kareyi telefonunuza indirir VE PDF raporuna ekler.\n\nÖlçü etiketleri tasarımın dışında durur, böylece ekranı kapatmaz.',
      en: '"See how it will look" opens your camera and places the screen over the live image.\n\nHow to use it:\n1) Point the camera at the wall.\n2) Tap where you want the screen — the design lands there.\n3) Drag with one finger to move it, pinch with two to resize. Or use the "Position" keypad arrows.\n4) "Reset" returns to the starting state.\n5) "Save" downloads that frame to your phone AND adds it to the PDF report.\n\nMeasurement labels sit outside the design so they never cover the screen.',
      ar: 'زر «شاهد كيف سيبدو» يفتح الكاميرا ويضع الشاشة فوق الصورة الحية: انقر لتحديد المكان، اسحب بإصبع للتحريك، وبإصبعين للتكبير. «حفظ» ينزّل اللقطة ويضيفها إلى تقرير PDF.',
    },
  },
  {
    id: 'ar',
    keys: {
      tr: ['ar modu', 'ar görünümü', 'ar nasıl', 'ar nasil', 'ar nasl', 'ar calis', 'ar çalış', 'artırılmış gerçeklik', 'artirilmis gerceklik', "ar'da gör", 'arda gor', 'ar özelliği', 'ar ozelligi', 'odama koy', 'gerçek boyutta gör', 'gercek boyutta gor', 'quick look', 'scene viewer'],
      en: ['augmented reality', 'view in ar', 'ar mode', 'place in my room', 'real size'],
      ar: ['الواقع المعزز', 'ضعها في غرفتي'],
    },
    q: { tr: 'AR (artırılmış gerçeklik) nasıl çalışır?', en: 'How does AR work?', ar: 'كيف يعمل الواقع المعزز؟' },
    a: {
      tr: '"3D Görünüm" penceresindeki "AR\u2019da Gör" düğmesi ekranı GERÇEK BOYUTUNDA odanıza yerleştirir. Kameradan farkı: ekran mekâna sabitlenir, siz etrafında dolaşabilir, yanından ve arkasından bakabilirsiniz.\n\nNasıl kullanılır:\n1) Ekranın duracağı yere dokunun.\n2) Parmakla sürükleyin, iki parmakla döndürüp yakınlaştırın; ok tuşları ve "Sıfırla" da vardır.\n3) "Kaydet" o kareyi indirir ve PDF raporuna ekler.\n\nTelefonunuz AR desteklemiyorsa 3D görünüm yine çalışır; ekranı döndürerek her yönden inceleyebilirsiniz.\n\nEn iyi sonuç için: aydınlık bir ortam ve düz bir zemin/duvar.',
      en: 'The "View in AR" button inside "3D View" places the screen in your room AT REAL SIZE. Unlike the camera view, it is anchored to the room — you can walk around it and look from the side or behind.\n\nHow to use it:\n1) Tap where the screen should stand.\n2) Drag with one finger, use two fingers to rotate and zoom; arrow keys and "Reset" are there too.\n3) "Save" downloads the frame and adds it to the PDF report.\n\nIf your phone has no AR support the 3D view still works and can be rotated freely.\n\nFor best results: good lighting and a flat floor or wall.',
      ar: 'زر «عرض بالواقع المعزز» داخل «العرض ثلاثي الأبعاد» يضع الشاشة بحجمها الحقيقي في غرفتك: انقر لتحديد المكان، اسحب للتحريك، وبإصبعين للتدوير والتقريب. «حفظ» يضيف اللقطة إلى تقرير PDF.',
    },
  },
  {
    id: 'view3d',
    keys: {
      tr: ['3d', '3 boyut', 'üç boyut', 'uc boyut', '3d görünüm', '3d gorunum', 'döndürerek bak', 'dondurerek bak', 'yandan bak', 'arkadan bak'],
      en: ['3d', '3d view', 'rotate', 'look from the side'],
      ar: ['ثلاثي الأبعاد', 'تدوير'],
    },
    q: { tr: '3D Görünüm ne işe yarar?', en: 'What is the 3D View for?', ar: 'ما فائدة العرض ثلاثي الأبعاد؟' },
    a: {
      tr: 'Tasarımınızı üç boyutlu, döndürülebilir bir model olarak gösterir. Fare veya parmakla çevirip yakınlaştırabilirsiniz.\n\nÖzellikle kavisli ekranlarda işe yarar: kavisin gerçekte ne kadar büküldüğü düz önizlemede tam anlaşılmaz.\n\nAynı pencereden "AR\u2019da Gör" ile ekranı gerçek boyutunda odanıza taşıyabilirsiniz.',
      en: 'It shows your design as a rotatable 3D model — spin and zoom it with the mouse or your fingers.\n\nIt is most useful for curved screens: the flat preview cannot fully convey how much the screen actually bends.\n\nFrom the same window "View in AR" places the screen in your room at real size.',
      ar: 'يعرض التصميم كنموذج ثلاثي الأبعاد قابل للتدوير، وهو مفيد خصوصًا للشاشات المنحنية. ومن النافذة نفسها يمكن فتح الواقع المعزز.',
    },
  },
  {
    id: 'content',
    keys: {
      tr: ['içerik', 'icerik', 'kendi görselim', 'kendi gorselim', 'resim ekle', 'fotoğraf ekle', 'fotograf ekle', 'video ekle', 'görsel yükle', 'gorsel yukle', 'logo koy', 'örnek görüntü', 'ornek goruntu', 'örnek video', 'ornek video', 'ne gösterir', 'ekranda ne'],
      en: ['content', 'add image', 'add video', 'upload image', 'my own image', 'sample image', 'sample video', 'logo'],
      ar: ['المحتوى', 'إضافة صورة', 'إضافة فيديو', 'رفع صورة'],
    },
    q: { tr: 'Ekranda kendi görselimi gösterebilir miyim?', en: 'Can I show my own image on the screen?', ar: 'هل يمكنني عرض صورتي على الشاشة؟' },
    a: {
      tr: 'Evet. Sağ paneldeki "İçerik" bölümünden seçersiniz:\n\n• LED EKRAN — boş panel dokusu (ekranın kendisi görünsün diye)\n• ÖRNEK GÖRÜNTÜ / ÖRNEK VİDEO — hazır içerik\n• Resim Ekle / Video Ekle — kendi dosyanız\n• Resim Yok — boş çerçeve\n\nGörsel için JPG veya PNG, en fazla 3 MB.\n\nSeçtiğiniz içerik önizlemede, 3D görünümde ve AR\u2019da da görünür — çoklu ekranda tek görsel tüm duvara yayılır.',
      en: 'Yes. Use the "Content" section in the right panel:\n\n• LED SCREEN — bare panel texture (to show the screen itself)\n• SAMPLE IMAGE / SAMPLE VIDEO — ready-made content\n• Add Image / Add Video — your own file\n• No Image — empty frame\n\nImages: JPG or PNG, up to 3 MB.\n\nWhatever you pick also appears in the 3D view and in AR — in multi-screen mode one image spreads across the whole wall.',
      ar: 'نعم. من قسم «المحتوى» في اللوحة اليمنى: نسيج LED، صورة/فيديو تجريبي، أو ملفك الخاص (JPG/PNG حتى 3 ميغابايت). يظهر المحتوى أيضًا في العرض ثلاثي الأبعاد والواقع المعزز.',
    },
  },
  {
    id: 'venue',
    keys: {
      tr: ['mekân', 'mekan', 'iç mekân', 'ic mekan', 'dış mekân', 'dis mekan', 'arka plan', 'salon görünümü', 'salon gorunumu', 'ortam', 'sahne arkası'],
      en: ['venue', 'indoor', 'outdoor', 'background', 'environment', 'scene'],
      ar: ['المكان', 'داخلي', 'خارجي', 'الخلفية'],
    },
    q: { tr: '"Mekân" seçeneği ne yapar?', en: 'What does the "Venue" option do?', ar: 'ماذا يفعل خيار «المكان»؟' },
    a: {
      tr: 'Ekranı beyaz duvar yerine örnek bir ortamın içinde gösterir: "İç mekân" (salon/lobi) veya "Dış mekân". "Kapalı" seçilirse sade beyaz duvara döner.\n\nAmacı ölçek hissi vermektir — ekranın gerçek bir mekânda ne kadar yer kapladığını görürsünüz. Ölçüler her iki durumda da doğrudur.\n\nKendi mekânınızda görmek isterseniz kamera veya AR özelliğini kullanın.',
      en: 'It shows the screen inside a sample environment — "Indoor" (hall/lobby) or "Outdoor" — instead of a plain white wall. "Off" returns to the white wall.\n\nThe point is a sense of scale: you see how much room the screen takes up in a real space. Dimensions stay accurate either way.\n\nTo see it in your OWN space, use the camera or AR feature.',
      ar: 'يعرض الشاشة داخل بيئة نموذجية (داخلية أو خارجية) بدل الجدار الأبيض، لإعطاء إحساس بالحجم. ولرؤيتها في مكانك الفعلي استخدم الكاميرا أو الواقع المعزز.',
    },
  },
  {
    id: 'human',
    keys: {
      tr: ['insan', 'siluet', 'silüet', 'adam', 'figür', 'figur', 'yanındaki kişi', 'yanindaki kisi', 'boy', 'insan neden', 'insan kayboldu', 'insan görünmüyor', 'insan gorunmuyor'],
      en: ['human', 'silhouette', 'figure', 'person', 'scale reference'],
      ar: ['الشخص', 'الظل البشري', 'مرجع الحجم'],
    },
    q: { tr: 'Ekranın yanındaki insan figürü nedir?', en: 'What is the human figure next to the screen?', ar: 'ما هو الشكل البشري بجانب الشاشة؟' },
    a: {
      tr: 'Ölçek referansıdır: 1,80 m boyunda bir kişiyi temsil eder ve duvarla aynı ölçekte çizilir. Ekranın gerçekte ne kadar büyük olduğunu tek bakışta anlamanızı sağlar.\n\nDuvar yüksekliği 1,80 m\u2019nin altındaysa figür gizlenir — duvara sığmadığı için ölçüyü yanıltıcı gösterirdi.\n\nPDF raporundaki yapılandırma görselinde de aynı figür, aynı ölçekte yer alır.',
      en: 'It is a scale reference: a 1.80 m tall person, drawn at the same scale as the wall, so you can judge the real size of the screen at a glance.\n\nIf the wall is shorter than 1.80 m the figure is hidden — it would no longer fit and would misrepresent the scale.\n\nThe same figure, at the same scale, appears on the configuration page of the PDF report.',
      ar: 'مرجع للحجم: شخص بطول 1.80 م مرسوم بنفس مقياس الجدار. يُخفى إذا كان ارتفاع الجدار أقل من 1.80 م. ويظهر أيضًا في تقرير PDF.',
    },
  },
  {
    id: 'measures',
    keys: {
      tr: ['ölçüleri gizle', 'olculeri gizle', 'ölçüleri göster', 'olculeri goster', 'ölçü çizgileri', 'olcu cizgileri', 'kotalar', 'etiketler', 'metreler görünmesin'],
      en: ['hide measurements', 'show measurements', 'dimension lines', 'labels'],
      ar: ['إخفاء القياسات', 'إظهار القياسات'],
    },
    q: { tr: 'Ölçü etiketlerini kapatabilir miyim?', en: 'Can I turn the measurement labels off?', ar: 'هل يمكن إخفاء القياسات؟' },
    a: {
      tr: 'Evet. Üst çubuktaki "Ölçüleri gizle" düğmesi tüm ölçü etiketlerini ve kılavuz çizgilerini kaldırır; aynı düğme "Ölçüleri göster" olarak geri açar.\n\nSunum yaparken ya da ekran görüntüsü alırken sade bir görüntü için kullanışlıdır. Ölçüler gizliyken de tasarım aynı kalır, hiçbir değer değişmez.',
      en: 'Yes. "Hide measurements" in the top bar removes every dimension label and guide line; the same button then reads "Show measurements".\n\nHandy for a clean look when presenting or taking a screenshot. Hiding them changes nothing in the design itself.',
      ar: 'نعم، زر «إخفاء القياسات» في الشريط العلوي يزيل جميع الأبعاد وخطوط الاسترشاد، والزر نفسه يعيدها. لا يتغير التصميم.',
    },
  },
  {
    id: 'reset',
    keys: {
      tr: ['sıfırla', 'sifirla', 'baştan başla', 'bastan basla', 'temizle', 'yeni tasarım', 'yeni tasarim', 'her şeyi sil'],
      en: ['reset', 'start over', 'clear', 'new design'],
      ar: ['إعادة تعيين', 'البدء من جديد'],
    },
    q: { tr: 'Tasarımı nasıl sıfırlarım?', en: 'How do I reset the design?', ar: 'كيف أعيد ضبط التصميم؟' },
    a: {
      tr: 'Üst çubuktaki "Sıfırla" düğmesi her şeyi başlangıç hâline döndürür; yanlışlıkla basmayasınız diye onay ister.\n\nSayfayı YENİLEMEK de tasarımı sıfırlar. Buna karşılık tarayıcının geri tuşuna basmak çalışmanızı silmez — geri dönüp tekrar geldiğinizde tasarımınız yerinde durur.',
      en: 'The "Reset" button in the top bar returns everything to its starting state and asks for confirmation first.\n\nRELOADING the page also resets the design. Pressing the browser back button, however, does not wipe your work — come back and your design is still there.',
      ar: 'زر «إعادة تعيين» في الشريط العلوي يعيد كل شيء إلى البداية بعد تأكيد. تحديث الصفحة يعيد الضبط أيضًا، أما زر الرجوع في المتصفح فلا يمسح عملك.',
    },
  },
  {
    id: 'account',
    keys: {
      tr: ['hesap', 'kayıt ol', 'kayit ol', 'üye ol', 'uye ol', 'giriş yap', 'giris yap', 'oturum', 'şifre', 'sifre', 'parola', 'bayi', 'yeni kayıt', 'hesap aç'],
      en: ['account', 'sign up', 'register', 'log in', 'login', 'password', 'dealer'],
      ar: ['حساب', 'تسجيل', 'دخول', 'كلمة المرور'],
    },
    q: { tr: 'Hesap açmam gerekir mi?', en: 'Do I need an account?', ar: 'هل أحتاج إلى حساب؟' },
    a: {
      tr: 'Tasarım yapmak, PDF almak ve AR/kamera özelliklerini kullanmak için hesap GEREKMEZ; misafir olarak her şeyi kullanabilirsiniz.\n\nHesap açarsanız projeleriniz ve teklifleriniz kaydedilir; sonra tekrar açıp kaldığınız yerden devam edebilirsiniz.\n\nAçmak için: profil menüsü → "Yeni kayıt" → e-posta ve parola → "Hesap aç". Bayi hesabı olarak açılır ve kayıtlarınızı yalnızca siz görürsünüz.',
      en: 'You do NOT need an account to design, get a PDF or use the camera/AR features — everything works as a guest.\n\nWith an account your projects and quotes are saved, so you can reopen them and carry on where you left off.\n\nTo create one: profile menu → "Sign up" → e-mail and password → "Create account". It is created as a dealer account and only you can see your own records.',
      ar: 'لا حاجة لحساب للتصميم أو تنزيل PDF أو استخدام الكاميرا والواقع المعزز. لكن الحساب يحفظ مشاريعك وعروضك: من قائمة الملف الشخصي ← «حساب جديد» ← البريد وكلمة المرور.',
    },
  },
  {
    id: 'myquotes',
    keys: {
      tr: ['tekliflerim', 'kayıtlı proje', 'kayitli proje', 'eski tasarım', 'eski tasarim', 'eski proje', 'projeme devam', 'devam ed', 'devam et', 'düzenle', 'duzenle', 'geçmiş', 'gecmis', 'projelerim'],
      en: ['my quotes', 'saved project', 'previous design', 'continue', 'edit', 'history'],
      ar: ['عروض أسعاري', 'مشروع محفوظ', 'متابعة', 'تعديل'],
    },
    q: { tr: 'Eski bir tasarıma nasıl devam ederim?', en: 'How do I continue an earlier design?', ar: 'كيف أتابع تصميمًا سابقًا؟' },
    a: {
      tr: 'Profil menüsünden "Tekliflerim"i açın. Her kaydın yanında iki seçenek vardır:\n\n• Görüntüle — teklifin detaylarını okur.\n• Düzenle — tasarımı OLDUĞU GİBİ geri yükler ve yapılandırma ekranına döner; kaldığınız yerden devam edersiniz.\n\nModel, duvar ölçüleri, ekran türü, kavis, çoklu ekran düzeni — hepsi birebir geri gelir. Yalnızca kendi yüklediğiniz görsel/video geri gelmez, onu yeniden eklemeniz gerekir.',
      en: 'Open "My quotes" from the profile menu. Each record has two options:\n\n• View — read the quote details.\n• Edit — restores the design EXACTLY as it was and returns to the configurator, so you can carry on.\n\nModel, wall size, screen type, curve, multi-screen layout — all come back identically. Only your own uploaded image/video is not restored; add it again.',
      ar: 'من قائمة الملف الشخصي افتح «عروض أسعاري»: زر «عرض» لقراءة التفاصيل، وزر «تعديل» يستعيد التصميم كما كان لمتابعة العمل. الصورة أو الفيديو الذي رفعته يحتاج إلى إعادة إضافة.',
    },
  },
  {
    id: 'pdfcontent',
    keys: {
      tr: ['raporda ne var', 'pdf raporunda', 'rapor ne içerir', 'pdf içinde ne', 'pdf icinde ne', 'rapor içeriği', 'rapor icerigi', 'kaç sayfa', 'kac sayfa', 'pdfte görsel', 'pdfte gorsel', 'rapora fotoğraf'],
      en: ['what is in the report', 'pdf contents', 'how many pages', 'photo in pdf'],
      ar: ['محتوى التقرير', 'كم صفحة'],
    },
    q: { tr: 'PDF raporunun içinde ne var?', en: 'What is inside the PDF report?', ar: 'ماذا يحتوي تقرير PDF؟' },
    a: {
      tr: 'Rapor en az iki sayfadır:\n\n1) Teklif/özet + teknik özellikler tablosu (güç, ağırlık, RJ45, işlemci).\n2) Yapılandırma görseli — ekranın şeması, ölçüleri ve yanında 1,80 m\u2019lik insan figürü.\n\nBunlara ek olarak: kamerada veya AR\u2019da "Kaydet" dediğiniz her kare, rapora ayrı bir "Mekânda Görünüm" sayfası olarak eklenir (en fazla 6 kare).\n\nElinizde kare varken yenisini kaydederseniz size sorulur: hepsi kalsın · yalnızca bu kalsın · bunu ekleme.\n\nRaporu "PDF Raporu Al" düğmesiyle alırsınız.',
      en: 'The report is at least two pages:\n\n1) Quote/summary + specifications table (power, weight, RJ45, processor).\n2) Configuration drawing — the screen layout, its dimensions and a 1.80 m human figure beside it.\n\nOn top of that, every frame you "Save" in camera or AR mode is added as its own "In your space" page (up to 6 frames).\n\nIf frames already exist, saving another one asks you what to do: keep all · keep only this one · do not add it.\n\nGet it with the "Get PDF report" button.',
      ar: 'التقرير صفحتان على الأقل: الملخص وجدول المواصفات، ثم رسم التكوين مع القياسات وشخص بطول 1.80 م. وتُضاف كل لقطة حفظتها في الكاميرا أو الواقع المعزز كصفحة مستقلة (حتى 6 لقطات).',
    },
  },
  {
    id: 'lang',
    keys: {
      tr: ['dil', 'ingilizce', 'arapça', 'arapca', 'türkçe', 'turkce', 'language', 'dili değiştir', 'dili degistir'],
      en: ['language', 'english', 'arabic', 'turkish', 'change language'],
      ar: ['اللغة', 'العربية', 'الإنجليزية', 'تغيير اللغة'],
    },
    q: { tr: 'Dili değiştirebilir miyim?', en: 'Can I change the language?', ar: 'هل يمكنني تغيير اللغة؟' },
    a: {
      tr: 'Evet. Üst çubuktaki bayrak/dil düğmesinden Türkçe, İngilizce ve Arapça arasında geçiş yapabilirsiniz. Arapçada arayüz sağdan sola döner.\n\nDil seçiminiz hatırlanır ve bu yardımcı da seçtiğiniz dilde cevap verir.',
      en: 'Yes. Use the flag/language button in the top bar to switch between Turkish, English and Arabic. In Arabic the interface flips to right-to-left.\n\nYour choice is remembered, and this assistant answers in the language you picked.',
      ar: 'نعم، من زر اللغة في الشريط العلوي: التركية والإنجليزية والعربية. في العربية تنقلب الواجهة من اليمين إلى اليسار، ويُحفظ اختيارك.',
    },
  },
  {
    id: 'theme',
    keys: {
      tr: ['koyu tema', 'karanlık mod', 'karanlik mod', 'gece modu', 'açık tema', 'acik tema', 'tema'],
      en: ['dark mode', 'dark theme', 'light mode', 'theme'],
      ar: ['الوضع الداكن', 'السمة'],
    },
    q: { tr: 'Koyu tema var mı?', en: 'Is there a dark theme?', ar: 'هل يوجد وضع داكن؟' },
    a: {
      tr: 'Evet. Üst çubuktaki ay/güneş düğmesi açık ve koyu tema arasında geçiş yapar; seçiminiz hatırlanır.\n\nKoyu tema loş ortamlarda ve sunumlarda göz yormaz. Ekran önizlemesi ve ölçüler her iki temada da aynı doğrulukta görünür.',
      en: 'Yes. The moon/sun button in the top bar switches between light and dark, and your choice is remembered.\n\nDark mode is easier on the eyes in dim rooms and during presentations. The preview and its dimensions read equally well in both.',
      ar: 'نعم، زر القمر/الشمس في الشريط العلوي يبدّل بين الوضع الفاتح والداكن، ويُحفظ اختيارك.',
    },
  },
  {
    id: 'wizard',
    keys: {
      tr: ['sihirbaz', 'bilmiyorum', 'hangi modeli seçeceğimi', 'hangi modeli secegimi', 'yardım et seç', 'karar veremiyorum', 'nereden başlamalı', 'nereden baslamali', 'filtre', 'karşılaştır', 'karsilastir'],
      en: ['wizard', 'i do not know which model', 'help me choose', 'where do i start', 'filter', 'compare'],
      ar: ['المعالج', 'ساعدني في الاختيار', 'من أين أبدأ', 'مقارنة'],
    },
    q: { tr: 'Hangi modeli seçeceğimi bilmiyorum, nereden başlamalıyım?', en: 'I do not know which model to pick — where do I start?', ar: 'لا أعرف أي طراز أختار، من أين أبدأ؟' },
    a: {
      tr: 'Açılış ekranındaki "Hangi modeli seçeceğinizi bilmiyor musunuz?" sihirbazı birkaç soruyla (kullanım yeri, izleme mesafesi) size uygun modelleri daraltır.\n\nKatalogda ayrıca filtreler vardır: piksel aralığı, parlaklık, kullanım (iç/dış), kurulum, koruma sınıfı, izleme mesafesi. İki modeli karşılaştırma düğmesiyle yan yana da görebilirsiniz.\n\nSeçtikten sonra "Duvara sığdır" düğmesi, duvar ölçünüze en uygun sütun/satır sayısını kendisi hesaplar.',
      en: 'The "Not sure which model to choose?" wizard on the opening screen narrows the list with a few questions (where it will be used, viewing distance).\n\nThe catalogue also has filters: pixel pitch, brightness, indoor/outdoor use, installation, protection rating, viewing distance. The compare button puts two models side by side.\n\nOnce chosen, "Fit to wall" works out the best column/row count for your wall size automatically.',
      ar: 'معالج «لا تعرف أي طراز تختار؟» في الشاشة الأولى يضيّق الخيارات بأسئلة قليلة. وفي الكتالوج مرشحات (كثافة البكسل، السطوع، الاستخدام، الحماية) وإمكانية المقارنة. وبعد الاختيار يحسب زر «ملاءمة الجدار» عدد الأعمدة والصفوف المناسب.',
    },
  },
  {
    id: 'ledtype',
    keys: {
      tr: ['smd', 'cob', 'gob', 'dip', 'led tipi', 'led türü', 'led turu', 'paketleme', 'diyot tipi'],
      en: ['smd', 'cob', 'gob', 'led type', 'packaging', 'diode type'],
      ar: ['نوع الليد', 'اس ام دي'],
    },
    q: { tr: 'SMD, COB, GOB ne demek?', en: 'What do SMD, COB and GOB mean?', ar: 'ماذا تعني SMD وCOB وGOB؟' },
    a: {
      tr: 'LED diyotların panele yerleştirilme biçimidir; modelin "LED Tipi" bilgisinde yazar.\n\n• SMD — en yaygın yöntem. Diyotlar tek tek yüzeye lehimlenir. Ekonomik ve bakımı kolaydır.\n• COB — diyotlar doğrudan devre kartına gömülür, üzeri kaplanır. Daha dayanıklı, darbeye ve toza karşı korumalı, çok küçük piksel aralıklarında tercih edilir.\n• GOB — SMD panelin üzerine şeffaf koruyucu reçine dökülür. SMD\u2019nin maliyeti ile COB\u2019a yakın dayanıklılık sağlar.\n\nEle temas edilebilecek yerlerde (mağaza, fuar, geçiş noktaları) COB/GOB önerilir.',
      en: 'It is how the LED diodes are mounted on the panel; you will find it under the model\u2019s "LED Type".\n\n• SMD — the common method: diodes soldered individually to the surface. Economical, easy to service.\n• COB — diodes embedded directly into the board and coated. Tougher, protected against knocks and dust, preferred at very fine pitches.\n• GOB — a clear resin poured over an SMD panel: SMD cost with near-COB durability.\n\nWhere people can touch the screen (retail, exhibitions, walkways) COB or GOB is recommended.',
      ar: 'طريقة تثبيت الديودات على اللوحة: SMD شائع واقتصادي، COB مدمج ومغلّف وأكثر متانة ومناسب للكثافات العالية، وGOB طبقة راتنج شفافة فوق SMD تجمع بين التكلفة والمتانة. يُنصح بـ COB/GOB في الأماكن التي تُلمس فيها الشاشة.',
    },
  },
  {
    id: 'ip',
    keys: {
      tr: ['ip', 'ip65', 'ip54', 'koruma sınıfı', 'koruma sinifi', 'su geçirmez', 'su gecirmez', 'yağmur', 'yagmur', 'toz', 'dışarıda kalır mı', 'disarida kalir mi'],
      en: ['ip rating', 'ip65', 'waterproof', 'rain', 'dust', 'outdoor protection'],
      ar: ['درجة الحماية', 'مقاوم للماء', 'المطر', 'الغبار'],
    },
    q: { tr: 'IP koruma sınıfı nedir?', en: 'What is the IP protection rating?', ar: 'ما هي درجة الحماية IP؟' },
    a: {
      tr: 'Panelin toza ve suya karşı korumasını gösterir. İlk rakam toz, ikinci rakam sudur; büyüdükçe koruma artar.\n\n• IP54 — iç mekân, tozdan kısmen korunmuş\n• IP65 — toz sızdırmaz, her yönden gelen suya dayanıklı → dış mekân\n\nDış mekân ekranlarında ön ve arka yüz için ayrı değer verilebilir (ör. ön IP65, arka IP54).\n\nModelin değeri "Koruma" alanında yazar; katalogda buna göre filtreleyebilirsiniz.',
      en: 'It states how well the panel is protected against dust and water. The first digit is dust, the second water; higher is better.\n\n• IP54 — indoor, partly dust-protected\n• IP65 — dust-tight and resistant to water from any direction → outdoor\n\nOutdoor screens may quote separate ratings for the front and rear faces (e.g. front IP65, rear IP54).\n\nEach model shows this under "Protection", and you can filter the catalogue by it.',
      ar: 'تبيّن حماية اللوحة من الغبار والماء: الرقم الأول للغبار والثاني للماء. IP54 للداخل، وIP65 مانع للغبار ومقاوم للماء ومناسب للخارج. تظهر القيمة في خانة «الحماية».',
    },
  },
  {
    id: 'control',
    keys: {
      tr: ['kontrol', 'neye bağlan', 'neye baglan', 'nasıl bağlan', 'nasil baglan', 'bilgisayara', 'bilgisayardan', 'hdmi', 'dvi', 'display port', 'giriş', 'kaynak cihaz', 'işlemci', 'islemci', 'gönderici', 'gonderici', 'alıcı kart', 'alici kart', 'kablo', 'rj45', 'bağlantı', 'baglanti', 'nasıl bağlanır', 'nasil baglanir', 'bilgisayara bağla'],
      en: ['controller', 'processor', 'sending card', 'receiving card', 'cable', 'rj45', 'how to connect'],
      ar: ['وحدة التحكم', 'المعالج', 'الكابل', 'التوصيل'],
    },
    q: { tr: 'Ekran neye bağlanır, nasıl kontrol edilir?', en: 'What is the screen connected to and how is it controlled?', ar: 'بماذا تُوصل الشاشة وكيف يتم التحكم بها؟' },
    a: {
      tr: 'Zincir şöyledir: içerik kaynağı (bilgisayar/oynatıcı) → video işlemci veya gönderici kart → RJ45 (CAT6) kablolarla kabinlerdeki alıcı kartlar.\n\nHer RJ45 hattı belirli sayıda piksel taşır; ekran büyüdükçe hat sayısı ve dolayısıyla işlemci ihtiyacı artar. Teknik Özellikler tablosunda gereken RJ45 hattı ve işlemci sayısı hesaplanmış olarak yazar.\n\nHangi işlemcinin projeye uygun olduğu ve yedeklilik (S-Kutu) tercihi için satış ekibiyle görüşün.',
      en: 'The chain is: content source (PC/player) → video processor or sending card → RJ45 (CAT6) cabling → receiving cards inside the cabinets.\n\nEach RJ45 run carries a fixed number of pixels, so a bigger screen needs more runs and more processing. The Specifications table already works out the required RJ45 count and processors.\n\nFor the right processor and redundancy (S-Box) choice, talk to the sales team.',
      ar: 'المسار: مصدر المحتوى ← معالج فيديو أو بطاقة إرسال ← كابلات RJ45 ← بطاقات الاستقبال داخل الخزانات. يحسب جدول المواصفات عدد خطوط RJ45 والمعالجات المطلوبة.',
    },
  },
  {
    id: 'lifetime',
    keys: {
      tr: ['ömür', 'omur', 'ömrü', 'omru', 'kaç yıl', 'kac yil', 'ne kadar dayanır', 'ne kadar dayanir', 'bin saat', 'kaç saat', 'kac saat', 'sürekli açık', 'surekli acik', '7/24', 'dayanıklılık'],
      en: ['lifetime', 'lifespan', 'how many years', 'how long does it last', 'hours', '24/7'],
      ar: ['العمر الافتراضي', 'كم سنة', 'كم يدوم'],
    },
    q: { tr: 'LED ekranın ömrü ne kadar?', en: 'How long does an LED screen last?', ar: 'كم يدوم عمر شاشة LED؟' },
    a: {
      tr: 'LED diyotların ömrü genel olarak 100.000 saat mertebesinde anılır; bu, parlaklığın başlangıç değerinin yarısına düştüğü süredir — ekran o an sönmez.\n\nGünde 12 saat çalışan bir ekran için kabaca 20 yıldan uzun bir süreye karşılık gelir. Gerçek ömrü etkileyenler: sürekli tam parlaklıkta çalıştırmak, yüksek sıcaklık, nem ve tozdur.\n\nParlaklığı ortama göre düşürmek hem ömrü uzatır hem enerji tüketimini azaltır.\n\nProjenize özel garanti ve bakım şartları için satış ekibiyle görüşün.',
      en: 'LED diode life is generally quoted around 100,000 hours — the point at which brightness has fallen to half its original value, not the point where the screen dies.\n\nAt 12 hours a day that is well over 20 years. What really shortens it: running at full brightness constantly, high temperature, humidity and dust.\n\nDimming to suit the room extends life and cuts energy use at the same time.\n\nFor warranty and maintenance terms on your project, talk to the sales team.',
      ar: 'يُذكر عمر الديودات عادةً بنحو 100000 ساعة، وهي النقطة التي ينخفض فيها السطوع إلى النصف وليس التوقف. تشغيلها بأقصى سطوع دائمًا والحرارة والرطوبة والغبار تقصّر العمر.',
    },
  },
  /* ------------------------------------------------------------------
   * SIK SORULAN AMA CEVAPSIZ KALAN KONULAR
   * Aşağıdakiler gerçek soru kalıpları taranarak eklendi: yardımcı bunların
   * hiçbirine cevap veremiyor, "anlamadım" diyordu.
   * ------------------------------------------------------------------ */
  {
    id: 'heat',
    keys: {
      tr: ['ısı', 'isi yapar', 'ısınır', 'isinir', 'sıcaklık', 'sicaklik', 'klima', 'havalandırma', 'havalandirma', 'soğutma', 'sogutma', 'fan', 'ısı üretimi'],
      en: ['heat', 'temperature', 'cooling', 'air conditioning', 'ventilation', 'fan'],
      ar: ['الحرارة', 'التبريد', 'التكييف'],
    },
    q: { tr: 'Ekran ısınır mı, klima gerekir mi?', en: 'Does it get hot? Is cooling needed?', ar: 'هل تسخن الشاشة؟ هل يلزم تبريد؟' },
    a: {
      tr: 'Evet, LED ekran çalışırken ısı üretir; harcadığı gücün neredeyse tamamı sonunda ısıya döner. Teknik Özellikler bölümünde "Isı Üretimi" satırında BTU/saat olarak hesaplanmış hâlde görürsünüz.\n\nKüçük ekranlarda ortamın kendi havalandırması yeter. Büyük ekranlarda, kapalı nişlerde ve arkası havasız kalan kurulumlarda soğutma planlanmalıdır — sıcaklık hem parlaklığı düşürür hem ömrü kısaltır.\n\nKesin çözüm projeye göre değişir; ısı yükünü mekanik tesisat ekibinizle paylaşın.',
      en: 'Yes. An LED screen produces heat — almost all the power it draws ends up as heat. See "Heat Output" (BTU/h) under Specifications.\n\nSmall screens are fine with normal room ventilation. Large screens, recessed niches and installations with no airflow behind them need planned cooling: heat lowers brightness and shortens life.\n\nThe right solution depends on the project — share the heat load with your HVAC engineer.',
      ar: 'نعم، تنتج شاشة LED حرارة؛ وتظهر القيمة في «إنتاج الحرارة» ضمن المواصفات. الشاشات الكبيرة والتركيبات المغلقة تحتاج إلى تبريد مخطط له.',
    },
  },
  {
    id: 'audio',
    keys: {
      tr: ['ses', 'hoparlör', 'hoparlor', 'ses sistemi', 'anfi', 'amfi', 'mikrofon', 'sesli'],
      en: ['sound', 'speaker', 'audio', 'amplifier'],
      ar: ['الصوت', 'السماعات', 'مكبر الصوت'],
    },
    q: { tr: 'Ekranın sesi var mı?', en: 'Does the screen have sound?', ar: 'هل تحتوي الشاشة على صوت؟' },
    a: {
      tr: 'LED ekranların ve video duvarı panellerinin kendi hoparlörü yoktur; görüntü ve ses ayrı sistemlerdir.\n\nSes, içerik kaynağından (oynatıcı/bilgisayar) ayrı bir ses sistemine verilir. Mekâna göre tavan hoparlörü, sahne sistemi ya da ekranın altına gizlenen bir çubuk hoparlör kullanılır.\n\nSes sistemini de birlikte planlamak isterseniz satış ekibiyle görüşün.',
      en: 'LED screens and video-wall panels have no built-in speakers; picture and sound are separate systems.\n\nAudio goes from the content source (player/PC) to a separate sound system — ceiling speakers, a stage system, or a soundbar hidden under the screen, depending on the space.\n\nTalk to sales if you want the audio planned together with the screen.',
      ar: 'لا تحتوي شاشات LED على سماعات مدمجة؛ يُوصَّل الصوت من مصدر المحتوى إلى نظام صوتي منفصل.',
    },
  },
  {
    id: 'cms',
    keys: {
      tr: ['kumanda', 'uzaktan', 'içerik değiştir', 'icerik degistir', 'internet', 'wifi', 'usb', 'yazılım', 'yazilim', 'içerik yönetim', 'icerik yonetim', 'cms', 'program', 'playlist', 'zamanla', 'planla'],
      en: ['remote', 'content management', 'cms', 'software', 'internet', 'wifi', 'usb', 'schedule', 'playlist'],
      ar: ['التحكم عن بعد', 'إدارة المحتوى', 'برنامج', 'إنترنت'],
    },
    q: { tr: 'İçeriği uzaktan değiştirebilir miyim?', en: 'Can I change the content remotely?', ar: 'هل يمكنني تغيير المحتوى عن بُعد؟' },
    a: {
      tr: 'Evet. Ekrana bağlı oynatıcı bir içerik yönetim yazılımıyla (CMS) çalışır: içerik uzaktan yüklenir, oynatma listesi ve saat planı kurulur, birden fazla ekran tek panelden yönetilir.\n\nİnternet bağlantısı bunun için gerekir; USB ile yerel oynatma da mümkündür ama o zaman içerik değişimi elden yapılır.\n\nHangi yazılımın projenize uygun olduğu ve lisans koşulları için satış ekibiyle görüşün — kurulum ve eğitim hizmetlerimiz arasında.',
      en: 'Yes. The player attached to the screen runs content-management software (CMS): you upload content remotely, build playlists and schedules, and manage several screens from one panel.\n\nThat needs an internet connection. Local USB playback also works, but then content is changed by hand.\n\nFor the right software and licence terms talk to sales — installation and training are among our services.',
      ar: 'نعم، عبر برنامج إدارة المحتوى (CMS): رفع المحتوى عن بُعد، قوائم تشغيل وجدولة، وإدارة عدة شاشات من لوحة واحدة. يتطلب اتصال إنترنت.',
    },
  },
  {
    id: 'repair',
    keys: {
      tr: ['bozulursa', 'arıza', 'ariza', 'kırılırsa', 'kirilirsa', 'yedek parça', 'yedek parca', 'modül değiş', 'modul degis', 'tamir', 'onarım', 'onarim', 'temizlik', 'temizleme', 'nasıl temizlenir'],
      en: ['broken', 'fault', 'spare part', 'replace module', 'repair', 'cleaning'],
      ar: ['عطل', 'قطع غيار', 'إصلاح', 'تنظيف'],
    },
    q: { tr: 'Bir modül bozulursa ne olur?', en: 'What happens if a module fails?', ar: 'ماذا يحدث إذا تعطلت وحدة؟' },
    a: {
      tr: 'LED ekranın en büyük avantajı budur: arıza tüm ekranı durdurmaz. Bozulan modül ya da kabin tek başına sökülüp değiştirilir, kalan ekran çalışmaya devam eder.\n\nDeğişimin hangi yönden yapılacağını modelin "Hizmet" bilgisi söyler (ön ya da arka erişim); dar alanlarda ön erişimli modeller tercih edilir.\n\nTemizlik: ekran kapalı ve soğukken, kuru ya da hafif nemli mikrofiber bezle. Kimyasal, sprey ve basınçlı hava kullanılmaz.\n\nYedek parça, arıza ve servis süreleri için bizimle iletişime geçin.',
      en: 'This is the big advantage of LED: a fault does not stop the whole wall. The failed module or cabinet is removed and replaced on its own while the rest keeps running.\n\nThe model’s "Service" attribute says from which side (front or rear access); front-service models suit tight spaces.\n\nCleaning: screen off and cool, dry or barely damp microfibre cloth. No chemicals, sprays or compressed air.\n\nContact us for spare parts, faults and service times.',
      ar: 'العطل لا يوقف الشاشة كلها: تُستبدل الوحدة أو الخزانة المعطلة وحدها. التنظيف بقطعة ميكروفايبر جافة والشاشة مطفأة، بلا مواد كيميائية.',
    },
  },
  {
    id: 'mounting',
    keys: {
      tr: ['vinç', 'vinc', 'kaç kişi', 'kac kisi', 'asma tavan', 'tavana as', 'zemine mi', 'ayaklı', 'ayakli', 'stand', 'askı', 'aski', 'nasıl asılır', 'nasil asilir', 'taşınabilir', 'tasinabilir', 'sökülüp takıl'],
      en: ['crane', 'how many people', 'suspended ceiling', 'hanging', 'stand', 'floor mount', 'portable'],
      ar: ['رافعة', 'التعليق', 'حامل', 'قابل للنقل'],
    },
    q: { tr: 'Ekran nasıl monte edilir?', en: 'How is the screen mounted?', ar: 'كيف تُركّب الشاشة؟' },
    a: {
      tr: 'Üç yaygın yol var:\n\n• Duvara montaj — en yaygını. Taşıyıcı duvara çelik askı iskeleti kurulur, kabinler ona takılır.\n• Asma (rigging) — tavandan askı; sahne ve fuar kurulumlarında. Tavanın taşıma kapasitesi hesaplanmalıdır; alçıpan asma tavan tek başına taşımaz.\n• Ayaklı/mobil kasa — taşınabilir kurulum; etkinlikten etkinliğe sökülüp takılabilir.\n\nEkip ve ekipman ihtiyacı (kaç kişi, platform ya da vinç gerekip gerekmediği) ekranın yüksekliğine ve ağırlığına göre belirlenir; keşif sonrası netleşir.\n\nKurulumu bizim ekibimiz yapar — ayrıntı için iletişime geçin.',
      en: 'Three common ways:\n\n• Wall mount — the usual one: a steel sub-frame on a load-bearing wall, cabinets clip onto it.\n• Rigging — hung from the ceiling, for stages and exhibitions. The ceiling’s load capacity must be calculated; a plasterboard suspended ceiling cannot carry it alone.\n• Stand or mobile case — portable setups that travel between events.\n\nCrew and equipment (how many people, platform or crane) depend on the screen’s height and weight and are settled after a site survey.\n\nOur team does the installation — get in touch for details.',
      ar: 'ثلاث طرق: التثبيت على جدار حامل، التعليق من السقف (بحساب التحمل)، أو حامل متنقل. يُحدَّد الطاقم والمعدات بعد المعاينة.',
    },
  },
  {
    id: 'delivery',
    keys: {
      tr: ['teslim', 'stok', 'ne zaman gelir', 'kaç günde', 'kac gunde', 'kiralık', 'kiralik', 'kiralama', 'ikinci el', 'ihracat', 'yurt dışı', 'yurt disi', 'kargo', 'nakliye'],
      en: ['delivery', 'lead time', 'stock', 'rental', 'second hand', 'export', 'shipping'],
      ar: ['التسليم', 'المخزون', 'الإيجار', 'التصدير', 'الشحن'],
    },
    q: { tr: 'Teslim süresi ve stok durumu nedir?', en: 'What about lead time and stock?', ar: 'ما مدة التسليم وحالة المخزون؟' },
    a: {
      tr: `Teslim süresi modele, adete ve o anki stoğa göre değişir; kiralama, ihracat ve nakliye de proje bazında değerlendirilir. Bu konularda kesin bilgiyi yalnızca satış ekibi verebilir:\n\n${ILETISIM_TR}\n\nYapılandırmanızı bitirip PDF teklifi gönderirseniz, ekip modele ve adete bakarak süreyi doğrudan yazar.`,
      en: `Lead time depends on the model, quantity and current stock; rental, export and shipping are assessed per project. Only the sales team can give firm answers:\n\n${ILETISIM_EN}\n\nIf you finish your configuration and send the PDF quote, they can answer with the exact model and quantity in hand.`,
      ar: `تعتمد مدة التسليم على الطراز والكمية والمخزون؛ ويُقيَّم الإيجار والتصدير والشحن حسب المشروع. يُرجى التواصل معنا:\n\n${ILETISIM_EN}`,
    },
  },
  {
    id: 'payment',
    keys: {
      tr: ['kdv', 'vergi', 'taksit', 'ödeme', 'odeme', 'fatura', 'peşin', 'pesin', 'havale', 'kredi kartı', 'kredi karti', 'döviz', 'doviz', 'kur'],
      en: ['vat', 'tax', 'instalment', 'payment', 'invoice', 'credit card', 'currency'],
      ar: ['ضريبة', 'تقسيط', 'الدفع', 'فاتورة'],
    },
    q: { tr: 'Ödeme ve fatura nasıl?', en: 'How do payment and invoicing work?', ar: 'كيف تتم عملية الدفع والفاتورة؟' },
    a: {
      tr: `Fiyatlar proje bazında belirlenir; KDV, ödeme planı, taksit ve fatura konuları teklifle birlikte netleşir. Bu başlıklar için satış ekibiyle görüşün:\n\n${ILETISIM_TR}`,
      en: `Prices are set per project; VAT, payment plan, instalments and invoicing are settled with the quote. Please talk to sales:\n\n${ILETISIM_EN}`,
      ar: `تُحدَّد الأسعار حسب المشروع، وتُحسم الضريبة وخطة الدفع والفاتورة مع عرض السعر. يُرجى التواصل معنا:\n\n${ILETISIM_EN}`,
    },
  },
  {
    id: 'specialled',
    keys: {
      tr: ['şeffaf', 'seffaf', 'esnek', 'bükülebilir', 'bukulebilir', 'zemin led', 'yer ledi', 'küp ekran', 'kup ekran', 'tünel', 'tunel', 'silindir', 'poster led', 'özel şekil', 'ozel sekil'],
      en: ['transparent', 'flexible', 'floor led', 'cube', 'tunnel', 'cylinder', 'custom shape'],
      ar: ['شفافة', 'مرنة', 'أرضية', 'مكعب', 'نفق'],
    },
    q: { tr: 'Şeffaf, esnek ya da özel şekilli LED var mı?', en: 'Do you have transparent, flexible or custom-shaped LED?', ar: 'هل لديكم شاشات شفافة أو مرنة أو بأشكال خاصة؟' },
    a: {
      tr: 'Evet. Düz ve kavisli duvarların dışında özel biçimli LED çözümleri de yapıyoruz: LED küp ekran, LED tünel ekran, ayaklı poster LED ekran ve vitrinlerde kullanılan şeffaf uygulamalar.\n\nBu ürünler bu konfigüratörde yer almıyor; ölçü ve biçim projeye özel çıkarılıyor.\n\nAklınızdaki biçimi anlatın, uygunluğunu ve yaklaşık ölçüyü satış ekibi değerlendirsin.',
      en: 'Yes. Besides flat and curved walls we build custom-shaped LED: LED cubes, LED tunnels, standing poster LED and transparent applications for shop windows.\n\nThose are not in this configurator; their size and shape are engineered per project.\n\nDescribe the shape you have in mind and the sales team will assess it.',
      ar: 'نعم: مكعبات LED، أنفاق LED، شاشات بوستر بحامل، وتطبيقات شفافة للواجهات. هذه المنتجات ليست ضمن المُهيّئ وتُصمَّم حسب المشروع.',
    },
  },
  {
    id: 'autobright',
    keys: {
      tr: ['gece parlaklık', 'otomatik parlaklık', 'otomatik parlaklik', 'parlaklık ayarlan', 'parlaklik ayarlan', 'kısılır mı', 'kisilir mi', 'ışık sensörü', 'isik sensoru', 'göz alır', 'goz alir'],
      en: ['auto brightness', 'dimming', 'night brightness', 'light sensor', 'too bright'],
      ar: ['السطوع التلقائي', 'خفض السطوع', 'حساس الضوء'],
    },
    q: { tr: 'Parlaklık gece kısılabiliyor mu?', en: 'Can brightness be dimmed at night?', ar: 'هل يمكن خفض السطوع ليلاً؟' },
    a: {
      tr: 'Evet. Parlaklık kontrol yazılımından yüzde olarak ayarlanır; saate göre otomatik plan da kurulabilir. Işık sensörüyle ortam aydınlığına göre kendiliğinden ayarlanan kurulumlar da mümkündür.\n\nDış mekân ekranı gündüz için yüksek parlaklıkta üretilir (5.000 nit ve üzeri); geceleyin aynı parlaklıkta çalıştırmak hem göz alır hem gereksiz enerji harcar. Kısmak ayrıca ömrü uzatır.',
      en: 'Yes. Brightness is set as a percentage in the control software, and can follow a time schedule. Installations with a light sensor adjust themselves to ambient light.\n\nOutdoor screens are built bright for daylight (5,000 nits and up); running that at night dazzles viewers and wastes energy. Dimming also extends life.',
      ar: 'نعم، يُضبط السطوع بالنسبة المئوية في برنامج التحكم، ويمكن جدولته زمنيًا أو ربطه بحساس ضوء. الخفض ليلاً يريح العين ويطيل العمر.',
    },
  },
  {
    id: 'orientation',
    keys: {
      tr: ['portre', 'manzara', 'yatay dikey', 'dikey ekran', 'yatay ekran', 'oryantasyon', 'çevir ekranı', 'cevir ekrani'],
      en: ['portrait', 'landscape', 'orientation', 'vertical screen'],
      ar: ['عمودي', 'أفقي', 'الاتجاه'],
    },
    q: { tr: 'Portre ve manzara ne fark eder?', en: 'What is the difference between portrait and landscape?', ar: 'ما الفرق بين العمودي والأفقي؟' },
    a: {
      tr: 'Video duvarı panelleri 90° döndürülerek dikey de kurulabilir. "Manzara" panel yatay, "Portre" dikey demektir.\n\nDöndürünce panelin en ve boy ölçüsü ile piksel sayısı yer değiştirir; önizleme, kabin sayısı ve teknik özellikler buna göre yeniden hesaplanır.\n\nPortre; asansör holü, mağaza girişi ve dikey afiş içerikleri için tercih edilir. Bu seçenek yalnızca video duvarı panellerinde vardır — LED kabinler zaten kare/dikdörtgen modüllerden istenen orana kurulur.',
      en: 'Video-wall panels can be rotated 90°. "Landscape" means the panel lies horizontally, "Portrait" vertically.\n\nRotating swaps the panel’s width/height and pixel counts; the preview, cabinet count and specifications are recalculated accordingly.\n\nPortrait suits lift lobbies, shop entrances and vertical poster content. The option exists only for video-wall panels — LED cabinets are already built up to any ratio from modules.',
      ar: '«أفقي» يعني اللوحة ممتدة عرضيًا و«عمودي» بتدويرها 90°. يبدّل التدوير الأبعاد وعدد البكسل ويُعاد الحساب. الخيار متاح للوحات جدار الفيديو فقط.',
    },
  },
  {
    id: 'seam',
    keys: {
      tr: ['derz', 'çizgi', 'cizgi', 'birleşim', 'birlesim', 'ek yeri', 'çerçeve çizgisi', 'panel arası', 'panel arasi', 'görüntü bölün', 'goruntu bolun'],
      en: ['seam', 'line', 'joint', 'gap between panels', 'split image'],
      ar: ['الفواصل', 'الخطوط', 'الوصلات'],
    },
    q: { tr: 'Önizlemedeki çizgiler ne?', en: 'What are the lines in the preview?', ar: 'ما هذه الخطوط في المعاينة؟' },
    a: {
      tr: 'Panel birleşimleridir.\n\n• Video duvarında paneller arasında gerçek bir çerçeve (bezel) vardır; görüntü o ince çizgiyle bölünür. Modelin bezel ölçüsü Teknik Özellikler’de yazar ve katalogda buna göre süzebilirsiniz — 0,88 mm bir panel, 1,74 mm olandan belirgin şekilde kesintisiz görünür.\n• LED duvarda çerçeve yoktur; kabinler yüzey yüzeye oturur ve görüntü kesintisizdir. Önizlemedeki çok soluk çizgi yalnızca kabin sınırını sezdirmek içindir.\n\nKesintisiz tek parça görüntü isteniyorsa LED duvarı; ofis/kontrol odası gibi çok pencereli içerikte video duvarı tercih edilir.',
      en: 'They are panel joints.\n\n• On a video wall there is a real bezel between panels, so the image is split by that thin line. The model’s bezel is listed under Specifications and can be filtered in the catalogue — 0.88 mm looks far more seamless than 1.74 mm.\n• On an LED wall there is no bezel: cabinets sit surface to surface and the image is continuous. The very faint line in the preview only hints at the cabinet edge.\n\nFor a truly seamless picture choose an LED wall; for multi-window content (offices, control rooms) a video wall is usual.',
      ar: 'إنها وصلات اللوحات: في جدار الفيديو يوجد إطار حقيقي بين اللوحات يقسم الصورة، أما جدار LED فبلا إطار والصورة متصلة.',
    },
  },
  {
    id: 'accountmore',
    keys: {
      tr: ['şifremi unuttum', 'sifremi unuttum', 'parolamı unuttum', 'parolami unuttum', 'hesabımı', 'hesabimi', 'hesabım nasıl', 'hesap sil', 'üyeliğimi sil', 'uyeligimi sil', 'başka bilgisayar', 'baska bilgisayar', 'başka cihaz', 'baska cihaz', 'oturum aç kapat', 'çıkış yap', 'cikis yap'],
      en: ['forgot password', 'delete account', 'another computer', 'another device', 'log out'],
      ar: ['نسيت كلمة المرور', 'حذف الحساب', 'جهاز آخر', 'تسجيل الخروج'],
    },
    q: { tr: 'Parolamı unuttum / hesabımı silmek istiyorum', en: 'Forgot my password / want to delete my account', ar: 'نسيت كلمة المرور / أريد حذف حسابي' },
    a: {
      tr: 'Hesabınıza her cihazdan e-posta ve parolanızla girebilirsiniz; kayıtlı teklifleriniz hesabınıza bağlıdır, cihaza değil.\n\nParola sıfırlama ve hesap silme işlemleri şu an kendi kendine yapılamıyor; bu talepler için bizimle iletişime geçin, yönetici tarafından yürütülüyor.\n\nÇıkış yapmak için profil menüsündeki oturumu kapatın.',
      en: 'You can sign in from any device with your e-mail and password; your saved quotes belong to the account, not the device.\n\nPassword reset and account deletion are not yet self-service — contact us and an administrator will handle it.\n\nTo sign out, use the session menu under your profile.',
      ar: 'يمكنك الدخول من أي جهاز ببريدك وكلمة المرور، فالعروض مرتبطة بالحساب لا بالجهاز. أما إعادة تعيين كلمة المرور وحذف الحساب فيتمّان عبر التواصل معنا.',
    },
  },
  {
    id: 'wallinput',
    keys: {
      tr: ['ölçüleri değiştir', 'olculeri degistir', 'ölçüleri nasıl', 'olculeri nasil', 'duvar ölçüsü', 'duvar olcusu', 'ölçü gir', 'olcu gir', 'nereden girer', 'genişlik yükseklik', 'genislik yukseklik', 'metre gir', 'ölçüyü değiştir', 'olcuyu degistir'],
      en: ['wall size', 'enter dimensions', 'change size', 'width height'],
      ar: ['مقاس الجدار', 'إدخال الأبعاد', 'تغيير المقاس'],
    },
    q: { tr: 'Duvar ölçüsünü nereden giriyorum?', en: 'Where do I enter the wall size?', ar: 'من أين أُدخل مقاس الجدار؟' },
    a: {
      tr: 'Sol paneldeki "Duvar" bölümünden: GENİŞLİK ve YÜKSEKLİK kutularına metre cinsinden yazarsınız (ör. 4 ve 2,5). +/− tuşlarıyla da değiştirilebilir.\n\nEkranın ölçüsü buradan bağımsızdır; onu "Ekran" bölümündeki sütun ve satır sayısı belirler. "Duvara sığdır" düğmesi o duvara sığan en büyük kabin sayısını kendisi hesaplar.\n\nÖnizlemedeki etiketler ekranın gerçek en/boy ölçüsünü ve duvarda kalan boşlukları gösterir.',
      en: 'In the "Wall" section of the left panel: type WIDTH and HEIGHT in metres (e.g. 4 and 2.5), or use the +/− buttons.\n\nThe screen size is independent of that — it comes from the column and row count under "Screen". The "Fit to wall" button works out the largest cabinet count that fits.\n\nThe preview labels show the screen’s real width/height and the margins left on the wall.',
      ar: 'من قسم «الجدار» في اللوحة اليسرى: اكتب العرض والارتفاع بالمتر. مقاس الشاشة مستقل ويأتي من عدد الأعمدة والصفوف، وزر «ملاءمة الجدار» يحسب الأكبر الذي يتسع.',
    },
  },
  {
    id: 'multi',
    keys: {
      tr: ['çoklu ekran', 'coklu ekran', 'birden fazla ekran', 'iki ekran', 'ayrı ekran', 'ayri ekran'],
      en: ['multi screen', 'multiple screens', 'several screens'],
      ar: ['شاشات متعددة'],
    },
    q: { tr: 'Çoklu ekran ne işe yarar?', en: 'What is multi-screen for?', ar: 'ما فائدة الشاشات المتعددة؟' },
    a: {
      tr: 'Aynı duvarda birden fazla ayrı ekran kurmanızı sağlar. Her ekranın kendi sütun/satır sayısı ve türü olabilir.\n\nİçerik tek bir görsel olarak TÜM duvara yayılır ve ekranlar arasında bölünür — yani ekranlar aynı görüntünün parçalarını gösterir, her biri ayrı görüntü değil.',
      en: 'It lets you set up several separate screens on the same wall, each with its own column/row count and type.\n\nContent is treated as ONE image spread across the whole wall and divided between the screens — they show parts of the same picture.',
      ar: 'يتيح إعداد عدة شاشات منفصلة على الجدار نفسه، ويُقسَّم المحتوى بينها كصورة واحدة.',
    },
  },
]

/*
 * HER KONUNUN KENDİ BAŞLIĞI DA BİR ANAHTARDIR.
 *
 * Örnek soru listesindeki ve öneri kutusundaki metinler konuların başlıkları.
 * Kullanıcı o metni aynen yazdığında (ya da kopyaladığında) konunun bulunması
 * gerekir; oysa anahtar listeleri başlıklardan bağımsız yazıldığı için birçok
 * konu kendi sorusuyla eşleşmiyordu — özellikle İngilizce ve Arapçada. Elle
 * tek tek eklemek yerine burada bir kez ekleniyor, yeni konu eklendiğinde de
 * kendiliğinden geçerli oluyor.
 */
for (const topic of TOPICS) {
  for (const dil of ['tr', 'en', 'ar']) {
    const baslik = topic.q[dil]
    if (!baslik) continue
    if (!topic.keys[dil]) topic.keys[dil] = []
    if (!topic.keys[dil].includes(baslik)) topic.keys[dil].push(baslik)
  }
}

/**
 * Sorunun bizim alanımızla ilgisi var mı?
 *
 * Amaç: "hava durumu nasıl" ile "ekranın garantisi kaç yıl" sorularını ayırmak.
 * Birincisinde iletişim bilgisi vermek anlamsız — kimse hava durumu için satış
 * ekibini aramaz. İkincisinde ise yönlendirmek doğru olur.
 */
const ALAN_KELIMELERI = [
  // ürün ve teknik
  'ekran', 'led', 'panel', 'kabin', 'video', 'duvar', 'piksel', 'pixel', 'cozunurluk',
  'parlaklik', 'nit', 'kavis', 'montaj', 'kurulum', 'olcu', 'metre', 'boyut', 'agirlik',
  'guc', 'watt', 'sinyal', 'kiosk', 'tabela', 'signage', 'menu', 'goruntu', 'yayin',
  'icerik', 'cerceve', 'bezel', 'yenileme', 'diyot', 'modul',
  // ticari
  'fiyat', 'teklif', 'maliyet', 'ucret', 'garanti', 'servis', 'siparis', 'satin',
  'indirim', 'odeme', 'kampanya',
  // firma
  'masaustu', 'bilisim', 'firma', 'sirket', 'urun', 'hizmet', 'iletisim', 'telefon',
  'adres', 'mail', 'eposta',
  // araç
  'konfigurator', 'pdf', 'sigdir', 'model', 'yapilandir',
  // uygulamanın kendi özellikleri
  'kamera', 'artirilmis gerceklik', '3d', 'siluet', 'tema', 'hesap',
  'kayit', 'giris', 'parola', 'sifre', 'tekliflerim', 'duzenle', 'sifirla',
  'mekan', 'rapor', 'smd', 'cob', 'gob', 'ip65', 'omur', 'islemci',
  'rj45', 'kablo',
]

/** Metinde alanımıza ait bir kelime geçiyor mu? */
export function alanIlgili(text) {
  const q = sadelestir(text)
  return ALAN_KELIMELERI.some((k) => q.includes(k))
}

/**
 * Cevap bulunamadığında gösterilecek metin — İKİ ayrı durum var:
 *
 *   offTopic → tamamen alakasız soru (hava durumu, dolar kuru…).
 *              Kibarca bilmediğini söyler, İLETİŞİM BİLGİSİ VERMEZ ve
 *              konuşmayı kendi alanına çeker.
 *
 *   related  → alanımızla ilgili ama bilgi tabanında karşılığı yok
 *              (ör. "garanti kaç yıl"). Burada iletişime yönlendirmek anlamlı.
 */
export const FALLBACK = {
  offTopic: {
    tr: 'Bu konuda şu anda elimde bir bilgi bulunmuyor.\n\nLED ekranlar, ürünlerimiz ve bu konfigüratörün kullanımı hakkındaki sorularınızı yanıtlayabilirim. Başka nasıl yardımcı olabilirim?',
    en: 'I do not have any information on that at the moment.\n\nI can answer questions about LED displays, our products and how to use this configurator. How else may I help you?',
    ar: 'لا تتوفر لديّ معلومات عن هذا الموضوع حاليًا.\n\nيمكنني الإجابة عن أسئلتك حول شاشات LED ومنتجاتنا وطريقة استخدام هذا المُهيّئ. كيف يمكنني مساعدتك؟',
  },
  related: {
    tr: `Bu soruya buradan tam olarak yanıt veremiyorum. Sorunuzu farklı kelimelerle yazabilir ya da doğrudan bize sorabilirsiniz:\n\n${ILETISIM_TR}`,
    en: `I cannot fully answer that one here. Try rephrasing, or simply ask us directly:\n\n${ILETISIM_EN}`,
    ar: `لا أستطيع الإجابة الكاملة عن ذلك هنا. أعد صياغة سؤالك أو تواصل معنا مباشرة:\n\n${ILETISIM_EN}`,
  },
}

/**
 * Sohbet açılır açılmaz gösterilen tanıtım.
 * Kim olduğunu, neleri bilip neleri BİLMEDİĞİNİ baştan söyler —
 * kullanıcı boşuna fiyat sorup hayal kırıklığına uğramasın.
 */
export const GREETING = {
  tr: `Merhaba! 👋 Ben Masaüstü Bilişim Teknolojileri asistanıyım.\n\nFirmamız, ürünlerimiz ve LED ekran çözümleri hakkında merak ettiklerinizi sorabilirsiniz.\n\nTasarımınızı tamamlayıp PDF olarak indirdikten sonra bizimle paylaşmanız yeterli; üzerinde birlikte çalışır, dilediğiniz revizyonları yaparız.\n\nFiyat, garanti ve kurulum gibi konular için de bize ulaşabilirsiniz:\n\n${ILETISIM_TR}`,
  en: `Hello! 👋 I am the Masaüstü Bilişim Teknolojileri assistant.\n\nFeel free to ask anything about our company, our products and LED display solutions.\n\nOnce you have finished your design and downloaded the PDF, simply share it with us — we will go over it together and make any revisions you need.\n\nYou can also reach us for pricing, warranty and installation:\n\n${ILETISIM_EN}`,
  ar: `مرحبًا! 👋 أنا مساعد Masaüstü Bilişim Teknolojileri.\n\nاسألني عمّا تريد معرفته عن شركتنا ومنتجاتنا وحلول شاشات LED.\n\nبعد إنهاء تصميمك وتنزيل ملف PDF، شاركه معنا وسنراجعه معك وننفّذ التعديلات التي ترغب بها.\n\nكما يمكنك التواصل معنا للأسعار والضمان والتركيب:\n\n${ILETISIM_EN}`,
}

/**
 * Yazılan metne en uygun konuyu bulur.
 * Puanlama: eşleşen anahtar kelime ne kadar uzunsa o kadar değerli
 * (\"mesafe\" tek başına zayıf, \"izleme mesafesi\" güçlü eşleşmedir).
 */
/**
 * Yazım toleransı için metni sadeleştirir:
 *  - küçük harfe çevirir
 *  - Türkçe karakterleri ASCII karşılığına indirger (ş→s, ğ→g, ı/İ→i, ö→o, ü→u, ç→c)
 *  - tekrar eden harfleri teke düşürür ("çokk" → "cok")
 *  - noktalama ve fazla boşlukları atar
 *
 * Böylece "piksel araligi", "PİKSEL ARALIĞI", "piksel aralii" gibi
 * yazımların hepsi aynı biçime gelir.
 */
function sadelestir(s) {
  return (
    String(s)
      .toLocaleLowerCase('tr')
      .replace(/[şŞ]/g, 's')
      .replace(/[ğĞ]/g, 'g')
      .replace(/[ıİiI]/g, 'i')
      .replace(/[öÖ]/g, 'o')
      .replace(/[üÜ]/g, 'u')
      .replace(/[çÇ]/g, 'c')
      /*
       * ARAPÇA HARFLER KORUNUYOR (U+0600–U+06FF).
       *
       * Eskiden yalnızca a-z0-9 bırakılıyordu; Arapça bir soru sadeleştirmeden
       * sonra BOŞ metne dönüyor, hiçbir konu eşleşmiyor ve asistan Arapçada
       * her soruya "anlamadım" diyordu. Arapça sohbetin çalışmamasının sebebi
       * buydu.
       *
       * Bu arada Arapçaya özgü yazım farkları da tek biçime indiriliyor:
       * hareke işaretleri atılıyor, elif/te/ye türevleri sadeleştiriliyor.
       */
      .replace(/[ً-ْٰ]/g, '') // hareke
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[ىئ]/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/[^a-z0-9؀-ۿ\s.]/g, ' ')
      .replace(/(.)\1+/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

/**
 * İki kelime arasındaki düzeltme uzaklığı (Levenshtein), erken çıkışlı.
 * Yalnızca 1 harflik hataları affetmek için kullanılır — daha fazlası
 * yanlış konuya götürme riski taşır.
 */
/** Anahtar, metinde bir KELİMENİN BAŞINDA geçiyor mu? */
function kelimeBasinda(q, anahtar) {
  let i = q.indexOf(anahtar)
  while (i !== -1) {
    if (i === 0 || q[i - 1] === ' ') return true
    i = q.indexOf(anahtar, i + 1)
  }
  return false
}

/**
 * İki kelime yazım hatası payıyla aynı sayılır mı?
 *
 * Kaç harf hataya izin verildiği kelime uzunluğuna bağlı:
 *   < 6 harf  → hiç (kısa kelimelerde 1 harf bile anlamı değiştirir:
 *               "yakın"/"yayın", "dolar"/"dolap", "saat"/"sat")
 *   6–9 harf  → 1
 *   10+ harf  → 2 ("cozunurluk" ↔ "cozunurlk" gibi iki eksikli yazımlar
 *               gerçek sorularda sık çıkıyor)
 *
 * İLK HARF ŞARTI: yazım hatası neredeyse hiç ilk harfte olmuyor, ama bu şart
 * olmadan "tatil"↔"titre", "eczane"↔"cekim" gibi alakasız çiftler eşleşip
 * konu dışı sorulara cevap ürettiriyordu.
 */
function bireBirYakin(a, b) {
  if (a === b) return true
  const n = Math.max(a.length, b.length)
  if (n < 6) return false
  if (a[0] !== b[0]) return false
  const izin = n >= 10 ? 2 : 1
  if (Math.abs(a.length - b.length) > izin) return false
  return uzaklik(a, b) <= izin
}

/**
 * TÜRKÇE SON SESSİZ YUMUŞAMASI.
 *
 * "temizlik" → "temizliği", "hesap" → "hesabım", "kanat" → "kanadı".
 * Anahtar kelime sözlükte sert biçimiyle yazılı, kullanıcı ise ekli hâlini
 * yazıyor; kelime başı eşleşmesi bu yüzden tutmuyordu. Anahtarın yumuşamış
 * biçimi de aranıyor, böylece bütün bir hata sınıfı kapanıyor.
 */
const YUMUSAMA = { k: 'g', p: 'b', t: 'd', c: 'c' }
function yumusakBicim(anahtar) {
  // Kısa anahtarlarda yumuşatmak tehlikeli: "bük" → "bug" olunca "bugün"
  // kelimesi kavis konusuna gidiyordu.
  if (anahtar.length < 5) return null
  const son = anahtar[anahtar.length - 1]
  const yeni = YUMUSAMA[son]
  if (!yeni || yeni === son) return null
  return anahtar.slice(0, -1) + yeni
}

/**
 * Çok kelimeli anahtar, cümlenin herhangi bir yerinde yazım hatasıyla geçiyor mu?
 *
 * "ar nasil" anahtarı, "ar nasl calisir" cümlesinde kelime başı aramasıyla
 * bulunamıyordu (tek harf eksik). Anahtar kaç kelimeyse cümleden o kadar
 * kelimelik pencereler alınıp karşılaştırılıyor.
 */
function cokKelimeYakin(qKelimeler, anahtar) {
  const parcalar = anahtar.split(' ')
  if (parcalar.length < 2 || qKelimeler.length < parcalar.length) return false
  for (let i = 0; i + parcalar.length <= qKelimeler.length; i++) {
    let tut = true
    for (let j = 0; j < parcalar.length; j++) {
      const kel = qKelimeler[i + j]
      const parca = parcalar[j]
      // Kısa parçalar (ör. "ar", "ne") birebir olmalı; uzunlarda hata payı var.
      if (kel !== parca && !bireBirYakin(kel, parca)) { tut = false; break }
    }
    if (tut) return true
  }
  return false
}

/**
 * Yazılan metne en uygun konuyu bulur.
 *
 * Puanlama: eşleşen anahtar ne kadar uzunsa o kadar değerli ("mesafe" tek
 * başına zayıf, "izleme mesafesi" güçlü eşleşmedir). Böylece birden fazla
 * konuya uyan sorularda en özgül olan kazanır.
 *
 * Eşleşme iki aşamalı: önce doğrudan içerme, bulunamazsa 1 harf hata payıyla
 * kelime kelime karşılaştırma (yazım yanlışları için).
 */
/** İki kelime arasındaki düzeltme uzaklığı (tam Levenshtein, kısa metinler için). */
function uzaklik(a, b) {
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  let onceki = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const simdi = [i]
    for (let j = 1; j <= n; j++) {
      simdi[j] = Math.min(
        onceki[j] + 1, // silme
        simdi[j - 1] + 1, // ekleme
        onceki[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1), // değiştirme
      )
    }
    onceki = simdi
  }
  return onceki[n]
}

/**
 * Kesin eşleşme bulunamadığında EN OLASI konuyu tahmin eder.
 *
 * findTopic'ten farkı: orada 1 harf hataya izin var, burada oransal benzerliğe
 * bakılıyor. Amaç cevap vermek değil — "şunu mu demek istediniz?" diye SORMAK.
 * Bu yüzden yanlış tahmin etmek görece zararsız; kullanıcı zaten onaylıyor.
 *
 * Eşik (0,82) ÖLÇEREK seçildi. Daha düşük değerlerde alakasız metinler
 * öneri üretiyordu: "yakın"↔"yayın" %80, "dolar"↔"dolabı" %67.
 * 0,82 bunları eler ama "izlme mesafsi" (%87) gibi bozuk yazımları yakalar.
 *
 * @returns {{topic: object, benzerlik: number} | null}
 */
/**
 * ONAY SÖZLERİ — "şunu mu demek istediniz?" sorusuna evet demek.
 * Kullanıcı öneriyi tıklamak yerine yazıyla onaylıyor; eskiden bu "evet"
 * cevabı alakasız bir soru sayılıp "anlamadım" yanıtı alıyordu.
 */
const ONAY = {
  tr: ['evet', 'evt', 'aynen', 'tamam', 'olur', 'he', 'hee', 'oyle', 'öyle', 'dogru', 'doğru', 'tabii', 'tabi'],
  en: ['yes', 'yep', 'yeah', 'correct', 'right', 'ok', 'okay', 'sure'],
  ar: ['نعم', 'أجل', 'صحيح', 'تمام'],
}

/** Kullanıcı önceki öneriyi onaylıyor mu? */
export function onayMi(text, lang = 'tr') {
  const q = sadelestir(text)
  if (!q || q.split(' ').length > 3) return false
  const liste = ONAY[lang] || ONAY.tr
  return liste.some((k) => q === sadelestir(k) || q.startsWith(sadelestir(k) + ' '))
}

/**
 * DEVAM SÖZLERİ — kendi başına anlamı olmayan, önceki soruya bağlanan mesajlar.
 * "peki ya?", "neden?", "biraz daha anlat" gibi. Bunlar tek başına hiçbir
 * konuya uymuyor; önceki mesajla birleştirilmeleri gerekiyor.
 */
const DEVAM = {
  tr: ['peki', 'ya', 'neden', 'niye', 'nasil', 'nasıl', 'daha', 'devam', 'detay', 'ayrinti', 'ayrıntı', 'baska', 'başka', 'ornek', 'örnek', 'anlamadim', 'anlamadım', 'aciklar', 'açıklar', 'yani'],
  en: ['why', 'how', 'more', 'detail', 'continue', 'else', 'example', 'explain'],
  ar: ['لماذا', 'كيف', 'المزيد', 'تفصيل', 'مثال'],
}

/** Mesaj, kendi başına değil önceki soruya bağlı bir devam sorusu mu? */
export function devamMi(text, lang = 'tr') {
  const q = sadelestir(text)
  if (!q) return false
  const kelimeler = q.split(' ')
  if (kelimeler.length > 5) return false
  const liste = DEVAM[lang] || DEVAM.tr
  return kelimeler.some((k) => liste.includes(k))
}

export function enYakinKonu(text, lang = 'tr') {
  const q = sadelestir(text)
  if (!q) return null
  const kelimeler = q.split(' ').filter((w) => w.length >= 4)
  if (!kelimeler.length) return null

  let best = null
  let bestSim = 0

  for (const topic of TOPICS) {
    for (const k of topic.keys[lang] || topic.keys.tr) {
      const anahtar = sadelestir(k)
      if (anahtar.length < 4) continue
      // Çok kelimeli anahtarı tüm cümleyle, tek kelimeliyi kelimelerle karşılaştır
      const adaylar = anahtar.includes(' ') ? [q] : kelimeler
      for (const aday of adaylar) {
        const sim = 1 - uzaklik(aday, anahtar) / Math.max(aday.length, anahtar.length)
        if (sim > bestSim) {
          bestSim = sim
          best = topic
        }
      }
    }
  }

  return bestSim >= 0.82 ? { topic: best, benzerlik: bestSim } : null
}

export function findTopic(text, lang = 'tr') {
  const q = sadelestir(text)
  if (!q) return null
  const qKelimeler = q.split(' ')

  let best = null
  let bestScore = 0

  for (const topic of TOPICS) {
    const keys = topic.keys[lang] || topic.keys.tr
    let score = 0

    for (const k of keys) {
      const anahtar = sadelestir(k)
      if (!anahtar) continue

      /*
       * 1) Kelime BAŞINDA geçiyor mu.
       *
       * Düz "içinde geçiyor mu" araması yanlış eşleşmeler üretiyordu:
       *   "bilgisi" içinde "isi"  → ısı konusu
       *   "maç kaç" içinde "kaç k" → çözünürlük konusu
       * Kelime sınırı şartı bunları eler. Sonda sınır ARANMAZ; Türkçe ekler
       * yüzünden ("izlenmeli", "bükülmüş") sondan eşleşme mümkün olmazdı.
       */
      if (kelimeBasinda(q, anahtar)) {
        score = Math.max(score, anahtar.length)
        continue
      }

      /*
       * 2) Türkçe ek almış hâli: "temizlik" anahtarı "temizliği" içinde.
       * Yumuşamış biçim de kelime başında aranıyor.
       */
      const yumusak = yumusakBicim(anahtar)
      if (yumusak && kelimeBasinda(q, yumusak)) {
        score = Math.max(score, anahtar.length)
        continue
      }

      // 3) Tek kelimelik anahtarlarda yazım hatası payı
      if (!anahtar.includes(' ')) {
        for (const kel of qKelimeler) {
          if (bireBirYakin(kel, anahtar)) {
            score = Math.max(score, anahtar.length - 1) // hatalı eşleşme biraz daha düşük puan
            break
          }
        }
        continue
      }

      // 4) Çok kelimeli anahtar, cümlede hatalı yazımla geçiyor olabilir
      if (cokKelimeYakin(qKelimeler, anahtar)) {
        score = Math.max(score, anahtar.length - 1)
      }
    }

    if (score > bestScore) {
      bestScore = score
      best = topic
    }
  }
  return best
}
