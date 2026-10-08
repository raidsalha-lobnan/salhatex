import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { setLogLevel, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from 'firebase/firestore';
import defaultFirebaseConfig from '../firebase-applet-config.json';

export const CUSTOM_FIREBASE_STORAGE_KEY = 'salhatex_custom_firebase_config';

export const getActiveFirebaseConfig = () => {
  try {
    const saved = localStorage.getItem(CUSTOM_FIREBASE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && (parsed.projectId || parsed.apiKey)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading custom firebase config:', e);
  }
  return defaultFirebaseConfig;
};

export const isUsingCustomFirebaseConfig = (): boolean => {
  try {
    return Boolean(localStorage.getItem(CUSTOM_FIREBASE_STORAGE_KEY));
  } catch {
    return false;
  }
};

export const saveCustomFirebaseConfig = (config: Record<string, any>) => {
  localStorage.setItem(CUSTOM_FIREBASE_STORAGE_KEY, JSON.stringify(config));
  window.location.reload();
};

export const resetToDefaultFirebaseConfig = () => {
  localStorage.removeItem(CUSTOM_FIREBASE_STORAGE_KEY);
  window.location.reload();
};

export const defaultBuiltInConfig = defaultFirebaseConfig;

const firebaseConfig = getActiveFirebaseConfig();

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const config = firebaseConfig as any;

// تفعيل العمل بدون إنترنت (Offline Persistence) مع دعم فتح البرنامج في أكثر من تبويب
let firestoreDb;
setLogLevel('silent'); // Suppress verbose connection warnings in console
try {
  firestoreDb = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    experimentalAutoDetectLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)' ? config.firestoreDatabaseId : undefined);
} catch (e) {
  try {
    // Fallback if persistent cache is blocked (common in sandboxed iframes)
    // We still want to preserve ignoreUndefinedProperties and long polling!
    firestoreDb = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      experimentalAutoDetectLongPolling: true
    }, config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)' ? config.firestoreDatabaseId : undefined);
  } catch (err) {
    try {
      firestoreDb = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
        ? getFirestore(app, config.firestoreDatabaseId)
        : getFirestore(app);
    } catch (err2) {
      firestoreDb = getFirestore(app);
    }
  }
}

export const db = firestoreDb;
export const auth = getAuth(app);


