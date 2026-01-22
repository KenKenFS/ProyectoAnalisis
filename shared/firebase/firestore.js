import { db } from './firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
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
    const snapshot = await getDocs(collection(db, 'mesas'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('❌ Error al obtener mesas:', error.message);
    return [];
  }
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
