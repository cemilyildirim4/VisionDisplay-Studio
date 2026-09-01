import { useCallback, useEffect, useState } from 'react'
import { API_URL, apiFetch } from '../apiClient.js'

const KINDS = [
  {
    key: 'power-supplies',
    label: 'Güç Kaynağı',
    api: 'hardware',
    columns: [
      { key: 'outputVoltage', label: 'Çıkış (V)', format: (v) => `${v} V` },
      { key: 'amperage', label: 'Amper (A)', format: (v) => (v === null || v === undefined || v === '' ? '—' : `${v} A`) },
      { key: 'maxPowerOutputWatt', label: 'Maks. çıkış', format: (v) => `${v} W` },
      { key: 'efficiencyRatio', label: 'Verim', format: (v) => `${Math.round(Number(v ?? 1) * 100)}%` },
      { key: 'heatDissipationBtu', label: 'Isı (BTU)', format: (v) => v },
    ],
  },
  {
    key: 'mini-pcs',
    label: 'Mini PC',
    api: 'hardware',
    columns: [
      { key: 'cpuRamInfo', label: 'CPU / RAM' },
      { key: 'storage', label: 'Depolama' },
      { key: 'operatingSystem', label: 'İşletim sistemi' },
      { key: 'maxSupportedResolution', label: 'Maks. çözünürlük' },
      { key: 'powerDrawWatt', label: 'Güç', format: (v) => `${v} W` },
    ],
  },
  {
    key: 'patch-cables',
    label: 'Patch Kablosu',
    api: 'hardware',
    columns: [
      { key: 'cableType', label: 'Kablo tipi' },
      { key: 'lengthMeters', label: 'Uzunluk', format: (v) => `${v} m` },
      { key: 'connectorType', label: 'Konektör' },
    ],
  },
  {
    key: 'receiving-cards',
    label: 'Alıcı Kart',
    api: 'hardware',
    columns: [
      { key: 'maxPixelCapacity', label: 'Piksel kapasitesi', format: (_, item) => pixelCap(item) },
      { key: 'hubPortCount', label: 'Hub port' },
      { key: 'powerDrawWatt', label: 'Güç', format: (v) => `${v} W` },
    ],
  },
  {
    key: 'processors',
    label: 'İşlemci',
    api: 'hardware',
    columns: [
      { key: 'maxPixelCapacityMpx', label: 'Kapasite', format: (v) => `${v} Mpx` },
      { key: 'ethernetPortCount', label: 'Ethernet' },
      { key: 'inputPortsInfo', label: 'Giriş portları' },
      { key: 'powerDrawWatt', label: 'Güç', format: (v) => `${v} W` },
    ],
  },
]

const BLANKS = {
  'power-supplies': {
    name: '',
    model: '',
    price: 0,
    outputVoltage: 0,
    amperage: 0,
    maxPowerOutputWatt: 0,
    efficiencyPercent: 92,
    heatDissipationBtu: 0,
  },
  'mini-pcs': {
    name: '',
    model: '',
    price: 0,
    cpuRamInfo: '',
    storage: '',
    operatingSystem: '',
    maxSupportedResolution: '',
    powerDrawWatt: 0,
  },
  'patch-cables': {
    name: '',
    model: '',
    price: 0,
    cableType: '',
    lengthMeters: 0,
    connectorType: '',
  },
  'receiving-cards': {
    name: '',
    model: '',
    price: 0,
    maxPixelWidth: 0,
    maxPixelHeight: 0,
    hubPortCount: 0,
    powerDrawWatt: 0,
  },
  processors: {
    name: '',
    model: '',
    price: 0,
    maxPixelCapacityMpx: 0,
    ethernetPortCount: 0,
    inputPortsInfo: '',
    powerDrawWatt: 0,
  },
}

const CABLE_TYPES = ['Cat5e', 'Cat6', 'Cat6a', 'PowerCON', 'PowerCON TRUE1', 'Diğer']

const inputCls =
  'w-full max-w-full border border-neutral-300 dark:border-[#39414f] dark:bg-[#121821] dark:text-neutral-100 rounded-lg px-2.5 py-2 min-h-[44px] text-sm text-neutral-800 focus:outline-none focus:border-brand'

const money = (v) =>
  v === null || v === undefined
    ? '—'
    : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`

function pixelCap(item) {
  const w = Number(item.maxPixelWidth) || 0
  const h = Number(item.maxPixelHeight) || 0
  if (!w && !h) return '—'
  return `${w} × ${h} px`
}

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

function dash(v) {
  if (v === null || v === undefined || v === '') return '—'
  return v
}

function toForm(kind, item) {
  if (kind === 'power-supplies') {
    return {
      ...BLANKS[kind],
      name: item.name ?? '',
      model: item.model ?? '',
      price: item.price ?? 0,
      outputVoltage: item.outputVoltage ?? 0,
      amperage: item.amperage ?? 0,
      maxPowerOutputWatt: item.maxPowerOutputWatt ?? 0,
      efficiencyPercent: Math.round(Number(item.efficiencyRatio ?? 1) * 10000) / 100,
      heatDissipationBtu: item.heatDissipationBtu ?? 0,
    }
  }
  return { ...BLANKS[kind], ...item, name: item.name ?? '', model: item.model ?? '' }
}

function toHardwarePayload(kind, form) {
  const base = {
    name: form.name,
    model: form.model || null,
    price: Number(form.price),
  }
  if (kind === 'power-supplies') {
    const pct = Number(form.efficiencyPercent)
    return {
      ...base,
      outputVoltage: Number(form.outputVoltage),
      amperage: Number(form.amperage),
      maxPowerOutputWatt: Number(form.maxPowerOutputWatt),
      efficiencyRatio: Number.isFinite(pct) ? pct / 100 : 1,
      heatDissipationBtu: Number(form.heatDissipationBtu),
    }
  }
  if (kind === 'mini-pcs') {
    return {
      ...base,
      cpuRamInfo: form.cpuRamInfo || null,
      storage: form.storage || null,
      operatingSystem: form.operatingSystem || null,
      maxSupportedResolution: form.maxSupportedResolution || null,
      powerDrawWatt: Number(form.powerDrawWatt),
    }
  }
  if (kind === 'patch-cables') {
    return {
      ...base,
      cableType: form.cableType || null,
      lengthMeters: Number(form.lengthMeters),
      connectorType: form.connectorType || null,
    }
  }
  if (kind === 'receiving-cards') {
    return {
      ...base,
      maxPixelWidth: Number(form.maxPixelWidth),
      maxPixelHeight: Number(form.maxPixelHeight),
      hubPortCount: Number(form.hubPortCount),
      powerDrawWatt: Number(form.powerDrawWatt),
    }
  }
  if (kind === 'processors') {
    return {
      ...base,
      maxPixelCapacityMpx: Number(form.maxPixelCapacityMpx),
      ethernetPortCount: Number(form.ethernetPortCount),
      inputPortsInfo: form.inputPortsInfo || null,
      powerDrawWatt: Number(form.powerDrawWatt),
    }
  }
  return base
}

function TypeFields({ kind, modal, setModal }) {
  const set = (key) => (e) => setModal((m) => ({ ...m, [key]: e.target.value }))
  const num = (key) => (e) => setModal((m) => ({ ...m, [key]: e.target.value }))

  if (kind === 'power-supplies') {
    return (
      <>
        <Field label="Çıkış gerilimi (V)">
          <input type="number" min="0" step="0.1" value={modal.outputVoltage} onChange={num('outputVoltage')} className={inputCls} />
        </Field>
        <Field label="Amper (A)">
          <input type="number" min="0" step="0.01" value={modal.amperage} onChange={num('amperage')} className={inputCls} />
        </Field>
        <Field label="Maks. çıkış gücü (Watt)">
          <input type="number" min="0" step="0.01" value={modal.maxPowerOutputWatt} onChange={num('maxPowerOutputWatt')} className={inputCls} />
        </Field>
        <Field label="Verim (%)" hint="Örn. 92 → oran 0,92 olarak kaydedilir">
          <input type="number" min="1" max="100" step="0.1" value={modal.efficiencyPercent} onChange={num('efficiencyPercent')} className={inputCls} />
        </Field>
        <Field label="Isı yayılımı (BTU)">
          <input type="number" min="0" step="0.01" value={modal.heatDissipationBtu} onChange={num('heatDissipationBtu')} className={inputCls} />
        </Field>
      </>
    )
  }

  if (kind === 'mini-pcs') {
    return (
      <>
        <Field label="CPU / RAM" hint='Örn. "Intel N100 / 8 GB"'>
          <input value={modal.cpuRamInfo} onChange={set('cpuRamInfo')} className={inputCls} />
        </Field>
        <Field label="Depolama" hint='Örn. "256 GB SSD"'>
          <input value={modal.storage} onChange={set('storage')} className={inputCls} />
        </Field>
        <Field label="İşletim sistemi">
          <input value={modal.operatingSystem} onChange={set('operatingSystem')} className={inputCls} placeholder="Windows 11 IoT / Linux" />
        </Field>
        <Field label="Maks. desteklenen çözünürlük">
          <input value={modal.maxSupportedResolution} onChange={set('maxSupportedResolution')} className={inputCls} placeholder="3840x2160" />
        </Field>
        <Field label="Güç çekişi (Watt)">
          <input type="number" min="0" step="0.01" value={modal.powerDrawWatt} onChange={num('powerDrawWatt')} className={inputCls} />
        </Field>
      </>
    )
  }

  if (kind === 'patch-cables') {
    return (
      <>
        <Field label="Kablo tipi">
          <select value={modal.cableType} onChange={set('cableType')} className={inputCls}>
            <option value="">Seçin</option>
            {CABLE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Uzunluk (metre)">
          <input type="number" min="0" step="0.1" value={modal.lengthMeters} onChange={num('lengthMeters')} className={inputCls} />
        </Field>
        <Field label="Konektör tipi">
          <input value={modal.connectorType} onChange={set('connectorType')} className={inputCls} placeholder="RJ45 / PowerCON" />
        </Field>
      </>
    )
  }

  if (kind === 'receiving-cards') {
    return (
      <>
        <Field label="Maks. piksel genişliği (px)">
          <input type="number" min="0" step="1" value={modal.maxPixelWidth} onChange={num('maxPixelWidth')} className={inputCls} />
        </Field>
        <Field label="Maks. piksel yüksekliği (px)">
          <input type="number" min="0" step="1" value={modal.maxPixelHeight} onChange={num('maxPixelHeight')} className={inputCls} />
        </Field>
        <Field label="Hub port sayısı">
          <input type="number" min="0" step="1" value={modal.hubPortCount} onChange={num('hubPortCount')} className={inputCls} />
        </Field>
        <Field label="Güç çekişi (Watt)">
          <input type="number" min="0" step="0.01" value={modal.powerDrawWatt} onChange={num('powerDrawWatt')} className={inputCls} />
        </Field>
      </>
    )
  }

  if (kind === 'processors') {
    return (
      <>
        <Field label="Maks. piksel kapasitesi (milyon piksel)">
          <input type="number" min="0" step="0.01" value={modal.maxPixelCapacityMpx} onChange={num('maxPixelCapacityMpx')} className={inputCls} />
        </Field>
        <Field label="Ethernet port sayısı">
          <input type="number" min="0" step="1" value={modal.ethernetPortCount} onChange={num('ethernetPortCount')} className={inputCls} />
        </Field>
        <Field label="Giriş portları" hint='Örn. "HDMI 2.0 ×2, DP 1.4 ×1"'>
          <input value={modal.inputPortsInfo} onChange={set('inputPortsInfo')} className={inputCls} />
        </Field>
        <Field label="Güç çekişi (Watt)">
          <input type="number" min="0" step="0.01" value={modal.powerDrawWatt} onChange={num('powerDrawWatt')} className={inputCls} />
        </Field>
      </>
    )
  }

  return null
}

/**
 * Donanım kataloğu (5 parça, tipe özel form).
 * LED modül / kabin yalnızca Modeller sekmesinden eklenir.
 * İşçilik çarpanı ana menüdeki ayrı sekmede yönetilir.
 */
export default function HardwareCatalogSection({ oturumDustu, askConfirm }) {
  const [kind, setKind] = useState('power-supplies')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)

  const kindMeta = KINDS.find((k) => k.key === kind) ?? KINDS[0]
  const extraCols = kindMeta.columns
  const colCount = 4 + extraCols.length + 1

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`${API_URL}/api/hardware/${kind}`, { auth: true })
      if (res.status === 401) {
        oturumDustu()
        return
      }
      if (!res.ok) throw new Error('Liste alınamadı.')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setMessage({ type: 'err', text: e.message })
    } finally {
      setLoading(false)
    }
  }, [kind, oturumDustu])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const saveItem = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const url = modal.id
        ? `${API_URL}/api/hardware/${kind}/${modal.id}`
        : `${API_URL}/api/hardware/${kind}`
      const res = await apiFetch(url, {
        method: modal.id ? 'PUT' : 'POST',
        auth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toHardwarePayload(kind, modal)),
      })
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
    const display = item.name || `#${item.id}`
    askConfirm(
      `${kindMeta.label} sil`,
      `"${display}" kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
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
          setMessage({ type: 'ok', text: `"${display}" silindi.` })
          await loadItems()
        } catch (e) {
          setMessage({ type: 'err', text: e.message })
        }
      },
    )
  }

  const itemName = (item) => item.name || '—'
  const itemModel = (item) => item.model || '—'

  return (
    <div>
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
            onClick={() => setModal({ ...BLANKS[kind] })}
            className="rounded-full bg-brand text-white text-sm font-semibold px-5 py-2 min-h-[44px] hover:bg-brand-dark shrink-0 w-full sm:w-auto"
          >
            + Yeni {kindMeta.label.toLowerCase()}
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-[#1b2029] text-neutral-500 dark:text-neutral-400 text-xs">
              <tr>
                {['ID', 'Ad', 'Model', 'Fiyat (USD)', ...extraCols.map((c) => c.label), ''].map((h, i) => (
                  <th key={`${h}-${i}`} className="text-left font-medium px-4 py-2.5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-neutral-100 dark:border-[#242b36] hover:bg-neutral-50 dark:hover:bg-[#1b2029]">
                  <td className="px-4 py-2.5 text-neutral-400 dark:text-neutral-500">{item.id}</td>
                  <td className="px-4 py-2.5 font-medium">{itemName(item)}</td>
                  <td className="px-4 py-2.5 text-neutral-500 dark:text-neutral-400">{itemModel(item)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{money(item.price)}</td>
                  {extraCols.map((col) => (
                    <td key={col.key} className="px-4 py-2.5 whitespace-nowrap">
                      {col.format ? col.format(item[col.key], item) : dash(item[col.key])}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => setModal({ id: item.id, ...toForm(kind, item) })}
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
                  <td colSpan={colCount} className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500">
                    Bu kategoride henüz parça yok. “Yeni {kindMeta.label.toLowerCase()}” ile ekleyin.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={colCount} className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500">
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
              <Field label="Fiyat ($USD)">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={modal.price}
                    onChange={(e) => setModal((m) => ({ ...m, price: e.target.value }))}
                    className={inputCls}
                  />
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">USD</span>
                </div>
              </Field>
              <TypeFields kind={kind} modal={modal} setModal={setModal} />
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
