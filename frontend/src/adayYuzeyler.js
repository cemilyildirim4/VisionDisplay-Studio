/**
 * ADAY YERLEŞİM KARELERİ — "en iyi yeri ben bulayım" yerine "uygun yerleri
 * göstereyim, sen seç".
 *
 * NEDEN: tek bir "en uygun yer" seçmek her fotoğrafta tutmuyor. Model bazen
 * bilbordun yalnızca bir parçasını, bazen yansımayı, bazen de kullanıcının
 * hiç düşünmediği bir duvarı işaretliyor. Oysa fotoğrafa bakan insan doğru
 * yeri BİR BAKIŞTA görüyor — eksik olan şey ona seçenek sunmak.
 *
 * Bu dosya fotoğraftaki yerleştirilebilir yüzeyleri TOPLU olarak çıkarıyor:
 * her biri kendi perspektifiyle bir dörtgen. Arayüz bunları tıklanabilir
 * kareler olarak çiziyor; kullanıcı birine dokununca tasarım oraya oturuyor.
 *
 * ELEME KURALLARI (sırayla):
 *   • gökyüzü — derinlikte kusursuz bir düzlemdir, ekran konulamaz;
 *   • eşya/insan/araç maskesi — önü kapalı yüzeye ekran asılmaz;
 *   • zemin çizgisinin altı — yere yatan bir ekran istenmiyor;
 *   • düzlemsellik — derinlik haritasına uydurulan düzlemin artık payı.
 *
 * PERSPEKTİF: düzlem uydurmadan gelen ters-derinlik eğimi kullanılıyor.
 * Görünen boy ≈ 1/Z olduğu için, karenin sol ve sağ kenarı kendi
 * derinliklerine göre uzayıp kısalıyor; sonuç yüzeyin yamukluğunu izleyen
 * bir dörtgen oluyor. Düzlem çıkmazsa kare dik dörtgen kalıyor.
 */

import { mevcutEkranYuzeyi } from './ekranYuzeyi.js'
import { parlakEkranKutusu } from './parlakEkran.js'
import { SINIF } from './mekanHaritasi.js'
import { perspektifeOturt } from './homografi.js'

/** Çözümleme genişliği — hızlı ve yeterli. */
const COZUMLEME_W = 160

/** Bir karede kabul edilen en yüksek gökyüzü ve eşya payı. */
const GOK_SINIRI = 0.12
const ENGEL_SINIRI = 0.08

/** Aday sayılabilmesi için gereken en düşük puan. */
/* Puanlama ölçütleri çeşitlenince tipik puanlar düştü; eşik buna göre. */
const PUAN_ESIGI = 54

/** Aynı yerin iki kez önerilmemesi için en az merkez ayrımı (kadraj payı). */
/* 0,13 iken aynı pano üzerine dört ayrı kare düşüyordu; 0,20 ile seçenekler ayrışıyor. */
const AYRIM = 0.2

/**
 * Fotoğraftaki aday yerleşim yüzeylerini çıkarır.
 *
 * @param {HTMLCanvasElement} tuval
 * @param {object} sec
 * @param {object|null} [sec.nesneler]  nesneHaritasi çıktısı
 * @param {object|null} [sec.derinlik]  derinlikHaritasi çıktısı
 * @param {object|null} [sec.yuzey]     mevcutEkranYuzeyi çıktısı (varsa ilk sıra)
 * @param {number} [sec.oran]           tasarımın en/boy oranı
 * @param {number|null} [sec.zeminOran] zemin çizgisi (0–1)
 * @param {number} [sec.enCok]          döndürülecek aday sayısı
 * @returns {Array<{koseler:Array<{x:number,y:number}>, skor:number, tur:string}>}
 */
export function adaylariBul(tuval, sec = {}) {
  const {
    nesneler = null,
    derinlik = null,
    yuzey = null,
    oran = 16 / 9,
    zeminOran = null,
    harita = null,
    /* Sahnenin kaçış noktası (0–1) ve güveni — bkz. aciBul.js */
    aci = null,
    enCok = 5,
  } = sec

  const sonuc = []
  /* Fotoğrafta gerçek bir ekran varsa hep birinci sıra: en doğru hedef odur. */
  if (yuzey?.koseler?.length === 4) {
    sonuc.push({ koseler: yuzey.koseler, skor: 100, tur: 'screen', etiket: 'Mevcut ekran yüzeyi' })
  }

  const kw = tuval.width || tuval.naturalWidth
  const kh = tuval.height || tuval.naturalHeight
  if (!kw || !kh) return sonuc

  const W = Math.min(COZUMLEME_W, kw)
  const H = Math.max(1, Math.round((kh * W) / kw))
  const gok = gokMaskesi(tuval, W, H)
  const engel = nesneler?.engel ? olcekle(nesneler.engel, nesneler.w, nesneler.h, W, H) : null
  const der = derinlik?.veri ? olcekle(derinlik.veri, derinlik.w, derinlik.h, W, H) : null

  /* Derinliğin yayılımı — artık payını ölçekten bağımsız kılıyor. */
  let derYayilim = 1
  if (der) {
    let enAz = Infinity
    let enCokD = -Infinity
    for (let i = 0; i < der.length; i++) {
      if (der[i] < enAz) enAz = der[i]
      if (der[i] > enCokD) enCokD = der[i]
    }
    derYayilim = Math.max(1e-6, enCokD - enAz)
  }

  /*
   * ADAYLAR TASARIMDAN BAĞIMSIZ.
   *
   * Tarama penceresi tasarımın en/boy oranını kullanıyordu; bu yüzden aynı
   * fotoğraf, tasarım ölçüsü değişince başka yerler öneriyordu — kullanıcının
   * "ikinci kez eklediğimde farklı yerlere koyuyor" dediği hata buydu.
   * Artık sabit üç oranla taranıyor (yatay, kare, dikey); tasarım sonradan
   * seçilen yüzeyin içine oturuyor. Böylece aynı fotoğraf her seferinde aynı
   * adayları veriyor.
   */
  void oran
  const ORANLAR = [16 / 9, 1, 9 / 16]
  const ham = []

  /* 0,19 tarandığında avuç içi kadar kareler öneriliyordu; kaldırıldı. */
  for (const [payIdx, pay] of [0.52, 0.4, 0.3].entries()) {
    const enBoy = ORANLAR[payIdx % ORANLAR.length]
    const kwPx = pay * W
    const khPx = kwPx / enBoy
    if (khPx > H * 0.92 || khPx < 6 || kwPx < 8) continue
    const adim = Math.max(4, Math.round(kwPx * 0.3))

    for (let y0 = 0; y0 + khPx <= H; y0 += adim) {
      for (let x0 = 0; x0 + kwPx <= W; x0 += adim) {
        const x1 = Math.round(x0 + kwPx)
        const y1 = Math.round(y0 + khPx)

        /*
         * ZEMİN VE ALT ŞERİT ELEMESİ.
         *
         * Kullanıcının bilbord fotoğrafında yol, araçlar ve korkuluk üzerine
         * kareler öneriliyordu: derinlikte yol da düz bir yüzeydir. Kural
         * netleşti: zemin çizgisinin altı ve kadrajın alt beşte biri
         * yerleştirilebilir yüzey sayılmıyor — oralar yürüme/araç alanı.
         */
        if (zeminOran != null && y1 / H > zeminOran) continue
        if (y0 / H > 0.72) continue

        let gokSay = 0
        let engelSay = 0
        let n = 0
        for (let y = Math.round(y0); y < y1; y++) {
          for (let x = Math.round(x0); x < x1; x++) {
            const i = y * W + x
            if (gok && gok[i] > 0.5) gokSay++
            if (engel && engel[i] > 0.5) engelSay++
            n++
          }
        }
        if (!n) continue
        const gokPay = gokSay / n
        const engelPay = engelSay / n
        if (gokPay > GOK_SINIRI || engelPay > ENGEL_SINIRI) continue

        /*
         * MEKÂN HARİTASI DENETİMİ.
         *
         * Karenin altında kalan piksellerin ne olduğu tek tek biliniyor.
         * Kural: en az %85'i DUVAR ya da EKRAN olacak; zemin, tavan,
         * gökyüzü, kapı ve nesne payı %6'yı geçmeyecek. Böylece "boş
         * görünen ama aslında zemin/kapı olan" alanlar eleniyor.
         */
        let duvarPay = 0
        let yasakPay = 0
        if (harita) {
          const hx0 = Math.round((x0 / W) * harita.w)
          const hx1 = Math.max(hx0 + 1, Math.round((x1 / W) * harita.w))
          const hy0 = Math.round((y0 / H) * harita.h)
          const hy1 = Math.max(hy0 + 1, Math.round((y1 / H) * harita.h))
          let duvar = 0
          let yasak = 0
          let toplam = 0
          for (let hy = hy0; hy < hy1; hy++) {
            for (let hx = hx0; hx < hx1; hx++) {
              const sv = harita.sinif[hy * harita.w + hx]
              if (sv === SINIF.DUVAR || sv === SINIF.EKRAN || sv === SINIF.CAM) duvar++
              else if (sv !== SINIF.BILINMEYEN) yasak++
              toplam++
            }
          }
          duvarPay = toplam ? duvar / toplam : 0
          yasakPay = toplam ? yasak / toplam : 0
          /*
           * HARİTA, ARAMA KUTULARINI DARALTMAMALI.
           *
           * Eleme burada yapılınca pano araması için kullanılan aday havuzu
           * da küçülüyor ve gerçek pano bulunamıyordu. Bu yüzden yasak payı
           * adayın üstünde taşınıyor; eleme aşağıda, arama kutuları
           * kurulduktan SONRA yapılıyor.
           */
          /*
           * HARİTA KATI FİLTRE DEĞİL.
           *
           * %85 duvar şartı konunca hiçbir aday kalmadı: kural tabanlı harita
           * duvarın bir kısmını cam/tavan sanabiliyor. Kesin olan tek şey
           * YASAK sınıflar; onların payı %25'i geçerse aday elenir, kalan
           * durumda harita yalnızca puanı etkiler.
           */
          /* (eleme aşağıda) */
        }

        let duzluk = 0.5
        let duzlem = null
        if (der) {
          duzlem = duzlemUydur(der, W, Math.round(x0), Math.round(y0), x1, y1)
          if (!duzlem) continue
          duzluk = Math.max(0, 1 - (duzlem.artik / derYayilim) * 26)
          /*
           * YATAY YÜZEY (zemin, yol, tavan) ELENİYOR.
           *
           * Dik bir duvarda derinlik yukarıdan aşağıya neredeyse sabittir;
           * zeminde ise sürekli değişir. Eşik 0,55'ten 0,22'ye çekildi:
           * yol yüzeyleri o aralıkta kalıp aday olabiliyordu.
           */
          const dikeyEgim = Math.abs(duzlem.b) * H
          const yatayEgim = Math.abs(duzlem.a) * W
          if (dikeyEgim > derYayilim * 0.22 && dikeyEgim > yatayEgim) continue
          /*
           * DESEN YÜZEYİ DİSKALİFİYE ETMİYOR.
           *
           * Eşik 0,35'ti; kaplama deseni, derz ve gölge olan duvarlar bu
           * yüzden eleniyordu. Düzlemsellik DERİNLİKTEN ölçülüyor, yani
           * boyalı bir desen zaten etkilemiyor; kalan pay ağaç/çalı gibi
           * gerçekten girintili yüzeyler için yeterli.
           */
          if (duzluk < 0.18) continue
        }

        /*
         * KAPI ELEMESİ.
         *
         * Kapılar Pascal-VOC sınıflarında yok. Ama biçimleri belirgin:
         * zemine oturur, boyu eninden fazladır ve çevresine göre koyudur.
         * Bu üçü birlikteyse ekran oraya konmaz.
         */
        if (zeminOran != null) {
          const zemine = Math.abs(y1 / H - zeminOran) < 0.08
          const dik = y1 - y0 > (x1 - x0) * 1.05
          if (zemine && dik) continue
        }

        /* Kadraj dışına taşan aday gösterilmiyor. */
        if (x0 / W < 0.015 || x1 / W > 0.985 || y0 / H < 0.015 || y1 / H > 0.985) continue

        /*
         * SIRALAMA ÖLÇÜTLERİ.
         *
         * Düzlemsellik ve temizlik yetmiyordu: kadrajın kıyısındaki, göz
         * hizasının çok üstünde/altındaki alanlar da yüksek puan alıyordu.
         * İki ölçüt eklendi: MERKEZE yakınlık (bakışın doğal olarak gittiği
         * yer) ve GÖZ HİZASI (kadrajın orta bandı).
         */
        const merkezXo = (x0 + x1) / 2 / W
        const merkezYo = (y0 + y1) / 2 / H
        const merkezlik = 1 - Math.min(1, Math.abs(merkezXo - 0.5) * 2)
        const gozHizasi = 1 - Math.min(1, Math.abs(merkezYo - 0.45) * 2.4)
        const skor =
          duzluk * 36 +
          (1 - engelPay) * 14 +
          (1 - gokPay) * 8 +
          pay * 18 +
          merkezlik * 10 +
          gozHizasi * 8 +
          (harita ? duvarPay * 14 : 7)

        /*
         * SON DENETİM: perspektif düzeltmesinden SONRA da dörtgen kadrajın
         * içinde kalmalı. Önceki denetim düzeltme öncesi kutuya bakıyordu;
         * eğilen kenar kadraj dışına çıkabiliyordu.
         */
        const sonKoseler = aci?.kacis
          ? perspektifeOturt(
              koseleriKur(x0, y0, x1, y1, duzlem, W, H),
              aci.kacis,
              Math.min(1, (aci.guven || 0) * 1.2),
            )
          : koseleriKur(x0, y0, x1, y1, duzlem, W, H)
        if (sonKoseler.some((k) => k.x < 0.005 || k.x > 0.995 || k.y < 0.005 || k.y > 0.995)) continue

        ham.push({
          skor,
          yasakPay,
          merkez: { x: (x0 + x1) / 2 / W, y: (y0 + y1) / 2 / H },
          /*
           * KENARLAR SAHNENİN PERSPEKTİFİNE OTURUYOR.
           *
           * Derinlikten türeyen yamukluk kabaca doğru ama sahnenin kaçış
           * çizgilerini izlemiyordu; ekran havada dönmüş gibi duruyordu.
           * Kaçış noktası ölçülebildiyse üst/alt kenarlar ona yakınsıyor,
           * yan kenarlar düşey kalıyor. Merkez ve ölçü değişmiyor.
           */
          koseler: sonKoseler,
          tur: 'surface',
        })
      }
    }
  }

  ham.sort((a, b) => b.skor - a.skor)

  /*
   * PANO/EKRAN ARAMASI — NESNE MODELİ YETMEDİĞİNDE.
   *
   * Nesne tanıma modeli Pascal-VOC sınıflarını biliyor; orada "televizyon"
   * var ama BİLBORD yok. Açık hava panolarında bu yüzden hiç ekran
   * bulunamıyor, oysa kullanıcının beklediği tam olarak o: fotoğraftaki
   * mevcut panonun içine yerleşmek.
   *
   * Çare geometri: en güçlü birkaç adayın çevresinde kenar araması yapılıyor
   * (ekranYuzeyi.js). Dört kenarı da güçlü, çerçevesi belirgin bir dikdörtgen
   * çıkarsa orası bir gösterim yüzeyidir — türü 'screen' oluyor ve tasarım
   * oraya oturuyor.
   */
  /*
   * PANO/ÇERÇEVE ARAMASI HER ZAMAN YAPILIYOR.
   *
   * Önce yalnızca başka aday yokken çalışıyordu; oysa kullanıcının ilk
   * beklediği şey her fotoğrafta aynı: duvarla çerçeve arasındaki gösterim
   * alanı. Artık bu arama her seferinde koşuyor ve bulduğu yüzey listenin
   * BAŞINA geçiyor; boş duvarlar onun altında sıralanıyor.
   */
  {
    /*
     * ARAMA KUTULARI: en güçlü adayların BİRLEŞİMİ ve kadrajın ortası.
     *
     * Tek tek adaylarla arandığında panonun yalnızca bir şeridi bulunuyordu
     * (aday kutusu panonun bir parçasıydı, Hough da o parçanın kenarlarını
     * gördü). Birleşim kutusu bütün panoyu kapsıyor; kazanan, dört kenarı
     * güçlü olanlar arasında EN BÜYÜK alanlı dörtgen oluyor.
     */
    const kutular = []
    /*
     * ÖNCE PARLAK EKRAN/VİTRİN.
     *
     * Kenar araması bir dikdörtgenin KENARINI arıyor; oysa çalışan bir ekran
     * ya da ışıklı vitrin çevresinden en çok İÇİYLE ayrılıyor. AVM'deki dev
     * kavisli ekran, mağaza vitrini ve yol kenarındaki bilbord bu yolla
     * bulunuyor; kutusu kenar aramasına başlangıç olarak veriliyor.
     */
    let parlak = null
    try {
      parlak = parlakEkranKutusu(tuval)
    } catch {
      parlak = null
    }
    if (parlak) kutular.push(parlak)

    const iyiler = ham.slice(0, 4)
    if (iyiler.length) {
      const xs = iyiler.flatMap((a) => a.koseler.map((k) => k.x))
      const ys = iyiler.flatMap((a) => a.koseler.map((k) => k.y))
      kutular.push({
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys),
      })
    }
    /*
     * KADRAJIN ORTASI DA BİR ARAMA KUTUSU.
     *
     * Bir ara kaldırmıştım: Hough bina hatlarını birleştirip yamuk dörtgenler
     * üretiyordu. Ama o zamandan beri üç denetim eklendi — makul dörtgen
     * (kenar oranı + köşe açısı), alan sınırı (%3–45) ve kenara yapışmama.
     * Bunlarla birlikte merkez araması güvenli; olmadığında mekân haritası
     * adayları azaltınca pano hiç bulunamıyordu.
     */
    kutular.push({ x: 0.1, y: 0.06, w: 0.8, h: 0.72 })
    /*
     * Daha dar iki kırpma: geniş kutuda Hough bina hatlarını birleştirip
     * kadrajın yarısını kaplayan dörtgenler üretebiliyor. Dar kutular panoyu
     * yalıtıyor; kazanan, geçerli olanlar arasında en büyük alanlı dörtgen.
     */
    kutular.push({ x: 0.18, y: 0.12, w: 0.64, h: 0.58 })
    kutular.push({ x: 0.28, y: 0.18, w: 0.44, h: 0.42 })
    for (const a of iyiler) {
      const xs = a.koseler.map((k) => k.x)
      const ys = a.koseler.map((k) => k.y)
      kutular.push({
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys),
      })
    }

    let enIyi = null
    for (const kutu of kutular) {
      if (!(kutu.w > 0.08) || !(kutu.h > 0.05)) continue
      let bulunan = null
      try {
        bulunan = mevcutEkranYuzeyi(tuval, { ekranKutusu: kutu })
      } catch {
        bulunan = null
      }
      if (!bulunan || bulunan.kaba || bulunan.skor < 70) continue
      /*
       * BOZUK DÖRTGEN ELENİYOR.
       *
       * Kenar araması bazen panonun bir kenarını yakalayıp öbür kenarı
       * binanın hattından alıyordu; sonuç, bir köşesi yukarı fırlamış kama
       * gibi bir dörtgen oluyordu (kullanıcının gönderdiği bilbord örneği).
       * Gerçek bir dikdörtgenin perspektif izdüşümünde karşılıklı kenarlar
       * birbirine yakın uzunlukta kalır ve köşeler ~90°'den çok sapmaz.
       */
      if (!makulDortgen(bulunan.koseler)) continue
      /*
       * TEKDÜZELİK ŞARTI KALDIRILDI.
       *
       * "Panonun içi tekdüzedir" varsayımı yanlış çıktı: yayın yapan bir
       * ekranın içi manzara, reklam, video olabiliyor — sapma yüksek ve
       * gerçek pano eleniyordu. Junk dörtgenleri zaten alan sınırı (%45),
       * kenara yapışmama ve makul dörtgen denetimi eliyor.
       */
      const alan = dortgenAlanOran(bulunan.koseler)
      /*
       * PANO OLMA ŞARTLARI.
       *  • kadrajın %3'ünden büyük, %45'inden küçük olmalı — daha büyüğü
       *    artık "sahnenin kendisi"dir, pano değil;
       *  • kenarlara yapışmamalı: gerçek bir pano fotoğrafın içinde durur.
       */
      /*
       * Üst sınır 0,45 iken kadrajın yarısını kaplayan yamuk birleştirmeler
       * geçiyordu (bina hatları + pano kenarı). Gerçek panolar kadrajın
       * %3–30'u arasında kalıyor.
       */
      if (!(alan > 0.03) || alan > 0.3) continue
      const kx = bulunan.koseler.map((k) => k.x)
      const ky = bulunan.koseler.map((k) => k.y)
      if (Math.min(...kx) < 0.02 || Math.max(...kx) > 0.98) continue
      if (Math.min(...ky) < 0.02 || Math.max(...ky) > 0.98) continue
      /* Şerit gibi ince dörtgen pano değildir; en/boy 0,3–5 arasında olmalı. */
      const oranDeg = dortgenEnBoy(bulunan.koseler)
      if (!(oranDeg > 0.3) || !(oranDeg < 5)) continue
      if (!enIyi || alan > enIyi.alan) enIyi = { koseler: bulunan.koseler, alan }
    }
    /*
     * PANONUN GERÇEK YÜZEYİNE OTURTMA.
     *
     * Kenar araması dörtgeni panonun biraz dışına taşırabiliyordu; tasarım
     * o dörtgenin ortasına oturduğu için panoda aşağıda/yukarıda kalmış
     * görünüyordu. Burada dörtgen, içindeki TEK DÜZE yüzeye (panonun
     * kendisi) göre daraltılıyor: merkezden dışa doğru renk benzerliği
     * takip ediliyor, kasa/gökyüzü/yol başlayınca duruluyor.
     */
    if (enIyi) enIyi = { ...enIyi, koseler: panoyaOturt(tuval, enIyi.koseler) }

    if (enIyi && !sonuc.some((a) => a.tur === 'screen')) {
      sonuc.unshift({ koseler: enIyi.koseler, skor: 92, tur: 'screen', etiket: 'Duvar–çerçeve arası' })
    } else if (parlak && !sonuc.some((a) => a.tur === 'screen')) {
      /*
       * Kenar araması tutmadıysa parlak bölgenin KENDİSİ hedef oluyor.
       * Kasa payı için %5 içeri çekiliyor: tasarım çerçevenin üstüne
       * binmesin — kullanıcının bildirdiği hata buydu.
       */
      const ic = 0.05
      const x0 = parlak.x + parlak.w * ic
      const y0 = parlak.y + parlak.h * ic
      const x1 = parlak.x + parlak.w * (1 - ic)
      const y1 = parlak.y + parlak.h * (1 - ic)
      sonuc.unshift({
        koseler: [
          { x: x0, y: y0 },
          { x: x1, y: y0 },
          { x: x1, y: y1 },
          { x: x0, y: y1 },
        ],
        skor: 88,
        tur: 'screen',
        etiket: 'Fotoğraftaki ekran',
      })
    }
  }

  /*
   * PUANI DÜŞÜK ADAY GÖSTERİLMİYOR.
   *
   * Listeyi altıya tamamlamak için zayıf adayları da göstermek zarar
   * veriyordu: kullanıcı yolun üzerindeki kareyi görüp "saçma" diyor.
   * Az ama doğru seçenek, çok ama şüpheli seçenekten iyi.
   */
  const elenmis = ham.filter((a) => a.skor >= PUAN_ESIGI && (a.yasakPay || 0) <= 0.25)

  const merkezler = sonuc.map((a) => dortgenMerkez(a.koseler))
  for (const a of elenmis) {
    if (sonuc.length >= enCok) break
    if (merkezler.some((m) => Math.hypot(m.x - a.merkez.x, m.y - a.merkez.y) < AYRIM)) continue
    merkezler.push(a.merkez)
    sonuc.push({
      koseler: a.koseler,
      skor: Math.round(a.skor),
      tur: a.tur,
      /*
       * Kullanıcıya "3 numaralı kare" demek yetmiyor; nerede olduğunu da
       * söylemek gerekiyor. Ad, karenin kadrajdaki yerinden türetiliyor.
       */
      etiket: yuzeyAdi(a.merkez),
    })
  }
  return sonuc
}

/* ------------------------------------------------------------------ */

/**
 * Karenin köşeleri, düzlemin eğimine göre yamuklaştırılmış hâli.
 * Görünen boy ≈ 1/Z; sol ve sağ kenar kendi ters-derinliğiyle ölçekleniyor.
 */
function koseleriKur(x0, y0, x1, y1, duzlem, W, H) {
  const dik = [
    { x: x0 / W, y: y0 / H },
    { x: x1 / W, y: y0 / H },
    { x: x1 / W, y: y1 / H },
    { x: x0 / W, y: y1 / H },
  ]
  if (!duzlem) return dik
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const yariH = (y1 - y0) / 2
  const zc = duzlem.a * cx + duzlem.b * cy + duzlem.c
  const zl = duzlem.a * x0 + duzlem.b * cy + duzlem.c
  const zr = duzlem.a * x1 + duzlem.b * cy + duzlem.c
  if (!(zc > 1e-6) || !(zl > 1e-6) || !(zr > 1e-6)) return dik
  const sl = Math.max(0.55, Math.min(1.8, zl / zc))
  const sr = Math.max(0.55, Math.min(1.8, zr / zc))
  /* Aşırı yamukluk çizimde bozuk görünür; hafif eğimler zaten yeterli. */
  if (Math.abs(sl - sr) < 0.02) return dik
  return [
    { x: x0 / W, y: (cy - yariH * sl) / H },
    { x: x1 / W, y: (cy - yariH * sr) / H },
    { x: x1 / W, y: (cy + yariH * sr) / H },
    { x: x0 / W, y: (cy + yariH * sl) / H },
  ]
}

/** En küçük kareler: z = a·x + b·y + c, artık payıyla birlikte. */
function duzlemUydur(veri, W, x0, y0, x1, y1) {
  const atlaX = Math.max(1, Math.floor((x1 - x0) / 24))
  const atlaY = Math.max(1, Math.floor((y1 - y0) / 24))
  let sx = 0, sy = 0, sz = 0, sxx = 0, sxy = 0, syy = 0, sxz = 0, syz = 0, m = 0
  for (let y = y0; y < y1; y += atlaY) {
    for (let x = x0; x < x1; x += atlaX) {
      const z = veri[y * W + x]
      m++
      sx += x; sy += y; sz += z
      sxx += x * x; sxy += x * y; syy += y * y
      sxz += x * z; syz += y * z
    }
  }
  if (m < 8) return null
  const m11 = sxx - (sx * sx) / m
  const m12 = sxy - (sx * sy) / m
  const m22 = syy - (sy * sy) / m
  const v1 = sxz - (sx * sz) / m
  const v2 = syz - (sy * sz) / m
  const det = m11 * m22 - m12 * m12
  if (Math.abs(det) < 1e-9) return null
  const a = (v1 * m22 - v2 * m12) / det
  const b = (v2 * m11 - v1 * m12) / det
  const c = (sz - a * sx - b * sy) / m

  let hata = 0
  let k = 0
  for (let y = y0; y < y1; y += atlaY) {
    for (let x = x0; x < x1; x += atlaX) {
      const f = veri[y * W + x] - (a * x + b * y + c)
      hata += f * f
      k++
    }
  }
  return { a, b, c, artik: Math.sqrt(hata / Math.max(1, k)) }
}

/** Gökyüzü: mavi baskın pikseller (ölçülmüş eşik, bkz. ozelMekan.js). */
function gokMaskesi(tuval, w, h) {
  try {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(tuval, 0, 0, w, h)
    const d = ctx.getImageData(0, 0, w, h).data
    const m = new Float32Array(w * h)
    for (let i = 0, p = 0; i < m.length; i++, p += 4) {
      m[i] = d[p + 2] - d[p] > 25 ? 1 : 0
    }
    return m
  } catch {
    return null
  }
}

/** Bir maskeyi başka ölçüye taşır (en yakın komşu). */
function olcekle(veri, kw, kh, hw, hh) {
  if (!veri || !kw || !kh) return null
  if (kw === hw && kh === hh) return veri
  const c = new Float32Array(hw * hh)
  for (let y = 0; y < hh; y++) {
    const sy = Math.min(kh - 1, Math.floor((y / hh) * kh))
    for (let x = 0; x < hw; x++) {
      const sx = Math.min(kw - 1, Math.floor((x / hw) * kw))
      c[y * hw + x] = veri[sy * kw + sx]
    }
  }
  return c
}

/**
 * Dörtgen, bir dikdörtgenin makul bir perspektif izdüşümü olabilir mi?
 *
 * İki ölçüt: karşılıklı kenar uzunluklarının oranı ve köşe açıları. Aşırı
 * kama biçimleri (bir kenarı ötekinin üç katı) fotoğrafta gerçek bir yüzeye
 * karşılık gelmiyor; onları göstermek yanlış yerleşim demek.
 */
function makulDortgen(k) {
  const uz = (a, b) => Math.hypot(k[b].x - k[a].x, k[b].y - k[a].y)
  const ust = uz(0, 1)
  const alt = uz(3, 2)
  const sol = uz(0, 3)
  const sag = uz(1, 2)
  if (!(ust > 0) || !(alt > 0) || !(sol > 0) || !(sag > 0)) return false
  const yatayOran = Math.max(ust, alt) / Math.min(ust, alt)
  const dikeyOran = Math.max(sol, sag) / Math.min(sol, sag)
  if (yatayOran > 1.9 || dikeyOran > 1.9) return false
  /* Köşe açıları: 55°–125° dışına çıkan bir köşe, düzlemsel yüzey değildir. */
  for (let i = 0; i < 4; i++) {
    const o = k[i]
    const a = k[(i + 3) % 4]
    const b = k[(i + 1) % 4]
    const v1 = { x: a.x - o.x, y: a.y - o.y }
    const v2 = { x: b.x - o.x, y: b.y - o.y }
    const n1 = Math.hypot(v1.x, v1.y)
    const n2 = Math.hypot(v2.x, v2.y)
    if (!(n1 > 0) || !(n2 > 0)) return false
    const aci = (Math.acos(Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (n1 * n2)))) * 180) / Math.PI
    if (aci < 55 || aci > 125) return false
  }
  return true
}

/**
 * Dörtgeni içindeki tekdüze yüzeye daraltır.
 *
 * Merkezden yukarı/aşağı/sağa/sola yürünüyor; renk merkezdeki renkten
 * belirgin biçimde ayrılınca (kasa, gökyüzü, yol) o kenar orada duruyor.
 * Sonuç panonun aktif yüzeyi; tasarım da onun ortasına oturuyor.
 */
function panoyaOturt(tuval, koseler) {
  try {
    const W = 200
    const kw = tuval.width || tuval.naturalWidth
    const kh = tuval.height || tuval.naturalHeight
    const H = Math.max(1, Math.round((kh * W) / kw))
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(tuval, 0, 0, W, H)
    const d = ctx.getImageData(0, 0, W, H).data
    const renk = (x, y) => {
      const i = (Math.max(0, Math.min(H - 1, y)) * W + Math.max(0, Math.min(W - 1, x))) * 4
      return [d[i], d[i + 1], d[i + 2]]
    }
    const fark = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])

    const xs = koseler.map((k) => k.x * W)
    const ys = koseler.map((k) => k.y * H)
    const x0 = Math.max(1, Math.min(...xs))
    const x1 = Math.min(W - 2, Math.max(...xs))
    const y0 = Math.max(1, Math.min(...ys))
    const y1 = Math.min(H - 2, Math.max(...ys))
    if (!(x1 - x0 > 6) || !(y1 - y0 > 6)) return koseler
    const cx = Math.round((x0 + x1) / 2)
    const cy = Math.round((y0 + y1) / 2)

    /* Merkezdeki referans renk: 5×5 ortalama. */
    let r = 0, g = 0, b = 0, n = 0
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const v = renk(cx + dx, cy + dy)
        r += v[0]; g += v[1]; b += v[2]; n++
      }
    }
    const ref = [r / n, g / n, b / n]
    const ESIK = 95

    /* Bir yönde yüzeyin bittiği yeri bul (üst üste üç aykırı piksel). */
    const yuru = (dx, dy, sinir) => {
      let x = cx
      let y = cy
      let aykiri = 0
      let son = { x, y }
      for (let adim = 0; adim < sinir; adim++) {
        x += dx
        y += dy
        if (x < x0 || x > x1 || y < y0 || y > y1) break
        if (fark(renk(x, y), ref) > ESIK) {
          aykiri++
          if (aykiri >= 3) break
        } else {
          aykiri = 0
          son = { x, y }
        }
      }
      return son
    }
    const sol = yuru(-1, 0, x1 - x0).x
    const sag = yuru(1, 0, x1 - x0).x
    const ust = yuru(0, -1, y1 - y0).y
    const alt = yuru(0, 1, y1 - y0).y
    if (!(sag - sol > 6) || !(alt - ust > 6)) return koseler

    /* Yeni kutu, eski dörtgenin en az yarısı kadar olmalı. */
    if ((sag - sol) < (x1 - x0) * 0.45 || (alt - ust) < (y1 - y0) * 0.45) return koseler

    /* Eski dörtgenin perspektifi korunuyor: kutu oranları birim kareye taşınıyor. */
    const u0 = (sol - x0) / (x1 - x0)
    const u1 = (sag - x0) / (x1 - x0)
    const v0 = (ust - y0) / (y1 - y0)
    const v1 = (alt - y0) / (y1 - y0)
    const nokta = (u, v) => ({
      x: koseler[0].x + (koseler[1].x - koseler[0].x) * u + (koseler[3].x - koseler[0].x) * v,
      y: koseler[0].y + (koseler[1].y - koseler[0].y) * u + (koseler[3].y - koseler[0].y) * v,
    })
    return [nokta(u0, v0), nokta(u1, v0), nokta(u1, v1), nokta(u0, v1)]
  } catch {
    return koseler
  }
}

/** Dörtgenin alanı (0–1 birim karede). */
function dortgenAlanOran(k) {
  return Math.abs(
    k.reduce((t, p, i) => {
      const n = k[(i + 1) % 4]
      return t + (p.x * n.y - n.x * p.y)
    }, 0) / 2,
  )
}

/** Dörtgenin en/boy oranı (yaklaşık, kenar uzunluklarından). */
function dortgenEnBoy(k) {
  const en = (Math.hypot(k[1].x - k[0].x, k[1].y - k[0].y) + Math.hypot(k[2].x - k[3].x, k[2].y - k[3].y)) / 2
  const boy = (Math.hypot(k[3].x - k[0].x, k[3].y - k[0].y) + Math.hypot(k[2].x - k[1].x, k[2].y - k[1].y)) / 2
  return boy > 0 ? en / boy : 0
}

/** Adayın kadrajdaki yerine göre okunur bir ad. */
function yuzeyAdi(merkez) {
  const yatay = merkez.x < 0.36 ? 'Sol' : merkez.x > 0.64 ? 'Sağ' : 'Orta'
  const dikey = merkez.y < 0.38 ? 'üst' : merkez.y > 0.62 ? 'alt' : ''
  return `${yatay}${dikey ? ' ' + dikey : ''} duvar`
}

function dortgenMerkez(k) {
  return {
    x: k.reduce((t, p) => t + p.x, 0) / k.length,
    y: k.reduce((t, p) => t + p.y, 0) / k.length,
  }
}
