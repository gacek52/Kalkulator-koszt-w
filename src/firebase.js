import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, updateProfile, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Firebase Configuration
 *
 * Aby uzyskać te dane:
 * 1. Otwórz Firebase Console: https://console.firebase.google.com/
 * 2. Wybierz projekt: kalkulator-produkcyjny---alpha
 * 3. Przejdź do Project Settings (koło zębate)
 * 4. Scroll down do "Your apps" -> wybierz Web app (</>) lub utwórz nową
 * 5. Skopiuj firebaseConfig
 */

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Validate that all required Firebase config values are present
const requiredConfigKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  throw new Error(
    `Missing Firebase configuration keys: ${missingKeys.join(', ')}. ` +
    'Please check your .env file and ensure all REACT_APP_FIREBASE_* variables are set.'
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

/**
 * Sign in anonymously with a nickname
 */
export const signInAsGuest = async (nickname) => {
  try {
    const result = await signInAnonymously(auth);
    const user = result.user;

    // Update display name to nickname
    await updateProfile(user, {
      displayName: nickname
    });

    const loginEntry = {
      timestamp: new Date().toISOString(),
      method: 'guest',
      success: true
    };

    // Save user info to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      displayName: nickname,
      email: null,
      role: 'guest',
      provider: 'anonymous',
      isAnonymous: true,
      disabled: false,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      loginHistory: [loginEntry]
    });

    return user;
  } catch (error) {
    console.error('Error signing in as guest:', error);
    throw error;
  }
};

/**
 * Check if email is super-admin
 */
const isSuperAdminEmail = (email) => {
  return email && email.toLowerCase() === 'gacek52@gmail.com';
};

/**
 * Check if email is in admin list
 */
const isAdminEmail = (email) => {
  if (!email) return false;
  const adminEmailsStr = process.env.REACT_APP_ADMIN_EMAILS || '';
  if (!adminEmailsStr) {
    return false;
  }
  const adminEmails = adminEmailsStr.split(',').map(e => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
};

/**
 * Determine user role based on email
 */
const determineUserRole = (email) => {
  if (isSuperAdminEmail(email)) return 'super-admin';
  if (isAdminEmail(email)) return 'admin';
  return 'guest'; // Default role for new Google users
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Determine role based on email
    const role = determineUserRole(user.email);

    // Check if user document exists
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    const loginEntry = {
      timestamp: new Date().toISOString(),
      method: 'google',
      success: true
    };

    if (!userDoc.exists()) {
      // First time login - create user document with default role "guest"
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        role: role, // 'guest' for new users, 'super-admin' for gacek52, 'admin' if in ADMIN_EMAILS
        provider: 'google',
        isAnonymous: false,
        disabled: false,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        loginHistory: [loginEntry]
      });
    } else {
      // Existing user - check if disabled
      const userData = userDoc.data();

      if (userData.disabled) {
        throw new Error('Konto zostało wyłączone. Skontaktuj się z administratorem.');
      }

      // Update last login and add to history
      // Keep role if super-admin (protected), otherwise update if email is in admin list
      const updatedRole = userData.role === 'super-admin' ? 'super-admin' : role;

      await setDoc(doc(db, 'users', user.uid), {
        lastLogin: new Date().toISOString(),
        role: updatedRole,
        loginHistory: [...(userData.loginHistory || []), loginEntry].slice(-50) // Keep last 50 logins
      }, { merge: true });
    }

    return user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

/**
 * Sign in with Email/Password
 */
export const signInWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // Check if user document exists
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (!userDoc.exists()) {
      throw new Error('Profil użytkownika nie istnieje w bazie danych.');
    }

    const userData = userDoc.data();

    // Check if account is disabled
    if (userData.disabled) {
      throw new Error('Konto zostało wyłączone. Skontaktuj się z administratorem.');
    }

    const loginEntry = {
      timestamp: new Date().toISOString(),
      method: 'email',
      success: true
    };

    // Update last login and add to history
    await setDoc(doc(db, 'users', user.uid), {
      lastLogin: new Date().toISOString(),
      loginHistory: [...(userData.loginHistory || []), loginEntry].slice(-50) // Keep last 50 logins
    }, { merge: true });

    return {
      user,
      requirePasswordChange: userData.requirePasswordChange || false
    };
  } catch (error) {
    console.error('Error signing in with email:', error);
    // Note: Failed login attempts are not logged on client side for security reasons
    throw error;
  }
};

/**
 * Change user password (self-service)
 */
export const changeUserPassword = async (newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Użytkownik nie jest zalogowany');
    }

    // Update password in Firebase Auth
    await updatePassword(user, newPassword);

    // Update requirePasswordChange flag in Firestore
    await updateDoc(doc(db, 'users', user.uid), {
      requirePasswordChange: false,
      passwordChangedAt: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
};

/**
 * Send password reset email
 */
export const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Sign out
 */
export const signOut = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Get user role from Firestore
 */
export const getUserRole = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data().role || 'user';
    }
    return 'user';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'user';
  }
};

export { auth, db };
