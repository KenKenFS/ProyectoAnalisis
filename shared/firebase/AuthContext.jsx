import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthChange, getUserRole, getUserData } from './auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (currentUser) => {
      try {
        setUser(currentUser);
        
        if (currentUser) {
          try {
            const userRole = await getUserRole(currentUser.uid);
            const data = await getUserData(currentUser.uid);
            
            const roleToSet = userRole || 'Guest';
            setRole(roleToSet);
            setUserData(data || { email: currentUser.email });
            
            localStorage.setItem('role', roleToSet);
            localStorage.setItem('userName', data?.name || currentUser.email);
            localStorage.setItem('uid', currentUser.uid);
          } catch (firebaseErr) {
            setRole('Guest');
            setUserData({ email: currentUser.email });
            localStorage.setItem('role', 'Guest');
          }
        } else {
          setRole(null);
          setUserData(null);
          localStorage.removeItem('role');
          localStorage.removeItem('userName');
          localStorage.removeItem('uid');
        }
        
        setError(null);
      } catch (err) {
        console.error('Auth error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    role,
    userData,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: role && role.toLowerCase() === 'admin',
    isCajero: role && role.toLowerCase() === 'cajero',
    isMesero: role && role.toLowerCase() === 'mesero',
    isCocina: role && role.toLowerCase() === 'cocina',
    isCliente: role && role.toLowerCase() === 'cliente',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  
  return context;
}

export function ProtectedAuthRoute({ children, requiredRole = null }) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center h-screen">Por favor inicia sesión</div>;
  }

  if (requiredRole && role !== requiredRole) {
    return <div className="flex items-center justify-center h-screen">No tienes permisos para acceder a esta página</div>;
  }

  return children;
}

export function useHasAccess(...allowedRoles) {
  const { role } = useAuth();
  return allowedRoles.includes(role);
}
