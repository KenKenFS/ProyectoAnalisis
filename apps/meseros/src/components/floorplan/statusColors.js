/**
 * Mapeo de estado de mesa a colores SVG.
 *
 * Mantiene paridad visual con las clases Tailwind que ya usa la app:
 *  - libre           → emerald (100 / 400 / 800)
 *  - ocupada         → blue    (100 / 400 / 800)
 *  - esperandoCuenta → amber   (100 / 400 / 800)
 *  - porLimpiar      → violet  (100 / 400 / 800)
 *
 * Cada estado tiene paleta light y dark.
 */
export const STATUS_COLORS = {
  libre: {
    light: { fill: '#d1fae5', stroke: '#34d399', text: '#065f46', accent: '#10b981' },
    dark: { fill: '#022c22', stroke: '#34d399', text: '#a7f3d0', accent: '#34d399' },
    label: 'Libre',
  },
  ocupada: {
    light: { fill: '#dbeafe', stroke: '#60a5fa', text: '#1e3a8a', accent: '#3b82f6' },
    dark: { fill: '#0c1a3a', stroke: '#60a5fa', text: '#bfdbfe', accent: '#60a5fa' },
    label: 'Ocupada',
  },
  esperandoCuenta: {
    light: { fill: '#fef3c7', stroke: '#fbbf24', text: '#92400e', accent: '#f59e0b' },
    dark: { fill: '#3b2206', stroke: '#fbbf24', text: '#fde68a', accent: '#fbbf24' },
    label: 'Lista para pagar',
  },
  porLimpiar: {
    light: { fill: '#ede9fe', stroke: '#a78bfa', text: '#5b21b6', accent: '#8b5cf6' },
    dark: { fill: '#2e1065', stroke: '#a78bfa', text: '#ddd6fe', accent: '#a78bfa' },
    label: 'Por limpiar',
  },
}

export function getStatusColors(status, dark = false) {
  const entry = STATUS_COLORS[status] || STATUS_COLORS.libre
  return {
    ...(dark ? entry.dark : entry.light),
    label: entry.label,
  }
}
