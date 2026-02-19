import { auth, secondaryAuth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, addDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export const VALID_ROLES = ['Admin', 'Cajero', 'Mesero', 'Cocina'];

export async function registerUserWithRole(email, password, role, additionalData = {}) {
  if (!email || !password || !role || !additionalData.name) {
    throw new Error('Todos los campos obligatorios deben estar completos.');
  }

  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Rol no valido. Los roles permitidos son: ${VALID_ROLES.join(', ')}`);
  }

  if (password.length < 8) {
    throw new Error('La contrasena debe tener al menos 8 caracteres.');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('La contrasena debe incluir al menos una letra mayuscula.');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('La contrasena debe incluir al menos un numero.');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error('La contrasena debe incluir al menos un caracter especial.');
  }

  const dupeQuery = query(collection(db, 'users'), where('email', '==', email));
  const dupeSnap = await getDocs(dupeQuery);
  if (!dupeSnap.empty) {
    throw new Error('Ya existe un usuario registrado con ese correo electronico.');
  }

  const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const user = userCredential.user;

  await signOut(secondaryAuth);

  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    role,
    name: additionalData.name,
    phone: additionalData.phone || '',
    status: 'active',
    createdAt: new Date(),
  });

  return user;
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (userDoc.exists()) {
    const status = (userDoc.data().status || '').toLowerCase();
    if (status !== 'active' && status !== 'activo') {
      await signOut(auth);
      const err = new Error('Cuenta inactiva. Contacta al administrador.');
      err.code = 'ACCOUNT_INACTIVE';
      throw err;
    }
  }

  return user;
}

export async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || '',
        role: 'Admin',
        status: 'Activo',
        loginMethod: 'Google',
        createdAt: new Date(),
      });
      await new Promise(resolve => setTimeout(resolve, 200));
    } else {
      const status = (userDoc.data().status || '').toLowerCase();
      if (status !== 'active' && status !== 'activo') {
        await signOut(auth);
        const err = new Error('Cuenta inactiva. Contacta al administrador.');
        err.code = 'ACCOUNT_INACTIVE';
        throw err;
      }
      await setDoc(userDocRef, { lastLogin: new Date() }, { merge: true });
    }
    return user;
  } catch (error) {
    console.error('Error Google Sign-In:', error.message);
    throw error;
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error al desconectarse:', error.message);
    throw error;
  }
}

export async function getUserRole(uid) {
  try {
    let userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists() && userDoc.data().role) return userDoc.data().role;
    
    await new Promise(resolve => setTimeout(resolve, 200));
    userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? userDoc.data().role : null;
  } catch (error) {
    console.error('Error getting role:', error.message);
    return null;
  }
}

export async function getUserData(uid) {
  try {
    let userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) return userDoc.data();
    
    await new Promise(resolve => setTimeout(resolve, 200));
    userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    console.error('Error getting user data:', error.message);
    return null;
  }
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function getUsersByRole(role) {
  try {
    const q = query(collection(db, 'users'), where('role', '==', role));
    const querySnapshot = await getDocs(q);
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push(doc.data());
    });
    return users;
  } catch (error) {
    console.error('Error al obtener usuarios por rol:', error.message);
    return [];
  }
}

export async function updateUserProfile(uid, updates) {
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, updates, { merge: true });
  } catch (error) {
    console.error('Error al actualizar perfil:', error.message);
    throw error;
  }
}

export async function updateUserRole(targetUid, newRole, adminUid) {
  if (!VALID_ROLES.includes(newRole)) {
    throw new Error(`El rol seleccionado no es valido. Los roles permitidos son: ${VALID_ROLES.join(', ')}`)
  }

  const userRef = doc(db, 'users', targetUid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error('El usuario no existe.');
  }

  const previousRole = userSnap.data().role;
  if (previousRole === newRole) {
    throw new Error('El usuario ya tiene ese rol asignado.');
  }

  await setDoc(userRef, {
    role: newRole,
    updatedAt: new Date(),
  }, { merge: true });

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'cambio_rol',
    targetUid,
    targetEmail: userSnap.data().email || '',
    targetName: userSnap.data().name || '',
    rolAnterior: previousRole,
    rolNuevo: newRole,
    adminUid,
    timestamp: new Date(),
  });

  return { previousRole, newRole };
}

export async function updateUserData(targetUid, updates, adminUid) {
  if (!updates.name?.trim()) {
    throw new Error('El nombre es obligatorio.');
  }

  const userRef = doc(db, 'users', targetUid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error('El usuario no existe.');
  }

  const prev = userSnap.data();
  const changes = {};
  const fields = ['name', 'phone'];
  for (const f of fields) {
    if (updates[f] !== undefined && updates[f] !== prev[f]) {
      changes[f] = { antes: prev[f] || '', despues: updates[f] };
    }
  }

  if (Object.keys(changes).length === 0) {
    throw new Error('No se detectaron cambios.');
  }

  const dataToUpdate = { updatedAt: new Date() };
  for (const f of Object.keys(changes)) {
    dataToUpdate[f] = updates[f];
  }

  await setDoc(userRef, dataToUpdate, { merge: true });

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'modificacion_usuario',
    targetUid,
    targetEmail: prev.email || '',
    targetName: prev.name || '',
    cambios: changes,
    adminUid,
    timestamp: new Date(),
  });

  return changes;
}

export async function sendUserPasswordReset(email) {
  if (!email) throw new Error('Email requerido.');
  await sendPasswordResetEmail(auth, email);
}

export async function deactivateUser(targetUid, motivo, adminUid) {
  if (!motivo?.trim()) throw new Error('Debe ingresar un motivo valido.');
  if (motivo.trim().length > 200) throw new Error('El motivo no puede superar los 200 caracteres.');
  if (targetUid === adminUid) throw new Error('No puede desactivar su propia cuenta.');

  const userRef = doc(db, 'users', targetUid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('El usuario no existe.');

  const prev = userSnap.data();
  const statusNorm = (prev.status || '').toLowerCase();
  if (statusNorm === 'inactive' || statusNorm === 'inactivo') {
    throw new Error('El usuario ya esta inactivo.');
  }

  await setDoc(userRef, {
    status: 'inactive',
    updatedAt: new Date(),
  }, { merge: true });

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'desactivacion_usuario',
    targetUid,
    targetEmail: prev.email || '',
    targetName: prev.name || '',
    motivo: motivo.trim(),
    estadoAnterior: prev.status,
    adminUid,
    timestamp: new Date(),
  });
}

export async function reactivateUser(targetUid, motivo, adminUid) {
  if (!motivo?.trim()) throw new Error('Debe ingresar un motivo valido.');
  if (motivo.trim().length > 200) throw new Error('El motivo no puede superar los 200 caracteres.');

  const userRef = doc(db, 'users', targetUid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('El usuario no existe.');

  const prev = userSnap.data();
  const statusNorm = (prev.status || '').toLowerCase();
  if (statusNorm === 'active' || statusNorm === 'activo') {
    throw new Error('El usuario ya esta activo.');
  }

  await setDoc(userRef, {
    status: 'active',
    updatedAt: new Date(),
  }, { merge: true });

  await addDoc(collection(db, 'auditoria'), {
    tipo: 'reactivacion_usuario',
    targetUid,
    targetEmail: prev.email || '',
    targetName: prev.name || '',
    motivo: motivo.trim(),
    estadoAnterior: prev.status,
    adminUid,
    timestamp: new Date(),
  });
}
