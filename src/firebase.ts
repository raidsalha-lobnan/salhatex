import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { setLogLevel, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

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


