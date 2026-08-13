import { useRef, useState } from 'react'
import { useLang } from './useLang.js'
import { useSession } from './SessionContext.jsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas-pro'
import { fmt } from './specsData.js'
import { viewingDistanceFor } from './viewingDistance.js'
import PrivacyModal from './PrivacyModal.jsx'
import { BRAND } from './brand.js'
import SpecsPdf from './SpecsPdf.jsx'

/**
 * "PDF olarak dışa aktar" formu.
 * Onay kutusu işaretlenince aktifleşir; yapılandırma özeti kendi rapor düzenimizde
 * PDF olarak DOĞRUDAN indirilir (jsPDF + html2canvas).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * RAPOR KİME GİDİYOR — düzen bunun üzerine kurulu
 *
 * Belge İKİ okuyucuya birden gidiyor ve ikisinin ihtiyacı farklı:
 *
 *   • MÜŞTERİ: ne istediğini teyit etmek ister. Onun için üstte kim/nerede,
 *     hemen altında ekranın ölçüsü ve düzeni, ikinci sayfada da çizimi var.
 *     Teknik tablolara girmesi gerekmiyor, girse de anlamı yazıyor.
 *
 *   • ÜRETİCİ: teklifi ve montajı bunun üzerinden planlıyor. Onun için
 *     "Teknik Özet" bloğu var: kabin sayısı, ağırlık (askı/taşıyıcı seçimi),
 *     güç ve ısı yükü (elektrik ve klima), gerçek piksel (medya hazırlığı).
 *     Bunlar eskiden raporda HİÇ yoktu; üreticinin her seferinde geri sorması
 *     gerekiyordu.
 *
 * Belge no + tarih de bu yüzden var: iki taraf aynı belgeden konuşabilsin.
 * Müşterinin telefonu ve e-postası da eskiden forma giriliyor ama kâğıda
 * BASILMIYORDU — üretici elindeki belgeyle müşteriye ulaşamıyordu.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * NOT: Onay metni genel bir yer tutucudur; kendi KVKK/gizlilik metninizle değiştirin.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5007'

// Rapor renkleri — html2canvas değişken (var(--x)) çözemediği için hex sabit
const MARKA = BRAND.blue
const VURGU = BRAND.orange
const MURE = BRAND.ink
const SOLUK = BRAND.muted
const CIZGI = BRAND.line

function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full mt-1 border-b border-neutral-300 dark:border-[#39414f] py-2 text-sm text-neutral-800 dark:text-neutral-200 bg-transparent focus:outline-none focus:border-neutral-800 dark:focus:border-brand placeholder:text-neutral-400'

/** Sayfa alt bilgisi — firma, sorumluluk notu ve sayfa numarası */
function Altbilgi({ t, sayfa }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', borderTop: `1px solid ${CIZGI}`, paddingTop: 7 }}>
      <div style={{ flex: 1, fontSize: 9, color: SOLUK, lineHeight: 1.5, paddingRight: 20 }}>
        <div style={{ fontWeight: 600, color: MURE, marginBottom: 2 }}>{BRAND.company}</div>
        {t('exp.disclaimer')}
      </div>
      <div style={{ fontSize: 9, color: SOLUK, whiteSpace: 'nowrap' }}>
        {t('exp.page')} {sayfa} / 2
      </div>
    </div>
  )
}

export default function ExportModal({ open, onClose, summary }) {
  const { t, lang } = useLang()
  const { session } = useSession()

  /*
   * Kayıt istekleri oturum jetonuyla gidiyor: backend teklifi UserId ile
   * işaretlesin ki kullanıcı "Tekliflerim" ekranında kendi kayıtlarını
   * görebilsin. Jeton yoksa istek yine gider — misafir talebi olarak saklanır.
   */
  const istekBasliklari = () => {
    const h = { 'Content-Type': 'application/json' }
    if (session?.accessToken) h.Authorization = `Bearer ${session.accessToken}`
    return h
  }

  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [address, setAddress] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const sayfa2Ref = useRef(null)
  const altbilgi2Ref = useRef(null)
  const sayfa3Ref = useRef(null)

  if (!open) return null

  // Teklif kaydına yazılan okunabilir ekran özeti
  const screensText =
    summary.screenMode === 'multi' && summary.screens?.length
      ? summary.screens.map((s, i) =>
          s.type === 'lshape'
            ? `${t('screen.label')} ${String(i + 1).padStart(2, '0')}: ${t('mse.leftWing')} ${
                s.leftCols || Math.ceil((s.cols || 2) / 2)
              } + ${t('mse.rightWing')} ${s.rightCols || Math.floor((s.cols || 2) / 2)} ${t('screen.columns')} × ${
                s.rows
              } ${t('screen.rows')} (${t('screen.lshape')})`
            : `${t('screen.label')} ${String(i + 1).padStart(2, '0')}: ${s.cols} ${t('screen.columns')} × ${s.rows} ${t(
                'screen.rows',
              )} (${t(`screen.${s.type}`)})`,
        )
      : [`${summary.cols} ${t('screen.columns')} × ${summary.rows} ${t('screen.rows')} (${t(`screen.${summary.screenType}`)})`]

  /* ------------------------------------------------- rapor için hesaplar */

  const model = summary.model
  const kabinW = (model?.widthMm || 0) / 1000
  const kabinH = (model?.heightMm || 0) / 1000
  const coklu = summary.screenMode === 'multi' && summary.screens?.length > 0

  /*
   * Ekran listesi tek biçime indiriliyor: tek ekran da tek elemanlı bir
   * liste. Böylece aşağıdaki toplamlar iki durum için ayrı ayrı
   * yazılmıyor — çoklu düzende yanlış toplam çıkma ihtimali kalmıyor.
   */
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
  // İzleme mesafesi tek bir sayı olmalı; en büyük ekran belirleyicidir.
  const enBuyuk = olculu.reduce((a, s) => (s.wm * s.hm > a.wm * a.hm ? s : a), olculu[0])
  const izleme = model ? viewingDistanceFor(model, enBuyuk.cols, enBuyuk.rows) : null

  const simdi = new Date()
  const iki = (n) => String(n).padStart(2, '0')
  const belgeNo = `${simdi.getFullYear()}${iki(simdi.getMonth() + 1)}${iki(simdi.getDate())}-${iki(simdi.getHours())}${iki(simdi.getMinutes())}`
  const tarih = simdi.toLocaleDateString(lang === 'tr' ? 'tr-TR' : lang, { day: '2-digit', month: 'long', year: 'numeric' })
  const olcu = (a, b) => `${fmt(a, 2)} × ${fmt(b, 2)} m`

  const tipAdi = (s) => (s.type === 'lshape' ? t('screen.lshape') : t(`screen.${s.type}`))
  const gridAdi = (s) =>
    s.type === 'lshape'
      ? `${s.leftCols || Math.ceil(s.cols / 2)} + ${s.rightCols || Math.floor(s.cols / 2)} × ${s.rows}`
      : `${s.cols} × ${s.rows}`

  /**
   * CSV dışa aktarma — PDF'e alternatif, tablo/ERP sistemlerine aktarmak
   * isteyen üretici/satış ekibi için. Aynı hesaplanmış metrikleri (toplamKabin,
   * agirlik, guc vb.) kullanır; ekstra bir kütüphane gerekmez, tarayıcının
   * yerleşik Blob + <a download> API'si yeterlidir.
   */
  const handleCsvExport = () => {
    const rows = [
      [t('exp.customer'), customer || ''],
      [t('exp.phone'), phone || ''],
      [t('exp.email'), email || ''],
      [t('exp.address'), address || ''],
      [t('sp.model'), summary.modelCode || ''],
      [t('exp.layout'), coklu ? `${t('exp.multi')} (${liste.length})` : t('exp.single')],
      [t('exp.screenSize'), `${fmt(toplamWm, 2)} x ${fmt(enYuksekHm, 2)} m`],
      [t('exp.signal'), summary.resolution || ''],
      [t('exp.pixels'), `${fmt(pikselW)} x ${fmt(pikselH)}`],
      [t('sp.totalCabinets'), fmt(toplamKabin)],
      [t('sp.area'), `${fmt(toplamAlan, 2)} m2`],
      [t('sp.weight'), `${fmt(agirlik, 1)} kg`],
      [t('sp.viewingDistance'), izleme ? `${fmt(izleme, 1)} m` : ''],
      [`${t('sp.power')} (${t('sp.max')})`, `${fmt(gucMax)} W`],
      [`${t('sp.power')} (${t('sp.typical')})`, `${fmt(gucTip)} W`],
      [`${t('sp.heat')} (${t('sp.max')})`, `${fmt(isi)} BTU/h`],
      [t('exp.docNo'), belgeNo],
      [t('exp.date'), tarih],
    ]

    // Excel'in Türkçe karakterleri doğru okuması için UTF-8 BOM eklenir;
    // aksi halde "İ", "ş", "ğ" gibi harfler bozuk görünür.
    const csv = '\uFEFF' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yapilandirma-raporu-${belgeNo}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleExport = async () => {
    if (busy) return
    setBusy(true)
    try {
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const MARJ = 38
      const icerikW = pageW - MARJ * 2

      /*
       * Her parça ayrı ayrı resme çevrilip yerleştiriliyor. Tek bir dev resim
       * yapılmıyor: o zaman içerik kısa olduğunda alt bilgi sayfanın ortasında
       * asılı kalıyor, uzun olduğunda da tüm belge küçültülüp okunmaz hâle
       * geliyordu. Böylece alt bilgi HER ZAMAN sayfanın dibinde duruyor.
       */
      const cek = async (el) => {
        const c = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' })
        return { veri: c.toDataURL('image/png'), oran: c.height / c.width }
      }
      const yerlestir = async (el, y, en = icerikW) => {
        const { veri, oran } = await cek(el)
        pdf.addImage(veri, 'PNG', MARJ + (icerikW - en) / 2, y, en, en * oran)
        return en * oran
      }
      const dibeYerlestir = async (el) => {
        const { veri, oran } = await cek(el)
        const h = icerikW * oran
        pdf.addImage(veri, 'PNG', MARJ, pageH - MARJ - h, icerikW, h)
        return h
      }

      /*
       * ---- 1. SAYFA: rapor + teknik özellikler (TEK SAYFA) ----
       *
       * Müşteri/yapılandırma bilgileri ile teknik döküm artık iki ayrı sayfada
       * iki ayrı tasarımla değil, tek bir belgede aynı kart düzeninde duruyor.
       * Sayfa tam genişlikte basılır: SpecsPdf'in kendi iç kenar boşluğu var,
       * üstüne bir kat daha eklenince yazı okunmaz hâle geliyordu.
       *
       * Yoğun metinli bu sayfa PNG olarak ~20 MB tutuyor ve belge e-postayla
       * gönderilemiyordu; JPEG'de okunaklılık aynı, boyut çok küçük.
       */
      if (sayfa3Ref.current) {
        const c = await html2canvas(sayfa3Ref.current, { scale: 2, backgroundColor: '#ffffff' })
        const veri = c.toDataURL('image/jpeg', 0.92)
        const oran = c.height / c.width
        // Tek sayfaya sığdır: taşarsa oran korunarak küçültülür, artık satırlar
        // ikinci sayfaya sarkmaz.
        let w = pageW
        let h = pageW * oran
        if (h > pageH) {
          h = pageH
          w = pageH / oran
        }
        pdf.addImage(veri, 'JPEG', (pageW - w) / 2, (pageH - h) / 2, w, h)
      }

      /*
       * 2. SAYFA — yapılandırılan ekranın çizimi.
       *
       * Kaynak, ekrandaki canlı önizleme (#pdf-onizleme). Ölçü etiketleri ve
       * insan silüeti dahil edilir; ama +/- düğmeleri ve sol simge şeridi
       * [data-pdf-gizle] ile hariç tutulur — kâğıtta tıklanacak bir şey yok.
       *
       * Çizim artık boş bir sayfada tek başına durmuyor: üstünde neyin çizimi
       * olduğunu söyleyen bir başlık, altında da aynı alt bilgi var. Böylece
       * sayfa tek başına dolaşıma girse bile hangi belgeye ait olduğu belli.
       */
      const onizleme = document.getElementById('pdf-onizleme')
      if (onizleme) {
        pdf.addPage()
        const basY = MARJ
        const basH = await yerlestir(sayfa2Ref.current, basY)
        const altH = await dibeYerlestir(altbilgi2Ref.current)

        const pCanvas = await html2canvas(onizleme, {
          scale: 2,
          backgroundColor: '#ffffff',
          ignoreElements: (el) => el.hasAttribute?.('data-pdf-gizle'),
        })

        // Başlık ile alt bilgi arasında kalan boşluğa, en/boy oranı korunarak
        const ustY = basY + basH + 18
        const bosH = pageH - MARJ - altH - 14 - ustY
        const oran = Math.min(icerikW / pCanvas.width, bosH / pCanvas.height)
        const pw = pCanvas.width * oran
        const ph = pCanvas.height * oran
        pdf.addImage(pCanvas.toDataURL('image/png'), 'PNG', (pageW - pw) / 2, ustY + (bosH - ph) / 2, pw, ph)
      }

      pdf.save(`yapilandirma-raporu-${belgeNo}.pdf`)

      // Teklif kaydını veritabanına gönder. Başarısız olursa PDF yine de indirildiği
      // için kullanıcıyı engellemiyoruz — sadece konsola not düşüyoruz.
      fetch(`${API_URL}/api/quotes`, {
        method: 'POST',
        headers: istekBasliklari(),
        body: JSON.stringify({
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
        }),
      }).catch((e) => console.error('Teklif kaydı gönderilemedi (PDF yine de indirildi):', e))

      /*
       * Konfigürasyonu (Configurations tablosu) da kaydet — böylece admin panelindeki
       * "Kayıtlı Projeler" listesinde görünür, backend'in donanım hesap motoru
       * (alıcı kart/RJ45/önerilen işlemci/fiyat) çalışır ve daha sonra resmi PDF
       * indirilebilir hâle gelir.
       *
       * Yalnızca TEK EKRAN modunda gönderiliyor: CreateConfigurationDto tek bir
       * kabin + sütun/satır ızgarası modelliyor; çoklu ekran (L tipi, farklı
       * boyutlu paneller) düzenini temsil edemiyor. Yanlış veri kaydetmektense
       * bu senaryoda hiç kaydetmemek tercih edildi.
       */
      if (summary.screenMode !== 'multi' && model?.id) {
        fetch(`${API_URL}/api/configurations`, {
          method: 'POST',
          headers: istekBasliklari(),
          body: JSON.stringify({
            projectName: customer ? `${customer} - ${summary.modelCode || ''}` : `Taslak - ${belgeNo}`,
            customerName: customer || null,
            cabinId: model.id,
            cols: Number(summary.cols) || 1,
            rows: Number(summary.rows) || 1,
            assemblyType: model.productType || 'CABINET',
            modulesPerCard: 0,
          }),
        }).catch((e) => console.error('Proje kaydı gönderilemedi (PDF yine de indirildi):', e))
      }

      onClose()
    } catch (err) {
      console.error('PDF oluşturulamadı:', err)
      alert(t('exp.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#001334]/45 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#161a21] rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto p-7 relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <h2 className="text-lg font-bold m-0">{t('exp.title')}</h2>
          <button type="button" onClick={onClose} aria-label={t('exp.close')} className="text-neutral-500 dark:text-neutral-400 hover:text-brand">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        {/*
          Sadeleştirilmiş form. "Oluşturucunun Adı", "Proje Kimliği" ve dosya
          yükleme kaldırıldı — satış ekibinin geri dönmek için ihtiyacı olan
          bilgiler yeterli: kim, nasıl ulaşılır, nereye kurulacak.
        */}
        <Field label={t('exp.customer')}>
          <input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            autoComplete="name"
            className={inputCls}
          />
        </Field>
        <Field label={t('exp.phone')}>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="0(5xx) xxx xx xx"
            className={inputCls}
          />
        </Field>
        <Field label={t('exp.email')}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={inputCls}
          />
        </Field>
        <Field label={t('exp.address')}>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoComplete="street-address"
            className={inputCls}
          />
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
        <button
          type="button"
          onClick={() => setPrivacyOpen(true)}
          className="block text-[11px] text-brand hover:underline mb-6 ml-6"
        >
          {t('privacy.readMore')}
        </button>

        <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!consent || busy}
            onClick={handleExport}
            className={`flex-1 rounded-full py-3 text-sm font-semibold transition-colors ${
              consent && !busy ? 'bg-brand text-white hover:bg-brand-dark' : 'bg-neutral-100 dark:bg-[#222833] text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
            }`}
          >
            {busy ? t('exp.generating') : t('pdf.export')}
          </button>
          <button
            type="button"
            disabled={!consent || busy}
            onClick={handleCsvExport}
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

      {/*
        GİZLİ RAPOR DOM'U (PDF kaynağı).
        Renkler hex, ölçüler px: html2canvas Tailwind sınıflarını ve CSS
        değişkenlerini çözemiyor, çözemediğini de siyah basıyor.
      */}
      <div
        style={{
          position: 'fixed',
          left: -9999,
          top: 0,
          width: 720,
          background: '#ffffff',
          color: MURE,
          fontFamily: 'Poppins, system-ui, Segoe UI, Roboto, sans-serif',
        }}
      >
        {/*
          Eski 1. SAYFA (müşteri + yapılandırma + teknik özet) KALDIRILDI.
          O içerik artık aşağıdaki SpecsPdf sayfasının kart düzeni içinde;
          belge iki farklı tasarım dili taşımıyor.
        */}

        {/* ---------------------------------------------------- 2. SAYFA */}
        <div ref={sayfa2Ref} style={{ background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', borderBottom: `3px solid ${MARKA}`, paddingBottom: 8, position: 'relative' }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: MARKA, flex: 1 }}>
              {t('exp.visual')}
            </span>
            <span style={{ fontSize: 10, color: SOLUK }}>
              {summary.modelCode || ''} · {olcu(toplamWm, enYuksekHm)} · {t('exp.docNo')} {belgeNo}
            </span>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: -3,
                height: 3,
                background: `linear-gradient(90deg, ${MARKA} 0%, ${MARKA} 62%, ${VURGU} 62%, ${VURGU} 100%)`,
              }}
            />
          </div>
        </div>
        <div ref={altbilgi2Ref} style={{ background: '#ffffff' }}>
          <Altbilgi t={t} sayfa={2} />
        </div>

        {/*
          ---------------------------------------------------- 3. SAYFA
          TEKNİK ÖZELLİKLER

          Eskiden ayrı indirilen teknik özellik belgesi artık bu raporun
          içinde. Böylece müşteriye tek bir PDF gidiyor: 1) rapor özeti,
          2) tasarımın çizimi, 3) tam teknik döküm.

          SpecsPdf kendini ekran dışına konumlandırır; burada yalnızca
          html2canvas okusun diye yer alıyor.
        */}
        {model && (
          <SpecsPdf
            innerRef={sayfa3Ref}
            t={t}
            model={model}
            cols={summary.cols}
            rows={summary.rows}
            sboxRedundancy={summary.sboxRedundancy}
            screenType={summary.screenType}
            isVideoWall={summary.isVideoWall}
            rapor={{
              belgeNo,
              tarih,
              customer,
              phone,
              email,
              address,
              message,
              modelCode: summary.modelCode,
              layout: coklu ? `${t('exp.multi')} (${liste.length})` : t('exp.single'),
              wall: summary.width && summary.height ? `${summary.width} × ${summary.height} m` : null,
              screenSize: olcu(toplamWm, enYuksekHm),
              signal: summary.resolution,
              pixels: `${fmt(pikselW)} × ${fmt(pikselH)} px`,
              screens: coklu
                ? olculu.map((s) => ({
                    tip: tipAdi(s),
                    grid: gridAdi(s),
                    olcu: olcu(s.wm, s.hm),
                    adet: `${fmt(s.adet)} ${t('sp.unit')}`,
                  }))
                : null,
            }}
          />
        )}
      </div>
    </div>
  )
}
