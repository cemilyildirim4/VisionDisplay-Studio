/**
 * ŞEHİR MEYDANI — gece dış mekân sahnesi, gerçek ölçekli LED billboard.
 *
 * Fotoğrafın ortasındaki boş kaldırım alanı billboardun yeri. Ekran oraya,
 * fotoğrafın KENDİ ölçeğinde çiziliyor: 6 m'lik bir billboard meydanın yarısını
 * kaplarken 1 m'lik bir totem yayaların yanında küçücük kalıyor. Ölçek hesabı
 * sahneOlcek.js'te, AVM koridoruyla ortak.
 *
 * Billboard tek parça bir görsel değil; çerçeve, ekran alanı, direk ve kaide
 * ayrı ayrı çiziliyor. Sebebi şu: bütünü `transform: scale()` ile büyütseydik
 * 6 m'lik ekranda çerçeve yarım metre kalınlığında, kaide de bir otomobil
 * boyunda görünürdü. Çerçeve kalınlığı sınırlı, kaide gerçek metre, ekran
 * alanı ise doğrudan kullanıcının ölçüsü.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useGovdeKilidi } from './hooks/useGovdeKilidi.js'
import { useLang } from './useLang.js'
import EkranIcerigi from './EkranIcerigi.jsx'
import { fotoYerlesimi, sigdirmaKatsayisi } from './sahneOlcek.js'

const ARKA_PLAN = '/bos-merkezli-dis-mekan-led-arka-plan.png'

/*
 * KALİBRASYON.
 *
 * Zemin çizgisi: kaldırım taşlarının ortası (0,735). Bir tık aşağısı yola
 * taşar, yukarısı çalıların içine girer.
 *
 * Metre karşılığı: ilk denemede kadraj genişliği 34 m alınmıştı ve billboard
 * gereğinden küçük duruyordu. Sağlaması yolun kendisi: alttaki asfalt
 * fotoğrafın tamamını kaplıyor ve altı şeritlik bir yol ~20 m eder. Yol,
 * kaldırımdan DAHA YAKIN olduğu için kaldırım hizasında kadraj biraz daha
 * geniş bir metreye denk gelir — 34 değil, 22 m civarı. Yeni değer hem
 * fotoğrafın kendi geometrisiyle tutarlı hem de billboardu meydandaki
 * gerçek ağırlığında gösteriyor.
 *
 * Billboard büyük/küçük gelirse değiştirilecek tek sayı budur.
 */
const ZEMIN_ORANI = 0.735
const KADRAJ_METRE = 22

/** Kaide (beton taban) — gerçek ölçü, metre. */
const KAIDE_YUKSEK_M = 0.16
/** Direğin gerçek ölçüleri — ekran yükseldikçe direk de yükselir. */
const DIREK_EN_AZ_M = 0.6
const DIREK_ORAN = 0.35
const DIREK_EN_COK_M = 2.5
/** Direk kalınlığı: ekran genişliğinin oranı, ama makul sınırlar içinde. */
const DIREK_KALINLIK_M = { oran: 0.09, enAz: 0.1, enCok: 0.45 }

/** Çerçeve kalınlığı (px): ölçüyle bir miktar artar, ama şişmez. */
const CERCEVE_EN_AZ = 5
const CERCEVE_EN_COK = 16
const CERCEVE_ORAN = 0.013

/** İki yan destek bu genişliğin üstünde ekleniyor. */
const YAN_DESTEK_ESIGI_M = 2.5

/** Sahnede kenarlarda bırakılan pay. */
const YATAY_PAY = 0.86
const DIKEY_PAY = 0.9

const GECIS = 'width 220ms ease, height 220ms ease, bottom 220ms ease'

/* ------------------------------------------------------------------ arka plan */

/**
 * Sahnenin en alt katmanı.
 *
 * Ekran ölçüsünden haberi yok ve olmamalı: arka planın ekranla birlikte
 * ölçeklenmesi ya da kayması, "ekran büyüdü" bilgisini yok ederdi.
 */
function SceneBackground({ onOlcu }) {
  return (
    <img
      src={ARKA_PLAN}
      alt=""
      draggable={false}
      onLoad={(e) => onOlcu({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      className="absolute inset-0 w-full h-full select-none pointer-events-none"
      style={{ objectFit: 'cover', objectPosition: 'center center' }}
    />
  )
}

/* -------------------------------------------------------------- billboard */

/**
 * Dış mekân billboardu — arka plandan bağımsız, mutlak konumlu katman.
 *
 * Kaide zemine çakılı: sarmalayıcı tabanından yukarı doğru diziliyor, o yüzden
 * ekran büyüdüğünde YALNIZCA yukarı doğru uzuyor. Tabanın kendisi hiç
 * kımıldamıyor — ölçü değişimini gözle takip edebilmenin şartı bu.
 */
function OutdoorBillboard({
  wPx,
  hPx,
  tabanY,
  pxPerM,
  wm,
  content,
  contentUrl,
  isikVar,
}) {
  const cerceve = Math.round(
    Math.max(CERCEVE_EN_AZ, Math.min(CERCEVE_EN_COK, wPx * CERCEVE_ORAN)),
  )
  const kaideH = Math.max(4, KAIDE_YUKSEK_M * pxPerM)
  const direkKalinlik = Math.max(
    4,
    Math.min(DIREK_KALINLIK_M.enCok, Math.max(DIREK_KALINLIK_M.enAz, wm * DIREK_KALINLIK_M.oran)) *
      pxPerM,
  )
  const yanDestek = wm > YAN_DESTEK_ESIGI_M
  // Direk yüksekliği: ekranla birlikte artar, ama sınırlı.
  const direkH = Math.max(
    6,
    Math.min(DIREK_EN_COK_M, Math.max(DIREK_EN_AZ_M, (hPx / pxPerM) * DIREK_ORAN)) * pxPerM,
  )

  const metal = 'linear-gradient(180deg, #3a3f47 0%, #23272d 42%, #14171b 100%)'

  return (
    <>
      {/* Zemin gölgesi — genişlikle orantılı, yumuşak ve alçak */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: tabanY,
          width: Math.max(wPx, direkKalinlik * 3) * 1.25,
          height: Math.max(6, wPx * 0.05),
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.24) 45%, rgba(0,0,0,0) 74%)',
          transition: GECIS,
        }}
      />

      {/*
        Ekranın zemine vuran ışığı. Gece sahnesinde tamamen sönük bir ekran
        yapıştırılmış gibi durur; bu katman onu mekâna bağlıyor. Bilinçli
        olarak zayıf — ışık huzmesi çizmek gerçekçiliği artırmıyor, azaltıyor.
      */}
      {isikVar && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: '50%',
            top: tabanY,
            width: wPx * 1.5,
            height: Math.max(10, wPx * 0.12),
            transform: 'translate(-50%, -40%)',
            background:
              'radial-gradient(ellipse at center, rgba(150,190,255,0.15) 0%, rgba(150,190,255,0.05) 50%, rgba(0,0,0,0) 75%)',
            transition: GECIS,
          }}
        />
      )}

      <div
        className="absolute flex flex-col items-center"
        style={{
          left: '50%',
          top: tabanY,
          transform: 'translate(-50%, -100%)',
          transition: GECIS,
        }}
      >
        {/* --- çerçeve + ekran alanı ------------------------------------- */}
        <div
          style={{
            width: wPx + cerceve * 2,
            height: hPx + cerceve * 2,
            padding: cerceve,
            boxSizing: 'border-box',
            background: metal,
            borderRadius: Math.max(2, cerceve * 0.35),
            // İnce kenar vurgusu: üstte ışık, altta gölge — metal hissi.
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.5), 0 12px 30px rgba(0,0,0,0.55)' +
              (isikVar ? ', 0 0 26px rgba(130,170,255,0.16)' : ''),
            transition: GECIS,
          }}
        >
          <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#000' }}>
            <EkranIcerigi content={content} contentUrl={contentUrl} />
          </div>
        </div>

        {/* --- taşıyıcı direk(ler) --------------------------------------- */}
        <div className="relative" style={{ width: wPx + cerceve * 2, height: direkH, transition: GECIS }}>
          {/* Merkez direk — genişlik ne olursa olsun tam ortada */}
          <div
            className="absolute"
            style={{
              left: '50%',
              top: 0,
              width: direkKalinlik,
              height: '100%',
              transform: 'translateX(-50%)',
              background: metal,
              transition: GECIS,
            }}
          />
          {/*
            Yan destekler yalnızca geniş ekranlarda. Tek direk 6 m'lik bir
            panoyu taşıyormuş gibi durmuyor; gerçekte de ikinci ayak konur.
          */}
          {yanDestek &&
            [-0.3, 0.3].map((k) => (
              <div
                key={k}
                className="absolute"
                style={{
                  left: `${50 + k * 100}%`,
                  top: 0,
                  width: direkKalinlik * 0.62,
                  height: '100%',
                  transform: 'translateX(-50%)',
                  background: metal,
                  opacity: 0.92,
                  transition: GECIS,
                }}
              />
            ))}
        </div>

        {/* --- kaide (zemine oturan beton taban) -------------------------- */}
        <div
          style={{
            width: Math.max(direkKalinlik * 2.6, (yanDestek ? 0.78 : 0.42) * wPx),
            height: kaideH,
            background: 'linear-gradient(180deg, #2a2e34 0%, #171a1e 60%, #0d0f12 100%)',
            borderRadius: Math.max(1, kaideH * 0.15),
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
            transition: GECIS,
          }}
        />
      </div>
    </>
  )
}

/* -------------------------------------------------------------- denetimler */

/**
 * Ölçü denetimleri.
 *
 * Metre kutusu yerine KABİN SAYISI değiştiriliyor: ekranın gerçek ölçüsü
 * uygulamada kabin ızgarasından çıkıyor ve tek kaynak orası. Ayrı bir metre
 * durumu, aynı ekranın iki farklı ölçüye sahip olması demek olurdu. Kullanıcı
 * metreyi yine görüyor.
 */
function DimensionControls({
  cols,
  rows,
  colsMax,
  rowsMax,
  cwM,
  chM,
  onCols,
  onRows,
  wm,
  hm,
}) {
  const { t } = useLang()

  const Satir = ({ etiket, deger, enCok, kabinM, degistir, toplamM }) => (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[12px] text-white/70">{etiket}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`${etiket}-azalt`}
          onClick={() => degistir(Math.max(1, deger - 1))}
          className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[15px] leading-none"
        >
          −
        </button>
        <span className="text-white text-[12.5px] font-semibold tabular-nums w-[74px] text-center">
          {toplamM.toFixed(2)} m
          <span className="block text-[10px] font-normal text-white/50">
            {deger} × {(kabinM * 100).toFixed(0)} cm
          </span>
        </span>
        <button
          type="button"
          aria-label={`${etiket}-arttir`}
          onClick={() => degistir(Math.min(enCok, deger + 1))}
          className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[15px] leading-none"
        >
          +
        </button>
      </div>
    </div>
  )

  return (
    <div className="rounded-2xl bg-black/70 backdrop-blur px-3 py-2 w-[236px]">
      <Satir etiket={t('avm.width')} deger={cols} enCok={colsMax} kabinM={cwM} degistir={onCols} toplamM={wm} />
      <Satir etiket={t('avm.height')} deger={rows} enCok={rowsMax} kabinM={chM} degistir={onRows} toplamM={hm} />
    </div>
  )
}

/* ------------------------------------------------------------------ sahne */

export default function OutdoorScene({
  open,
  onClose,
  cols,
  rows,
  colsMax,
  rowsMax,
  cwM,
  chM,
  onCols,
  onRows,
  content,
  contentUrl,
}) {
  const { t } = useLang()
  const sahneRef = useRef(null)
  const [sahne, setSahne] = useState({ w: 0, h: 0 })
  const [foto, setFoto] = useState({ w: 0, h: 0 })

  useGovdeKilidi(open)

  /* Sahne ölçüsü — pencere değişince ölçek tazelensin */
  useEffect(() => {
    if (!open) return
    const el = sahneRef.current
    if (!el) return
    const oku = () => {
      const r = el.getBoundingClientRect()
      setSahne({ w: r.width, h: r.height })
    }
    oku()
    const go = new ResizeObserver(oku)
    go.observe(el)
    return () => go.disconnect()
  }, [open])

  const wm = Math.max(1, cols) * cwM
  const hm = Math.max(1, rows) * chM

  const yerlesim = useMemo(
    () => fotoYerlesimi(sahne, foto, { zeminOrani: ZEMIN_ORANI, kadrajMetre: KADRAJ_METRE }),
    [sahne, foto],
  )

  /*
   * Ekranın piksel ölçüsü.
   *
   * Sığma hesabına ekranın DIŞINDA kalanlar da giriyor: çerçeve, direk ve
   * kaide. Yalnızca ekran alanına bakılsaydı 6 m'lik bir billboardun tepesi
   * kadrajdan taşardı. Küçültme tek katsayı — oran hiçbir koşulda bozulmaz.
   */
  const olcu = useMemo(() => {
    if (!yerlesim) return { w: 0, h: 0, kisilma: 1 }
    const wPx = wm * yerlesim.pxPerM
    const hPx = hm * yerlesim.pxPerM
    // Ekranın dışında kalan yükseklik: direk + kaide + çerçeve (yaklaşık).
    const direkM = Math.min(DIREK_EN_COK_M, Math.max(DIREK_EN_AZ_M, hm * DIREK_ORAN))
    const payH = (direkM + KAIDE_YUKSEK_M) * yerlesim.pxPerM + CERCEVE_EN_COK * 2
    const kisilma = sigdirmaKatsayisi(
      wPx,
      hPx,
      sahne.w * YATAY_PAY,
      yerlesim.tabanY * DIKEY_PAY,
      CERCEVE_EN_COK * 2,
      payH,
    )
    return { w: wPx * kisilma, h: hPx * kisilma, kisilma }
  }, [yerlesim, wm, hm, sahne.w])

  if (!open) return null

  const isikVar = content !== 'none' && content !== 'led'

  return (
    <div className="fixed inset-0 z-[60] bg-black select-none">
      <div ref={sahneRef} className="absolute inset-0 overflow-hidden">
        <SceneBackground onOlcu={setFoto} />

        {olcu.w > 0 && (
          <OutdoorBillboard
            wPx={olcu.w}
            hPx={olcu.h}
            tabanY={yerlesim.tabanY}
            pxPerM={yerlesim.pxPerM * olcu.kisilma}
            wm={wm}
            content={content}
            contentUrl={contentUrl}
            isikVar={isikVar}
          />
        )}

        <div className="absolute top-3 inset-x-0 px-4 flex justify-center pointer-events-none">
          <div className="rounded-full bg-black/70 backdrop-blur px-3.5 py-1.5">
            <p className="m-0 text-[12px] text-white/85 tabular-nums">
              {t('dis.title')} · {wm.toFixed(2)} × {hm.toFixed(2)} m
              {olcu.kisilma < 0.999 ? <span className="text-amber-300"> · {t('avm.shrunk')}</span> : null}
            </p>
          </div>
        </div>

        <div className="absolute right-3 bottom-3">
          <DimensionControls
            cols={cols}
            rows={rows}
            colsMax={colsMax}
            rowsMax={rowsMax}
            cwM={cwM}
            chM={chM}
            onCols={onCols}
            onRows={onRows}
            wm={wm}
            hm={hm}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute left-3 top-3 rounded-full bg-black/70 backdrop-blur px-4 py-1.5 text-[12px] font-semibold text-white"
        >
          {t('avm.close')}
        </button>
      </div>
    </div>
  )
}
