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
  /* Sade kip: kenarlıklar ve ayrım çizgileri kalkıyor. */
  sade = false,
  /*
   * ÇİZİMİN SIĞACAĞI KUTU (duvarın içi).
   *
   * Perspektifle öne gelen kol kutuyu büyütüyor; sınır verilmediğinde
   * çizim duvarın dışına taşıyor, taşan kısım da kırpılıyordu.
   */
  enCokW = 0,
  enCokH = 0,
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
  const D = Math.max(100, derinlik * 2.2, yayilim * 0.35, enYakin * 1.6)

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
  for (const d of dilimler) {
    const cx = d.mx - ortX
    const cz = -(d.mz - ortZ)
    /* Parçanın merkezi, gözden ölçülü: parçalar alttan hizalı duruyor. */
    const cy = gozAlt - d.p.h / 2
    for (const u of [-d.w / 2, d.w / 2]) {
      const X = cx + Math.cos(d.t) * u
      const Z = cz - Math.sin(d.t) * u
      const k = D / (D - Z)
      for (const v of [-d.p.h / 2, d.p.h / 2]) {
        const px = X * k
        const py = (cy + v) * k
        if (px < solEn) solEn = px
        if (px > sagEn) sagEn = px
        if (py < ustY) ustY = py
        if (py > altY) altY = py
      }
    }
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
  /* Ölçülen sınır varsa o geçerli; ilk çizimde hesap yedek. */
  const solKenar = gercekKenar ? gercekKenar.sol : solEn
  const sagKenar = gercekKenar ? gercekKenar.sag : sagEn
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
  const olcek = Math.min(
    1,
    enCokW > 0 ? enCokW / kutuEn : 1,
    enCokH > 0 ? enCokH / kutuBoy : 1,
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
      }}
    >
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
          const ilkDilim = d.dilim && d.u0 <= 1e-6
          const sonDilim = d.dilim && (i === dilimler.length - 1 || dilimler[i + 1].i !== d.i)
          const payL = d.dilim && !ilkDilim ? BINDIRME : 0
          const payR = d.dilim && !sonDilim ? BINDIRME : 0
          const kutuW = d.w + payL + payR
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
                overflow: d.dilim ? 'hidden' : undefined,
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
              {/* Ekran tam eninde çiziliyor; dilim kendi penceresini gösteriyor. */}
              <div
                style={{
                  position: 'absolute',
                  left: -(d.u0 - payL),
                  top: 0,
                  width: p.w,
                  height: p.h,
                }}
              >
                <Screen
                  wPx={p.w}
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
                  /* Yayın dilimiyse ekranın kenar çizgisi çizilmiyor. */
                  kenarsiz={!!d.dilim}
                  curveAmount={curveAmount}
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
