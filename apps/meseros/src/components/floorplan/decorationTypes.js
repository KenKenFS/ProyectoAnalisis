import {
  FireIcon,
  BeakerIcon,
  HomeIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  BanknotesIcon,
  Squares2X2Icon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

/**
 * Metadatos de los elementos decorativos del plano.
 *
 * kind:
 *  - 'structure' → caja física en el plano (cocina, barra, caja registradora, etc.)
 *  - 'signal'    → indicación visual con icono + etiqueta debajo (entrada, baño...)
 *
 * defaultSize: tamaño inicial al soltar en el canvas.
 */
export const DECORATION_META = {
  kitchen: {
    label: 'Cocina',
    Icon: FireIcon,
    kind: 'structure',
    defaultSize: { width: 200, height: 140 },
  },
  bar: {
    label: 'Barra',
    Icon: BeakerIcon,
    kind: 'structure',
    defaultSize: { width: 220, height: 90 },
  },
  reception: {
    label: 'Recepción',
    Icon: HomeIcon,
    kind: 'structure',
    defaultSize: { width: 170, height: 110 },
  },
  cashier: {
    label: 'Caja',
    Icon: BanknotesIcon,
    kind: 'structure',
    defaultSize: { width: 150, height: 100 },
  },
  hallway: {
    label: 'Pasillo',
    Icon: Squares2X2Icon,
    kind: 'structure',
    defaultSize: { width: 280, height: 80 },
  },
  bathroom: {
    label: 'Baños',
    Icon: UserCircleIcon,
    kind: 'structure',
    defaultSize: { width: 150, height: 110 },
  },
  entrance: {
    label: 'Entrada',
    Icon: ArrowRightOnRectangleIcon,
    kind: 'signal',
    defaultSize: { width: 86, height: 96 },
  },
  exit: {
    label: 'Salida',
    Icon: ArrowLeftOnRectangleIcon,
    kind: 'signal',
    defaultSize: { width: 86, height: 96 },
  },
}
