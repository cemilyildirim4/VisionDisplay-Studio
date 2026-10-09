/** 40 A → 6 modül, 60 A → 8 modül. Diğer akımlar aynı yoğunlukla ölçeklenir. */
export function modulesPerPowerSupply(amperage) {
  const amp = Number(amperage)
  if (!Number.isFinite(amp) || amp <= 0) return 0
  if (Math.abs(amp - 40) <= 0.5) return 6
  if (Math.abs(amp - 60) <= 0.5) return 8
  if (amp > 60) return Math.max(8, Math.floor((amp / 60) * 8))
  return Math.max(1, Math.floor((amp / 40) * 6))
}

/** Adet = yukarı yuvarla(toplam modül / PSU modül kapasitesi). */
export function powerSupplyCount(totalModules, amperage) {
  const capacity = modulesPerPowerSupply(amperage)
  const modules = Math.max(0, Number(totalModules) || 0)
  if (capacity <= 0 || modules <= 0) return 0
  return Math.ceil(modules / capacity)
}

/**
 * Tek port: alıcı kart − 1. Birden fazla port: alıcı kart − port sayısı. Alt sınır 0.
 */
export function patchCableCount(receivingCards, portCount) {
  const cards = Math.max(0, Number(receivingCards) || 0)
  if (cards <= 0) return 0
  const ports = Math.max(0, Number(portCount) || 0)
  const raw = ports <= 1 ? cards - 1 : cards - ports
  return Math.max(0, raw)
}
