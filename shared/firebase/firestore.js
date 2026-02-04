import { db } from './firebase';
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
} from 'firebase/firestore';

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
 * Crea un nuevo item de inventario
 * @param {object} itemData - Datos del item
 * @returns {Promise<string>} ID del item
 */
export async function createInventarioItem(itemData) {
  try {
    const docRef = await addDoc(collection(db, 'inventario'), {
      ...itemData,
      cantidad: itemData.cantidad || 0,
      minCantidad: itemData.minCantidad || 10,
      createdAt: new Date(),
    });
    console.log('✅ Item de inventario creado:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error al crear item de inventario:', error.message);
    throw error;
  }
}

/**
 * Obtiene todos los items del inventario
 * @returns {Promise<array>}
 */
export async function getInventarioItems() {
  try {
    const snapshot = await getDocs(collection(db, 'inventario'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('❌ Error al obtener inventario:', error.message);
    return [];
  }
}

/**
 * Actualiza la cantidad de un item del inventario
 * @param {string} itemId - ID del item
 * @param {number} cantidadAjuste - Cantidad a añadir/restar
 */
export async function updateInventarioCantidad(itemId, cantidadAjuste) {
  try {
    const itemRef = doc(db, 'inventario', itemId);
    const itemDoc = await getDoc(itemRef);
    if (itemDoc.exists()) {
      const nuevaCantidad = (itemDoc.data().cantidad || 0) + cantidadAjuste;
      await updateDoc(itemRef, {
        cantidad: nuevaCantidad,
        updatedAt: new Date(),
      });
      console.log('✅ Inventario actualizado:', itemId);
    }
  } catch (error) {
    console.error('❌ Error al actualizar inventario:', error.message);
    throw error;
  }
}

// ==================== PRODUCTOS ====================

/**
 * Crea un nuevo producto (menu item)
 * @param {object} productoData - Datos del producto
 * @returns {Promise<string>} ID del producto
 */
export async function createProducto(productoData) {
  try {
    const docRef = await addDoc(collection(db, 'productos'), {
      ...productoData,
      precio: productoData.precio || 0,
      disponible: productoData.disponible !== false,
      createdAt: new Date(),
    });
    console.log('✅ Producto creado:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error al crear producto:', error.message);
    throw error;
  }
}

/**
 * Obtiene todos los productos
 * @returns {Promise<array>}
 */
export async function getProductos() {
  try {
    const snapshot = await getDocs(collection(db, 'productos'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('❌ Error al obtener productos:', error.message);
    return [];
  }
}

/**
 * Obtiene productos por categoría
 * @param {string} categoria - Nombre de la categoría
 * @returns {Promise<array>}
 */
export async function getProductosByCategoria(categoria) {
  try {
    const q = query(collection(db, 'productos'), where('categoria', '==', categoria));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('❌ Error al obtener productos por categoría:', error.message);
    return [];
  }
}

/**
 * Actualiza un producto
 * @param {string} productoId - ID del producto
 * @param {object} updates - Datos a actualizar
 */
export async function updateProducto(productoId, updates) {
  try {
    await updateDoc(doc(db, 'productos', productoId), {
      ...updates,
      updatedAt: new Date(),
    });
    console.log('✅ Producto actualizado:', productoId);
  } catch (error) {
    console.error('❌ Error al actualizar producto:', error.message);
    throw error;
  }
}

// ==================== MESAS ====================

/**
 * Crea una nueva mesa
 * @param {object} mesaData - Datos de la mesa
 * @returns {Promise<string>} ID de la mesa
 */
export async function createMesa(mesaData) {
  try {
    const docRef = await addDoc(collection(db, 'mesas'), {
      ...mesaData,
      estado: mesaData.estado || 'disponible',
      createdAt: new Date(),
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
      estado: estado,
      updatedAt: new Date(),
    });
    console.log('✅ Mesa actualizada:', mesaId);
  } catch (error) {
    console.error('❌ Error al actualizar mesa:', error.message);
    throw error;
  }
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

export async function getCuentaItems(cuentaId) {
  const snapshot = await getDocs(collection(db, 'cuentas', cuentaId, 'items'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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
    createdByUid,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return docRef.id;
}

/**
 * Elimina un ítem de la cuenta. Solo ítems pendientes (no pagados).
 * @param {string} cuentaId
 * @param {string} itemId
 */
export async function deleteCuentaItem({ cuentaId, itemId }) {
  const itemSnap = await getDoc(doc(db, 'cuentas', cuentaId, 'items', itemId));
  if (!itemSnap.exists()) {
    const err = new Error('Ítem no encontrado');
    err.code = 'ITEM_NOT_FOUND';
    throw err;
  }
  if (itemSnap.data().estadoItem === 'pagado') {
    const err = new Error('No se puede eliminar un ítem ya pagado.');
    err.code = 'ITEM_ALREADY_PAID';
    throw err;
  }
  await deleteDoc(doc(db, 'cuentas', cuentaId, 'items', itemId));
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
}) {
  const allowed = ['efectivo', 'tarjeta', 'mixto'];
  if (!allowed.includes(metodo)) {
    const err = new Error('Método de pago inválido');
    err.code = 'INVALID_METHOD';
    throw err;
  }

  const unassigned = await getCuentaUnassignedPendingItems(cuentaId);
  if (unassigned.length > 0) {
    const err = new Error('Hay ítems sin asignar. Asigna primero para poder cerrar parcialmente.');
    err.code = 'UNASSIGNED_ITEMS';
    err.unassignedItemIds = unassigned.map(i => i.id);
    throw err;
  }

  // Leemos por comensal y filtramos en cliente para evitar índices compuestos
  const items = (await getCuentaItemsByComensal(cuentaId, comensalId)).filter(i => i.estadoItem === 'pendiente');

  if (items.length === 0) {
    const err = new Error('El comensal no tiene ítems pendientes.');
    err.code = 'NO_PENDING_ITEMS';
    throw err;
  }

  const subtotal = Math.round(
    items.reduce((s, i) => s + (Number(i.precioUnitSnapshot || 0) * Number(i.cantidad || 1)), 0)
  );
  const impuesto = Math.round(subtotal * Number(impuestoRate || 0));
  const total = subtotal + impuesto;

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
      montoImpuesto: impuesto,
      montoTotal: total,
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

  let cuentaCerrada = false;

  // Liberar comensal si no quedan pendientes
  const pendingAfter = (await getCuentaItemsByComensal(cuentaId, comensalId)).filter(i => i.estadoItem === 'pendiente');
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
      cuentaCerrada = true;
    }
  }

  return { pagoId, itemIds: items.map(i => i.id), subtotal, impuesto, total, cuentaCerrada };
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
  return { ok: true };
}
