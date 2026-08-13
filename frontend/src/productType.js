/**
 * Ürün tipi yardımcıları — Kabin vs Tekli Panel (Modül).
 * Backend değeri: CABINET | MODULE (cabins.product_type).
 */

export const PRODUCT_TYPES = {
  CABINET: 'CABINET',
  MODULE: 'MODULE',
}

export function normalizeProductType(value) {
  return String(value || PRODUCT_TYPES.CABINET).toUpperCase() === PRODUCT_TYPES.MODULE
    ? PRODUCT_TYPES.MODULE
    : PRODUCT_TYPES.CABINET
}

export function isModule(value) {
  return normalizeProductType(value) === PRODUCT_TYPES.MODULE
}

export function productTypeLabelKey(value) {
  return isModule(value) ? 'type.panel' : 'type.cabinet'
}
