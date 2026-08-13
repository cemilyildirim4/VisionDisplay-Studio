import { useEffect, useRef, useState } from 'react'
import { useLang } from './useLang.js'
import { TOPICS, FALLBACK, GREETING, findTopic, alanIlgili, enYakinKonu } from './helpTopics.js'
import { API_URL, apiFetch } from './apiClient.js'



/**
 * Yardım penceresi. Açma düğmesi başlık çubuğunda (App.jsx);
 * pencere sağ altta açılır.
 *
 * Yapay zekâ kullanmaz — helpTopics.js içindeki hazır konularla eşleştirme
 * yapar. Bu yüzden ücretsiz, internetsizdir ve asla uydurma cevap vermez;
 * bilmediğinde bilmediğini söyler.
 */
export default function ChatHelp({ open, onClose }) {
  const { t, lang } = useLang()
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState([])
  // Örnek sorular ilk açılışta görünür, ilk sorudan sonra kapanır
  const [showTips, setShowTips] = useState(true)
  const bodyRef = useRef(null)

  // Dil değişince sohbet sıfırlanır — yarısı Türkçe yarısı İngilizce kalmasın
  useEffect(() => {
    setMsgs([{ who: 'bot', text: GREETING[lang] || GREETING.tr }])
    setShowTips(true)
  }, [lang])

  // Yeni mesaj gelince en alta kaydır
  useEffect(() => {
    if (open && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [msgs, open])

  // Esc ile kapat
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  /*
   * `konu` verilirse eşleştirme HİÇ yapılmaz, doğrudan o konunun cevabı verilir.
   *
   * Önemli: örnek soru listesindeki ve "şunu mu demek istediniz?" önerisindeki
   * düğmeler bu yolu kullanır. Eskiden düğme konunun metnini yazıp yeniden
   * eşleştirmeye sokuyordu; anahtar kelimeleri kendi başlığıyla eşleşmeyen bir
   * konu (ör. "Neler yapabilirsin?") sonsuz döngüye giriyordu: soru → "şunu mu
   * demek istediniz: Neler yapabilirsin?" → tıkla → aynı soru. Ekran
   * görüntüsündeki hata buydu.
   */
  const answer = (text, konu = null) => {
    const topic = konu || findTopic(text, lang)

    /*
     * Cevap bulunamadıysa iki farklı yanıt veriyoruz:
     *   alanımızla ilgili soru → iletişime yönlendir (garanti, servis vb.)
     *   tamamen alakasız soru  → kibarca bilmediğini söyle, iletişim verme
     * Hava durumu soran birine telefon numarası vermek anlamsız olurdu.
     */
    /*
     * Kesin eşleşme yoksa önce TAHMİN et: yazım hatası olabilir.
     * Cevabı doğrudan vermiyoruz — "şunu mu demek istediniz?" diye soruyoruz,
     * kullanıcı onaylıyor. Yanlış tahmin böylece zararsız kalıyor.
     */
    const tahmin = topic ? null : enYakinKonu(text, lang)
    /*
     * Tahmin edilen konunun BAŞLIĞI kullanıcının yazdığının aynısıysa soru
     * sormanın anlamı yok — kullanıcı zaten onu sordu. Böyle durumda doğrudan
     * cevap verilir.
     */
    const ayniMi =
      tahmin && (tahmin.topic.q[lang] || tahmin.topic.q.tr).trim().toLocaleLowerCase(lang) ===
        text.trim().toLocaleLowerCase(lang)
    const dogrudan = topic || (ayniMi ? tahmin.topic : null)
    const oneri = dogrudan ? null : tahmin
    const kutu = dogrudan || oneri ? null : alanIlgili(text) ? FALLBACK.related : FALLBACK.offTopic
    const reply = dogrudan ? dogrudan.a[lang] || dogrudan.a.tr : oneri ? null : kutu[lang] || kutu.tr
    setMsgs((m) => [
      ...m,
      { who: 'me', text },
      oneri
        ? { who: 'bot', text: t('chat.didYouMean'), suggest: oneri.topic }
        : { who: 'bot', text: reply, unknown: !dogrudan && alanIlgili(text) },
    ])
    setShowTips(false) // yer açılsın; kullanıcı isterse başlığa tıklayıp geri açar

    /*
     * Soruyu arka planda kaydet — hangi konuların sorulduğunu görebilmek için.
     * Özellikle CEVAPLANAMAYAN sorular değerli: bilgi tabanına neyin eklenmesi
     * gerektiğini gösteriyorlar.
     *
     * Kayıt BAŞARISIZ OLSA BİLE sohbet aksamaz — kullanıcıyı hiçbir şekilde
     * bekletmiyor, hata da göstermiyoruz. Sunucu kapalıysa sohbet yine çalışır.
     */
    apiFetch(`${API_URL}/api/chatlogs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: text,
        topicId: dogrudan ? dogrudan.id : null,
        answered: !!dogrudan,
        lang,
      }),
    }).catch(() => {}) // sessiz: kayıt tutmak sohbetten önemli değil
  }

  const send = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    answer(text)
  }

  // Öneri listesi: henüz sorulmamış konular
  const asked = new Set(msgs.filter((m) => m.who === 'me').map((m) => m.text))
  const suggestions = TOPICS.filter((tp) => !asked.has(tp.q[lang] || tp.q.tr)).slice(0, 4)

  return (
    <>
      {/* Sohbet penceresi */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[370px] max-h-[min(78vh,560px)] bg-white dark:bg-[#161a21] rounded-2xl shadow-2xl border border-neutral-200 dark:border-[#2c333f] flex flex-col overflow-hidden">
          {/* Başlık */}
          <div className="bg-brand text-white px-4 py-3 flex items-center justify-between shrink-0 relative">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-white dark:bg-[#121821] flex items-center justify-center shrink-0 p-1">
                <img src="/masaustu-logo-isaret.png" alt="" className="w-full h-full object-contain" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight truncate">{t('chat.title')}</div>
                <div className="text-[11px] text-white/70 leading-tight truncate">{t('chat.subtitle')}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('exp.close')}
              className="text-white/70 hover:text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <div className="brand-stripe absolute bottom-0 left-0 right-0 h-[3px]" aria-hidden />
          </div>

          {/* Mesajlar */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto px-3.5 py-3 bg-neutral-50/70 dark:bg-[#12161d] flex flex-col gap-2.5">
            {msgs.map((m, i) =>
              m.who === 'me' ? (
                <div
                  key={i}
                  className="self-end max-w-[88%] text-[13px] leading-relaxed whitespace-pre-line rounded-2xl rounded-br-sm px-3.5 py-2.5 bg-brand text-white"
                >
                  {m.text}
                </div>
              ) : (
                // Bot mesajları logolu — kimin konuştuğu belli olsun
                <div key={i} className="self-start flex items-start gap-2 max-w-[92%]">
                  <img
                    src="/masaustu-logo-isaret.png"
                    alt=""
                    className="w-6 h-6 object-contain shrink-0 mt-0.5"
                  />
                  <div
                    className={`text-[13px] leading-relaxed whitespace-pre-line rounded-2xl rounded-bl-sm px-3.5 py-2.5 border ${
                      m.unknown
                        ? 'bg-amber-50 dark:bg-[#2b2413] text-amber-900 dark:text-amber-200 border-amber-200 dark:border-[#4a3d1c]'
                        : 'bg-white dark:bg-[#161a21] text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-[#2c333f]'
                    }`}
                  >
                    {m.text}

                    {/* Tahmin: kullanıcı onaylayınca o konunun cevabı gelir */}
                    {m.suggest && (
                      <button
                        type="button"
                        onClick={() => answer(m.suggest.q[lang] || m.suggest.q.tr, m.suggest)}
                        className="mt-2 block w-full text-left text-[12.5px] font-medium text-brand dark:text-brand-light bg-brand-tint hover:bg-brand hover:text-white transition-colors rounded-lg px-3 py-2"
                      >
                        {m.suggest.q[lang] || m.suggest.q.tr}
                      </button>
                    )}
                  </div>
                </div>
              ),
            )}

            {/*
              Örnek sorular. İlk açılışta açık (yol göstersin), kullanıcı bir
              soru sorunca kendiliğinden kapanır — sohbetin yerini yemesin.
              Başlığa tıklayarak istenildiği zaman açılıp kapanır.
            */}
            {suggestions.length > 0 && (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => setShowTips((v) => !v)}
                  className="w-full flex items-center justify-between text-[11px] font-semibold tracking-[0.05em] uppercase text-neutral-400 dark:text-neutral-500 hover:text-brand transition-colors py-1"
                >
                  {t('chat.examples')}
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform ${showTips ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showTips && (
                  <div className="flex flex-col gap-1.5 mt-1.5">
                    {suggestions.map((tp) => (
                      <button
                        key={tp.id}
                        type="button"
                        onClick={() => answer(tp.q[lang] || tp.q.tr, tp)}
                        className="text-left text-[12.5px] text-brand dark:text-brand-light bg-brand-tint hover:bg-brand hover:text-white transition-colors rounded-lg px-3 py-2"
                      >
                        {tp.q[lang] || tp.q.tr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Giriş */}
          <form onSubmit={send} className="p-2.5 border-t border-neutral-200 dark:border-[#2c333f] flex items-center gap-2 shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chat.placeholder')}
              className="flex-1 bg-neutral-100 dark:bg-[#222833] rounded-full px-4 py-2 text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label={t('chat.send')}
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                input.trim() ? 'bg-brand text-white hover:bg-brand-dark' : 'bg-neutral-200 dark:bg-[#2c333f] text-neutral-400 dark:text-neutral-500'
              }`}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  )
}
