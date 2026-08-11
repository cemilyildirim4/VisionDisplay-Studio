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
      tr: ['merhaba', 'selam', 'iyi günler', 'iyi gunler', 'nasılsın', 'nasilsin', 'kimsin', 'ne yapabilirsin', 'yardım'],
      en: ['hello', 'hi', 'who are you', 'what can you do', 'help'],
      ar: ['مرحبا', 'من أنت'],
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
      tr: ['yenileme hızı', 'yenileme hizi', 'yenileme', 'hz', 'hertz', 'kamera', 'titreme', 'çekim', 'video çek', 'yayın', 'stüdyo', 'banding', 'titre'],
      en: ['refresh rate', 'hz', 'camera', 'flicker'],
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
      tr: ['güç', 'guc', 'watt', 'elektrik', 'tüketim', 'tuketim', 'devre', 'ısı üretimi', 'ısınma', 'btu', 'kaç watt', 'sigorta', 'klima', 'soğutma', 'fatura'],
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
      tr: ['pdf', 'nereden iner', 'nasıl indiririm', 'nasil indiririm', 'çıktı', 'cikti', 'dışa aktar', 'disa aktar', 'kaydet', 'nereden bakarım'],
      en: ['pdf', 'download', 'export', 'where is'],
      ar: ['بي دي اف', 'تنزيل', 'تصدير'],
    },
    q: { tr: 'PDF çıktılarını nereden alırım?', en: 'Where do I get the PDF outputs?', ar: 'من أين أحصل على ملفات PDF؟' },
    a: {
      tr: 'İki ayrı PDF var:\n\n• Teknik Özellikler — başlık çubuğundaki "Teknik Özellikler" düğmesine basın, açılan pencerenin sağ üstündeki "İndirmek" bağlantısını kullanın. Ölçü, ağırlık, güç, çözünürlük ve bileşen listesini içerir.\n\n• Teklif — sağ panelin altındaki "PDF Olarak Dışa Aktar" düğmesi. İletişim bilgilerinizi de içeren teklif talebi oluşturur.',
      en: 'There are two PDFs:\n\n• Specifications — press "Specifications" in the header, then "Download" at the top right of the window.\n\n• Quote — the "Export as PDF" button at the bottom of the right panel.',
      ar: 'ملفان: المواصفات من زر "المواصفات" في الأعلى، وعرض السعر من زر التصدير أسفل اللوحة.',
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
  return String(s)
    .toLocaleLowerCase('tr')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[ıİiI]/g, 'i')
    .replace(/[öÖ]/g, 'o')
    .replace(/[üÜ]/g, 'u')
    .replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9\s.]/g, ' ')
    .replace(/(.)\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
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

function bireBirYakin(a, b) {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  /*
   * 6 harften kısa kelimelerde 1 harf hatayı affetmiyoruz. Ölçtük:
   *   "yakın" ↔ "yayın", "dolar" ↔ "dolap", "yemek" ↔ "yedek"
   * gibi alakasız çiftler yanlış konulara götürüyordu.
   * Kısa ama önemli kelimelerin yaygın yazım hataları anahtar listesine
   * elle eklendi (ör. "kabbin").
   */
  if (a.length < 6) return false
  let i = 0
  let j = 0
  let fark = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++fark > 1) return false
    if (a.length > b.length) i++
    else if (a.length < b.length) j++
    else {
      i++
      j++
    }
  }
  return fark + (a.length - i) + (b.length - j) <= 1
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

      // 2) Tek kelimelik anahtarlarda 1 harf hataya izin ver
      if (!anahtar.includes(' ')) {
        for (const kel of qKelimeler) {
          if (bireBirYakin(kel, anahtar)) {
            score = Math.max(score, anahtar.length - 1) // hatalı eşleşme biraz daha düşük puan
            break
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score
      best = topic
    }
  }
  return best
}
