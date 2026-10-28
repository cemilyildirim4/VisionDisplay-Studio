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

/** Eklem yuvarlaksa o kenardaki köşe yarıçapı; keskin kenar 0 kalıyor. */
function yuvarlatma(p) {
  const r = Math.min(p.w, p.h) * 0.12
  const sol = p.e.solYuvarlak ? r : 0
  const sag = p.e.sagYuvarlak ? r : 0
  return `${sol}px ${sag}px ${sag}px ${sol}px`
}

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

  /* Üstten bakış: uç uca eklenen parçaların orta noktaları (piksel). */
  let x = 0
  let z = 0
  const parcalar = ekranlar.map((e) => {
    /*
     * GERÇEK EN, ŞERİDİN KISALTTIĞI EN DEĞİL.
     *
     * Şerit düz çizdiği için birleşimdeki ekranın enini açısının
     * kosinüsüyle kısaltıp 'wm'e yazıyor (bkz. WallPreview → lKisalma).
     * Burada perspektif gerçekten uygulandığı için o kısalma İKİNCİ KEZ
     * işleniyor ve kol olduğunun yüzde kırkına iniyordu.
     */
    const w = (e.gercekWm ?? e.wm ?? 0) * pxPerM
    const t = e.yon
    const ax = x
    const az = z
    x += Math.cos(t) * w
    z += Math.sin(t) * w
    return { e, w, t, h: (e.hm || 0) * pxPerM, mx: (ax + x) / 2, mz: (az + z) / 2 }
  })
  if (parcalar.some((p) => !(p.w > 0) || !(p.h > 0))) return null

  /* Zincirin ortası orijine: tasarım tuvalin ortasında dursun. */
  const ortX = parcalar.reduce((t, p) => t + p.mx, 0) / parcalar.length
  const ortZ = parcalar.reduce((t, p) => t + p.mz, 0) / parcalar.length
  const boyPx = Math.max(...parcalar.map((p) => p.h))

  /*
   * PERSPEKTİF UZAKLIĞI NESNEYE GÖRE.
   *
   * Sabit büyük bir uzaklık (örn. 1800 piksel) bir metrelik tasarımda
   * neredeyse paralel izdüşüm demek: 90° dönmüş kol tek piksele iniyor ve
   * U yine L gibi görünüyordu. Uzaklık tasarımın kendi eninden türüyor.
   */
  const yayilim = Math.max(...parcalar.map((p) => (Math.abs(p.mx - ortX) + p.w / 2) * 2), boyPx)
  /* Zincirin en öndeki ve en arkadaki noktası arasındaki fark. */
  const derinlikler = parcalar.flatMap((p) => {
    const cz = -(p.mz - ortZ)
    const yari = (Math.sin(p.t) * p.w) / 2
    return [cz - yari, cz + yari]
  })
  const derinlik = Math.max(...derinlikler) - Math.min(...derinlikler)
  const enYakin = Math.max(...derinlikler)
  /*
   * Uzaklık derinlikle orantılı: kol ne kadar derinse kamera o kadar
   * geriden bakıyor. Tersi olsaydı (sabit uzaklık) sığ bir kol hiç
   * görünmez, derin bir kol ise balıkgözü gibi açılırdı.
   */
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
   * kurulsaydı kolun yakın kenarı dışarıda kalırdı. Sekiz köşe de
   * izdüşürülüp sınırlar oradan alınıyor.
   */
  let solEn = 0
  let sagEn = 0
  let ustY = 0
  let altY = 0
  for (const p of parcalar) {
    const cx = p.mx - ortX
    const cz = -(p.mz - ortZ)
    /*
     * GÖZ HİZASI TABAN ÇİZGİSİNDE.
     *
     * Bakış ekranların dikey ortasındayken perspektif alt kenarları da
     * kaydırıyordu: öne gelen kolun alt köşesi arka ekranın altına
     * düşüyor, grup duvarın alt çizgisinin dışına taşıyordu. Taban
     * yüksekliğinden bakılınca o yükseklikteki her nokta olduğu yerde
     * kalıyor, yani bütün alt kenarlar TEK çizgide buluşuyor.
     *
     * y = 0 taban çizgisi; yukarısı eksi.
     */
    const cy = -p.h / 2
    for (const u of [-p.w / 2, p.w / 2]) {
      const X = cx + Math.cos(p.t) * u
      const Z = cz - Math.sin(p.t) * u
      const k = D / (D - Z)
      for (const v of [-p.h / 2, p.h / 2]) {
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
          /* Göz hizası ekranların dikey ortası: alt ve üst eşit açılıyor. */
          /* Kutunun alt kenarı taban çizgisinde (bkz. cy). */
          top: gozY - boyPx,
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

        {parcalar.map((p, i) => (
          <div
            key={p.e.id ?? i}
            style={{
              position: 'absolute',
              left: 0,
              top: boyPx - p.h,
              width: p.w,
              height: p.h,
              marginLeft: -p.w / 2,
              /*
               * rotateY(θ) ekranın en eksenini (cos θ, 0, −sin θ) yapıyor;
               * üstten bakıştaki derinlik ekseni de eksi Z. İkisi aynı
               * işaretle kurulduğu için açı doğrudan geçiyor.
               */
              transform: `translate3d(${p.mx - ortX}px, 0, ${-(p.mz - ortZ)}px) rotateY(${
                (p.t * 180) / Math.PI
              }deg)`,
              /*
                YUVARLAK KÖŞE — eklemin iki yanındaki kenar yumuşuyor.
                Seçim açılı birleşimde eklem satırından geliyor
                (bkz. App → birlesimGeometrisi).
              */
              borderRadius: p.e.solYuvarlak || p.e.sagYuvarlak ? yuvarlatma(p) : undefined,
              overflow: p.e.solYuvarlak || p.e.sagYuvarlak ? 'hidden' : undefined,
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
        ))}
      </div>
    </div>
  )
}
