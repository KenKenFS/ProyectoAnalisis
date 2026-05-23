import { db, storage } from './firebase';
import {
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  deleteField,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { formatMesaLabel } from '../utils/mesaDisplay.js';

// ==================== PEDIDOS ====================

/**
 * Crea un nuevo pedido
 * @param {object} pedidoData - Datos del pedido
 * @returns {Promise<string>} ID del pedido creado
 */
export async function createPedido(pedidoData) {
  try {
    const docRef = await addDoc(collection(db, 'pedidos'), {
      ...pedidoData,
      estado: pedidoData.estado || 'pendiente',
      timestamp: new Date(),
      createdAt: new Date(),
    });
    console.log('✅ Pedido creado:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error al crear pedido:', error.message);
    throw error;
  }
}

/**
 * Obtiene todos los pedidos
 * @returns {Promise<array>}
 */
export async function getPedidos() {
  try {
    const q = query(collection(db, 'pedidos'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('❌ Error al obtener pedidos:', error.message);
    return [];
  }
}

/**
 * Obtiene el pedido activo mas reciente para una cuenta/mesa.
 * Se usa como respaldo cuando el detalle de cuenta no trae items visibles.
 */
export async function getPedidoActivoMesa({ cuentaId, mesaId }) {
  if (!cuentaId) return null;
  try {
    const snap = await getDocs(query(collection(db, 'pedidos'), where('cuentaId', '==', cuentaId)));
    const pedidos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const misaMesa = pedidos
      .filter((p) => !mesaId || String(p.mesaId || '') === String(mesaId || ''))
      .sort((a, b) => toMillisSafe(b.updatedAt || b.createdAt || b.timestamp) - toMillisSafe(a.updatedAt || a.createdAt || a.timestamp));
    const activo = misaMesa.find((p) => {
      const estado = String(p.estado || p.estadoPedido || '').trim().toLowerCase();
      return estado === 'pendiente' || estado === 'enpreparacion' || estado === 'en_preparacion' || estado === 'listo';
    });
    if (activo) return activo;
    const finalizado = misaMesa.find((p) => {
      const estado = String(p.estado || p.estadoPedido || '').trim().toLowerCase();
      return estado === 'finalizado';
    });
    return finalizado || null;
  } catch (_) {
    return null;
  }
}

/**
 * Obtiene pedidos de un cliente específico
 * @param {string} clienteId - UID del cliente
 * @returns {Promise<array>}
 */
export async function getPedidosByCliente(clienteId) {
  try {
    const q = query(
      collection(db, 'pedidos'),
      where('clienteId', '==', clienteId),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('❌ Error al obtener pedidos del cliente:', error.message);
    return [];
  }
}

/**
 * Escucha cambios en tiempo real de los pedidos
 * @param {function} callback - Se ejecuta con los pedidos cada vez que cambian
 * @returns {function} Función para desuscribirse
 */
export function onPedidosChange(callback) {
  const q = query(collection(db, 'pedidos'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, snapshot => {
    const pedidos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(pedidos);
  });
}

/**
 * Actualiza un pedido
 * @param {string} pedidoId - ID del pedido
 * @param {object} updates - Datos a actualizar
 */
export async function updatePedido(pedidoId, updates) {
  try {
    const pedidoRef = doc(db, 'pedidos', pedidoId);
    await updateDoc(pedidoRef, {
      ...updates,
      updatedAt: new Date(),
    });
    console.log('✅ Pedido actualizado:', pedidoId);
  } catch (error) {
    console.error('❌ Error al actualizar pedido:', error.message);
    throw error;
  }
}

/**
 * Elimina un pedido (solo admin)
 * @param {string} pedidoId - ID del pedido
 */
export async function deletePedido(pedidoId) {
  try {
    await deleteDoc(doc(db, 'pedidos', pedidoId));
    console.log('✅ Pedido eliminado:', pedidoId);
  } catch (error) {
    console.error('❌ Error al eliminar pedido:', error.message);
    throw error;
  }
}

// ==================== INVENTARIO ====================

/**
 * Obtiene todos los items del inventario.
 */
export async function getInventarioItems() {
  const snapshot = await getDocs(collection(db, 'inventario'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Registra una entrada de insumo: si el insumo existe suma al stock, si no lo crea.
 * Guarda el registro en la coleccion entradas_insumos.
 */
export async function registrarEntradaInsumo({ nombre, cantidad, unidad, precioUnitario, fechaCaducidad = null, adminUid }) {
  if (!nombre || !nombre.trim()) throw new Error('El nombre del insumo es obligatorio.');
  if (!unidad || !unidad.trim()) throw new Error('La unidad de medida es obligatoria.');
  const cantNum = Number(cantidad);
  if (!cantNum || cantNum <= 0) throw new Error('La cantidad debe ser mayor a cero.');
  const precioNum = Number(precioUnitario);
  if (!precioNum || precioNum < 0) throw new Error('El precio unitario no puede ser negativo.');

  if (fechaCaducidad) {
    const caducDate = new Date(fechaCaducidad);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (caducDate < today) throw new Error('La fecha de caducidad debe ser futura.');
  }

  const q = query(collection(db, 'inventario'), where('nombre', '==', nombre.trim()));
  const snap = await getDocs(q);

  let insumoId;
  if (snap.empty) {
    const docRef = await addDoc(collection(db, 'inventario'), {
      nombre: nombre.trim(),
      unidad: unidad.trim(),
      cantidad: cantNum,
      minCantidad: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    insumoId = docRef.id;
  } else {
    const existing = snap.docs[0];
    insumoId = existing.id;
    const prev = existing.data();
    if (prev.unidad && unidad.trim().toLowerCase() !== prev.unidad.toLowerCase()) {
      throw new Error(`El insumo "${nombre.trim()}" esta registrado en "${prev.unidad}". Use la misma unidad.`);
    }
    await updateDoc(doc(db, 'inventario', insumoId), {
      cantidad: (prev.cantidad || 0) + cantNum,
      updatedAt: new Date(),
    });
  }

  await addDoc(collection(db, 'entradas_insumos'), {
    insumoId,
    insumoNombre: nombre.trim(),
    cantidad: cantNum,
    unidad: unidad.trim(),
    precioUnitario: precioNum,
    fechaCaducidad: fechaCaducidad || null,
    adminUid: adminUid || '',
    timestamp: new Date(),
  });

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'entrada_insumo',
    adminUid: adminUid || '',
    targetName: nombre.trim(),
    detalles: { cantidad: cantNum, unidad: unidad.trim(), precioUnitario: precioNum, fechaCaducidad: fechaCaducidad || null, esNuevo: snap.empty },
    timestamp: new Date(),
  });

  return insumoId;
}

/**
 * Obtiene entradas de insumos que tienen fecha de caducidad, con estado calculado.
 * Retorna lista ordenada por fecha de caducidad ascendente (mas proximos primero).
 */
export async function getAlertasCaducidad() {
  const snapshot = await getDocs(collection(db, 'entradas_insumos'));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const alertas = [];
  for (const d of snapshot.docs) {
    const data = d.data();
    if (!data.fechaCaducidad) continue;

    const caducDate = new Date(data.fechaCaducidad);
    caducDate.setHours(0, 0, 0, 0);
    const diffMs = caducDate - today;
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let estado;
    if (diffDias < 0) estado = 'vencido';
    else if (diffDias <= 3) estado = 'critico';
    else if (diffDias <= 7) estado = 'proximo';
    else estado = 'ok';

    alertas.push({
      id: d.id,
      ...data,
      fechaCaducidadDate: caducDate,
      diasRestantes: diffDias,
      estado,
    });
  }

  alertas.sort((a, b) => a.fechaCaducidadDate - b.fechaCaducidadDate);
  return alertas;
}

/**
 * Obtiene todas las entradas de insumos ordenadas por fecha descendente.
 */
export async function getEntradasInsumos() {
  const snapshot = await getDocs(collection(db, 'entradas_insumos'));
  const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const ta = a.timestamp?.toDate?.() || a.timestamp || 0;
    const tb = b.timestamp?.toDate?.() || b.timestamp || 0;
    return new Date(tb) - new Date(ta);
  });
  return list;
}

const MOTIVOS_SALIDA = ['consumo', 'desperdicio', 'merma', 'vencimiento', 'otro'];

/**
 * Registra una salida manual de insumo: resta stock y guarda registro.
 */
export async function registrarSalidaInsumo({ insumoId, cantidad, motivo, adminUid }) {
  if (!insumoId) throw new Error('Debe seleccionar un insumo.');
  const cantNum = Number(cantidad);
  if (!cantNum || cantNum <= 0) throw new Error('La cantidad debe ser mayor a cero.');
  if (!motivo || !MOTIVOS_SALIDA.includes(motivo)) throw new Error('Debe seleccionar un motivo.');

  const itemRef = doc(db, 'inventario', insumoId);
  const itemDoc = await getDoc(itemRef);
  if (!itemDoc.exists()) throw new Error('El insumo no existe.');

  const data = itemDoc.data();
  const stockActual = data.cantidad || 0;
  if (cantNum > stockActual) throw new Error(`Stock insuficiente. Disponible: ${stockActual} ${data.unidad || ''}`);

  await updateDoc(itemRef, {
    cantidad: stockActual - cantNum,
    updatedAt: new Date(),
  });

  await addDoc(collection(db, 'salidas_insumos'), {
    insumoId,
    insumoNombre: data.nombre || '',
    cantidad: cantNum,
    unidad: data.unidad || '',
    motivo,
    adminUid: adminUid || '',
    timestamp: new Date(),
  });

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'salida_insumo',
    adminUid: adminUid || '',
    targetName: data.nombre || '',
    detalles: { cantidad: cantNum, unidad: data.unidad || '', motivo, stockAnterior: stockActual, stockNuevo: stockActual - cantNum },
    timestamp: new Date(),
  });
}

/**
 * Obtiene todas las salidas de insumos ordenadas por fecha descendente.
 */
export async function getSalidasInsumos() {
  const snapshot = await getDocs(collection(db, 'salidas_insumos'));
  const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const ta = a.timestamp?.toDate?.() || a.timestamp || 0;
    const tb = b.timestamp?.toDate?.() || b.timestamp || 0;
    return new Date(tb) - new Date(ta);
  });
  return list;
}

/** Motivos contados como pérdida (RA-005). */
export const RA005_MOTIVOS_PERDIDA = ['desperdicio', 'merma', 'vencimiento'];

function ra005NextDayCR(dateStr) {
  const { start } = rangeForDateStr(String(dateStr || '').trim());
  return toDateStrCR(new Date(start.getTime() + 86400000));
}

function ra005EachDateInclusive(startStr, endStr) {
  const out = [];
  let cur = String(startStr || '').trim();
  const end = String(endStr || '').trim();
  while (cur <= end) {
    out.push(cur);
    if (cur === end) break;
    cur = ra005NextDayCR(cur);
  }
  return out;
}

function ra005PrecioPromedioPorInsumo(entradasList) {
  const acc = {};
  for (const e of entradasList) {
    const sid = e.insumoId;
    if (!sid) continue;
    const c = Number(e.cantidad || 0);
    const p = Number(e.precioUnitario || 0);
    if (!acc[sid]) acc[sid] = { sumQty: 0, sumCost: 0 };
    acc[sid].sumQty += c;
    acc[sid].sumCost += c * p;
  }
  const out = {};
  Object.keys(acc).forEach((sid) => {
    const m = acc[sid];
    out[sid] = m.sumQty > 0 ? m.sumCost / m.sumQty : 0;
  });
  return out;
}

/**
 * Reporte de inventario RA-005: consumo en período, pérdidas, stock bajo, serie diaria.
 * Costo estimado de salidas vía precio promedio ponderado de todas las entradas históricas por insumo.
 */
export async function getReporteInventarioRango(fechaInicio, fechaFin) {
  const fi = String(fechaInicio || '').trim();
  const ff = String(fechaFin || '').trim();
  const { start, end } = rangeForDateStrInclusive(fi, ff);
  const startMs = start.getTime();
  const endMs = end.getTime();

  const [entradasSnap, salidasSnap, inventarioSnap] = await Promise.all([
    getDocs(collection(db, 'entradas_insumos')),
    getDocs(
      query(
        collection(db, 'salidas_insumos'),
        where('timestamp', '>=', start),
        where('timestamp', '<=', end)
      )
    ),
    getDocs(collection(db, 'inventario')),
  ]);

  const entradasAll = entradasSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const precioMap = ra005PrecioPromedioPorInsumo(entradasAll);

  const entradasPeriodo = entradasAll.filter((e) => {
    const t = toMillisSafe(e.timestamp);
    return t >= startMs && t <= endMs;
  });

  const salidasPeriodo = salidasSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const nombrePorId = {};
  inventarioSnap.docs.forEach((d) => {
    const x = d.data();
    nombrePorId[d.id] = x.nombre || x.nombreInsumo || d.id;
  });

  const consumoAgg = {};
  for (const s of salidasPeriodo) {
    const sid = s.insumoId;
    if (!sid) continue;
    const qty = Number(s.cantidad || 0);
    if (!consumoAgg[sid]) {
      consumoAgg[sid] = {
        insumoId: sid,
        nombre: s.insumoNombre || nombrePorId[sid] || sid,
        unidad: s.unidad || '',
        cantidad: 0,
        porMotivo: {},
      };
    }
    consumoAgg[sid].cantidad += qty;
    const mot = String(s.motivo || 'otro').toLowerCase();
    consumoAgg[sid].porMotivo[mot] = (consumoAgg[sid].porMotivo[mot] || 0) + qty;
  }

  const topConsumo = Object.values(consumoAgg)
    .map((row) => ({
      ...row,
      costoEstimado: row.cantidad * (precioMap[row.insumoId] || 0),
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const perdidasPorMotivo = {
    desperdicio: { cantidad: 0, costo: 0 },
    merma: { cantidad: 0, costo: 0 },
    vencimiento: { cantidad: 0, costo: 0 },
  };
  const perdidasDetalle = [];

  for (const s of salidasPeriodo) {
    const mot = String(s.motivo || '').toLowerCase();
    if (!RA005_MOTIVOS_PERDIDA.includes(mot)) continue;
    const sid = s.insumoId;
    const qty = Number(s.cantidad || 0);
    const unit = precioMap[sid] || 0;
    const costo = qty * unit;
    perdidasPorMotivo[mot].cantidad += qty;
    perdidasPorMotivo[mot].costo += costo;
    perdidasDetalle.push({
      id: s.id,
      insumoId: sid,
      nombre: s.insumoNombre || nombrePorId[sid] || sid,
      unidad: s.unidad || '',
      motivo: mot,
      cantidad: qty,
      costoEstimado: costo,
      timestamp: s.timestamp,
    });
  }
  perdidasDetalle.sort((a, b) => toMillisSafe(b.timestamp) - toMillisSafe(a.timestamp));

  const inventarioItems = inventarioSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const stockBajo = inventarioItems
    .filter((it) => {
      const c = Number(it.cantidad || 0);
      const min = Number(it.minCantidad ?? 10);
      return c < min;
    })
    .map((it) => {
      const c = Number(it.cantidad || 0);
      const min = Number(it.minCantidad ?? 10);
      return {
        id: it.id,
        nombre: it.nombre || it.id,
        unidad: it.unidad || '',
        cantidad: c,
        minCantidad: min,
        deficit: min - c,
      };
    })
    .sort((a, b) => b.deficit - a.deficit);

  let entradasCantidadTotal = 0;
  let entradasCostoTotal = 0;
  for (const e of entradasPeriodo) {
    const c = Number(e.cantidad || 0);
    const p = Number(e.precioUnitario || 0);
    entradasCantidadTotal += c;
    entradasCostoTotal += c * p;
  }

  let salidasCantidadTotal = 0;
  for (const s of salidasPeriodo) {
    salidasCantidadTotal += Number(s.cantidad || 0);
  }

  const perdidasCantidadTotal = RA005_MOTIVOS_PERDIDA.reduce(
    (sum, m) => sum + (perdidasPorMotivo[m]?.cantidad || 0),
    0
  );

  const dias = ra005EachDateInclusive(fi, ff);
  const serieDiaria = dias.map((dayStr) => {
    const { start: ds, end: de } = rangeForDateStr(dayStr);
    const d0 = ds.getTime();
    const d1 = de.getTime();
    let ent = 0;
    let sal = 0;
    for (const e of entradasPeriodo) {
      const t = toMillisSafe(e.timestamp);
      if (t >= d0 && t <= d1) ent += Number(e.cantidad || 0);
    }
    for (const s of salidasPeriodo) {
      const t = toMillisSafe(s.timestamp);
      if (t >= d0 && t <= d1) sal += Number(s.cantidad || 0);
    }
    return { fecha: dayStr, entradas: ent, salidas: sal };
  });

  return {
    fechaInicio: fi,
    fechaFin: ff,
    precioPromedioPorInsumo: precioMap,
    topConsumo,
    perdidasPorMotivo,
    perdidasDetalle,
    stockBajo,
    totales: {
      entradasCantidad: entradasCantidadTotal,
      entradasCosto: entradasCostoTotal,
      salidasCantidad: salidasCantidadTotal,
      perdidasCantidad: perdidasCantidadTotal,
      perdidasCosto: RA005_MOTIVOS_PERDIDA.reduce(
        (sum, m) => sum + (perdidasPorMotivo[m]?.costo || 0),
        0
      ),
    },
    serieDiaria,
  };
}

/**
 * Serie diaria para un insumo: deltas por día y stock al cierre del día (alineado al inventario actual).
 */
export async function getReporteInventarioTendenciaInsumo(insumoId, fechaInicio, fechaFin) {
  const sid = String(insumoId || '').trim();
  if (!sid) throw new Error('Debe seleccionar un insumo.');
  const fi = String(fechaInicio || '').trim();
  const ff = String(fechaFin || '').trim();
  const { start } = rangeForDateStrInclusive(fi, ff);
  const startMs = start.getTime();

  const itemRef = doc(db, 'inventario', sid);
  const [itemDoc, entSnap, salSnap] = await Promise.all([
    getDoc(itemRef),
    getDocs(query(collection(db, 'entradas_insumos'), where('insumoId', '==', sid))),
    getDocs(query(collection(db, 'salidas_insumos'), where('insumoId', '==', sid))),
  ]);

  if (!itemDoc.exists()) {
    return { insumoId: sid, nombre: '', unidad: '', dias: [], error: 'Insumo no encontrado.' };
  }

  const item = itemDoc.data();
  const nombre = item.nombre || sid;
  const unidad = item.unidad || '';
  const stockActual = Number(item.cantidad || 0);

  const entradas = entSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const salidas = salSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const nowMs = Date.now();
  let entDesdeInicio = 0;
  let salDesdeInicio = 0;
  for (const e of entradas) {
    const t = toMillisSafe(e.timestamp);
    if (t >= startMs && t <= nowMs) entDesdeInicio += Number(e.cantidad || 0);
  }
  for (const s of salidas) {
    const t = toMillisSafe(s.timestamp);
    if (t >= startMs && t <= nowMs) salDesdeInicio += Number(s.cantidad || 0);
  }

  const stockInicioRango = stockActual - entDesdeInicio + salDesdeInicio;

  const dias = ra005EachDateInclusive(fi, ff);
  const series = dias.map((dayStr) => {
    const { start: ds, end: de } = rangeForDateStr(dayStr);
    const d0 = ds.getTime();
    const d1 = de.getTime();
    let entDia = 0;
    let salDia = 0;
    for (const e of entradas) {
      const t = toMillisSafe(e.timestamp);
      if (t >= d0 && t <= d1) entDia += Number(e.cantidad || 0);
    }
    for (const s of salidas) {
      const t = toMillisSafe(s.timestamp);
      if (t >= d0 && t <= d1) salDia += Number(s.cantidad || 0);
    }
    const { end: dayEnd } = rangeForDateStr(dayStr);
    const endMsDay = dayEnd.getTime();
    let entAcum = 0;
    let salAcum = 0;
    for (const e of entradas) {
      const t = toMillisSafe(e.timestamp);
      if (t >= startMs && t <= endMsDay) entAcum += Number(e.cantidad || 0);
    }
    for (const s of salidas) {
      const t = toMillisSafe(s.timestamp);
      if (t >= startMs && t <= endMsDay) salAcum += Number(s.cantidad || 0);
    }
    const stockFin = stockInicioRango + entAcum - salAcum;
    return { fecha: dayStr, entradasDia: entDia, salidasDia: salDia, stockFin };
  });

  return {
    insumoId: sid,
    nombre,
    unidad,
    stockActual,
    stockInicioRango,
    dias: series,
  };
}

/** Umbral HU RA-006: pedido "lento" si supera estos minutos (preparación). */
export const RA006_UMBRAL_LENTO_MINUTOS = 15;

function ra006HourCRFromMs(ms) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date(ms));
  return Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
}

function ra006MesaEtiquetaPedido(p) {
  const origen = String(p.origenPedido || '').trim().toLowerCase();
  const tipo = String(p.tipoPedido || '').trim().toLowerCase();
  if (origen === 'venta_directa' || tipo === 'para_llevar') return 'Para llevar';
  const n = p.mesaNumero;
  if (n != null && Number(n) > 0) return formatMesaLabel(Number(n));
  const mid = String(p.mesaId || '').trim();
  if (mid) return `Mesa (${mid.slice(0, 6)}…)`;
  return '—';
}

/**
 * RA-006: tiempos de cocina por rango (listoAt en CR).
 * Tiempo de preparación = listoAt − (startedAt || createdAt || timestamp), en minutos.
 * Pedidos sin listoAt quedan fuera (no se estima por updatedAt).
 */
export async function getReporteTiemposCocinaRango(fechaInicio, fechaFin) {
  const fi = String(fechaInicio || '').trim();
  const ff = String(fechaFin || '').trim();
  const { start, end } = rangeForDateStrInclusive(fi, ff);

  const [pedidosSnap, productosSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'pedidos'),
        where('listoAt', '>=', start),
        where('listoAt', '<=', end),
        orderBy('listoAt', 'asc')
      )
    ),
    getDocs(collection(db, 'productos')),
  ]);

  const categoriaPorProductoId = {};
  productosSnap.docs.forEach((d) => {
    const x = d.data();
    categoriaPorProductoId[d.id] = String(x.categoria || '').trim() || 'Sin categoría';
  });

  const porHora = Array.from({ length: 24 }, (_, h) => ({ hora: h, cantidad: 0 }));
  const catSum = {};
  const catPeso = {};
  const prepMinutos = [];
  const lentos = [];

  for (const d of pedidosSnap.docs) {
    const p = { id: d.id, ...d.data() };
    const listoMs = toMillisSafe(p.listoAt || p.readyAt);
    if (!listoMs) continue;
    const inicioMs = toMillisSafe(p.startedAt || p.createdAt || p.timestamp);
    if (!inicioMs || listoMs <= inicioMs) continue;
    const mins = (listoMs - inicioMs) / 60000;
    if (!Number.isFinite(mins) || mins < 0 || mins >= 480) continue;

    prepMinutos.push(mins);

    const h = ra006HourCRFromMs(listoMs);
    if (h >= 0 && h < 24) porHora[h].cantidad += 1;

    const items = Array.isArray(p.items) ? p.items : [];
    if (items.length === 0) {
      const k = 'Sin ítems';
      catSum[k] = (catSum[k] || 0) + mins;
      catPeso[k] = (catPeso[k] || 0) + 1;
    } else {
      items.forEach((it) => {
        const pid = String(it.productoId || '').trim();
        const cat = pid && categoriaPorProductoId[pid] ? categoriaPorProductoId[pid] : 'Sin categoría';
        const w = Math.max(0, Number(it.cantidad || 1));
        catSum[cat] = (catSum[cat] || 0) + mins * w;
        catPeso[cat] = (catPeso[cat] || 0) + w;
      });
    }

    if (mins > RA006_UMBRAL_LENTO_MINUTOS) {
      const nombres = items
        .slice(0, 6)
        .map((it) => String(it.nombreSnapshot || it.productoId || 'Ítem').trim())
        .filter(Boolean);
      lentos.push({
        pedidoId: p.id,
        mesaEtiqueta: ra006MesaEtiquetaPedido(p),
        minutos: Math.round(mins * 10) / 10,
        listoAt: p.listoAt || p.readyAt || null,
        itemsResumen: nombres.length ? nombres.join(', ') : '—',
      });
    }
  }

  lentos.sort((a, b) => b.minutos - a.minutos);

  const sorted = [...prepMinutos].sort((a, b) => a - b);
  let medianaMin = null;
  if (sorted.length) {
    const mid = Math.floor(sorted.length / 2);
    medianaMin =
      sorted.length % 2 === 1
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  const promedioMin =
    prepMinutos.length > 0
      ? prepMinutos.reduce((s, x) => s + x, 0) / prepMinutos.length
      : null;

  const porCategoria = Object.keys(catSum)
    .map((categoria) => {
      const w = catPeso[categoria] || 0;
      return {
        categoria,
        promedioMin: w > 0 ? Math.round((catSum[categoria] / w) * 10) / 10 : 0,
        muestrasPeso: w,
      };
    })
    .sort((a, b) => b.promedioMin - a.promedioMin);

  return {
    fechaInicio: fi,
    fechaFin: ff,
    umbralLentoMinutos: RA006_UMBRAL_LENTO_MINUTOS,
    totales: {
      muestras: prepMinutos.length,
      promedioMin: promedioMin != null ? Math.round(promedioMin * 10) / 10 : null,
      medianaMin: medianaMin != null ? Math.round(medianaMin * 10) / 10 : null,
      lentosCount: lentos.length,
    },
    porHora,
    porCategoria,
    lentos: lentos.slice(0, 80),
  };
}

/**
 * Actualiza un insumo existente (nombre, unidad, minCantidad).
 * Valida nombre duplicado si cambia.
 */
export async function updateInsumo(insumoId, { nombre, unidad, minCantidad, adminUid }) {
  if (!insumoId) throw new Error('ID de insumo requerido.');
  if (!nombre || !nombre.trim()) throw new Error('El nombre es obligatorio.');
  if (!unidad || !unidad.trim()) throw new Error('La unidad es obligatoria.');
  const minNum = Number(minCantidad);
  if (isNaN(minNum) || minNum < 0) throw new Error('El stock minimo debe ser mayor o igual a cero.');

  const itemRef = doc(db, 'inventario', insumoId);
  const itemDoc = await getDoc(itemRef);
  if (!itemDoc.exists()) throw new Error('El insumo no existe.');

  const prev = itemDoc.data();
  if (nombre.trim() !== prev.nombre) {
    const q = query(collection(db, 'inventario'), where('nombre', '==', nombre.trim()));
    const snap = await getDocs(q);
    if (!snap.empty) throw new Error('Ya existe un insumo con ese nombre.');
  }

  const cambios = {};
  if (nombre.trim() !== prev.nombre) cambios.nombre = { antes: prev.nombre, despues: nombre.trim() };
  if (unidad.trim() !== prev.unidad) cambios.unidad = { antes: prev.unidad, despues: unidad.trim() };
  if (minNum !== (prev.minCantidad ?? 10)) cambios.minCantidad = { antes: prev.minCantidad ?? 10, despues: minNum };

  await updateDoc(itemRef, {
    nombre: nombre.trim(),
    unidad: unidad.trim(),
    minCantidad: minNum,
    updatedAt: new Date(),
  });

  if (Object.keys(cambios).length > 0) {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'modificacion_insumo',
      adminUid: adminUid || '',
      targetName: prev.nombre,
      cambios,
      timestamp: new Date(),
    });
  }
}

/**
 * Elimina un insumo del inventario.
 */
export async function deleteInsumo(insumoId, adminUid) {
  if (!insumoId) throw new Error('ID de insumo requerido.');
  const itemRef = doc(db, 'inventario', insumoId);
  const itemDoc = await getDoc(itemRef);
  const data = itemDoc.exists() ? itemDoc.data() : {};

  await deleteDoc(itemRef);

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'eliminacion_insumo',
    adminUid: adminUid || '',
    targetName: data.nombre || '',
    detalles: { cantidad: data.cantidad || 0, unidad: data.unidad || '' },
    timestamp: new Date(),
  });
}

/**
 * Ajusta el stock de un insumo a un valor exacto (correccion manual).
 */
export async function ajustarStockInsumo(insumoId, nuevaCantidad, adminUid) {
  if (!insumoId) throw new Error('ID de insumo requerido.');
  const cantNum = Number(nuevaCantidad);
  if (isNaN(cantNum) || cantNum < 0) throw new Error('La cantidad debe ser mayor o igual a cero.');

  const itemRef = doc(db, 'inventario', insumoId);
  const itemDoc = await getDoc(itemRef);
  if (!itemDoc.exists()) throw new Error('El insumo no existe.');

  const prev = itemDoc.data();
  const stockAnterior = prev.cantidad || 0;

  await updateDoc(itemRef, {
    cantidad: cantNum,
    updatedAt: new Date(),
  });

  if (cantNum !== stockAnterior) {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'ajuste_stock',
      adminUid: adminUid || '',
      targetName: prev.nombre || '',
      detalles: { stockAnterior, stockNuevo: cantNum, unidad: prev.unidad || '' },
      timestamp: new Date(),
    });
  }
}

// ==================== CONTEO FISICO ====================

/**
 * Crea un nuevo conteo fisico en progreso.
 */
export async function createConteoFisico(adminUid) {
  const ref = await addDoc(collection(db, 'conteos_fisicos'), {
    adminUid: adminUid || '',
    estado: 'en_progreso',
    items: [],
    timestamp: new Date(),
  });
  return ref.id;
}

/**
 * Obtiene un conteo fisico por ID.
 */
export async function getConteoFisico(conteoId) {
  const d = await getDoc(doc(db, 'conteos_fisicos', conteoId));
  if (!d.exists()) return null;
  return { id: d.id, ...d.data() };
}

/**
 * Agrega o actualiza un item en el conteo. Calcula cantidad registrada desde inventario y la diferencia.
 */
export async function addItemToConteo(conteoId, insumoId, cantidadContada) {
  const cantNum = Number(cantidadContada);
  if (isNaN(cantNum) || cantNum < 0) throw new Error('La cantidad contada debe ser mayor o igual a cero.');

  const conteoRef = doc(db, 'conteos_fisicos', conteoId);
  const conteoDoc = await getDoc(conteoRef);
  if (!conteoDoc.exists()) throw new Error('El conteo no existe.');
  const conteo = conteoDoc.data();
  if (conteo.estado !== 'en_progreso') throw new Error('Este conteo ya fue aplicado o cancelado.');

  const insumoDoc = await getDoc(doc(db, 'inventario', insumoId));
  if (!insumoDoc.exists()) throw new Error('El insumo no existe.');
  const insumo = insumoDoc.data();
  const cantidadRegistrada = insumo.cantidad || 0;
  const diferencia = cantNum - cantidadRegistrada;

  const items = [...(conteo.items || [])];
  const idx = items.findIndex(i => i.insumoId === insumoId);
  const item = {
    insumoId,
    insumoNombre: insumo.nombre || '',
    unidad: insumo.unidad || '',
    cantidadRegistrada,
    cantidadContada: cantNum,
    diferencia,
  };
  if (idx >= 0) items[idx] = item;
  else items.push(item);

  await updateDoc(conteoRef, { items });
}

/**
 * Quita un item del conteo en progreso.
 */
export async function removeItemFromConteo(conteoId, insumoId) {
  const conteoRef = doc(db, 'conteos_fisicos', conteoId);
  const conteoDoc = await getDoc(conteoRef);
  if (!conteoDoc.exists()) throw new Error('El conteo no existe.');
  const conteo = conteoDoc.data();
  if (conteo.estado !== 'en_progreso') throw new Error('Este conteo ya fue aplicado o cancelado.');

  const items = (conteo.items || []).filter(i => i.insumoId !== insumoId);
  await updateDoc(conteoRef, { items });
}

/**
 * Aplica el conteo: ajusta stock de cada item y marca el conteo como aplicado.
 */
export async function aplicarConteoFisico(conteoId, adminUid) {
  const conteoRef = doc(db, 'conteos_fisicos', conteoId);
  const conteoDoc = await getDoc(conteoRef);
  if (!conteoDoc.exists()) throw new Error('El conteo no existe.');
  const conteo = conteoDoc.data();
  if (conteo.estado !== 'en_progreso') throw new Error('Este conteo ya fue aplicado o cancelado.');

  const items = conteo.items || [];
  for (const it of items) {
    if (it.diferencia !== 0) {
      await updateDoc(doc(db, 'inventario', it.insumoId), {
        cantidad: it.cantidadContada,
        updatedAt: new Date(),
      });
    }
  }

  await updateDoc(conteoRef, { estado: 'aplicado' });

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'conteo_fisico_aplicado',
    adminUid: adminUid || '',
    targetName: `Conteo ${conteoId}`,
    detalles: { conteoId, itemsCount: items.length, conDiferencias: items.filter(i => i.diferencia !== 0).length },
    timestamp: new Date(),
  });
}

/**
 * Cancela un conteo en progreso.
 */
export async function cancelarConteoFisico(conteoId) {
  const conteoRef = doc(db, 'conteos_fisicos', conteoId);
  const conteoDoc = await getDoc(conteoRef);
  if (!conteoDoc.exists()) throw new Error('El conteo no existe.');
  const conteo = conteoDoc.data();
  if (conteo.estado !== 'en_progreso') throw new Error('Este conteo ya fue aplicado o cancelado.');
  await updateDoc(conteoRef, { estado: 'cancelado' });
}

/**
 * Lista todos los conteos fisicos ordenados por fecha descendente.
 */
export async function getConteosFisicos() {
  const snapshot = await getDocs(collection(db, 'conteos_fisicos'));
  const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const ta = a.timestamp?.toDate?.() || a.timestamp || 0;
    const tb = b.timestamp?.toDate?.() || b.timestamp || 0;
    return new Date(tb) - new Date(ta);
  });
  return list;
}

// ==================== PRODUCTOS ====================

/**
 * Sube una imagen de producto a Firebase Storage.
 * @param {File} file - Archivo de imagen
 * @returns {Promise<string>} URL publica de descarga
 */
export async function uploadProductImage(file) {
  const ext = file.name.split('.').pop();
  const storageRef = ref(storage, `productos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

/**
 * Crea un producto validando nombre unico, precio positivo y campos obligatorios.
 * @returns {Promise<string>} ID del producto creado
 */
export async function createProducto({ nombre, descripcion, precio, categoria, imagen = null }) {
  if (!nombre || !nombre.trim()) {
    throw new Error('El nombre del producto es obligatorio.');
  }
  if (!descripcion || !descripcion.trim()) {
    throw new Error('La descripcion del producto es obligatoria.');
  }
  if (!categoria || !categoria.trim()) {
    throw new Error('La categoria es obligatoria.');
  }
  const precioNum = Number(precio);
  if (!precioNum || precioNum <= 0) {
    throw new Error('El precio debe ser mayor a cero.');
  }

  const dupeQuery = query(collection(db, 'productos'), where('nombre', '==', nombre.trim()));
  const dupeSnap = await getDocs(dupeQuery);
  if (!dupeSnap.empty) {
    throw new Error('Nombre de plato ya en uso.');
  }

  const docRef = await addDoc(collection(db, 'productos'), {
    nombre: nombre.trim(),
    descripcion: descripcion.trim(),
    precio: precioNum,
    categoria: categoria.trim(),
    imagen: imagen || null,
    disponible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return docRef.id;
}

/**
 * Obtiene todos los productos
 */
export async function getProductos() {
  const snapshot = await getDocs(collection(db, 'productos'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Obtiene las categorias unicas existentes en productos
 */
export async function getCategorias() {
  const productos = await getProductos();
  const set = new Set(productos.map(p => p.categoria).filter(Boolean));
  return [...set].sort();
}

/**
 * Obtiene productos disponibles para el portal publico (sin autenticacion).
 * Usa where('disponible', '==', true) para que coincida con las reglas de Firestore.
 */
export async function getProductosPublicos() {
  const q = query(collection(db, 'productos'), where('disponible', '==', true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Obtiene productos por categoria
 */
export async function getProductosByCategoria(categoria) {
  const q = query(collection(db, 'productos'), where('categoria', '==', categoria));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Actualiza un producto con validaciones, verificacion de nombre unico y registro en auditoria.
 * @param {string} productoId
 * @param {object} updates - { nombre, descripcion, precio, categoria, imagen }
 * @param {string} adminUid - UID del admin que hace el cambio
 * @param {string} [motivoPrecio] - Motivo obligatorio si el precio cambia
 */
export async function updateProducto(productoId, updates, adminUid, motivoPrecio = '') {
  const prevSnap = await getDoc(doc(db, 'productos', productoId));
  if (!prevSnap.exists()) throw new Error('Producto no encontrado.');
  const prev = prevSnap.data();

  if (updates.nombre !== undefined) {
    if (!updates.nombre || !updates.nombre.trim()) throw new Error('El nombre del producto es obligatorio.');
    if (updates.nombre.trim() !== prev.nombre) {
      const dupeQ = query(collection(db, 'productos'), where('nombre', '==', updates.nombre.trim()));
      const dupeSnap = await getDocs(dupeQ);
      const isDupe = dupeSnap.docs.some(d => d.id !== productoId);
      if (isDupe) throw new Error('Nombre de plato ya en uso.');
    }
  }

  if (updates.descripcion !== undefined) {
    if (!updates.descripcion || !updates.descripcion.trim()) throw new Error('La descripcion es obligatoria.');
    if (updates.descripcion.trim().length > 500) throw new Error('La descripcion no puede superar 500 caracteres.');
  }

  if (updates.precio !== undefined) {
    const precioNum = Number(updates.precio);
    if (!precioNum || precioNum <= 0) throw new Error('El precio debe ser mayor a cero.');
    if (precioNum !== prev.precio && !motivoPrecio.trim()) {
      throw new Error('Debe indicar un motivo para el cambio de precio.');
    }
    updates.precio = precioNum;
  }

  if (updates.categoria !== undefined) {
    if (!updates.categoria || !updates.categoria.trim()) throw new Error('La categoria es obligatoria.');
  }

  const cambios = {};
  const fieldsToTrack = ['nombre', 'descripcion', 'precio', 'categoria', 'imagen'];
  for (const field of fieldsToTrack) {
    if (updates[field] === undefined) continue;
    const newVal = typeof updates[field] === 'string' ? updates[field].trim() : updates[field];
    const oldVal = prev[field] ?? null;
    if (newVal !== oldVal) {
      cambios[field] = { antes: oldVal, despues: newVal };
    }
  }

  if (Object.keys(cambios).length === 0) return;

  const cleanUpdates = {};
  for (const field of fieldsToTrack) {
    if (updates[field] === undefined) continue;
    cleanUpdates[field] = typeof updates[field] === 'string' ? updates[field].trim() : updates[field];
  }
  cleanUpdates.updatedAt = new Date();

  await updateDoc(doc(db, 'productos', productoId), cleanUpdates);

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'modificacion_producto',
    targetId: productoId,
    targetName: cleanUpdates.nombre || prev.nombre,
    cambios,
    motivoPrecio: cambios.precio ? motivoPrecio.trim() : null,
    adminUid: adminUid || '',
    timestamp: new Date(),
  });
}

/**
 * Elimina un producto del catalogo y registra la accion en auditoria.
 */
export async function deleteProducto(productoId, adminUid) {
  const snap = await getDoc(doc(db, 'productos', productoId));
  if (!snap.exists()) throw new Error('Producto no encontrado.');
  const prev = snap.data();

  await deleteDoc(doc(db, 'productos', productoId));

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'eliminacion_producto',
    targetId: productoId,
    targetName: prev.nombre,
    detalles: { precio: prev.precio, categoria: prev.categoria },
    adminUid: adminUid || '',
    timestamp: new Date(),
  });
}

// ==================== MESAS ====================

/**
 * Crea una nueva mesa
 * @param {object} mesaData - Datos de la mesa
 * @returns {Promise<string>} ID de la mesa
 */
export async function createMesa(mesaData) {
  try {
    const estadoNormalizado = mesaData.estadoMesa || mesaData.estado || 'libre';
    const docRef = await addDoc(collection(db, 'mesas'), {
      numero: Number(mesaData.numero || 0),
      capacidad: Number(mesaData.capacidad || 4),
      zona: String(mesaData.zona || 'General').trim(),
      estadoMesa: estadoNormalizado,
      estado: estadoNormalizado, // compatibilidad con documentos antiguos
      cuentaActivaId: mesaData.cuentaActivaId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Mesa creada:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error al crear mesa:', error.message);
    throw error;
  }
}

/**
 * Obtiene todas las mesas
 * @returns {Promise<array>}
 */
export async function getMesas() {
  try {
    return await getMesasOrThrow();
  } catch (error) {
    console.error('❌ Error al obtener mesas:', error.message);
    return [];
  }
}

/**
 * Obtiene todas las mesas (versión estricta).
 * Útil para UI: permite mostrar el error real (reglas/permisos/índices).
 * @returns {Promise<array>}
 */
export async function getMesasOrThrow() {
  const snapshot = await getDocs(collection(db, 'mesas'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Mesas que tienen cuenta activa y abierta (útil para Caja/Ventas).
 * Solo incluye mesas cuya cuenta existe en Firestore y estadoCuenta === 'abierta'.
 * Excluye cuentas borradas o cerradas.
 * @returns {Promise<array>}
 */
export async function getMesasConCuentaActivaOrThrow() {
  const mesas = await getMesasOrThrow();
  const conCuenta = mesas.filter(m => !!m.cuentaActivaId);

  const conCuentaExistenteYAbierta = [];
  for (const m of conCuenta) {
    const cuenta = await getCuenta(m.cuentaActivaId);
    if (!cuenta) continue; // cuenta borrada: no mostrar mesa
    if (cuenta.estadoCuenta === 'cerrada') continue; // cuenta cerrada: no mostrar como pendiente
    conCuentaExistenteYAbierta.push(m);
  }

  return conCuentaExistenteYAbierta.sort((a, b) => Number(a.numero || 0) - Number(b.numero || 0));
}

/**
 * Actualiza el estado de una mesa
 * @param {string} mesaId - ID de la mesa
 * @param {string} estado - Nuevo estado (disponible, ocupada, reservada)
 */
export async function updateMesaEstado(mesaId, estado) {
  try {
    await updateDoc(doc(db, 'mesas', mesaId), {
      estadoMesa: estado,
      estado: estado,
      updatedAt: new Date(),
    });
    console.log('✅ Mesa actualizada:', mesaId);
  } catch (error) {
    console.error('❌ Error al actualizar mesa:', error.message);
    throw error;
  }
}

/**
 * Libera la mesa asociada a una cuenta cerrada.
 * Solo limpia cuentaActivaId si coincide con la cuenta que se está cerrando.
 */
async function liberarMesaSiCorresponde({ mesaId, cuentaId, now = new Date() }) {
  const mesaIdSafe = String(mesaId || '').trim();
  const cuentaIdSafe = String(cuentaId || '').trim();
  if (!mesaIdSafe || !cuentaIdSafe) return;

  const mesaRef = doc(db, 'mesas', mesaIdSafe);
  const mesaSnap = await getDoc(mesaRef);
  if (!mesaSnap.exists()) return;

  const mesa = mesaSnap.data() || {};
  const cuentaActivaId = String(mesa.cuentaActivaId || '').trim();
  if (cuentaActivaId && cuentaActivaId !== cuentaIdSafe) {
    return;
  }

  await updateDoc(mesaRef, {
    cuentaActivaId: null,
    estadoMesa: 'por_limpiar',
    estado: 'por_limpiar',
    updatedAt: now,
  });
}

/**
 * Actualiza los datos editables de una mesa.
 * @param {string} mesaId
 * @param {object} data - { numero, capacidad, zona, estadoMesa }
 */
export async function updateMesa(mesaId, data) {
  const mesaRef = doc(db, 'mesas', mesaId);
  const snap = await getDoc(mesaRef);
  if (!snap.exists()) {
    const err = new Error('Mesa no encontrada.');
    err.code = 'MESA_NOT_FOUND';
    throw err;
  }

  const payload = {
    numero: Number(data.numero || 0),
    capacidad: Number(data.capacidad || 4),
    zona: String(data.zona || 'General').trim(),
    updatedAt: new Date(),
  };

  if (data.estadoMesa) {
    payload.estadoMesa = data.estadoMesa;
    payload.estado = data.estadoMesa;
  }

  await updateDoc(mesaRef, payload);
}

/**
 * Elimina una mesa si no tiene cuenta activa.
 * @param {string} mesaId
 */
export async function deleteMesa(mesaId) {
  const mesaRef = doc(db, 'mesas', mesaId);
  const snap = await getDoc(mesaRef);
  if (!snap.exists()) {
    const err = new Error('Mesa no encontrada.');
    err.code = 'MESA_NOT_FOUND';
    throw err;
  }

  const mesa = snap.data();
  if (mesa.cuentaActivaId) {
    const err = new Error('No se puede eliminar una mesa con cuenta activa.');
    err.code = 'MESA_CON_CUENTA';
    throw err;
  }

  await deleteDoc(mesaRef);
}

// ==================== FLOOR PLAN (EDITOR DE PLANO) ====================

const FLOOR_PLAN_DOC_ID = 'main';

/**
 * Documento único del plano (floorPlan/main).
 * @returns {Promise<object|null>}
 */
export async function getFloorPlan() {
  try {
    const ref = doc(db, 'floorPlan', FLOOR_PLAN_DOC_ID);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error('❌ Error al obtener floorPlan:', error.message);
    return null;
  }
}

/**
 * Suscripción en tiempo real al documento del plano.
 * Devuelve la función de unsuscripción.
 * @param {(plan: object|null) => void} callback
 */
export function onFloorPlanSnapshot(callback) {
  const ref = doc(db, 'floorPlan', FLOOR_PLAN_DOC_ID);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback({ id: snap.id, ...snap.data() });
    },
    (error) => {
      console.error('❌ Error en snapshot floorPlan:', error.message);
      callback(null);
    }
  );
}

/**
 * Elimina recursivamente claves con valor null/undefined dentro de un objeto/array.
 * Evita guardar nulls implícitos que ensucian la lectura del documento.
 */
function stripNulls(value) {
  if (Array.isArray(value)) {
    return value.map((v) => stripNulls(v));
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === null || v === undefined) continue;
      out[k] = stripNulls(v);
    }
    return out;
  }
  return value;
}

/**
 * Guarda el documento del plano (merge=false para reemplazar estructura completa).
 * Solo admin debería invocar esto desde UI (las reglas lo enforcen igual).
 *
 * Esquema: cada sección es un plano independiente con su propio canvas/elements.
 * @param {object} plan - { sections:[{id,name,color,canvasWidth,canvasHeight,elements:[...]}], activeSectionId }
 * @param {string} userUid - uid del que guarda, para auditoría
 */
export async function saveFloorPlan(plan, userUid = null) {
  const ref = doc(db, 'floorPlan', FLOOR_PLAN_DOC_ID);
  const sections = Array.isArray(plan?.sections)
    ? plan.sections.map((s) => stripNulls(s))
    : [];
  const payload = {
    sections,
    activeSectionId: plan?.activeSectionId || null,
    updatedAt: new Date(),
  };
  if (userUid) payload.updatedByUid = userUid;
  await setDoc(ref, payload, { merge: false });
}

// ==================== TRANSACCIONES (CONTABILIDAD) ====================

/**
 * Registra una transacción (venta, pago, gasto, etc.)
 * @param {object} transaccionData - Datos de la transacción
 * @returns {Promise<string>} ID de la transacción
 */
export async function createTransaccion(transaccionData) {
  try {
    const docRef = await addDoc(collection(db, 'transacciones'), {
      ...transaccionData,
      tipo: transaccionData.tipo || 'venta', // venta, pago, gasto, devolución
      monto: transaccionData.monto || 0,
      timestamp: new Date(),
      createdAt: new Date(),
    });
    console.log('✅ Transacción registrada:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error al crear transacción:', error.message);
    throw error;
  }
}

/**
 * Obtiene todas las transacciones
 * @returns {Promise<array>}
 */
export async function getTransacciones() {
  try {
    const q = query(collection(db, 'transacciones'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('❌ Error al obtener transacciones:', error.message);
    return [];
  }
}

/**
 * Obtiene transacciones de un rango de fechas
 * @param {Date} fechaInicio - Fecha de inicio
 * @param {Date} fechaFin - Fecha de fin
 * @returns {Promise<array>}
 */
export async function getTransaccionesPorFecha(fechaInicio, fechaFin) {
  try {
    const q = query(
      collection(db, 'transacciones'),
      where('timestamp', '>=', fechaInicio),
      where('timestamp', '<=', fechaFin),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('❌ Error al obtener transacciones por fecha:', error.message);
    return [];
  }
}

/**
 * Fecha calendario (YYYY-MM-DD) en zona America/Costa_Rica (operacion del negocio).
 */
export function toDateStrCR(dateValue) {
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (!Number.isFinite(d.getTime())) return '1970-01-01';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const day = parts.find((p) => p.type === 'day').value;
  return `${y}-${m}-${day}`;
}

/**
 * Rango [start, end] para consultas Firestore del dia `fecha` (YYYY-MM-DD) en Costa Rica.
 * CR es UTC-6 fijo: inicio 00:00 CR = 06:00 UTC; fin 23:59:59.999 CR = 05:59:59.999 UTC del dia siguiente.
 */
export function rangeForDateStr(fecha) {
  const s = String(fecha || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) {
    const base = new Date(`${s}T00:00:00`);
    const start = new Date(base);
    const end = new Date(base);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  const y = Number(match[1]);
  const mo = Number(match[2]);
  const d = Number(match[3]);
  const startMs = Date.UTC(y, mo - 1, d, 6, 0, 0, 0);
  const endMs = Date.UTC(y, mo - 1, d + 1, 5, 59, 59, 999);
  return { start: new Date(startMs), end: new Date(endMs) };
}

/**
 * Rango [start, end] desde el inicio del dia `fechaInicio` hasta el fin del dia `fechaFin` (YYYY-MM-DD) en CR.
 */
export function rangeForDateStrInclusive(fechaInicio, fechaFin) {
  const a = String(fechaInicio || '').trim();
  const b = String(fechaFin || '').trim();
  if (!a || !b) throw new Error('Rango de fechas inválido.');
  if (a > b) throw new Error('La fecha inicial no puede ser posterior a la final.');
  const { start } = rangeForDateStr(a);
  const { end } = rangeForDateStr(b);
  return { start, end };
}

const FORMAL_EXPENSE_MIN_AMOUNT = 50000;
const ROLES_CORRECCION = ['admin', 'cajero', 'contador'];

function buildInternalComprobanteCode(tipo, now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const prefix = String(tipo || '').toLowerCase() === 'gasto' ? 'GAS' : 'VEN';
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${y}${m}${d}-${hh}${mm}${ss}-${random}`;
}

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function assertRoleCanCorrect(rolEjecutor) {
  const role = normalizeRole(rolEjecutor);
  if (!ROLES_CORRECCION.includes(role)) {
    throw new Error('Permisos insuficientes para correcciones.');
  }
}

async function isFechaConCierreCerrado(fechaStr) {
  const q = query(
    collection(db, 'cierres_caja'),
    where('fecha', '==', fechaStr),
    where('estado', '==', 'cerrado')
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

function isMovimientoAnulado(data) {
  return String(data?.estado || 'activo').toLowerCase() === 'anulado';
}

function toAmountAbs(data) {
  return Math.abs(Number(data?.montoAbsoluto ?? data?.monto ?? 0));
}

async function resolveVentaReferencia(referenciaRaw) {
  const referencia = String(referenciaRaw || '').trim();
  if (!referencia) throw new Error('Debe indicar referencia de venta.');

  if (referencia.startsWith('pago_')) {
    const pagoId = referencia.slice(5);
    if (!pagoId) throw new Error('Venta no encontrada.');
    const pagoSnap = await getDoc(doc(db, 'pagos', pagoId));
    if (!pagoSnap.exists()) throw new Error('Venta no encontrada.');
    const data = pagoSnap.data() || {};
    return {
      source: 'pos_auto',
      docId: pagoId,
      ventaKey: `pos:${pagoId}`,
      montoOriginal: Math.abs(Number(data.montoTotal || 0)),
      fechaOriginal: data.createdAt?.toDate ? toDateStrCR(data.createdAt.toDate()) : toDateStrCR(data.createdAt || new Date()),
      descripcion: `Venta POS ${pagoId}`,
    };
  }

  const txSnap = await getDoc(doc(db, 'transacciones', referencia));
  if (txSnap.exists()) {
    const data = txSnap.data() || {};
    if (String(data.tipo || '').toLowerCase() !== 'venta') {
      throw new Error('Venta no encontrada.');
    }
    return {
      source: 'manual',
      docId: referencia,
      ventaKey: `manual:${referencia}`,
      montoOriginal: toAmountAbs(data),
      fechaOriginal: String(data.fecha || '').trim() || toDateStrCR(new Date()),
      descripcion: data.descripcion || `Venta manual ${referencia}`,
    };
  }

  const qComp = query(collection(db, 'transacciones'), where('comprobanteInterno', '==', referencia));
  const compSnap = await getDocs(qComp);
  const ventaDoc = compSnap.docs.find(d => String(d.data()?.tipo || '').toLowerCase() === 'venta');
  if (!ventaDoc) throw new Error('Venta no encontrada.');
  const ventaData = ventaDoc.data() || {};
  return {
    source: 'manual',
    docId: ventaDoc.id,
    ventaKey: `manual:${ventaDoc.id}`,
    montoOriginal: toAmountAbs(ventaData),
    fechaOriginal: String(ventaData.fecha || '').trim() || toDateStrCR(new Date()),
    descripcion: ventaData.descripcion || `Venta manual ${referencia}`,
  };
}

/**
 * CF-001: Registra movimiento financiero manual (venta o gasto).
 */
export async function createMovimientoFinanciero({
  fecha,
  tipo,
  monto,
  descripcion,
  origen = '',
  categoria = '',
  categoriaPersonalizada = '',
  proveedor = '',
  numeroFactura = '',
  usuarioUid = null,
}) {
  const fechaStr = String(fecha || '').trim();
  if (!fechaStr) throw new Error('La fecha es obligatoria.');

  const hoy = toDateStrCR(new Date());
  if (fechaStr > hoy) throw new Error('La fecha no puede ser futura.');

  const tipoNorm = String(tipo || '').trim().toLowerCase();
  if (tipoNorm !== 'venta' && tipoNorm !== 'gasto') {
    throw new Error('Tipo de movimiento invalido.');
  }

  const amount = Number(monto || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Monto debe ser positivo.');
  }

  const descripcionTrim = String(descripcion || '').trim();
  if (!descripcionTrim) {
    throw new Error('Ingrese descripcion del movimiento.');
  }

  const origenTrim = String(origen || '').trim();
  const categoriaTrim = String(categoria || '').trim();
  const categoriaCustomTrim = String(categoriaPersonalizada || '').trim();
  const proveedorTrim = String(proveedor || '').trim();
  const facturaTrim = String(numeroFactura || '').trim();
  const facturaNorm = facturaTrim.toLowerCase();

  if (tipoNorm === 'venta' && !origenTrim) {
    throw new Error('El origen es obligatorio para ventas.');
  }
  if (tipoNorm === 'gasto' && !categoriaTrim) {
    throw new Error('La categoria es obligatoria para gastos.');
  }
  if (tipoNorm === 'gasto' && categoriaTrim === 'otros' && !categoriaCustomTrim) {
    throw new Error('Debe indicar la categoria personalizada.');
  }
  const isFormalExpense = tipoNorm === 'gasto' && Math.abs(amount) >= FORMAL_EXPENSE_MIN_AMOUNT;
  if (isFormalExpense && !proveedorTrim) {
    throw new Error('El proveedor es obligatorio para gastos mayores o iguales a ₡50,000.');
  }
  if (isFormalExpense && !facturaTrim) {
    throw new Error('El numero de factura es obligatorio para gastos mayores o iguales a ₡50,000.');
  }
  if (tipoNorm === 'gasto' && facturaNorm) {
    const q = query(collection(db, 'transacciones'), where('tipo', '==', 'gasto'));
    const snap = await getDocs(q);
    const duplicada = snap.docs.some(d => {
      const data = d.data() || {};
      const estado = String(data.estado || 'activo').toLowerCase();
      const facturaDoc = String(data.numeroFacturaNormalized || '').toLowerCase();
      return estado !== 'anulado' && facturaDoc === facturaNorm;
    });
    if (duplicada) {
      throw new Error('Factura ya registrada.');
    }
  }

  const now = new Date();
  const signedAmount = tipoNorm === 'gasto' ? -Math.abs(amount) : Math.abs(amount);
  const comprobanteInterno = buildInternalComprobanteCode(tipoNorm, now);

  const ref = await addDoc(collection(db, 'transacciones'), {
    tipo: tipoNorm,
    monto: signedAmount,
    montoAbsoluto: Math.abs(amount),
    fecha: fechaStr,
    descripcion: descripcionTrim,
    origen: origenTrim || null,
    categoria: categoriaTrim || null,
    categoriaPersonalizada: tipoNorm === 'gasto' && categoriaTrim === 'otros' ? categoriaCustomTrim : null,
    categoriaLabel: tipoNorm === 'gasto'
      ? (categoriaTrim === 'otros' ? categoriaCustomTrim : categoriaTrim)
      : null,
    proveedor: tipoNorm === 'gasto' ? (proveedorTrim || null) : null,
    numeroFactura: tipoNorm === 'gasto' ? (facturaTrim || null) : null,
    numeroFacturaNormalized: tipoNorm === 'gasto' ? (facturaNorm || null) : null,
    comprobanteInterno,
    estado: 'activo',
    origenSistema: 'manual_cf001',
    createdByUid: usuarioUid || null,
    timestamp: now,
    createdAt: now,
    updatedAt: now,
  });

  return ref.id;
}

/**
 * CF-003: Anulación de gasto con motivo obligatorio.
 */
export async function anularGastoOperativo({
  transaccionId,
  motivo,
  usuarioUid = null,
}) {
  if (!transaccionId) throw new Error('transaccionId es obligatorio.');
  const motivoTrim = String(motivo || '').trim();
  if (!motivoTrim) throw new Error('Debe indicar motivo para anular gasto.');

  const txRef = doc(db, 'transacciones', transaccionId);
  const snap = await getDoc(txRef);
  if (!snap.exists()) throw new Error('Gasto no encontrado.');
  const data = snap.data() || {};
  if (String(data.tipo || '').toLowerCase() !== 'gasto') {
    throw new Error('La transaccion no corresponde a un gasto.');
  }
  if (String(data.estado || 'activo').toLowerCase() === 'anulado') {
    throw new Error('El gasto ya fue anulado.');
  }

  const now = new Date();
  await updateDoc(txRef, {
    estado: 'anulado',
    motivoAnulacion: motivoTrim,
    anuladoAt: now,
    anuladoPorUid: usuarioUid || null,
    updatedAt: now,
  });

  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'anulacion_gasto_operativo',
      transaccionId,
      uid: usuarioUid || null,
      detalles: {
        fecha: data.fecha || null,
        categoria: data.categoria || null,
        numeroFactura: data.numeroFactura || null,
        montoAbsoluto: Number(data.montoAbsoluto || 0),
        motivo: motivoTrim,
      },
      timestamp: now,
    });
  } catch (_) {}
}

/**
 * CF-004: Registro de devolución asociada a una venta original.
 */
export async function createAjusteDevolucion({
  fecha,
  referenciaVenta,
  montoDevolucion,
  motivo,
  usuarioUid = null,
}) {
  const fechaStr = String(fecha || '').trim();
  if (!fechaStr) throw new Error('La fecha es obligatoria.');
  const hoy = toDateStrCR(new Date());
  if (fechaStr > hoy) throw new Error('La fecha no puede ser futura.');

  const amount = Number(montoDevolucion || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Monto debe ser positivo.');
  }

  const motivoTrim = String(motivo || '').trim();
  if (!motivoTrim) {
    throw new Error('Ingrese motivo de la devolución.');
  }

  const venta = await resolveVentaReferencia(referenciaVenta);
  if (!venta?.ventaKey || !Number.isFinite(venta.montoOriginal) || venta.montoOriginal <= 0) {
    throw new Error('Venta no encontrada.');
  }

  const qDev = query(collection(db, 'transacciones'), where('tipo', '==', 'devolucion'));
  const devSnap = await getDocs(qDev);
  const totalPrevio = devSnap.docs
    .map(d => d.data() || {})
    .filter(d => !isMovimientoAnulado(d) && String(d.referenciaVentaKey || '') === venta.ventaKey)
    .reduce((sum, d) => sum + toAmountAbs(d), 0);

  if (totalPrevio + Math.abs(amount) > venta.montoOriginal) {
    throw new Error('Monto devuelto no puede exceder venta original.');
  }

  const now = new Date();
  const comprobanteInterno = buildInternalComprobanteCode('devolucion', now);
  const ref = await addDoc(collection(db, 'transacciones'), {
    tipo: 'devolucion',
    monto: -Math.abs(amount),
    montoAbsoluto: Math.abs(amount),
    fecha: fechaStr,
    descripcion: `Devolución: ${motivoTrim}`,
    origen: 'Ajuste',
    categoria: 'devolucion',
    categoriaLabel: 'devolucion',
    referenciaVenta: String(referenciaVenta || '').trim(),
    referenciaVentaKey: venta.ventaKey,
    referenciaVentaId: venta.docId,
    referenciaVentaSource: venta.source,
    motivoDevolucion: motivoTrim,
    comprobanteInterno,
    estado: 'activo',
    origenSistema: 'cf004_devolucion',
    createdByUid: usuarioUid || null,
    timestamp: now,
    createdAt: now,
    updatedAt: now,
  });

  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'ajuste_devolucion',
      transaccionId: ref.id,
      uid: usuarioUid || null,
      detalles: {
        referenciaVenta: String(referenciaVenta || '').trim(),
        ventaKey: venta.ventaKey,
        montoDevolucion: Math.abs(amount),
        montoVentaOriginal: venta.montoOriginal,
      },
      timestamp: now,
    });
  } catch (_) {}

  return ref.id;
}

/**
 * CF-004: Lista ventas referenciables para devolución.
 */
export async function getVentasReferenciablesParaDevolucion({
  fechaInicio,
  fechaFin,
}) {
  if (!fechaInicio || !fechaFin) return [];

  const [manualRaw, posRaw] = await Promise.all([
    getMovimientosFinancierosByRange(fechaInicio, fechaFin),
    getVentasPOSByRange(fechaInicio, fechaFin),
  ]);

  const manualVentas = manualRaw
    .filter(m => String(m.tipo || '').toLowerCase() === 'venta')
    .filter(m => !isMovimientoAnulado(m));

  const devoluciones = manualRaw
    .filter(m => String(m.tipo || '').toLowerCase() === 'devolucion')
    .filter(m => !isMovimientoAnulado(m));

  const devByRef = {};
  devoluciones.forEach(m => {
    const key = String(m.referenciaVentaKey || '').trim();
    if (!key) return;
    devByRef[key] = (devByRef[key] || 0) + toAmountAbs(m);
  });

  const options = [];

  manualVentas.forEach(m => {
    const key = `manual:${m.id}`;
    const montoOriginal = toAmountAbs(m);
    const montoDevuelto = Number(devByRef[key] || 0);
    const montoDisponible = Math.max(0, montoOriginal - montoDevuelto);
    if (montoDisponible <= 0) return;

    options.push({
      key,
      value: m.id,
      tipoFuente: 'manual',
      fecha: String(m.fecha || ''),
      descripcion: String(m.descripcion || 'Venta manual'),
      montoOriginal,
      montoDevuelto,
      montoDisponible,
      comprobanteInterno: m.comprobanteInterno || null,
      referenciaDocId: m.id,
    });
  });

  posRaw.forEach(m => {
    const pagoId = String(m.referenciaId || '').trim();
    if (!pagoId) return;
    const key = `pos:${pagoId}`;
    const montoOriginal = toAmountAbs(m);
    const montoDevuelto = Number(devByRef[key] || 0);
    const montoDisponible = Math.max(0, montoOriginal - montoDevuelto);
    if (montoDisponible <= 0) return;

    options.push({
      key,
      value: `pago_${pagoId}`,
      tipoFuente: 'pos',
      fecha: String(m.fecha || ''),
      descripcion: String(m.descripcion || 'Venta POS'),
      montoOriginal,
      montoDevuelto,
      montoDisponible,
      comprobanteInterno: null,
      referenciaDocId: pagoId,
    });
  });

  options.sort((a, b) => {
    const byDate = String(b.fecha || '').localeCompare(String(a.fecha || ''));
    if (byDate !== 0) return byDate;
    return Number(b.montoDisponible || 0) - Number(a.montoDisponible || 0);
  });

  return options;
}

/**
 * CF-007: Corrección de movimiento manual.
 */
export async function corregirMovimientoFinanciero({
  transaccionId,
  tipo,
  monto,
  descripcion,
  origen,
  categoria,
  motivo,
  usuarioUid = null,
  rolEjecutor = '',
}) {
  assertRoleCanCorrect(rolEjecutor);
  if (!transaccionId) throw new Error('transaccionId es obligatorio.');
  const motivoTrim = String(motivo || '').trim();
  if (!motivoTrim) throw new Error('Debe indicar motivo de corrección.');

  const txRef = doc(db, 'transacciones', transaccionId);
  const snap = await getDoc(txRef);
  if (!snap.exists()) throw new Error('Movimiento no encontrado.');
  const data = snap.data() || {};

  if (isMovimientoAnulado(data)) throw new Error('El movimiento ya está anulado.');
  const fecha = String(data.fecha || '').trim();
  if (fecha && await isFechaConCierreCerrado(fecha)) {
    throw new Error('Movimiento en período cerrado, reabra cierre primero.');
  }

  const tipoActual = String(data.tipo || '').toLowerCase();
  if (tipoActual !== 'venta' && tipoActual !== 'gasto' && tipoActual !== 'devolucion') {
    throw new Error('Solo se pueden corregir movimientos manuales.');
  }

  const nextTipo = tipo ? String(tipo).trim().toLowerCase() : tipoActual;
  if (!['venta', 'gasto', 'devolucion'].includes(nextTipo)) {
    throw new Error('Tipo de movimiento invalido.');
  }

  const amountRaw = monto === undefined || monto === null || monto === '' ? toAmountAbs(data) : Number(monto);
  if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
    throw new Error('Monto debe ser positivo.');
  }

  const descTrim = descripcion === undefined ? String(data.descripcion || '').trim() : String(descripcion || '').trim();
  if (!descTrim) throw new Error('Ingrese descripcion del movimiento.');

  const origenTrim = origen === undefined ? String(data.origen || '').trim() : String(origen || '').trim();
  const categoriaTrim = categoria === undefined ? String(data.categoria || '').trim() : String(categoria || '').trim();

  if (nextTipo === 'venta' && !origenTrim) throw new Error('El origen es obligatorio para ventas.');
  if ((nextTipo === 'gasto' || nextTipo === 'devolucion') && !categoriaTrim) {
    throw new Error('La categoria es obligatoria para egresos.');
  }

  const signedAmount = nextTipo === 'venta' ? Math.abs(amountRaw) : -Math.abs(amountRaw);
  const now = new Date();
  await updateDoc(txRef, {
    tipo: nextTipo,
    monto: signedAmount,
    montoAbsoluto: Math.abs(amountRaw),
    descripcion: descTrim,
    origen: nextTipo === 'venta' ? origenTrim : (origenTrim || null),
    categoria: nextTipo !== 'venta' ? categoriaTrim : null,
    categoriaLabel: nextTipo !== 'venta' ? (categoriaTrim || null) : null,
    ultimoMotivoCorreccion: motivoTrim,
    ultimaCorreccionAt: now,
    ultimaCorreccionPorUid: usuarioUid || null,
    updatedAt: now,
  });

  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'correccion_movimiento_financiero',
      transaccionId,
      uid: usuarioUid || null,
      detalles: {
        tipoAnterior: tipoActual,
        tipoNuevo: nextTipo,
        montoAnterior: toAmountAbs(data),
        montoNuevo: Math.abs(amountRaw),
        motivo: motivoTrim,
      },
      timestamp: now,
    });
  } catch (_) {}
}

/**
 * CF-007: Anulación de movimiento manual con motivo.
 */
export async function anularMovimientoFinanciero({
  transaccionId,
  motivo,
  usuarioUid = null,
  rolEjecutor = '',
}) {
  assertRoleCanCorrect(rolEjecutor);
  if (!transaccionId) throw new Error('transaccionId es obligatorio.');
  const motivoTrim = String(motivo || '').trim();
  if (!motivoTrim) throw new Error('Ingrese motivo para anulación.');

  const txRef = doc(db, 'transacciones', transaccionId);
  const snap = await getDoc(txRef);
  if (!snap.exists()) throw new Error('Movimiento no encontrado.');
  const data = snap.data() || {};
  if (isMovimientoAnulado(data)) throw new Error('El movimiento ya fue anulado.');

  const fecha = String(data.fecha || '').trim();
  if (fecha && await isFechaConCierreCerrado(fecha)) {
    throw new Error('Movimiento en período cerrado, reabra cierre primero.');
  }

  const now = new Date();
  await updateDoc(txRef, {
    estado: 'anulado',
    motivoAnulacion: motivoTrim,
    anuladoAt: now,
    anuladoPorUid: usuarioUid || null,
    updatedAt: now,
  });

  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'anulacion_movimiento_financiero',
      transaccionId,
      uid: usuarioUid || null,
      detalles: {
        tipo: String(data.tipo || '').toLowerCase(),
        montoAbsoluto: toAmountAbs(data),
        motivo: motivoTrim,
      },
      timestamp: now,
    });
  } catch (_) {}
}

/**
 * CF-001: Lista movimientos financieros manuales por fecha (YYYY-MM-DD).
 */
export async function getMovimientosFinancierosByDate(fecha) {
  if (!fecha) return [];
  const q = query(collection(db, 'transacciones'), where('fecha', '==', fecha));
  const snap = await getDocs(q);
  const list = snap.docs.map(d => ({ id: d.id, ...d.data(), source: 'manual' }));
  list.sort((a, b) => {
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || a.timestamp || 0).getTime();
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || b.timestamp || 0).getTime();
    return tb - ta;
  });
  return list;
}

export async function getMovimientosFinancierosByRange(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return [];
  const q = query(
    collection(db, 'transacciones'),
    where('fecha', '>=', fechaInicio),
    where('fecha', '<=', fechaFin)
  );
  const snap = await getDocs(q);
  const list = snap.docs.map(d => ({ id: d.id, ...d.data(), source: 'manual' }));
  list.sort((a, b) => {
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || a.timestamp || 0).getTime();
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || b.timestamp || 0).getTime();
    return tb - ta;
  });
  return list;
}

/**
 * CF-001: Importación automática de ventas POS desde colección `pagos`.
 */
export async function getVentasPOSByDate(fecha) {
  if (!fecha) return [];
  const { start, end } = rangeForDateStr(fecha);
  const [pagosSnap, cuentasSnap] = await Promise.all([
    getDocs(query(
      collection(db, 'pagos'),
      where('createdAt', '>=', start),
      where('createdAt', '<=', end)
    )),
    getDocs(query(
      collection(db, 'cuentas'),
      where('cobradoAt', '>=', start),
      where('cobradoAt', '<=', end)
    )),
  ]);

  const pagosList = pagosSnap.docs.map(d => {
    const data = d.data() || {};
    const amount = Number(data.montoTotal || 0);
    return {
      id: `pago_${d.id}`,
      tipo: 'venta',
      monto: Math.abs(amount),
      montoAbsoluto: Math.abs(amount),
      fecha,
      descripcion: `Venta POS - ${data.metodo || 'metodo no indicado'}`,
      origen: 'POS',
      categoria: null,
      origenSistema: 'pos_auto',
      createdAt: data.createdAt || null,
      source: 'pos_auto',
      referenciaId: d.id,
      mesaId: data.mesaId || null,
      cuentaId: data.cuentaId || null,
      metodo: normalizeMetodoPago(data.metodo),
      tipoVenta: data.tipoVenta || null,
    };
  });

  const ventasDirectasList = cuentasSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(c => String(c.tipoVenta || '').trim().toLowerCase() === 'directa_para_llevar')
    .filter(c => {
      const estado = String(c.estadoCuenta || '').trim().toLowerCase();
      const estadoPago = String(c.estadoPago || '').trim().toLowerCase();
      return estado === 'cobrada' || estado === 'cerrada' || estadoPago === 'pagado';
    })
    .map(c => {
      const amount = Number(c.montoTotal || 0);
      return {
        id: `venta_directa_${c.id}`,
        tipo: 'venta',
        monto: Math.abs(amount),
        montoAbsoluto: Math.abs(amount),
        fecha,
        descripcion: `Venta directa - ${c.metodoPago || 'metodo no indicado'}`,
        origen: 'POS',
        categoria: null,
        origenSistema: 'pos_auto_directa',
        createdAt: c.cobradoAt || c.updatedAt || null,
        source: 'pos_auto_directa',
        referenciaId: c.id,
        mesaId: c.mesaId || null,
        cuentaId: c.id,
        metodo: normalizeMetodoPago(c.metodoPago),
        tipoVenta: c.tipoVenta || 'directa_para_llevar',
      };
    });

  const list = [...pagosList, ...ventasDirectasList];
  list.sort((a, b) => {
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
  return list;
}

export async function getVentasPOSByRange(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return [];
  const start = new Date(`${fechaInicio}T00:00:00`);
  const end = new Date(`${fechaFin}T23:59:59.999`);
  const [pagosSnap, cuentasSnap] = await Promise.all([
    getDocs(query(
      collection(db, 'pagos'),
      where('createdAt', '>=', start),
      where('createdAt', '<=', end)
    )),
    getDocs(query(
      collection(db, 'cuentas'),
      where('cobradoAt', '>=', start),
      where('cobradoAt', '<=', end)
    )),
  ]);

  const pagosList = pagosSnap.docs.map(d => {
    const data = d.data() || {};
    const amount = Number(data.montoTotal || 0);
    const createdAt = data.createdAt || null;
    const fecha = createdAt?.toDate ? toDateStrCR(createdAt.toDate()) : toDateStrCR(createdAt || new Date());
    return {
      id: `pago_${d.id}`,
      tipo: 'venta',
      monto: Math.abs(amount),
      montoAbsoluto: Math.abs(amount),
      fecha,
      descripcion: `Venta POS - ${data.metodo || 'metodo no indicado'}`,
      origen: 'POS',
      categoria: null,
      origenSistema: 'pos_auto',
      createdAt,
      source: 'pos_auto',
      referenciaId: d.id,
      mesaId: data.mesaId || null,
      cuentaId: data.cuentaId || null,
      metodo: normalizeMetodoPago(data.metodo),
      tipoVenta: data.tipoVenta || null,
    };
  });

  const ventasDirectasList = cuentasSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(c => String(c.tipoVenta || '').trim().toLowerCase() === 'directa_para_llevar')
    .filter(c => {
      const estado = String(c.estadoCuenta || '').trim().toLowerCase();
      const estadoPago = String(c.estadoPago || '').trim().toLowerCase();
      return estado === 'cobrada' || estado === 'cerrada' || estadoPago === 'pagado';
    })
    .map(c => {
      const amount = Number(c.montoTotal || 0);
      const createdAt = c.cobradoAt || c.updatedAt || null;
      const fecha = createdAt?.toDate ? toDateStrCR(createdAt.toDate()) : toDateStrCR(createdAt || new Date());
      return {
        id: `venta_directa_${c.id}`,
        tipo: 'venta',
        monto: Math.abs(amount),
        montoAbsoluto: Math.abs(amount),
        fecha,
        descripcion: `Venta directa - ${c.metodoPago || 'metodo no indicado'}`,
        origen: 'POS',
        categoria: null,
        origenSistema: 'pos_auto_directa',
        createdAt,
        source: 'pos_auto_directa',
        referenciaId: c.id,
        mesaId: c.mesaId || null,
        cuentaId: c.id,
        metodo: normalizeMetodoPago(c.metodoPago),
        tipoVenta: c.tipoVenta || 'directa_para_llevar',
      };
    });

  const list = [...pagosList, ...ventasDirectasList];
  list.sort((a, b) => {
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
  return list;
}

/** Siguiente día calendario en CR (misma lógica que toDateStrCR sobre los cobros). */
function ra004NextCalendarDayCR(dateStr) {
  const { start } = rangeForDateStr(String(dateStr || '').trim());
  const next = new Date(start.getTime() + 86400000);
  return toDateStrCR(next);
}

function ra004PrevCalendarDayCR(dateStr) {
  const { start } = rangeForDateStr(String(dateStr || '').trim());
  const prev = new Date(start.getTime() - 86400000);
  return toDateStrCR(prev);
}

function ra004EachDateInclusive(startStr, endStr) {
  const out = [];
  let cur = String(startStr || '').trim();
  const end = String(endStr || '').trim();
  while (cur <= end) {
    out.push(cur);
    if (cur === end) break;
    cur = ra004NextCalendarDayCR(cur);
  }
  return out;
}

/** Lunes de la semana calendario CR que contiene `dateStr` (YYYY-MM-DD). */
function ra004MondayKeyFromDateStr(dateStr) {
  let cur = String(dateStr || '').trim();
  for (let i = 0; i < 7; i += 1) {
    const { start } = rangeForDateStr(cur);
    const noon = new Date(start.getTime() + 12 * 3600000);
    const w = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Costa_Rica',
      weekday: 'long',
    }).format(noon);
    if (w === 'Monday') return cur;
    cur = ra004PrevCalendarDayCR(cur);
  }
  return cur;
}

function ra004MergeMetodosMap(target, source) {
  if (!source) return;
  Object.keys(source).forEach((k) => {
    target[k] = (target[k] || 0) + source[k];
  });
}

const RA004_MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function ra004EtiquetaCortaDia(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return `${d}/${m}`;
}

function ra004EtiquetaCortaSemana(mondayStr) {
  const p = String(mondayStr).split('-').map(Number);
  const m = p[1];
  const d = p[2];
  return `Sem. ${d}/${RA004_MESES[m - 1]}`;
}

function ra004EtiquetaCortaMes(ym) {
  const [y, m] = String(ym).split('-').map(Number);
  return `${RA004_MESES[m - 1]} ${y}`;
}

async function ra004FetchVentasPOSListCR(fechaInicio, fechaFin) {
  const { start, end } = rangeForDateStrInclusive(fechaInicio, fechaFin);
  const [pagosSnap, cuentasSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'pagos'),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end)
      )
    ),
    getDocs(
      query(
        collection(db, 'cuentas'),
        where('cobradoAt', '>=', start),
        where('cobradoAt', '<=', end)
      )
    ),
  ]);

  const pagosList = pagosSnap.docs.map((d) => {
    const data = d.data() || {};
    const amount = Number(data.montoTotal || 0);
    const createdAt = data.createdAt || null;
    const fecha = createdAt?.toDate ? toDateStrCR(createdAt.toDate()) : toDateStrCR(createdAt || new Date());
    return {
      monto: Math.abs(amount),
      fecha,
      metodo: normalizeMetodoPago(data.metodo),
      createdAt,
    };
  });

  const ventasDirectasList = cuentasSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => String(c.tipoVenta || '').trim().toLowerCase() === 'directa_para_llevar')
    .filter((c) => {
      const estado = String(c.estadoCuenta || '').trim().toLowerCase();
      const estadoPago = String(c.estadoPago || '').trim().toLowerCase();
      return estado === 'cobrada' || estado === 'cerrada' || estadoPago === 'pagado';
    })
    .map((c) => {
      const amount = Number(c.montoTotal || 0);
      const createdAt = c.cobradoAt || c.updatedAt || null;
      const fecha = createdAt?.toDate ? toDateStrCR(createdAt.toDate()) : toDateStrCR(createdAt || new Date());
      return {
        monto: Math.abs(amount),
        fecha,
        metodo: normalizeMetodoPago(c.metodoPago),
        createdAt,
      };
    });

  return [...pagosList, ...ventasDirectasList];
}

/**
 * RA-004: Ventas POS agregadas por día / semana / mes en rango (fechas negocio CR). Opcional totales por método.
 * @param {string} fechaInicio YYYY-MM-DD
 * @param {string} fechaFin YYYY-MM-DD
 * @param {{ agrupacion?: 'dia'|'semana'|'mes', desgloseMetodo?: boolean }} options
 */
export async function getReporteVentasPorPeriodo(fechaInicio, fechaFin, options = {}) {
  const agrupacion = ['dia', 'semana', 'mes'].includes(options.agrupacion) ? options.agrupacion : 'dia';
  const desgloseMetodo = !!options.desgloseMetodo;

  const startStr = String(fechaInicio || '').trim();
  const endStr = String(fechaFin || '').trim();
  if (!startStr || !endStr) throw new Error('Indique fecha inicial y final.');
  if (startStr > endStr) throw new Error('La fecha inicial no puede ser posterior a la final.');

  const list = await ra004FetchVentasPOSListCR(startStr, endStr);
  const days = ra004EachDateInclusive(startStr, endStr);
  const porDia = new Map();
  days.forEach((day) => porDia.set(day, { total: 0, metodos: {} }));

  for (const v of list) {
    const day = v.fecha;
    if (!porDia.has(day)) continue;
    const b = porDia.get(day);
    b.total += v.monto;
    const met = v.metodo || 'otro';
    b.metodos[met] = (b.metodos[met] || 0) + v.monto;
  }

  let series = [];
  if (agrupacion === 'dia') {
    series = days.map((d) => {
      const p = porDia.get(d);
      return {
        etiqueta: d,
        etiquetaCorta: ra004EtiquetaCortaDia(d),
        monto: Math.round(p.total),
        porMetodo: { ...p.metodos },
      };
    });
  } else if (agrupacion === 'semana') {
    const weekMap = new Map();
    for (const d of days) {
      const wk = ra004MondayKeyFromDateStr(d);
      if (!weekMap.has(wk)) weekMap.set(wk, { total: 0, metodos: {} });
      const p = porDia.get(d);
      const cur = weekMap.get(wk);
      cur.total += p.total;
      ra004MergeMetodosMap(cur.metodos, p.metodos);
    }
    series = [...weekMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([etiqueta, v]) => ({
        etiqueta,
        etiquetaCorta: ra004EtiquetaCortaSemana(etiqueta),
        monto: Math.round(v.total),
        porMetodo: Object.fromEntries(
          Object.entries(v.metodos).map(([k, val]) => [k, Math.round(val)])
        ),
      }));
  } else {
    const monthMap = new Map();
    for (const d of days) {
      const mk = d.slice(0, 7);
      if (!monthMap.has(mk)) monthMap.set(mk, { total: 0, metodos: {} });
      const p = porDia.get(d);
      const cur = monthMap.get(mk);
      cur.total += p.total;
      ra004MergeMetodosMap(cur.metodos, p.metodos);
    }
    series = [...monthMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([etiqueta, v]) => ({
        etiqueta,
        etiquetaCorta: ra004EtiquetaCortaMes(etiqueta),
        monto: Math.round(v.total),
        porMetodo: Object.fromEntries(
          Object.entries(v.metodos).map(([k, val]) => [k, Math.round(val)])
        ),
      }));
  }

  let totalesPorMetodo = null;
  if (desgloseMetodo) {
    const acc = {};
    for (const v of list) {
      const met = v.metodo || 'otro';
      acc[met] = (acc[met] || 0) + v.monto;
    }
    totalesPorMetodo = Object.fromEntries(
      Object.entries(acc).map(([k, val]) => [k, Math.round(val)])
    );
  }

  const totalPeriodo = series.reduce((s, x) => s + x.monto, 0);

  return {
    series,
    totalesPorMetodo,
    totalPeriodo: Math.round(totalPeriodo),
    diasEnRango: days.length,
  };
}

/**
 * CF-005: Reporte contable por período.
 */
export async function getReporteContablePorPeriodo({
  modo = 'mensual',
  anio,
  mes,
  fechaInicio,
  fechaFin,
  categoria = 'all',
}) {
  const now = new Date();
  let startStr = '';
  let endStr = '';

  if (modo === 'anual') {
    const y = Number(anio || now.getFullYear());
    if (!Number.isFinite(y) || y < 2000) throw new Error('Año inválido.');
    startStr = `${y}-01-01`;
    endStr = `${y}-12-31`;
  } else if (modo === 'personalizado') {
    startStr = String(fechaInicio || '').trim();
    endStr = String(fechaFin || '').trim();
    if (!startStr || !endStr || startStr > endStr) throw new Error('Rango personalizado inválido.');
  } else {
    const y = Number(anio || now.getFullYear());
    const m = Number(mes || (now.getMonth() + 1));
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) throw new Error('Mes o año inválido.');
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    startStr = toDateStrCR(start);
    endStr = toDateStrCR(end);
  }

  const [manualRaw, ventasPos] = await Promise.all([
    getMovimientosFinancierosByRange(startStr, endStr),
    getVentasPOSByRange(startStr, endStr),
  ]);

  const manual = manualRaw.filter(m => !isMovimientoAnulado(m));
  let merged = [...ventasPos, ...manual];
  const catFilter = String(categoria || 'all').trim().toLowerCase();

  if (catFilter !== 'all') {
    merged = merged.filter(m => {
      const tipo = String(m.tipo || '').toLowerCase();
      const cat = String(m.categoriaLabel || m.categoria || '').toLowerCase();
      if (catFilter === 'ventas') return tipo === 'venta';
      if (catFilter === 'egresos') return tipo === 'gasto' || tipo === 'devolucion';
      return cat === catFilter;
    });
  }

  const totals = merged.reduce((acc, m) => {
    const tipo = String(m.tipo || '').toLowerCase();
    const amount = toAmountAbs(m);
    if (tipo === 'venta') acc.ingresos += amount;
    else acc.egresos += amount;
    return acc;
  }, { ingresos: 0, egresos: 0 });

  const breakdownMap = {};
  merged.forEach(m => {
    const key = modo === 'anual' ? String(m.fecha || '').slice(0, 7) : String(m.fecha || '');
    if (!key) return;
    if (!breakdownMap[key]) breakdownMap[key] = { ingresos: 0, egresos: 0, total: 0 };
    const amount = toAmountAbs(m);
    const tipo = String(m.tipo || '').toLowerCase();
    if (tipo === 'venta') breakdownMap[key].ingresos += amount;
    else breakdownMap[key].egresos += amount;
    breakdownMap[key].total = breakdownMap[key].ingresos - breakdownMap[key].egresos;
  });

  const breakdown = Object.entries(breakdownMap)
    .map(([periodo, data]) => ({ periodo, ...data }))
    .sort((a, b) => String(a.periodo).localeCompare(String(b.periodo)));

  return {
    rango: { inicio: startStr, fin: endStr },
    modo,
    categoria: catFilter,
    totalIngresos: totals.ingresos,
    totalEgresos: totals.egresos,
    balance: totals.ingresos - totals.egresos,
    cantidadMovimientos: merged.length,
    breakdown,
    movimientos: merged,
  };
}

function normalizeMetodoPago(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return 'no_indicado';
  if (v === 'efectivo') return 'efectivo';
  if (v === 'tarjeta') return 'tarjeta';
  if (v === 'mixto') return 'mixto';
  return v;
}

function normalizePromocionStatus({ fechaInicio, fechaFin, estadoForzado = null, eliminado = false }) {
  if (eliminado) return 'eliminada';
  const forced = String(estadoForzado || '').trim().toLowerCase();
  if (forced === 'inactiva') return 'inactiva';

  const today = toDateStrCR(new Date());
  const start = String(fechaInicio || '').trim();
  const end = String(fechaFin || '').trim();
  if (!start || !end) return 'inactiva';
  if (forced === 'activa') {
    if (today > end) return 'expirada';
    return 'activa';
  }
  if (today < start) return 'programada';
  if (today > end) return 'expirada';
  return 'activa';
}

function getSemanaDiaEs(dateValue = new Date()) {
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  const idx = d.getDay();
  const map = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  return map[idx] || '';
}

function validatePromocionCompleta(data = {}) {
  const nombre = String(data.nombre || '').trim();
  const start = String(data.fechaInicio || '').trim();
  const end = String(data.fechaFin || '').trim();
  const tipo = String(data.tipoBeneficio || '').trim().toLowerCase();
  const valor = Number(data.valorBeneficio || 0);
  const condiciones = data.condiciones || {};
  const montoMinimo = Number(condiciones.montoMinimo || 0);
  const categoria = String(condiciones.categoriaProducto || '').trim();
  const dias = Array.isArray(condiciones.diaSemana) ? condiciones.diaSemana.filter(Boolean) : [];

  if (!nombre || !start || !end) return false;
  if (!['porcentaje', 'monto_fijo'].includes(tipo)) return false;
  if (!Number.isFinite(valor) || valor <= 0) return false;
  if (tipo === 'porcentaje' && valor > 100) return false;

  // Requisito PF-007: bloquear activación si no hay condiciones configuradas.
  const hasAnyCondition = montoMinimo > 0 || Boolean(categoria) || dias.length > 0;
  return hasAnyCondition;
}

async function resolveCategoriasFromItems(items = []) {
  const productIds = [...new Set(
    (items || [])
      .map(i => String(i.productoId || '').trim())
      .filter(Boolean)
  )];
  if (productIds.length === 0) return new Set();

  const snaps = await Promise.all(productIds.map(async (id) => {
    try {
      const snap = await getDoc(doc(db, 'productos', id));
      return snap.exists() ? snap.data() : null;
    } catch (_) {
      return null;
    }
  }));

  return new Set(
    snaps
      .map(p => String(p?.categoria || '').trim().toLowerCase())
      .filter(Boolean)
  );
}

async function computePromocionForCobro({
  promocionId,
  items,
  subtotal,
}) {
  const promoId = String(promocionId || '').trim();
  if (!promoId) {
    return { descuento: 0, promocion: null, totalConDescuento: Math.max(0, Math.round(Number(subtotal || 0))) };
  }

  const snap = await getDoc(doc(db, 'promociones', promoId));
  if (!snap.exists()) {
    const err = new Error('Promoción no encontrada.');
    err.code = 'PROMO_NOT_FOUND';
    throw err;
  }
  const promo = snap.data() || {};
  const estado = normalizePromocionStatus({
    fechaInicio: promo.fechaInicio,
    fechaFin: promo.fechaFin,
    estadoForzado: promo.estadoPromocion,
    eliminado: Boolean(promo.eliminado),
  });
  if (estado !== 'activa') {
    const err = new Error('La promoción seleccionada no está activa.');
    err.code = 'PROMO_NOT_ACTIVE';
    throw err;
  }

  const subtotalNum = Math.max(0, Math.round(Number(subtotal || 0)));
  const condiciones = promo.condiciones || {};
  const montoMinimo = Number(condiciones.montoMinimo || 0);
  const categoria = String(condiciones.categoriaProducto || '').trim().toLowerCase();
  const dias = Array.isArray(condiciones.diaSemana)
    ? [...new Set(condiciones.diaSemana.map(d => String(d || '').trim().toLowerCase()).filter(Boolean))]
    : [];

  if (subtotalNum < montoMinimo) {
    const err = new Error(`La promoción requiere un monto mínimo de ₡${Math.round(montoMinimo).toLocaleString()}.`);
    err.code = 'PROMO_CONDITION_MIN_AMOUNT';
    throw err;
  }

  if (dias.length > 0) {
    const hoyDia = getSemanaDiaEs(new Date());
    if (!dias.includes(hoyDia)) {
      const err = new Error('La promoción no aplica para el día actual.');
      err.code = 'PROMO_CONDITION_DAY';
      throw err;
    }
  }

  if (categoria) {
    const categoriesInItems = await resolveCategoriasFromItems(items);
    if (!categoriesInItems.has(categoria)) {
      const err = new Error(`La promoción requiere productos de la categoría "${condiciones.categoriaProducto}".`);
      err.code = 'PROMO_CONDITION_CATEGORY';
      throw err;
    }
  }

  const tipo = String(promo.tipoBeneficio || '').trim().toLowerCase();
  const valor = Number(promo.valorBeneficio || 0);
  let descuento = 0;
  if (tipo === 'porcentaje') {
    descuento = Math.round(subtotalNum * (valor / 100));
  } else if (tipo === 'monto_fijo') {
    descuento = Math.round(valor);
  }
  descuento = Math.max(0, Math.min(descuento, subtotalNum));

  return {
    descuento,
    promocion: {
      id: promoId,
      nombre: String(promo.nombre || ''),
      tipoBeneficio: tipo,
      valorBeneficio: valor,
    },
    totalConDescuento: subtotalNum - descuento,
  };
}

function normalizePromotionPayload({
  nombre,
  descripcion,
  fechaInicio,
  fechaFin,
  tipoBeneficio,
  valorBeneficio,
  montoMinimo = 0,
  categoriaProducto = '',
  diaSemana = [],
}) {
  const nombreTrim = String(nombre || '').trim();
  const descripcionTrim = String(descripcion || '').trim();
  const inicio = String(fechaInicio || '').trim();
  const fin = String(fechaFin || '').trim();
  const tipo = String(tipoBeneficio || '').trim().toLowerCase();
  const valor = Number(valorBeneficio || 0);
  const monto = Number(montoMinimo || 0);
  const categoria = String(categoriaProducto || '').trim();
  const dias = Array.isArray(diaSemana)
    ? [...new Set(diaSemana.map(d => String(d || '').trim().toLowerCase()).filter(Boolean))]
    : [];

  if (!nombreTrim) throw new Error('El nombre de la promoción es obligatorio.');
  if (!inicio || !fin) throw new Error('La fecha de inicio y fin son obligatorias.');
  if (fin < inicio) throw new Error('La fecha fin no puede ser menor a la fecha inicio.');
  if (!['porcentaje', 'monto_fijo'].includes(tipo)) {
    throw new Error('Tipo de beneficio inválido.');
  }
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error('El valor del beneficio debe ser mayor a 0.');
  }
  if (tipo === 'porcentaje' && valor > 100) {
    throw new Error('El porcentaje no puede superar 100.');
  }
  if (!Number.isFinite(monto) || monto < 0) {
    throw new Error('El monto mínimo no puede ser negativo.');
  }

  return {
    nombre: nombreTrim,
    descripcion: descripcionTrim,
    fechaInicio: inicio,
    fechaFin: fin,
    tipoBeneficio: tipo,
    valorBeneficio: valor,
    condiciones: {
      montoMinimo: monto,
      categoriaProducto: categoria || null,
      diaSemana: dias,
    },
  };
}

/**
 * PF-001: Registrar promoción con validaciones y estado derivado.
 */
export async function createPromocion({
  nombre,
  descripcion,
  fechaInicio,
  fechaFin,
  tipoBeneficio,
  valorBeneficio,
  montoMinimo = 0,
  categoriaProducto = '',
  diaSemana = [],
  usuarioUid = null,
}) {
  const payload = normalizePromotionPayload({
    nombre,
    descripcion,
    fechaInicio,
    fechaFin,
    tipoBeneficio,
    valorBeneficio,
    montoMinimo,
    categoriaProducto,
    diaSemana,
  });

  const now = new Date();
  const estadoPromocion = normalizePromocionStatus({
    fechaInicio: payload.fechaInicio,
    fechaFin: payload.fechaFin,
  });

  const ref = await addDoc(collection(db, 'promociones'), {
    ...payload,
    estadoPromocion,
    eliminado: false,
    createdByUid: usuarioUid || null,
    createdAt: now,
    updatedAt: now,
  });

  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'creacion_promocion',
      promocionId: ref.id,
      uid: usuarioUid || null,
      detalles: {
        nombre: payload.nombre,
        estadoPromocion,
      },
      timestamp: now,
    });
  } catch (_) {}

  return ref.id;
}

/**
 * PF-001: Lista promociones con estado actualizado.
 */
export async function getPromociones() {
  const snap = await getDocs(collection(db, 'promociones'));
  const now = new Date();
  const updates = [];
  const list = snap.docs.map(d => {
    const data = d.data() || {};
    const estadoCalculado = normalizePromocionStatus({
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
      estadoForzado: data.estadoPromocion,
      eliminado: Boolean(data.eliminado),
    });
    const estadoGuardado = String(data.estadoPromocion || '').trim().toLowerCase();
    if (estadoCalculado !== estadoGuardado) {
      updates.push(updateDoc(doc(db, 'promociones', d.id), { estadoPromocion: estadoCalculado, updatedAt: now }));
    }
    return { id: d.id, ...data, estadoPromocion: estadoCalculado };
  });

  if (updates.length) {
    await Promise.allSettled(updates);
  }

  list.sort((a, b) => {
    const sa = String(a.estadoPromocion || '');
    const sb = String(b.estadoPromocion || '');
    if (sa !== sb) return sa.localeCompare(sb);
    return String(b.fechaInicio || '').localeCompare(String(a.fechaInicio || ''));
  });

  return list;
}

/**
 * PF-005: lista promociones activas para aplicar manualmente en cobro.
 */
export async function getPromocionesActivasParaCobro() {
  const list = await getPromociones();
  return list.filter(p => String(p.estadoPromocion || '').toLowerCase() === 'activa');
}

/**
 * PF-001 escenario 5: editar promoción programada.
 */
export async function updatePromocionProgramada({
  promocionId,
  nombre,
  descripcion,
  fechaInicio,
  fechaFin,
  tipoBeneficio,
  valorBeneficio,
  montoMinimo = 0,
  categoriaProducto = '',
  diaSemana = [],
  usuarioUid = null,
}) {
  if (!promocionId) throw new Error('promocionId es obligatorio.');
  const ref = doc(db, 'promociones', promocionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Promoción no encontrada.');

  const current = snap.data() || {};
  const currentStatus = normalizePromocionStatus({
    fechaInicio: current.fechaInicio,
    fechaFin: current.fechaFin,
    estadoForzado: current.estadoPromocion,
    eliminado: Boolean(current.eliminado),
  });
  if (currentStatus !== 'programada') {
    throw new Error('Solo promociones programadas pueden editarse aquí.');
  }

  const payload = normalizePromotionPayload({
    nombre,
    descripcion,
    fechaInicio,
    fechaFin,
    tipoBeneficio,
    valorBeneficio,
    montoMinimo,
    categoriaProducto,
    diaSemana,
  });

  const estadoPromocion = normalizePromocionStatus({
    fechaInicio: payload.fechaInicio,
    fechaFin: payload.fechaFin,
  });
  const now = new Date();
  await updateDoc(ref, {
    ...payload,
    estadoPromocion,
    updatedAt: now,
  });

  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'edicion_promocion_programada',
      promocionId,
      uid: usuarioUid || null,
      detalles: {
        nombre: payload.nombre,
        estadoPromocion,
      },
      timestamp: now,
    });
  } catch (_) {}
}

/**
 * PF-002: Modificar promoción activa (y programada) con motivo obligatorio.
 */
export async function updatePromocionActiva({
  promocionId,
  nombre,
  descripcion,
  fechaInicio,
  fechaFin,
  tipoBeneficio,
  valorBeneficio,
  montoMinimo = 0,
  categoriaProducto = '',
  diaSemana = [],
  motivo,
  usuarioUid = null,
}) {
  if (!promocionId) throw new Error('promocionId es obligatorio.');
  const motivoTrim = String(motivo || '').trim();
  if (!motivoTrim) throw new Error('Debe indicar motivo de modificación.');

  const ref = doc(db, 'promociones', promocionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Promoción no encontrada.');

  const current = snap.data() || {};
  const currentStatus = normalizePromocionStatus({
    fechaInicio: current.fechaInicio,
    fechaFin: current.fechaFin,
    estadoForzado: current.estadoPromocion,
    eliminado: Boolean(current.eliminado),
  });
  if (currentStatus === 'expirada' || currentStatus === 'eliminada') {
    throw new Error('Solo promociones activas o programadas pueden editarse.');
  }

  const payload = normalizePromotionPayload({
    nombre,
    descripcion,
    fechaInicio,
    fechaFin,
    tipoBeneficio,
    valorBeneficio,
    montoMinimo,
    categoriaProducto,
    diaSemana,
  });

  const estadoPromocion = normalizePromocionStatus({
    fechaInicio: payload.fechaInicio,
    fechaFin: payload.fechaFin,
    estadoForzado: current.estadoPromocion,
    eliminado: Boolean(current.eliminado),
  });
  const now = new Date();
  await updateDoc(ref, {
    ...payload,
    estadoPromocion,
    updatedAt: now,
  });

  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'modificacion_promocion_activa',
      promocionId,
      uid: usuarioUid || null,
      detalles: {
        nombre: payload.nombre,
        estadoAnterior: currentStatus,
        estadoNuevo: estadoPromocion,
        motivo: motivoTrim,
      },
      timestamp: now,
    });
  } catch (_) {}
}

/**
 * PF-007: Activar / desactivar promoción con trazabilidad.
 */
export async function setPromocionEstado({
  promocionId,
  activar,
  usuarioUid = null,
}) {
  if (!promocionId) throw new Error('promocionId es obligatorio.');
  const ref = doc(db, 'promociones', promocionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Promoción no encontrada.');

  const current = snap.data() || {};
  const estadoAnterior = normalizePromocionStatus({
    fechaInicio: current.fechaInicio,
    fechaFin: current.fechaFin,
    estadoForzado: current.estadoPromocion,
    eliminado: Boolean(current.eliminado),
  });
  if (estadoAnterior === 'expirada' || estadoAnterior === 'eliminada') {
    throw new Error('No se puede cambiar estado en promociones expiradas o eliminadas.');
  }

  const shouldActivate = Boolean(activar);
  if (shouldActivate && !validatePromocionCompleta(current)) {
    throw new Error('Complete beneficio y condiciones antes de activar.');
  }

  const now = new Date();
  const payload = {
    estadoPromocion: shouldActivate ? 'activa' : 'inactiva',
    updatedAt: now,
  };
  if (shouldActivate && String(current.fechaInicio || '').trim() > toDateStrCR(now)) {
    payload.fechaInicio = toDateStrCR(now);
  }
  await updateDoc(ref, payload);

  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'cambio_estado_promocion',
      promocionId,
      uid: usuarioUid || null,
      detalles: {
        estadoAnterior,
        estadoNuevo: shouldActivate ? 'activa' : 'inactiva',
      },
      timestamp: now,
    });
  } catch (_) {}
}

/**
 * PF-003: Eliminación lógica de promoción expirada con motivo.
 */
export async function deletePromocionExpirada({
  promocionId,
  motivo,
  usuarioUid = null,
}) {
  if (!promocionId) throw new Error('promocionId es obligatorio.');
  const motivoTrim = String(motivo || '').trim();
  if (!motivoTrim) throw new Error('Debe indicar motivo de eliminación.');

  const ref = doc(db, 'promociones', promocionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Promoción no encontrada.');

  const current = snap.data() || {};
  const status = normalizePromocionStatus({
    fechaInicio: current.fechaInicio,
    fechaFin: current.fechaFin,
    estadoForzado: current.estadoPromocion,
    eliminado: Boolean(current.eliminado),
  });
  if (status !== 'expirada') {
    throw new Error('Solo se pueden eliminar promociones expiradas.');
  }

  const now = new Date();
  await updateDoc(ref, {
    eliminado: true,
    estadoPromocion: 'eliminada',
    motivoEliminacion: motivoTrim,
    eliminadoPorUid: usuarioUid || null,
    eliminadoAt: now,
    updatedAt: now,
  });

  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'eliminacion_promocion_expirada',
      promocionId,
      uid: usuarioUid || null,
      detalles: {
        nombre: String(current.nombre || ''),
        motivo: motivoTrim,
      },
      timestamp: now,
    });
  } catch (_) {}
}

/**
 * PF-003: Restaurar promoción eliminada desde historial.
 */
export async function restorePromocionEliminada({
  promocionId,
  motivo,
  usuarioUid = null,
}) {
  if (!promocionId) throw new Error('promocionId es obligatorio.');
  const motivoTrim = String(motivo || '').trim();
  if (!motivoTrim) throw new Error('Debe indicar motivo de restauración.');

  const ref = doc(db, 'promociones', promocionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Promoción no encontrada.');

  const current = snap.data() || {};
  const isDeleted = Boolean(current.eliminado) || String(current.estadoPromocion || '').toLowerCase() === 'eliminada';
  if (!isDeleted) {
    throw new Error('La promoción no está eliminada.');
  }

  const now = new Date();
  await updateDoc(ref, {
    eliminado: false,
    estadoPromocion: 'inactiva',
    restauradoAt: now,
    restauradoPorUid: usuarioUid || null,
    motivoRestauracion: motivoTrim,
    updatedAt: now,
  });

  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'restauracion_promocion',
      promocionId,
      uid: usuarioUid || null,
      detalles: {
        nombre: String(current.nombre || ''),
        estadoAnterior: 'eliminada',
        estadoNuevo: 'inactiva',
        motivo: motivoTrim,
      },
      timestamp: now,
    });
  } catch (_) {}
}

/**
 * PF-004: Transacciones con promociones aplicadas por rango y filtro.
 */
export async function getPromocionesAplicadasTransacciones({
  fechaInicio,
  fechaFin,
  promocionId = '',
}) {
  const start = String(fechaInicio || '').trim();
  const end = String(fechaFin || '').trim();
  if (!start || !end || start > end) {
    throw new Error('Rango de fechas inválido.');
  }

  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T23:59:59.999`);
  const [pagosSnap, cuentasDirectasSnap] = await Promise.all([
    getDocs(query(
      collection(db, 'pagos'),
      where('createdAt', '>=', startDate),
      where('createdAt', '<=', endDate)
    )),
    getDocs(query(
      collection(db, 'cuentas'),
      where('cobradoAt', '>=', startDate),
      where('cobradoAt', '<=', endDate)
    )),
  ]);
  const filterPromoId = String(promocionId || '').trim();

  const pagosRows = pagosSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => String(p.promocionAplicadaId || '').trim())
    .map(p => {
      const createdAt = p.createdAt || null;
      const fecha = createdAt?.toDate ? toDateStrCR(createdAt.toDate()) : toDateStrCR(createdAt || new Date());
      const descuento = Math.abs(Number(p.montoDescuentoPromocion || 0));
      const total = Math.abs(Number(p.montoTotal || 0));
      const promo = p.promocionAplicada || {};
      return {
        id: p.id,
        fecha,
        createdAt,
        fuente: 'pago',
        cuentaId: p.cuentaId || null,
        mesaId: p.mesaId || null,
        cajeroUid: p.cajeroUid || p.promocionAplicadaPorUid || null,
        promocionId: p.promocionAplicadaId || null,
        promocionNombre: String(promo.nombre || p.promocionNombre || 'Promoción'),
        tipoBeneficio: promo.tipoBeneficio || null,
        valorBeneficio: Number(promo.valorBeneficio || 0),
        descuentoAplicado: descuento,
        montoTotal: total,
        aplicacionTipo: p.promocionAplicacionTipo || 'manual',
        motivoAplicacion: String(p.promocionMotivo || '').trim() || 'Aplicación manual en caja',
      };
    });

  const cuentasRows = cuentasDirectasSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(c => String(c.tipoVenta || '').trim().toLowerCase() === 'directa_para_llevar')
    .filter(c => String(c.promocionAplicadaId || '').trim())
    .map(c => {
      const createdAt = c.cobradoAt || null;
      const fecha = createdAt?.toDate ? toDateStrCR(createdAt.toDate()) : toDateStrCR(createdAt || new Date());
      const descuento = Math.abs(Number(c.montoDescuentoPromocion || 0));
      const total = Math.abs(Number(c.montoTotal || 0));
      const promo = c.promocionAplicada || {};
      return {
        id: `cuenta_${c.id}`,
        fecha,
        createdAt,
        fuente: 'venta_directa',
        cuentaId: c.id,
        mesaId: c.mesaId || null,
        cajeroUid: c.closedByUid || c.promocionAplicadaPorUid || null,
        promocionId: c.promocionAplicadaId || null,
        promocionNombre: String(promo.nombre || c.promocionNombre || 'Promoción'),
        tipoBeneficio: promo.tipoBeneficio || null,
        valorBeneficio: Number(promo.valorBeneficio || 0),
        descuentoAplicado: descuento,
        montoTotal: total,
        aplicacionTipo: c.promocionAplicacionTipo || 'manual',
        motivoAplicacion: String(c.promocionMotivo || '').trim() || 'Aplicación manual en caja',
      };
    });

  const rows = [...pagosRows, ...cuentasRows]
    .filter(r => (filterPromoId ? String(r.promocionId || '') === filterPromoId : true));

  const uniqueCajeroUids = [...new Set(rows.map(r => String(r.cajeroUid || '').trim()).filter(Boolean))];
  const cajeroMap = {};
  if (uniqueCajeroUids.length > 0) {
    const userSnaps = await Promise.all(
      uniqueCajeroUids.map(uid => getDoc(doc(db, 'users', uid)))
    );
    userSnaps.forEach((snap, idx) => {
      const uid = uniqueCajeroUids[idx];
      if (!snap.exists()) return;
      const data = snap.data() || {};
      cajeroMap[uid] = String(data.name || data.nombre || data.email || uid).trim();
    });
  }

  rows.forEach(r => {
    const uid = String(r.cajeroUid || '').trim();
    r.cajeroNombre = uid ? (cajeroMap[uid] || uid) : '-';
  });

  rows.sort((a, b) => {
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });

  const resumenPorPromoMap = {};
  rows.forEach(r => {
    const key = r.promocionId || 'sin_id';
    if (!resumenPorPromoMap[key]) {
      resumenPorPromoMap[key] = {
        promocionId: r.promocionId,
        promocionNombre: r.promocionNombre,
        usos: 0,
        descuentoTotal: 0,
        ventasConPromo: 0,
      };
    }
    resumenPorPromoMap[key].usos += 1;
    resumenPorPromoMap[key].descuentoTotal += Number(r.descuentoAplicado || 0);
    resumenPorPromoMap[key].ventasConPromo += Number(r.montoTotal || 0);
  });

  const resumenPorPromo = Object.values(resumenPorPromoMap).sort((a, b) => b.descuentoTotal - a.descuentoTotal);
  const totalDescuento = rows.reduce((sum, r) => sum + Number(r.descuentoAplicado || 0), 0);
  const totalTransacciones = rows.length;

  return {
    rango: { inicio: start, fin: end },
    totalTransacciones,
    totalDescuento,
    resumenPorPromo,
    transacciones: rows,
  };
}

/**
 * CF-002: Vista previa para cierre diario de caja.
 */
export async function getResumenCierreCajaPreview(fecha) {
  const fechaStr = String(fecha || '').trim();
  if (!fechaStr) throw new Error('La fecha es obligatoria.');
  const hoy = toDateStrCR(new Date());
  if (fechaStr > hoy) throw new Error('La fecha no puede ser futura.');

  const [manual, pagosPos] = await Promise.all([
    getMovimientosFinancierosByDate(fechaStr),
    getVentasPOSByDate(fechaStr),
  ]);

  const manualActivos = manual.filter(m => !isMovimientoAnulado(m));
  const ventasPosTotal = pagosPos.reduce((sum, m) => sum + Math.abs(Number(m.montoAbsoluto ?? m.monto ?? 0)), 0);
  const ventasManualTotal = manualActivos
    .filter(m => String(m.tipo || '').toLowerCase() === 'venta')
    .reduce((sum, m) => sum + Math.abs(Number(m.montoAbsoluto ?? m.monto ?? 0)), 0);
  const gastosTotal = manualActivos
    .filter(m => {
      const tipo = String(m.tipo || '').toLowerCase();
      return tipo === 'gasto' || tipo === 'devolucion';
    })
    .reduce((sum, m) => sum + Math.abs(Number(m.montoAbsoluto ?? m.monto ?? 0)), 0);

  const metodosPago = {};
  pagosPos.forEach((p) => {
    const metodo = normalizeMetodoPago(p.metodo);
    const monto = Math.abs(Number(p.montoAbsoluto ?? p.monto ?? 0));
    metodosPago[metodo] = (metodosPago[metodo] || 0) + monto;
  });

  const ventasTotales = ventasPosTotal + ventasManualTotal;
  const balanceEsperado = ventasTotales - gastosTotal;

  return {
    fecha: fechaStr,
    ventasPosTotal,
    ventasManualTotal,
    ventasTotales,
    gastosTotal,
    balanceEsperado,
    metodosPago,
  };
}

/**
 * CF-006: Resumen diario de caja con comparación contra día anterior.
 */
export async function getResumenDiarioCaja(fecha = null) {
  const baseFecha = String(fecha || '').trim() || toDateStrCR(new Date());
  const hoy = toDateStrCR(new Date());
  if (baseFecha > hoy) throw new Error('La fecha no puede ser futura.');

  const prevDate = new Date(`${baseFecha}T12:00:00`);
  prevDate.setDate(prevDate.getDate() - 1);
  const fechaAnterior = toDateStrCR(prevDate);

  const [resumenActual, resumenAnterior, manualActual, pagosActual] = await Promise.all([
    getResumenCierreCajaPreview(baseFecha),
    getResumenCierreCajaPreview(fechaAnterior),
    getMovimientosFinancierosByDate(baseFecha),
    getVentasPOSByDate(baseFecha),
  ]);

  const manualActivos = manualActual.filter(m => !isMovimientoAnulado(m));
  const cantidadTransacciones = manualActivos.length + pagosActual.length;
  const manualVentasCount = manualActivos.filter(
    (m) => String(m.tipo || '').toLowerCase() === 'venta'
  ).length;
  const cantidadVentas = pagosActual.length + manualVentasCount;

  const cuentaIds = [...new Set(
    pagosActual
      .map(p => String(p.cuentaId || '').trim())
      .filter(Boolean)
  )];
  const cuentasSnap = await Promise.all(cuentaIds.map(async (id) => {
    try {
      const s = await getDoc(doc(db, 'cuentas', id));
      return [id, s.exists() ? s.data() : null];
    } catch (_) {
      return [id, null];
    }
  }));
  const cuentasMap = Object.fromEntries(cuentasSnap);

  const ventasPorTipo = { mesa: 0, para_llevar: 0, otras: 0 };
  pagosActual.forEach(p => {
    const monto = Math.abs(Number(p.montoAbsoluto ?? p.monto ?? 0));
    const cuentaId = String(p.cuentaId || '').trim();
    const cuenta = cuentaId ? cuentasMap[cuentaId] : null;
    const tipoVenta = String(cuenta?.tipoVenta || '').toLowerCase();
    const tipoPedido = String(cuenta?.tipoPedido || '').toLowerCase();
    if (tipoVenta.includes('directa') || tipoPedido === 'para_llevar') {
      ventasPorTipo.para_llevar += monto;
    } else if (cuenta?.mesaId || cuentaId) {
      ventasPorTipo.mesa += monto;
    } else {
      ventasPorTipo.otras += monto;
    }
  });

  const deltaBalance = Number(resumenActual.balanceEsperado || 0) - Number(resumenAnterior.balanceEsperado || 0);
  const deltaVentas = Number(resumenActual.ventasTotales || 0) - Number(resumenAnterior.ventasTotales || 0);
  const deltaGastos = Number(resumenActual.gastosTotal || 0) - Number(resumenAnterior.gastosTotal || 0);

  return {
    fecha: baseFecha,
    fechaAnterior,
    resumenActual,
    resumenAnterior,
    cantidadTransacciones,
    cantidadVentas,
    metodosPago: resumenActual.metodosPago || {},
    ventasPorTipo,
    comparacion: {
      deltaBalance,
      deltaVentas,
      deltaGastos,
    },
  };
}

const CR_TZ = 'America/Costa_Rica';

function hourInCostaRica(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  if (!Number.isFinite(d.getTime())) return -1;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CR_TZ,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === 'hour');
  return h ? Number(h.value) : -1;
}

function tsMsDashboard(v) {
  if (!v) return 0;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.toDate === 'function') return v.toDate().getTime();
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * RA-001: Ventas POS + ventas directas del día, agrupadas por hora (Costa Rica).
 */
export async function getVentasPorHoraDia(fechaStr) {
  const fecha = String(fechaStr || '').trim();
  if (!fecha) {
    return { horas: Array.from({ length: 24 }, () => 0), max: 0 };
  }
  const ventas = await getVentasPOSByDate(fecha);
  const horas = Array.from({ length: 24 }, () => 0);
  for (const v of ventas) {
    const h = hourInCostaRica(v.createdAt);
    if (h < 0 || h > 23) continue;
    horas[h] += Math.abs(Number(v.montoAbsoluto ?? v.monto ?? 0));
  }
  const max = horas.reduce((m, x) => Math.max(m, x), 0);
  return { horas, max };
}

/**
 * RA-001: Top productos cobrados en el día (pagos con itemIds + cuentas venta directa).
 */
export async function getTopProductosVendidosDia(fechaStr, limite = 5) {
  const fecha = String(fechaStr || '').trim();
  if (!fecha) return [];
  const { start, end } = rangeForDateStr(fecha);
  const startMs = start.getTime();
  const endMs = end.getTime();
  const agg = new Map();

  const addLine = (productoId, nombre, qty, monto) => {
    const key = String(productoId || nombre || 'sin_id').trim() || 'sin_id';
    const cur = agg.get(key) || {
      productoId: productoId || key,
      nombre: String(nombre || key).trim() || key,
      cantidad: 0,
      monto: 0,
    };
    cur.cantidad += qty;
    cur.monto += monto;
    agg.set(key, cur);
  };

  const pagosSnap = await getDocs(
    query(
      collection(db, 'pagos'),
      where('createdAt', '>=', start),
      where('createdAt', '<=', end)
    )
  );

  for (const d of pagosSnap.docs) {
    const p = d.data() || {};
    const itemIds = Array.isArray(p.itemIds) ? p.itemIds : [];
    const cuentaId = String(p.cuentaId || '').trim();
    if (!cuentaId || itemIds.length === 0) continue;
    const snaps = await Promise.all(
      itemIds.map((itemId) => getDoc(doc(db, 'cuentas', cuentaId, 'items', itemId)))
    );
    for (const snap of snaps) {
      if (!snap.exists()) continue;
      const it = snap.data() || {};
      const qty = Number(it.cantidad || 1);
      const unit = Number(it.precioUnitSnapshot || 0);
      addLine(it.productoId, it.nombreSnapshot, qty, Math.round(qty * unit));
    }
  }

  const cuentasSnap = await getDocs(
    query(
      collection(db, 'cuentas'),
      where('cobradoAt', '>=', start),
      where('cobradoAt', '<=', end)
    )
  );

  for (const d of cuentasSnap.docs) {
    const c = d.data() || {};
    if (String(c.tipoVenta || '').trim().toLowerCase() !== 'directa_para_llevar') continue;
    const estado = String(c.estadoCuenta || '').trim().toLowerCase();
    const estadoPago = String(c.estadoPago || '').trim().toLowerCase();
    if (estado !== 'cobrada' && estado !== 'cerrada' && estadoPago !== 'pagado') continue;
    const items = await getCuentaItems(d.id);
    for (const it of items) {
      if (String(it.estadoItem || '').trim().toLowerCase() !== 'pagado') continue;
      const paidMs = tsMsDashboard(it.paidAt);
      if (paidMs < startMs || paidMs > endMs) continue;
      const qty = Number(it.cantidad || 1);
      const unit = Number(it.precioUnitSnapshot || 0);
      addLine(it.productoId, it.nombreSnapshot, qty, Math.round(qty * unit));
    }
  }

  return [...agg.values()]
    .sort((a, b) => b.monto - a.monto)
    .slice(0, Math.max(1, Number(limite) || 5));
}

/**
 * RA-002: Ventas por producto en un rango (pagos con itemIds + cuentas venta directa).
 * @param {string} fechaInicio YYYY-MM-DD
 * @param {string} fechaFin YYYY-MM-DD
 * @param {{ categoria?: string }} options Si `categoria` tiene valor, filtra por esa categoría del catálogo.
 */
export async function getVentasPorProductoRango(fechaInicio, fechaFin, options = {}) {
  const startStr = String(fechaInicio || '').trim();
  const endStr = String(fechaFin || '').trim();
  if (!startStr || !endStr) throw new Error('Indique fecha inicial y final.');
  if (startStr > endStr) throw new Error('La fecha inicial no puede ser posterior a la final.');
  const { start, end } = rangeForDateStrInclusive(startStr, endStr);
  const startMs = start.getTime();
  const endMs = end.getTime();
  const categoriaFiltro = String(options.categoria || '').trim().toLowerCase();

  const agg = new Map();

  const addLine = (productoId, nombre, qty, monto) => {
    const key = String(productoId || nombre || 'sin_id').trim() || 'sin_id';
    const cur = agg.get(key) || {
      productoId: productoId || key,
      nombre: String(nombre || key).trim() || key,
      cantidad: 0,
      monto: 0,
    };
    cur.cantidad += qty;
    cur.monto += monto;
    agg.set(key, cur);
  };

  const pagosSnap = await getDocs(
    query(
      collection(db, 'pagos'),
      where('createdAt', '>=', start),
      where('createdAt', '<=', end)
    )
  );

  for (const d of pagosSnap.docs) {
    const p = d.data() || {};
    const itemIds = Array.isArray(p.itemIds) ? p.itemIds : [];
    const cuentaId = String(p.cuentaId || '').trim();
    if (!cuentaId || itemIds.length === 0) continue;
    const snaps = await Promise.all(
      itemIds.map((itemId) => getDoc(doc(db, 'cuentas', cuentaId, 'items', itemId)))
    );
    for (const snap of snaps) {
      if (!snap.exists()) continue;
      const it = snap.data() || {};
      const qty = Number(it.cantidad || 1);
      const unit = Number(it.precioUnitSnapshot || 0);
      addLine(it.productoId, it.nombreSnapshot, qty, Math.round(qty * unit));
    }
  }

  const cuentasSnap = await getDocs(
    query(
      collection(db, 'cuentas'),
      where('cobradoAt', '>=', start),
      where('cobradoAt', '<=', end)
    )
  );

  for (const d of cuentasSnap.docs) {
    const c = d.data() || {};
    if (String(c.tipoVenta || '').trim().toLowerCase() !== 'directa_para_llevar') continue;
    const estado = String(c.estadoCuenta || '').trim().toLowerCase();
    const estadoPago = String(c.estadoPago || '').trim().toLowerCase();
    if (estado !== 'cobrada' && estado !== 'cerrada' && estadoPago !== 'pagado') continue;
    const items = await getCuentaItems(d.id);
    for (const it of items) {
      if (String(it.estadoItem || '').trim().toLowerCase() !== 'pagado') continue;
      const paidMs = tsMsDashboard(it.paidAt);
      if (paidMs < startMs || paidMs > endMs) continue;
      const qty = Number(it.cantidad || 1);
      const unit = Number(it.precioUnitSnapshot || 0);
      addLine(it.productoId, it.nombreSnapshot, qty, Math.round(qty * unit));
    }
  }

  const rows = [...agg.values()];
  const ids = [...new Set(rows.map((r) => String(r.productoId || '').trim()).filter(Boolean))];
  const catMap = new Map();
  await Promise.all(
    ids.map(async (id) => {
      const snap = await getDoc(doc(db, 'productos', id));
      catMap.set(id, snap.exists() ? String(snap.data().categoria || '').trim() : '');
    })
  );
  for (const r of rows) {
    const id = String(r.productoId || '').trim();
    r.categoria = id ? catMap.get(id) || '' : '';
  }

  let filtered = rows;
  if (categoriaFiltro) {
    filtered = rows.filter((r) => String(r.categoria || '').trim().toLowerCase() === categoriaFiltro);
  }

  return filtered.sort((a, b) => b.monto - a.monto);
}

/**
 * RA-003: Resumen de cobros por usuario de caja en rango (`pagos.cajeroUid` + venta directa `closedByUid`).
 * @returns {Promise<Array<{ usuarioUid: string|null, nombre: string, montoTotal: number, operaciones: number }>>}
 */
export async function getCobrosPorUsuarioRango(fechaInicio, fechaFin) {
  const startStr = String(fechaInicio || '').trim();
  const endStr = String(fechaFin || '').trim();
  if (!startStr || !endStr) throw new Error('Indique fecha inicial y final.');
  if (startStr > endStr) throw new Error('La fecha inicial no puede ser posterior a la final.');
  const { start, end } = rangeForDateStrInclusive(startStr, endStr);

  const [pagosSnap, cuentasSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'pagos'),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end)
      )
    ),
    getDocs(
      query(
        collection(db, 'cuentas'),
        where('cobradoAt', '>=', start),
        where('cobradoAt', '<=', end)
      )
    ),
  ]);

  const agg = new Map();

  const bump = (uidRaw, monto) => {
    const uid = String(uidRaw || '').trim();
    const key = uid || '__sin_uid__';
    const cur = agg.get(key) || {
      usuarioUid: uid || null,
      montoTotal: 0,
      operaciones: 0,
    };
    cur.montoTotal += Math.abs(Number(monto || 0));
    cur.operaciones += 1;
    agg.set(key, cur);
  };

  for (const d of pagosSnap.docs) {
    const p = d.data() || {};
    bump(p.cajeroUid, p.montoTotal);
  }

  for (const d of cuentasSnap.docs) {
    const c = d.data() || {};
    if (String(c.tipoVenta || '').trim().toLowerCase() !== 'directa_para_llevar') continue;
    const estado = String(c.estadoCuenta || '').trim().toLowerCase();
    const estadoPago = String(c.estadoPago || '').trim().toLowerCase();
    if (estado !== 'cobrada' && estado !== 'cerrada' && estadoPago !== 'pagado') continue;
    bump(c.closedByUid, c.montoTotal);
  }

  const keys = [...agg.keys()].filter((k) => k !== '__sin_uid__');
  const nameMap = {};
  if (keys.length > 0) {
    const snaps = await Promise.all(keys.map((uid) => getDoc(doc(db, 'users', uid))));
    snaps.forEach((snap, idx) => {
      const uid = keys[idx];
      if (!snap.exists()) {
        nameMap[uid] = uid;
        return;
      }
      const data = snap.data() || {};
      nameMap[uid] = String(data.name || data.nombre || data.email || uid).trim() || uid;
    });
  }

  const rows = [...agg.entries()].map(([key, v]) => {
    const nombre =
      key === '__sin_uid__'
        ? 'Sin usuario asignado'
        : nameMap[key] || key;
    return {
      usuarioUid: v.usuarioUid,
      nombre,
      montoTotal: Math.round(v.montoTotal),
      operaciones: v.operaciones,
    };
  });

  return rows.sort((a, b) => b.montoTotal - a.montoTotal);
}

/**
 * RA-003: Detalle de cobros de un usuario en el rango (pagos + cierres venta directa).
 * @param {string|null|undefined} usuarioUid `null` o vacío = solo operaciones sin `cajeroUid` / `closedByUid`.
 */
export async function getDetalleCobrosUsuarioRango(usuarioUid, fechaInicio, fechaFin) {
  const startStr = String(fechaInicio || '').trim();
  const endStr = String(fechaFin || '').trim();
  if (!startStr || !endStr) throw new Error('Indique fecha inicial y final.');
  if (startStr > endStr) throw new Error('La fecha inicial no puede ser posterior a la final.');
  const { start, end } = rangeForDateStrInclusive(startStr, endStr);
  const target = String(usuarioUid || '').trim();
  const matchSin = !target;

  const [pagosSnap, cuentasSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'pagos'),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end)
      )
    ),
    getDocs(
      query(
        collection(db, 'cuentas'),
        where('cobradoAt', '>=', start),
        where('cobradoAt', '<=', end)
      )
    ),
  ]);

  const lineas = [];

  for (const d of pagosSnap.docs) {
    const p = d.data() || {};
    const uid = String(p.cajeroUid || '').trim();
    if (matchSin) {
      if (uid) continue;
    } else if (uid !== target) continue;

    const createdAt = p.createdAt || null;
    const fechaStr = createdAt?.toDate
      ? toDateStrCR(createdAt.toDate())
      : toDateStrCR(createdAt || new Date());
    lineas.push({
      tipo: 'pago',
      id: d.id,
      fechaStr,
      createdAt,
      monto: Math.abs(Number(p.montoTotal || 0)),
      metodo: String(p.metodo || '').trim() || '—',
      cuentaId: p.cuentaId || null,
      mesaId: p.mesaId || null,
      comensalId: p.comensalId || null,
    });
  }

  for (const d of cuentasSnap.docs) {
    const c = d.data() || {};
    if (String(c.tipoVenta || '').trim().toLowerCase() !== 'directa_para_llevar') continue;
    const estado = String(c.estadoCuenta || '').trim().toLowerCase();
    const estadoPago = String(c.estadoPago || '').trim().toLowerCase();
    if (estado !== 'cobrada' && estado !== 'cerrada' && estadoPago !== 'pagado') continue;

    const uid = String(c.closedByUid || '').trim();
    if (matchSin) {
      if (uid) continue;
    } else if (uid !== target) continue;

    const cobradoAt = c.cobradoAt || null;
    const fechaStr = cobradoAt?.toDate
      ? toDateStrCR(cobradoAt.toDate())
      : toDateStrCR(cobradoAt || new Date());
    lineas.push({
      tipo: 'venta_directa',
      id: d.id,
      fechaStr,
      createdAt: cobradoAt,
      monto: Math.abs(Number(c.montoTotal || 0)),
      metodo: String(c.metodoPago || '').trim() || '—',
      cuentaId: d.id,
      mesaId: c.mesaId || null,
      comensalId: null,
    });
  }

  lineas.sort((a, b) => {
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });

  return lineas;
}

/**
 * RA-001: Suscripcion a cambios en mesas.
 */
export function onMesasDashboardSnapshot(callback) {
  return onSnapshot(collection(db, 'mesas'), (snapshot) => {
    const mesas = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() || {};
      return { id: docSnap.id, ...data };
    });
    callback(mesas);
  });
}

/**
 * RA-001: Suscripcion a turnos POS (lista completa; filtrar en cliente).
 */
export function onTurnosPosSnapshot(callback) {
  return onSnapshot(collection(db, 'turnos_pos'), (snapshot) => {
    const list = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    callback(list);
  });
}

/**
 * CF-002: Registra cierre diario de caja.
 */
export async function createCierreCajaDiario({
  fecha,
  totalEfectivo,
  totalDigital,
  observaciones = '',
  motivoDiscrepancia = '',
  usuarioUid = null,
}) {
  const fechaStr = String(fecha || '').trim();
  if (!fechaStr) throw new Error('La fecha es obligatoria.');
  const hoy = toDateStrCR(new Date());
  if (fechaStr > hoy) throw new Error('La fecha no puede ser futura.');

  const qExistente = query(
    collection(db, 'cierres_caja'),
    where('fecha', '==', fechaStr),
    where('estado', '==', 'cerrado')
  );
  const existente = await getDocs(qExistente);
  if (!existente.empty) {
    throw new Error('Dia ya cerrado, consulte historial.');
  }

  const efectivo = Number(totalEfectivo || 0);
  const digital = Number(totalDigital || 0);
  if (!Number.isFinite(efectivo) || efectivo < 0) {
    throw new Error('Total efectivo invalido.');
  }
  if (!Number.isFinite(digital) || digital < 0) {
    throw new Error('Total digital invalido.');
  }

  const resumen = await getResumenCierreCajaPreview(fechaStr);
  const totalReportado = efectivo + digital;
  const discrepancia = totalReportado - Number(resumen.balanceEsperado || 0);
  const motivoTrim = String(motivoDiscrepancia || '').trim();
  const tieneDiscrepancia = Math.abs(discrepancia) > 0;
  if (tieneDiscrepancia && !motivoTrim) {
    throw new Error('Explique discrepancia en observaciones.');
  }

  const now = new Date();
  const cierreRef = await addDoc(collection(db, 'cierres_caja'), {
    fecha: fechaStr,
    estado: 'cerrado',
    totalEfectivo: efectivo,
    totalDigital: digital,
    totalReportado,
    ventasPosTotal: resumen.ventasPosTotal,
    ventasManualTotal: resumen.ventasManualTotal,
    ventasTotales: resumen.ventasTotales,
    gastosTotal: resumen.gastosTotal,
    balanceEsperado: resumen.balanceEsperado,
    discrepancia,
    tieneDiscrepancia,
    motivoDiscrepancia: motivoTrim || null,
    observaciones: String(observaciones || '').trim() || null,
    metodosPago: resumen.metodosPago || {},
    cerradoPorUid: usuarioUid || null,
    cerradoAt: now,
    reabierto: false,
    reabiertoAt: null,
    reabiertoPorUid: null,
    motivoReapertura: null,
    createdAt: now,
    updatedAt: now,
  });

  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'cierre_caja_diario',
      cierreCajaId: cierreRef.id,
      fecha: fechaStr,
      uid: usuarioUid || null,
      detalles: {
        totalReportado,
        balanceEsperado: resumen.balanceEsperado,
        discrepancia,
      },
      timestamp: now,
    });
  } catch (_) {}

  return cierreRef.id;
}

/**
 * CF-002: Historial de cierres por rango de fecha.
 */
export async function getCierresCajaByRange(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return [];
  const q = query(
    collection(db, 'cierres_caja'),
    where('fecha', '>=', fechaInicio),
    where('fecha', '<=', fechaFin)
  );
  const snap = await getDocs(q);
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  return list;
}

/**
 * CF-002: Reapertura de cierre (solo fecha de hoy).
 */
export async function reabrirCierreCaja({
  cierreId,
  motivoReapertura,
  usuarioUid = null,
}) {
  if (!cierreId) throw new Error('cierreId es obligatorio.');
  const motivo = String(motivoReapertura || '').trim();
  if (!motivo) throw new Error('Debe indicar motivo para reabrir.');

  const cierreRef = doc(db, 'cierres_caja', cierreId);
  const snap = await getDoc(cierreRef);
  if (!snap.exists()) throw new Error('Cierre no encontrado.');

  const data = snap.data() || {};
  if (String(data.estado || '').toLowerCase() !== 'cerrado') {
    throw new Error('El cierre no esta en estado cerrado.');
  }

  const hoy = toDateStrCR(new Date());
  if (String(data.fecha || '') !== hoy) {
    throw new Error('Solo se puede reabrir un cierre del mismo dia.');
  }

  const now = new Date();
  await updateDoc(cierreRef, {
    estado: 'reabierto',
    reabierto: true,
    reabiertoAt: now,
    reabiertoPorUid: usuarioUid || null,
    motivoReapertura: motivo,
    updatedAt: now,
  });

  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'reapertura_cierre_caja',
      cierreCajaId: cierreId,
      fecha: data.fecha || null,
      uid: usuarioUid || null,
      motivo,
      timestamp: now,
    });
  } catch (_) {}
}

// ==================== TURNOS POS ====================

/**
 * Abre un turno para un usuario del POS.
 * Bloquea apertura si ya existe uno abierto para el usuario.
 */
export async function abrirTurnoUsuario({
  usuarioId,
  rolUsuario,
  terminalId,
  abiertoPorUid = null,
  rolEjecutor = null,
}) {
  if (!usuarioId) throw new Error('usuarioId es obligatorio.');
  if (!rolUsuario) throw new Error('rolUsuario es obligatorio.');
  if (!terminalId || !String(terminalId).trim()) throw new Error('terminalId es obligatorio.');

  const role = String(rolEjecutor || '').toLowerCase();
  if (role !== 'admin') {
    const err = new Error('Solo admin puede abrir turnos.');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }

  const snapshot = await getDocs(collection(db, 'turnos_pos'));
  const yaAbierto = snapshot.docs.some(d => {
    const t = d.data();
    return t.usuarioId === usuarioId && t.estadoTurno === 'abierto';
  });
  if (yaAbierto) {
    const err = new Error('Ya existe un turno activo para este usuario.');
    err.code = 'TURNO_ACTIVO';
    throw err;
  }

  const now = new Date();
  const eventoInicio = {
    tipo: 'inicio',
    timestamp: now,
    actorUid: abiertoPorUid || '',
  };
  const turnoRef = await addDoc(collection(db, 'turnos_pos'), {
    usuarioId,
    rolUsuario,
    terminalId: String(terminalId).trim(),
    horaInicio: now,
    horaCierre: null,
    observacionCierre: '',
    cierreForzado: false,
    estadoTurno: 'abierto',
    pausaActiva: null,
    totalPausaMinutos: 0,
    duracionBrutaMinutos: null,
    duracionNetaMinutos: null,
    eventosTurno: [eventoInicio],
    abiertoPorUid: abiertoPorUid || '',
    cerradoPorUid: '',
    createdAt: now,
    updatedAt: now,
  });

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'apertura_turno',
    adminUid: abiertoPorUid || '',
    targetId: usuarioId,
    targetName: usuarioId,
    detalles: {
      turnoId: turnoRef.id,
      rolUsuario,
      terminalId: String(terminalId).trim(),
      estadoTurno: 'abierto',
    },
    timestamp: now,
  });

  return turnoRef.id;
}

const MOTIVOS_PAUSA_VALIDOS = ['almuerzo', 'descanso', 'bano', 'diligencia', 'reunion', 'otro'];

/**
 * Inicia una pausa en un turno abierto.
 */
export async function iniciarPausaTurnoUsuario({
  turnoId,
  motivoTipo,
  motivoTexto = '',
  actorUid = null,
  rolEjecutor = null,
}) {
  if (!turnoId) throw new Error('turnoId es obligatorio.');
  if (!motivoTipo || !MOTIVOS_PAUSA_VALIDOS.includes(String(motivoTipo).toLowerCase())) {
    const err = new Error('Motivo de pausa inválido.');
    err.code = 'MOTIVO_INVALIDO';
    throw err;
  }
  if (String(motivoTipo).toLowerCase() === 'otro' && !String(motivoTexto).trim()) {
    const err = new Error('Debe indicar un motivo cuando selecciona "Otro".');
    err.code = 'MOTIVO_REQUIRED';
    throw err;
  }

  const role = String(rolEjecutor || '').toLowerCase();
  if (role !== 'admin') {
    const err = new Error('Solo admin puede iniciar pausas.');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }

  const turnoRef = doc(db, 'turnos_pos', turnoId);
  const turnoSnap = await getDoc(turnoRef);
  if (!turnoSnap.exists()) {
    const err = new Error('Turno no encontrado.');
    err.code = 'TURNO_NOT_FOUND';
    throw err;
  }

  const turno = turnoSnap.data();
  if (turno.estadoTurno !== 'abierto') {
    const err = new Error('Solo se puede pausar un turno abierto.');
    err.code = 'TURNO_INVALIDO';
    throw err;
  }

  const now = new Date();
  const evento = {
    tipo: 'pausa_inicio',
    timestamp: now,
    motivoTipo: String(motivoTipo).toLowerCase(),
    motivoTexto: String(motivoTexto || '').trim(),
    actorUid: actorUid || '',
  };

  const eventos = [...(turno.eventosTurno || []), evento];
  await updateDoc(turnoRef, {
    estadoTurno: 'pausado',
    pausaActiva: {
      inicio: now,
      motivoTipo: evento.motivoTipo,
      motivoTexto: evento.motivoTexto,
      actorUid: actorUid || '',
    },
    eventosTurno: eventos,
    updatedAt: now,
  });

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'pausa_turno_inicio',
    adminUid: actorUid || '',
    targetId: turno.usuarioId,
    targetName: turno.usuarioId,
    detalles: {
      turnoId,
      motivoTipo: evento.motivoTipo,
      motivoTexto: evento.motivoTexto,
      terminalId: turno.terminalId || '',
    },
    timestamp: now,
  });
}

/**
 * Reanuda un turno pausado.
 */
export async function reanudarTurnoUsuario({
  turnoId,
  actorUid = null,
  rolEjecutor = null,
}) {
  if (!turnoId) throw new Error('turnoId es obligatorio.');

  const role = String(rolEjecutor || '').toLowerCase();
  if (role !== 'admin') {
    const err = new Error('Solo admin puede reanudar turnos.');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }

  const turnoRef = doc(db, 'turnos_pos', turnoId);
  const turnoSnap = await getDoc(turnoRef);
  if (!turnoSnap.exists()) {
    const err = new Error('Turno no encontrado.');
    err.code = 'TURNO_NOT_FOUND';
    throw err;
  }

  const turno = turnoSnap.data();
  if (turno.estadoTurno !== 'pausado' || !turno.pausaActiva?.inicio) {
    const err = new Error('El turno no está en pausa.');
    err.code = 'TURNO_NO_PAUSADO';
    throw err;
  }

  const now = new Date();
  const pausaInicio = turno.pausaActiva.inicio?.toDate ? turno.pausaActiva.inicio.toDate() : new Date(turno.pausaActiva.inicio);
  const pausaMin = Math.max(0, Math.round((now.getTime() - pausaInicio.getTime()) / 60000));
  const totalPausaMinutos = Number(turno.totalPausaMinutos || 0) + pausaMin;

  const evento = {
    tipo: 'pausa_fin',
    timestamp: now,
    duracionMinutos: pausaMin,
    motivoTipo: turno.pausaActiva.motivoTipo || '',
    motivoTexto: turno.pausaActiva.motivoTexto || '',
    actorUid: actorUid || '',
  };

  const eventos = [...(turno.eventosTurno || []), evento];
  await updateDoc(turnoRef, {
    estadoTurno: 'abierto',
    pausaActiva: null,
    totalPausaMinutos,
    eventosTurno: eventos,
    updatedAt: now,
  });

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'pausa_turno_fin',
    adminUid: actorUid || '',
    targetId: turno.usuarioId,
    targetName: turno.usuarioId,
    detalles: {
      turnoId,
      duracionMinutos: pausaMin,
      motivoTipo: evento.motivoTipo,
      motivoTexto: evento.motivoTexto,
      totalPausaMinutos,
      terminalId: turno.terminalId || '',
    },
    timestamp: now,
  });
}

/**
 * Cierra un turno abierto del POS.
 */
export async function cerrarTurnoUsuario({
  turnoId,
  observacionCierre = '',
  cierreForzado = false,
  cerradoPorUid = null,
  rolEjecutor = null,
}) {
  if (!turnoId) throw new Error('turnoId es obligatorio.');

  const role = String(rolEjecutor || '').toLowerCase();
  if (role !== 'admin') {
    const err = new Error('Solo admin puede cerrar turnos.');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }

  const turnoRef = doc(db, 'turnos_pos', turnoId);
  const turnoSnap = await getDoc(turnoRef);
  if (!turnoSnap.exists()) {
    const err = new Error('Turno no encontrado.');
    err.code = 'TURNO_NOT_FOUND';
    throw err;
  }

  const turno = turnoSnap.data();
  if (turno.estadoTurno === 'pausado') {
    const err = new Error('No se puede cerrar un turno en pausa. Reanude primero.');
    err.code = 'TURNO_EN_PAUSA';
    throw err;
  }
  if (turno.estadoTurno !== 'abierto') {
    const err = new Error('El turno ya está cerrado o no es válido para cierre.');
    err.code = 'TURNO_INVALIDO';
    throw err;
  }

  const now = new Date();
  const inicio = turno.horaInicio?.toDate ? turno.horaInicio.toDate() : new Date(turno.horaInicio);
  const duracionBrutaMinutos = Math.max(0, Math.round((now.getTime() - inicio.getTime()) / 60000));
  const totalPausaMinutos = Number(turno.totalPausaMinutos || 0);
  const duracionNetaMinutos = Math.max(0, duracionBrutaMinutos - totalPausaMinutos);
  const eventoCierre = {
    tipo: 'cierre',
    timestamp: now,
    actorUid: cerradoPorUid || '',
    cierreForzado: Boolean(cierreForzado),
  };
  const eventos = [...(turno.eventosTurno || []), eventoCierre];

  await updateDoc(turnoRef, {
    horaCierre: now,
    estadoTurno: 'cerrado',
    observacionCierre: String(observacionCierre || ''),
    cierreForzado: Boolean(cierreForzado),
    duracionMinutos: duracionNetaMinutos,
    duracionBrutaMinutos,
    duracionNetaMinutos,
    totalPausaMinutos,
    eventosTurno: eventos,
    cerradoPorUid: cerradoPorUid || '',
    updatedAt: now,
  });

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'cierre_turno',
    adminUid: cerradoPorUid || '',
    targetId: turno.usuarioId,
    targetName: turno.usuarioId,
    detalles: {
      turnoId,
      rolUsuario: turno.rolUsuario || '',
      terminalId: turno.terminalId || '',
      duracionMinutos: duracionNetaMinutos,
      duracionBrutaMinutos,
      totalPausaMinutos,
      cierreForzado: Boolean(cierreForzado),
      observacionCierre: String(observacionCierre || ''),
      estadoTurno: 'cerrado',
    },
    timestamp: now,
  });
}

/**
 * Lista turnos activos (abiertos) del POS.
 */
export async function getTurnosActivosPOS() {
  const snapshot = await getDocs(collection(db, 'turnos_pos'));
  const list = snapshot.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(t => t.estadoTurno === 'abierto' || t.estadoTurno === 'pausado');

  list.sort((a, b) => {
    const ta = a.horaInicio?.toDate?.() || a.horaInicio || 0;
    const tb = b.horaInicio?.toDate?.() || b.horaInicio || 0;
    return new Date(tb) - new Date(ta);
  });
  return list;
}

/**
 * Lista historial de turnos con filtros opcionales.
 */
export async function getTurnosHistorialPOS({
  usuarioId = '',
  estadoTurno = '',
  dateFrom = '',
  dateTo = '',
} = {}) {
  const snapshot = await getDocs(collection(db, 'turnos_pos'));
  let list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  if (usuarioId) list = list.filter(t => t.usuarioId === usuarioId);
  if (estadoTurno) list = list.filter(t => t.estadoTurno === estadoTurno);

  if (dateFrom || dateTo) {
    list = list.filter(t => {
      const d = t.horaInicio?.toDate?.() || (t.horaInicio ? new Date(t.horaInicio) : null);
      if (!d) return false;
      if (dateFrom) {
        const [y, m, day] = dateFrom.split('-').map(Number);
        const from = new Date(y, m - 1, day, 0, 0, 0, 0);
        if (d < from) return false;
      }
      if (dateTo) {
        const [y, m, day] = dateTo.split('-').map(Number);
        const to = new Date(y, m - 1, day, 23, 59, 59, 999);
        if (d > to) return false;
      }
      return true;
    });
  }

  list.sort((a, b) => {
    const ta = a.horaInicio?.toDate?.() || a.horaInicio || 0;
    const tb = b.horaInicio?.toDate?.() || b.horaInicio || 0;
    return new Date(tb) - new Date(ta);
  });
  return list;
}

// ==================== CUENTAS (MESA COMPARTIDA / HU1) ====================

export async function getMesa(mesaId) {
  const snap = await getDoc(doc(db, 'mesas', mesaId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getCuenta(cuentaId) {
  const snap = await getDoc(doc(db, 'cuentas', cuentaId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Obtiene la cuenta activa de una mesa leyendo mesas/{mesaId}.cuentaActivaId
 * @returns {Promise<null|object>} cuenta
 */
export async function getCuentaActivaByMesaId(mesaId) {
  const mesa = await getMesa(mesaId);
  if (!mesa?.cuentaActivaId) return null;
  return await getCuenta(mesa.cuentaActivaId);
}

export async function getCuentaComensales(cuentaId) {
  const snapshot = await getDocs(collection(db, 'cuentas', cuentaId, 'comensales'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Crea un comensal dentro de una cuenta compartida.
 * @returns {Promise<string>} comensalId
 */
export async function createCuentaComensal({
  cuentaId,
  alias,
  createdByUid = null,
}) {
  const safeAlias = String(alias || '').trim();
  if (!safeAlias) {
    const err = new Error('El nombre del comensal es obligatorio.');
    err.code = 'COMENSAL_ALIAS_REQUIRED';
    throw err;
  }

  const now = new Date();
  const ref = await addDoc(collection(db, 'cuentas', cuentaId, 'comensales'), {
    alias: safeAlias,
    estadoCliente: 'activo',
    createdByUid: createdByUid || '',
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function getCuentaItems(cuentaId) {
  const snapshot = await getDocs(collection(db, 'cuentas', cuentaId, 'items'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

function toMillisSafe(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function isEstadoPendiente(value) {
  return String(value || '').trim().toLowerCase() === 'pendiente';
}

/**
 * Mantiene sincronizado el pedido de cocina cuando una cuenta reabierta
 * recibe (o revierte) ítems nuevos. Si no quedan ítems nuevos pendientes,
 * el pedido de reapertura se finaliza.
 */
async function syncPedidoCocinaReaperturaCuenta({ cuentaId, actorUid = null }) {
  const cuenta = await getCuenta(cuentaId);
  if (!cuenta) return;

  const reopenedAtMs = toMillisSafe(cuenta.reopenedAt);
  const closedAtMs = toMillisSafe(cuenta.closedAt || cuenta.timestampCierre);
  if (!reopenedAtMs || !closedAtMs) return;

  // Reabrir cuenta solo se permite <= 15 min, reforzamos por seguridad.
  if (reopenedAtMs - closedAtMs > 15 * 60 * 1000) return;

  const itemsCuenta = await getCuentaItems(cuentaId);
  const nuevosPendientes = itemsCuenta.filter((item) => {
    if (!isEstadoPendiente(item.estadoItem)) return false;
    const createdMs = toMillisSafe(item.createdAt);
    const updatedMs = toMillisSafe(item.updatedAt);
    return createdMs >= reopenedAtMs || updatedMs >= reopenedAtMs;
  });

  const pedidosSnap = await getDocs(query(collection(db, 'pedidos'), where('cuentaId', '==', cuentaId)));
  const pedidosCuenta = pedidosSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const pedidoReaperturaActivo = pedidosCuenta.find((p) => {
    const origen = String(p.origenPedido || '');
    const estado = String(p.estado || p.estadoPedido || '').toLowerCase();
    return origen === 'reapertura_cuenta' && estado !== 'finalizado';
  });

  if (nuevosPendientes.length === 0) {
    if (pedidoReaperturaActivo) {
      await updateDoc(doc(db, 'pedidos', pedidoReaperturaActivo.id), {
        estado: 'finalizado',
        estadoPedido: 'finalizado',
        finalizedAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return;
  }

  let mesaNumero = null;
  try {
    if (cuenta.mesaId) {
      const mesaSnap = await getDoc(doc(db, 'mesas', cuenta.mesaId));
      if (mesaSnap.exists()) {
        const num = Number(mesaSnap.data()?.numero || 0);
        mesaNumero = Number.isFinite(num) && num > 0 ? num : null;
      }
    }
  } catch (_) {
    // Si no hay permisos para leer mesas no bloqueamos el flujo.
  }

  const payload = {
    mesaId: cuenta.mesaId || null,
    mesaNumero,
    cuentaId,
    meseroUid: actorUid || '',
    origenPedido: 'reapertura_cuenta',
    estado: 'pendiente',
    estadoPedido: 'pendiente',
    notasPedido: 'Pedido reabierto desde caja',
    items: nuevosPendientes.map((item) => ({
      productoId: item.productoId || '',
      nombreSnapshot: item.nombreSnapshot || item.productoId || 'Item',
      precioUnitSnapshot: Number(item.precioUnitSnapshot || 0),
      cantidad: Number(item.cantidad || 1),
      notaEspecial: String(item.notaEspecial || '').trim(),
      estadoItem: 'pendiente',
    })),
    updatedAt: new Date(),
  };

  if (pedidoReaperturaActivo) {
    await updateDoc(doc(db, 'pedidos', pedidoReaperturaActivo.id), payload);
  } else {
    await addDoc(collection(db, 'pedidos'), {
      ...payload,
      timestamp: new Date(),
      createdAt: new Date(),
    });
  }
}

async function syncPedidoCocinaByCuentaItemAnulacion({ cuentaId, item }) {
  if (!cuentaId || !item) return;

  const normalizeStatus = (value) => String(value || '').trim().toLowerCase();
  const buildKey = (input) => {
    const pid = String(input?.productoId || '').trim();
    const nota = String(input?.notaEspecial || '').trim().toLowerCase();
    const comensal = String(input?.comensalId || '').trim();
    return `${pid}__${nota}__${comensal}`;
  };

  const pedidosSnap = await getDocs(query(collection(db, 'pedidos'), where('cuentaId', '==', cuentaId)));
  const pedidosCuenta = pedidosSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const pedidoObjetivo = pedidosCuenta
    .filter((p) => {
      const origen = String(p.origenPedido || '').trim().toLowerCase();
      if (origen === 'venta_directa' || origen === 'reapertura_cuenta') return false;
      const estado = normalizeStatus(p.estado || p.estadoPedido);
      return estado === 'pendiente' || estado === 'enpreparacion' || estado === 'en_preparacion' || estado === 'listo';
    })
    .sort((a, b) => toMillisSafe(b.updatedAt || b.createdAt || b.timestamp) - toMillisSafe(a.updatedAt || a.createdAt || a.timestamp))[0];

  if (!pedidoObjetivo || !Array.isArray(pedidoObjetivo.items) || pedidoObjetivo.items.length === 0) return;

  const targetKey = buildKey(item);
  const targetPid = String(item?.productoId || '').trim();
  const targetComensal = String(item?.comensalId || '').trim();
  const qtyToRemove = Number(item.cantidad || 1);
  let changed = false;
  let updatedItems = pedidoObjetivo.items.map((raw) => ({ ...raw }));

  const applyRemovalAtIndex = (idx) => {
    const line = {
      ...updatedItems[idx],
      productoId: updatedItems[idx]?.productoId || '',
      notaEspecial: String(updatedItems[idx]?.notaEspecial || '').trim(),
      comensalId: updatedItems[idx]?.comensalId || null,
      cantidad: Number(updatedItems[idx]?.cantidad || 1),
    };
    const nextQty = Number(line.cantidad || 0) - qtyToRemove;
    changed = true;
    if (nextQty > 0) {
      updatedItems[idx] = {
        ...updatedItems[idx],
        cantidad: nextQty,
      };
    } else {
      updatedItems.splice(idx, 1);
    }
  };

  const exactMatchIndex = updatedItems.findIndex((raw) => {
    const line = {
      ...raw,
      productoId: raw?.productoId || '',
      notaEspecial: String(raw?.notaEspecial || '').trim(),
      comensalId: raw?.comensalId || null,
    };
    return buildKey(line) === targetKey;
  });

  if (exactMatchIndex >= 0) {
    applyRemovalAtIndex(exactMatchIndex);
  } else {
    // Fallback defensivo: si nota/comensal difieren entre cuenta y pedido,
    // intentamos por producto + comensal para no dejar cocina desactualizada.
    const relaxedIndex = updatedItems.findIndex((raw) => (
      String(raw?.productoId || '').trim() === targetPid &&
      String(raw?.comensalId || '').trim() === targetComensal
    ));
    if (relaxedIndex >= 0) {
      applyRemovalAtIndex(relaxedIndex);
    }
  }

  if (!changed) return;

  const nextCount = Number(pedidoObjetivo.actualizacionesCount || 0) + 1;
  await updateDoc(doc(db, 'pedidos', pedidoObjetivo.id), {
    items: updatedItems,
    pedidoActualizado: true,
    actualizacionesCount: nextCount,
    ultimaActualizacionPedidoAt: new Date(),
    updatedAt: new Date(),
  });
}

async function syncPedidoCocinaByCuentaItemNota({
  cuentaId,
  itemBefore,
  notaNueva = '',
}) {
  if (!cuentaId || !itemBefore) return;

  const normalizeStatus = (value) => String(value || '').trim().toLowerCase();
  const notaAnterior = String(itemBefore.notaEspecial || '').trim();
  const nextNota = String(notaNueva || '').trim();
  const targetPid = String(itemBefore.productoId || '').trim();
  const targetComensal = String(itemBefore.comensalId || '').trim();

  const pedidosSnap = await getDocs(query(collection(db, 'pedidos'), where('cuentaId', '==', cuentaId)));
  const pedidosCuenta = pedidosSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const pedidoObjetivo = pedidosCuenta
    .filter((p) => {
      const origen = String(p.origenPedido || '').trim().toLowerCase();
      if (origen === 'venta_directa' || origen === 'reapertura_cuenta') return false;
      const estado = normalizeStatus(p.estado || p.estadoPedido);
      return estado === 'pendiente' || estado === 'enpreparacion' || estado === 'en_preparacion' || estado === 'listo';
    })
    .sort((a, b) => toMillisSafe(b.updatedAt || b.createdAt || b.timestamp) - toMillisSafe(a.updatedAt || a.createdAt || a.timestamp))[0];

  if (!pedidoObjetivo || !Array.isArray(pedidoObjetivo.items) || pedidoObjetivo.items.length === 0) return;

  let changed = false;
  let updatedItems = pedidoObjetivo.items.map((raw) => ({ ...raw }));
  let matchedIndex = updatedItems.findIndex((line) => (
    String(line?.productoId || '').trim() === targetPid &&
    String(line?.comensalId || '').trim() === targetComensal &&
    String(line?.notaEspecial || '').trim() === notaAnterior
  ));

  if (matchedIndex < 0) {
    const candidates = updatedItems
      .map((line, idx) => ({ idx, line }))
      .filter(({ line }) => (
        String(line?.productoId || '').trim() === targetPid &&
        String(line?.comensalId || '').trim() === targetComensal
      ));
    if (candidates.length === 1) matchedIndex = candidates[0].idx;
  }

  if (matchedIndex >= 0) {
    updatedItems[matchedIndex] = {
      ...updatedItems[matchedIndex],
      notaEspecial: nextNota,
    };
    changed = true;
  }

  let updatedPendientesEntrega = Array.isArray(pedidoObjetivo.itemsPendientesEntrega)
    ? pedidoObjetivo.itemsPendientesEntrega.map((raw) => ({ ...raw }))
    : null;

  if (Array.isArray(updatedPendientesEntrega) && updatedPendientesEntrega.length > 0) {
    let matchedEntregaIndex = updatedPendientesEntrega.findIndex((line) => (
      String(line?.productoId || '').trim() === targetPid &&
      String(line?.comensalId || '').trim() === targetComensal &&
      String(line?.notaEspecial || '').trim() === notaAnterior
    ));
    if (matchedEntregaIndex < 0) {
      const candidatesEntrega = updatedPendientesEntrega
        .map((line, idx) => ({ idx, line }))
        .filter(({ line }) => (
          String(line?.productoId || '').trim() === targetPid &&
          String(line?.comensalId || '').trim() === targetComensal
        ));
      if (candidatesEntrega.length === 1) matchedEntregaIndex = candidatesEntrega[0].idx;
    }
    if (matchedEntregaIndex >= 0) {
      updatedPendientesEntrega[matchedEntregaIndex] = {
        ...updatedPendientesEntrega[matchedEntregaIndex],
        notaEspecial: nextNota,
      };
      changed = true;
    }
  }

  if (!changed) return;

  const nextCount = Number(pedidoObjetivo.actualizacionesCount || 0) + 1;
  const updates = {
    items: updatedItems,
    pedidoActualizado: true,
    actualizacionesCount: nextCount,
    ultimaActualizacionPedidoAt: new Date(),
    updatedAt: new Date(),
  };
  if (Array.isArray(updatedPendientesEntrega)) {
    updates.itemsPendientesEntrega = updatedPendientesEntrega;
  }
  await updateDoc(doc(db, 'pedidos', pedidoObjetivo.id), updates);
}

export async function getCuentaItemsByComensal(cuentaId, comensalId) {
  const q = query(
    collection(db, 'cuentas', cuentaId, 'items'),
    where('comensalId', '==', comensalId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getCuentaUnassignedPendingItems(cuentaId) {
  const q = query(
    collection(db, 'cuentas', cuentaId, 'items'),
    where('comensalId', '==', null)
  );
  const snapshot = await getDocs(q);
  // Filtramos en cliente para evitar índices compuestos por múltiples where()
  return snapshot.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(i => i.estadoItem === 'pendiente');
}

export async function assignCuentaItemToComensal({ cuentaId, itemId, comensalId, assignedByUid = null }) {
  await updateDoc(doc(db, 'cuentas', cuentaId, 'items', itemId), {
    comensalId,
    assignedByUid,
    assignedAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Agrega un ítem (producto) a la cuenta asignado a un comensal.
 * @param {string} cuentaId
 * @param {string} productoId - ID del doc en colección productos
 * @param {string} comensalId
 * @param {string|null} createdByUid
 * @returns {Promise<string>} itemId
 */
export async function addCuentaItem({ cuentaId, productoId, comensalId, createdByUid = null }) {
  const productSnap = await getDoc(doc(db, 'productos', productoId));
  if (!productSnap.exists()) {
    const err = new Error('Producto no encontrado');
    err.code = 'PRODUCT_NOT_FOUND';
    throw err;
  }
  const p = productSnap.data();
  const nombreSnapshot = p.nombre ?? p.name ?? productoId;
  const precioUnitSnapshot = Number(p.precioUnit ?? p.precio ?? 0);

  const docRef = await addDoc(collection(db, 'cuentas', cuentaId, 'items'), {
    productoId,
    nombreSnapshot,
    precioUnitSnapshot,
    cantidad: 1,
    comensalId,
    estadoItem: 'pendiente',
    estadoPreparacion: 'pendiente',
    createdByUid,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const cuenta = await getCuenta(cuentaId);
  const reopenedAtMs = toMillisSafe(cuenta?.reopenedAt);
  const closedAtMs = toMillisSafe(cuenta?.closedAt || cuenta?.timestampCierre);
  const esReaperturaCaja15m =
    reopenedAtMs > 0 &&
    closedAtMs > 0 &&
    reopenedAtMs - closedAtMs <= 15 * 60 * 1000;

  // Siempre enviar a cocina por el mismo pedido de mesa que ven Meseros/KDS.
  // syncPedidoCocinaReaperturaCuenta escribe otro doc (origen reapertura_cuenta);
  // si solo se usara en cuenta con mesa, los ítems no se mezclarían con el pedido activo.
  if (cuenta?.mesaId) {
    await registrarPedidoMesa({
      mesaId: cuenta.mesaId,
      cuentaId,
      meseroUid: createdByUid,
      items: [
        {
          productoId,
          nombreSnapshot,
          precioUnitSnapshot,
          cantidad: 1,
          notaEspecial: '',
          comensalId,
        },
      ],
      notasPedido: '',
    });
  } else if (esReaperturaCaja15m) {
    await syncPedidoCocinaReaperturaCuenta({ cuentaId, actorUid: createdByUid });
  }

  return docRef.id;
}

/**
 * Asegura que exista una cuenta activa para una mesa.
 * Si no existe, crea una y la enlaza en mesas/{mesaId}.cuentaActivaId.
 */
export async function ensureCuentaActivaMesa({ mesaId, openedByUid = null }) {
  const mesaRef = doc(db, 'mesas', mesaId);
  const mesaSnap = await getDoc(mesaRef);
  if (!mesaSnap.exists()) {
    const err = new Error('Mesa no encontrada.');
    err.code = 'MESA_NOT_FOUND';
    throw err;
  }

  const mesa = mesaSnap.data();
  if (mesa.cuentaActivaId) {
    const cuenta = await getCuenta(mesa.cuentaActivaId);
    if (cuenta && cuenta.estadoCuenta === 'abierta') {
      return mesa.cuentaActivaId;
    }
  }

  const now = new Date();
  const cuentaRef = await addDoc(collection(db, 'cuentas'), {
    mesaId,
    estadoCuenta: 'abierta',
    permiteModificar: true,
    openedByUid: openedByUid || '',
    createdAt: now,
    updatedAt: now,
  });

  await updateDoc(mesaRef, {
    cuentaActivaId: cuentaRef.id,
    estadoMesa: 'ocupada',
    estado: 'ocupada',
    updatedAt: now,
  });

  return cuentaRef.id;
}

/**
 * Agrega un ítem a una cuenta con cantidad y nota especial (flujo meseros).
 */
export async function addCuentaItemConCantidad({
  cuentaId,
  productoId,
  cantidad = 1,
  notaEspecial = '',
  comensalId = null,
  createdByUid = null,
}) {
  const qty = Number(cantidad || 0);
  if (!Number.isFinite(qty) || qty <= 0) {
    const err = new Error('Cantidad invalida.');
    err.code = 'INVALID_QTY';
    throw err;
  }

  const productSnap = await getDoc(doc(db, 'productos', productoId));
  if (!productSnap.exists()) {
    const err = new Error('Producto no encontrado');
    err.code = 'PRODUCT_NOT_FOUND';
    throw err;
  }
  const p = productSnap.data();
  const nombreSnapshot = p.nombre ?? p.name ?? productoId;
  const precioUnitSnapshot = Number(p.precioUnit ?? p.precio ?? 0);

  const docRef = await addDoc(collection(db, 'cuentas', cuentaId, 'items'), {
    productoId,
    nombreSnapshot,
    precioUnitSnapshot,
    cantidad: qty,
    notaEspecial: String(notaEspecial || '').trim(),
    comensalId,
    estadoItem: 'pendiente',
    estadoPreparacion: 'pendiente',
    createdByUid,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return docRef.id;
}

/**
 * Registra un pedido enviado a cocina para seguimiento operativo.
 */
export async function registrarPedidoMesa({
  mesaId,
  cuentaId,
  meseroUid = null,
  items = [],
  notasPedido = '',
}) {
  const now = new Date();
  const statusNorm = (value) => String(value || '').trim().toLowerCase();
  const isPedidoActivoEditable = (pedido) => {
    const estado = statusNorm(pedido.estado || pedido.estadoPedido);
    return estado === 'pendiente' || estado === 'enpreparacion' || estado === 'en_preparacion' || estado === 'listo';
  };
  const buildKey = (item) => {
    const pid = String(item.productoId || '').trim();
    const nota = String(item.notaEspecial || '').trim().toLowerCase();
    const comensal = String(item.comensalId || '').trim();
    return `${pid}__${nota}__${comensal}`;
  };
  const normalizePedidoItems = (rawItems = [], options = {}) => {
    const markAsNew = Boolean(options.markAsNew);
    return rawItems.map((i) => ({
      productoId: i.productoId || '',
      nombreSnapshot: i.nombreSnapshot || i.nombre || i.productoId || 'Item',
      precioUnitSnapshot: Number(i.precioUnitSnapshot || 0),
      cantidad: Number(i.cantidad || 1),
      notaEspecial: String(i.notaEspecial || '').trim(),
      comensalId: i.comensalId || null,
      estadoItem: i.estadoItem || 'pendiente',
      esNuevoCocina: markAsNew ? true : Boolean(i.esNuevoCocina),
    }));
  };
  const mergeItems = (baseItems = [], newItems = []) => {
    const byKey = new Map();
    normalizePedidoItems(baseItems).forEach((item) => {
      byKey.set(buildKey(item), { ...item });
    });
    normalizePedidoItems(newItems, { markAsNew: true }).forEach((item) => {
      const key = buildKey(item);
      const existing = byKey.get(key);
      if (existing) {
        existing.cantidad = Number(existing.cantidad || 0) + Number(item.cantidad || 0);
        existing.esNuevoCocina = true;
        byKey.set(key, existing);
      } else {
        byKey.set(key, { ...item });
      }
    });
    return Array.from(byKey.values());
  };

  let mesaNumero = null;
  try {
    const mesaSnap = await getDoc(doc(db, 'mesas', mesaId));
    if (mesaSnap.exists()) {
      const numero = Number(mesaSnap.data()?.numero || 0);
      mesaNumero = Number.isFinite(numero) && numero > 0 ? numero : null;
    }
  } catch (_) {
    // Si no puede leer mesas por reglas, continuamos sin bloquear pedido.
  }

  const incomingItems = Array.isArray(items) ? items : [];
  const pedidosCuentaSnap = await getDocs(query(collection(db, 'pedidos'), where('cuentaId', '==', cuentaId)));
  const pedidosCuenta = pedidosCuentaSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const pedidosMesaMisma = pedidosCuenta
    .filter((p) => String(p.mesaId || '') === String(mesaId || ''))
    .filter((p) => String(p.origenPedido || '').trim().toLowerCase() !== 'venta_directa')
    .filter((p) => String(p.origenPedido || '').trim().toLowerCase() !== 'reapertura_cuenta')
    .sort((a, b) => toMillisSafe(b.updatedAt || b.createdAt || b.timestamp) - toMillisSafe(a.updatedAt || a.createdAt || a.timestamp));

  const pedidoActivo = pedidosMesaMisma.find((p) => isPedidoActivoEditable(p)) || null;
  const pedidoFinalizado = !pedidoActivo
    ? pedidosMesaMisma.find((p) => statusNorm(p.estado || p.estadoPedido) === 'finalizado') || null
    : null;
  const pedidoEntregado = !pedidoActivo && !pedidoFinalizado
    ? pedidosMesaMisma.find((p) => statusNorm(p.estado || p.estadoPedido) === 'entregado') || null
    : null;

  const pedidoTarget = pedidoActivo || pedidoFinalizado || pedidoEntregado;
  let pedidoId = null;
  let wasUpdate = false;

  if (pedidoTarget) {
    const estadoActualNorm = statusNorm(pedidoTarget.estado || pedidoTarget.estadoPedido);
    const reopenFromFinished =
      estadoActualNorm === 'listo' ||
      estadoActualNorm === 'finalizado' ||
      estadoActualNorm === 'entregado';
    const mergedItems = reopenFromFinished
      ? normalizePedidoItems(incomingItems, { markAsNew: true })
      : mergeItems(pedidoTarget.items || [], incomingItems);
    const nextCount = Number(pedidoTarget.actualizacionesCount || 0) + 1;
    const prevNotes = String(pedidoTarget.notasPedido || '').trim();
    const incomingNotes = String(notasPedido || '').trim();
    const notes = incomingNotes
      ? (prevNotes ? `${prevNotes}\n---\n${incomingNotes}` : incomingNotes)
      : prevNotes;

    const updateFields = {
      items: mergedItems,
      notasPedido: notes,
      pedidoActualizado: true,
      actualizacionesCount: nextCount,
      ultimaActualizacionPedidoAt: now,
      estado: reopenFromFinished ? 'pendiente' : (estadoActualNorm || 'pendiente'),
      estadoPedido: reopenFromFinished ? 'pendiente' : (estadoActualNorm || 'pendiente'),
      estadoEntrega: 'pendiente',
      entregadoAt: null,
      updatedAt: now,
    };

    if (reopenFromFinished) {
      const accumulated = [
        ...normalizePedidoItems(pedidoTarget.itemsPrevios || []),
        ...normalizePedidoItems(pedidoTarget.items || []),
      ];
      updateFields.itemsPrevios = accumulated;
    }

    await updateDoc(doc(db, 'pedidos', pedidoTarget.id), updateFields);
    pedidoId = pedidoTarget.id;
    wasUpdate = true;
  } else {
    const pedidoRef = await addDoc(collection(db, 'pedidos'), {
      mesaId,
      mesaNumero,
      cuentaId,
      meseroUid: meseroUid || '',
      estado: 'pendiente',
      estadoPedido: 'pendiente',
      estadoEntrega: 'pendiente',
      itemsPendientesEntrega: [],
      notasPedido: String(notasPedido || '').trim(),
      items: normalizePedidoItems(incomingItems),
      pedidoActualizado: false,
      actualizacionesCount: 0,
      ultimaActualizacionPedidoAt: null,
      timestamp: now,
      createdAt: now,
      updatedAt: now,
    });
    pedidoId = pedidoRef.id;
  }

  try {
    // El log no debe romper el flujo de pedido si reglas bloquean auditoria.
    await addDoc(collection(db, 'auditoria'), {
      tipo: wasUpdate ? 'pedido_actualizado_cocina' : 'pedido_enviado_cocina',
      adminUid: meseroUid || '',
      targetId: pedidoId,
      targetName: `Mesa ${mesaId}`,
      detalles: {
        pedidoId,
        mesaId,
        cuentaId,
        itemsCount: items.length,
        actualizacion: wasUpdate,
      },
      timestamp: now,
    });
  } catch (auditError) {
    console.warn('No se pudo registrar auditoria de pedido_enviado_cocina:', auditError);
  }

  return pedidoId;
}

/**
 * POS-005 (MVP): Crea una cuenta de venta directa / para llevar (sin mesa).
 * @returns {Promise<string>} cuentaId
 */
export async function createVentaDirectaCuenta({
  createdByUid = null,
  tipoVenta = 'directa_para_llevar',
  tipoPedido = 'para_llevar',
  terminalId = 'Caja',
} = {}) {
  const now = new Date();
  const ref = await addDoc(collection(db, 'cuentas'), {
    estadoCuenta: 'abierta',
    estadoEntrega: 'pendiente',
    tipoVenta,
    tipoPedido,
    terminalId,
    mesaId: null,
    createdByUid,
    openedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return ref.id;
}

/**
 * POS-005 (MVP): Agrega ítem a cuenta de venta directa.
 * @returns {Promise<string>} itemId
 */
export async function addVentaDirectaItem({
  cuentaId,
  productoId,
  cantidad = 1,
  createdByUid = null,
}) {
  const qty = Number(cantidad || 0);
  if (!Number.isFinite(qty) || qty <= 0) {
    const err = new Error('Cantidad inválida.');
    err.code = 'INVALID_QTY';
    throw err;
  }

  const productSnap = await getDoc(doc(db, 'productos', productoId));
  if (!productSnap.exists()) {
    const err = new Error('Producto no encontrado');
    err.code = 'PRODUCT_NOT_FOUND';
    throw err;
  }
  const p = productSnap.data();
  const nombreSnapshot = p.nombre ?? p.name ?? productoId;
  const precioUnitSnapshot = Number(p.precioUnit ?? p.precio ?? 0);

  const itemRef = await addDoc(collection(db, 'cuentas', cuentaId, 'items'), {
    productoId,
    nombreSnapshot,
    precioUnitSnapshot,
    cantidad: qty,
    comensalId: null,
    estadoItem: 'pendiente',
    createdByUid,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return itemRef.id;
}

/**
 * POS-005 (MVP): Cierra/cobra una venta directa.
 * Marca ítems pendientes como pagados y cierra la cuenta.
 */
export async function cerrarVentaDirectaCuenta({
  cuentaId,
  metodo = 'efectivo',
  cajeroUid = null,
  impuestoRate = 0.13,
  promocionId = null,
  promocionMotivo = '',
}) {
  const cuenta = await getCuenta(cuentaId);
  if (!cuenta) {
    const err = new Error('Cuenta no encontrada.');
    err.code = 'CUENTA_NOT_FOUND';
    throw err;
  }
  if (cuenta.estadoCuenta === 'cerrada' || cuenta.estadoCuenta === 'cobrada') {
    const err = new Error('La cuenta ya está cerrada o cobrada.');
    err.code = 'CUENTA_ALREADY_CLOSED';
    throw err;
  }

  const items = await getCuentaItems(cuentaId);
  const pendientes = items.filter((i) => i.estadoItem === 'pendiente');
  if (pendientes.length === 0) {
    const err = new Error('Agregue al menos un producto.');
    err.code = 'EMPTY_SALE';
    throw err;
  }

  const subtotal = Math.round(
    pendientes.reduce((s, i) => s + Number(i.precioUnitSnapshot || 0) * Number(i.cantidad || 1), 0)
  );
  const promoResult = await computePromocionForCobro({
    promocionId,
    items: pendientes,
    subtotal,
  });
  const promoMotivoTrim = String(promocionMotivo || '').trim();
  const promoMotivoFinal = promoResult.promocion
    ? (promoMotivoTrim || 'Aplicación manual en caja')
    : null;
  const subtotalConDescuento = Math.max(0, subtotal - Number(promoResult.descuento || 0));
  const impuesto = Math.round(subtotalConDescuento * Number(impuestoRate || 0));
  const total = subtotalConDescuento + impuesto;
  const now = new Date();

  const batch = writeBatch(db);
  for (const item of pendientes) {
    batch.update(doc(db, 'cuentas', cuentaId, 'items', item.id), {
      estadoItem: 'pagado',
      paidAt: now,
      updatedAt: now,
    });
  }

  batch.update(doc(db, 'cuentas', cuentaId), {
    estadoCuenta: 'cobrada',
    estadoPago: 'pagado',
    estadoEntrega: 'pendiente_entrega',
    metodoPago: metodo,
    montoSubtotal: subtotal,
    montoDescuentoPromocion: Number(promoResult.descuento || 0),
    montoSubtotalConDescuento: subtotalConDescuento,
    montoImpuesto: impuesto,
    montoTotal: total,
    promocionAplicadaId: promoResult.promocion?.id || null,
    promocionAplicada: promoResult.promocion || null,
    promocionAplicacionTipo: promoResult.promocion ? 'manual' : null,
    promocionAplicadaPorUid: promoResult.promocion ? (cajeroUid || null) : null,
    promocionMotivo: promoMotivoFinal,
    cobradoAt: now,
    closedByUid: cajeroUid,
    updatedAt: now,
  });
  await batch.commit();

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'venta_directa_cobrada',
    adminUid: cajeroUid || '',
    targetId: cuentaId,
    targetName: 'Venta directa',
    detalles: {
      cuentaId,
      metodo,
      itemsCount: pendientes.length,
      subtotal,
      descuentoPromocion: Number(promoResult.descuento || 0),
      impuesto,
      total,
      promocionAplicadaId: promoResult.promocion?.id || null,
      promocionAplicacionTipo: promoResult.promocion ? 'manual' : null,
      promocionMotivo: promoMotivoFinal,
    },
    timestamp: now,
  });

  // Envia pedido a cocina para preparacion de para llevar.
  await addDoc(collection(db, 'pedidos'), {
    mesaId: null,
    mesaNumero: null,
    cuentaId,
    meseroUid: cajeroUid || '',
    origenPedido: 'venta_directa',
    tipoPedido: 'para_llevar',
    terminalId: 'Caja',
    estado: 'pendiente',
    estadoPedido: 'pendiente',
    notasPedido: 'Pedido de venta directa para llevar',
    items: pendientes.map((i) => ({
      productoId: i.productoId || '',
      nombreSnapshot: i.nombreSnapshot || i.productoId || 'Item',
      precioUnitSnapshot: Number(i.precioUnitSnapshot || 0),
      cantidad: Number(i.cantidad || 1),
      notaEspecial: String(i.notaEspecial || '').trim(),
      estadoItem: 'pendiente',
    })),
    timestamp: now,
    createdAt: now,
    updatedAt: now,
  });

  return {
    subtotal,
    descuentoPromocion: Number(promoResult.descuento || 0),
    subtotalConDescuento,
    impuesto,
    total,
    itemsCount: pendientes.length,
  };
}

/**
 * POS-005 (MVP): Obtiene ventas directas cobradas pendientes de entrega.
 */
export async function getVentasDirectasPendientesEntrega() {
  const q = query(
    collection(db, 'cuentas'),
    where('tipoVenta', '==', 'directa_para_llevar'),
    where('estadoEntrega', '==', 'pendiente_entrega')
  );
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const ta = a.cobradoAt?.toDate?.() || a.cobradoAt || 0;
    const tb = b.cobradoAt?.toDate?.() || b.cobradoAt || 0;
    return new Date(tb) - new Date(ta);
  });
  return list;
}

/**
 * POS-005 (MVP): Marca una venta directa como entregada (cierre definitivo).
 */
export async function marcarVentaDirectaEntregada({
  cuentaId,
  cajeroUid = null,
}) {
  const cuenta = await getCuenta(cuentaId);
  if (!cuenta) {
    const err = new Error('Cuenta no encontrada.');
    err.code = 'CUENTA_NOT_FOUND';
    throw err;
  }
  if (cuenta.estadoEntrega === 'entregado') {
    const err = new Error('La venta ya fue entregada.');
    err.code = 'ALREADY_DELIVERED';
    throw err;
  }

  const now = new Date();
  await updateDoc(doc(db, 'cuentas', cuentaId), {
    estadoCuenta: 'cerrada',
    estadoEntrega: 'entregado',
    entregadoAt: now,
    timestampCierre: now,
    closedAt: now,
    noReapertura: true,
    updatedAt: now,
  });

  await liberarMesaSiCorresponde({
    mesaId: cuenta.mesaId,
    cuentaId,
    now,
  });

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'venta_directa_entregada',
    adminUid: cajeroUid || '',
    targetId: cuentaId,
    targetName: 'Venta directa',
    detalles: { cuentaId },
    timestamp: now,
  });
}

/**
 * Anula un ítem de cuenta con motivo obligatorio.
 * No elimina físicamente el documento; cambia estadoItem a "anulado".
 */
export async function anularCuentaItem({
  cuentaId,
  itemId,
  motivo = '',
  usuarioId = null,
  rolUsuario = null,
}) {
  const role = String(rolUsuario || '').toLowerCase();
  if (role !== 'cajero' && role !== 'admin' && role !== 'mesero') {
    const err = new Error('No tienes permiso para anular ítems.');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }

  const itemRef = doc(db, 'cuentas', cuentaId, 'items', itemId);
  const itemSnap = await getDoc(itemRef);
  if (!itemSnap.exists()) {
    const err = new Error('Ítem no encontrado');
    err.code = 'ITEM_NOT_FOUND';
    throw err;
  }

  const item = itemSnap.data();
  const estadoItem = String(item.estadoItem || 'pendiente').trim().toLowerCase();
  const estadoPrep = String(item.estadoPreparacion || 'pendiente').trim().toLowerCase();

  if (estadoItem === 'pagado') {
    const err = new Error('No se puede anular un ítem ya pagado.');
    err.code = 'ITEM_ALREADY_PAID';
    throw err;
  }
  if (estadoItem === 'anulado') {
    const err = new Error('El ítem ya está anulado.');
    err.code = 'ITEM_ALREADY_ANNULLED';
    throw err;
  }
  if (estadoItem === 'entregado' || estadoItem === 'listo' || estadoPrep === 'entregado' || estadoPrep === 'listo') {
    const err = new Error('No se puede anular un ítem ya listo o entregado.');
    err.code = 'ITEM_ALREADY_PROCESSED';
    throw err;
  }
  if (estadoItem !== 'pendiente' && estadoItem !== 'enpreparacion' && estadoItem !== 'en_preparacion') {
    const err = new Error('Solo se pueden anular ítems pendientes o en preparación.');
    err.code = 'INVALID_ITEM_STATE';
    throw err;
  }

  const enPreparacion = estadoItem === 'enpreparacion' || estadoItem === 'en_preparacion' || estadoPrep === 'enpreparacion' || estadoPrep === 'en_preparacion';
  const motivoLimpio = String(motivo || '').trim();
  let requiereMotivo = enPreparacion;

  // Bloqueo adicional: si el ítem ya está cocinado/listo para entregar en pedidos,
  // no debe permitirse anulación aunque en cuentas/items aún se vea como pendiente.
  const keyFrom = (input) => {
    const pid = String(input?.productoId || '').trim();
    const nota = String(input?.notaEspecial || '').trim().toLowerCase();
    const comensal = String(input?.comensalId || '').trim();
    return `${pid}__${nota}__${comensal}`;
  };
  const targetKey = keyFrom(item);
  const pedidosSnap = await getDocs(query(collection(db, 'pedidos'), where('cuentaId', '==', cuentaId)));
  const pedidoMasReciente = pedidosSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => {
      const origen = String(p.origenPedido || '').trim().toLowerCase();
      return origen !== 'venta_directa' && origen !== 'reapertura_cuenta';
    })
    .sort((a, b) => toMillisSafe(b.updatedAt || b.createdAt || b.timestamp) - toMillisSafe(a.updatedAt || a.createdAt || a.timestamp))[0];

  if (pedidoMasReciente) {
    const pendientesEntrega = Array.isArray(pedidoMasReciente.itemsPendientesEntrega) ? pedidoMasReciente.itemsPendientesEntrega : [];
    const itemsActuales = Array.isArray(pedidoMasReciente.items) ? pedidoMasReciente.items : [];
    const statusPedido = String(pedidoMasReciente.estado || pedidoMasReciente.estadoPedido || '').trim().toLowerCase();
    const matchExacto = (line) => keyFrom(line) === targetKey;
    const matchRelajado = (line) => (
      String(line?.productoId || '').trim() === String(item?.productoId || '').trim() &&
      String(line?.comensalId || '').trim() === String(item?.comensalId || '').trim()
    );
    const enPedidoActivo = itemsActuales.some((line) => matchExacto(line) || matchRelajado(line));
    if (statusPedido === 'enpreparacion' || statusPedido === 'en_preparacion') {
      requiereMotivo = requiereMotivo || enPedidoActivo;
    }

    const enPendientesEntrega = pendientesEntrega.some((line) => keyFrom(line) === targetKey);
    const enItemsListos = (statusPedido === 'listo' || statusPedido === 'finalizado')
      && itemsActuales.some((line) => keyFrom(line) === targetKey);

    if (enPendientesEntrega || enItemsListos) {
      const err = new Error('No se puede anular un ítem ya listo para entregar o ya cocinado.');
      err.code = 'ITEM_ALREADY_PROCESSED';
      throw err;
    }
  }

  if (requiereMotivo && !motivoLimpio) {
    const err = new Error('Debes indicar un motivo para anular un ítem en preparación.');
    err.code = 'MOTIVO_REQUIRED';
    throw err;
  }
  const motivoFinal = motivoLimpio || 'Anulación de ítem pendiente';

  await updateDoc(itemRef, {
    estadoItem: 'anulado',
    updatedAt: new Date(),
  });

  await syncPedidoCocinaByCuentaItemAnulacion({
    cuentaId,
    item,
  });

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'anulacion_item_cuenta',
    adminUid: usuarioId || '',
    targetId: itemId,
    targetName: item.nombreSnapshot || item.productoId || 'Item',
    detalles: {
      cuentaId,
      itemId,
      comensalId: item.comensalId || null,
      motivo: motivoFinal,
      estadoAnterior: estadoItem || 'pendiente',
      estadoNuevo: 'anulado',
      monto: Number(item.precioUnitSnapshot || 0) * Number(item.cantidad || 1),
    },
    timestamp: new Date(),
  });

  await syncPedidoCocinaReaperturaCuenta({
    cuentaId,
    actorUid: usuarioId,
  });
}

export async function updateCuentaItemNotaEspecial({
  cuentaId,
  itemId,
  notaEspecial = '',
  usuarioId = null,
  rolUsuario = null,
}) {
  const role = String(rolUsuario || '').toLowerCase();
  if (role !== 'cajero' && role !== 'admin' && role !== 'mesero') {
    const err = new Error('No tienes permiso para editar notas de ítems.');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }

  const itemRef = doc(db, 'cuentas', cuentaId, 'items', itemId);
  const itemSnap = await getDoc(itemRef);
  if (!itemSnap.exists()) {
    const err = new Error('Ítem no encontrado');
    err.code = 'ITEM_NOT_FOUND';
    throw err;
  }

  const item = itemSnap.data();
  const estadoItem = String(item.estadoItem || 'pendiente').trim().toLowerCase();
  const estadoPrep = String(item.estadoPreparacion || 'pendiente').trim().toLowerCase();

  if (estadoItem === 'pagado' || estadoItem === 'anulado' || estadoItem === 'listo' || estadoItem === 'entregado') {
    const err = new Error('No se puede editar la nota de un ítem ya procesado.');
    err.code = 'INVALID_ITEM_STATE';
    throw err;
  }
  if (estadoPrep === 'enpreparacion' || estadoPrep === 'en_preparacion' || estadoPrep === 'listo' || estadoPrep === 'entregado') {
    const err = new Error('Solo se puede editar la nota antes de iniciar preparación.');
    err.code = 'INVALID_PREPARATION_STATE';
    throw err;
  }

  const nextNota = String(notaEspecial || '').trim();
  await updateDoc(itemRef, {
    notaEspecial: nextNota,
    updatedAt: new Date(),
  });

  await syncPedidoCocinaByCuentaItemNota({
    cuentaId,
    itemBefore: item,
    notaNueva: nextNota,
  });

  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'actualizacion_nota_item_cuenta',
      adminUid: usuarioId || '',
      targetId: itemId,
      targetName: item.nombreSnapshot || item.productoId || 'Item',
      detalles: {
        cuentaId,
        itemId,
        comensalId: item.comensalId || null,
        notaAnterior: String(item.notaEspecial || '').trim(),
        notaNueva: nextNota,
      },
      timestamp: new Date(),
    });
  } catch (auditError) {
    console.warn('No se pudo registrar auditoria de actualizacion_nota_item_cuenta:', auditError);
  }
}

/**
 * Revierte una anulación y vuelve el ítem a pendiente.
 */
export async function revertirAnulacionCuentaItem({
  cuentaId,
  itemId,
  motivo,
  usuarioId = null,
  rolUsuario = null,
}) {
  if (!motivo || !String(motivo).trim()) {
    const err = new Error('Debe indicar un motivo para revertir.');
    err.code = 'MOTIVO_REQUIRED';
    throw err;
  }

  const role = String(rolUsuario || '').toLowerCase();
  if (role !== 'cajero' && role !== 'admin') {
    const err = new Error('No tienes permiso para revertir anulación.');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }

  const itemRef = doc(db, 'cuentas', cuentaId, 'items', itemId);
  const itemSnap = await getDoc(itemRef);
  if (!itemSnap.exists()) {
    const err = new Error('Ítem no encontrado');
    err.code = 'ITEM_NOT_FOUND';
    throw err;
  }

  const item = itemSnap.data();
  if (item.estadoItem !== 'anulado') {
    const err = new Error('Solo se puede revertir un ítem anulado.');
    err.code = 'INVALID_ITEM_STATE';
    throw err;
  }

  await updateDoc(itemRef, {
    estadoItem: 'pendiente',
    estadoPreparacion: 'pendiente',
    updatedAt: new Date(),
  });

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'reversion_anulacion_item_cuenta',
    adminUid: usuarioId || '',
    targetId: itemId,
    targetName: item.nombreSnapshot || item.productoId || 'Item',
    detalles: {
      cuentaId,
      itemId,
      comensalId: item.comensalId || null,
      motivo: String(motivo).trim(),
      estadoAnterior: 'anulado',
      estadoNuevo: 'pendiente',
      monto: Number(item.precioUnitSnapshot || 0) * Number(item.cantidad || 1),
    },
    timestamp: new Date(),
  });

  const cuenta = await getCuenta(cuentaId);
  const reopenedAtMs = toMillisSafe(cuenta?.reopenedAt);
  const closedAtMs = toMillisSafe(cuenta?.closedAt || cuenta?.timestampCierre);
  const esReaperturaCaja15m =
    reopenedAtMs > 0 &&
    closedAtMs > 0 &&
    reopenedAtMs - closedAtMs <= 15 * 60 * 1000;

  if (cuenta?.mesaId) {
    await registrarPedidoMesa({
      mesaId: cuenta.mesaId,
      cuentaId,
      meseroUid: usuarioId,
      items: [
        {
          productoId: item.productoId || '',
          nombreSnapshot: item.nombreSnapshot || item.productoId || 'Item',
          precioUnitSnapshot: Number(item.precioUnitSnapshot || 0),
          cantidad: Number(item.cantidad || 1),
          notaEspecial: String(item.notaEspecial || '').trim(),
          comensalId: item.comensalId || null,
        },
      ],
      notasPedido: '',
    });
  } else if (esReaperturaCaja15m) {
    await syncPedidoCocinaReaperturaCuenta({
      cuentaId,
      actorUid: usuarioId,
    });
  }
}

/**
 * Compatibilidad: mantiene firma anterior, usando anulación con motivo genérico.
 */
export async function deleteCuentaItem({ cuentaId, itemId }) {
  return anularCuentaItem({
    cuentaId,
    itemId,
    motivo: 'Anulación sin motivo explícito (compatibilidad)',
    usuarioId: null,
    rolUsuario: 'admin',
  });
}

/**
 * Cierre parcial por comensal:
 * - valida que no existan ítems pendientes sin asignar
 * - marca ítems del comensal como pagados
 * - crea un documento en pagos
 * - libera al comensal si ya no le quedan pendientes
 */
export async function payPartialForComensal({
  cuentaId,
  mesaId,
  comensalId,
  metodo,
  cajeroUid = null,
  impuestoRate = 0.13,
  promocionId = null,
  promocionMotivo = '',
}) {
  const allowed = ['efectivo', 'tarjeta', 'mixto'];
  if (!allowed.includes(metodo)) {
    const err = new Error('Método de pago inválido');
    err.code = 'INVALID_METHOD';
    throw err;
  }

  const normalizedComensalId = String(comensalId || '').trim();
  if (!normalizedComensalId) {
    const err = new Error('Comensal inválido.');
    err.code = 'INVALID_COMENSAL';
    throw err;
  }

  const cuenta = await getCuenta(cuentaId);
  if (!cuenta) {
    const err = new Error('Cuenta no encontrada.');
    err.code = 'CUENTA_NOT_FOUND';
    throw err;
  }

  const allItems = await getCuentaItems(cuentaId);
  const isPendiente = (value) => String(value || '').trim().toLowerCase() === 'pendiente';
  const isUnassigned = (value) => value === null || value === undefined || String(value).trim() === '';

  const unassigned = allItems.filter(i => isUnassigned(i.comensalId) && isPendiente(i.estadoItem));
  if (unassigned.length > 0) {
    const err = new Error('Hay ítems sin asignar. Asigna primero para poder cerrar parcialmente.');
    err.code = 'UNASSIGNED_ITEMS';
    err.unassignedItemIds = unassigned.map(i => i.id);
    throw err;
  }

  const items = allItems.filter(
    (i) => String(i.comensalId || '').trim() === normalizedComensalId && isPendiente(i.estadoItem)
  );

  if (items.length === 0) {
    const err = new Error('El comensal no tiene ítems pendientes.');
    err.code = 'NO_PENDING_ITEMS';
    throw err;
  }

  const subtotal = Math.round(
    items.reduce((s, i) => s + (Number(i.precioUnitSnapshot || 0) * Number(i.cantidad || 1)), 0)
  );
  const promoId = String(promocionId || '').trim();
  if (promoId && String(cuenta.promocionAplicadaId || '').trim() && String(cuenta.promocionAplicadaId || '').trim() !== promoId) {
    const err = new Error('Solo se permite una promoción por cuenta.');
    err.code = 'PROMO_ONE_PER_ACCOUNT';
    throw err;
  }
  const promoResult = await computePromocionForCobro({
    promocionId: promoId,
    items,
    subtotal,
  });
  const promoMotivoTrim = String(promocionMotivo || '').trim();
  const promoMotivoFinal = promoResult.promocion
    ? (promoMotivoTrim || 'Aplicación manual en caja')
    : null;
  const subtotalConDescuento = Math.max(0, subtotal - Number(promoResult.descuento || 0));
  const impuesto = Math.round(subtotalConDescuento * Number(impuestoRate || 0));
  const total = subtotalConDescuento + impuesto;
  const montoCuentaCompleta = Math.round(
    allItems
      .filter((i) => String(i.estadoItem || '').trim().toLowerCase() !== 'anulado')
      .reduce((s, i) => s + (Number(i.precioUnitSnapshot || 0) * Number(i.cantidad || 1)), 0)
  );

  const pagoRef = doc(collection(db, 'pagos'));
  const pagoId = pagoRef.id;

  const batch = writeBatch(db);
  batch.set(
    pagoRef,
    {
      cuentaId,
      mesaId,
      comensalId,
      itemIds: items.map(i => i.id),
      metodo,
      estadoPago: 'pagado',
      montoSubtotal: subtotal,
      montoDescuentoPromocion: Number(promoResult.descuento || 0),
      montoSubtotalConDescuento: subtotalConDescuento,
      montoImpuesto: impuesto,
      montoTotal: total,
      promocionAplicadaId: promoResult.promocion?.id || null,
      promocionAplicada: promoResult.promocion || null,
      promocionAplicacionTipo: promoResult.promocion ? 'manual' : null,
      promocionAplicadaPorUid: promoResult.promocion ? (cajeroUid || null) : null,
      promocionMotivo: promoMotivoFinal,
      cajeroUid,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { merge: true }
  );

  for (const item of items) {
    batch.update(doc(db, 'cuentas', cuentaId, 'items', item.id), {
      estadoItem: 'pagado',
      pagoId,
      paidAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await batch.commit();

  if (promoResult.promocion?.id && !String(cuenta.promocionAplicadaId || '').trim()) {
    await updateDoc(doc(db, 'cuentas', cuentaId), {
      promocionAplicadaId: promoResult.promocion.id,
      promocionAplicada: promoResult.promocion,
      promocionAplicacionTipo: 'manual',
      promocionAplicadaPorUid: cajeroUid || null,
      promocionMotivo: promoMotivoFinal,
      updatedAt: new Date(),
    });
  }

  let cuentaCerrada = false;

  // Liberar comensal si no quedan pendientes
  const pendingAfter = (await getCuentaItems(cuentaId)).filter(
    (i) => String(i.comensalId || '').trim() === normalizedComensalId && isPendiente(i.estadoItem)
  );
  if (pendingAfter.length === 0) {
    await setDoc(
      doc(db, 'cuentas', cuentaId, 'comensales', comensalId),
      { estadoCliente: 'liberado', updatedAt: new Date() },
      { merge: true }
    );

    // Si todos los comensales están liberados, marcar cuenta como cerrada
    const comensales = await getCuentaComensales(cuentaId);
    const todosLiberados = comensales.length > 0 && comensales.every(c => c.estadoCliente === 'liberado');
    if (todosLiberados) {
      await updateDoc(doc(db, 'cuentas', cuentaId), {
        estadoCuenta: 'cerrada',
        closedAt: new Date(),
        timestampCierre: new Date(),
        closedByUid: cajeroUid ?? null,
        updatedAt: new Date(),
      });
      await liberarMesaSiCorresponde({
        mesaId,
        cuentaId,
        now: new Date(),
      });
      await addDoc(collection(db, 'auditoria'), {
        tipo: 'cuenta_cobrada_completa',
        adminUid: cajeroUid || '',
        targetId: cuentaId,
        targetName: `Cuenta ${cuentaId}`,
        detalles: {
          cuentaId,
          mesaId,
          metodoUltimoPago: metodo,
          pagoId,
          totalCuenta: montoCuentaCompleta,
          totalItems: allItems.length,
        },
        timestamp: new Date(),
      });
      cuentaCerrada = true;
    }
  }

  return { pagoId, itemIds: items.map(i => i.id), subtotal, impuesto, total, cuentaCerrada };
}

/**
 * Cancela una cuenta abierta (cliente se retira / cancelación operativa).
 * - Requiere motivo.
 * - Anula ítems pendientes.
 * - Libera mesa asociada.
 * - Cierra pedidos de cocina vinculados a la cuenta.
 */
export async function cancelarCuenta({
  cuentaId,
  mesaId = null,
  usuarioId = null,
  motivo,
}) {
  const motivoTrim = String(motivo || '').trim();
  if (!motivoTrim) {
    const err = new Error('Debe indicar un motivo para cancelar la cuenta.');
    err.code = 'MOTIVO_REQUIRED';
    throw err;
  }

  const cuentaRef = doc(db, 'cuentas', cuentaId);
  const cuentaSnap = await getDoc(cuentaRef);
  if (!cuentaSnap.exists()) {
    const err = new Error('Cuenta no encontrada.');
    err.code = 'CUENTA_NOT_FOUND';
    throw err;
  }

  const cuenta = cuentaSnap.data();
  const estadoCuenta = String(cuenta.estadoCuenta || '').trim().toLowerCase();
  if (estadoCuenta !== 'abierta') {
    const err = new Error('Solo se pueden cancelar cuentas abiertas.');
    err.code = 'INVALID_ACCOUNT_STATE';
    throw err;
  }

  const items = await getCuentaItems(cuentaId);
  const itemsPagados = items.filter((i) => String(i.estadoItem || '').trim().toLowerCase() === 'pagado');
  if (itemsPagados.length > 0) {
    const err = new Error('No se puede cancelar una cuenta con ítems pagados.');
    err.code = 'HAS_PAID_ITEMS';
    throw err;
  }

  const now = new Date();
  const batch = writeBatch(db);

  batch.update(cuentaRef, {
    estadoCuenta: 'cancelada',
    motivoCancelacion: motivoTrim,
    cancelledAt: now,
    cancelledByUid: usuarioId || null,
    updatedAt: now,
  });

  let itemsAnulados = 0;
  for (const item of items) {
    const estadoItem = String(item.estadoItem || '').trim().toLowerCase();
    if (estadoItem === 'pendiente') {
      itemsAnulados += 1;
      batch.update(doc(db, 'cuentas', cuentaId, 'items', item.id), {
        estadoItem: 'anulado',
        motivoAnulacion: motivoTrim,
        canceledAt: now,
        updatedAt: now,
      });
    }
  }

  await batch.commit();

  const mesaIdResolved = mesaId || cuenta.mesaId || null;
  await liberarMesaSiCorresponde({
    mesaId: mesaIdResolved,
    cuentaId,
    now,
  });

  const pedidosSnap = await getDocs(query(collection(db, 'pedidos'), where('cuentaId', '==', cuentaId)));
  for (const pedidoDoc of pedidosSnap.docs) {
    const pedido = pedidoDoc.data() || {};
    const estadoPedido = String(pedido.estado || pedido.estadoPedido || '').trim().toLowerCase();
    if (estadoPedido === 'finalizado' || estadoPedido === 'cancelado') continue;

    await updateDoc(doc(db, 'pedidos', pedidoDoc.id), {
      estado: 'finalizado',
      estadoPedido: 'finalizado',
      motivoCancelacionCuenta: motivoTrim,
      finalizedAt: now,
      updatedAt: now,
    });
  }

  const totalReferencial = Math.round(
    items
      .filter((i) => String(i.estadoItem || '').trim().toLowerCase() !== 'anulado')
      .reduce((s, i) => s + Number(i.precioUnitSnapshot || 0) * Number(i.cantidad || 1), 0)
  );

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'cuenta_cancelada',
    adminUid: usuarioId || '',
    targetId: cuentaId,
    targetName: `Cuenta ${cuentaId}`,
    detalles: {
      cuentaId,
      mesaId: mesaIdResolved,
      motivo: motivoTrim,
      itemsTotal: items.length,
      itemsAnulados,
      itemsPagados: itemsPagados.length,
      totalReferencial,
    },
    timestamp: now,
  });

  return { ok: true, itemsAnulados };
}

// ==================== HU2: REAPERTURA DE CUENTA CERRADA ====================

/** Límite en ms para permitir reapertura (15 minutos). */
export const LIMITE_REAPERTURA_MS = 15 * 60 * 1000;

/**
 * Obtiene cuentas cerradas (para historial y reapertura por supervisor).
 * Ordenadas por fecha de cierre descendente (orden en memoria para no requerir índice compuesto).
 * @returns {Promise<array>} Lista de cuentas con estadoCuenta === 'cerrada'
 */
export async function getCuentasCerradas() {
  const q = query(
    collection(db, 'cuentas'),
    where('estadoCuenta', '==', 'cerrada')
  );
  const snapshot = await getDocs(q);
  const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  const toMs = (ts) => {
    if (!ts) return 0;
    return ts.toMillis ? ts.toMillis() : (ts instanceof Date ? ts.getTime() : new Date(ts).getTime());
  };
  list.sort((a, b) => toMs(b.timestampCierre ?? b.closedAt) - toMs(a.timestampCierre ?? a.closedAt));
  return list;
}

/**
 * Verifica si una cuenta cerrada puede ser reabierta (dentro del límite de 15 min).
 * @param {object} cuenta - Documento cuenta con timestampCierre (Firestore Timestamp o Date)
 * @returns {{ permitido: boolean, mensaje?: string }}
 */
export function puedeReabrirCuenta(cuenta) {
  if (!cuenta || cuenta.estadoCuenta !== 'cerrada') {
    return { permitido: false, mensaje: 'La cuenta no está cerrada o no existe.' };
  }
  if (cuenta.noReapertura) {
    return { permitido: false, mensaje: 'Esta cuenta no permite reapertura (venta directa entregada).' };
  }
  const ts = cuenta.timestampCierre ?? cuenta.closedAt;
  if (!ts) {
    return { permitido: false, mensaje: 'No se encontró fecha de cierre.' };
  }
  const cierreMs = ts.toMillis ? ts.toMillis() : (ts instanceof Date ? ts.getTime() : new Date(ts).getTime());
  const ahoraMs = Date.now();
  if (ahoraMs - cierreMs > LIMITE_REAPERTURA_MS) {
    return {
      permitido: false,
      mensaje: 'La cuenta no puede ser reabierta por superar el tiempo permitido (15 minutos).',
    };
  }
  return { permitido: true };
}

/**
 * Reabre una cuenta cerrada (solo si está dentro del límite de 15 min).
 * Registra en auditoría y opcionalmente notifica al cajero original.
 * @param {object} params
 * @param {string} params.cuentaId
 * @param {string} params.usuarioIdSupervisor - UID del supervisor que reabre
 * @param {string} params.motivoReapertura - Motivo obligatorio
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function reabrirCuenta({ cuentaId, usuarioIdSupervisor, motivoReapertura }) {
  if (!motivoReapertura || !String(motivoReapertura).trim()) {
    return { ok: false, error: 'El motivo de reapertura es obligatorio.' };
  }

  const cuentaRef = doc(db, 'cuentas', cuentaId);
  const cuentaSnap = await getDoc(cuentaRef);
  if (!cuentaSnap.exists()) {
    return { ok: false, error: 'Cuenta no encontrada.' };
  }

  const cuenta = { id: cuentaSnap.id, ...cuentaSnap.data() };
  const validacion = puedeReabrirCuenta(cuenta);
  if (!validacion.permitido) {
    return { ok: false, error: validacion.mensaje };
  }

  const now = new Date();
  const closedByUid = cuenta.closedByUid ?? null;

  const batch = writeBatch(db);

  // Actualizar cuenta: estado abierta, permiteModificar, datos de reapertura
  batch.update(cuentaRef, {
    estadoCuenta: 'abierta',
    permiteModificar: true,
    timestampReapertura: now,
    motivoReapertura: String(motivoReapertura).trim(),
    usuarioIdSupervisor,
    reopenedAt: now,
    updatedAt: now,
  });

  if (cuenta.mesaId) {
    batch.set(
      doc(db, 'mesas', cuenta.mesaId),
      {
        cuentaActivaId: cuentaId,
        estadoMesa: 'ocupada',
        estado: 'ocupada',
        updatedAt: now,
      },
      { merge: true }
    );
  }

  // Registro en auditoría
  const auditoriaRef = doc(collection(db, 'auditoria'));
  batch.set(auditoriaRef, {
    accion: 'reapertura_cuenta',
    cuentaId,
    usuarioId: usuarioIdSupervisor,
    motivoReapertura: String(motivoReapertura).trim(),
    timestampReapertura: now,
    usuarioIdCajeroOriginal: closedByUid,
    createdAt: now,
  });

  // Notificación al cajero original (si existe)
  if (closedByUid) {
    const notifRef = doc(collection(db, 'notificaciones'));
    batch.set(notifRef, {
      tipo: 'cuenta_reabierta',
      userId: closedByUid,
      cuentaId,
      mensaje: `La cuenta ${cuentaId} fue reabierta por un supervisor y queda disponible para revisión.`,
      leido: false,
      createdAt: now,
    });
  }

  await batch.commit();
  return { ok: true };
}

/**
 * Vuelve a cerrar una cuenta que fue reabierta (sin nuevos pagos).
 * Solo aplica si la cuenta está abierta y tiene reopenedAt o permiteModificar.
 * @param {object} params
 * @param {string} params.cuentaId
 * @param {string} params.cerradoPorUid - UID de quien cierra (cajero/supervisor)
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function cerrarCuentaReabierta({ cuentaId, cerradoPorUid }) {
  const cuentaRef = doc(db, 'cuentas', cuentaId);
  const cuentaSnap = await getDoc(cuentaRef);
  if (!cuentaSnap.exists()) {
    return { ok: false, error: 'Cuenta no encontrada.' };
  }

  const cuenta = cuentaSnap.data();
  if (cuenta.estadoCuenta !== 'abierta') {
    return { ok: false, error: 'La cuenta no está abierta.' };
  }
  if (!cuenta.reopenedAt && !cuenta.permiteModificar) {
    return { ok: false, error: 'Esta cuenta no fue reabierta; use el cierre normal por comensales.' };
  }

  const now = new Date();
  await updateDoc(cuentaRef, {
    estadoCuenta: 'cerrada',
    closedAt: now,
    timestampCierre: now,
    closedByUid: cerradoPorUid ?? null,
    updatedAt: now,
  });
  await liberarMesaSiCorresponde({
    mesaId: cuenta.mesaId,
    cuentaId,
    now,
  });
  return { ok: true };
}

// ==================== RESERVAS (PR-006) ====================

const RESERVA_BLOCK_MINUTES = 120;

function timeToMinutes(timeStr) {
  const [h, m] = (timeStr || '0:0').split(':').map(Number);
  return h * 60 + m;
}

function reservationsOverlap(hora1, hora2) {
  return Math.abs(timeToMinutes(hora1) - timeToMinutes(hora2)) < RESERVA_BLOCK_MINUTES;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Public HTTPS URL for email header (Vite build). Example: Firebase Storage getDownloadURL. */
function getBrandLogoUrlForEmail() {
  try {
    const u = import.meta.env?.VITE_BRAND_LOGO_URL;
    return typeof u === 'string' ? u.trim() : '';
  } catch {
    return '';
  }
}

function isHttpsUrl(value) {
  return /^https:\/\//i.test(String(value || '').trim());
}

function formatReadableDate(fecha) {
  const [year, month, day] = String(fecha || '').split('-').map(Number);
  if (!year || !month || !day) return fecha || '';
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${day} de ${months[month - 1]} de ${year}`;
}

function toGoogleDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hour}${minute}${second}`;
}

function buildPublicReservaCode(fecha, reservaId) {
  const compactDate = String(fecha || '').replaceAll('-', '');
  const suffix = String(reservaId || '').slice(-4).toUpperCase();
  return `R-${compactDate}-${suffix}`;
}

function buildGoogleCalendarLink({ fecha, hora, clienteNombre, cantidadPersonas, mesaNumero, observaciones, codigoReserva }) {
  const start = new Date(`${fecha}T${hora}:00`);
  const end = new Date(start.getTime() + RESERVA_BLOCK_MINUTES * 60 * 1000);
  const title = `Reserva en Ceviche del Rey`;
  const mesaTxt = formatMesaLabel(mesaNumero);
  const details = [
    `Cliente: ${clienteNombre}`,
    `Personas: ${cantidadPersonas}`,
    `Mesa: ${mesaTxt}`,
    observaciones ? `Observaciones: ${observaciones}` : null,
    `Codigo de reserva: ${codigoReserva}`,
  ].filter(Boolean).join('\\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${toGoogleDateTime(start)}/${toGoogleDateTime(end)}`,
    details,
    location: `Ceviche del Rey - ${mesaTxt}`,
    ctz: 'America/Costa_Rica',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

async function enqueueReservaEmailConfirmation({
  reservaId,
  codigoReserva,
  clienteNombre,
  clienteEmail,
  fecha,
  hora,
  cantidadPersonas,
  mesaNumero,
  observaciones,
}) {
  if (!clienteEmail) {
    return { queued: false, reason: 'without_email' };
  }

  const fechaLegible = formatReadableDate(fecha);
  const clienteNombreSafe = escapeHtml(clienteNombre);
  const observacionesSafe = escapeHtml(observaciones);
  const googleCalendarLink = buildGoogleCalendarLink({
    fecha,
    hora,
    clienteNombre,
    cantidadPersonas,
    mesaNumero,
    observaciones,
    codigoReserva,
  });
  const googleCalendarLinkEscaped = escapeHtml(googleCalendarLink);
  const mesaEtiqueta = formatMesaLabel(mesaNumero);
  const codigoReservaSafe = escapeHtml(String(codigoReserva || ''));
  const subject = `Reserva confirmada - Ceviche del Rey (${fechaLegible}, ${hora})`;
  const brandLogoRaw = getBrandLogoUrlForEmail();
  const brandLogoEscaped = isHttpsUrl(brandLogoRaw) ? escapeHtml(brandLogoRaw) : '';
  const brandLogoBlock = brandLogoEscaped
    ? `<img src="${brandLogoEscaped}" alt="Ceviche del Rey" width="220" style="max-width: 220px; width: 100%; height: auto; display: block; margin: 0 auto; border: 0; outline: none;" />`
    : `<div style="font-size: 22px; font-weight: 700; color: #7f1d1d; letter-spacing: -0.02em;">Ceviche del Rey</div>`;
  const observacionesBlock = observaciones
    ? `
      <tr>
        <td style="padding: 14px 0; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 15px;">
          <strong style="color: #0f172a;">Observaciones</strong><br />
          <span style="color: #475569; margin-top: 6px; display: inline-block;">${observacionesSafe}</span>
        </td>
      </tr>
    `
    : '';
  const textBody = [
    `Hola ${clienteNombre}, tu reserva fue confirmada.`,
    '',
    `Fecha: ${fechaLegible}`,
    `Hora: ${hora}`,
    `Personas: ${cantidadPersonas}`,
    `Mesa: ${mesaEtiqueta}`,
    observaciones ? `Observaciones: ${observaciones}` : null,
    `Codigo de reserva: ${codigoReserva}`,
    '',
    `Agregar a Google Calendar: ${googleCalendarLink}`,
    '',
    'Gracias por elegir Ceviche del Rey.',
  ].filter(Boolean).join('\n');

  const mailRef = await addDoc(collection(db, 'mail'), {
    to: [clienteEmail],
    reservaId,
    tipo: 'reserva_confirmacion',
    meta: {
      fecha,
      hora,
      mesaNumero,
      codigoReserva,
    },
    message: {
      subject,
      text: textBody,
      html: `
        <div style="margin:0; padding:28px 14px; background:#faf5f5; font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif; color:#0f172a;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(69, 10, 10, 0.1); border: 1px solid #f5e5e5;">
            <tr>
              <td style="padding: 28px 28px 20px; text-align: center; background: #ffffff;">
                ${brandLogoBlock}
              </td>
            </tr>
            <tr>
              <td style="padding: 22px 28px 26px; background: linear-gradient(155deg, #450a0a 0%, #7f1d1d 42%, #991b1b 100%); text-align: center;">
                <p style="margin: 0; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.88);">Confirmacion de reserva</p>
                <h1 style="margin: 10px 0 0; font-size: 26px; line-height: 1.2; color: #ffffff; font-weight: 700;">Reserva confirmada</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 26px 28px 8px; font-size: 16px; line-height: 1.55; color: #334155;">
                Hola <strong style="color:#0f172a;">${clienteNombreSafe}</strong>, tu reserva quedo registrada. Te esperamos.
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 28px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  <tr>
                    <td style="padding: 14px 0; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 15px;"><strong style="color:#0f172a;">Fecha</strong><br /><span style="color:#475569;">${fechaLegible}</span></td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 15px;"><strong style="color:#0f172a;">Hora</strong><br /><span style="color:#475569;">${hora}</span></td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 15px;"><strong style="color:#0f172a;">Personas</strong><br /><span style="color:#475569;">${cantidadPersonas}</span></td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 15px;"><strong style="color:#0f172a;">Mesa</strong><br /><span style="color:#475569;">${mesaEtiqueta}</span></td>
                  </tr>
                  ${observacionesBlock}
                  <tr>
                    <td style="padding: 14px 0; color: #334155; font-size: 15px;"><strong style="color:#0f172a;">Codigo de reserva</strong><br /><span style="font-family: ui-monospace, Consolas, monospace; color:#991b1b; font-weight: 600; letter-spacing: 0.04em;">${codigoReservaSafe}</span></td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 22px 28px 8px;">
                <a href="${googleCalendarLinkEscaped}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(155deg, #b91c1c 0%, #7f1d1d 100%); color: #ffffff; text-decoration: none; padding: 13px 22px; border-radius: 999px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 14px rgba(127, 29, 29, 0.45);">
                  Agregar a Google Calendar
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 28px 22px; font-size: 12px; line-height: 1.5; color: #64748b;">
                Si el boton no abre, copie este enlace en el navegador:<br />
                <a href="${googleCalendarLinkEscaped}" target="_blank" rel="noopener noreferrer" style="color:#991b1b; word-break: break-all;">${googleCalendarLinkEscaped}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 28px 28px; font-size: 13px; color: #64748b; border-top: 1px solid #fce8e8;">
                <p style="margin: 20px 0 0;">Gracias por elegir <strong style="color:#7f1d1d;">Ceviche del Rey</strong>.</p>
              </td>
            </tr>
          </table>
        </div>
      `,
    },
  });

  return { queued: true, mailId: mailRef.id };
}

/**
 * Encola un email de solicitud de reserva (portal web).
 * Usa el mismo diseño y logo que el email de confirmacion del POS,
 * pero indica estado "En espera de confirmacion" en lugar de "Reserva confirmada".
 */
export async function enqueueReservaSolicitudEmail({
  reservaId,
  clienteNombre,
  clienteEmail,
  fecha,
  hora,
  cantidadPersonas,
  observaciones,
}) {
  if (!clienteEmail) return { queued: false, reason: 'without_email' };

  const fechaLegible = formatReadableDate(fecha);
  const clienteNombreSafe = escapeHtml(clienteNombre);
  const observacionesSafe = escapeHtml(observaciones);
  const brandLogoRaw = getBrandLogoUrlForEmail();
  const brandLogoEscaped = isHttpsUrl(brandLogoRaw) ? escapeHtml(brandLogoRaw) : '';
  const brandLogoBlock = brandLogoEscaped
    ? `<img src="${brandLogoEscaped}" alt="Ceviche del Rey" width="220" style="max-width: 220px; width: 100%; height: auto; display: block; margin: 0 auto; border: 0; outline: none;" />`
    : `<div style="font-size: 22px; font-weight: 700; color: #7f1d1d; letter-spacing: -0.02em;">Ceviche del Rey</div>`;
  const observacionesBlock = observaciones
    ? `
      <tr>
        <td style="padding: 14px 0; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 15px;">
          <strong style="color: #0f172a;">Observaciones</strong><br />
          <span style="color: #475569; margin-top: 6px; display: inline-block;">${observacionesSafe}</span>
        </td>
      </tr>
    `
    : '';

  const subject = `Solicitud de reserva recibida - Ceviche del Rey (${fechaLegible}, ${hora})`;
  const textBody = [
    `Hola ${clienteNombre}, hemos recibido tu solicitud de reserva.`,
    '',
    `Fecha: ${fechaLegible}`,
    `Hora: ${hora}`,
    `Personas: ${cantidadPersonas}`,
    observaciones ? `Observaciones: ${observaciones}` : null,
    '',
    'Estado: En espera de confirmacion',
    '',
    'Nuestro equipo revisara la disponibilidad y te contactara para confirmar.',
    '',
    'Gracias por elegir Ceviche del Rey.',
  ].filter(Boolean).join('\n');

  const mailRef = await addDoc(collection(db, 'mail'), {
    to: [clienteEmail],
    reservaId,
    tipo: 'reserva_solicitud_portal',
    meta: { fecha, hora, cantidadPersonas, origen: 'portal' },
    message: {
      subject,
      text: textBody,
      html: `
        <div style="margin:0; padding:28px 14px; background:#faf5f5; font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif; color:#0f172a;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(69, 10, 10, 0.1); border: 1px solid #f5e5e5;">
            <tr>
              <td style="padding: 28px 28px 20px; text-align: center; background: #ffffff;">
                ${brandLogoBlock}
              </td>
            </tr>
            <tr>
              <td style="padding: 22px 28px 26px; background: linear-gradient(155deg, #450a0a 0%, #7f1d1d 42%, #991b1b 100%); text-align: center;">
                <p style="margin: 0; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.88);">Solicitud de reserva</p>
                <h1 style="margin: 10px 0 0; font-size: 26px; line-height: 1.2; color: #ffffff; font-weight: 700;">En espera de confirmacion</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 26px 28px 8px; font-size: 16px; line-height: 1.55; color: #334155;">
                Hola <strong style="color:#0f172a;">${clienteNombreSafe}</strong>, hemos recibido tu solicitud. Nuestro equipo la revisara y te contactara para confirmar.
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 28px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  <tr>
                    <td style="padding: 14px 0; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 15px;"><strong style="color:#0f172a;">Fecha</strong><br /><span style="color:#475569;">${fechaLegible}</span></td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 15px;"><strong style="color:#0f172a;">Hora</strong><br /><span style="color:#475569;">${hora}</span></td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; ${observaciones ? 'border-bottom: 1px solid #e2e8f0;' : ''} color: #334155; font-size: 15px;"><strong style="color:#0f172a;">Personas</strong><br /><span style="color:#475569;">${cantidadPersonas}</span></td>
                  </tr>
                  ${observacionesBlock}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 18px 28px 8px;">
                <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 16px; text-align: center; color: #b45309; font-size: 14px; font-weight: 700; letter-spacing: 0.03em;">
                  ESTADO: PENDIENTE DE CONFIRMACION
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 28px 22px; font-size: 14px; color: #475569;">
                Nuestro equipo revisara la disponibilidad y te confirmara por este medio.
              </td>
            </tr>
            <tr>
              <td style="padding: 0 28px 28px; font-size: 13px; color: #64748b; border-top: 1px solid #fce8e8;">
                <p style="margin: 20px 0 0;">Gracias por elegir <strong style="color:#7f1d1d;">Ceviche del Rey</strong>.</p>
              </td>
            </tr>
          </table>
        </div>
      `,
    },
  });

  return { queued: true, mailId: mailRef.id };
}

/**
 * Confirma una reserva del portal web (pendiente -> confirmada).
 * Opcionalmente asigna mesa. Envía el email de confirmacion standard.
 */
export async function confirmarReservaPortal({
  reservaId,
  mesaId,
  mesaNumero,
  adminUid,
}) {
  if (!reservaId) throw new Error('ID de reserva requerido.');

  const reservaRef = doc(db, 'reservas', reservaId);
  const snap = await getDoc(reservaRef);
  if (!snap.exists()) throw new Error('Reserva no encontrada.');

  const data = snap.data();
  if (data.estado === 'confirmada') throw new Error('La reserva ya esta confirmada.');
  if (data.estado === 'cancelada') throw new Error('No se puede confirmar una reserva cancelada.');

  const codigoPublico = buildPublicReservaCode(data.fecha, reservaId);
  const now = new Date();

  const updatePayload = {
    estado: 'confirmada',
    codigoPublico,
    confirmadoPor: adminUid || null,
    confirmadaAt: now,
    updatedAt: now,
  };
  if (mesaId) updatePayload.mesaId = mesaId;
  if (mesaNumero != null) updatePayload.mesaNumero = Number(mesaNumero);

  await updateDoc(reservaRef, updatePayload);

  const emailNorm = (data.clienteEmail || '').trim().toLowerCase();
  let emailQueueId = null;
  if (emailNorm) {
    try {
      const queueResult = await enqueueReservaEmailConfirmation({
        reservaId,
        codigoReserva: codigoPublico,
        clienteNombre: data.clienteNombre,
        clienteEmail: emailNorm,
        fecha: data.fecha,
        hora: data.hora,
        cantidadPersonas: data.cantidadPersonas,
        mesaNumero: mesaNumero != null ? Number(mesaNumero) : data.mesaNumero,
        observaciones: data.observaciones || '',
      });
      emailQueueId = queueResult.mailId || null;
      await updateDoc(reservaRef, { estadoEmail: 'en_cola', emailQueueId, updatedAt: now });
    } catch (_) {
      await updateDoc(reservaRef, { estadoEmail: 'error_cola', updatedAt: now });
    }
  }

  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'reserva_confirmada_portal',
      reservaId,
      codigoReserva: codigoPublico,
      clienteNombre: data.clienteNombre,
      clienteEmail: emailNorm || null,
      fecha: data.fecha,
      hora: data.hora,
      mesaNumero: mesaNumero != null ? Number(mesaNumero) : null,
      cantidadPersonas: data.cantidadPersonas,
      uid: adminUid || null,
      timestamp: now,
    });
  } catch (_) {}

  return { codigoPublico, emailQueueId };
}

export async function getReservasByDate(fecha) {
  const q = query(collection(db, 'reservas'), where('fecha', '==', fecha));
  const snap = await getDocs(q);
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  return list;
}

export async function getReservasByDateRange(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return [];
  const q = query(
    collection(db, 'reservas'),
    where('fecha', '>=', fechaInicio),
    where('fecha', '<=', fechaFin)
  );
  const snap = await getDocs(q);
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const dateCmp = (a.fecha || '').localeCompare(b.fecha || '');
    if (dateCmp !== 0) return dateCmp;
    return (a.hora || '').localeCompare(b.hora || '');
  });
  return list;
}

export async function getReservaEmailDeliveryMap(mailIds = []) {
  const uniqueIds = [...new Set((mailIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  const results = await Promise.all(
    uniqueIds.map(async (mailId) => {
      try {
        const snap = await getDoc(doc(db, 'mail', mailId));
        if (!snap.exists()) return [mailId, null];
        const data = snap.data() || {};
        return [mailId, data?.delivery?.state || null];
      } catch (_) {
        return [mailId, null];
      }
    })
  );

  return Object.fromEntries(results);
}

export async function getMesasDisponiblesParaReserva(fecha, hora, cantidadPersonas) {
  const mesas = await getMesasOrThrow();
  const reservas = await getReservasByDate(fecha);
  const activas = reservas.filter(r => r.estado !== 'cancelada');
  return mesas
    .filter(m => m.capacidad >= cantidadPersonas)
    .filter(m => !activas.some(r => r.mesaId === m.id && reservationsOverlap(r.hora, hora)))
    .sort((a, b) => a.numero - b.numero);
}

export async function checkReservaDuplicada(clienteNombre, fecha, hora) {
  const reservas = await getReservasByDate(fecha);
  const norm = clienteNombre.trim().toLowerCase();
  return reservas.find(r =>
    r.estado !== 'cancelada' &&
    (r.clienteNombre || '').trim().toLowerCase() === norm &&
    reservationsOverlap(r.hora, hora)
  ) || null;
}

export async function getReservasByClienteUid(clienteUid) {
  if (!clienteUid) return [];
  const q = query(
    collection(db, 'reservas'),
    where('clienteUid', '==', clienteUid)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Obtiene todas las solicitudes de reserva pendientes del portal web.
 * Las reservas del portal tienen estado 'pendiente' (las del admin son directamente 'confirmada').
 */
export async function getSolicitudesPortal() {
  const q = query(
    collection(db, 'reservas'),
    where('estado', '==', 'pendiente')
  );
  const snap = await getDocs(q);
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const dateCmp = (a.fecha || '').localeCompare(b.fecha || '');
    if (dateCmp !== 0) return dateCmp;
    return (a.hora || '').localeCompare(b.hora || '');
  });
  return list;
}

export async function createReserva({
  clienteNombre,
  clienteTelefono,
  clienteEmail,
  fecha,
  hora,
  cantidadPersonas,
  mesaId,
  mesaNumero,
  observaciones,
  adminUid,
}) {
  if (!clienteNombre?.trim()) throw new Error('El nombre del cliente es obligatorio.');
  if (!fecha) throw new Error('La fecha es obligatoria.');
  if (!hora) throw new Error('La hora es obligatoria.');
  if (!cantidadPersonas || cantidadPersonas < 1) throw new Error('La cantidad de personas debe ser al menos 1.');
  if (!mesaId) throw new Error('Debe seleccionar una mesa.');
  const emailNorm = (clienteEmail || '').trim().toLowerCase();
  if (emailNorm && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
    throw new Error('El correo no tiene un formato valido.');
  }

  const now = new Date();
  const docRef = await addDoc(collection(db, 'reservas'), {
    clienteNombre: clienteNombre.trim(),
    clienteTelefono: clienteTelefono?.trim() || '',
    clienteEmail: emailNorm,
    fecha,
    hora,
    cantidadPersonas: Number(cantidadPersonas),
    mesaId,
    mesaNumero: Number(mesaNumero),
    observaciones: observaciones?.trim() || '',
    estado: 'confirmada',
    estadoEmail: emailNorm ? 'pendiente' : 'sin_correo',
    creadoPor: adminUid || null,
    createdAt: now,
    updatedAt: now,
  });
  const codigoPublico = buildPublicReservaCode(fecha, docRef.id);

  if (emailNorm) {
    try {
      const queueResult = await enqueueReservaEmailConfirmation({
        reservaId: docRef.id,
        codigoReserva: codigoPublico,
        clienteNombre: clienteNombre.trim(),
        clienteEmail: emailNorm,
        fecha,
        hora,
        cantidadPersonas: Number(cantidadPersonas),
        mesaNumero: Number(mesaNumero),
        observaciones: observaciones?.trim() || '',
      });
      await updateDoc(docRef, {
        codigoPublico,
        estadoEmail: 'en_cola',
        emailQueueId: queueResult.mailId || null,
        updatedAt: new Date(),
      });
    } catch (_) {
      await updateDoc(docRef, {
        codigoPublico,
        estadoEmail: 'error_cola',
        emailQueueId: null,
        updatedAt: new Date(),
      });
    }
  } else {
    await updateDoc(docRef, {
      codigoPublico,
      updatedAt: new Date(),
    });
  }

  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'reserva_creada',
      reservaId: docRef.id,
      codigoReserva: codigoPublico,
      clienteNombre: clienteNombre.trim(),
      clienteEmail: emailNorm || null,
      fecha, hora,
      mesaNumero: Number(mesaNumero),
      cantidadPersonas: Number(cantidadPersonas),
      uid: adminUid || null,
      timestamp: now,
    });
  } catch (_) {}

  return docRef.id;
}

export async function cancelarReserva(reservaId, adminUid) {
  const reservaRef = doc(db, 'reservas', reservaId);
  const snap = await getDoc(reservaRef);
  if (!snap.exists()) throw new Error('Reserva no encontrada.');

  const data = snap.data();
  if (data.estado === 'cancelada') throw new Error('La reserva ya esta cancelada.');
  if (data.estado === 'completada') throw new Error('No se puede cancelar una reserva completada.');

  const now = new Date();
  await updateDoc(reservaRef, { estado: 'cancelada', updatedAt: now });

  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'reserva_cancelada',
      reservaId,
      clienteNombre: data.clienteNombre,
      fecha: data.fecha, hora: data.hora,
      mesaNumero: data.mesaNumero,
      uid: adminUid || null,
      timestamp: now,
    });
  } catch (_) {}
}

export async function completarReserva(reservaId, adminUid) {
  const reservaRef = doc(db, 'reservas', reservaId);
  const snap = await getDoc(reservaRef);
  if (!snap.exists()) throw new Error('Reserva no encontrada.');

  const data = snap.data();
  if (data.estado === 'completada') throw new Error('La reserva ya fue completada.');
  if (data.estado === 'cancelada') throw new Error('No se puede completar una reserva cancelada.');

  const now = new Date();
  await updateDoc(reservaRef, { estado: 'completada', updatedAt: now });

  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo: 'reserva_completada',
      reservaId,
      clienteNombre: data.clienteNombre,
      fecha: data.fecha, hora: data.hora,
      mesaNumero: data.mesaNumero,
      uid: adminUid || null,
      timestamp: now,
    });
  } catch (_) {}
}

/**
 * Sugiere horarios alternativos cuando no hay mesas disponibles.
 * Devuelve hasta 5 horarios cercanos al solicitado con mesas libres.
 */
// ==================== CLIENTES (Admin) ====================

export async function getClientes() {
  const snap = await getDocs(query(collection(db, 'clientes'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateClienteAdmin(uid, { nombre, telefono }) {
  await updateDoc(doc(db, 'clientes', uid), {
    nombre,
    telefono: telefono || '',
    updatedAt: serverTimestamp(),
  });
}

export async function desactivarClienteAdmin(uid) {
  await updateDoc(doc(db, 'clientes', uid), {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function reactivarClienteAdmin(uid) {
  await updateDoc(doc(db, 'clientes', uid), {
    deletedAt: deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function getReservasByClienteUidAdmin(clienteUid) {
  const snap = await getDocs(
    query(collection(db, 'reservas'), where('clienteUid', '==', clienteUid))
  );
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return docs.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
}

export async function getAlternativasReserva(fecha, hora, cantidadPersonas) {
  const mesas = await getMesasOrThrow();
  const reservas = await getReservasByDate(fecha);
  const activas = reservas.filter(r => r.estado !== 'cancelada');

  const horarios = [
    '11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00',
    '18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30',
  ];

  const resultado = [];
  for (const h of horarios) {
    if (reservationsOverlap(h, hora)) continue;
    const mesasDisp = mesas.filter(m => {
      if (m.capacidad < cantidadPersonas) return false;
      return !activas.some(r => r.mesaId === m.id && reservationsOverlap(r.hora, h));
    });
    if (mesasDisp.length > 0) {
      resultado.push({ hora: h, mesasDisponibles: mesasDisp.length });
    }
  }

  const reqMin = timeToMinutes(hora);
  resultado.sort((a, b) => Math.abs(timeToMinutes(a.hora) - reqMin) - Math.abs(timeToMinutes(b.hora) - reqMin));
  return resultado.slice(0, 5);
}
