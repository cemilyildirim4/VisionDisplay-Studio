import { useMemo, useState } from 'react'
import { API_URL, apiFetch } from './apiClient.js'

const EMPTY = {
  storeName: '',
  panelType: '',
  panelCount: '',
  dailyHours: '',
  daysPerMonth: '30',
  wattsPerSquareMeter: '',
  totalSquareMeters: '',
  pricePerKwh: '',
}

function numOrNull(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * LED ekran enerji tüketim hesabı.
 * Günlük kWh = m² × W/m² × saat / 1000.
 */
export default function EnergyEstimate({ defaults }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const seeded = useMemo(() => ({
    ...EMPTY,
    storeName: defaults?.storeName || '',
    panelType: defaults?.panelType || '',
    panelCount: defaults?.panelCount ?? '',
    totalSquareMeters: defaults?.totalSquareMeters ?? '',
    wattsPerSquareMeter: defaults?.wattsPerSquareMeter ?? '',
    dailyHours: defaults?.dailyHours ?? '',
    daysPerMonth: defaults?.daysPerMonth ?? '30',
    pricePerKwh: defaults?.pricePerKwh ?? '',
  }), [defaults])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function calculate(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setResult(null)
    const body = {
      storeName: form.storeName.trim() || null,
      panelType: form.panelType.trim() || null,
      panelCount: numOrNull(form.panelCount),
      dailyHours: numOrNull(form.dailyHours),
      daysPerMonth: numOrNull(form.daysPerMonth),
      wattsPerSquareMeter: numOrNull(form.wattsPerSquareMeter),
      totalSquareMeters: numOrNull(form.totalSquareMeters),
      pricePerKwh: numOrNull(form.pricePerKwh),
    }
    try {
      const res = await apiFetch(`${API_URL}/api/energy/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const fields = Array.isArray(data.missingFields) ? data.missingFields.join(', ') : ''
        setError(data.detail || (fields ? `Eksik parametre: ${fields}.` : 'Hesaplama yapılamadı.'))
        return
      }
      setResult(data)
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'API bağlantısı yok.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          setForm(seeded)
          setResult(null)
          setError('')
        }}
        className="w-full rounded-full text-[15px] font-semibold py-2.5 border border-brand text-brand hover:bg-brand-tint transition-colors"
      >
        LED enerji tüketimi
      </button>
      {open && (
        <form onSubmit={calculate} className="mt-3 space-y-2 text-[13px]">
          <p className="m-0 text-neutral-500 dark:text-neutral-400">Eksik alan bırakılırsa hangi bilginin gerektiği söylenir.</p>
          <label className="block">Mağaza / proje adı
            <input value={form.storeName} onChange={set('storeName')} className="mt-1 w-full border rounded-lg px-2 py-2 dark:bg-[#121821] dark:border-[#39414f]" />
          </label>
          <label className="block">Panel tipi
            <input value={form.panelType} onChange={set('panelType')} placeholder="P 2.5" className="mt-1 w-full border rounded-lg px-2 py-2 dark:bg-[#121821] dark:border-[#39414f]" />
          </label>
          <label className="block">Panel sayısı (adet)
            <input type="number" min="1" value={form.panelCount} onChange={set('panelCount')} className="mt-1 w-full border rounded-lg px-2 py-2 dark:bg-[#121821] dark:border-[#39414f]" />
          </label>
          <label className="block">Günlük çalışma saati
            <input type="number" min="0" step="0.1" value={form.dailyHours} onChange={set('dailyHours')} className="mt-1 w-full border rounded-lg px-2 py-2 dark:bg-[#121821] dark:border-[#39414f]" />
          </label>
          <label className="block">Aylık gün sayısı
            <input type="number" min="1" value={form.daysPerMonth} onChange={set('daysPerMonth')} className="mt-1 w-full border rounded-lg px-2 py-2 dark:bg-[#121821] dark:border-[#39414f]" />
          </label>
          <label className="block">1 m² saatlik tüketim (Watt)
            <input type="number" min="0" step="0.01" value={form.wattsPerSquareMeter} onChange={set('wattsPerSquareMeter')} className="mt-1 w-full border rounded-lg px-2 py-2 dark:bg-[#121821] dark:border-[#39414f]" />
          </label>
          <label className="block">Toplam LED m²
            <input type="number" min="0" step="0.01" value={form.totalSquareMeters} onChange={set('totalSquareMeters')} className="mt-1 w-full border rounded-lg px-2 py-2 dark:bg-[#121821] dark:border-[#39414f]" />
          </label>
          <label className="block">Elektrik ücreti (₺ / kWh)
            <input type="number" min="0" step="0.01" value={form.pricePerKwh} onChange={set('pricePerKwh')} className="mt-1 w-full border rounded-lg px-2 py-2 dark:bg-[#121821] dark:border-[#39414f]" />
          </label>
          {error && <p className="m-0 text-amber-800 dark:text-amber-200">{error}</p>}
          {result && (
            <div className="rounded-lg border border-neutral-200 dark:border-[#2c333f] p-3 space-y-1">
              <div>Günlük: {result.dailyKwh} kWh · ₺{result.dailyCostTry}</div>
              <div>Aylık: {result.monthlyKwh} kWh · ₺{result.monthlyCostTry}</div>
            </div>
          )}
          <button type="submit" disabled={busy} className="w-full rounded-full bg-brand text-white font-semibold py-2 disabled:opacity-60">
            {busy ? 'Hesaplanıyor…' : 'Hesapla'}
          </button>
        </form>
      )}
    </div>
  )
}
