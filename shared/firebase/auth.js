import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export async function registerUserWithRole(email, password, role, additionalData = {}) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      role: role,
      name: additionalData.name || email.split('@')[0],
      phone: additionalData.phone || '',
      status: 'active',
      createdAt: new Date(),
      ...additionalData,
    });

    return user;
  } catch (error) {
    console.error('Error al registrar usuario:', error.message);
    throw error;
  }
}

export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error al logearse:', error.message);
    throw error;
  }
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
