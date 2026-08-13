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
    return /Yönetim erişimi|Admin:Password|yapılandırılmamış/i.test(text)
  } catch {
    return false
  }
}

/**
 * fetch sarmalayıcısı. İmza fetch ile uyumlu: apiFetch(url, init).
 * init.retry ile deneme sayısı override edilebilir (varsayılan 3).
 */
export async function apiFetch(input, init = {}) {
  const maxRetries = init.retry ?? DEFAULT_RETRIES
  const { retry: _r, ...fetchInit } = init
  const method = fetchInit.method || 'GET'

  // Göreli yol ise API_URL önekle (proxy kullanılıyorsa API_URL '' olabilir)
  let url = input
  if (typeof input === 'string' && input.startsWith('/') && API_URL) {
    url = `${API_URL}${input}`
  } else if (typeof input === 'string' && !/^https?:\/\//i.test(input) && API_URL) {
    url = `${API_URL}/${input.replace(/^\//, '')}`
  }

  let lastError = null
  let lastResponse = null

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
        const res = await fetch(url, { ...fetchInit, signal: controller.signal })
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
