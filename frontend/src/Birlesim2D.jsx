/**
 * BİRLEŞİK EKRANLAR — TASARIM EKRANINDA ÖNDEN.
 *
 * L, U ve açılı birleşim şeritte yan yana düz dikdörtgenler olarak
 * çiziliyordu. Kol izleyiciye doğru döndükçe şeritteki karşılığı
 * daralıyor, 90°'de ise tamamen yassılıyordu: U ile L ayırt edilemiyordu.
 *
 * Burada ekranlar üstten bakışta kırık bir çizgi; her biri kendi açısıyla
 * duruyor ve yerleşimi tarayıcının kendi 3B dönüşümü (preserve-3d)
 * yapıyor. Kenarlar köşelerde kendiliğinden tutuyor, derinlik sırası
 * doğru çıkıyor — elle dörtgen hesaplamakta köşelerin kayması
 * kaçınılmazdı (küpte de aynı yol seçildi, bkz. Kup2D).
 *
 * SABİT ÖNDEN GÖRÜNÜŞ. Döndürme yok; o yalnızca küpte var. Arka ekran
 * karşıdan düz duruyor, kollar perspektifle öne doğru açılıyor. Tam 90°
 * dönmüş bir kol karşıdan ancak perspektifle görünür: yakın kenarı uzak
 * kenarından geniş düşer ve yamuk olarak okunur.
 *
 * ÖLÇÜ GERÇEK. Her kolun eni kendi sütun sayısından, boyu kendi satır
 * sayısından; kollar birbirinden farklı olabilir.
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { Screen } from './WallPreview.jsx'
import { birlesimDilimleri } from './birlesimOlcu.js'

/*
 * YUVARLAK EKLEM = İKİ EKRAN TEK YAY.
 *
 * Önce köşeye ayrı bir kabin konuyordu (tasarımda olmayan bir parça gibi
 * duruyordu), sonra yalnızca soldaki ekranın SON KABİNİ bükülüyordu: iki
 * yanı düz, ortasında kısa bir dönüş olan bu biçim hâlâ köşe gibi, hatta
 * araya sıkışmış ek bir parça gibi okunuyordu.
 *
 * Artık dönüş, yuvarlak eklemle bağlanan ekranların TAMAMINA dağılıyor:
 * iki ekran kavisli tek bir ekran gibi birleşiyor, bütün eklemler
 * yuvarlaksa grup baştan sona pürüzsüz bir yay oluyor. Dilimleri ölçüyle
 * ortak hesap veriyor (bkz. birlesimOlcu → birlesimDilimleri), yani
 * duvarda yazan genişlik çizilenle birebir aynı.
 *
 * Dilim, ekranın görüntüsünü TAM eninde çizip yalnızca kendi payına düşen
 * pencereyi gösteriyor: görüntü yay boyunca kesintisiz akıyor, dilim
 * sınırında ayırıcı çizgi ya da çerçeve oluşmuyor.
 */
/* Dönen dilimler kıl payı bindiriliyor: aralarında boşluk görünmesin. */
const BINDIRME = 0.6

/*
 * ÇİZİMİN GERÇEK SINIRI ÖLÇÜLEREK BULUNUYOR.
 *
 * Kutu, perspektif izdüşümü elle hesaplanarak kuruluyordu. O hesap
 * tarayıcının kendi 3B dönüşümüyle birebir tutmuyor (dilim kutuları,
 * bindirme payı, yuvarlama): ölçüldü, gerçek çizim hesaplanandan %30
 * daha geniş çıkabiliyor. Kutu dar kalınca tasarım kutusunun dışına
 * taşıyor, kutu duvarda ortalandığı için de tasarım duvarda YANA
 * kaymış görünüyordu.
 *
 * Çizildikten sonra dilimlerin kapladığı gerçek alan ölçülüyor ve kutu
 * ona göre kuruluyor. Ölçü ÖLÇEKSİZ birime çevriliyor (olcek'e
 * bölünüyor), yoksa kutu büyüdükçe ölçek değişir ve hesap kendi
 * kuyruğunu kovalardı.
 */
export default function Birlesim2D({
  ekranlar = [],
  pxPerM = 200,
  model = null,
  resolution = null,
  content = 'led',
  contentUrl = null,
  hideRegions = false,
  curveAmount = 60,
  /* Tıklanan ekranı düzenlemeye alan geri çağırma (bkz. WallPreview). */
  onEkranSec = null,
  seciliEkranId = null,
  /*
   * SEÇİLİ EKRANIN ÇERÇEVESİ YALNIZCA MEKÂNDA.
   *
   * Tasarım görünümünde mavi çerçeve ürünün parçasıymış gibi duruyordu;
   * hangi ekranın düzenlendiği zaten soldaki kartta belli. Tıklayıp seçmek
   * sürüyor, yalnızca çizgi görünmüyor.
   */
  cerceve = false,
  /*
   * TASARIM DUVARDAN BÜYÜKKEN ÇİZİMİN ÇEVRESİ KIRMIZI.
   *
   * Duvarı aşan tasarım çizimde duvarın dışında duruyor; bunun bir uyarı
   * olduğu yalnızca sol paneldeki yazıdan anlaşılıyordu.
   */
  tasmaCerceve = false,
  /* Sade kip: kenarlıklar ve ayrım çizgileri kalkıyor. */
  sade = false,
  /*
   * FAREYLE DÖNDÜRME (derece).
   *
   * Tasarım karşıdan sabit duruyordu; açılı bir grupta kolların gerçekten
   * nereye baktığı ancak yandan görülüyor. Kullanıcı tasarımı sürükleyerek
   * kendi ekseninde çeviriyor (yaw) ve eğiyor (egim). Duvar ve mekân
   * yerinde kalıyor: dönen şey tasarımın KENDİSİ.
   */
  yaw = 0,
  egim = 0,
  /*
   * PERSPEKTİF YALNIZCA MEKÂNLARDA.
   *
   * Tasarım ekranında perspektif, döndürülen tasarımı yakına gelen ucundan
   * şişiriyor ve şekil yana kaçıyordu: kullanıcının istediği, tasarımın
   * OLDUĞU YERDE dönmesi. Mekânlarda (ve fotoğrafta) perspektif duruyor,
   * çünkü orada tasarım gerçek bir ortamın içinde.
   */
  perspektifli = true,
  /*
   * ÇİZİMİN SIĞACAĞI KUTU (duvarın içi).
   *
   * Perspektifle öne gelen kol kutuyu büyütüyor; sınır verilmediğinde
   * çizim duvarın dışına taşıyor, taşan kısım da kırpılıyordu.
   */
  enCokW = 0,
  enCokH = 0,
  /*
   * ÖLÇÜ ETİKETLERİ İÇİN: HER EKRANIN ÇİZİMDE KAPLADIĞI YER.
   *
   * Etiketler şeridin (karşıdan bakışın) hesabına göre konuyordu; L'de ve
   * U'da ekranlar bambaşka yerde çizildiği için sayılar düz bir sıra hâlinde
   * kalıyordu. Çizim bittikten sonra her ekranın ekrandaki dörtgeni
   * ölçülüp yukarı bildiriliyor (sayfa koordinatı).
   */
  onParcaKutulari = null,
  /*
   * YAN DUVAR KALDIRILDI.
   *
   * Mekânlarda dönen kolun arkasına yarı saydam beyaz birer yüzey
   * konuyordu ("kol havada durmasın" diye). Sonuç tersiydi: ekranın
   * iki yanında ve üstünde, mekânın kendi duvarına ait olmayan beyaz
   * levhalar duruyordu. Düz ekranda mekânın arka planı nasıl
   * görünüyorsa birleşik ekranda da öyle görünüyor; ekran mekânın
   * duvarının önünde duruyor, arkasına başka bir yüzey eklenmiyor.
   */
}) {
  const icRef = useRef(null)
  const olcekRef = useRef(1)
  /* Dilim sırasına karşılık gelen ekran kimlikleri (çizimde dolduruluyor). */
  const bilgiRef = useRef([])
  const sonKutularRef = useRef(null)
  const [gercekKenar, setGercekKenar] = useState(null)
  useLayoutEffect(() => {
    const ic = icRef.current
    if (!ic || !ic.children.length) return
    const o = olcekRef.current || 1
    if (!(o > 0)) return
    const orijin = ic.getBoundingClientRect().left
    const kutular = [...ic.children].map((c) => c.getBoundingClientRect())
    const sol = (Math.min(...kutular.map((r) => r.left)) - orijin) / o
    const sag = (Math.max(...kutular.map((r) => r.right)) - orijin) / o
    if (!Number.isFinite(sol) || !Number.isFinite(sag) || sag <= sol) return
    if (!gercekKenar || Math.abs(gercekKenar.sol - sol) > 1 || Math.abs(gercekKenar.sag - sag) > 1) {
      setGercekKenar({ sol, sag })
    }

    /* Her EKRANIN (dilimlerinin birleşimi) ekrandaki dörtgeni. */
    const bilgi = bilgiRef.current || []
    if (!onParcaKutulari || bilgi.length !== kutular.length) return
    const harita = new Map()
    kutular.forEach((r, i) => {
      const b = bilgi[i]
      if (!b || b.id == null) return
      const v = harita.get(b.id)
      if (!v) harita.set(b.id, { id: b.id, en: b.en, sol: r.left, sag: r.right, ust: r.top })
      else {
        v.sol = Math.min(v.sol, r.left)
        v.sag = Math.max(v.sag, r.right)
        v.ust = Math.min(v.ust, r.top)
      }
    })
    const liste = [...harita.values()]
    const eski = sonKutularRef.current
    /* Aynı sayılar yeniden bildirilirse üst bileşen sonsuz çizime girer. */
    const degisti =
      !eski ||
      eski.length !== liste.length ||
      liste.some(
        (k, i) =>
          k.id !== eski[i].id ||
          Math.abs(k.sol - eski[i].sol) > 0.5 ||
          Math.abs(k.sag - eski[i].sag) > 0.5 ||
          Math.abs(k.ust - eski[i].ust) > 0.5,
      )
    if (!degisti) return
    sonKutularRef.current = liste
    onParcaKutulari(liste)
  })

  if (!Array.isArray(ekranlar) || ekranlar.length < 2) return null
  if (ekranlar.some((e) => !Number.isFinite(e?.yon))) return null

  const parcalar = ekranlar.map((e) => ({
    e,
    /*
     * GERÇEK EN, ŞERİDİN KISALTTIĞI EN DEĞİL.
     *
     * Şerit düz çizdiği için birleşimdeki ekranın enini açısının
     * kosinüsüyle kısaltıp 'wm'e yazıyor (bkz. WallPreview → lKisalma).
     * Burada perspektif gerçekten uygulandığı için o kısalma İKİNCİ KEZ
     * işleniyor ve kol olduğunun yüzde kırkına iniyordu.
     */
    w: (e.gercekWm ?? e.wm ?? 0) * pxPerM,
    h: (e.hm || 0) * pxPerM,
    /*
     * ÇİZİM AÇISI GERÇEK AÇIDAN AYRI OLABİLİYOR.
     *
     * Dışa dönük U'nun kanatları geriye bakıyor ve sabit önden görünüşte
     * orta ekranın arkasında kalıyor. Orada çizim açısı veriliyor; 'yon'
     * (gerçek duruş) 3B görünümde olduğu gibi kullanılıyor.
     */
    t: Number.isFinite(e.cizimYon) ? e.cizimYon : e.yon,
  }))
  if (parcalar.some((p) => !(p.w > 0) || !(p.h > 0))) return null

  /*
   * ÜSTTEN BAKIŞ, DİLİM DİLİM.
   *
   * Köşeli eklemle biten ekran tek parça. Yuvarlak eklemle bağlı ekranlar
   * tek bir yay: dönüş zincirin tamamına dağılıyor, araya kabin ya da köşe
   * parçası girmiyor. Dilimler uç uca eklendiği için yüzeyin uzunluğu
   * değişmiyor (bkz. birlesimOlcu → birlesimDilimleri).
   */
  const dilimler = birlesimDilimleri(
    parcalar.map((p) => ({ w: p.w, t: p.t, yuvarlak: !!p.e.yuvarlakSag })),
  ).map((d) => ({ ...d, p: parcalar[d.i], dilim: d.yay }))
  if (!dilimler.length) return null
  /* Ölçüm kancası dilim sırasını buradan okuyor (bkz. useLayoutEffect). */
  bilgiRef.current = dilimler.map((d) => ({
    id: d.p.e.id,
    en: d.p.e.gercekWm ?? d.p.e.wm ?? 0,
  }))

  let x = 0
  let z = 0
  for (const d of dilimler) {
    const ax = x
    const az = z
    x += Math.cos(d.t) * d.w
    z += Math.sin(d.t) * d.w
    d.mx = (ax + x) / 2
    d.mz = (az + z) / 2
  }

  /* Parçanın orta noktası, kendi dilimlerinin eniyle ağırlıklı ortalaması. */
  parcalar.forEach((p) => {
    const kendi = dilimler.filter((d) => d.p === p)
    const toplam = kendi.reduce((t, d) => t + d.w, 0) || 1
    p.mx = kendi.reduce((t, d) => t + d.mx * d.w, 0) / toplam
    p.mz = kendi.reduce((t, d) => t + d.mz * d.w, 0) / toplam
  })

  /* Zincirin ortası orijine: tasarım tuvalin ortasında dursun. */
  const ortX = parcalar.reduce((t, p) => t + p.mx, 0) / parcalar.length
  const ortZ = parcalar.reduce((t, p) => t + p.mz, 0) / parcalar.length
  const boyPx = Math.max(...parcalar.map((p) => p.h))
  /*
   * GÖZ HİZASI GRUBUN DİKEY ORTASINDA.
   *
   * Grup duvara sığsın diye göz taban çizgisine indirilmişti: o
   * yükseklikteki her nokta olduğu yerde kaldığı için bütün alt kenarlar
   * tek DÜZ çizgiye oturuyor, perspektif yalnızca üst kenarlara
   * uygulanıyordu — şekil tek taraflı eğilip gerçeğe uymuyordu.
   *
   * Taban çizgisinden ölçülen göz yüksekliği. Üst ve alt kenarlar aynı
   * açıyla, simetrik açılıyor; sığmayan grup düzleştirilmiyor, orantılı
   * küçülüyor (bkz. olcek).
   */
  const gozAlt = boyPx / 2

  /*
   * PERSPEKTİF UZAKLIĞI NESNEYE GÖRE.
   *
   * Sabit büyük bir uzaklık (örn. 1800 piksel) bir metrelik tasarımda
   * neredeyse paralel izdüşüm demek: 90° dönmüş kol tek piksele iniyor ve
   * U yine L gibi görünüyordu. Uzaklık tasarımın kendi eninden türüyor.
   */
  const yayilim = Math.max(...parcalar.map((p) => (Math.abs(p.mx - ortX) + p.w / 2) * 2), boyPx)
  /* Zincirin en öndeki ve en arkadaki noktası arasındaki fark. */
  const derinlikler = dilimler.flatMap((d) => {
    const cz = -(d.mz - ortZ)
    const yari = (Math.sin(d.t) * d.w) / 2
    return [cz - yari, cz + yari]
  })
  const derinlik = Math.max(...derinlikler) - Math.min(...derinlikler)
  const enYakin = Math.max(...derinlikler)
  /*
   * Uzaklık ağırlıkla DERİNLİKTEN geliyor. Yayılıma bağlanınca geniş bir
   * arka ekranın yanındaki sığ kol birkaç piksele iniyor ve U yine L gibi
   * okunuyordu; yayılım artık yalnızca aşırı yakın bakışı engelliyor.
   */
  const Dham = Math.max(100, derinlik * 2.2, yayilim * 0.35, enYakin * 1.6)

  /*
   * KUTU DÖNÜŞÜ DE HESABA KATIYOR.
   *
   * İzdüşüm yalnızca kolların kendi açısına bakıyordu; fareyle çevrilen
   * tasarım kutusundan taşıyor, duvarın ve tuvalin dışına çıkıp sol panelin
   * kenarına kadar uzanıyordu (ölçüldü: sol kenar tuvalin 19.899 piksel
   * dışında). Köşeler, CSS'in zincire uyguladığı dönüşün AYNISIYLA (önce
   * rotateY, sonra rotateX) çevrilip öyle izdüşürülüyor.
   */
  const ry = (yaw * Math.PI) / 180
  const rx = (egim * Math.PI) / 180
  const cosY = Math.cos(ry)
  const sinY = Math.sin(ry)
  const cosX = Math.cos(rx)
  const sinX = Math.sin(rx)
  /* CSS ekseni: y aşağı, z izleyiciye doğru. */
  const cevir = (x, y, z) => {
    const x1 = x * cosY + z * sinY
    const z1 = -x * sinY + z * cosY
    return [x1, y * cosX - z1 * sinX, y * sinX + z1 * cosX]
  }

  /** Zincirin bütün köşeleri, dönüş uygulanmış hâlde. */
  const koseler = []
  for (const d of dilimler) {
    const cx = d.mx - ortX
    const cz = -(d.mz - ortZ)
    const cy = gozAlt - d.p.h / 2
    for (const u of [-d.w / 2, d.w / 2]) {
      const X0 = cx + Math.cos(d.t) * u
      const Z0 = cz - Math.sin(d.t) * u
      for (const v of [-d.p.h / 2, d.p.h / 2]) koseler.push(cevir(X0, cy + v, Z0))
    }
  }

  /*
   * KAMERA DÖNEN ŞEKLİN ÖNÜNDE KALIYOR.
   *
   * Uzaklık yalnızca duran şekle göre seçiliyordu. Tasarım çevrilince
   * zincirin bir ucu göz düzlemine (z = D) giriyor, orada izdüşüm
   * patlıyor ve o kol ekranı baştan başa kaplayan dev bir şekle dönüşüyordu.
   * En yakın köşe artık uzaklığın en çok yarısı kadar yaklaşabiliyor;
   * gerekirse kamera geri çekiliyor.
   */
  const enYakinDonuk = koseler.reduce((t2, p) => Math.max(t2, p[2]), 0)
  /*
   * Perspektifsiz görünümde kamera şeklin kaç katı uzakta duruyor. 8 kat:
   * yakın ve uzak kenar arasındaki büyüme %10'un altında kalıyor, yani
   * tasarım dönerken büyüyüp kaymıyor; buna karşılık 90°'ye dönmüş bir kol
   * yine ince bir yamuk olarak görünüyor (tam paralel izdüşümde o kol
   * çizgiye inerdi ve L ile düz ekran ayırt edilemezdi).
   */
  /*
   * Tasarım ekranında perspektif ZAYIF ama sıfır değil: 8 kat uzaklıkta
   * izdüşüm neredeyse paralel oluyor ve 90°'lik kanat (L'nin ikinci ekranı,
   * U'nun yanları) tek bir çizgiye iniyordu — kullanıcı kurduğu köşeyi
   * göremiyordu.
   *
   * KÖŞEYİ AÇAN ŞEY ARTIK YALNIZCA PERSPEKTİF. Önce bakışa 12° ek açı
   * verilmişti; o açı U'nun bir kanadını açarken ötekini arkaya çeviriyordu.
   * Ek açı kalktı (bkz. App → varsayılan bakış) ve kamera yaklaştı: kanatlar
   * kameranın ekseninden uzakta kaldıkları için kendiliğinden açılıyor,
   * üstelik SİMETRİK olarak. Düz tasarımda hiçbir şey değişmiyor: bütün
   * dilimler aynı derinlikte olduğu için perspektif onları büyütüp
   * küçültmüyor, duvarla birebir aynı ölçekte kalıyorlar.
   */
  const ZAYIF_PERSPEKTIF = 1.2
  const D = perspektifli
    ? Math.max(Dham, enYakinDonuk / 0.5)
    : Math.max(Dham, enYakinDonuk / 0.5, yayilim * ZAYIF_PERSPEKTIF, boyPx * ZAYIF_PERSPEKTIF)

  /*
   * KUTU İZDÜŞÜMDEN.
   *
   * Öne gelen kol perspektifte büyüyor; kutu yerleşimin ham ölçüsüne göre
   * kurulsaydı kolun yakın kenarı dışarıda kalırdı. Her dilimin dört
   * köşesi de izdüşürülüp sınırlar oradan alınıyor.
   */
  let solEn = 0
  let sagEn = 0
  let ustY = 0
  let altY = 0
  for (const [X, Y, Z] of koseler) {
    const k = D / (D - Z)
    const px = X * k
    const py = Y * k
    if (px < solEn) solEn = px
    if (px > sagEn) sagEn = px
    if (py < ustY) ustY = py
    if (py > altY) altY = py
  }

  const PAY = 8
  /*
   * ÇİZİM KUTUSU İÇERİĞİNİ TAM SARIYOR.
   *
   * Kutu bir ara zincirin merkezine göre SİMETRİK kuruluyordu:
   * yarı = max(sol taşma, sağ taşma). Simetrik olmayan bir grupta
   * (örneğin 2+2+2+1 kabinlik açılı dizilim) zincirin merkezi
   * ortasında değil; kutu geniş olan tarafa göre kuruluyor, dar
   * tarafta kutunun içinde boş bir şerit kalıyordu. Kutu duvarın
   * ortasına yerleştiği için tasarım da duvarda yana kaymış
   * görünüyordu: solda 0,07 m kalırken sağda 0,21 m kalıyor, üstelik
   * ölçü etiketleri (simetrik hesaplandığı için) ikisine de aynı
   * sayıyı yazıyordu.
   *
   * Kutu artık gerçek taşmaları sarıyor ve zincirin başlangıcı kutunun
   * içinde kendi yerine konuyor. Kutu duvarda ortalanınca tasarım da
   * ortalanıyor; iki yandaki boşluk gerçekten eşit oluyor.
   */
  /*
   * Ölçülen sınır varsa o geçerli; ilk çizimde hesap yedek. Dönmüş tasarımda
   * ölçüm kullanılmıyor: ölçüm bir kare geriden geliyor ve dönüş sürerken
   * kutu ile şekil birbirini kovalıyordu.
   */
  const donuk = !!yaw || !!egim
  const solKenar = gercekKenar && !donuk ? gercekKenar.sol : solEn
  const sagKenar = gercekKenar && !donuk ? gercekKenar.sag : sagEn
  const kutuEn = sagKenar - solKenar + PAY * 2
  /* Zincirin orijini kutunun içinde: sol taşma kadar sağda. */
  const orijinX = -solKenar + PAY
  const gozY = -ustY + PAY
  const kutuBoy = altY - ustY + PAY * 2

  /*
   * DUVARIN İÇİNE SIĞIYOR.
   *
   * Küçültme yalnızca ÇİZİME: ölçü etiketleri gerçek değerlerden
   * geliyor (bkz. WallPreview → olcuW), yani sayılar değişmiyor.
   * Alt kenar sabit kalsın diye ölçek tabandan uygulanıyor; grup
   * duvarın tasarım alt çizgisinde duruyor.
   */
  /*
   * KENAR PAYI SIĞDIRMAYA KATILMIYOR.
   *
   * Kutu, çizimin dört yanına PAY kadar boşluk bırakıyor (kenar yuvarlanırken
   * kırpılmasın diye). Sığdırma o boşluğu da çizimden sayıyordu: duvarıyla
   * aynı ölçüdeki 3,84 m'lik bir tasarım duvarın %98'ine iniyor, iki yanda
   * gerçekte olmayan bir boşluk doğuyordu (ölçüldü: 760 / 776 piksel). Pay
   * sabit 16 piksel olduğu için oran küçük çizimlerde daha da bozuluyordu.
   * Sığdırma artık çizimin KENDİ ölçüsüne bakıyor; döndürülmemiş tasarım
   * duvarla birebir aynı ölçekte çiziliyor.
   */
  const cizimEn = Math.max(1, kutuEn - PAY * 2)
  const cizimBoy = Math.max(1, kutuBoy - PAY * 2)
  const olcek = Math.min(
    1,
    enCokW > 0 ? enCokW / cizimEn : 1,
    enCokH > 0 ? enCokH / cizimBoy : 1,
  )
  /* Ölçüm bu ölçeği geri çeviriyor (bkz. yukarıdaki useLayoutEffect). */
  olcekRef.current = olcek

  return (
    <div
      style={{
        position: 'relative',
        /*
         * KUTU DARALTILMIYOR.
         *
         * Kutu esnek bir kapsayıcının (data-birlesim-yuz, justify-center)
         * içinde duruyor ve flex-shrink varsayılanı 1: duvardan genişse
         * tarayıcı onu SESSİZCE daraltıyordu. İçerideki zincir ise
         * daraltılmamış ölçüye göre konumlandığı için tasarım kutunun
         * içinde kayıyor, duvarda da yana kaymış görünüyordu (ölçüldü:
         * solda 125 px boşluk, sağda 61 px taşma).
         *
         * Küçültmeyi zaten olcek yapıyor ve ölçü etiketlerini bozmuyor;
         * tarayıcının ayrıca daraltması yalnızca hizayı bozuyordu.
         */
        flexShrink: 0,
        width: kutuEn,
        height: kutuBoy,
        perspective: D,
        perspectiveOrigin: `${orijinX}px ${gozY}px`,
        transform: olcek < 1 ? `scale(${olcek})` : undefined,
        transformOrigin: '50% 100%',
        /*
         * ÇİZİM DUVARIN İÇİNDE DİKEYDE ORTALI.
         *
         * Kutunun altında da PAY kadar boşluk var; kutu alttan hizalandığı
         * için çizim o kadar YUKARIDA duruyordu: 1 m duvarda 0,96 m tasarım
         * üste yapışıyor, altta iki kat boşluk kalıyordu (etiketler 0,02 /
         * 0,02 derken çizimde 0,00 / 0,04). Pay geri alınıyor; şerit zaten
         * duvarın ortasında (bkz. WallPreview → stripTop).
         */
        marginBottom: -(PAY * olcek),
      }}
    >
      {/*
        Çerçeve kutunun payı (PAY) kadar içeride: tam çizimin sınırında.
        Tasarım DÖNÜKKEN gizleniyor, çünkü o hâlde kutu artık şeklin sınırı
        değil, dönmüş şeklin izdüşümünü saran dikdörtgen.
      */}
      {tasmaCerceve && !donuk && (
        <div
          style={{
            position: 'absolute',
            left: PAY,
            top: PAY,
            width: Math.max(0, kutuEn - PAY * 2),
            height: Math.max(0, kutuBoy - PAY * 2),
            border: '1px solid #dc2626',
            pointerEvents: 'none',
            zIndex: 6,
          }}
        />
      )}
      <div
        ref={icRef}
        style={{
          position: 'absolute',
          left: orijinX,
          /* Taban çizgisi gözün gozAlt kadar altında (bkz. cy). */
          top: gozY + gozAlt - boyPx,
          width: 0,
          height: boyPx,
          transformStyle: 'preserve-3d',
          /* Önce kendi ekseninde dön, sonra eğil (CSS sağdan sola uygular). */
          transform: yaw || egim ? `rotateX(${egim}deg) rotateY(${yaw}deg)` : undefined,
        }}
      >
        {dilimler.map((d, i) => {
          const p = d.p
          /*
           * BİNDİRME YALNIZCA AYNI EKRANIN DİLİMLERİ ARASINDA.
           *
           * Her dilim iki yanından kıl payı büyüyor, içeriği de o kadar
           * kaydırılıyordu. Ekranın İLK diliminde kaydıracak içerik yok:
           * kutunun sol kenarında ekranın görüntüsünün başlamadığı ince
           * bir şerit kalıyor, arkadaki duvar oradan görünüyordu. Son
           * dilimde aynısı sağda. Dilimler ekran ekran dizildiği için bu
           * şeritler tam EKLEM yerlerinde buluşuyor ve yayın ortasında
           * açık renkli dikey bir çizgi — yani köşe — çiziyordu.
           *
           * Pay artık yalnızca komşusu AYNI ekranda olan kenara veriliyor;
           * iki ekranın buluştuğu yerde kutular uç uca geliyor. Yay sürekli
           * olduğu için o kenarda iki dilimin açısı birkaç derece fark
           * ediyor, yani bindirmeye de gerek yok.
           */
          /*
           * EKRANLAR ARASINDA AÇIK RENKLİ ÇİZGİ KALMIYOR.
           *
           * Pay yalnızca AYNI ekranın dilimleri arasında veriliyordu: iki
           * ekranın buluştuğu eklemde kutular uç uca geliyor ve yuvarlama
           * yüzünden aralarından arka plan sızıyordu — tasarımın ortasında
           * açık renkli dikey bir çizgi (ölçüldü: ekranlar arası boşluk).
           *
           * Pay artık her kenarda var; ekranın kendi görüntüsünün ulaşmadığı
           * ince şerit de panelin zemin rengiyle dolduruluyor. Yani eklemde
           * boşluk değil, gerçek bir LED duvarda olduğu gibi KOYU bir dikiş
           * görünüyor.
           */
          const payL = BINDIRME
          const payR = BINDIRME
          const kutuW = d.w + payL + payR
          /*
           * ARKA YÜZDE GÖRÜNTÜ YOK — ÖLÇÜT GÖZÜN YERİ.
           *
           * LED ekran çift taraflı değil; arkasına geçildiğinde görüntü ters
           * çevrilmiş hâlde görünüyordu. Ölçüt yalnızca dilimin AÇISIYDI
           * (cos(t + yaw) < 0), yani göz hep tam karşıdaymış gibi: içe dönük
           * U'nun iki kanadı da tam 90° olduğu için "ne önde ne arkada"
           * sayılıyor, biri kayboluyordu. Oysa U'nun içine bakan göz her iki
           * kanadın da YÜZÜNÜ görür.
           *
           * Ölçüt artık yüzün normali ile gözden dilime giden yönün işareti:
           * normal göze dönükse yüz görünür. Göz, perspektif kutusunun
           * önünde z = D noktasında (bkz. perspective) ve kutunun yatay
           * ortasında duruyor.
           */
          const [nx, , nz] = cevir(Math.sin(d.t), 0, Math.cos(d.t))
          const [Xr, , Zr] = cevir(d.mx - ortX, 0, -(d.mz - ortZ))
          const arkaYuz = nx * -Xr + nz * (D - Zr) <= 0
          return (
            <div
              key={(p.e.id ?? 'e') + '-' + i}
              style={{
                position: 'absolute',
                left: 0,
                top: boyPx - p.h,
                width: kutuW,
                height: p.h,
                marginLeft: -(d.w / 2 + payL),
                overflow: 'hidden',
                /*
                 * ARKASI DÖNÜK EKRAN KAYBOLMUYOR.
                 *
                 * Arka yüzde yalnızca görüntü gizleniyordu ve kutunun zemini
                 * de olmadığı için ekran tamamen yok oluyordu: tasarım biraz
                 * fazla çevrilince ortada hiçbir şey kalmıyordu. Arkası dönük
                 * dilim artık kasanın koyu yüzeyi olarak çiziliyor. Bütün
                 * dilimler aynı renk olduğu için aralarında dikiş görünmüyor.
                 */
                background: arkaYuz ? '#15181d' : undefined,
                /*
                 * rotateY(θ) ekranın en eksenini (cos θ, 0, −sin θ) yapıyor;
                 * üstten bakıştaki derinlik ekseni de eksi Z. İkisi aynı
                 * işaretle kurulduğu için açı doğrudan geçiyor.
                 */
                transform: `translate3d(${d.mx - ortX}px, 0, ${-(d.mz - ortZ)}px) rotateY(${
                  (d.t * 180) / Math.PI
                }deg)`,
              }}
            >
              {/*
                SEÇİM ÇERÇEVESİ VE TIKLAMA.

                Birleşik çizimde de tıklanan ekran düzenlemeye geçiyor;
                seçili olanın kenarı çiziliyor. Katman ekranın üstünde
                ama saydam, yalnızca kendi dörtgenini yakalıyor.
              */}
              {onEkranSec && (
                <button
                  type="button"
                  data-pdf-gizle
                  aria-label={`${p.e.sira || ''}. ekran`}
                  onClick={(ev) => {
                    ev.stopPropagation()
                    onEkranSec(p.e.id)
                  }}
                  style={{
                    position: 'absolute',
                    left: -(d.u0 - payL),
                    top: 0,
                    width: p.w,
                    height: p.h,
                    zIndex: 4,
                    padding: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    border:
                      p.e.id === seciliEkranId && cerceve
                        ? '2px solid #2962ad'
                        : '2px solid transparent',
                  }}
                />
              )}
              {/*
                GÖRÜNTÜ KUTUNUN TAMAMINI KAPLIYOR — ARADA ÇİZGİ YOK.

                Dilim kutusu iki yanından kıl payı büyüyor (bindirme), ama
                görüntü eski eninde kalıyordu: kalan ince şerit önce arka
                planı gösteriyordu (açık renkli çizgi), sonra panelin zemin
                rengiyle dolduruldu (koyu çizgi). İkisi de tasarımın
                ortasında bir dikiş gibi duruyordu. Görüntü artık bindirme
                kadar geniş çiziliyor: iki ekran kesintisiz birleşiyor.
                Esneme bütün ekranda 1,2 piksel, yani gözle görülmüyor.
              */}
              <div
                style={{
                  position: 'absolute',
                  left: -d.u0,
                  top: 0,
                  width: p.w + payL + payR,
                  height: p.h,
                  /* Arka yüz: kasanın kendisi, görüntü değil. */
                  visibility: arkaYuz ? 'hidden' : undefined,
                }}
              >
                <Screen
                  wPx={p.w + payL + payR}
                  hPx={p.h}
                  cols={p.e.cols}
                  rows={p.e.rows}
                  type={p.e.type}
                  resolution={resolution}
                  model={model}
                  content={p.e.content || content}
                  contentUrl={p.e.content ? p.e.contentUrl || null : contentUrl}
                  hideRegions={hideRegions}
                  sade={sade}
                  /*
                   * BİRLEŞİK ÇİZİMDE KENAR ÇİZGİSİ YOK.
                   *
                   * Her ekran kendi kenarına ince bir açık şerit çiziyordu;
                   * yan yana iki ekranda bu şeritler birleşip tasarımın
                   * ortasında bir çizgi oluşturuyordu. Birleşim tek bir
                   * yüzey gibi görünmeli.
                   */
                  kenarsiz
                  /* Her ekran kendi kavisiyle; tek genel değer hepsini büküyordu. */
                  curveAmount={p.e.curveAmount ?? curveAmount}
                  leftCols={p.e.leftCols}
                  rightCols={p.e.rightCols}
                  lYon={p.e.lYon}
                  {...(p.e.icerikProp || null)}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
