/**
 * Model seçildikten sonra sayfanın altında görünen "Teknik Özellikler" ve "Bileşenler" bölümleri.
 * Değerler seçilen modelin verisinden HESAPLANIR. Model yoksa "-" gösterilir.
 *
 * NOT: Bileşenler bölümündeki aksesuar parça kodları (S-Kutu, Jig, Güç Kablosu vb.)
 * yer tutucudur; kendi katalog kodlarınızla değiştirilecek.
 */

import { useEffect, useRef, useState } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import SpecsPdf from './SpecsPdf.jsx'
import { useLang } from './useLang.js'
import { DASH, fmt, computeSpecs } from './specsData.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5007'

/**
 * Kart içindeki tek satır: solda etiket, sağda değer.
 * Etiket boşsa (ör. Çerçeve Kiti) değer tek başına, ortada ve büyük gösterilir.
 */
function Pair({ label, value }) {
  if (!label) {
    return (
      <div className="py-1 text-center text-lg font-semibold text-neutral-900 dark:text-neutral-100 whitespace-pre-line">
        {value}
      </div>
    )
  }
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-neutral-100 dark:border-[#242b36] last:border-b-0">
      <span className="text-sm text-neutral-500 dark:text-neutral-400 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 text-right whitespace-pre-line">
        {value}
      </span>
    </div>
  )
}

/**
 * Bir başlık grubu = bir kart.
 * wide: geniş içerikli gruplar (ör. Güç, 6 satır) iki sütun yer kaplar.
 */
function Block({ title, children }) {
  return (
    <div
      className="bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-lg px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1 h-4 rounded-full bg-brand shrink-0" />
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 m-0">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  )
}

/**
 * Kartların aktığı iki sütun.
 * CSS sütun akışı kullanılır: kartlar sırayla dizilir, ortada ayırıcı çizgi olur
 * ve hiçbir kart ikiye bölünmez.
 */
function CardGrid({ children }) {
  return (
    <div className="columns-1 md:columns-2 gap-5 md:[column-rule:1px_solid_#e5e5e5] [&>*]:break-inside-avoid [&>*]:mb-3">
      {children}
    </div>
  )
}

/** Pop-up içeriği (Teknik Özellikler + Bileşenler tek listede). */
function SpecsBody({ model, cols = 1, rows = 1, sboxRedundancy = 'no', screenType = 'flat', isVideoWall = false }) {
  const { t } = useLang()
  const has = !!model
  const total = cols * rows
  const s = computeSpecs(model, cols, rows)

  const circuitText = (c) =>
    has ? `${c.circuits} ${t('sp.circuit')}\n${t('sp.perCircuit')}: ${c.perCircuit} ${t('sp.cabinet')}` : DASH

  // ---- VİDEO DUVARI: sadeleştirilmiş özellikler, "Bileşenler" bölümü yok ----
  if (isVideoWall) {
    const depthM = has ? (model.depthMm || 0) / 1000 : 0
    return (
      <CardGrid>
          <Block title={t('sp.screenConfig')}>
            <Pair label={t('sp.lengthHeight')} value={has ? `${cols} ${t('sp.unit')} x ${rows} ${t('sp.unit')}` : DASH} />
            <Pair label={t('sp.totalScreens')} value={has ? `${fmt(total)} ${t('sp.unit')}` : DASH} />
          </Block>

          <Block title={t('sp.screenSpecs')}>
            <Pair
              label={t('sp.lengthHeightDepth')}
              value={has ? `${fmt(s.W, 3)} x ${fmt(s.H, 3)} x ${fmt(depthM, 2)} m` : DASH}
            />
            <Pair label={t('sp.diagonal')} value={has ? `${fmt(s.diagIn, 3)} ${t('sp.inch')}` : DASH} />
            <Pair label={t('sp.weight')} value={has ? `${fmt(s.weight, 1)} kg` : DASH} />
          </Block>

          <Block title={t('sp.power')}>
            <Pair label={t('sp.max')} value={has ? `${fmt(s.pMax)} (W/h)` : DASH} />
            <Pair label={t('sp.typical')} value={has ? `${fmt(s.pTyp)} (W/h)` : DASH} />
          </Block>
      </CardGrid>
    )
  }

  // Teknik özellikler ve bileşenler TEK listede; sütunlara sırayla dağılır.
  return (
    <CardGrid>
        <Block title={t('sp.screenConfigLxh')}>
          <Pair label="" value={has ? `${cols} ${t('sp.unit')} x ${rows} ${t('sp.unit')}` : DASH} />
        </Block>

        <Block title={t('sp.screenSpecs')}>
          <Pair label={t('sp.lengthHeight')} value={has ? `${fmt(s.W, 3)} x ${fmt(s.H, 3)} m` : DASH} />
          <Pair label={t('sp.area')} value={has ? `${fmt(s.area, 3)} m²` : DASH} />
          <Pair label={t('sp.diagonal')} value={has ? `${fmt(s.diagIn, 1)} ${t('sp.inch')}` : DASH} />
          <Pair label={has ? t('sp.weightCabinets') : t('sp.weight')} value={has ? `${fmt(s.weight, 1)} kg` : DASH} />
          {has && <Pair label={t('sp.viewingDistance')} value={`${fmt(s.viewDist, 1)} m`} />}
        </Block>

        {has && (
          <Block title={t('sp.optical')}>
            <Pair label={t('sp.resolution')} value={`${fmt(s.resW)} x ${fmt(s.resH)}`} />
          </Block>
        )}

        {has && (
          <Block title={t('sp.power')}>
            <Pair label={t('sp.max')} value={`${fmt(s.pMax)} ${t('sp.watt')}`} />
            <Pair label={t('sp.typical')} value={`${fmt(s.pTyp)} ${t('sp.watt')}`} />
            <Pair label={`110V 20A ${t('sp.circuits')}`} value={circuitText(s.circuits.c110_20)} />
            <Pair label={`208V 20A ${t('sp.circuits')}`} value={circuitText(s.circuits.c208_20)} />
            <Pair label={`230V 13A ${t('sp.circuits')}`} value={circuitText(s.circuits.c230_13)} />
            <Pair label={`230V 16A ${t('sp.circuits')}`} value={circuitText(s.circuits.c230_16)} />
          </Block>
        )}

        {has && (
          <Block title={t('sp.heat')}>
            <Pair label={t('sp.max')} value={`${fmt(s.btuMax)} BTU`} />
            <Pair label={t('sp.typical')} value={`${fmt(s.btuTyp)} BTU`} />
          </Block>
        )}

        {has && (
          <Block title={t('sp.customerSelection')}>
            <Pair label={t('screen.type')} value={t(`screen.${screenType}`)} />
            <Pair label={t('sbox.heading')} value={sboxRedundancy === 'yes' ? t('common.yes') : t('common.no')} />
          </Block>
        )}

      {/* --- Buradan sonrası eski "Bileşenler" bölümüydü, aynı listeye taşındı --- */}

        <Block title={t('sp.ledCabinets')}>
          <Pair label={t('sp.cabinetCount')} value={has ? `${fmt(total)} ${t('sp.unit')}` : DASH} />
          {has && <Pair label={t('sp.spareCabinets')} value={`0 ${t('sp.unit')}`} />}
          {has && <Pair label={`${t('sp.totalCabinets')} (${model.modelCode})`} value={`${fmt(total)} ${t('sp.units')}`} />}
        </Block>

        {has && (
          <Block title={t('sp.sbox')}>
            <Pair label={t('sp.model')} value={model.sboxCode || DASH} />
            <Pair label={t('sp.spare')} value={`${sboxRedundancy === 'yes' ? 1 : 0} ${t('sp.unit')}`} />
          </Block>
        )}

        {has && (
          <Block title={t('sp.jig')}>
            <Pair label={t('sp.model')} value={model.jigCode || DASH} />
          </Block>
        )}

        {has && (
          <Block title={t('sp.powerCord')}>
            <Pair label="110V" value={model.powerCord110Code || DASH} />
            <Pair label="220V" value={model.powerCord220Code || DASH} />
          </Block>
        )}

        {has && (
          <Block title={t('sp.frameKit')}>
            <Pair label="" value={t('sp.viewQuantity')} />
          </Block>
        )}

        {has && (
          <Block title={t('sp.decoKit')}>
            <Pair label="" value={t('sp.viewQuantity')} />
          </Block>
        )}
    </CardGrid>
  )
}

/**
 * Teknik Özellikler pop-up'ı (Bileşenler de bunun içinde).
 *
 * Dışarıdan kontrol edilir: `open` false ise hiç render edilmez.
 * Açma butonu App.jsx'teki sol dikey simge şeridinde.
 *
 * İçerik ortadan ikiye bölünmüş iki sütuna sırayla akar; tek bakışta
 * görünsün diye kartlar sıkışıktır. Küçük ekranlarda erişilebilir kalsın
 * diye kaydırma yine de açık bırakıldı.
 */
export default function SpecsSection({ open = false, onClose, ...props }) {
  const { t } = useLang()
  const pdfRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [serverBusy, setServerBusy] = useState(false)
  const [serverError, setServerError] = useState(null)

  /**
   * Görünmez PDF sayfasını görüntüye çevirip A4 olarak indirir.
   * Sayfaya sığmazsa aynı görüntü kaydırılarak birden çok sayfaya bölünür.
   */
  const downloadPdf = async () => {
    if (!pdfRef.current || busy) return
    setBusy(true)
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2, backgroundColor: '#ffffff' })
      const img = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const h = (canvas.height * pageW) / canvas.width

      for (let y = 0; y < h; y += pageH) {
        if (y > 0) pdf.addPage()
        pdf.addImage(img, 'PNG', 0, -y, pageW, h)
      }

      const code = String(props.model?.modelCode || 'model').replace(/[^w.-]+/g, '-')
      pdf.save(`teknik-ozellikler-${code}.pdf`)
    } catch (err) {
      console.error('PDF oluşturulamadı:', err)
    } finally {
      setBusy(false)
    }
  }

  /**
   * Backend'in donanım hesap motorunu (alıcı kart, RJ45 port, önerilen işlemci)
   * kullanarak "resmi" bir teknik föy PDF'i üretir — QuestPDF ile sunucuda oluşturulur.
   *
   * Yalnızca tek ekran modunda gösterilir: Configurations tablosu/DTO'su tek bir
   * kabin + sütun/satır ızgarası modelliyor, çoklu ekran (L tipi, farklı boyutlu
   * paneller) düzenini temsil edemiyor. Bu backend'in bilinen bir kapsam sınırı.
   */
  const downloadServerPdf = async () => {
    const model = props.model
    if (!model?.id || serverBusy || props.screenMode === 'multi') return
    setServerBusy(true)
    setServerError(null)
    try {
      const res = await fetch(`${API_URL}/api/configurations/export-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: `Taslak - ${model.modelCode || 'Model'}`,
          cabinId: model.id,
          cols: props.cols || 1,
          rows: props.rows || 1,
          assemblyType: model.productType || 'CABINET',
          modulesPerCard: 0, // 0 => backend kabinin varsayılanını kullanır
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Resmi PDF oluşturulamadı.')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `resmi-teknik-fey-${model.modelCode || 'model'}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setServerBusy(false)
    }
  }

  // Esc ile kapatma
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-[#001334]/45 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#161a21] rounded-2xl w-full max-w-6xl max-h-[95vh] sm:max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-200 dark:border-[#2c333f]">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-5 rounded-full bg-brand shrink-0" />
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 m-0">{t('sp.title')}</h2>
          </div>
          <div className="flex items-center gap-5">
            {!!props.model && (
              <button
                type="button"
                onClick={downloadPdf}
                disabled={busy}
                className="inline-flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400 hover:text-brand disabled:text-neutral-300"
              >
                {busy ? t('sp.preparing') : t('sp.download')}
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v10" />
                  <path d="M7 12l5 5 5-5" />
                  <path d="M5 19h14" />
                </svg>
              </button>
            )}
            {!!props.model && !props.isVideoWall && (
              <button
                type="button"
                onClick={downloadServerPdf}
                disabled={serverBusy || props.screenMode === 'multi'}
                title={
                  props.screenMode === 'multi'
                    ? 'Resmi teknik föy şu an yalnızca tek ekran modunda üretilebilir.'
                    : 'Alıcı kart, RJ45 port ve önerilen işlemci içeren resmi teknik föy (sunucuda üretilir)'
                }
                className="inline-flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400 hover:text-brand disabled:text-neutral-300"
              >
                {serverBusy ? t('sp.preparing') : 'Resmi Teknik Föy'}
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v10" />
                  <path d="M7 12l5 5 5-5" />
                  <path d="M5 19h14" />
                </svg>
              </button>
            )}
            <button type="button" onClick={onClose} aria-label={t('exp.close')} className="text-neutral-400 dark:text-neutral-500 hover:text-brand">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto bg-neutral-50/60 dark:bg-[#12161d] px-3 sm:px-5 py-4">
          {serverError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{serverError}</div>
          )}
          <SpecsBody {...props} />
          {/* PDF kaynağı — ekran dışında durur, yalnızca indirirken okunur */}
          <SpecsPdf innerRef={pdfRef} t={t} {...props} />
          <div className="mt-4 space-y-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">
            <p className="m-0">{t('sp.footnote1')}</p>
            <p className="m-0">{t('sp.footnote2')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
