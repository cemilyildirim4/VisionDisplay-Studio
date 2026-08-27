/**
 * UYGUN YÜZEY ARAMA (kamera karesinden).
 *
 * Gerçek AR (WebXR) çoğu telefonda açılmıyor; derinlik ya da düzlem bilgisi
 * yok. Elimizde yalnızca kameranın o anki karesi var. Buna rağmen "ekran
 * nereye yakışır" sorusuna işe yarar bir cevap verilebiliyor, çünkü aranan
 * şey aslında görüntüde bellidir: DÜZ ve BOŞ bir alan.
 *
 * Duvar, cephe ya da boş bir pano kamerada nasıl görünür? İçinde ayrıntı
 * yoktur — komşu pikseller birbirine benzer. Kitaplık, pencere, mobilya,
 * kalabalık zemin ise ayrıntı doludur. Yani "düzlük" ölçüsü olarak komşu
 * piksel farkının (gradyan) ortalaması kullanılıyor: küçükse düz alan.
 *
 * Yöntem:
 *   1) Kare küçültülüp griye çevrilir (hız için; 160 piksel genişlik yeter).
 *   2) Her piksel için komşu farkı (gradyan) hesaplanır.
 *   3) Gradyanın TOPLAM TABLOSU (integral image) çıkarılır — böylece
 *      herhangi bir dikdörtgenin ortalama gradyanı dört okumayla bulunur.
 *      Yüzlerce aday pencere bu sayede taranabiliyor.
 *   4) Tasarımın en/boy oranındaki pencereler farklı ölçek ve konumlarda
 *      denenir, en düz olanı seçilir.
 *
 * Bu bir derinlik ölçümü DEĞİLDİR; ekranın gerçekten oraya sığacağını
 * söylemez. Yaptığı şey, kalabalık olmayan bir yer önermek.
 */

import { duzlemUyumu } from './derinlikBul.js'

/** Çözümleme genişliği — daha büyüğü belirgin fayda vermeden yavaşlatıyor. */
const COZUMLEME_W = 160

/*
 * DÜZLÜK EŞİĞİ ARTIK GÖRELİ.
 *
 * Sabit bir eşik iki yönde de yanılıyordu: loş bir odada her yer "düz"
 * çıkıyor, aydınlık ve dokulu bir mekânda ise (sıvalı duvar, halı deseni,
 * tuğla) hiçbir yer eşiği geçemiyor ve "uygun yer bulunamadı" deniyordu.
 * Duvarın düzlüğü mutlak bir sayı değil, O KAREYE GÖRE bir şeydir: aranan,
 * karenin geri kalanından belirgin biçimde daha sakin olan bölge.
 *
 * Eşik bu yüzden karenin kendi ortalama gradyanından türetiliyor; alt ve üst
 * sınırlar yalnızca uç durumlar için (bomboş ya da tamamen kalabalık kare).
 */
const GORELI_KATSAYI = 0.62
const MUTLAK_EN_AZ = 4
const MUTLAK_EN_COK = 34

/**
 * Aday pencerenin kadraja göre en küçük ve en büyük genişliği.
 * Çok küçük pencere her yerde "düz" çıkar (bilgi taşımaz), çok büyüğü
 * kadraja sığmaz.
 */
const EN_KUCUK_ORAN = 0.22
const EN_BUYUK_ORAN = 0.8

/**
 * Kareyi çözümleyip tasarım için en uygun dikdörtgeni bulur.
 *
 * @param {HTMLCanvasElement|HTMLVideoElement} kaynak  kamera karesi
 * @param {number} oran  tasarımın en/boy oranı (genişlik / yükseklik)
 * @param {object} [secenekler]
 * @param {boolean} [secenekler.fotograf] Kullanıcının eklediği MEKÂN
 *        fotoğrafı için ek ölçütleri açar. Kamera karesinde kapalı:
 *        orada kadraj sürekli oynuyor, tek bir kareye göre "zemin",
 *        "tavan" gibi kararlar vermek yanıltıcı olur.
 * @param {number|null} [secenekler.zeminOran] Zemin çizgisinin dikey yeri
 *        (0–1). Verilirse ekran zeminin altına konmaz.
 * @param {object|null} [secenekler.derinlik] Derinlik haritasi (bkz.
 *        derinlikBul.js). Verilirse 'burasi duz bir yuzey mi' ve 'onunde
 *        bir sey var mi' sorulari GEOMETRIYLE cevaplaniyor; parlaklik ve
 *        gradyan tahminleri ikinci plana dusuyor.
 * @param {object|null} [secenekler.nesneler] Sinir agindan gelen nesne
 *        haritasi (bkz. nesneBul.js): { w, h, engel, ekranKutusu }.
 *        Verilirse yerlestirme TAHMIN degil, BILGI ile yapilir: mobilya ve
 *        insanlarin uzeri elenir, odada duran ekranin yeri yeglenir.
 * @returns {{x:number, y:number, w:number, h:number, duzluk:number, guven:number}|null}
 *          Değerler 0–1 arası ORANLIDIR (kaynağın ölçüsünden bağımsız).
 */
export function uygunYuzeyBul(kaynak, oran, secenekler = {}) {
  const fotograf = !!secenekler.fotograf
  const zeminOran = secenekler.zeminOran != null ? secenekler.zeminOran : null
  const nesneler = secenekler.nesneler || null
  const derinlik = secenekler.derinlik || null
  if (!kaynak || !(oran > 0)) return null

  const kaynakW = kaynak.videoWidth || kaynak.width
  const kaynakH = kaynak.videoHeight || kaynak.height
  if (!kaynakW || !kaynakH) return null

  const W = COZUMLEME_W
  const H = Math.max(1, Math.round((W * kaynakH) / kaynakW))

  const tuval = document.createElement('canvas')
  tuval.width = W
  tuval.height = H
  const ctx = tuval.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(kaynak, 0, 0, W, H)

  let veri
  try {
    veri = ctx.getImageData(0, 0, W, H).data
  } catch {
    return null // farklı kaynaktan gelen görüntü (CORS) okunamaz
  }

  // 1) Gri tonlama
  const gri = new Float32Array(W * H)
  /*
   * GÖKYÜZÜ AYRIMI için mavi–kırmızı farkı da tutuluyor (yalnızca fotoğraf
   * kipinde kullanılıyor). Dış mekân karesinin en düz, en tek düze yeri
   * gökyüzüdür ve ekran oraya konmaz; ama gri tonlamada gökyüzü ile açık bir
   * duvar birbirinden ayırt edilemiyor. Ayıran şey RENK: gökyüzü —gündüz de
   * alacakaranlıkta da— mavi baskındır, duvar değildir.
   */
  const mavilik = new Float32Array(W * H)
  for (let i = 0, p = 0; i < gri.length; i++, p += 4) {
    gri[i] = 0.299 * veri[p] + 0.587 * veri[p + 1] + 0.114 * veri[p + 2]
    mavilik[i] = veri[p + 2] - veri[p]
  }

  // 2) Komşu farkı: sağdaki ve alttaki pikselle
  const gradyan = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const dx = x + 1 < W ? Math.abs(gri[i + 1] - gri[i]) : 0
      const dy = y + 1 < H ? Math.abs(gri[i + W] - gri[i]) : 0
      gradyan[i] = dx + dy
    }
  }

  // 3) Toplam tabloları: gradyan, parlaklık ve parlaklığın KARESİ
  const tg = toplamTablosu(gradyan, W, H)
  const tp = toplamTablosu(gri, W, H)
  /*
   * Karelerin toplamı, herhangi bir dikdörtgenin renk SAÇILIMINI (standart
   * sapma) da dört okumayla vermeye yarıyor. Gradyan "ayrıntı var mı" der;
   * saçılım "renk tek düze mi" der. İkisi farklı şeyleri yakalar: yumuşak
   * geçişli bir gölge gradyanı düşük tutar ama saçılımı büyütür, desenli bir
   * duvar kâğıdı ise tersini yapar. Duvar ikisinde de sakindir.
   */
  const tk = toplamTablosu(kareler(gri), W, H)
  /* Mavilik toplam tablosu — gökyüzü elemesi için (yalnızca fotoğraf kipi). */
  const tm = fotograf ? toplamTablosu(mavilik, W, H) : null

  /*
   * NESNE HARİTASI çözümleme ölçüsüne getiriliyor ve toplam tablosu
   * çıkarılıyor: böylece her adayın kaçta kaçının bir eşyanın üstüne
   * geldiği dört okumayla bulunuyor.
   */
  let te = null
  if (nesneler?.engel) {
    const e = new Float32Array(W * H)
    for (let y = 0; y < H; y++) {
      const ny = Math.min(nesneler.h - 1, Math.floor((y / H) * nesneler.h))
      for (let x = 0; x < W; x++) {
        const nx = Math.min(nesneler.w - 1, Math.floor((x / W) * nesneler.w))
        e[y * W + x] = nesneler.engel[ny * nesneler.w + nx]
      }
    }
    te = toplamTablosu(e, W, H)
  }

  // Karenin genel hareketliliği — eşik buna göre belirlenir.
  const geneOrtalama = dikdortgenToplami(tg, W, 0, 0, W, H) / (W * H)
  /* Karenin ortalama parlaklığı — "bu bölge geneline göre koyu mu?" için. */
  const geneParlaklik = dikdortgenToplami(tp, W, 0, 0, W, H) / (W * H)
  const esikTemel = Math.max(MUTLAK_EN_AZ, Math.min(MUTLAK_EN_COK, geneOrtalama * GORELI_KATSAYI))

  // 4) Aday pencereler
  let enIyi = null
  /*
   * Düzlem uydurma önbelleği. ARAMADAN ÖNCE tanımlanmak zorunda: arama
   * döngüsü onu kullanan işlevi çağırıyor ve const bildirimleri hoisting ile
   * erişilebilir olmuyor (ilk yazışımda buradaydı ve "Cannot access before
   * initialization" hatası veriyordu; hata yutulduğu için de öneri sessizce
   * boş dönüyordu).
   */
  const duzlemOnbellek = new Map()
  const adimSayisi = 5 // ölçek basamağı

  /*
   * İKİ TURLU ARAMA (yalnızca fotoğrafta).
   *
   * Birinci tur katı: gerçekten sakin bir yüzey arıyor. Bazı fotoğraflarda
   * böyle bir yer yok — taş kaplama duvar, dokulu sıva, aydınlatma lekeleri.
   * Eskiden bu durumda "yer bulunamadı" deyip ekranı kadrajın tam ortasına
   * koyuyorduk; orası çoğu zaman gökyüzü ya da masanın üstü oluyordu.
   *
   * İkinci tur, eşiği gevşetip aynı ölçütlerle yeniden bakıyor. Sonuç daha
   * az güvenilir ve güven puanı buna göre düşürülüyor, ama "duvarın dokulu
   * bir yeri", "kadrajın ortası"ndan her zaman iyidir.
   */
  /*
   * DERİNLİK VARSA GÖRÜNTÜ EŞİĞİ GEVŞİYOR.
   *
   * Gradyan eşiği "burası düz mü" sorusunun tahmini cevabıydı. Derinlik
   * geldiğinde aynı soruya geometriyle, çok daha doğru cevap veriliyor;
   * gradyan eşiğini o zaman katı tutmak, dokulu ama dümdüz yüzeyleri
   * (taş kaplama duvar, sıva, ahşap lambri) boşuna eliyor. Ölçtüm: şehir
   * meydanı fotoğrafında 643 aday yalnızca dokusu yüzünden eleniyor ve
   * geriye hiçbir aday kalmıyordu.
   */
  const turlar = !fotograf ? [1] : derinlik ? [2.2, 4] : [1, 1.9]
  let turCarpani = 1

  /*
   * MODEL BİR EKRAN BULDUYSA ORASI ŞARTTIR — puan değil, KOŞUL.
   *
   * Önce bunu bir bonus olarak vermiştim; sezgisel ölçütler (özellikle
   * "çerçevesi belirgin ve parlak") onu bastırabiliyordu ve tasarım, odada
   * duran ekranın yerine pencereye gidiyordu. Modelin gördüğü şey bilgidir,
   * tahminlerin oyuyla yarışmamalı: ekranın bulunduğu yerle örtüşmeyen
   * adaylar hiç değerlendirilmiyor.
   *
   * Hiçbir aday şartı sağlayamazsa (ekran kadrajın kenarında, tasarımın oranı
   * hiç uymuyor) şart kaldırılıp yeniden bakılıyor — cevapsız kalmaktansa.
   */
  const ekranVar = !!nesneler?.ekranKutusu
  const kosullar = ekranVar ? [true, false] : [false]

  /*
   * KISIT MERDİVENİ. Sırayla gevşetiliyor, ilk cevap bulunduğunda duruluyor:
   *   1) her şey açık,
   *   2) modelin ekran şartı kalkar,
   *   3) yalnızca ZEMİN kuralı kalkar: büyük bir tasarımın dikdörtgeni zemin
   *      çizgisini aşabilir. Gökyüzü, tavan ve kenar kuralları hep geçerli —
   *
   * gökyüzü derinlikte kusursuz bir düzlemdir ve gevşetilirse ekran göğe gider.
   *
   * Üçüncü basamak dar duvar kuşaklı fotoğraflar için: şehir meydanında
   * adayların 551'i sırf alt kenarı zemin çizgisini geçtiği için eleniyor,
   * geriye hiç aday kalmıyor ve ekran kadrajın ortasına düşüyordu.
   */
  let zeminEsnek = false
  disari: for (const zeminKurali of [true, false]) {
    zeminEsnek = !zeminKurali
    for (const ekranSart of kosullar) {
      for (const carpan of turlar) {
        turCarpani = carpan
        enIyi = araTur(carpan, ekranSart)
        if (enIyi) break disari
      }
    }
  }

  /*
   * Düzlem uydurma aynı dikdörtgen için tekrar tekrar isteniyor (eleme ve
   * puanlama). Sonuç önbelleğe alınıyor: arama yüz binlerce aday deniyor.
   */
  function duzlemDegeri(x, y, w, h) {
    const anahtar = x + ',' + y + ',' + w + ',' + h
    let d = duzlemOnbellek.get(anahtar)
    if (!d) {
      const ox = Math.round((x / W) * derinlik.w)
      const oy = Math.round((y / H) * derinlik.h)
      const ow = Math.max(2, Math.round((w / W) * derinlik.w))
      const oh = Math.max(2, Math.round((h / H) * derinlik.h))
      const sx = Math.min(ox, derinlik.w - ow)
      const sy = Math.min(oy, derinlik.h - oh)
      d = duzlemUyumu(derinlik, Math.max(0, sx), Math.max(0, sy), ow, oh)
      duzlemOnbellek.set(anahtar, d)
    }
    return d
  }

  function araTur(carpan, ekranSart) {
  const esik = esikTemel * carpan
  let enIyi = null
  for (let s = 0; s < adimSayisi; s++) {
    const genislikOran = EN_KUCUK_ORAN + ((EN_BUYUK_ORAN - EN_KUCUK_ORAN) * s) / (adimSayisi - 1)
    const pw = Math.round(W * genislikOran)
    const ph = Math.round(pw / oran)
    if (pw < 8 || ph < 8 || ph > H) continue

    const adim = Math.max(2, Math.round(pw / 8))
    for (let y = 0; y + ph <= H; y += adim) {
      for (let x = 0; x + pw <= W; x += adim) {
        const alan = pw * ph
        const duzluk = dikdortgenToplami(tg, W, x, y, pw, ph) / alan
        if (duzluk > esik) continue

        /*
         * FOTOĞRAFTA ELEME — LED ekran nereye KONMAZ.
         *
         * Düzlük tek başına yetmiyor: bir odanın en düz yeri çoğu zaman
         * zemin, tavan ya da pencere camıdır. Ekran hiçbirine konmaz.
         * Bunlar tercih değil, doğrudan eleme; çünkü orası ne kadar düz
         * olursa olsun yanlış cevaptır.
         */
        if (fotograf) {
          // Zeminin altı: kaide oraya oturur, ekran gövdesi değil.
          if (!zeminEsnek && zeminOran != null && (y + ph) / H > zeminOran + 0.04) continue
          /*
           * Zeminden ÇOK yukarısı da yanlış: dış mekân fotoğraflarında en düz
           * yer gökyüzüdür, iç mekânda tavana yakın boşluk. Ekran ya zeminde
           * durur ya da duvarda makul bir yükseklikte asılıdır; ikisi de zemin
           * çizgisinin hemen üstündeki kuşaktır.
           */
          if (zeminOran != null && zeminOran - (y + ph) / H > 0.72) continue
          /*
           * Gökyüzü: mavi baskın ve kadrajın üst yarısında. Alt yarıda
           * aranmıyor, çünkü orada mavi bir şey büyük ihtimalle su, halı ya
           * da boyalı bir yüzeydir — hepsi ekran konabilecek yerlerdir.
           */
          if (tm && (y + ph / 2) / H < 0.58) {
            const mavi = dikdortgenToplami(tm, W, x, y, pw, ph) / (pw * ph)
            if (mavi > 10) continue
          }

          // Tavan şeridi ve kadrajın en dibi
          if (y / H < 0.06 || (y + ph) / H > 0.97) continue
          // Kadraj kenarına yapışık: yarısı dışarıda kalmış bir yüzeydir
          const kenarPay = Math.max(2, Math.round(W * 0.02))
          if (x < kenarPay || x + pw > W - kenarPay) continue
        }

        /*
         * GEOMETRİ — kadraj kurallarından bağımsız, her zaman geçerli.
         * Kısıt merdiveninin son basamağında zemin/gökyüzü/tavan kuralları
         * kalkıyor; ama bir eşyanın üstüne ya da düz olmayan bir yüzeye
         * yerleştirmek hiçbir durumda doğru değil.
         */
        if (fotograf) {
          /*
           * NESNENİN ÜSTÜ. Model bir sandalye, masa, saksı ya da insan
           * gördüyse orası odanın önündeki hacimdir; oraya konan ekran
           * havada asılı durur. Küçük bir pay bırakılıyor (%8): nesnenin
           * kenarı adayın köşesine değiyor diye iyi bir yer elenmesin.
           */
          if (te) {
            const dolu = dikdortgenToplami(te, W, x, y, pw, ph) / (pw * ph)
            if (dolu > 0.08) continue
          }
          /*
           * DERİNLİK SINAMASI — asıl ölçüt bu.
           *
           * Yüzeye düzlem uyduruluyor: artık büyükse orası düz bir yüzey
           * değil (mobilya yığını, bitki, kalabalık raf). Düzlemin önüne
           * çıkan piksel varsa orada bir şey duruyor demektir — model onu
           * adıyla tanımasa bile.
           */
          if (derinlik) {
            const d = duzlemDegeri(x, y, pw, ph)
            if (d.artik > 0.09) continue
            if (d.onundeki > 0.22) continue
          }
        }

        /*
         * ÇERÇEVE KONTRASTI — "burası bir yüzey mi, yoksa büyük bir şeyin
         * ortasından kestiğim rastgele bir parça mı?"
         *
         * İçi sakin AMA kenarı belirgin olan alan, gerçekten sınırları
         * olan bir yüzeydir: asılı bir panel, bir pano, odadaki mevcut
         * ekran, duvardaki kaplama bölümü. Boş duvarın ortasından
         * kesilen bir dikdörtgenin kenarı da içi kadar sakindir; işte
         * ikisini ayıran ölçüt bu.
         *
         * Dış çerçevenin gradyanı, iç bölge çıkarılarak bulunuyor.
         */
        let cerceve = 0
        if (fotograf) {
          const m = Math.max(2, Math.round(pw * 0.05))
          const dx = Math.max(0, x - m)
          const dy = Math.max(0, y - m)
          const dw = Math.min(W - dx, pw + 2 * m)
          const dh = Math.min(H - dy, ph + 2 * m)
          const disAlan = dw * dh - alan
          if (disAlan > 0) {
            const halka =
              (dikdortgenToplami(tg, W, dx, dy, dw, dh) -
                dikdortgenToplami(tg, W, x, y, pw, ph)) /
              disAlan
            cerceve = Math.max(0, Math.min(1, halka / (esik * 2)))
          }
        }

        const parlaklik = dikdortgenToplami(tp, W, x, y, pw, ph) / alan
        /*
         * Çok koyu ya da patlamış beyaz alanlar duvar değil: birincisi
         * gölge/karanlık köşe, ikincisi pencere ya da lamba. İkisinde de
         * "ayrıntı yok" ölçütü yanıltıcı biçimde düşük çıkar.
         *
         * FOTOĞRAFTA alt sınır düşük: odada zaten asılı duran koyu bir
         * ekran ya da panel, aranan yerin ta kendisidir.
         */
        const enAzParlaklik = fotograf ? 16 : 45
        /*
         * ÜST SINIR ARTIK ÇERÇEVEYE BAĞLI.
         *
         * Eski kural çok parlak her alanı eliyordu (pencere, lamba). Ama BOŞ
         * BEYAZ BİR PANO da çok parlaktır — ve ekranın konacağı yerin ta
         * kendisidir. Şehir sokağındaki bomboş beyaz bir reklam panosu tam bu
         * yüzden eleniyor, tasarım da binaların üstünde saçma bir yere
         * gidiyordu.
         *
         * Ayıran şey KENARIDIR: panonun çerçevesi vardır, gökyüzünün ya da
         * patlamış bir pencerenin yoktur. Kenarı belirginse parlaklık sınırı
         * neredeyse tamamen açılıyor.
         */
        const enCokParlaklik = fotograf && cerceve > 0.25 ? 253 : 240
        if (parlaklik < enAzParlaklik || parlaklik > enCokParlaklik) continue

        // Renk saçılımı: E[x²] − E[x]²
        const kareOrt = dikdortgenToplami(tk, W, x, y, pw, ph) / alan
        const sacilim = Math.sqrt(Math.max(0, kareOrt - parlaklik * parlaklik))
        if (sacilim > 46) continue // içinde koyu/açık iki ayrı şey var demektir

        /*
         * PUAN.
         *  • düzlük        : asıl ölçüt, küçük olan iyi
         *  • büyüklük      : aynı düzlükte daha geniş alan yeğlenir
         *  • dikey konum   : göz hizası tercih edilir; en alt şerit çoğunlukla
         *                    zemin ve kalabalık olur
         *  • yatay merkez  : kadrajın ortasına yakın olan yeğlenir
         *  • açık renk     : duvarlar çoğunlukla beyaz ya da açık tonludur;
         *                    koyu alanlar genellikle gölge, mobilya ya da
         *                    ekranın kendisi olur. Kural değil, TERCİH:
         *                    yeterince düz koyu bir alan hâlâ seçilebilir,
         *                    ama açık olan eşit şartlarda öne geçer.
         */
        const merkezY = (y + ph / 2) / H
        const merkezX = (x + pw / 2) / W
        const dikeyUygunluk = 1 - Math.min(1, Math.abs(merkezY - 0.45) / 0.5)
        const yatayUygunluk = 1 - Math.min(1, Math.abs(merkezX - 0.5) / 0.5)

        const acikRenk = Math.max(0, Math.min(1, (parlaklik - 70) / 130))


        /*
         * ODADA ZATEN EKRAN VARSA ORASI DOĞRU YERDİR.
         * Karenin genelinden belirgin koyu + kenarı belirgin = büyük
         * ihtimalle bir ekran ya da panel. İki koşul birlikte aranıyor;
         * tek başına koyuluk, gölgeyi ya da halıyı da seçerdi.
         */
        const koyuluk = Math.max(0, Math.min(1, (geneParlaklik - parlaklik) / Math.max(1, geneParlaklik)))
        let mevcutEkran = fotograf ? koyuluk * cerceve : 0

        /*
         * MODEL BİR EKRAN GÖRDÜYSE o kesin bilgidir ve sezgisel
         * "koyu + çerçeveli" tahmininin yerine geçer. Örtüşme oranı ne
         * kadar yüksekse aday o kadar iyi.
         */
        if (nesneler?.ekranKutusu) {
          const k = nesneler.ekranKutusu
          const kx0 = k.x * W
          const ky0 = k.y * H
          const kx1 = (k.x + k.w) * W
          const ky1 = (k.y + k.h) * H
          const ortakW = Math.max(0, Math.min(x + pw, kx1) - Math.max(x, kx0))
          const ortakH = Math.max(0, Math.min(y + ph, ky1) - Math.max(y, ky0))
          mevcutEkran = (ortakW * ortakH) / alan
          /* Şart turunda: ekranın bulunduğu yerle örtüşmeyen aday elenir. */
          if (ekranSart && mevcutEkran < 0.35) continue
        }

        /*
         * ZEMİNE YAKINLIK. Ekranın dibi zemin çizgisinin hemen üstündeyse
         * (ayaklı totem ya da normal yükseklikte asılmış panel) doğru kuşaktır;
         * yükseldikçe gökyüzüne/tavana doğru gider ve anlamını yitirir.
         */
        /*
         * DÜZLÜK PUANI: derinlik varsa gerçek geometriden, yoksa eskisi
         * gibi görüntü gradyanından. İkisi aynı şeyi ölçmüyor; derinlik
         * olan yerde onun sözü geçiyor.
         */
        const duzlem = derinlik ? duzlemDegeri(x, y, pw, ph) : null
        const geometrikDuzluk = duzlem
          ? Math.max(0, 1 - duzlem.artik / 0.09) * (1 - Math.min(1, duzlem.onundeki * 4))
          : 0

        const zeminYakinlik =
          fotograf && zeminOran != null
            ? 1 - Math.min(1, Math.max(0, zeminOran - (y + ph) / H) / 0.45)
            : 0

        /*
         * Açık renk tercihi fotoğrafta HAFİFLETİLDİ: bir toplantı odasında
         * en açık yer pencere kenarıdır ve ekran oraya konmaz. Kamerada
         * eskisi gibi kalıyor (orada aranan şey düz bir duvar).
         */
        const acikAgirlik = fotograf ? 0.9 : 2.2

        const puan =
          (1 - duzluk / esik) * 3 +
          (1 - Math.min(1, sacilim / 46)) * 1.6 +
          acikRenk * acikAgirlik +
          genislikOran * 1.4 +
          dikeyUygunluk * 0.9 +
          yatayUygunluk * 0.6 +
          cerceve * 3 +
          mevcutEkran * 2.6 +
          zeminYakinlik * 0.8 +
          geometrikDuzluk * 3.5

        if (!enIyi || puan > enIyi.puan) {
          enIyi = { x, y, w: pw, h: ph, duzluk, sacilim, parlaklik, puan }
        }
      }
    }
  }
  return enIyi
  }

  if (!enIyi) return null

  /*
   * BOŞ ALANI BÜYÜT VE ORTALA.
   *
   * Arama, adayları kaba adımlarla (pencere genişliğinin sekizde biri)
   * tarıyor: hız için gerekli, ama seçilen dikdörtgen boş alanın ortasına
   * denk gelmiyor — kenarına yapışık, yamuk duruyordu. "Boş yeri buluyor ama
   * ortalamıyor" şikâyeti tam olarak buydu.
   *
   * Burada seçilen dikdörtgen, dört bir yana doğru sakin kaldığı sürece
   * büyütülüyor: böylece o BOŞ ALANIN SINIRLARI bulunuyor. Sonra tasarımın
   * kendi en/boy oranındaki dikdörtgen bu alanın tam ortasına, alana sığan en
   * büyük ölçüde yerleştiriliyor.
   */
  const kutu = bosAlaniBul(enIyi)

  function bosAlaniBul(a) {
    const esik = esikTemel * turCarpani
    let { x, y, w, h } = a
    const kenarPay = fotograf ? Math.max(2, Math.round(W * 0.02)) : 0
    /* Bir şeridin eklenebilir olması: sakin ve üstünde eşya yok. */
    const seritUygun = (sx, sy, sw, sh) => {
      if (sx < kenarPay || sy < 0 || sx + sw > W - kenarPay || sy + sh > H) return false
      if (sw <= 0 || sh <= 0) return false
      const g = dikdortgenToplami(tg, W, sx, sy, sw, sh) / (sw * sh)
      if (g > esik) return false
      if (te && dikdortgenToplami(te, W, sx, sy, sw, sh) / (sw * sh) > 0.02) return false
      if (fotograf && zeminOran != null && (sy + sh) / H > zeminOran + 0.04) return false
      return true
    }
    let buyudu = true
    while (buyudu) {
      buyudu = false
      if (seritUygun(x - 1, y, 1, h)) { x -= 1; w += 1; buyudu = true }
      if (seritUygun(x + w, y, 1, h)) { w += 1; buyudu = true }
      if (seritUygun(x, y - 1, w, 1)) { y -= 1; h += 1; buyudu = true }
      if (seritUygun(x, y + h, w, 1)) { h += 1; buyudu = true }
    }
    return { x, y, w, h }
  }

  /*
   * Tasarımın oranındaki en büyük dikdörtgen, boş alanın ortasına. Kenarlara
   * biraz nefes payı bırakılıyor (%94): ekranın kasası ve gölgesi alanın tam
   * sınırına dayanınca sıkışmış görünüyor.
   */
  const payW = kutu.w * 0.94
  const payH = kutu.h * 0.94
  let sonW = Math.min(payW, payH * oran)
  let sonH = sonW / oran
  if (sonW < 4 || sonH < 4) {
    sonW = enIyi.w
    sonH = enIyi.h
  }
  const sonX = kutu.x + (kutu.w - sonW) / 2
  const sonY = kutu.y + (kutu.h - sonH) / 2

  enIyi = { ...enIyi, x: sonX, y: sonY, w: sonW, h: sonH }

  return {
    x: enIyi.x / W,
    y: enIyi.y / H,
    w: enIyi.w / W,
    h: enIyi.h / H,
    duzluk: enIyi.duzluk,
    sacilim: enIyi.sacilim,
    parlaklik: enIyi.parlaklik,
    /*
     * Güven: hem pürüzsüzlük hem tek düzelik. Arayüz bunu kullanıcıya
     * "kuvvetli/zayıf öneri" olarak gösteriyor; zayıfsa kullanıcı elle
     * taşımaya devam eder.
     */
    guven: Math.max(
      0,
      Math.min(
        1,
        ((1 - enIyi.duzluk / (esikTemel * turCarpani)) * 0.6 +
          (1 - Math.min(1, enIyi.sacilim / 46)) * 0.4) *
          /* Gevşetilmiş turda bulunan yer daha az güvenilir. */
          (turCarpani > 1 ? 0.6 : 1),
      ),
    ),
  }
}

/** Her elemanın karesi — renk saçılımı hesabı için. */
function kareler(kaynak) {
  const c = new Float32Array(kaynak.length)
  for (let i = 0; i < kaynak.length; i++) c[i] = kaynak[i] * kaynak[i]
  return c
}

/** Toplam tablosu (integral image): T[y][x] = sol üst dikdörtgenin toplamı. */
function toplamTablosu(kaynak, W, H) {
  const t = new Float64Array((W + 1) * (H + 1))
  for (let y = 0; y < H; y++) {
    let satir = 0
    for (let x = 0; x < W; x++) {
      satir += kaynak[y * W + x]
      t[(y + 1) * (W + 1) + (x + 1)] = t[y * (W + 1) + (x + 1)] + satir
    }
  }
  return t
}

/** Toplam tablosundan bir dikdörtgenin toplamı — dört okuma. */
function dikdortgenToplami(t, W, x, y, w, h) {
  const g = W + 1
  const a = t[y * g + x]
  const b = t[y * g + (x + w)]
  const c = t[(y + h) * g + x]
  const d = t[(y + h) * g + (x + w)]
  return d - b - c + a
}

/**
 * ZEMİN ÇİZGİSİNİ BULMA.
 *
 * Kiosk bir yere konacaksa oturacağı bir zemin gerekiyor. Fotoğrafta zemin,
 * duvarın (ya da vitrinin) bittiği yerdeki YATAY KIRILMADIR: o satırda üstteki
 * ve alttaki pikseller birbirinden belirgin biçimde ayrılır — renk değişir,
 * çoğu zaman bir gölge ya da süpürgelik çizgisi vardır.
 *
 * Yöntem: her satır için dikey komşu farkının satır ortalaması alınıyor; en
 * yüksek ortalamaya sahip satır zemin çizgisi kabul ediliyor. Arama yalnızca
 * karenin alt yarısında yapılıyor — üst yarıdaki güçlü yatay kırılmalar tavan,
 * raf ya da pencere üstü olur, zemin değil.
 *
 * Kesin bir ölçüm değil; fotoğrafta belirgin bir kırılma yoksa (düz bir gökyüzü,
 * tek renk bir arka plan) null döner ve çağıran taraf kendi varsayımına döner.
 *
 * @param {HTMLCanvasElement|HTMLImageElement} kaynak
 * @param {number} enAz  aramanın başladığı yükseklik oranı
 * @param {number} enCok aramanın bittiği oran
 * @returns {number|null} zemin çizgisinin yükseklik ORANI (0–1)
 */
export function zeminCizgisiBul(kaynak, enAz = 0.45, enCok = 0.94) {
  const kaynakW = kaynak.videoWidth || kaynak.width
  const kaynakH = kaynak.videoHeight || kaynak.height
  if (!kaynakW || !kaynakH) return null

  const W = COZUMLEME_W
  const H = Math.max(4, Math.round((W * kaynakH) / kaynakW))

  const tuval = document.createElement('canvas')
  tuval.width = W
  tuval.height = H
  const ctx = tuval.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(kaynak, 0, 0, W, H)

  let veri
  try {
    veri = ctx.getImageData(0, 0, W, H).data
  } catch {
    return null
  }

  const gri = new Float32Array(W * H)
  for (let i = 0, p = 0; i < gri.length; i++, p += 4) {
    gri[i] = 0.299 * veri[p] + 0.587 * veri[p + 1] + 0.114 * veri[p + 2]
  }

  const bas = Math.max(1, Math.floor(H * enAz))
  const son = Math.min(H - 2, Math.floor(H * enCok))
  if (son <= bas) return null

  let enIyi = null
  let toplam = 0
  let sayi = 0
  for (let y = bas; y <= son; y++) {
    let fark = 0
    for (let x = 0; x < W; x++) fark += Math.abs(gri[(y + 1) * W + x] - gri[y * W + x])
    const ort = fark / W
    toplam += ort
    sayi++
    if (!enIyi || ort > enIyi.ort) enIyi = { y, ort }
  }

  /*
   * Kırılma, alt yarının genel hareketliliğinden belirgin biçimde ayrışmalı.
   * Ayrışmıyorsa ortada bir zemin çizgisi yok demektir — uydurmaktansa
   * cevapsız kalmak daha iyi.
   */
  const ortalama = toplam / Math.max(1, sayi)
  if (!enIyi || enIyi.ort < Math.max(3, ortalama * 1.8)) return null

  return (enIyi.y + 1) / H
}
