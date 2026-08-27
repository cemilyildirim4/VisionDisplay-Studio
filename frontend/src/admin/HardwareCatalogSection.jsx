import { useCallback, useEffect, useState } from 'react'
import { API_URL, apiFetch } from '../apiClient.js'

const KINDS = [
  { key: 'power-supplies', label: 'Güç Kaynağı' },
  { key: 'mini-pcs', label: 'Mini PC' },
  { key: 'patch-cables', label: 'Patch Kablosu' },
  { key: 'receiving-cards', label: 'Alıcı Kart' },
  { key: 'processors', label: 'İşlemci' },
]

const BLANK_HW = {
  name: '',
  model: '',
  price: 0,
  powerDrawWatt: 0,
  heatDissipationBTU: 0,
  efficiencyPercent: 100,
}

const inputCls =
  'w-full max-w-full border border-neutral-300 dark:border-[#39414f] dark:bg-[#121821] dark:text-neutral-100 rounded-lg px-2.5 py-2 min-h-[44px] text-sm text-neutral-800 focus:outline-none focus:border-brand'

const money = (v) =>
  v === null || v === undefined
    ? '—'
    : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`

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
  return (
    <div
      className={`mb-5 rounded-lg px-4 py-3 text-sm ${
        message.type === 'ok'
          ? 'border border-green-200 bg-green-50 text-green-700'
          : 'border border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {message.text}
    </div>
  )
}

function toForm(item) {
  return {
    name: item.name ?? '',
    model: item.model ?? '',
    price: item.price ?? 0,
    powerDrawWatt: item.powerDrawWatt ?? 0,
    heatDissipationBTU: item.heatDissipationBTU ?? 0,
    efficiencyPercent: Math.round(Number(item.efficiencyRatio ?? 1) * 10000) / 100,
  }
}

function toPayload(form) {
  const pct = Number(form.efficiencyPercent)
  return {
    name: form.name,
    model: form.model || null,
    price: Number(form.price),
    powerDrawWatt: Number(form.powerDrawWatt),
    heatDissipationBTU: Number(form.heatDissipationBTU),
    efficiencyRatio: Number.isFinite(pct) ? pct / 100 : 1,
  }
}

/**
 * Donanım kataloğu (5 parça) + sistem işçilik çarpanı ($USD/m²).
 * AdminPanel Ürün grubundaki "Donanım" sekmesinde kullanılır.
 */
export default function HardwareCatalogSection({ oturumDustu, askConfirm }) {
  const [kind, setKind] = useState('power-supplies')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)

  const [labor, setLabor] = useState('')
  const [laborSaved, setLaborSaved] = useState(null)
  const [laborSaving, setLaborSaving] = useState(false)
  const [laborMessage, setLaborMessage] = useState(null)

  const kindMeta = KINDS.find((k) => k.key === kind) ?? KINDS[0]

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`${API_URL}/api/hardware/${kind}`, { auth: true })
      if (res.status === 401) {
        oturumDustu()
        return
      }
      if (!res.ok) throw new Error('Liste alınamadı.')
      setItems(await res.json())
    } catch (e) {
      setMessage({ type: 'err', text: e.message })
    } finally {
      setLoading(false)
    }
  }, [kind, oturumDustu])

  const loadLabor = useCallback(async () => {
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
    }
  }, [oturumDustu])

  useEffect(() => {
    loadItems()
  }, [loadItems])

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

  const saveItem = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await apiFetch(
        modal.id ? `${API_URL}/api/hardware/${kind}/${modal.id}` : `${API_URL}/api/hardware/${kind}`,
        {
          method: modal.id ? 'PUT' : 'POST',
          auth: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toPayload(modal)),
        },
      )
      if (res.status === 401) {
        oturumDustu()
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Kaydedilemedi.')
      }
      setModal(null)
      setMessage({ type: 'ok', text: modal.id ? 'Parça güncellendi.' : 'Yeni parça eklendi.' })
      await loadItems()
    } catch (e) {
      setMessage({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const removeItem = (item) => {
    askConfirm(
      `${kindMeta.label} sil`,
      `"${item.name}" kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
      async () => {
        try {
          const res = await apiFetch(`${API_URL}/api/hardware/${kind}/${item.id}`, {
            method: 'DELETE',
            auth: true,
          })
          if (res.status === 401) {
            oturumDustu()
            return
          }
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.message || 'Silinemedi.')
          }
          setMessage({ type: 'ok', text: `"${item.name}" silindi.` })
          await loadItems()
        } catch (e) {
          setMessage({ type: 'err', text: e.message })
        }
      },
    )
  }

  const laborDirty = laborSaved !== null && Number(labor) !== Number(laborSaved)

  return (
    <div>
      <Banner message={laborMessage} />
      <div className="mb-6 bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-xl p-5">
        <h2 className="text-sm font-bold m-0 mb-1">İşçilik çarpanı</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0 mb-4">
          Yeni teklif ve kayıtlı projelerde ekran alanı (m²) bu değerle çarpılır. Birim: $USD / m².
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 max-w-xl">
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
      </div>

      <Banner message={message} />

      <div className="bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] rounded-xl overflow-hidden">
        <div className="flex flex-col md:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-neutral-100 dark:border-[#242b36]">
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                onClick={() => {
                  setKind(k.key)
                  setMessage(null)
                  setModal(null)
                }}
                className={`rounded-full px-3 py-2 min-h-[44px] text-[12px] font-semibold border transition-colors ${
                  kind === k.key
                    ? 'btn-selected border'
                    : 'border-neutral-300 dark:border-[#39414f] text-neutral-600 dark:text-neutral-300'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setModal({ ...BLANK_HW })}
            className="rounded-full bg-brand text-white text-sm font-semibold px-5 py-2 min-h-[44px] hover:bg-brand-dark shrink-0 w-full sm:w-auto"
          >
            + Yeni {kindMeta.label.toLowerCase()}
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-[#1b2029] text-neutral-500 dark:text-neutral-400 text-xs">
              <tr>
                {['ID', 'Ad', 'Model', 'Fiyat (USD)', 'Güç (W)', 'Isı (BTU)', 'Verim', ''].map((h) => (
                  <th key={h} className="text-left font-medium px-4 py-2.5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-neutral-100 dark:border-[#242b36] hover:bg-neutral-50 dark:hover:bg-[#1b2029]">
                  <td className="px-4 py-2.5 text-neutral-400 dark:text-neutral-500">{item.id}</td>
                  <td className="px-4 py-2.5 font-medium">{item.name}</td>
                  <td className="px-4 py-2.5 text-neutral-500 dark:text-neutral-400">{item.model || '—'}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{money(item.price)}</td>
                  <td className="px-4 py-2.5">{item.powerDrawWatt} W</td>
                  <td className="px-4 py-2.5">{item.heatDissipationBTU}</td>
                  <td className="px-4 py-2.5">{Math.round(Number(item.efficiencyRatio ?? 1) * 100)}%</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => setModal({ id: item.id, ...toForm(item) })}
                      className="text-brand dark:text-brand-light hover:underline mr-3 inline-flex items-center min-h-[44px] px-2"
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item)}
                      className="text-red-600 hover:underline inline-flex items-center min-h-[44px] px-2"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500">
                    Bu kategoride henüz parça yok. “Yeni {kindMeta.label.toLowerCase()}” ile ekleyin.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500">
                    Yükleniyor…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-[90] bg-[#001334]/45 flex items-center justify-center p-0 sm:p-4"
          onClick={() => !saving && setModal(null)}
        >
          <div
            className="bg-white dark:bg-[#161a21] rounded-2xl w-full max-w-[calc(100%-2rem)] mx-4 md:mx-auto md:max-w-lg p-4 md:p-6 shadow-2xl border border-neutral-200 dark:border-[#2c333f] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold m-0 text-neutral-900 dark:text-neutral-100">
              {modal.id ? `${kindMeta.label} düzenle (#${modal.id})` : `Yeni ${kindMeta.label.toLowerCase()}`}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Field label="Ad">
                <input
                  value={modal.name}
                  onChange={(e) => setModal((m) => ({ ...m, name: e.target.value }))}
                  className={inputCls}
                  placeholder="ör. MeanWell 200W"
                />
              </Field>
              <Field label="Model">
                <input
                  value={modal.model}
                  onChange={(e) => setModal((m) => ({ ...m, model: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Fiyat (USD)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={modal.price}
                  onChange={(e) => setModal((m) => ({ ...m, price: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Güç çekişi (W)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={modal.powerDrawWatt}
                  onChange={(e) => setModal((m) => ({ ...m, powerDrawWatt: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Isı yayılımı (BTU)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={modal.heatDissipationBTU}
                  onChange={(e) => setModal((m) => ({ ...m, heatDissipationBTU: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Verim (%)" hint="Örn. 92 → oran 0,92 olarak kaydedilir">
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.1"
                  value={modal.efficiencyPercent}
                  onChange={(e) => setModal((m) => ({ ...m, efficiencyPercent: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={saving}
                className="rounded-full border border-neutral-300 dark:border-[#39414f] px-4 py-2 min-h-[44px] text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-[#1b2029] w-full sm:w-auto"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={saveItem}
                disabled={saving}
                className="rounded-full bg-brand text-white px-4 py-2 min-h-[44px] text-sm font-semibold hover:bg-brand-dark disabled:bg-neutral-300 w-full sm:w-auto"
              >
                {saving ? 'Kaydediliyor…' : modal.id ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
