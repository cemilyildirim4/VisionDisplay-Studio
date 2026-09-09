/**
 * GİRİŞ KAPISI — konfigüratör açılmadan önce oturum isteniyor.
 *
 * NEDEN: site herkese açıktı; davet kodu yalnızca sunucu 403 döndürdüğünde
 * soruluyordu. Artık erişim baştan kapalı: sayfaya giren önce kimliğini
 * söylüyor. Kimliksiz kimse konfigüratörü görmüyor.
 *
 * İKİ YOL, TEK EKRAN:
 *   • Davet kodu — kullanıcı adı + kod (POST /api/auth/guest). Sunucu o ad
 *     için bir BAYİ hesabı açıyor ve normal jetonları veriyor.
 *   • E-posta / parola — mevcut bayi hesabı (POST /api/auth/login).
 *
 * Yönetim (#yonetim) ve hesap (#hesap) sayfaları bu kapının dışında: onların
 * kendi giriş ekranı var, aksi hâlde admin de içeri giremezdi.
 */

import { useState } from 'react'
import { API_URL, apiFetch } from './apiClient.js'
import { useLang } from './useLang.js'
import { useSession } from './SessionContext.jsx'
import { BrandMark, BrandStripe } from './BrandChrome.jsx'

export default function GirisKapisi() {
  const { t } = useLang()
  const { setSessionData } = useSession()

  const [kip, setKip] = useState('davet') // 'davet' | 'parola'
  const [ad, setAd] = useState('')
  const [kod, setKod] = useState('')
  const [eposta, setEposta] = useState('')
  const [parola, setParola] = useState('')
  const [hata, setHata] = useState(null)
  const [gonderiliyor, setGonderiliyor] = useState(false)

  const girisAlan = 'w-full mt-1 rounded-lg border border-neutral-300 dark:border-[#39414f] bg-transparent px-3 min-h-[46px] py-2 text-[15px] focus:outline-none focus:border-brand'

  /** Yanıttaki jetonları oturuma yazar; iki yol da aynı yanıt biçimini döner. */
  const oturumaYaz = (veri, yedekAd) =>
    setSessionData({
      accessToken: veri.accessToken,
      refreshToken: veri.refreshToken,
      role: veri.role || 'Dealer',
      email: veri.email || null,
      displayName: veri.displayName || yedekAd,
      /* Davet kodunda kayıtlı firma bilgileri; PDF/teklif bunları kullanıyor. */
      firma: veri.companyName || null,
      firmaTelefon: veri.companyPhone || null,
      firmaEposta: veri.companyEmail || null,
      firmaNot: veri.companyNote || null,
    })

  const gonder = async (e) => {
    e.preventDefault()
    if (gonderiliyor) return
    setGonderiliyor(true)
    setHata(null)
    try {
      const davet = kip === 'davet'
      const res = await apiFetch(`${API_URL}/api/auth/${davet ? 'guest' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          davet
            ? { code: kod.trim(), userName: ad.trim() }
            : { email: eposta.trim(), password: parola },
        ),
      })
      const veri = await res.json().catch(() => ({}))
      if (!res.ok) {
        setHata(veri.message || t(davet ? 'cc.invite.invalid' : 'cc.login.failed'))
        return
      }
      oturumaYaz(veri, davet ? ad.trim() : eposta.trim())
    } catch {
      setHata(t('cc.invite.network'))
    } finally {
      setGonderiliyor(false)
    }
  }

  const hazir = kip === 'davet' ? ad.trim() && kod.trim() : eposta.trim() && parola

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#12161d] flex flex-col">
      <BrandStripe />
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px]">
          {/* Marka imzası ortada: BrandMark kendi yazısını da çiziyor, yanına ikinci başlık koymak sıkışıklık yaratıyordu. */}
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <BrandMark />
            <p className="m-0 text-[13.5px] text-neutral-500 dark:text-neutral-400">{t('gate.subtitle')}</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 dark:border-[#2c333f] bg-white dark:bg-[#161a21] p-5">
            {/* Davet kodu ↔ e-posta/parola */}
            <div className="mb-4 inline-flex w-full rounded-full border border-neutral-200 dark:border-[#39414f] p-0.5">
              {[
                { id: 'davet', label: t('gate.tabInvite') },
                { id: 'parola', label: t('gate.tabPassword') },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setKip(m.id); setHata(null) }}
                  className={`flex-1 rounded-full px-3 py-2 min-h-[40px] text-[13.5px] font-semibold transition-colors ${
                    kip === m.id ? 'bg-brand text-white' : 'text-neutral-600 dark:text-neutral-300 hover:text-brand'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <form onSubmit={gonder} className="flex flex-col gap-3">
              {kip === 'davet' ? (
                <>
                  <label className="block">
                    <span className="text-[12px] text-neutral-500 dark:text-neutral-400">{t('cc.invite.user')}</span>
                    <input
                      autoFocus
                      required
                      value={ad}
                      onChange={(e) => setAd(e.target.value)}
                      placeholder={t('cc.invite.userPlaceholder')}
                      className={girisAlan}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] text-neutral-500 dark:text-neutral-400">{t('cc.invite.label')}</span>
                    <input
                      required
                      value={kod}
                      onChange={(e) => setKod(e.target.value.toUpperCase())}
                      placeholder="ÖRN. MASAUSTU25"
                      className={`${girisAlan} font-mono tracking-widest`}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="block">
                    <span className="text-[12px] text-neutral-500 dark:text-neutral-400">{t('exp.email')}</span>
                    <input
                      autoFocus
                      required
                      type="email"
                      autoComplete="email"
                      value={eposta}
                      onChange={(e) => setEposta(e.target.value)}
                      className={girisAlan}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] text-neutral-500 dark:text-neutral-400">{t('cc.login.password')}</span>
                    <input
                      required
                      type="password"
                      autoComplete="current-password"
                      value={parola}
                      onChange={(e) => setParola(e.target.value)}
                      className={girisAlan}
                    />
                  </label>
                </>
              )}

              {hata && <p className="m-0 text-[13px] text-red-600 dark:text-red-400">{hata}</p>}

              <button
                type="submit"
                disabled={gonderiliyor || !hazir}
                className="mt-1 w-full rounded-full bg-brand text-white text-[15px] font-semibold py-3 hover:bg-brand-dark disabled:opacity-50 transition-colors"
              >
                {gonderiliyor ? t('cc.invite.busy') : t('profile.signIn')}
              </button>
            </form>
          </div>

          <p className="mt-4 mb-0 text-center text-[12.5px] leading-snug text-neutral-500 dark:text-neutral-400">
            {t('gate.help')}
          </p>
        </div>
      </div>
    </div>
  )
}
