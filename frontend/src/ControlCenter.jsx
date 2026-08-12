import { useEffect, useMemo, useState } from 'react'
import { useLang } from './useLang.js'
import { useTheme } from './useTheme.js'
import { useSession } from './SessionContext.jsx'
import { BrandMark, BrandStripe } from './BrandChrome.jsx'
import { API_URL, apiFetch } from './apiClient.js'



function parseTabFromHash() {
  try {
    const q = window.location.hash.split('?')[1] || ''
    const params = new URLSearchParams(q)
    return params.get('tab') || 'overview'
  } catch {
    return 'overview'
  }
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
  const { theme, toggle: toggleTheme } = useTheme()
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
    ROLES: R,
  } = useSession()

  const [tab, setTab] = useState(parseTabFromHash)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [loginError, setLoginError] = useState(null)
  const [bugNote, setBugNote] = useState('')
  const [bugSent, setBugSent] = useState(false)

  useEffect(() => {
    const onHash = () => setTab(parseTabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const goTab = (next) => {
    setTab(next)
    const base = window.location.pathname + window.location.search
    window.history.replaceState(null, '', `${base}#hesap?tab=${next}`)
  }

  const tabs = useMemo(() => {
    const list = [{ id: 'overview', label: t('cc.tab.overview') }]
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
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
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
      goTab('overview')
    } catch {
      setLoginError(t('cc.login.network'))
    } finally {
      setLoginBusy(false)
    }
  }

  const sendBugReport = () => {
    if (!bugNote.trim()) return
    // Beta: tarayıcı konsoluna yapılandırılmış kayıt; ileride /api/chat-logs'a bağlanabilir.
    console.info('[TesterBugReport]', {
      note: bugNote.trim(),
      role,
      url: window.location.href,
      time: new Date().toISOString(),
      userAgent: navigator.userAgent,
    })
    setBugSent(true)
    setBugNote('')
    setTimeout(() => setBugSent(false), 2500)
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

        {tab === 'overview' && (
          <div className="flex flex-col gap-4">
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

            <Panel title={t('cc.overview.prefs')} hint={t('cc.overview.prefsHint')}>
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-full border border-neutral-300 dark:border-[#39414f] px-4 py-2 text-[13px] font-semibold hover:border-brand hover:text-brand transition-colors"
              >
                {theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
              </button>
            </Panel>

            {isAdmin && (
              <Panel title={t('cc.overview.admin')} hint={t('cc.overview.adminHint')}>
                <a
                  href="#yonetim"
                  className="inline-flex rounded-full bg-brand text-white px-4 py-2 text-[13px] font-semibold hover:bg-brand-dark transition-colors"
                >
                  {t('profile.adminPanel')}
                </a>
              </Panel>
            )}
          </div>
        )}

        {tab === 'quotes' && canDealerTools && (
          <Panel title={t('cc.quotes.title')} hint={t('cc.quotes.hint')}>
            <p className="text-[13px] text-neutral-600 dark:text-neutral-300 m-0 leading-relaxed">
              {t('cc.quotes.body')}
            </p>
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
                  disabled={!bugNote.trim()}
                  className="rounded-full bg-amber-600 text-white px-4 py-2 text-[13px] font-semibold hover:bg-amber-700 disabled:opacity-40 transition-colors"
                >
                  {t('cc.tester.send')}
                </button>
                {bugSent && <span className="text-[12px] text-emerald-600 dark:text-emerald-400">{t('cc.tester.sent')}</span>}
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
              <Panel title={t('cc.login.title')} hint={t('cc.login.hint')}>
                <form onSubmit={handleLogin} className="flex flex-col gap-3 max-w-sm">
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
                  {loginError && <p className="text-[13px] text-red-600 m-0">{loginError}</p>}
                  <button
                    type="submit"
                    disabled={loginBusy}
                    className="rounded-full bg-brand text-white px-4 py-2.5 text-sm font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors"
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
                  className="rounded-full border border-red-300 text-red-600 px-4 py-2 text-[13px] font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  {t('profile.logout')}
                </button>
              </Panel>
            )}

            {/* Beta: rol simülasyonu — canlıda kaldırılabilir / admin-only yapılabilir */}
            <Panel title={t('cc.demo.title')} hint={t('cc.demo.hint')}>
              <div className="flex flex-wrap gap-2">
                {[R.GUEST, R.DEALER, R.TESTER, R.ADMIN].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      if (r === R.GUEST) {
                        setDemoRole(R.GUEST)
                        setSessionData(null)
                      } else {
                        setDemoRole(r)
                        setSessionData({
                          displayName: t(`role.${r.toLowerCase()}`),
                          email: null,
                          role: r,
                          demo: true,
                        })
                      }
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold border transition-colors ${
                      role === r
                        ? 'btn-selected border'
                        : 'border-neutral-300 dark:border-[#39414f] text-neutral-700 dark:text-neutral-300 hover:border-brand'
                    }`}
                  >
                    {t(`role.${r.toLowerCase()}`)}
                  </button>
                ))}
              </div>
            </Panel>

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
