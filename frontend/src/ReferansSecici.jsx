/**
 * REFERANS ÖLÇÜ — İKİ NOKTA İŞARETLEME.
 *
 * Kullanıcı fotoğrafta gerçek uzunluğunu bildiği bir yerin iki ucunu
 * işaretliyor; ölçek bu iki noktadan çıkıyor (bkz. referansOlcek.js).
 *
 * Noktalar burada TUVAL PİKSELİNDE tutuluyor ve öyle geri veriliyor; normalize
 * fotoğraf koordinatına çevirmek App.jsx'in işi (tuvalOrana). Böylece bu
 * bileşen yakınlaştırmadan ve fotoğrafın tuvale nasıl yerleştiğinden habersiz
 * kalıyor — tek işi işaretlemek.
 *
 * KoseSecici'den ayrı duruyor: o dört köşeli bir dörtgeni düzenliyor ve
 * dörtgenin geçerliliğini denetliyor; burada dörtgen yok, iki nokta var ve
 * denetim başka (noktalar birbirine çok yakın olmamalı).
 */

import { useEffect, useRef, useState } from 'react'

/*
 * İŞARET KÜÇÜK, VURUŞ ALANI BÜYÜK.
 *
 * İşaret eskiden içine sıra numarası yazılan dolgulu bir daireydi (r=9, yani
 * 22 piksel genişlik): oturtulmak istenen köşe işaretin ALTINDA kalıyor,
 * görünmediği için hassas ayar yapılamıyordu.
 *
 * Şimdi işaret içi boş küçük bir halka: ortasındaki delikten hedef piksel
 * görünüyor, merkezde de 1 pikselik bir nokta var. Tıklama/sürükleme alanı
 * ayrı ve hâlâ geniş (VURUS) — küçük işaret fareyle tutmayı zorlaştırmıyor.
 */
const R = 4.5
const R_SECILI = 6
const VURUS = 18
/*
 * YAPIŞMA YARIÇAPI.
 *
 * İki ekranı köşede uç uca getirmek demek, aslında AYNI iki noktayı iki
 * alanda da kullanmak demek. Göz kararıyla tıklamak birkaç piksel şaşıyor
 * ve çizimde açık bir dikiş ya da bindirme olarak görünüyor. İmleç var olan
 * bir köşeye bu kadar yaklaşınca tam ona oturuyor.
 *
 * 12 px: tutamağın vuruş alanından (18) küçük, göz farkından büyük.
 */
const YAPIS = 12

export default function ReferansSecici({
  noktalar = [],
  onDegis,
  tuvalW,
  tuvalH,
  enAzPiksel = 0,
  enCokNokta = 2,
  gorselCarpani = 1,
  sinir = null,
  /* Yapışılacak noktalar (tuval pikseli): başka ekranların köşeleri. */
  yapiskanNoktalar = [],
  /*
   * BÜYÜTEÇ KAYNAĞI — fotoğrafın adresi ve tuvaldeki dikdörtgeni.
   * {url, sol, ust, en, boy}. Yoksa büyüteç çizilmiyor.
   */
  foto = null,
  /*
   * FOTOĞRAFTAKİ GERÇEK KÖŞEYE/KENARA YAPIŞMA.
   *
   * Tuval pikselinde bir nokta alıp yine tuval pikselinde düzeltilmişini
   * döndüren işlev (bkz. kenarBulucu.js). Hesabı App yapıyor çünkü
   * fotoğrafın kendi çözünürlüğünü bu bileşen bilmiyor.
   */
  kenaraYapis = null,
  /*
   * CANLI ÖLÇÜ — nokta sürüklenirken büyütecin altında yazan metin.
   * App hesaplıyor; burada yalnızca gösteriliyor.
   */
  olcuYazi = null,
  /*
   * TUVALİN YAKINLAŞTIRMA ÇARPANI.
   *
   * Yakınlaştırma bu katmanın ÜSTÜNDEKİ sarmalayıcıya CSS dönüşümü olarak
   * uygulanıyor; dolayısıyla getBoundingClientRect ölçeklenmiş bir dikdörtgen
   * veriyor ve fare farkları da o kadar büyük geliyor. Nokta koordinatları
   * ölçeksiz tuval pikselinde tutulduğu için gelen her fare ölçüsü buraya
   * bölünüyor. Bölünmezse nokta imlecin kat kat uzağına düşüyor.
   */
  olcek = 1,
  /*
   * Yakınlaştırılmışken tuvali kaydırma. Sürükleme kaydırıyor, tıklama
   * nokta koyuyor; ikisini ayıran şey parmağın/farenin kaç piksel gittiği.
   */
  onKaydir = null,
}) {
  /*
   * HER ŞEY FOTOĞRAFIN İÇİNDE KALIYOR.
   *
   * Tuval fotoğraftan büyük: kenarlarda boş şerit var. Noktalar tuvalin
   * tamamına kıstırılıyordu, dolayısıyla o boş şeride — fotoğrafın DIŞINA —
   * bırakılabiliyordu. Fotoğrafın dışında kalan bir nokta hiçbir şeyi
   * göstermiyor ama ölçeğe giriyor: işaretlenmemiş bir yerin uzunluğu
   * ölçülmüş oluyordu.
   *
   * Sınır App'ten geliyor (fotoğrafın tuvaldeki dikdörtgeni). Yoksa eski
   * davranış: tuvalin kendisi.
   */
  const S = {
    sol: sinir?.sol ?? 0,
    ust: sinir?.ust ?? 0,
    sag: sinir?.sag ?? tuvalW,
    alt: sinir?.alt ?? tuvalH,
  }
  const kis = (p) => ({
    x: Math.max(S.sol, Math.min(S.sag, p.x)),
    y: Math.max(S.ust, Math.min(S.alt, p.y)),
  })
  const katmanRef = useRef(null)
  const surukleRef = useRef(null)
  const [secili, setSecili] = useState(0)
  /*
   * İMLECİN YERİ — ÇİZGİ TIKLAMADAN ÖNCE DE GÖRÜNSÜN.
   *
   * Konulan noktalar arasına çizgi çizmek yetmiyordu: kullanıcı bir sonraki
   * noktayı koyarken kenarın nereye gideceğini GÖREMİYOR, göz kararıyla
   * tıklıyordu. Fare nerede duruyorsa oraya giden çizgi bu yüzden var:
   * tıklamadan önce kenarın hizası belli oluyor. Dört köşede son noktada
   * dörtgenin kapanışı da gösteriliyor.
   *
   * Yalnızca görüntü: hiçbir şey kaydedilmiyor, nokta eklenmiyor.
   */
  const [imlec, setImlec] = useState(null)
  /* O an yapışılan nokta — vurgulanıyor ki kullanıcı kilidi görsün. */
  const [yapisan, setYapisan] = useState(null)
  /*
   * BÜYÜTECİN ODAĞI.
   *
   * İmleçten ayrı tutuluyor: imleç yalnızca nokta KOYARKEN anlamlı (kenar
   * çizgisini o çiziyor), büyüteç ise sürüklerken de gerekiyor. Telefonda
   * zaten en çok sürüklerken lazım, çünkü orada hedefi kapatan şey parmak.
   */
  const [buyutecNokta, setBuyutecNokta] = useState(null)

  /*
   * Klavyeyle ince ayar: fareyle bir noktayı tam köşeye oturtmak zor ve
   * referansın hassasiyeti doğrudan ölçeğe geçiyor. Ok tuşları 1 piksel,
   * Shift ile 10 piksel.
   */
  useEffect(() => {
    const tus = (e) => {
      if (!noktalar[secili]) return
      const yon = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
      if (!yon) return
      e.preventDefault()
      const adim = e.shiftKey ? 10 : 1
      onDegis(
        noktalar.map((p, i) =>
          i === secili ? kis({ x: p.x + yon[0] * adim, y: p.y + yon[1] * adim }) : p,
        ),
      )
    }
    window.addEventListener('keydown', tus)
    return () => window.removeEventListener('keydown', tus)
  }, [noktalar, secili, onDegis, tuvalW, tuvalH])

  const z = olcek > 0 ? olcek : 1
  const yerel = (e) => {
    const r = katmanRef.current?.getBoundingClientRect()
    if (!r) return null
    return kis({ x: (e.clientX - r.left) / z, y: (e.clientY - r.top) / z })
  }
  /* Basılı tutulan parmağın/farenin durumu — kaydırma mı, tıklama mı. */
  const basRef = useRef(null)

  /*
   * En yakın yapışma noktası — Alt basılıysa yapışma kapalı.
   * Kullanıcı bilerek köşenin yanına koymak isteyebilir.
   */
  const yakin = (p, kapali) => {
    if (kapali || !p) return null
    /*
     * SIRA ÖNEMLİ: önce BAŞKA EKRANIN köşesi, sonra fotoğraftaki kenar.
     *
     * İki ekranı uç uca getirmek kullanıcının açık isteği; fotoğraftaki
     * kenar ise bir tahmin. Tahmin, açık isteğin önüne geçmemeli — yoksa
     * dikiş noktası birkaç piksel yanındaki duvar çizgisine kaçar ve iki
     * ekran arasında görünür bir boşluk kalır.
     */
    let en = null
    if (Array.isArray(yapiskanNoktalar)) {
      for (const q of yapiskanNoktalar) {
        if (!q || !Number.isFinite(q.x) || !Number.isFinite(q.y)) continue
        const u = Math.hypot(q.x - p.x, q.y - p.y)
        if (u <= YAPIS && (!en || u < en.u)) en = { q, u }
      }
    }
    if (en) return en.q
    if (kenaraYapis) {
      const k = kenaraYapis(p)
      if (k && Number.isFinite(k.x) && Number.isFinite(k.y)) return kis(k)
    }
    return null
  }

  /*
   * NOKTA BASINCA DEĞİL BIRAKINCA KONUYOR.
   *
   * Yakınlaştırma gelince aynı yüzey iki işi birden görmek zorunda kaldı:
   * sürükleme tuvali kaydırıyor, tıklama nokta koyuyor. İkisini ayıran şey
   * parmağın kaç piksel gittiği (4 px). Yakınlaştırma yokken de aynı kural
   * işliyor; yan etkisi şu: boş alanda sürüklemek artık yanlışlıkla nokta
   * koymuyor.
   */
  const katmanaBas = (e) => {
    basRef.current = { x: e.clientX, y: e.clientY, sonX: e.clientX, sonY: e.clientY, tasindi: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const katmanaBirak = (e) => {
    const b = basRef.current
    basRef.current = null
    if (!b || b.tasindi) return
    if (noktalar.length >= enCokNokta) return
    const ham = yerel(e)
    if (!ham) return
    const y = yakin(ham, e.altKey)
    setSecili(noktalar.length)
    onDegis([...noktalar, y || ham])
    setYapisan(null)
    setBuyutecNokta(y || ham)
  }

  /*
   * İŞARET FAREYE SIÇRAMIYOR.
   *
   * Sürükleme işareti doğrudan farenin bulunduğu noktaya koyuyordu; vuruş
   * alanı işaretten geniş olduğu için (VURUS 18, halka 4,5) tutamağın
   * kenarından tutmak işareti 18 piksele kadar atlatabiliyordu. Referansın
   * hassasiyeti doğrudan ölçeğe geçtiği için bu kabul edilemez. Artık
   * yalnızca farenin gittiği kadar gidiyor.
   */
  const noktayaBas = (i) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    setSecili(i)
    e.currentTarget.setPointerCapture?.(e.pointerId)
    surukleRef.current = { i, fareX: e.clientX, fareY: e.clientY, bas: noktalar[i] }
  }

  const hareket = (e) => {
    const b = basRef.current
    if (b) {
      if (!b.tasindi && Math.hypot(e.clientX - b.x, e.clientY - b.y) > 4) b.tasindi = true
      if (b.tasindi) {
        if (onKaydir && z > 1) onKaydir(e.clientX - b.sonX, e.clientY - b.sonY)
        b.sonX = e.clientX
        b.sonY = e.clientY
        return
      }
    }
    const s = surukleRef.current
    if (!s || !s.bas) {
      /* Sürükleme yokken imleç çizgisi ve yapışma vurgusu için yeri saklıyoruz. */
      if (noktalar.length < enCokNokta) {
        const ham = yerel(e)
        const y = yakin(ham, e.altKey)
        setYapisan(y)
        if (ham) setBuyutecNokta(y || ham)
        if (noktalar.length > 0 && ham) setImlec(y || ham)
      }
      return
    }
    const ham = kis({
      x: s.bas.x + (e.clientX - s.fareX) / z,
      y: s.bas.y + (e.clientY - s.fareY) / z,
    })
    /* Var olan bir noktayı sürüklerken de yapışıyor: köşe düzeltirken de lazım. */
    const y = yakin(ham, e.altKey)
    setYapisan(y)
    setBuyutecNokta(y || ham)
    onDegis(noktalar.map((q, j) => (j === s.i ? y || ham : q)))
  }

  const birak = () => {
    surukleRef.current = null
    basRef.current = null
    setYapisan(null)
    setBuyutecNokta(null)
  }

  const imleciBirak = () => {
    setImlec(null)
    setYapisan(null)
    setBuyutecNokta(null)
  }

  const [a, b] = noktalar
  const cizgiKipi = enCokNokta === 2
  const uzunlukPx = cizgiKipi && a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0
  /*
   * ROZETTE YAZAN SAYI ORİJİNAL GÖRSEL PİKSELİ.
   *
   * Noktalar tuval pikselinde tutuluyor ve rozet de bir ara o mesafeyi
   * yazıyordu. Ama ölçek tuval pikselinden HESAPLANMIYOR: fotoğrafın kendi
   * çözünürlüğündeki mesafeden hesaplanıyor (bkz. ikiNoktaPikselMesafesi).
   * İkisi aynı sayı değil — tuval, fotoğrafı küçülterek gösteriyor — ve
   * tuvaldeki sayı pencere boyutuyla da değişiyordu. Yani ekranda, hesaba
   * HİÇ girmeyen bir rakam duruyordu.
   *
   * Çarpan, bir tuval pikselinin kaç görsel pikseli ettiği; App'ten geliyor
   * çünkü fotoğrafın tuvale nasıl oturduğunu bu bileşen bilmiyor.
   */
  const gorselUzunlukPx = uzunlukPx * (gorselCarpani > 0 ? gorselCarpani : 1)
  const kisa = cizgiKipi && !!(a && b) && enAzPiksel > 0 && gorselUzunlukPx < enAzPiksel
  const renk = kisa ? '#d97706' : '#16a34a'
  /*
   * Dört köşe kipinde kapalı bir dörtgen çiziliyor: kullanıcı işaretlediği
   * şeklin dikdörtgen olup olmadığını ancak böyle görüyor.
   */
  const dortgen = !cizgiKipi && noktalar.length === 4 ? noktalar.map((p) => `${p.x},${p.y}`).join(' ') : null
  /*
   * ARADAKİ ÇİZGİ İŞARETLERKEN DE VAR.
   *
   * Dörtgen yalnızca dört nokta tamamlanınca çiziliyordu; o ana kadar
   * ekranda birbirinden kopuk noktalar duruyor, kullanıcı kenarın nereye
   * gittiğini göremiyordu. İkinci noktadan itibaren konulan noktalar
   * birleştiriliyor: çizgi kenarın hizasını gösteriyor, dolayısıyla üçüncü
   * ve dördüncü nokta göz kararı değil, kenara bakarak konuyor.
   */
  const yol =
    !cizgiKipi && noktalar.length >= 2 && noktalar.length < 4
      ? noktalar.map((p) => `${p.x},${p.y}`).join(' ')
      : null

  /*
   * ROZETİN YERİ. Varsayılan yer çizginin ortasının üstü. Fotoğrafın
   * tepesine yakınsa yukarıda yer yok: çizginin altına geçiyor. Yatayda da
   * kendi genişliği kadar içeri çekiliyor — kenara yakın bir referansta
   * rozet fotoğrafın dışına sarkıyordu.
   */
  const rozet = (() => {
    if (!cizgiKipi || !a || !b) return { x: 0, y: 0 }
    const ox = (a.x + b.x) / 2
    const oy = (a.y + b.y) / 2
    const ust = oy - 30 >= S.ust ? oy - 30 : Math.min(oy + 10, S.alt - 24)
    return {
      x: Math.max(S.sol + 48, Math.min(S.sag - 48, ox)),
      y: Math.max(S.ust + 2, ust),
    }
  })()

  return (
    <svg
      ref={katmanRef}
      width={tuvalW}
      height={tuvalH}
      className="absolute inset-0 z-30"
      style={{
        touchAction: 'none',
        cursor: noktalar.length < enCokNokta ? 'crosshair' : 'default',
        /*
         * Kontenjan doluyken yalnızca tutamaklar fareyi görüyor —
         * YAKINLAŞTIRILMIŞ hâli ayrı: orada katman kaydırmayı da taşıyor.
         */
        pointerEvents: noktalar.length >= enCokNokta && z <= 1 ? 'none' : 'auto',
      }}
      onPointerDown={katmanaBas}
      onPointerMove={hareket}
      onPointerUp={(e) => {
        katmanaBirak(e)
        birak()
      }}
      onPointerCancel={birak}
      onPointerLeave={imleciBirak}
    >
      {/* Noktasız alan da tıklanabilir olmalı: saydam dolgu hedef oluyor. */}
      <rect x="0" y="0" width={tuvalW} height={tuvalH} fill="rgba(0,0,0,0.001)" />

      {/*
        ÇİZGİ KALIN VE KONTRASTLI.

        İnce tek renkli çizgi açık renkli bir duvarda seçilmiyordu. Altına
        koyu bir hat çiziliyor: hem açık hem koyu zeminde okunuyor.
      */}
      {dortgen && (
        <>
          <polygon
            points={dortgen}
            fill="rgba(22,163,74,0.10)"
            stroke="rgba(0,0,0,0.45)"
            strokeWidth="5.5"
            strokeDasharray="8 5"
          />
          <polygon points={dortgen} fill="none" stroke={renk} strokeWidth="3" strokeDasharray="8 5" />
        </>
      )}

      {/* YAPIŞMA VURGUSU — tıklayınca tam buraya oturacak. */}
      {yapisan && (
        <>
          <circle
            cx={yapisan.x}
            cy={yapisan.y}
            r="10"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            pointerEvents="none"
          />
          <circle cx={yapisan.x} cy={yapisan.y} r="2" fill="#f59e0b" pointerEvents="none" />
        </>
      )}

      {/*
        İMLEÇ ÇİZGİSİ — henüz konmamış kenar.
        Soluk ve ince: konulmuş kenarlarla karışmıyor.
      */}
      {imlec && noktalar.length > 0 && noktalar.length < enCokNokta && (
        <>
          <line
            x1={noktalar[noktalar.length - 1].x}
            y1={noktalar[noktalar.length - 1].y}
            x2={imlec.x}
            y2={imlec.y}
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="4.5"
            strokeDasharray="5 6"
            pointerEvents="none"
          />
          <line
            x1={noktalar[noktalar.length - 1].x}
            y1={noktalar[noktalar.length - 1].y}
            x2={imlec.x}
            y2={imlec.y}
            stroke={renk}
            strokeWidth="2.4"
            strokeDasharray="5 6"
            pointerEvents="none"
          />
          {/* Dördüncü köşe konurken dörtgenin kapanışı da görünüyor. */}
          {!cizgiKipi && noktalar.length === 3 && (
            <line
              x1={imlec.x}
              y1={imlec.y}
              x2={noktalar[0].x}
              y2={noktalar[0].y}
              stroke={renk}
              strokeWidth="1.6"
              strokeDasharray="5 6"
              opacity="0.4"
              pointerEvents="none"
            />
          )}
        </>
      )}

      {/* Tamamlanmamış dörtgen: konulan noktalar arasındaki kenarlar. */}
      {yol && (
        <>
          <polyline
            points={yol}
            fill="none"
            stroke="rgba(0,0,0,0.45)"
            strokeWidth="5.5"
            strokeDasharray="8 5"
            strokeLinejoin="round"
          />
          <polyline
            points={yol}
            fill="none"
            stroke={renk}
            strokeWidth="3"
            strokeDasharray="8 5"
            strokeLinejoin="round"
          />
        </>
      )}

      {cizgiKipi && a && b && (
        <>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(0,0,0,0.45)" strokeWidth="5.5" strokeDasharray="8 5" />
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={renk} strokeWidth="3" strokeDasharray="8 5" />
          {/*
            PİKSEL ROZETİ KALDIRILDI.

            Çizginin ortasında "236 px" yazıyordu. Müşteriye hiçbir şey
            anlatmayan teknik bir sayı; üstelik fotoğrafın tam işaretlenen
            yerini kapatıyordu. Çizginin kısa olup olmadığı zaten çizginin
            RENGİNDEN (turuncu) ve kartın yazısından anlaşılıyor.
          */}
        </>
      )}

      {/*
        BÜYÜTEÇ.

        İmlecin altındaki bölge bir köşede büyütülmüş olarak duruyor.
        Telefonda şart: hedef pikseli parmağın kendisi kapatıyor. Masaüstünde
        de işe yarıyor — duvarın köşesi birkaç piksellik bir geçiş ve o
        geçişin tam ortasına tıklamak büyütmeden mümkün değil.

        İç içe <svg>: kendi görüş alanına kırpıyor, ayrıca bir maskeye gerek
        kalmıyor. Kutu imlecin karşı köşesinde duruyor ki baktığı yeri
        kapatmasın.
      */}
      {foto?.url && buyutecNokta && foto.en > 0 && foto.boy > 0 && (
        (() => {
          /*
           * KUTU EKRANDA HEP AYNI BÜYÜKLÜKTE.
           *
           * Ölçüler tuval pikselinde ama katmanın tamamı yakınlaştırma
           * çarpanıyla ölçekleniyor; kenarı sabit bırakılsa 4 katta
           * tuvalin yarısını kaplıyordu. Çarpana bölününce ekranda hep
           * 148 piksel kalıyor. Büyütme katı (K) bundan bağımsız: ekrandaki
           * etkisi her zaman 4 kat.
           */
          const BK = 148 / z
          const K = 4 // büyütme katı
          const sagda = buyutecNokta.x < tuvalW / 2
          /*
           * Yakınlaştırma yokken kutu tuvalin köşesinde duruyor. Yakınlaşınca
           * tuvalin köşesi GÖRÜNEN alanın dışında kalabiliyor (kaydırma
           * burada bilinmiyor), bu yüzden kutu imlecin yanına geçiyor.
           */
          const bx =
            z > 1
              ? Math.max(S.sol + 4, Math.min(S.sag - BK - 4, buyutecNokta.x + (sagda ? 16 : -16 - BK)))
              : sagda
                ? Math.max(8, tuvalW - BK - 12)
                : 12
          const by =
            z > 1
              ? Math.max(S.ust + 4, Math.min(S.alt - BK - 28, buyutecNokta.y - BK - 16))
              : 12
          return (
            <g pointerEvents="none">
              <svg x={bx} y={by} width={BK} height={BK}>
                <rect width={BK} height={BK} fill="#0b0b0d" />
                <image
                  href={foto.url}
                  x={BK / 2 - (buyutecNokta.x - foto.sol) * K}
                  y={BK / 2 - (buyutecNokta.y - foto.ust) * K}
                  width={foto.en * K}
                  height={foto.boy * K}
                  preserveAspectRatio="none"
                />
                {/* Artı: tam olarak hangi pikselin seçildiğini gösteriyor. Kol boyu kutuya oranlı. */}
                <line x1={BK / 2 - BK * 0.095} y1={BK / 2} x2={BK / 2 - BK * 0.02} y2={BK / 2} stroke="#f59e0b" strokeWidth={1.4 / z} />
                <line x1={BK / 2 + BK * 0.02} y1={BK / 2} x2={BK / 2 + BK * 0.095} y2={BK / 2} stroke="#f59e0b" strokeWidth={1.4 / z} />
                <line x1={BK / 2} y1={BK / 2 - BK * 0.095} x2={BK / 2} y2={BK / 2 - BK * 0.02} stroke="#f59e0b" strokeWidth={1.4 / z} />
                <line x1={BK / 2} y1={BK / 2 + BK * 0.02} x2={BK / 2} y2={BK / 2 + BK * 0.095} stroke="#f59e0b" strokeWidth={1.4 / z} />
                <circle cx={BK / 2} cy={BK / 2} r={1.3 / z} fill="#f59e0b" />
              </svg>
              <rect
                x={bx}
                y={by}
                width={BK}
                height={BK}
                fill="none"
                stroke="#fff"
                strokeWidth={2 / z}
                rx={6 / z}
                opacity="0.85"
              />
              {/* CANLI ÖLÇÜ — sürüklerken ölçü anında burada. */}
              {olcuYazi && (
                <g>
                  <rect x={bx} y={by + BK + 4 / z} width={BK} height={22 / z} rx={6 / z} fill="rgba(17,17,20,0.88)" />
                  <text
                    x={bx + BK / 2}
                    y={by + BK + 19 / z}
                    textAnchor="middle"
                    fontSize={12.5 / z}
                    fontWeight="700"
                    fill="#fff"
                  >
                    {olcuYazi}
                  </text>
                </g>
              )}
            </g>
          )
        })()
      )}

      {noktalar.map((p, i) => (
        <g key={i}>
          {/* Görünmeyen geniş vuruş alanı: küçük daireyi tutturmak zor. */}
          <circle
            cx={p.x}
            cy={p.y}
            r={VURUS}
            fill="rgba(0,0,0,0.001)"
            onPointerDown={noktayaBas(i)}
            /* Katman fareyi bırakmış olsa da tutamak her zaman tutuluyor. */
            style={{ cursor: 'grab', pointerEvents: 'auto' }}
          />
          {/*
            Beyaz dış hat: işaret hem açık hem koyu zeminde görünür kalıyor.
            İç halka boş — altındaki piksel okunuyor.
          */}
          <circle
            cx={p.x}
            cy={p.y}
            r={i === secili ? R_SECILI : R}
            fill="none"
            stroke="#fff"
            strokeWidth={i === secili ? 3.5 : 3}
            opacity="0.9"
            pointerEvents="none"
          />
          <circle
            cx={p.x}
            cy={p.y}
            r={i === secili ? R_SECILI : R}
            fill="none"
            stroke={renk}
            strokeWidth={i === secili ? 2 : 1.4}
            pointerEvents="none"
          />
          {/* Tam konum: halkanın ortasındaki tek nokta. */}
          <circle cx={p.x} cy={p.y} r="1.1" fill={renk} pointerEvents="none" />
          {/*
            Sıra numarası işaretin İÇİNDE değil YANINDA: içine yazmak işareti
            okunacak kadar büyütmeyi zorunlu kılıyordu.
          */}
          <text
            x={p.x + R_SECILI + 4 > S.sag - 10 ? p.x - R_SECILI - 4 : p.x + R_SECILI + 4}
            textAnchor={p.x + R_SECILI + 4 > S.sag - 10 ? 'end' : 'start'}
            y={p.y - R_SECILI - 2 < S.ust + 10 ? p.y + R_SECILI + 11 : p.y - R_SECILI - 2}
            fontSize="11"
            fontWeight="700"
            fill={renk}
            stroke="#fff"
            strokeWidth="2.5"
            paintOrder="stroke"
            pointerEvents="none"
          >
            {i + 1}
          </text>
        </g>
      ))}

    </svg>
  )
}
