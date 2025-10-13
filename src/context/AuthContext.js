import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, signInAsGuest, signInWithGoogle, signOut as firebaseSignOut, getUserRole } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Auth Context
 * Zarządza stanem uwierzytelnienia i rolami użytkowników
 */

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sprawdź czy użytkownik jest administratorem
  const isAdmin = userRole === 'admin';

  // Sprawdź czy użytkownik jest właścicielem kalkulacji
  const isOwner = (calculation) => {
    if (!currentUser || !calculation) return false;
    return calculation.ownerId === currentUser.uid;
  };

  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setCurrentUser(user);
          // Pobierz rolę użytkownika
          const role = await getUserRole(user.uid);
          setUserRole(role);
        } else {
          setCurrentUser(null);
          setUserRole('user');
        }
      } catch (err) {
        console.error('Error in auth state change:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Sign in as guest with nickname
  const loginAsGuest = async (nickname) => {
    try {
      setLoading(true);
      setError(null);

      if (!nickname || nickname.trim().length < 2) {
        throw new Error('Nick musi mieć co najmniej 2 znaki');
      }

      await signInAsGuest(nickname.trim());
    } catch (err) {
      console.error('Error signing in as guest:', err);
      setError(err.message || 'Nie udało się zalogować jako gość');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      console.error('Error signing in with Google:', err);
      setError(err.message || 'Nie udało się zalogować przez Google');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      await firebaseSignOut();
      setCurrentUser(null);
      setUserRole('user');
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err.message || 'Nie udało się wylogować');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    userRole,
    isAdmin,
    isOwner,
    loginAsGuest,
    loginWithGoogle,
    logout,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
