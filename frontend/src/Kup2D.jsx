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
import { Screen } from './WallPreview.jsx'

/* Kaide: küpün altında durduğu yer. Boyu küpün yüksekliğinden türüyor. */
const KAIDE_ORAN = 0.06

export default function Kup2D({
  ekranlar = [],
  pxPerM = 200,
  model = null,
  resolution = null,
  sifirlaEtiketi = 'Yönü sıfırla',
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
            model={model}
            resolution={resolution}
            content={ekran?.content || 'led'}
            contentUrl={ekran?.contentUrl || null}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-center" style={{ width: Math.max(W, D) * 1.6 }}>
      <div
        /* Kaide aşağı doğru izdüşüyor: altta yer bırakılmazsa düğmenin üstüne biniyor. */
        style={{ perspective: 1400, width: '100%', height: H + kaide + D * 0.7 + 28, touchAction: 'none' }}
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
            top: 10,
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
              <Screen
                wPx={W}
                hPx={D}
                cols={ustEkran.cols || 1}
                rows={ustEkran.rows || 1}
                type="flat"
                model={model}
                resolution={resolution}
                content={ustEkran.content || 'led'}
                contentUrl={ustEkran.contentUrl || null}
              />
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
              transform: `rotateX(90deg) translateZ(${-kaide}px)`,
              background: 'linear-gradient(180deg, #3a4150, #232935)',
              borderRadius: 2,
            }}
          />
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
