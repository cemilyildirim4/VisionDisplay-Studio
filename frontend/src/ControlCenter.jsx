import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLang } from './useLang.js'
import { useSession } from './SessionContext.jsx'
import { BrandMark, BrandStripe, goToConfigurator } from './BrandChrome.jsx'
import { API_URL, apiFetch } from './apiClient.js'
import { duzenlemeyeGonder, taslakDolu } from './tasarimTaslagi.js'
import { rowsToXlsxBlob } from './xlsx.js'



// "Genel Bakış" sekmesi kaldırıldı; varsayılan sekme artık Oturum.
// Eski bağlantılarda kalmış olabilecek ?tab=overview de buraya düşer.
function parseTabFromHash() {
  try {
    const q = window.location.hash.split('?')[1] || ''
    const params = new URLSearchParams(q)
    const tab = params.get('tab')
    return !tab || tab === 'overview' ? 'session' : tab
  } catch {
    return 'session'
  }
}

function tarihMetni(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

function olcuMetni(g, y) {
  if (g == null && y == null) return null
  return `${g ?? '?'} m × ${y ?? '?'} m`
}

function teklifteMiniPc(q) {
  if (typeof q.hasMiniPc === 'boolean') return q.hasMiniPc
  try {
    const taslak = q.configJson ? JSON.parse(q.configJson) : null
    return Boolean(taslak?.hasMiniPc)
  } catch {
    return false
  }
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 min-h-[44px] py-2.5 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors inline-flex items-center justify-center w-full md:w-auto max-w-full ${
        active
          ? 'btn-selected'
          : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#1f2530]'
      }`}
    >
      {children}
    </button>
  )
}

function Panel({ title, hint, children }) {
  return (
    <section className="border border-neutral-200 dark:border-[#2a3342] rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#121821] w-full max-w-full overflow-x-hidden">
      <div className="mb-4">
        <h2 className="text-base font-bold m-0 text-neutral-900 dark:text-neutral-100">{title}</h2>
        {hint && <p className="text-[13px] text-neutral-500 dark:text-neutral-400 m-0 mt-1 leading-relaxed">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/**
 * Kontrol Merkezi / Hesap Yönetimi
 * Hash: #hesap  |  #hesap?tab=quotes|tester|session|overview
 */
export default function ControlCenter() {
  const { t } = useLang()
  const {
    role,
    displayName,
    email,
    initials,
    isAdmin,
    isTester,
    isDealer,
    canDealerTools,
    canTesterTools,
    testerRoleEnabled,
    isAuthenticated,
    setSessionData,
    logout,
    session,
    ROLES: R,
  } = useSession()

  const [tab, setTab] = useState(parseTabFromHash)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [loginError, setLoginError] = useState(null)
  /*
   * GİRİŞ / YENİ KAYIT aynı panelde. Kayıt açık ve her zaman "Bayi" rolü
   * veriyor; yönetici veya tester rolü buradan alınamaz (bkz. AuthController).
   * Açılan hesap yalnızca KENDİ tekliflerini görür ("Tekliflerim" sekmesi
   * /api/quotes/mine'a bakıyor); hepsini yalnızca Admin görür.
   */
  /*
   * YENİ KAYIT KALDIRILDI.
   *
   * Erişim davet koduyla veriliyor (bkz. DavetKapisi.jsx ve yönetim
   * panelindeki "Davet Kodları"); kendi kendine hesap açma yolu bununla
   * çelişiyordu. Bu ekranda yalnızca GİRİŞ var; hesabı yönetim paneli
   * açıyor. Sunucudaki /api/auth/register ucuna dokunulmadı.
   */
  /* Davet kodu alanı — beta erişimi buradan da açılabiliyor. */
  const [davetAd, setDavetAd] = useState('')
  const [davetKod, setDavetKod] = useState('')
  const [davetHata, setDavetHata] = useState(null)
  const [davetBusy, setDavetBusy] = useState(false)
  const [bugNote, setBugNote] = useState('')
  const [bugSent, setBugSent] = useState(false)
  const [bugSending, setBugSending] = useState(false)
  const [bugError, setBugError] = useState(null)
  /*
   * TEKLİFLERİM
   *
   * PDF dışa aktarımı sırasında kaydedilen teklifler /api/quotes/mine ile
   * çekilir; uç yalnızca giriş yapan kişinin kendi kayıtlarını döndürür.
   * "Görüntüle" düğmesi kaydın yapılandırma ayrıntısını satırın altında açar.
   */
  const [teklifler, setTeklifler] = useState([])
  const [teklifYukleniyor, setTeklifYukleniyor] = useState(false)
  const [teklifHata, setTeklifHata] = useState(null)
  const [acikTeklif, setAcikTeklif] = useState(null)

  useEffect(() => {
    const onHash = () => setTab(parseTabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  /**
   * Kayıtlı teklifin teknik özetini dosya olarak indirir.
   *
   * PDF alınırken üretilen CSV yalnızca o anda, tarayıcıda oluşuyordu;
   * sonradan aynı kayda dönüldüğünde erişilemiyordu. Burada dosya, kaydın
   * KENDİ alanlarından üretiliyor — yeni bir veri uydurulmuyor, ekranda
   * "Görüntüle" ile görülen bilgilerin aynısı.
   */
  const teklifCsvIndir = (q) => {
    const satirlar = [
      [t('sp.title'), ''],
      [t('cc.quotes.f.model'), q.modelCode || ''],
      [t('cc.quotes.f.wall'), olcuMetni(q.wallWidthM, q.wallHeightM) || ''],
      [t('cc.quotes.f.grid'), q.columns && q.rows ? `${q.columns} × ${q.rows}` : ''],
      [t('cc.quotes.f.type'), q.screenType || ''],
      [t('cc.quotes.f.resolution'), q.resolution || ''],
      [t('cc.quotes.f.miniPc'), teklifteMiniPc(q) ? t('common.yes') : t('common.no')],
      [t('cc.quotes.f.screens'), q.screensSummary || ''],
      [t('cc.quotes.f.customer'), q.customerName || ''],
      [t('cc.quotes.f.note'), q.adminNote || ''],
      [t('cc.quotes.status'), q.status || ''],
      [t('cc.quotes.date'), q.createdAt ? new Date(q.createdAt).toLocaleDateString('tr-TR') : ''],
    ]
    const blob = rowsToXlsxBlob(satirlar, { sheetName: t('sp.title'), colWidths: [34, 42] })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `teklif-${q.id}-${q.modelCode || 'kayit'}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)

    /* Panelde "kim ne indirdi" görünsün diye kayıt; başarısız olsa da indirme sürer. */
    apiFetch(`${API_URL}/api/export-logs`, {
      method: 'POST',
      auth: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'csv', modelCode: q.modelCode || null, companyName: q.customerName || null }),
    }).catch(() => {})
  }

  const teklifleriYukle = useCallback(async () => {
    if (!session?.accessToken) {
      setTeklifler([])
      return
    }
    setTeklifYukleniyor(true)
    setTeklifHata(null)
    try {
      // apiFetch + auth: jetonu kendisi ekler, eskimişse tazeleyip tekrarlar.
      // Düz fetch kullanılırken 15 dakikalık jeton dolar dolmaz liste
      // "oturumunuzun süresi dolmuş" hatasına düşüyordu.
      const res = await apiFetch(`${API_URL}/api/quotes/mine`, { auth: true })
      if (!res.ok) {
        setTeklifHata(res.status === 401 ? t('cc.quotes.needLogin') : t('cc.quotes.loadFailed'))
        return
      }
      const data = await res.json()
      setTeklifler(Array.isArray(data) ? data : [])
    } catch {
      setTeklifHata(t('cc.quotes.loadFailed'))
    } finally {
      setTeklifYukleniyor(false)
    }
  }, [session, t])

  useEffect(() => {
    if (tab === 'quotes') teklifleriYukle()
  }, [tab, teklifleriYukle])

  const goTab = (next) => {
    setTab(next)
    const base = window.location.pathname + window.location.search
    window.history.replaceState(null, '', `${base}#hesap?tab=${next}`)
  }

  const tabs = useMemo(() => {
    const list = []
    if (canDealerTools) list.push({ id: 'quotes', label: t('cc.tab.quotes') })
    if (canTesterTools) list.push({ id: 'tester', label: t('cc.tab.tester') })
    list.push({ id: 'session', label: t('cc.tab.session') })
    /*
     * DAVET KODU sekmesi yalnızca oturum yokken görünüyor: kod, giriş
     * yapmamış kullanıcıya 24 saatlik misafir erişimi veriyor. Oturum
     * açıkken göstermek kafa karıştırıcı olurdu.
     */
    if (!isAuthenticated) list.push({ id: 'invite', label: t('cc.tab.invite') })
    return list
  }, [canDealerTools, canTesterTools, isAuthenticated, t])

  useEffect(() => {
    if (tab === 'tester' && !canTesterTools) goTab('session')
  }, [tab, canTesterTools])

  const roleLabel = t(`role.${role.toLowerCase()}`)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (loginBusy) return
    setLoginBusy(true)
    setLoginError(null)
    try {
      const res = await apiFetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setLoginError(body.message || t('cc.login.failed'))
        return
      }
      const data = await res.json()
      setSessionData({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        role: data.role || R.DEALER,
        email: data.email || loginEmail,
        displayName: data.displayName || data.email || loginEmail,
      })
      goTab('session')
    } catch {
      setLoginError(t('cc.login.network'))
    } finally {
      setLoginBusy(false)
    }
  }

  /**
   * Davet kodunu doğrular ve misafir oturumunu başlatır.
   *
   * Aynı uç, pop-up kapısıyla ortak (DavetKapisi.jsx): POST /api/auth/guest.
   * Geçerli kod 24 saatlik "Guest" jetonu döndürüyor.
   */
  const davetGonder = async (e) => {
    e.preventDefault()
    const temiz = davetKod.trim()
    if (!temiz || davetBusy) return
    setDavetBusy(true)
    setDavetHata(null)
    try {
      const res = await apiFetch(`${API_URL}/api/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: temiz, userName: davetAd.trim() || null }),
      })
      const veri = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDavetHata(veri.message || t('cc.invite.invalid'))
        return
      }
      /* Davet kodu BAYİ oturumu açıyor; sunucu gerçek bir hesap veriyor. */
      setSessionData({
        accessToken: veri.accessToken,
        refreshToken: veri.refreshToken,
        role: veri.role || R.DEALER,
        email: veri.email || null,
        displayName: veri.displayName || davetAd.trim(),
        firma: veri.companyName || null,
        firmaTelefon: veri.companyPhone || null,
        firmaEposta: veri.companyEmail || null,
        firmaNot: veri.companyNote || null,
      })
      setDavetKod('')
      setDavetAd('')
      goTab('session')
    } catch {
      setDavetHata(t('cc.invite.network'))
    } finally {
      setDavetBusy(false)
    }
  }

  /*
   * Hata bildirimi SUNUCUYA kaydedilir.
   *
   * Eskiden yalnızca `console.info` ile tarayıcı konsoluna yazılıyordu:
   * kullanıcı "gönderildi" yazısını görüyor ama not hiçbir yere ulaşmıyordu.
   * Artık /api/feedback'e gidiyor ve yönetim panelindeki "Geri Bildirimler"
   * bölümünde okunuyor.
   */
  const sendBugReport = async () => {
    const note = bugNote.trim()
    if (!note || bugSending) return
    setBugSending(true)
    setBugError(null)
    try {
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note,
          role,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || t('cc.tester.failed'))
      }
      setBugSent(true)
      setBugNote('')
      setTimeout(() => setBugSent(false), 2500)
    } catch (err) {
      // Bildirim kaybolmasın: hata gösterilir ve yazılan metin kutuda kalır.
      setBugError(err.message === 'Failed to fetch' ? t('cc.login.network') : err.message)
    } finally {
      setBugSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] dark:bg-[#0b0f16] text-[#1c1c2b] dark:text-neutral-100 font-sans">
      <header className="border-b border-neutral-200/80 dark:border-[#2a3342] bg-white dark:bg-[#121821] w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
        <BrandMark title={t('cc.title')} subtitle={t('app.tagline')} size="lg" />
        <a
          href="/"
          onClick={goToConfigurator}
          className="text-[13px] font-semibold text-brand hover:underline shrink-0 inline-flex items-center min-h-[44px] max-w-full"
        >
          ← {t('cc.back')}
        </a>
      </header>
      <BrandStripe />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 brand-page-enter">
        {/* Kimlik şeridi */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6 min-w-0 max-w-full">
          <div className="h-14 w-14 rounded-full bg-brand text-white inline-flex items-center justify-center text-lg font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 w-full sm:w-auto max-w-full">
            <div className="text-base font-bold truncate">{displayName}</div>
            <div className="text-[13px] text-neutral-500 dark:text-neutral-400 truncate">
              {email || t('cc.guestHint')}
            </div>
            <span className="inline-flex mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-brand-tint text-brand dark:bg-brand/20 dark:text-brand-light">
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Sekmeler */}
        <div className="flex flex-col md:flex-row flex-wrap gap-2 pb-1 mb-5 w-full max-w-full">
          {tabs.map((tb) => (
            <TabButton key={tb.id} active={tab === tb.id} onClick={() => goTab(tb.id)}>
              {tb.label}
            </TabButton>
          ))}
        </div>

        {/*
          "Genel Bakış" sekmesi kaldırıldı: rol yetkileri Oturum sekmesine,
          yönetim paneli bağlantısı da oradaki yönetici kutusuna taşındı.
        */}

        {tab === 'quotes' && canDealerTools && (
          <Panel title={t('cc.quotes.title')} hint={t('cc.quotes.hint')}>
            {teklifYukleniyor && (
              <p className="text-[13px] text-neutral-500 m-0">{t('cc.quotes.loading')}</p>
            )}

            {teklifHata && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 px-3.5 py-2.5 text-[13px] text-red-700 dark:text-red-300">
                {teklifHata}
              </div>
            )}

            {!teklifYukleniyor && !teklifHata && teklifler.length === 0 && (
              <p className="text-[13px] text-neutral-600 dark:text-neutral-300 m-0 leading-relaxed">
                {t('cc.quotes.empty')}
              </p>
            )}

            {teklifler.length > 0 && (
              <ul className="m-0 p-0 list-none flex flex-col gap-2">
                {teklifler.map((q) => (
                  <li
                    key={q.id}
                    className="rounded-xl border border-neutral-200 dark:border-[#39414f] px-3.5 py-3"
                  >
                    <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center justify-between gap-2 md:gap-3 max-w-full">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold truncate">
                          {q.modelCode || t('cc.quotes.noModel')}
                          {q.columns && q.rows ? ` — ${q.columns}×${q.rows}` : ''}
                        </div>
                        <div className="text-[12px] text-neutral-500 dark:text-neutral-400">
                          {tarihMetni(q.createdAt)} · {q.status}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full md:w-auto">
                        <button
                          type="button"
                          onClick={() => setAcikTeklif(acikTeklif === q.id ? null : q.id)}
                          className="rounded-full border border-neutral-300 dark:border-[#39414f] px-4 min-h-[44px] py-2.5 text-[12px] font-semibold hover:border-brand transition-colors whitespace-nowrap inline-flex items-center justify-center w-full sm:w-auto max-w-full"
                        >
                          {acikTeklif === q.id ? t('cc.quotes.hide') : t('cc.quotes.view')}
                        </button>
                        <button
                          type="button"
                          onClick={() => teklifCsvIndir(q)}
                          className="rounded-full border border-neutral-300 dark:border-[#39414f] px-4 min-h-[44px] py-2.5 text-[12px] font-semibold text-neutral-600 dark:text-neutral-300 hover:border-brand hover:text-brand transition-colors whitespace-nowrap inline-flex items-center justify-center w-full sm:w-auto max-w-full"
                        >
                          {t('cc.quotes.csv')}
                        </button>
                        {/* Tasarımı konfigüratörde geri açar — bkz. teklifiDuzenle */}
                        <button
                          type="button"
                          onClick={() => teklifiDuzenle(q)}
                          className="rounded-full bg-brand text-white px-4 min-h-[44px] py-2.5 text-[12px] font-semibold hover:bg-brand-dark transition-colors whitespace-nowrap inline-flex items-center justify-center w-full sm:w-auto max-w-full"
                        >
                          {t('cc.quotes.edit')}
                        </button>
                      </div>
                    </div>

                    {acikTeklif === q.id && (
                      <dl className="mt-3 pt-3 border-t border-neutral-200 dark:border-[#39414f] grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 m-0 text-[12px] max-w-full">
                        {[
                          [t('cc.quotes.f.model'), q.modelCode],
                          [t('cc.quotes.f.wall'), olcuMetni(q.wallWidthM, q.wallHeightM)],
                          [t('cc.quotes.f.grid'), q.columns && q.rows ? `${q.columns} × ${q.rows}` : null],
                          [t('cc.quotes.f.type'), q.screenType],
                          [t('cc.quotes.f.resolution'), q.resolution],
                          [t('cc.quotes.f.miniPc'), teklifteMiniPc(q) ? t('common.yes') : t('common.no')],
                          [t('cc.quotes.f.screens'), q.screensSummary],
                          [t('cc.quotes.f.customer'), q.customerName],
                          [t('cc.quotes.f.note'), q.adminNote],
                        ]
                          .filter(([, v]) => v !== null && v !== undefined && v !== '')
                          .map(([etiket, deger]) => (
                            <div key={etiket} className="contents">
                              <dt className="text-neutral-500 dark:text-neutral-400">{etiket}</dt>
                              <dd className="m-0 break-words">{deger}</dd>
                            </div>
                          ))}
                      </dl>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-col md:flex-row flex-wrap gap-2 max-w-full">
              <a
                href="#"
                onClick={goToConfigurator}
                className="rounded-full bg-brand text-white px-4 min-h-[44px] py-2.5 text-[13px] font-semibold hover:bg-brand-dark transition-colors inline-flex items-center justify-center w-full md:w-auto max-w-full"
              >
                {t('cc.quotes.new')}
              </a>
              <button
                type="button"
                onClick={teklifleriYukle}
                className="rounded-full border border-neutral-300 dark:border-[#39414f] px-4 min-h-[44px] py-2.5 text-[13px] font-semibold hover:border-brand transition-colors w-full md:w-auto max-w-full"
              >
                {t('cc.quotes.refresh')}
              </button>
            </div>
          </Panel>
        )}

        {tab === 'tester' && canTesterTools && (
          <div className="flex flex-col gap-4">
            <Panel title={t('cc.tester.title')} hint={t('cc.tester.hint')}>
              <textarea
                value={bugNote}
                onChange={(e) => setBugNote(e.target.value)}
                rows={4}
                placeholder={t('cc.tester.placeholder')}
                className="w-full max-w-full border border-neutral-300 dark:border-[#39414f] rounded-xl p-3 text-sm bg-transparent focus:outline-none focus:border-brand resize-none"
              />
              <div className="mt-3 flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-2 max-w-full">
                <button
                  type="button"
                  onClick={sendBugReport}
                  disabled={!bugNote.trim() || bugSending}
                  className="rounded-full bg-amber-600 text-white px-4 min-h-[44px] py-2.5 text-[13px] font-semibold hover:bg-amber-700 disabled:opacity-40 transition-colors w-full md:w-auto max-w-full"
                >
                  {bugSending ? t('cc.tester.sending') : t('cc.tester.send')}
                </button>
                {bugSent && <span className="text-[12px] text-emerald-600 dark:text-emerald-400">{t('cc.tester.sent')}</span>}
                {bugError && <span className="text-[12px] text-red-600">{bugError}</span>}
              </div>
            </Panel>
            <Panel title={t('cc.tester.beta')} hint={t('cc.tester.betaHint')}>
              <ul className="m-0 p-0 list-none text-[13px] text-neutral-600 dark:text-neutral-300 flex flex-col gap-1.5">
                <li>• Wizard / öneri sihirbazı</li>
                <li>• 3D / WebXR önizleme</li>
                <li>• PWA çevrimdışı önbellek</li>
              </ul>
            </Panel>
          </div>
        )}

        {tab === 'invite' && !isAuthenticated && (
          <Panel title={t('cc.invite.title')} hint={t('cc.invite.hint')}>
            <form onSubmit={davetGonder} className="flex flex-col gap-3 w-full max-w-sm">
              <label className="block">
                <span className="text-[12px] text-neutral-500">{t('cc.invite.user')}</span>
                <input
                  type="text"
                  required
                  value={davetAd}
                  onChange={(e) => setDavetAd(e.target.value)}
                  placeholder={t('cc.invite.userPlaceholder')}
                  className="w-full max-w-full mt-1 border border-neutral-300 dark:border-[#39414f] rounded-lg px-3 min-h-[44px] py-2 text-sm bg-transparent focus:outline-none focus:border-brand"
                />
              </label>
              <label className="block">
                <span className="text-[12px] text-neutral-500">{t('cc.invite.label')}</span>
                <input
                  type="text"
                  required
                  value={davetKod}
                  onChange={(e) => setDavetKod(e.target.value.toUpperCase())}
                  placeholder="ÖRN. MASAUSTU25"
                  className="w-full max-w-full mt-1 border border-neutral-300 dark:border-[#39414f] rounded-lg px-3 min-h-[44px] py-2 text-sm font-mono tracking-widest bg-transparent focus:outline-none focus:border-brand"
                />
              </label>
              {davetHata && <p className="text-[13px] text-red-600 m-0">{davetHata}</p>}
              <button
                type="submit"
                disabled={davetBusy || !davetKod.trim() || !davetAd.trim()}
                className="rounded-full bg-brand text-white px-4 min-h-[44px] py-2.5 text-sm font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors w-full max-w-full"
              >
                {davetBusy ? t('cc.invite.busy') : t('cc.invite.submit')}
              </button>
            </form>
          </Panel>
        )}

        {tab === 'session' && (
          <div className="flex flex-col gap-4">
            {!isAuthenticated ? (
              <Panel title={t('cc.login.title')} hint={t('cc.login.hint')}>
                <form onSubmit={handleLogin} className="flex flex-col gap-3 w-full max-w-sm">
                  <label className="block">
                    <span className="text-[12px] text-neutral-500">{t('exp.email')}</span>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full max-w-full mt-1 border border-neutral-300 dark:border-[#39414f] rounded-lg px-3 min-h-[44px] py-2 text-sm bg-transparent focus:outline-none focus:border-brand"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] text-neutral-500">{t('cc.login.password')}</span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full max-w-full mt-1 border border-neutral-300 dark:border-[#39414f] rounded-lg px-3 min-h-[44px] py-2 text-sm bg-transparent focus:outline-none focus:border-brand"
                    />
                  </label>

                  {loginError && <p className="text-[13px] text-red-600 m-0">{loginError}</p>}
                  <button
                    type="submit"
                    disabled={loginBusy}
                    className="rounded-full bg-brand text-white px-4 min-h-[44px] py-2.5 text-sm font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors w-full max-w-full"
                  >
                    {loginBusy ? t('cc.login.busy') : t('profile.signIn')}
                  </button>
                </form>
              </Panel>
            ) : (
              <Panel title={t('cc.session.active')} hint={email || displayName}>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-full border border-red-300 text-red-600 px-4 min-h-[44px] py-2.5 text-[13px] font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors w-full md:w-auto max-w-full"
                >
                  {t('profile.logout')}
                </button>
              </Panel>
            )}

            <Panel title={t('cc.overview.access')} hint={t('cc.overview.accessHint')}>
              <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
                <li className="text-[13px] flex items-start gap-2">
                  <span className="text-brand mt-0.5">●</span>
                  <span>{isAdmin ? t('cc.perm.adminYes') : t('cc.perm.adminNo')}</span>
                </li>
                {testerRoleEnabled && (
                <li className="text-[13px] flex items-start gap-2">
                  <span className="text-brand mt-0.5">●</span>
                  <span>{isTester ? t('cc.perm.testerYes') : t('cc.perm.testerNo')}</span>
                </li>
                )}
                <li className="text-[13px] flex items-start gap-2">
                  <span className="text-brand mt-0.5">●</span>
                  <span>{isDealer ? t('cc.perm.dealerYes') : t('cc.perm.dealerNo')}</span>
                </li>
              </ul>
            </Panel>

            {isAdmin && (
              <Panel title={t('cc.adminGate.title')} hint={t('cc.adminGate.hint')}>
                <a href="#yonetim" className="text-[13px] font-semibold text-brand hover:underline inline-flex items-center min-h-[44px] max-w-full">
                  {t('profile.adminPanel')} →
                </a>
              </Panel>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
