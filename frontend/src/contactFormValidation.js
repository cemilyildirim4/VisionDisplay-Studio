/**
 * PDF / müşteri iletişim formu — alan bazlı doğrulama.
 * Backend ContactPhone / ContactEmail / RequiredFilled ile aynı mesajlar.
 */

export const PHONE_REGEX = /^0\d{10}$/
export const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/

export const CONTACT_FIELDS = ['customer', 'phone', 'email', 'address', 'message']

export const CONTACT_MESSAGES = {
  required: 'Lütfen bu alanı doldurunuz.',
  phone: 'Lütfen geçerli bir telefon numarası giriniz (Örn: 05xxxxxxxxxx).',
  email: 'Lütfen geçerli bir e-posta adresi giriniz.',
}

export function compactPhone(value) {
  return String(value ?? '').trim().replace(/\s/g, '')
}

export function validateContactValue(field, value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return CONTACT_MESSAGES.required

  if (field === 'phone') {
    if (!PHONE_REGEX.test(compactPhone(trimmed))) return CONTACT_MESSAGES.phone
  }

  if (field === 'email') {
    if (!trimmed.includes('@') || !EMAIL_REGEX.test(trimmed)) return CONTACT_MESSAGES.email
  }

  return null
}

export function validateContactForm(values) {
  const errors = {}
  for (const field of CONTACT_FIELDS) {
    const msg = validateContactValue(field, values[field])
    if (msg) errors[field] = msg
  }
  return errors
}

export function mapApiErrorKey(key) {
  const k = String(key || '')
    .replace(/^\$\.?/, '')
    .split('.')
    .pop()
    .toLowerCase()
  if (k === 'customername') return 'customer'
  return k
}

export function parseProblemErrors(body) {
  const src = body?.errors
  if (!src || typeof src !== 'object') return {}
  const out = {}
  for (const [rawKey, rawVal] of Object.entries(src)) {
    const key = mapApiErrorKey(rawKey)
    const list = Array.isArray(rawVal) ? rawVal : [rawVal]
    const msg = list.filter(Boolean).join(' ')
    if (key && msg) out[key] = msg
  }
  return out
}
