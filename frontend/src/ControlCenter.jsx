import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLang } from './useLang.js'
import { useSession } from './SessionContext.jsx'
import { BrandMark, BrandStripe } from './BrandChrome.jsx'
import { API_URL, apiFetch } from './apiClient.js'



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

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors ${
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
    <section className="border border-neutral-200 dark:border-[#2a3342] rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#121821]">
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
    isAuthenticated,
    setDemoRole,
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
  const [bugNote, setBugNote] = useState('')
  const [bugSent, setBugSent] = useState(false)
  const [bugSending, setBugSending] = useState(false)
  const [bugError, setBugError] = useState(null)
  /*
   * KAYIT
   *
   * Aynı panelde giriş ile kayıt arasında geçiş yapılıyor: oturum açmak için
   * önce hesap gerekiyordu ama hesabı açacak bir yer yoktu.
   *
   * Kayıt HERKESE açık ve açılan hesap "bayi" rolünde. Personel erişim kodu
   * alanı isteğe bağlı: doğru kod girilirse hesap tester/yönetici olarak
   * açılır, kodu bilmeyen normal bayi hesabı almaya devam eder.
   */
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

  const [mod, setMod] = useState('login') // 'login' | 'register'
  const [regName, setRegName] = useState('')
  const [regPassword2, setRegPassword2] = useState('')
  const [regStaffCode, setRegStaffCode] = useState('')
  // Formun en üstünde seçilen sıfat: bayi / tester / yönetici
  const [secilenRol, setSecilenRol] = useState(R.DEALER)
  const personelMi = secilenRol === R.TESTER

  useEffect(() => {
    const onHash = () => setTab(parseTabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

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
    return list
  }, [canDealerTools, canTesterTools, t])

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
      setDemoRole(null)
      goTab('session')
    } catch {
      setLoginError(t('cc.login.network'))
    } finally {
      setLoginBusy(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (loginBusy) return
    if (loginPassword !== regPassword2) {
      setLoginError(t('cc.reg.mismatch'))
      return
    }
    setLoginBusy(true)
    setLoginError(null)
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          displayName: regName || null,
          // Kod yalnızca Tester seçilince gönderilir; Admin kaydı bu uçtan açılamaz.
          staffCode: personelMi ? regStaffCode.trim() : null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setLoginError(body.message || t('cc.reg.failed'))
        return
      }
      const data = await res.json()
      setSessionData({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        role: data.role || R.DEALER,
        email: data.email || loginEmail,
        displayName: data.displayName || regName || data.email || loginEmail,
      })
      setDemoRole(null)
      goTab('session')
    } catch {
      setLoginError(t('cc.login.network'))
    } finally {
      setLoginBusy(false)
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
      <header className="border-b border-neutral-200/80 dark:border-[#2a3342] bg-white dark:bg-[#121821] px-4 sm:px-8 py-4 flex items-center justify-between gap-3">
        <BrandMark title={t('cc.title')} subtitle={t('app.tagline')} size="lg" />
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
            window.dispatchEvent(new Event('hashchange'))
          }}
          className="text-[13px] font-semibold text-brand hover:underline shrink-0"
        >
          ← {t('cc.back')}
        </a>
      </header>
      <BrandStripe />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 brand-page-enter">
        {/* Kimlik şeridi */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-14 w-14 rounded-full bg-brand text-white inline-flex items-center justify-center text-lg font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
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
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5">
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
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold truncate">
                          {q.modelCode || t('cc.quotes.noModel')}
                          {q.columns && q.rows ? ` — ${q.columns}×${q.rows}` : ''}
                        </div>
                        <div className="text-[12px] text-neutral-500 dark:text-neutral-400">
                          {tarihMetni(q.createdAt)} · {q.status}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAcikTeklif(acikTeklif === q.id ? null : q.id)}
                        className="rounded-full border border-neutral-300 dark:border-[#39414f] px-3.5 py-1.5 text-[12px] font-semibold hover:border-brand transition-colors whitespace-nowrap"
                      >
                        {acikTeklif === q.id ? t('cc.quotes.hide') : t('cc.quotes.view')}
                      </button>
                    </div>

                    {acikTeklif === q.id && (
                      <dl className="mt-3 pt-3 border-t border-neutral-200 dark:border-[#39414f] grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 m-0 text-[12px]">
                        {[
                          [t('cc.quotes.f.model'), q.modelCode],
                          [t('cc.quotes.f.wall'), olcuMetni(q.wallWidthM, q.wallHeightM)],
                          [t('cc.quotes.f.grid'), q.columns && q.rows ? `${q.columns} × ${q.rows}` : null],
                          [t('cc.quotes.f.type'), q.screenType],
                          [t('cc.quotes.f.resolution'), q.resolution],
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

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  window.history.replaceState(null, '', window.location.pathname + window.location.search)
                  window.dispatchEvent(new Event('hashchange'))
                }}
                className="rounded-full bg-brand text-white px-4 py-2 text-[13px] font-semibold hover:bg-brand-dark transition-colors"
              >
                {t('cc.quotes.new')}
              </a>
              <button
                type="button"
                onClick={teklifleriYukle}
                className="rounded-full border border-neutral-300 dark:border-[#39414f] px-4 py-2 text-[13px] font-semibold hover:border-brand transition-colors"
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
                className="w-full border border-neutral-300 dark:border-[#39414f] rounded-xl p-3 text-sm bg-transparent focus:outline-none focus:border-brand resize-none"
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={sendBugReport}
                  disabled={!bugNote.trim() || bugSending}
                  className="rounded-full bg-amber-600 text-white px-4 py-2 text-[13px] font-semibold hover:bg-amber-700 disabled:opacity-40 transition-colors"
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

        {tab === 'session' && (
          <div className="flex flex-col gap-4">
            {!isAuthenticated ? (
              <Panel
                title={mod === 'login' ? t('cc.login.title') : t('cc.reg.title')}
                hint={mod === 'login' ? t('cc.login.hint') : t('cc.reg.hint')}
              >
                <form
                  onSubmit={mod === 'login' ? handleLogin : handleRegister}
                  className="flex flex-col gap-3 max-w-sm"
                >
                  {/*
                    ROL SEÇİMİ — formun en üstünde: önce hangi sıfatla devam
                    edileceği seçiliyor.

                    KAYIT sırasında tester seçilirse erişim kodu sorulur.
                    Yönetici hesabı kayıt ekranından açılamaz.
                    GİRİŞTE kod sorulmaz, rol zaten hesabın kendisinde yazılı.
                  */}
                  <div>
                    <span className="text-[12px] text-neutral-500">{t('cc.role.pick')}</span>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                    {[...(mod === 'register' ? [R.DEALER, R.TESTER] : [R.DEALER, R.TESTER, R.ADMIN])].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            setSecilenRol(r)
                            setRegStaffCode('')
                            setLoginError(null)
                          }}
                          className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold border transition-colors ${
                            secilenRol === r
                              ? 'btn-selected border'
                              : 'border-neutral-300 dark:border-[#39414f] text-neutral-700 dark:text-neutral-300 hover:border-brand'
                          }`}
                        >
                          {t(`role.${r.toLowerCase()}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {mod === 'register' && (
                    <label className="block">
                      <span className="text-[12px] text-neutral-500">{t('cc.reg.name')}</span>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full mt-1 border border-neutral-300 dark:border-[#39414f] rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-brand"
                      />
                    </label>
                  )}
                  <label className="block">
                    <span className="text-[12px] text-neutral-500">{t('exp.email')}</span>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full mt-1 border border-neutral-300 dark:border-[#39414f] rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-brand"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] text-neutral-500">{t('cc.login.password')}</span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full mt-1 border border-neutral-300 dark:border-[#39414f] rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-brand"
                    />
                  </label>

                  {mod === 'register' && (
                    <>
                      <label className="block">
                        <span className="text-[12px] text-neutral-500">{t('cc.reg.password2')}</span>
                        <input
                          type="password"
                          required
                          minLength={8}
                          value={regPassword2}
                          onChange={(e) => setRegPassword2(e.target.value)}
                          className="w-full mt-1 border border-neutral-300 dark:border-[#39414f] rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-brand"
                        />
                      </label>

                      {/* Yalnızca tester hesabı AÇARKEN sorulur */}
                      {personelMi && (
                        <label className="block">
                          <span className="text-[12px] text-neutral-500">{t('cc.role.code')}</span>
                          <input
                            type="password"
                            required
                            autoComplete="off"
                            value={regStaffCode}
                            onChange={(e) => setRegStaffCode(e.target.value)}
                            className="w-full mt-1 border border-neutral-300 dark:border-[#39414f] rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-brand"
                          />
                        </label>
                      )}
                    </>
                  )}

                  {loginError && <p className="text-[13px] text-red-600 m-0">{loginError}</p>}
                  <button
                    type="submit"
                    disabled={loginBusy}
                    className="rounded-full bg-brand text-white px-4 py-2.5 text-sm font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors"
                  >
                    {loginBusy
                      ? t('cc.login.busy')
                      : mod === 'login'
                        ? t('profile.signIn')
                        : t('cc.reg.submit')}
                  </button>

                  {/*
                    Kayıt buradan açılıyor: giriş yapmaya gelen ama hesabı
                    olmayan kişi tam ihtiyaç duyduğu anda görüyor. Profil
                    menüsünde ayrı bir "Kayıt ol" satırı yok.
                  */}
                  <p className="text-[13px] text-neutral-500 dark:text-neutral-400 m-0">
                    {mod === 'login' ? t('cc.reg.noAccount') : t('cc.reg.haveAccount')}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        const next = mod === 'login' ? 'register' : 'login'
                        if (next === 'register' && secilenRol === R.ADMIN) setSecilenRol(R.DEALER)
                        setMod(next)
                        setLoginError(null)
                      }}
                      className="font-semibold text-brand hover:underline underline-offset-2"
                    >
                      {mod === 'login' ? t('cc.reg.title') : t('profile.signIn')}
                    </button>
                  </p>
                </form>
              </Panel>
            ) : (
              <Panel title={t('cc.session.active')} hint={email || displayName}>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-full border border-red-300 text-red-600 px-4 py-2 text-[13px] font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
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
                <li className="text-[13px] flex items-start gap-2">
                  <span className="text-brand mt-0.5">●</span>
                  <span>{isTester ? t('cc.perm.testerYes') : t('cc.perm.testerNo')}</span>
                </li>
                <li className="text-[13px] flex items-start gap-2">
                  <span className="text-brand mt-0.5">●</span>
                  <span>{isDealer ? t('cc.perm.dealerYes') : t('cc.perm.dealerNo')}</span>
                </li>
              </ul>
            </Panel>

            {/*
              "Beta: rol simülasyonu" paneli KALDIRILDI. Rol seçimi artık
              giriş/kayıt formunun en üstünde ve gerçek doğrulamaya bağlı:
              tıklamayla rol değiştirmek yerine tester/yönetici erişim kodunu
              girmek gerekiyor. İki ayrı yerde rol belirlemek hem kafa
              karıştırıyor hem de yetkiyi kontrolsüz veriyordu.
            */}

            {isAdmin && (
              <Panel title={t('cc.adminGate.title')} hint={t('cc.adminGate.hint')}>
                <a href="#yonetim" className="text-[13px] font-semibold text-brand hover:underline">
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
