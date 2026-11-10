/**
 * TASARIMI FOTOĞRAFIN ÜSTÜNE GETİR — 3B YERLEŞİM.
 *
 * "Kendi fotoğrafım" sahnesinde ekranın yeri dört köşe tıklanarak
 * işaretleniyordu: tek ekran, tek düzlem, perspektif elle kuruluyor. Bu
 * katman bunun yerine GRUBUN TAMAMINI gerçek açılarıyla fotoğrafın üstüne
 * koyuyor — köşeli ve yuvarlak birleşimler, her ekranın kendi içeriği ve
 * ekranlar arası görsel paylaşımı dahil.
 *
 * ÖLÇÜ KİLİTLİ. Büyüklük fotoğrafta işaretlenen REFERANS ölçüden geliyor
 * (px/cm → px/m). Yakınlaştırma düğmesi bilerek yok: tasarım fotoğrafta
 * her zaman gerçek boyutunda duruyor, kullanıcı yalnızca yerini ve bakış
 * açısını değiştiriyor.
 *
 * SÜRÜKLEME İKİ İŞ YAPIYOR:
 *   tasarımın ÜSTÜNDEN  → taşıma (fotoğrafta nereye konacağı),
 *   dışındaki boşluktan → döndürme (sağa-sola yaw, aşağı-yukarı pitch).
 * Döndürme yalnızca bakış açısını değiştiriyor; ekranların kendi açıları
 * ve ölçüleri sabit.
 *
 * Perspektif tarayıcının kendi 3B dönüşümünden (preserve-3d): uzaklaşan
 * kenarlar kendiliğinden küçülüyor, derinlik sırası doğru çıkıyor.
 */
import { useRef } from 'react'
import { Screen } from './WallPreview.jsx'
import Kup2D from './Kup2D.jsx'
import { birlesimDilimleri } from './birlesimOlcu.js'

/* Dönen dilimler kıl payı bindiriliyor: aralarında boşluk görünmesin. */
const BINDIRME = 0.6
/* Bakış açısının sınırı: tasarım hep tasarım gibi okunsun. */
const EGIM_EN_AZ = -35
const EGIM_EN_COK = 55

export default function FotoYerlesim3D({
  ekranlar = [],
  pxPerM = 200,
  model = null,
  resolution = null,
  curveAmount = 60,
  sade = false,
  tuvalW = 0,
  tuvalH = 0,
  /* { ux, uy, yaw, egim } — ux/uy tuvalin 0..1'i, açılar derece. */
  durum,
  onDegis,
  kilitli = false,
  /* Birleşim tipi: küp kapalı bir kutu, zincir kuralıyla dizilemiyor. */
  grupTipi = null,
}) {
  const surukle = useRef(null)
  const tasarimRef = useRef(null)

  const d = {
    ux: 0.5,
    uy: 0.5,
    yaw: 0,
    egim: 0,
    ...(durum || null),
  }

  /*
   * KÜP KAPALI BİR KUTU — ZİNCİR DEĞİL.
   *
   * Dört yan yüz üstten bakışta yan yana dizilen bir zincir değil,
   * kutunun dört kenarı; beşinci ekran da üst kapak. Kutuyu zaten Kup2D
   * kuruyor (yüzler, kapak, görselin açılımı, alt kapak); burada aynı
   * çizim fotoğrafın üstünde, referanstan gelen ölçekle duruyor ve
   * döndürmesi bu katmanın sürüklemesinden geliyor.
   *
   * ÖLÇÜ KİLİTLİ: Kup2D'ye sığdırma sınırı verilmiyor (enCokW/enCokH 0),
   * yani çizim küçültülmüyor — fotoğrafta gerçek ölçüsünde duruyor.
   */
  const kutuKipi = grupTipi === 'kutu' && ekranlar.length >= 4

  const parcalar = ekranlar
    .map((e) => ({
      e,
      /* Şeridin kısalttığı en değil GERÇEK en (bkz. Birlesim2D). */
      w: (e.gercekWm ?? e.wm ?? 0) * pxPerM,
      h: (e.hm || 0) * pxPerM,
      t: Number.isFinite(e.yon) ? e.yon : 0,
    }))
    .filter((p) => p.w > 0 && p.h > 0)
  if (!parcalar.length || !(tuvalW > 0) || !(tuvalH > 0)) return null
  const kutuBoyPx = kutuKipi ? Math.max(...parcalar.slice(0, 4).map((p) => p.h)) : 0

  /*
   * GÖRSEL PAYLAŞIMI — "Tek görsel" açıkken.
   *
   * Yüzey kümedeki ekranların gerçek enlerinin toplamı; her ekran kendi
   * payına düşen dilimi gösteriyor. Kural 2D tuvaldekiyle aynı, yoksa
   * aynı tasarım iki yerde farklı bölünürdü.
   */
  const kume = parcalar[0].e.paylasim
  const paylasiyor =
    parcalar.length > 1 && !!kume && parcalar.every((p) => p.e.paylasim === kume)
  const toplamW = parcalar.reduce((t, p) => t + p.w, 0)
  const enBuyukH = Math.max(...parcalar.map((p) => p.h))
  let oncekiW = 0
  for (const p of parcalar) {
    p.ic = paylasiyor
      ? { spanW: toplamW, spanH: enBuyukH, offsetX: oncekiW, offsetY: enBuyukH - p.h }
      : null
    oncekiW += p.w
  }

  /*
   * ÜSTTEN BAKIŞ, DİLİM DİLİM — yuvarlak birleşim tek yay (bkz.
   * birlesimOlcu → birlesimDilimleri). Köşeli birleşim zinciri bölüyor.
   */
  const dilimler = birlesimDilimleri(
    parcalar.map((p) => ({ w: p.w, t: p.t, yuvarlak: !!p.e.yuvarlakSag })),
  ).map((x) => ({ ...x, p: parcalar[x.i], dilim: x.yay }))
  if (!dilimler.length) return null

  let zx = 0
  let zz = 0
  for (const s of dilimler) {
    const ax = zx
    const az = zz
    zx += Math.cos(s.t) * s.w
    zz += Math.sin(s.t) * s.w
    s.mx = (ax + zx) / 2
    s.mz = (az + zz) / 2
  }
  const toplamDilimW = dilimler.reduce((t, s) => t + s.w, 0) || 1
  const ortX = dilimler.reduce((t, s) => t + s.mx * s.w, 0) / toplamDilimW
  const ortZ = dilimler.reduce((t, s) => t + s.mz * s.w, 0) / toplamDilimW
  const boyPx = enBuyukH

  /*
   * BAKIŞ UZAKLIĞI TASARIMIN BOYUNDAN (bkz. Kup2D → bakisUzakligi).
   * Sabit bir uzaklık küçük tasarımda doğal, büyüğünde aşırı kaçıyor.
   */
  const uzak = Math.max(600, Math.hypot(toplamW, kutuKipi ? kutuBoyPx : boyPx) * 4)

  const yaz = (yeni) => onDegis?.({ ...d, ...yeni })

  const bas = (e) => {
    if (kilitli) return
    const uzerinde = !!tasarimRef.current && tasarimRef.current.contains(e.target)
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    surukle.current = { kip: uzerinde ? 'tasi' : 'dondur', x: e.clientX, y: e.clientY, bas: d }
  }
  const hareket = (e) => {
    const s = surukle.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (s.kip === 'tasi') {
      yaz({
        ux: Math.min(1.2, Math.max(-0.2, s.bas.ux + dx / tuvalW)),
        uy: Math.min(1.2, Math.max(-0.2, s.bas.uy + dy / tuvalH)),
      })
      return
    }
    yaz({
      yaw: s.bas.yaw + dx * 0.4,
      egim: Math.min(EGIM_EN_COK, Math.max(EGIM_EN_AZ, s.bas.egim + dy * 0.3)),
    })
  }
  const birak = (e) => {
    surukle.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 13,
        touchAction: 'none',
        pointerEvents: kilitli ? 'none' : 'auto',
        cursor: kilitli ? 'default' : 'move',
      }}
      onPointerDown={bas}
      onPointerMove={hareket}
      onPointerUp={birak}
      onPointerCancel={birak}
    >
      <div
        style={{
          position: 'absolute',
          left: d.ux * tuvalW,
          top: d.uy * tuvalH,
          width: 0,
          height: 0,
          /* Küpte perspektifi Kup2D kendi uzaklığıyla kuruyor. */
          perspective: kutuKipi ? undefined : uzak,
        }}
      >
        {kutuKipi ? (
          /*
           * Kutu, tutamağın üstünde ORTALI duruyor: taşıma noktası
           * kutunun merkezi, tıpkı zincirde olduğu gibi.
           */
          <div
            ref={tasarimRef}
            style={{ position: 'absolute', left: 0, top: 0, transform: 'translate(-50%, -50%)' }}
          >
            <Kup2D
              ekranlar={ekranlar}
              pxPerM={pxPerM}
              model={model}
              resolution={resolution}
              sade={sade}
              /* Başlangıçta çaprazdan: iki yan yüz eşit görünüyor. */
              disAci={-45 + d.yaw}
              disEgim={d.egim}
            />
          </div>
        ) : (
        <div
          ref={tasarimRef}
          style={{
            position: 'absolute',
            left: 0,
            /* Tasarımın dikey ortası tutamağın hizasında. */
            top: -boyPx / 2,
            width: 0,
            height: boyPx,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${-d.egim}deg) rotateY(${d.yaw}deg)`,
          }}
        >
          {dilimler.map((s, i) => {
            const p = s.p
            /* Yay dilimi komşusunun altına kıl payı giriyor (bkz. BINDIRME). */
            const pay = s.dilim ? BINDIRME : 0
            const kutuW = s.w + pay * 2
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
                  overflow: s.dilim ? 'hidden' : undefined,
                  transform: `translate3d(${s.mx - ortX}px, 0, ${-(s.mz - ortZ)}px) rotateY(${
                    (s.t * 180) / Math.PI
                  }deg)`,
                }}
              >
                {/* Ekran TAM eninde çiziliyor; dilim kendi penceresini gösteriyor. */}
                <div
                  style={{
                    position: 'absolute',
                    left: -(s.u0 - pay),
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
                    content={p.e.content || 'led'}
                    contentUrl={p.e.contentUrl || null}
                    sade={sade}
                    curveAmount={curveAmount}
                    leftCols={p.e.leftCols}
                    rightCols={p.e.rightCols}
                    lYon={p.e.lYon}
                    {...(p.ic || null)}
                  />
                </div>
              </div>
            )
          })}
        </div>
        )}
      </div>
    </div>
  )
}
