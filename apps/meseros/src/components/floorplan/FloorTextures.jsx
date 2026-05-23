/**
 * Patterns SVG y filtros globales para el editor de plano.
 *
 * Texturas:
 *  - neutral : fondo neutro azulado #1e1e2e con dots sutiles
 *  - wood    : madera clara cálida estilo Odoo (#c8a882 base con vetas)
 *  - tile    : loseta 2×2 (32px) con lechada y alternancia de tono
 *  - concrete: hormigón gris (#9ca3af) con grain fino
 *  - hatch   : diagonales (estilo "pasillo" / zona destacada)
 *
 * Filtros:
 *  - floorplan-shadow: dropshadow suave bajo cada elemento
 *  - floorplan-glow  : glow cyan #00C2FF para seleccionados
 *
 * El consumidor llama a <FloorTextureDefs dark={...} /> dentro de <defs>
 * y luego usa fill={`url(#${getFloorTextureId(type, dark)})`}.
 */

export const FLOOR_TEXTURES = [
  { id: 'neutral', label: 'Sin piso (neutro)' },
  { id: 'wood', label: 'Madera clara' },
  { id: 'tile', label: 'Loseta beige' },
  { id: 'concrete', label: 'Hormigón' },
  { id: 'hatch', label: 'Diagonales' },
]

const NEUTRAL_BG = '#1e1e2e'
const NEUTRAL_BG_LIGHT = '#f8fafc'

export function FloorTextureDefs({ dark = false }) {
  return (
    <>
      <pattern
        id={`floor-neutral-${dark ? 'dark' : 'light'}`}
        x={0}
        y={0}
        width={32}
        height={32}
        patternUnits="userSpaceOnUse"
      >
        <rect width={32} height={32} fill={dark ? NEUTRAL_BG : NEUTRAL_BG_LIGHT} />
        <circle
          cx={1}
          cy={1}
          r={1}
          fill={dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.07)'}
        />
      </pattern>

      <pattern
        id={`floor-wood-${dark ? 'dark' : 'light'}`}
        x={0}
        y={0}
        width={140}
        height={36}
        patternUnits="userSpaceOnUse"
      >
        <rect width={140} height={36} fill="#c8a882" />
        <line x1={0} y1={0} x2={140} y2={0} stroke="#a8855e" strokeWidth={1} opacity={0.55} />
        <line x1={0} y1={36} x2={140} y2={36} stroke="#a8855e" strokeWidth={1} opacity={0.55} />
        <line x1={70} y1={0} x2={70} y2={36} stroke="#a8855e" strokeWidth={0.6} opacity={0.4} />
        <line x1={20} y1={9} x2={55} y2={9} stroke="#b8956e" strokeWidth={0.5} opacity={0.55} />
        <line x1={26} y1={22} x2={48} y2={22} stroke="#b8956e" strokeWidth={0.4} opacity={0.45} />
        <line x1={80} y1={14} x2={115} y2={14} stroke="#b8956e" strokeWidth={0.5} opacity={0.55} />
        <line x1={86} y1={26} x2={108} y2={26} stroke="#b8956e" strokeWidth={0.4} opacity={0.45} />
        <line
          x1={10}
          y1={5}
          x2={120}
          y2={5}
          stroke="#d8bb96"
          strokeWidth={0.3}
          opacity={0.4}
        />
        <line
          x1={10}
          y1={30}
          x2={120}
          y2={30}
          stroke="#d8bb96"
          strokeWidth={0.3}
          opacity={0.4}
        />
      </pattern>

      <pattern
        id={`floor-tile-${dark ? 'dark' : 'light'}`}
        x={0}
        y={0}
        width={32}
        height={32}
        patternUnits="userSpaceOnUse"
      >
        <rect
          width={32}
          height={32}
          fill={dark ? '#9a948c' : '#d8d0c6'}
        />
        <rect
          x={1}
          y={1}
          width={14}
          height={14}
          fill={dark ? '#d4cec6' : '#f3ece4'}
          stroke={dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'}
          strokeWidth={0.5}
        />
        <rect
          x={17}
          y={1}
          width={14}
          height={14}
          fill={dark ? '#ccc6be' : '#ebe4dc'}
          stroke={dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.2)'}
          strokeWidth={0.4}
        />
        <rect
          x={1}
          y={17}
          width={14}
          height={14}
          fill={dark ? '#ccc6be' : '#ebe4dc'}
          stroke={dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.2)'}
          strokeWidth={0.4}
        />
        <rect
          x={17}
          y={17}
          width={14}
          height={14}
          fill={dark ? '#d4cec6' : '#f3ece4'}
          stroke={dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'}
          strokeWidth={0.5}
        />
        <line
          x1={1}
          y1={1}
          x2={13}
          y2={1}
          stroke={dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.5)'}
          strokeWidth={0.6}
        />
        <line
          x1={17}
          y1={17}
          x2={29}
          y2={17}
          stroke={dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.5)'}
          strokeWidth={0.6}
        />
      </pattern>

      <pattern
        id={`floor-concrete-${dark ? 'dark' : 'light'}`}
        x={0}
        y={0}
        width={64}
        height={64}
        patternUnits="userSpaceOnUse"
      >
        <rect width={64} height={64} fill="#9ca3af" />
        <circle cx={10} cy={14} r={1} fill="rgba(15,23,42,0.18)" />
        <circle cx={36} cy={6} r={0.7} fill="rgba(15,23,42,0.13)" />
        <circle cx={50} cy={44} r={1.1} fill="rgba(15,23,42,0.16)" />
        <circle cx={18} cy={52} r={0.6} fill="rgba(15,23,42,0.12)" />
        <circle cx={30} cy={28} r={0.8} fill="rgba(15,23,42,0.14)" />
        <circle cx={56} cy={20} r={0.5} fill="rgba(15,23,42,0.11)" />
        <circle cx={42} cy={56} r={0.9} fill="rgba(15,23,42,0.15)" />
      </pattern>

      <pattern
        id={`floor-hatch-${dark ? 'dark' : 'light'}`}
        x={0}
        y={0}
        width={14}
        height={14}
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width={14} height={14} fill={dark ? '#2a2a3a' : '#e2e8f0'} />
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={14}
          stroke={dark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.22)'}
          strokeWidth={2.4}
        />
      </pattern>

      <filter id="floorplan-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.28" />
      </filter>

      <filter id="floorplan-selected" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.28" />
        <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00C2FF" floodOpacity="0.9" />
      </filter>
    </>
  )
}

export function getFloorTextureId(type, dark) {
  const safe = FLOOR_TEXTURES.find((t) => t.id === type) ? type : 'neutral'
  return `floor-${safe}-${dark ? 'dark' : 'light'}`
}

export const SHADOW_FILTER = 'url(#floorplan-shadow)'
export const SELECTED_FILTER = 'url(#floorplan-selected)'
