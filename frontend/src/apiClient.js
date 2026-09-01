/**
 * Merkezi API istemcisi — geçici 502/503/504 ve ağ kopmalarına karşı
 * otomatik yeniden deneme (retry) + bağlantı durumu olayları.
 *
 * Geliştirmede VITE_API_URL boş bırakılırsa istekler aynı origin'e gider
 * (Vite /api proxy → localhost:5007). Üretimde tam API adresi gerekir.
 */

const ENV_URL = import.meta.env.VITE_API_URL
export const API_URL =
  ENV_URL === undefined || ENV_URL === null
    ? 'http://localhost:5007'
    : String(ENV_URL).replace(/\/$/, '')

const RETRY_STATUSES = new Set([408, 425, 429, 502, 503, 504])
const DEFAULT_RETRIES = 3
const BASE_DELAY_MS = 400

const listeners = new Set()

export function onApiConnectionChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emitConnection(state, detail) {
  listeners.forEach((fn) => {
    try {
      fn(state, detail)
    } catch {
      /* ignore */
    }
  })
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/* --------------------------------------------------------------------------
 * OTURUM KÖPRÜSÜ
 *
 * Erişim jetonu 15 dakikalık, yanında uzun ömürlü bir refresh token duruyor.
 * Refresh uç noktası (POST /api/auth/refresh) baştan beri vardı ama ÇAĞIRAN
 * yoktu: 15 dakika sonra her istek 401 dönüyor, arayüz de "oturumunuzun süresi
 * dolmuş" diyordu. Oysa oturum geçerliydi, yalnızca jeton tazelenmiyordu.
 *
 * Bu köprü SessionProvider tarafından dolduruluyor. apiClient React ağacının
 * dışında olduğu için bağlamı doğrudan okuyamaz; oturumu okuyup yazan iki
 * fonksiyonu buraya bırakmak en az bağ kuran yol.
 * -------------------------------------------------------------------------- */
const SESSION_KEY = 'vds-session'

/*
 * Köprü kurulmamışsa oturum doğrudan localStorage'dan okunur/yazılır.
 *
 * Yalnız savunma amaçlı bir yedek değil, gereklilik: bu modül React ağacından
 * bağımsız yükleniyor ve köprüyü SessionProvider bir effect içinde kuruyor.
 * Modül sırası ya da geliştirmedeki sıcak yeniden yükleme (apiClient yeniden
 * değerlendirilip SessionProvider'ın effect'i tekrar çalışmazsa) yüzünden
 * köprü boş kalabiliyor; o durumda istekler sessizce imzasız gidiyor ve teklif
 * kayıtları yine sahipsiz düşüyordu. localStorage her koşulda orada.
 */
const yedekKopru = {
  oku: () => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  yaz: (next) => {
    try {
      if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next))
      else localStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  },
}

let oturumKopru = yedekKopru

export function setSessionBridge({ oku, yaz }) {
  // Köprü oturumu okuyamıyorsa (henüz kurulmamış/boş) yedeğe düşülür
  oturumKopru = {
    oku: () => oku() ?? yedekKopru.oku(),
    yaz: (next) => {
      yedekKopru.yaz(next)
      yaz(next)
    },
  }
}

// Aynı anda birden çok istek 401 alırsa tek bir tazeleme yapılır; hepsi onu
// bekler. Yoksa her istek ayrı refresh denerdi ve sunucu jetonu rotasyona
// soktuğu için ilki hariç hepsi geçersiz jetonla başarısız olurdu.
let tazelemeSozu = null

async function jetonTazele() {
  const oturum = oturumKopru.oku()
  if (!oturum?.refreshToken) return null

  tazelemeSozu ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: oturum.refreshToken }),
      })
      if (!res.ok) {
        // Refresh de reddedildi: oturum gerçekten bitmiş. Kayıtlı jetonları
        // temizliyoruz ki arayüz "giriş yapın" durumuna düşsün.
        if (res.status === 401) oturumKopru.yaz(null)
        return null
      }
      const data = await res.json()
      const yeni = {
        ...oturum,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        role: data.role || oturum.role,
        email: data.email || oturum.email,
        displayName: data.displayName || oturum.displayName,
      }
      oturumKopru.yaz(yeni)
      return yeni.accessToken
    } catch {
      return null
    } finally {
      // Bir sonraki 401 yeniden denesin diye kilit bırakılıyor
      setTimeout(() => {
        tazelemeSozu = null
      }, 0)
    }
  })()

  return tazelemeSozu
}

function isSafeMethod(method) {
  const m = (method || 'GET').toUpperCase()
  return m === 'GET' || m === 'HEAD' || m === 'OPTIONS'
}

function shouldRetry(attempt, maxRetries, method, error, response) {
  if (attempt >= maxRetries) return false
  if (error) {
    // Ağ / timeout — her metot için tekrar dene (yanıt gelmedi)
    return true
  }
  if (!response) return false
  if (!RETRY_STATUSES.has(response.status)) return false
  // 503 vb. için yalnızca güvenli metotlar (POST teklifini çift yazmamak için)
  return isSafeMethod(method)
}

/** Uygulama seviyesi 503 (ör. Admin yapılandırılmamış) — ağ retry değil. */
async function isNonRetriableAppError(response) {
  if (!response || response.status !== 503) return false
  try {
    const text = await response.clone().text()
    if (!text) return false
    return /Yönetim erişimi|yapılandırılmamış/i.test(text)
  } catch {
    return false
  }
}

/**
 * fetch sarmalayıcısı. İmza fetch ile uyumlu: apiFetch(url, init).
 * init.retry ile deneme sayısı override edilebilir (varsayılan 3).
 * init.auth true ise istek oturum jetonuyla imzalanır; jeton eskimişse
 * (401) bir kez tazelenip istek tekrarlanır.
 */
/*
 * BETA KAPISI DİNLEYİCİSİ.
 *
 * Sunucu beta modundayken yazma uçları 403 + code:"BETA_INVITE_REQUIRED"
 * döndürüyor. Uygulama bunu görüp davet kodu ekranını açabilsin diye tek bir
 * dinleyici tutuluyor; API katmanı arayüzü tanımıyor, yalnızca haber veriyor.
 */
/*
 * Haber tek bir geri çağrı yerine DOM OLAYIYLA veriliyor: tek slotlu
 * dinleyicide, aynı olaya birden çok yerin abone olması gerektiğinde ya da
 * modül iki kez yüklendiğinde bildirim sessizce kayboluyordu.
 */
export const DAVET_OLAYI = 'vds:davet-gerekli'

export async function apiFetch(input, init = {}) {
  const maxRetries = init.retry ?? DEFAULT_RETRIES
  const { retry: _r, auth = false, ...fetchInit } = init
  const method = fetchInit.method || 'GET'

  if (auth) {
    const jeton = oturumKopru.oku()?.accessToken
    if (jeton) fetchInit.headers = { ...fetchInit.headers, Authorization: `Bearer ${jeton}` }
  }

  // Göreli yol ise API_URL önekle (proxy kullanılıyorsa API_URL '' olabilir)
  let url = input
  if (typeof input === 'string' && input.startsWith('/') && API_URL) {
    url = `${API_URL}${input}`
  } else if (typeof input === 'string' && !/^https?:\/\//i.test(input) && API_URL) {
    url = `${API_URL}/${input.replace(/^\//, '')}`
  }

  let lastError = null
  let lastResponse = null
  let tazelendiMi = false

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const userSignal = fetchInit.signal
      const onAbort = () => controller.abort()
      if (userSignal) {
        if (userSignal.aborted) controller.abort()
        else userSignal.addEventListener('abort', onAbort, { once: true })
      }

      const timeoutMs = fetchInit.timeoutMs ?? 20000
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      try {
        let res = await fetch(url, { ...fetchInit, signal: controller.signal })

        /* Beta kapısı: kod isteniyor. Yanıt gövdesi tüketilmiyor, kopyası okunuyor. */
        if (res.status === 403 && typeof window !== 'undefined') {
          try {
            const veri = await res.clone().json()
            if (veri?.code === 'BETA_INVITE_REQUIRED') {
              window.dispatchEvent(new CustomEvent(DAVET_OLAYI, { detail: veri }))
            }
          } catch {
            /* JSON değilse beta kapısı değildir */
          }
        }

        // Jeton eskimişse bir kez tazeleyip aynı isteği tekrarla. Yalnızca
        // imzalı isteklerde ve tek sefer: tazelemeden sonra da 401 geliyorsa
        // sorun jeton değil, yetki demektir.
        if (auth && res.status === 401 && !tazelendiMi) {
          tazelendiMi = true
          const yeniJeton = await jetonTazele()
          if (yeniJeton) {
            fetchInit.headers = { ...fetchInit.headers, Authorization: `Bearer ${yeniJeton}` }
            res = await fetch(url, { ...fetchInit, signal: controller.signal })
          }
        }

        lastResponse = res

        if (await isNonRetriableAppError(res)) {
          emitConnection('ok')
          return res
        }

        if (!shouldRetry(attempt, maxRetries, method, null, res)) {
          if (res.ok || res.status < 500) emitConnection('ok')
          else if (RETRY_STATUSES.has(res.status)) emitConnection('degraded', { status: res.status })
          return res
        }

        emitConnection('retrying', { attempt: attempt + 1, status: res.status })
        await sleep(BASE_DELAY_MS * 2 ** attempt)
      } finally {
        clearTimeout(timer)
        if (userSignal) userSignal.removeEventListener('abort', onAbort)
      }
    } catch (err) {
      lastError = err
      const aborted = err?.name === 'AbortError'
      // Kullanıcı iptali — tekrar deneme
      if (aborted && fetchInit.signal?.aborted) throw err

      if (!shouldRetry(attempt, maxRetries, method, err, null)) {
        emitConnection('offline', { message: err?.message })
        throw err
      }

      emitConnection('retrying', { attempt: attempt + 1, error: err?.message })
      await sleep(BASE_DELAY_MS * 2 ** attempt)
    }
  }

  if (lastResponse) {
    emitConnection('degraded', { status: lastResponse.status })
    return lastResponse
  }

  emitConnection('offline', { message: lastError?.message })
  throw lastError || new Error('API isteği başarısız')
}

/** Kısa yol: JSON GET */
export async function apiGetJson(path, init) {
  const res = await apiFetch(path.startsWith('http') ? path : path.startsWith('/') ? `${API_URL}${path}` : `${API_URL}/${path}`, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || body.title || `HTTP ${res.status}`)
  }
  return res.json()
}
