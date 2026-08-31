import { useCallback, useEffect, useState } from 'react'
import { API_URL, apiFetch } from '../apiClient.js'

const inputCls =
  'w-full max-w-full border border-neutral-300 dark:border-[#39414f] dark:bg-[#121821] dark:text-neutral-100 rounded-lg px-2.5 py-2 min-h-[44px] text-sm text-neutral-800 focus:outline-none focus:border-brand'

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">{hint}</span>}
    </label>
  )
}

function Banner({ message }) {
  if (!message) return null
  const ok = message.type === 'ok'
  return (
    <div
      className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
        ok
          ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200'
          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'
      }`}
    >
      {message.text}
    </div>
  )
}

/**
 * Sistem işçilik çarpanı ($USD / m²) — ana yönetim menüsünden açılır.
 */
export default function LaborMultiplierSection({ oturumDustu }) {
  const [labor, setLabor] = useState('')
  const [laborSaved, setLaborSaved] = useState(null)
  const [laborSaving, setLaborSaving] = useState(false)
  const [laborMessage, setLaborMessage] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadLabor = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`${API_URL}/api/settings/labor-cost-multiplier`, { auth: true })
      if (res.status === 401) {
        oturumDustu()
        return
      }
      if (!res.ok) throw new Error('İşçilik çarpanı alınamadı.')
      const body = await res.json()
      const value = Number(body.value)
      setLabor(Number.isFinite(value) ? String(value) : '1')
      setLaborSaved(Number.isFinite(value) ? value : 1)
    } catch (e) {
      setLaborMessage({ type: 'err', text: e.message })
    } finally {
      setLoading(false)
    }
  }, [oturumDustu])

  useEffect(() => {
    loadLabor()
  }, [loadLabor])

  const saveLabor = async () => {
    const value = Number(labor)
    if (!Number.isFinite(value) || value < 0) {
      setLaborMessage({ type: 'err', text: 'İşçilik çarpanı 0 veya daha büyük bir sayı olmalı.' })
      return
    }
    setLaborSaving(true)
    setLaborMessage(null)
    try {
      const res = await apiFetch(`${API_URL}/api/settings/labor-cost-multiplier`, {
        method: 'PUT',
        auth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      })
      if (res.status === 401) {
        oturumDustu()
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Kaydedilemedi.')
      }
      const body = await res.json()
      setLaborSaved(Number(body.value))
      setLabor(String(body.value))
      setLaborMessage({ type: 'ok', text: 'İşçilik çarpanı güncellendi.' })
    } catch (e) {
      setLaborMessage({ type: 'err', text: e.message })
    } finally {
      setLaborSaving(false)
    }
  }

  const laborDirty = laborSaved !== null && Number(labor) !== Number(laborSaved)

  return (
    <div>
      <Banner message={laborMessage} />
      <div className="bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-xl p-5 max-w-2xl">
        <h2 className="text-sm font-bold m-0 mb-1">İşçilik Çarpanı</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0 mb-4">
          Yeni teklif ve kayıtlı projelerde ekran alanı (m²) bu değerle çarpılır. Birim: $USD / m².
        </p>
        {loading && laborSaved === null ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 m-0">Yükleniyor…</p>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1">
              <Field label="İşçilik ($USD / m²)" hint="Örn. 50 → 10 m² duvar için 500 USD işçilik">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={labor}
                    onChange={(e) => setLabor(e.target.value)}
                    className={inputCls}
                  />
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 shrink-0 whitespace-nowrap">USD / m²</span>
                </div>
              </Field>
            </div>
            <button
              type="button"
              onClick={saveLabor}
              disabled={laborSaving || !laborDirty}
              className="rounded-full bg-brand text-white text-sm font-semibold px-5 py-2.5 min-h-[44px] hover:bg-brand-dark disabled:bg-neutral-300 w-full sm:w-auto shrink-0"
            >
              {laborSaving ? 'Kaydediliyor…' : 'Çarpanı kaydet'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
