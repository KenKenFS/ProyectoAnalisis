import { auth, db } from '@shared/firebase/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  deleteUser,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  collection,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { enqueueReservaSolicitudEmail } from '@shared/firebase/firestore'

// ==================== REGISTRO ====================

export async function registerCliente({ nombre, email, telefono, password }) {
  if (!email || !password || !nombre) {
    throw new Error('Todos los campos obligatorios deben estar completos.')
  }
  if (password.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres.')
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('La contraseña debe incluir al menos una mayuscula.')
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('La contraseña debe incluir al menos un numero.')
  }

  const dupeQuery = query(collection(db, 'clientes'), where('email', '==', email))
  const dupeSnap = await getDocs(dupeQuery)
  if (!dupeSnap.empty) {
    throw new Error('Ya existe un cliente registrado con ese correo.')
  }

  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  const user = userCredential.user

  await setDoc(doc(db, 'clientes', user.uid), {
    uid: user.uid,
    email: user.email,
    nombre,
    telefono: telefono || '',
    provider: 'email',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return user
}

// ==================== LOGIN ====================

export async function loginCliente(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  const user = userCredential.user

  const clienteDoc = await getDoc(doc(db, 'clientes', user.uid))
  if (!clienteDoc.exists()) {
    await signOut(auth)
    throw new Error('No se encontro perfil de cliente. Registrate primero.')
  }

  const data = clienteDoc.data()
  if (data.deletedAt) {
    await signOut(auth)
    throw new Error('Esta cuenta ha sido eliminada.')
  }

  return user
}

export async function loginClienteGoogle() {
  const provider = new GoogleAuthProvider()
  const userCredential = await signInWithPopup(auth, provider)
  const user = userCredential.user

  const clienteRef = doc(db, 'clientes', user.uid)
  const clienteDoc = await getDoc(clienteRef)

  if (!clienteDoc.exists()) {
    await setDoc(clienteRef, {
      uid: user.uid,
      email: user.email,
      nombre: user.displayName || user.email.split('@')[0],
      telefono: user.phoneNumber || '',
      photoURL: user.photoURL || '',
      provider: 'google',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } else {
    const data = clienteDoc.data()
    if (data.deletedAt) {
      await signOut(auth)
      throw new Error('Esta cuenta ha sido eliminada.')
    }
    await updateDoc(clienteRef, {
      photoURL: user.photoURL || data.photoURL || '',
      updatedAt: serverTimestamp(),
    })
  }

  return user
}

// ==================== CLIENTE CRUD ====================

export async function getClienteByUid(uid) {
  if (!uid) throw new Error('UID requerido')
  const snap = await getDoc(doc(db, 'clientes', uid))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function updateCliente(uid, updates) {
  if (!uid) throw new Error('UID requerido')
  const allowed = ['nombre', 'telefono']
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  )
  await updateDoc(doc(db, 'clientes', uid), {
    ...filtered,
    updatedAt: serverTimestamp(),
  })
}

export async function reauthenticateAndChangePassword(email, currentPassword, newPassword) {
  if (!email || !currentPassword || !newPassword) {
    throw new Error('Todos los campos son obligatorios')
  }
  if (newPassword.length < 8) {
    throw new Error('La nueva contraseña debe tener al menos 8 caracteres')
  }

  const user = auth.currentUser
  if (!user) throw new Error('No hay usuario autenticado')

  const credential = EmailAuthProvider.credential(email, currentPassword)
  await reauthenticateWithCredential(user, credential)
  await updatePassword(user, newPassword)
}

export async function deleteClienteAccount(uid) {
  if (!uid) throw new Error('UID requerido')
  
  const user = auth.currentUser
  if (!user || user.uid !== uid) {
    throw new Error('Debes estar autenticado para eliminar tu cuenta')
  }

  const cancelables = query(
    collection(db, 'reservas'),
    where('clienteUid', '==', uid),
    where('estado', 'in', ['pendiente', 'confirmada'])
  )
  const snap = await getDocs(cancelables)
  const batchUpdates = snap.docs.map(d => 
    updateDoc(d.ref, { estado: 'cancelada', canceladaPor: 'cliente', canceladaAt: serverTimestamp() })
  )
  await Promise.all(batchUpdates)

  await updateDoc(doc(db, 'clientes', uid), { deletedAt: serverTimestamp() })
  await deleteUser(user)
}

// ==================== RESERVAS ====================

export async function createReservaCliente({
  fecha,
  hora,
  cantidadPersonas,
  clienteNombre,
  clienteEmail,
  clienteTelefono,
  observaciones,
  clienteUid,
}) {
  if (!fecha || !hora || !clienteNombre || !clienteEmail || !clienteTelefono) {
    throw new Error('Faltan campos obligatorios')
  }

  // Verificar duplicados solo si hay sesion activa (invitados no pueden leer reservas)
  if (auth.currentUser) {
    try {
      const dupeQuery = query(
        collection(db, 'reservas'),
        where('clienteEmail', '==', clienteEmail),
        where('fecha', '==', fecha),
        where('hora', '==', hora),
        where('estado', 'in', ['pendiente', 'confirmada'])
      )
      const dupeSnap = await getDocs(dupeQuery)
      if (!dupeSnap.empty) {
        throw new Error('Ya tienes una reserva activa para esta fecha y hora')
      }
    } catch (e) {
      if (e.message.includes('reserva activa')) throw e
      // Si falla por permisos, continuar
    }
  }

  const reserva = {
    fecha,
    hora,
    cantidadPersonas,
    clienteNombre,
    clienteEmail,
    clienteTelefono,
    observaciones: observaciones || '',
    clienteUid: clienteUid || null,
    estado: 'pendiente',
    createdAt: serverTimestamp(),
  }

  const docRef = await addDoc(collection(db, 'reservas'), reserva)
  const reservaId = docRef.id

  // Enviar email con el mismo diseño del sistema POS (logo del restaurante incluido)
  if (clienteEmail) {
    try {
      await enqueueReservaSolicitudEmail({
        reservaId,
        clienteNombre,
        clienteEmail,
        fecha,
        hora,
        cantidadPersonas,
        observaciones: observaciones || '',
      })
    } catch (_) {}
  }

  return reservaId
}

export async function cancelarReservaCliente(reservaId, clienteUid) {
  if (!reservaId) throw new Error('ID de reserva requerido')

  const reservaRef = doc(db, 'reservas', reservaId)
  const reservaSnap = await getDoc(reservaRef)

  if (!reservaSnap.exists()) throw new Error('Reserva no encontrada')
  
  const data = reservaSnap.data()
  if (data.clienteUid && data.clienteUid !== clienteUid) {
    throw new Error('No tienes permiso para cancelar esta reserva')
  }

  const estadosCancelables = ['pendiente', 'confirmada']
  if (!estadosCancelables.includes(data.estado?.toLowerCase())) {
    throw new Error('Esta reserva ya no puede ser cancelada')
  }

  await updateDoc(reservaRef, {
    estado: 'cancelada',
    canceladaPor: 'cliente',
    canceladaAt: serverTimestamp(),
  })
}
