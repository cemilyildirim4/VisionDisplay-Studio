/**
 * KÜP — TASARIM EKRANINDA GERÇEK KÜP.
 *
 * Küp tipi seçilince ekranlar yan yana düz dikdörtgenler olarak
 * çiziliyordu; kullanıcı neyi kurduğunu göremiyordu. Burada küp gerçek
 * bir kutu olarak duruyor: yüzler köşelerden birleşik, kenarlar
 * birbirine oturuyor.
 *
 * NEDEN CSS 3B.
 *
 * Yüzleri tek tek homografiyle yerleştirmek yerine tarayıcının kendi 3B
 * dönüşümü kullanılıyor: `preserve-3d` ile yüzler gerçekten döndürülüyor,
 * böylece kenarlar kendiliğinden tutuyor ve derinlik sırası doğru
 * çıkıyor. Elle hesaplanan dörtgenlerde köşelerin birkaç piksel kayması
 * kaçınılmazdı.
 *
 * YÜZLER EKRANLARDAN.
 *
 * Dört ekran: dört yan yüz. Beşinci ekran varsa üst yüz de ekran; yoksa
 * üstte kapalı bir kapak duruyor. Her yüz kendi içeriğini gösteriyor;
 * "Tek görsel" açıkken bölme zaten ekranların kendi dilimlerinden
 * geliyor.
 *
 * ÖLÇÜ GERÇEK.
 *
 * Genişlik ve derinlik iki komşu ekranın gerçek enlerinden, yükseklik en
 * uzun ekranın boyundan. Yüzler eşit değilse küp değil dikdörtgen prizma
 * çıkıyor — doğru olan da bu.
 */
import { useRef, useState } from 'react'
import { Screen, contentImage } from './WallPreview.jsx'

/* Kaide: küpün altında durduğu yer. Boyu küpün yüksekliğinden türüyor. */
const KAIDE_ORAN = 0.06

/*
 * BAKIŞ YÜKSEKLİĞİNİN SINIRI.
 *
 * Küp dikeyde de sürüklenebiliyor. Sınırsız bırakılsaydı kutu tepeden
 * bakılan bir dikdörtgene ya da hiç yüzü görünmeyen bir çizgiye
 * dönüşebilirdi; aralık kutunun hep kutu gibi okunduğu yere kadar.
 */
const EGIM_EN_AZ = -10
const EGIM_EN_COK = 55
const BASLANGIC_EGIM = 14

export default function Kup2D({
  ekranlar = [],
  pxPerM = 200,
  model = null,
  resolution = null,
  /* Sade kip: yüz kenarlıkları kalkıyor. */
  sade = false,
  /*
   * ÇİZİMİN SIĞACAĞI KUTU (duvarın içi).
   *
   * Küp ham ölçüsüyle kuruluyordu: eğim ve perspektifle büyüyen kutu
   * duvarın üstüne taşıyor, taşan kısım kırpılıyordu.
   */
  enCokW = 0,
  enCokH = 0,
}) {
  const [aci, setAci] = useState(-28)
  const [egim, setEgim] = useState(BASLANGIC_EGIM)
  const surukle = useRef(null)

  if (!Array.isArray(ekranlar) || ekranlar.length < 2) return null

  /* Yan yüzler en çok dört tane; beşinci ekran üst yüz. */
  const yanlar = ekranlar.slice(0, 4)
  const ustEkran = ekranlar[4] || null

  /*
   * KUTUNUN ÖLÇÜSÜ KARŞILIKLI YÜZLERDEN.
   *
   * Ön ile arka aynı eni, sağ ile sol aynı derinliği paylaşıyor — kutu
   * ancak böyle kapanır. Karşılıklı iki ekran farklı enle kurulduysa
   * büyüğü belirliyor; küçüğü kendi kutusunun içinde kendi eniyle
   * duruyor, zorla gerilmiyor.
   */
  /* Şeridin kısalttığı en değil gerçek en (bkz. Birlesim2D). */
  const gEn = (e) => e?.gercekWm ?? e?.wm ?? 0
  const enM = Math.max(gEn(yanlar[0]), gEn(yanlar[2]))
  const derinlikM = Math.max(gEn(yanlar[1]), gEn(yanlar[3])) || enM
  const boyM = Math.max(...yanlar.map((x) => x.hm || 0), 0)
  if (!(enM > 0) || !(derinlikM > 0) || !(boyM > 0)) return null

  const W = enM * pxPerM
  const D = derinlikM * pxPerM
  const H = boyM * pxPerM
  const kaide = Math.max(6, H * KAIDE_ORAN)

  /*
   * ÇİZİM DUVARA ORANTILI SIĞIYOR.
   *
   * Kutunun izdüşümü (eğim → dönüş → perspektif) hesaplanıyor ve çizim
   * duvarın içine ÖLÇEKLENİYOR; şekil bozulmuyor, yalnızca küçülüyor.
   * Ölçü etiketleri gerçek metreden geldiği için sayılar değişmiyor.
   *
   * Sınırlar en geniş dönüş açısına göre alınıyor: küp sürüklenirken
   * boyutunun değişmemesi için.
   */
  const UZAK = 1400
  const PAY = 8
  const yariKose = Math.hypot(W, D) / 2
  const kaideYari = (Math.hypot(Math.max(W, D), D) * 1.12) / 2
  /* Kaide küpün tabanının hemen altında (bkz. KAİDE dönüşümü). */
  const kaideY = H / 2 + kaide
  /*
   * ÇİZİM KUTUSU BÜTÜN EĞİM ARALIĞINA GÖRE.
   *
   * İzdüşüm eğimle değişiyor: tek bir açıya göre ölçülen kutu, dikey
   * sürüklemede başka açılarda dar kalır ve küp duvarın dışına taşardı.
   * Aralığın tamamı taranıp en uçtaki üst/alt/en değerleri alınıyor;
   * kutu sabit kaldığı için küp sürüklenirken ne büyüyor ne de kayıyor.
   */
  let ustY = Infinity
  let altY = -Infinity
  let enGenis = 0
  for (let d = EGIM_EN_AZ; d <= EGIM_EN_COK + 0.001; d += 2.5) {
    const e = (Math.min(d, EGIM_EN_COK) * Math.PI) / 180
    const yakin = (H / 2) * Math.sin(e) + yariKose * Math.cos(e)
    const k = UZAK / Math.max(1, UZAK - yakin)
    ustY = Math.min(ustY, -((H / 2) * Math.cos(e) + yariKose * Math.sin(e)) * k)
    altY = Math.max(altY, (kaideY * Math.cos(e) + kaideYari * Math.sin(e)) * k)
    enGenis = Math.max(enGenis, Math.max(yariKose, kaideYari) * 2 * k)
  }
  const cizimEn = enGenis + PAY * 2
  const cizimBoy = altY - ustY + PAY * 2
  /* Göz hizası: bu noktadaki her şey olduğu yerde kalıyor (bkz. perspectiveOrigin). */
  const gozY = -ustY + PAY
  const olcek = Math.max(
    0.05,
    Math.min(1, enCokW > 0 ? enCokW / cizimEn : 1, enCokH > 0 ? enCokH / cizimBoy : 1),
  )

  const bas = (e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    surukle.current = { x: e.clientX, y: e.clientY, aci, egim }
  }
  const hareket = (e) => {
    const s = surukle.current
    if (!s) return
    /* Yatay sürükleme küpü kendi ekseninde döndürüyor. */
    setAci(s.aci + (e.clientX - s.x) * 0.5)
    /*
     * Dikey sürükleme bakış yüksekliğini değiştiriyor: aşağı çekmek
     * küpün üstünü öne yatırıyor (yukarıdan bakış), yukarı itmek göz
     * hizasına indiriyor.
     */
    setEgim(
      Math.min(EGIM_EN_COK, Math.max(EGIM_EN_AZ, s.egim + (e.clientY - s.y) * 0.3)),
    )
  }
  const birak = (e) => {
    surukle.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  /* Yüzün kutudaki yeri: sırayla ön, sağ, arka, sol. */
  const yuzDonusumu = (i) =>
    [
      `translateZ(${D / 2}px)`,
      `rotateY(90deg) translateZ(${W / 2}px)`,
      `rotateY(180deg) translateZ(${D / 2}px)`,
      `rotateY(-90deg) translateZ(${W / 2}px)`,
    ][i]

  const yuzEni = (i) => (i % 2 === 0 ? W : D)
  const yuzBoyu = (ekran) => Math.min(H, (ekran?.hm || 0) * pxPerM || H)
  const cizimEni = (ekran, i) => Math.min(yuzEni(i), gEn(ekran) * pxPerM || yuzEni(i))

  /*
   * KAPAK BEŞİNCİ EKRANIN GERÇEK ÖLÇÜSÜNDE.
   *
   * Kabin ızgarası kutunun üstüne göre yeniden hesaplanıyordu: ekran
   * kutunun üstünü kapatmasa da kapatıyormuş gibi çiziliyor, kullanıcı
   * ölçünün tutmadığını göremiyordu. Kapak artık ekranın kendi ölçüsünde;
   * kapatmadığı yer AÇIK kalıyor ve sol panelde kaç kabin gerektiği
   * yazıyor (bkz. App → kupUstUyari).
   *
   * Kapak ÖN kenara yaslı: ön yüzün üst kenarına bitişiyor.
   */
  const kapakEni = ustEkran ? gEn(ustEkran) * pxPerM || W : W
  const kapakBoyu = ustEkran ? (ustEkran.hm || 0) * pxPerM || D : D

  /*
   * ÜST YÜZ — KÖŞEGENLERLE DÖRT ÜÇGEN.
   *
   * Bir ara üst yüze görselin en üstünden kesilen bir şerit sıkıştırılmıştı;
   * o yöntem kapağı yan yüzlerden koparıyordu. Üst yüz yine köşegenlerle
   * dört üçgene ayrılıyor: her üçgen ALTINDAKİ yan yüzün görselinin üst
   * kenardan içeri doğru devamı, tabanı o yüzün üst kenarına bitişik.
   * Hangi yandan bakılırsa bakılsın kenarda görüntü kopmuyor.
   *
   * Üçgen, yan yüzün kendi diliminden aynı ölçekte (1 px = 1 px)
   * kesiliyor; tabanı kenarda, tepesi üst yüzün ortasında.
   *
   * ÜST YÜZÜN YÖNÜ. Bu kutu rotateX(90°) ile yatırılıyor: yerel +y ekseni
   * dünyada ÖNE bakıyor. Yani kutunun alt kenarı ön yüzün, üst kenarı
   * arka yüzün kenarı. Yan yüzlerin görsel yönü de kendi rotateY'lerinden
   * geliyor (sağ yüz önden arkaya, sol yüz arkadan öne), üçgenler de o
   * yüzden ayrı ayrı döndürülüyor.
   *
   * ÖLÇÜ KAPAĞIN KENDİSİNDEN. Üçgenler ekranın çizildiği kutuya göre
   * kuruluyor: ekran kutunun üstünü tam kapattığında (olağan durum, bkz.
   * App → kupUstGereken) bu kutu zaten üst karenin kendisi.
   *
   * ÜÇGENLER %1 BİNDİRİLİYOR. Dörtgeni tam dörde bölen köşegenlerde
   * tarayıcının kenar yumuşatması saç teli kadar bir boşluk bırakıyor ve
   * köşegenler boyunca altı sızıyordu. Kenarlar birer yüzde dışarı
   * taşırılıyor: bindirme görünmüyor, boşluk kalmıyor.
   */
  const ucgenler = [
    /* ÖN: taban altta, görsel dikeyde aynalanıyor (kenarda birebir tutsun). */
    {
      kirpma: 'polygon(-1% 101%, 101% 101%, 50% 49%)',
      kutu: { left: 0, top: kapakBoyu / 2, width: kapakEni, height: kapakBoyu / 2 },
      donus: 'scaleY(-1)',
    },
    /* SAĞ: taban sağda; yüzün görseli önden arkaya akıyor. */
    {
      kirpma: 'polygon(101% -1%, 101% 101%, 51% 50%)',
      kutu: {
        left: (3 * kapakEni) / 4 - kapakBoyu / 2,
        top: kapakBoyu / 2 - kapakEni / 4,
        width: kapakBoyu,
        height: kapakEni / 2,
      },
      donus: 'rotate(-90deg) scaleY(-1)',
    },
    /* ARKA: taban üstte; yüz 180° dönük olduğu için görsel yatayda ters. */
    {
      kirpma: 'polygon(-1% -1%, 101% -1%, 50% 51%)',
      kutu: { left: 0, top: 0, width: kapakEni, height: kapakBoyu / 2 },
      donus: 'scaleX(-1)',
    },
    /* SOL: taban solda; yüzün görseli arkadan öne akıyor. */
    {
      kirpma: 'polygon(-1% -1%, -1% 101%, 49% 50%)',
      kutu: {
        left: kapakEni / 4 - kapakBoyu / 2,
        top: kapakBoyu / 2 - kapakEni / 4,
        width: kapakBoyu,
        height: kapakEni / 2,
      },
      donus: 'rotate(90deg) scaleY(-1)',
    },
  ]

  /* Yan yüz ve kapak kendi dilimlerini gösteriyor (şerit/sıkıştırma yok). */
  const yuzIcerigi = (ekran) => ekran?.icerikProp || null
  const kapakIcerigi = ustEkran?.icerikProp || null


  /*
   * YÜZLER KENDİ ÖLÇÜSÜYLE, ALTTAN HİZALI.
   *
   * Eskiden her yüz kutunun tam eni ve en uzun ekranın boyuyla
   * çiziliyordu: 2×2'lik bir yüz, 4×4'lük komşusunun boyuna gerilip
   * kabinleri olduğundan büyük görünüyordu. Yüz artık kendi gerçek
   * ölçüsünde; kısa yüz kutunun alt kenarına oturuyor, üstte kalan
   * pay açık duruyor — gerçekte de öyle durur.
   */
  /*
   * ARKADAKİ YÜZE VİDEO KONMUYOR.
   *
   * Her yüz kendi <video> öğesini kuruyordu: beş ekranlı bir küpte beş
   * video, üstüne bir de panelin küçük resimleri. Tarayıcının aynı anda
   * çözebildiği video sayısı sınırlı; sıranın sonundaki yüzler hiç
   * başlamıyor ve simsiyah kalıyordu (ölçüldü: iki yüz `readyState 1`).
   *
   * `backfaceVisibility: hidden` yüzünden arkaya bakan yüz zaten
   * görünmüyor; ona video kurulmuyor (videoKapali), görüntüsü duruyor.
   * Kalan kod çözücüler bakılan yüzlere kalıyor. Küp döndürülünce yüz
   * görünür olur olmaz videosu kuruluyor.
   */
  const yuzGorunur = (i) => Math.cos(((aci + 90 * i) * Math.PI) / 180) > -0.02

  const yuz = (ekran, i) => {
    const kutuEni = yuzEni(i)
    const eni = cizimEni(ekran, i)
    const boyu = yuzBoyu(ekran)
    return (
      <div
        key={ekran?.id ?? i}
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: kutuEni,
          height: H,
          marginLeft: -kutuEni / 2,
          transform: yuzDonusumu(i),
          backfaceVisibility: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: eni, height: boyu }}>
          <Screen
            wPx={eni}
            hPx={boyu}
            cols={ekran?.cols || 1}
            rows={ekran?.rows || 1}
            type="flat"
            sade={sade}
            model={model}
            resolution={resolution}
            content={ekran?.content || 'led'}
            contentUrl={ekran?.contentUrl || null}
            /* Arkaya bakan yüz: video kurulmuyor (bkz. yuzGorunur). */
            videoKapali={!yuzGorunur(i)}
            {...(yuzIcerigi(ekran) || null)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-center" style={{ width: cizimEn * olcek }}>
      {/* Küçültülen çizimin kapladığı yer. */}
      <div style={{ position: 'relative', width: cizimEn * olcek, height: cizimBoy * olcek }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 0,
          marginLeft: (-cizimEn) / 2,
          width: cizimEn,
          height: cizimBoy,
          perspective: UZAK,
          /* Göz kutunun ortasında: üst ve alt aynı açıyla açılıyor. */
          perspectiveOrigin: `50% ${gozY}px`,
          transform: olcek < 1 ? `scale(${olcek})` : undefined,
          transformOrigin: '50% 100%',
          touchAction: 'none',
        }}
        onPointerDown={bas}
        onPointerMove={hareket}
        onPointerUp={birak}
        onPointerCancel={birak}
        className="cursor-move select-none"
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            /* Kutunun merkezi göz hizasında. */
            top: gozY - H / 2,
            width: 0,
            height: H,
            transformStyle: 'preserve-3d',
            /* Bakış yüksekliği sürüklemeyle değişiyor (bkz. hareket). */
            transform: `rotateX(${-egim}deg) rotateY(${aci}deg)`,
          }}
        >
          {yanlar.map((e, i) => yuz(e, i))}

          {/* ÜST YÜZ — ekran varsa ekran, yoksa kapalı kapak. */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              width: W,
              height: D,
              marginLeft: -W / 2,
              /*
               * KAPAK YAN YÜZLERİN ÜST KENARINA OTURUYOR.
               *
               * Eski dizilim `rotateX(90) translateZ(H/2) translateY(H/2 - D/2)`
               * idi: ikinci ve üçüncü adım DÖNDÜKTEN sonraki eksenlerde
               * çalıştığı için kapak yalnızca D = H olduğunda (tam küpte)
               * yerine oturuyordu. 1×6 kabinlik yüzlerde (H = 3D) kapak
               * kutunun epey üstünde, havada ince bir şerit gibi duruyordu.
               *
               * Ötelemeyi dönüşten ÖNCE yazmak gerekiyor: o anda yerel
               * eksenler dünya eksenleriyle aynı. Kapağın merkezi duruşu
               * gereği kutunun tepesinden D/2 aşağıda; o kadar yukarı
               * alınıyor, sonra yatırılıyor.
               */
              transform: `translateY(${-D / 2}px) rotateX(90deg)`,
              /*
               * KAPATILMAYAN YER AÇIK KALIYOR.
               *
               * Kapak düzlemine koyu bir zemin konuyor ve taşan kısım
               * kesiliyordu: beşinci ekran küçükse kutu kapalıymış gibi,
               * büyükse tam oturmuş gibi görünüyordu. İkisi de ölçünün
               * tutmadığını gizliyordu. Zemin de kırpma da yok: küçük ekran
               * kutunun üstünü açık bırakıyor, büyük ekran kenardan taşıyor.
               */
            }}
          >
            {ustEkran ? (
              /*
               * Ekran kendi gerçek ölçüsünde ve ÖN kenara yaslı duruyor:
               * bu kutunun yerel ALT kenarı, yatırıldıktan sonra kutunun
               * ön kenarına denk geliyor (bkz. rotateX(90deg)).
               */
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: 0,
                  width: kapakEni,
                  height: kapakBoyu,
                  marginLeft: -kapakEni / 2,
                }}
              >
                <Screen
                  wPx={kapakEni}
                  hPx={kapakBoyu}
                  cols={ustEkran.cols || 1}
                  rows={ustEkran.rows || 1}
                  type="flat"
                  sade={sade}
                  model={model}
                  resolution={resolution}
                  content={ustEkran.content || 'led'}
                  contentUrl={ustEkran.contentUrl || null}
                  {...(kapakIcerigi || null)}
                />
                {/*
                  Dört üçgen ekranın ÜSTÜNE biniyor: alttaki ekran kabin
                  dokusunu ve zeminini veriyor, üçgenler yalnızca görüntüyü
                  taşıyor (bkz. ucgenler).
                */}
                {ucgenler.map((u, i) => {
                  const y = yanlar[i]
                  const ip = y?.icerikProp
                  const gorsel = contentImage(y?.content, y?.contentUrl)
                  /* Paylaşılan bir görsel yoksa devam ettirilecek bir şey de yok. */
                  if (!gorsel || !(ip?.spanW > 0) || !(ip?.spanH > 0)) return null
                  return (
                    <div
                      key={'ust' + i}
                      aria-hidden="true"
                      style={{ position: 'absolute', inset: 0, clipPath: u.kirpma, overflow: 'hidden' }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          ...u.kutu,
                          transform: u.donus,
                          transformOrigin: '50% 50%',
                          backgroundImage: gorsel,
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: `${Math.ceil(ip.spanW)}px ${Math.ceil(ip.spanH)}px`,
                          backgroundPosition: `${-(ip.offsetX || 0)}px ${-(ip.offsetY || 0)}px`,
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>

          {/* KAİDE — küp zeminde duruyor, tavana asılı değil. */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: H,
              width: Math.max(W, D) * 1.12,
              height: D * 1.12,
              marginLeft: (-Math.max(W, D) * 1.12) / 2,
              /*
               * Plaka kendi MERKEZİNDE yatıyor; merkezi küpün altından
               * yarım derinlik aşağıda kalıyor ve kaide küpten kopuyordu.
               * Yatırdıktan sonra o kadar yukarı alınıyor.
               */
              transform: `translateY(${-D * 0.56}px) rotateX(90deg) translateZ(${-kaide}px)`,
              background: 'linear-gradient(180deg, #3a4150, #232935)',
              borderRadius: 2,
            }}
          />
        </div>
      </div>
      </div>
    </div>
  )
}
