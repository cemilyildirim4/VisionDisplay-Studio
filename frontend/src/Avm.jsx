/**
 * AVM KORİDORU — fotoğraflı mekân, gerçek ölçekli ekran.
 *
 * Buradaki tek soru şu: "bu ekran bir AVM koridorunda ne kadar yer kaplar?"
 * Cevabın işe yaraması için iki şeyin aynı anda doğru olması gerekiyor —
 * fotoğrafın bozulmaması ve ekranın fotoğrafla AYNI ölçekte çizilmesi.
 *
 * ÖLÇEK NEREDEN GELİYOR?
 *
 * Ekranın kaç piksel çizileceği pencereden değil, FOTOĞRAFTAN türetiliyor.
 * Sebebi şu: arka plan `object-fit: cover` ile gösteriliyor, yani pencerenin
 * oranına göre kırpılıyor ve ölçekleniyor. Ekranın büyüklüğünü pencereye
 * bağlasaydık, pencere genişledikçe ekran koridora göre büyüyüp küçülürdü —
 * ölçü duygusu diye bir şey kalmazdı. Fotoğrafa bağlandığında ise ekran,
 * pencere ne olursa olsun koridorun hep aynı kesrini kaplıyor.
 *
 * Kalibrasyon aşağıdaki iki sabitte: taban çizgisinin fotoğraftaki yeri ve o
 * derinlikte koridorun kaç metre olduğu. İkisi de bu fotoğrafa özel ve gözle
 * kestirilmiş değerler — bir ölçüm değil, makul bir referans. Sahne
 * değişirse değişecek yer burası.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useGovdeKilidi } from './hooks/useGovdeKilidi.js'
import { useLang } from './useLang.js'
import EkranIcerigi from './EkranIcerigi.jsx'
import { fotoYerlesimi, sigdirmaKatsayisi } from './sahneOlcek.js'
import { useSurukleme, kaymayiSinirla } from './hooks/useSurukleme.js'

const ARKA_PLAN = '/led-ekran-avm-arka-plan.png'

/*
 * KALİBRASYON.
 *
 * Taban çizgisi fotoğrafın ALTINA değil, ortasına yakın seçildi. Sebebi
 * kırpma: geniş bir pencerede dikey fotoğrafın altı ve üstü kesiliyor;
 * 0,78 gibi bir oran 16:9 bir ekranda kadraj dışında kalıyor ve kiosk
 * görünmez oluyordu. 0,62 yaygın pencere oranlarının hepsinde kadrajda.
 *
 * Metre karşılığı da o derinliğe ait: bu çizgide iki vitrin arasındaki
 * koridor yaklaşık 7 m ve fotoğraf genişliğinin ~%55i kadarını kaplıyor,
 * yani fotoğrafın tam genişliği ~12,75 m ediyor. Gözle kestirilmiş bir
 * referans; sahne değişirse burası değişir.
 */
const ZEMIN_ORANI = 0.62
const KORIDOR_METRE = 12.75
/* Taban her koşulda kadrajda kalsın — uç pencere oranları için emniyet. */
const TABAN_EN_AZ = 0.5
const TABAN_EN_COK = 0.92

/** Kasa kalınlığı (px) — ölçüyle DEĞİŞMEZ; gerçek kasa da değişmiyor. */
const KASA_PX = 9
/** Alt gövde yüksekliği (px) — yalnızca genişliği ekrana uyar. */
const GOVDE_PX = 14

/** Ekran sahneye sığmazsa kullanılacak pay: kenarlarda kalan boşluk. */
const YATAY_PAY = 0.92
const DIKEY_PAY = 0.94

/* ------------------------------------------------------------------ arka plan */

/**
 * Sahnenin sabit arka planı.
 *
 * Tek işi fotoğrafı bozmadan göstermek. Ekran ölçüsü değiştiğinde bu katman
 * hiç haber almıyor — bilerek: arka planın yeniden ölçeklenmesi, dönmesi ya
 * da kayması "ekran büyüdü" izlenimini yok ederdi.
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

/* ------------------------------------------------------------------- kiosk */

/**
 * LED ekran — arka plandan bağımsız, mutlak konumlu ayrı katman.
 *
 * Parçalara ayrılmış olmasının sebebi: kasa kalınlığı sabit kalsın, yalnızca
 * ekran alanı büyüsün. Bütün kioska `transform: scale()` uygulasaydık kasa da
 * ekran de aynı oranda şişerdi; 3 m'lik bir ekranda kasa 10 cm kalınlığında
 * görünürdü. Kasa sabit px, ekran alanı gerçek ölçü.
 */
function LedKiosk({ wPx, hPx, tabanY, kayma, tutamak, content, contentUrl }) {
  const gecis = 'width 220ms ease, height 220ms ease, left 220ms ease'

  return (
    <>
      {/* Zemin gölgesi — genişlikle orantılı, yumuşak ama abartısız */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: tabanY + kayma.y,
          width: wPx * 1.15,
          height: Math.max(8, wPx * 0.07),
          transform: `translate(calc(-50% + ${kayma.x}px), -55%)`,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0) 72%)',
          transition: gecis,
        }}
      />

      {/*
        Sürüklenebilir gövde. Tutamak ekranın kendisi: taşımak için önce bir
        düğmeye basmak gerekmiyor, doğrudan ekrana dokunup çekiliyor.
      */}
      <div
        className="absolute"
        {...tutamak}
        style={{
          left: '50%',
          top: tabanY - hPx - GOVDE_PX + kayma.y,
          width: wPx,
          transform: `translateX(calc(-50% + ${kayma.x}px))`,
          transition: gecis,
          ...tutamak.style,
        }}
      >
        {/* Kasa + ekran alanı */}
        <div
          style={{
            width: '100%',
            height: hPx,
            padding: KASA_PX,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #2b2f36 0%, #15181d 100%)',
            borderRadius: 4,
            boxShadow: '0 10px 26px rgba(0,0,0,0.35)',
            transition: gecis,
          }}
        >
          <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#000' }}>
            <EkranIcerigi content={content} contentUrl={contentUrl} />
          </div>
        </div>

        {/* Alt gövde / ayak — yüksekliği sabit, yalnızca genişliği uyar */}
        <div
          style={{
            width: '86%',
            height: GOVDE_PX,
            margin: '0 auto',
            background: 'linear-gradient(180deg, #21252b 0%, #0f1216 100%)',
            borderRadius: '0 0 3px 3px',
            transition: gecis,
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
 * Metre değerleri doğrudan yazılmıyor, KABİN SAYISI değiştiriliyor — çünkü
 * uygulamada ekranın gerçek ölçüsü kabin ızgarasından çıkıyor ve tek kaynak
 * orası. Buraya ayrı bir metre durumu koysaydık, iki yerde iki farklı ölçü
 * olurdu. Kullanıcı yine metre görüyor; değiştirdiği şey ekranın gerçekten
 * değişebildiği adımlarla değişiyor.
 */
function DimensionControls({ cols, rows, colsMax, rowsMax, cwM, chM, onCols, onRows, wm, hm }) {
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
    <div className="rounded-2xl bg-black/65 backdrop-blur px-3 py-2 w-[236px]">
      <Satir
        etiket={t('avm.width')}
        deger={cols}
        enCok={colsMax}
        kabinM={cwM}
        degistir={onCols}
        toplamM={wm}
      />
      <Satir
        etiket={t('avm.height')}
        deger={rows}
        enCok={rowsMax}
        kabinM={chM}
        degistir={onRows}
        toplamM={hm}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ sahne */

export default function Avm({
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

  /*
   * Sürükleme. Ölçek hesabı bittikten sonra bağlanıyor, çünkü kaymanın
   * metre karşılığı piksel/metre oranına bağlı.
   */

  useGovdeKilidi(open)

  /* Sahne ölçüsünü izle — pencere yeniden boyutlandığında ölçek tazelensin */
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

  /*
   * FOTOĞRAFIN cover YERLEŞİMİ.
   *
   * `cover`, fotoğrafı iki eksende de kaplayacak en küçük ölçekle çizer ve
   * taşan tarafı ortadan kırpar. Zemin çizgisinin ekranda nereye düştüğünü
   * bilmek için aynı hesabı burada da yapıyoruz — yoksa pencere oranı
   * değiştiğinde kiosk havada ya da yerin altında kalırdı.
   */
  const yerlesim = useMemo(
    () =>
      fotoYerlesimi(sahne, foto, {
        zeminOrani: ZEMIN_ORANI,
        kadrajMetre: KORIDOR_METRE,
        tabanEnAz: TABAN_EN_AZ,
        tabanEnCok: TABAN_EN_COK,
      }),
    [sahne, foto],
  )

  /*
   * Ekranın piksel ölçüsü.
   *
   * Gerçek metre × ölçek. Sahneye sığmazsa TEK bir katsayı ile ikisi birden
   * küçültülüyor — en/boy oranı hiçbir koşulda değişmiyor.
   */
  const olcu = useMemo(() => {
    if (!yerlesim) return { w: 0, h: 0, kisilma: 1 }
    const w = wm * yerlesim.pxPerM
    const h = hm * yerlesim.pxPerM
    // Gövde ve kasa da yer kaplar; sığma hesabına onlar da giriyor.
    const kisilma = sigdirmaKatsayisi(
      w,
      h,
      sahne.w * YATAY_PAY,
      yerlesim.tabanY * DIKEY_PAY,
      KASA_PX * 2,
      KASA_PX * 2 + GOVDE_PX,
    )
    return { w: w * kisilma, h: h * kisilma, kisilma }
  }, [yerlesim, wm, hm, sahne.w])

  const pxPerM = (yerlesim?.pxPerM || 0) * olcu.kisilma
  const { ofsetM, tasindi, sifirla, tutamak } = useSurukleme(pxPerM)
  const kayma = kaymayiSinirla(ofsetM, pxPerM, sahne, olcu.w, yerlesim?.tabanY || 0)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] bg-black select-none">
      <div ref={sahneRef} className="absolute inset-0 overflow-hidden">
        <SceneBackground onOlcu={setFoto} />

        {olcu.w > 0 && (
          <LedKiosk
            wPx={olcu.w}
            hPx={olcu.h}
            tabanY={yerlesim.tabanY}
            kayma={kayma}
            tutamak={tutamak}
            content={content}
            contentUrl={contentUrl}
          />
        )}

        {/* Üst şerit: ne görüldüğü tek satırda */}
        <div className="absolute top-3 inset-x-0 px-4 flex justify-center pointer-events-none">
          <div className="rounded-full bg-black/65 backdrop-blur px-3.5 py-1.5">
            <p className="m-0 text-[12px] text-white/85 tabular-nums">
              {t('avm.title')} · {wm.toFixed(2)} × {hm.toFixed(2)} m
              {olcu.kisilma < 0.999 ? <span className="text-amber-300"> · {t('avm.shrunk')}</span> : null}
              {!tasindi ? <span className="text-white/45"> · {t('scene.dragHint')}</span> : null}
            </p>
          </div>
        </div>

        {/* Denetimler sağ altta — koridorun ortasını kapatmasın */}
        <div className="absolute right-3 bottom-3 flex flex-col items-end gap-2">
          {/*
            Ortala yalnızca ekran taşınmışken görünüyor: hiç dokunulmamışken
            "ortala" demek, kullanıcıya yapmadığı bir şeyi geri alma seçeneği
            sunmak olurdu.
          */}
          {tasindi && (
            <button
              type="button"
              onClick={sifirla}
              className="rounded-full bg-black/70 backdrop-blur px-3.5 py-1.5 text-[11.5px] font-semibold text-white"
            >
              {t('scene.recenter')}
            </button>
          )}
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
          className="absolute left-3 top-3 rounded-full bg-black/65 backdrop-blur px-4 py-1.5 text-[12px] font-semibold text-white"
        >
          {t('avm.close')}
        </button>
      </div>
    </div>
  )
}
