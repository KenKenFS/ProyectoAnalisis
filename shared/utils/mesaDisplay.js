/**
 * Texto consistente para mesas en toda la app (evita duplicar reglas en cada pantalla).
 */

/**
 * @param {unknown} numero - mesa.numero or numeric id
 * @returns {string} e.g. "Mesa 01"
 */
export function formatMesaLabel(numero) {
  const n = Number(numero)
  if (!Number.isFinite(n) || n <= 0) return 'Mesa'
  return `Mesa ${String(Math.floor(n)).padStart(2, '0')}`
}

/**
 * Solo dígitos de mesa (2 cifras). Acepta número o textos como "Mesa 07" (p. ej. label de pedido).
 * @param {unknown} value
 * @returns {string} e.g. "07" o "--" si no hay número
 */
export function formatMesaNumber(value) {
  if (value == null || value === '') return '--'
  const direct = Number(value)
  if (Number.isFinite(direct) && direct > 0) {
    return String(Math.floor(direct)).padStart(2, '0')
  }
  const m = String(value).match(/(\d+)/)
  if (m) {
    const n = Number(m[1])
    if (Number.isFinite(n) && n > 0) return String(Math.floor(n)).padStart(2, '0')
  }
  return '--'
}

/**
 * @param {{ numero?: number, id?: string } | null | undefined} mesa
 */
export function formatMesaFromDoc(mesa) {
  if (!mesa) return 'Mesa'
  const n = mesa.numero != null ? Number(mesa.numero) : NaN
  if (Number.isFinite(n) && n > 0) return formatMesaLabel(n)
  return mesa.id ? `Mesa (${mesa.id})` : 'Mesa'
}
