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

export default function Kup2D({
  ekranlar = [],
  pxPerM = 200,
  model = null,
  resolution = null,
  sifirlaEtiketi = 'Yönü sıfırla',
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
  const EGIM = (14 * Math.PI) / 180
  const PAY = 8
  /* "Yönü sıfırla" düğmesi kutunun altında duruyor; ona da yer kalsın. */
  const DUGME = 38
  const yariKose = Math.hypot(W, D) / 2
  const kaideYari = (Math.hypot(Math.max(W, D), D) * 1.12) / 2
  /* Kaide küpün tabanının hemen altında (bkz. KAİDE dönüşümü). */
  const kaideY = H / 2 + kaide
  const enYakin = (H / 2) * Math.sin(EGIM) + yariKose * Math.cos(EGIM)
  const k = UZAK / Math.max(1, UZAK - enYakin)
  const ustY = -((H / 2) * Math.cos(EGIM) + yariKose * Math.sin(EGIM)) * k
  const altY = (kaideY * Math.cos(EGIM) + kaideYari * Math.sin(EGIM)) * k
  const cizimEn = Math.max(yariKose, kaideYari) * 2 * k + PAY * 2
  const cizimBoy = altY - ustY + PAY * 2
  /* Göz hizası: bu noktadaki her şey olduğu yerde kalıyor (bkz. perspectiveOrigin). */
  const gozY = -ustY + PAY
  const olcek = Math.max(
    0.05,
    Math.min(
      1,
      enCokW > 0 ? enCokW / cizimEn : 1,
      enCokH > DUGME ? (enCokH - DUGME) / cizimBoy : 1,
    ),
  )

  const bas = (e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    surukle.current = { x: e.clientX, aci }
  }
  const hareket = (e) => {
    const s = surukle.current
    if (!s) return
    /* Yatay sürükleme küpü kendi ekseninde döndürüyor. */
    setAci(s.aci + (e.clientX - s.x) * 0.5)
  }
  const birak = (e) => {
    surukle.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  /*
   * ÜST YÜZ — KÖŞEGENLERLE DÖRT ÜÇGEN.
   *
   * "Tek görsel" açıkken görsel dört yan yüze yatayda bölünüyor; üst yüz
   * beşinci bir dilim alıyor ve yan yüzle arasındaki kenarda görüntü
   * kopuyordu. Üst yüz artık köşegenlerle dört üçgene ayrılıyor: her
   * üçgen, ALTINDAKİ yan yüzün görselinin üst kenardan yukarı doğru
   * devamı. Dilim yüzün kendi diliminden geldiği için kenarda görüntü
   * piksel piksel tutuyor.
   *
   * Üçgen, yan yüzün diliminden aynı ölçekte (1 px = 1 px) kesiliyor;
   * tabanı kenarda, tepesi üst yüzün ortasında.
   *
   * ÜST YÜZÜN YÖNÜ. Bu kutu rotateX(90°) ile yatırılıyor: yerel +y ekseni
   * dünyada ÖNE bakıyor. Yani kutunun alt kenarı ön yüzün, üst kenarı
   * arka yüzün kenarı. Yan yüzlerin görsel yönü de kendi rotateY'lerinden
   * geliyor (sağ yüz önden arkaya, sol yüz arkadan öne), üçgenler de o
   * yüzden ayrı ayrı döndürülüyor.
   */
  const ucgenler = [
    /* ÖN: taban altta, görsel dikeyde aynalanıyor (kenarda birebir tutsun). */
    {
      kirpma: 'polygon(0% 100%, 100% 100%, 50% 50%)',
      kutu: { left: 0, top: D / 2, width: W, height: D / 2 },
      donus: 'scaleY(-1)',
    },
    /* SAĞ: taban sağda; yüzün görseli önden arkaya akıyor. */
    {
      kirpma: 'polygon(100% 0%, 100% 100%, 50% 50%)',
      kutu: { left: (3 * W) / 4 - D / 2, top: D / 2 - W / 4, width: D, height: W / 2 },
      donus: 'rotate(-90deg) scaleY(-1)',
    },
    /* ARKA: taban üstte; yüz 180° dönük olduğu için görsel yatayda ters. */
    {
      kirpma: 'polygon(0% 0%, 100% 0%, 50% 50%)',
      kutu: { left: 0, top: 0, width: W, height: D / 2 },
      donus: 'scaleX(-1)',
    },
    /* SOL: taban solda; yüzün görseli arkadan öne akıyor. */
    {
      kirpma: 'polygon(0% 0%, 0% 100%, 50% 50%)',
      kutu: { left: W / 4 - D / 2, top: D / 2 - W / 4, width: D, height: W / 2 },
      donus: 'rotate(90deg) scaleY(-1)',
    },
  ]

  /* Yüzün kutudaki yeri: sırayla ön, sağ, arka, sol. */
  const yuzDonusumu = (i) =>
    [
      `translateZ(${D / 2}px)`,
      `rotateY(90deg) translateZ(${W / 2}px)`,
      `rotateY(180deg) translateZ(${D / 2}px)`,
      `rotateY(-90deg) translateZ(${W / 2}px)`,
    ][i]

  const yuzEni = (i) => (i % 2 === 0 ? W : D)

  /*
   * YÜZLER KENDİ ÖLÇÜSÜYLE, ALTTAN HİZALI.
   *
   * Eskiden her yüz kutunun tam eni ve en uzun ekranın boyuyla
   * çiziliyordu: 2×2'lik bir yüz, 4×4'lük komşusunun boyuna gerilip
   * kabinleri olduğundan büyük görünüyordu. Yüz artık kendi gerçek
   * ölçüsünde; kısa yüz kutunun alt kenarına oturuyor, üstte kalan
   * pay açık duruyor — gerçekte de öyle durur.
   */
  const yuz = (ekran, i) => {
    const kutuEni = yuzEni(i)
    const eni = Math.min(kutuEni, gEn(ekran) * pxPerM || kutuEni)
    const boyu = Math.min(H, (ekran?.hm || 0) * pxPerM || H)
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
            {...(ekran?.icerikProp || null)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-center" style={{ width: cizimEn * olcek }}>
      {/* Küçültülen çizimin kapladığı yer: düğme hep kutunun altında kalsın. */}
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
        className="cursor-ew-resize select-none"
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
            /* Hafif yukarıdan bakış: üst yüz görünsün. */
            transform: `rotateX(-14deg) rotateY(${aci}deg)`,
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
              transform: `rotateX(90deg) translateZ(${H / 2}px) translateY(${-D / 2 + H / 2}px)`,
            }}
          >
            {ustEkran ? (
              <>
              <Screen
                wPx={W}
                hPx={D}
                cols={ustEkran.cols || 1}
                rows={ustEkran.rows || 1}
                type="flat"
                sade={sade}
                model={model}
                resolution={resolution}
                content={ustEkran.content || 'led'}
                contentUrl={ustEkran.contentUrl || null}
                {...(ustEkran.icerikProp || null)}
              />
              {/*
                Dört üçgen üst yüzün ÜSTÜNE biniyor: alttaki ekran kabin
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
              </>
            ) : (
              <div className="h-full w-full bg-[#2b313b]" />
            )}
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

      <button
        type="button"
        onClick={() => setAci(-28)}
        className="mt-2 rounded-lg border border-neutral-300 px-3 py-1 text-[13px] font-medium text-neutral-600 transition-colors hover:border-brand hover:text-brand dark:border-[#39414f] dark:text-neutral-300"
      >
        {sifirlaEtiketi}
      </button>
    </div>
  )
}
