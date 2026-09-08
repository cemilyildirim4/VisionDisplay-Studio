/**
 * "Teknik Özellikler" pop-up'ı.
 *
 * Değerler seçilen modelin verisinden HESAPLANIR (specsData.js). Model yoksa
 * "-" gösterilir. Bu dosya yalnızca SUNUM katmanıdır: hiçbir sayıyı kendisi
 * üretmez, biçimlendirmeyi `fmt` yapar.
 *
 * TASARIM NOTU — neden kart ızgarası değil:
 * Eskiden her başlık ayrı bir kutuydu; onlarca küçük kutu yan yana dizilince
 * ekran "yönetim paneli" gibi görünüyor, göz nereye bakacağını bilemiyordu.
 * Artık içerik bir TEKNİK DOKÜMAN gibi kurgulanıyor: numaralı bölümler,
 * solda bölüm çubuğu, sağda etiket–değer listeleri. Çerçeve neredeyse yok;
 * hiyerarşiyi punto, kalınlık ve boşluk taşıyor.
 *
 * NOT: Bileşenler bölümündeki aksesuar parça kodları (S-Kutu, Jig, Güç Kablosu vb.)
 * yer tutucudur; kendi katalog kodlarınızla değiştirilecek.
 */

import { useEffect, useRef, useState } from 'react'
import { useGovdeKilidi } from './hooks/useGovdeKilidi.js'
import { useLang } from './useLang.js'
import { DASH, fmt, computeSpecs } from './specsData.js'

/* ---------------------------------------------------------------- simgeler */
/*
 * Simgeler yalnızca BÖLÜM başlıklarında. Her satıra simge koymak veriyi
 * gizliyor; burada amaç bölümü bir bakışta ayırt ettirmek. Dışarıdan bir
 * simge kütüphanesi eklemeden, tek çizgi kalınlığında SVG'ler kullanılıyor.
 */
function Simge({ children }) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}
const SIMGE = {
  ekran: (
    <Simge>
      <rect x="2.5" y="4" width="19" height="13" rx="1.6" />
      <path d="M8 20.5h8M12 17v3.5" />
    </Simge>
  ),
  guc: (
    <Simge>
      <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" />
    </Simge>
  ),
  donanim: (
    <Simge>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
    </Simge>
  ),
  secim: (
    <Simge>
      <path d="M15.5 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H6.4A3.4 3.4 0 0 0 3 18.4V20" />
      <circle cx="9.2" cy="7.4" r="3.4" />
      <path d="m16 11.5 2 2 4-4" />
    </Simge>
  ),
  paket: (
    <Simge>
      <path d="M20.5 7.5 12 3 3.5 7.5v9L12 21l8.5-4.5z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </Simge>
  ),
}

/* ------------------------------------------------------------- yapı taşları */

/**
 * Tek veri: ETİKET ÜSTTE küçük, DEĞER ALTTA büyük ve koyu.
 *
 * Etiket ile değer aynı satırda karşılıklı durduğunda uzun model adları
 * dar sütunda kırpılıyordu; alt alta dizilince hem sığıyor hem de göz
 * doğrudan değeri buluyor.
 */
function Veri({ label, value, buyuk = false }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-500">
        {label}
      </div>
      <div
        className={`mt-1 whitespace-pre-line break-words text-neutral-900 dark:text-neutral-50 ${
          buyuk ? 'text-[24px] leading-tight font-bold tracking-tight' : 'text-[15px] leading-snug font-semibold'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

/** Veri satırlarının aktığı esnek ızgara: geniş 3, orta 2, dar 1 sütun. */
function Izgara({ children, kolon = 3 }) {
  const sinif = kolon === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'
  return <div className={`grid grid-cols-1 ${sinif} gap-x-8 gap-y-5`}>{children}</div>
}

/**
 * Numaralı bölüm başlığı + gövde.
 *
 * "01 EKRAN YAPILANDIRMASI" biçimi, dokümantasyon hissini veren asıl öğe:
 * numara sırayı, başlık konuyu, alt satır kapsamı anlatıyor.
 */
function Bolum({ no, id, baslik, aciklama, simge, children, kayitci }) {
  return (
    <section ref={(el) => kayitci(id, el)} className="pt-9 first:pt-0">
      <div className="flex items-start gap-3">
        <span className="mt-[3px] text-[12px] font-bold tabular-nums text-brand/70">{no}</span>
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 m-0 text-[15px] font-bold uppercase tracking-[0.08em] text-neutral-800 dark:text-neutral-100">
            <span className="text-brand">{simge}</span>
            {baslik}
          </h3>
          <p className="m-0 mt-0.5 text-[12.5px] leading-snug text-neutral-500 dark:text-neutral-400">{aciklama}</p>
        </div>
      </div>
      <div className="mt-5 sm:pl-8">{children}</div>
    </section>
  )
}

/** Bölüm içi ara başlık (ör. "Devreler"). */
function AraBaslik({ children }) {
  return (
    <h4 className="m-0 mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-neutral-400 dark:text-neutral-500">
      {children}
    </h4>
  )
}

/**
 * Kit satırı ("Miktarı görüntüle").
 *
 * Eskiden kartın ortasında iri bir yazıydı, tıklanabilir görünmüyordu.
 * Artık sade bir ikincil satır; davranışı değişmedi.
 */
function EkBilesen({ ad, eylem }) {
  return (
    <button
      type="button"
      className="group flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-neutral-100/80 dark:hover:bg-[#1b2029]"
    >
      <span className="text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">{ad}</span>
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 group-hover:text-brand dark:text-neutral-400">
        {eylem}
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h13M13 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------ içerik */

/** Pop-up gövdesi: bölümler ve solda bölüm çubuğu. */
function SpecsBody({ model, cols = 1, rows = 1, sboxRedundancy = 'no', screenType = 'flat', isVideoWall = false, hasMiniPc = false, preview = null, matchError = null }) {
  const { t } = useLang()
  const has = !!model
  const total = cols * rows
  const s = computeSpecs(model, cols, rows)
  if (s && preview) {
    if (Number(preview.totalMaxPowerWatts) > 0) s.pMax = Number(preview.totalMaxPowerWatts)
    if (Number(preview.totalAvgPowerWatts) > 0) s.pTyp = Number(preview.totalAvgPowerWatts)
    if (Number(preview.heatDissipationBtu) > 0) s.btuMax = Number(preview.heatDissipationBtu)
  }
  const breakdown = Array.isArray(preview?.hardwareBreakdown) ? preview.hardwareBreakdown : []
  const modulesPerCard = Number(model?.defaultModulesPerCard) > 0 ? Number(model.defaultModulesPerCard) : 10
  const receivingCards = preview?.receivingCardCount
    ? Number(preview.receivingCardCount)
    : String(model?.productType || '').toUpperCase() === 'MODULE'
      ? Math.ceil(total / modulesPerCard)
      : total

  const lineQty = (key, fallbackQty) => {
    const item = breakdown.find((x) => x.key === key)
    if (!item) return `${fmt(fallbackQty)} ${t('sp.unit')}`
    const name = item.name ? ` · ${item.name}` : ''
    return `${fmt(item.quantity)} ${t('sp.unit')}${name}`
  }

  const circuitText = (c) =>
    has ? `${c.circuits} ${t('sp.circuit')}\n${t('sp.perCircuit')}: ${c.perCircuit} ${t('sp.cabinet')}` : DASH

  /*
   * BÖLÜM ÇUBUĞU.
   *
   * Uzun bir listede kullanıcı nerede olduğunu kaybediyordu. Bölümler
   * kaydırma kabına göre ölçülüp etkin olan işaretleniyor; çubuktan
   * tıklayınca da o bölüme kayılıyor.
   */
  const bolumler = useRef({})
  const kayitci = (id, el) => { bolumler.current[id] = el }
  const [etkin, setEtkin] = useState('ekran')
  const kaydiran = useRef(null)
  useEffect(() => {
    const kap = kaydiran.current
    if (!kap) return
    const izle = () => {
      let secili = null
      const ustSinir = kap.getBoundingClientRect().top + 80
      for (const [id, el] of Object.entries(bolumler.current)) {
        if (el && el.getBoundingClientRect().top <= ustSinir) secili = id
      }
      if (secili) setEtkin(secili)
    }
    izle()
    kap.addEventListener('scroll', izle, { passive: true })
    return () => kap.removeEventListener('scroll', izle)
  }, [isVideoWall, has])

  const git = (id) => {
    const el = bolumler.current[id]
    const kap = kaydiran.current
    if (el && kap) kap.scrollTo({ top: Math.max(0, el.offsetTop - 12), behavior: 'smooth' })
  }

  // ---- VİDEO DUVARI: sadeleştirilmiş özellikler, "Bileşenler" bölümü yok ----
  if (isVideoWall) {
    const depthM = has ? (model.depthMm || 0) / 1000 : 0
    return (
      <div ref={kaydiran} className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-8 py-6">
        <Bolum no="01" id="ekran" baslik={t('sp.screenConfig')} aciklama={t('sp.secScreenDesc')} simge={SIMGE.ekran} kayitci={kayitci}>
          <Izgara>
            <Veri buyuk label={t('sp.lengthHeight')} value={has ? `${cols} ${t('sp.unit')} x ${rows} ${t('sp.unit')}` : DASH} />
            <Veri label={t('sp.totalScreens')} value={has ? `${fmt(total)} ${t('sp.unit')}` : DASH} />
            <Veri
              label={t('sp.lengthHeightDepth')}
              value={has ? `${fmt(s.W, 3)} x ${fmt(s.H, 3)} x ${fmt(depthM, 2)} m` : DASH}
            />
            <Veri label={t('sp.diagonal')} value={has ? `${fmt(s.diagIn, 3)} ${t('sp.inch')}` : DASH} />
            <Veri label={t('sp.weight')} value={has ? `${fmt(s.weight, 1)} kg` : DASH} />
          </Izgara>
        </Bolum>

        <div className="mt-9 h-px bg-neutral-200/70 dark:bg-[#252b35]" />

        <Bolum no="02" id="guc" baslik={t('sp.power')} aciklama={t('sp.secPowerDesc')} simge={SIMGE.guc} kayitci={kayitci}>
          <Izgara>
            <Veri buyuk label={t('sp.max')} value={has ? `${fmt(s.pMax)} (W/h)` : DASH} />
            <Veri buyuk label={t('sp.typical')} value={has ? `${fmt(s.pTyp)} (W/h)` : DASH} />
          </Izgara>
        </Bolum>
      </div>
    )
  }

  const menu = [
    { id: 'ekran', ad: t('sp.screenConfigLxh') },
    ...(has ? [{ id: 'guc', ad: t('sp.power') }] : []),
    { id: 'donanim', ad: t('sp.ledCabinets') },
    ...(has ? [{ id: 'secim', ad: t('sp.customerSelection') }] : []),
    ...(has ? [{ id: 'paket', ad: t('sp.package') }] : []),
  ]
  const Ayirac = () => <div className="mt-9 h-px bg-neutral-200/70 dark:bg-[#252b35]" />

  return (
    <div className="flex min-h-0 flex-1">
      {/* Bölüm çubuğu — dar ekranda gizli, içerik zaten tek sütun akıyor */}
      <nav className="hidden lg:flex w-[216px] shrink-0 flex-col gap-0.5 border-r border-neutral-200/70 dark:border-[#252b35] px-3 py-6">
        {menu.map((m, i) => (
          <button
            key={m.id}
            type="button"
            onClick={() => git(m.id)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors duration-150 ${
              etkin === m.id
                ? 'bg-brand/[0.08] font-semibold text-brand'
                : 'text-neutral-500 hover:bg-neutral-100/70 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-[#1b2029] dark:hover:text-neutral-100'
            }`}
          >
            <span className="text-[11px] font-bold tabular-nums opacity-60">{String(i + 1).padStart(2, '0')}</span>
            <span className="truncate">{m.ad}</span>
          </button>
        ))}
      </nav>

      <div ref={kaydiran} className="min-w-0 min-h-0 flex-1 overflow-y-auto px-5 sm:px-8 py-6">
        {has && matchError && (
          <div className="mb-7 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-amber-700 dark:text-amber-400">
              {t('sp.hwMatchError')}
            </div>
            <p className="m-0 mt-1 text-[13px] leading-relaxed text-amber-700 dark:text-amber-300">{matchError}</p>
          </div>
        )}

        {/* 01 — EKRAN */}
        <Bolum no="01" id="ekran" baslik={t('sp.screenConfigLxh')} aciklama={t('sp.secScreenDesc')} simge={SIMGE.ekran} kayitci={kayitci}>
          <Izgara>
            <Veri buyuk label={t('sp.screenConfigLxh')} value={has ? `${cols} ${t('sp.unit')} x ${rows} ${t('sp.unit')}` : DASH} />
            <Veri label={t('sp.lengthHeight')} value={has ? `${fmt(s.W, 3)} x ${fmt(s.H, 3)} m` : DASH} />
            <Veri label={t('sp.area')} value={has ? `${fmt(s.area, 3)} m²` : DASH} />
            <Veri label={t('sp.diagonal')} value={has ? `${fmt(s.diagIn, 1)} ${t('sp.inch')}` : DASH} />
            <Veri label={has ? t('sp.weightCabinets') : t('sp.weight')} value={has ? `${fmt(s.weight, 1)} kg` : DASH} />
            {has && <Veri label={t('sp.viewingDistance')} value={`${fmt(s.viewDist, 1)} m`} />}
          </Izgara>
        </Bolum>

        {/* 02 — OPTİK / GÜÇ / ISI */}
        {has && (
          <>
            <Ayirac />
            <Bolum no="02" id="guc" baslik={t('sp.power')} aciklama={t('sp.secPowerDesc')} simge={SIMGE.guc} kayitci={kayitci}>
              <Izgara>
                <Veri buyuk label={t('sp.resolution')} value={`${fmt(s.resW)} x ${fmt(s.resH)}`} />
                <Veri buyuk label={t('sp.max')} value={`${fmt(s.pMax)} ${t('sp.watt')}`} />
                <Veri buyuk label={t('sp.typical')} value={`${fmt(s.pTyp)} ${t('sp.watt')}`} />
              </Izgara>

              <div className="mt-7">
                <AraBaslik>{t('sp.circuitsHeading')}</AraBaslik>
                <Izgara>
                  <Veri label={`110V 20A ${t('sp.circuits')}`} value={circuitText(s.circuits.c110_20)} />
                  <Veri label={`208V 20A ${t('sp.circuits')}`} value={circuitText(s.circuits.c208_20)} />
                  <Veri label={`230V 13A ${t('sp.circuits')}`} value={circuitText(s.circuits.c230_13)} />
                  <Veri label={`230V 16A ${t('sp.circuits')}`} value={circuitText(s.circuits.c230_16)} />
                </Izgara>
              </div>

              <div className="mt-7">
                <AraBaslik>{t('sp.heat')}</AraBaslik>
                <Izgara>
                  <Veri label={t('sp.max')} value={`${fmt(s.btuMax)} BTU`} />
                  <Veri label={t('sp.typical')} value={`${fmt(s.btuTyp)} BTU`} />
                </Izgara>
              </div>
            </Bolum>
          </>
        )}

        {/* 03 — DONANIM */}
        <Ayirac />
        <Bolum no={has ? '03' : '02'} id="donanim" baslik={t('sp.ledCabinets')} aciklama={t('sp.secHardwareDesc')} simge={SIMGE.donanim} kayitci={kayitci}>
          <Izgara>
            <Veri label={t('sp.cabinetCount')} value={has ? `${fmt(total)} ${t('sp.unit')}` : DASH} />
            {has && <Veri label={t('sp.spareCabinets')} value={`0 ${t('sp.unit')}`} />}
            {has && <Veri label={`${t('sp.totalCabinets')} (${model.modelCode})`} value={`${fmt(total)} ${t('sp.units')}`} />}
            {has && <Veri label={`${t('sp.sbox')} · ${t('sp.model')}`} value={model.sboxCode || DASH} />}
            {has && <Veri label={`${t('sp.sbox')} · ${t('sp.spare')}`} value={`${sboxRedundancy === 'yes' ? 1 : 0} ${t('sp.unit')}`} />}
            {has && <Veri label={`${t('sp.jig')} · ${t('sp.model')}`} value={model.jigCode || DASH} />}
            {has && <Veri label={`${t('sp.powerCord')} · 110V`} value={model.powerCord110Code || DASH} />}
            {has && <Veri label={`${t('sp.powerCord')} · 220V`} value={model.powerCord220Code || DASH} />}
          </Izgara>

          {has && breakdown.length > 0 && (
            <div className="mt-7">
              <AraBaslik>{t('sp.matchedHardware')}</AraBaslik>
              <Izgara>
                {breakdown.filter((x) => x.quantity > 0).map((x) => (
                  <Veri key={x.key} label={x.name} value={`${fmt(x.quantity)} ${t('sp.unit')}`} />
                ))}
              </Izgara>
            </div>
          )}
        </Bolum>

        {/* 04 — MÜŞTERİ SEÇİMİ */}
        {has && (
          <>
            <Ayirac />
            <Bolum no="04" id="secim" baslik={t('sp.customerSelection')} aciklama={t('sp.secChoiceDesc')} simge={SIMGE.secim} kayitci={kayitci}>
              <Izgara>
                <Veri label={t('screen.type')} value={t(`screen.${screenType}`)} />
                <Veri label={t('sbox.heading')} value={sboxRedundancy === 'yes' ? t('common.yes') : t('common.no')} />
                <Veri label={t('sp.miniPc')} value={hasMiniPc ? t('common.yes') : t('common.no')} />
              </Izgara>
            </Bolum>
          </>
        )}

        {/* 05 — TOPLAM PAKET: tek vurgulu alan */}
        {has && (
          <>
            <Ayirac />
            <Bolum no="05" id="paket" baslik={t('sp.package')} aciklama={t('sp.secPackageDesc')} simge={SIMGE.paket} kayitci={kayitci}>
              <div className="rounded-2xl bg-brand/[0.05] px-5 py-5 ring-1 ring-brand/15 dark:bg-brand/10">
                <Izgara kolon={2}>
                  <Veri label={t('sp.pkg.module')} value={`${fmt(total)} ${t('sp.unit')}`} />
                  <Veri label={t('sp.pkg.processor')} value={lineQty('processor', 1)} />
                  <Veri label={t('sp.pkg.psu')} value={lineQty('powerSupply', total)} />
                  <Veri label={t('sp.pkg.miniPc')} value={hasMiniPc ? lineQty('miniPc', 1) : t('sp.pkg.viaProcessor')} />
                  <Veri label={t('sp.pkg.patch')} value={lineQty('patchCable', Math.max(0, receivingCards - 1))} />
                  <Veri label={t('sp.pkg.receiving')} value={lineQty('receivingCard', receivingCards)} />
                </Izgara>
              </div>
            </Bolum>
          </>
        )}

        {/* EK BİLEŞENLER — büyük kart değil, sade alt liste */}
        {has && (
          <div className="pt-9">
            <AraBaslik>{t('sp.extras')}</AraBaslik>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              <EkBilesen ad={t('sp.frameKit')} eylem={t('sp.viewQuantity')} />
              <EkBilesen ad={t('sp.decoKit')} eylem={t('sp.viewQuantity')} />
            </div>
          </div>
        )}

        <div className="mt-8 space-y-1 border-t border-neutral-200/70 pt-4 text-[11px] leading-relaxed text-neutral-400 dark:border-[#252b35] dark:text-neutral-500">
          <p className="m-0">{t('sp.footnote1')}</p>
          <p className="m-0">{t('sp.footnote2')}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Teknik Özellikler pop-up'ı (Bileşenler de bunun içinde).
 *
 * Dışarıdan kontrol edilir: `open` false ise hiç render edilmez.
 * Başlık şeridi sabit kalır, yalnızca içerik kayar.
 */
export default function SpecsSection({ open = false, onClose, ...props }) {
  const { t } = useLang()

  // Esc ile kapatma
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Pencere açıkken arkadaki sayfa kaymasın (mobilde kaydırma devri)
  useGovdeKilidi(open)

  if (!open) return null

  const modelKodu = props.model?.modelCode || ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#001334]/50 p-0 backdrop-blur-[3px] sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-full w-full flex-col overflow-hidden bg-white shadow-[0_32px_80px_-24px_rgba(0,19,52,0.5)] dark:bg-[#12161d] sm:h-[86vh] sm:w-[90vw] sm:max-w-[1440px] sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık şeridi — içerik kayarken yerinde kalır */}
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-200/80 px-5 py-4 dark:border-[#252b35] sm:px-8 sm:py-5">
          <div className="min-w-0">
            <h2 className="m-0 text-[19px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-[21px]">
              {t('sp.title')}
            </h2>
            <p className="m-0 mt-1 text-[12.5px] leading-snug text-neutral-500 dark:text-neutral-400">
              {t('sp.subtitle')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {modelKodu && (
              <span className="hidden items-center rounded-full bg-neutral-100 px-3 py-1.5 text-[12.5px] font-semibold tracking-wide text-neutral-600 dark:bg-[#1b2029] dark:text-neutral-300 sm:inline-flex">
                {modelKodu}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('exp.close')}
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-neutral-400 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-500 dark:hover:bg-[#1b2029] dark:hover:text-neutral-100"
            >
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </header>

        <SpecsBody {...props} />
      </div>
    </div>
  )
}
