import { useEffect, useState } from 'react'
import { API_URL, apiFetch } from './apiClient.js'

/**
 * Seçilen modül + ızgara için API hesap motoru önizlemesi
 * (gerçek katalog donanımı).
 */
export function useConfigurationPreview({ cabinId, cols, rows, hasMiniPc, enabled }) {
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || !cabinId || cols < 1 || rows < 1) {
      setPreview(null)
      setError(null)
      return
    }

    const ac = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams({
          cabinId: String(cabinId),
          cols: String(cols),
          rows: String(rows),
          hasMiniPc: hasMiniPc ? 'true' : 'false',
        })
        const res = await apiFetch(`${API_URL}/api/configurations/preview?${qs}`, {
          signal: ac.signal,
        })
        const body = await res.json().catch(() => ({}))
        if (ac.signal.aborted) return
        if (!res.ok) {
          setPreview(null)
          setError(body.detail || body.message || body.title || 'Donanım eşleşmedi.')
          return
        }
        setPreview(body)
        setError(null)
      } catch (e) {
        if (ac.signal.aborted) return
        setPreview(null)
        setError(e.message === 'Failed to fetch' ? 'API bağlantısı yok.' : e.message)
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    }, 280)

    return () => {
      ac.abort()
      clearTimeout(timer)
    }
  }, [cabinId, cols, rows, hasMiniPc, enabled])

  return { preview, error, loading }
}
