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
import { Screen } from './WallPreview.jsx'

/*
 * YUVARLAK EKLEM = ARAYA GİREN BÜKÜLMÜŞ KABİN.
 *
 * Yuvarlak seçilince önce yalnızca kutuların köşesi yumuşatılıyordu
 * (border-radius), sonra dönüş komşu ekranların uçlarından çalındı:
 * ekranların kendi eni değişmediği hâlde dönüş onların üstünde oluyordu.
 * Gerçekte köşeyi BÜKÜLMÜŞ BİR KABİN döner.
 *
 * Şeritte o kabin ayrı bir parça olarak geliyor (bkz. App → kavisKabinleri)
 * ve burada ince dilimlere bölünüyor; her dilim dönüşün bir parçası kadar
 * dönüyor, yani kabin bir yay çiziyor. Komşu ekranlar tam eniyle duruyor.
 *
 * Dilim ekranın kendi görüntüsünü TAM eninde çizip yalnızca kendi payına
 * düşen pencereyi gösteriyor: görüntü kavis boyunca kesintisiz akıyor,
 * her dilimde baştan başlamıyor.
 */
/* Bükülen kabini kaç dilim anlatıyor. */
const KAVIS_DILIM = 8
/* Dönen dilimler kıl payı bindiriliyor: aralarında boşluk görünmesin. */
const BINDIRME = 0.6

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
   * YAN DUVAR — yalnızca hazır mekânlarda.
   *
   * Tasarım ekranında duvar zaten tek düzlem; orada kolun arkasına
   * ikinci bir yüzey koymak çizimi karıştırıyor. Mekânda ise kol
   * dönüyor ve arkasında bir yüzey olmadan havada duruyor.
   */
  yanDuvar = false,
}) {
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
   * Düz ekran tek dilim. Bükülen kabin KAVIS_DILIM dilime bölünüyor ve
   * her dilim yayın kendi açısını alıyor; yay komşusunun açısından
   * başlayıp öbür komşusunun açısında bitiyor, böylece iki uçta da
   * basamak kalmıyor. Dilimler uç uca ekleniyor, yani yüzeyin uzunluğu
   * değişmiyor.
   */
  const dilimler = []
  parcalar.forEach((p, i) => {
    const onceki = parcalar[i - 1]
    const sonraki = parcalar[i + 1]
    if (!p.e.kavis || !onceki || !sonraki) {
      dilimler.push({ p, w: p.w, t: p.t, u0: 0, dilim: false })
      return
    }
    const bas = onceki.t
    const son = sonraki.t
    const adim = p.w / KAVIS_DILIM
    for (let m = 0; m < KAVIS_DILIM; m++) {
      dilimler.push({
        p,
        w: adim,
        /*
         * İlk dilim soldaki ekranla, son dilim sağdaki ekranla AYNI
         * açıda: uçlarda kırık bir kenar (ek yeri) kalmıyor, yüzey tek
         * parça gibi akıyor.
         */
        t: bas + ((son - bas) * m) / (KAVIS_DILIM - 1),
        u0: m * adim,
        dilim: true,
      })
    }
  })
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
  const yari = Math.max(-solEn, sagEn) + PAY
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
  const kutuEn = yari * 2
  const olcek = Math.min(
    1,
    enCokW > 0 ? enCokW / kutuEn : 1,
    enCokH > 0 ? enCokH / kutuBoy : 1,
  )

  return (
    <div
      style={{
        position: 'relative',
        width: kutuEn,
        height: kutuBoy,
        perspective: D,
        perspectiveOrigin: `50% ${gozY}px`,
        transform: olcek < 1 ? `scale(${olcek})` : undefined,
        transformOrigin: '50% 100%',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          /* Taban çizgisi gözün gozAlt kadar altında (bkz. cy). */
          top: gozY + gozAlt - boyPx,
          width: 0,
          height: boyPx,
          transformStyle: 'preserve-3d',
        }}
      >
        {/*
          YAN DUVARLAR — dönen kolların arkasında.

          Kolla AYNI dönüşümü kullanıyorlar: açı, derinlik ve sıra
          kendiliğinden doğru çıkıyor. Yüzey kolun kendisinden biraz
          geniş ve yüksek; zemine kadar iniyor.
        */}
        {yanDuvar &&
          parcalar.map((p, i) =>
            Math.abs(Math.sin(p.t)) < 0.26 ? null : (
              <div
                key={'yd' + (p.e.id ?? i)}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: boyPx - p.h * 1.22,
                  width: p.w * 1.1,
                  height: p.h * 1.22,
                  marginLeft: (-p.w * 1.1) / 2,
                  transform: `translate3d(${p.mx - ortX}px, 0, ${-(p.mz - ortZ)}px) rotateY(${
                    (p.t * 180) / Math.PI
                  }deg) translateZ(-1px)`,
                  background:
                    /* Yarı saydam: mekânın kendi rengi ve ışığı yüzeye vuruyor. */
                    'linear-gradient(180deg, rgba(250,251,252,0.58), rgba(214,220,228,0.66))',
                  boxShadow: '0 10px 24px rgba(10,16,28,0.22)',
                }}
              />
            ),
          )}

        {dilimler.map((d, i) => {
          const p = d.p
          /* Kavis dilimi komşusunun altına kıl payı giriyor (bkz. BINDIRME). */
          const pay = d.dilim ? BINDIRME : 0
          const kutuW = d.w + pay * 2
          return (
            <div
              key={(p.e.id ?? 'e') + '-' + i}
              style={{
                position: 'absolute',
                left: 0,
                top: boyPx - p.h,
                width: kutuW,
                height: p.h,
                marginLeft: -kutuW / 2,
                /*
                 * rotateY(θ) ekranın en eksenini (cos θ, 0, −sin θ) yapıyor;
                 * üstten bakıştaki derinlik ekseni de eksi Z. İkisi aynı
                 * işaretle kurulduğu için açı doğrudan geçiyor.
                 */
                transform: `translate3d(${d.mx - ortX}px, 0, ${-(d.mz - ortZ)}px) rotateY(${
                  (d.t * 180) / Math.PI
                }deg)`,
                overflow: d.dilim ? 'hidden' : undefined,
              }}
            >
              {/* Ekran tam eninde çiziliyor; dilim kendi penceresini gösteriyor. */}
              <div
                style={{
                  position: 'absolute',
                  left: -(d.u0 - pay),
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
