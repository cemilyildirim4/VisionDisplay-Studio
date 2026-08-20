import { useState } from 'react'
import html2canvas from 'html2canvas-pro'
import { useLang } from './useLang.js'
import { fmt } from './specsData.js'
import { viewingDistanceFor } from './viewingDistance.js'
import PrivacyModal from './PrivacyModal.jsx'
import { API_URL, apiFetch } from './apiClient.js'
import { rowsToXlsxBlob } from './xlsx.js'
import { useSession } from './SessionContext.jsx'

async function captureScreenPreview() {
  const el = document.getElementById('pdf-onizleme')
  if (!el) return null
  const modal = document.getElementById('export-modal-root')
  const prevVis = modal?.style.visibility
  if (modal) modal.style.visibility = 'hidden'
  try {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      ignoreElements: (n) => n.hasAttribute?.('data-pdf-gizle'),
    })
    return canvas.toDataURL('image/jpeg', 0.85)
  } catch (err) {
    console.error('Ekran önizlemesi yakalanamadı:', err)
    return null
  } finally {
    if (modal) modal.style.visibility = prevVis || ''
  }
}

function Field({ label, error, children }) {
  return (
    <label className="block mb-4">
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      {children}
      {error ? <span className="block mt-1.5 text-[12px] text-red-600 dark:text-red-400">{error}</span> : null}
    </label>
  )
}

function parseProblemErrors(body) {
  const src = body?.errors
  if (!src || typeof src !== 'object') return {}
  const out = {}
  for (const [rawKey, rawVal] of Object.entries(src)) {
    const key = String(rawKey)
      .replace(/^\$\.?/, '')
      .split('.')
      .pop()
      .toLowerCase()
    const list = Array.isArray(rawVal) ? rawVal : [rawVal]
    const msg = list.filter(Boolean).join(' ')
    if (key && msg) out[key] = msg
  }
  return out
}

const inputCls =
  'w-full mt-1 border-b border-neutral-300 dark:border-[#39414f] py-2 text-sm text-neutral-800 dark:text-neutral-200 bg-transparent focus:outline-none focus:border-neutral-800 dark:focus:border-brand placeholder:text-neutral-400'

const inputErrorCls =
  'w-full mt-1 border-b border-red-500 py-2 text-sm text-neutral-800 dark:text-neutral-200 bg-transparent focus:outline-none focus:border-red-600 placeholder:text-neutral-400'

function clampGrid(n) {
  const v = Math.max(1, Number(n) || 1)
  return Math.min(50, v)
}

export default function ExportModal({ open, onClose, summary }) {
  const { t, lang } = useLang()
  const { isAuthenticated } = useSession()
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [address, setAddress] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [emailError, setEmailError] = useState(null)
  const [formError, setFormError] = useState(null)

  if (!open) return null

  const model = summary.model
  const kabinW = (model?.widthMm || 0) / 1000
  const kabinH = (model?.heightMm || 0) / 1000
  const coklu = summary.screenMode === 'multi' && summary.screens?.length > 0

  const liste = (coklu ? summary.screens : [{ cols: summary.cols, rows: summary.rows, type: summary.screenType }]).map(
    (s) => ({
      cols: Math.max(1, Number(s.cols) || 1),
      rows: Math.max(1, Number(s.rows) || 1),
      type: s.type || 'flat',
      leftCols: s.leftCols,
      rightCols: s.rightCols,
    }),
  )
  const olculu = liste.map((s) => ({ ...s, wm: s.cols * kabinW, hm: s.rows * kabinH, adet: s.cols * s.rows }))
  const toplamWm = olculu.reduce((a, s) => a + s.wm, 0)
  const enYuksekHm = Math.max(...olculu.map((s) => s.hm))
  const toplamKabin = olculu.reduce((a, s) => a + s.adet, 0)
  const toplamAlan = olculu.reduce((a, s) => a + s.wm * s.hm, 0)
  const agirlik = toplamKabin * (model?.weightKg || 0)
  const gucMax = toplamKabin * (model?.powerMaxWatts || 0)
  const gucTip = toplamKabin * (model?.powerTypicalWatts || 0)
  const isi = gucMax * 3.412
  const pikselW = olculu.reduce((a, s) => a + s.cols * (model?.pixelWidth || 0), 0)
  const pikselH = Math.max(...olculu.map((s) => s.rows * (model?.pixelHeight || 0)))
  const enBuyuk = olculu.reduce((a, s) => (s.wm * s.hm > a.wm * a.hm ? s : a), olculu[0])
  const izleme = model ? viewingDistanceFor(model, enBuyuk.cols, enBuyuk.rows) : null

  const simdi = new Date()
  const iki = (n) => String(n).padStart(2, '0')
  const belgeNo = `${simdi.getFullYear()}${iki(simdi.getMonth() + 1)}${iki(simdi.getDate())}-${iki(simdi.getHours())}${iki(simdi.getMinutes())}`
  const tarih = simdi.toLocaleDateString(lang === 'tr' ? 'tr-TR' : lang, { day: '2-digit', month: 'long', year: 'numeric' })

  const screensText =
    coklu
      ? summary.screens.map((s, i) =>
          s.type === 'lshape'
            ? `${t('screen.label')} ${String(i + 1).padStart(2, '0')}: ${t('mse.leftWing')} ${s.leftCols || Math.ceil((s.cols || 2) / 2)} + ${t('mse.rightWing')} ${s.rightCols || Math.floor((s.cols || 2) / 2)} ${t('screen.columns')} × ${s.rows} ${t('screen.rows')} (${t('screen.lshape')})`
            : `${t('screen.label')} ${String(i + 1).padStart(2, '0')}: ${s.cols} ${t('screen.columns')} × ${s.rows} ${t('screen.rows')} (${t(`screen.${s.type}`)})`,
        )
      : [`${summary.cols} ${t('screen.columns')} × ${summary.rows} ${t('screen.rows')} (${t(`screen.${summary.screenType}`)})`]

  // Ekran t\u00FCr\u00FC ve \u0131zgara: tabloda kendi sat\u0131rlar\u0131n\u0131 alacak bi\u00E7imde
  const screenTypesText = coklu
    ? summary.screens.map((s) => t(`screen.${s.type || 'flat'}`)).join(' \u00B7 ')
    : t(`screen.${summary.screenType || 'flat'}`)
  const gridText = liste.map((s) => `${s.cols} x ${s.rows}`).join(' \u00B7 ')

  /*
   * TEKN\u0130K \u00D6ZELL\u0130K TABLOSU \u2014 .xlsx.
   *
   * Eskiden CSV'ydi ve m\u00FC\u015Fteri bilgileriyle (ad, telefon, e-posta, adres)
   * ba\u015Fl\u0131yordu. Bu dosya ERP'ye/teknik ekibe giden bir \u015Fartname; ki\u015Fisel
   * veriyi oraya ta\u015F\u0131man\u0131n bir gere\u011Fi yok, teklif bilgileri zaten PDF'te.
   * Art\u0131k yaln\u0131zca teknik sat\u0131rlar var ve dosya ger\u00E7ek bir Excel dosyas\u0131 \u2014
   * Excel'in "bu bi\u00E7imde \u00F6zellikler kaybolabilir" uyar\u0131s\u0131 da b\u00F6ylece ge\u00E7ti.
   */
  const handleExcelExport = () => {
    const rows = [
      [t('sp.title'), ''],
      [t('sp.model'), summary.modelCode || ''],
      [t('exp.layout'), coklu ? `${t('exp.multi')} (${liste.length})` : t('exp.single')],
      [t('screen.type'), screenTypesText],
      [t('sp.screenConfig'), gridText],
      [t('exp.screenSize'), `${fmt(toplamWm, 2)} x ${fmt(enYuksekHm, 2)} m`],
      [t('exp.signal'), summary.resolution || ''],
      [t('exp.pixels'), `${fmt(pikselW)} x ${fmt(pikselH)}`],
      [t('sp.totalCabinets'), toplamKabin],
      [t('sp.area'), `${fmt(toplamAlan, 2)} m2`],
      [t('sp.weight'), `${fmt(agirlik, 1)} kg`],
      [t('sp.viewingDistance'), izleme ? `${fmt(izleme, 1)} m` : ''],
      [`${t('sp.power')} (${t('sp.max')})`, `${fmt(gucMax)} W`],
      [`${t('sp.power')} (${t('sp.typical')})`, `${fmt(gucTip)} W`],
      [`${t('sp.heat')} (${t('sp.max')})`, `${fmt(isi)} BTU/h`],
      [t('exp.docNo'), belgeNo],
      [t('exp.date'), tarih],
    ]
    const blob = rowsToXlsxBlob(rows, { sheetName: t('sp.title'), colWidths: [34, 42] })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `teknik-ozellikler-${belgeNo}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleExport = async () => {
    if (busy) return
    if (!isAuthenticated) {
      alert(t('exp.needLogin'))
      window.location.hash = '#hesap?tab=session'
      return
    }
    if (!model?.id) {
      alert(t('exp.error'))
      return
    }
    setBusy(true)
    setEmailError(null)
    setFormError(null)
    try {
      const projectName = (customer ? `${customer} - ${summary.modelCode || ''}` : `Taslak - ${belgeNo}`).slice(0, 100)
      const previewImageBase64 = await captureScreenPreview()
      const res = await apiFetch(`${API_URL}/api/configurations/export-pdf`, {
        method: 'POST',
        auth: true,
        headers: { 'Content-Type': 'application/json' },
        timeoutMs: 45000,
        body: JSON.stringify({
          projectName,
          customerName: customer || null,
          cabinId: model.id,
          cols: clampGrid(summary.cols),
          rows: clampGrid(summary.rows),
          assemblyType: model.productType || 'CABINET',
          modulesPerCard: 0,
          phone: phone || null,
          email: email || null,
          address: address || null,
          message: message || null,
          screenType: summary.screenType || null,
          resolution: summary.resolution || null,
          screensSummary: screensText.join(' · '),
          wallWidthM: Number(summary.width) || null,
          wallHeightM: Number(summary.height) || null,
          screenMode: summary.screenMode || 'single',
          previewImageBase64,
        }),
      })
      if (!res.ok) {
        if (res.status === 401) throw new Error(t('exp.needLogin'))
        const err = await res.json().catch(() => ({}))
        const fieldErrors = parseProblemErrors(err)
        if (fieldErrors.email) {
          setEmailError(fieldErrors.email || t('exp.emailInvalid'))
          return
        }
        const otherFieldMsgs = Object.entries(fieldErrors)
          .filter(([k]) => k !== 'email')
          .map(([, msg]) => msg)
        if (otherFieldMsgs.length > 0) {
          setFormError(otherFieldMsgs.join(' '))
          return
        }
        throw new Error(err.detail || (err.title && err.title !== 'Doğrulama Hatası' ? err.title : null) || t('exp.error'))
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Profesyonel_Rapor_${summary.modelCode || belgeNo}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      /*
       * auth: true — kaydın SAHİBİ olması için. Sunucu teklifi yazarken
       * UserId'yi jetondaki kimlikten alıyor; bu istek imzasız gittiği için
       * kayıtlar sahipsiz (UserId = null) düşüyor ve "Tekliflerim" listesi
       * (GET /api/quotes/mine kullanıcıya göre süzüyor) hep boş kalıyordu.
       *
       * BETA_ENABLED=false iken sunucu PII (ad/telefon/e-posta/adres/mesaj)
       * kabul etmez (403 PII_DISABLED). O durumda teknik özet PII'siz tekrar gönderilir.
       */
      const quotePayload = {
        customerName: customer || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        message: message || null,
        modelCode: summary.modelCode || null,
        wallWidthM: Number(summary.width) || null,
        wallHeightM: Number(summary.height) || null,
        screenMode: summary.screenMode || 'single',
        columns: Number(summary.cols) || null,
        rows: Number(summary.rows) || null,
        screenType: summary.screenType || null,
        resolution: summary.resolution || null,
        screensSummary: screensText.join(' · '),
      }
      const sendQuote = (body) =>
        apiFetch(`${API_URL}/api/quotes`, {
          method: 'POST',
          auth: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      sendQuote(quotePayload)
        .then(async (quoteRes) => {
          if (quoteRes.ok) return
          const err = await quoteRes.json().catch(() => ({}))
          if (quoteRes.status === 403 && err.code === 'PII_DISABLED') {
            await sendQuote({
              ...quotePayload,
              customerName: null,
              phone: null,
              email: null,
              address: null,
              message: null,
            })
            return
          }
          console.error('Teklif kaydı gönderilemedi (PDF yine de indirildi):', err.message || quoteRes.status)
        })
        .catch((e) => console.error('Teklif kaydı gönderilemedi (PDF yine de indirildi):', e))

      if (summary.screenMode !== 'multi' && model.id) {
        apiFetch(`${API_URL}/api/configurations`, {
          method: 'POST',
          auth: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectName,
            customerName: customer || null,
            cabinId: model.id,
            cols: clampGrid(summary.cols),
            rows: clampGrid(summary.rows),
            assemblyType: model.productType || 'CABINET',
            modulesPerCard: 0,
          }),
        }).catch((e) => console.error('Proje kaydı gönderilemedi (PDF yine de indirildi):', e))
      }

      onClose()
    } catch (err) {
      console.error('PDF oluşturulamadı:', err)
      alert(err.message || t('exp.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div id="export-modal-root" className="fixed inset-0 z-50 bg-[#001334]/45 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#161a21] rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto p-7 relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <h2 className="text-lg font-bold m-0">{t('pdf.professional')}</h2>
          <button type="button" onClick={onClose} aria-label={t('exp.close')} className="text-neutral-500 dark:text-neutral-400 hover:text-brand">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <Field label={t('exp.customer')}>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} autoComplete="name" className={inputCls} />
        </Field>
        <Field label={t('exp.phone')}>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="0(5xx) xxx xx xx" className={inputCls} />
        </Field>
        <Field label={t('exp.email')} error={emailError}>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (emailError) setEmailError(null)
            }}
            autoComplete="email"
            aria-invalid={emailError ? 'true' : 'false'}
            className={emailError ? inputErrorCls : inputCls}
          />
        </Field>
        <Field label={t('exp.address')}>
          <input value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" className={inputCls} />
        </Field>
        <Field label={t('exp.message')}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full mt-1 border border-neutral-300 dark:border-[#39414f] rounded-lg p-2 text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-neutral-800 resize-none"
          />
        </Field>

        <label className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-400 mb-1.5 cursor-pointer">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-brand" />
          {t('exp.consent')}
        </label>
        <button type="button" onClick={() => setPrivacyOpen(true)} className="block text-[11px] text-brand hover:underline mb-6 ml-6">
          {t('privacy.readMore')}
        </button>

        <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />

        {formError && (
          <p className="text-[13px] text-red-600 dark:text-red-400 mb-4 m-0 leading-relaxed" role="alert">
            {formError}
          </p>
        )}

        {!isAuthenticated && (
          <p className="text-[13px] text-neutral-600 dark:text-neutral-300 mb-4 m-0 leading-relaxed">
            {t('exp.needLogin')}{' '}
            <a href="#hesap?tab=session" className="font-semibold text-brand hover:underline">
              {t('profile.signIn')}
            </a>
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!consent || busy || !isAuthenticated}
            onClick={handleExport}
            className={`flex-1 rounded-full py-3 text-sm font-semibold transition-colors ${
              consent && !busy && isAuthenticated ? 'bg-brand text-white hover:bg-brand-dark' : 'bg-neutral-100 dark:bg-[#222833] text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
            }`}
          >
            {busy ? t('exp.generating') : t('pdf.professional')}
          </button>
          <button
            type="button"
            disabled={!consent || busy}
            onClick={handleExcelExport}
            title={t('exp.csvHint')}
            className={`rounded-full px-4 py-3 text-sm font-semibold border transition-colors ${
              consent && !busy
                ? 'border-neutral-300 dark:border-[#39414f] text-neutral-700 dark:text-neutral-300 hover:border-brand hover:text-brand'
                : 'border-neutral-200 dark:border-[#242b36] text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
            }`}
          >
            {t('exp.csv')}
          </button>
        </div>
      </div>
    </div>
  )
}
