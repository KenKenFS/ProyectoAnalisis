/**
 * Contraste para estructuras decorativas según el fondo real del elemento
 * (color sólido, textura o default), no solo el tema claro/oscuro del UI.
 */

function parseHex(hex) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return null
  let h = hex.slice(1)
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (h.length !== 6) return null
  const n = parseInt(h, 16)
  if (Number.isNaN(n)) return null
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function relativeLuminance({ r, g, b }) {
  const lin = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

export function isLightHexColor(hex) {
  const rgb = parseHex(hex)
  if (!rgb) return false
  return relativeLuminance(rgb) > 0.42
}

const DARK_TEXTURES = new Set(['concrete', 'hatch'])

/**
 * @param {{ customFill: string|null, hasFloorTex: boolean, floorTexture?: string, dark: boolean }} opts
 */
export function isLightStructureBackground({ customFill, hasFloorTex, floorTexture, dark }) {
  if (customFill) return isLightHexColor(customFill)
  if (hasFloorTex) {
    if (floorTexture && DARK_TEXTURES.has(floorTexture)) return !dark
    return true
  }
  return !dark
}

export function getStructurePalette(lightBackground) {
  if (lightBackground) {
    return {
      line: 'rgba(15,23,42,0.72)',
      lineSoft: 'rgba(15,23,42,0.42)',
      fillSoft: 'rgba(255,255,255,0.65)',
      fillStrong: 'rgba(15,23,42,0.1)',
      text: '#0f172a',
      labelStripBg: 'rgba(255,255,255,0.58)',
      stroke: 'rgba(15,23,42,0.2)',
    }
  }
  return {
    line: 'rgba(255,255,255,0.88)',
    lineSoft: 'rgba(255,255,255,0.55)',
    fillSoft: 'rgba(255,255,255,0.14)',
    fillStrong: 'rgba(255,255,255,0.22)',
    text: '#f4f4f5',
    labelStripBg: 'rgba(15,23,42,0.42)',
    stroke: 'rgba(255,255,255,0.22)',
  }
}
