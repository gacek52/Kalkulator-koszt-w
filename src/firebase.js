import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

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

    // Save user info to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      displayName: nickname,
      email: null,
      role: 'user',
      isAnonymous: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    });

    return user;
  } catch (error) {
    console.error('Error signing in as guest:', error);
    throw error;
  }
};

/**
 * Check if email is admin
 */
const isAdminEmail = (email) => {
  if (!email) return false;
  const adminEmailsStr = process.env.REACT_APP_ADMIN_EMAILS || '';
  if (!adminEmailsStr) {
    console.warn('REACT_APP_ADMIN_EMAILS not configured - no admin users will be assigned');
    return false;
  }
  const adminEmails = adminEmailsStr.split(',').map(e => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Determine role based on email
    const role = isAdminEmail(user.email) ? 'admin' : 'user';

    // Check if user document exists
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (!userDoc.exists()) {
      // First time login - create user document
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        role: role,
        isAnonymous: false,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      });
    } else {
      // Update last login and role (in case admin list changed)
      await setDoc(doc(db, 'users', user.uid), {
        lastLogin: new Date().toISOString(),
        role: role
      }, { merge: true });
    }

    return user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
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
